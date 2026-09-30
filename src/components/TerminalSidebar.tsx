import { useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import { MAX_TERMINAL_WORKSPACES } from "../../app-electron/shared/terminalLayout";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { liveCount, workspaceDot } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { ActiveLine, selectedClass } from "../shell/SidebarFooter";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON } from "../ui/buttons";
import ConfirmDialog from "./ConfirmDialog";

// Terminal modunun kenar çubuğu: çalışma alanı listesi (spec §5.1).
// Bölmeler burada değil, sağ tarafta; bu liste yalnız alan seçip yönetiyor.

// Menünün yaklaşık ölçüsü: pencerenin kenarına sıkıştırmak için. Ölçüp
// yerleştirmek yerine sabit, çünkü menüde hep iki satır var.
const MENU_W = 176;
const MENU_H = 72;
const EDGE = 8;

export default function TerminalSidebar() {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const full = state.workspaces.length >= MAX_TERMINAL_WORKSPACES;
  // Geri yükleme şeridi açıkken yeni alan açılmıyor: şerit "son düzen mi,
  // boş mu" sorusunu soruyor ve cevabı henüz yok.
  const canAdd = state.phase === "ready" && !full;
  const confirmTarget = state.workspaces.find((w) => w.id === confirmId) ?? null;

  const startRename = (w: TerminalWorkspace) => {
    setMenu(null);
    setDraft(w.name);
    setRenamingId(w.id);
  };

  const commitRename = () => {
    const w = state.workspaces.find((x) => x.id === renamingId);
    setRenamingId(null);
    const name = draft.trim();
    // Boş ad reddediliyor: kenar çubuğunda adsız, tıklanacak yeri olmayan bir
    // satır kalırdı.
    if (w && name && name !== w.name) commands.renameWorkspace(w.id, name);
  };

  const requestClose = (w: TerminalWorkspace) => {
    setMenu(null);
    if (liveCount(w) > 0) setConfirmId(w.id);
    else commands.closeWorkspace(w.id);
  };

  const menuTarget = state.workspaces.find((w) => w.id === menu?.id) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 px-3">
        <Eyebrow className="flex-1" count={state.workspaces.length}>
          {t("terminal.workspaces")}
        </Eyebrow>
        <button
          type="button"
          onClick={() => commands.addWorkspace()}
          disabled={!canAdd}
          title={full ? t("terminal.workspaceMax") : t("terminal.newWorkspace")}
          aria-label={full ? t("terminal.workspaceMax") : t("terminal.newWorkspace")}
          className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {state.workspaces.map((w) => {
          if (renamingId === w.id) {
            return (
              <div key={w.id} className="flex h-7 items-center px-1">
                <input
                  autoFocus
                  aria-label={t("terminal.workspaceNameLabel")}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      // Önce kapatılıyor: blur `commitRename`'i yine tetiklemesin.
                      setRenamingId(null);
                    }
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded bg-app px-2 py-0.5 text-sm text-slate-100 outline-none ring-1 ring-accent-500/50"
                />
              </div>
            );
          }
          const selected = state.activeWorkspaceId === w.id;
          const dot = workspaceDot(w);
          return (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              aria-current={selected ? "true" : undefined}
              title={w.name}
              onClick={() => commands.selectWorkspace(w.id)}
              onDoubleClick={() => startRename(w)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  commands.selectWorkspace(w.id);
                } else if (e.key === "F2") {
                  e.preventDefault();
                  startRename(w);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: w.id, x: e.clientX, y: e.clientY });
              }}
              className={`group relative flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors ${selectedClass(selected)}`}
            >
              {selected && <ActiveLine />}
              {/* Nokta için yer hep ayrılıyor: nokta gelip gidince adlar
                  sağa sola kaymasın. Hata, okunmamıştan önce geliyor. */}
              <span className="flex w-2 shrink-0 justify-center">
                {dot && (
                  <span
                    data-dot={dot}
                    className={`h-1.5 w-1.5 rounded-full ${
                      dot === "error" ? "bg-[var(--status-danger-solid)]" : "bg-accent-400"
                    }`}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">{w.panes.length}</span>
            </div>
          );
        })}
      </div>

      {/* Sağ tık menüsü SABİT konumlu: kaydırılan listenin içinde açılsaydı
          listeyle kayar ve kenar çubuğunun sınırında kırpılırdı. */}
      {menu && menuTarget && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-dropdown"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            role="menu"
            tabIndex={-1}
            ref={(el) => el?.focus()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setMenu(null);
              }
            }}
            className="fixed z-dropdown rounded-md border border-line bg-card p-1 shadow-xl outline-none"
            style={{
              width: MENU_W,
              left: Math.max(EDGE, Math.min(menu.x, window.innerWidth - MENU_W - EDGE)),
              top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - MENU_H - EDGE))
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => startRename(menuTarget)}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
            >
              {t("terminal.rename")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => requestClose(menuTarget)}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-[var(--status-danger-text)]"
            >
              {t("terminal.close")}
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={t("terminal.closeWorkspaceTitle")}
        message={t("terminal.closeWorkspaceBody", { count: confirmTarget ? liveCount(confirmTarget) : 0 })}
        confirmLabel={t("terminal.closeWorkspaceConfirm")}
        onConfirm={() => {
          if (confirmTarget) commands.closeWorkspace(confirmTarget.id);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
