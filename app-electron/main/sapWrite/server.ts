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
import path from "node:path";
import type { Choice, Decision, SapWriteState, WorkMode } from "../../shared/sapWriteTypes";
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
    "Onay NTT Studio penceresinde bekliyor. Kullanıcıya pencereyi söyle ve bekle; kullanıcı onaylayınca AYNI çağrıyı AYNI argümanlarla tekrar gönder. Argümanı değiştirirsen yeni bir onay açılır.",
  reddedildi: "Kullanıcı reddetti. Tekrar deneme, başka yoldan da deneme. Kullanıcıya ne yapmak istediğini sor.",
  sure_doldu:
    "Onay penceresi 10 dakika cevapsız kaldı. Kullanıcıya sor; isterse 10 dakika sonra aynı çağrıyı tekrar gönder.",
  yerel_mod:
    "Bu oturum yerel modda: SAP'a tek tek yazılmaz. Değişiklikleri yerelde bitir, sonra axet_teslim ile listenin tamamını tek seferde onaylat.",
  mod_secilmedi:
    "Kullanıcı bu oturum için çalışma modunu henüz seçmedi. NTT Studio penceresinden seçmesini iste, sonra tekrar dene.",
};

function sameDir(a: string, b: string): boolean {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === "win32" ? na.toLowerCase() === nb.toLowerCase() : na === nb;
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
    const r = decide(state, body, now);
    // Aynı bekleyen isteğin tekrarı (ajan yoklarken) günlüğü şişirmesin.
    if (!(r.karar === "bekliyor" && !r.created)) {
      appendDecisionLog(
        state.projectDir,
        { tur: "karar", id: r.id, karar: r.karar, kaynak: r.kaynak, ...factLogFields(body), ...identityFields(state) },
        now,
      );
    }
    if (r.created) notify();
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

export function closeWriteSession(projectDir: string): void {
  let changed = false;
  for (const [id, s] of sessions) {
    if (sameDir(s.state.projectDir, projectDir)) {
      sessions.delete(id);
      changed = true;
    }
  }
  if (changed) notify();
}

export function closeAllWriteSessions(): void {
  if (sessions.size === 0) return;
  sessions.clear();
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
    }
    notify();
    return r;
  }
  return { ok: false, error: "bulunamadi" };
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
    }
    if (r.changed) changed = true;
  }
  if (changed) notify();
}

export async function stopApprovalServer(): Promise<void> {
  if (sweeper) clearInterval(sweeper);
  sweeper = null;
  sessions.clear();
  const srv = server;
  server = null;
  serverPort = 0;
  if (!srv) return;
  srv.closeAllConnections?.();
  await new Promise<void>((resolve) => srv.close(() => resolve()));
}
