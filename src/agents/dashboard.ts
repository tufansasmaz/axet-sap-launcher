// Pano grafiklerinin SAF hesapları (2026-10-19). Yeni arka uç verisi yok:
// zaman serileri kalıcı Akış geçmişinden (Tur 4, alan başına en çok 500 olay),
// görev dağılımı panodan, değişiklik özeti Değişiklikler kaydından türetiliyor.
// Geçmiş 500 olayla sınırlı: 7 günlük görünümün başı boş kalabilir — ekran
// bunu "en eski olay" notuyla söylüyor, uydurmuyor.
import type { AgentStatus } from "../../app-electron/shared/agentTypes";
import { SUBTASK_STATES, type Board, type SubtaskState } from "../../app-electron/shared/boardTypes";
import type { Checkpoint, FileChange } from "../../app-electron/shared/changesTypes";
import type { TerminalPane } from "../stores/terminalTypes";
import type { FlowEvent, FlowKind } from "./flowEvents";

export type RangeKey = "1h" | "24h" | "7d";
export const RANGE_KEYS: readonly RangeKey[] = ["1h", "24h", "7d"];

export interface RangeSpec {
  key: RangeKey;
  from: number;
  /** Hariç. */
  to: number;
  bucketMs: number;
  /** Kova başlangıçları (yerel saate hizalı), eskiden yeniye. */
  starts: number[];
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Seçilen aralığın kovaları; son kova şimdiyi içeriyor. */
export function rangeSpec(key: RangeKey, now: number): RangeSpec {
  if (key === "7d") {
    const starts: number[] = [];
    const today = new Date(startOfToday(now));
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      starts.push(d.getTime());
    }
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { key, from: starts[0], to: end.getTime(), bucketMs: DAY, starts };
  }
  const bucketMs = key === "1h" ? 5 * MIN : HOUR;
  const count = key === "1h" ? 12 : 24;
  const d = new Date(now);
  if (key === "1h") d.setMinutes(d.getMinutes() - (d.getMinutes() % 5), 0, 0);
  else d.setMinutes(0, 0, 0);
  const to = d.getTime() + bucketMs;
  const from = to - count * bucketMs;
  return { key, from, to, bucketMs, starts: Array.from({ length: count }, (_, i) => from + i * bucketMs) };
}

/** Anın kovası; aralık dışıysa -1 (günlük kovalar yaz saatinde 23/25 saat olabilir). */
export function bucketIndex(range: RangeSpec, at: number): number {
  if (at < range.from || at >= range.to) return -1;
  for (let i = range.starts.length - 1; i >= 0; i--) if (at >= range.starts[i]) return i;
  return -1;
}

const bucketEnd = (range: RangeSpec, i: number) => (i + 1 < range.starts.length ? range.starts[i + 1] : range.to);

// ── Olay yoğunluğu ─────────────────────────────────────────────────────────

/** Yığılmış sütundaki gruplar; sıra renk sırası (kategorik slot 1→5). */
export type EventGroup = "work" | "change" | "done" | "asked" | "problem";
export const EVENT_GROUPS: readonly EventGroup[] = ["work", "change", "done", "asked", "problem"];

const GROUP: Record<FlowKind, EventGroup> = {
  started: "work",
  assigned: "work",
  message: "work",
  relay: "work",
  checkpoint: "change",
  finished: "done",
  verified: "done",
  asked: "asked",
  error: "problem",
  failed: "problem"
};

export function groupOf(kind: FlowKind): EventGroup {
  return GROUP[kind];
}

export interface HistogramBucket {
  start: number;
  end: number;
  counts: Record<EventGroup, number>;
  total: number;
}

const zeroCounts = (): Record<EventGroup, number> => ({ work: 0, change: 0, done: 0, asked: 0, problem: 0 });

export function eventHistogram(events: readonly FlowEvent[], range: RangeSpec): HistogramBucket[] {
  const out = range.starts.map((start, i) => ({ start, end: bucketEnd(range, i), counts: zeroCounts(), total: 0 }));
  for (const e of events) {
    const i = bucketIndex(range, e.at);
    if (i < 0) continue;
    out[i].counts[GROUP[e.kind]] += 1;
    out[i].total += 1;
  }
  return out;
}

export function seriesPerBucket<T extends { at: number }>(items: readonly T[], range: RangeSpec, keep: (item: T) => boolean = () => true): number[] {
  const out = range.starts.map(() => 0);
  for (const item of items) {
    if (!keep(item)) continue;
    const i = bucketIndex(range, item.at);
    if (i >= 0) out[i] += 1;
  }
  return out;
}

// ── Ajan durum şeritleri ───────────────────────────────────────────────────

export type LaneState = "running" | "asking" | "idle" | "error";
export const LANE_STATES: readonly LaneState[] = ["running", "asking", "error", "idle"];

const LANE: Partial<Record<FlowKind, LaneState>> = { started: "running", asked: "asking", finished: "idle", error: "error" };

export interface Segment {
  state: LaneState;
  start: number;
  end: number;
}

export interface Lane {
  /** Bölme kimliği (yoksa ad). */
  key: string;
  name: string;
  segments: Segment[];
}

/**
 * Ajan başına durum aralıkları. Aralıktan önceki son durum başa taşınıyor;
 * son aralık şimdiye (ya da aralık sonuna) kadar sürüyor. Durum olayı
 * olmayan ajan şeritte yer almıyor.
 */
export function timelines(events: readonly FlowEvent[], range: Pick<RangeSpec, "from" | "to">, now: number): Lane[] {
  const byKey = new Map<string, FlowEvent[]>();
  for (const e of events) {
    if (!LANE[e.kind]) continue;
    const key = e.paneId ?? e.name;
    const list = byKey.get(key);
    if (list) list.push(e);
    else byKey.set(key, [e]);
  }
  const stop = Math.min(now, range.to);
  const lanes: Lane[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => a.at - b.at);
    const segments: Segment[] = [];
    let current = null as { state: LaneState; start: number } | null;
    const close = (end: number) => {
      if (!current) return;
      const start = Math.max(current.start, range.from);
      if (end > start) {
        const last = segments.at(-1);
        if (last && last.state === current.state && last.end === start) last.end = end;
        else segments.push({ state: current.state, start, end });
      }
    };
    for (const e of list) {
      if (e.at >= stop) break;
      const state = LANE[e.kind]!;
      if (current?.state === state) continue;
      close(e.at);
      current = { state, start: e.at };
    }
    close(stop);
    if (segments.length > 0) lanes.push({ key, name: list.at(-1)!.name, segments });
  }
  return lanes;
}

/** Kova başına, o kovada en az bir an verilen durum(lar)da olan ajan sayısı. */
export function occupancy(lanes: readonly Lane[], range: RangeSpec, states: LaneState | readonly LaneState[]): number[] {
  const wanted = new Set(typeof states === "string" ? [states] : states);
  return range.starts.map((start, i) => {
    const end = bucketEnd(range, i);
    return lanes.filter((lane) => lane.segments.some((s) => wanted.has(s.state) && s.start < end && s.end > start)).length;
  });
}

// ── Görevler ───────────────────────────────────────────────────────────────

export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/** Onaylanmış görevlerin alt görev dağılımı (taslaklar plan, iş değil). */
export function subtaskFunnel(board: Board | null | undefined): { state: SubtaskState; count: number }[] {
  const counts = new Map<SubtaskState, number>(SUBTASK_STATES.map((s) => [s, 0]));
  for (const task of board?.tasks ?? []) {
    if (task.state === "draft") continue;
    for (const s of task.subtasks) counts.set(s.state, (counts.get(s.state) ?? 0) + 1);
  }
  return SUBTASK_STATES.map((state) => ({ state, count: counts.get(state) ?? 0 }));
}

/** Komutlu kanıtların başarı oranı; elle onay ayrı sayılıyor (yeşil onay sayılmaz). */
export function verifyRate(board: Board | null | undefined): { passed: number; failed: number; manual: number; rate: number | null } {
  let passed = 0;
  let failed = 0;
  let manual = 0;
  for (const task of board?.tasks ?? []) {
    for (const s of task.subtasks) {
      if (!s.proof) continue;
      if (s.proof.kind === "manual") manual += 1;
      else if (s.proof.ok) passed += 1;
      else failed += 1;
    }
  }
  return { passed, failed, manual, rate: ratio(passed, passed + failed) };
}

// ── Değişiklikler ──────────────────────────────────────────────────────────

export interface ChangeSummary {
  checkpoints: number;
  files: number;
  added: number;
  deleted: number;
  pending: number;
  accepted: number;
  reverted: number;
  /** Aralığı henüz kapanmamış (istatistiği yok) kayıtlar. */
  withoutStats: number;
}

export function changeSummary(checkpoints: readonly Checkpoint[], expired: readonly string[], from: number, to: number): ChangeSummary {
  const gone = new Set(expired);
  const out: ChangeSummary = { checkpoints: 0, files: 0, added: 0, deleted: 0, pending: 0, accepted: 0, reverted: 0, withoutStats: 0 };
  for (const c of checkpoints) {
    if (gone.has(c.id) || c.createdAt < from || c.createdAt >= to) continue;
    out.checkpoints += 1;
    out[c.reviewed] += 1;
    if (!c.stats) {
      out.withoutStats += 1;
      continue;
    }
    out.files += c.stats.files;
    out.added += c.stats.added;
    out.deleted += c.stats.deleted;
  }
  return out;
}

export interface FileTotal {
  path: string;
  added: number;
  deleted: number;
  /** Kaç kayıtta değişti. */
  times: number;
}

export function topFiles(lists: readonly (readonly FileChange[])[], limit: number): FileTotal[] {
  const map = new Map<string, FileTotal>();
  for (const list of lists) {
    for (const f of list) {
      const row = map.get(f.path) ?? { path: f.path, added: 0, deleted: 0, times: 0 };
      row.added += f.added;
      row.deleted += f.deleted;
      row.times += 1;
      map.set(f.path, row);
    }
  }
  return [...map.values()].sort((a, b) => b.added + b.deleted - (a.added + a.deleted) || a.path.localeCompare(b.path)).slice(0, limit);
}

// ── Ajan tablosu ───────────────────────────────────────────────────────────

export interface AgentRow {
  pane: TerminalPane;
  /** Bölme çalışmıyorsa onun hâli; çalışıyorsa izleyicinin durumu. */
  state: LaneState | "stopped";
  lastAt: number | null;
  /** Aralıkta "işini bitirdi" olayları. */
  finished: number;
  /** Panoda bu ajana atanmış, biten alt görevler (tüm zamanlar). */
  subtasksDone: number;
  /** Aralıkta sorduğu sorular. */
  asked: number;
}

export function agentRows(
  panes: readonly TerminalPane[],
  statuses: Record<string, AgentStatus>,
  events: readonly FlowEvent[],
  board: Board | null | undefined,
  range: Pick<RangeSpec, "from" | "to">
): AgentRow[] {
  return panes.map((pane) => {
    const run = pane.run.state;
    const status = statuses[pane.id];
    let state: AgentRow["state"];
    if (run === "failed" || run === "missingDir" || status?.state === "error") state = "error";
    else if (run !== "running") state = "stopped";
    else if (status?.state === "running") state = "running";
    else if (status?.state === "asking") state = "asking";
    else state = "idle";
    let lastAt = status?.lastActivity ?? null;
    let finished = 0;
    let asked = 0;
    for (const e of events) {
      if (e.paneId !== pane.id) continue;
      if (lastAt === null || e.at > lastAt) lastAt = e.at;
      if (e.at < range.from || e.at >= range.to) continue;
      if (e.kind === "finished") finished += 1;
      else if (e.kind === "asked") asked += 1;
    }
    let subtasksDone = 0;
    for (const task of board?.tasks ?? []) for (const s of task.subtasks) if (s.paneId === pane.id && s.state === "done") subtasksDone += 1;
    return { pane, state, lastAt, finished, subtasksDone, asked };
  });
}
