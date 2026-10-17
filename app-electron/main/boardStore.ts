// Görev panosunun diskteki evi (spec 2026-10-18 gorev-panosu §2, §7):
// `userData/boards/<workspaceId>.json`. Proje klasörüne ya da depoya dosya
// yazılmıyor. Dosya elle düzenlenebilir: bozuk öğe atlanıyor; dosyanın
// tamamı bozuksa SESSİZCE ezilmiyor, `.bozuk-<zaman>` olarak kenara alınıyor.
// Yazma atomik (önce .tmp, sonra rename; bkz. chatStore.ts).
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { restoreAfterRestart } from "../shared/boardLogic";
import {
  LEAD_DETAIL_MAX,
  LEAD_ERROR_CODES,
  LEAD_RAW_MAX,
  MAX_SUBTASKS,
  MAX_TASKS,
  ROLE_HINT_MAX,
  SUBTASK_NOTES,
  SUBTASK_PROMPT_MAX,
  SUBTASK_STATES,
  SUBTASK_TITLE_MAX,
  TASK_GOAL_MAX,
  TASK_TITLE_MAX,
  type BoardTask,
  type LeadErrorCode,
  type Proof,
  type ProofCommand,
  type Subtask,
  type SubtaskNote,
  type SubtaskState
} from "../shared/boardTypes";

export interface BoardFileResult {
  tasks: BoardTask[];
  recoveredFrom?: string;
  /** Okunamadı ve kenara da alınamadı: çağıran bu panonun üzerine yazmamalı. */
  unreadable?: boolean;
}

const TAIL_MAX = 8192;
const COMMAND_MAX = 300;

export function boardFile(dir: string, workspaceId: string): string | null {
  return isBoardId(workspaceId) ? path.join(dir, `${workspaceId}.json`) : null;
}

function str(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readProofCommand(raw: unknown): ProofCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const command = str(r.command, COMMAND_MAX);
  const durationMs = num(r.durationMs);
  if (command === null || durationMs === null) return null;
  const exitCode = r.exitCode === null ? null : num(r.exitCode);
  if (exitCode === null && r.exitCode !== null) return null;
  const out: ProofCommand = { command, exitCode, durationMs, tail: str(r.tail, TAIL_MAX) ?? "" };
  if (r.timedOut === true) out.timedOut = true;
  if (r.error === "missingDir" || r.error === "spawn") out.error = r.error;
  return out;
}

function readProof(raw: unknown): Proof | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "commands" && r.kind !== "manual") return undefined;
  const at = num(r.at);
  if (at === null || typeof r.ok !== "boolean" || !Array.isArray(r.commands)) return undefined;
  const commands = (r.commands as unknown[]).map(readProofCommand).filter((c): c is ProofCommand => c !== null);
  return { kind: r.kind, commands, ok: r.ok, at };
}

function readSubtask(raw: unknown): Subtask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, SUBTASK_TITLE_MAX);
  const prompt = str(r.prompt, SUBTASK_PROMPT_MAX);
  const attempts = num(r.attempts);
  if (!isBoardId(r.id) || title === null || prompt === null || attempts === null) return null;
  if (!(SUBTASK_STATES as readonly unknown[]).includes(r.state)) return null;
  const sub: Subtask = {
    id: r.id,
    title,
    prompt,
    roleHint: str(r.roleHint, ROLE_HINT_MAX) ?? "",
    dependsOn: Array.isArray(r.dependsOn) ? (r.dependsOn as unknown[]).filter(isBoardId) : [],
    state: r.state as SubtaskState,
    paneId: isBoardId(r.paneId) ? r.paneId : null,
    attempts: Math.max(0, Math.floor(attempts))
  };
  if ((SUBTASK_NOTES as readonly unknown[]).includes(r.note)) sub.note = r.note as SubtaskNote;
  const proof = readProof(r.proof);
  if (proof) sub.proof = proof;
  if (r.held === true) sub.held = true;
  const dispatchedAt = num(r.dispatchedAt);
  if (dispatchedAt !== null) sub.dispatchedAt = dispatchedAt;
  if (r.sawBusy === true) sub.sawBusy = true;
  return sub;
}

function readTask(raw: unknown): BoardTask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, TASK_TITLE_MAX);
  const goal = str(r.goal, TASK_GOAL_MAX);
  const createdAt = num(r.createdAt);
  if (!isBoardId(r.id) || title === null || goal === null || createdAt === null) return null;
  const subtasks: Subtask[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(r.subtasks) ? (r.subtasks as unknown[]) : []) {
    if (subtasks.length >= MAX_SUBTASKS) break;
    const sub = readSubtask(item);
    if (!sub || seen.has(sub.id)) continue;
    seen.add(sub.id);
    subtasks.push(sub);
  }
  // Bağımlılık yalnız aynı görevdeki mevcut ve kendisi olmayan alt göreve.
  for (const sub of subtasks) sub.dependsOn = [...new Set(sub.dependsOn)].filter((d) => d !== sub.id && seen.has(d));
  const task: BoardTask = { id: r.id, title, goal, state: "draft", createdAt, subtasks };
  const approvedAt = num(r.approvedAt);
  if (approvedAt !== null) task.approvedAt = approvedAt;
  if ((LEAD_ERROR_CODES as readonly unknown[]).includes(r.leadError)) task.leadError = r.leadError as LeadErrorCode;
  const leadDetail = str(r.leadDetail, LEAD_DETAIL_MAX);
  if (leadDetail) task.leadDetail = leadDetail;
  const leadRaw = str(r.leadRaw, LEAD_RAW_MAX);
  if (leadRaw) task.leadRaw = leadRaw;
  if (r.leadChangedFiles === true) task.leadChangedFiles = true;
  return restoreAfterRestart(task);
}

/** Dosyanın tamamı: `{ tasks: [...] }`. Yapı bozuksa null (çağıran kenara alıyor). */
export function readTasks(raw: unknown): BoardTask[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const list = (raw as Record<string, unknown>).tasks;
  if (!Array.isArray(list)) return null;
  const tasks: BoardTask[] = [];
  const seen = new Set<string>();
  for (const item of list as unknown[]) {
    if (tasks.length >= MAX_TASKS) break;
    const task = readTask(item);
    if (!task || seen.has(task.id)) continue;
    seen.add(task.id);
    tasks.push(task);
  }
  return tasks;
}

export function readBoardFile(dir: string, workspaceId: string, now: number): BoardFileResult {
  const file = boardFile(dir, workspaceId);
  if (!file || !existsSync(file)) return { tasks: [] };
  let tasks: BoardTask[] | null = null;
  try {
    tasks = readTasks(JSON.parse(readFileSync(file, "utf-8").replace(/^﻿/, "")));
  } catch {
    tasks = null;
  }
  if (tasks) return { tasks };
  // Bozuk ya da okunamıyor: veri sessizce silinmiyor (spec §7).
  const backup = `${file}.bozuk-${now}`;
  try {
    renameSync(file, backup);
    return { tasks: [], recoveredFrom: path.basename(backup) };
  } catch {
    return { tasks: [], unreadable: true };
  }
}

export function writeBoardFile(dir: string, workspaceId: string, tasks: readonly BoardTask[]): boolean {
  const file = boardFile(dir, workspaceId);
  if (!file) return false;
  const payload = JSON.stringify(
    {
      version: 1,
      tasks: tasks.map((t) => {
        const copy: BoardTask = { ...t };
        delete copy.planning;
        return copy;
      })
    },
    null,
    2
  );
  const tmp = `${file}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, payload, "utf-8");
    renameSync(tmp, file);
    return true;
  } catch {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // temizlik başarısız olsa da sonuç false
    }
    return false;
  }
}

export function deleteBoardFile(dir: string, workspaceId: string): void {
  const file = boardFile(dir, workspaceId);
  if (!file) return;
  try {
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // silinemeyen dosya bir sonraki budamada yeniden denenir
  }
}

export function listBoardIds(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map((name) => /^(.+)\.json$/.exec(name)?.[1] ?? "")
      .filter(isBoardId);
  } catch {
    return [];
  }
}
