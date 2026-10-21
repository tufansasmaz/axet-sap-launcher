// Ajan yönetimi (Tur 7): raydaki "Ajan yönetimi" görünümü. TÜM ekiplerin
// ajanları tek tabloda (ad, ekip, rol, motor/model, durum/aşama, son etkinlik,
// açılış, lider açımı, bellek boyutu). Satır eylemleri mevcut terminal deposu
// komutlarıyla: Terminalde göster, yeniden başlat, kapat (onaylı), yeniden
// adlandır, renk, bellek, mesaj. Toplu seçimle yeniden başlat/kapat (onaylı).
// Tur 13: kabukta açılan ajana "Rol ver" (rol + bellek; bölme kabuk kalır).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, MessageSquare, Pencil, Plus, Power, RotateCw, Search, SquareTerminal, UserCog, Users } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import ConfirmDialog from "../components/ConfirmDialog";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { AGENT_ENGINE_IDS, type AgentEngineId } from "../../app-electron/shared/agentTypes";
import type { AgentSendFailure } from "../../app-electron/shared/agentMessage";
import { MAX_TERMINAL_PANES, TERMINAL_PANE_COLORS } from "../../app-electron/shared/terminalLayout";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import { INPUT_CLASS } from "../ui/Field";
import { GHOST_ICON_BUTTON, PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_LABEL, PANE_COLOR_VAR } from "../terminal/paneColors";
import { formatBytes } from "../lib/formatBytes";
import { useAgentStatuses } from "./agentStatusContext";
import { ENGINE_LABEL } from "./agentLabels";
import { phaseText } from "./agentPhase";
import { TONE_DOT, TONE_PILL, type StatusTone } from "./agentView";
import { useFlow } from "./flowContext";
import { roleChangedDetail } from "./flowText";
import MemoryDialog from "./MemoryDialog";
import { memoryAge } from "./MemoryView";
import { requestAddAgent, requestNewTeam } from "./addAgentBus";
import {
  bulkSummary,
  EMPTY_FILTER,
  filterRows,
  MANAGE_STATES,
  manageRows,
  sessionStart,
  sortRows,
  visibleSelection,
  type BulkAction,
  type ManageFilter,
  type ManageRow,
  type ManageState
} from "./manageLogic";

export const STATE_KEY: Record<ManageState, TranslationKey> = {
  running: "agents.stateRunning",
  asking: "agents.stateAsking",
  idle: "agents.stateIdle",
  error: "agents.stateError",
  stopped: "agents.stateFinished",
  starting: "terminal.starting"
};

const STATE_TONE: Record<ManageState, StatusTone> = {
  running: "success",
  asking: "warning",
  idle: "muted",
  error: "danger",
  stopped: "muted",
  starting: "muted"
};

const SEND_FAILURE: Record<AgentSendFailure, TranslationKey> = {
  invalid: "browser.fail.invalid",
  noWorkspace: "browser.fail.noWorkspace",
  noAgent: "browser.fail.noAgent",
  notRunning: "browser.fail.notRunning",
  busy: "browser.fail.busy",
  asking: "browser.fail.asking",
  typing: "browser.fail.typing",
  writeFailed: "browser.fail.writeFailed",
  notSubmitted: "browser.fail.notSubmitted"
};

/** Mesaj kutusunun sınırı (ana süreç 4000'i reddediyor). */
const MESSAGE_MAX = 2_000;

type Confirm = { action: BulkAction; ids: string[] };
type ExpandMode = "rename" | "message" | "role";

const clock = (at: number | null) => (at ? new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—");

export default function ManageView() {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const { statuses, now } = useAgentStatuses();
  const [filter, setFilter] = useState<ManageFilter>(EMPTY_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [memoryOf, setMemoryOf] = useState<ManageRow | null>(null);
  const [expanded, setExpanded] = useState<{ paneId: string; mode: ExpandMode } | null>(null);
  const sizes = useMemorySizes(state.workspaces);

  const nameOf = (row: ManageRow) => row.title || t(ENGINE_LABEL[row.engine]);
  const all = useMemo(() => manageRows(state.workspaces, statuses, sessionStart), [state.workspaces, statuses]);
  const rows = sortRows(filterRows(all, filter, nameOf), nameOf);
  const chosen = visibleSelection(selected, rows);
  const leaderName = (paneId: string) => {
    const leader = all.find((r) => r.paneId === paneId);
    return leader ? nameOf(leader) : "";
  };
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
  const canAdd = state.phase === "ready" && !!active && active.panes.length < MAX_TERMINAL_PANES;

  // Kapanan ajan seçimden düşsün.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(all.map((r) => r.paneId));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [all]);

  const toggle = (paneId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(paneId)) next.delete(paneId);
      else next.add(paneId);
      return next;
    });
  const allShown = rows.length > 0 && chosen.length === rows.length;
  const toggleAll = () => setSelected(allShown ? new Set() : new Set(rows.map((r) => r.paneId)));

  const run = (c: Confirm) => {
    for (const id of c.ids) {
      if (c.action === "close") commands.closePane(id);
      else commands.restartPane(id);
    }
    if (c.action === "close") setSelected((prev) => new Set([...prev].filter((id) => !c.ids.includes(id))));
    setConfirm(null);
  };

  const summary = confirm ? bulkSummary(all, confirm.ids) : null;
  const confirmText = (): string => {
    if (!confirm || !summary) return "";
    const one = confirm.ids.length === 1 ? all.find((r) => r.paneId === confirm.ids[0]) : undefined;
    const head = one
      ? t(confirm.action === "close" ? "manage.confirmCloseOne" : "manage.confirmRestartOne", { name: nameOf(one) })
      : t(confirm.action === "close" ? "manage.confirmCloseMany" : "manage.confirmRestartMany", { count: summary.count, teams: summary.teams });
    return summary.busy > 0 ? `${head} ${t("manage.confirmBusy", { count: summary.busy })}` : head;
  };

  const select = (key: keyof ManageFilter, value: string) => setFilter((f) => ({ ...f, [key]: value || null }));

  return (
    <section role="region" aria-label={t("manage.view")} data-manage="" className="flex h-full min-h-0 flex-col pl-12">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <Users size={14} className="text-slate-400" aria-hidden />
        <h2 className="text-sm font-medium text-slate-100">{t("manage.view")}</h2>
        <span className="font-mono text-2xs tabular-nums text-slate-500">
          {t("manage.count", { count: all.length, teams: state.workspaces.length })}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => requestNewTeam()} disabled={state.phase !== "ready"} className={`${TOOL_BUTTON} disabled:opacity-40`}>
            <Plus size={12} />
            {t("manage.addTeam")}
          </button>
          <button type="button" onClick={() => requestAddAgent()} disabled={!canAdd} title={t("manage.addAgentHint", { team: active?.name ?? "" })} className={`${PRIMARY_BUTTON} disabled:opacity-40`}>
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-3 py-1.5">
        <label className="relative flex w-64 min-w-[10rem] max-w-full items-center">
          <Search size={12} className="pointer-events-none absolute left-2 text-slate-500" aria-hidden />
          <input
            type="search"
            aria-label={t("manage.search")}
            placeholder={t("manage.search")}
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            className={`${INPUT_CLASS} h-7 w-full pl-7 text-xs`}
          />
        </label>
        <FilterSelect label={t("manage.filterTeam")} value={filter.team ?? ""} onChange={(v) => select("team", v)}>
          {state.workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label={t("manage.filterState")} value={filter.state ?? ""} onChange={(v) => select("state", v)}>
          {MANAGE_STATES.map((s) => (
            <option key={s} value={s}>
              {t(STATE_KEY[s])}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label={t("manage.filterEngine")} value={filter.engine ?? ""} onChange={(v) => select("engine", v)}>
          {AGENT_ENGINE_IDS.map((e: AgentEngineId) => (
            <option key={e} value={e}>
              {t(ENGINE_LABEL[e])}
            </option>
          ))}
        </FilterSelect>
      </div>

      {chosen.length > 0 && (
        <div data-manage-bulk="" role="toolbar" aria-label={t("manage.bulk")} className="flex shrink-0 items-center gap-1.5 border-b border-line bg-control px-3 py-1.5 text-xs text-slate-300">
          <span>{t("manage.selected", { count: chosen.length })}</span>
          <button type="button" onClick={() => setConfirm({ action: "restart", ids: chosen })} className={TOOL_BUTTON}>
            <RotateCw size={12} />
            {t("manage.restart")}
          </button>
          <button type="button" onClick={() => setConfirm({ action: "close", ids: chosen })} className={TOOL_BUTTON}>
            <Power size={12} />
            {t("manage.close")}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto cursor-pointer text-2xs text-slate-400 hover:text-slate-200">
            {t("manage.clearSelection")}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {all.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{t("manage.empty")}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{t("manage.noMatch")}</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-app text-left text-2xs font-medium text-slate-500">
              <tr className="border-b border-line">
                <th className="w-8 px-2 py-1.5">
                  <input type="checkbox" aria-label={t("manage.selectAll")} checked={allShown} onChange={toggleAll} />
                </th>
                <th className="px-2 py-1.5">{t("manage.colName")}</th>
                <th className="px-2 py-1.5">{t("manage.colTeam")}</th>
                <th className="px-2 py-1.5">{t("manage.colEngine")}</th>
                <th className="px-2 py-1.5">{t("manage.colState")}</th>
                <th className="px-2 py-1.5">{t("manage.colActivity")}</th>
                <th className="px-2 py-1.5">{t("manage.colOpened")}</th>
                <th className="px-2 py-1.5">{t("manage.colMemory")}</th>
                <th className="px-2 py-1.5 text-right">{t("manage.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ManageRowView
                  key={row.paneId}
                  row={row}
                  name={nameOf(row)}
                  leader={row.spawnedBy ? leaderName(row.spawnedBy) : ""}
                  checked={selected.has(row.paneId)}
                  onToggle={() => toggle(row.paneId)}
                  now={now || Date.now()}
                  memorySize={sizes[`${row.workspaceId}:${row.paneId}`]}
                  expanded={expanded?.paneId === row.paneId ? expanded.mode : null}
                  onExpand={(mode) => setExpanded(mode ? { paneId: row.paneId, mode } : null)}
                  onConfirm={(action) => setConfirm({ action, ids: [row.paneId] })}
                  onMemory={() => {
                    if (!row.memory) commands.enablePaneMemory(row.paneId);
                    setMemoryOf(row);
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        role="alertdialog"
        title={t(confirm?.action === "close" ? "manage.confirmCloseTitle" : "manage.confirmRestartTitle")}
        message={confirmText()}
        confirmLabel={t(confirm?.action === "close" ? "manage.confirmClose" : "manage.confirmRestart")}
        onConfirm={() => confirm && run(confirm)}
        onCancel={() => setConfirm(null)}
      />
      {memoryOf && <MemoryDialog workspaceId={memoryOf.workspaceId} paneId={memoryOf.paneId} name={nameOf(memoryOf)} onClose={() => setMemoryOf(null)} />}
    </section>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const t = useT();
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLASS} h-7 !w-auto shrink-0 rounded-full text-xs`}>
      <option value="">{`${label}: ${t("manage.all")}`}</option>
      {children}
    </select>
  );
}

function ManageRowView({
  row,
  name,
  leader,
  checked,
  onToggle,
  now,
  memorySize,
  expanded,
  onExpand,
  onConfirm,
  onMemory
}: {
  row: ManageRow;
  name: string;
  leader: string;
  checked: boolean;
  onToggle: () => void;
  now: number;
  memorySize: number | undefined;
  expanded: ExpandMode | null;
  onExpand: (mode: ExpandMode | null) => void;
  onConfirm: (action: BulkAction) => void;
  onMemory: () => void;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const color = PANE_COLOR_VAR[row.color];
  const live = row.state !== "stopped" && row.state !== "error" && row.state !== "starting";
  return (
    <>
      <tr data-manage-row={row.paneId} className={`border-b border-line/60 ${checked ? "bg-active" : "hover:bg-hover"}`}>
        <td className="px-2 py-1.5">
          <input type="checkbox" aria-label={t("manage.selectOne", { name })} checked={checked} onChange={onToggle} />
        </td>
        <td className="max-w-[16rem] px-2 py-2">
          {/* Demo'daki kişi listesi gibi: avatar karesi, kalın ad, altında rol. */}
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-xs font-semibold text-slate-100"
              style={{ background: color ? `color-mix(in srgb, ${color} 28%, transparent)` : undefined }}
            >
              {Array.from(name.trim())[0]?.toLocaleUpperCase("tr-TR") ?? "?"}
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-slate-100" title={name}>
                  {name}
                </span>
                {row.spawnedBy && (
                  <span data-lead-spawned="" title={t("manage.spawnedByHint", { name: leader || "?" })} className="shrink-0 rounded border border-line px-1 text-2xs text-slate-400">
                    {t("manage.spawnedBy")}
                  </span>
                )}
                {row.launched && (
                  <span data-shell-launched="" title={t("agents.shellLaunchedHint")} className="shrink-0 rounded border border-line px-1 text-2xs text-slate-400">
                    {t("agents.shellLaunched")}
                  </span>
                )}
              </span>
              <span className="block truncate text-2xs text-slate-400" title={row.role}>
                {row.role || t("agents.roleDefault")}
              </span>
            </span>
          </div>
        </td>
        <td className="max-w-[8rem] truncate px-2 py-2 text-slate-300" title={row.team}>
          {row.team}
        </td>
        <td className="px-2 py-1.5 text-slate-400">
          {t(ENGINE_LABEL[row.engine])}
          {row.model && <span className="block truncate font-mono text-2xs text-slate-500">{row.model}</span>}
        </td>
        <td className="max-w-[12rem] px-2 py-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium ${TONE_PILL[STATE_TONE[row.state]]}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[STATE_TONE[row.state]]}`} aria-hidden />
            {t(STATE_KEY[row.state])}
            {row.estimated && live && (
              <span className="text-slate-500" title={t("agents.estimatedHint")}>
                ≈
              </span>
            )}
          </span>
          {row.phase && <span className="block truncate text-2xs text-slate-500">{phaseText(row.phase, t)}</span>}
        </td>
        <td className="px-2 py-1.5 font-mono text-2xs tabular-nums text-slate-500">{row.lastActivity ? memoryAge(row.lastActivity, now, t) || clock(row.lastActivity) : "—"}</td>
        <td className="px-2 py-1.5 font-mono text-2xs tabular-nums text-slate-500">{clock(row.openedAt)}</td>
        <td className="px-2 py-1.5 font-mono text-2xs tabular-nums text-slate-500">{row.memory ? (memorySize !== undefined ? formatBytes(memorySize) : "…") : t("manage.memoryOff")}</td>
        <td className="px-2 py-1.5">
          <div className="flex items-center justify-end gap-0.5">
            <IconAction label={t("manage.showTerminal")} onClick={() => commands.revealPane(row.paneId)}>
              <SquareTerminal size={13} />
            </IconAction>
            <IconAction label={t("manage.message")} disabled={!live} onClick={() => onExpand(expanded === "message" ? null : "message")}>
              <MessageSquare size={13} />
            </IconAction>
            <IconAction label={t("manage.rename")} onClick={() => onExpand(expanded === "rename" ? null : "rename")}>
              <Pencil size={13} />
            </IconAction>
            <select
              aria-label={t("manage.color", { name })}
              title={t("manage.color", { name })}
              value={row.color}
              onChange={(e) => commands.setPaneColor(row.paneId, e.target.value as TerminalPaneColor)}
              className="h-6 w-6 cursor-pointer appearance-none rounded border border-line bg-transparent text-transparent"
              style={{ background: PANE_COLOR_VAR[row.color] ?? "transparent" }}
            >
              {TERMINAL_PANE_COLORS.map((c) => (
                <option key={c} value={c} className="bg-card text-slate-100">
                  {t(PANE_COLOR_LABEL[c])}
                </option>
              ))}
            </select>
            {row.launched && (
              <IconAction label={t("manage.role")} onClick={() => onExpand(expanded === "role" ? null : "role")}>
                <UserCog size={13} />
              </IconAction>
            )}
            <IconAction label={t("manage.memory")} onClick={onMemory}>
              <BookOpen size={13} />
            </IconAction>
            <IconAction label={t("manage.restart")} onClick={() => onConfirm("restart")}>
              <RotateCw size={13} />
            </IconAction>
            <IconAction label={t("manage.close")} onClick={() => onConfirm("close")}>
              <Power size={13} />
            </IconAction>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-line/60 bg-control">
          <td />
          <td colSpan={8} className="px-2 py-1.5">
            {expanded === "rename" ? (
              <RenameForm row={row} name={name} onDone={() => onExpand(null)} />
            ) : expanded === "role" ? (
              <RoleForm row={row} name={name} onDone={() => onExpand(null)} />
            ) : (
              <MessageForm row={row} name={name} onDone={() => onExpand(null)} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function IconAction({ label, onClick, disabled = false, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`${GHOST_ICON_BUTTON} disabled:opacity-30`}>
      {children}
    </button>
  );
}

function RenameForm({ row, name, onDone }: { row: ManageRow; name: string; onDone: () => void }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const [draft, setDraft] = useState(row.title || name);
  return (
    <form
      data-manage-rename=""
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const next = draft.trim();
        if (next && next !== row.title) commands.renamePane(row.paneId, next);
        onDone();
      }}
    >
      <input autoFocus aria-label={t("manage.rename")} value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} className={`${INPUT_CLASS} h-7 max-w-xs text-xs`} />
      <button type="submit" className={TOOL_BUTTON}>
        {t("common.save")}
      </button>
      <button type="button" onClick={onDone} className={TOOL_BUTTON}>
        {t("common.cancel")}
      </button>
    </form>
  );
}

/** Tur 13: kabuk ajanına rol + bellek. Kayıt bölmede kalıcı; izleyiciye rol hemen gider. */
function RoleForm({ row, name, onDone }: { row: ManageRow; name: string; onDone: () => void }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { record } = useFlow();
  const [role, setRole] = useState(row.role);
  const [memory, setMemory] = useState(Boolean(row.memory));
  return (
    <form
      data-manage-role=""
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const next = role.replace(/\s+/g, " ").trim();
        commands.setShellAgent(row.paneId, next, memory);
        void window.api.agentUpdate?.(row.paneId, { role: next })?.catch(() => false);
        if (next !== row.role) record({ at: Date.now(), workspaceId: row.workspaceId, kind: "note", paneId: row.paneId, name, detail: roleChangedDetail(row.role, next) });
        onDone();
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <input autoFocus aria-label={t("manage.roleInput")} placeholder={t("manage.roleInput")} value={role} maxLength={40} onChange={(e) => setRole(e.target.value)} className={`${INPUT_CLASS} h-7 max-w-xs text-xs`} />
        <label className="flex items-center gap-1 text-2xs text-slate-300">
          <input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} />
          {t("manage.roleMemory")}
        </label>
        <button type="submit" className={TOOL_BUTTON}>
          {t("common.save")}
        </button>
        <button type="button" onClick={onDone} className={TOOL_BUTTON}>
          {t("common.cancel")}
        </button>
      </div>
      <p className="text-2xs text-slate-500">{t("manage.roleShellHint")}</p>
    </form>
  );
}

function MessageForm({ row, name, onDone }: { row: ManageRow; name: string; onDone: () => void }) {
  const t = useT();
  const { record } = useFlow();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const body = text.replace(/\s+/g, " ").trim();
  return (
    <form
      data-manage-message=""
      className="flex flex-col gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body || sending) return;
        setSending(true);
        let result;
        try {
          result = await window.api.agentSend(row.workspaceId, row.paneId, body);
        } catch {
          result = { ok: false as const, reason: "writeFailed" as const };
        }
        setSending(false);
        if (result.ok) {
          record({ at: Date.now(), workspaceId: row.workspaceId, kind: "message", paneId: row.paneId, name, detail: body });
          onDone();
        } else {
          setNotice(t(SEND_FAILURE[result.reason] ?? "browser.fail.writeFailed"));
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          aria-label={t("manage.messageTo", { name })}
          placeholder={t("manage.messageTo", { name })}
          value={text}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setText(e.target.value)}
          className={`${INPUT_CLASS} h-7 min-w-0 flex-1 text-xs`}
        />
        <button type="submit" disabled={!body || sending} className={`${TOOL_BUTTON} disabled:opacity-40`}>
          {t("manage.send")}
        </button>
        <button type="button" onClick={onDone} className={TOOL_BUTTON}>
          {t("common.cancel")}
        </button>
      </div>
      {notice && (
        <p role="alert" className="text-2xs text-[var(--status-warning-text)]">
          {notice}
        </p>
      )}
    </form>
  );
}

/** Belleği açık ajanların dosya boyutu (Bellek görünümüyle aynı okuma; yalnız açık olanlar). */
function useMemorySizes(workspaces: readonly { id: string; panes: { id: string; kind: string; agent?: { memory?: string } }[] }[]): Record<string, number> {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const keys = workspaces
    .flatMap((w) => w.panes.filter((p) => p.kind === "agent" && p.agent?.memory).map((p) => `${w.id}:${p.id}`))
    .sort()
    .join("|");
  useEffect(() => {
    const read = typeof window === "undefined" ? undefined : window.api?.memoryRead;
    if (!read || !keys) return;
    let alive = true;
    for (const key of keys.split("|")) {
      const [workspaceId, paneId] = key.split(":");
      read(workspaceId, paneId).then(
        (res) => {
          if (alive && res.ok) setSizes((prev) => ({ ...prev, [key]: new TextEncoder().encode(res.content).length }));
        },
        () => {}
      );
    }
    return () => {
      alive = false;
    };
  }, [keys]);
  return sizes;
}
