import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useT } from "../i18n";
import type { SubtaskDraft } from "../../app-electron/shared/boardCommands";
import { SUBTASK_PROMPT_BODY_MAX } from "../../app-electron/shared/boardDispatch";
import {
  MAX_SUBTASKS,
  ROLE_HINT_MAX,
  SUBTASK_TITLE_MAX,
  type BoardTask,
  type Subtask
} from "../../app-electron/shared/boardTypes";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";

// Taslak (spec 2026-10-18 gorev-panosu §4): alt görevler düzenlenir, silinir,
// eklenir, sırası değişir. Onaysız hiçbir şey ajana gitmez. Değişiklik
// kaydedilmeden Böl kapalı: lider kullanıcının düzenlemesini ezmesin.

const INPUT =
  "h-7 w-full min-w-0 rounded border border-line bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-accent-500/60 disabled:opacity-60";
const AREA =
  "min-h-16 w-full min-w-0 rounded border border-line bg-transparent px-2 py-1 text-xs text-slate-200 outline-none focus:border-accent-500/60 disabled:opacity-60";
const ACTION = `${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`;

export function toDraft(s: Subtask): SubtaskDraft {
  return { id: s.id, title: s.title, prompt: s.prompt, roleHint: s.roleHint, dependsOn: [...s.dependsOn] };
}

export default function DraftEditor({
  task,
  busy,
  onSave,
  onSplit,
  onApprove,
  onDirtyChange
}: {
  task: BoardTask;
  busy: boolean;
  onSave: (drafts: SubtaskDraft[]) => Promise<boolean>;
  onSplit: () => void;
  onApprove: (drafts: SubtaskDraft[] | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const t = useT();
  const source = JSON.stringify(task.subtasks.map(toDraft));
  const [drafts, setDrafts] = useState<SubtaskDraft[]>(() => task.subtasks.map(toDraft));
  const [dirty, setDirty] = useState(false);
  const mounted = useRef(true);
  const locked = busy || task.planning === true;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Liderden gelen yeni plan, kullanıcı düzenlemiyorsa ekrana geliyor.
  useEffect(() => {
    if (!dirty) setDrafts(JSON.parse(source) as SubtaskDraft[]);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (next: SubtaskDraft[]) => {
    setDrafts(next);
    setDirty(true);
  };
  const patch = (id: string, change: Partial<SubtaskDraft>) => edit(drafts.map((d) => (d.id === id ? { ...d, ...change } : d)));
  const remove = (id: string) =>
    edit(drafts.filter((d) => d.id !== id).map((d) => ({ ...d, dependsOn: d.dependsOn.filter((dep) => dep !== id) })));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...drafts];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    edit(next);
  };
  const add = () => edit([...drafts, { id: crypto.randomUUID(), title: "", prompt: "", roleHint: "", dependsOn: [] }]);
  const toggleDep = (draft: SubtaskDraft, dep: string, on: boolean) =>
    patch(draft.id, { dependsOn: on ? [...draft.dependsOn, dep] : draft.dependsOn.filter((d) => d !== dep) });
  const label = (d: SubtaskDraft) => d.title.trim() || `#${drafts.indexOf(d) + 1}`;
  const complete = drafts.length > 0 && drafts.every((d) => d.title.trim() && d.prompt.trim());

  const save = async () => {
    const ok = await onSave(drafts);
    if (ok && mounted.current) setDirty(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {drafts.length === 0 && <p className="text-xs text-slate-400">{t("board.draftEmpty")}</p>}
      <ol className="flex flex-col gap-2">
        {drafts.map((d, i) => {
          const n = i + 1;
          return (
            <li key={d.id} data-draft={d.id} className="flex flex-col gap-1.5 rounded-md border border-line p-2">
              <div className="flex items-center gap-1">
                <span className="shrink-0 font-mono text-2xs text-slate-500">{n}.</span>
                <input
                  aria-label={t("board.subtaskTitle", { n })}
                  value={d.title}
                  maxLength={SUBTASK_TITLE_MAX}
                  disabled={locked}
                  onChange={(e) => patch(d.id, { title: e.target.value })}
                  className={INPUT}
                />
                <button type="button" aria-label={t("board.moveUp", { n })} title={t("board.moveUp", { n })} disabled={locked || i === 0} onClick={() => move(i, -1)} className={GHOST_ICON_BUTTON}>
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  aria-label={t("board.moveDown", { n })}
                  title={t("board.moveDown", { n })}
                  disabled={locked || i === drafts.length - 1}
                  onClick={() => move(i, 1)}
                  className={GHOST_ICON_BUTTON}
                >
                  <ArrowDown size={12} />
                </button>
                <button type="button" aria-label={t("board.removeSubtask", { n })} title={t("board.removeSubtask", { n })} disabled={locked} onClick={() => remove(d.id)} className={GHOST_ICON_BUTTON}>
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                aria-label={t("board.subtaskPrompt", { n })}
                value={d.prompt}
                maxLength={SUBTASK_PROMPT_BODY_MAX}
                rows={3}
                disabled={locked}
                onChange={(e) => patch(d.id, { prompt: e.target.value })}
                className={AREA}
              />
              <input
                aria-label={t("board.subtaskRole", { n })}
                placeholder={t("board.rolePlaceholder")}
                value={d.roleHint}
                maxLength={ROLE_HINT_MAX}
                disabled={locked}
                onChange={(e) => patch(d.id, { roleHint: e.target.value })}
                className={INPUT}
              />
              {drafts.length > 1 && (
                <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
                  <legend className="text-2xs text-slate-500">{t("board.dependsOn")}</legend>
                  {drafts
                    .filter((o) => o.id !== d.id)
                    .map((o) => (
                      <label key={o.id} className="flex items-center gap-1 text-2xs text-slate-300">
                        <input
                          type="checkbox"
                          aria-label={t("board.dependsOnItem", { n, title: label(o) })}
                          checked={d.dependsOn.includes(o.id)}
                          disabled={locked}
                          onChange={(e) => toggleDep(d, o.id, e.target.checked)}
                        />
                        {label(o)}
                      </label>
                    ))}
                </fieldset>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={add} disabled={locked || drafts.length >= MAX_SUBTASKS} className={ACTION}>
          <Plus size={12} />
          {t("board.addSubtask")}
        </button>
        <button type="button" onClick={() => void save()} disabled={locked || !dirty} className={ACTION}>
          {t("common.save")}
        </button>
        <button type="button" onClick={onSplit} disabled={locked || dirty} title={dirty ? t("board.splitDirty") : undefined} className={ACTION}>
          {t(task.leadError ? "board.retry" : "board.split")}
        </button>
        <button type="button" onClick={() => onApprove(dirty ? drafts : null)} disabled={locked || !complete} className={ACTION}>
          {t("board.approve")}
        </button>
      </div>
    </div>
  );
}
