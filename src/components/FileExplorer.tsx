import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File as FileIcon, RefreshCw, FilePlus } from "lucide-react";
import type { FsEntry, FsImportFilesResult } from "../../app-electron/shared/types";

interface Props {
  rootDir: string;
  rootLabel: string;
  selectedPath: string | null;
  onSelectFile: (entry: FsEntry) => void;
  onImportComplete?: (result: FsImportFilesResult, destDir: string) => void;
}

type DirState = FsEntry[] | "loading" | "error";

// VS Code'un dosya gezginine benzer, tembel (lazy) yüklemeli bir ağaç:
// her klasörün içeriği ancak açıldığında `fs:listDir` ile çekilir ve
// `childrenByPath`'te path'e göre cache'lenir — büyük proje klasörlerinde
// tüm alt ağacı önceden taramaya gerek kalmaz.
export default function FileExplorer({ rootDir, rootLabel, selectedPath, onSelectFile, onImportComplete }: Props) {
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

  const refresh = () => {
    loadDir(rootDir);
    for (const dirPath of Object.keys(expanded)) {
      if (expanded[dirPath]) loadDir(dirPath);
    }
  };

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
            className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm text-slate-300 hover:bg-base-700/60 ${
              isDragOver ? "bg-accent-500/20 ring-1 ring-inset ring-accent-400" : ""
            }`}
            style={{ paddingLeft }}
          >
            {isExpanded ? <ChevronDown size={13} className="shrink-0 text-slate-500" /> : <ChevronRight size={13} className="shrink-0 text-slate-500" />}
            {isExpanded ? <FolderOpen size={13} className="shrink-0 text-accent-400" /> : <Folder size={13} className="shrink-0 text-accent-400" />}
            <span className="truncate">{entry.name}</span>
          </button>
          {isExpanded && (
            <div>
              {state === "loading" && (
                <div className="py-1 text-xs text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                  Yükleniyor…
                </div>
              )}
              {state === "error" && (
                <div className="py-1 text-xs text-rose-400" style={{ paddingLeft: paddingLeft + 20 }}>
                  Okunamadı.
                </div>
              )}
              {Array.isArray(state) && state.length === 0 && (
                <div className="py-1 text-xs text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                  Boş.
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
        className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm ${
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
          <button onClick={handleAddFileClick} title="Bu klasöre dosya ekle" className="cursor-pointer rounded p-1 text-slate-500 hover:bg-base-700 hover:text-white">
            <FilePlus size={12} />
          </button>
          <button onClick={refresh} title="Dosya listesini yenile" className="cursor-pointer rounded p-1 text-slate-500 hover:bg-base-700 hover:text-white">
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
        {rootState === "loading" && <div className="px-2 py-6 text-center text-xs text-slate-500">Yükleniyor…</div>}
        {rootState === "error" && (
          <div className="px-2 py-6 text-center text-xs text-slate-500">
            Bu sistem için proje klasörü henüz yok. Sağdaki "axet.code'da Aç" ile bir kere bağlanınca burada görünecek.
          </div>
        )}
        {Array.isArray(rootState) && rootState.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-slate-500">Klasör boş. Dosya sürükleyip bırakabilir veya + ile ekleyebilirsin.</div>
        )}
        {Array.isArray(rootState) && rootState.map((entry) => renderEntry(entry, 0))}
      </div>
    </div>
  );
}
