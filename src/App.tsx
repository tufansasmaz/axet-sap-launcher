import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  RefreshCw,
  Settings,
  AlertTriangle,
  Plus,
  Download,
  Sun,
  Moon,
  X,
  TerminalSquare,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Server,
  FolderTree,
  Languages
} from "lucide-react";
import type {
  AppConfig,
  AppTheme,
  ConnectivityState,
  FsEntry,
  SapLandscape,
  SapService,
  SystemTier
} from "../app-electron/shared/types";
import TitleBar from "./components/TitleBar";
import Tree from "./components/Tree";
import RecentSystems from "./components/RecentSystems";
import SystemPanel from "./components/SystemPanel";
import SettingsModal from "./components/SettingsModal";
import CredentialsModal from "./components/CredentialsModal";
import AddSystemModal, { type EditingManualSystem } from "./components/AddSystemModal";
import ConfirmDialog from "./components/ConfirmDialog";
import Toast, { type ToastMsg } from "./components/Toast";
import TerminalPanel, { type TerminalSessionInfo } from "./components/TerminalPanel";
import FileExplorer from "./components/FileExplorer";
import FileViewer from "./components/FileViewer";
import { flattenLandscape } from "./lib/landscape";
import { LanguageProvider, translate } from "./i18n";

const MIN_TERMINAL_HEIGHT = 160;
const MAX_TERMINAL_HEIGHT = 720;
const DEFAULT_TERMINAL_HEIGHT = 320;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 320;
const COLLAPSED_SIDEBAR_WIDTH = 44;

interface OpenFileTab {
  path: string;
  name: string;
}

interface Selection {
  path: string[];
  service: SapService;
  itemUuid: string;
}

let toastSeq = 0;
const CONNECTIVITY_SCAN_CONCURRENCY = 5;

export default function App() {
  const [landscape, setLandscape] = useState<SapLandscape | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [connectivity, setConnectivity] = useState<Record<string, ConnectivityState>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [credentialsTarget, setCredentialsTarget] = useState<Selection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<EditingManualSystem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SapService | null>(null);
  const [pendingSelectUuid, setPendingSelectUuid] = useState<string | null>(null);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSessionInfo[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [terminalPanelOpen, setTerminalPanelOpen] = useState(false);
  const [terminalPanelHeight, setTerminalPanelHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [terminalFullscreen, setTerminalFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<"systems" | "files">("systems");
  const [openFiles, setOpenFiles] = useState<OpenFileTab[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const scanGenerationRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pendingConnectivityRef = useRef<Record<string, ConnectivityState>>({});
  const flushTimerRef = useRef<number | null>(null);
  const pendingTerminalTitlesRef = useRef<Map<string, string>>(new Map());
  const manualTerminalCounterRef = useRef(0);

  const language = config?.language ?? "tr";
  const t = useCallback(
    (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
      translate(language, key, params),
    [language]
  );

  const flushConnectivity = useCallback(() => {
    flushTimerRef.current = null;
    const pending = pendingConnectivityRef.current;
    pendingConnectivityRef.current = {};
    if (Object.keys(pending).length === 0) return;
    setConnectivity((prev) => ({ ...prev, ...pending }));
  }, []);

  // Bir landscape'te yüzlerce sistem varsa, her birinin connectivity sonucu
  // için ayrı ayrı setState çağırmak App'in (ve altındaki tüm ağacın) her
  // sonuçta bir kez yeniden render olmasına yol açardı — 100+ sistemli bir
  // landscape'te açılışta 100+ art arda render demek. Bunun yerine sonuçları
  // bir ref'te biriktirip kısa bir pencerede (150ms) tek bir state güncellemesi
  // olarak flush ediyoruz — render sayısını dramatik şekilde düşürür.
  const setConnectivityBatched = useCallback(
    (uuid: string, state: ConnectivityState) => {
      pendingConnectivityRef.current[uuid] = state;
      if (flushTimerRef.current === null) {
        flushTimerRef.current = window.setTimeout(flushConnectivity, 150);
      }
    },
    [flushConnectivity]
  );

  const pushToast = (kind: ToastMsg["kind"], text: string) => {
    setToasts((prev) => {
      const existing = prev.find((t) => t.kind === kind && t.text === text);
      if (existing) {
        return prev.map((t) => (t.id === existing.id ? { ...t, count: t.count + 1, version: t.version + 1 } : t));
      }
      const id = ++toastSeq;
      return [...prev, { id, kind, text, count: 1, version: 0 }];
    });
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ls, cfg] = await Promise.all([window.api.getLandscape(), window.api.getConfig()]);
      setLandscape(ls);
      setConfig(cfg);
    } catch (err) {
      pushToast("error", t("app.landscapeLoadError", { message: (err as Error).message }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (config?.theme) {
      document.documentElement.setAttribute("data-theme", config.theme);
    }
  }, [config?.theme]);

  const flatSystems = useMemo(() => flattenLandscape(landscape?.customers ?? []), [landscape]);

  const recentEntries = useMemo(() => {
    if (!config?.connectionHistory?.length) return [];
    const byUuid = new Map(flatSystems.map((f) => [f.service.uuid, f]));
    return config.connectionHistory
      .map((h) => {
        const flat = byUuid.get(h.uuid);
        return flat ? { ...flat, connectedAt: h.connectedAt } : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .slice(0, 5);
  }, [config?.connectionHistory, flatSystems]);

  const lastConnectedAt = useMemo(() => {
    if (!selection || !config?.connectionHistory) return null;
    return config.connectionHistory.find((h) => h.uuid === selection.service.uuid)?.connectedAt ?? null;
  }, [selection, config?.connectionHistory]);

  useEffect(() => {
    if (flatSystems.length === 0) return;
    const generation = ++scanGenerationRef.current;
    const uniqueByUuid = new Map(flatSystems.map((f) => [f.service.uuid, f.service]));
    const services = Array.from(uniqueByUuid.values());
    let cursor = 0;

    const worker = async () => {
      while (cursor < services.length) {
        if (scanGenerationRef.current !== generation) return;
        const service = services[cursor++];
        setConnectivityBatched(service.uuid, "checking");
        try {
          const result = await window.api.checkConnectivity(service);
          if (scanGenerationRef.current !== generation) return;
          setConnectivityBatched(service.uuid, result.state);
        } catch {
          if (scanGenerationRef.current !== generation) return;
          setConnectivityBatched(service.uuid, "unknown");
        }
      }
    };

    Array.from({ length: CONNECTIVITY_SCAN_CONCURRENCY }, () => worker());
  }, [flatSystems, setConnectivityBatched]);

  useEffect(() => {
    if (!pendingSelectUuid) return;
    const match = flatSystems.find((f) => f.service.uuid === pendingSelectUuid);
    if (match) {
      setSelection(match);
      setPendingSelectUuid(null);
    }
  }, [pendingSelectUuid, flatSystems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (path: string[], service: SapService, itemUuid: string) => {
    setSelection({ path, service, itemUuid });
  };

  // Seçili sistem değiştiğinde Dosya Gezgini'nin göstereceği kök klasörü
  // (o sistem için proje klasörü) yeniden hesapla — henüz bağlanılmamışsa
  // bu klasör diskte yoktur, FileExplorer bunu kendi içinde uygun bir
  // mesajla gösterir. Açık dosya sekmeleri de sistem değişince temizlenir.
  useEffect(() => {
    setOpenFiles([]);
    setActiveFilePath(null);
    setLeftPanelMode("systems");
    if (!selection) {
      setProjectDir(null);
      return;
    }
    let cancelled = false;
    window.api.resolveProjectDir(selection.path, selection.service).then((dir) => {
      if (!cancelled) setProjectDir(dir);
    });
    return () => {
      cancelled = true;
    };
  }, [selection?.itemUuid]);

  const handleOpenFile = useCallback((entry: FsEntry) => {
    setOpenFiles((prev) =>
      prev.some((f) => f.path === entry.path) ? prev : [...prev, { path: entry.path, name: entry.name }]
    );
    setActiveFilePath(entry.path);
  }, []);

  const handleCloseFileTab = useCallback((filePath: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== filePath);
      setActiveFilePath((current) => {
        if (current !== filePath) return current;
        return next.length > 0 ? next[next.length - 1].path : null;
      });
      return next;
    });
  }, []);

  const handleImportComplete = useCallback(
    (result: { ok: boolean; imported?: number; skippedDirs?: string[]; error?: string }) => {
      if (!result.ok) {
        pushToast("error", t("app.fileImportFailed", { error: result.error ?? t("common.unknownError") }));
        return;
      }
      const imported = result.imported ?? 0;
      const skipped = result.skippedDirs?.length ?? 0;
      if (imported === 0 && skipped === 0) return;
      const skippedNote = skipped > 0 ? t("app.skippedFoldersNote", { count: skipped }) : "";
      pushToast("success", t("app.filesImported", { count: imported, note: skippedNote }));
    },
    [t]
  );

  const handleCheck = useCallback(async (service: SapService) => {
    setConnectivity((prev) => ({ ...prev, [service.uuid]: "checking" }));
    const result = await window.api.checkConnectivity(service);
    setConnectivity((prev) => ({ ...prev, [service.uuid]: result.state }));
  }, []);

  const handleOpenConnect = (sel: Selection) => {
    setConnectError(null);
    setCredentialsTarget(sel);
  };

  const handleOpenSapLogon = useCallback(
    async (service: SapService) => {
      try {
        const result = await window.api.openInSapLogon(service);
        if (result.ok) {
          pushToast("success", t("sapLogon.opened"));
        } else if (result.reason === "spawnError") {
          pushToast("error", t("sapLogon.spawnError", { detail: result.detail ?? "" }));
        } else {
          pushToast("error", t(`sapLogon.${result.reason}` as Parameters<typeof t>[0]));
        }
      } catch (err) {
        pushToast("error", t("sapLogon.spawnError", { detail: (err as Error).message }));
      }
    },
    [t]
  );

  const openTerminalForConnection = useCallback(
    async (projectDir: string, title: string) => {
      const shell = config?.terminal ?? "cmd";
      const command = config?.axetCommand ?? "axet-code -y";
      try {
        const id = await window.api.createTerminal(projectDir, 80, 24, shell, command);
        // Tab/panel burada AÇILMIYOR — axet.code kendi arayüzünü çizmeye
        // başlayana kadar (terminal:ready event'i) terminal tamamen arka
        // planda, görünmez şekilde çalışıyor. Bkz. terminalManager.ts'teki
        // READY_PATTERNS/READY_FALLBACK_MS açıklaması.
        pendingTerminalTitlesRef.current.set(id, title);
      } catch (err) {
        pushToast("error", t("app.terminalOpenFailed", { message: (err as Error).message }));
      }
    },
    [config?.terminal, config?.axetCommand, t]
  );

  useEffect(() => {
    const unsubscribe = window.api.onTerminalReady((id) => {
      const title = pendingTerminalTitlesRef.current.get(id);
      pendingTerminalTitlesRef.current.delete(id);
      setTerminalSessions((prev) => {
        if (prev.some((s) => s.id === id)) return prev;
        return [...prev, { id, title: title ?? t("app.terminalDefaultTitle", { n: prev.length + 1 }) }];
      });
      setActiveTerminalId(id);
      setTerminalPanelOpen(true);
    });
    return unsubscribe;
  }, [t]);

  const handleNewTerminal = useCallback(async () => {
    const shell = config?.terminal ?? "cmd";
    const cwd = config?.projectsBaseDir ?? "";
    try {
      manualTerminalCounterRef.current += 1;
      const id = await window.api.createTerminal(cwd, 80, 24, shell);
      pendingTerminalTitlesRef.current.set(id, t("app.terminalDefaultTitle", { n: manualTerminalCounterRef.current }));
    } catch (err) {
      pushToast("error", t("app.terminalCreateFailed", { message: (err as Error).message }));
    }
  }, [config?.terminal, config?.projectsBaseDir, t]);

  const handleCloseTerminal = useCallback((id: string) => {
    window.api.disposeTerminal(id).catch(() => {
      // process zaten kapanmış olabilir, göz ardı et
    });
    setTerminalSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveTerminalId((current) => {
        if (current !== id) return current;
        return next.length > 0 ? next[next.length - 1].id : null;
      });
      return next;
    });
  }, []);

  const handleToggleTerminalPanel = useCallback(() => {
    setTerminalPanelOpen((prev) => !prev);
  }, []);

  // Tam ekran modu, sidebar'ı ve ana içerik (SystemPanel/FileViewer) panelini
  // tamamen render'dan çıkarıp terminale App'in kalan TÜM dikey/yatay alanını
  // veriyor (VS Code'un "Maximize Panel" davranışına benzer) — üstteki arama/
  // ayarlar çubuğu bilerek görünür bırakıldı, sadece TerminalPanel içindeki
  // buton ile çıkılabiliyor. Panel kapalıyken tam ekrana geçilmeye çalışılırsa
  // önce paneli açıyoruz, aksi halde "tam ekran" boş bir alan gösterirdi.
  const handleToggleTerminalFullscreen = useCallback(() => {
    setTerminalFullscreen((prev) => {
      const next = !prev;
      if (next) setTerminalPanelOpen(true);
      return next;
    });
  }, []);

  const handleTerminalResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = terminalPanelHeight;
      const onMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY;
        setTerminalPanelHeight(Math.min(MAX_TERMINAL_HEIGHT, Math.max(MIN_TERMINAL_HEIGHT, startHeight + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [terminalPanelHeight]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleSidebarResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarCollapsed) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarCollapsed, sidebarWidth]
  );

  const handleCredentialsSubmit = async (username: string, password: string, client: string) => {
    if (!credentialsTarget) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await window.api.connect({
        customerPath: credentialsTarget.path,
        service: credentialsTarget.service,
        credentials: { username, password, client }
      });
      if (result.ok) {
        pushToast("success", result.message);
        const title = `${credentialsTarget.path[credentialsTarget.path.length - 1] ?? credentialsTarget.service.name} · ${credentialsTarget.service.systemId || credentialsTarget.service.name}`;
        setCredentialsTarget(null);
        await openTerminalForConnection(result.projectDir, title);
        try {
          const cfg = await window.api.getConfig();
          setConfig(cfg);
        } catch {
          // config yeniden yüklenemezse "Son Bağlanılanlar" bir sonraki refresh'te güncellenir, kritik değil
        }
      } else {
        setConnectError(result.message);
      }
    } catch (err) {
      setConnectError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveConfig = async (partial: Partial<AppConfig>) => {
    const next = await window.api.saveConfig(partial);
    setConfig(next);
    pushToast("success", t("app.settingsSaved"));
  };

  const handleDeleteManual = (service: SapService) => {
    setDeleteTarget(service);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await window.api.removeManualSystem(deleteTarget.uuid);
    pushToast("success", t("app.systemDeleted"));
    setSelection(null);
    setDeleteTarget(null);
    refresh();
  };

  const handleEditManual = (service: SapService) => {
    setEditingSystem({
      id: service.uuid,
      name: service.name,
      systemId: service.systemId,
      type: service.type === "BTP/CLOUD" ? "cloud" : "onprem",
      host: service.host,
      diagPort: service.port,
      adtUrl: service.manualAdtUrl ?? null
    });
    setAddSystemOpen(true);
  };

  const handleToggleTheme = async () => {
    const nextTheme: AppTheme = config?.theme === "light" ? "dark" : "light";
    const next = await window.api.saveConfig({ theme: nextTheme });
    setConfig(next);
  };

  const handleToggleLanguage = async () => {
    const nextLanguage = language === "tr" ? "en" : "tr";
    const next = await window.api.saveConfig({ language: nextLanguage });
    setConfig(next);
  };

  const handleSetTier = async (service: SapService, tier: SystemTier | null) => {
    const next = await window.api.setSystemTier(service.uuid, tier);
    setConfig(next);
  };

  const handleExportManualSystems = async () => {
    const result = await window.api.exportManualSystems();
    if (result.canceled) return;
    if (result.ok) {
      pushToast("success", t("app.manualExported", { path: result.filePath ?? "" }));
    } else {
      pushToast("error", result.error ?? t("app.exportFailed"));
    }
  };

  const handleImportManualSystems = async () => {
    const result = await window.api.importManualSystems();
    if (result.canceled) return;
    if (result.ok) {
      pushToast(
        "success",
        t("app.manualImported", {
          imported: result.imported ?? 0,
          skipped: result.skipped ?? 0,
          total: result.total ?? 0
        })
      );
      refresh();
    } else {
      pushToast("error", result.error ?? t("app.importFailed"));
    }
  };

  const noLandscapeFile = landscape && landscape.customers.length === 0;

  return (
    <LanguageProvider language={language}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TitleBar />
        <header className="flex items-center gap-3 border-b border-base-700 bg-base-900 px-4 py-3">
          <button
            onClick={() => setAddSystemOpen(true)}
            title={t("app.addSystemTitle")}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-accent-500/40 bg-accent-500/15 px-3 py-1.5 text-xs font-medium text-[var(--accent-soft-text)] hover:bg-accent-500/25"
          >
            <Plus size={14} />
            {t("app.addSystem")}
          </button>
          <button
            onClick={() => {
              refresh();
              pushToast("success", t("app.refreshedFromSapLogon"));
            }}
            title={t("app.refetchTitle")}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-base-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700"
          >
            <Download size={14} className={loading ? "animate-pulse" : ""} />
            {t("app.refetch")}
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-sm border border-base-700 bg-base-800 px-3 py-1.5">
            <Search size={14} className="text-slate-500" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search) setSearch("");
              }}
              placeholder={t("app.searchPlaceholder")}
              className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                title={t("app.clearSearch")}
                className="cursor-pointer rounded-sm p-0.5 text-slate-500 hover:bg-base-700 hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={handleToggleTerminalPanel}
            title={t("app.toggleTerminalTitle")}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-base-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700"
          >
            <TerminalSquare size={14} />
            {t("app.terminal")}
          </button>
          <button
            onClick={refresh}
            title={t("app.reloadListTitle")}
            className="cursor-pointer rounded-sm p-2 text-slate-400 hover:bg-base-700 hover:text-white"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleToggleTheme}
            title={config?.theme === "light" ? t("app.switchToDark") : t("app.switchToLight")}
            className="cursor-pointer rounded-sm p-2 text-slate-400 hover:bg-base-700 hover:text-white"
          >
            {config?.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={handleToggleLanguage}
            title={t("app.languageToggleTitle")}
            className="flex cursor-pointer items-center gap-1 rounded-sm p-2 text-xs font-semibold text-slate-400 hover:bg-base-700 hover:text-white"
          >
            <Languages size={16} />
            {language.toUpperCase()}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title={t("app.settingsTitle")}
            className="cursor-pointer rounded-sm p-2 text-slate-400 hover:bg-base-700 hover:text-white"
          >
            <Settings size={16} />
          </button>
        </header>

        {noLandscapeFile && (
          <div
            className="flex items-center gap-2 border-b px-4 py-2 text-sm"
            style={{
              borderColor: "var(--status-warning-border)",
              backgroundColor: "var(--status-warning-bg)",
              color: "var(--status-warning-text)"
            }}
          >
            <AlertTriangle size={14} />
            {t("app.noLandscapeFile", { file: landscape?.sourceFile ?? "" })}
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {!terminalFullscreen && (
            <aside
              style={{ width: sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth }}
              className="flex shrink-0 cursor-default flex-col overflow-hidden border-r border-base-700 bg-base-900"
            >
              <div className="flex items-center gap-2 p-2">
                <button
                  onClick={handleToggleSidebar}
                  title={sidebarCollapsed ? t("app.expandSidebar") : t("app.collapseSidebar")}
                  className="cursor-pointer rounded-sm p-1.5 text-slate-400 hover:bg-base-700 hover:text-white"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
                {!sidebarCollapsed && selection && projectDir && (
                  <div className="ml-auto flex items-center gap-1 rounded-sm border border-base-700 p-0.5">
                    <button
                      onClick={() => setLeftPanelMode("systems")}
                      title={t("app.systemsMode")}
                      className={`cursor-pointer rounded-sm p-1.5 ${
                        leftPanelMode === "systems" ? "bg-base-700 text-white" : "text-slate-400 hover:bg-base-700"
                      }`}
                    >
                      <Server size={14} />
                    </button>
                    <button
                      onClick={() => setLeftPanelMode("files")}
                      title={t("app.filesMode")}
                      className={`cursor-pointer rounded-sm p-1.5 ${
                        leftPanelMode === "files" ? "bg-base-700 text-white" : "text-slate-400 hover:bg-base-700"
                      }`}
                    >
                      <FolderTree size={14} />
                    </button>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && leftPanelMode === "files" && selection && projectDir ? (
                <div className="flex-1 overflow-hidden">
                  <FileExplorer
                    rootDir={projectDir}
                    rootLabel={selection.service.systemId || selection.service.name}
                    selectedPath={activeFilePath}
                    onSelectFile={handleOpenFile}
                    onImportComplete={handleImportComplete}
                  />
                </div>
              ) : (
                !sidebarCollapsed && (
                  <div className="flex-1 overflow-y-auto p-3 pt-0">
                    {loading && !landscape ? (
                      <div className="px-3 py-6 text-center text-sm text-slate-500">{t("common.loading")}</div>
                    ) : (
                      <>
                        {!search.trim() && (
                          <RecentSystems
                            entries={recentEntries}
                            selectedUuid={selection?.itemUuid ?? null}
                            connectivity={connectivity}
                            tierOverrides={config?.systemTiers ?? {}}
                            onSelect={handleSelect}
                          />
                        )}
                        <Tree
                          nodes={landscape?.customers ?? []}
                          search={search}
                          selectedUuid={selection?.itemUuid ?? null}
                          connectivity={connectivity}
                          tierOverrides={config?.systemTiers ?? {}}
                          onSelect={handleSelect}
                        />
                      </>
                    )}
                  </div>
                )
              )}
            </aside>
          )}

          {!terminalFullscreen && !sidebarCollapsed && (
            <div
              onMouseDown={handleSidebarResizeStart}
              title={t("app.resizeWidthTitle")}
              className="w-1 shrink-0 cursor-col-resize hover:bg-accent-500/50"
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {!terminalFullscreen && (
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {openFiles.length > 0 && (
                  <div className="flex h-9 w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b border-base-700 bg-base-900 px-2">
                    <button
                      onClick={() => setActiveFilePath(null)}
                      className={`shrink-0 whitespace-nowrap rounded-t-sm px-3 py-1.5 text-xs ${
                        activeFilePath === null ? "bg-base-800 text-white" : "text-slate-400 hover:bg-base-800/60"
                      }`}
                    >
                      {t("app.systemDetailTab")}
                    </button>
                    {openFiles.map((f) => (
                      <div
                        key={f.path}
                        onClick={() => setActiveFilePath(f.path)}
                        className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-sm px-3 py-1.5 text-xs ${
                          activeFilePath === f.path ? "bg-base-800 text-white" : "text-slate-400 hover:bg-base-800/60"
                        }`}
                      >
                        <FileText size={12} />
                        {f.name}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseFileTab(f.path);
                          }}
                          title={t("app.closeTabTitle")}
                          className="cursor-pointer rounded p-0.5 hover:bg-base-700"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="min-w-0 flex-1 overflow-y-auto">
                  {activeFilePath ? (
                    <FileViewer
                      path={activeFilePath}
                      name={openFiles.find((f) => f.path === activeFilePath)?.name ?? ""}
                    />
                  ) : (
                    <SystemPanel
                      selection={selection}
                      connectivity={connectivity}
                      tierOverrides={config?.systemTiers ?? {}}
                      lastConnectedAt={lastConnectedAt}
                      onCheck={handleCheck}
                      onConnect={handleOpenConnect}
                      onOpenSapLogon={handleOpenSapLogon}
                      onEditManual={handleEditManual}
                      onDeleteManual={handleDeleteManual}
                      onSetTier={handleSetTier}
                    />
                  )}
                </div>
              </main>
            )}

            {(terminalPanelOpen || terminalSessions.length > 0) && (
              <TerminalPanel
                sessions={terminalSessions}
                activeId={activeTerminalId}
                open={terminalPanelOpen}
                height={terminalPanelHeight}
                fullscreen={terminalFullscreen}
                onSelect={setActiveTerminalId}
                onClose={handleCloseTerminal}
                onToggleOpen={handleToggleTerminalPanel}
                onResizeStart={handleTerminalResizeStart}
                onNewTerminal={handleNewTerminal}
                onToggleFullscreen={handleToggleTerminalFullscreen}
              />
            )}
          </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSave={handleSaveConfig}
          onExportManualSystems={handleExportManualSystems}
          onImportManualSystems={handleImportManualSystems}
        />

        <AddSystemModal
          open={addSystemOpen}
          editing={editingSystem}
          onClose={() => {
            setAddSystemOpen(false);
            setEditingSystem(null);
          }}
          onAdded={(id) => {
            pushToast("success", editingSystem ? t("app.systemUpdated") : t("app.systemAdded"));
            setEditingSystem(null);
            if (id) setPendingSelectUuid(id);
            refresh();
          }}
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          title={t("app.deleteSystemTitle")}
          message={
            deleteTarget
              ? t("app.deleteSystemMessage", { name: deleteTarget.name, systemId: deleteTarget.systemId })
              : ""
          }
          confirmLabel={t("common.delete")}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        <CredentialsModal
          open={credentialsTarget !== null}
          service={credentialsTarget?.service ?? null}
          connecting={connecting}
          errorMessage={connectError}
          onClose={() => setCredentialsTarget(null)}
          onSubmit={handleCredentialsSubmit}
          loadDefaults={(uuid) => window.api.getCredentialDefaults(uuid)}
        />

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </LanguageProvider>
  );
}
