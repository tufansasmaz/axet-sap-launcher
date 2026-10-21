// Tur 13: lider görevlerinin diskteki kaydı — userData/lead-tasks/<ekip>.json.
// Ekip başına küçük dosya; yazım atomik (writeTextAtomic), metinler gizli
// süzgeçten geçiyor, sınırlı (ekip başına LEAD_TASKS_PER_TEAM görev, alan
// başına kırpma). Bozuk dosya/öğe sessizce atlanıyor; hiçbir yol fırlatmıyor.
// Uygulama açılışında teamLead bitmemiş görevleri "yeniden başladı" diye düşürüyor.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { isLeadTaskId } from "../shared/leadCommands";
import { isAgentErrorClass } from "../shared/agentErrors";
import { scrubFlowText } from "./flowHistoryStore";
import { writeTextAtomic } from "./memoryNotesStore";
import type { LeadTask, LeadTaskState } from "./teamLead";

export const LEAD_TASKS_PER_TEAM = 100;
const FILE_MAX = 512 * 1024;
const TEXT_MAX = 2_000;
const RESULT_MAX = 4_000;
const NAME_MAX = 80;
const STATES: readonly LeadTaskState[] = ["queued", "sending", "sent", "done", "failed"];
const PANE_REF = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;

const str = (v: unknown, max: number): string | undefined => (typeof v === "string" ? scrubFlowText(v).slice(0, max) : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Diskten gelen öğe → görev ya da null (dosya elle düzenlenebilir). */
export function readLeadTask(raw: unknown, workspaceId: string): LeadTask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isLeadTaskId(r.id) || !STATES.includes(r.state as LeadTaskState)) return null;
  if (typeof r.leaderPaneId !== "string" || !PANE_REF.test(r.leaderPaneId)) return null;
  if (typeof r.targetPaneId !== "string" || !PANE_REF.test(r.targetPaneId)) return null;
  const text = str(r.text, TEXT_MAX);
  if (!text) return null;
  const task: LeadTask = {
    id: r.id,
    workspaceId,
    leaderPaneId: r.leaderPaneId,
    leaderName: str(r.leaderName, NAME_MAX) ?? "",
    targetPaneId: r.targetPaneId,
    targetName: str(r.targetName, NAME_MAX) ?? "",
    text,
    state: r.state as LeadTaskState,
    createdAt: num(r.createdAt) ?? 0
  };
  const sentAt = num(r.sentAt);
  if (sentAt !== undefined) task.sentAt = sentAt;
  const result = str(r.result, RESULT_MAX);
  if (result) task.result = result;
  const note = str(r.note, TEXT_MAX);
  if (note) task.note = note;
  if (r.matched === true) task.matched = true;
  if (r.restarted === true) task.restarted = true;
  if (isAgentErrorClass(r.errorClass)) task.errorClass = r.errorClass;
  if (isLeadTaskId(r.reassignOf)) task.reassignOf = r.reassignOf;
  if (isLeadTaskId(r.reassignedTo)) task.reassignedTo = r.reassignedTo;
  const reassigns = num(r.reassigns);
  if (reassigns !== undefined) task.reassigns = reassigns;
  return task;
}

/** Diske giden alt küme: bitmemişler önce korunur, sonra en yeniler. */
export function persistableTasks(tasks: readonly LeadTask[]): Record<string, unknown>[] {
  const open = tasks.filter((t) => t.state !== "done" && t.state !== "failed");
  const closed = tasks.filter((t) => t.state === "done" || t.state === "failed").sort((a, b) => b.createdAt - a.createdAt);
  const keep = [...open, ...closed].slice(0, LEAD_TASKS_PER_TEAM).sort((a, b) => a.createdAt - b.createdAt);
  return keep.map((t) => ({
    id: t.id,
    leaderPaneId: t.leaderPaneId,
    leaderName: str(t.leaderName, NAME_MAX),
    targetPaneId: t.targetPaneId,
    targetName: str(t.targetName, NAME_MAX),
    text: str(t.text, TEXT_MAX),
    state: t.state,
    createdAt: t.createdAt,
    ...(t.sentAt !== undefined ? { sentAt: t.sentAt } : {}),
    ...(t.result ? { result: str(t.result, RESULT_MAX) } : {}),
    ...(t.note ? { note: str(t.note, TEXT_MAX) } : {}),
    ...(t.matched ? { matched: true } : {}),
    ...(t.restarted ? { restarted: true } : {}),
    ...(t.errorClass ? { errorClass: t.errorClass } : {}),
    ...(t.reassignOf ? { reassignOf: t.reassignOf } : {}),
    ...(t.reassignedTo ? { reassignedTo: t.reassignedTo } : {}),
    ...(t.reassigns ? { reassigns: t.reassigns } : {})
  }));
}

export interface LeadTaskStore {
  load(): LeadTask[];
  save(workspaceId: string, tasks: readonly LeadTask[]): void;
}

export function createLeadTaskStore(dir: () => string): LeadTaskStore {
  return {
    load() {
      const out: LeadTask[] = [];
      try {
        const root = dir();
        if (!existsSync(root)) return [];
        for (const name of readdirSync(root)) {
          if (!name.endsWith(".json")) continue;
          const workspaceId = name.slice(0, -5);
          if (!isBoardId(workspaceId)) continue;
          try {
            const file = path.join(root, name);
            if (statSync(file).size > FILE_MAX) continue;
            const parsed = JSON.parse(readFileSync(file, "utf-8")) as { tasks?: unknown };
            if (!Array.isArray(parsed?.tasks)) continue;
            for (const raw of parsed.tasks.slice(0, LEAD_TASKS_PER_TEAM)) {
              const task = readLeadTask(raw, workspaceId);
              if (task && !out.some((t) => t.id === task.id)) out.push(task);
            }
          } catch {
            // tek bozuk dosya öbürlerini durdurmasın
          }
        }
      } catch {
        return out;
      }
      return out;
    },
    save(workspaceId, tasks) {
      if (!isBoardId(workspaceId)) return;
      try {
        const text = JSON.stringify({ version: 1, tasks: persistableTasks(tasks.filter((t) => t.workspaceId === workspaceId)) });
        writeTextAtomic(path.join(dir(), `${workspaceId}.json`), text, FILE_MAX);
      } catch {
        // yazılamadıysa görevler bellekte sürüyor
      }
    }
  };
}
