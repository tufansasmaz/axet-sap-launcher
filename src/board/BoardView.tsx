import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
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
  type BoardColumn
} from "./boardDisplay";
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
        out.push(
          <SubtaskCard
            key={sub.id}
            task={task}
            sub={sub}
            color={color}
            parallel={parallel.has(sub.id)}
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
              <div key={column} className="flex min-h-0 min-w-0 flex-col gap-1.5">
                <Eyebrow count={list.length}>{t(COLUMN_KEY[column])}</Eyebrow>
                <ul
                  role="list"
                  aria-label={t(COLUMN_KEY[column])}
                  data-column={column}
                  className="chat-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
                >
                  {list}
                </ul>
              </div>
            );
          })}
        </div>
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
        className={`${CARD} ${cardBorder(selected)} flex flex-col gap-1 px-3 py-2`}
      >
        <span title={task.title} className="truncate text-xs font-medium text-slate-200">
          {task.title}
        </span>
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
  selected,
  onSelect
}: {
  task: BoardTask;
  sub: Subtask;
  color: string | null;
  parallel: boolean;
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
        className={`${CARD} ${cardBorder(selected)} flex flex-col gap-0.5 px-2.5 py-1.5`}
      >
        <span title={task.title} className="truncate text-2xs text-slate-500">
          {task.title}
        </span>
        <span title={sub.title} className="truncate text-xs text-slate-200">
          {sub.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-400">
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
