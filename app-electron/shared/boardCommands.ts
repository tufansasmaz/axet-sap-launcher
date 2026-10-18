// Pano IPC komutları (spec 2026-10-18 gorev-panosu). Renderer'dan gelen her
// komut ana süreçte buradan geçiyor: tür, kimlik deseni, sınırlar. Kimlik
// deseni dosya adına da giriyor (boards/<workspaceId>.json): yol parçası
// hiçbir koşulda geçmemeli.
import { SUBTASK_PROMPT_BODY_MAX } from "./boardDispatch";
import {
  MAX_SUBTASKS,
  ROLE_HINT_MAX,
  SUBTASK_TITLE_MAX,
  TASK_GOAL_MAX,
  TASK_TITLE_MAX
} from "./boardTypes";

export interface SubtaskDraft {
  id: string;
  title: string;
  prompt: string;
  roleHint: string;
  dependsOn: string[];
}

export type BoardCommand =
  | { type: "createTask"; title: string; goal: string }
  | { type: "split"; taskId: string }
  | { type: "saveDraft"; taskId: string; title: string; goal: string; subtasks: SubtaskDraft[] }
  | { type: "approve"; taskId: string }
  | { type: "assign"; taskId: string; subtaskId: string; paneId: string }
  | { type: "verify"; taskId: string; subtaskId: string }
  | { type: "approveManual"; taskId: string; subtaskId: string }
  | { type: "sendBack"; taskId: string; subtaskId: string }
  | { type: "requeue"; taskId: string; subtaskId: string }
  | { type: "deleteTask"; taskId: string }
  | { type: "dismissWarning" };

export type BoardFailure =
  | "invalid"
  | "noBoard"
  | "noTask"
  | "noSubtask"
  | "badState"
  | "limit"
  | "badDependency"
  | "cycle"
  | "notEligible"
  | "typing"
  | "noVerify"
  | "hasVerify"
  | "writeFailed";

export const BOARD_FAILURES: readonly BoardFailure[] = [
  "invalid",
  "noBoard",
  "noTask",
  "noSubtask",
  "badState",
  "limit",
  "badDependency",
  "cycle",
  "notEligible",
  "typing",
  "noVerify",
  "hasVerify",
  "writeFailed"
];

export type BoardCommandResult = { ok: true; taskId?: string } | { ok: false; reason: BoardFailure };

const ID = /^[A-Za-z0-9_-]{1,100}$/;

export function isBoardId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function readDraft(raw: unknown): SubtaskDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = text(r.title, SUBTASK_TITLE_MAX);
  const prompt = text(r.prompt, SUBTASK_PROMPT_BODY_MAX);
  const roleHint = text(r.roleHint, ROLE_HINT_MAX);
  if (!isBoardId(r.id) || title === null || prompt === null || roleHint === null) return null;
  // Array.from seyrek dizilerin deliklerini undefined'a dönüştürür; .every deliği atlar (hata verir).
  if (!Array.isArray(r.dependsOn) || r.dependsOn.length > MAX_SUBTASKS || !Array.from(r.dependsOn).every(isBoardId)) return null;
  return { id: r.id, title, prompt, roleHint, dependsOn: [...(r.dependsOn as string[])] };
}

export function readBoardCommand(raw: unknown): BoardCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sub = (type: "verify" | "approveManual" | "sendBack" | "requeue"): BoardCommand | null =>
    isBoardId(r.taskId) && isBoardId(r.subtaskId) ? { type, taskId: r.taskId, subtaskId: r.subtaskId } : null;
  switch (r.type) {
    case "createTask": {
      const title = text(r.title, TASK_TITLE_MAX);
      const goal = text(r.goal, TASK_GOAL_MAX);
      return title && goal !== null ? { type: "createTask", title, goal } : null;
    }
    case "split":
    case "approve":
    case "deleteTask":
      return isBoardId(r.taskId) ? { type: r.type, taskId: r.taskId } : null;
    case "saveDraft": {
      const title = text(r.title, TASK_TITLE_MAX);
      const goal = text(r.goal, TASK_GOAL_MAX);
      if (!isBoardId(r.taskId) || !title || goal === null) return null;
      if (!Array.isArray(r.subtasks) || r.subtasks.length > MAX_SUBTASKS) return null;
      const subtasks: SubtaskDraft[] = [];
      for (const item of r.subtasks as unknown[]) {
        const draft = readDraft(item);
        if (!draft) return null;
        subtasks.push(draft);
      }
      return { type: "saveDraft", taskId: r.taskId, title, goal, subtasks };
    }
    case "assign":
      return isBoardId(r.taskId) && isBoardId(r.subtaskId) && isBoardId(r.paneId)
        ? { type: "assign", taskId: r.taskId, subtaskId: r.subtaskId, paneId: r.paneId }
        : null;
    case "verify":
    case "approveManual":
    case "sendBack":
    case "requeue":
      return sub(r.type);
    case "dismissWarning":
      return { type: "dismissWarning" };
    default:
      return null;
  }
}
