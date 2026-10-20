import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { useT } from "../i18n";
import type { BoardTask, Subtask } from "../../app-electron/shared/boardTypes";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useBoards } from "./boardContext";
import {
  BOARD_COLUMNS,
  COLUMN_KEY,
  NOTE_KEY,
  SUBTASK_STATE_KEY,
  sameFolderParallel,
  subtaskColumn,
  taskColor,
  taskColumn,
  taskProgress,
  reportRows,
  type BoardColumn,
  type ReportOutcome
} from "./boardDisplay";
import type { TranslationKey } from "../i18n/tr";
import { agentName } from "../agents/agentLabels";
import BoardDetailPanel from "./BoardDetailPanel";
import NewTaskDialog from "./NewTaskDialog";
import ConfirmDialog from "../components/ConfirmDialog";

// Görev panosu (spec 2026-10-18 gorev-panosu §8): Taslak · Sırada ·
// Çalışıyor · Doğrulama · Bitti. Ana görev kartı ilerlemesiyle; alt görevler
// kendi sütunlarında, görevin rengiyle (sol şerit). Takıldı/Başarısız mevcut
// `--status-danger-*` etiketiyle; lime yalnız seçili kartın çerçevesi.

export interface BoardSelection {
  taskId: string;
  subtaskId?: string;
}

const DANGER_TAG = "shrink-0 rounded bg-[var(--status-danger-bg)] px-1 text-2xs text-[var(--status-danger-text)]";
/** Sütun başlığındaki durum noktası (demo'daki "● To do" gibi; lime değil). */
const COLUMN_DOT: Record<BoardColumn, string> = {
  draft: "bg-slate-500",
  queued: "bg-[var(--status-info-text)]",
  running: "bg-[var(--status-warning-text)]",
  verifying: "bg-violet-400",
  done: "bg-[var(--status-success-text)]"
};

/** Onaylı görevlerin alt görev ilerlemesi (yalnız gösterim). */
function boardSummary(tasks: readonly BoardTask[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const task of tasks) {
    if (task.approvedAt === undefined) continue;
    const p = taskProgress(task);
    done += p.done;
    total += p.total;
  }
  return { done, total };
}

function Initial({ name, color }: { name: string; color: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line text-[9px] font-semibold leading-none text-slate-100"
      style={{ background: color ? `color-mix(in srgb, ${color} 30%, transparent)` : undefined }}
    >
      {Array.from(name.trim())[0]?.toLocaleUpperCase("tr-TR") ?? "?"}
    </span>
  );
}
const CARD = "w-full cursor-pointer rounded-md border bg-card text-left transition-colors";
const cardBorder = (selected: boolean) => (selected ? "border-accent-500/60" : "border-line hover:border-slate-500");

export default function BoardView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { boards, command } = useBoards();
  const board = boards[workspace.id];
  const tasks = board?.tasks ?? [];
  const [selection, setSelection] = useState<BoardSelection | null>(null);
  const [creating, setCreating] = useState(false);
  const [announce, setAnnounce] = useState("");
  const previous = useRef<Map<string, string> | null>(null);
  const mounted = useRef(true);
  const parallel = sameFolderParallel(tasks, workspace);
  const summary = boardSummary(tasks);
  const selectedTask = selection ? tasks.find((task) => task.id === selection.taskId) : undefined;
  const draftDirtyRef = useRef(false);
  /** Kaydedilmemiş değişiklik onayı bekleyen geçiş; null = panel kapat. */
  const [pendingChange, setPendingChange] = useState<{ selection: BoardSelection | null } | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Durum değişikliği tek satır, aria-live (spec §8).
  useEffect(() => {
    const now = new Map<string, string>();
    let message = "";
    for (const task of board?.tasks ?? []) {
      for (const s of task.subtasks) {
        now.set(s.id, s.state);
        const before = previous.current?.get(s.id);
        if (!message && before !== undefined && before !== s.state) {
          message = t("board.announce", { title: s.title, state: t(SUBTASK_STATE_KEY[s.state]) });
        }
      }
    }
    previous.current = now;
    if (message) setAnnounce(message);
  }, [board, t]);

  const applySelection = (next: BoardSelection | null) => {
    setSelection(next);
    draftDirtyRef.current = false;
  };
  // Seçili görev başka yerden silindiyse seçim ve kirli işaret de gider: atılacak taslak yokken onay sorulmaz.
  // Yalnız panoda bir kez görülmüş görev için: yeni oluşturulan görevin seçimi, pano güncellemesi
  // komut sonucundan sonra gelirse silinmiş sanılmasın.
  const seenTaskId = useRef<string | null>(null);
  if (selectedTask) seenTaskId.current = selectedTask.id;
  const selectionGone = selection !== null && selectedTask === undefined && seenTaskId.current === selection.taskId;
  useEffect(() => {
    if (!selectionGone) return;
    seenTaskId.current = null;
    setSelection(null);
    setPendingChange(null);
    draftDirtyRef.current = false;
  }, [selectionGone]);
  const select = (next: BoardSelection) => {
    if (draftDirtyRef.current && next.taskId !== selection?.taskId) {
      setPendingChange({ selection: next });
    } else {
      applySelection(next);
    }
  };
  const isSelected = (taskId: string, subtaskId?: string) =>
    selection?.taskId === taskId && selection.subtaskId === subtaskId;

  const items = (column: BoardColumn): ReactNode[] => {
    const out: ReactNode[] = [];
    for (const task of tasks) {
      const color = PANE_COLOR_VAR[taskColor(tasks, task.id)];
      if (taskColumn(task) === column) {
        out.push(<TaskCard key={task.id} task={task} color={color} selected={isSelected(task.id)} onSelect={() => select({ taskId: task.id })} />);
      }
      if (task.approvedAt === undefined) continue;
      for (const sub of task.subtasks) {
        if (subtaskColumn(sub) !== column) continue;
        const pane = sub.paneId ? workspace.panes.find((p) => p.id === sub.paneId) : undefined;
        out.push(
          <SubtaskCard
            key={sub.id}
            task={task}
            sub={sub}
            color={color}
            parallel={parallel.has(sub.id)}
            agent={pane ? { name: agentName(pane, t), color: pane.color ? PANE_COLOR_VAR[pane.color] : null } : null}
            selected={isSelected(task.id, sub.id)}
            onSelect={() => select({ taskId: task.id, subtaskId: sub.id })}
          />
        );
      }
    }
    return out;
  };

  return (
    <div className="flex h-full min-h-0">
      <section aria-label={t("board.boardLabel")} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={!board || !!board.unreadable}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("board.addTask")}
          </button>
          <p aria-live="polite" className="min-w-0 flex-1 truncate text-2xs text-slate-500">
            {announce}
          </p>
          {summary.total > 0 && (
            <span data-board-summary="" className="flex shrink-0 items-center gap-2 text-2xs text-slate-400">
              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-control" aria-hidden="true">
                <span className="block h-full rounded-full bg-[var(--status-success-text)]" style={{ width: `${Math.round((summary.done / summary.total) * 100)}%` }} />
              </span>
              <span className="font-mono tabular-nums">{t("board.summary", { done: summary.done, total: summary.total })}</span>
            </span>
          )}
        </div>
        {board?.recoveredFrom && (
          <div
            role="alert"
            className="flex shrink-0 items-center gap-2 rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-1.5 text-xs text-[var(--status-warning-text)]"
          >
            <span className="min-w-0 flex-1">{t("board.recovered", { file: board.recoveredFrom })}</span>
            <button
              type="button"
              onClick={() => void command(workspace.id, { type: "dismissWarning" })}
              title={t("common.close")}
              aria-label={t("common.close")}
              className={GHOST_ICON_BUTTON}
            >
              <X size={12} />
            </button>
          </div>
        )}
        {board?.unreadable && (
          <div
            role="alert"
            className="shrink-0 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-1.5 text-xs text-[var(--status-danger-text)]"
          >
            {t("board.unreadable")}
          </div>
        )}
        {!board && <p data-board-not-saved="" className="shrink-0 text-xs text-slate-400">{t("board.notSaved")}</p>}
        {board && !board.unreadable && tasks.length === 0 && <p className="shrink-0 text-xs text-slate-400">{t("board.empty")}</p>}
        <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
          {BOARD_COLUMNS.map((column) => {
            const list = items(column);
            return (
              <div key={column} className="flex min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-line-subtle bg-card/40 p-2">
                {/* Demo'daki şerit başlığı: renkli nokta + ad + sayı hapı. */}
                <h3 className="flex shrink-0 items-center gap-1.5 px-0.5 text-xs font-medium text-slate-200">
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${COLUMN_DOT[column]}`} />
                  <span className="truncate">{t(COLUMN_KEY[column])}</span>
                  <span className="ml-auto rounded-full bg-control px-1.5 font-mono text-2xs tabular-nums text-slate-400">{list.length}</span>
                </h3>
                <ul
                  role="list"
                  aria-label={t(COLUMN_KEY[column])}
                  data-column={column}
                  className={`chat-scroll flex min-h-0 flex-col gap-1.5 overflow-y-auto ${list.length > 0 ? "flex-1" : ""}`}
                >
                  {list}
                </ul>
                {list.length === 0 && (
                  <p data-column-empty="" className="rounded-md border border-dashed border-line py-4 text-center text-2xs text-slate-500">
                    {t("board.columnEmpty")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <Reports workspace={workspace} onSelect={(taskId, subtaskId) => applySelection({ taskId, subtaskId })} />
      </section>
      {selectedTask && (
        <BoardDetailPanel
          key={selectedTask.id}
          workspace={workspace}
          task={selectedTask}
          subtaskId={selection?.subtaskId}
          onClose={() => applySelection(null)}
          onSelectSubtask={(id) => setSelection({ taskId: selectedTask.id, subtaskId: id })}
          onDirtyChange={(dirty) => { draftDirtyRef.current = dirty; }}
        />
      )}
      {pendingChange !== null && (
        <ConfirmDialog
          open={true}
          role="alertdialog"
          danger={false}
          title={t("board.unsavedTitle")}
          message={t("board.unsavedBody")}
          confirmLabel={t("board.unsavedDiscard")}
          cancelLabel={t("board.unsavedCancel")}
          onConfirm={() => {
            const next = pendingChange.selection;
            setPendingChange(null);
            applySelection(next);
          }}
          onCancel={() => setPendingChange(null)}
        />
      )}
      <NewTaskDialog
        open={creating}
        onCancel={() => setCreating(false)}
        onCreate={async (title, goal) => {
          const result = await command(workspace.id, { type: "createTask", title, goal });
          if (result.ok && mounted.current) {
            setCreating(false);
            if (result.taskId) setSelection({ taskId: result.taskId });
          }
          return result;
        }}
      />
    </div>
  );
}

function TaskCard({ task, color, selected, onSelect }: { task: BoardTask; color: string | null; selected: boolean; onSelect: () => void }) {
  const t = useT();
  const progress = taskProgress(task);
  return (
    <li>
      <button
        type="button"
        data-task-card={task.id}
        aria-pressed={selected}
        onClick={onSelect}
        style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
        className={`${CARD} ${cardBorder(selected)} flex flex-col gap-1.5 px-3 py-2`}
      >
        <span title={task.title} className="line-clamp-2 break-words text-xs font-semibold text-slate-100">
          {task.title}
        </span>
        {task.approvedAt !== undefined && progress.total > 0 && (
          <span aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-control">
            <span className="block h-full rounded-full bg-[var(--status-success-text)]" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          </span>
        )}
        <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-400">
          {task.planning ? (
            <span className="truncate">{t("board.planning")}</span>
          ) : task.approvedAt !== undefined ? (
            <span className="font-mono tabular-nums">{t("board.progress", { done: progress.done, total: progress.total })}</span>
          ) : (
            <span className="truncate">{t(task.state === "awaitingApproval" ? "board.awaitingApproval" : "board.colDraft")}</span>
          )}
          {task.state === "stuck" && (
            <span data-danger="" className={DANGER_TAG}>
              {t("board.tagStuck")}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function SubtaskCard({
  task,
  sub,
  color,
  parallel,
  agent,
  selected,
  onSelect
}: {
  task: BoardTask;
  sub: Subtask;
  color: string | null;
  parallel: boolean;
  /** Atanan ajan (demo kartındaki kişi rozeti gibi). */
  agent: { name: string; color: string | null } | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const label = sub.state === "ready" && sub.held ? "board.stateHeld" : SUBTASK_STATE_KEY[sub.state];
  return (
    <li>
      <button
        type="button"
        data-subtask-card={sub.id}
        aria-pressed={selected}
        onClick={onSelect}
        style={color ? { boxShadow: `inset 2px 0 0 ${color}` } : undefined}
        className={`${CARD} ${cardBorder(selected)} flex flex-col gap-1 px-2.5 py-2`}
      >
        <span title={task.title} className="truncate text-2xs text-slate-500">
          {task.title}
        </span>
        <span title={sub.title} className="line-clamp-2 break-words text-xs font-medium text-slate-100">
          {sub.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-400">
          {agent && (
            <span data-subtask-agent="" className="flex min-w-0 max-w-[50%] shrink-0 items-center gap-1 text-slate-300" title={agent.name}>
              <Initial name={agent.name} color={agent.color} />
              <span className="truncate">{agent.name}</span>
            </span>
          )}
          {sub.state === "failed" ? (
            <span data-danger="" className={DANGER_TAG}>
              {t("board.stateFailed")}
            </span>
          ) : (
            <span className="truncate">{t(label)}</span>
          )}
          {sub.note && <span className="truncate text-slate-500">· {t(NOTE_KEY[sub.note])}</span>}
        </span>
        {parallel && <span className="truncate text-2xs text-[var(--status-warning-text)]">{t("board.parallel")}</span>}
      </button>
    </li>
  );
}

const OUTCOME_KEY: Record<ReportOutcome, TranslationKey> = {
  verified: "board.reportVerified",
  manual: "board.reportManual",
  done: "board.reportDone",
  failed: "board.reportFailed"
};

/** Son raporların önizlemesi; tamamı ayrı Raporlar ekranında (2026-10-19). */
const REPORT_PREVIEW = 3;

/** Raporlar (spec 2026-10-18 ajanlar-yeniden §2b): son biten alt görevler + Raporlar ekranına bağlantı. */
function Reports({ workspace, onSelect }: { workspace: TerminalWorkspace; onSelect: (taskId: string, subtaskId: string) => void }) {
  const t = useT();
  const { boards } = useBoards();
  const { commands } = useTerminalStore();
  const all = reportRows(boards[workspace.id]);
  const rows = all.slice(0, REPORT_PREVIEW);
  return (
    <section aria-label={t("board.reports")} className="flex max-h-48 shrink-0 flex-col gap-1.5 border-t border-line pt-2">
      <div className="flex items-center gap-2">
        <Eyebrow count={all.length} className="flex-1">
          {t("board.reports")}
        </Eyebrow>
        <button
          type="button"
          data-open-reports=""
          onClick={() => commands.setWorkspaceView(workspace.id, "reports")}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-slate-300 hover:bg-hover hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {t("reports.openScreen")}
          <ArrowRight size={11} aria-hidden="true" />
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-2xs text-slate-500">{t("board.reportsEmpty")}</p>
      ) : (
        <ul className="chat-scroll flex min-h-0 flex-col gap-0.5 overflow-y-auto">
          {rows.map((row) => {
            const pane = workspace.panes.find((p) => p.id === row.subtask.paneId);
            const failed = row.outcome === "failed";
            return (
              <li key={`${row.task.id}/${row.subtask.id}`}>
                <button
                  type="button"
                  data-report={row.outcome}
                  onClick={() => onSelect(row.task.id, row.subtask.id)}
                  className="flex w-full cursor-pointer items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-hover"
                >
                  <span className="min-w-0 flex-1 truncate text-slate-200" title={row.subtask.title}>
                    {row.subtask.title}
                  </span>
                  {pane && <span className="max-w-[10rem] shrink-0 truncate text-2xs text-slate-500">{agentName(pane, t)}</span>}
                  <span className={failed ? DANGER_TAG : "shrink-0 text-2xs text-slate-400"}>{t(OUTCOME_KEY[row.outcome])}</span>
                  {row.commands && (
                    <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">
                      {t("board.reportCommands", { passed: row.commands.passed, total: row.commands.total })}
                    </span>
                  )}
                  {row.at > 0 && (
                    <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-600">
                      {new Date(row.at).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
