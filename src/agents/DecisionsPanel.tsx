import { useState } from "react";
import { Inbox, PanelRightClose } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { AgentAnswerFailure } from "../../app-electron/shared/agentTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "./agentStatusContext";
import { decisionsOf, type DecisionRow } from "./agentView";
import { agentName } from "./agentLabels";

// Kararlar paneli (spec 2026-10-17 ajan-alani §4.3, §7): bütün ajanların
// cevap bekleyen soruları tek listede. Tek seçimli, kesin kaynaklı soru
// listeden cevaplanıyor; ana süreç göndermeden önce sorunun hâlâ açık
// olduğunu ve terminalde dokunulmadığını yeniden doğruluyor. Ötekiler
// "Terminale git". Boşken panel kendiliğinden daralıyor.

const ANSWER_ERROR: Record<Exclude<AgentAnswerFailure, "closed" | "alreadyAnswered">, TranslationKey> = {
  typing: "agents.answerTyping",
  notAnswerable: "agents.answerNotAnswerable",
  writeFailed: "agents.answerFailed",
  noAgent: "agents.answerFailed"
};

export default function DecisionsPanel() {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const { statuses, answer } = useAgentStatuses();
  const rows = decisionsOf(state.workspaces, statuses);
  const [collapsed, setCollapsed] = useState(false);
  const [errors, setErrors] = useState<Record<string, TranslationKey>>({});
  const [sending, setSending] = useState<string | null>(null);

  const send = async (row: DecisionRow, index: number) => {
    const callId = row.question.callId;
    setSending(callId);
    const result = await answer(row.paneId, callId, index);
    setSending(null);
    if (result.ok || result.reason === "closed" || result.reason === "alreadyAnswered") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[callId];
        return next;
      });
      return;
    }
    const reason = result.reason as Exclude<AgentAnswerFailure, "closed" | "alreadyAnswered">;
    setErrors((prev) => ({ ...prev, [callId]: ANSWER_ERROR[reason] }));
  };

  if (rows.length === 0 || collapsed) {
    const empty = rows.length === 0;
    const label = empty ? t("agents.noDecisions") : t("agents.showDecisions");
    return (
      <aside aria-label={t("agents.decisions")} className="flex w-9 shrink-0 flex-col items-center gap-1 border-l border-line py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          disabled={empty}
          title={label}
          aria-label={label}
          className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
        >
          <Inbox size={14} />
        </button>
        {!empty && <span className="font-mono text-2xs tabular-nums text-[var(--status-warning-text)]">{rows.length}</span>}
      </aside>
    );
  }

  return (
    <aside aria-label={t("agents.decisions")} className="flex w-72 shrink-0 flex-col border-l border-line">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <Eyebrow className="flex-1" count={rows.length}>
          {t("agents.decisions")}
        </Eyebrow>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title={t("agents.hideDecisions")}
          aria-label={t("agents.hideDecisions")}
          className={GHOST_ICON_BUTTON}
        >
          <PanelRightClose size={14} />
        </button>
      </div>
      <ul className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {rows.map((row) => {
          const callId = row.question.callId;
          const color = PANE_COLOR_VAR[row.pane.color ?? "gray"];
          const error = errors[callId];
          return (
            <li
              key={callId}
              data-decision={row.paneId}
              className="mb-2 rounded-md border border-line bg-card p-2"
              style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
            >
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
                      disabled={sending === callId}
                      onClick={() => void send(row, index)}
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
        })}
      </ul>
    </aside>
  );
}
