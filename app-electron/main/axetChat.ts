// Sohbet ekranının axet-code yüzü (spec 2026-10-16 basiz-kopru).
//
// Her mesaj kendi kısa ömürlü `axet-code run` sürecinde çalışıyor (bkz.
// axetHeadless.ts). Oturum hafızası axet-code'da: sohbet → oturum kimliği
// bağlaması (axetSessionBinding) ile sonraki mesaj `--resume` ediyor. Eskiden
// burada görünmez bir terminal (PTY + TUI) vardı; hangi oturumun bu sohbete
// ait olduğu ve turun ne zaman bittiği ekrandan ve mesaj metninden TAHMİN
// ediliyordu. Bu tahminler 46 düzeltmenin çoğunun kaynağıydı.
//
// Renderer'a göre bir "tur" tek bir `sendChatMessage` çağrısı. Ajan soru
// sorarsa (ya `secenekler` bloğu ya da `ask_user` ağı) tur AÇIK kalıyor, soru
// kartı çıkıyor ve cevap aynı oturuma YENİ bir `run` olarak gidiyor — ama
// renderer bunu aynı turun devamı olarak görüyor.

import type {
  AxetChatActivity,
  AxetChatMessage,
  AxetChatProgress,
  AxetChatSendResult,
  AxetModelEntry
} from "../shared/types";
import { buildContextPreamble } from "./activeContext";
import { appLog } from "./appLog";
import { isSilentEmptyAnswer } from "./axetChatAnswer";
import { axetBinaryMessage, axetBinaryStatus } from "./axetCodeVersion";
import {
  defaultHeadlessDeps,
  startHeadlessTurn,
  type ChildLike,
  type HeadlessTurn,
  type HeadlessTurnResult
} from "./axetHeadless";
import { createPrewarmPool, type PrewarmDeps, type PrewarmKey, type PrewarmPool } from "./axetPrewarm";
import { clearBinding, readBinding, writeBinding } from "./axetSessionBinding";
import { readMessagesSince, resolveSessionDb, sessionHasUnansweredToolCall, sessionTitle } from "./axetSessionDb";
import { askUserAsText, splitOptionsBlock, type AskUserRequest } from "./axetToolEvents";
import { connectorGuidance } from "./connectorHealth";
import { shouldUseConnectors } from "./connectorPolicy";
import { mt } from "./i18n";
import { ApprovalTracker, registerApprovalCandidate } from "./sapWrite/approvalEvents";
import { PENDING_TTL_MS } from "./sapWrite/policy";

// Canlı bulgu (2026-08-30): kullanıcı "Uygulama Bağlantıları"ndan Outlook'u
// bağladı (o ekranın "Bağlantıyı Test Et"i BAŞARILI oldu — bkz.
// agenticConnectors.ts'teki çoklu-entegrasyon-deneme prompt'u), ama genel
// axet.code sohbetinde "bağlantım çalışıyor mu" diye sorunca "ERROR
// durumunda, yetkilendirme akışını tamamlamalısın" cevabını aldı. Kök sebep
// (bu makinedeki gerçek axet-code'a karşı canlı doğrulandı): aynı provider
// için axet.nttdata.com/agentic'te BİRDEN FAZLA ayrı entegrasyon kaydı var
// (tekrarlanan re-authorization denemelerinden kalıntı) — bazıları bozuk,
// en az biri çalışıyor. Genel sohbetin ajanı, `agenticConnectors.ts`'teki
// gibi ÖZEL bir "hepsini dene" talimatı ALMADIĞI için İLK bulduğu (şans
// eseri bozuk) entegrasyonu deneyip hemen "çalışmıyor" diyordu. Bu hatırlatma
// TÜM sohbet mesajlarına (geçmiş olsun olmasın) eklenip AYNI canlı ortamda
// doğrulandı (`axet-code run -q` ile manuel test — hatırlatma eklenince
// ajan alternatif entegrasyonu bulup "Yes, working" dedi). Kısa ve generik
// olduğu için MCP tool'u olmayan sıradan sohbetlerde hiçbir etkisi/zararı
// yok, ajan sadece ilgili olduğunda kullanıyor.
const CONNECTOR_RETRY_REMINDER =
  "Not: Bir MCP araç çağrısı, altta yatan entegrasyonun yetkisiz (unauthorized) veya hata (ERROR) durumunda " +
  "olması yüzünden başarısız olursa ve aynı sağlayıcı/servis için BAŞKA bir araç/entegrasyon varsa, vazgeçmeden " +
  "önce o alternatif aracı bir kez dene.";

// Sorular: başsız `run` kipinde `ask_user` kullanıcıya ulaşmıyor, bu yüzden
// ajandan aracı KULLANMAMASI isteniyor (bkz. aşağıdaki `ASK_RULE`). Soru turun
// sonunda bir `secenekler` bloğuyla geliyor; ajan aracı yine çağırırsa
// axetHeadless.ts süreci durduruyor. İki durumda da soru sohbette tıklanabilir
// bir kart; kullanıcının seçimi (ya da serbest metni) aynı oturuma YENİ bir
// `axet-code run --resume` olarak gidiyor (`answerChatQuestion`).
//
// axet-code bir KODLAMA ajanı ve başsız `run` kipinde izinleri sormadan kabul
// ediyor (ölçüm 2026-10-16): onay sormadan dosya yazabiliyor. Terminalde
// beklenen davranış bu; sohbet kılıfında değil.
//
// ÖLÇÜM (2026-09-05, kullanıcı testi): "kısa bi abap kodu yaz" mesajına ajan
// `hello.abap` diye bir DOSYA oluşturdu. Kullanıcının istediği bir cevaptı,
// dosya değil — *"burada direkt bi dosyaya abap kodunu yazıyor ben istemeden"*.
//
// Dosya yazmayı KAPATMIYORUZ: bu sohbet gerçek bir proje klasöründe çalışıyor
// ve "şu dosyayı düzelt" de meşru bir istek. Ayıran şey niyet, o yüzden çare
// bir bayrak değil bu cümle: istenmedikçe yazma, kodu cevabın içinde ver.
const NO_UNASKED_WRITE_HINT =
  "Not: Kullanıcı açıkça bir dosya oluşturmanı/değiştirmeni istemedikçe diske YAZMA. " +
  "\"Kod yaz\" demek dosya istemek değildir — kodu cevabının içinde kod bloğu olarak ver. " +
  "Dosyaya yazmanın gerektiğini düşünüyorsan önce bunu tek cümleyle söyle ve kullanıcının " +
  "istemesini bekle.";

// Bağlayıcıların NE ZAMAN açılacağı artık burada değil — karar üç yüzeyde de
// aynı olsun diye `connectorPolicy.ts`'e taşındı (bkz. oradaki gerekçe).
// Buradan geçilen metin: yeni mesaj + SON İKİ mesaj. Zincir yüzünden:
// "gelen kutumda ne var" → "peki yarınki?" — ikinci mesajda hiçbir anahtar
// kelime yok, ama konu aynı konu.

/** Bu mesaj için bağlayıcılar açılsın mı? */
function decideConnectors(history: AxetChatMessage[], message: string): boolean {
  return shouldUseConnectors([message, ...history.slice(-2).map((m) => m.content)]);
}

// Başsız modda `ask_user` kullanıcıya ULAŞMIYOR: axet-code "No interactive
// user… use your best judgment" dönüyor ve ajan kendi seçiyor (ölçüm
// 2026-10-16). Transport/paket gibi kararlarda bu kabul edilemez. Bu yüzden
// soru turun SONUNDA bir blokla isteniyor; aracı yine çağırırsa
// axetHeadless.ts süreci durduruyor ve soru yine buraya geliyor.
const ASK_RULE =
  "Not: ask_user aracını KULLANMA — bu arayüzde cevaplanamıyor. Kullanıcıdan bir karar gerekiyorsa turu " +
  "sorunla bitir ve seçenekleri cevabının EN SONUNDA şu blokla ver (en az iki seçenek):\n" +
  "```secenekler\n- Seçenek 1\n- Seçenek 2\n```\n" +
  "Gerekmiyorsa en makul varsayımla devam et ve varsayımını tek cümleyle söyle.";

export const AUTH_RETRY_MS = 15_000;
/** Bir kullanıcı mesajında onay sonrası en çok kaç kez kendiliğinden sürdürülür (döngü sigortası). */
const MAX_APPROVAL_ROUNDS = 5;

function preamble(useConnectors: boolean, cwd: string): string {
  return (
    buildContextPreamble(cwd) +
    `${NO_UNASKED_WRITE_HINT}\n\n` +
    `${ASK_RULE}\n\n` +
    (useConnectors ? `${CONNECTOR_RETRY_REMINDER}\n\n${connectorGuidance()}` : "")
  );
}

// Soru cevabı YENİ bir oturuma tohumlanıyor ama turun önceki adımlarında araç
// çalışmıştı: transkript yalnız metni taşıyor, ajan "dosyayı yaz" isteğini
// görüp yazmayı (ya da SAP'ye göndermeyi) yeniden yapabilirdi.
const TOOLS_ALREADY_RAN =
  "Not: Bu konuşmanın önceki adımlarındaki araç çağrıları (dosya yazma, SAP'ye gönderme vb.) ZATEN çalıştırıldı; " +
  "onları TEKRARLAMA, kullanıcının cevabıyla kaldığın yerden devam et.\n\n";

/** Yeni oturum: geçmiş metin olarak tohumlanıyor (bağlam ajanın hafızasında yok). */
function seedPrompt(
  history: AxetChatMessage[],
  message: string,
  useConnectors: boolean,
  cwd: string,
  toolsRan = false
): string {
  const pre = preamble(useConnectors, cwd) + (toolsRan ? TOOLS_ALREADY_RAN : "");
  if (history.length === 0) return `${pre}Kullanıcı mesajı: ${message}`;
  const transcript = history.map((m) => `${m.role === "user" ? "Kullanıcı" : "Sen"}: ${m.content}`).join("\n\n");
  return (
    pre +
    `Önceki konuşma:\n${transcript}\n\n` +
    `Yeni kullanıcı mesajı: ${message}\n\n` +
    `Lütfen SADECE en son kullanıcı mesajına, önceki konuşmayı bağlam olarak kullanarak cevap ver.`
  );
}

/** Devam eden oturum: hafıza axet-code'da; yalnızca kurallar ve mesaj. */
function resumePrompt(message: string, useConnectors: boolean, cwd: string): string {
  return `${preamble(useConnectors, cwd)}Kullanıcı mesajı: ${message}`;
}

interface ChatRun {
  chatId: string;
  turn: HeadlessTurn | null;
  cancelled: boolean;
  pendingAsk: AskUserRequest | null;
  answerAsk: ((answer: string | null) => void) | null;
  turns: number;
  /** AUTH_RETRY_MS beklentisini erken bitirir; cancelChatMessage tarafından çağrılır. */
  wakeDelay: (() => void) | null;
  /** SAP yazma onayı beklenirken bekleyişi devamsız bitirir (Durdur ya da kullanıcının yeni mesajı). */
  stopApprovalWait: (() => void) | null;
  /** Kullanıcı onay beklerken yeni mesaj yazdı: onay gelse de otomatik devam yok. */
  approvalReleased: boolean;
}

const runs = new Map<string, ChatRun>(); // requestId → çalışan tur
let turnStarter: typeof startHeadlessTurn = startHeadlessTurn;

export function __setTurnStarter(fn: typeof startHeadlessTurn | null): void {
  turnStarter = fn ?? startHeadlessTurn;
}

// Isıtma havuzu (axetPrewarm.ts): istem gelmeden açılmış `run` süreçleri.
// Yalnız bir turun İLK `run`'ı kullanıyor; yeniden deneme ve soru cevabı
// turları her zaman kendi sürecini açıyor (anahtarları başka, beklemeleri yok).
type PoolDeps = Pick<PrewarmDeps, "spawn" | "env" | "killTree" | "setTimer" | "clearTimer">;
let poolDeps: PoolDeps | null = null;
let pool: PrewarmPool | null = null;
// Bırakma kuşağı: her drop/dropAll artırıyor. prewarmChat sürüm denetimini
// beklerken sohbet kapandıysa ya da havuz boşaltıldıysa süreç açmıyor; yoksa
// sahipsiz bir süreç axet-code.exe'yi kilitli tutardı. Kapanıştan sonra hiç.
let prewarmGen = 0;
let prewarmStopped = false;

function prewarmPool(): PrewarmPool {
  if (pool) return pool;
  const d = poolDeps ?? (() => {
    const h = defaultHeadlessDeps();
    return {
      spawn: h.spawn,
      env: h.env,
      killTree: h.killTree,
      setTimer: (fn: () => void, ms: number) => {
        const t = setTimeout(fn, ms);
        // Bekleyen ısıtma uygulamanın kapanmasını geciktirmesin.
        t.unref?.();
        return t;
      },
      clearTimer: (t: unknown) => clearTimeout(t as NodeJS.Timeout)
    };
  })();
  pool = createPrewarmPool({
    ...d,
    log: (chatId, sonuc, kod) => appLog("kopru.isitma", { sohbet: chatId, sonuc, ...(kod !== undefined ? { kod } : {}) })
  });
  return pool;
}

export function __setPrewarmDeps(deps: PoolDeps | null): void {
  pool?.dropAll();
  pool = null;
  poolDeps = deps;
  prewarmGen += 1;
  prewarmStopped = false;
}

function prewarmKey(
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  resumeId: string | null,
  useConnectors: boolean
): PrewarmKey {
  return { chatId, cwd, model: model ? `${model.provider}/${model.model}` : null, resumeId, useConnectors };
}

/** Bir sohbetin ısıtılmış sürecini bırakır (sohbet kapandı/dallandı/iptal). */
function dropPrewarm(chatId: string): void {
  prewarmGen += 1;
  try {
    pool?.drop(chatId);
  } catch {
    // havuz kendi istisnalarını yutuyor; yine de ana süreç çökmesin
  }
}

/** Tüm ısıtılmış süreçler (kapanış, yetenek değişikliği: süreç onları açılışta okuyor). */
export function dropAllPrewarmed(): void {
  prewarmGen += 1;
  try {
    pool?.dropAll();
  } catch {
    // bkz. dropPrewarm
  }
}

/** Uygulama kapanıyor: havuz boşaltılıyor ve bundan sonra hiçbir ısıtma süreç açmıyor. */
export function stopPrewarming(): void {
  prewarmStopped = true;
  dropAllPrewarmed();
}

export function chatBusy(chatId: string): boolean {
  for (const run of runs.values()) if (run.chatId === chatId) return true;
  return false;
}

/**
 * Bu oturuma `--resume` güvenli mi? Bulunmayan sebep, güvenliyse null.
 * - Oturum veritabanında hâlâ var mı (`.axet-code` silinmiş/yeniden kurulmuş
 *   olabilir; eski TUI yolu da bağı `sessionTitle` ile doğruluyordu).
 * - Sonuçsuz bir araç çağrısı (tur bir aracın ortasında öldürüldü) oturumu
 *   sağlayıcı için geçersiz kılıyor: 400 "tool_use without tool_result"
 *   (bkz. 32d4952).
 */
function unsafeToResume(cwd: string, sessionId: string): string | null {
  const dbPath = resolveSessionDb(cwd);
  if (!dbPath) return "veritabani-yok";
  if (sessionTitle(dbPath, sessionId) === null) return "oturum-yok";
  if (sessionHasUnansweredToolCall(dbPath, sessionId)) return "sonucsuz-arac";
  return null;
}

/**
 * Bağlı oturuma devam kararı, YAN ETKİSİZ: ısıtma da aynı kararı veriyor ama
 * bağı silmiyor (silme kararı gönderimde verilir).
 */
function resumeDecision(chatId: string, cwd: string): { sessionId: string | null; reason: string | null } {
  const binding = readBinding(chatId);
  if (!binding) return { sessionId: null, reason: null };
  const reason = binding.cwd !== cwd ? "klasor" : unsafeToResume(cwd, binding.sessionId);
  return reason ? { sessionId: null, reason } : { sessionId: binding.sessionId, reason: null };
}

/** Bağlı oturuma devam edilebilir mi? Klasör aynı ve oturum güvenli. */
function resumableSession(chatId: string, cwd: string): string | null {
  const { sessionId, reason } = resumeDecision(chatId, cwd);
  if (reason) {
    // Yeni oturum + geçmiş tohumu.
    appLog("kopru.bag-dustu", { sohbet: chatId, sebep: reason });
    clearBinding(chatId);
    return null;
  }
  return sessionId;
}

/**
 * Taslak yazılırken/sohbet açılınca bir `run` sürecini istemsiz açar; ilk
 * mesaj geldiğinde anahtarı tutarsa o süreç kullanılır (sendChatMessage).
 * Ateşle-unut: hiçbir koşulda atmıyor, hiçbir bağı değiştirmiyor.
 */
export async function prewarmChat(
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  draft: string,
  history: AxetChatMessage[]
): Promise<void> {
  try {
    if (prewarmStopped || !chatId || chatBusy(chatId)) return;
    const gen = prewarmGen;
    const status = await axetBinaryStatus();
    if (axetBinaryMessage(status)) return;
    // Sürüm denetimi beklenirken tur başlamış, sohbet kapanmış, havuz
    // boşaltılmış ya da uygulama kapanmaya başlamış olabilir.
    if (prewarmStopped || gen !== prewarmGen || chatBusy(chatId)) return;
    const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
    const useConnectors = decideConnectors(history ?? [], draft ?? "");
    const { sessionId } = resumeDecision(chatId, resolvedCwd);
    prewarmPool().prewarm(prewarmKey(chatId, resolvedCwd, model, sessionId, useConnectors));
  } catch {
    // ısıtma bir iyileştirme; başarısızlığı tur yolunu etkilemez
  }
}

/**
 * Düşen turun oturumunda SON saklı mesaj bizim kullanıcı mesajımız mı? axet-code
 * mesajı sağlayıcıya göndermeden önce saklıyor; sağlayıcı düşerse mesaj
 * oturumda kalıyor ve aynısını yeniden göndermek onu ajanın hafızasına İKİ kez
 * yazardı. `sinceSec`: düşen turun başı (öncesindeki mesajlar sayılmıyor).
 * Okunamazsa `false`: mesaj aynen yeniden gider (eski davranış).
 */
function userMessageStored(cwd: string, sessionId: string, sinceSec: number): boolean {
  try {
    const dbPath = resolveSessionDb(cwd);
    if (!dbPath) return false;
    const messages = readMessagesSince(dbPath, sessionId, sinceSec);
    return messages[messages.length - 1]?.role === "user";
  } catch {
    return false;
  }
}

/** İki metin parçasını boş satırla birleştirir; biri boşsa ayırıcı yok. */
function joinText(a: string, b: string): string {
  return a && b ? `${a}\n\n${b}` : a || b;
}

function answerText(ask: AskUserRequest, optionIndex: number | number[], customText?: string): string | null {
  if (customText && customText.trim()) return customText.trim();
  const indexes = (Array.isArray(optionIndex) ? optionIndex : [optionIndex]).filter((i) => i >= 0 && i < ask.options.length);
  if (indexes.length === 0) return null;
  return indexes.map((i) => ask.options[i]).join(", ");
}

// Zorunlu güncelleme `run` kipini de durduruyor ve çıkış kodu bunu anlatmıyor;
// süreç ne yazdıysa onun içinde aranıyor (eski run yolundaki kalıp, aynen).
const RE_UPDATE_BLOCK = /Mandatory update required|new version of aXet\.Code is available/i;
function isUpdateBlock(error: string | undefined): boolean {
  return !!error && RE_UPDATE_BLOCK.test(error);
}

/**
 * Kullanıcıya gösterilecek hata. Sınıfı belli arızalar için eski TUI yolunun
 * açıklayıcı metinleri korunuyor (politika engeli, kalıcı 403, zorunlu
 * güncelleme, 6 saat sınırı); geri kalanında sağlayıcının kendi cümlesi.
 */
function userError(result: HeadlessTurnResult, retried: boolean): string {
  const raw = result.error ?? "";
  if (isUpdateBlock(raw)) {
    const installed = /Installed version:\s*([0-9][\w.+-]*)/i.exec(raw)?.[1] ?? "";
    const latest = /New version:\s*([0-9][\w.+-]*)/i.exec(raw)?.[1] ?? "";
    return latest
      ? mt("chatTui.updateRequiredVersions", { installed: installed || "?", latest })
      : mt("chatTui.updateRequired");
  }
  if (result.failure === "blocked") return mt("chatTui.policyBlocked");
  if (result.timedOut) return mt("chatTui.turnRanTooLong", { hours: "6" });
  if (result.failure === "auth" && retried) return mt("chatTui.restartStillFailingAuth");
  return raw || mt("chat.emptyAnswerTui");
}

export async function sendChatMessage(
  requestId: string,
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  history: AxetChatMessage[],
  message: string,
  onChunk?: (text: string) => void,
  onActivity?: (activity: AxetChatActivity) => void,
  onProgress?: (progress: AxetChatProgress) => void
): Promise<AxetChatSendResult> {
  const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
  const safe = <T>(fn: ((x: T) => void) | undefined) => (x: T) => {
    try {
      fn?.(x);
    } catch {
      // pencere kapanmış olabilir
    }
  };
  const emitChunk = safe(onChunk);
  const emitActivity = safe(onActivity);
  const emitProgress = safe(onProgress);

  // Sürüm denetimi öncesinde kaydediyoruz: await sırasında gelen Durdur kayboluyor.
  // try/finally burayı kapsıyor; erken dönüşler runs.delete'i atlamaz.
  const run: ChatRun = { chatId, turn: null, cancelled: false, pendingAsk: null, answerAsk: null, turns: 0, wakeDelay: null, stopApprovalWait: null, approvalReleased: false };
  // Bu turda sorulan SAP yazma onayları (bkz. sapWrite/approvalEvents.ts).
  // Sahibi süreç zinciriyle bu tur olan istekler sayılır; aynı klasördeki bir
  // Ajanlar bölmesinin onayı bu turu uyandırmaz (bkz. resolveOwnership).
  const approvals = new ApprovalTracker(resolvedCwd, { tur: "sohbet", id: requestId });
  let ambiguousNoted = false;
  let approvalRounds = 0;
  runs.set(requestId, run);

  let useConnectors = false;
  let started = 0;
  let resumeId: string | null = null;
  let startedResumed = false;
  let prompt = "";
  let text = "";
  let restartedReason: AxetChatSendResult["restartedReason"];
  let retried = false;
  let totalTools = 0;
  let toolsUnknown = false;
  let turns = 0;
  let firstChunkAt = 0;
  // Yeni oturuma tohumlanacak konuşma. Soru cevaplandıktan sonra yalnız ilk
  // mesajla tohumlamak isteği BAŞTAN yaptırır ve cevabı kaybeder; o yüzden her
  // cevapta asistanın o ana kadarki metni + soru + cevap buraya ekleniyor.
  let seedHistory: AxetChatMessage[] = history;
  let seedMessage = message;
  let textAtAnswer = 0;
  // Son alt turun başı (saniye, saat kayması payıyla): yeniden denemede
  // oturumdaki hangi mesajların bu alt tura ait olduğunu ayırıyor.
  let runSinceSec = 0;
  // Havuzdan alınan süreç YALNIZ ilk `run` içindir; kullanılınca null olur.
  let prewarmed: ChildLike | null = null;
  let warmed = false;

  const runOnce = async (): Promise<HeadlessTurnResult> => {
    turns += 1;
    run.turns = turns;
    approvals.reset();
    runSinceSec = Math.floor(Date.now() / 1000) - 2;
    // Soru cevabından sonraki turun ilk parçası önceki metne yapışmasın.
    let first = true;
    const child = prewarmed;
    prewarmed = null;
    // İlk `run`'da ısınmış süreç kullanıldıysa `warmed` true olarak sabitleniyor.
    // Soru cevabı veya yeniden deneme turlarından bağımsız: tur geneli için
    // "ilk run ısınmış mıydı?" sorusunun cevabı bu değişkende.
    if (turns === 1 && child !== null) warmed = true;
    const turn = turnStarter({
      cwd: resolvedCwd,
      model,
      prompt,
      resumeId,
      useConnectors,
      ...(child ? { prewarmed: child } : {}),
      onSessionId: (id) => writeBinding(chatId, { sessionId: id, cwd: resolvedCwd }),
      onChunk: (piece) => {
        if (!piece) return;
        if (first && text) emitChunk("\n\n");
        first = false;
        if (!firstChunkAt) firstChunkAt = Date.now();
        emitChunk(piece);
      },
      onActivity: emitActivity,
      onProgress: emitProgress
    });
    run.turn = turn;
    // Tur sürerken bu sohbet bir onay sahibi adayı: süreç kimliği ve klasörü.
    const unregister = registerApprovalCandidate({
      ref: { tur: "sohbet", id: requestId },
      pids: typeof turn.pid === "number" ? [turn.pid] : [],
      dir: resolvedCwd,
      active: true
    });
    let result: HeadlessTurnResult;
    try {
      result = await turn.done;
    } finally {
      unregister();
    }
    run.turn = null;
    if (result.sessionId) writeBinding(chatId, { sessionId: result.sessionId, cwd: resolvedCwd });
    totalTools += result.toolCount;
    if (result.toolsUnknown) toolsUnknown = true;
    return result;
  };

  // Görünür not: canlı akışa da, sonuç metnine de aynı satır gidiyor.
  const appendNote = (note: string) => {
    emitChunk(text ? `\n\n${note}` : note);
    text = joinText(text, note);
  };

  // Alt tur bitti, ajan soru sormadı. Bu turda SAP yazma onayı sorulduysa
  // karar beklenir; onaylanınca aynı oturum bir kez sürdürülür, ret/süre
  // dolması/kullanıcının yeni mesajı turu bitirir. Onay ASLA burada verilmez:
  // yalnızca pencerenin kararı dinlenir.
  const waitApprovals = async (sessionId: string | null): Promise<"continue" | "stop" | "cancelled"> => {
    let s = approvals.summary();
    if (s.ambiguous.length > 0 && !ambiguousNoted) {
      // Aynı klasörde başka bir oturum da çalışıyordu ve isteğin kimin olduğu
      // belirlenemedi: kendiliğinden devam YOK, kullanıcıya söyleniyor.
      ambiguousNoted = true;
      appLog("kopru.onay", { sohbet: chatId, sonuc: "belirsiz", adet: s.ambiguous.length });
      appendNote(mt("chat.sapApprovalAmbiguous"));
    }
    if (s.pending.length + s.approved.length + s.denied.length + s.expired.length + s.closed.length === 0) return "stop";
    let timedOut = false;
    if (s.pending.length > 0 && !run.approvalReleased) {
      emitActivity({ phase: "sapApproval" });
      appLog("kopru.onay", { sohbet: chatId, sonuc: "bekliyor", adet: s.pending.length });
      const waited = await approvals.wait(PENDING_TTL_MS + 60_000, (stop) => {
        run.stopApprovalWait = stop;
      });
      if (run.cancelled) return "cancelled";
      timedOut = waited === "zaman_asimi";
      s = approvals.summary();
    }
    if (run.approvalReleased) {
      appLog("kopru.onay", { sohbet: chatId, sonuc: "birakildi" });
      return "stop";
    }
    if (s.approved.length > 0 && approvalRounds < MAX_APPROVAL_ROUNDS) {
      approvalRounds += 1;
      appLog("kopru.onay", { sohbet: chatId, sonuc: "devam", adet: s.approved.length, tur: approvalRounds });
      appendNote(mt("chat.sapApprovalResumedNote"));
      emitActivity({ phase: "thinking" });
      const continuePrompt = mt("chat.sapApprovalContinue");
      seedHistory = [...seedHistory, { role: "user", content: seedMessage }, { role: "assistant", content: text.slice(textAtAnswer) }];
      seedMessage = continuePrompt;
      textAtAnswer = text.length;
      const unsafe = sessionId ? unsafeToResume(resolvedCwd, sessionId) : "kimlik-yok";
      if (unsafe) {
        appLog("kopru.bag-dustu", { sohbet: chatId, sebep: unsafe, yer: "onay" });
        clearBinding(chatId);
        resumeId = null;
        prompt = seedPrompt(seedHistory, seedMessage, useConnectors, resolvedCwd, totalTools > 0 || toolsUnknown);
      } else {
        resumeId = sessionId;
        prompt = continuePrompt;
      }
      return "continue";
    }
    const sonuc = s.denied.length > 0 ? "red" : s.expired.length > 0 || timedOut ? "sure" : s.closed.length > 0 ? "kapandi" : "sinir";
    if (sonuc === "red") appendNote(mt("chat.sapApprovalDenied"));
    else if (sonuc === "sure") appendNote(mt("chat.sapApprovalExpired"));
    else if (sonuc === "kapandi") appendNote(mt("chat.sapApprovalClosed"));
    appLog("kopru.onay", { sohbet: chatId, sonuc });
    return "stop";
  };

  try {
    // Ön koşul: axet-code 1.4+ ve sağlam program dosyası (kullanıcı kararı 2026-10-16).
    // try içinde: erken dönüşler finally'i atlayıp runs.set'i askıda bırakmıyor.
    const status = await axetBinaryStatus();
    const blocked = axetBinaryMessage(status);
    if (blocked) {
      appLog("kopru.surum", { surum: "version" in status ? status.version : "-", durum: status.kind });
      return { ok: false, text: "", error: blocked };
    }
    if (run.cancelled) return { ok: false, text: "", cancelled: true };

    useConnectors = decideConnectors(history, message);
    started = Date.now();
    resumeId = resumableSession(chatId, resolvedCwd);
    startedResumed = resumeId !== null;
    prompt = resumeId ? resumePrompt(message, useConnectors, resolvedCwd) : seedPrompt(history, message, useConnectors, resolvedCwd);
    // Anahtar tutarsa ısıtılmış süreç; tutmazsa havuz onu öldürüyor.
    try {
      prewarmed = pool ? pool.take(prewarmKey(chatId, resolvedCwd, model, resumeId, useConnectors)) : null;
    } catch {
      prewarmed = null;
    }

    for (;;) {
      if (run.cancelled) return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
      const result = await runOnce();
      if (result.cancelled || run.cancelled) return { ok: false, text: joinText(text, result.text), cancelled: true, usedConnectors: useConnectors };

      if (result.spawnFailed) {
        // Süreç açılamadı: program bozulmuş/silinmiş olabilir — durumu tazele.
        const msg = axetBinaryMessage(await axetBinaryStatus(true));
        return { ok: false, text, error: msg ?? result.error ?? mt("chat.emptyAnswerTui"), usedConnectors: useConnectors };
      }

      if (result.ok) {
        const split = splitOptionsBlock(result.text);
        const ask = result.ask ?? split.ask;
        const piece = result.ask ? result.text : split.text;
        text = joinText(text, piece);
        if (!ask) {
          // SAP yazma onayı: onay ucu "bekliyor"u hemen döndürüyor ve başsız
          // turda model burada duruyor. Tur AÇIK kalıyor (askUser gibi); karar
          // gelince aynı oturum TEK kez "devam et" ile sürüyor.
          const next = await waitApprovals(result.sessionId);
          if (next === "cancelled") return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
          if (next === "stop") break;
          continue;
        }
        // Soru: kart çıkıyor, tur açık kalıyor.
        run.pendingAsk = ask;
        emitActivity({
          phase: "askUser",
          callId: ask.callId,
          question: ask.question,
          ...(ask.header ? { header: ask.header } : {}),
          options: ask.options,
          ...(ask.multiSelect ? { multiSelect: true } : {})
        });
        appLog("kopru.soru", { sohbet: chatId, katman: result.ask ? "ag" : "metin", secenek: ask.options.length });
        const answer = await new Promise<string | null>((resolve) => {
          run.answerAsk = resolve;
        });
        run.pendingAsk = null;
        run.answerAsk = null;
        if (run.cancelled) return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
        if (answer === null) {
          // Vazgeçildi: soru ve SEÇENEKLER cevapta kalsın, kullanıcı kendisi
          // yazar. `secenekler` bloğunda soru metnin kendisi, blok ise metinden
          // atılmıştı: yalnız seçenek listesi geri ekleniyor. Ajan seçenekleri
          // düzyazıda zaten saymışsa onlar tekrarlanmıyor.
          if (!ask.question || !text.includes(ask.question)) text = joinText(text, askUserAsText(ask));
          else {
            const missing = ask.options.filter((opt) => !text.includes(opt));
            if (missing.length) text = joinText(text, missing.map((opt) => `- ${opt}`).join("\n"));
          }
          break;
        }
        const answerPrompt = `${mt("chat.headlessAnswerLabel")}: ${answer}`;
        const sinceAnswer = text.slice(textAtAnswer);
        const asked = ask.question && sinceAnswer.includes(ask.question)
          ? sinceAnswer
          : (sinceAnswer ? `${sinceAnswer}\n\n${askUserAsText(ask)}` : askUserAsText(ask));
        seedHistory = [...seedHistory, { role: "user", content: seedMessage }, { role: "assistant", content: asked }];
        seedMessage = answerPrompt;
        textAtAnswer = text.length;
        // Cevap da bir `--resume`: aynı kural geçerli. `ask_user` başka bir araçla
        // paralel çağrıldıysa ya da öldürme anında yeni bir çağrı başladıysa
        // oturumda sonuçsuz çağrı kalmış olabilir → yeni oturum, cevap dahil tohum.
        const unsafe = result.sessionId ? unsafeToResume(resolvedCwd, result.sessionId) : "kimlik-yok";
        if (unsafe) {
          appLog("kopru.bag-dustu", { sohbet: chatId, sebep: unsafe, yer: "cevap" });
          clearBinding(chatId);
          resumeId = null;
          prompt = seedPrompt(seedHistory, seedMessage, useConnectors, resolvedCwd, totalTools > 0 || toolsUnknown);
        } else {
          resumeId = result.sessionId;
          prompt = answerPrompt;
        }
        continue;
      }

      // --- Hata ---
      // Araç sayımı TURUN TAMAMI için: soru öncesi alt turda çalışan bir
      // `adt_push`, cevap alt turu araçsız düştü diye yeniden yaptırılmamalı.
      // Veritabanı hiç görülmediyse sayı bilinmiyor; o da "çalışmış" sayılıyor.
      const toolsRan = totalTools > 0 || toolsUnknown;
      const canAutoRetry = !toolsRan && !retried && !result.timedOut && !isUpdateBlock(result.error);
      if (result.failure === "context" || result.failure === "poisoned") {
        if (canAutoRetry) {
          retried = true;
          restartedReason = "context";
          resumeId = null;
          clearBinding(chatId);
          prompt = seedPrompt(seedHistory, seedMessage, useConnectors, resolvedCwd);
          continue;
        }
      } else if (canAutoRetry && result.failure !== "blocked") {
        retried = true;
        restartedReason = result.failure === "auth" ? "auth" : "provider";
        if (result.failure === "auth") {
          // Beklentiyi iptal çağrısıyla erken bitirebilmek için wakeDelay saklıyoruz.
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, AUTH_RETRY_MS);
            run.wakeDelay = () => { clearTimeout(timer); resolve(); };
          });
          run.wakeDelay = null;
        }
        if (run.cancelled) return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
        resumeId = result.sessionId ?? resumeId;
        if (!resumeId) prompt = seedPrompt(seedHistory, seedMessage, useConnectors, resolvedCwd);
        // Mesajımız oturumda zaten saklıysa aynısı ikinci kez gitmesin: kısa
        // bir "son mesajıma cevap ver" yeterli. Saklı değilse mesaj aynen gider.
        else if (userMessageStored(resolvedCwd, resumeId, runSinceSec)) prompt = mt("chat.headlessRetryPrompt");
        continue;
      }
      appLog("kopru.hata", { sohbet: chatId, sinif: result.failure ?? "-", aracCalisti: toolsRan, yenidenDenendi: retried });
      return {
        ok: false,
        text: joinText(text, result.text),
        error: userError(result, retried),
        usedConnectors: useConnectors,
        // Zorunlu güncellemede "Devam et" aynı duvara çarpar: gösterilecek
        // şey güncelleme hatasının kendisi.
        ...(toolsRan && !isUpdateBlock(result.error) ? { canContinue: true } : {})
      };
    }

    const out: AxetChatSendResult = { ok: true, text, usedConnectors: useConnectors, ...(restartedReason ? { restartedReason } : {}) };
    const empty = isSilentEmptyAnswer(out);
    appLog("kopru.tur", {
      sohbet: chatId,
      oturum: startedResumed && !restartedReason ? "surdu" : "yeni",
      saniye: Math.round((Date.now() - started) / 100) / 10,
      ilkHarf: firstChunkAt ? Math.round((firstChunkAt - started) / 100) / 10 : null,
      arac: totalTools,
      baglayici: useConnectors,
      isinmis: warmed,
      model: model ? `${model.provider}/${model.model}` : "-",
      // Boş cevap aşağıda hataya çevriliyor; günlük gerçeği söylesin.
      sonuc: empty ? "bos" : "ok"
    });
    if (empty) return { ...out, ok: false, error: mt("chat.emptyAnswerTui") };
    return out;
  } finally {
    approvals.dispose();
    runs.delete(requestId);
    // Alınıp kullanılmadan kalan süreç (tur başlamadan iptal) askıda kalmasın.
    if (prewarmed) {
      const left: ChildLike = prewarmed;
      prewarmed = null;
      try {
        (poolDeps ?? defaultHeadlessDeps()).killTree(left);
      } catch {
        // zaten kapanmış
      }
    }
  }
}

export function cancelChatMessage(requestId: string): void {
  const run = runs.get(requestId);
  if (!run) return;
  run.cancelled = true;
  run.turn?.cancel();
  run.answerAsk?.(null);
  run.wakeDelay?.();
  run.stopApprovalWait?.();
  dropPrewarm(run.chatId);
  appLog("kopru.iptal", { sohbet: run.chatId, turNo: run.turns });
  // Süreç ağacı öldürülüyor; "durdu mu" diye ayrı bir karar kanalı yok.
}

/**
 * Kullanıcı SAP yazma onayı beklenirken yeni mesaj yazdı (sıraya koydu): tur
 * otomatik devamsız biter, sıradaki mesaj gider. Onay penceresi açık kalır;
 * kararı ajan kendi tekrar denemesinde görür.
 */
export function releaseApprovalWait(requestId: string): boolean {
  const run = runs.get(requestId);
  if (!run) return false;
  run.approvalReleased = true;
  run.stopApprovalWait?.();
  return true;
}

export function answerChatQuestion(requestId: string, optionIndex: number | number[], customText?: string): boolean {
  const run = runs.get(requestId);
  if (!run?.pendingAsk || !run.answerAsk) return false;
  run.answerAsk(answerText(run.pendingAsk, optionIndex, customText));
  return true;
}

/** Sohbet silindi ya da klasörü değişti: bağlı oturum bırakılır (çalışmıyorsa). */
export function closeChatSession(chatId: string): void {
  dropPrewarm(chatId);
  if (!chatBusy(chatId)) clearBinding(chatId);
}

/**
 * Sohbeti DALLANDIR (mesaj düzenlendi / yeniden üretildi): bağ düşer, bir
 * sonraki tur yeni oturumda geçmişi renderer'ın verdiği hâliyle tohumlar.
 * Eskiden bu TUI'de palet tuşlarıyla yapılıyordu ve 12 olayın 10'unda
 * axet-code'u çökertti (analiz 2026-10-16, bulgu 4).
 */
export function resetChatHistory(chatId: string): boolean {
  dropPrewarm(chatId);
  clearBinding(chatId);
  return true;
}

export function cancelAllChatMessages(): void {
  for (const id of Array.from(runs.keys())) cancelChatMessage(id);
  // Kapanışta (before-quit) da çağrılıyor: bekleyen ısıtılmış süreç kalmasın.
  dropAllPrewarmed();
}
