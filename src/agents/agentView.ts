// Ajan kartı, durum metni ve Kararlar listesi: SAF yardımcılar (spec
// 2026-10-17 ajan-alani §4, §7). Renk yalnız durum jetonlarından; lime
// (accent) seçim için ayrılmış, burada kullanılmıyor.
import { isListAnswerable } from "../../app-electron/shared/agentDecisions";
import {
  AGENT_ENGINE_MISSING,
  type AgentQuestion,
  type AgentState,
  type AgentStatus
} from "../../app-electron/shared/agentTypes";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";

export type StatusTone = "success" | "warning" | "danger" | "muted";

export const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-[var(--status-success-text)]",
  warning: "bg-[var(--status-warning-text)]",
  danger: "bg-[var(--status-danger-solid)]",
  muted: "bg-slate-500"
};

/** Durum hapı (demo'daki "● Working" çipi gibi): yuvarlak, ince tonlu kenarlık + zemin. */
export const TONE_PILL: Record<StatusTone, string> = {
  success: "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  warning: "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  danger: "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
  muted: "border-line bg-control text-slate-400"
};

const STATE_KEY: Record<AgentState, TranslationKey> = {
  running: "agents.stateRunning",
  idle: "agents.stateIdle",
  asking: "agents.stateAsking",
  finished: "agents.stateFinished",
  error: "agents.stateError",
  unknown: "agents.stateUnknown"
};

export function statusText(status: AgentStatus | undefined, now: number): { key: TranslationKey; params?: { min: number } } {
  if (!status) return { key: "agents.stateUnknown" };
  if (status.state === "idle" && status.lastActivity !== null) {
    const min = Math.floor((now - status.lastActivity) / 60_000);
    if (min >= 1) return { key: "agents.stateIdleFor", params: { min } };
  }
  return { key: STATE_KEY[status.state] };
}

export function statusTone(state: AgentState | undefined): StatusTone {
  if (state === "running") return "success";
  if (state === "asking") return "warning";
  if (state === "error") return "danger";
  return "muted";
}

export interface CardStatus {
  key: TranslationKey;
  params?: { min: number };
  tone: StatusTone;
  estimated: boolean;
  restartable: boolean;
}

/** Kartın durumu: bölme çalışmıyorsa bölmenin hâli, çalışıyorsa izleyicinin. */
export function cardStatus(pane: TerminalPane, status: AgentStatus | undefined, now: number): CardStatus {
  const run = pane.run;
  if (run.state === "queued") return { key: "terminal.queued", tone: "muted", estimated: false, restartable: false };
  if (run.state === "starting") return { key: "terminal.starting", tone: "muted", estimated: false, restartable: false };
  if (run.state === "failed" && run.message === AGENT_ENGINE_MISSING) {
    return { key: "agents.notInstalled", tone: "danger", estimated: false, restartable: true };
  }
  if (run.state === "failed" || run.state === "missingDir") {
    return { key: "agents.stateError", tone: "danger", estimated: false, restartable: true };
  }
  if (run.state === "exited") return { key: "agents.stateFinished", tone: "muted", estimated: false, restartable: true };
  const text = statusText(status, now);
  return {
    key: text.key,
    ...(text.params ? { params: text.params } : {}),
    tone: statusTone(status?.state),
    estimated: (status?.source ?? "estimated") === "estimated",
    restartable: status?.state === "finished"
  };
}

export function agentPanes(workspace: TerminalWorkspace): TerminalPane[] {
  return workspace.panes.filter((p) => p.kind === "agent");
}

/** Kapanmış bölmenin son bilinen durumu bayat: yalnız çalışanlar sayılıyor. */
function liveAgents(workspace: TerminalWorkspace): TerminalPane[] {
  return agentPanes(workspace).filter((p) => p.run.state === "running");
}

export function askingCount(workspace: TerminalWorkspace, statuses: Record<string, AgentStatus>): number {
  return liveAgents(workspace).filter((p) => statuses[p.id]?.state === "asking").length;
}

export interface DecisionRow {
  paneId: string;
  workspaceId: string;
  pane: TerminalPane;
  question: AgentQuestion;
  answerable: boolean;
}

/** Bütün alanlardaki açık sorular, eskisi önce (spec §7). */
export function decisionsOf(workspaces: TerminalWorkspace[], statuses: Record<string, AgentStatus>): DecisionRow[] {
  const rows: DecisionRow[] = [];
  for (const workspace of workspaces) {
    for (const pane of liveAgents(workspace)) {
      const status = statuses[pane.id];
      if (status?.state !== "asking" || !status.question) continue;
      rows.push({
        paneId: pane.id,
        workspaceId: workspace.id,
        pane,
        question: status.question,
        answerable: status.source === "exact" && isListAnswerable(status.question)
      });
    }
  }
  return rows.sort((a, b) => a.question.askedAt - b.question.askedAt);
}
