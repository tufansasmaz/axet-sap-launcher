// Görev panosu ekranının SAF yardımcıları (spec 2026-10-18 gorev-panosu §8).
// Renk yalnız mevcut jetonlardan: görev grubu mevcut bölme renklerinden,
// başarısız/takıldı `--status-danger-*`. Lime (accent) yalnız seçim; burada yok.
import type { BoardFailure } from "../../app-electron/shared/boardCommands";
import type {
  Board,
  BoardTask,
  LeadErrorCode,
  Subtask,
  SubtaskNote,
  SubtaskState
} from "../../app-electron/shared/boardTypes";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { agentPanes } from "../agents/agentView";

export type BoardColumn = "draft" | "queued" | "running" | "verifying" | "done";

export const BOARD_COLUMNS: readonly BoardColumn[] = ["draft", "queued", "running", "verifying", "done"];

export const COLUMN_KEY: Record<BoardColumn, TranslationKey> = {
  draft: "board.colDraft",
  queued: "board.colQueued",
  running: "board.colRunning",
  verifying: "board.colVerifying",
  done: "board.colDone"
};

export function taskColumn(task: BoardTask): BoardColumn {
  if (task.approvedAt === undefined) return "draft";
  return task.state === "done" ? "done" : "running";
}

export function subtaskColumn(sub: Subtask): Exclude<BoardColumn, "draft"> {
  switch (sub.state) {
    case "waiting":
    case "ready":
      return "queued";
    case "running":
    case "asking":
      return "running";
    case "verifying":
    case "failed":
      return "verifying";
    case "done":
      return "done";
  }
}

export function taskProgress(task: BoardTask): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.state === "done").length, total: task.subtasks.length };
}

/** Görev grubu rengi: mevcut bölme renkleri, oluşturulma sırasına göre (yeni renk yok). */
const GROUP_COLORS: readonly TerminalPaneColor[] = ["blue", "green", "amber", "violet"];

export function taskColor(tasks: readonly BoardTask[], taskId: string): TerminalPaneColor {
  const ordered = [...tasks].sort((a, b) => a.createdAt - b.createdAt);
  const index = ordered.findIndex((t) => t.id === taskId);
  return index < 0 ? "gray" : GROUP_COLORS[index % GROUP_COLORS.length];
}

export function failedCount(board: Board | undefined): number {
  return (board?.tasks ?? []).reduce((sum, t) => sum + t.subtasks.filter((s) => s.state === "failed").length, 0);
}

export function taskCount(board: Board | undefined): number {
  return board?.tasks.length ?? 0;
}

const ON_AGENT: ReadonlySet<SubtaskState> = new Set<SubtaskState>(["running", "asking", "verifying"]);

/** Ekip şeridi: bu ajanın üstündeki alt görev (spec §8). */
export function activeSubtaskOf(boards: Record<string, Board>, paneId: string): { task: BoardTask; subtask: Subtask } | null {
  for (const board of Object.values(boards)) {
    for (const task of board.tasks) {
      const subtask = task.subtasks.find((s) => s.paneId === paneId && ON_AGENT.has(s.state));
      if (subtask) return { task, subtask };
    }
  }
  return null;
}

const folderKey = (cwd: string) => cwd.trim().replace(/[\\/]+$/, "").toLowerCase();

/** "Aynı klasörde paralel çalışıyor" uyarısı alacak alt görevler (spec §5). */
export function sameFolderParallel(tasks: readonly BoardTask[], workspace: TerminalWorkspace): Set<string> {
  const cwdOf = new Map(workspace.panes.map((p) => [p.id, folderKey(p.cwd)]));
  const byFolder = new Map<string, string[]>();
  for (const task of tasks) {
    for (const s of task.subtasks) {
      if ((s.state !== "running" && s.state !== "asking") || !s.paneId) continue;
      const folder = cwdOf.get(s.paneId);
      if (!folder) continue;
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), s.id]);
    }
  }
  return new Set([...byFolder.values()].filter((ids) => ids.length > 1).flat());
}

/** "Ajana ver" seçicisi: bu alanda çalışan ajan bölmeleri (uygunluğu ana süreç yeniden denetler). */
export function assignablePanes(workspace: TerminalWorkspace): TerminalPane[] {
  return agentPanes(workspace).filter((p) => p.run.state === "running");
}

export const SUBTASK_STATE_KEY: Record<SubtaskState, TranslationKey> = {
  waiting: "board.stateWaiting",
  ready: "board.stateReady",
  running: "board.stateRunning",
  asking: "board.stateAsking",
  verifying: "board.stateVerifying",
  done: "board.stateDone",
  failed: "board.stateFailed"
};

export const NOTE_KEY: Record<SubtaskNote, TranslationKey> = {
  agentClosed: "board.noteAgentClosed",
  restarted: "board.noteRestarted",
  agentError: "board.noteAgentError",
  timeout: "board.noteTimeout",
  sentBack: "board.noteSentBack",
  promptAborted: "board.notePromptAborted"
};

export const LEAD_ERROR_KEY: Record<LeadErrorCode, TranslationKey> = {
  binary: "board.leadBinary",
  failed: "board.leadFailed",
  timeout: "board.leadTimeout",
  noJson: "board.leadNoJson",
  badJson: "board.leadBadJson",
  noSubtasks: "board.leadNoSubtasks",
  tooMany: "board.leadTooMany",
  badField: "board.leadBadField",
  badDependency: "board.leadBadDependency",
  cycle: "board.leadCycle"
};

export const FAILURE_KEY: Record<BoardFailure, TranslationKey> = {
  invalid: "board.failInvalid",
  noBoard: "board.failNoBoard",
  noTask: "board.failNoTask",
  noSubtask: "board.failNoSubtask",
  badState: "board.failBadState",
  limit: "board.failLimit",
  badDependency: "board.failBadDependency",
  cycle: "board.failCycle",
  notEligible: "board.failNotEligible",
  typing: "board.failTyping",
  noVerify: "board.failNoVerify",
  hasVerify: "board.failHasVerify",
  writeFailed: "board.failWriteFailed"
};

export type ReportOutcome = "verified" | "manual" | "done" | "failed";

export interface ReportRow {
  task: BoardTask;
  subtask: Subtask;
  outcome: ReportOutcome;
  /** Doğrulama anı; yoksa son gönderim (ms), o da yoksa 0. */
  at: number;
  /** Komutla doğrulandıysa kaç komut geçti. */
  commands: { passed: number; total: number } | null;
}

/**
 * Raporlar (spec 2026-10-18 ajanlar-yeniden §2b): biten, doğrulanan ve
 * başarısız alt görevler; en yeni önce. Yeni veri yok, panodan.
 */
export function reportRows(board: Board | undefined): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const task of board?.tasks ?? []) {
    for (const subtask of task.subtasks) {
      if (subtask.state !== "done" && subtask.state !== "failed") continue;
      const proof = subtask.proof;
      const outcome: ReportOutcome =
        subtask.state === "failed" ? "failed" : proof?.kind === "commands" ? "verified" : proof?.kind === "manual" ? "manual" : "done";
      const commands =
        proof?.kind === "commands" && proof.commands.length
          ? { passed: proof.commands.filter((c) => c.exitCode === 0 && !c.timedOut && !c.error).length, total: proof.commands.length }
          : null;
      rows.push({ task, subtask, outcome, at: proof?.at ?? subtask.dispatchedAt ?? 0, commands });
    }
  }
  return rows.sort((a, b) => b.at - a.at);
}
