// Terminal modunun sağlayıcısı (spec §5): indirgeyiciyi ana süreçteki pty'lere
// bağlar. Kararların hepsi indirgeyicide; burada yalnız yan etkiler var.
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { AppConfig, TerminalMode } from "../../app-electron/shared/types";
import { TERMINAL_MISSING_DIR } from "../../app-electron/shared/terminalLayout";
import { buildAgentCommand, engineBinary } from "../../app-electron/shared/agentEngines";
import { AGENT_ENGINE_MISSING, LEGACY_AXET_AGENT, type AgentEngineInfo, type AgentSpec } from "../../app-electron/shared/agentTypes";
import { ENGINE_LABEL } from "../agents/agentLabels";
import { fromLegacy } from "../../app-electron/shared/terminalTree";
import type { ToastMsg } from "../components/Toast";
import { useT } from "../i18n";
import {
  findPane,
  initialTerminalState,
  isWorkspaceVisible,
  minimizedOf,
  nextToStart,
  paneByPty,
  SPAWN_CONCURRENCY,
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
/**
 * cmd/powershell bölmeler için başlangıç süresi (ms).
 * Bu süre dolmadan gelen çıktı okunmadı noktası koymaz (spec §4).
 * axet bölmelerde terminal:ready sinyali bu rolü üstlenir.
 */
export const STARTUP_GRACE_MS = 1500;

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
    workspaces: workspaces.map((w) => {
      const minimized = (w.minimized ?? []).map((m) => ({ paneId: m.paneId, home: m.home }));
      const hidden = new Set(minimized.map((m) => m.paneId));
      return {
        id: w.id,
        name: w.name,
        panes: w.panes.map((p) => ({
          id: p.id,
          kind: p.kind,
          cwd: p.cwd,
          title: p.title ?? null,
          color: p.color ?? null,
          fontSize: p.fontSize ?? null,
          agent: p.agent ?? null
        })),
        // Ağaçsız eski kayıt, geri yüklenince kurulan ağaçla aynı sayılıyor:
        // yalnız geri yüklemek diske yazma tetiklemiyor.
        layout: w.layout !== undefined ? w.layout : fromLegacy(w.panes.filter((p) => !hidden.has(p.id)).map((p) => p.id)),
        minimized,
        root: w.root ?? null,
        sap: w.sap ?? null,
        verify: w.verify ?? [],
        view: w.view ?? null
      };
    }),
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
  const [lastKind, setLastKind] = useState<TerminalMode | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const tRef = useRef(t);
  tRef.current = t;
  /** Kurulu motorlar (spec §3). `null`: henüz bilinmiyor → ajan bölmesi bekliyor. */
  const [engines, setEngines] = useState<AgentEngineInfo[] | null>(null);
  /** "+ Ajan" ile eklenen, henüz kaydı yapılmamış bölmeler (günlükte `ajan.eklendi`). */
  const freshAgents = useRef(new Set<string>());
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
  /**
   * terminal:ready sinyali beklenen axet pty kimlikleri.
   * Bu kümede kalan her kimlik SPAWN_CONCURRENCY sınırına bir yuva olarak sayılır
   * (spec §5.1): createTerminal çabuk döner ama asıl axet-code başlangıcı gecikmeli.
   */
  const bootingAgentPtyIds = useRef(new Set<string>());
  /**
   * bootingAgentPtyIds küme boyutunun durum kopyası; spawn etkisini yeniden
   * tetiklemek için gerekli (ref değişimi etki bağımlılık listesini uyandırmıyor).
   */
  const [bootingAgentCount, setBootingAgentCount] = useState(0);
  /** `createTerminal` dönmeden gelen terminal:ready kimlikleri (earlyExits gibi). */
  const earlyReady = useRef(new Set<string>());
  /**
   * Başlangıç aşamasındaki pty kimlikleri: bu dönemde gelen çıktı okunmadı
   * noktası koymaz (spec §4). axet için terminal:ready, cmd/powershell için
   * STARTUP_GRACE_MS geçince kümeden çıkarılır.
   */
  const startupPtyIds = useRef(new Set<string>());

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
      // Başlangıç aşamasındaki çıktı okunmadı işareti koymaz (spec §4).
      if (startupPtyIds.current.has(ptyId)) return;
      dispatch({ type: "ptyData", ptyId });
    });
    const offExit = window.api.onTerminalExit((ptyId, code) => {
      if (ptyOwners.current.has(ptyId)) {
        dispatch({ type: "ptyExit", ptyId, code });
        // Çıkan pty hâlâ önyükleme/başlangıç aşamasındaysa temizle.
        startupPtyIds.current.delete(ptyId);
        if (bootingAgentPtyIds.current.delete(ptyId)) {
          setBootingAgentCount((c) => c - 1);
        }
        return;
      }
      if (earlyExits.current.size >= EARLY_EXIT_LIMIT) {
        const oldest = earlyExits.current.keys().next().value;
        if (oldest !== undefined) earlyExits.current.delete(oldest);
      }
      earlyExits.current.set(ptyId, code);
    });
    // axet-code ekranını çizince (ya da 8 s sonra) ana süreç bu sinyali gönderir.
    const offReady = window.api.onTerminalReady((ptyId) => {
      if (!bootingAgentPtyIds.current.delete(ptyId)) {
        // Henüz sahiplenilmemiş kimlik: createTerminal dönünce yuva hiç tutulmasın.
        if (!ptyOwners.current.has(ptyId)) {
          if (earlyReady.current.size >= EARLY_EXIT_LIMIT) {
            const oldest = earlyReady.current.values().next().value;
            if (oldest !== undefined) earlyReady.current.delete(oldest);
          }
          earlyReady.current.add(ptyId);
        }
        return;
      }
      setBootingAgentCount((c) => c - 1);
      // axet başlangıç kipi sona erdi; artık çıktı okunmadı işareti koyabilir.
      startupPtyIds.current.delete(ptyId);
    });
    return () => {
      offData();
      offExit();
      offReady();
    };
  }, []);

  useEffect(() => {
    dispatch({ type: "setVisible", visible });
  }, [visible]);

  // Motorların kurulu olup olmadığı. Sorulamazsa boş liste: hiçbir motor
  // engellenmiyor (IPC arızası ajanları kilitlemesin; kabuk zaten hata söyler).
  useEffect(() => {
    if (!cleaned) return;
    let alive = true;
    window.api.agentEngines().then(
      (list) => {
        if (alive) setEngines(list);
      },
      () => {
        if (alive) setEngines([]);
      }
    );
    return () => {
      alive = false;
    };
  }, [cleaned]);

  // Mod ilk kez görününce kayıtlı düzen okunuyor.
  useEffect(() => {
    if (!visible || !config || state.phase !== "closed") return;
    // Alanlar yeniden başlatılmamış eski bir ana süreçten gelen config'te yok;
    // boş liste gibi davranılıyor, mod çökmüyor.
    const saved = Array.isArray(config.terminalWorkspaces) ? config.terminalWorkspaces : [];
    const activeId = config.terminalActiveWorkspaceId ?? null;
    if (lastWritten.current === null) {
      lastWritten.current = signature(saved, activeId);
    }
    dispatch({
      type: "open",
      saved,
      activeId,
      freshId: crypto.randomUUID(),
      nameFor: nameForRef.current
    });
  }, [visible, config, state.phase]);

  // 2. Başlatma.
  useEffect(() => {
    if (!cleaned || !config) return;
    for (const pane of nextToStart(state, SPAWN_CONCURRENCY, bootingAgentCount)) {
      if (spawnTokens.current.has(pane.id)) continue;
      // Motorların kurulu olup olmadığı bilinmeden ajan başlamıyor.
      if (pane.kind === "agent" && engines === null) continue;
      const token = ++spawnSeq.current;
      spawnTokens.current.set(pane.id, token);
      dispatch({ type: "spawnStarted", paneId: pane.id, token });
      // Ajan bölmesi seçilen kabukta açılıyor, motorun komutu ilk satır
      // (spec 2026-10-17 ajan-alani §5): motor kapansa da bölme kabukta kalır.
      const spec: AgentSpec | null = pane.kind === "agent" ? (pane.agent ?? LEGACY_AXET_AGENT) : null;
      const isAgent = spec !== null;
      const shell: TerminalMode = pane.kind === "agent" ? config.terminal : pane.kind;
      const command = spec ? buildAgentCommand(spec, config.axetCommand || "") : undefined;

      const fail = (message: string) => {
        if (spawnTokens.current.get(pane.id) !== token) return;
        spawnTokens.current.delete(pane.id);
        dispatch({ type: "spawnFailed", paneId: pane.id, token, message, missingDir: message.includes(TERMINAL_MISSING_DIR) });
      };

      const register = (ptyId: string) => {
        if (!spec) return;
        const owner = findPane(stateRef.current, pane.id);
        void window.api
          .agentRegister({
            paneId: pane.id,
            ptyId,
            engine: spec.engine,
            cwd: pane.cwd,
            command: command ?? "",
            name: pane.title ?? tRef.current(ENGINE_LABEL[spec.engine]),
            roleKind: spec.roleKind,
            sap: Boolean(owner?.workspace.sap),
            added: freshAgents.current.delete(pane.id),
            role: spec.role,
            ...(owner ? { workspaceId: owner.workspace.id } : {})
          })
          .catch(() => {});
      };

      const launch = () => {
        window.api.createTerminal(pane.cwd, INITIAL_COLS, INITIAL_ROWS, shell, command, { createDir: false }).then(
          (ptyId) => {
            if (spawnTokens.current.get(pane.id) !== token) {
              void window.api.disposeTerminal(ptyId).catch(() => {});
              return;
            }
            spawnTokens.current.delete(pane.id);
            ptyOwners.current.set(ptyId, pane.id);
            dispatch({ type: "spawnSucceeded", paneId: pane.id, token, ptyId });
            const code = earlyExits.current.get(ptyId);
            const readyEarly = earlyReady.current.delete(ptyId);
            if (code !== undefined) {
              // Süreç çoktan kapandı: başlangıç kipi de yuva da tutulmuyor.
              earlyExits.current.delete(ptyId);
              dispatch({ type: "ptyExit", ptyId, code });
              return;
            }
            register(ptyId);
            // Başlangıç kipi: bu sürede çıktı okunmadı işareti koymaz (spec §4).
            if (isAgent && readyEarly) return; // ajan zaten hazır; yuva tutulmuyor
            startupPtyIds.current.add(ptyId);
            if (isAgent) {
              // Ajan için terminal:ready gelene kadar yuva meşgul kalıyor (spec §5.1).
              bootingAgentPtyIds.current.add(ptyId);
              setBootingAgentCount((c) => c + 1);
            } else {
              // cmd/powershell için STARTUP_GRACE_MS sonra başlangıç kipi biter.
              setTimeout(() => startupPtyIds.current.delete(ptyId), STARTUP_GRACE_MS);
            }
          },
          (error: unknown) => fail(ipcMessage(error))
        );
      };

      // Kurulu olmayan (ya da bozuk) motor: kabuk açılmıyor (spec §10).
      if (spec && engines?.some((e) => e.id === spec.engine && e.blocked)) {
        fail(AGENT_ENGINE_MISSING);
        continue;
      }
      // Özel komut ajan başına farklı: ilk parçası PATH'te aranıyor.
      if (spec?.engine === "ozel") {
        window.api.agentWhich(engineBinary(spec) ?? "").then(
          (found) => (found ? launch() : fail(AGENT_ENGINE_MISSING)),
          () => launch()
        );
        continue;
      }
      launch();
    }
  }, [state, cleaned, config, bootingAgentCount, engines]);

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
      if (pane.kind === "agent") void window.api.agentUnregister(pane.id).catch(() => {});
      const ptyId = ptyOf(pane);
      if (!ptyId) return;
      ptyOwners.current.delete(ptyId);
      void window.api.disposeTerminal(ptyId).catch(() => {});
      // Kapatılan/yeniden başlatılan bölmenin başlangıç kipi ve önyükleme yuvası temizleniyor.
      startupPtyIds.current.delete(ptyId);
      if (bootingAgentPtyIds.current.delete(ptyId)) {
        setBootingAgentCount((c) => c - 1);
      }
    };
    return {
      restore: () => dispatch({ type: "restore", nameFor: nameForRef.current }),
      startFresh: () => dispatch({ type: "startFresh", freshId: crypto.randomUUID(), nameFor: nameForRef.current }),
      addWorkspace: () => dispatch({ type: "addWorkspace", id: crypto.randomUUID(), nameFor: nameForRef.current }),
      selectWorkspace: (id) => dispatch({ type: "selectWorkspace", id }),
      renameWorkspace: (id, name) => dispatch({ type: "renameWorkspace", id, name }),
      closeWorkspace: (id) => {
        panesOf(stateRef.current, id).forEach(release);
        // Kullanıcının açık kapatması: panosu da silinir (onay penceresi görev
        // sayısını söylüyor). "Boş başla" bu yoldan geçmez, pano silmez.
        try {
          void window.api.boardDropWorkspace(id).catch(() => {});
        } catch {
          // kanal yoksa pano diskte öksüz kalır
        }
        dispatch({ type: "closeWorkspace", id, freshId: crypto.randomUUID(), nameFor: nameForRef.current });
      },
      addPane: (kind, cwd, split) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        setLastKind(kind);
        dispatch({ type: "addPane", workspaceId, paneId: crypto.randomUUID(), kind, cwd, split });
      },
      addAgent: (input, split) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        const paneId = crypto.randomUUID();
        freshAgents.current.add(paneId);
        dispatch({
          type: "addPane",
          workspaceId,
          paneId,
          kind: "agent",
          cwd: input.cwd,
          split,
          agent: input.spec,
          title: input.name,
          color: input.color
        });
      },
      revealPane: (paneId) => {
        const found = findPane(stateRef.current, paneId);
        if (!found) return;
        dispatch({ type: "selectWorkspace", id: found.workspace.id });
        if (minimizedOf(found.workspace).some((m) => m.paneId === paneId)) dispatch({ type: "restorePane", paneId });
        else dispatch({ type: "focusPane", paneId });
      },
      setWorkspaceRoot: (id, root, sap) => dispatch({ type: "setWorkspaceRoot", id, root, sap }),
      setWorkspaceVerify: (id, verify) => dispatch({ type: "setWorkspaceVerify", id, verify }),
      setWorkspaceView: (id, view) => dispatch({ type: "setWorkspaceView", id, view }),
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
      toggleMaximize: (paneId) => dispatch({ type: "toggleMaximize", paneId }),
      // Küçültmede süreç kapanmıyor: `release` yok.
      movePane: (paneId, targetPaneId, zone) => dispatch({ type: "movePane", paneId, targetPaneId, zone }),
      resizeSplit: (workspaceId, path, index, delta, min) => dispatch({ type: "resizeSplit", workspaceId, path, index, delta, min }),
      equalizeSplit: (workspaceId, path) => dispatch({ type: "equalizeSplit", workspaceId, path }),
      minimizePane: (paneId) => dispatch({ type: "minimizePane", paneId }),
      restorePane: (paneId) => dispatch({ type: "restorePane", paneId }),
      renamePane: (paneId, title) => dispatch({ type: "renamePane", paneId, title }),
      setPaneColor: (paneId, color) => dispatch({ type: "setPaneColor", paneId, color }),
      setPaneFontSize: (paneId, fontSize) => dispatch({ type: "setPaneFontSize", paneId, fontSize })
    };
  }, []);

  const activePanes = panesOf(state, state.activeWorkspaceId ?? "");
  const defaultKind: TerminalMode = lastKind ?? config?.terminal ?? "cmd";
  const defaultCwd = activePanes[activePanes.length - 1]?.cwd ?? config?.projectsBaseDir ?? "";
  const activeRoot = state.workspaces.find((w) => w.id === state.activeWorkspaceId)?.root;
  const agentCwd = activeRoot || config?.axetWorkspaceDir || defaultCwd;
  const value = useMemo(
    () => ({ state, commands, defaultKind, defaultCwd, agentCwd }),
    [state, commands, defaultKind, defaultCwd, agentCwd]
  );

  return <TerminalStoreContext.Provider value={value}>{children}</TerminalStoreContext.Provider>;
}
