import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderSearch,
  RefreshCw,
  FilePlus
} from "lucide-react";
import type { FsEntry, FsImportFilesResult } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { fileKind } from "../ui/fileIcons";

// --- Yol yardımcıları ---
// Renderer'da `node:path` yok ve yollar Windows'tan geliyor, ama ajanın
// yazdığı yollarda `/` de görülüyor: her iki ayraç da tanınıyor.
const lastSep = (p: string): number => Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));

const baseName = (p: string): string => p.slice(lastSep(p) + 1) || p;

const parentDir = (p: string): string => {
  const trimmed = p.replace(/[\\/]+$/, "");
  const i = lastSep(trimmed);
  if (i <= 0) return trimmed;
  const parent = trimmed.slice(0, i);
  // `C:\Users`in üstü `C:` değil `C:\` — sürücü kökü ayraçsız kalırsa
  // listelenemeyen bir yol olurdu.
  return /^[a-zA-Z]:$/.test(parent) ? `${parent}\\` : parent;
};

// Windows'ta büyük/küçük harf yol için anlamsız: `C:\Users` ile `c:\users`
// aynı klasör ve karşılaştırma bunu bilmezse "izinli kök" hiç bulunamazdı.
const isInside = (root: string, target: string): boolean => {
  const base = root.replace(/[\\/]+$/, "").toLowerCase();
  const item = target.replace(/[\\/]+$/, "").toLowerCase();
  return item === base || item.startsWith(`${base}\\`) || item.startsWith(`${base}/`);
};

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
  /**
   * Klasörler arasında gezinmeye izin ver: yol çubuğu (breadcrumb), "üst
   * klasör" düğmesi ve bir klasörü kök yapan çift tıklama. Kapalıyken bileşen
   * eskisi gibi sadece `rootDir` altını gösterir.
   *
   * Gezinme İZİN SINIRINI GENİŞLETMİYOR: `fs:*` kanalları hâlâ
   * `isPathAllowed` ile sınırlı. Yeni bir klasöre çıkmanın tek yolu
   * `window.api.pickExplorerRoot()` — yani kullanıcının işletim sistemi
   * penceresinden kendi seçmesi (bkz. fsExplorer.ts `grantUserRoot`).
   */
  browsable?: boolean;
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
  onExternalChange,
  browsable = false
}: Props) {
  const t = useT();
  const [childrenByPath, setChildrenByPath] = useState<Record<string, DirState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  // Ağacın O ANKİ kökü. `rootDir` prop'u "nereden başlanacağı"; kullanıcı
  // gezinince buradan ayrılıyor, prop değişince (başka projeye/sohbete
  // geçiş) yeniden ona sabitleniyor.
  const [currentRoot, setCurrentRoot] = useState(rootDir);
  const [allowedRoots, setAllowedRoots] = useState<string[]>([]);

  useEffect(() => {
    setCurrentRoot(rootDir);
  }, [rootDir]);

  useEffect(() => {
    if (!browsable) return;
    window.api
      .getAllowedRoots()
      .then(setAllowedRoots)
      .catch(() => setAllowedRoots([]));
  }, [browsable]);

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
    setExpanded({ [currentRoot]: true });
    loadDir(currentRoot);
  }, [currentRoot, loadDir]);

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
    loadDir(currentRoot);
    for (const dirPath of Object.keys(expandedRef.current)) {
      if (expandedRef.current[dirPath]) loadDir(dirPath);
    }
  }, [loadDir, currentRoot]);

  // Canlı tazeleme. Debounce main tarafında (bkz. fsExplorer WATCH_DEBOUNCE_MS),
  // burada sadece "benim kökümde değişiklik oldu mu" süzülüyor — aynı anda
  // birden çok panel izliyor olabilir.
  // Callback de ref üzerinden: çağıran her render'da yeni bir fonksiyon
  // veriyorsa izleyici boşuna sökülüp kurulmasın.
  const onExternalChangeRef = useRef(onExternalChange);
  onExternalChangeRef.current = onExternalChange;

  useEffect(() => {
    if (!autoRefresh || !currentRoot) return;
    const id = crypto.randomUUID();
    let disposed = false;
    window.api.watchDir(id, currentRoot).catch(() => {});
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
  }, [autoRefresh, currentRoot, refresh]);

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
    await importInto(currentRoot, paths);
  };

  // Kullanıcı işletim sisteminin klasör penceresinden bir klasör seçiyor;
  // main süreci SEÇİLEN yolu birinci elden alıp izin veriyor ve geri
  // döndürüyor. Renderer'ın kendi uydurduğu bir yol asla izin listesine
  // giremiyor — kapı burada değil, orada.
  const handlePickRoot = async () => {
    const picked = await window.api.pickExplorerRoot();
    if (!picked) return;
    setAllowedRoots((prev) => (prev.includes(picked) ? prev : [...prev, picked]));
    setCurrentRoot(picked);
  };

  // Gezinmenin tabanı: `currentRoot`u içeren izinli köklerin EN UZUNU.
  // "Üst klasör" düğmesi buranın dışına çıkamaz, çünkü dışarısı zaten
  // `fs:listDir` tarafından reddedilirdi.
  const baseRoot = useMemo(() => {
    const candidates = [rootDir, ...allowedRoots].filter((dir) => dir && isInside(dir, currentRoot));
    if (candidates.length === 0) return currentRoot;
    return candidates.reduce((longest, dir) => (dir.length > longest.length ? dir : longest));
  }, [rootDir, allowedRoots, currentRoot]);

  // Yol çubuğu: taban kök + oradan `currentRoot`a inen her parça tıklanabilir.
  const crumbs = useMemo(() => {
    const rest = currentRoot.slice(baseRoot.replace(/[\\/]+$/, "").length).replace(/^[\\/]+/, "");
    const parts = rest ? rest.split(/[\\/]+/).filter(Boolean) : [];
    let acc = baseRoot.replace(/[\\/]+$/, "");
    return parts.map((name) => {
      acc = `${acc}\\${name}`;
      return { name, path: acc };
    });
  }, [baseRoot, currentRoot]);

  const canGoUp = browsable && !isInside(currentRoot, baseRoot);

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
            onDoubleClick={browsable ? () => setCurrentRoot(entry.path) : undefined}
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
            title={browsable ? `${entry.name}\n${t("fileExplorer.enterDirHint")}` : entry.name}
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
              <FolderOpen size={13} className="shrink-0 text-[var(--folder-icon)]" />
            ) : (
              <Folder size={13} className="shrink-0 text-[var(--folder-icon)]" />
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
    const { icon: FileTypeIcon, color: fileColor } = fileKind(entry.name);
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
        {/* İkon ve rengi dosya TÜRÜNDEN geliyor (bkz. src/ui/fileIcons.ts).
            Seçili satırda renk verilmiyor: seçim zemini zaten accent tonunda
            ve üstüne gelen renkli bir ikon o zemine karışıyordu. */}
        <FileTypeIcon
          size={13}
          className={`shrink-0 ${isSelected || !fileColor ? "text-slate-500" : ""}`}
          style={isSelected || !fileColor ? undefined : { color: fileColor }}
        />
        <span className="truncate">{entry.name}</span>
      </button>
    );
  };

  const rootState = childrenByPath[currentRoot];
  const isRootDragOver = dragOverPath === currentRoot;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-1 px-2 py-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400" title={currentRoot}>
          {browsable && currentRoot !== rootDir ? baseName(currentRoot) : rootLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {browsable && (
            <button
              onClick={handlePickRoot}
              title={t("fileExplorer.openDirTitle")}
              className="cursor-pointer rounded p-1 text-slate-500 hover:bg-base-700 hover:text-white"
            >
              <FolderSearch size={12} />
            </button>
          )}
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
      {browsable && (
        <div className="flex shrink-0 items-center gap-1 border-b border-base-800 px-2 pb-1.5">
          <button
            onClick={() => setCurrentRoot(parentDir(currentRoot))}
            disabled={!canGoUp}
            title={t("fileExplorer.upDirTitle")}
            className="shrink-0 cursor-pointer rounded p-1 text-slate-500 hover:bg-base-700 hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
          >
            <ArrowUp size={12} />
          </button>
          {/* Yol çubuğu yatay kayıyor: derin bir yol paneli genişletemez. */}
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap text-[11px] text-slate-500">
            <button
              onClick={() => setCurrentRoot(baseRoot)}
              title={baseRoot}
              className="shrink-0 cursor-pointer rounded px-1 py-0.5 hover:bg-base-700 hover:text-white"
            >
              {baseName(baseRoot) || baseRoot}
            </button>
            {crumbs.map((crumb) => (
              <span key={crumb.path} className="flex shrink-0 items-center gap-0.5">
                <ChevronRight size={10} className="text-slate-600" />
                <button
                  onClick={() => setCurrentRoot(crumb.path)}
                  title={crumb.path}
                  className={`cursor-pointer rounded px-1 py-0.5 hover:bg-base-700 hover:text-white ${
                    crumb.path === currentRoot ? "text-slate-300" : ""
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOverPath(currentRoot);
        }}
        onDragLeave={() => setDragOverPath((prev) => (prev === currentRoot ? null : prev))}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverPath(null);
          importInto(currentRoot, extractDroppedPaths(e.dataTransfer));
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
