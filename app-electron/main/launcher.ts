import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import type { AppConfig, ConnectRequest, ConnectResult, SystemCredentials } from "../shared/types";
import { discoverAdtEndpoint, verifyCredentials, normalizeAdtBaseUrl, guessInstanceNumber } from "./adtDiscovery";
import { installSkillsIntoProject, type SkillInstallResult } from "./sapToolkit";

const NOTES_MARKER = "<!-- axet-sap-launcher:notes -->";
const INVALID_CHARS = /[<>:"/\\|?*]/g;
const DEFAULT_CLOUD_CLIENT = "100";
const DEFAULT_RFC_BRIDGE_PORT = 8788;

interface RfcBridgeConfig {
  ashost: string;
  sysnr: string;
  saprouter: string;
  bridgePort: number;
}

function isRouterPermissionDenied(message: string): boolean {
  return message.includes("NIEROUT_PERM_DENIED") || message.includes("-94");
}

function sanitizeSegment(segment: string): string {
  const cleaned = segment.replace(INVALID_CHARS, "_").trim();
  return cleaned.length > 0 ? cleaned : "adsiz";
}

// connectToSystem()'daki proje klasörü hesaplama mantığının aynısı — Dosya
// Gezgini panelinin bir sisteme HENÜZ bağlanmadan (veya bağlandıktan sonra
// yeniden hesaplayarak) o sistemin proje klasör yolunu bilmesi gerekiyor.
// Gerçek bağlantı/doğrulama yapmadan, saf bir path hesaplama fonksiyonu.
export function computeProjectDir(config: AppConfig, customerPath: string[], service: { systemId: string; name: string }): string {
  const segments = customerPath.map(sanitizeSegment);
  const systemSegment = sanitizeSegment(service.systemId || service.name || "sistem");
  return path.join(config.projectsBaseDir, ...segments, systemSegment);
}

function buildConnAdt(
  req: ConnectRequest,
  credentials: SystemCredentials,
  verifiedUrl: string,
  rfcBridge?: RfcBridgeConfig | null
): string {
  const { service } = req;
  const clientLine = credentials.client.trim() ? `ADT_SAP_CLIENT=${credentials.client.trim()}\n` : "";
  const clientComment = credentials.client.trim()
    ? ""
    : "# Bu sistemde client belirtilmedi (BTP/Cloud sistemlerde genelde gerekmez).\n# Bir SAP server bunu isterse: SU01/SICF'te veya sistem yöneticisinden öğrenip\n# aşağıya \"ADT_SAP_CLIENT=xxx\" satırı olarak ekle.\n";

  const effectiveUrl = rfcBridge ? `http://127.0.0.1:${rfcBridge.bridgePort}` : verifiedUrl;

  const rfcBlock = rfcBridge
    ? `
# ============================================================================
# RFC BRIDGE MODU — bu sistemin SAProuter'ı raw/native HTTPS tünellemeyi
# REDDETTİ (-94 NIEROUT_PERM_DENIED) ama native SAP protokolü (DIAG/RFC)
# trafiğine izin veriyor (SAP Logon'un neden çalıştığı budur). ADT_SAP_URL
# yukarıda yerel bir RFC bridge'e (adt_rfc_bridge.py) işaret ediyor — o script
# SADT_REST_RFC_ENDPOINT üzerinden gerçek SAP'a RFC ile bağlanıyor. Kurulum ve
# kullanım: %sap-adt-readonly skill'inin SKILL.md'sindeki "Router-only
# sistemler (RFC bridge)" bölümüne bak. Gerçek keşfedilen HTTPS URL (izin
# verilirse ileride doğrudan kullanılabilir): ${verifiedUrl}
# ============================================================================
ADT_RFC_MODE=true
ADT_RFC_ASHOST=${rfcBridge.ashost}
ADT_RFC_SYSNR=${rfcBridge.sysnr}
ADT_RFC_SAPROUTER=${rfcBridge.saprouter}
ADT_RFC_BRIDGE_PORT=${rfcBridge.bridgePort}
`
    : "";

  return `# ============================================================================
# .conn_adt — aXet SAP Launcher tarafından doğrulanmış bağlantıyla oluşturuldu/güncellendi (${new Date().toISOString()})
# Sistem: ${service.name} (${service.systemId}) — aXet.code'un yerel ADT connector'ı bunu okur.
# NEVER commit — bu dosyada düz metin şifre var, .gitignore'a eklendi.
# ============================================================================

# ADT_SAP_URL ${rfcBridge ? "yerel RFC bridge'e işaret ediyor (bkz. aşağıdaki RFC BRIDGE MODU notu)" : "otomatik keşif + kimlik doğrulama testiyle (HTTP 200) DOĞRULANDI"}.
ADT_SAP_URL=${effectiveUrl}
ADT_SAP_USER=${credentials.username}
ADT_SAP_PASSWORD=${credentials.password}
${clientComment}${clientLine}ADT_SAP_LANGUAGE=EN
${rfcBlock}
# Sistem tier'ı gerekirse aç (QA/PRD KVKK/PII gate ekler):
# ADT_SAP_TIER=DEV
`;
}

function buildAdtToolScript(): string {
  return `param(
    [Parameter(Mandatory=$true)][ValidateSet("package","raw","ping")]$Action,
    [string]$Package,
    [string]$Path,
    [string]$Method = "GET",
    [string]$QueryString = "",
    [string]$Body = ""
)

$ErrorActionPreference = "Stop"
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

if (-not ([System.Management.Automation.PSTypeName]'TrustAllCertsPolicy').Type) {
    Add-Type @"
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy {
    public static bool ValidateAll(object sender, X509Certificate cert, X509Chain chain, SslPolicyErrors errors) {
        return true;
    }
}
"@
}
$__method = [TrustAllCertsPolicy].GetMethod('ValidateAll')
$__delegate = [Delegate]::CreateDelegate([System.Net.Security.RemoteCertificateValidationCallback], $__method)
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = $__delegate

$connFile = Join-Path $PSScriptRoot ".conn_adt"
$conn = @{}
Get-Content $connFile | ForEach-Object {
    if ($_ -match '^\\s*#' -or $_ -match '^\\s*$') { return }
    if ($_ -match '^([A-Z_]+)=(.*)$') { $conn[$matches[1]] = $matches[2] }
}
$base = $conn['ADT_SAP_URL']
$user = $conn['ADT_SAP_USER']
$pass = $conn['ADT_SAP_PASSWORD']
$client = $conn['ADT_SAP_CLIENT']
$clientQuery = if ($client) { "sap-client=$client" } else { "" }

$sec = ConvertTo-SecureString $pass -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($user, $sec)
$script:sess = $null

function Get-CsrfToken {
    $discUrl = if ($clientQuery) { "$base/sap/bc/adt/discovery?$clientQuery" } else { "$base/sap/bc/adt/discovery" }
    $r = Invoke-WebRequest -Uri $discUrl -Method GET \`
        -Credential $cred -Headers @{ Accept = '*/*'; 'X-CSRF-Token' = 'Fetch' } \`
        -SessionVariable sessLocal -UseBasicParsing
    $script:sess = $sessLocal
    return $r.Headers['x-csrf-token']
}

switch ($Action) {
    "ping" {
        $discUrl = if ($clientQuery) { "$base/sap/bc/adt/discovery?$clientQuery" } else { "$base/sap/bc/adt/discovery" }
        $r = Invoke-WebRequest -Uri $discUrl -Method GET -Credential $cred -Headers @{ Accept = '*/*' } -UseBasicParsing
        Write-Output "PING_OK $($r.StatusCode)"
    }
    "package" {
        if (-not $Package) { Write-Error "Package parametresi gerekli"; exit 1 }
        $csrf = Get-CsrfToken
        $url = "$base/sap/bc/adt/repository/nodestructure?parent_type=DEVC%2FK&parent_name=$Package&withShortDescriptions=true"
        if ($clientQuery) { $url += "&$clientQuery" }
        $r = Invoke-WebRequest -Uri $url -Method POST -WebSession $script:sess \`
            -Headers @{ 'X-CSRF-Token' = $csrf; Accept = '*/*' } \`
            -ContentType 'application/vnd.sap.as+xml; charset=UTF-8; dataname=null' -Body '' -UseBasicParsing
        Write-Output $r.Content
    }
    "raw" {
        if (-not $Path) { Write-Error "Path parametresi gerekli"; exit 1 }
        $sep = if ($QueryString) { if ($QueryString.StartsWith('?')) { '' } else { '?' } } else { '' }
        $url = "$base$Path$sep$QueryString"
        if ($Method -eq "GET") {
            $r = Invoke-WebRequest -Uri $url -Method GET -Credential $cred -Headers @{ Accept = '*/*' } -UseBasicParsing
        } else {
            $csrf = Get-CsrfToken
            $r = Invoke-WebRequest -Uri $url -Method $Method -WebSession $script:sess \`
                -Headers @{ 'X-CSRF-Token' = $csrf; Accept = '*/*' } \`
                -ContentType 'application/xml' -Body $Body -UseBasicParsing
        }
        Write-Output $r.Content
    }
}
`;
}

function testAdtToolScript(projectDir: string, timeoutMs = 15000): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "adt-tool.ps1", "-Action", "ping"],
      { cwd: projectDir, timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ ok: false, detail: (stderr || error.message).trim().slice(0, 300) });
          return;
        }
        const out = stdout.trim();
        if (out.includes("PING_OK")) {
          resolve({ ok: true, detail: out });
        } else {
          resolve({ ok: false, detail: (out || stderr).slice(0, 300) });
        }
      }
    );
  });
}

function buildContextMarkdown(
  req: ConnectRequest,
  verifiedUrl: string,
  discoveryNotes: string[],
  toolTest: { ok: boolean; detail: string },
  skillInstall: SkillInstallResult,
  rfcBridge?: RfcBridgeConfig | null
): string {
  const { customerPath, service } = req;
  const breadcrumb = customerPath.join(" / ");
  const router = service.routerString ? service.routerString : "Yok (doğrudan bağlantı)";
  const host = service.host ?? "bilinmiyor";
  const port = service.port ?? "bilinmiyor";
  const notesBlock = discoveryNotes.map((n) => `  - ${n}`).join("\n");
  const toolStatusBlock = toolTest.ok
    ? `- **adt-tool.ps1 self-test: BAŞARILI ✓** (${toolTest.detail}) — script doğru çalışıyor, güvenle kullan.`
    : `- **adt-tool.ps1 self-test: BAŞARISIZ ✗** — script'in kendisi bir HTTP isteğini başarıyla tamamlayamadı (detay: ${toolTest.detail}). Bu, .NET/PowerShell'in TLS/sertifika trust zincirinin Node.js tarafındaki doğrulamadan **farklı** olduğunu gösterir. Önce bu script'i düzelt (ör. TLS bypass, PowerShell sürümü, Invoke-WebRequest davranışı), sonra ADT'ye erişmeyi dene — aksi halde "401/TLS/DNS" gibi yanlış yönlere saparsın.`;

  const skillsBlock = skillInstall.toolkitRoot
    ? `- SAP Toolkit kaynağı: \`${skillInstall.toolkitRoot}\`
- Bu klasöre kurulan skill sayısı: **${skillInstall.installed.length}** (\`.axet-code/skills/\` altında, \`%skill-adı\` ile çağrılır)
- **\`%sap-adt-readonly\`** — bu skill gerçek bir Python tabanlı ADT read-only server (\`adt_readonly_server.py\`) başlatır ve SAP'a **gerçek** ADT REST çağrıları (adt_get_source, adt_search, adt_sql SELECT-only, adt_where_used, adt_syntax_check, adt_atc_check, adt_unit_test, adt_list_package, vb. 20 read tool) yapar. Bu klasördeki \`.conn_adt\` zaten bu server ile **aynı formatta ve doğrulanmış** — doğrudan kullanılabilir, tekrar kimlik/URL sormaya gerek yok.
- \`%clean-core\`, \`%sap-docs\` — ABAP Cloud/Clean Core ve SAP dokümantasyon referans skilleri (SAP'a bağlanmaz, salt bilgi).
- \`%abapgit-workflow\` ve kardeşleri — ABAP değişikliklerini teslim etmenin **tek meşru yolu** (abapGit ZIP döngüsü, geliştirici SAPGUI'de import eder). SAP'a asla doğrudan yazma — ADT read-only'dir.
- \`%office-*\` skilleri (excel, pdf, pptx, docx, slides, manual) — Office doküman üretimi/analizi. **Bu scriptleri gerçek toolkit path'inden çalıştır** (\`${skillInstall.toolkitRoot}\`), kopyalanan \`.axet-code/skills/\` altından değil — relative \`lib/redact.py\` import'u sadece gerçek repo path'inde çalışır.
- Python bağımlılıkları kurulu değilse (\`ModuleNotFoundError\`), kullanıcıya \`pip install -r "${skillInstall.toolkitRoot}\\requirements.txt"\` çalıştırmasını söyle.`
    : `- SAP Toolkit bulunamadı — skill kurulumu atlandı. Sadece \`.conn_adt\` + \`adt-tool.ps1\` (PowerShell tabanlı, sınırlı) kullanılabilir.`;

  const isCloudSystem = Boolean(service.manualAdtUrl) || service.type === "BTP/CLOUD";
  const cloudNoteBlock = isCloudSystem
    ? `

## Cloud / BTP Sistem Notları
- Bu sistem manuel eklenmiş bir **cloud/BTP** sistemi — client kavramı genelde gerekmez (SAML SSO ve BTP service-key kimlik doğrulamasında client yoktur). Kullanıcı bağlanırken client alanını boş bıraktıysa \`.conn_adt\`'a otomatik olarak varsayılan \`${DEFAULT_CLOUD_CLIENT}\` yazıldı — bu ADT endpoint'lerinin sap-client parametresi bekleyip 400/404 dönmesini önlemek içindir, sistemin gerçek client'ı olduğu anlamına gelmez.
- \`%sap-adt-readonly\` skill'i bu sistemin **SAML SSO** kullanıp kullanmadığını otomatik tespit eder (URL \`*.cloud.sap\`/\`*.hana.ondemand.com\` içeriyorsa). SAML ise ilk ADT çağrısı "SAML SSO required" hatası verir — bu bir VPN/bağlantı sorunu **değildir**, şu adımı izle:
  1. Playwright kurulu değilse: \`pip install playwright && playwright install chromium\` (~200MB, tek seferlik).
  2. \`python "${skillInstall.toolkitRoot ?? "<toolkit>"}\\abaper\\skills\\sap-adt-readonly\\scripts\\login_saml_sso.py" --cwd "."\` (bu klasörden, yani bu terminal zaten burada açık) çalıştır — tarayıcı açılır, kullanıcı giriş yapar (gerekirse \`--headed\` ile görünür modda), session cookie'leri \`.saml_cookies_<host>.json\`'a kaydedilir.
  3. Script'in verdiği \`ADT_SAML_COOKIES_FILE=...\` satırını bu klasördeki \`.conn_adt\`'a ekle.
  4. Tekrar dene — artık SAML cookie'leriyle kimlik doğrulanır.
- 401/403 yerine **HTML login sayfası** dönmesi (ADT XML değil) SAML'in kanıtıdır — kullanıcıya "kimlik bilgisi yanlış" deme, doğrudan yukarıdaki SAML akışını öner.`
    : "";

  const rfcNoteBlock = rfcBridge
    ? `

## SAProuter RFC Bridge Modu — HTTPS bu sistemde ENGELLİ
- Bu sistemin SAProuter'ı (${service.routerString ?? "?"}) native/raw HTTPS tünellemeyi **REDDETTİ** (-94 NIEROUT_PERM_DENIED) — SAP Logon'un DIAG bağlantısı çalışıyor çünkü o native SAP protokolü, ama ADT'nin düz HTTPS'i router tarafından engelleniyor. Bu bir kimlik/ağ hatası **değil**, router'ın izin tablosu (\`saprouttab\`) kısıtı.
- Bu yüzden \`.conn_adt\`'taki \`ADT_SAP_URL\` gerçek SAP'a değil, yerel bir **RFC bridge**'e (\`http://127.0.0.1:${rfcBridge.bridgePort}\`) işaret ediyor. Bu bridge kurulup çalıştırılınca, router'ın izin verdiği RFC kanalı üzerinden \`SADT_REST_RFC_ENDPOINT\` ile ADT isteklerini proxy'liyor — \`%sap-adt-readonly\` tamamen **değişmeden** çalışıyor, sadece arkada bridge'e gidiyor.
- **Bu bridge henüz kurulu/doğrulanmış değil** (bu launcher onu HTTP ile test edemez — RFC için lisanslı SAP NW RFC SDK gerekir). \`%sap-adt-readonly\` skill'inin SKILL.md'sindeki **"Router-only sistemler (RFC bridge)"** bölümünü oku ve şu sırayla ilerle:
  1. Kullanıcının kendi SAP S-user'ıyla SAP NW RFC SDK'yı indirt (\`https://support.sap.com/en/product/connectors/nwrfcsdk.html\`), \`SAPNWRFC_HOME\` ayarla, \`pip install pyrfc\`.
  2. \`py "${skillInstall.toolkitRoot ?? "<toolkit>"}\\abaper\\skills\\sap-adt-readonly\\scripts\\adt_rfc_probe.py"\` çalıştır — RFC_PING ve \`SADT_REST_RFC_ENDPOINT\` arayüzünü doğrular.
  3. \`ADT_CWD=$(pwd) py "${skillInstall.toolkitRoot ?? "<toolkit>"}\\abaper\\skills\\sap-adt-readonly\\scripts\\adt_rfc_bridge.py" --port ${rfcBridge.bridgePort}\` başlat (\`run_in_background: true\`).
  4. Sonra normal \`%sap-adt-readonly\` akışına (Step 1–4) geç — \`ADT_SAP_URL\` zaten bridge'e işaret ediyor, ekstra bir şey yapmana gerek yok.
- Gerçek keşfedilen (ama şu an router tarafından engellenen) HTTPS URL: **${verifiedUrl}** — Basis ekibi ileride \`saprouttab\`'a bu makinenin IP'sinden yukarıdaki URL'in host:port'una bir \`P\` (permit, native değil) satırı eklerse, \`.conn_adt\`'ta \`ADT_RFC_MODE=false\` yapıp \`ADT_SAP_URL\`'i bu adrese çevirebilirsin — doğrudan HTTPS daha basit ve daha güvenilir.
- Aktivasyon gibi çok-adımlı stateful akışlar RFC bridge üzerinden güvenilir çalışmaz (zaten bu read-only server'da aktivasyon yok) — sadece okuma araçlarını (\`adt_get_source\`, \`adt_search\`, \`adt_sql\`, vb.) bekle.`
    : "";

  const connectionStatusBlock = rfcBridge
    ? `## ADT Bağlantısı — RFC BRIDGE GEREKLİ (henüz HTTP ile doğrulanamadı)
- Router doğrudan HTTPS'i reddetti, bkz. aşağıdaki "SAProuter RFC Bridge Modu" bölümü — orada anlatılan kurulumu tamamlamadan \`%sap-adt-readonly\` çalışmaz.
- adt-tool.ps1 bu modda yazılmadı/çalıştırılmadı (o script düz HTTPS kullanır, bu sistemde işe yaramaz) — RFC bridge kurulumunu tamamladıktan sonra doğrulama \`adt_rfc_probe.py\` ile yapılır.
- Keşif/doğrulama adımları (referans):
${notesBlock}`
    : `## ADT Bağlantısı — DOĞRULANDI ✓
- ADT URL: **${verifiedUrl}** (HTTP 200 ile kimlik doğrulaması onaylandı, terminal bu bağlantıyla açıldı)
- Sertifika ve DNS/SID doğrulaması otomatik yapıldı ve geçti — **bu oturumda TLS/DNS/host:port keşfini tekrar deneme, sonuç zaten kanıtlanmış**.
- Keşif/doğrulama adımları (referans, tekrar çalıştırma):
${notesBlock}
${toolStatusBlock}`;

  return `# SAP Sistem Bağlantı Bağlamı

Bu dosya aXet SAP Launcher tarafından otomatik oluşturulmuştur/güncellenmiştir. Session başında bu bilgileri referans al.

## Sen Şu An Bir SAP ABAP Sistemine Bağlısın
Bu klasör bir SAP sisteminin proxy çalışma alanıdır — normal bir dosya sistemi/repo değil. ABAP nesneleri (paket, sınıf, CDS view, vs.) yerel diskte yok, uzak SAP sunucusunda ADT REST API üzerinden erişilir.

## SAP Toolkit Skilleri — OTOMATIK KURULDU
${skillsBlock}${cloudNoteBlock}${rfcNoteBlock}

## Müşteri / Sistem
- **Müşteri**: ${breadcrumb}
- **Sistem ID**: ${service.systemId || "?"}
- **Sistem Adı**: ${service.name}
- **Bağlantı Tipi**: ${service.type}
- **SAPGUI Dispatcher (DIAG) Host:Port**: ${host}:${port}
- **SAProuter**: ${router}
- **Güncelleme**: ${new Date().toISOString()}

${connectionStatusBlock}

## SAP İçeriğini Nasıl Araştırırsın (ÖNEMLİ — rastgele HTTP denemesi yapma)

**Tercih sırası: önce \`%sap-adt-readonly\` skill'i, o çalışmazsa (Python/bağımlılık yoksa) \`adt-tool.ps1\` fallback.**

### Yöntem 1 — \`%sap-adt-readonly\` (tercih edilen, tam özellikli)
Python tabanlı gerçek ADT engine, 20 read-only tool sunar (adt_get_source, adt_search, adt_sql, adt_where_used, adt_syntax_check, adt_atc_check, adt_unit_test, adt_list_package, adt_revisions, adt_dumps, adt_list_transports, vb.). Detaylar için \`%sap-adt-readonly\` skill'ini oku (SKILL.md), özet akış:
\`\`\`bash
# Sunucu ayakta mı?
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())" 2>/dev/null || echo "NOT RUNNING"
# Değilse başlat (run_in_background: true), .conn_adt bu klasörde zaten hazır:
ADT_CWD=$(pwd) py "${skillInstall.toolkitRoot ?? "<sap-toolkit bulunamadı>"}/abaper/skills/sap-adt-readonly/scripts/adt_readonly_server.py" --port 8787
# Kullan:
python -c "import requests; print(requests.post('http://127.0.0.1:8787/tool/adt_list_package', json={'package':'ZPM003'}).json())"
\`\`\`
Bu server **iki kilitle** SAP'a yazmayı engeller (ADT_READONLY=true zorlanır + sadece 20 read tool maplenir) — write denemesi 404 döner, endişelenme.

### Yöntem 2 — \`adt-tool.ps1\` (basit fallback, Python yoksa)
Bu klasörde hazır bir PowerShell script var: **\`adt-tool.ps1\`**. Kimlik doğrulama, CSRF token, Accept header, sertifika bypass gibi tüm detayları o halleder — sen tekrar icat etmeye çalışma.

1. **Bir paketteki (DEVC) nesneleri listelemek** için:
   \`\`\`
   powershell -NoProfile -ExecutionPolicy Bypass -File "adt-tool.ps1" -Action package -Package "ZPM003"
   \`\`\`
   Çıktı XML'dir, içinde \`<OBJECT_TYPE>\`, \`<OBJECT_NAME>\`, \`<DESCRIPTION>\` alanları olan node listesi vardır.

2. **Herhangi bir ADT endpoint'ine serbest istek** için (örn. bir sınıfın kaynak kodu, bir CDS view tanımı vs.):
   \`\`\`
   powershell -NoProfile -ExecutionPolicy Bypass -File "adt-tool.ps1" -Action raw -Path "/sap/bc/adt/oo/classes/ZPM003_CL_AVLB_AMDP/source/main" -Method GET
   \`\`\`
   POST/PUT gerekiyorsa \`-Method POST -Body "<xml>..."\` şeklinde ver, script CSRF token'ı otomatik halleder.

3. Script'in okuduğu bilgiler bu klasördeki \`.conn_adt\` dosyasından gelir — kullanıcıdan tekrar host/port/kimlik bilgisi isteme, zaten doğrulanmış durumda.
4. 401/403 alırsan kullanıcıya "kimlik bilgileri artık geçersiz, yeniden bağlan" de — TLS/DNS/port kombinasyonlarını rastgele denemeye başlama, bu sorun değil.

## Talimatlar
- \`.conn_adt\` içindeki kullanıcı adı/şifreyi asla loglama, ekrana basma veya başka bir dosyaya kopyalama.
- ABAP Cloud / Clean Core prensiplerine göre çalış (bkz. ana kimlik dosyası).
- Bu sistemle ilgili ADT REST API, RAP/CDS nesneleri veya diğer teknik detaylar hakkında kullanıcı soru sorarsa bu bağlam bilgisini kullan.

${NOTES_MARKER}

## Notlar
<!-- Bu bölümün altına serbestçe not ekleyebilirsin, yeniden bağlanınca korunur. -->
`;
}

function mergeWithExistingNotes(newContent: string, existingFilePath: string): string {
  if (!existsSync(existingFilePath)) return newContent;
  try {
    const existing = readFileSync(existingFilePath, "utf-8");
    const idx = existing.indexOf(NOTES_MARKER);
    if (idx === -1) return newContent;
    const preservedNotes = existing.slice(idx + NOTES_MARKER.length);
    const newIdx = newContent.indexOf(NOTES_MARKER);
    return newContent.slice(0, newIdx + NOTES_MARKER.length) + preservedNotes;
  } catch {
    return newContent;
  }
}

function ensureGitignore(projectDir: string): void {
  const gitignorePath = path.join(projectDir, ".gitignore");
  const entry = ".conn_adt";
  try {
    if (!existsSync(gitignorePath)) {
      writeFileSync(gitignorePath, `${entry}\n`, "utf-8");
      return;
    }
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.split(/\r?\n/).some((line) => line.trim() === entry)) {
      appendFileSync(gitignorePath, `\n${entry}\n`, "utf-8");
    }
  } catch {
    // .gitignore best-effort, sessizce devam
  }
}

export async function connectToSystem(config: AppConfig, req: ConnectRequest): Promise<ConnectResult> {
  const projectDir = computeProjectDir(config, req.customerPath, req.service);

  try {
    mkdirSync(projectDir, { recursive: true });
  } catch (err) {
    return { ok: false, verified: false, projectDir, message: `Proje klasörü oluşturulamadı: ${(err as Error).message}` };
  }

  const host = req.service.host;
  const manualUrl = req.service.manualAdtUrl;

  if (!host && !manualUrl) {
    return {
      ok: false,
      verified: false,
      projectDir,
      message: "Bu sistem için host veya ADT URL bilgisi eksik."
    };
  }

  // Cloud/BTP sistemlerde client kavramı yok (SAML SSO / service-key ile
  // kimlik doğrulanır) ama bazı ADT endpoint'leri sap-client parametresi
  // olmadan 400/404 dönebiliyor. Kullanıcı client'ı boş bıraktıysa
  // varsayılan bir değer ata — kullanıcıya tekrar sormaya gerek yok.
  const isCloudSystem = Boolean(manualUrl) || req.service.type === "BTP/CLOUD";
  const credentials =
    isCloudSystem && !req.credentials.client.trim()
      ? { ...req.credentials, client: DEFAULT_CLOUD_CLIENT }
      : req.credentials;

  let finalUrl: string;
  const allNotes: string[] = [];
  let trustedCertificatesUpdate: Record<string, string> | undefined;
  let verify: Awaited<ReturnType<typeof verifyCredentials>>;

  if (manualUrl) {
    const normalizedUrl = normalizeAdtBaseUrl(manualUrl);
    if (normalizedUrl !== manualUrl) {
      allNotes.push(`ADT URL normalize edildi (Fiori/UI path'i temizlendi): ${manualUrl} → ${normalizedUrl}`);
    }
    allNotes.push(`Manuel tanımlanan ADT URL doğrudan kullanılıyor: ${normalizedUrl}`);
    finalUrl = normalizedUrl;
    verify = await verifyCredentials(normalizedUrl, credentials.username, credentials.password, credentials.client);
  } else {
    const routerString = req.service.routerString;
    if (routerString) {
      allNotes.push(`SAProuter tanımlı: ${routerString} — bağlantı router üzerinden tünellenecek.`);
    }
    const discovery = await discoverAdtEndpoint(
      host!,
      req.service.port,
      req.service.systemId || "",
      config.trustedCertificates,
      routerString
    );
    allNotes.push(...discovery.notes);
    trustedCertificatesUpdate = discovery.trustedCertificates;
    finalUrl = discovery.url;

    verify = await verifyCredentials(
      discovery.url,
      credentials.username,
      credentials.password,
      credentials.client,
      undefined,
      routerString
    );

    if (!verify.ok && verify.status !== 401 && discovery.alternateUrl && !routerString) {
      allNotes.push(`Birincil URL (${discovery.url}) ağ seviyesinde başarısız oldu, alternatif deneniyor: ${discovery.alternateUrl}`);
      const altVerify = await verifyCredentials(discovery.alternateUrl, credentials.username, credentials.password, credentials.client);
      if (altVerify.ok || altVerify.status === 401) {
        verify = altVerify;
        finalUrl = discovery.alternateUrl;
      }
    }
  }

  allNotes.push(verify.ok ? `Kimlik doğrulama başarılı (${finalUrl})` : `Kimlik doğrulama başarısız: ${verify.message}`);

  const routerString = req.service.routerString;
  let rfcBridge: RfcBridgeConfig | null = null;

  if (!verify.ok && routerString && !manualUrl && isRouterPermissionDenied(verify.message)) {
    const instanceNr = guessInstanceNumber(req.service.port) ?? "00";
    let ashost = host!;
    try {
      ashost = new URL(finalUrl).hostname;
    } catch {
      // finalUrl kullanılamıyorsa orijinal host'u kullan
    }
    rfcBridge = {
      ashost,
      sysnr: instanceNr,
      saprouter: routerString,
      bridgePort: DEFAULT_RFC_BRIDGE_PORT
    };
    allNotes.push(
      "Router raw/native HTTPS'i reddetti ama native SAP protokolüne (DIAG/RFC) izin veriyor — " +
        "RFC bridge moduna geçiliyor (bkz. sap-context.md). Kimlik bilgileri bu launcher tarafından " +
        "HTTP ile doğrulanamadı; gerçek doğrulama RFC bridge kurulumu sırasında yapılmalı."
    );
  } else if (!verify.ok) {
    return {
      ok: false,
      verified: false,
      projectDir,
      message: verify.message,
      trustedCertificates: trustedCertificatesUpdate
    };
  }

  const connAdtPath = path.join(projectDir, ".conn_adt");
  try {
    writeFileSync(connAdtPath, buildConnAdt(req, credentials, finalUrl, rfcBridge), "utf-8");
  } catch (err) {
    return { ok: false, verified: verify.ok, projectDir, message: `.conn_adt yazılamadı: ${(err as Error).message}` };
  }
  ensureGitignore(projectDir);

  let toolTest = { ok: false, detail: "RFC bridge modunda adt-tool.ps1 self-test atlandı (bridge henüz kurulu değil)" };
  if (!rfcBridge) {
    try {
      writeFileSync(path.join(projectDir, "adt-tool.ps1"), buildAdtToolScript(), "utf-8");
      toolTest = await testAdtToolScript(projectDir);
    } catch {
      // yardımcı script best-effort, kritik değil ama toolTest.ok=false kalır ve context'e not düşülür
    }
  }

  const skillInstall = installSkillsIntoProject(projectDir);

  const contextFile = path.join(projectDir, "sap-context.md");
  const generated = buildContextMarkdown(req, finalUrl, allNotes, toolTest, skillInstall, rfcBridge);
  const finalContent = mergeWithExistingNotes(generated, contextFile);

  try {
    writeFileSync(contextFile, finalContent, "utf-8");
  } catch (err) {
    return { ok: false, verified: verify.ok, projectDir, message: `Bağlam dosyası yazılamadı: ${(err as Error).message}` };
  }

  const skillNote = skillInstall.toolkitRoot ? `, ${skillInstall.installed.length} skill kuruldu` : "";

  if (rfcBridge) {
    return {
      ok: true,
      verified: false,
      projectDir,
      message: `Router raw HTTPS'i reddetti — RFC bridge moduna geçildi${skillNote}, gömülü terminal açılıyor. Kurulum adımları için sap-context.md'ye bak.`,
      trustedCertificates: trustedCertificatesUpdate,
      effectiveClient: credentials.client
    };
  }

  return {
    ok: true,
    verified: true,
    projectDir,
    message: toolTest.ok
      ? `Bağlantı doğrulandı, gömülü terminal açılıyor${skillNote} (${finalUrl})`
      : `Bağlantı doğrulandı ama adt-tool.ps1 self-test başarısız${skillNote} — sap-context.md'de detay var (${finalUrl})`,
    trustedCertificates: trustedCertificatesUpdate,
    effectiveClient: credentials.client
  };
}
