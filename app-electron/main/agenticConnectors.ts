import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import type { ConnectorProvider, ConnectorTestResult } from "../shared/types";
import {
  findSessionByPrompt,
  matchKey,
  readMessagesSince,
  resolveSessionDb,
  type AxetDbMessage
} from "./axetSessionDb";
import { learnConnectorHealth } from "./connectorHealth";

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
    'if NO outlook connector tool exists at all (you have zero such tools available), write "CONNECTOR_NONE: " followed by a short note about what you do have; ' +
    'if such tools exist but ALL of them failed, write "CONNECTOR_FAIL: " followed by a short reason (mention how many distinct tools/integrations you tried).',
  sharepoint:
    "You have access to one or more SharePoint connector tools (their tool names will contain \"sharepoint\" or \"shp\"). " +
    "There may be MULTIPLE separate connector instances/integrations registered for this same provider (e.g. from repeated re-authorization attempts) — some may be broken (in an error/unauthorized state) while others work fine. " +
    "Try calling ONE safe, READ-ONLY action (for example: list files/folders in a known or default site/library) from the FIRST available sharepoint connector tool. " +
    "If that specific call fails because the underlying integration is unauthorized, in an error state, or needs an authorization flow completed, DO NOT give up yet: try the SAME kind of safe read-only action on the NEXT distinct sharepoint connector tool (if one exists), and keep trying additional distinct sharepoint connector tools (skipping ones you already tried) until one succeeds OR you have tried all distinct sharepoint connector tools available to you. " +
    "Never call more than one action per distinct tool, and never upload, delete, move, or modify anything. " +
    "After you are done, reply with EXACTLY one line and nothing else: " +
    'if ANY of the sharepoint connector tools worked, write "CONNECTOR_OK: " followed by a short human-readable detail (e.g. the site or item you saw); ' +
    'if NO sharepoint connector tool exists at all (you have zero such tools available), write "CONNECTOR_NONE: " followed by a short note about what you do have; ' +
    'if such tools exist but ALL of them failed, write "CONNECTOR_FAIL: " followed by a short reason (mention how many distinct tools/integrations you tried).'
};

// Ajanın çıktısı bazen ek açıklama/markdown içerebilir (LLM'in "sadece bu
// satırı yaz" talimatına her zaman harfiyen uymaması ihtimaline karşı) —
// bu yüzden TÜM metin içinde bu deseni ARAR (anchor'lamaz), en son eşleşen
// (agent genelde en sonda özet satırı yazar) esas alınır.
//
// ÜÇ sonuç var, iki değil. "Hiç entegrasyon yok" ile "entegrasyon var ama
// bozuk" farklı şeyler ve ÇARELERİ de farklı: ilkinin çaresi portalden ilk
// kez eklemek, ikincisininki yeniden yetkilendirmek. Ekran ikisini de kırmızı
// gösterip aynı öneriyi vermek zorunda kalıyordu — 2026-09-04'te canlı
// ölçüldüğünde SharePoint tam olarak birinci durumdaydı (0 araç) ve ekran
// kullanıcıya gidecek bir yol göstermiyordu.
const RESULT_PATTERN = /CONNECTOR_(OK|FAIL|NONE):\s*(.*)/gi;

function parseConnectorResult(text: string): { connected: boolean; detail: string; missing: boolean } | null {
  let match: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  RESULT_PATTERN.lastIndex = 0;
  while ((match = RESULT_PATTERN.exec(text)) !== null) {
    last = match;
  }
  if (!last) return null;
  const verdict = last[1].toUpperCase();
  return { connected: verdict === "OK", detail: last[2].trim(), missing: verdict === "NONE" };
}

// ---------------------------------------------------------------------------
// KANIT: araç GERÇEKTEN çağrıldı mı?
// ---------------------------------------------------------------------------
// `parseConnectorResult` tek başına ajanın SÖZÜNE dayanıyor. Bir dil modeli
// "EXACTLY one line" talimatına uyup `CONNECTOR_OK: ...` yazmak için hiçbir
// aracı çağırmak zorunda değil — araçları hiç bulamadığı bir turda bile o
// satırı yazabilir, çünkü satırın biçimi prompt'ta hazır duruyor. O durumda
// ekran "Bağlı" der, `connectorEnabled` açılır ve kullanıcı bunu ancak
// sohbette "erişimim yok" cevabını alınca öğrenir. Bu, bu ekranın en pahalı
// yanlış bilgisi.
//
// Kanıt, ajanın metninde değil axet-code'un KENDİ oturum veritabanında:
// çağrılan her araç `tool_call`/`tool_result` parçası olarak oraya yazılıyor
// (bkz. axetSessionDb.ts başlığı, ve aynı deseni kullanan axetChatRecovery.ts).
// Yani "OK dedi ama hiçbir MCP aracı çağırmamış" ölçülebilir bir şey.
//
// BİLİNMİYORSA DOKUNULMUYOR. Veritabanı okunamazsa (better-sqlite3 yüklenmedi,
// klasör başka, oturum bulunamadı) sonuç eskisi gibi kabul ediliyor —
// kanıtsızlık, suçun kanıtı değil. Aynı kural connectorHealth.ts'te de
// geçerli: bilinmeyen bir şey yüzünden çalışan bir bağlayıcı kapatılmıyor.
const PROVIDER_TOOL_HINT: Record<ConnectorProvider, RegExp> = {
  outlook: /outlook/i,
  sharepoint: /sharepoint|shp/i
};

// Oturumu bulmak için prompt'un başı yetiyor; `matchKey` iki tarafta da aynı
// biçime indirgiyor (bkz. axetSessionDb.ts `matchKey` notu).
function promptNeedle(provider: ConnectorProvider): string {
  return matchKey(PROVIDER_TEST_PROMPT[provider]).slice(0, 160);
}

interface RunEvidence {
  /** Turun mesajları okunabildi mi? `false` = bilinmiyor, hüküm verilemez. */
  known: boolean;
  /** Bu sağlayıcıya ait bir MCP aracı gerçekten çağrıldı mı? */
  calledProviderTool: boolean;
  messages: AxetDbMessage[];
}

function collectRunEvidence(cwd: string, provider: ConnectorProvider, sinceEpochSec: number): RunEvidence {
  const empty: RunEvidence = { known: false, calledProviderTool: false, messages: [] };
  const dbPath = resolveSessionDb(cwd);
  if (!dbPath) return empty;
  // `newestSessionSince`'e DÜŞMÜYORUZ (aynı gerekçe axetChatRecovery.ts'te):
  // aynı klasörde aynı anda bir sohbet turu dönüyor olabilir ve onun araç
  // çağrılarını bu testin kanıtı saymak, tam da önlemeye çalıştığımız sahte
  // "doğrulandı" sonucunu üretirdi.
  const sessionId = findSessionByPrompt(dbPath, sinceEpochSec, promptNeedle(provider));
  if (!sessionId) return empty;
  const messages = readMessagesSince(dbPath, sessionId, sinceEpochSec);
  if (messages.length === 0) return empty;

  const hint = PROVIDER_TOOL_HINT[provider];
  let calledProviderTool = false;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool_call" && part.type !== "tool_result") continue;
      const name = part.data?.name ?? "";
      // `mcp_` önekli olmak ŞART: ajanın kendi yerel araçları (dosya okuma,
      // kabuk) bir bağlayıcı kanıtı değil.
      if (/^mcp_/i.test(name) && hint.test(name)) calledProviderTool = true;
    }
  }
  return { known: true, calledProviderTool, messages };
}

// Süreç kapandığında sqlite yazımı bir an geriden gelebiliyor. Bir kez daha
// bakmak ucuz; hiç bakmamak, kanıtı olan bir turu "bilinmiyor" saymak olurdu.
const EVIDENCE_RETRY_MS = 700;

async function collectRunEvidenceWithRetry(
  cwd: string,
  provider: ConnectorProvider,
  sinceEpochSec: number
): Promise<RunEvidence> {
  const first = collectRunEvidence(cwd, provider, sinceEpochSec);
  if (first.known) return first;
  await new Promise((done) => setTimeout(done, EVIDENCE_RETRY_MS));
  return collectRunEvidence(cwd, provider, sinceEpochSec);
}

// Testin üst sınırı. Ölçülen normal süre ~30-60 sn (ajan birkaç entegrasyonu
// sırayla deniyor), ama sınır yokken `axet-code` takılırsa buton SONSUZA
// KADAR dönüyordu ve tek çare elle iptaldi — kullanıcı ise dönen bir
// spinner'a bakıp "çalışıyor herhalde" diye bekliyor.
const TEST_TIMEOUT_MS = 180_000;

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

    // Kanıt penceresinin başı. Biraz geriye alınıyor: oturum kaydı spawn'dan
    // birkaç yüz milisaniye önce/sonra düşebiliyor ve saniye çözünürlüğünde bir
    // yuvarlama, turun kendi mesajlarını pencerenin dışında bırakabilir.
    const startedAt = Math.floor(Date.now() / 1000) - 10;

    let stdout = "";
    let stderr = "";
    let killedByUser = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill();
      } catch {
        // zaten kapanmış olabilir
      }
    }, TEST_TIMEOUT_MS);
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      running.delete(requestId);
      resolve({ ok: false, connected: false, detail: "", error: err.message });
    });

    proc.on("close", async (code) => {
      clearTimeout(timer);
      running.delete(requestId);
      if (killedByUser) {
        resolve({ ok: false, connected: false, detail: "", cancelled: true });
        return;
      }
      if (timedOut) {
        resolve({
          ok: false,
          connected: false,
          detail: stdout.trim(),
          error: `axet-code ${Math.round(TEST_TIMEOUT_MS / 1000)} saniyede cevap vermedi, test durduruldu.`
        });
        return;
      }
      const parsed = parseConnectorResult(stdout);
      if (parsed) {
        const evidence = await collectRunEvidenceWithRetry(resolvedCwd, provider, startedAt);
        // Testin kendi turu da bir ÖLÇÜM: hangi entegrasyonun 500 döndürdüğü,
        // hangisinin çalıştığı burada da görülüyor. Eskiden bu bilgi çöpe
        // gidiyordu (`learnConnectorHealth` yalnızca sohbet turlarından
        // besleniyordu) — oysa `connectors:test` hemen öncesinde
        // `forgetConnectorHealth` çağırıyor, yani unut/ölç/öğren zincirinin
        // tam ortası burası.
        if (evidence.messages.length > 0) learnConnectorHealth(evidence.messages);
        if (parsed.connected && evidence.known && !evidence.calledProviderTool) {
          resolve({
            ok: true,
            connected: false,
            detail: parsed.detail,
            error:
              "Ajan başarılı olduğunu bildirdi ama bu turda hiçbir bağlayıcı aracı çağırmamış — " +
              "sonuç doğrulanamadı, bağlantı açılmadı."
          });
          return;
        }
        resolve({ ok: true, connected: parsed.connected, detail: parsed.detail, missing: parsed.missing });
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
