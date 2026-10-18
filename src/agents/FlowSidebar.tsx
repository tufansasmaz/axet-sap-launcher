// Akış (spec 2026-10-18 ajanlar-yeniden §2): Ajanlar sekmelerinde kenar
// çubuğu yuvası. Üstte ekibin SAP bağı, "Ekip" (ajan satırları: eski ekip
// şeridindeki kartların davranışıyla), olaylar ve soru kartları (eski
// Kararlar paneli), en altta `@ajan` mesaj kutusu. Yalnız seçili ekip.
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
import { agentPanes, cardStatus, decisionsOf, TONE_DOT, type DecisionRow } from "./agentView";
import { ENGINE_LABEL, agentName } from "./agentLabels";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import MemoryDialog from "./MemoryDialog";
import { useFlow } from "./flowContext";
import type { FlowEvent } from "./flowEvents";
import { matchAgents, mentionAt, removeMention, type Mention } from "./mention";

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
      <div className="flex h-7 shrink-0 items-center gap-2 px-3 text-2xs text-slate-500">
        <span className="min-w-0 truncate font-mono">{workspace.sap ? t("flow.sapLinked", { sid: workspace.sap.label }) : t("flow.sapNone")}</span>
      </div>
      <TeamSection workspace={workspace} />
      <div className="flex h-8 shrink-0 items-center px-3">
        <Eyebrow className="flex-1">{t("flow.title")}</Eyebrow>
      </div>
      <div ref={listRef} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 && decisions.length === 0 && <p className="px-1 text-2xs text-slate-500">{t("flow.empty")}</p>}
        <ol className="flex flex-col gap-1">
          {shown.map((event) => (
            <FlowLine key={event.id} event={event} />
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

function flowText(event: FlowEvent, t: ReturnType<typeof useT>): string {
  const name = event.name;
  switch (event.kind) {
    case "started":
    case "finished":
    case "error":
    case "asked":
      return `${name} ${t(`flow.${event.kind}`)}`;
    case "assigned":
      return `${name} ${t("flow.assigned", { title: event.detail })}`;
    case "verified":
    case "failed":
      return t(`flow.${event.kind}`, { title: event.detail }) + (name ? ` · ${name}` : "");
    case "checkpoint":
      return t("flow.checkpoint", { label: event.detail }) + (name ? ` · ${name}` : "");
    case "message":
      return t("flow.message", { name, text: event.detail });
  }
}

const TONE_TEXT: Partial<Record<FlowEvent["kind"], string>> = {
  error: "text-[var(--status-danger-text)]",
  failed: "text-[var(--status-danger-text)]",
  asked: "text-[var(--status-warning-text)]"
};

function FlowLine({ event }: { event: FlowEvent }) {
  const t = useT();
  return (
    <li data-flow-event={event.kind} className="flex min-w-0 items-baseline gap-2 px-1 text-xs">
      <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-600">{clock(event.at)}</span>
      <span className={`min-w-0 break-words ${TONE_TEXT[event.kind] ?? (event.kind === "message" ? "text-slate-200" : "text-slate-400")}`}>
        {flowText(event, t)}
      </span>
    </li>
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
        <p className="px-3 pb-2 text-2xs text-slate-500">{t("flow.noAgents")}</p>
      ) : (
        <div role="list" aria-label={t("agents.team")} className="chat-scroll flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto px-2 pb-2">
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
  return (
    <div role="listitem" className="relative">
      <button
        type="button"
        data-agent-row={pane.id}
        aria-pressed={selected}
        onClick={() => commands.revealPane(pane.id)}
        style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
        className={`flex w-full flex-col gap-0.5 rounded-md py-1 pl-3 pr-14 text-left transition-colors ${selectedClass(selected)}`}
      >
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span title={name} className="min-w-0 truncate text-xs font-medium text-slate-200">
            {name}
          </span>
          {pane.agent?.role && (
            <span title={pane.agent.role} className="min-w-0 truncate text-2xs text-slate-500">
              {pane.agent.role}
            </span>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs">
          <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
          <span className="min-w-0 truncate text-slate-300">{t(view.key, view.params)}</span>
          {view.estimated && (
            <span data-estimated="" title={t("agents.estimatedHint")} className="shrink-0 text-slate-500">
              ≈
            </span>
          )}
          {/* axet-code eski/bozuk (axetBinaryStatus, spec §10): motor adı uyarı renginde, mesaj ipucunda. */}
          <span
            data-engine-note={engine?.note ? "" : undefined}
            title={engine?.note}
            className={`ml-auto shrink-0 truncate ${engine?.note ? "text-[var(--status-warning-text)]" : "text-slate-500"}`}
          >
            {t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"])}
          </span>
        </span>
        {/* Görev panosu (spec 2026-10-18 gorev-panosu §8): görevli ajanın alt görevi. */}
        {job && (
          <span data-agent-task="" title={job.subtask.title} className="min-w-0 truncate text-2xs text-slate-500">
            {job.subtask.title}
          </span>
        )}
      </button>
      <div className="absolute right-1 top-1 flex gap-0.5">
        {view.restartable && (
          <button
            type="button"
            onClick={() => commands.restartPane(pane.id)}
            title={t("terminal.restart")}
            aria-label={t("terminal.restart")}
            className={GHOST_ICON_BUTTON}
          >
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
          className={GHOST_ICON_BUTTON}
        >
          {pane.agent?.memory ? <BookOpen size={12} /> : <BookPlus size={12} />}
        </button>
      </div>
    </div>
  );
}

function MessageBox({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { record } = useFlow();
  const listId = useId();
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mention, setMention] = useState<Mention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [sending, setSending] = useState(false);
  const agents = agentPanes(workspace).map((pane) => ({ id: pane.id, name: agentName(pane, t) }));
  const target = agents.find((a) => a.id === targetId) ?? null;
  const matches = mention ? matchAgents(agents, mention.query) : [];
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
      setNotice("flow.pickAgent");
      return;
    }
    const body = text.trim();
    if (!body) return;
    setSending(true);
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
      setNotice(SEND_FAILURE[result.reason] ?? "browser.fail.writeFailed");
    }
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
          {t(notice)}
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
