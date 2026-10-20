// Raporlar — biten ve başarısız alt görevlerin raporları (2026-10-19). Raydaki
// ikinci görünüm (Pano'nun yanında). Veri reports.ts'te mevcut kaynaklardan
// derleniyor: pano, kalıcı Akış geçmişi, Değişiklikler kaydı. Solda süzülebilir
// liste, sağda seçilen raporun ayrıntısı; Markdown dışa aktarma kaydet
// diyaloğuyla (ana süreç). Renk yalnız durum jetonlarından; lime yalnız seçili
// satırın çizgisinde.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, CircleDot, Download, FileText, Hand, X } from "lucide-react";
import { useLanguage, useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { useBoards } from "../board/boardContext";
import { useChangesFocus } from "../changes/changesFocus";
import { Eyebrow } from "../ui/Eyebrow";
import { agentName } from "./agentLabels";
import { TONE_PILL } from "./agentView";
import { useFlow } from "./flowContext";
import { flowBody } from "./flowText";
import {
  DATE_FILTERS,
  OUTCOME_KEY,
  agentKey,
  buildReports,
  durationText,
  filterReports,
  nextSteps,
  reportFileName,
  reportMarkdown,
  reportsMarkdown,
  sinceOf,
  type DateFilter,
  type Report
} from "./reports";
import { useWorkspaceChanges } from "./useRailCounts";

const DATE_KEY: Record<DateFilter, TranslationKey> = {
  all: "reports.dateAll",
  today: "reports.dateToday",
  "7d": "reports.date7d",
  "30d": "reports.date30d"
};
const OUTCOMES: Report["outcome"][] = ["verified", "manual", "done", "failed"];
// Sonuç hapı (demo'daki "checked"/"ready" çipleri gibi): yuvarlak, tonlu kenarlık.
const OUTCOME_STYLE: Record<Report["outcome"], { icon: typeof CheckCircle2; className: string }> = {
  verified: { icon: CheckCircle2, className: TONE_PILL.success },
  manual: { icon: Hand, className: TONE_PILL.muted },
  done: { icon: CircleDot, className: TONE_PILL.muted },
  failed: { icon: CircleAlert, className: TONE_PILL.danger }
};
const SELECT = "rounded-md border border-line bg-control px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500";
const LINK = "rounded px-1.5 py-0.5 text-2xs text-slate-300 underline-offset-2 hover:bg-hover hover:text-slate-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500";

function Outcome({ outcome }: { outcome: Report["outcome"] }) {
  const t = useT();
  const { icon: Icon, className } = OUTCOME_STYLE[outcome];
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-2xs font-medium ${className}`}>
      <Icon size={12} aria-hidden="true" />
      {t(OUTCOME_KEY[outcome])}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-line pt-3">
      <Eyebrow as="div">{title}</Eyebrow>
      {children}
    </section>
  );
}

export default function ReportsView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const language = useLanguage();
  const { commands } = useTerminalStore();
  const { boards } = useBoards();
  const { events: allEvents } = useFlow();
  const { requestFocus } = useChangesFocus();
  const changes = useWorkspaceChanges(workspace.id, workspace.root ?? "");
  const [agent, setAgent] = useState("");
  const [outcome, setOutcome] = useState<Report["outcome"] | "">("");
  const [date, setDate] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const events = useMemo(() => allEvents.filter((e) => e.workspaceId === workspace.id), [allEvents, workspace.id]);
  const nameOf = (paneId: string | null) => {
    const pane = paneId ? workspace.panes.find((p) => p.id === paneId) : undefined;
    return pane ? agentName(pane, t) : "";
  };
  const reports = buildReports(boards[workspace.id], events, changes?.checkpoints ?? [], nameOf);
  const shown = filterReports(reports, { agent, outcome, since: sinceOf(date, Date.now()), query });
  const agents = [...new Map(reports.filter((r) => r.agent || r.paneId).map((r) => [agentKey(r), r.agent || t("reports.unknownAgent")])).entries()];
  const current = reports.find((r) => r.key === selected) ?? null;
  const filtered = agent !== "" || outcome !== "" || date !== "all" || query.trim() !== "";

  // Seçili rapor süzgeçle gizlenirse ayrıntı açık kalır (kullanıcı kapatana dek); yok olduysa kapanır.
  useEffect(() => {
    if (selected && !reports.some((r) => r.key === selected)) setSelected(null);
  }, [selected, reports]);

  const clear = () => {
    setAgent("");
    setOutcome("");
    setDate("all");
    setQuery("");
  };

  const save = async (text: string, name: string) => {
    try {
      const result = await window.api.reportsSaveMarkdown(text, name);
      if (result.canceled) return;
      setNotice(result.error ? { text: t("reports.exportFailed", { error: result.error }), error: true } : { text: t("reports.exported", { path: result.filePath ?? "" }), error: false });
    } catch (error) {
      setNotice({ text: t("reports.exportFailed", { error: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-report-key]") ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, at + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const when = (at: number) => new Date(at).toLocaleString(language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section aria-label={t("reports.view")} data-reports-view="" className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-end gap-3 border-b border-line px-14 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium text-slate-100">{t("reports.view")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("reports.subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={shown.length === 0}
          onClick={() => void save(reportsMarkdown(shown, t, language), reportFileName(`${workspace.name} ${t("reports.view")}`))}
          className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-slate-200 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <Download size={13} aria-hidden="true" />
          {t("reports.exportAll")}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-14 py-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("reports.search")}
          aria-label={t("reports.search")}
          className={`${SELECT} min-w-[14rem] flex-1`}
        />
        <select aria-label={t("reports.filterAgent")} value={agent} onChange={(e) => setAgent(e.target.value)} className={SELECT}>
          <option value="">{t("reports.allAgents")}</option>
          {agents.map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label={t("reports.filterOutcome")} value={outcome} onChange={(e) => setOutcome(e.target.value as Report["outcome"] | "")} className={SELECT}>
          <option value="">{t("reports.allOutcomes")}</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {t(OUTCOME_KEY[o])}
            </option>
          ))}
        </select>
        <select aria-label={t("reports.filterDate")} value={date} onChange={(e) => setDate(e.target.value as DateFilter)} className={SELECT}>
          {DATE_FILTERS.map((d) => (
            <option key={d} value={d}>
              {t(DATE_KEY[d])}
            </option>
          ))}
        </select>
        <span className="text-2xs tabular-nums text-slate-500">{t("reports.count", { count: shown.length })}</span>
        {filtered && (
          <button type="button" onClick={clear} className={LINK}>
            {t("reports.clearFilters")}
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className={`mx-14 mb-2 text-2xs ${notice.error ? "text-[var(--status-danger-text)]" : "text-slate-400"}`}>
          {notice.text}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-14 pb-4 lg:flex-row">
        <div className="chat-scroll min-h-0 overflow-y-auto lg:w-[42%] lg:shrink-0">
          {reports.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{t("reports.empty")}</p>
          ) : shown.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{t("reports.noMatch")}</p>
          ) : (
            <ul ref={listRef} aria-label={t("reports.list")} onKeyDown={onListKey} className="flex flex-col gap-1.5">
              {shown.map((r) => {
                const on = r.key === selected;
                const stats = r.checkpoint?.stats;
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      data-report-key={r.key}
                      aria-current={on ? "true" : undefined}
                      onClick={() => setSelected(r.key)}
                      className={`flex w-full flex-col gap-1 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                        on ? "border-accent-400" : "border-line"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Outcome outcome={r.outcome} />
                        <span className="min-w-0 flex-1 truncate text-2xs text-slate-500">{r.task.title}</span>
                        {r.at > 0 && <span className="shrink-0 text-2xs tabular-nums text-slate-500">{when(r.at)}</span>}
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-100">{r.subtask.title}</span>
                      {r.reply && <span className="line-clamp-2 text-xs leading-snug text-slate-400">{r.reply}</span>}
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500">
                        <span className="flex items-center gap-1 text-slate-300">
                          <span
                            aria-hidden="true"
                            className="flex h-4 w-4 items-center justify-center rounded border border-line bg-control text-[9px] font-semibold leading-none text-slate-200"
                          >
                            {Array.from((r.agent || "?").trim())[0]?.toLocaleUpperCase("tr-TR") ?? "?"}
                          </span>
                          {r.agent || t("reports.unknownAgent")}
                        </span>
                        <span>
                          {t("reports.duration")}: {durationText(r.durationMs, t)}
                        </span>
                        {r.commands && <span className="tabular-nums">{t("board.reportCommands", { passed: r.commands.passed, total: r.commands.total })}</span>}
                        {stats && <span className="tabular-nums">{t("reports.changesStats", { files: stats.files, added: stats.added, deleted: stats.deleted })}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
          {current ? (
            <Detail
              report={current}
              when={when}
              onClose={() => setSelected(null)}
              onExport={() => void save(reportMarkdown(current, t, language), reportFileName(current.subtask.title))}
              onChanges={() => {
                requestFocus(workspace.id, current.subtask.id);
                commands.setWorkspaceView(workspace.id, "changes");
              }}
              onTask={() => commands.setWorkspaceView(workspace.id, "board")}
              onTerminal={current.paneId && workspace.panes.some((p) => p.id === current.paneId) ? () => commands.revealPane(current.paneId!) : undefined}
            />
          ) : (
            reports.length > 0 && (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line text-center">
                <FileText size={20} aria-hidden="true" className="text-slate-500" />
                <p className="text-xs text-slate-500">{t("reports.select")}</p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function Detail({
  report: r,
  when,
  onClose,
  onExport,
  onChanges,
  onTask,
  onTerminal
}: {
  report: Report;
  when: (at: number) => string;
  onClose: () => void;
  onExport: () => void;
  onChanges: () => void;
  onTask: () => void;
  onTerminal?: () => void;
}) {
  const t = useT();
  const proof = r.subtask.proof;
  const stats = r.checkpoint?.stats;
  const next = nextSteps(r);
  return (
    <section aria-label={t("reports.detail")} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-slate-100">{r.subtask.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-400">
            <Outcome outcome={r.outcome} />
            <span>
              {t("reports.agent")}: <span className="text-slate-200">{r.agent || t("reports.unknownAgent")}</span>
            </span>
            <span>
              {t("reports.task")}: <span className="text-slate-200">{r.task.title}</span>
            </span>
            <span>
              {t("reports.duration")}: <span className="tabular-nums text-slate-200">{durationText(r.durationMs, t)}</span>
            </span>
            {r.at > 0 && <span className="tabular-nums">{when(r.at)}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-2xs text-slate-200 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <Download size={12} aria-hidden="true" />
          {t("reports.export")}
        </button>
        <button
          type="button"
          aria-label={t("reports.close")}
          title={t("reports.close")}
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-hover hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={onTask} className={LINK}>
          {t("reports.openTask")}
        </button>
        {onTerminal && (
          <button type="button" onClick={onTerminal} className={LINK}>
            {t("reports.openTerminal")}
          </button>
        )}
      </div>

      <Section title={t("reports.summary")}>
        {r.reply ? (
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">{r.reply}</p>
        ) : (
          <p className="text-2xs text-slate-500">{t("reports.noReply")}</p>
        )}
      </Section>

      <Section title={t("reports.verification")}>
        {!proof ? (
          <p className="text-2xs text-slate-500">{t("reports.noProof")}</p>
        ) : proof.kind === "manual" ? (
          <p className="text-2xs text-slate-400">{t("reports.manualProof")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {proof.commands.map((c, i) => {
              const passed = c.exitCode === 0 && !c.timedOut && !c.error;
              return (
                <li key={i} className="flex items-center gap-2 font-mono text-2xs">
                  {passed ? (
                    <CheckCircle2 size={12} aria-hidden="true" className="shrink-0 text-[var(--status-success-text)]" />
                  ) : (
                    <CircleAlert size={12} aria-hidden="true" className="shrink-0 text-[var(--status-danger-text)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-slate-200">{c.command}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{c.timedOut ? "timeout" : (c.error ?? c.exitCode)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t("reports.steps")}>
        {r.steps.length === 0 ? (
          <p className="text-2xs text-slate-500">{t("reports.noSteps")}</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {r.steps.map((e) => (
              <li key={e.id} className="flex min-w-0 gap-1.5 text-2xs text-slate-400">
                <span className="shrink-0 tabular-nums text-slate-500">{when(e.at)}</span>
                {e.name && <span className="shrink-0 text-slate-200">{e.name}</span>}
                <span className="min-w-0 truncate">{flowBody(e, t)}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title={t("reports.changes")}>
        {r.checkpoint ? (
          <div className="flex flex-wrap items-center gap-2 text-2xs">
            <span className="tabular-nums text-slate-300">{stats ? t("reports.changesStats", { files: stats.files, added: stats.added, deleted: stats.deleted }) : t("reports.changesOpen")}</span>
            <button type="button" onClick={onChanges} className={LINK}>
              {t("reports.openChanges")}
            </button>
          </div>
        ) : (
          <p className="text-2xs text-slate-500">{t("reports.noChanges")}</p>
        )}
      </Section>

      {next.length > 0 && (
        <Section title={t("reports.next")}>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-2xs text-slate-300">
            {next.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </Section>
      )}
    </section>
  );
}
