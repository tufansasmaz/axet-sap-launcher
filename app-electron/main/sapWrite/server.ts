// SAP DEV yazma onayının yerel ucu. adt_gated_server.py her yazmadan önce buraya
// sorar; karar policy.ts'de, pencere renderer'da.
//
// Tek sunucu, 127.0.0.1'de rastgele port. Her DEV projesi bir oturum açar; oturumun
// 32 baytlık token'ı hem kimlik doğrulama hem de oturum seçimidir. Token yalnızca
// bellekte ve gated sunucunun ortam değişkeninde yaşar — dosyaya, sap-context.md'ye,
// günlüğe yazılmaz. Oturum kapanınca token ölür: eski gated sunucu bir daha onay
// alamaz (her yazması approval_unavailable).

import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { Choice, Decision, SapWriteState, WorkMode } from "../../shared/sapWriteTypes";
import {
  approvalCandidates,
  dirKey,
  emitApprovalEvent,
  onApprovalEvent,
  resolveOwnership,
  type ApprovalOutcome,
  type ApprovalOwnership,
} from "./approvalEvents";
import { appendDecisionLog, atcLogFields, factLogFields, resultLogFields } from "./log";
import {
  canSession,
  decide,
  newSessionState,
  respond,
  setMode,
  sweep,
  validateFact,
  type Identity,
  type WriteSessionState,
} from "./policy";

const MAX_BODY = 4 * 1024 * 1024;
const SWEEP_INTERVAL_MS = 30_000;

interface Session {
  state: WriteSessionState;
  token: string;
}

const sessions = new Map<string, Session>();
let server: Server | null = null;
let serverPort = 0;
let starting: Promise<void> | null = null;
let sweeper: NodeJS.Timeout | null = null;
let notifier: (() => void) | null = null;

const MESAJ: Record<Decision, string> = {
  izinli: "Onaylandı.",
  bekliyor:
    "Onay NTT Studio penceresinde hâlâ bekliyor. Kullanıcıya pencereyi söyle ve turunu burada bitir; kullanıcı onaylayınca NTT Studio sana \"Onaylandı, kaldığın yerden devam et\" yazar (ya da kullanıcı söyler). O zaman AYNI çağrıyı AYNI argümanlarla tekrar gönder; argümanı değiştirirsen yeni bir onay açılır.",
  reddedildi: "Kullanıcı reddetti. Tekrar deneme, başka yoldan da deneme. Kullanıcıya ne yapmak istediğini sor.",
  sure_doldu:
    "Onay penceresi 10 dakika cevapsız kaldı. Kullanıcıya sor; isterse 10 dakika sonra aynı çağrıyı tekrar gönder.",
  yerel_mod:
    "Bu oturum yerel modda: SAP'a tek tek yazılmaz. Değişiklikleri yerelde bitir, sonra axet_teslim ile listenin tamamını tek seferde onaylat.",
  mod_secilmedi:
    "Kullanıcı bu oturum için çalışma modunu henüz seçmedi. NTT Studio penceresinden seçmesini iste, sonra tekrar dene.",
};

function sameDir(a: string, b: string): boolean {
  return dirKey(a) === dirKey(b);
}

/**
 * İsteği yapan sürecin ata zinciri: gated sunucu `X-Axet-Istemci` başlığında
 * boşlukla ayrılmış PID'ler olarak gönderiyor (en yakından uzağa). Yoksa ya da
 * bozuksa null: sahiplik klasörden çıkarılır.
 */
export function parseCallerPids(header: string | string[] | undefined): number[] | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parts = raw.trim().split(/\s+/).slice(0, 16);
  const pids = parts.map((x) => (/^\d{1,10}$/.test(x) ? Number(x) : NaN));
  return pids.every((n) => Number.isSafeInteger(n) && n > 0) ? pids : null;
}

/** Uzun yoklamanın en uzun süresi: onay penceresinin kendi süresi (10 dk). */
export const MAX_WAIT_MS = 10 * 60_000;

/** `X-Axet-Bekle`: saniye. Yoksa, bozuksa ya da 0'sa 0 (hemen cevap, eski davranış). */
export function parseWaitMs(header: string | string[] | undefined): number {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== "string" || !/^\d{1,4}$/.test(raw.trim())) return 0;
  return Math.min(Number(raw.trim()) * 1000, MAX_WAIT_MS);
}

/** Kaydın kararı (pencere, süre, oturumun kapanması), süre sonu ya da çağıranın kopması. */
function waitForDecision(id: string, ms: number, res: ServerResponse): Promise<"karar" | "zaman" | "koptu"> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: "karar" | "zaman" | "koptu") => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      off();
      res.off("close", onClose);
      resolve(v);
    };
    const onClose = () => {
      if (!res.writableEnded) finish("koptu");
    };
    const off = onApprovalEvent((e) => {
      if (e.tur === "sonuclandi" && e.id === id) finish("karar");
    });
    const timer = setTimeout(() => finish("zaman"), ms);
    res.on("close", onClose);
  });
}

// Bekleyen isteğin sahipliği: ilk kesin (süreç zinciriyle) eşleşme yapışır,
// tekrar sorulduğunda yeniden hesaplanmaz. Karar gelince silinir.
const ownerships = new Map<string, ApprovalOwnership>();

function ownershipOf(id: string, callerPids: number[] | null, projectDir: string): ApprovalOwnership {
  const prev = ownerships.get(id);
  if (prev?.tur === "tam") return prev;
  const own = resolveOwnership(callerPids, projectDir, approvalCandidates());
  ownerships.set(id, own);
  return own;
}

function notify(): void {
  try {
    notifier?.();
  } catch {
    // Pencere kapanmış olabilir; karar akışını bildirim yüzünden bozma.
  }
}

function identityFields(s: WriteSessionState): Record<string, unknown> {
  return { sid: s.identity.sid, client: s.identity.client, kullanici: s.identity.user, mod: s.mode };
}

// Olay gövdesindeki listeler günlüğe olduğu gibi gitmesin: metin olmayanlar
// atılır, sayı ve boy sınırlanır (günlük dosyası şişirilemesin).
function shortStrings(value: unknown, maxItems: number, maxLen: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === "string")
        .slice(0, maxItems)
        .map((v) => v.slice(0, maxLen))
    : [];
}

function findSession(req: IncomingMessage): Session | null {
  const header = req.headers.authorization ?? "";
  const got = Buffer.from(header);
  for (const s of sessions.values()) {
    const want = Buffer.from(`Bearer ${s.token}`);
    if (got.length === want.length && timingSafeEqual(got, want)) return s;
  }
  return null;
}

function send(res: ServerResponse, code: number, body: unknown): void {
  const data = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": data.length });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooBig = false;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        tooBig = true;
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(tooBig ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const session = findSession(req);
  if (!session) {
    // Gövdeyi okumadan kapat: token'sız istemciye 4 MB okuma bedava verilmesin.
    send(res, 401, { hata: "yetkisiz" });
    return;
  }
  const url = req.url ?? "";
  if (req.method === "GET" && url === "/health") {
    send(res, 200, { ok: true });
    return;
  }
  if (req.method !== "POST" || !["/approvals", "/results", "/events"].includes(url)) {
    send(res, 404, { hata: "yok" });
    return;
  }
  const text = await readBody(req);
  if (text === null) {
    send(res, 413, { hata: "govde_buyuk" });
    return;
  }
  const body = parseJson(text);
  const state = session.state;
  const now = Date.now();

  if (url === "/approvals") {
    if (!validateFact(body)) {
      send(res, 400, { hata: "gecersiz_bilgi" });
      return;
    }
    sweepNow(now);
    let r = decide(state, body, now);
    // Aynı bekleyen isteğin tekrarı (ajan yoklarken) günlüğü şişirmesin.
    if (!(r.karar === "bekliyor" && !r.created)) {
      appendDecisionLog(
        state.projectDir,
        { tur: "karar", id: r.id, karar: r.karar, kaynak: r.kaynak, ...factLogFields(body), ...identityFields(state) },
        now,
      );
    }
    if (r.created) notify();
    // Sohbet turu bu olaylarla onay bekler (bkz. approvalEvents.ts). Kimlik ve klasör dışında bir şey taşımaz.
    if (r.karar === "bekliyor" && r.id) {
      const sahiplik = ownershipOf(r.id, parseCallerPids(req.headers["x-axet-istemci"]), state.projectDir);
      emitApprovalEvent({ tur: "soruldu", id: r.id, projectDir: state.projectDir, sahiplik });
    }
    // Uzun yoklama: gated sunucu `X-Axet-Bekle` ile kararı aynı çağrı içinde
    // bekleyebiliyor. Karar gelirse ya da süre biterse karar YENİDEN verilir
    // (onay tek kullanımlık: izinli dönerse kayıt tüketilir); çağıran koparsa
    // hiçbir şey tüketilmez, onay pencerede verilmiş olarak kalır ve ajanın
    // tekrar gönderdiği çağrı onu kullanır. Bekleme izin VERMEZ, yalnız sorar.
    const waitMs = parseWaitMs(req.headers["x-axet-bekle"]);
    if (r.karar === "bekliyor" && r.id && waitMs > 0) {
      const outcome = await waitForDecision(r.id, waitMs, res);
      if (outcome === "koptu") return;
      if (![...sessions.values()].includes(session)) {
        send(res, 401, { hata: "oturum_kapandi" });
        return;
      }
      if (outcome === "karar") {
        const later = Date.now();
        sweepNow(later);
        r = decide(state, body, later);
        if (!(r.karar === "bekliyor" && !r.created)) {
          appendDecisionLog(
            state.projectDir,
            { tur: "karar", id: r.id, karar: r.karar, kaynak: r.kaynak, ...factLogFields(body), ...identityFields(state) },
            later,
          );
        }
        if (r.created) notify();
      }
    }
    if (r.karar === "izinli" && r.kaynak === "pencere" && r.id) emitApprovalEvent({ tur: "kullanildi", id: r.id, projectDir: state.projectDir });
    send(res, 200, { karar: r.karar, id: r.id, mesaj: MESAJ[r.karar] });
    return;
  }

  if (url === "/results") {
    const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    const id = typeof b.id === "string" ? b.id : "";
    const rec = state.records.find((r) => r.id === id);
    if (!rec) {
      send(res, 404, { hata: "bulunamadi" });
      return;
    }
    // atc de sap_sonucu gibi kırpılır: Python tarafı bugün yalnızca sayı gönderiyor, yarın ne gönderirse göndersin.
    const atc = atcLogFields(b.atc);
    appendDecisionLog(
      state.projectDir,
      {
        tur: "sonuc",
        id,
        arac: rec.fact.arac,
        transport: rec.fact.transport,
        sap_sonucu: resultLogFields(b.sap_sonucu),
        ...(atc ? { atc } : {}),
        ...identityFields(state),
      },
      now,
    );
    send(res, 200, { ok: true });
    return;
  }

  // /events — yalnızca günlük; hiçbir izin vermez.
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (b.tur === "baglanti_uyusmazligi" && typeof b.arac === "string") {
    // Ajanın `.conn_adt`'yi NTT Studio'nun bağladığı sistemden başkasına
    // çevirdiği an (ntt_binding.py). Çağrı SAP'a gitmeden reddedildi; günlükte
    // görünmesi, "onayladığım yazma neden olmadı" sorusunun cevabı. Gövde
    // gated sunucudan geliyor ama o da ajanın yazdığı dosyayı okuyor: yalnızca
    // kısa metin listeleri, boyu kırpılarak.
    appendDecisionLog(
      state.projectDir,
      {
        tur: "baglanti_uyusmazligi",
        arac: b.arac.slice(0, 100),
        alanlar: shortStrings(b.alanlar, 10, 40),
        kaynaklar: shortStrings(b.kaynaklar, 10, 40),
        gozlenen_adresler: shortStrings(b.gozlenen_adresler, 5, 200),
        ...identityFields(state),
      },
      now,
    );
    send(res, 200, { ok: true });
    return;
  }
  if (b.tur !== "kalite_reddi" || typeof b.arac !== "string") {
    send(res, 400, { hata: "gecersiz_olay" });
    return;
  }
  const nesneler = Array.isArray(b.nesneler)
    ? b.nesneler
        .filter((o): o is Record<string, unknown> => typeof o === "object" && o !== null)
        .map((o) => ({ ad: String(o.ad ?? ""), tip: String(o.tip ?? "") }))
    : [];
  appendDecisionLog(
    state.projectDir,
    { tur: "kalite_reddi", arac: b.arac, nesneler, sebep: String(b.sebep ?? "").slice(0, 200), ...identityFields(state) },
    now,
  );
  send(res, 200, { ok: true });
}

async function ensureServer(): Promise<void> {
  if (server) return;
  if (starting) return starting;
  starting = new Promise<void>((resolve, reject) => {
    const srv = createServer((req, res) => {
      handle(req, res).catch((err) => {
        console.warn(`[sap-yazma] onay ucu hatası: ${String(err)}`);
        if (!res.headersSent) send(res, 500, { hata: "ic_hata" });
      });
    });
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      server = srv;
      serverPort = (srv.address() as AddressInfo).port;
      sweeper = setInterval(() => sweepNow(), SWEEP_INTERVAL_MS);
      sweeper.unref();
      resolve();
    });
  });
  try {
    await starting;
  } finally {
    starting = null;
  }
}

export async function openWriteSession(
  projectDir: string,
  identity: Identity,
): Promise<{ url: string; token: string; sessionId: string }> {
  await ensureServer();
  closeWriteSession(projectDir);
  const sessionId = randomUUID();
  const token = randomBytes(32).toString("hex");
  sessions.set(sessionId, { state: newSessionState(sessionId, projectDir, identity), token });
  notify();
  return { url: `http://127.0.0.1:${serverPort}`, token, sessionId };
}

/** Kapanan oturumun bekleyen istekleri: bekleyen sohbet turu boşuna 10 dk beklemesin. */
function emitClosed(s: Session): void {
  for (const r of s.state.records) {
    if (r.status === "bekliyor") emitApprovalEvent({ tur: "sonuclandi", id: r.id, projectDir: s.state.projectDir, durum: "kapandi" });
    ownerships.delete(r.id);
  }
}

export function closeWriteSession(projectDir: string): void {
  let changed = false;
  for (const [id, s] of sessions) {
    if (sameDir(s.state.projectDir, projectDir)) {
      sessions.delete(id);
      emitClosed(s);
      changed = true;
    }
  }
  if (changed) notify();
}

export function closeAllWriteSessions(): void {
  if (sessions.size === 0) return;
  const closing = [...sessions.values()];
  sessions.clear();
  closing.forEach(emitClosed);
  notify();
}

export function setWriteMode(sessionId: string, mode: WorkMode): boolean {
  const s = sessions.get(sessionId);
  if (!s || !setMode(s.state, mode)) return false;
  appendDecisionLog(s.state.projectDir, { tur: "mod", ...identityFields(s.state) });
  notify();
  return true;
}

export function respondToApproval(id: string, choice: Choice): { ok: boolean; error?: string } {
  const now = Date.now();
  sweepNow(now);
  for (const s of sessions.values()) {
    const rec = s.state.records.find((r) => r.id === id);
    if (!rec) continue;
    const r = respond(s.state, id, choice, now);
    if (r.ok) {
      appendDecisionLog(s.state.projectDir, {
        tur: "cevap",
        id,
        secim: choice,
        ...factLogFields(rec.fact),
        ...identityFields(s.state),
      });
      const durum: ApprovalOutcome = choice === "reddet" ? "reddedildi" : "onaylandi";
      emitApprovalEvent({ tur: "sonuclandi", id, projectDir: s.state.projectDir, durum });
      ownerships.delete(id);
    }
    notify();
    return r;
  }
  return { ok: false, error: "bulunamadi" };
}

/** Açık onay oturumlarının anahtarları — yalnız destek paketini maskelemek için (bkz. support/ipc.ts). */
export function activeApprovalTokens(): string[] {
  return [...sessions.values()].map((s) => s.token);
}

export function listWriteState(): SapWriteState {
  const out: SapWriteState = { sessions: [], pending: [] };
  for (const s of sessions.values()) {
    const st = s.state;
    out.sessions.push({ id: st.id, sid: st.identity.sid, client: st.identity.client, user: st.identity.user, mode: st.mode });
    for (const r of st.records) {
      if (r.status !== "bekliyor") continue;
      out.pending.push({
        id: r.id,
        sessionId: st.id,
        createdAt: r.createdAt,
        fact: r.fact,
        canSession: canSession(st.mode, r.fact),
        mode: st.mode,
        sid: st.identity.sid,
        client: st.identity.client,
        user: st.identity.user,
      });
    }
  }
  out.pending.sort((a, b) => a.createdAt - b.createdAt);
  return out;
}

export function setWriteNotifier(fn: (() => void) | null): void {
  notifier = fn;
}

export function sweepNow(now: number = Date.now()): void {
  let changed = false;
  for (const s of sessions.values()) {
    const r = sweep(s.state, now);
    for (const id of r.expired) {
      const rec = s.state.records.find((x) => x.id === id);
      appendDecisionLog(
        s.state.projectDir,
        { tur: "karar", id, karar: "sure_doldu", ...(rec ? factLogFields(rec.fact) : {}), ...identityFields(s.state) },
        now,
      );
      emitApprovalEvent({ tur: "sonuclandi", id, projectDir: s.state.projectDir, durum: "sure_doldu" });
      ownerships.delete(id);
    }
    if (r.changed) changed = true;
  }
  if (changed) notify();
}

export async function stopApprovalServer(): Promise<void> {
  if (sweeper) clearInterval(sweeper);
  sweeper = null;
  const closing = [...sessions.values()];
  sessions.clear();
  closing.forEach(emitClosed);
  const srv = server;
  server = null;
  serverPort = 0;
  if (!srv) return;
  srv.closeAllConnections?.();
  await new Promise<void>((resolve) => srv.close(() => resolve()));
}
