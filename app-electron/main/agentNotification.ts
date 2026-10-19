// Ajan bildirimi: SAF karar (spec 2026-10-17 ajan-alani §9). Electron'a
// dokunmuyor; gerçek bildirim index.ts'te. Gövde sabit: soru metni ya da
// ajanın yazdığı hiçbir şey bildirime girmiyor. "Yalnız kesin durumda"
// kuralı izleyicide (agentMonitor.ts): tahmini durum buraya hiç gelmiyor.
// Tur 9: hatada yalnız sınıf ve deneme sayısı eklenir (ham ileti değil).
import type { AgentErrorClass } from "../shared/agentErrors";

export type AgentNotificationKind = "asking" | "done" | "error";

export interface AgentNotificationPayload {
  title: string;
  body: string;
}

const BODY: Record<"tr" | "en", Record<AgentNotificationKind, string>> = {
  tr: { asking: "Ajan bir soru soruyor", done: "Ajan işini bitirdi", error: "Ajan hata verdi" },
  en: { asking: "The agent is asking a question", done: "The agent finished its work", error: "The agent hit an error" }
};

export const ERROR_CLASS_TEXT: Record<"tr" | "en", Record<AgentErrorClass, string>> = {
  tr: {
    unavailable: "servis geçici olarak kapalı",
    rateLimit: "istek sınırı",
    network: "ağ / zaman aşımı",
    auth: "kimlik / yetki",
    model: "model bulunamadı",
    context: "bağlam doldu",
    history: "oturum geçmişi bozuk",
    policy: "güvenlik politikası engeli",
    unknown: "bilinmeyen hata"
  },
  en: {
    unavailable: "service temporarily unavailable",
    rateLimit: "rate limit",
    network: "network / timeout",
    auth: "authentication / permission",
    model: "model not found",
    context: "context is full",
    history: "session history is broken",
    policy: "blocked by security policy",
    unknown: "unknown error"
  }
};

export function agentNotificationFor(
  kind: AgentNotificationKind,
  focused: boolean,
  enabled: boolean,
  agentName: string,
  lang: "tr" | "en" = "tr",
  error?: { cls: AgentErrorClass; attempts: number; max: number }
): AgentNotificationPayload | null {
  if (focused || !enabled) return null;
  let body = BODY[lang][kind];
  if (kind === "error" && error) {
    const tries = error.attempts > 0 && error.max > 0 ? (lang === "tr" ? ` (${error.attempts}/${error.max} deneme)` : ` (${error.attempts}/${error.max} attempts)`) : "";
    body = `${body}: ${ERROR_CLASS_TEXT[lang][error.cls]}${tries}`;
  }
  return { title: agentName.trim() || "NTT Studio", body };
}
