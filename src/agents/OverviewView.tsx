// Pano — ekibin kontrol paneli (Tur 3; grafikli sürüm 2026-10-19). Yalnız
// mevcut kaynaklar: ajan durumları, görev panosu, Değişiklikler kaydı, kalıcı
// Akış geçmişi (overview.ts + dashboard.ts). Üstte eğilim çizgili göstergeler,
// altında etkinlik yoğunluğu, ajan durum şeridi, görev ilerlemesi, ajan
// karşılaştırması, değişiklikler, sağlık ve son olaylar. Her kartın bir
// tablo/metin karşılığı var; tıklanınca ilgili görünüme gidiyor. Grafik
// renkleri --viz-* (dataviz doğrulamalı), durumlar --status-*; lime yalnız
// seçimde (aralık seçici).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useLanguage, useT, type TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { WorkspaceView } from "../../app-electron/shared/types";
import type { FileChange } from "../../app-electron/shared/changesTypes";
import { useBoards } from "../board/boardContext";
import { SUBTASK_STATE_KEY } from "../board/boardDisplay";
import { ENGINE_LABEL, agentName } from "./agentLabels";
import { useAgentStatuses } from "./agentStatusContext";
import { agentPanes, TONE_DOT } from "./agentView";
import { BarList, Legend, LaneChart, Sparkline, StackedColumns, type Column, type Series } from "./charts";
import {
  EVENT_GROUPS,
  RANGE_KEYS,
  agentRows,
  changeSummary,
  eventHistogram,
  groupOf,
  occupancy,
  rangeSpec,
  seriesPerBucket,
  startOfToday,
  subtaskFunnel,
  timelines,
  topFiles,
  verifyRate,
  type EventGroup,
  type LaneState,
  type RangeKey,
  type RangeSpec
} from "./dashboard";
import { useFlow } from "./flowContext";
import { FLOW_MAX } from "./flowEvents";
import { flowBody } from "./flowText";
import { overviewOf } from "./overview";
import { REPO_WARNING } from "./RepoChip";
import { useWorkspaceChanges } from "./useRailCounts";

const RANGE_LABEL: Record<RangeKey, TranslationKey> = { "1h": "dash.range1h", "24h": "dash.range24h", "7d": "dash.range7d" };
const GROUP_LABEL: Record<EventGroup, TranslationKey> = {
  work: "dash.groupWork",
  change: "dash.groupChange",
  done: "dash.groupDone",
  asked: "dash.groupAsked",
  problem: "dash.groupProblem"
};
const GROUP_COLOR: Record<EventGroup, string> = {
  work: "var(--viz-1)",
  change: "var(--viz-2)",
  done: "var(--viz-3)",
  asked: "var(--viz-4)",
  problem: "var(--viz-5)"
};
const LANE_LABEL: Record<LaneState, TranslationKey> = {
  running: "dash.laneRunning",
  asking: "dash.laneAsking",
  error: "dash.laneError",
  idle: "dash.laneIdle"
};
const LANE_COLOR: Record<LaneState, string> = {
  running: "var(--status-success-text)",
  asking: "var(--status-warning-text)",
  error: "var(--status-danger-solid)",
  idle: "var(--viz-axis)"
};
const ROW_TONE = { running: "success", asking: "warning", error: "danger", idle: "muted", stopped: "muted" } as const;
const ROW_STATE: Record<"running" | "asking" | "error" | "idle" | "stopped", TranslationKey> = {
  running: "agents.stateRunning",
  asking: "agents.stateAsking",
  error: "agents.stateError",
  idle: "agents.stateIdle",
  stopped: "dash.stateStopped"
};
const FUNNEL_COLOR: Partial<Record<string, string>> = {
  done: "var(--status-success-text)",
  failed: "var(--status-danger-solid)",
  asking: "var(--status-warning-text)"
};
/** Değişiklik özetinde dosya listesi için en çok bu kadar kayıt okunuyor. */
const TOP_FILE_RECORDS = 8;
const RECENT_EVENTS = 8;

function useNow(stepMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(timer);
  }, [stepMs]);
  return now;
}

function formatters(language: string, range: RangeSpec) {
  const hm = (at: number) => new Date(at).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  const day = (at: number) => new Date(at).toLocaleDateString(language, { weekday: "short", day: "numeric", month: "short" });
  const when = (at: number) => new Date(at).toLocaleString(language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const bucketLabel = (start: number, end: number) => (range.key === "7d" ? day(start) : `${hm(start)}–${hm(end)}`);
  const every = range.key === "1h" ? 3 : range.key === "24h" ? 6 : 1;
  const tick = (i: number, start: number) =>
    i % every !== 0 ? "" : range.key === "7d" ? new Date(start).toLocaleDateString(language, { weekday: "short" }) : hm(start);
  return { hm, when, bucketLabel, tick };
}

function Card({
  title,
  target,
  workspaceId,
  className = "",
  actions,
  children
}: {
  title: string;
  target?: WorkspaceView;
  workspaceId: string;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  return (
    <section aria-label={title} className={`flex min-w-0 flex-col rounded-lg border border-line bg-card p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
          {title}
        </h3>
        {actions}
        {target && (
          <button
            type="button"
            data-overview-card={target}
            aria-label={t("overview.open", { name: title })}
            title={t("overview.open", { name: title })}
            onClick={() => commands.setWorkspaceView(workspaceId, target)}
            className="rounded p-0.5 text-slate-500 hover:bg-hover hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <ArrowRight size={12} />
          </button>
        )}
      </div>
      <div className="mt-2 flex min-w-0 flex-1 flex-col gap-2">{children}</div>
    </section>
  );
}

function TableToggle({ name, on, onToggle }: { name: string; on: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t("dash.tableToggle", { name })}
      onClick={onToggle}
      className="rounded px-1.5 py-0.5 text-2xs text-slate-400 hover:bg-hover hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      {on ? t("dash.showChart") : t("dash.showTable")}
    </button>
  );
}

const TH = "px-2 py-1 text-left font-normal text-slate-500";
const TD = "px-2 py-1 text-slate-300";
const NUM = "px-2 py-1 text-right tabular-nums text-slate-200";

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-2xs text-slate-500">{children}</p>;
}

interface Kpi {
  key: string;
  label: TranslationKey;
  value: number;
  of?: number;
  spark: number[];
  what: TranslationKey;
  target: WorkspaceView;
  tone?: "warning" | "danger";
}

function KpiTile({ kpi, workspaceId, t }: { kpi: Kpi; workspaceId: string; t: TranslateFn }) {
  const { commands } = useTerminalStore();
  const sum = kpi.spark.reduce((a, b) => a + b, 0);
  const trend = t("dash.trend", { what: t(kpi.what), sum, last: kpi.spark.at(-1) ?? 0, max: Math.max(0, ...kpi.spark) });
  const value = kpi.of !== undefined ? `${kpi.value} ${t("dash.kpiOf", { total: kpi.of })}` : String(kpi.value);
  const view = t(`overview.${kpi.target === "board" ? "tasks" : kpi.target === "changes" ? "changes" : "team"}` as TranslationKey);
  const alert = kpi.tone && kpi.value > 0;
  return (
    <li className="min-w-0">
      <button
        type="button"
        data-kpi={kpi.key}
        title={t(kpi.what)}
        aria-label={t("dash.kpiAria", { label: t(kpi.label), value, trend, view })}
        onClick={() => commands.setWorkspaceView(workspaceId, kpi.target)}
        className="flex h-full w-full min-w-0 flex-col gap-1 rounded-lg border border-line bg-card p-3 text-left transition-colors hover:border-line-strong hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        <span className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-400">
          {alert && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[kpi.tone!]}`} />}
          {t(kpi.label)}
        </span>
        <span className="flex items-end justify-between gap-2">
          <span className="flex items-baseline gap-1">
            <span className="text-[28px] font-semibold leading-none tracking-tight text-slate-100">{kpi.value}</span>
            {kpi.of !== undefined && <span className="text-xs text-slate-500">{t("dash.kpiOf", { total: kpi.of })}</span>}
          </span>
          <Sparkline values={kpi.spark} />
        </span>
      </button>
    </li>
  );
}

export default function OverviewView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const language = useLanguage();
  const { commands } = useTerminalStore();
  const { statuses, engines } = useAgentStatuses();
  const { boards } = useBoards();
  const { events: allEvents } = useFlow();
  const changes = useWorkspaceChanges(workspace.id, workspace.root ?? "");
  const now = useNow();
  const [rangeKey, setRangeKey] = useState<RangeKey>("24h");
  const [tables, setTables] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setTables((prev) => ({ ...prev, [key]: !prev[key] }));

  const board = boards[workspace.id];
  const o = overviewOf({ workspace, statuses, board, changes, events: allEvents, engines });
  const events = useMemo(() => allEvents.filter((e) => e.workspaceId === workspace.id), [allEvents, workspace.id]);
  const range = useMemo(() => rangeSpec(rangeKey, now), [rangeKey, now]);
  const fmt = formatters(language, range);
  const rangeName = t(RANGE_LABEL[rangeKey]);
  const panes = agentPanes(workspace);
  const memoryOn = panes.filter((p) => p.agent?.memory).length;
  const repoWarning = o.repo.root ? REPO_WARNING[o.repo.status] : undefined;

  const histogram = useMemo(() => eventHistogram(events, range), [events, range]);
  const lanes = useMemo(() => timelines(events, range, now), [events, range, now]);
  const checkpoints = changes?.checkpoints ?? [];
  const expired = changes?.expired ?? [];
  const summary = changeSummary(checkpoints, expired, range.from, range.to);
  const funnel = subtaskFunnel(board);
  const funnelTotal = funnel.reduce((s, f) => s + f.count, 0);
  const verify = verifyRate(board);
  const rows = agentRows(panes, statuses, events, board, range);
  const today = events.filter((e) => e.at >= startOfToday(now)).length;
  const oldest = events[0]?.at;
  const capped = events.length >= FLOW_MAX && oldest !== undefined && oldest > range.from;

  const kpis: Kpi[] = [
    { key: "active", label: "dash.kpiActive", value: o.agents.running + o.agents.asking, of: o.agents.total, spark: occupancy(lanes, range, ["running", "asking"]), what: "dash.sparkActive", target: "office" },
    { key: "running", label: "dash.kpiRunning", value: o.agents.running, spark: occupancy(lanes, range, "running"), what: "dash.sparkRunning", target: "office" },
    { key: "asking", label: "dash.kpiAsking", value: o.questions, spark: occupancy(lanes, range, "asking"), what: "dash.sparkAsking", target: "office", tone: "warning" },
    { key: "error", label: "dash.kpiError", value: o.agents.error, spark: occupancy(lanes, range, "error"), what: "dash.sparkError", target: "office", tone: "danger" },
    { key: "open", label: "dash.kpiOpen", value: o.tasks.open, spark: seriesPerBucket(events, range, (e) => e.kind === "assigned"), what: "dash.sparkOpen", target: "board" },
    { key: "done", label: "dash.kpiDone", value: o.tasks.done, spark: seriesPerBucket(events, range, (e) => e.kind === "verified"), what: "dash.sparkDone", target: "board" },
    {
      key: "review",
      label: "dash.kpiReview",
      value: o.changes.pending,
      spark: seriesPerBucket(
        checkpoints.map((c) => ({ at: c.createdAt })),
        range
      ),
      what: "dash.sparkReview",
      target: "changes"
    },
    { key: "today", label: "dash.kpiToday", value: today, spark: histogram.map((b) => b.total), what: "dash.sparkToday", target: "office" }
  ];

  const series: Series[] = EVENT_GROUPS.map((g) => ({ key: g, label: t(GROUP_LABEL[g]), color: GROUP_COLOR[g] }));
  const columns: Column[] = histogram.map((b, i) => ({ label: fmt.bucketLabel(b.start, b.end), tick: fmt.tick(i, b.start), values: b.counts, total: b.total }));
  const total = histogram.reduce((s, b) => s + b.total, 0);
  const peak = histogram.reduce((best, b, i) => (b.total > histogram[best].total ? i : best), 0);
  const activitySummary = t("dash.activitySummary", { range: rangeName, total, peak: columns[peak]?.label ?? "", count: histogram[peak]?.total ?? 0 });
  const laneTicks = range.starts.map((s, i) => ({ at: s, text: fmt.tick(i, s) })).filter((tk) => tk.text);
  const laneRows = lanes.map((lane) => ({
    key: lane.key,
    name: lane.name,
    segments: lane.segments.map((s) => ({ ...s, label: t("dash.laneSegment", { name: lane.name, state: t(LANE_LABEL[s.state]), from: fmt.hm(s.start), to: fmt.hm(s.end) }) }))
  }));
  const paneIds = new Set(panes.map((p) => p.id));

  // En çok değişen dosyalar: aralıktaki son kayıtların dosya listeleri (ana süreçten, bir kez).
  const recordIds = checkpoints
    .filter((c) => !expired.includes(c.id) && c.createdAt >= range.from && c.createdAt < range.to)
    .slice(-TOP_FILE_RECORDS)
    .map((c) => c.id);
  const recordKey = changes?.repo === "ok" ? recordIds.join(",") : "";
  const [fileLists, setFileLists] = useState<FileChange[][]>([]);
  useEffect(() => {
    const ids = recordKey ? recordKey.split(",") : [];
    const api = window.api as Partial<typeof window.api> | undefined;
    if (ids.length === 0 || typeof api?.changesRange !== "function") {
      setFileLists([]);
      return;
    }
    let alive = true;
    Promise.all(ids.map((id) => api.changesRange!(workspace.id, id).catch(() => null))).then((results) => {
      if (!alive) return;
      setFileLists(results.flatMap((r) => (r && r.ok ? [r.files] : [])));
    });
    return () => {
      alive = false;
    };
  }, [recordKey, workspace.id]);
  const top = topFiles(fileLists, 6);
  const topMax = Math.max(1, ...top.map((f) => f.added + f.deleted));

  const recent = events.slice(-RECENT_EVENTS).reverse();

  return (
    <section aria-label={t("overview.title")} data-overview-view="" className="chat-scroll h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-14 py-6">
        <header className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-medium text-slate-100">{workspace.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("overview.subtitle")}</p>
          </div>
          <div role="radiogroup" aria-label={t("dash.range")} className="flex gap-0.5 rounded-md bg-control p-0.5">
            {RANGE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={rangeKey === key}
                onClick={() => setRangeKey(key)}
                className={`cursor-pointer rounded px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                  rangeKey === key ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t(RANGE_LABEL[key])}
              </button>
            ))}
          </div>
        </header>

        <ul aria-label={t("dash.kpis")} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiTile key={kpi.key} kpi={kpi} workspaceId={workspace.id} t={t} />
          ))}
        </ul>
        {capped && (
          <p className="text-2xs text-slate-500">{t("dash.coverage", { max: FLOW_MAX, date: fmt.when(oldest!) })}</p>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card
            title={t("dash.activity")}
            workspaceId={workspace.id}
            className="lg:col-span-2"
            actions={<TableToggle name={t("dash.activity")} on={!!tables.activity} onToggle={() => toggle("activity")} />}
          >
            {total === 0 ? (
              <Empty>{t("dash.noEvents")}</Empty>
            ) : tables.activity ? (
              <div className="chat-scroll max-h-56 overflow-y-auto">
                <table aria-label={t("dash.activity")} className="w-full text-2xs">
                  <thead>
                    <tr>
                      <th className={TH}>{t("dash.time")}</th>
                      {series.map((s) => (
                        <th key={s.key} className={`${TH} text-right`}>
                          {s.label}
                        </th>
                      ))}
                      <th className={`${TH} text-right`}>{t("dash.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className={TD}>{c.label}</td>
                        {series.map((s) => (
                          <td key={s.key} className={NUM}>
                            {c.values[s.key]}
                          </td>
                        ))}
                        <td className={NUM}>{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <Legend series={series} />
                <StackedColumns columns={columns} series={series} label={activitySummary} totalLabel={t("dash.total")} />
              </>
            )}
          </Card>

          <Card title={t("dash.health")} workspaceId={workspace.id}>
            <HealthRow name={t("overview.repo")} target="changes" workspaceId={workspace.id}>
              {o.repo.root ? (
                <>
                  <span title={o.repo.root} className="block truncate font-mono text-2xs text-slate-300">
                    {o.repo.root}
                  </span>
                  <span className={`text-2xs ${repoWarning ? "text-[var(--status-warning-text)]" : "text-slate-500"}`}>
                    {repoWarning ? t(repoWarning) : o.repo.status === "ok" ? t("overview.repoOk") : t("overview.repoUnknown")}
                  </span>
                </>
              ) : (
                <span className="text-2xs text-slate-400">{t("overview.repoNone")}</span>
              )}
            </HealthRow>
            <HealthRow name={t("overview.engines")} target="tools" workspaceId={workspace.id}>
              <span className="text-2xs text-slate-400">
                {o.engines.known ? `${o.engines.installed}/${o.engines.total} ${t("overview.enginesInstalled")}` : t("overview.enginesUnknown")}
              </span>
            </HealthRow>
            <HealthRow name={t("overview.memory")} target="memory" workspaceId={workspace.id}>
              <span className="text-2xs text-slate-400">
                {memoryOn}/{o.agents.total} {t("overview.memoryOn")}
              </span>
            </HealthRow>
            <HealthRow name={t("dash.history")} workspaceId={workspace.id}>
              <span className="text-2xs text-slate-400">
                {t("dash.historyCount", { count: events.length, max: FLOW_MAX })}
                {oldest !== undefined && ` · ${fmt.when(oldest)}`}
              </span>
            </HealthRow>
          </Card>

          <Card
            title={t("dash.lanes")}
            workspaceId={workspace.id}
            target="office"
            className="lg:col-span-2"
            actions={<TableToggle name={t("dash.lanes")} on={!!tables.lanes} onToggle={() => toggle("lanes")} />}
          >
            {laneRows.length === 0 ? (
              <Empty>{t("dash.lanesEmpty")}</Empty>
            ) : tables.lanes ? (
              <div className="chat-scroll max-h-56 overflow-y-auto">
                <table aria-label={t("dash.lanes")} className="w-full text-2xs">
                  <thead>
                    <tr>
                      <th className={TH}>{t("dash.colAgent")}</th>
                      <th className={TH}>{t("dash.colState")}</th>
                      <th className={TH}>{t("dash.colFrom")}</th>
                      <th className={TH}>{t("dash.colTo")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laneRows.flatMap((lane) =>
                      lane.segments.map((s, i) => (
                        <tr key={`${lane.key}-${i}`} className="border-t border-line">
                          <td className={TD}>{lane.name}</td>
                          <td className={TD}>{t(LANE_LABEL[s.state as LaneState])}</td>
                          <td className={`${TD} tabular-nums`}>{fmt.when(s.start)}</td>
                          <td className={`${TD} tabular-nums`}>{fmt.when(s.end)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-slate-400">
                  {(["running", "asking", "error", "idle"] as const).map((s) => (
                    <li key={s} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className={s === "idle" ? "h-0.5 w-3" : "h-2 w-3 rounded-sm"} style={{ background: LANE_COLOR[s] }} />
                      {t(LANE_LABEL[s])}
                    </li>
                  ))}
                </ul>
                <LaneChart
                  lanes={laneRows}
                  from={range.from}
                  to={range.to}
                  colors={LANE_COLOR}
                  ticks={laneTicks}
                  label={t("dash.lanesSummary", { count: laneRows.length, range: rangeName })}
                  openLabel={(name) => t("dash.openPane", { name })}
                  onOpen={(key) => {
                    if (paneIds.has(key)) commands.revealPane(key);
                  }}
                />
              </>
            )}
          </Card>

          <Card title={t("dash.tasks")} workspaceId={workspace.id} target="board">
            {funnelTotal === 0 ? (
              <Empty>{t("dash.tasksEmpty")}</Empty>
            ) : (
              <>
                <p className="text-2xs text-slate-400">{t("dash.funnelSummary", { total: funnelTotal, done: funnel.find((f) => f.state === "done")?.count ?? 0 })}</p>
                <BarList
                  label={t("dash.tasks")}
                  rows={funnel.map((f) => ({ key: f.state, label: t(SUBTASK_STATE_KEY[f.state]), count: f.count, color: FUNNEL_COLOR[f.state] ?? "var(--viz-1)" }))}
                />
              </>
            )}
            <div className="mt-1 border-t border-line pt-2">
              <span className="text-2xs text-slate-400">{t("dash.verify")}</span>
              {verify.rate === null ? (
                <p className="text-2xs text-slate-500">{t("dash.verifyNone")}</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-medium text-slate-100">{Math.round(verify.rate * 100)}%</span>
                    <span className="text-2xs text-slate-500">{t("dash.verifyDetail", { passed: verify.passed, failed: verify.failed, manual: verify.manual })}</span>
                  </div>
                  <div
                    role="meter"
                    aria-label={t("dash.verify")}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(verify.rate * 100)}
                    className="flex h-2 gap-0.5 overflow-hidden rounded-full"
                  >
                    {verify.passed > 0 && <span className="rounded-full bg-[var(--status-success-text)]" style={{ flex: verify.passed }} />}
                    {verify.failed > 0 && <span className="rounded-full bg-[var(--status-danger-solid)]" style={{ flex: verify.failed }} />}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card title={t("dash.agents")} workspaceId={workspace.id} target="office" className="lg:col-span-3">
            {rows.length === 0 ? (
              <Empty>{t("dash.agentsEmpty")}</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table aria-label={t("dash.agents")} className="w-full min-w-[560px] text-2xs">
                  <thead>
                    <tr>
                      <th className={TH}>{t("dash.colAgent")}</th>
                      <th className={TH}>{t("dash.colRole")}</th>
                      <th className={TH}>{t("dash.colEngine")}</th>
                      <th className={TH}>{t("dash.colState")}</th>
                      <th className={TH}>{t("dash.colLast")}</th>
                      <th className={`${TH} text-right`} title={t("dash.colFinishedHint")}>
                        {t("dash.colFinished")}
                      </th>
                      <th className={`${TH} text-right`}>{t("dash.colQuestions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const name = agentName(row.pane, t);
                      return (
                        <tr key={row.pane.id} className="border-t border-line hover:bg-hover">
                          <td className={TD}>
                            <button
                              type="button"
                              aria-label={t("dash.openPane", { name })}
                              onClick={() => commands.revealPane(row.pane.id)}
                              className="max-w-[12rem] truncate text-left text-slate-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                            >
                              {name}
                            </button>
                          </td>
                          <td className={`${TD} max-w-[10rem] truncate`} title={row.pane.agent?.role}>
                            {row.pane.agent?.role || "—"}
                          </td>
                          <td className={TD}>{row.pane.agent ? t(ENGINE_LABEL[row.pane.agent.engine]) : "—"}</td>
                          <td className={TD}>
                            <span className="flex items-center gap-1.5">
                              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[ROW_TONE[row.state]]}`} />
                              {t(ROW_STATE[row.state])}
                            </span>
                          </td>
                          <td className={`${TD} tabular-nums`}>{row.lastAt ? fmt.when(row.lastAt) : "—"}</td>
                          <td className={NUM}>
                            {row.finished} · {row.subtasksDone}
                          </td>
                          <td className={NUM}>{row.asked}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t("dash.changes")} workspaceId={workspace.id} target="changes" className="lg:col-span-2">
            {summary.checkpoints === 0 ? (
              <Empty>{t("dash.changesEmpty")}</Empty>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-sm text-slate-100">{t("dash.changesSummary", { checkpoints: summary.checkpoints, files: summary.files })}</span>
                  <span className="font-mono text-xs tabular-nums">
                    <span className="text-[var(--status-success-text)]">+{summary.added}</span>{" "}
                    <span className="text-[var(--status-danger-text)]">-{summary.deleted}</span>
                  </span>
                  <span className="text-2xs text-slate-400">
                    {summary.pending} {t("dash.reviewPending")} · {summary.accepted} {t("dash.reviewAccepted")} · {summary.reverted} {t("dash.reviewReverted")}
                  </span>
                </div>
                {summary.withoutStats > 0 && <p className="text-2xs text-slate-500">{t("dash.withoutStats", { count: summary.withoutStats })}</p>}
                <span className="mt-1 text-2xs text-slate-400">{t("dash.topFiles")}</span>
                {top.length === 0 ? (
                  <p className="text-2xs text-slate-500">{t("dash.topFilesNone")}</p>
                ) : (
                  <table aria-label={t("dash.topFiles")} className="w-full text-2xs">
                    <thead className="sr-only">
                      <tr>
                        <th>{t("dash.colFile")}</th>
                        <th>{t("dash.colAdded")}</th>
                        <th>{t("dash.colDeleted")}</th>
                        <th>{t("dash.colTimes")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((f) => (
                        <tr key={f.path}>
                          <td className="max-w-0 truncate py-0.5 pr-2 font-mono text-slate-300" title={f.path}>
                            {f.path}
                          </td>
                          <td className="w-24 py-0.5" aria-hidden="true">
                            <span className="flex h-1.5 gap-0.5">
                              {f.added > 0 && <span className="rounded-full bg-[var(--status-success-text)]" style={{ width: `${(f.added / topMax) * 100}%` }} />}
                              {f.deleted > 0 && <span className="rounded-full bg-[var(--status-danger-solid)]" style={{ width: `${(f.deleted / topMax) * 100}%` }} />}
                            </span>
                          </td>
                          <td className="w-12 py-0.5 text-right font-mono tabular-nums text-[var(--status-success-text)]">+{f.added}</td>
                          <td className="w-12 py-0.5 text-right font-mono tabular-nums text-[var(--status-danger-text)]">-{f.deleted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </Card>

          <Card title={t("overview.events")} workspaceId={workspace.id}>
            {recent.length === 0 ? (
              <Empty>{t("flow.empty")}</Empty>
            ) : (
              <ol className="flex flex-col gap-1">
                {recent.map((event) => (
                  <li key={event.id} className="flex min-w-0 gap-1.5 text-2xs text-slate-400">
                    <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: GROUP_COLOR[groupOf(event.kind)] }} />
                    <span className="shrink-0 font-mono tabular-nums text-slate-500">{fmt.hm(event.at)}</span>
                    <span className="shrink-0 text-slate-200">{event.name}</span>
                    <span className="min-w-0 truncate">{flowBody(event, t)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function HealthRow({ name, target, workspaceId, children }: { name: string; target?: WorkspaceView; workspaceId: string; children: ReactNode }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const body = (
    <>
      <span className="text-2xs text-slate-200">{name}</span>
      {children}
    </>
  );
  if (!target) return <div className="flex min-w-0 flex-col gap-0.5 px-1.5 py-1">{body}</div>;
  return (
    <button
      type="button"
      aria-label={t("overview.open", { name })}
      onClick={() => commands.setWorkspaceView(workspaceId, target)}
      className="flex min-w-0 flex-col gap-0.5 rounded px-1.5 py-1 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      {body}
    </button>
  );
}
