// Pano — ekibin genel bakışı (Tur 3). Raydaki ilk görünüm. Kartlar mevcut
// kaynaklardan derleniyor (overview.ts); tıklanınca ilgili görünüme gidiyor:
// Ekip/Sorular → Ofis, Görevler → Görevler, Değişiklikler/Depo → Değişiklikler,
// Motorlar → Araçlar, Bellek → Bellek. Son olaylar Akış'ın kısa kopyası.
// Renk yalnız durum jetonlarından; lime yalnız seçim (burada yok).
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { WorkspaceView } from "../../app-electron/shared/types";
import { useBoards } from "../board/boardContext";
import { Eyebrow } from "../ui/Eyebrow";
import { useAgentStatuses } from "./agentStatusContext";
import { useFlow } from "./flowContext";
import { flowBody } from "./flowText";
import { agentPanes } from "./agentView";
import { overviewOf } from "./overview";
import { REPO_WARNING } from "./RepoChip";
import { useWorkspaceChanges } from "./useRailCounts";

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Card({
  title,
  target,
  workspaceId,
  wide = false,
  children
}: {
  title: string;
  target?: WorkspaceView;
  workspaceId: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const body = (
    <>
      <div className="flex items-center gap-2">
        <Eyebrow as="span" className="flex-1">
          {title}
        </Eyebrow>
        {target && <ArrowRight size={12} className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-200" />}
      </div>
      <div className="mt-2 flex min-w-0 flex-col gap-1.5">{children}</div>
    </>
  );
  const base = `group flex min-w-0 flex-col rounded-lg border border-line bg-card p-3 text-left ${wide ? "md:col-span-2" : ""}`;
  if (!target) return <section className={base}>{body}</section>;
  return (
    <button
      type="button"
      data-overview-card={target}
      aria-label={t("overview.open", { name: title })}
      onClick={() => commands.setWorkspaceView(workspaceId, target)}
      className={`${base} cursor-pointer transition-colors hover:border-line-strong hover:bg-hover`}
    >
      {body}
    </button>
  );
}

function Big({ value, label }: { value: number | string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-xl tabular-nums text-slate-100">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </span>
  );
}

function Stat({ tone, value, label }: { tone: "success" | "warning" | "danger" | "muted"; value: number; label: TranslationKey }) {
  const t = useT();
  const dot =
    tone === "success"
      ? "bg-[var(--status-success-text)]"
      : tone === "warning"
        ? "bg-[var(--status-warning-text)]"
        : tone === "danger"
          ? "bg-[var(--status-danger-solid)]"
          : "bg-slate-500";
  return (
    <span className="flex items-center gap-1.5 text-2xs text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="tabular-nums text-slate-200">{value}</span>
      {t(label)}
    </span>
  );
}

export default function OverviewView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { statuses, engines } = useAgentStatuses();
  const { boards } = useBoards();
  const { events } = useFlow();
  const changes = useWorkspaceChanges(workspace.id, workspace.root ?? "");
  const o = overviewOf({ workspace, statuses, board: boards[workspace.id], changes, events, engines });
  const memoryOn = agentPanes(workspace).filter((p) => p.agent?.memory).length;
  const repoWarning = o.repo.root ? REPO_WARNING[o.repo.status] : undefined;

  return (
    <section aria-label={t("overview.title")} data-overview-view="" className="chat-scroll h-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-14 py-6">
        <header>
          <h2 className="text-base font-medium text-slate-100">{workspace.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("overview.subtitle")}</p>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Card title={t("overview.team")} target="office" workspaceId={workspace.id}>
            <Big value={o.agents.total} label={t("overview.agents")} />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Stat tone="success" value={o.agents.running} label="overview.running" />
              <Stat tone="warning" value={o.agents.asking} label="overview.asking" />
              <Stat tone="muted" value={o.agents.idle} label="overview.idle" />
              {o.agents.error > 0 && <Stat tone="danger" value={o.agents.error} label="overview.error" />}
            </div>
          </Card>

          <Card title={t("overview.tasks")} target="board" workspaceId={workspace.id}>
            <Big value={o.tasks.open} label={t("overview.tasksOpen")} />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Stat tone="success" value={o.tasks.done} label="overview.tasksDone" />
              <Stat tone="muted" value={o.tasks.draft} label="overview.tasksDraft" />
              <Stat tone="muted" value={o.tasks.openSubtasks} label="overview.subtasksOpen" />
            </div>
            {o.tasks.recent.map((task) => (
              <span key={task.id} className="truncate text-2xs text-slate-400">
                · {task.title}
              </span>
            ))}
          </Card>

          <Card title={t("overview.questions")} target="office" workspaceId={workspace.id}>
            <Big value={o.questions} label={t("overview.questionsWaiting")} />
            <span className="text-2xs text-slate-500">{o.questions > 0 ? t("overview.questionsHint") : t("overview.questionsNone")}</span>
          </Card>

          <Card title={t("overview.changes")} target="changes" workspaceId={workspace.id}>
            <Big value={o.changes.pending} label={t("overview.changesPending")} />
            {o.changes.recent.length === 0 ? (
              <span className="text-2xs text-slate-500">{t("overview.changesNone")}</span>
            ) : (
              o.changes.recent.map((c) => (
                <span key={c.id} className="flex min-w-0 gap-1.5 text-2xs text-slate-400">
                  <span className="shrink-0 font-mono tabular-nums text-slate-500">{clock(c.createdAt)}</span>
                  <span className="min-w-0 truncate">
                    {c.agentName ? `${c.agentName}: ` : ""}
                    {c.label || t("overview.changesManual")}
                  </span>
                </span>
              ))
            )}
          </Card>

          <Card title={t("overview.repo")} target="changes" workspaceId={workspace.id}>
            {o.repo.root ? (
              <>
                <span title={o.repo.root} className="truncate font-mono text-xs text-slate-200">
                  {o.repo.root}
                </span>
                <span className={`text-2xs ${repoWarning ? "text-[var(--status-warning-text)]" : "text-slate-500"}`}>
                  {repoWarning ? t(repoWarning) : o.repo.status === "ok" ? t("overview.repoOk") : t("overview.repoUnknown")}
                </span>
              </>
            ) : (
              <span className="text-2xs text-slate-400">{t("overview.repoNone")}</span>
            )}
          </Card>

          <Card title={t("overview.engines")} target="tools" workspaceId={workspace.id}>
            {o.engines.known ? (
              <Big value={`${o.engines.installed}/${o.engines.total}`} label={t("overview.enginesInstalled")} />
            ) : (
              <span className="text-2xs text-slate-500">{t("overview.enginesUnknown")}</span>
            )}
            <span className="text-2xs text-slate-500">{t("overview.enginesHint")}</span>
          </Card>

          <Card title={t("overview.memory")} target="memory" workspaceId={workspace.id}>
            <Big value={`${memoryOn}/${o.agents.total}`} label={t("overview.memoryOn")} />
            <span className="text-2xs text-slate-500">{t("overview.memoryHint")}</span>
          </Card>

          <Card title={t("overview.events")} workspaceId={workspace.id} wide>
            {o.events.length === 0 ? (
              <span className="text-2xs text-slate-500">{t("flow.empty")}</span>
            ) : (
              <ol className="flex flex-col gap-1">
                {o.events.map((event) => (
                  <li key={event.id} className="flex min-w-0 gap-1.5 text-2xs text-slate-400">
                    <span className="shrink-0 font-mono tabular-nums text-slate-500">{clock(event.at)}</span>
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
