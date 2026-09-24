// SAP DEV yazma onayının karar mantığı. Saf: HTTP, dosya ve Electron bilmez; zaman
// ve kimlik üretimi dışarıdan gelir. server.ts bunu çağırır, testler doğrudan çağırır.
//
// Kurallar spec §5'te. Özet: aynı argüman hash'i tek bir kayda bağlanır (tekrar gelen
// çağrı yeni pencere açmaz), onay tek kullanımlıktır, red ve süre dolması 10 dakika
// yapışkandır, oturum izni (transport, paket) çiftine, teslim izni nesne listesine ve
// kaynak hash'lerine bağlıdır.

import { randomUUID } from "node:crypto";
import type {
  Choice,
  Decision,
  DecisionSource,
  WorkMode,
  WriteFact,
} from "../../shared/sapWriteTypes";

export const PENDING_TTL_MS = 10 * 60_000;
export const STICKY_TTL_MS = 10 * 60_000;
export const APPROVED_TTL_MS = 60 * 60_000;
export const TESLIM_TTL_MS = 4 * 60 * 60_000;
export const UST_ONAY_TTL_MS = 60 * 60_000;

export type RecordStatus = "bekliyor" | "onaylandi" | "reddedildi" | "sure_doldu";

export interface ApprovalRecord {
  id: string;
  fact: WriteFact;
  status: RecordStatus;
  createdAt: number;
  decidedAt: number | null;
  /** Pencere onayı tek kullanımlık; izinli döndüğü anda true olur. */
  consumed: boolean;
  source: DecisionSource;
}

export interface Identity {
  sid: string;
  client: string;
  user: string;
}

export interface SessionGrant {
  transport: string;
  paket: string;
}

export interface TeslimGrant {
  recordId: string;
  fact: WriteFact;
  grantedAt: number;
}

export interface WriteSessionState {
  id: string;
  projectDir: string;
  identity: Identity;
  mode: WorkMode | null;
  records: ApprovalRecord[];
  sessionGrants: SessionGrant[];
  teslimGrants: TeslimGrant[];
}

export interface DecideResult {
  karar: Decision;
  /** izinli ve bekliyor/reddedildi/sure_doldu için kayıt kimliği; diğerlerinde null. */
  id: string | null;
  kaynak: DecisionSource | null;
  /** Bu çağrı yeni bir bekleyen kayıt (yeni pencere) açtı mı. */
  created: boolean;
}

export type RespondError = "bulunamadi" | "karar_verilmis" | "oturum_izni_verilemez";

export function newSessionState(id: string, projectDir: string, identity: Identity): WriteSessionState {
  return { id, projectDir, identity, mode: null, records: [], sessionGrants: [], teslimGrants: [] };
}

export function setMode(state: WriteSessionState, mode: WorkMode): boolean {
  if (state.mode !== null) return false;
  state.mode = mode;
  return true;
}

/** Yazmanın dokunduğu paketler. Nesnesiz araçlarda fact.paket (yoksa abapGit paketi). */
export function factPackages(fact: WriteFact): string[] {
  if (fact.nesneler.length > 0) return [...new Set(fact.nesneler.map((o) => o.paket))];
  return [fact.paket ?? fact.abapgit?.paket ?? ""];
}

export function canSession(mode: WorkMode | null, fact: WriteFact): boolean {
  if (mode !== "dogrudan") return false;
  if (fact.sinif !== "TRANSPORT_ONAYLI" || fact.arac === "axet_teslim") return false;
  const pk = factPackages(fact);
  if (pk.length !== 1 || !pk[0]) return false;
  // Transport'suz oturum izni yalnızca yerel ($TMP) pakette: orada transport kaydı yok.
  return fact.transport !== "" || pk[0] === "$TMP";
}

function sessionCovers(state: WriteSessionState, fact: WriteFact): boolean {
  if (!canSession(state.mode, fact)) return false;
  const paket = factPackages(fact)[0];
  return state.sessionGrants.some((g) => g.transport === fact.transport && g.paket === paket);
}

/** Onaylı bir teslim bu yazmayı kapsıyorsa teslim kaydının kimliği, yoksa null. */
export function teslimCovers(state: WriteSessionState, fact: WriteFact, now: number): string | null {
  for (const g of state.teslimGrants) {
    if (now - g.grantedAt >= TESLIM_TTL_MS) continue;
    const t = g.fact.teslim;
    if (!t) continue;
    if (t.yontem === "abapgit") {
      if (fact.arac !== "axet_abapgit_onay") continue;
      if (fact.transport && fact.transport !== g.fact.transport) continue;
      const zip = fact.abapgit?.zip_sha256;
      if (zip) {
        if (zip === t.zip_sha256) return g.recordId;
        continue;
      }
      const paket = fact.abapgit?.paket ?? "";
      if (paket && paket === (g.fact.paket ?? "")) return g.recordId;
      continue;
    }
    // ADT teslimi: listedeki nesneler, aynı transport, incelenen kaynağın alt kümesi.
    if (fact.arac === "axet_abapgit_onay" || fact.arac === "axet_teslim") continue;
    if (fact.sinif !== "TRANSPORT_ONAYLI" || fact.transport !== g.fact.transport) continue;
    if (fact.nesneler.length === 0) {
      if (fact.arac === "adt_set_transport") return g.recordId;
      continue;
    }
    const covered = fact.nesneler.every((o) => {
      const m = g.fact.nesneler.find((x) => x.ad === o.ad && x.tip === o.tip);
      if (!m || m.paket !== o.paket) return false;
      const allowed = new Set(m.kaynak_sha256 ?? []);
      return (o.kaynak_sha256 ?? []).every((h) => allowed.has(h));
    });
    if (covered) return g.recordId;
  }
  return null;
}

function ustOnayValid(state: WriteSessionState, fact: WriteFact, now: number): boolean {
  if (fact.arac !== "axet_abapgit_onay" || !fact.ust_onay) return false;
  const parent = state.records.find((r) => r.id === fact.ust_onay);
  if (!parent || parent.status !== "onaylandi" || parent.fact.arac !== "axet_abapgit_onay") return false;
  if (now - (parent.decidedAt ?? parent.createdAt) >= UST_ONAY_TTL_MS) return false;
  if (fact.transport && parent.fact.transport && fact.transport !== parent.fact.transport) return false;
  return true;
}

export function sweep(state: WriteSessionState, now: number): { expired: string[]; changed: boolean } {
  const expired: string[] = [];
  for (const r of state.records) {
    if (r.status === "bekliyor" && now - r.createdAt >= PENDING_TTL_MS) {
      r.status = "sure_doldu";
      r.decidedAt = now;
      expired.push(r.id);
    }
  }
  const recordCount = state.records.length;
  state.records = state.records.filter((r) => {
    if (r.status === "bekliyor") return true;
    const at = r.decidedAt ?? r.createdAt;
    return now - at < (r.status === "onaylandi" ? APPROVED_TTL_MS : STICKY_TTL_MS);
  });
  const grantCount = state.teslimGrants.length;
  state.teslimGrants = state.teslimGrants.filter((g) => now - g.grantedAt < TESLIM_TTL_MS);
  const changed =
    expired.length > 0 || state.records.length !== recordCount || state.teslimGrants.length !== grantCount;
  return { expired, changed };
}

function latestByHash(state: WriteSessionState, hash: string): ApprovalRecord | undefined {
  for (let i = state.records.length - 1; i >= 0; i--) {
    if (state.records[i].fact.arg_hash === hash) return state.records[i];
  }
  return undefined;
}

/** Pencere açmadan verilen izin de bir kayıt bırakır: /results ve üst onay zinciri kimliğe bağlanır. */
function grantRecord(
  state: WriteSessionState,
  fact: WriteFact,
  now: number,
  source: DecisionSource,
  newId: () => string,
): DecideResult {
  const id = newId();
  state.records.push({ id, fact, status: "onaylandi", createdAt: now, decidedAt: now, consumed: true, source });
  return { karar: "izinli", id, kaynak: source, created: false };
}

export function decide(
  state: WriteSessionState,
  fact: WriteFact,
  now: number,
  newId: () => string = randomUUID,
): DecideResult {
  sweep(state, now);
  if (state.mode === null) return { karar: "mod_secilmedi", id: null, kaynak: null, created: false };

  const same = latestByHash(state, fact.arg_hash);
  if (same) {
    if (same.status === "bekliyor") return { karar: "bekliyor", id: same.id, kaynak: null, created: false };
    if (same.status === "reddedildi" || same.status === "sure_doldu") {
      if (now - (same.decidedAt ?? same.createdAt) < STICKY_TTL_MS) {
        return { karar: same.status, id: same.id, kaynak: null, created: false };
      }
    }
    if (
      same.status === "onaylandi" &&
      same.source === "pencere" &&
      !same.consumed &&
      now - (same.decidedAt ?? same.createdAt) < APPROVED_TTL_MS
    ) {
      same.consumed = true;
      return { karar: "izinli", id: same.id, kaynak: "pencere", created: false };
    }
  }

  if (ustOnayValid(state, fact, now)) return grantRecord(state, fact, now, "ust_onay", newId);
  if (teslimCovers(state, fact, now)) return grantRecord(state, fact, now, "teslim_izni", newId);
  if (state.mode === "dogrudan" && sessionCovers(state, fact)) {
    return grantRecord(state, fact, now, "oturum_izni", newId);
  }
  if (state.mode === "yerel" && fact.sinif === "TRANSPORT_ONAYLI" && fact.arac !== "axet_teslim") {
    return { karar: "yerel_mod", id: null, kaynak: null, created: false };
  }

  const id = newId();
  state.records.push({ id, fact, status: "bekliyor", createdAt: now, decidedAt: null, consumed: false, source: "pencere" });
  return { karar: "bekliyor", id, kaynak: null, created: true };
}

export function respond(
  state: WriteSessionState,
  id: string,
  choice: Choice,
  now: number,
): { ok: boolean; error?: RespondError } {
  sweep(state, now);
  const r = state.records.find((x) => x.id === id);
  if (!r) return { ok: false, error: "bulunamadi" };
  if (r.status !== "bekliyor") return { ok: false, error: "karar_verilmis" };
  if (choice === "oturum" && !canSession(state.mode, r.fact)) return { ok: false, error: "oturum_izni_verilemez" };
  r.decidedAt = now;
  if (choice === "reddet") {
    r.status = "reddedildi";
    return { ok: true };
  }
  r.status = "onaylandi";
  if (choice === "oturum") {
    const paket = factPackages(r.fact)[0];
    if (!state.sessionGrants.some((g) => g.transport === r.fact.transport && g.paket === paket)) {
      state.sessionGrants.push({ transport: r.fact.transport, paket });
    }
  }
  if (r.fact.arac === "axet_teslim") state.teslimGrants.push({ recordId: r.id, fact: r.fact, grantedAt: now });
  return { ok: true };
}

const HASH_RE = /^[0-9a-f]{64}$/;
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function validObject(o: unknown): boolean {
  if (!isObj(o)) return false;
  if (!isStr(o.ad) || !o.ad || !isStr(o.tip) || !o.tip || !isStr(o.paket) || typeof o.yeni !== "boolean") return false;
  if (o.kaynak_sha256 !== undefined) {
    if (!Array.isArray(o.kaynak_sha256) || !o.kaynak_sha256.every((h) => isStr(h) && HASH_RE.test(h))) return false;
  }
  if (o.fark !== undefined && !isStr(o.fark)) return false;
  if (o.fark_kirpildi !== undefined && typeof o.fark_kirpildi !== "boolean") return false;
  if (o.kalite !== undefined) {
    const k = o.kalite;
    if (!isObj(k) || !isNum(k.kritik) || !isNum(k.yuksek) || !isNum(k.orta) || !isNum(k.dusuk)) return false;
  }
  return true;
}

/** Python tarafından gelen bilginin şekli. Tutmayan istek pencere açmaz, 400 döner. */
export function validateFact(x: unknown): x is WriteFact {
  if (!isObj(x)) return false;
  if (!isStr(x.arac) || !x.arac) return false;
  if (x.sinif !== "TRANSPORT_ONAYLI" && x.sinif !== "HER_SEFER") return false;
  if (!Array.isArray(x.nesneler) || !x.nesneler.every(validObject)) return false;
  if (x.paket !== undefined && !isStr(x.paket)) return false;
  if (!isStr(x.transport)) return false;
  if (x.transport_bilgi !== null) {
    const t = x.transport_bilgi;
    if (!isObj(t) || !isStr(t.aciklama) || !isStr(t.sahip) || !isStr(t.durum)) return false;
  }
  if (!isStr(x.arg_hash) || !HASH_RE.test(x.arg_hash)) return false;
  if (x.teslim !== undefined) {
    const t = x.teslim;
    if (!isObj(t) || !isStr(t.yontem) || (t.zip_sha256 !== undefined && !isStr(t.zip_sha256))) return false;
  }
  if (x.abapgit !== undefined) {
    const a = x.abapgit;
    if (!isObj(a) || !isStr(a.script) || !a.script) return false;
    if (a.zip_sha256 !== undefined && !isStr(a.zip_sha256)) return false;
    if (a.paket !== undefined && !isStr(a.paket)) return false;
  }
  if (x.ust_onay !== undefined && !isStr(x.ust_onay)) return false;
  return true;
}
