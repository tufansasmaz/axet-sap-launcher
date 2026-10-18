// Değişiklik kayıtlarının diskteki evi (spec 2026-10-18 degisiklikler §3, §8):
// `userData/checkpoints/<workspaceId>.json` ve aynı klasörde uygulamaya ait
// iki index dosyası (`.index` görüntü için, `.restore.index` geri alma için).
// Kullanıcının deposuna dosya yazılmıyor. Görev Panosu deposu kalıbı: bozuk
// öğe atlanıyor; dosyanın tamamı bozuksa SESSİZCE ezilmiyor, `.bozuk-<zaman>`
// olarak kenara alınıyor; yazma atomik (önce .tmp, sonra rename).
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { isTreeId } from "../shared/changesLogic";
import {
  CHECKPOINT_REASONS,
  LABEL_MAX,
  REVIEW_STATES,
  type Checkpoint,
  type CheckpointReason,
  type RangeStats,
  type ReviewState
} from "../shared/changesTypes";

export interface CheckpointFileResult {
  checkpoints: Checkpoint[];
  recoveredFrom?: string;
  /** Okunamadı ve kenara da alınamadı: çağıran bu dosyanın üzerine yazmamalı. */
  unreadable?: boolean;
}

const AGENT_NAME_MAX = 60;

function fileFor(dir: string, workspaceId: string, suffix: string): string | null {
  return isBoardId(workspaceId) ? path.join(dir, `${workspaceId}${suffix}`) : null;
}

export function checkpointFile(dir: string, workspaceId: string): string | null {
  return fileFor(dir, workspaceId, ".json");
}

export function privateIndexFile(dir: string, workspaceId: string): string | null {
  return fileFor(dir, workspaceId, ".index");
}

export function restoreIndexFile(dir: string, workspaceId: string): string | null {
  return fileFor(dir, workspaceId, ".restore.index");
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readStats(raw: unknown): RangeStats | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const files = count(r.files);
  const added = count(r.added);
  const deleted = count(r.deleted);
  return files === null || added === null || deleted === null ? undefined : { files, added, deleted };
}

function readCheckpoint(raw: unknown, workspaceId: string): Checkpoint | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isBoardId(r.id) || r.workspaceId !== workspaceId || !isTreeId(r.tree)) return null;
  if (typeof r.createdAt !== "number" || !Number.isFinite(r.createdAt)) return null;
  if (!(CHECKPOINT_REASONS as readonly unknown[]).includes(r.reason)) return null;
  if (!(REVIEW_STATES as readonly unknown[]).includes(r.reviewed)) return null;
  const checkpoint: Checkpoint = {
    id: r.id,
    workspaceId,
    tree: r.tree,
    createdAt: r.createdAt,
    reason: r.reason as CheckpointReason,
    paneId: isBoardId(r.paneId) ? r.paneId : null,
    agentName: typeof r.agentName === "string" ? r.agentName.slice(0, AGENT_NAME_MAX) : null,
    subtaskId: isBoardId(r.subtaskId) ? r.subtaskId : null,
    label: typeof r.label === "string" ? Array.from(r.label).slice(0, LABEL_MAX).join("") : "",
    reviewed: r.reviewed as ReviewState
  };
  const stats = readStats(r.stats);
  if (stats) checkpoint.stats = stats;
  return checkpoint;
}

/** Dosyanın tamamı: `{ checkpoints: [...] }`. Yapı bozuksa null (çağıran kenara alıyor). */
export function readCheckpoints(raw: unknown, workspaceId: string): Checkpoint[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const list = (raw as Record<string, unknown>).checkpoints;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const result: Checkpoint[] = [];
  for (const item of list as unknown[]) {
    const checkpoint = readCheckpoint(item, workspaceId);
    if (!checkpoint || seen.has(checkpoint.id)) continue;
    seen.add(checkpoint.id);
    result.push(checkpoint);
  }
  // Array.prototype.sort kararlı: aynı zamanlı kayıtlar dosyadaki sırasını koruyor.
  result.sort((a, b) => a.createdAt - b.createdAt);
  // Okumada sınır yok: geri alınan kayıt geçici 201. sırada düşmesin (sınır yazarken, yöneticide).
  return result;
}

export function readCheckpointFile(dir: string, workspaceId: string, now: number): CheckpointFileResult {
  const file = checkpointFile(dir, workspaceId);
  if (!file || !existsSync(file)) return { checkpoints: [] };
  let checkpoints: Checkpoint[] | null = null;
  try {
    checkpoints = readCheckpoints(JSON.parse(readFileSync(file, "utf-8").replace(/^\uFEFF/, "")), workspaceId);
  } catch {
    checkpoints = null;
  }
  if (checkpoints) return { checkpoints };
  // Bozuk ya da okunamıyor: veri sessizce silinmiyor (spec §8).
  const backup = `${file}.bozuk-${now}`;
  try {
    renameSync(file, backup);
    return { checkpoints: [], recoveredFrom: path.basename(backup) };
  } catch {
    return { checkpoints: [], unreadable: true };
  }
}

export function writeCheckpointFile(dir: string, workspaceId: string, list: readonly Checkpoint[]): boolean {
  const file = checkpointFile(dir, workspaceId);
  if (!file) return false;
  const tmp = `${file}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, JSON.stringify({ version: 1, checkpoints: list }, null, 2), "utf-8");
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

/** Alan kapatıldı (spec sapma 14): kayıtlar ve iki index dosyası. */
export function deleteCheckpointFiles(dir: string, workspaceId: string): void {
  for (const file of [checkpointFile(dir, workspaceId), privateIndexFile(dir, workspaceId), restoreIndexFile(dir, workspaceId)]) {
    if (!file) continue;
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {
      // silinemeyen dosya öksüz kalır; veri kaybından iyidir
    }
  }
}
