// Tur 9: ham hata metninden durum alanı (sınıf + gizlisi süzülmüş kısa ayrıntı).
import { classifyAgentError, cleanErrorDetail, type AgentErrorInfo } from "../shared/agentErrors";
import { redact } from "./support/redact";

export function agentErrorInfo(text: string, source: AgentErrorInfo["source"]): AgentErrorInfo {
  const raw = String(text ?? "");
  return { cls: classifyAgentError(raw), detail: cleanErrorDetail(redact(raw, []).text), source };
}

/** `finish` parçasının message + details alanı (details bazen nesne). */
export function finishErrorText(message: unknown, details: unknown): string {
  const d = typeof details === "string" ? details : details === undefined || details === null ? "" : JSON.stringify(details);
  return `${typeof message === "string" ? message : ""} ${d}`.trim();
}
