// Terminal modunun sağlayıcısı (spec §5): indirgeyiciyi ana süreçteki pty'lere
// bağlar. Kararların hepsi indirgeyicide; burada yalnız yan etkiler var.
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { AppConfig, TerminalPaneKind } from "../../app-electron/shared/types";
import { TERMINAL_MISSING_DIR } from "../../app-electron/shared/terminalLayout";
import type { ToastMsg } from "../components/Toast";
import { useT } from "../i18n";
import {
  findPane,
  initialTerminalState,
  isWorkspaceVisible,
  nextToStart,
  paneByPty,
  terminalReducer,
  toSaved
} from "./terminalReducer";
import { TerminalStoreContext, type TerminalCommands } from "./terminalStoreContext";
import type { NameFor, TerminalPane, TerminalState } from "./terminalTypes";

/** Bölme ilk açılırken pty boyutu; xterm sığdırınca hemen yeniden boyutlanıyor. */
const INITIAL_COLS = 120;
const INITIAL_ROWS = 30;
/** Sahibi belli olmadan gelen çıkışlardan en çok bu kadarı tutulur. */
const EARLY_EXIT_LIMIT = 100;

interface TerminalStoreProviderProps {
  config: AppConfig | null;
  /** Terminal modu ekranda mı. */
  visible: boolean;
  /** "Proje terminali aç" sayacı: her artışta bir AXET bölmesi. */
  projectRequest: number;
  pushToast: (kind: ToastMsg["kind"], text: string) => void;
  onConfigSaved: (config: AppConfig) => void;
  children: ReactNode;
}

/** Kaydedilen düzenin karşılaştırma imzası; alan sırası sabit. */
function signature(workspaces: AppConfig["terminalWorkspaces"], activeId: string | null): string {
  return JSON.stringify({
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      panes: w.panes.map((p) => ({ id: p.id, kind: p.kind, cwd: p.cwd }))
    })),
    activeId
  });
}

/** IPC'nin eklediği "Error invoking remote method '…': Error: " önekini atar. */
function ipcMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");
}

function panesOf(state: TerminalState, workspaceId: string): TerminalPane[] {
  return state.workspaces.find((w) => w.id === workspaceId)?.panes ?? [];
}

function ptyOf(pane: TerminalPane): string | null {
  return pane.run.state === "running" || pane.run.state === "exited" ? pane.run.ptyId : null;
}

export function TerminalStoreProvider({
  config,
  visible,
  projectRequest,
  pushToast,
  onConfigSaved,
  children
}: TerminalStoreProviderProps) {
  const t = useT();
  const [state, dispatch] = useReducer(terminalReducer, initialTerminalState);
  const [cleaned, setCleaned] = useState(false);
  const [lastKind, setLastKind] = useState<TerminalPaneKind | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const configRef = useRef(config);
  configRef.current = config;
  const nameForRef = useRef<NameFor>((n) => String(n));
  nameForRef.current = (n) => t("terminal.workspaceName", { n });

  const cleanupStarted = useRef(false);
  const spawnSeq = useRef(0);
  /** Başlamakta olan bölme → deneme numarası. Kapatma/yeniden başlatma siler. */
  const spawnTokens = useRef(new Map<string, number>());
  /** Tanınan pty → bölme. */
  const ptyOwners = useRef(new Map<string, string>());
  /** `createTerminal` dönmeden gelen çıkışlar. */
  const earlyExits = useRef(new Map<string, number>());
  const lastWritten = useRef<string | null>(null);
  const handledProjectRequest = useRef(projectRequest);
  const seenLimitHits = useRef(0);

  // 1. Ctrl+R sonrası eski kabuklar: ref, StrictMode'un ikinci çalıştırmasında da tutuyor.
  useEffect(() => {
    if (cleanupStarted.current) return;
    cleanupStarted.current = true;
    window.api
      .disposeAllTerminals()
      .catch(() => {})
      .then(() => setCleaned(true));
  }, []);

  // 3. Olaylar.
  useEffect(() => {
    const offData = window.api.onTerminalData((ptyId) => {
      const current = stateRef.current;
      const found = paneByPty(current, ptyId);
      if (!found || found.workspace.unread || isWorkspaceVisible(current, found.workspace.id)) return;
      dispatch({ type: "ptyData", ptyId });
    });
    const offExit = window.api.onTerminalExit((ptyId, code) => {
      if (ptyOwners.current.has(ptyId)) {
        dispatch({ type: "ptyExit", ptyId, code });
        return;
      }
      if (earlyExits.current.size >= EARLY_EXIT_LIMIT) {
        const oldest = earlyExits.current.keys().next().value;
        if (oldest !== undefined) earlyExits.current.delete(oldest);
      }
      earlyExits.current.set(ptyId, code);
    });
    return () => {
      offData();
      offExit();
    };
  }, []);

  useEffect(() => {
    dispatch({ type: "setVisible", visible });
  }, [visible]);

  // Mod ilk kez görününce kayıtlı düzen okunuyor.
  useEffect(() => {
    if (!visible || !config || state.phase !== "closed") return;
    if (lastWritten.current === null) {
      lastWritten.current = signature(config.terminalWorkspaces, config.terminalActiveWorkspaceId);
    }
    dispatch({
      type: "open",
      saved: config.terminalWorkspaces,
      activeId: config.terminalActiveWorkspaceId,
      freshId: crypto.randomUUID(),
      nameFor: nameForRef.current
    });
  }, [visible, config, state.phase]);

  // 2. Başlatma.
  useEffect(() => {
    if (!cleaned || !config) return;
    for (const pane of nextToStart(state)) {
      if (spawnTokens.current.has(pane.id)) continue;
      const token = ++spawnSeq.current;
      spawnTokens.current.set(pane.id, token);
      dispatch({ type: "spawnStarted", paneId: pane.id, token });
      const shell = pane.kind === "axet" ? config.terminal : pane.kind;
      const command = pane.kind === "axet" ? config.axetCommand || "axet-code -y" : undefined;
      window.api
        .createTerminal(pane.cwd, INITIAL_COLS, INITIAL_ROWS, shell, command, { createDir: false })
        .then(
          (ptyId) => {
            if (spawnTokens.current.get(pane.id) !== token) {
              void window.api.disposeTerminal(ptyId).catch(() => {});
              return;
            }
            spawnTokens.current.delete(pane.id);
            ptyOwners.current.set(ptyId, pane.id);
            dispatch({ type: "spawnSucceeded", paneId: pane.id, token, ptyId });
            const code = earlyExits.current.get(ptyId);
            if (code !== undefined) {
              earlyExits.current.delete(ptyId);
              dispatch({ type: "ptyExit", ptyId, code });
            }
          },
          (error: unknown) => {
            if (spawnTokens.current.get(pane.id) !== token) return;
            spawnTokens.current.delete(pane.id);
            const message = ipcMessage(error);
            dispatch({
              type: "spawnFailed",
              paneId: pane.id,
              token,
              message,
              missingDir: message.includes(TERMINAL_MISSING_DIR)
            });
          }
        );
    }
  }, [state, cleaned, config]);

  // 4. Kalıcılık: yalnız düzen değişince.
  useEffect(() => {
    if (state.phase !== "ready") return;
    const saved = toSaved(state);
    const next = signature(saved.workspaces, saved.activeId);
    if (next === lastWritten.current) return;
    lastWritten.current = next;
    window.api
      .saveConfig({ terminalWorkspaces: saved.workspaces, terminalActiveWorkspaceId: saved.activeId })
      .then(onConfigSaved)
      .catch(() => {});
  }, [state, onConfigSaved]);

  // 5. Proje bölmesi.
  useEffect(() => {
    if (projectRequest <= handledProjectRequest.current) return;
    handledProjectRequest.current = projectRequest;
    const current = configRef.current;
    dispatch({
      type: "addProjectPane",
      paneId: crypto.randomUUID(),
      spareWorkspaceId: crypto.randomUUID(),
      cwd: current?.axetWorkspaceDir || current?.projectsBaseDir || "",
      nameFor: nameForRef.current
    });
  }, [projectRequest]);

  // 6. Sınır bildirimi.
  useEffect(() => {
    if (state.limitHits > seenLimitHits.current) pushToast("error", t("terminal.workspaceLimitReached"));
    seenLimitHits.current = state.limitHits;
  }, [state.limitHits, pushToast, t]);

  const commands = useMemo<TerminalCommands>(() => {
    /** Bölmenin süreci varsa kapatır, izlerini siler. */
    const release = (pane: TerminalPane) => {
      spawnTokens.current.delete(pane.id);
      const ptyId = ptyOf(pane);
      if (!ptyId) return;
      ptyOwners.current.delete(ptyId);
      void window.api.disposeTerminal(ptyId).catch(() => {});
    };
    return {
      restore: () => dispatch({ type: "restore", nameFor: nameForRef.current }),
      startFresh: () => dispatch({ type: "startFresh", freshId: crypto.randomUUID(), nameFor: nameForRef.current }),
      addWorkspace: () => dispatch({ type: "addWorkspace", id: crypto.randomUUID(), nameFor: nameForRef.current }),
      selectWorkspace: (id) => dispatch({ type: "selectWorkspace", id }),
      renameWorkspace: (id, name) => dispatch({ type: "renameWorkspace", id, name }),
      closeWorkspace: (id) => {
        panesOf(stateRef.current, id).forEach(release);
        dispatch({ type: "closeWorkspace", id, freshId: crypto.randomUUID(), nameFor: nameForRef.current });
      },
      addPane: (kind, cwd) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        setLastKind(kind);
        dispatch({ type: "addPane", workspaceId, paneId: crypto.randomUUID(), kind, cwd });
      },
      closePane: (paneId) => {
        const found = findPane(stateRef.current, paneId);
        if (found) release(found.pane);
        dispatch({ type: "closePane", paneId });
      },
      restartPane: (paneId, cwd) => {
        const found = findPane(stateRef.current, paneId);
        if (found) release(found.pane);
        dispatch({ type: "restartPane", paneId, cwd });
      },
      focusPane: (paneId) => dispatch({ type: "focusPane", paneId }),
      toggleMaximize: (paneId) => dispatch({ type: "toggleMaximize", paneId })
    };
  }, []);

  const activePanes = panesOf(state, state.activeWorkspaceId ?? "");
  const defaultKind: TerminalPaneKind = lastKind ?? config?.terminal ?? "cmd";
  const defaultCwd = activePanes[activePanes.length - 1]?.cwd ?? config?.projectsBaseDir ?? "";
  const value = useMemo(
    () => ({ state, commands, defaultKind, defaultCwd }),
    [state, commands, defaultKind, defaultCwd]
  );

  return <TerminalStoreContext.Provider value={value}>{children}</TerminalStoreContext.Provider>;
}
