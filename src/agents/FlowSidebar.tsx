// Akış (spec 2026-10-18 ajanlar-yeniden §2; ajanlar-ux §2, §3): Ajanlar
// sekmelerinde kenar çubuğu yuvası. Üstte ekibin başlığı (ad, kaç ajan
// çalışıyor/soru soruyor, SAP bağı), "Ekip" (tek satırlık ajan satırları),
// akış (ajan başına başlık + durum çipi + gövde; bitirince son cevabı
// kartta), soru kartları ve mesaj kutusu. Görünüm seçimi artık içerik
// alanının sol kenarındaki dikey rayda (ViewRail).
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, AtSign, BookOpen, BookPlus, ChevronDown, GitBranch, RotateCw, Trash2, X } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { noteFromFlow } from "../../app-electron/shared/memoryNotes";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { AXET_SETUP_DETAIL, type AgentAnswerFailure, type AgentEngineInfo, type AgentStatus } from "../../app-electron/shared/agentTypes";
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
import { flowBody } from "./flowText";
import { phaseText } from "./agentPhase";
import { useFlow, type LeadApproval, type QueuedSend } from "./flowContext";
import { isLeadRole } from "../../app-electron/shared/leadCommands";
import type { FlowEvent, FlowKind } from "./flowEvents";
import { matchAgents, mentionAt, removeMention, type Mention } from "./mention";
import { requestAddAgent } from "./addAgentBus";
import CustomAnswer from "./CustomAnswer";
import OpenInBrowserButton from "../browser/OpenInBrowserButton";

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

/** Mesaj kutusunun en çok yüksekliği (max-h-40 = 160px ile aynı). */
const COMPOSER_MAX_PX = 160;

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
  const { state, commands } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { events, queued, clear, approvals } = useFlow();
  const [confirmClear, setConfirmClear] = useState(false);
  const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const listRef = useRef<HTMLDivElement | null>(null);
  const shown = workspace ? events.filter((e) => e.workspaceId === workspace.id) : [];
  const decisions = workspace ? decisionsOf([workspace], statuses) : [];
  const waiting = workspace ? queued.filter((q) => q.workspaceId === workspace.id) : [];
  const asks = workspace ? approvals.filter((a) => a.workspaceId === workspace.id) : [];
  const lastId = shown.length ? shown[shown.length - 1].id : 0;

  // En yeni altta: yeni olay ya da soru gelince sona kay.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, decisions.length, asks.length, workspace?.id]);

  // İlk açılışta "Son düzen" seçimi sol panelin başında (içerik alanının üstünde şerit değil).
  const restore =
    state.phase === "restorePrompt" ? (
      <div data-restore-prompt="" className="flex shrink-0 flex-col gap-2 border-b border-line px-3 py-2.5">
        <p className="text-xs text-slate-300">
          {t("terminal.restorePrompt", { workspaces: state.saved.length, panes: state.saved.reduce((sum, w) => sum + w.panes.length, 0) })}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => commands.startFresh()} className={`${TOOL_BUTTON} flex-1 justify-center`}>
            {t("terminal.startFresh")}
          </button>
          <button type="button" onClick={() => commands.restore()} className={`${PRIMARY_BUTTON} flex-1 justify-center`}>
            {t("terminal.restoreLayout")}
          </button>
        </div>
      </div>
    ) : null;

  if (!workspace) return <div className="flex min-h-0 flex-1 flex-col">{restore}</div>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {restore}
      <FlowHeader workspace={workspace} statuses={statuses} />
      <TeamSection workspace={workspace} />
      <div className="flex h-8 shrink-0 items-center border-t border-line px-3">
        <Eyebrow className="flex-1">{t("flow.title")}</Eyebrow>
        {shown.length > 0 && (
          <button
            type="button"
            data-flow-clear=""
            onClick={() => setConfirmClear(true)}
            aria-label={t("flow.clearHistory")}
            title={t("flow.clearHistory")}
            className={GHOST_ICON_BUTTON}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div ref={listRef} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 && decisions.length === 0 && <p className="px-1 text-2xs text-slate-500">{t("flow.empty")}</p>}
        <ol className="flex flex-col gap-1.5">
          {shown.map((event) => (
            <FlowEntry key={event.id} event={event} workspace={workspace} />
          ))}
        </ol>
        {asks.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {asks.map((item) => (
              <ApprovalCard key={item.requestId} item={item} />
            ))}
          </ul>
        )}
        {waiting.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {waiting.map((item) => (
              <QueuedCard key={item.paneId} item={item} />
            ))}
          </ul>
        )}
        {decisions.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {decisions.map((row) => (
              <DecisionCard key={`${row.paneId}:${row.question.callId}`} row={row} />
            ))}
          </ul>
        )}
      </div>
      <MessageBox key={workspace.id} workspace={workspace} />
      <ConfirmDialog
        open={confirmClear}
        title={t("flow.clearHistory")}
        message={t("flow.clearHistoryBody", { name: workspace.name })}
        confirmLabel={t("flow.clearHistoryConfirm")}
        onConfirm={() => {
          clear(workspace.id);
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

/** Tur 7: Lider bir ajan açmak istiyor (Ayarlar → "Lider açılışlarını onayla"). */
function ApprovalCard({ item }: { item: LeadApproval }) {
  const t = useT();
  const { answerApproval } = useFlow();
  return (
    <li data-flow-approval="" className="rounded-md border border-[var(--status-warning-border)] px-2 py-1.5">
      <p className="text-2xs font-medium text-[var(--status-warning-text)]">{t("flow.lead.approveTitle", { lead: item.leader, name: item.name, role: item.role })}</p>
      {item.task && <p className="mt-0.5 line-clamp-3 break-words text-xs text-slate-300">{item.task}</p>}
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={() => answerApproval(item.requestId, true)} className={TOOL_BUTTON}>
          {t("flow.lead.approve")}
        </button>
        <button type="button" onClick={() => answerApproval(item.requestId, false)} className={LINK}>
          {t("flow.lead.deny")}
        </button>
      </div>
    </li>
  );
}

/** Tur 4: açılış seçimindeki axet-code'a giden mesaj — seçim yapılınca kendiliğinden, bir kez gider. */
function QueuedCard({ item }: { item: QueuedSend }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { cancelQueued, retryQueued } = useFlow();
  const failed = item.state === "failed";
  return (
    <li data-flow-queued={item.state} className="rounded-md border border-[var(--status-warning-border)] px-2 py-1.5">
      <p className="text-2xs font-medium text-[var(--status-warning-text)]">
        {failed ? t("flow.queue.failed", { name: item.name, reason: t(SEND_FAILURE[item.reason ?? "writeFailed"]) }) : t("flow.queue.waiting", { name: item.name })}
      </p>
      <p className="mt-0.5 line-clamp-2 break-words text-xs text-slate-300">{item.body}</p>
      <div className="mt-1 flex items-center gap-3">
        <button type="button" onClick={() => commands.revealPane(item.paneId)} className={LINK}>
          {t("flow.openTerminal")}
        </button>
        {failed && (
          <button type="button" onClick={() => retryQueued(item.paneId)} className={LINK}>
            {t("flow.queue.retry")}
          </button>
        )}
        <button type="button" onClick={() => cancelQueued(item.paneId)} className={LINK}>
          {t("flow.queue.cancel")}
        </button>
      </div>
    </li>
  );
}

/** Ekibin başlığı: ad, kaç ajan çalışıyor / soru soruyor, SAP bağı. */
function FlowHeader({ workspace, statuses }: { workspace: TerminalWorkspace; statuses: Record<string, AgentStatus> }) {
  const t = useT();
  const { commands } = useTerminalStore();
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
      {/* Tur 3: kalıcı bellek ekranına Akış'tan doğrudan geçiş. */}
      <button
        type="button"
        data-flow-memory=""
        onClick={() => commands.setWorkspaceView(workspace.id, "memory")}
        aria-label={t("flow.openMemory")}
        title={t("flow.openMemory")}
        className={GHOST_ICON_BUTTON}
      >
        <BookOpen size={13} />
      </button>
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
  message: "muted",
  relay: "muted",
  learn: "muted",
  note: "muted",
  browser: "success",
  link: "muted"
};


const LINK = "cursor-pointer text-2xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline";

/** Akışın bir satırı: kim (renk, ad, rol), ne (çip), ne zaman; altında gövde ya da cevap kartı. */
function FlowEntry({ event, workspace }: { event: FlowEvent; workspace: TerminalWorkspace }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const pane = event.paneId ? workspace.panes.find((p) => p.id === event.paneId) : undefined;
  const at = clock(event.at);

  // Tur 4: ajandan ajana (ekip köprüsü) — "A → B" ve metin. Tur 7: lider kartları (act).
  if (event.kind === "relay") {
    const color = pane ? PANE_COLOR_VAR[pane.color ?? "gray"] : undefined;
    const act = event.act;
    const title = act === "spawn" || act === "close" || act === "denied" ? t(`flow.lead.${act}`, { lead: event.name }) : event.name;
    return (
      <li data-flow-event="relay" data-flow-act={act} className="mr-4 rounded-md border border-line px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5 text-2xs">
          <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
          <span className="min-w-0 truncate font-medium text-slate-200">{title}</span>
          <Chip tone={act === "denied" ? "warning" : "muted"}>{act ? t(`flow.lead.chip.${act}`) : t("flow.chip.relay")}</Chip>
          <span className="ml-auto shrink-0 font-mono tabular-nums text-slate-600">{at}</span>
        </div>
        <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap break-words text-xs text-slate-200">{event.detail}</p>
        <ToMemory event={event} workspaceId={workspace.id} />
      </li>
    );
  }

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
  const status = pane ? statuses[pane.id] : undefined;
  const live = event.kind === "started" && status?.source === "exact" && status.state === "running" ? status.phase : undefined;
  return (
    <li data-flow-event={event.kind} className="min-w-0 px-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
        {event.name && <span className="max-w-[9rem] shrink-0 truncate text-xs font-medium text-slate-200">{event.name}</span>}
        {role && <span className="min-w-0 truncate text-2xs text-slate-500">{role}</span>}
        <Chip tone={KIND_TONE[event.kind]} title={event.exact === false ? t("agents.estimatedHint") : undefined}>
          {t(`flow.chip.${event.kind}`)}
          {event.exact === false && (
            <span data-estimated="" className="opacity-70">
              ≈
            </span>
          )}
        </Chip>
        <span className="ml-auto shrink-0 font-mono text-2xs tabular-nums text-slate-600">{at}</span>
      </div>
      {live ? (
        // Tur 6: açık görevin tek kartı; aşama satırı kesin kaynaktan canlı güncelleniyor.
        <p data-flow-phase={live.kind} className="mt-0.5 truncate pl-3.5 text-xs text-slate-300" title={phaseText(live, t)}>
          {phaseText(live, t)}
        </p>
      ) : event.kind === "finished" && event.reply ? (
        <>
          <ReplyCard reply={event.reply} onOpen={canOpen ? () => commands.revealPane(pane.id) : undefined} />
          <div className="ml-3.5">
            <ToMemory event={event} workspaceId={workspace.id} />
          </div>
        </>
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
          {(event.kind === "verified" || event.kind === "asked") && <ToMemory event={event} workspaceId={workspace.id} />}
          {(event.kind === "browser" || event.kind === "link") && <OpenInBrowserButton workspaceId={workspace.id} url={event.detail} />}
        </div>
      )}
    </li>
  );
}

/**
 * Tur 5: Akış kartından tek tıkla ekip belleğine not (cevap → olgu, soru →
 * karar, doğrulanan görev → görev). Not ana süreçte gizli süzgecinden geçer.
 */
function ToMemory({ event, workspaceId }: { event: FlowEvent; workspaceId: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const input = noteFromFlow(event);
  const notesAdd = (window as unknown as { api?: Partial<Window["api"]> }).api?.notesAdd;
  if (!input || !notesAdd) return null;
  if (state === "done") {
    return (
      <span data-to-memory="done" role="status" className="text-2xs text-slate-500">
        {t("flow.toMemoryDone")}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-to-memory=""
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        try {
          const result = await notesAdd(workspaceId, input);
          setState(result.ok ? "done" : "failed");
        } catch {
          setState("failed");
        }
      }}
      className={LINK}
    >
      {state === "failed" ? t("flow.toMemoryFailed") : t("flow.toMemory")}
    </button>
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
      {/* Tur 7: serbest cevap (tuş dizisi yalnız axet-code'da ölçüldü). */}
      {row.answerable && row.pane.agent?.engine === "axet-code" && <CustomAnswer paneId={row.paneId} callId={callId} disabled={sending} />}
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
          <button type="button" onClick={() => requestAddAgent()} className={`${PRIMARY_BUTTON} mt-1`}>
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
  const phase = pane.run.state === "running" && status?.source === "exact" && status.state === "running" ? status.phase : undefined;
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
        {/* Tur 7: Lider açtı (yalnız o lider kapatabilir). */}
        {pane.agent?.spawnedBy && (
          <span data-agent-spawned="" title={t("flow.lead.spawnedBadge")} aria-label={t("flow.lead.spawnedBadge")} className="shrink-0 text-slate-500">
            <GitBranch size={10} />
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
          <Chip tone={view.tone} title={view.estimated ? t("agents.estimatedHint") : phase ? phaseText(phase, t) : undefined}>
            <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
            {/* Tur 6: kesin kaynakta çalışırken aşama ("dosya okuyor"); hedef ipucunda. */}
            {phase ? <span data-agent-phase={phase.kind}>{phaseText(phase, t, false)}</span> : t(view.key, view.params)}
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

/** Tur 7: ekibin Lider'i (kullanıcının açtığı, Lider rolünde ilk ajan). */
export function teamLead(workspace: TerminalWorkspace): TerminalPane | null {
  return agentPanes(workspace).find((p) => p.agent && isLeadRole(p.agent.role) && !p.agent.spawnedBy) ?? null;
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
  const { record, queue } = useFlow();
  const { statuses } = useAgentStatuses();
  const listId = useId();
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mention, setMention] = useState<Mention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Tur 7: lidersiz ekibe iş verilince "Lider ekle" önerisi.
  const [leadTip, setLeadTip] = useState(false);
  // Hedef çipinden açılan seçici (Tur 3); @ yazınca açılan listeyle aynı liste.
  const [picker, setPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const agents = agentPanes(workspace).map((pane) => ({ id: pane.id, name: agentName(pane, t) }));
  // Tek ajanda "ekip" o ajanın kendisi; seçenek 2+ ajanda.
  const teamOption = agents.length >= 2 ? { id: TEAM_ID, name: t("flow.team.name") } : null;
  const target = targetId === TEAM_ID ? teamOption : (agents.find((a) => a.id === targetId) ?? null);
  const options = teamOption ? [teamOption, ...agents] : agents;
  const matches = mention ? matchAgents(options, mention.query) : picker ? options : [];
  const listOpen = (mention !== null || picker) && matches.length > 0;

  const pick = (agent: { id: string; name: string }) => {
    setTargetId(agent.id);
    if (mention) setText((value) => removeMention(value, mention));
    setMention(null);
    setPicker(false);
    setNotice(null);
  };

  const submit = async () => {
    if (sending) return;
    if (!target) {
      setNotice(t("flow.pickAgent"));
      return;
    }
    // Satırlar ajana tek satır olarak gider (terminal istemi; satır sonu reddedilir).
    const body = text.replace(/\s+/g, " ").trim();
    if (!body) return;
    setLeadTip(false);
    setSending(true);
    if (target.id === TEAM_ID) {
      // Tur 7: ekipte Lider varsa iş ona gider; ekibi o kurar ve dağıtır.
      const lead = teamLead(workspace);
      if (lead) {
        await sendOne({ id: lead.id, name: agentName(lead, t) }, body, t("flow.lead.routed", { name: agentName(lead, t) }));
        return;
      }
      await sendTeam(body);
      setLeadTip(true);
      return;
    }
    await sendOne(target, body, null);
  };

  const sendOne = async (to: { id: string; name: string }, body: string, okNotice: string | null) => {
    if (statuses[to.id]?.detail === AXET_SETUP_DETAIL) {
      // Açılış seçimi açık: yazılsaydı kaybolurdu. Kuyrukta bekler, seçim yapılınca bir kez gider.
      setSending(false);
      queue({ workspaceId: workspace.id, paneId: to.id, name: to.name, body });
      setText("");
      setNotice(t("flow.queue.queued", { name: to.name }));
      return;
    }
    const target = to;
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
      setNotice(okNotice);
    } else {
      setNotice(t(SEND_FAILURE[result.reason] ?? "browser.fail.writeFailed"));
    }
  };

  // Sırayla, her ajana bir kez: reddedilen yeniden denenmiyor, sebebi yazılıyor.
  const sendTeam = async (body: string) => {
    const skipped: string[] = [];
    let sent = 0;
    for (const agent of agents) {
      if (statuses[agent.id]?.detail === AXET_SETUP_DETAIL) {
        queue({ workspaceId: workspace.id, paneId: agent.id, name: agent.name, body });
        sent += 1;
        continue;
      }
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

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (listOpen) {
      if (e.key === "ArrowDown") setActiveIndex((i) => (i + 1) % matches.length);
      else if (e.key === "ArrowUp") setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
      else if (e.key === "Enter" || e.key === "Tab") pick(matches[Math.min(activeIndex, matches.length - 1)]);
      else if (e.key === "Escape") {
        setMention(null);
        setPicker(false);
      } else return;
      e.preventDefault();
      return;
    }
    // Enter gönderir, Shift+Enter yeni satır (ajana tek satır olarak gider).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  // Yazı alanı içeriğe göre büyüyor (en çok COMPOSER_MAX_PX); gizliyken ölçülmüyor.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [text]);

  const canSend = !sending && text.trim() !== "";

  return (
    <div className="relative shrink-0 px-2 pb-2 pt-1">
      {listOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("flow.agentList")}
          className="absolute bottom-full left-2 right-2 z-20 mb-1 max-h-48 overflow-y-auto rounded-md border border-line bg-card p-1 shadow-xl"
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
        <p role="status" className="mb-1 px-1 text-2xs text-[var(--status-warning-text)]">
          {notice}
        </p>
      )}
      {leadTip && (
        <p data-flow-lead-tip="" className="mb-1 flex items-center gap-2 px-1 text-2xs text-slate-400">
          <span className="min-w-0 flex-1">{t("flow.lead.tip")}</span>
          <button type="button" onClick={() => requestAddAgent({ lead: true })} className={LINK}>
            {t("flow.lead.addLead")}
          </button>
        </p>
      )}
      <div
        data-flow-composer=""
        className="rounded-xl border border-line-subtle bg-card px-2 pb-1.5 pt-1 transition-colors hover:border-line focus-within:border-accent-500/60"
      >
        <textarea
          ref={inputRef}
          role="combobox"
          rows={1}
          aria-label={t("flow.inputLabel")}
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={listOpen ? `${listId}-${matches[Math.min(activeIndex, matches.length - 1)].id}` : undefined}
          value={text}
          maxLength={2000}
          placeholder={target ? t("flow.placeholderTo", { name: target.name }) : t("flow.placeholder")}
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
            setMention(mentionAt(value, e.target.selectionStart ?? value.length));
            setPicker(false);
            setActiveIndex(0);
            setNotice(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setMention(null);
            setPicker(false);
          }}
          className="block max-h-40 min-h-[34px] w-full resize-none bg-transparent px-1 py-1.5 text-xs leading-5 text-slate-100 outline-none placeholder:text-slate-500"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-flow-target={target ? target.id : ""}
            aria-haspopup="listbox"
            aria-expanded={listOpen}
            aria-label={target ? t("flow.targetChange", { name: target.name }) : t("flow.pickTarget")}
            title={target ? t("flow.targetChange", { name: target.name }) : t("flow.pickTarget")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setMention(null);
              setActiveIndex(0);
              setPicker((open) => !open);
              inputRef.current?.focus();
            }}
            className={`flex h-6 min-w-0 max-w-[10rem] cursor-pointer items-center gap-1 rounded-md px-1.5 text-2xs transition-colors ${
              target ? "bg-control text-slate-200 hover:bg-hover" : "text-slate-400 hover:bg-hover hover:text-slate-200"
            }`}
          >
            <AtSign size={11} className="shrink-0" />
            <span className="min-w-0 truncate">{target ? target.name : t("flow.pickTargetShort")}</span>
            <ChevronDown size={10} className="shrink-0 text-slate-500" />
          </button>
          {target && (
            <button type="button" onClick={() => setTargetId(null)} aria-label={t("flow.clearTarget")} title={t("flow.clearTarget")} className={GHOST_ICON_BUTTON}>
              <X size={10} />
            </button>
          )}
          <span className="ml-auto truncate text-2xs text-slate-500">{t("flow.keysHint")}</span>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending}
            aria-label={t("flow.send")}
            title={t("flow.send")}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-default disabled:opacity-40 ${
              canSend ? "cursor-pointer bg-slate-200 text-app hover:bg-white" : "bg-active text-slate-500"
            }`}
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
