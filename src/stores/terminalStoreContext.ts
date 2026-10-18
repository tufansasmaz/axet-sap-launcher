// Terminal modu deposunun bağlamı. Sağlayıcıdan ayrı dosyada: bileşenler
// yalnız bunu içe aktarır, sağlayıcının etkilerini çekmez.
import { createContext, useContext } from "react";
import type { AgentSpec } from "../../app-electron/shared/agentTypes";
import type { SavedWorkspaceSap, TerminalMode, TerminalPaneColor, WorkspaceView } from "../../app-electron/shared/types";
import type { DropZone, LayoutPath, SplitDir } from "../../app-electron/shared/terminalTree";
import type { TerminalState } from "./terminalTypes";

/** "+ Ajan" penceresinin çıktısı (spec 2026-10-17 ajan-alani §4). */
export interface NewAgentInput {
  spec: AgentSpec;
  /** Bölme adı olur; boşsa kartta motorun adı. */
  name: string;
  color?: TerminalPaneColor;
  cwd: string;
}

export interface TerminalCommands {
  restore: () => void;
  startFresh: () => void;
  addWorkspace: () => void;
  selectWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  closeWorkspace: (id: string) => void;
  /** Seçili alana düz kabuk ekler. `split` verilirse o bölmeyi o yönde böler; yoksa odaktakinin sağı. */
  addPane: (kind: TerminalMode, cwd: string, split?: { targetPaneId: string; dir: SplitDir }) => void;
  /** Seçili alana ajan bölmesi ekler (spec §4). */
  addAgent: (input: NewAgentInput, split?: { targetPaneId: string; dir: SplitDir }) => void;
  /** Bölmenin alanını seçer; şeritteyse geri getirir, değilse odaklar (kart, Kararlar, bildirim). */
  revealPane: (paneId: string) => void;
  /** Alanın kökü ve SAP bağı; `null` kaldırır (spec §3). */
  setWorkspaceRoot: (id: string, root: string | null, sap: SavedWorkspaceSap | null) => void;
  closePane: (paneId: string) => void;
  restartPane: (paneId: string, cwd?: string) => void;
  focusPane: (paneId: string) => void;
  toggleMaximize: (paneId: string) => void;
  movePane: (paneId: string, targetPaneId: string, zone: DropZone) => void;
  resizeSplit: (workspaceId: string, path: LayoutPath, index: number, delta: number, min: number) => void;
  equalizeSplit: (workspaceId: string, path: LayoutPath) => void;
  minimizePane: (paneId: string) => void;
  restorePane: (paneId: string) => void;
  renamePane: (paneId: string, title: string) => void;
  setPaneColor: (paneId: string, color: TerminalPaneColor) => void;
  /** `null` varsayılana döndürür. */
  setPaneFontSize: (paneId: string, fontSize: number | null) => void;
  /** Görev panosunun doğrulama komutları (spec 2026-10-18 gorev-panosu §2). */
  setWorkspaceVerify: (id: string, verify: string[]) => void;
  /** Ajanlar ekranında Bölmeler | Pano | Ofis (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2). */
  setWorkspaceView: (id: string, view: WorkspaceView) => void;
  /** Tarayıcının son adresi (spec 2026-10-18 tarayici §2); geçersizse yok sayılır. */
  setWorkspaceBrowserUrl: (id: string, url: string) => void;
}

export interface TerminalStoreValue {
  state: TerminalState;
  commands: TerminalCommands;
  /** Yeni bölme penceresinde önceden seçili tür: son eklenen, yoksa ayarlardaki kabuk. */
  defaultKind: TerminalMode;
  /** Yeni bölme penceresinde önceden dolu klasör. */
  defaultCwd: string;
  /** Yeni ajanın klasörü: seçili alanın kökü, yoksa axet çalışma klasörü. */
  agentCwd: string;
}

export const TerminalStoreContext = createContext<TerminalStoreValue | null>(null);

export function useTerminalStore(): TerminalStoreValue {
  const value = useContext(TerminalStoreContext);
  if (!value) throw new Error("useTerminalStore yalnızca TerminalStoreProvider içinde kullanılabilir");
  return value;
}
