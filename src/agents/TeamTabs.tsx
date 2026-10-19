import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useT } from "../i18n";
import { MAX_TERMINAL_WORKSPACES } from "../../app-electron/shared/terminalLayout";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { liveCount, workspaceDot } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { selectedClass } from "../shell/SidebarFooter";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import ConfirmDialog from "../components/ConfirmDialog";
import VerifyCommandsDialog from "../board/VerifyCommandsDialog";
import type { ActiveSapContext } from "../../app-electron/shared/types";
import { useAgentStatuses } from "./agentStatusContext";
import { agentPanes, askingCount } from "./agentView";
import { useBoards } from "../board/boardContext";
import { failedCount, taskCount } from "../board/boardDisplay";
import NewTeamDialog from "./NewTeamDialog";
import { templateAgents, type TeamTemplateId } from "./teamTemplates";
import { onNewTeamRequest } from "./addAgentBus";

// Ekip sekmeleri (spec 2026-10-18 ajanlar-yeniden §2): ekip = alan. Eski
// kenar çubuğu alan listesinin (TerminalSidebar) yerini aldı; adlandırma,
// sağ tık menüsü, kapatma onayı ve rozetler aynı. Sonda "+ Ekip": boş ya da
// şablonlu ekip (§2b). Sekme seçimi ok tuşlarıyla da (gezici tabindex).

// Menünün yaklaşık satır yüksekliği; madde sayısıyla çarpılıyor.
const MENU_W = 176;
const MENU_ITEM_H = 30;
const EDGE = 8;

export default function TeamTabs({
  activeSap = null,
  onSelected
}: {
  activeSap?: ActiveSapContext | null;
  /** Ekip seçildi (tık/klavye): üst ekran ekibin son sekmesine geçiyor. */
  onSelected?: () => void;
}) {
  const t = useT();
  const { state, commands, agentCwd } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { boards } = useBoards();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  // Şablon: alan indirgeyicide açılıp seçildikten SONRA ajanlar ekleniyor;
  // addAgent etkin alana ekliyor ve aynı turda etkin alan henüz eskisi.
  const [pending, setPending] = useState<{ template: TeamTemplateId; from: string | null; count: number } | null>(null);
  const tabRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!pending) return;
    const opened = state.workspaces.length > pending.count && state.activeWorkspaceId !== null && state.activeWorkspaceId !== pending.from;
    if (!opened) return;
    setPending(null);
    for (const input of templateAgents(pending.template, t, agentCwd)) commands.addAgent(input);
  }, [pending, state.workspaces.length, state.activeWorkspaceId, commands, agentCwd, t]);

  const select = (w: TerminalWorkspace, focus = false) => {
    commands.selectWorkspace(w.id);
    onSelected?.();
    if (focus) tabRefs.current.get(w.id)?.focus();
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>, w: TerminalWorkspace, index: number) => {
    const list = state.workspaces;
    if (e.key === "Enter" || e.key === " ") select(w);
    else if (e.key === "F2") startRename(w);
    else if (e.key === "ArrowRight") select(list[(index + 1) % list.length], true);
    else if (e.key === "ArrowLeft") select(list[(index - 1 + list.length) % list.length], true);
    else if (e.key === "Home") select(list[0], true);
    else if (e.key === "End") select(list[list.length - 1], true);
    else return;
    e.preventDefault();
  };

  // Tur 7: Ajan yönetimi ekranından "+ Ekip".
  useEffect(() => onNewTeamRequest(() => setNewTeamOpen(true)), []);

  const createTeam = (template: TeamTemplateId | null) => {
    setNewTeamOpen(false);
    if (template) setPending({ template, from: state.activeWorkspaceId, count: state.workspaces.length });
    commands.addWorkspace();
    onSelected?.();
  };

  const full = state.workspaces.length >= MAX_TERMINAL_WORKSPACES;
  // Geri yükleme şeridi açıkken yeni alan açılmıyor: şerit "son düzen mi,
  // boş mu" sorusunu soruyor ve cevabı henüz yok.
  const canAdd = state.phase === "ready" && !full;
  const confirmTarget = state.workspaces.find((w) => w.id === confirmId) ?? null;
  const verifyTarget = state.workspaces.find((w) => w.id === verifyId) ?? null;

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
    // Pano henüz yüklenmemişse (boards[w.id] undefined) ama alan pano
    // görünümündeyse görev olup olmadığı bilinmiyor: onay isteniyor.
    const boardPending = boards[w.id] === undefined && w.view === "board";
    if (liveCount(w) > 0 || taskCount(boards[w.id]) > 0 || boardPending) setConfirmId(w.id);
    else commands.closeWorkspace(w.id);
  };

  // Alanın kökü (spec 2026-10-17 ajan-alani §3): yeni ajanların klasörü.
  // Elle seçilen kök SAP bağını düşürüyor: kök artık o sistemin klasörü değil.
  const pickRoot = async (w: TerminalWorkspace) => {
    setMenu(null);
    const folder = await window.api.pickFolder();
    if (folder) commands.setWorkspaceRoot(w.id, folder, null);
  };

  const linkSap = (w: TerminalWorkspace) => {
    setMenu(null);
    if (activeSap) commands.setWorkspaceRoot(w.id, activeSap.projectDir, { uuid: activeSap.uuid, label: activeSap.systemId });
  };

  const unlinkSap = (w: TerminalWorkspace) => {
    setMenu(null);
    commands.setWorkspaceRoot(w.id, w.root ?? null, null);
  };

  const menuTarget = state.workspaces.find((w) => w.id === menu?.id) ?? null;

  const canLinkSap = Boolean(activeSap && menuTarget && menuTarget.sap?.uuid !== activeSap.uuid);
  const menuHeight = 8 + MENU_ITEM_H * (4 + (canLinkSap ? 1 : 0) + (menuTarget?.sap ? 1 : 0));

  return (
    <div className="flex min-w-0 items-center gap-1">
      <div role="tablist" aria-label={t("teams.label")} className="flex min-w-0 items-center gap-1 overflow-x-auto py-1">
        {state.workspaces.map((w, index) => {
          const selected = state.activeWorkspaceId === w.id;
          if (renamingId === w.id) {
            return (
              <div key={w.id} className="flex h-7 shrink-0 items-center">
                <input
                  autoFocus
                  aria-label={t("teams.nameLabel")}
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
                  className="w-36 rounded bg-app px-2 py-0.5 text-sm text-slate-100 outline-none ring-1 ring-accent-500/50"
                />
              </div>
            );
          }
          const dot = workspaceDot(w);
          const agents = agentPanes(w).length;
          const asking = askingCount(w, statuses);
          const failed = failedCount(boards[w.id]);
          return (
            <div key={w.id} className="flex shrink-0 items-center">
              <div
                ref={(el) => {
                  if (el) tabRefs.current.set(w.id, el);
                  else tabRefs.current.delete(w.id);
                }}
                role="tab"
                aria-selected={selected}
                tabIndex={selected || (!state.activeWorkspaceId && index === 0) ? 0 : -1}
                title={w.root ? `${w.name} — ${w.root}` : w.name}
                onClick={() => select(w)}
                onDoubleClick={() => startRename(w)}
                onKeyDown={(e) => onTabKeyDown(e, w, index)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ id: w.id, x: e.clientX, y: e.clientY });
                }}
                className={`flex h-7 max-w-[16rem] cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors ${selectedClass(selected)}`}
              >
                {/* Nokta için yer hep ayrılıyor: nokta gelip gidince adlar
                    kaymasın. Hata, okunmamıştan önce geliyor. */}
                <span className="flex w-1.5 shrink-0 justify-center">
                  {dot && (
                    <span
                      data-dot={dot}
                      className={`h-1.5 w-1.5 rounded-full ${dot === "error" ? "bg-[var(--status-danger-solid)]" : "bg-accent-400"}`}
                    />
                  )}
                </span>
                <span className="min-w-0 truncate">{w.name}</span>
                {w.sap && <span className="shrink-0 font-mono text-2xs text-slate-500">{w.sap.label}</span>}
                {failed > 0 && (
                  <span
                    data-failed={failed}
                    title={t("board.failedCount", { count: failed })}
                    aria-label={t("board.failedCount", { count: failed })}
                    className="shrink-0 rounded-full bg-[var(--status-danger-bg)] px-1.5 font-mono text-2xs tabular-nums text-[var(--status-danger-text)]"
                  >
                    {failed}
                  </span>
                )}
                {asking > 0 && (
                  <span
                    data-asking={asking}
                    title={t("agents.askingCount", { count: asking })}
                    aria-label={t("agents.askingCount", { count: asking })}
                    className="shrink-0 rounded-full bg-[var(--status-warning-bg)] px-1.5 font-mono text-2xs tabular-nums text-[var(--status-warning-text)]"
                  >
                    {asking}
                  </span>
                )}
                <span
                  title={t("agents.agentCount", { count: agents })}
                  aria-label={t("agents.agentCount", { count: agents })}
                  className="shrink-0 font-mono text-2xs tabular-nums text-slate-500"
                >
                  {agents}
                </span>
              </div>
              {/* Menü düğmesi sekmenin İÇİNDE değil (iç içe etkileşimli öğe olmasın); yalnız seçili ekipte. */}
              {selected && (
                <button
                  type="button"
                  aria-label={t("teams.menu", { name: w.name })}
                  title={t("teams.menu", { name: w.name })}
                  aria-haspopup="menu"
                  onClick={(e) => {
                    const box = e.currentTarget.getBoundingClientRect();
                    setMenu({ id: w.id, x: box.left, y: box.bottom + 4 });
                  }}
                  className={GHOST_ICON_BUTTON}
                >
                  <MoreHorizontal size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setNewTeamOpen(true)}
        disabled={!canAdd}
        title={full ? t("teams.max") : t("teams.addTitle")}
        className={`${TOOL_BUTTON} shrink-0 disabled:cursor-default disabled:opacity-40`}
      >
        <Plus size={12} />
        {t("teams.add")}
      </button>

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
              top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - menuHeight - EDGE))
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
              onClick={() => void pickRoot(menuTarget)}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
            >
              {t("agents.menuRoot")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setVerifyId(menuTarget.id);
              }}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
            >
              {t("board.menuVerify")}
            </button>
            {canLinkSap && activeSap && (
              <button
                type="button"
                role="menuitem"
                onClick={() => linkSap(menuTarget)}
                className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
              >
                {t("agents.menuLinkSap", { sid: activeSap.systemId })}
              </button>
            )}
            {menuTarget.sap && (
              <button
                type="button"
                role="menuitem"
                onClick={() => unlinkSap(menuTarget)}
                className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
              >
                {t("agents.menuUnlinkSap")}
              </button>
            )}
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
        message={
          confirmTarget
            ? [
                liveCount(confirmTarget) > 0 ? t("terminal.closeWorkspaceBody", { count: liveCount(confirmTarget) }) : "",
                taskCount(boards[confirmTarget.id]) > 0 ? t("board.closeWorkspaceTasks", { count: taskCount(boards[confirmTarget.id]) }) : ""
              ]
                .filter(Boolean)
                .join(" ")
            : ""
        }
        confirmLabel={t("terminal.closeWorkspaceConfirm")}
        onConfirm={() => {
          if (confirmTarget) commands.closeWorkspace(confirmTarget.id);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
      <NewTeamDialog open={newTeamOpen} onPick={createTeam} onCancel={() => setNewTeamOpen(false)} />
      <VerifyCommandsDialog
        open={verifyTarget !== null}
        workspaceName={verifyTarget?.name ?? ""}
        initial={verifyTarget?.verify ?? []}
        onSave={(lines) => {
          if (verifyTarget) commands.setWorkspaceVerify(verifyTarget.id, lines);
          setVerifyId(null);
        }}
        onCancel={() => setVerifyId(null)}
      />
    </div>
  );
}
