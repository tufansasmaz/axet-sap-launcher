// Tur 7: Akış soru kartında "Kendi cevabını yaz". Seçeneklerin altında tek
// satırlık kutu + Gönder. Tuş dizisi ana süreçte (agentMonitor.answerText):
// axet-code soru kutusunun "Other" satırı + metin + ayrı Enter (gerçek oturumda
// ölçüldü). Metin tek satıra indirgenir, en çok CUSTOM_ANSWER_MAX karakter,
// gizli süzgeç ana süreçte. Tek seferlik: gönderilince kutu kilitlenir.
import { useState, type FormEvent } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { cleanCustomAnswer, CUSTOM_ANSWER_MAX } from "../../app-electron/shared/agentDecisions";
import type { AgentAnswerFailure } from "../../app-electron/shared/agentTypes";
import { INPUT_CLASS } from "../ui/Field";
import { TOOL_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "./agentStatusContext";

const FAILURE: Record<AgentAnswerFailure, TranslationKey> = {
  typing: "agents.answerTyping",
  notAnswerable: "agents.customAnswerInvalid",
  writeFailed: "agents.answerFailed",
  noAgent: "agents.answerFailed",
  closed: "agents.customAnswerClosed",
  alreadyAnswered: "agents.customAnswerClosed"
};

export default function CustomAnswer({ paneId, callId, disabled = false }: { paneId: string; callId: string; disabled?: boolean }) {
  const t = useT();
  const { answerText } = useAgentStatuses();
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<TranslationKey | null>(null);
  if (!answerText) return null;

  const clean = cleanCustomAnswer(text);
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (state !== "idle" || clean === null) return;
    setState("busy");
    setError(null);
    const result = await answerText(paneId, callId, clean);
    if (result.ok) {
      setState("sent");
      return;
    }
    setState(result.reason === "closed" || result.reason === "alreadyAnswered" ? "sent" : "idle");
    setError(FAILURE[result.reason]);
  };

  if (state === "sent" && !error) {
    return (
      <p role="status" data-custom-answer="sent" className="mt-1.5 text-2xs text-slate-500">
        {t("agents.customAnswerSent")}
      </p>
    );
  }

  return (
    <form data-custom-answer="" onSubmit={(e) => void submit(e)} className="mt-1.5">
      <label className="mb-0.5 block text-2xs text-slate-500" htmlFor={`custom-${callId}`}>
        {t("agents.customAnswer")}
      </label>
      <div className="flex gap-1">
        <input
          id={`custom-${callId}`}
          type="text"
          value={text}
          maxLength={CUSTOM_ANSWER_MAX}
          disabled={disabled || state !== "idle"}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("agents.customAnswerPlaceholder")}
          className={`${INPUT_CLASS} h-7 min-w-0 flex-1 text-xs`}
        />
        <button type="submit" disabled={disabled || state !== "idle" || clean === null} className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}>
          {t("agents.customAnswerSend")}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-2xs text-[var(--status-warning-text)]">
          {t(error)}
        </p>
      )}
    </form>
  );
}
