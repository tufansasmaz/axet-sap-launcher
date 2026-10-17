import { useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { BoardCommandResult } from "../../app-electron/shared/boardCommands";
import { TASK_GOAL_MAX, TASK_TITLE_MAX } from "../../app-electron/shared/boardTypes";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { FAILURE_KEY } from "./boardView";

// "+ Görev" (spec 2026-10-18 gorev-panosu §3): başlık + hedef. Gönderim
// uçuştayken ikinci gönderim yok; pencere kapandıktan sonra durum yazılmıyor.

const INPUT =
  "h-7 w-full min-w-0 rounded border border-line bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-accent-500/60";
const AREA =
  "min-h-24 w-full min-w-0 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function NewTaskDialog({
  open,
  onCreate,
  onCancel
}: {
  open: boolean;
  onCreate: (title: string, goal: string) => Promise<BoardCommandResult>;
  onCancel: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setGoal("");
    setError(null);
    setBusy(false);
    busyRef.current = false;
  }, [open]);

  const valid = title.trim() !== "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const result = await onCreate(title.trim(), goal.trim());
    if (!mounted.current) return;
    busyRef.current = false;
    setBusy(false);
    if (!result.ok) setError(FAILURE_KEY[result.reason]);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("board.newTaskTitle")} size="md">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("board.titleLabel")}</span>
          <input
            aria-label={t("board.titleLabel")}
            value={title}
            maxLength={TASK_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("board.goalLabel")}</span>
          <textarea
            aria-label={t("board.goalLabel")}
            value={goal}
            maxLength={TASK_GOAL_MAX}
            rows={5}
            onChange={(e) => setGoal(e.target.value)}
            className={AREA}
          />
          <p className="text-2xs text-slate-500">{t("board.goalHint")}</p>
        </div>
        {error && (
          <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
            {t(error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <ModalCancelButton />
          <button type="submit" disabled={!valid || busy} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("board.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
