// Terminal modu deposunun bağlamı. Sağlayıcıdan ayrı dosyada: bileşenler
// yalnız bunu içe aktarır, sağlayıcının etkilerini çekmez.
import { createContext, useContext } from "react";
import type { AgentSpec } from "../../app-electron/shared/agentTypes";
import type { SetupKey } from "../../app-electron/shared/agentEngines";
import type { SavedWorkspaceSap, TerminalMode, TerminalPaneColor, WorkspaceView } from "../../app-electron/shared/types";
import type { DropZone, LayoutPath, SplitDir } from "../../app-electron/shared/terminalTree";
import type { PaneRun, TerminalState } from "./terminalTypes";

/** "+ Ajan" penceresinin çıktısı (spec 2026-10-17 ajan-alani §4). */
export interface NewAgentInput {
  spec: AgentSpec;
  /** Bölme adı olur; boşsa kartta motorun adı. */
  name: string;
  color?: TerminalPaneColor;
  cwd: string;
  /** Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4); anahtar indirgeyicide. */
  memory?: boolean;
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
  /** Tur 7: lider açılışı — verilen alana, verilen kimlikle; yer/alan yoksa false. */
  addAgentAt: (workspaceId: string, paneId: string, input: NewAgentInput) => boolean;
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
  /** Ajanın kalıcı belleğini açar (spec 2026-10-18 ajan-bellegi §4); anahtar addan türetilir. */
  enablePaneMemory: (paneId: string) => void;
  /** Tur 13: kabuk bölmesine rol ve bellek (bölme kabuk kalır; kayıt kalıcı). */
  setShellAgent: (paneId: string, role: string, memory: boolean) => void;
  /** Tur 13: ajan bölmesinin rol etiketi (yeniden başlatma gerekiyorsa çağıran restartPane der). */
  setPaneRole: (paneId: string, role: string) => void;
  /** Tur 13: bölmeyi başka ekibe taşı (süreç korunur); yapılamadıysa false. */
  movePaneToWorkspace: (paneId: string, workspaceId: string) => boolean;
  /**
   * Araçlar → Kur: etkin alanda cmd bölmesi açar, ilk satırı sabit tablodan
   * (`setupLine`). Bölme kimliği; beyaz liste dışı anahtar, aynı motorun süren
   * kurulumu ya da yer yokluğunda null.
   */
  addSetupPane: (key: SetupKey, title: string) => string | null;
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
  /** Araçlar → Kur: motor anahtarı → son kurulum bölmesi (bellekte, diske yazılmıyor). */
  setupRuns: Partial<Record<SetupKey, string>>;
}

export const TerminalStoreContext = createContext<TerminalStoreValue | null>(null);

export function useTerminalStore(): TerminalStoreValue {
  const value = useContext(TerminalStoreContext);
  if (!value) throw new Error("useTerminalStore yalnızca TerminalStoreProvider içinde kullanılabilir");
  return value;
}

/** Kurulum bölmesi hâlâ sürüyor mu: bölme duruyor ve süreci bitmemiş. */
export function setupRunning(state: TerminalState, paneId: string | undefined): boolean {
  if (!paneId) return false;
  for (const w of state.workspaces) {
    const pane = w.panes.find((p) => p.id === paneId);
    if (pane) return isLive(pane.run);
  }
  return false;
}

function isLive(run: PaneRun): boolean {
  return run.state === "queued" || run.state === "starting" || run.state === "running";
}
