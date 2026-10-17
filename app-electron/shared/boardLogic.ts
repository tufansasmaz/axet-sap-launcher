// Görev panosunun SAF durum geçişleri (spec 2026-10-18 gorev-panosu §2,
// §4–§7). Electron'a, diske, saate dokunmuyor: zaman parametre. Ajanın
// "bitti" demesi hiçbir kartı kapatmıyor; kart yalnız kanıtla (applyProof)
// done oluyor. Tahmini durumdan kendiliğinden geçiş yok.
import type { AgentStatus } from "./agentTypes";
import type { BoardTask, Proof, Subtask, SubtaskNote, SubtaskState, TaskState } from "./boardTypes";

const ACTIVE: ReadonlySet<SubtaskState> = new Set<SubtaskState>(["running", "asking", "verifying"]);

export function isActiveSubtask(s: Subtask): boolean {
  return ACTIVE.has(s.state);
}

export function deriveTaskState(task: BoardTask): TaskState {
  if (task.approvedAt === undefined) {
    if (task.leadError) return "stuck";
    return task.subtasks.length > 0 ? "awaitingApproval" : "draft";
  }
  const subs = task.subtasks;
  if (subs.length > 0 && subs.every((s) => s.state === "done")) return "done";
  if (subs.some((s) => s.state === "failed")) return "stuck";
  return "running";
}

export function withDerivedState(task: BoardTask): BoardTask {
  const state = deriveTaskState(task);
  return state === task.state ? task : { ...task, state };
}

/** Bağımlılık grafiği geçerli mi: kimlikler tekil, bağımlılık var ve kendisi değil, döngü yok. */
export function graphError(subtasks: readonly Pick<Subtask, "id" | "dependsOn">[]): "badDependency" | "cycle" | null {
  const ids = new Set(subtasks.map((s) => s.id));
  if (ids.size !== subtasks.length) return "badDependency";
  for (const s of subtasks) {
    for (const dep of s.dependsOn) if (dep === s.id || !ids.has(dep)) return "badDependency";
  }
  const byId = new Map(subtasks.map((s) => [s.id, s]));
  // 1: yolda, 2: bitti. En fazla 8 düğüm: özyineleme güvenli.
  const mark = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    const m = mark.get(id);
    if (m === 1) return true;
    if (m === 2) return false;
    mark.set(id, 1);
    for (const dep of byId.get(id)?.dependsOn ?? []) if (visit(dep)) return true;
    mark.set(id, 2);
    return false;
  };
  for (const s of subtasks) if (visit(s.id)) return "cycle";
  return null;
}

/** Onayla (spec §4): bağımlılığı olmayanlar ready, ötekiler waiting. Onaylanamıyorsa null. */
export function approveTask(task: BoardTask, now: number): BoardTask | null {
  if (task.approvedAt !== undefined || task.planning || task.subtasks.length === 0) return null;
  if (task.subtasks.some((s) => !s.title.trim() || !s.prompt.trim())) return null;
  if (graphError(task.subtasks)) return null;
  const next: BoardTask = {
    ...task,
    approvedAt: now,
    subtasks: task.subtasks.map((s) => ({ ...s, state: (s.dependsOn.length === 0 ? "ready" : "waiting") as SubtaskState }))
  };
  delete next.leadError;
  delete next.leadDetail;
  delete next.leadRaw;
  delete next.leadChangedFiles;
  return withDerivedState(next);
}

/** Bağımlılıklarının hepsi done olan waiting → ready; failed bağımlılık waiting bırakır (spec §5). */
export function advanceDependencies(task: BoardTask): BoardTask {
  if (task.approvedAt === undefined) return task;
  const done = new Set(task.subtasks.filter((s) => s.state === "done").map((s) => s.id));
  let changed = false;
  const subtasks = task.subtasks.map((s) => {
    if (s.state !== "waiting" || !s.dependsOn.every((dep) => done.has(dep))) return s;
    changed = true;
    return { ...s, state: "ready" as const };
  });
  return changed ? withDerivedState({ ...task, subtasks }) : task;
}

/** İstem yazıldı: running, ajan, deneme sayısı, gönderim anı. */
export function assignSubtask(sub: Subtask, paneId: string, now: number): Subtask {
  const next: Subtask = { ...sub, state: "running", paneId, attempts: sub.attempts + 1, dispatchedAt: now, sawBusy: false };
  delete next.held;
  delete next.note;
  return next;
}

function releaseToQueue(s: Subtask, note: SubtaskNote): Subtask {
  return { ...s, state: "ready", paneId: null, held: true, note, sawBusy: false };
}

function applyOne(s: Subtask, agents: ReadonlyMap<string, AgentStatus | null>): Subtask {
  if ((s.state !== "running" && s.state !== "asking") || !s.paneId) return s;
  if (!agents.has(s.paneId)) return releaseToQueue(s, "agentClosed");
  const status = agents.get(s.paneId) ?? null;
  if (!status) return s;
  // `finished` iki okuyucuda da "kabuk istemi geri döndü": motor çıktı (spec §7).
  if (status.state === "finished") return releaseToQueue(s, "agentClosed");
  if (status.state === "asking") return s.state === "asking" && s.sawBusy ? s : { ...s, state: "asking", sawBusy: true };
  if (status.state === "running") return s.state === "running" && s.sawBusy ? s : { ...s, state: "running", sawBusy: true };
  // Tahmini durumdan kendiliğinden geçiş yok (spec §6): kullanıcı "Doğrula"ya basar.
  if (status.source !== "exact") return s;
  if (status.state !== "idle" && status.state !== "error") return s;
  const afterDispatch = status.lastActivity !== null && s.dispatchedAt !== undefined && status.lastActivity > s.dispatchedAt;
  if (s.sawBusy !== true && !afterDispatch) return s;
  const next: Subtask = { ...s, state: "verifying" };
  if (status.state === "error") next.note = "agentError";
  else delete next.note;
  return next;
}

/** Atanmış alt görevlere ajanların durumunu uygular (spec §6, §7). */
export function applyAgentStatuses(
  task: BoardTask,
  agents: ReadonlyMap<string, AgentStatus | null>
): { task: BoardTask; toVerify: string[] } {
  if (task.approvedAt === undefined) return { task, toVerify: [] };
  const toVerify: string[] = [];
  let changed = false;
  const subtasks = task.subtasks.map((s) => {
    const next = applyOne(s, agents);
    if (next !== s) changed = true;
    if (next.state === "verifying" && s.state !== "verifying") toVerify.push(s.id);
    return next;
  });
  return { task: changed ? withDerivedState({ ...task, subtasks }) : task, toVerify };
}

/** Doğrulama sonucu. verifying olmayan alt göreve yazılmaz: sonuç geç gelmiş olabilir. */
export function applyProof(sub: Subtask, proof: Proof): Subtask {
  if (sub.state !== "verifying") return sub;
  const next: Subtask = { ...sub, state: proof.ok ? "done" : "failed", proof };
  if (!proof.ok && proof.commands.some((c) => c.timedOut)) next.note = "timeout";
  else delete next.note;
  return next;
}

export function manualProof(now: number): Proof {
  return { kind: "manual", commands: [], ok: true, at: now };
}

/** "Yeniden sıraya al": held ready ya da failed → ajansız ready. */
export function requeueSubtask(sub: Subtask): Subtask | null {
  if (!((sub.state === "ready" && sub.held) || sub.state === "failed")) return null;
  const next: Subtask = { ...sub, state: "ready", paneId: null, sawBusy: false };
  delete next.held;
  delete next.note;
  return next;
}

/** Uygulama yeniden açıldı (spec §7): yarıda kalanlar ready + held; kendiliğinden gönderme yok. */
export function restoreAfterRestart(task: BoardTask): BoardTask {
  const next: BoardTask = {
    ...task,
    subtasks: task.subtasks.map((s) => (isActiveSubtask(s) ? releaseToQueue(s, "restarted") : s))
  };
  delete next.planning;
  return withDerivedState(next);
}

/** Tek alt görevi değiştirir; bulunamazsa ya da `fn` null dönerse null. */
export function mapSubtask(task: BoardTask, subtaskId: string, fn: (s: Subtask) => Subtask | null): BoardTask | null {
  const index = task.subtasks.findIndex((s) => s.id === subtaskId);
  if (index < 0) return null;
  const next = fn(task.subtasks[index]);
  if (!next) return null;
  const subtasks = [...task.subtasks];
  subtasks[index] = next;
  return withDerivedState({ ...task, subtasks });
}
