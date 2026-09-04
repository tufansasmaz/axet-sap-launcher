import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File as FileIcon, RefreshCw, FilePlus } from "lucide-react";
import type { FsEntry, FsImportFilesResult } from "../../app-electron/shared/types";
import { useT } from "../i18n";

interface Props {
  rootDir: string;
  rootLabel: string;
  selectedPath: string | null;
  onSelectFile: (entry: FsEntry) => void;
  onImportComplete?: (result: FsImportFilesResult, destDir: string) => void;
  /**
   * Kökü izle ve değişince ağacı kendiliğinden tazele. Sohbet panelinde AÇIK
   * (kullanıcı isteği: *"kendi gidip txt vs yazıyor direkt göreyim"* — ajanın
   * yazdığı dosyayı görmek için YENİLE'ye basmak gerekmemeli), SAP Launcher
   * ekranındaki gezginde KAPALI: orada dosyaları kullanıcı kendisi koyuyor,
   * izlemenin bedelini ödemeye değmez.
   *
   * Aynı anda birden çok gezgin mount olabildiği (her sohbetin kendi paneli)
   * için sadece GÖRÜNEN panelde açılmalı — izleyici pencere başına değil,
   * bileşen başına.
   */
  autoRefresh?: boolean;
  /**
   * `autoRefresh` açıkken, disk değişikliği algılandığında çağrılır. İzleyici
   * burada olduğu için açık dosya önizlemesi de aynı olaydan besleniyor —
   * ikinci bir `fs.watch` açmaya gerek yok.
   */
  onExternalChange?: () => void;
}

type DirState = FsEntry[] | "loading" | "error";

// VS Code'un dosya gezginine benzer, tembel (lazy) yüklemeli bir ağaç:
// her klasörün içeriği ancak açıldığında `fs:listDir` ile çekilir ve
// `childrenByPath`'te path'e göre cache'lenir — büyük proje klasörlerinde
// tüm alt ağacı önceden taramaya gerek kalmaz.
export default function FileExplorer({
  rootDir,
  rootLabel,
  selectedPath,
  onSelectFile,
  onImportComplete,
  autoRefresh = false,
  onExternalChange
}: Props) {
  const t = useT();
  const [childrenByPath, setChildrenByPath] = useState<Record<string, DirState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  const loadDir = useCallback(async (dirPath: string) => {
    setChildrenByPath((prev) => ({ ...prev, [dirPath]: "loading" }));
    try {
      const result = await window.api.listDir(dirPath);
      setChildrenByPath((prev) => ({ ...prev, [dirPath]: result.ok && result.entries ? result.entries : "error" }));
    } catch {
      setChildrenByPath((prev) => ({ ...prev, [dirPath]: "error" }));
    }
  }, []);

  useEffect(() => {
    setChildrenByPath({});
    setExpanded({ [rootDir]: true });
    loadDir(rootDir);
  }, [rootDir, loadDir]);

  const toggleDir = (dirPath: string) => {
    setExpanded((prev) => {
      const willExpand = !prev[dirPath];
      if (willExpand && !childrenByPath[dirPath]) loadDir(dirPath);
      return { ...prev, [dirPath]: willExpand };
    });
  };

  // `expanded` bir ref'te de tutuluyor: `refresh` onu okumak zorunda ama
  // bağımlılığı olsaydı, her klasör açılışında izleyici (aşağıdaki effect)
  // sökülüp yeniden kurulurdu.
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  // Kök + O AN AÇIK olan klasörler yeniden okunuyor; kapalı klasörlerin
  // içeriğini tazelemek görünmeyen bir şey için disk okumak olurdu.
  const refresh = useCallback(() => {
    loadDir(rootDir);
    for (const dirPath of Object.keys(expandedRef.current)) {
      if (expandedRef.current[dirPath]) loadDir(dirPath);
    }
  }, [loadDir, rootDir]);

  // Canlı tazeleme. Debounce main tarafında (bkz. fsExplorer WATCH_DEBOUNCE_MS),
  // burada sadece "benim kökümde değişiklik oldu mu" süzülüyor — aynı anda
  // birden çok panel izliyor olabilir.
  // Callback de ref üzerinden: çağıran her render'da yeni bir fonksiyon
  // veriyorsa izleyici boşuna sökülüp kurulmasın.
  const onExternalChangeRef = useRef(onExternalChange);
  onExternalChangeRef.current = onExternalChange;

  useEffect(() => {
    if (!autoRefresh || !rootDir) return;
    const id = crypto.randomUUID();
    let disposed = false;
    window.api.watchDir(id, rootDir).catch(() => {});
    const off = window.api.onFsChanged((changedId) => {
      if (changedId !== id || disposed) return;
      refresh();
      onExternalChangeRef.current?.();
    });
    return () => {
      disposed = true;
      off();
      window.api.unwatchDir(id).catch(() => {});
    };
  }, [autoRefresh, rootDir, refresh]);

  // Dışarıdan (Windows Explorer/Masaüstü) sürüklenip bırakılan dosyaları
  // hedef klasöre kopyalar — hem "Dosya Ekle" diyaloğu hem sürükle-bırak
  // aynı bu fonksiyona çıkıyor. Import sonrası sadece hedef klasör (ve zaten
  // açık olan diğer klasörler) yeniden yüklenir, tam ağaç sıfırlanmaz.
  const importInto = useCallback(
    async (destDir: string, sourcePaths: string[]) => {
      if (sourcePaths.length === 0) return;
      const result = await window.api.importFiles(destDir, sourcePaths);
      loadDir(destDir);
      onImportComplete?.(result, destDir);
    },
    [loadDir, onImportComplete]
  );

  const extractDroppedPaths = (dt: DataTransfer): string[] => {
    const paths: string[] = [];
    for (let i = 0; i < dt.files.length; i++) {
      const file = dt.files.item(i);
      if (!file) continue;
      try {
        const filePath = window.api.getPathForFile(file);
        if (filePath) paths.push(filePath);
      } catch {
        // gerçek disk yolu alınamadı (örn. tarayıcı-içi bir sürükleme), atla
      }
    }
    return paths;
  };

  const handleAddFileClick = async () => {
    const paths = await window.api.pickFiles();
    await importInto(rootDir, paths);
  };

  const renderEntry = (entry: FsEntry, depth: number) => {
    const paddingLeft = depth * 14 + 8;
    if (entry.isDir) {
      const isExpanded = expanded[entry.path] ?? false;
      const state = childrenByPath[entry.path];
      const isDragOver = dragOverPath === entry.path;
      return (
        <div key={entry.path}>
          <button
            onClick={() => toggleDir(entry.path)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
              setDragOverPath(entry.path);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              setDragOverPath((prev) => (prev === entry.path ? null : prev));
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverPath(null);
              importInto(entry.path, extractDroppedPaths(e.dataTransfer));
            }}
            title={entry.name}
            className={`flex w-full cursor-pointer items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-sm text-slate-300 hover:bg-base-700/60 ${
              isDragOver ? "bg-accent-500/20 ring-1 ring-inset ring-accent-400" : ""
            }`}
            style={{ paddingLeft }}
          >
            {isExpanded ? (
              <ChevronDown size={13} className="shrink-0 text-slate-500" />
            ) : (
              <ChevronRight size={13} className="shrink-0 text-slate-500" />
            )}
            {isExpanded ? (
              <FolderOpen size={13} className="shrink-0 text-[#d99a4e]" />
            ) : (
              <Folder size={13} className="shrink-0 text-[#d99a4e]" />
            )}
            <span className="truncate">{entry.name}</span>
          </button>
          {isExpanded && (
            <div>
              {state === "loading" && (
                <div className="py-1 text-xs text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                  {t("common.loading")}
                </div>
              )}
              {state === "error" && (
                <div
                  className="py-1 text-xs text-[var(--status-danger-text)]"
                  style={{ paddingLeft: paddingLeft + 20 }}
                >
                  {t("fileExplorer.readError")}
                </div>
              )}
              {Array.isArray(state) && state.length === 0 && (
                <div className="py-1 text-xs text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                  {t("fileExplorer.empty")}
                </div>
              )}
              {Array.isArray(state) && state.map((child) => renderEntry(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedPath === entry.path;
    return (
      <button
        key={entry.path}
        onClick={() => onSelectFile(entry)}
        title={entry.name}
        className={`flex w-full cursor-pointer items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-sm ${
          isSelected ? "bg-accent-500/20 text-white" : "text-slate-300 hover:bg-base-700/60"
        }`}
        style={{ paddingLeft }}
      >
        <FileIcon size={13} className="shrink-0 text-slate-500" />
        <span className="truncate">{entry.name}</span>
      </button>
    );
  };

  const rootState = childrenByPath[rootDir];
  const isRootDragOver = dragOverPath === rootDir;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-1 px-2 py-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400" title={rootDir}>
          {rootLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleAddFileClick}
            title={t("fileExplorer.addFileTitle")}
            className="cursor-pointer rounded p-1 text-slate-500 hover:bg-base-700 hover:text-white"
          >
            <FilePlus size={12} />
          </button>
          <button
            onClick={refresh}
            title={t("fileExplorer.refreshTitle")}
            className="cursor-pointer rounded p-1 text-slate-500 hover:bg-base-700 hover:text-white"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOverPath(rootDir);
        }}
        onDragLeave={() => setDragOverPath((prev) => (prev === rootDir ? null : prev))}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverPath(null);
          importInto(rootDir, extractDroppedPaths(e.dataTransfer));
        }}
        className={`flex-1 overflow-y-auto px-1 pb-2 ${isRootDragOver ? "bg-accent-500/10" : ""}`}
      >
        {rootState === "loading" && (
          <div className="px-2 py-6 text-center text-xs text-slate-500">{t("common.loading")}</div>
        )}
        {rootState === "error" && (
          <div className="px-2 py-6 text-center text-xs text-slate-500">
            {t("fileExplorer.noProjectDir", { openInAxet: t("systemPanel.openInAxet") })}
          </div>
        )}
        {Array.isArray(rootState) && rootState.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-slate-500">{t("fileExplorer.emptyRoot")}</div>
        )}
        {Array.isArray(rootState) && rootState.map((entry) => renderEntry(entry, 0))}
      </div>
    </div>
  );
}
