// Akış olayları (spec 2026-10-18 ajanlar-yeniden §2). Yeni arka uç yok:
// olaylar mevcut kaynaklardan (ajan durumu, pano, Değişiklikler) iki anlık
// görüntünün farkı olarak türetiliyor. İlk görüş TABAN sayılıyor: uygulama
// açılırken ya da pano yüklenirken eski durumlar olay yağmuruna dönmesin.
// Tur 4: çalışma alanı başına en çok FLOW_MAX olay, en yeni sonda; ana süreçte
// kalıcı (flow-history), açılışta geri yükleniyor (mergeHistory).
import type { AgentState, AgentStatus } from "../../app-electron/shared/agentTypes";
import type { Board, SubtaskState } from "../../app-electron/shared/boardTypes";
import type { ChangesState } from "../../app-electron/shared/changesTypes";

import { FLOW_HISTORY_MAX, type FlowKind, type StoredFlowEvent } from "../../app-electron/shared/flowHistory";
import type { LeadAct } from "../../app-electron/shared/leadCommands";
import { flowErrorDetail } from "../../app-electron/shared/agentErrors";

export type { FlowKind };

/** Çalışma alanı başına (kalıcı kayıtla aynı sınır). */
export const FLOW_MAX = FLOW_HISTORY_MAX;

export interface FlowEvent {
  id: number;
  at: number;
  workspaceId: string;
  kind: FlowKind;
  paneId: string | null;
  /** Olay anındaki ajan adı (bölme sonradan kapansa da okunur kalsın). */
  name: string;
  /** Alt görev başlığı, kayıt etiketi ya da gönderilen mesaj. */
  detail: string;
  /**
   * "finished": ajanın son cevabının özeti (yalnız kesin kaynakta; ana süreçte
   * gizlisi süzülmüş, ≤ 2000 karakter, Tur 6; spec 2026-10-18 ajanlar-ux §3).
   */
  reply?: string;
  /** "started"/"finished": durum kesin kaynaktan mı (değilse tahmini; cevap terminalde). */
  exact?: boolean;
  /** Tur 6: "finished"/"error" kartı yerine geçtiği "started" kartının anı (tek kart). */
  startedAt?: number;
  /** Tur 7 ("relay"): lider kartı (açtı / görev / sonuç / kapattı / reddedildi). */
  act?: LeadAct;
  /** Tur 7 ("relay"): kartın hedef bölmesi (ofiste ışın). */
  toPaneId?: string;
  /** Tur 9 ("error"): otomatik deneme bekliyor; bildirim yok (canlı, kalıcı kayda yazılmaz). */
  retrying?: boolean;
  /** Tur 10 ("memory"): notun kimliği (geri al) ve güncelleme mi. */
  noteId?: string;
  updated?: boolean;
}

export type FlowInput = Omit<FlowEvent, "id">;

/**
 * KESİN kaynaktaki durum geçişi. Sorudan çalışmaya dönüş aynı görevin devamı
 * (Tur 6: yeni "başladı" kartı değil).
 */
export function statusTransition(prev: AgentState | undefined, next: AgentState): FlowKind | null {
  if (prev === undefined || prev === next) return null;
  if (next === "running") return prev === "asking" ? null : "started";
  if (next === "asking") return "asked";
  if (next === "error") return "error";
  if ((next === "idle" || next === "finished") && prev === "running") return "finished";
  return null;
}

/**
 * Durum farkından Akış olayları (Tur 6 kuralları):
 *   - Kesin kaynak: durum geçişleri (statusTransition).
 *   - Tahmini kaynak: durum ÇIKTI HAREKETİ (açılış ekranı, tuş yankısı, ekran
 *     yenilemesi de "çalışıyor" yapıyor; ölçüm Tur 6), olay üretmiyor. Yalnız
 *     okuyucunun "tur" kanıtı (gönderilen istem + ardından çıktı) "başladı",
 *     o turun sakinleşmesi "bitti"; ikisi de tahmini işaretli, tur başına bir kez.
 *   - Kesin bağ sebebi (`link`) değişince ya da tahmini tur başlarken "bilgi"
 *     olayı; aynı sebebi bir kez göstermek FlowProvider'ın işi.
 */
/** Tur 9: hata olayının alanları (sınıf/ayrıntı/deneme `detail`te; kalıcı şema değişmiyor). */
function errorFields(status: AgentStatus): Pick<FlowInput, "detail" | "exact" | "retrying"> {
  const e = status.error;
  return {
    detail: e ? flowErrorDetail({ cls: e.cls, attempts: status.attempts, max: status.maxAttempts, detail: e.detail }) : "",
    exact: e ? e.source === "exact" : status.source === "exact",
    ...(status.retry ? { retrying: true } : {})
  };
}

/** Tur 9: yeni bir hata mı (geçiş, ya da aynı durumda yeni an). */
function newError(before: AgentStatus, status: AgentStatus): boolean {
  if (!status.error || (status.state !== "error" && status.state !== "finished")) return false;
  return before.state !== status.state || !before.error || before.lastActivity !== status.lastActivity;
}

export function statusEvents(
  prev: Record<string, AgentStatus>,
  next: Record<string, AgentStatus>,
  panes: ReadonlyMap<string, { workspaceId: string; name: string }>,
  at: number
): FlowInput[] {
  const out: FlowInput[] = [];
  for (const [paneId, status] of Object.entries(next)) {
    const pane = panes.get(paneId);
    if (!pane) continue;
    const before = prev[paneId];
    if (!before) continue;
    const base = { at, workspaceId: pane.workspaceId, paneId, name: pane.name, detail: "" };
    const reply = status.reply ?? "";
    // Tur 9: hata (kesin kayıttan ya da terminalin son hata satırından; motor hata yazıp kapandıysa da).
    if (status.error && (status.state === "error" || status.state === "finished")) {
      if (newError(before, status)) out.push({ ...base, kind: "error", ...errorFields(status) });
      continue;
    }
    if (status.source === "exact") {
      // Tahmini turdan kesine geçiş: aynı görev, ikinci "başladı" yok.
      const kind = before.source === "estimated" && before.turn && status.state === "running" ? null : statusTransition(before.state, status.state);
      if (kind === "finished") out.push({ ...base, kind, exact: true, ...(reply ? { reply } : {}) });
      else if (kind === "started") out.push({ ...base, kind, exact: true });
      else if (kind) out.push({ ...base, kind });
      else if (status.state === "idle" && reply && before.reply !== reply) {
        // İki yoklama arasında biten kısa tur: "çalışıyor" hiç görülmedi ama yeni bir cevap var.
        out.push({ ...base, kind: "finished", exact: true, reply });
      }
      continue;
    }
    const turn = status.turn;
    const prevTurn = before.turn;
    const newTurn = turn !== undefined && turn.at !== prevTurn?.at;
    if (newTurn && !turn.done) out.push({ ...base, kind: "started", exact: false });
    // Tur 11: kesin kaynak yoksa cevap terminal ekranından (≈) okunmuş olabilir.
    if (turn?.done && !(prevTurn?.at === turn.at && prevTurn.done)) out.push({ ...base, kind: "finished", exact: false, ...(reply ? { reply } : {}) });
    if (status.link && (status.link !== before.link || (newTurn && !turn.done))) out.push({ ...base, kind: "note", detail: status.link });
  }
  return out;
}

const TURN_END: ReadonlySet<FlowKind> = new Set<FlowKind>(["finished", "error"]);
const TURN_KINDS: ReadonlySet<FlowKind> = new Set<FlowKind>(["started", "finished", "error"]);

/**
 * Tur 6: görev başına tek kart. Bitti/hata, aynı ajanın hâlâ açık "başladı"
 * kartının yerine geçiyor ve sona taşınıyor (cevap en altta görünsün).
 */
function foldTurns(list: FlowEvent[], inputs: readonly FlowInput[]): { list: FlowEvent[]; inputs: FlowInput[] } {
  let current = list;
  const out: FlowInput[] = [];
  for (const input of inputs) {
    if (!TURN_END.has(input.kind) || !input.paneId) {
      out.push(input);
      continue;
    }
    let open = -1;
    for (let i = current.length - 1; i >= 0; i--) {
      const e = current[i];
      if (e.workspaceId !== input.workspaceId || e.paneId !== input.paneId || !TURN_KINDS.has(e.kind)) continue;
      if (e.kind === "started") open = i;
      break;
    }
    if (open >= 0) {
      const startedAt = current[open].at;
      current = current.filter((_, i) => i !== open);
      out.push({ ...input, startedAt });
    } else {
      out.push(input);
    }
  }
  return { list: current, inputs: out };
}

const BOARD_KIND: Partial<Record<SubtaskState, FlowKind>> = { running: "assigned", done: "verified", failed: "failed" };

export function boardEvents(prev: Board | undefined, next: Board, nameOf: (paneId: string | null) => string, at: number): FlowInput[] {
  if (!prev) return [];
  const before = new Map<string, SubtaskState>();
  for (const task of prev.tasks) for (const s of task.subtasks) before.set(`${task.id}/${s.id}`, s.state);
  const out: FlowInput[] = [];
  for (const task of next.tasks) {
    for (const s of task.subtasks) {
      const was = before.get(`${task.id}/${s.id}`);
      if (was === s.state) continue;
      const kind = BOARD_KIND[s.state];
      if (!kind) continue;
      // Soru cevaplanınca iş yeniden "çalışıyor"a döner: bu yeni bir atama değil.
      if (kind === "assigned" && (was === "asking" || was === "verifying")) continue;
      out.push({ at, workspaceId: next.workspaceId, kind, paneId: s.paneId, name: nameOf(s.paneId), detail: s.title });
    }
  }
  return out;
}

/**
 * Değişiklikler kaydı. İlk görülen durumda (önceki yok) yalnız `since`'ten
 * (oturum açılışı) sonra yazılmış kayıtlar olay: ana süreç durumu ancak
 * değişince yayınlıyor, taban için ayrıca git çalıştırılmıyor.
 */
export function checkpointEvents(prev: ChangesState | undefined, next: ChangesState, at: number, since = Infinity): FlowInput[] {
  const seen = new Set(prev?.checkpoints.map((c) => c.id) ?? []);
  return next.checkpoints
    .filter((c) => !seen.has(c.id) && (prev !== undefined || c.createdAt >= since))
    .map((c) => ({ at, workspaceId: next.workspaceId, kind: "checkpoint" as const, paneId: c.paneId, name: c.agentName ?? "", detail: c.label }));
}

/** Alan başına en yeni FLOW_MAX olay kalır; sıra korunur. */
function capPerWorkspace(list: FlowEvent[]): FlowEvent[] {
  const counts = new Map<string, number>();
  const keep: boolean[] = new Array(list.length);
  for (let i = list.length - 1; i >= 0; i--) {
    const n = (counts.get(list[i].workspaceId) ?? 0) + 1;
    counts.set(list[i].workspaceId, n);
    keep[i] = n <= FLOW_MAX;
  }
  return keep.every(Boolean) ? list : list.filter((_, i) => keep[i]);
}

export function appendFlow(list: readonly FlowEvent[], inputs: readonly FlowInput[]): FlowEvent[] {
  if (inputs.length === 0) return list as FlowEvent[];
  let id = list.length ? list[list.length - 1].id : 0;
  const folded = foldTurns(list as FlowEvent[], inputs);
  return capPerWorkspace([...folded.list, ...folded.inputs.map((e) => ({ ...e, id: ++id }))]);
}

/**
 * Diskten gelen geçmiş, bu oturumda o alana düşmüş olaylardan ÖNCE yerleşiyor
 * (zamana göre); kimlikler baştan veriliyor (yalnız anahtar).
 */
export function mergeHistory(list: readonly FlowEvent[], workspaceId: string, stored: readonly StoredFlowEvent[]): FlowEvent[] {
  if (stored.length === 0) return list as FlowEvent[];
  const history: FlowInput[] = stored.map((e) => ({ ...e, workspaceId }));
  const merged = [...history, ...list].map((e) => e as FlowInput).sort((a, b) => a.at - b.at);
  return capPerWorkspace(merged.map((e, i) => ({ ...e, id: i + 1 })));
}

/** Kalıcı kayda giden biçim (alan alanı dosya adında). */
export function toStored(list: readonly FlowEvent[], workspaceId: string): StoredFlowEvent[] {
  return list
    .filter((e) => e.workspaceId === workspaceId)
    .map((e) => ({
      at: e.at,
      kind: e.kind,
      paneId: e.paneId,
      name: e.name,
      detail: e.detail,
      ...(e.reply ? { reply: e.reply } : {}),
      ...(typeof e.exact === "boolean" ? { exact: e.exact } : {}),
      ...(e.act ? { act: e.act } : {}),
      ...(e.toPaneId ? { toPaneId: e.toPaneId } : {}),
      ...(e.noteId ? { noteId: e.noteId } : {}),
      ...(e.updated ? { updated: true } : {})
    }));
}
