// Bellek görünümünün altındaki "Öğren" kutusu ve öğrenme görevleri listesi.
// Kutu: ajan, konu, kaynaklar (proje / web — motorda web aracı varsa / ekip
// belleği ve Akış), hedef bellek. SAP kapsamı yok (bilinçli; ipucunda yazıyor).
// Liste: konu, ajan, durum, eklenen/güncellenen not, süre; iptal, geri al
// (satır içi onay), "bunu da öğren" önerileri.
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { GraduationCap, Undo2, X } from "lucide-react";
import { useT, type TranslateFn } from "../../i18n";
import type { TranslationKey } from "../../i18n/tr";
import type { AgentEngineId } from "../../../app-electron/shared/agentTypes";
import {
  engineHasWeb,
  learnDuration,
  LEARN_SCOPES,
  type LearnScope,
  type LearnTarget,
  type LearnTask
} from "../../../app-electron/shared/learnTasks";
import { TOOL_BUTTON } from "../../ui/buttons";
import { ENGINE_LABEL } from "../agentLabels";
import { useLearn } from "./learnContext";

export interface LearnAgent {
  id: string;
  name: string;
  engine?: AgentEngineId;
}

const STATE_CLASS: Record<LearnTask["state"], string> = {
  waiting: "border-[var(--status-warning-border)] text-[var(--status-warning-text)]",
  running: "border-line text-slate-300",
  done: "border-line text-slate-400",
  error: "border-[var(--status-danger-border)] text-[var(--status-danger-text)]"
};

export function formatDuration(ms: number | null, t: TranslateFn): string {
  if (ms === null) return "";
  const sec = Math.round(ms / 1000);
  return sec < 60 ? t("learn.sec", { n: sec }) : t("learn.min", { n: Math.round(sec / 60) });
}

export default function LearnPanel({ workspaceId, agents, preferredAgentId }: { workspaceId: string; agents: LearnAgent[]; preferredAgentId?: string | null }) {
  const t = useT();
  const { tasks, start } = useLearn();
  const ids = useId();
  const [agentId, setAgentId] = useState<string>(preferredAgentId ?? agents[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [scopes, setScopes] = useState<ReadonlySet<LearnScope>>(new Set<LearnScope>(["project"]));
  const [target, setTarget] = useState<LearnTarget>("team");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preferredAgentId && agents.some((a) => a.id === preferredAgentId)) setAgentId(preferredAgentId);
  }, [preferredAgentId, agents]);
  const agent = agents.find((a) => a.id === agentId) ?? agents[0] ?? null;
  const web = engineHasWeb(agent?.engine);
  const effective = LEARN_SCOPES.filter((s) => scopes.has(s) && (s !== "web" || web));
  const mine = tasks.filter((x) => x.workspaceId === workspaceId);

  const begin = async (text: string, from?: LearnTask) => {
    if (busy) return;
    const who = from ? agents.find((a) => a.id === from.paneId) ?? agent : agent;
    if (!who) return setNotice(t("learn.noAgent"));
    if (!text.trim()) return setNotice(t("learn.needTopic"));
    const list = from ? from.scopes.filter((s) => s !== "web" || engineHasWeb(who.engine)) : effective;
    if (list.length === 0) return setNotice(t("learn.needScope"));
    setBusy(true);
    const task = await start({ workspaceId, paneId: who.id, agentName: who.name, topic: text, scopes: list, target: from?.target ?? target });
    setBusy(false);
    if (!task) return setNotice(t("learn.needTopic"));
    setNotice(null);
    if (!from) setTopic("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void begin(topic);
  };

  const toggleScope = (s: LearnScope) =>
    setScopes((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <section data-learn-panel="" aria-labelledby={`${ids}-h`} className="shrink-0 border-t border-line bg-card px-4 py-2.5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <h2 id={`${ids}-h`} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <GraduationCap size={14} aria-hidden /> {t("learn.title")}
        </h2>
        <select
          aria-label={t("learn.agent")}
          value={agent?.id ?? ""}
          onChange={(e) => setAgentId(e.target.value)}
          disabled={agents.length === 0}
          className="h-8 max-w-[11rem] rounded-md border border-line bg-control px-2 text-xs text-slate-100"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          aria-label={t("learn.topicLabel")}
          placeholder={t("learn.topic")}
          maxLength={300}
          className="h-8 min-w-[12rem] flex-1 rounded-md border border-line bg-control px-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-line-strong"
        />
        <button type="submit" className={TOOL_BUTTON} disabled={busy || agents.length === 0}>
          {t("learn.submit")}
        </button>
      </form>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-slate-400">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">{t("learn.scopes")}</legend>
          <span aria-hidden className="text-slate-500">{t("learn.scopes")}</span>
          {LEARN_SCOPES.filter((s) => s !== "web" || web).map((s) => (
            <label key={s} className="inline-flex items-center gap-1">
              <input type="checkbox" checked={scopes.has(s)} onChange={() => toggleScope(s)} />
              {t(`learn.scope.${s}` as TranslationKey)}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">{t("learn.target")}</legend>
          <span aria-hidden className="text-slate-500">{t("learn.target")}</span>
          {(["team", "self"] as const).map((v) => (
            <label key={v} className="inline-flex items-center gap-1">
              <input type="radio" name={`${ids}-target`} checked={target === v} onChange={() => setTarget(v)} />
              {t(`learn.target.${v}` as TranslationKey)}
            </label>
          ))}
        </fieldset>
      </div>
      <p data-learn-hint="" className="mt-1 text-2xs leading-relaxed text-slate-500">
        {t("learn.hint")}
        {agent && !web ? ` ${t("learn.webHidden", { engine: agent.engine ? ENGINE_LABEL[agent.engine] : agent.name })}` : ""}
      </p>
      {notice && (
        <p role="status" className="mt-1 text-2xs text-[var(--status-warning-text)]">
          {notice}
        </p>
      )}
      {mine.length > 0 && (
        <div className="mt-2">
          <h3 className="text-2xs uppercase tracking-wide text-slate-500">{t("learn.tasks")}</h3>
          <ul data-learn-tasks="" aria-label={t("learn.tasks")} className="mt-1 max-h-44 space-y-1 overflow-y-auto">
            {mine.map((task) => (
              <TaskRow key={task.id} task={task} t={t} onSuggest={(s) => void begin(s, task)} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const REASON_KEY: Record<string, TranslationKey> = {
  busy: "learn.reason.busy",
  asking: "learn.reason.busy",
  typing: "learn.reason.busy",
  notSubmitted: "learn.reason.busy",
  agentError: "learn.reason.agentError",
  agentClosed: "learn.reason.agentClosed",
  notRunning: "learn.reason.agentClosed",
  noAgent: "learn.reason.agentClosed"
};

function TaskRow({ task, t, onSuggest }: { task: LearnTask; t: TranslateFn; onSuggest(topic: string): void }) {
  const { cancel, dismiss, undo } = useLearn();
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (task.state !== "running") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [task.state]);
  const duration = formatDuration(learnDuration(task, now), t);
  const reason = task.reason ? t(REASON_KEY[task.reason] ?? "learn.reason.other", { name: task.agentName }) : "";
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && confirm) {
      e.preventDefault();
      setConfirm(false);
    }
  };
  return (
    <li data-learn-task={task.id} data-learn-state={task.state} onKeyDown={onKey} className="rounded-md border border-line px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate text-slate-100" title={task.topic}>
          {task.topic}
        </span>
        <span className="shrink-0 text-2xs text-slate-500">{task.agentName}</span>
        <span className={`shrink-0 rounded-full border px-1.5 text-2xs ${STATE_CLASS[task.state]}`}>{t(`learn.state.${task.state}` as TranslationKey)}</span>
        {task.startedAt !== undefined && (
          <span className="shrink-0 text-2xs tabular-nums text-slate-500">
            {t("learn.counts", { added: task.added.length, updated: task.updated.length })}
            {duration ? ` · ${duration}` : ""}
          </span>
        )}
        {task.state === "waiting" && (
          <button type="button" className="shrink-0 text-2xs text-slate-400 hover:text-slate-200" onClick={() => cancel(task.id)}>
            {t("learn.cancel")}
          </button>
        )}
        {task.state === "done" && task.added.length > 0 && !confirm && (
          <button type="button" className="inline-flex shrink-0 items-center gap-1 text-2xs text-slate-400 hover:text-slate-200" onClick={() => setConfirm(true)}>
            <Undo2 size={11} aria-hidden /> {t("learn.undo")}
          </button>
        )}
        {(task.state === "done" || task.state === "error") && (
          <button type="button" className="shrink-0 text-slate-500 hover:text-slate-200" aria-label={t("learn.dismiss")} onClick={() => dismiss(task.id)}>
            <X size={12} />
          </button>
        )}
      </div>
      {reason && <p className="mt-0.5 text-2xs text-slate-400">{reason}</p>}
      {task.summary && <p className="mt-0.5 line-clamp-2 text-2xs text-slate-300">{task.summary}</p>}
      {task.undone && <p className="mt-0.5 text-2xs text-slate-500">{t("learn.undone")}</p>}
      {confirm && (
        <div role="group" aria-label={t("learn.undo")} className="mt-1 flex items-center gap-2 text-2xs">
          <span className="text-slate-300">{t("learn.undoConfirm", { count: task.added.length })}</span>
          <button
            type="button"
            autoFocus
            className="rounded border border-[var(--status-danger-border)] px-1.5 text-[var(--status-danger-text)]"
            onClick={async () => {
              setConfirm(false);
              await undo(task.id);
            }}
          >
            {t("learn.undoYes")}
          </button>
          <button type="button" className="text-slate-400 hover:text-slate-200" onClick={() => setConfirm(false)}>
            {t("learn.undoNo")}
          </button>
        </div>
      )}
      {task.state === "done" && task.suggestions && task.suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-2xs">
          <span className="text-slate-500">{t("learn.suggest")}</span>
          {task.suggestions.map((s) => (
            <button key={s} type="button" className="rounded-full border border-line px-2 text-slate-300 hover:bg-hover" onClick={() => onSuggest(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
