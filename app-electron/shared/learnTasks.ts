// Kendi kendine öğrenme (Bellek): kullanıcı bir ajana "şunu araştır, öğren"
// der; ajana yapılandırılmış bir öğrenme görevi istemi gider, ajan bulguları
// `ntt-team memory add|update --gorev <kimlik>` ile atomik notlara yazar.
// Saf mantık: istem, kapsam, durum makinesi, not sayımı, özet ayrıştırma,
// kalıcılık süzgeci. Gönderme ve izleme renderer'da (learnContext.tsx).
//
// SAP'ye dokunan araştırma YOK (QA/PRD salt okunur kuralları): istem bunu
// yasaklar, kapsamda SAP seçeneği hiç yok.
import type { AgentSendFailure } from "./agentMessage";
import type { AgentEngineId, AgentStatus } from "./agentTypes";
import type { MemoryNote } from "./memoryNotes";

export const LEARN_SCOPES = ["project", "web", "team"] as const;
export type LearnScope = (typeof LEARN_SCOPES)[number];
/** Notlar ekip belleğine mi, ajanın kendi belleğine mi (`--ben`). */
export type LearnTarget = "team" | "self";
export type LearnState = "waiting" | "running" | "done" | "error" | "timeout";
export type LearnFailure = AgentSendFailure | "agentError" | "agentClosed";

export const LEARN_TOPIC_MAX = 300;
/** Çalışan görevin süre sınırı: dolunca "zaman aşımı" (ajan takıldı, bölme kapandı, uygulama yeniden açıldı). */
export const LEARN_TIMEOUT_MS = 30 * 60_000;
/** Saklanan en çok görev (en yeni önce). */
export const LEARN_TASKS_MAX = 50;
const NOTE_IDS_MAX = 200;
const SUMMARY_MAX = 400;
const SUGGESTION_MAX = 120;
const SUGGESTIONS_MAX = 3;

export interface LearnTask {
  id: string;
  workspaceId: string;
  paneId: string;
  agentName: string;
  topic: string;
  scopes: LearnScope[];
  target: LearnTarget;
  state: LearnState;
  /** Bekleme ya da hata sebebi. */
  reason?: LearnFailure;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  /** Gönderimden sonra ajan meşgul görüldü mü (bitişi tanımak için). */
  sawBusy?: boolean;
  /** Gönderim anındaki notlar: kimlik → güncelleme anı (güncellenenleri saymak için). */
  baseline?: Record<string, number>;
  added: string[];
  updated: string[];
  summary?: string;
  suggestions?: string[];
  /** Kullanıcı görevin eklediği notları geri aldı (sildi). */
  undone?: boolean;
}

export interface LearnTaskInput {
  workspaceId: string;
  paneId: string;
  agentName: string;
  topic: string;
  scopes: readonly LearnScope[];
  target: LearnTarget;
}

const ID_RE = /^og-[a-z0-9]{4,16}$/;
export const isLearnTaskId = (value: unknown): value is string => typeof value === "string" && ID_RE.test(value);

export function newLearnTaskId(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 8; i += 1) out += Math.floor(rand() * 36).toString(36);
  return `og-${out}`;
}

export function cleanTopic(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // \s, U+2028/2029 satır ayırıcılarını da kapsıyor.
  const one = raw.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(one).slice(0, LEARN_TOPIC_MAX).join("").trim();
}

const isScope = (v: unknown): v is LearnScope => typeof v === "string" && (LEARN_SCOPES as readonly string[]).includes(v);

export function createLearnTask(input: LearnTaskInput, now: number, id: string): LearnTask | null {
  const topic = cleanTopic(input.topic);
  const scopes = LEARN_SCOPES.filter((s) => input.scopes.includes(s));
  if (!topic || scopes.length === 0 || !isLearnTaskId(id) || !input.paneId) return null;
  return {
    id,
    workspaceId: input.workspaceId,
    paneId: input.paneId,
    agentName: input.agentName,
    topic,
    scopes,
    target: input.target === "self" ? "self" : "team",
    state: "waiting",
    createdAt: now,
    added: [],
    updated: []
  };
}

/**
 * Motorun web aracı var mı (ölçüldü 2026-10-19): axet-code 1.4.1 araç listesinde
 * `fetch` ve `agentic_fetch`; Claude Code WebFetch/WebSearch; Gemini CLI
 * google_web_search/web_fetch. Codex'te web araması varsayılan kapalı, özel
 * komutun ne olduğu bilinmiyor: seçenek gizli.
 */
export function engineHasWeb(engine: AgentEngineId | undefined): boolean {
  return engine === "axet-code" || engine === "claude" || engine === "gemini";
}

const SCOPE_TEXT: Record<LearnScope, string> = {
  project: "proje klasörü (çalışma dizinindeki kod ve dokümanlar; yalnız oku)",
  web: "web (fetch ile herkese açık sayfalar; her bulguya URL'sini kaynak yaz)",
  team: "ekip belleği ve Akış geçmişi (ntt-team memory search/list, ntt-team feed)"
};

/** Konu istemin içinde: tırnak ve [[ ]] komut/bağlantı sözdizimini bozmasın. */
const quoteSafe = (text: string) => text.replace(/"/g, "'").replace(/\[/g, "(").replace(/\]/g, ")");

/** Ajana giden tek satırlık öğrenme görevi istemi (≤ AGENT_MESSAGE_MAX; mesaj kapısından geçer). */
export function learnPrompt(task: Pick<LearnTask, "id" | "topic" | "scopes" | "target">): string {
  const me = task.target === "self" ? " --ben" : "";
  const scopes = LEARN_SCOPES.filter((s) => task.scopes.includes(s));
  const parts = [
    `[Öğrenme görevi ${task.id}] Konu: "${quoteSafe(cleanTopic(task.topic))}".`,
    `Amaç: konuyu araştır, öğrendiklerini ${task.target === "self" ? "kendi belleğine" : "ekip belleğine"} yaz.`,
    `Kaynaklar: ${scopes.map((s) => SCOPE_TEXT[s]).join("; ")}.`,
    scopes.includes("web") ? "" : "Web'e çıkma.",
    "Yasaklar: SAP sistemlerine bağlanma, SAP/ADT/RFC/GUI araçlarını çağırma; dosya değiştirme, bir şeyi değiştiren komut çalıştırma; şifre, token, anahtar ve kişisel veri yazma.",
    "Adımlar: 1) Araştır, en önemli en çok 8 bulguyu seç.",
    "2) Her bulgu tek fikirlik kısa bir not; tür: olgu, ogrenim, karar ya da kisi (kişi/sistem).",
    `3) Yazmadan önce ntt-team memory search "<anahtar>" ile benzerini ara; varsa ntt-team memory update "<başlık>" "<ek>" --gorev ${task.id}, yoksa ntt-team memory add "<başlık>" "<gövde>" --tur <tür> --etiket <a,b> --gorev ${task.id}${me}.`,
    "4) Gövdede \"Kaynak: <dosya yolu ya da URL>\" olsun; ilgili notlara [[başlık]] ile bağla.",
    "5) Son cevabın yalnız şu tek satır olsun: OGRENME-OZET: <bir cümle> | SONRAKI: <konu 1>; <konu 2>"
  ];
  return parts.filter(Boolean).join(" ");
}

export type LearnEvent =
  | { type: "sent"; at: number; baseline: Record<string, number> }
  | { type: "sendFailed"; at: number; reason: AgentSendFailure }
  | { type: "status"; at: number; status: AgentStatus }
  | { type: "tick"; at: number }
  | { type: "retry" };

/** Ajan meşgulken/soru açıkken reddedilen istem kuyrukta bekler; ajan boşalınca yeniden denenir. */
export const LEARN_RETRY_REASONS: readonly AgentSendFailure[] = ["busy", "asking", "typing", "notSubmitted"];

export function stepLearnTask(task: LearnTask, event: LearnEvent): LearnTask {
  if (event.type === "sent") {
    if (task.state !== "waiting") return task;
    const { reason: _r, ...rest } = task;
    return { ...rest, state: "running", startedAt: event.at, sawBusy: false, baseline: event.baseline };
  }
  if (event.type === "sendFailed") {
    if (task.state !== "waiting") return task;
    if (LEARN_RETRY_REASONS.includes(event.reason)) return { ...task, reason: event.reason };
    return { ...task, state: "error", reason: event.reason, endedAt: event.at };
  }
  if (event.type === "retry") {
    if (task.state !== "timeout" && task.state !== "error") return task;
    const { reason: _r, startedAt: _s, endedAt: _e, sawBusy: _b, ...rest } = task;
    return { ...rest, state: "waiting" };
  }
  if (task.state !== "running") return task;
  if (event.type === "tick") {
    return event.at - (task.startedAt ?? event.at) >= LEARN_TIMEOUT_MS ? { ...task, state: "timeout", endedAt: event.at } : task;
  }
  const s = event.status;
  if (s.state === "running" || s.state === "asking") return task.sawBusy ? task : { ...task, sawBusy: true };
  if (s.state === "error") return { ...task, state: "error", reason: "agentError", endedAt: event.at };
  if (s.state === "finished") return { ...task, state: "error", reason: "agentClosed", endedAt: event.at };
  if (s.state === "idle" && (task.sawBusy || (s.lastActivity ?? 0) > (task.startedAt ?? Infinity))) {
    const { summary, suggestions } = parseLearnReply(s.reply);
    return { ...task, state: "done", endedAt: event.at, ...(summary ? { summary } : {}), suggestions };
  }
  return task;
}

/**
 * Görevin notları. Eklenen: göreve işaretli (`--gorev`) ya da görev penceresinde
 * bu ajanın yazdığı, tabanda olmayan not (ajan işareti unutsa da sayılsın).
 * Güncellenen: tabanda olup sonradan değişen.
 */
export function countLearnNotes(task: LearnTask, notes: readonly MemoryNote[]): { added: string[]; updated: string[] } {
  if (task.startedAt === undefined) return { added: [], updated: [] };
  const base = task.baseline ?? {};
  const end = task.state === "done" || task.state === "error" || task.state === "timeout" ? (task.endedAt ?? Infinity) + 5_000 : Infinity;
  const added: string[] = [];
  const updated: string[] = [];
  for (const n of notes) {
    if (n.id in base) {
      if (n.updated !== base[n.id] && n.updated >= task.startedAt && n.updated <= end) updated.push(n.id);
      continue;
    }
    const mine = n.source?.ref === task.id || (n.source?.type === "agent" && n.source.name === task.agentName);
    if (mine && n.created >= task.startedAt && n.created <= end) added.push(n.id);
  }
  return { added: added.slice(0, NOTE_IDS_MAX), updated: updated.slice(0, NOTE_IDS_MAX) };
}

const MARK_RE = /(?:OGRENME|ÖĞRENME)-(?:OZET|ÖZET)\s*:\s*([^\n]*)/i;
const NEXT_RE = /\|\s*(?:SONRAKI|SONRAKİ)\s*:\s*/i;

const clipText = (text: string, max: number) => {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : chars.join("");
};

/** Ajanın son cevabından özet ve "bunu da öğren" önerileri. */
export function parseLearnReply(reply: string | undefined): { summary?: string; suggestions: string[] } {
  const text = (reply ?? "").trim();
  if (!text) return { suggestions: [] };
  const mark = MARK_RE.exec(text);
  if (!mark) return { summary: clipText(text.replace(/\s+/g, " "), SUMMARY_MAX), suggestions: [] };
  const [head, tail = ""] = mark[1].split(NEXT_RE);
  const suggestions: string[] = [];
  for (const raw of tail.split(/[;]/)) {
    const s = cleanTopic(raw.replace(/…$/, ""));
    if (s && !suggestions.includes(s)) suggestions.push(clipText(s, SUGGESTION_MAX));
    if (suggestions.length >= SUGGESTIONS_MAX) break;
  }
  const summary = clipText(head, SUMMARY_MAX);
  return { ...(summary ? { summary } : {}), suggestions };
}

const STATES: readonly LearnState[] = ["waiting", "running", "done", "error", "timeout"];
const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** localStorage'dan gelen liste: bozuk kayıt atılır, en çok LEARN_TASKS_MAX. */
export function sanitizeLearnTasks(raw: unknown): LearnTask[] {
  if (!Array.isArray(raw)) return [];
  const out: LearnTask[] = [];
  for (const item of raw) {
    if (out.length >= LEARN_TASKS_MAX) break;
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (!isLearnTaskId(r.id) || typeof r.workspaceId !== "string" || typeof r.paneId !== "string") continue;
    if (!STATES.includes(r.state as LearnState) || typeof r.createdAt !== "number") continue;
    const topic = cleanTopic(r.topic);
    const scopes = strings(r.scopes, 3).filter(isScope);
    if (!topic || scopes.length === 0) continue;
    const task: LearnTask = {
      id: r.id,
      workspaceId: r.workspaceId,
      paneId: r.paneId,
      agentName: typeof r.agentName === "string" ? r.agentName.slice(0, 120) : "",
      topic,
      scopes,
      target: r.target === "self" ? "self" : "team",
      state: r.state as LearnState,
      createdAt: r.createdAt,
      added: strings(r.added, NOTE_IDS_MAX),
      updated: strings(r.updated, NOTE_IDS_MAX)
    };
    if (typeof r.reason === "string") task.reason = r.reason as LearnFailure;
    for (const k of ["startedAt", "endedAt"] as const) {
      const v = num(r[k]);
      if (v !== undefined) task[k] = v;
    }
    if (r.sawBusy === true) task.sawBusy = true;
    if (r.undone === true) task.undone = true;
    if (r.baseline && typeof r.baseline === "object") {
      const b: Record<string, number> = {};
      for (const [k, v] of Object.entries(r.baseline as Record<string, unknown>)) if (typeof v === "number") b[k] = v;
      task.baseline = b;
    }
    if (typeof r.summary === "string") task.summary = clipText(r.summary, SUMMARY_MAX);
    const sug = strings(r.suggestions, SUGGESTIONS_MAX).map(cleanTopic).filter(Boolean);
    if (sug.length) task.suggestions = sug;
    out.push(task);
  }
  return out;
}

/** Görev süresi (ms); bitmemişse şimdiye kadar. */
export const learnDuration = (task: LearnTask, now: number): number | null =>
  task.startedAt === undefined ? null : Math.max(0, (task.endedAt ?? now) - task.startedAt);
