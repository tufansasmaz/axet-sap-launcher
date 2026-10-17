// Ajan bildirimi: SAF karar (spec 2026-10-17 ajan-alani §9). Electron'a
// dokunmuyor; gerçek bildirim index.ts'te. Gövde sabit: soru metni ya da
// ajanın yazdığı hiçbir şey bildirime girmiyor. "Yalnız kesin durumda"
// kuralı izleyicide (agentMonitor.ts): tahmini durum buraya hiç gelmiyor.

export type AgentNotificationKind = "asking" | "done";

export interface AgentNotificationPayload {
  title: string;
  body: string;
}

const BODY: Record<"tr" | "en", Record<AgentNotificationKind, string>> = {
  tr: { asking: "Ajan bir soru soruyor", done: "Ajan işini bitirdi" },
  en: { asking: "The agent is asking a question", done: "The agent finished its work" }
};

export function agentNotificationFor(
  kind: AgentNotificationKind,
  focused: boolean,
  enabled: boolean,
  agentName: string,
  lang: "tr" | "en" = "tr"
): AgentNotificationPayload | null {
  if (focused || !enabled) return null;
  return { title: agentName.trim() || "NTT Studio", body: BODY[lang][kind] };
}
