import { useEffect, useRef, useState, type RefObject } from "react";
import { Download, FolderTree, Plus, RefreshCw, Search, Server, X } from "lucide-react";
import type {
  ConnectivityState,
  FsEntry,
  FsImportFilesResult,
  SapNode,
  SapService,
  SystemTier
} from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { GHOST_ICON_BUTTON } from "../ui/buttons";
import type { RecentEntry } from "../stores/chatTypes";
import FileExplorer from "./FileExplorer";
import RecentSystems from "./RecentSystems";
import Tree from "./Tree";

// ＋ menüsünün yaklaşık ölçüsü: pencerenin kenarına sıkıştırmak için. Terminal
// kenar çubuğundaki menüyle aynı yöntem; burada hep üç satır var.
const MENU_W = 176;
const MENU_H = 104;
const EDGE = 8;

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
  // ＋ menüsünün üç eylemi. IPC ve bildirimler App'te; kenar çubuğu yalnız
  // hangisinin seçildiğini söylüyor.
  onAddSystem(): void;
  onRefreshFromSapLogon(): void;
  onReloadList(): void;
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
  onSelect,
  onAddSystem,
  onRefreshFromSapLogon,
  onReloadList
}: LogonSidebarProps) {
  const t = useT();
  const showFiles = mode === "files" && files !== null;

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openMenu = () => {
    const rect = addButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenu({ x: rect.left, y: rect.bottom + 4 });
  };

  const closeMenu = (refocus: boolean) => {
    setMenu(null);
    if (refocus) addButtonRef.current?.focus();
  };

  // Seçilen eylem menü kapandıktan SONRA çalışıyor: "Sistem Ekle" bir pencere
  // açıyor ve odağı o pencere alıyor; menü açık kalsaydı odak ona dönmeye
  // çalışırdı.
  const choose = (action: () => void) => {
    setMenu(null);
    action();
  };

  const menuItems: { label: string; icon: JSX.Element; action: () => void }[] = [
    { label: t("app.addSystem"), icon: <Plus size={13} />, action: onAddSystem },
    { label: t("app.refetch"), icon: <Download size={13} />, action: onRefreshFromSapLogon },
    { label: t("app.reloadListTitle"), icon: <RefreshCw size={13} />, action: onReloadList }
  ];

  const moveFocus = (step: number) => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = (current + step + items.length) % items.length;
    items[next]?.focus();
  };

  // Menü açılınca odak ilk seçeneğe. Yalnız açılışta: `menu` konum nesnesi
  // açılış başına bir kez oluşuyor.
  useEffect(() => {
    if (menu) itemRefs.current[0]?.focus();
  }, [menu]);

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
        <button
          ref={addButtonRef}
          type="button"
          onClick={() => (menu ? closeMenu(false) : openMenu())}
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          aria-label={t("logonSidebar.addMenu")}
          title={t("logonSidebar.addMenu")}
          className={GHOST_ICON_BUTTON}
        >
          <Plus size={14} />
        </button>
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
      {/* Menü SABİT konumlu: kenar çubuğunun içinde açılsaydı taşan kısmı
          kırpılırdı. Dış tıklama katmanı ekran okuyucudan gizli. */}
      {menu && (
        <>
          <div
            aria-hidden
            data-menu-overlay
            className="fixed inset-0 z-dropdown"
            onClick={() => closeMenu(false)}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu(false);
            }}
          />
          <div
            role="menu"
            aria-label={t("logonSidebar.addMenu")}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeMenu(true);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                moveFocus(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveFocus(-1);
              }
            }}
            className="fixed z-dropdown rounded-md border border-line bg-card p-1 shadow-xl outline-none"
            style={{
              width: MENU_W,
              left: Math.max(EDGE, Math.min(menu.x, window.innerWidth - MENU_W - EDGE)),
              top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - MENU_H - EDGE))
            }}
          >
            {menuItems.map((item, i) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => choose(item.action)}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100 focus:bg-hover focus:text-slate-100 focus:outline-none"
              >
                <span className="text-slate-500">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
