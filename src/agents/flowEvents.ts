// Akış olayları (spec 2026-10-18 ajanlar-yeniden §2). Yeni arka uç yok:
// olaylar mevcut kaynaklardan (ajan durumu, pano, Değişiklikler) iki anlık
// görüntünün farkı olarak türetiliyor. İlk görüş TABAN sayılıyor: uygulama
// açılırken ya da pano yüklenirken eski durumlar olay yağmuruna dönmesin.
// Bellek içi, oturumluk; en çok FLOW_MAX olay, en yeni sonda.
import type { AgentState, AgentStatus } from "../../app-electron/shared/agentTypes";
import type { Board, SubtaskState } from "../../app-electron/shared/boardTypes";
import type { ChangesState } from "../../app-electron/shared/changesTypes";

export const FLOW_MAX = 200;

export type FlowKind = "started" | "finished" | "error" | "asked" | "assigned" | "verified" | "failed" | "checkpoint" | "message";

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
   * gizlisi süzülmüş, ≤ 600 karakter; spec 2026-10-18 ajanlar-ux §3).
   */
  reply?: string;
  /** "finished": durum kesin kaynaktan mı (değilse cevap terminalde). */
  exact?: boolean;
}

export type FlowInput = Omit<FlowEvent, "id">;

export function statusTransition(prev: AgentState | undefined, next: AgentState): FlowKind | null {
  if (prev === undefined || prev === next) return null;
  if (next === "running") return "started";
  if (next === "asking") return "asked";
  if (next === "error") return "error";
  if ((next === "idle" || next === "finished") && prev === "running") return "finished";
  return null;
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
    const kind = statusTransition(before?.state, status.state);
    const reply = status.reply ?? "";
    if (kind === "finished") {
      out.push({ at, workspaceId: pane.workspaceId, kind, paneId, name: pane.name, detail: "", exact: status.source === "exact", ...(reply ? { reply } : {}) });
    } else if (kind) {
      out.push({ at, workspaceId: pane.workspaceId, kind, paneId, name: pane.name, detail: "" });
    } else if (before && status.state === "idle" && reply && before.reply !== reply) {
      // İki yoklama arasında biten kısa tur: "çalışıyor" hiç görülmedi ama yeni bir cevap var.
      out.push({ at, workspaceId: pane.workspaceId, kind: "finished", paneId, name: pane.name, detail: "", exact: true, reply });
    }
  }
  return out;
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

export function appendFlow(list: readonly FlowEvent[], inputs: readonly FlowInput[]): FlowEvent[] {
  if (inputs.length === 0) return list as FlowEvent[];
  let id = list.length ? list[list.length - 1].id : 0;
  const next = [...list, ...inputs.map((e) => ({ ...e, id: ++id }))];
  return next.length > FLOW_MAX ? next.slice(next.length - FLOW_MAX) : next;
}
