import * as pty from "@lydell/node-pty";
import { mkdirSync } from "node:fs";
import type { AxetChatActivityPhase, AxetChatMessage, AxetChatSendResult, AxetModelEntry } from "../shared/types";
import { axetSpawnEnv } from "./axetSpawnEnv";
import { setAxetModel } from "./axetModels";
import {
  closeSessionDbs,
  findSessionByPrompt,
  latestMessageTime,
  newestSessionSince,
  readMessagesSince,
  resolveSessionDb,
  sessionDbLoadError
} from "./axetSessionDb";

// ---------------------------------------------------------------------------
// KALICI OTURUM — axet-code'un gerçek TUI'si bir pty içinde
// ---------------------------------------------------------------------------
// Kullanıcı isteği (2026-09-04): *"çalışma şekli aynı terminaldeki claude
// yapısı, axet.code yapısı gibi olması gerekiyor sadece biz üzerine bir kılıf
// takmışız"*.
//
// Eski kip (`axet-code run`, bkz. axetChat.ts) mesaj başına AYRI bir süreç
// açıyordu. Bunun üç bedeli vardı ve üçü de ölçüldü:
//   1) Açılış maliyeti her mesajda yeniden ödeniyordu (~2-4 s; ön-ısıtma bunu
//      büyük ölçüde gizledi ama ortadan kaldırmadı).
//   2) Geçmiş her seferinde düz metin transcript olarak yeniden gönderiliyordu.
//   3) EN ÖNEMLİSİ: ARAÇ SONUÇLARI mesajlar arasında kayboluyordu. Ajan bir
//      dosyayı okuyup sonraki mesajda onu hatırlamıyordu; çünkü hatırlayacağı
//      oturum yoktu. `run`'ın `--resume`/`--session` bayrağı YOK (doğrulandı).
//
// Ölçüm (2026-09-04, aynı soru): `run` ile 8,131 s — kalıcı TUI ile 3 s.
//
// NEDEN EKRANDAN OKUMUYORUZ: cevap metni pty çıktısında kenarlıklar, yan panel
// ve spinner artıklarıyla iç içe okunamaz hâlde. Cevabı ve araç çağrılarını
// axet-code'un kendi oturum veritabanından okuyoruz (bkz. axetSessionDb.ts).
// pty yalnızca "yazan el"; gözümüz veritabanı.
// ---------------------------------------------------------------------------

/** Açılış diyaloglarının ve hazır olma işaretinin ekranda aranan karşılıkları. */
const MARK_TOOL_DIALOG = "Choose your development tool";
const MARK_MODEL_DIALOG = "choose a provider and model";
const MARK_READY = ["model changed to", "tab focus chat"];

/**
 * Bağlayıcıların YÜKLENDİĞİNİ gösteren satır: `● test123 25 tools`.
 *
 * "model changed to" HAZIR demek DEĞİL — yalnızca modelin seçildiği demek.
 * Ölçüm (2026-09-04, bağlayıcılar açık): model 2,8 s'de seçiliyor, o anda
 * panel `Connectors: None` diyor ve kayıtlar `starting...` durumunda; araçlar
 * 6,5-6,8 s arasında geliyor. Bu 4 saniyelik boşlukta sorulan soruya ajan
 * DOĞRU cevap veriyor: "bağlı bir entegrasyon görünmüyor". Kullanıcının
 * "connector var aslında direkt bakması lazım" dediği hata tam olarak buydu.
 */
const RE_CONNECTOR_TOOLS = /\b\d+\s+tools\b/g;
/** Bağlayıcılar için en fazla beklenecek süre; dolarsa yine de devam edilir. */
const CONNECTOR_WAIT_MS = 15_000;
/** Son araç satırından sonra "yerleşti" saymak için gereken sessizlik. */
const CONNECTOR_SETTLE_MS = 1_200;

/** Bir açılış adımının en fazla bekleyeceği süre. */
const HANDSHAKE_STEP_MS = 30_000;
/** Açılışta en fazla kaç diyalog adımı çevrilecek (sonsuz döngüye karşı). */
const HANDSHAKE_MAX_STEPS = 6;
/** Cevap için tavan — `run` kipiyle aynı. */
const TURN_TIMEOUT_MS = 5 * 60_000;
/** Veritabanı yoklama aralığı. Ölçülen sorgu maliyeti 0-5 ms. */
const POLL_MS = 250;
/** Kullanılmayan bir oturum ne kadar sonra kapatılsın. */
const IDLE_MS = 10 * 60_000;
/** Aynı anda açık tutulacak en fazla TUI oturumu. */
const MAX_SESSIONS = 3;

interface Waiter {
  needles: string[];
  resolve: (hit: string | null) => void;
  timer: NodeJS.Timeout;
}

interface TuiSession {
  chatId: string;
  proc: pty.IPty;
  cwd: string;
  modelKey: string;
  useConnectors: boolean;
  dbPath: string;
  /**
   * pty'nin başlatıldığı an (Unix saniye).
   *
   * Oturum eşleşmesinin ZORUNLU alt sınırı. Bu alan olmadan (2026-09-04 canlı
   * hatası): bağlayıcı kararı değişince pty yeniden kuruluyor, ilk yoklamada
   * bizim yeni oturumumuz henüz veritabanında olmuyor, "en yeni oturum" yedeği
   * de bir ÖNCEKİ sohbetin oturumunu döndürüyordu. Sonuç: mail sorusuna
   * bir önceki turun ("selam") cevabı 0,0 saniyede "bitti" diye verildi, ve
   * yanlış bağ önbellekte kaldığı için sonraki mesaj hiç bitmedi.
   */
  spawnedAt: number;
  /** axet-code'un bu pty için açtığı oturum. İlk cevaptan sonra doluyor. */
  axetSessionId: string | null;
  /** ANSI'siz son çıktı — yalnızca açılış işaretlerini aramak için. */
  screen: string;
  ready: boolean;
  busy: boolean;
  disposed: boolean;
  exited: boolean;
  /** Kullanıcı süren turu durdurdu mu (esc). Her turun başında sıfırlanır. */
  cancelled: boolean;
  /** Bu oturuma daha önce mesaj gönderildi mi (geçmiş tohumlaması gerekiyor mu). */
  seeded: boolean;
  lastUsed: number;
  idleTimer: NodeJS.Timeout | null;
  waiters: Waiter[];
}

const sessions = new Map<string, TuiSession>();

const OSC = new RegExp("\\x1b\\][^\\x07\\x1b]*(\\x07|\\x1b\\\\)", "g");
const CSI = new RegExp("\\x1b\\[[0-9;?]*[ -/]*[@-~]", "g");

function stripAnsi(text: string): string {
  return text.replace(OSC, "").replace(CSI, "");
}

function modelKeyOf(model: AxetModelEntry | null): string {
  return model ? `${model.provider}/${model.model}` : "";
}

// ---------------------------------------------------------------------------
// Oturum yaşam döngüsü
// ---------------------------------------------------------------------------

function touch(session: TuiSession): void {
  session.lastUsed = Date.now();
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => disposeSession(session.chatId), IDLE_MS);
}

function disposeSession(chatId: string): void {
  const session = sessions.get(chatId);
  if (!session) return;
  sessions.delete(chatId);
  session.disposed = true;
  if (session.idleTimer) clearTimeout(session.idleTimer);
  for (const waiter of session.waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(null);
  }
  session.waiters = [];
  if (!session.exited) {
    try {
      session.proc.kill();
    } catch {
      // Zaten ölmüş olabilir; pty tutamağı süreç sonunda serbest kalıyor.
    }
  }
}

export function closeTuiSession(chatId: string): void {
  disposeSession(chatId);
}

export function closeAllTuiSessions(): void {
  for (const chatId of [...sessions.keys()]) disposeSession(chatId);
  closeSessionDbs();
}

function evictIfNeeded(): void {
  while (sessions.size >= MAX_SESSIONS) {
    let oldest: TuiSession | null = null;
    for (const session of sessions.values()) {
      if (session.busy) continue;
      if (!oldest || session.lastUsed < oldest.lastUsed) oldest = session;
    }
    if (!oldest) return;
    disposeSession(oldest.chatId);
  }
}

/** Ekranda verilen işaretlerden biri görünene kadar bekler; hangisi ise onu döndürür. */
function waitForAny(session: TuiSession, needles: string[], timeoutMs: number): Promise<string | null> {
  const already = needles.find((n) => session.screen.includes(n));
  if (already) return Promise.resolve(already);
  return new Promise((resolve) => {
    const waiter: Waiter = {
      needles,
      resolve,
      timer: setTimeout(() => {
        session.waiters = session.waiters.filter((w) => w !== waiter);
        resolve(null);
      }, timeoutMs)
    };
    session.waiters.push(waiter);
  });
}

function feed(session: TuiSession, data: string): void {
  session.screen = (session.screen + stripAnsi(data)).slice(-64_000);
  if (!session.waiters.length) return;
  const remaining: Waiter[] = [];
  for (const waiter of session.waiters) {
    const hit = waiter.needles.find((n) => session.screen.includes(n));
    if (hit) {
      clearTimeout(waiter.timer);
      waiter.resolve(hit);
    } else {
      remaining.push(waiter);
    }
  }
  session.waiters = remaining;
}

/**
 * Açılış diyaloglarını çevirir.
 *
 * İnteraktif kipte `-m` bayrağı YOK (üst seviyede `-v` "sürüm" demek), yani
 * model yalnızca diyalogdan seçilebiliyor. Bunu çözmek için modeli spawn'dan
 * ÖNCE axet-code'un kendi config dosyasına yazıyoruz (setAxetModel; CLI'ın
 * kendi `/model` seçicisinin yazdığı dosyanın aynısı). Böylece diyalogdaki
 * "Recently used" listesinin başı bizim model oluyor ve tek Enter doğru
 * modeli seçiyor — ekrana model adı yazıp filtrelemeye gerek kalmıyor.
 */
/**
 * Bağlayıcı araçları yüklenene kadar bekler.
 *
 * Ekrandaki `● <ad> <N> tools` satırlarının SAYISI izleniyor; sayı artmayı
 * bıraktıktan sonra kısa bir sessizlik geçince yerleşmiş sayılıyor. Neden tek
 * bir işaret aranmıyor: kayıt sayısı kullanıcıya göre değişiyor (ölçümde 4
 * kayıt, 25+25+25+17 = 92 araç) ve hepsi ayrı ayrı, saniyeler içinde geliyor.
 *
 * Tavan dolarsa BEKLEMEDEN devam ediliyor ve durum log'a yazılıyor: bağlayıcı
 * arka ucu çökmüşse sohbeti tamamen kilitlemek, aracı olmayan bir cevaptan
 * daha kötü olurdu.
 */
async function waitForConnectors(session: TuiSession): Promise<Record<string, unknown>> {
  const started = Date.now();
  const deadline = started + CONNECTOR_WAIT_MS;
  let seen = 0;
  let lastGrowth = Date.now();
  while (Date.now() < deadline) {
    if (session.disposed || session.exited) break;
    const count = session.screen.match(RE_CONNECTOR_TOOLS)?.length ?? 0;
    if (count > seen) {
      seen = count;
      lastGrowth = Date.now();
    }
    if (seen > 0 && Date.now() - lastGrowth > CONNECTOR_SETTLE_MS) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return {
    baglayiciBekleme: ((Date.now() - started) / 1000).toFixed(1),
    baglayiciSatir: seen
  };
}

async function handshake(session: TuiSession): Promise<boolean> {
  for (let step = 0; step < HANDSHAKE_MAX_STEPS; step += 1) {
    const hit = await waitForAny(session, [MARK_TOOL_DIALOG, MARK_MODEL_DIALOG, ...MARK_READY], HANDSHAKE_STEP_MS);
    if (session.disposed || session.exited) return false;
    if (!hit) {
      // Sessiz kalmıyoruz: TUI'nin açılış ekranı bir sürümde değişirse tek
      // belirti "sohbet yine yavaş" olurdu ve sebebi hiçbir yerde yazmazdı.
      console.log("[axetChatTui] acilis ekrani taninmadi, run kipine dusuluyor", {
        chatId: session.chatId,
        adim: step,
        sonEkran: session.screen.slice(-400)
      });
      return false;
    }
    if (MARK_READY.includes(hit)) {
      const bekleme = session.useConnectors ? await waitForConnectors(session) : null;
      session.ready = true;
      console.log("[axetChatTui] oturum hazir", { chatId: session.chatId, adim: step, ...(bekleme ?? {}) });
      return true;
    }
    // Diyalogda ilk sıra bizim istediğimiz seçenek: araç listesinde aXet.Code,
    // model listesinde de config'e az önce yazdığımız model.
    session.screen = "";
    session.proc.write("\r");
  }
  return false;
}

function createSession(chatId: string, cwd: string, model: AxetModelEntry | null, useConnectors: boolean): TuiSession | null {
  const dbPath = resolveSessionDb(cwd);
  if (!dbPath) return null;
  try {
    mkdirSync(cwd, { recursive: true });
  } catch {
    // Oluşturulamazsa pty.spawn zaten anlamlı bir hatayla patlıyor.
  }
  if (model) {
    // Diyalogda tek Enter'ın doğru modeli seçmesini sağlayan adım.
    setAxetModel("large", model);
  }
  let proc: pty.IPty;
  // Spawn'dan ÖNCE okunuyor: axet-code oturum satırını spawn'dan sonra yazıyor,
  // yani bu değer her zaman gerçek oturumun altında kalır.
  const spawnedAt = Math.floor(Date.now() / 1000);
  try {
    proc = pty.spawn("axet-code.exe", ["-c", cwd, "-y"], {
      name: "xterm-256color",
      // Genişlik yalnızca TUI'nin kendi sarmalaması için önemli; metni
      // ekrandan okumadığımız için bir ölçüye bağlı değiliz.
      cols: 120,
      rows: 34,
      cwd,
      env: axetSpawnEnv(useConnectors)
    });
  } catch {
    return null;
  }
  const session: TuiSession = {
    chatId,
    proc,
    cwd,
    modelKey: modelKeyOf(model),
    useConnectors,
    dbPath,
    spawnedAt,
    axetSessionId: null,
    screen: "",
    ready: false,
    busy: false,
    disposed: false,
    exited: false,
    cancelled: false,
    seeded: false,
    lastUsed: Date.now(),
    idleTimer: null,
    waiters: []
  };
  proc.onData((data) => feed(session, data));
  proc.onExit(() => {
    session.exited = true;
    for (const waiter of session.waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    session.waiters = [];
  });
  sessions.set(chatId, session);
  touch(session);
  return session;
}

/**
 * Bu sohbet için hazır bir TUI oturumu döndürür; yoksa kurar.
 *
 * cwd, model veya BAĞLAYICI kararı değiştiyse oturum yeniden kuruluyor:
 * üçü de spawn anında sabitleniyor (bağlayıcı adresi ortam değişkeniyle —
 * bkz. axetSpawnEnv.ts). Yeniden kurulan oturumun geçmişi olmadığı için
 * `seeded` sıfırlanır ve o mesajda geçmiş yeniden tohumlanır; yani en kötü
 * durum, eski `run` kipinin normal davranışıdır.
 */
// Kurulum sırasında ikinci bir çağrı gelirse (ön-ısıtma yazarken tetiklenir,
// hemen ardından gönderim) AYNI kuruluma bağlanılıyor. Aksi hâlde her tuşta
// yeni bir axet-code süreci açılırdı.
const pendingSetup = new Map<string, Promise<TuiSession | null>>();

async function ensureSession(
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  useConnectors: boolean
): Promise<TuiSession | null> {
  const existing = sessions.get(chatId);
  if (existing) {
    // Bağlayıcılarda YENİDEN KURMA yalnızca KAPALI→AÇIK yönünde. Ters yönde
    // kurmak, kazanılan her şeyi (oturum hafızası, araç sonuçları) bir kez daha
    // "mail" geçmeyen bir mesaj yüzünden çöpe atmak olurdu; tek kazancı o turda
    // araç kataloğunu göndermemek, bedeli 3,5 s + geçmişin yeniden tohumlanması.
    // Yani sohbette bir kez açıldıysa sohbet boyunca açık kalıyor.
    const connectorsOk = existing.useConnectors || !useConnectors;
    const compatible =
      !existing.exited &&
      !existing.disposed &&
      existing.ready &&
      existing.cwd === cwd &&
      existing.modelKey === modelKeyOf(model) &&
      connectorsOk;
    if (compatible) return existing;
  }
  const inFlight = pendingSetup.get(chatId);
  if (inFlight) {
    const session = await inFlight;
    if (
      session &&
      !session.exited &&
      !session.disposed &&
      session.cwd === cwd &&
      session.modelKey === modelKeyOf(model) &&
      (session.useConnectors || !useConnectors)
    ) {
      return session;
    }
  }
  if (sessions.has(chatId)) disposeSession(chatId);
  evictIfNeeded();
  const setup = (async () => {
    const session = createSession(chatId, cwd, model, useConnectors);
    if (!session) return null;
    const ok = await handshake(session);
    if (!ok) {
      disposeSession(chatId);
      return null;
    }
    return session;
  })();
  pendingSetup.set(chatId, setup);
  try {
    return await setup;
  } finally {
    if (pendingSetup.get(chatId) === setup) pendingSetup.delete(chatId);
  }
}

/**
 * Kullanıcı yazarken oturumu şimdiden kurar.
 *
 * Kalıcı oturumda açılış maliyeti sohbette BİR KEZ ödeniyor; onu da kullanıcı
 * yazarken ödersek ilk mesaj da hızlı oluyor. Bağlayıcılar KAPALI kuruluyor —
 * karar mesajın metnine bağlı (bkz. connectorPolicy) ve ısıtma anında metin
 * henüz yok; yaygın durum kapalı. Karar "açık" çıkarsa oturum yeniden kurulur,
 * yani yanlış tahminin bedeli eski davranışın aynısı.
 */
export function prewarmTui(chatId: string, cwd: string, model: AxetModelEntry | null): void {
  if (!chatId || tuiUnavailableReason(cwd)) return;
  const existing = sessions.get(chatId);
  if (existing && !existing.exited && !existing.disposed) {
    touch(existing);
    return;
  }
  if (pendingSetup.has(chatId)) return;
  void ensureSession(chatId, cwd, model, false).catch(() => null);
}

// ---------------------------------------------------------------------------
// Araç adları
// ---------------------------------------------------------------------------
// Ham ad renderer'a olduğu gibi gidiyor; Türkçe/İngilizce karşılığı orada
// (i18n sözlüğünde) bulunuyor. Bilinmeyen bir araç adı da olduğu gibi
// gösterilebilsin diye burada çeviri YAPILMIYOR.
function normalizeToolName(raw: string): string {
  // MCP araçları `mcp_conn_<uuid>_<ad>` biçiminde geliyor; uuid'nin arayüzde
  // hiçbir anlamı yok.
  const mcp = /^mcp_conn_[0-9a-f-]{8,}_(.+)$/i.exec(raw);
  if (mcp) return `mcp:${mcp[1]}`;
  return raw;
}

// ---------------------------------------------------------------------------
// Bir tur
// ---------------------------------------------------------------------------

/** Oturumu veritabanında bulmak için kullanılacak, tek satırlık ayırt edici parça. */
function promptNeedle(message: string): string {
  const longest = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort((a, b) => b.length - a.length)[0];
  return (longest ?? message.trim()).slice(0, 80);
}

export interface TuiSendArgs {
  chatId: string;
  cwd: string;
  model: AxetModelEntry | null;
  history: AxetChatMessage[];
  message: string;
  useConnectors: boolean;
  /** Oturum yeniden kurulduğunda geçmişi tohumlamak için — `run` kipiyle aynı metin. */
  buildSeedPrompt: (history: AxetChatMessage[], message: string) => string;
  /** İlk mesajda eklenen bağlam/hatırlatma önsözü. */
  buildFirstPrompt: (message: string) => string;
  onChunk: (text: string) => void;
  onActivity: (phase: AxetChatActivityPhase, detail?: string) => void;
}

/** Bu sohbetin TUI oturumu şu an bir turu sürdürüyor mu? */
export function tuiBusy(chatId: string): boolean {
  return sessions.get(chatId)?.busy === true;
}

/** TUI kipi kullanılabilir mi (native sqlite yüklendi mi)? */
export function tuiUnavailableReason(cwd: string): string {
  const dbError = sessionDbLoadError();
  if (dbError) return `oturum veritabanı okunamıyor: ${dbError}`;
  if (!resolveSessionDb(cwd)) return "bu klasör için axet-code oturum veritabanı yok";
  return "";
}

/**
 * Kalıcı oturum üzerinden bir mesaj gönderir.
 *
 * `null` dönerse TUI kipi bu mesaj için kurulamadı demektir — çağıran taraf
 * eski `run` kipine düşmeli. Bilerek sessiz bir başarısızlık DEĞİL: sebep
 * `tuiUnavailableReason` ile ayrıca okunabiliyor.
 */
export async function sendViaTui(args: TuiSendArgs): Promise<AxetChatSendResult | null> {
  const session = await ensureSession(args.chatId, args.cwd, args.model, args.useConnectors);
  if (!session) return null;
  if (session.busy) return null;

  session.busy = true;
  session.cancelled = false;
  touch(session);
  args.onActivity("thinking");

  try {
    const sinceSec = Math.max(0, Math.min(latestMessageTime(session.dbPath), Math.floor(Date.now() / 1000)) - 2);

    // Zaman penceresi tek başına YETMİYOR. `created_at` saniye çözünürlüklü ve
    // pencereyi 2 saniye geriye alıyoruz (saat kayması payı) — aynı sohbetin
    // ÖNCEKİ turundan kalan asistan mesajı bu pencereye düşerse, o turun cevabı
    // bu turun başında yeniden akardı. Bu yüzden gönderimden ÖNCE var olan
    // mesajların kimlikleri işaretleniyor.
    const preexisting = new Set<string>(
      session.axetSessionId
        ? readMessagesSince(session.dbPath, session.axetSessionId, sinceSec).map((m) => m.id)
        : []
    );

    // Oturum yeni ya da yeniden kurulmuşsa geçmişi TAŞIYAN metni gönderiyoruz;
    // aksi hâlde oturum zaten hatırlıyor ve sadece mesajın kendisi yeterli.
    const text = session.seeded
      ? args.message
      : args.history.length > 0
        ? args.buildSeedPrompt(args.history, args.message)
        : args.buildFirstPrompt(args.message);

    // TUI'de Enter (\r) gönderir, ctrl+j (\n) satır atlar — yani metindeki
    // satır sonlarını olduğu gibi yazabiliyoruz, sonuna tek \r koymak yeterli.
    session.proc.write(`${text.replace(/\r/g, "")}\r`);
    session.seeded = true;

    // İğne, GÖNDERDİĞİMİZ metinden çıkarılıyor (kullanıcının ham mesajından
    // değil): tohumlama turunda veritabanına düşen metin önsözle birlikte olan
    // metindir, ve "selam" gibi çok kısa bir mesaj iğne olarak ayırt edici
    // değildir.
    const needle = promptNeedle(text);
    const started = Date.now();
    const deadline = started + TURN_TIMEOUT_MS;
    const emitted = new Map<string, number>();
    // Araç çağrıları çağrı KİMLİĞİYLE tekilleniyor. Ad yetmiyor: yoklama her
    // seferinde aynı mesajları yeniden okuyor, ve arka arkaya gelen iki farklı
    // `bash` çağrısı da meşru — canlı denemede (2026-09-04) ad karşılaştırması
    // saniyede dört kez aynı aracı bildirdi.
    const seenTools = new Set<string>();
    let toolCount = 0;
    let answer = "";
    // Gönderdiğimiz prompt oturuma DÜŞENE kadar hiçbir asistan mesajı bu tura
    // ait sayılmıyor. Tek başına "yeni mesaj" ölçütü yetmiyordu: yanlış bir
    // oturuma bağlanıldığında oradaki her mesaj "yeni" görünüyor ve turun
    // cevabı diye akıyordu (2026-09-04).
    let promptLanded = false;

    for (;;) {
      if (session.disposed || session.cancelled) return { ok: false, text: answer, cancelled: true };
      if (session.exited) {
        return { ok: false, text: answer, error: "axet-code oturumu beklenmedik şekilde kapandı." };
      }
      if (Date.now() > deadline) {
        // Zaman aşımının SEBEBİ log'a düşüyor. Sessiz kalırsa "cevap gelmedi"
        // ile "yanlış oturumu dinledik" ayırt edilemez — 2026-09-04'te tam da
        // bu ikisi karıştı ve teşhis veritabanını elle okumayı gerektirdi.
        console.log("[axetChatTui] tur zaman asimina ugradi", {
          chatId: session.chatId,
          oturum: session.axetSessionId?.slice(0, 8) ?? "bulunamadi",
          promptDustu: promptLanded,
          arac: toolCount,
          metinUzunlugu: answer.length
        });
        return { ok: false, text: answer, error: `axet-code ${TURN_TIMEOUT_MS / 1000} saniyede cevap vermedi.` };
      }

      if (!session.axetSessionId) {
        // ALT SINIR `spawnedAt`, `sinceSec` DEĞİL. `sinceSec` veritabanındaki
        // son mesaja bakıyor ve o mesaj pekâlâ BİZDEN ÖNCEKİ bir sohbete ait
        // olabilir; o pencereyle "en yeni oturum" yedeği başka bir sohbetin
        // oturumunu döndürüp turu onun cevabıyla bitiriyordu.
        session.axetSessionId =
          findSessionByPrompt(session.dbPath, session.spawnedAt, needle) ??
          newestSessionSince(session.dbPath, session.spawnedAt);
      }

      if (session.axetSessionId) {
        const messages = readMessagesSince(session.dbPath, session.axetSessionId, sinceSec);
        if (!promptLanded) {
          promptLanded = messages.some(
            (m) =>
              m.role === "user" &&
              !preexisting.has(m.id) &&
              m.parts
                .filter((part) => part.type === "text")
                .map((part) => part.data?.text ?? "")
                .join("")
                .includes(needle)
          );
        }
        const assistants = promptLanded
          ? messages.filter((m) => m.role === "assistant" && !preexisting.has(m.id))
          : [];
        for (const message of assistants) {
          const body = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.data?.text ?? "")
            .join("");
          const already = emitted.get(message.id) ?? 0;
          if (body.length > already) {
            args.onChunk(body.slice(already));
            emitted.set(message.id, body.length);
            answer += body.slice(already);
          }
          for (const part of message.parts) {
            if (part.type !== "tool_call") continue;
            const name = normalizeToolName(part.data?.name ?? "");
            const callId = part.data?.id ?? `${message.id}:${name}`;
            if (!name || seenTools.has(callId)) continue;
            seenTools.add(callId);
            toolCount += 1;
            args.onActivity("tool", name);
          }
        }
        // Turun bittiğine SON asistan mesajından karar veriliyor.
        //
        // Bitiş sebebi `"stop"` DEĞİL: canlı ölçümde (2026-09-04) araç
        // zincirindeki ara mesajlar `tool_use`, kapanış mesajı ise `end_turn`
        // ile bitiyor. `"stop"` yalnızca tool_result kayıtlarında görülüyor —
        // ona bakan ilk sürüm cevabı aldığı hâlde beklemeye devam etti ve tur
        // zaman aşımına düştü. Bu yüzden kural sebebi SAYMAK değil, `tool_use`
        // DIŞINDA bir sebep görmek: `max_tokens`/`error` gibi ileride eklenecek
        // sebepler de doğru şekilde "bitti" sayılır.
        const lastFinish = assistants.length
          ? assistants[assistants.length - 1].parts.find((part) => part.type === "finish")
          : undefined;
        const reason = lastFinish?.data?.reason;
        if (reason && reason !== "tool_use") {
          args.onActivity("finishing");
          // Yavaşlık şikâyeti ölçülebilir olsun diye: her turun süresi ve kaç
          // araç çalıştığı log'a düşüyor.
          console.log("[axetChatTui] tur bitti", {
            chatId: session.chatId,
            saniye: ((Date.now() - started) / 1000).toFixed(1),
            arac: toolCount,
            // Oturumun GERÇEK durumu; istenen değil (bkz. yapışkan bağlayıcı
            // kuralı, ensureSession).
            baglayici: session.useConnectors,
            oturum: session.axetSessionId?.slice(0, 8) ?? "?"
          });
          return { ok: true, text: answer.trim(), usedConnectors: session.useConnectors };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } finally {
    session.busy = false;
    touch(session);
  }
}

/** Süren turu iptal eder — TUI'de esc "cancel". */
export function cancelTui(chatId: string): void {
  const session = sessions.get(chatId);
  if (!session || session.exited) return;
  // Bayrak ŞART: esc turu TUI tarafında kesiyor ama veritabanına bir "stop"
  // bitişi yazılmayabiliyor — yoklama döngüsü onu beklerse iptal, iptal değil
  // 5 dakikalık bir zaman aşımı olurdu.
  session.cancelled = true;
  try {
    session.proc.write("\x1b");
  } catch {
    // Yazılamıyorsa süreç zaten gitmiş demektir.
  }
}
