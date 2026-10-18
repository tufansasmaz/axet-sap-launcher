import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { BoardCommand, SubtaskDraft } from "../../app-electron/shared/boardCommands";
import type { BoardTask, Proof, Subtask } from "../../app-electron/shared/boardTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import ConfirmDialog from "../components/ConfirmDialog";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { agentName } from "../agents/agentLabels";
import { useBoards } from "./boardContext";
import { assignablePanes, FAILURE_KEY, LEAD_ERROR_KEY, NOTE_KEY, SUBTASK_STATE_KEY } from "./boardDisplay";
import DraftEditor from "./DraftEditor";

// Ayrıntı paneli (spec 2026-10-18 gorev-panosu §8): hedef, lider durumu,
// taslak ya da alt görev listesi (istem, rol ipucu, bağımlılık, ajan seçici),
// kanıt ve düğmeler. Komut uçuştayken bütün düğmeler kilitli; panel
// söküldükten sonra durum yazılmıyor. "Elle onaylandı" yeşil işaretle
// gösterilmiyor.

const ACTION = `${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`;
const SELECT =
  "h-7 min-w-0 flex-1 rounded border border-line bg-transparent px-1.5 text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function BoardDetailPanel({
  workspace,
  task,
  subtaskId,
  onClose,
  onSelectSubtask,
  onDirtyChange
}: {
  workspace: TerminalWorkspace;
  task: BoardTask;
  subtaskId?: string;
  onClose: () => void;
  onSelectSubtask: (subtaskId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const t = useT();
  const { command } = useBoards();
  const { commands } = useTerminalStore();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  const hasVerify = (workspace.verify?.length ?? 0) > 0;
  const panes = assignablePanes(workspace);

  const handleDirtyChange = (dirty: boolean) => {
    setEditorDirty(dirty);
    onDirtyChange?.(dirty);
  };

  const requestClose = () => {
    if (editorDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Komutları sırayla gönderir; ilk hatada durur. Uçuştayken ikinci çağrı yok sayılır. */
  const run = async (...cmds: BoardCommand[]): Promise<boolean> => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    let ok = true;
    for (const cmd of cmds) {
      const result = await command(workspace.id, cmd);
      if (!result.ok) {
        ok = false;
        if (mounted.current) setError(FAILURE_KEY[result.reason]);
        break;
      }
    }
    pendingRef.current = false;
    if (mounted.current) setPending(false);
    return ok;
  };

  const ids = { taskId: task.id };
  const saveCommand = (drafts: SubtaskDraft[]): BoardCommand => ({ type: "saveDraft", taskId: task.id, title: task.title, goal: task.goal, subtasks: drafts });
  const goToTerminal = (paneId: string) => {
    commands.setWorkspaceView(workspace.id, "panes");
    commands.revealPane(paneId);
  };
  const paneName = (paneId: string | null) => {
    const pane = paneId ? workspace.panes.find((p) => p.id === paneId) : undefined;
    return pane ? agentName(pane, t) : null;
  };
  const titleOf = (id: string) => task.subtasks.find((s) => s.id === id)?.title ?? id;

  return (
    <aside aria-label={t("board.detailLabel")} className="flex w-96 shrink-0 flex-col border-l border-line">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
        <h2 title={task.title} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
          {task.title}
        </h2>
        <button type="button" onClick={requestClose} title={t("board.closeDetail")} aria-label={t("board.closeDetail")} className={GHOST_ICON_BUTTON}>
          <X size={14} />
        </button>
      </div>

      <div className="chat-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {task.goal && (
          <section className="flex flex-col gap-1">
            <span className="text-2xs text-slate-500">{t("board.goalLabel")}</span>
            <p className="whitespace-pre-wrap break-words text-xs text-slate-300">{task.goal}</p>
          </section>
        )}

        {task.planning && <p className="text-xs text-slate-400">{t("board.planning")}</p>}
        {task.leadChangedFiles && <p className="text-xs text-[var(--status-warning-text)]">{t("board.leadChangedFiles")}</p>}
        {task.leadError && (
          <div role="alert" className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-2 py-1.5 text-xs text-[var(--status-danger-text)]">
            <p>{t(LEAD_ERROR_KEY[task.leadError])}</p>
            {task.leadDetail && <p className="mt-1 whitespace-pre-wrap break-words">{task.leadDetail}</p>}
          </div>
        )}
        {task.leadRaw && (
          <details className="text-2xs text-slate-400">
            <summary className="cursor-pointer">{t("board.leadRaw")}</summary>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">{task.leadRaw}</pre>
          </details>
        )}

        {task.approvedAt === undefined ? (
          <DraftEditor
            task={task}
            busy={pending}
            onSave={(drafts) => run(saveCommand(drafts))}
            onSplit={() => void run({ type: "split", ...ids })}
            onApprove={(drafts) => void (drafts ? run(saveCommand(drafts), { type: "approve", ...ids }) : run({ type: "approve", ...ids }))}
            onDirtyChange={handleDirtyChange}
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {task.subtasks.map((s) => (
              <li
                key={s.id}
                data-detail-subtask={s.id}
                onClick={() => onSelectSubtask(s.id)}
                className={`flex flex-col gap-1.5 rounded-md border p-2 ${s.id === subtaskId ? "border-accent-500/60" : "border-line"}`}
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200" title={s.title}>
                    {s.title}
                  </span>
                  {s.state === "failed" ? (
                    <span className="shrink-0 rounded bg-[var(--status-danger-bg)] px-1 text-2xs text-[var(--status-danger-text)]">{t("board.stateFailed")}</span>
                  ) : (
                    <span className="shrink-0 text-2xs text-slate-400">{t(s.state === "ready" && s.held ? "board.stateHeld" : SUBTASK_STATE_KEY[s.state])}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 text-2xs text-slate-500">
                  {paneName(s.paneId) && <span>{t("board.agentLabel", { name: paneName(s.paneId) ?? "" })}</span>}
                  {s.attempts > 0 && <span>{t("board.attempts", { count: s.attempts })}</span>}
                  {s.roleHint && <span>{t("board.roleHint", { role: s.roleHint })}</span>}
                  {s.dependsOn.length > 0 && <span>{t("board.dependsOnList", { list: s.dependsOn.map(titleOf).join(", ") })}</span>}
                  {s.note && <span>{t(NOTE_KEY[s.note])}</span>}
                </div>
                <details className="text-2xs text-slate-400">
                  <summary className="cursor-pointer">{t("board.prompt")}</summary>
                  <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{s.prompt}</p>
                </details>
                {s.proof && <ProofView proof={s.proof} />}
                <SubtaskActions
                  sub={s}
                  hasVerify={hasVerify}
                  busy={pending}
                  panes={panes.map((p) => ({ id: p.id, name: agentName(p, t) }))}
                  pick={picks[s.id] ?? panes[0]?.id ?? ""}
                  onPick={(paneId) => setPicks((prev) => ({ ...prev, [s.id]: paneId }))}
                  onRun={(cmd) => void run(cmd)}
                  onTerminal={goToTerminal}
                  taskId={task.id}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
        {error && (
          <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
            {t(error)}
          </p>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending} className={`${ACTION} hover:text-[var(--status-danger-text)]`}>
            {t("common.delete")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        role="alertdialog"
        title={t("board.deleteTitle")}
        message={t("board.deleteBody", { title: task.title })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          setConfirmDelete(false);
          void run({ type: "deleteTask", ...ids }).then((ok) => {
            if (ok) onClose();
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmClose}
        role="alertdialog"
        danger={false}
        title={t("board.unsavedTitle")}
        message={t("board.unsavedBody")}
        confirmLabel={t("board.unsavedDiscard")}
        cancelLabel={t("board.unsavedCancel")}
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </aside>
  );
}

function ProofView({ proof }: { proof: Proof }) {
  const t = useT();
  if (proof.kind === "manual") return <p className="text-2xs text-slate-400">{t("board.proofManual")}</p>;
  return (
    <div className="flex flex-col gap-1">
      {proof.ok ? (
        <p data-proof-ok="" className="flex items-center gap-1 text-2xs text-[var(--status-success-text)]">
          <Check size={12} />
          {t("board.proofOk")}
        </p>
      ) : (
        <p className="text-2xs text-[var(--status-danger-text)]">{t("board.proofFailed")}</p>
      )}
      {proof.commands.map((c, i) => (
        <div key={`${i}-${c.command}`} className="flex flex-col gap-0.5 rounded border border-line px-2 py-1">
          <div className="flex min-w-0 items-baseline gap-2 text-2xs">
            <code className="min-w-0 flex-1 truncate font-mono text-slate-300" title={c.command}>
              {c.command}
            </code>
            <span className="shrink-0 text-slate-500">
              {c.error === "missingDir"
                ? t("board.missingDir")
                : c.error === "spawn"
                  ? t("board.spawnFailed")
                  : c.timedOut
                    ? t("board.noteTimeout")
                    : c.exitCode === null
                      ? t("board.exitNone")
                      : t("board.exitCode", { code: c.exitCode })}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-slate-500">{t("board.duration", { sec: Math.max(0, Math.round(c.durationMs / 1000)) })}</span>
          </div>
          {c.tail && (
            <details className="text-2xs text-slate-400">
              <summary className="cursor-pointer">{t("board.tail")}</summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">{c.tail}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function SubtaskActions({
  sub,
  taskId,
  hasVerify,
  busy,
  panes,
  pick,
  onPick,
  onRun,
  onTerminal
}: {
  sub: Subtask;
  taskId: string;
  hasVerify: boolean;
  busy: boolean;
  panes: { id: string; name: string }[];
  pick: string;
  onPick: (paneId: string) => void;
  onRun: (cmd: BoardCommand) => void;
  onTerminal: (paneId: string) => void;
}) {
  const t = useT();
  const ids = { taskId, subtaskId: sub.id };
  const verifyOrApprove = hasVerify ? (
    <button type="button" disabled={busy} onClick={() => onRun({ type: "verify", ...ids })} className={ACTION}>
      {t("board.verify")}
    </button>
  ) : (
    <button type="button" disabled={busy} onClick={() => onRun({ type: "approveManual", ...ids })} className={ACTION}>
      {t("board.approve")}
    </button>
  );
  const terminal = sub.paneId ? (
    <button type="button" disabled={busy} onClick={() => onTerminal(sub.paneId as string)} className={ACTION}>
      {t("board.goTerminal")}
    </button>
  ) : null;

  switch (sub.state) {
    case "waiting":
    case "done":
      return null;
    case "ready":
      return (
        <div className="flex flex-col gap-1.5">
          {panes.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <select aria-label={t("board.agentPick")} value={pick} onChange={(e) => onPick(e.target.value)} className={SELECT}>
                {panes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy || !pick} onClick={() => onRun({ type: "assign", ...ids, paneId: pick })} className={ACTION}>
                {t("board.assign")}
              </button>
            </div>
          ) : (
            <p className="text-2xs text-slate-500">{t("board.noAgents")}</p>
          )}
          {sub.held && (
            <div>
              <button type="button" disabled={busy} onClick={() => onRun({ type: "requeue", ...ids })} className={ACTION}>
                {t("board.requeue")}
              </button>
            </div>
          )}
        </div>
      );
    case "running":
    case "asking":
      return (
        <div className="flex flex-wrap gap-1.5">
          {terminal}
          {verifyOrApprove}
        </div>
      );
    case "verifying":
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {terminal}
          {/* Yalnız iş gerçekten çalışırken yazı; işi olmayan verifying'de Doğrula/Onayla (takılı kalmasın). */}
          {sub.verifyRunning ? <span className="text-2xs text-slate-400">{t("board.verifyingNow")}</span> : verifyOrApprove}
        </div>
      );
    case "failed":
      return (
        <div className="flex flex-wrap gap-1.5">
          {sub.paneId && (
            <button type="button" disabled={busy} onClick={() => onRun({ type: "sendBack", ...ids })} className={ACTION}>
              {t("board.sendBack")}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => onRun({ type: "requeue", ...ids })} className={ACTION}>
            {t("board.requeue")}
          </button>
          {hasVerify && verifyOrApprove}
          {terminal}
        </div>
      );
  }
}
