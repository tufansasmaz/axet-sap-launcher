// Değişiklikler görünümü (spec 2026-10-18 degisiklikler §5): solda kayıt
// listesi (yeniden eskiye, üstte Canlı satırı), sağda seçili kaydın dosyaları
// ve birleşik diff'i. Canlı yalnız görünüm görünürken 3 sn'de bir yoklanıyor;
// en son kaydın aralığı Canlı'yla aynı (çalışma ağacına kadar). Lime yalnız
// seçim. Komut uçuştayken düğmeler kilitli; söküldükten sonra setState yok.
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { TOOL_BUTTON } from "../ui/buttons";
import { pendingCount, statsOf } from "../../app-electron/shared/changesLogic";
import { LIVE_POLL_MS, type Checkpoint, type DiffResult, type FileChange, type RangeResult, type RangeStats } from "../../app-electron/shared/changesTypes";
import { clockLabel, FAILURE_KEY, newestFirst, REASON_KEY, REPO_KEY, REVIEW_KEY, STATUS_KEY, STATUS_MARK } from "./changesFormat";
import { useChangesState } from "./useChanges";
import DiffViewer from "./DiffViewer";

const ACTION = `${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`;
const LIVE = "live";

const rowClass = (selected: boolean) =>
  `flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors ${selected ? "border-accent-500/60" : "border-line hover:border-slate-500"}`;

function titleOf(cp: Checkpoint, t: ReturnType<typeof useT>): string {
  if (cp.reason === "beforeRestore") return cp.label ? `${t("changes.reasonBeforeRestore")} · ${cp.label}` : t("changes.reasonBeforeRestore");
  return cp.label || t(REASON_KEY[cp.reason]);
}

function StatsLine({ stats }: { stats: RangeStats }) {
  const t = useT();
  return (
    <span data-stats="" className="flex gap-2 font-mono text-2xs tabular-nums">
      <span className="text-slate-400">{t("changes.fileCount", { count: stats.files })}</span>
      <span className="text-[var(--status-success-text)]">+{stats.added}</span>
      <span className="text-[var(--status-danger-text)]">-{stats.deleted}</span>
    </span>
  );
}

export default function ChangesView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { state: store, commands } = useTerminalStore();
  const { state } = useChangesState(workspace.id);
  const [selected, setSelected] = useState<string>(LIVE);
  const [live, setLive] = useState<RangeResult | null>(null);
  const [range, setRange] = useState<RangeResult | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const diffRequest = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkpoints = state?.checkpoints ?? [];
  const expired = state?.expired ?? [];
  const latest = checkpoints.at(-1) ?? null;
  const repoOk = state?.repo === "ok";
  const visible = store.visible;
  const selectedCp = selected === LIVE ? null : (checkpoints.find((c) => c.id === selected) ?? null);
  const showsLive = selected === LIVE || (selectedCp !== null && selectedCp.id === latest?.id);
  const diffTarget = selected === LIVE ? (latest?.id ?? null) : (selectedCp?.id ?? null);

  // Seçili kayıt listeden düştüyse (200 sınırı) Canlı'ya dön.
  useEffect(() => {
    if (state && selected !== LIVE && !state.checkpoints.some((c) => c.id === selected)) setSelected(LIVE);
  }, [state, selected]);

  // Canlı (spec §5): yalnız görünüm görünürken 3 sn'de bir; uçuşta ikinci istek yok.
  useEffect(() => {
    if (!visible || !repoOk) return;
    let alive = true;
    let inFlight = false;
    const poll = () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      window.api.changesLive(workspace.id).then(
        (r) => {
          inFlight = false;
          if (alive) setLive(r);
        },
        () => {
          inFlight = false;
        }
      );
    };
    poll();
    const timer = setInterval(poll, LIVE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [visible, repoOk, workspace.id, latest?.id]);

  // Eski kaydın aralığı bir kez isteniyor; en son kayıt Canlı sonucunu kullanıyor.
  const selectedId = selectedCp?.id ?? null;
  useEffect(() => {
    setFile(null);
    setDiff(null);
    setRange(null);
    if (!selectedId || showsLive) return;
    let alive = true;
    window.api.changesRange(workspace.id, selectedId).then(
      (r) => {
        if (alive) setRange(r);
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [workspace.id, selectedId, showsLive]);

  const shown: RangeResult | null = showsLive ? live : range;

  const openFile = (rel: string) => {
    if (!diffTarget) return;
    const request = ++diffRequest.current;
    setFile(rel);
    setDiff(null);
    window.api.changesDiff(workspace.id, diffTarget, rel).then(
      (r) => {
        if (mounted.current && diffRequest.current === request) setDiff(r);
      },
      () => {}
    );
  };

  const createCheckpoint = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    const r = await window.api.changesCheckpoint(workspace.id).catch(() => ({ ok: false as const, reason: "git" as const }));
    pendingRef.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (!r.ok) setError(FAILURE_KEY[r.reason]);
  };

  const goTerminal = (paneId: string) => {
    commands.setWorkspaceView(workspace.id, "panes");
    commands.revealPane(paneId);
  };

  if (!state) {
    return (
      <section aria-label={t("changes.label")} className="flex h-full items-center justify-center text-xs text-slate-500">
        {t("changes.loading")}
      </section>
    );
  }
  if (state.repo === "notRepo" || state.repo === "noGit" || state.repo === "missingDir") {
    return (
      <section aria-label={t("changes.label")} className="flex h-full items-center justify-center p-6">
        <p role="status" className="max-w-md text-center text-sm text-slate-400">
          {t(REPO_KEY[state.repo])}
        </p>
      </section>
    );
  }

  const pendingN = pendingCount(checkpoints);
  const liveFiles = live?.ok ? live.files : null;
  const actionCp = selectedCp;
  const actionPane = actionCp?.paneId ? workspace.panes.find((p) => p.id === actionCp.paneId) : undefined;

  return (
    <section aria-label={t("changes.label")} className="flex h-full min-h-0">
      <div className="flex w-80 shrink-0 flex-col border-r border-line">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{t("changes.title")}</h2>
          {pendingN > 0 && (
            <span data-pending-count="" className="shrink-0 text-2xs text-slate-400">
              {t("changes.pendingCount", { count: pendingN })}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-line p-2">
          <button type="button" disabled={pending || !repoOk} onClick={() => void createCheckpoint()} className={ACTION}>
            {t("changes.createCheckpoint")}
          </button>
          {state.warning && (
            <p
              role="status"
              data-warning=""
              className="rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-1 text-2xs text-[var(--status-warning-text)]"
            >
              {t("changes.snapshotWarning", { reason: t(FAILURE_KEY[state.warning.code]) })}
            </p>
          )}
          {state.recoveredFrom && <p className="text-2xs text-[var(--status-warning-text)]">{t("changes.recovered", { file: state.recoveredFrom })}</p>}
          {state.unreadable && <p className="text-2xs text-[var(--status-warning-text)]">{t("changes.unreadable")}</p>}
          {state.repo === "unknown" && <p className="text-2xs text-slate-400">{t("changes.repoUnknown")}</p>}
          {error && (
            <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
              {t(error)}
            </p>
          )}
        </div>
        <ul aria-label={t("changes.listLabel")} className="chat-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          <li>
            <button type="button" data-live-row="" aria-pressed={selected === LIVE} onClick={() => setSelected(LIVE)} className={rowClass(selected === LIVE)}>
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="text-xs font-medium text-slate-200">{t("changes.live")}</span>
                <span className="min-w-0 truncate text-2xs text-slate-500">
                  {latest ? t("changes.liveSince", { time: clockLabel(latest.createdAt, Date.now()) }) : t("changes.noCheckpoint")}
                </span>
              </span>
              {liveFiles && <StatsLine stats={statsOf(liveFiles)} />}
            </button>
          </li>
          {newestFirst(checkpoints).map((c) => {
            const pane = c.paneId ? workspace.panes.find((p) => p.id === c.paneId) : undefined;
            const color = pane ? PANE_COLOR_VAR[pane.color ?? "gray"] : null;
            const isExpired = expired.includes(c.id);
            const stats = c.id === latest?.id ? (liveFiles ? statsOf(liveFiles) : null) : (c.stats ?? null);
            const title = titleOf(c, t);
            return (
              <li key={c.id}>
                <button type="button" data-checkpoint={c.id} aria-pressed={selected === c.id} onClick={() => setSelected(c.id)} className={rowClass(selected === c.id)}>
                  <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-500">
                    <span className="font-mono tabular-nums">{clockLabel(c.createdAt, Date.now())}</span>
                    {c.agentName && (
                      <>
                        <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
                        <span className="min-w-0 truncate text-slate-300">{c.agentName}</span>
                      </>
                    )}
                    <span className="ml-auto shrink-0">{isExpired ? t("changes.expired") : t(REVIEW_KEY[c.reviewed])}</span>
                  </span>
                  <span title={title} className="min-w-0 truncate text-xs text-slate-200">
                    {title}
                  </span>
                  {stats && <StatsLine stats={stats} />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
          <h3 className="min-w-0 flex-1 truncate text-sm text-slate-100">{selectedCp ? titleOf(selectedCp, t) : t("changes.live")}</h3>
          {shown?.ok && shown.toWorkingTree && !shown.noCheckpoint && <span className="shrink-0 text-2xs text-slate-500">{t("changes.untilNow")}</span>}
          <div data-actions="" className="flex shrink-0 gap-1.5">
            {actionCp && actionPane && (
              <button type="button" onClick={() => goTerminal(actionPane.id)} className={ACTION}>
                {t("changes.goTerminal")}
              </button>
            )}
          </div>
        </div>
        <ChangesBody shown={shown} file={file} diff={diff} onOpen={openFile} />
      </div>
    </section>
  );
}

function ChangesBody({
  shown,
  file,
  diff,
  onOpen
}: {
  shown: RangeResult | null;
  file: string | null;
  diff: DiffResult | null;
  onOpen: (rel: string) => void;
}) {
  const t = useT();
  if (!shown) return <p className="p-3 text-xs text-slate-500">{t("changes.loading")}</p>;
  if (!shown.ok) {
    return (
      <p role="alert" className="p-3 text-xs text-[var(--status-danger-text)]">
        {t(FAILURE_KEY[shown.reason])}
      </p>
    );
  }
  if (shown.noCheckpoint) return <p className="p-3 text-xs text-slate-400">{t("changes.noCheckpointHint")}</p>;
  if (shown.files.length === 0) return <p className="p-3 text-xs text-slate-400">{t("changes.noChanges")}</p>;
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-64 shrink-0 flex-col border-r border-line">
        {shown.truncated && <p className="px-2 py-1 text-2xs text-[var(--status-warning-text)]">{t("changes.listTruncated")}</p>}
        <ul aria-label={t("changes.filesLabel")} className="chat-scroll min-h-0 flex-1 overflow-y-auto p-1">
          {shown.files.map((f: FileChange) => (
            <li key={f.path}>
              <button
                type="button"
                data-file={f.path}
                aria-pressed={file === f.path}
                onClick={() => onOpen(f.path)}
                title={f.path}
                className={`flex w-full items-center gap-1.5 rounded border px-1.5 py-1 text-left text-2xs ${file === f.path ? "border-accent-500/60" : "border-transparent hover:border-line"}`}
              >
                <span title={t(STATUS_KEY[f.status])} className="w-3 shrink-0 font-mono text-slate-400">
                  {STATUS_MARK[f.status]}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-slate-200">{f.path}</span>
                {f.binary ? (
                  <span className="shrink-0 text-slate-500">{t("changes.binaryShort")}</span>
                ) : (
                  <span className="flex shrink-0 gap-1 font-mono tabular-nums">
                    <span className="text-[var(--status-success-text)]">+{f.added}</span>
                    <span className="text-[var(--status-danger-text)]">-{f.deleted}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-scroll min-w-0 flex-1 overflow-auto">
        {file === null ? (
          <p className="p-3 text-xs text-slate-500">{t("changes.pickFile")}</p>
        ) : !diff ? (
          <p className="p-3 text-xs text-slate-500">{t("changes.loading")}</p>
        ) : !diff.ok ? (
          <p role="alert" className="p-3 text-xs text-[var(--status-danger-text)]">
            {t(FAILURE_KEY[diff.reason])}
          </p>
        ) : (
          <DiffViewer diff={diff.diff} />
        )}
      </div>
    </div>
  );
}
