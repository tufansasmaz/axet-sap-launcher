// Terminal modunun bellekteki durumu (spec §4.2). Diske yalnız `toSaved`'ın
// çıkardığı düzen yazılıyor; buradaki çalışma durumu yazılmıyor.

import type { SavedTerminalWorkspace, SavedWorkspaceSap, ShellAgentRecord, TerminalMode, TerminalPaneColor, TerminalPaneKind, WorkspaceView } from "../../app-electron/shared/types";
import type { AgentSpec } from "../../app-electron/shared/agentTypes";
import type { DropZone, LayoutNode, LayoutPath, PaneHome, SplitDir } from "../../app-electron/shared/terminalTree";

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

// Küçültülmüş bölme: ağaçta değil, alanın altındaki şeritte. `home` geri
// gelirken nereye konacağı; `unread` şeritteki nokta (diske yazılmıyor).
export interface MinimizedPane {
  paneId: string;
  home: PaneHome | null;
  unread?: boolean;
}

export interface TerminalPane {
  id: string;
  kind: TerminalPaneKind;
  cwd: string;
  run: PaneRun;
  // Bölme ayarları (spec 2026-10-14 §4). Tanımsız = varsayılan.
  title?: string;
  color?: TerminalPaneColor;
  fontSize?: number;
  /** Yalnız ajan bölmesinde (spec 2026-10-17 ajan-alani §3). */
  agent?: AgentSpec;
  /**
   * Tur 12: kabuk bölmesinde kullanıcı bir motor başlattı; `agent` o motorun
   * tanımı. Yalnız bellekte: kalıcı düzende bölme kabuk, motor kapanınca siliniyor.
   */
  launched?: true;
  /** Tur 13: kabuk bölmesinin kalıcı rol/bellek kaydı (Rol ver); motor açılınca ajan tanımına geçer. */
  shellAgent?: ShellAgentRecord;
  /** Tur 12: SAP bağlan düğmesinden açıldı (Akış notu için; diske yazılmıyor). */
  openedFrom?: "sap";
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
  // Bölme ağacı ve küçültülenler. İsteğe bağlı: okuyan yer `layoutOf` /
  // `minimizedOf` kullanıyor; tanımsızsa görünür bölmelerden kuruluyor.
  layout?: LayoutNode | null;
  minimized?: MinimizedPane[];
  root?: string;
  sap?: SavedWorkspaceSap;
  verify?: string[];
  view?: WorkspaceView;
  browserUrl?: string;
}

// "AXET Projesi Seç"ten gelen, yer bekleyen bölme. Kimlikler baştan
// üretiliyor ki indirgeyici saf kalsın.
export interface PendingProjectPane {
  paneId: string;
  spareWorkspaceId: string;
  cwd: string;
  /**
   * SAP bağlanınca terminalde aç (2026-10-19): bölme bu sisteme bağlı alana
   * gidiyor (yoksa boş seçili alan ya da yeni alan bağlanıyor). Bağ, TeamTabs
   * "SAP'ye bağla" ile aynı: `root` = bağlantı klasörü, `sap` = {uuid, etiket}.
   */
  sap?: SavedWorkspaceSap;
  /** Doluysa ajan değil bu kabukta düz kabuk bölmesi. */
  shell?: TerminalMode;
  /** Tur 12: ajan bölmesinin adı (ör. "D01 ajanı"). */
  title?: string;
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
  | {
      type: "addPane";
      workspaceId: string;
      paneId: string;
      kind: TerminalPaneKind;
      cwd: string;
      // Hangi bölme, hangi yönde bölünsün. Yoksa odaktaki bölmenin sağı.
      split?: { targetPaneId: string; dir: SplitDir };
      agent?: AgentSpec;
      title?: string;
      color?: TerminalPaneColor;
      /** Kalıcı bellek açılsın mı (spec 2026-10-18 ajan-bellegi §4); anahtar indirgeyicide türetiliyor. */
      memory?: boolean;
    }
  | {
      type: "addProjectPane";
      paneId: string;
      spareWorkspaceId: string;
      cwd: string;
      nameFor: NameFor;
      sap?: SavedWorkspaceSap;
      shell?: TerminalMode;
      title?: string;
    }
  | { type: "shellAgentStarted"; paneId: string; agent: AgentSpec }
  | { type: "shellAgentEnded"; paneId: string }
  | { type: "setShellAgent"; paneId: string; role: string; memory: boolean }
  | { type: "movePaneToWorkspace"; paneId: string; workspaceId: string }
  | { type: "setPaneRole"; paneId: string; role: string }
  | { type: "closePane"; paneId: string }
  | { type: "restartPane"; paneId: string; cwd?: string }
  | { type: "focusPane"; paneId: string }
  | { type: "toggleMaximize"; paneId: string }
  | { type: "spawnStarted"; paneId: string; token: number }
  | { type: "spawnSucceeded"; paneId: string; token: number; ptyId: string }
  | { type: "spawnFailed"; paneId: string; token: number; message: string; missingDir: boolean }
  | { type: "ptyExit"; ptyId: string; code: number }
  | { type: "ptyData"; ptyId: string }
  | { type: "movePane"; paneId: string; targetPaneId: string; zone: DropZone }
  | { type: "resizeSplit"; workspaceId: string; path: LayoutPath; index: number; delta: number; min: number }
  | { type: "equalizeSplit"; workspaceId: string; path: LayoutPath }
  | { type: "minimizePane"; paneId: string }
  | { type: "restorePane"; paneId: string }
  | { type: "renamePane"; paneId: string; title: string }
  | { type: "setPaneColor"; paneId: string; color: TerminalPaneColor }
  | { type: "setPaneFontSize"; paneId: string; fontSize: number | null }
  | { type: "setWorkspaceRoot"; id: string; root: string | null; sap: SavedWorkspaceSap | null }
  | { type: "setWorkspaceVerify"; id: string; verify: string[] }
  | { type: "setWorkspaceView"; id: string; view: WorkspaceView }
  | { type: "setWorkspaceBrowserUrl"; id: string; url: string }
  | { type: "enablePaneMemory"; paneId: string };
