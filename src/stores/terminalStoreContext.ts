// Terminal modu deposunun bağlamı. Sağlayıcıdan ayrı dosyada: bileşenler
// yalnız bunu içe aktarır, sağlayıcının etkilerini çekmez.
import { createContext, useContext } from "react";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import type { TerminalState } from "./terminalTypes";

export interface TerminalCommands {
  restore: () => void;
  startFresh: () => void;
  addWorkspace: () => void;
  selectWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  closeWorkspace: (id: string) => void;
  /** Seçili alana ekler. */
  addPane: (kind: TerminalPaneKind, cwd: string) => void;
  closePane: (paneId: string) => void;
  restartPane: (paneId: string, cwd?: string) => void;
  focusPane: (paneId: string) => void;
  toggleMaximize: (paneId: string) => void;
}

export interface TerminalStoreValue {
  state: TerminalState;
  commands: TerminalCommands;
  /** Yeni bölme penceresinde önceden seçili tür: son eklenen, yoksa ayarlardaki kabuk. */
  defaultKind: TerminalPaneKind;
  /** Yeni bölme penceresinde önceden dolu klasör. */
  defaultCwd: string;
}

export const TerminalStoreContext = createContext<TerminalStoreValue | null>(null);

export function useTerminalStore(): TerminalStoreValue {
  const value = useContext(TerminalStoreContext);
  if (!value) throw new Error("useTerminalStore yalnızca TerminalStoreProvider içinde kullanılabilir");
  return value;
}
