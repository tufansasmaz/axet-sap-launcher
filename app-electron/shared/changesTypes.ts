// Değişiklikler görünümünün türleri ve sınırları (spec 2026-10-18 degisiklikler
// §3–§8). Ana süreç, preload ve renderer aynı türleri kullanıyor.

export type CheckpointReason = "prompt" | "dispatch" | "manual" | "beforeRestore";
export type ReviewState = "pending" | "accepted" | "reverted";

export const CHECKPOINT_REASONS: readonly CheckpointReason[] = ["prompt", "dispatch", "manual", "beforeRestore"];
export const REVIEW_STATES: readonly ReviewState[] = ["pending", "accepted", "reverted"];

/** Kaydın aralığı (bu kayıt → sonraki kayıt) kapanınca bir kez hesaplanıp saklanıyor. */
export interface RangeStats {
  files: number;
  added: number;
  deleted: number;
}

export interface Checkpoint {
  id: string;
  workspaceId: string;
  /** `git write-tree` sonucu. */
  tree: string;
  createdAt: number;
  reason: CheckpointReason;
  paneId: string | null;
  /** O anki bölme adı; sonradan değişse de kayıt tarihî. */
  agentName: string | null;
  subtaskId: string | null;
  /** İstemin ilk 80 karakteri, alt görev başlığı ya da boş (elle). */
  label: string;
  reviewed: ReviewState;
  stats?: RangeStats;
}

export type FileStatus = "added" | "modified" | "deleted";

export interface FileChange {
  /** Alan köküne göre, "/" ayraçlı. */
  path: string;
  status: FileStatus;
  added: number;
  deleted: number;
  binary: boolean;
}

export type RepoStatus = "unknown" | "ok" | "notRepo" | "noGit" | "missingDir";

export type ChangesFailure =
  | "invalid"
  | "noWorkspace"
  | "notRepo"
  | "noGit"
  | "missingDir"
  | "notFound"
  | "expired"
  | "locked"
  | "timeout"
  | "git"
  | "notInRange"
  | "snapshotFailed"
  | "writeFailed"
  | "busy";

export const CHANGES_FAILURES: readonly ChangesFailure[] = [
  "invalid",
  "noWorkspace",
  "notRepo",
  "noGit",
  "missingDir",
  "notFound",
  "expired",
  "locked",
  "timeout",
  "git",
  "notInRange",
  "snapshotFailed",
  "writeFailed",
  "busy"
];

/** Son görüntü alma hatası (görünümdeki uyarı satırı); başarılı görüntü siler. */
export interface ChangesWarning {
  code: ChangesFailure;
  at: number;
}

export interface ChangesState {
  workspaceId: string;
  repo: RepoStatus;
  /** Eskiden yeniye. */
  checkpoints: Checkpoint[];
  /** Ağacı bulunamayan (git gc) kayıtların kimlikleri. */
  expired: string[];
  warning?: ChangesWarning;
  recoveredFrom?: string;
  unreadable?: boolean;
}

export type DiffLineKind = "hunk" | "context" | "add" | "del";

export interface DiffLine {
  kind: DiffLineKind;
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

export type FileDiff = { kind: "text"; lines: DiffLine[]; truncated: boolean } | { kind: "binary" } | { kind: "large" };

export type SnapshotResult = { ok: true; id: string } | { ok: false; reason: ChangesFailure };
export type RangeResult =
  | { ok: true; files: FileChange[]; truncated: boolean; toWorkingTree: boolean; noCheckpoint?: boolean }
  | { ok: false; reason: ChangesFailure };
export type DiffResult = { ok: true; diff: FileDiff } | { ok: false; reason: ChangesFailure };
export type ChangesCommandResult = { ok: true } | { ok: false; reason: ChangesFailure };

export interface RevertConflict {
  id: string;
  label: string;
  agentName: string | null;
  reason: CheckpointReason;
}

export interface RevertPlan {
  files: FileChange[];
  /** Aralığı bu dosyalara dokunan sonraki kayıtlar (spec §6.1). */
  conflicts: RevertConflict[];
  /** Sonraki kayıtların hepsi taranmadı (en çok CONFLICT_SCAN_MAX). */
  conflictsPartial: boolean;
  /** Alanda şu an çalışan ya da soru soran ajanlar (spec §6.6). */
  runningAgents: string[];
}

export type PrepareRevertResult = { ok: true; plan: RevertPlan } | { ok: false; reason: ChangesFailure };

export interface RevertResult {
  ok: boolean;
  reason?: ChangesFailure;
  restored: string[];
  trashed: string[];
  /** Onaylanan listede olup artık aralıkta olmayan (ya da zaten olmayan eklenmiş) yollar. */
  skipped: string[];
  failedPath?: string;
  beforeRestoreId?: string;
}

export const MAX_CHECKPOINTS = 200;
export const LABEL_MAX = 80;
export const PROMPT_THROTTLE_MS = 30_000;
export const SNAPSHOT_TIMEOUT_MS = 20_000;
export const GIT_TIMEOUT_MS = 20_000;
export const DIFF_MAX_BYTES = 2 * 1024 * 1024;
export const LARGE_FILE_BYTES = 200 * 1024;
export const MAX_DIFF_LINES = 20_000;
export const LIVE_POLL_MS = 3_000;
export const LOCK_RETRIES = 3;
export const LOCK_RETRY_MS = 300;
export const STALE_LOCK_MS = 60_000;
export const CONFLICT_SCAN_MAX = 50;
export const REVERT_PATHS_MAX = 5_000;
export const PATH_MAX = 1_000;
