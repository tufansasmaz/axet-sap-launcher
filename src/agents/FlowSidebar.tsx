// Akış (spec 2026-10-18 ajanlar-yeniden §2; ajanlar-ux §2, §3): Ajanlar
// sekmelerinde kenar çubuğu yuvası. Üstte ekibin başlığı (ad, kaç ajan
// çalışıyor/soru soruyor, SAP bağı), "Ekip" (tek satırlık ajan satırları),
// akış (ajan başına başlık + durum çipi + gövde; bitirince son cevabı
// kartta), soru kartları ve mesaj kutusu. Görünüm seçimi artık içerik
// alanının sol kenarındaki dikey rayda (ViewRail).
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, BookPlus, RotateCw, X } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { AgentAnswerFailure, AgentEngineInfo, AgentStatus } from "../../app-electron/shared/agentTypes";
import type { AgentSendFailure } from "../../app-electron/shared/agentMessage";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON, PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { selectedClass } from "../shell/SidebarFooter";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "./agentStatusContext";
import { agentPanes, cardStatus, decisionsOf, TONE_DOT, type DecisionRow, type StatusTone } from "./agentView";
import { ENGINE_LABEL, agentName } from "./agentLabels";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import MemoryDialog from "./MemoryDialog";
import { useFlow } from "./flowContext";
import type { FlowEvent, FlowKind } from "./flowEvents";
import { matchAgents, mentionAt, removeMention, type Mention } from "./mention";
import { requestAddAgent } from "./addAgentBus";

const ANSWER_ERROR: Record<Exclude<AgentAnswerFailure, "closed" | "alreadyAnswered">, TranslationKey> = {
  typing: "agents.answerTyping",
  notAnswerable: "agents.answerNotAnswerable",
  writeFailed: "agents.answerFailed",
  noAgent: "agents.answerFailed"
};

const SEND_FAILURE: Record<AgentSendFailure, TranslationKey> = {
  invalid: "browser.fail.invalid",
  noWorkspace: "browser.fail.noWorkspace",
  noAgent: "browser.fail.noAgent",
  notRunning: "browser.fail.notRunning",
  busy: "browser.fail.busy",
  asking: "browser.fail.asking",
  typing: "browser.fail.typing",
  writeFailed: "browser.fail.writeFailed",
  notSubmitted: "browser.fail.notSubmitted"
};

const clock = (at: number) => (at ? new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");

/** Durum çipi: zemin + metin aynı tondan; lime yok (yalnız seçim). */
const CHIP: Record<StatusTone, string> = {
  success: "border-[var(--status-success-border)] text-[var(--status-success-text)]",
  warning: "border-[var(--status-warning-border)] text-[var(--status-warning-text)]",
  danger: "border-[var(--status-danger-border)] text-[var(--status-danger-text)]",
  muted: "border-line text-slate-400"
};

function Chip({ tone, children, title }: { tone: StatusTone; children: React.ReactNode; title?: string }) {
  return (
    <span data-chip={tone} title={title} className={`inline-flex h-4 shrink-0 items-center gap-1 rounded-full border px-1.5 text-2xs leading-none ${CHIP[tone]}`}>
      {children}
    </span>
  );
}

export default function FlowSidebar() {
  const t = useT();
  const { state } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { events } = useFlow();
  const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const listRef = useRef<HTMLDivElement | null>(null);
  const shown = workspace ? events.filter((e) => e.workspaceId === workspace.id) : [];
  const decisions = workspace ? decisionsOf([workspace], statuses) : [];
  const lastId = shown.length ? shown[shown.length - 1].id : 0;

  // En yeni altta: yeni olay ya da soru gelince sona kay.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, decisions.length, workspace?.id]);

  if (!workspace) return <div className="flex-1" />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FlowHeader workspace={workspace} statuses={statuses} />
      <TeamSection workspace={workspace} />
      <div className="flex h-8 shrink-0 items-center border-t border-line px-3">
        <Eyebrow className="flex-1">{t("flow.title")}</Eyebrow>
      </div>
      <div ref={listRef} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 && decisions.length === 0 && <p className="px-1 text-2xs text-slate-500">{t("flow.empty")}</p>}
        <ol className="flex flex-col gap-1.5">
          {shown.map((event) => (
            <FlowEntry key={event.id} event={event} workspace={workspace} />
          ))}
        </ol>
        {decisions.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {decisions.map((row) => (
              <DecisionCard key={`${row.paneId}:${row.question.callId}`} row={row} />
            ))}
          </ul>
        )}
      </div>
      <MessageBox key={workspace.id} workspace={workspace} />
    </div>
  );
}

/** Ekibin başlığı: ad, kaç ajan çalışıyor / soru soruyor, SAP bağı. */
function FlowHeader({ workspace, statuses }: { workspace: TerminalWorkspace; statuses: Record<string, AgentStatus> }) {
  const t = useT();
  const live = agentPanes(workspace).filter((p) => p.run.state === "running");
  const working = live.filter((p) => statuses[p.id]?.state === "running").length;
  const asking = live.filter((p) => statuses[p.id]?.state === "asking").length;
  return (
    <div data-flow-header="" className="flex h-9 shrink-0 items-center gap-1.5 border-b border-line px-3">
      <span title={workspace.name} className="min-w-0 truncate text-sm font-medium text-slate-100">
        {workspace.name}
      </span>
      {working > 0 && <Chip tone="success">{t("flow.working", { count: working })}</Chip>}
      {asking > 0 && <Chip tone="warning">{t("flow.askingCount", { count: asking })}</Chip>}
      <span className="ml-auto min-w-0 shrink truncate font-mono text-2xs text-slate-500">
        {workspace.sap ? t("flow.sapLinked", { sid: workspace.sap.label }) : t("flow.sapNone")}
      </span>
    </div>
  );
}

const KIND_TONE: Record<FlowKind, StatusTone> = {
  started: "muted",
  finished: "success",
  error: "danger",
  asked: "warning",
  assigned: "muted",
  verified: "success",
  failed: "danger",
  checkpoint: "muted",
  message: "muted"
};

function flowBody(event: FlowEvent, t: ReturnType<typeof useT>): string {
  switch (event.kind) {
    case "started":
    case "finished":
    case "error":
    case "asked":
      return t(`flow.${event.kind}`);
    case "assigned":
    case "verified":
    case "failed":
      return t(`flow.${event.kind}`, { title: event.detail });
    case "checkpoint":
      return t("flow.checkpoint", { label: event.detail });
    case "message":
      return event.detail;
  }
}

const LINK = "cursor-pointer text-2xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline";

/** Akışın bir satırı: kim (renk, ad, rol), ne (çip), ne zaman; altında gövde ya da cevap kartı. */
function FlowEntry({ event, workspace }: { event: FlowEvent; workspace: TerminalWorkspace }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const pane = event.paneId ? workspace.panes.find((p) => p.id === event.paneId) : undefined;
  const at = clock(event.at);

  if (event.kind === "message") {
    return (
      <li data-flow-event="message" className="ml-6 rounded-md bg-control px-2 py-1.5">
        <div className="flex items-center gap-2 text-2xs text-slate-400">
          <span className="min-w-0 truncate">{t("flow.youTo", { name: event.name })}</span>
          <span className="ml-auto shrink-0 font-mono tabular-nums text-slate-600">{at}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-100">{event.detail}</p>
      </li>
    );
  }

  const color = pane ? PANE_COLOR_VAR[pane.color ?? "gray"] : undefined;
  const role = pane?.agent?.role;
  const canOpen = pane !== undefined;
  return (
    <li data-flow-event={event.kind} className="min-w-0 px-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
        {event.name && <span className="max-w-[9rem] shrink-0 truncate text-xs font-medium text-slate-200">{event.name}</span>}
        {role && <span className="min-w-0 truncate text-2xs text-slate-500">{role}</span>}
        <Chip tone={KIND_TONE[event.kind]}>{t(`flow.chip.${event.kind}`)}</Chip>
        <span className="ml-auto shrink-0 font-mono text-2xs tabular-nums text-slate-600">{at}</span>
      </div>
      {event.kind === "finished" && event.reply ? (
        <ReplyCard reply={event.reply} onOpen={canOpen ? () => commands.revealPane(pane.id) : undefined} />
      ) : (
        <div className="mt-0.5 pl-3.5">
          <p className={`break-words text-xs ${event.kind === "error" || event.kind === "failed" ? "text-[var(--status-danger-text)]" : "text-slate-300"}`}>
            {flowBody(event, t)}
          </p>
          {event.kind === "finished" && event.exact === false && canOpen && (
            <button type="button" data-reply-terminal="" title={t("flow.replyInTerminal")} onClick={() => commands.revealPane(pane.id)} className={LINK}>
              {t("flow.openTerminal")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

const CLAMP_CHARS = 220;
const CLAMP_LINES = 4;

/** Ajanın son cevabı: dört satıra kırpılı, "Devamını göster" ile açılıyor. */
function ReplyCard({ reply, onOpen }: { reply: string; onOpen?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const long = reply.length > CLAMP_CHARS || reply.split("\n").length > CLAMP_LINES;
  return (
    <div data-flow-reply="" className="ml-3.5 mt-1 rounded-md border border-line bg-card px-2 py-1.5">
      <p className={`whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200 ${long && !open ? "line-clamp-4" : ""}`}>{reply}</p>
      {(long || onOpen) && (
        <div className="mt-1 flex items-center gap-3">
          {long && (
            <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={LINK}>
              {open ? t("flow.less") : t("flow.more")}
            </button>
          )}
          {onOpen && (
            <button type="button" onClick={onOpen} className={LINK}>
              {t("flow.openTerminal")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ row }: { row: DecisionRow }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { answer } = useAgentStatuses();
  const [error, setError] = useState<TranslationKey | null>(null);
  const [sending, setSending] = useState(false);
  const callId = row.question.callId;
  const color = PANE_COLOR_VAR[row.pane.color ?? "gray"];

  const send = async (index: number) => {
    setSending(true);
    const result = await answer(row.paneId, callId, index);
    setSending(false);
    if (result.ok || result.reason === "closed" || result.reason === "alreadyAnswered") setError(null);
    else setError(ANSWER_ERROR[result.reason as Exclude<AgentAnswerFailure, "closed" | "alreadyAnswered">]);
  };

  return (
    <li data-decision={row.paneId} className="rounded-md border border-line bg-card p-2" style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}>
      <div className="mb-1 truncate text-2xs font-medium text-slate-400">{agentName(row.pane, t)}</div>
      <p className="mb-2 max-h-24 overflow-hidden whitespace-pre-wrap break-words text-xs text-slate-200">
        {row.question.question || row.question.header || t("agents.questionFallback")}
      </p>
      {row.answerable && (
        <div className="flex flex-wrap gap-1">
          {row.question.options.map((option, index) => (
            <button
              key={`${index}-${option}`}
              type="button"
              disabled={sending}
              onClick={() => void send(index)}
              className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-2xs text-[var(--status-warning-text)]">
          {t(error)}
        </p>
      )}
      {(!row.answerable || error) && (
        <button
          type="button"
          onClick={() => commands.revealPane(row.paneId)}
          className="mt-1 cursor-pointer text-2xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
        >
          {t("agents.goToTerminal")}
        </button>
      )}
    </li>
  );
}


function TeamSection({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { statuses, engines, now } = useAgentStatuses();
  const agents = agentPanes(workspace);
  // Kalıcı bellek penceresi (spec 2026-10-18 ajan-bellegi §4): yalnız belleği açık ajanda.
  const [memoryPaneId, setMemoryPaneId] = useState<string | null>(null);
  const memoryPane = agents.find((p) => p.id === memoryPaneId && p.agent?.memory);
  useEffect(() => {
    if (memoryPaneId !== null && !memoryPane) setMemoryPaneId(null);
  }, [memoryPaneId, memoryPane]);
  return (
    <div className="shrink-0">
      <div className="flex h-8 items-center px-3">
        <Eyebrow className="flex-1" count={agents.length}>
          {t("agents.team")}
        </Eyebrow>
      </div>
      {agents.length === 0 ? (
        <div data-flow-empty="" className="mx-2 mb-2 flex flex-col items-start gap-1.5 rounded-md border border-dashed border-line p-3">
          <p className="text-xs text-slate-200">{t("flow.emptyTitle")}</p>
          <p className="text-2xs text-slate-500">{t("flow.emptyBody")}</p>
          <button type="button" onClick={requestAddAgent} className={`${PRIMARY_BUTTON} mt-1`}>
            {t("agents.addFirst")}
          </button>
        </div>
      ) : (
        <div role="list" aria-label={t("agents.team")} className="chat-scroll flex max-h-[36vh] flex-col overflow-y-auto px-2 pb-2">
          {agents.map((pane) => (
            <AgentRow
              key={pane.id}
              pane={pane}
              selected={workspace.focusedPaneId === pane.id}
              status={statuses[pane.id]}
              engine={engines?.find((e) => e.id === (pane.agent?.engine ?? "axet-code"))}
              now={now || Date.now()}
              onOpenMemory={() => setMemoryPaneId(pane.id)}
            />
          ))}
        </div>
      )}
      {memoryPane && (
        <MemoryDialog workspaceId={workspace.id} paneId={memoryPane.id} name={agentName(memoryPane, t)} onClose={() => setMemoryPaneId(null)} />
      )}
    </div>
  );
}

/**
 * Ekipte bir ajan, TEK satır: renk çizgisi, ad, rol (varsa alt görevi), sağda
 * durum çipi. Yeniden başlat gerektiğinde hep görünür; bellek düğmesi satırın
 * üstüne gelince ya da klavye odağında belirir. Motor adı yalnız uyarı
 * varsa görünür (değilse ipucunda).
 */
function AgentRow({
  pane,
  selected,
  status,
  engine,
  now,
  onOpenMemory
}: {
  pane: TerminalPane;
  selected: boolean;
  status: AgentStatus | undefined;
  engine: AgentEngineInfo | undefined;
  now: number;
  onOpenMemory: () => void;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { boards } = useBoards();
  const view = cardStatus(pane, status, now);
  const job = activeSubtaskOf(boards, pane.id);
  const color = PANE_COLOR_VAR[pane.color ?? "gray"];
  const name = agentName(pane, t);
  const engineLabel = t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  return (
    <div role="listitem" className="group flex min-w-0 items-center gap-0.5">
      <button
        type="button"
        data-agent-row={pane.id}
        aria-pressed={selected}
        onClick={() => commands.revealPane(pane.id)}
        title={engine?.note ? undefined : engineLabel}
        style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
        className={`flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md pl-3 pr-1.5 text-left transition-colors ${selectedClass(selected)}`}
      >
        <span title={name} className="max-w-[9rem] shrink-0 truncate text-xs font-medium text-slate-200">
          {name}
        </span>
        {pane.agent?.role && (
          <span title={pane.agent.role} className="min-w-0 shrink-[2] truncate text-2xs text-slate-500">
            {pane.agent.role}
          </span>
        )}
        {/* Görev panosu (spec 2026-10-18 gorev-panosu §8): görevli ajanın alt görevi. */}
        {job && (
          <span data-agent-task="" title={job.subtask.title} className="min-w-0 shrink-[3] truncate text-2xs text-slate-500">
            {job.subtask.title}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {/* axet-code eski/bozuk (axetBinaryStatus, spec §10): motor adı uyarı renginde, mesaj ipucunda. */}
          <span
            data-engine-note={engine?.note ? "" : undefined}
            title={engine?.note}
            className={engine?.note ? "truncate text-2xs text-[var(--status-warning-text)]" : "sr-only"}
          >
            {engineLabel}
          </span>
          <Chip tone={view.tone} title={view.estimated ? t("agents.estimatedHint") : undefined}>
            <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
            {t(view.key, view.params)}
            {view.estimated && (
              <span data-estimated="" title={t("agents.estimatedHint")} className="opacity-70">
                ≈
              </span>
            )}
          </Chip>
        </span>
      </button>
      {view.restartable && (
        <button type="button" onClick={() => commands.restartPane(pane.id)} title={t("terminal.restart")} aria-label={t("terminal.restart")} className={GHOST_ICON_BUTTON}>
          <RotateCw size={12} />
        </button>
      )}
      {/* Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4): açıksa pencere, kapalıysa etkinleştirme. */}
      <button
        type="button"
        data-agent-memory={pane.agent?.memory ? "on" : "off"}
        onClick={() => (pane.agent?.memory ? onOpenMemory() : commands.enablePaneMemory(pane.id))}
        title={t(pane.agent?.memory ? "memory.open" : "memory.enable")}
        aria-label={t(pane.agent?.memory ? "memory.open" : "memory.enable")}
        className={`${GHOST_ICON_BUTTON} opacity-0 focus-visible:opacity-100 group-hover:opacity-100`}
      >
        {pane.agent?.memory ? <BookOpen size={12} /> : <BookPlus size={12} />}
      </button>
    </div>
  );
}

/** `@ekip` seçimi: tek satır ekipteki bütün ajanlara (Tur 2). */
const TEAM_ID = "__team__";

const TEAM_REASON: Partial<Record<AgentSendFailure, TranslationKey>> = {
  busy: "flow.team.reason.busy",
  asking: "flow.team.reason.asking",
  notRunning: "flow.team.reason.notRunning",
  typing: "flow.team.reason.typing",
  notSubmitted: "flow.team.reason.notSubmitted"
};

function MessageBox({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { record } = useFlow();
  const listId = useId();
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mention, setMention] = useState<Mention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const agents = agentPanes(workspace).map((pane) => ({ id: pane.id, name: agentName(pane, t) }));
  // Tek ajanda "ekip" o ajanın kendisi; seçenek 2+ ajanda.
  const teamOption = agents.length >= 2 ? { id: TEAM_ID, name: t("flow.team.name") } : null;
  const target = targetId === TEAM_ID ? teamOption : (agents.find((a) => a.id === targetId) ?? null);
  const matches = mention ? matchAgents(teamOption ? [teamOption, ...agents] : agents, mention.query) : [];
  const listOpen = mention !== null && matches.length > 0;

  const pick = (agent: { id: string; name: string }) => {
    setTargetId(agent.id);
    if (mention) setText((value) => removeMention(value, mention));
    setMention(null);
    setNotice(null);
  };

  const submit = async () => {
    if (sending) return;
    if (!target) {
      setNotice(t("flow.pickAgent"));
      return;
    }
    const body = text.trim();
    if (!body) return;
    setSending(true);
    if (target.id === TEAM_ID) {
      await sendTeam(body);
      return;
    }
    let result;
    try {
      result = await window.api.agentSend(workspace.id, target.id, body);
    } catch {
      result = { ok: false as const, reason: "writeFailed" as const };
    }
    setSending(false);
    if (result.ok) {
      record({ at: Date.now(), workspaceId: workspace.id, kind: "message", paneId: target.id, name: target.name, detail: body });
      setText("");
      setNotice(null);
    } else {
      setNotice(t(SEND_FAILURE[result.reason] ?? "browser.fail.writeFailed"));
    }
  };

  // Sırayla, her ajana bir kez: reddedilen yeniden denenmiyor, sebebi yazılıyor.
  const sendTeam = async (body: string) => {
    const skipped: string[] = [];
    let sent = 0;
    for (const agent of agents) {
      let result;
      try {
        result = await window.api.agentSend(workspace.id, agent.id, body);
      } catch {
        result = { ok: false as const, reason: "writeFailed" as const };
      }
      if (result.ok) {
        sent += 1;
        record({ at: Date.now(), workspaceId: workspace.id, kind: "message", paneId: agent.id, name: agent.name, detail: body });
      } else {
        skipped.push(`${agent.name}: ${t(TEAM_REASON[result.reason] ?? "flow.team.reason.other")}`);
      }
    }
    setSending(false);
    const summary = t("flow.team.sent", { sent, total: agents.length });
    setNotice(skipped.length ? `${summary} ${t("flow.team.skipped", { list: skipped.join(", ") })}` : summary);
    if (skipped.length === 0) setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (listOpen) {
      if (e.key === "ArrowDown") setActiveIndex((i) => (i + 1) % matches.length);
      else if (e.key === "ArrowUp") setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
      else if (e.key === "Enter" || e.key === "Tab") pick(matches[Math.min(activeIndex, matches.length - 1)]);
      else if (e.key === "Escape") setMention(null);
      else return;
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="relative shrink-0 border-t border-line p-2">
      {listOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("flow.agentList")}
          className="absolute bottom-full left-2 right-2 mb-1 max-h-48 overflow-y-auto rounded-md border border-line bg-card p-1 shadow-xl"
        >
          {matches.map((agent, index) => (
            <li
              key={agent.id}
              id={`${listId}-${agent.id}`}
              role="option"
              aria-selected={index === activeIndex}
              aria-label={agent.id === TEAM_ID ? t("flow.team.option", { count: agents.length }) : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(agent);
              }}
              className={`cursor-pointer truncate rounded px-2 py-1 text-xs ${selectedClass(index === activeIndex)}`}
            >
              {agent.name}
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <p role="status" className="mb-1 text-2xs text-[var(--status-warning-text)]">
          {notice}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        {target && (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-control py-0.5 pl-1.5 pr-0.5 text-2xs text-slate-200">
            <span className="max-w-[7rem] truncate">@{target.name}</span>
            <button type="button" onClick={() => setTargetId(null)} aria-label={t("flow.clearTarget")} title={t("flow.clearTarget")} className={GHOST_ICON_BUTTON}>
              <X size={10} />
            </button>
          </span>
        )}
        <input
          role="combobox"
          aria-label={t("flow.inputLabel")}
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={listOpen ? `${listId}-${matches[Math.min(activeIndex, matches.length - 1)].id}` : undefined}
          value={text}
          maxLength={2000}
          placeholder={t("flow.placeholder")}
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
            setMention(mentionAt(value, e.target.selectionStart ?? value.length));
            setActiveIndex(0);
            setNotice(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setMention(null)}
          className="min-w-0 flex-1 rounded bg-app px-2 py-1 text-xs text-slate-100 outline-none ring-1 ring-line focus:ring-accent-500/50"
        />
        <button type="button" onClick={() => void submit()} disabled={sending} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
          {t("flow.send")}
        </button>
      </div>
    </div>
  );
}
