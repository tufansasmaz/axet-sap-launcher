import type { RefObject } from "react";
import { FolderTree, Search, Server, X } from "lucide-react";
import type {
  ConnectivityState,
  FsEntry,
  FsImportFilesResult,
  SapNode,
  SapService,
  SystemTier
} from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { RecentEntry } from "../stores/chatTypes";
import FileExplorer from "./FileExplorer";
import RecentSystems from "./RecentSystems";
import Tree from "./Tree";

export type LogonPanelMode = "systems" | "files";

// Dosyalar görünümü yalnızca seçili sistemin proje klasörü varken var.
export interface LogonFilesView {
  rootDir: string;
  rootLabel: string;
  selectedPath: string | null;
  onSelectFile(entry: FsEntry): void;
  onImportComplete(result: FsImportFilesResult, destDir: string): void;
  onRootPicked(dir: string): void;
}

export interface LogonSidebarProps {
  search: string;
  onSearchChange(value: string): void;
  // Ctrl+F kutuyu `App`'ten odaklıyor.
  searchInputRef: RefObject<HTMLInputElement>;
  mode: LogonPanelMode;
  onModeChange(mode: LogonPanelMode): void;
  files: LogonFilesView | null;
  // Liste henüz hiç gelmedi (ilk okuma sürüyor).
  loading: boolean;
  customers: SapNode[];
  recentEntries: RecentEntry[];
  selectedUuid: string | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  onSelect(path: string[], service: SapService, itemUuid: string): void;
}

// Logon modunun kenar çubuğu (grafit, spec §5.3): arama, Sistemler/Dosyalar
// geçişi, son bağlanılanlar ve sistem ağacı ya da dosya gezgini. Veri
// `App`'te; burada durum yok.
export default function LogonSidebar({
  search,
  onSearchChange,
  searchInputRef,
  mode,
  onModeChange,
  files,
  loading,
  customers,
  recentEntries,
  selectedUuid,
  connectivity,
  tierOverrides,
  onSelect
}: LogonSidebarProps) {
  const t = useT();
  const showFiles = mode === "files" && files !== null;

  const modeButton = (value: LogonPanelMode, label: string, icon: JSX.Element) => (
    <button
      onClick={() => onModeChange(value)}
      title={label}
      aria-label={label}
      aria-pressed={mode === value}
      className={`cursor-pointer rounded-sm p-1.5 ${
        mode === value ? "bg-active text-white" : "text-slate-400 hover:bg-active"
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <div className="flex h-8 min-w-0 flex-1 items-center rounded-lg bg-control ring-1 ring-inset ring-line focus-within:ring-accent-500/40">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500">
            <Search size={14} />
          </span>
          <input
            ref={searchInputRef}
            data-sidebar-search
            value={search}
            onChange={(e) => {
              // Arama yalnızca sistemleri süzüyor: dosyalardayken yazmak
              // sonucun görüneceği yere geçiriyor.
              if (showFiles) onModeChange("systems");
              onSearchChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && search) onSearchChange("");
            }}
            placeholder={t("app.searchPlaceholder")}
            aria-label={t("app.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              title={t("app.clearSearch")}
              aria-label={t("app.clearSearch")}
              className="mr-1.5 shrink-0 cursor-pointer rounded p-1 text-slate-500 transition hover:bg-active hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {files && (
          <div className="flex shrink-0 items-center gap-1 rounded-sm border border-line p-0.5">
            {modeButton("systems", t("app.systemsMode"), <Server size={14} />)}
            {modeButton("files", t("app.filesMode"), <FolderTree size={14} />)}
          </div>
        )}
      </div>
      {showFiles ? (
        <div className="flex-1 overflow-hidden">
          <FileExplorer
            rootDir={files.rootDir}
            rootLabel={files.rootLabel}
            selectedPath={files.selectedPath}
            onSelectFile={files.onSelectFile}
            onImportComplete={files.onImportComplete}
            onRootPicked={files.onRootPicked}
            browsable
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 pt-0">
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">{t("common.loading")}</div>
          ) : (
            <>
              {!search.trim() && (
                <RecentSystems
                  entries={recentEntries}
                  selectedUuid={selectedUuid}
                  connectivity={connectivity}
                  tierOverrides={tierOverrides}
                  onSelect={onSelect}
                />
              )}
              <Tree
                nodes={customers}
                search={search}
                selectedUuid={selectedUuid}
                connectivity={connectivity}
                tierOverrides={tierOverrides}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
