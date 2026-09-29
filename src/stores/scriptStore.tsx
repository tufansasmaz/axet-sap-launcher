import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
import type { GuiScriptConnectionInfo, GuiScriptSessionInfo } from "../../app-electron/shared/types";
import type { NodeState, SelectedSession } from "./scriptTypes";

// Script ekranının AĞAÇ verisinin sahibi (grafit, spec §5.2). Ekran
// (`SapGuiScriptingHome`) başka bir moda geçilince unmount oluyor. Veri
// burada durduğu için seçili oturum ve açık düğümler dönüşte kaybolmuyor.
// Köprüyle konuşan HİÇBİR ŞEY burada değil: ekran kapalıyken arka planda
// istek atılmıyor.

export type ConnectionsState = GuiScriptConnectionInfo[] | "loading" | "error" | null;
export type SessionsByConn = Record<number, GuiScriptSessionInfo[] | "loading" | "error">;

// Köprüye dokunan işler ekranda kalıyor. Ekran bunları
// `registerScriptCommands` ile bırakıyor, kenar çubuğu `useScriptCommands`
// ile çağırıyor.
export interface ScriptCommands {
  selectSession(connIdx: number, sessIdx: number): void;
  toggleConn(connIdx: number): void;
  toggleNode(elementId: string): void;
  selectElement(elementId: string): void;
}

export interface ScriptStore {
  connections: ConnectionsState;
  setConnections: Dispatch<SetStateAction<ConnectionsState>>;
  sessionsByConn: SessionsByConn;
  setSessionsByConn: Dispatch<SetStateAction<SessionsByConn>>;
  expandedConn: Record<number, boolean>;
  setExpandedConn: Dispatch<SetStateAction<Record<number, boolean>>>;
  activeSession: SelectedSession | null;
  setActiveSession: Dispatch<SetStateAction<SelectedSession | null>>;
  nodesByKey: Record<string, NodeState>;
  setNodesByKey: Dispatch<SetStateAction<Record<string, NodeState>>>;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: Dispatch<SetStateAction<Record<string, boolean>>>;
  selectedElementId: string;
  setSelectedElementId: Dispatch<SetStateAction<string>>;
  // Köprü çalışıyor ve teşhis ekranı gösterilmiyor mu? Ekran yazıyor, kenar
  // çubuğu okuyor. false iken ağaç yerine "Köprü kapalı" çiziliyor.
  treeVisible: boolean;
  setTreeVisible: Dispatch<SetStateAction<boolean>>;
  clearSelection(): void;
  registerScriptCommands(commands: ScriptCommands): () => void;
}

interface ScriptStoreContextValue extends ScriptStore {
  commands: ScriptCommands;
}

const ScriptStoreContext = createContext<ScriptStoreContextValue | null>(null);

export function ScriptStoreProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<ConnectionsState>(null);
  const [sessionsByConn, setSessionsByConn] = useState<SessionsByConn>({});
  const [expandedConn, setExpandedConn] = useState<Record<number, boolean>>({});
  const [activeSession, setActiveSession] = useState<SelectedSession | null>(null);
  const [nodesByKey, setNodesByKey] = useState<Record<string, NodeState>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedElementId, setSelectedElementId] = useState("");
  const [treeVisible, setTreeVisible] = useState(false);

  // Seçili oturuma bağlı her şey birlikte gidiyor. Yarım bir temizlik
  // (örneğin seçili öğe kalıp oturum gitse) denetçiyi var olmayan bir
  // öğeyi göstermeye bırakırdı.
  const clearSelection = useCallback(() => {
    setActiveSession(null);
    setNodesByKey({});
    setExpandedNodes({});
    setSelectedElementId("");
  }, []);

  // Kayıtlı komutlar bir ref'te: kenar çubuğunun elindeki aracı (`commands`)
  // hiç değişmiyor, her çağrıda o anki kaydı okuyor. Kayıt yokken çağrı
  // hiçbir şey yapmıyor.
  const registeredRef = useRef<ScriptCommands | null>(null);
  const registerScriptCommands = useCallback((next: ScriptCommands) => {
    registeredRef.current = next;
    return () => {
      // Yalnızca HÂLÂ bu kayıt duruyorsa temizle: yeniden çizimde yeni kayıt
      // eskisinin iptalinden önce gelirse, eski iptal yeniyi silmesin.
      if (registeredRef.current === next) registeredRef.current = null;
    };
  }, []);
  const commands = useMemo<ScriptCommands>(
    () => ({
      selectSession: (connIdx, sessIdx) => registeredRef.current?.selectSession(connIdx, sessIdx),
      toggleConn: (connIdx) => registeredRef.current?.toggleConn(connIdx),
      toggleNode: (elementId) => registeredRef.current?.toggleNode(elementId),
      selectElement: (elementId) => registeredRef.current?.selectElement(elementId)
    }),
    []
  );

  const value = useMemo<ScriptStoreContextValue>(
    () => ({
      connections,
      setConnections,
      sessionsByConn,
      setSessionsByConn,
      expandedConn,
      setExpandedConn,
      activeSession,
      setActiveSession,
      nodesByKey,
      setNodesByKey,
      expandedNodes,
      setExpandedNodes,
      selectedElementId,
      setSelectedElementId,
      treeVisible,
      setTreeVisible,
      clearSelection,
      registerScriptCommands,
      commands
    }),
    [
      connections,
      sessionsByConn,
      expandedConn,
      activeSession,
      nodesByKey,
      expandedNodes,
      selectedElementId,
      treeVisible,
      clearSelection,
      registerScriptCommands,
      commands
    ]
  );

  return <ScriptStoreContext.Provider value={value}>{children}</ScriptStoreContext.Provider>;
}

function useScriptStoreContext(): ScriptStoreContextValue {
  const value = useContext(ScriptStoreContext);
  if (!value) throw new Error("useScriptStore yalnızca ScriptStoreProvider içinde kullanılabilir");
  return value;
}

export function useScriptStore(): ScriptStore {
  return useScriptStoreContext();
}

export function useScriptCommands(): ScriptCommands {
  return useScriptStoreContext().commands;
}
