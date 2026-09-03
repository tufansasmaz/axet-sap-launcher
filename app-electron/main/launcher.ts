import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { Socket } from "node:net";
import path from "node:path";
import type { AppConfig, ConnectRequest, ConnectResult, SystemCredentials } from "../shared/types";
import { discoverAdtEndpoint, verifyCredentials, normalizeAdtBaseUrl, guessInstanceNumber } from "./adtDiscovery";
import { installSkillsIntoProject, type SkillInstallResult } from "./sapToolkit";
import { startRfcBridge } from "./rfcBridgeManager";
import { isRouterPermissionDeniedMessage } from "./sapRouter";
import { startReadonlyServer } from "./adtReadonlyServerManager";
import { getEmbeddedRfcRuntime } from "./embeddedRuntime";

const NOTES_MARKER = "<!-- axet-sap-launcher:notes -->";
const INVALID_CHARS = /[<>:"/\\|?*]/g;
const DEFAULT_CLOUD_CLIENT = "100";

// connectToSystem()'ın en tepe seviye ConnectResult.message'ı doğrudan
// renderer'da toast/hata metni olarak görünür — bu yüzden config.language'a
// göre iki dilde tutuluyor. allNotes/sap-context.md içeriği bu kapsamda
// DEĞİL, o hâlâ Türkçe (axet.code'un okuduğu teknik günlük, kullanıcıya
// gösterilmiyor).
function connectMsg(
  language: "tr" | "en",
  key:
    | "projectDirFailed"
    | "missingHostOrUrl"
    | "connAdtWriteFailed"
    | "contextWriteFailed"
    | "rfcBridgeVerified"
    | "rfcBridgeRunningUnverified"
    | "rfcBridgeAutoStartFailed"
    | "samlSetupNeeded"
    | "verifiedOpening"
    | "verifiedButSelfTestFailed",
  params?: { error?: string; skillNote?: string; url?: string; detail?: string }
): string {
  const skillNote = params?.skillNote ?? "";
  const detail = params?.detail ?? "";
  const tr = {
    projectDirFailed: `Proje klasörü oluşturulamadı: ${params?.error}`,
    missingHostOrUrl: "Bu sistem için host veya ADT URL bilgisi eksik.",
    connAdtWriteFailed: `.conn_adt yazılamadı: ${params?.error}`,
    contextWriteFailed: `Bağlam dosyası yazılamadı: ${params?.error}`,
    rfcBridgeVerified: `Router raw HTTPS'i reddetti — RFC bridge otomatik başlatıldı ve kimlik bilgileri RFC üzerinden doğrulandı${skillNote}, gömülü terminal açılıyor.`,
    rfcBridgeRunningUnverified: `RFC bridge otomatik başlatıldı${skillNote} ama kimlik doğrulaması tamamlanamadı (${detail}) — gömülü terminal yine de açılıyor, detay için sap-context.md'ye bak.`,
    rfcBridgeAutoStartFailed: `Router raw HTTPS'i reddetti, RFC bridge otomatik başlatılamadı (${detail})${skillNote} — gömülü terminal yine de açılıyor, elle kurulum adımları için sap-context.md'ye bak.`,
    samlSetupNeeded: `Bu sistem SAML SSO gerektiriyor (kimlik bilgileri Basic Auth ile hiç kontrol edilemedi)${skillNote} — gömülü terminal açılıyor, ilk iş olarak sap-context.md'deki "Cloud / BTP Sistem Notları" bölümündeki login_saml_sso.py adımlarını izle.`,
    verifiedOpening: `Bağlantı doğrulandı, gömülü terminal açılıyor${skillNote} (${params?.url})`,
    verifiedButSelfTestFailed: `Bağlantı doğrulandı ama adt-tool.ps1 self-test başarısız${skillNote} — sap-context.md'de detay var (${params?.url})`
  };
  const en = {
    projectDirFailed: `Could not create project folder: ${params?.error}`,
    missingHostOrUrl: "Host or ADT URL information is missing for this system.",
    connAdtWriteFailed: `Failed to write .conn_adt: ${params?.error}`,
    contextWriteFailed: `Failed to write context file: ${params?.error}`,
    rfcBridgeVerified: `Router rejected raw HTTPS — RFC bridge auto-started and credentials verified over RFC${skillNote}, opening embedded terminal.`,
    rfcBridgeRunningUnverified: `RFC bridge auto-started${skillNote} but credential verification did not complete (${detail}) — opening embedded terminal anyway, see sap-context.md for details.`,
    rfcBridgeAutoStartFailed: `Router rejected raw HTTPS, RFC bridge auto-start failed (${detail})${skillNote} — opening embedded terminal anyway, see sap-context.md for manual setup steps.`,
    samlSetupNeeded: `This system requires SAML SSO (credentials could never be checked via Basic Auth)${skillNote} — opening embedded terminal, first follow the login_saml_sso.py steps in sap-context.md's "Cloud / BTP System Notes" section.`,
    verifiedOpening: `Connection verified, opening embedded terminal${skillNote} (${params?.url})`,
    verifiedButSelfTestFailed: `Connection verified but adt-tool.ps1 self-test failed${skillNote} — see sap-context.md for details (${params?.url})`
  };
  return (language === "en" ? en : tr)[key];
}

function skillNoteFor(language: "tr" | "en", count: number): string {
  return language === "en" ? `, ${count} skills installed` : `, ${count} skill kuruldu`;
}
const DEFAULT_RFC_BRIDGE_PORT = 8788;
const DEFAULT_READONLY_SERVER_PORT = 8787;

interface RfcBridgeConfig {
  ashost: string;
  sysnr: string;
  saprouter: string;
  bridgePort: number;
}

// Gerçek tespit mantığı sapRouter.ts'te (isRouterPermissionDeniedMessage) —
// orası tek doğruluk kaynağı: -94/NIEROUT_PERM_DENIED VE router metninde
// "permission denied" geçen ama farklı bir return_code (canlı bulgu: -93)
// dönen sistemleri de kapsıyor, kod numarasına göre kırılgan bir kontrol
// burada tekrarlanmıyor.
const isRouterPermissionDenied = isRouterPermissionDeniedMessage;

// bridgeVerify.message artık adt_rfc_bridge.py'nin 502 gövdesindeki gerçek
// pyrfc/RFC istisna metnini de içeriyor (bkz. adtDiscovery.ts
// unexpectedStatusMessage) — bu, RFC bridge ayakta ama SAP'a gerçek RFC
// bağlantısı kuramadığında (Basis'in saprouttab'ında RFC/gateway trafiği
// için de ayrı bir izin satırı gerekebilir, raw HTTPS izni RFC'yi
// kapsamıyor) kök sebebi tahmin etmek zorunda kalmadan doğrudan gösteriyor.
// Burada yaygın kalıpları tanıyıp elle teşhis yapmadan aynı sonuca (Basis/
// saprouttab RFC izni mi, ağ/parametre hatası mı, yoksa RFC logon hatası mı)
// otomatik ulaşan kısa bir not ekliyoruz.
function describeRfcEndpointFailure(message: string): string {
  if (/NIEROUT_PERM_DENIED|route permission denied/i.test(message)) {
    return "SAProuter RFC/gateway trafiğini de reddediyor — Basis'in saprouttab'a bu ashost:sysnr için ayrı bir RFC izin satırı (P) eklemesi gerekiyor, kimlik bilgisi sorunu değil.";
  }
  // "Zaman aşımı"/"Timed out" burada AYRI ve ÖNCELİKLİ bir dal — bu router'ın
  // NI_RTERR ile AÇIKÇA reddettiği (-94/-93, üstteki dal) durumdan farklı:
  // paket sessizce DÜŞÜRÜLÜYOR (ne kabul ne ret), bu genelde router'ın DIAG
  // (32<instance no>, örn. 3200) için izin verdiği ama RFC/CPIC istemcisinin
  // GERÇEKTE bağlandığı GATEWAY portu (33<instance no>, örn. 3300 — DIAG'dan
  // FARKLI bir port) için hiç izin VERMEDİĞİ bir durumun işaretidir — router
  // bu porta ait bir kural bulamayıp paketi TCP/firewall seviyesinde
  // sessizce yutuyor olabilir (yanıt yok, ne NI_PONG ne NI_RTERR). Eskiden bu
  // dal sadece İngilizce "timed? ?out" arıyordu, launcher varsayılan dili
  // Türkçe ("Zaman aşımı") olduğu için bu bulgu (Occlutech/OEQ canlı test)
  // hiçbir zaman tetiklenmiyordu — kullanıcı "Zaman aşımı" mesajını hiçbir
  // ek açıklama/yönlendirme olmadan görüyordu.
  if (/zaman aşımı/i.test(message)) {
    return "Bu bir \"zaman aşımı\" — router paketi AÇIKÇA reddetmedi (NI_RTERR/-94/-93 değil), sessizce yanıtsız bıraktı. Büyük olasılıkla router'ın izin tablosu SAP GUI'nin kullandığı DIAG/dispatcher portuna (örn. 3200) izin veriyor ama RFC istemcisinin gerçekte bağlandığı FARKLI bir port olan GATEWAY portuna (aynı instance no ile 33xx, örn. 3300) hiç izin vermiyor — Basis/network ekibine bu ayrımı (dispatcher değil, gateway portu) özellikle belirt. Kimlik bilgisi sorunu değil.";
  }
  if (/RFC_COMMUNICATION_FAILURE|partner.*not reached|connection refused|econnrefused|timed? ?out|WSAETIMEDOUT/i.test(message)) {
    return "RFC bağlantısının kendisi router üzerinden application server/gateway'e ulaşamadı — büyük olasılıkla Basis'in saprouttab'daki RFC izni veya yanlış ashost/sysnr, kimlik bilgisi sorunu değil.";
  }
  if (/logon (failed|denied)|name or password is incorrect|user.*locked/i.test(message)) {
    return "RFC logon'un kendisi reddedildi — bu sistem için kullanıcı adı/şifre/client'ı özellikle kontrol et (RFC logon, HTTP Basic Auth kontrolünden farklı davranabilir).";
  }
  return "";
}

// Ham TCP connect denemesi (HTTP/TLS YOK) — sadece "bu portta bir dinleyici
// var mı" sorusuna cevap arıyor. Router'sız sistemlerde tüm ADT/HTTPS
// portları ağ/firewall seviyesinde tamamen engelliyken bile SAP'ın kendi
// native gateway portu (DIAG portu + 100, SAP'ın kendi 32xx/33xx kuralı)
// açık kalabiliyor — canlı kanıt: Eclipse ADT'nin "SAP GUI connection"
// tabanlı projeleri HTTPS yerine tam olarak bu porttan (netstat ile
// doğrulandı) RFC/SADT_REST_RFC_ENDPOINT üzerinden bağlanıyor. Bu fonksiyon
// o kararı (RFC bridge'i denemeye değer mi) vermek için kullanılıyor.
function probeTcpPort(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

interface RfcBridgeOutcome {
  started: boolean;
  verified: boolean;
  credentialsInvalid: boolean;
  detailNote: string;
  verifyMessage: string;
}

// Router -94/NIEROUT_PERM_DENIED tespit edilince kullanıcıya elle
// "py adt_rfc_bridge.py --port ..." çalıştırmasını söylemek yerine launcher
// bunu kendisi yapar: proje klasörüne kopyalanan adt_rfc_bridge.py'yi spawn
// eder (rfcBridgeManager.ts), /health ile ayakta olduğunu doğrular, sonra
// bridge üzerinden GERÇEK bir kimlik doğrulama isteği (verifyCredentials,
// http://127.0.0.1:<port>) atarak RFC/router zincirinin uçtan uca çalıştığını
// kanıtlar — Limak sisteminde elle izlenen adımların (bkz. PROJE-BILGI.md)
// otomatikleştirilmiş hali.
async function attemptRfcBridgeAutoStart(
  skillInstall: SkillInstallResult,
  projectDir: string,
  rfcBridge: RfcBridgeConfig,
  credentials: SystemCredentials,
  pythonPath: string,
  language: "tr" | "en",
  sapnwrfcHome?: string
): Promise<RfcBridgeOutcome> {
  const scriptRel = ["sap-adt-readonly", "scripts", "adt_rfc_bridge.py"];
  const projectScript = path.join(projectDir, ".axet-code", "skills", ...scriptRel);
  const toolkitScript = skillInstall.toolkitRoot ? path.join(skillInstall.toolkitRoot, "abaper", "skills", ...scriptRel) : null;
  const scriptPath = existsSync(projectScript) ? projectScript : toolkitScript && existsSync(toolkitScript) ? toolkitScript : null;

  if (!scriptPath) {
    return {
      started: false,
      verified: false,
      credentialsInvalid: false,
      verifyMessage: "",
      detailNote: "adt_rfc_bridge.py bulunamadı (SAP toolkit kurulu değil gibi görünüyor) — RFC bridge otomatik başlatılamadı, elle kuruluma bak."
    };
  }

  const startResult = await startRfcBridge({ projectDir, scriptPath, pythonPath, bridgePort: rfcBridge.bridgePort, sapnwrfcHome });
  if (!startResult.ok) {
    return {
      started: false,
      verified: false,
      credentialsInvalid: false,
      verifyMessage: "",
      detailNote: `RFC bridge otomatik başlatılamadı: ${startResult.message}`
    };
  }

  const bridgeUrl = `http://127.0.0.1:${rfcBridge.bridgePort}`;
  // 20s'ten 45s'e çıkarıldı — SAProuter üzerinden ilk RFC bağlantısının
  // açılması (pyrfc.Connection(), TCP connect + native NI_ROUTE + RFC logon)
  // düz HTTPS'ten belirgin şekilde daha uzun sürebiliyor (canlı bulgu:
  // Occlutech/OEQ). Eski 20s'lik süre, bağlantı aslında yavaş-ama-çalışır
  // durumdayken bile bizim tarafımızda erken "Zaman aşımı" üretebiliyordu —
  // bu da adt_rfc_bridge.py'deki tek global lock'un ARKASINDA sıraya giren
  // sıradaki isteğin de aynı yanıltıcı sonucu almasına yol açıyordu (bkz.
  // adt_rfc_bridge.py _ensure_connection() lock timeout notu).
  const bridgeVerify = await verifyCredentials(bridgeUrl, credentials.username, credentials.password, credentials.client, 45000, undefined, language);

  if (bridgeVerify.ok) {
    return {
      started: true,
      verified: true,
      credentialsInvalid: false,
      verifyMessage: bridgeVerify.message,
      detailNote: `RFC bridge otomatik başlatıldı (${bridgeUrl}) ve kimlik bilgileri RFC üzerinden doğrulandı ✓.`
    };
  }
  if (bridgeVerify.status === 401) {
    return {
      started: true,
      verified: false,
      credentialsInvalid: true,
      verifyMessage: bridgeVerify.message,
      detailNote: `RFC bridge çalışıyor (${bridgeUrl}) ama kimlik doğrulama başarısız: ${bridgeVerify.message}`
    };
  }
  return {
    started: true,
    verified: false,
    credentialsInvalid: false,
    verifyMessage: bridgeVerify.message,
    detailNote: `RFC bridge başlatıldı (${bridgeUrl}) ama kimlik doğrulaması tamamlanamadı (${bridgeVerify.message}) — bridge yine de çalışır durumda, %sap-adt-readonly ile tekrar denenebilir.${
      describeRfcEndpointFailure(bridgeVerify.message) ? ` ${describeRfcEndpointFailure(bridgeVerify.message)}` : ""
    }`
  };
}

interface ReadonlyServerOutcome {
  started: boolean;
  alreadyRunning: boolean;
  detailNote: string;
}

// `.conn_adt` yazıldıktan (ve varsa RFC bridge ayağa kalktıktan) SONRA
// çağrılır — router'lı VEYA router'sız HER başarılı bağlantıda `%sap-adt-
// readonly`'nin arka planındaki gerçek Python sunucusunu (adt_readonly_
// server.py, port 8787) launcher kendisi başlatır. Önceden kullanıcı/agent
// her bağlanışta terminalde elle "ADT_CWD=$(pwd) py adt_readonly_server.py
// --port 8787" çalıştırmak zorundaydı (bkz. sap-context.md "Yöntem 1")
// — artık RFC bridge otomatik başlatmasıyla (attemptRfcBridgeAutoStart)
// birebir aynı desenle, terminal açıldığında sunucu zaten canlıdır.
// Bu sunucu pyrfc/SAP NW RFC SDK gerektirmediği için gömülü RFC runtime'ı
// KULLANILMIYOR — sistemdeki "py" çalıştırıcısı kullanılıyor (mevcut elle
// kurulum dokümantasyonuyla aynı varsayım; requests/mcp/python-dotenv
// kurulu olmalı, bkz. sap-toolkit/requirements.txt).
async function attemptReadonlyServerAutoStart(
  skillInstall: SkillInstallResult,
  projectDir: string,
  port: number
): Promise<ReadonlyServerOutcome> {
  const scriptRel = ["sap-adt-readonly", "scripts", "adt_readonly_server.py"];
  const projectScript = path.join(projectDir, ".axet-code", "skills", ...scriptRel);
  const toolkitScript = skillInstall.toolkitRoot ? path.join(skillInstall.toolkitRoot, "abaper", "skills", ...scriptRel) : null;
  const scriptPath = existsSync(projectScript) ? projectScript : toolkitScript && existsSync(toolkitScript) ? toolkitScript : null;

  if (!scriptPath) {
    return {
      started: false,
      alreadyRunning: false,
      detailNote: "adt_readonly_server.py bulunamadı (SAP toolkit kurulu değil gibi görünüyor) — ADT read-only sunucusu otomatik başlatılamadı, elle kuruluma bak."
    };
  }

  const startResult = await startReadonlyServer({ projectDir, scriptPath, pythonPath: "py", port });
  if (!startResult.ok) {
    return {
      started: false,
      alreadyRunning: false,
      detailNote: `ADT read-only sunucusu otomatik başlatılamadı: ${startResult.message}`
    };
  }

  return {
    started: true,
    alreadyRunning: startResult.alreadyRunning,
    detailNote: startResult.alreadyRunning
      ? `ADT read-only sunucusu (http://127.0.0.1:${port}) zaten çalışıyordu.`
      : `ADT read-only sunucusu otomatik başlatıldı (http://127.0.0.1:${port}) ✓.`
  };
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
# RFC BRIDGE MODU — ${
        rfcBridge.saprouter
          ? `bu sistemin SAProuter'ı raw/native HTTPS tünellemeyi
# REDDETTİ (izin tablosunda kayıt yok — router sürümüne göre -94/NIEROUT_PERM_DENIED
# veya -93 gibi farklı bir return_code ile bildirilebilir, ikisi de aynı anlama gelir)
# ama native SAP protokolü (DIAG/RFC)
# trafiğine izin veriyor (SAP Logon'un neden çalıştığı budur).`
          : `bu sistemde SAProuter YOK ama ADT/HTTPS portlarının TÜMÜ ağ/firewall
# seviyesinde erişilemez durumda — SAP'ın native gateway portu (DIAG portu + 100)
# hâlâ açık olduğu için doğrudan (router'sız) RFC bridge kullanılıyor. Bu, Eclipse
# ADT'nin "SAP GUI connection" tabanlı bağlantılarda kullandığı AYNI mekanizma.`
      }
# ADT_SAP_URL
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
  rfcBridge?: RfcBridgeConfig | null,
  rfcOutcome?: RfcBridgeOutcome | null,
  readonlyOutcome?: ReadonlyServerOutcome | null,
  samlSetupNeeded?: boolean
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

  // adt_readonly_server.py artık RFC bridge ile aynı desende launcher
  // tarafından OTOMATIK başlatılıyor (attemptReadonlyServerAutoStart) —
  // bu blok agent'a körlemesine "elle başlat" komutu vermek yerine gerçek
  // durumu (başlatıldı/zaten çalışıyordu/başarısız) söylüyor.
  const readonlyServerStatusLine = (() => {
    if (!readonlyOutcome) return "- Otomatik başlatma durumu bilinmiyor (beklenmeyen akış) — elle başlatman gerekebilir.";
    if (readonlyOutcome.started) {
      return readonlyOutcome.alreadyRunning
        ? "- **Sunucu zaten çalışıyordu ✓** (http://127.0.0.1:8787) — hiçbir şey başlatmana gerek yok, doğrudan `POST /tool/<ad>` çağır."
        : "- **Sunucu OTOMATİK başlatıldı ✓** (http://127.0.0.1:8787, launcher tarafından — bu klasördeki `adt-readonly.log`'a bak) — hiçbir şey başlatmana gerek yok, doğrudan `POST /tool/<ad>` çağır.";
    }
    return `- **Otomatik başlatma BAŞARISIZ**: ${readonlyOutcome.detailNote}\n  Elle başlatman gerekiyor (aşağıdaki bash bloğuna bak) — Python bağımlılıkları kurulu değilse önce \`pip install -r "${skillInstall.toolkitRoot ?? "<sap-toolkit>"}\\requirements.txt"\` çalıştır.`;
  })();


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

  const rfcAutoStartLines = (() => {
    if (!rfcBridge) return "";
    if (!rfcOutcome) return "- Otomatik başlatma durumu bilinmiyor (beklenmeyen akış).";
    if (rfcOutcome.verified) {
      return `- **Bridge OTOMATİK başlatıldı ve kimlik bilgileri RFC üzerinden doğrulandı ✓** — launcher bu process'i arka planda ayakta tutuyor (uygulama kapanana kadar), \`%sap-adt-readonly\` doğrudan kullanılabilir, ekstra kurulum adımı YOK.
- Log: bu klasördeki \`rfc-bridge.log\`.`;
    }
    if (rfcOutcome.started) {
      return `- **Bridge başlatıldı** (\`http://127.0.0.1:${rfcBridge.bridgePort}\`, süreç çalışıyor) ama kimlik doğrulama denemesi tamamlanamadı: ${rfcOutcome.verifyMessage || rfcOutcome.detailNote}. Bridge çalışır durumda kalıyor — \`%sap-adt-readonly\` ile tekrar dene; sorun sürerse bu klasördeki \`rfc-bridge.log\`'a ve elle \`adt_rfc_probe.py\` çalıştırmaya bak.`;
    }
    return `- **Otomatik başlatma BAŞARISIZ**: ${rfcOutcome.detailNote}
- RFC bridge için gereken Python + pyrfc + SAP NW RFC SDK aXet SAP Launcher'a **gömülü** olarak geliyor — normalde ekstra bir kurulum adımı gerekmez. Bu hata genelde şu ikisinden biri:
  1. Uygulama kurulumu bozuk/eksik (\`resources/rfc-runtime\` klasörü paketlenmemiş) — uygulamayı yeniden kur.
  2. Ayarlar'da elle bir "Python çalıştırıcısı" yolu girilmiş ve o Python'da pyrfc/SDK yok — Ayarlar'dan bu alanı boşaltıp uygulamanın kendi gömülü runtime'ını kullanmasına izin ver.
- Sorun sürerse bu klasördeki \`rfc-bridge.log\`'a bak; elle tanılamak için \`%sap-adt-readonly\` skill'inin SKILL.md'sindeki "Router-only sistemler (RFC bridge)" bölümüne bak (\`adt_rfc_probe.py\` ile RFC_PING/arayüz doğrulaması).`;
  })();

  const rfcNoteBlock = rfcBridge
    ? `

## ${rfcBridge.saprouter ? "SAProuter RFC Bridge Modu — HTTPS bu sistemde ENGELLİ" : "Doğrudan RFC Bridge Modu (SAProuter YOK) — HTTPS bu sistemde ağ seviyesinde erişilemez"}
${
  rfcBridge.saprouter
    ? `- Bu sistemin SAProuter'ı (${service.routerString ?? "?"}) native/raw HTTPS tünellemeyi **REDDETTİ** (izin tablosunda kayıt yok — router sürümüne göre -94/NIEROUT_PERM_DENIED veya -93 gibi farklı bir return_code ile bildirilebilir, ikisi de aynı anlama gelir) — SAP Logon'un DIAG bağlantısı çalışıyor çünkü o native SAP protokolü, ama ADT'nin düz HTTPS'i router tarafından engelleniyor. Bu bir kimlik/ağ hatası **değil**, router'ın izin tablosu (\`saprouttab\`) kısıtı.`
    : `- Bu sistemde SAProuter TANIMLI DEĞİL ama tüm ADT/HTTPS candidate portları (443/8443/44300/50000/4443 vb.) bu makineden ağ/firewall seviyesinde **tamamen erişilemez** (zaman aşımı) — SAP'ın native gateway portu (DIAG portu + 100) ise erişilebilir olduğu için doğrudan RFC bridge'e geçildi. Canlı kanıt: Eclipse ADT'nin "SAP GUI connection" tabanlı bağlantıları tam olarak bu yüzden HTTPS değil RFC/SADT_REST_RFC_ENDPOINT kullanıyor (netstat ile doğrulandı). Bu bir kimlik hatası **değil**, ağ/firewall kısıtı — kalıcı çözüm network/Basis ekibinin bu makineden ilgili HTTPS portuna erişim açması.`
}
- Bu yüzden \`.conn_adt\`'taki \`ADT_SAP_URL\` gerçek SAP'a değil, yerel bir **RFC bridge**'e (\`http://127.0.0.1:${rfcBridge.bridgePort}\`) işaret ediyor — bu bridge \`SADT_REST_RFC_ENDPOINT\` üzerinden ${rfcBridge.saprouter ? "router'ın izin verdiği RFC kanalıyla" : "doğrudan (router'sız) RFC bağlantısıyla"} gerçek SAP'a bağlanıyor, \`%sap-adt-readonly\` tamamen **değişmeden** çalışıyor.
${rfcAutoStartLines}
- Gerçek keşfedilen (ama şu an erişilemeyen) HTTPS URL: **${verifiedUrl}** — ${rfcBridge.saprouter ? "Basis ekibi ileride \`saprouttab\`'a bu makinenin IP'sinden yukarıdaki URL'in host:port'una bir \`P\` (permit, native değil) satırı eklerse" : "network/Basis ekibi bu makinenin IP'sinden yukarıdaki URL'in host:port'una firewall/VPN'de erişim açarsa"}, \`.conn_adt\`'ta \`ADT_RFC_MODE=false\` yapıp \`ADT_SAP_URL\`'i bu adrese çevirebilirsin — doğrudan HTTPS daha basit ve daha güvenilir.
- Aktivasyon gibi çok-adımlı stateful akışlar RFC bridge üzerinden güvenilir çalışmaz (zaten bu read-only server'da aktivasyon yok) — sadece okuma araçlarını (\`adt_get_source\`, \`adt_search\`, \`adt_sql\`, vb.) bekle.`
    : "";

  const connectionStatusBlock = rfcBridge
    ? `## ADT Bağlantısı — ${rfcOutcome?.verified ? "RFC BRIDGE ÜZERİNDEN DOĞRULANDI ✓" : rfcOutcome?.started ? "RFC BRIDGE ÇALIŞIYOR (kimlik doğrulaması tamamlanamadı)" : "RFC BRIDGE GEREKLİ (otomatik başlatma başarısız)"}
- ${rfcBridge.saprouter ? "Router doğrudan HTTPS'i reddetti" : "Bu sistemde SAProuter yok ama HTTPS ağ seviyesinde tamamen erişilemez"}, bkz. aşağıdaki "${rfcBridge.saprouter ? "SAProuter RFC Bridge Modu" : "Doğrudan RFC Bridge Modu"}" bölümü.
- adt-tool.ps1 bu modda yazılmadı/çalıştırılmadı (o script düz HTTPS kullanır, bu sistemde işe yaramaz).
- Keşif/doğrulama adımları (referans):
${notesBlock}`
    : samlSetupNeeded
      ? `## ADT Bağlantısı — SAML SSO GEREKLİ (kimlik bilgileri HİÇ DOĞRULANAMADI)
- ADT discovery isteği HTTP 200 döndürdü ama gövde bir ADT XML'i değil, bir **SAML/SSO giriş sayfası (HTML)** — bu, kullanıcı adı/şifre doğru olsun olmasın DEĞİŞMEYEN bir davranış, kimlik bilgileri Basic Auth ile hiçbir zaman kontrol edilmedi.
- **Terminal bilerek açıldı** (ok:true) ama bağlantı DOĞRULANMADI (verified:false) — bu bir hata durumu değil, bu sistemin normal/beklenen kimlik doğrulama şekli SAML SSO.
- adt-tool.ps1 bu durumda yazılmadı (o da aynı şekilde Basic Auth kullanır, aynı HTML sayfasını alır).
- **İlk iş olarak aşağıdaki "Cloud / BTP Sistem Notları" bölümündeki SAML giriş akışını (login_saml_sso.py) izle** — ADT_SAML_COOKIES_FILE elde edilip .conn_adt'a eklenmeden gerçek bir ADT çağrısı (adt_get_source, adt_search vb.) çalışmaz.
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
Python tabanlı gerçek ADT engine, 20 read-only tool sunar (adt_get_source, adt_search, adt_sql, adt_where_used, adt_syntax_check, adt_atc_check, adt_unit_test, adt_list_package, adt_revisions, adt_dumps, adt_list_transports, vb.). Detaylar için \`%sap-adt-readonly\` skill'ini oku (SKILL.md).

**Otomatik başlatma durumu (launcher tarafından, bu bağlanışta):**
${readonlyServerStatusLine}

\`\`\`bash
# Sunucu ayakta mı? (yukarıdaki durum "BAŞARISIZ" değilse zaten ayakta olmalı)
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())" 2>/dev/null || echo "NOT RUNNING"
# SADECE yukarıdaki durum "BAŞARISIZ" ise elle başlat (run_in_background: true):
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
  const language = config.language ?? "tr";
  const projectDir = computeProjectDir(config, req.customerPath, req.service);

  try {
    mkdirSync(projectDir, { recursive: true });
  } catch (err) {
    return { ok: false, verified: false, projectDir, message: connectMsg(language, "projectDirFailed", { error: (err as Error).message }) };
  }

  const host = req.service.host;
  const manualUrl = req.service.manualAdtUrl;

  if (!host && !manualUrl) {
    return {
      ok: false,
      verified: false,
      projectDir,
      message: connectMsg(language, "missingHostOrUrl")
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
    verify = await verifyCredentials(normalizedUrl, credentials.username, credentials.password, credentials.client, undefined, undefined, language);
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
      routerString,
      language
    );

    if (!verify.ok && verify.status !== 401 && discovery.alternateUrl && !routerString) {
      allNotes.push(`Birincil URL (${discovery.url}) ağ seviyesinde başarısız oldu, alternatif deneniyor: ${discovery.alternateUrl}`);
      const altVerify = await verifyCredentials(discovery.alternateUrl, credentials.username, credentials.password, credentials.client, undefined, undefined, language);
      if (altVerify.ok || altVerify.status === 401) {
        verify = altVerify;
        finalUrl = discovery.alternateUrl;
      }
    }
  }

  allNotes.push(verify.ok ? `Kimlik doğrulama başarılı (${finalUrl})` : `Kimlik doğrulama başarısız: ${verify.message}`);

  const routerString = req.service.routerString;
  let rfcBridge: RfcBridgeConfig | null = null;
  // SAML/SSO login sayfası tespit edilen sistemler (bkz. adtDiscovery.ts
  // looksLikeSamlLoginPage) için ayrı bir bayrak — RFC bridge GEREKMİYOR
  // (aksine gerçek çözüm tarayıcı tabanlı bir SAML akışı, %sap-adt-readonly
  // skill'indeki login_saml_sso.py), ama önceden bu durumda da diğer TÜM
  // "!verify.ok" durumlarıyla aynı jenerik dala düşülüp .conn_adt/
  // sap-context.md HİÇ yazılmıyordu — kullanıcı login_saml_sso.py'nin
  // ihtiyaç duyduğu .conn_adt'ı asla elde edemiyordu (canlı bulgu,
  // 2026-09-02, "test"/DA8 S/4HANA Cloud sistemi). Artık bu durumda da
  // diğer iki bridge senaryosuyla AYNI desende devam ediliyor: dosyalar
  // yazılır, terminal açılır, sadece ok:true+verified:false ile net bir
  // "önce SAML login akışını izle" mesajı döner.
  let samlSetupNeeded = false;

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
  } else if (!verify.ok && !manualUrl && !routerString && verify.status === null && host) {
    // SAProuter YOK ama tüm ADT/HTTPS portları ağ/firewall seviyesinde
    // tamamen erişilemez (verify.status===null → hiçbir port HTTP yanıtı
    // vermedi, sadece 401/başka status DEĞİL). Canlı kanıt (Exeltis/QUB,
    // 2026-09-02): bu durumda SAP'ın DIAG portu (host+diagPort) VE gateway
    // portu (aynı + 100, SAP'ın kendi 32xx/33xx kuralı) hâlâ açık olabiliyor
    // — Eclipse ADT'nin "SAP GUI connection" tabanlı projeleri tam olarak bu
    // yüzden RFC/SADT_REST_RFC_ENDPOINT üzerinden bağlanıyor (netstat ile
    // doğrulandı: eclipse.exe bu sisteme sadece gateway portundan bağlı,
    // HTTP(S) portlarına hiç bağlı değil). Gateway portu gerçekten açıksa
    // (ucuz bir TCP probe ile doğrulanıyor — VPN tamamen kapalıysa bu da
    // başarısız olur, boşuna RFC bridge denenmez) doğrudan/router'sız RFC
    // bridge moduna geçiyoruz.
    const gatewayPort = req.service.port ? req.service.port + 100 : null;
    const gatewayReachable = gatewayPort ? await probeTcpPort(host, gatewayPort, 3000) : false;
    if (gatewayReachable) {
      const instanceNr = guessInstanceNumber(req.service.port) ?? "00";
      rfcBridge = {
        ashost: host,
        sysnr: instanceNr,
        saprouter: "",
        bridgePort: DEFAULT_RFC_BRIDGE_PORT
      };
      allNotes.push(
        `Tüm ADT/HTTPS portları ağ seviyesinde erişilemez durumda (zaman aşımı/bağlantı hatası) ama SAP'ın native gateway portu (${host}:${gatewayPort}) erişilebilir — SAProuter YOK, doğrudan (router'sız) RFC bridge moduna geçiliyor. Bu, Eclipse ADT'nin "SAP GUI connection" tabanlı bağlantılarda kullandığı AYNI mekanizma (SADT_REST_RFC_ENDPOINT, canlı netstat ile doğrulandı). Kimlik bilgileri bu launcher tarafından HTTP ile doğrulanamadı; gerçek doğrulama RFC bridge kurulumu sırasında yapılmalı.`
      );
    } else {
      return {
        ok: false,
        verified: false,
        projectDir,
        message: verify.message,
        trustedCertificates: trustedCertificatesUpdate
      };
    }
  } else if (!verify.ok && verify.samlDetected) {
    samlSetupNeeded = true;
    allNotes.push(
      "Bu sistem SAML SSO gerektiriyor — Basic Auth ile atılan doğrulama isteği kimlik bilgilerini hiç kontrol etmeden bir HTML giriş sayfası döndürdü. " +
        "RFC bridge gerekmez, gerçek çözüm %sap-adt-readonly skill'indeki login_saml_sso.py (tarayıcı tabanlı SAML akışı) — .conn_adt yine de yazılıyor ki bu script çalışabilsin."
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
    return { ok: false, verified: verify.ok, projectDir, message: connectMsg(language, "connAdtWriteFailed", { error: (err as Error).message }) };
  }
  ensureGitignore(projectDir);

  // Skill kurulumu, RFC bridge otomatik başlatmasından ÖNCE yapılıyor —
  // adt_rfc_bridge.py'nin proje klasöründeki kopyası (.axet-code/skills/...)
  // bridge'i spawn etmeden önce diskte hazır olmalı.
  const skillInstall = installSkillsIntoProject(projectDir);

  let toolTest = { ok: false, detail: "RFC bridge modunda adt-tool.ps1 self-test atlandı" };
  let rfcOutcome: RfcBridgeOutcome | null = null;

  if (rfcBridge) {
    const embedded = getEmbeddedRfcRuntime();
    const pythonPath = embedded?.pythonPath || "py";
    const sapnwrfcHome = embedded?.sapnwrfcHome;
    rfcOutcome = await attemptRfcBridgeAutoStart(skillInstall, projectDir, rfcBridge, credentials, pythonPath, language, sapnwrfcHome);
    allNotes.push(rfcOutcome.detailNote);
  } else if (samlSetupNeeded) {
    // adt-tool.ps1 self-test'i burada da atlanıyor — bu script de aynı
    // Basic Auth + finalUrl'i kullanıyor, SAML sistemde o da kaçınılmaz
    // olarak HTML sayfası alıp "self-test BAŞARISIZ" diyecekti; bu yanıltıcı
    // "TLS/sertifika sorunu" notunu (gerçek sebep SAML olduğu için) hiç
    // üretmemek için hiç çalıştırılmıyor.
    toolTest = { ok: false, detail: "Bu sistem SAML SSO gerektiriyor — adt-tool.ps1 self-test atlandı (aynı sebep, Basic Auth çalışmıyor)." };
  } else {
    try {
      writeFileSync(path.join(projectDir, "adt-tool.ps1"), buildAdtToolScript(), "utf-8");
      toolTest = await testAdtToolScript(projectDir);
    } catch {
      // yardımcı script best-effort, kritik değil ama toolTest.ok=false kalır ve context'e not düşülür
    }
  }

  // ADT read-only sunucusu (%sap-adt-readonly, port 8787) — RFC bridge
  // kimlik doğrulaması kesin başarısız olduysa (credentialsInvalid, terminal
  // hiç açılmayacak) başlatmaya çalışmanın anlamı yok; diğer tüm durumlarda
  // (router'lı/router'sız, doğrulanmış/doğrulanamamış) başlatılır.
  let readonlyOutcome: ReadonlyServerOutcome | null = null;
  if (!rfcBridge || !rfcOutcome?.credentialsInvalid) {
    readonlyOutcome = await attemptReadonlyServerAutoStart(skillInstall, projectDir, DEFAULT_READONLY_SERVER_PORT);
    allNotes.push(readonlyOutcome.detailNote);
  }

  const contextFile = path.join(projectDir, "sap-context.md");
  const generated = buildContextMarkdown(req, finalUrl, allNotes, toolTest, skillInstall, rfcBridge, rfcOutcome, readonlyOutcome, samlSetupNeeded);
  const finalContent = mergeWithExistingNotes(generated, contextFile);

  try {
    writeFileSync(contextFile, finalContent, "utf-8");
  } catch (err) {
    return { ok: false, verified: verify.ok, projectDir, message: connectMsg(language, "contextWriteFailed", { error: (err as Error).message }) };
  }

  const skillNote = skillInstall.toolkitRoot ? skillNoteFor(language, skillInstall.installed.length) : "";

  if (rfcBridge && rfcOutcome) {
    if (rfcOutcome.credentialsInvalid) {
      return {
        ok: false,
        verified: false,
        projectDir,
        message: rfcOutcome.verifyMessage,
        trustedCertificates: trustedCertificatesUpdate
      };
    }
    return {
      ok: true,
      verified: rfcOutcome.verified,
      projectDir,
      message: rfcOutcome.started
        ? rfcOutcome.verified
          ? connectMsg(language, "rfcBridgeVerified", { skillNote })
          : connectMsg(language, "rfcBridgeRunningUnverified", { skillNote, detail: rfcOutcome.verifyMessage || rfcOutcome.detailNote })
        : connectMsg(language, "rfcBridgeAutoStartFailed", { skillNote, detail: rfcOutcome.detailNote }),
      trustedCertificates: trustedCertificatesUpdate,
      effectiveClient: credentials.client
    };
  }

  if (samlSetupNeeded) {
    return {
      ok: true,
      verified: false,
      projectDir,
      message: connectMsg(language, "samlSetupNeeded", { skillNote }),
      trustedCertificates: trustedCertificatesUpdate,
      effectiveClient: credentials.client
    };
  }

  return {
    ok: true,
    verified: true,
    projectDir,
    message: toolTest.ok
      ? connectMsg(language, "verifiedOpening", { skillNote, url: finalUrl })
      : connectMsg(language, "verifiedButSelfTestFailed", { skillNote, url: finalUrl }),
    trustedCertificates: trustedCertificatesUpdate,
    effectiveClient: credentials.client
  };
}
