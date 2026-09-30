// Terminal modunun bellekteki durumu (spec §4.2). Diske yalnız `toSaved`'ın
// çıkardığı düzen yazılıyor; buradaki çalışma durumu yazılmıyor.

import type { SavedTerminalWorkspace, TerminalPaneKind } from "../../app-electron/shared/types";

export type NameFor = (n: number) => string;

export type PaneRun =
  | { state: "queued" }
  // `token`: aynı bölmenin başka bir denemesinin geç gelen sonucu bununla
  // ayırt ediliyor.
  | { state: "starting"; token: number }
  | { state: "running"; ptyId: string }
  // `ptyId` kalıyor: süreç kapansa da xterm ve çıktısı yerinde duruyor.
  | { state: "exited"; ptyId: string; code: number }
  | { state: "failed"; message: string }
  | { state: "missingDir" };

export interface TerminalPane {
  id: string;
  kind: TerminalPaneKind;
  cwd: string;
  run: PaneRun;
}

export interface TerminalWorkspace {
  id: string;
  name: string;
  panes: TerminalPane[];
  focusedPaneId: string | null;
  maximizedPaneId: string | null;
  // Kenar çubuğundaki nokta: görünmezken çıktı geldi / bir süreç hatayla bitti.
  unread: boolean;
  error: boolean;
}

// "AXET Projesi Seç"ten gelen, yer bekleyen bölme. Kimlikler baştan
// üretiliyor ki indirgeyici saf kalsın.
export interface PendingProjectPane {
  paneId: string;
  spareWorkspaceId: string;
  cwd: string;
}

export interface TerminalState {
  // closed: mod henüz hiç açılmadı · restorePrompt: "Son düzen" şeridi · ready
  phase: "closed" | "restorePrompt" | "ready";
  saved: SavedTerminalWorkspace[];
  savedActiveId: string | null;
  workspaces: TerminalWorkspace[];
  activeWorkspaceId: string | null;
  // Terminal modu ekranda mı (mod seçici). Gizliyken seçili alan da görünmez.
  visible: boolean;
  pending: PendingProjectPane[];
  // Proje bölmesi 6 alan × 9 bölme sınırına çarptıkça artıyor; sağlayıcı
  // artışı görünce bildirim gösteriyor.
  limitHits: number;
}

export type TerminalAction =
  | { type: "open"; saved: SavedTerminalWorkspace[]; activeId: string | null; freshId: string; nameFor: NameFor }
  | { type: "restore"; nameFor: NameFor }
  | { type: "startFresh"; freshId: string; nameFor: NameFor }
  | { type: "setVisible"; visible: boolean }
  | { type: "addWorkspace"; id: string; nameFor: NameFor }
  | { type: "selectWorkspace"; id: string }
  | { type: "renameWorkspace"; id: string; name: string }
  | { type: "closeWorkspace"; id: string; freshId: string; nameFor: NameFor }
  | { type: "addPane"; workspaceId: string; paneId: string; kind: TerminalPaneKind; cwd: string }
  | { type: "addProjectPane"; paneId: string; spareWorkspaceId: string; cwd: string; nameFor: NameFor }
  | { type: "closePane"; paneId: string }
  | { type: "restartPane"; paneId: string; cwd?: string }
  | { type: "focusPane"; paneId: string }
  | { type: "toggleMaximize"; paneId: string }
  | { type: "spawnStarted"; paneId: string; token: number }
  | { type: "spawnSucceeded"; paneId: string; token: number; ptyId: string }
  | { type: "spawnFailed"; paneId: string; token: number; message: string; missingDir: boolean }
  | { type: "ptyExit"; ptyId: string; code: number }
  | { type: "ptyData"; ptyId: string };
