import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import type { ConnectorProvider, ConnectorTestResult } from "../shared/types";

// Uygulama Bağlantıları — Outlook/SharePoint connector'ları (2026-08-29,
// mimari pivotu). ÖNCEKİ tur (@azure/msal-node ile kullanıcının kendi Azure
// AD "App Registration"ını girip device-code OAuth yapması) TAMAMEN
// KALDIRILDI — kullanıcının kesin talebi: "tenant id falan onları geçelim,
// biz axet.nttdata.com/agentic/ platformunu kullanıyoruz, orada outlook_
// tools/sharepoint_tools diye MCP'ler var, bu şekilde connector yapalım".
//
// Gerçek mimari (kullanıcının seçtiği "axet-code CLI üzerinden delege et"
// yaklaşımı): bu launcher'ın kendisi HİÇBİR ZAMAN axet.nttdata.com'a
// doğrudan bir HTTP/MCP isteği ATMIYOR ve hiçbir token/kimlik bilgisi
// SAKLAMIYOR. Onun yerine, `axet.code`'un (bu CLI'nın) kendi Okta SSO
// oturumu (`axet-code login` — CLI'nın kendi komutu, bkz.
// AppConnectionsSection.tsx'teki gömülü terminal) üzerinden ZATEN erişebi-
// ldiği "Connector"lar (aXet Agentic platformunun MCP araç sunucuları,
// bkz. PROJE_BILGI.md "aXet.code Hakkında" bölümü) kullanılıyor — bu
// launcher sadece `axet-code run -q "<prompt>"` çağırıp CLI'nın kendi
// connector'ı çağırmasını VE sonucu belirli bir formatta rapor etmesini
// istiyor, tıpkı axetChat.ts'in sohbet mesajlarını çalıştırma şekliyle
// AYNI desen (stateless, tek-atış `run` modu, requestId bazlı iptal).
const PROVIDER_MCP_URL: Record<ConnectorProvider, string> = {
  outlook: "https://axet.nttdata.com/api/agentic-mcp-tools/outlook_tools/mcp",
  sharepoint: "https://axet.nttdata.com/api/agentic-mcp-tools/sharepoint_tools/mcp"
};

export function mcpUrlFor(provider: ConnectorProvider): string {
  return PROVIDER_MCP_URL[provider];
}

// Her provider için, ajanın KENDİ connector aracını (mail/SharePoint MCP
// tool'u) kullanıp GÜVENLİ/salt-okunur bir çağrı yapmasını ve sonucu KESİN
// bir formatta (regex ile ayrıştırılabilir tek satır) raporlamasını isteyen
// promptlar. Ajanın hangi tool adını kullanacağını BİLEREK belirtmiyoruz
// (tool adları connector sürümüyle değişebilir) — sadece "bir mail/
// SharePoint connector aracın var, onu kullan" diyoruz, ajan kendi
// keşfettiği aracı seçiyor. "Hiçbir şey gönderme/silme/değiştirme" kısıtı
// KASITLI ve AÇIK — bu bir bağlantı testi, gerçek bir işlem değil.
//
// CANLI BULGU (2026-08-30): kullanıcı gerçek bir testte "Outlook integration
// is unauthorized (state 'ERROR' — authorization flow not completed)"
// hatası aldı. Kök sebep araştırması (bu makinedeki gerçek axet-code'a
// karşı canlı test, `axet-code run -q "list your available tools..."`) şunu
// gösterdi: aynı provider (Outlook) için axet.nttdata.com/agentic
// platformunda BİRDEN FAZLA ayrı "Integration" (connection ID'siyle
// ayrılan, örn. `mcp_conn_<uuid>_outlook_read`) kayıtlı olabiliyor —
// muhtemelen tekrarlanan re-authorization denemelerinden kalan kalıntılar.
// Bunlardan BİR kısmı çalışıyor, bir kısmı 'ERROR' durumunda kalmış. Agent
// önceki (tek-deneme) prompt'la İLK bulduğu tool'u deniyordu — eğer o
// bozuksa hemen CONNECTOR_FAIL diyordu, ÇALIŞAN diğer entegrasyonu hiç
// denemiyordu. Prompt bu yüzden GÜNCELLENDİ: ajan artık "unauthorized/
// error state/authorization flow" hatası alırsa AYNI provider için farklı
// bir connector tool'u (varsa) DENEMEYE devam ediyor, hepsi başarısız
// olana kadar. Bu değişiklik BU MAKİNEDE gerçek axet-code'a karşı canlı
// doğrulandı: 3 ayrı outlook entegrasyonundan 2'si 'ERROR' durumundaydı,
// yeni prompt'la ajan 3.'yü (çalışan) buldu ve "CONNECTOR_OK: Inbox folder
// found via second connector (...)" ile başarılı oldu.
const PROVIDER_TEST_PROMPT: Record<ConnectorProvider, string> = {
  outlook:
    "You have access to one or more Outlook / Microsoft 365 mail connector tools (their tool names will contain \"outlook\"). " +
    "There may be MULTIPLE separate connector instances/integrations registered for this same provider (e.g. from repeated re-authorization attempts) — some may be broken (in an error/unauthorized state) while others work fine. " +
    "Try calling ONE safe, READ-ONLY action (for example: check whether the \"Inbox\" folder exists, or read the current out-of-office/automatic-replies status) from the FIRST available outlook connector tool. " +
    "If that specific call fails because the underlying integration is unauthorized, in an error state, or needs an authorization flow completed, DO NOT give up yet: try the SAME kind of safe read-only action on the NEXT distinct outlook connector tool (if one exists), and keep trying additional distinct outlook connector tools (skipping ones you already tried) until one succeeds OR you have tried all distinct outlook connector tools available to you. " +
    "Never call more than one action per distinct tool, and never send, delete, move, or modify anything. " +
    "After you are done, reply with EXACTLY one line and nothing else: " +
    'if ANY of the outlook connector tools worked, write "CONNECTOR_OK: " followed by a short human-readable detail (e.g. the folder name or status you saw); ' +
    'if ALL of them failed (or none exist), write "CONNECTOR_FAIL: " followed by a short reason (mention how many distinct tools/integrations you tried).',
  sharepoint:
    "You have access to one or more SharePoint connector tools (their tool names will contain \"sharepoint\" or \"shp\"). " +
    "There may be MULTIPLE separate connector instances/integrations registered for this same provider (e.g. from repeated re-authorization attempts) — some may be broken (in an error/unauthorized state) while others work fine. " +
    "Try calling ONE safe, READ-ONLY action (for example: list files/folders in a known or default site/library) from the FIRST available sharepoint connector tool. " +
    "If that specific call fails because the underlying integration is unauthorized, in an error state, or needs an authorization flow completed, DO NOT give up yet: try the SAME kind of safe read-only action on the NEXT distinct sharepoint connector tool (if one exists), and keep trying additional distinct sharepoint connector tools (skipping ones you already tried) until one succeeds OR you have tried all distinct sharepoint connector tools available to you. " +
    "Never call more than one action per distinct tool, and never upload, delete, move, or modify anything. " +
    "After you are done, reply with EXACTLY one line and nothing else: " +
    'if ANY of the sharepoint connector tools worked, write "CONNECTOR_OK: " followed by a short human-readable detail (e.g. the site or item you saw); ' +
    'if ALL of them failed (or none exist), write "CONNECTOR_FAIL: " followed by a short reason (mention how many distinct tools/integrations you tried).'
};

// Ajanın çıktısı bazen ek açıklama/markdown içerebilir (LLM'in "sadece bu
// satırı yaz" talimatına her zaman harfiyen uymaması ihtimaline karşı) —
// bu yüzden TÜM metin içinde bu deseni ARAR (anchor'lamaz), en son eşleşen
// (agent genelde en sonda özet satırı yazar) esas alınır.
const RESULT_PATTERN = /CONNECTOR_(OK|FAIL):\s*(.*)/gi;

function parseConnectorResult(text: string): { connected: boolean; detail: string } | null {
  let match: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  RESULT_PATTERN.lastIndex = 0;
  while ((match = RESULT_PATTERN.exec(text)) !== null) {
    last = match;
  }
  if (!last) return null;
  return { connected: last[1].toUpperCase() === "OK", detail: last[2].trim() };
}

// requestId -> aktif `axet-code run` process'i (axetChat.ts'teki iptal
// deseniyle AYNI — kullanıcı testi "İptal Et" ile durdurabilsin).
const running = new Map<string, ChildProcess>();

export function testConnector(requestId: string, provider: ConnectorProvider, cwd: string): Promise<ConnectorTestResult> {
  return new Promise((resolve) => {
    const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
    try {
      mkdirSync(resolvedCwd, { recursive: true });
    } catch {
      // spawn zaten anlamlı bir hatayla patlar
    }

    let proc: ChildProcess;
    try {
      proc = spawn("axet-code", ["run", "-q", PROVIDER_TEST_PROMPT[provider]], {
        cwd: resolvedCwd,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (err) {
      resolve({ ok: false, connected: false, detail: "", error: (err as Error).message });
      return;
    }
    running.set(requestId, proc);

    let stdout = "";
    let stderr = "";
    let killedByUser = false;
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    proc.on("error", (err) => {
      running.delete(requestId);
      resolve({ ok: false, connected: false, detail: "", error: err.message });
    });

    proc.on("close", (code) => {
      running.delete(requestId);
      if (killedByUser) {
        resolve({ ok: false, connected: false, detail: "", cancelled: true });
        return;
      }
      const parsed = parseConnectorResult(stdout);
      if (parsed) {
        resolve({ ok: true, connected: parsed.connected, detail: parsed.detail });
        return;
      }
      // Ajan beklenen formatta cevap vermedi (nadiren) veya CLI hata verdi
      // (örn. giriş yapılmamış) — ham çıktıyı/hatayı olduğu gibi geri döner,
      // UI kullanıcıya bu ham metni gösterebilir.
      resolve({
        ok: false,
        connected: false,
        detail: stdout.trim(),
        error: code === 0 ? undefined : (stderr || `axet-code çıkış kodu: ${code}`).trim()
      });
    });

    (proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled = () => {
      killedByUser = true;
    };
  });
}

export function cancelConnectorTest(requestId: string): void {
  const proc = running.get(requestId);
  if (!proc) return;
  (proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled?.();
  try {
    proc.kill();
  } catch {
    // process zaten kapanmış olabilir
  }
  running.delete(requestId);
}

export function cancelAllConnectorTests(): void {
  for (const id of Array.from(running.keys())) cancelConnectorTest(id);
}
