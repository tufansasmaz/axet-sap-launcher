// Görünüm rayındaki sayaç rozetleri (Tur 2). Yalnız verisi olan sekmeler:
//   Görevler     — onaylanmış, bitmemiş görevlerdeki bitmemiş alt görevler,
//   Değişiklikler — incelenmeyi bekleyen kayıtlar (dosya değiştirenler),
//   Ofis         — soru soran ajanlar.
// Terminal/Tarayıcı/Bellek için anlamlı sayı yok; sıfır rozet çizilmiyor.
import type { Board } from "../../app-electron/shared/boardTypes";
import type { ChangesState } from "../../app-electron/shared/changesTypes";
import type { WorkspaceView } from "../../app-electron/shared/types";

export type RailCounts = Partial<Record<WorkspaceView, number>>;

export function openSubtaskCount(board: Board | null | undefined): number {
  if (!board) return 0;
  let count = 0;
  for (const task of board.tasks) {
    if (task.state === "draft" || task.state === "done") continue;
    count += task.subtasks.filter((s) => s.state !== "done").length;
  }
  return count;
}

export function pendingChangeCount(changes: ChangesState | null | undefined): number {
  if (!changes || changes.repo !== "ok") return 0;
  const expired = new Set(changes.expired);
  return changes.checkpoints.filter((c) => c.reviewed === "pending" && !expired.has(c.id) && (c.stats?.files ?? 0) > 0).length;
}

export function railCounts(input: { board?: Board | null; changes?: ChangesState | null; asking: number; browser?: number }): RailCounts {
  const counts: RailCounts = {};
  const board = openSubtaskCount(input.board);
  const changes = pendingChangeCount(input.changes);
  if (board > 0) counts.board = board;
  if (changes > 0) counts.changes = changes;
  if (input.asking > 0) counts.office = input.asking;
  // Tur 7: görünüm değiştirilmeden otomatik açılan yerel adresler.
  if ((input.browser ?? 0) > 0) counts.browser = input.browser;
  return counts;
}
