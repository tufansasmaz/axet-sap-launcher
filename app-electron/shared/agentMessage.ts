// Akış'taki mesaj kutusunun istemi (spec 2026-10-18 ajanlar-yeniden §2).
// Kullanıcının yazdığı tek satır, Görev Panosu'nun kalıbıyla nötr bir önekle
// ajana gider: ilk karakter hiçbir zaman `!` (kabuk kipi) ya da `/` (motor
// komutu) olmaz. Gövde kendisi de `!` ile başlayamaz; denetim karakteri,
// satır sonu ya da 2000'i aşan metin reddedilir (sessizce kırpılmaz).
import type { BrowserSendFailure } from "./browserLogic";

export const AGENT_MESSAGE_MAX = 2_000;

export type AgentSendFailure = Extract<
  BrowserSendFailure,
  "invalid" | "noWorkspace" | "noAgent" | "notRunning" | "busy" | "asking" | "typing" | "writeFailed" | "notSubmitted"
>;

export type AgentSendResult = { ok: true } | { ok: false; reason: AgentSendFailure };

export function agentMessagePrompt(text: unknown): string | null {
  if (typeof text !== "string") return null;
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text)) return null;
  const body = text.replace(/\s+/g, " ").trim();
  if (!body || body.length > AGENT_MESSAGE_MAX || body.startsWith("!")) return null;
  return `[Mesaj] ${body}`;
}
