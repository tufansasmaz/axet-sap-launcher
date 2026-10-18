// Değişiklikler görünümünün saf yardımcıları (spec 2026-10-18 degisiklikler §5).
// Bileşen dosyası ChangesView.tsx; bu dosyanın adı bilerek farklı köklü.
import type { TranslationKey } from "../i18n/tr";
import type { ChangesFailure, Checkpoint, CheckpointReason, FileStatus, ReviewState } from "../../app-electron/shared/changesTypes";

export const REASON_KEY: Record<CheckpointReason, TranslationKey> = {
  prompt: "changes.reasonPrompt",
  dispatch: "changes.reasonDispatch",
  manual: "changes.reasonManual",
  beforeRestore: "changes.reasonBeforeRestore"
};

export const REVIEW_KEY: Record<ReviewState, TranslationKey> = {
  pending: "changes.reviewPending",
  accepted: "changes.reviewAccepted",
  reverted: "changes.reviewReverted"
};

export const FAILURE_KEY: Record<ChangesFailure, TranslationKey> = {
  invalid: "changes.failInvalid",
  noWorkspace: "changes.failNoWorkspace",
  notRepo: "changes.failNotRepo",
  noGit: "changes.failNoGit",
  missingDir: "changes.failMissingDir",
  notFound: "changes.failNotFound",
  expired: "changes.failExpired",
  locked: "changes.failLocked",
  timeout: "changes.failTimeout",
  git: "changes.failGit",
  notInRange: "changes.failNotInRange",
  snapshotFailed: "changes.failSnapshotFailed",
  writeFailed: "changes.failWriteFailed",
  busy: "changes.failBusy",
  pathConflict: "changes.failPathConflict",
  storeFailed: "changes.failStoreFailed",
  alreadyReverted: "changes.failAlreadyReverted",
  outsideRoot: "changes.failOutsideRoot",
  tooMany: "changes.failTooMany",
  nothingToRevert: "changes.failNothingToRevert"
};

export const REPO_KEY: Record<"notRepo" | "noGit" | "missingDir", TranslationKey> = {
  notRepo: "changes.repoNotRepo",
  noGit: "changes.repoNoGit",
  missingDir: "changes.repoMissingDir"
};

export const STATUS_KEY: Record<FileStatus, TranslationKey> = {
  added: "changes.statusAdded",
  modified: "changes.statusModified",
  deleted: "changes.statusDeleted"
};

export const STATUS_MARK: Record<FileStatus, string> = { added: "A", modified: "M", deleted: "D" };

export function newestFirst(list: readonly Checkpoint[]): Checkpoint[] {
  return [...list].reverse();
}

export function latestForSubtask(list: readonly Checkpoint[], subtaskId: string): Checkpoint | null {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].subtaskId === subtaskId) return list[i];
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function clockLabel(ms: number, now: number): string {
  const d = new Date(ms);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date(now).toDateString() ? hm : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${hm}`;
}

export function canAccept(cp: Checkpoint): boolean {
  // beforeRestore kayıtları pendingCount'a girmiyor (changesLogic:60); tutarlılık için Kabul et de çıkmasın.
  return cp.reviewed === "pending" && cp.reason !== "beforeRestore";
}

export function canRevert(cp: Checkpoint, expired: readonly string[]): boolean {
  return cp.reviewed !== "reverted" && !expired.includes(cp.id);
}
