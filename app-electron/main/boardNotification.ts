// Görev panosu bildirimi: SAF karar (spec 2026-10-18 gorev-panosu §8).
// Electron'a dokunmuyor; gerçek bildirim index.ts'te. Gövde sabit; başlık
// kullanıcının yazdığı görev başlığı. Alt görev başlığı, istem ya da komut
// çıktısı bildirime girmiyor.
import type { AgentNotificationPayload } from "./agentNotification";

export type BoardNotificationKind = "taskDone" | "subtaskFailed";

const BODY: Record<"tr" | "en", Record<BoardNotificationKind, string>> = {
  tr: { taskDone: "Görev bitti", subtaskFailed: "Alt görev başarısız" },
  en: { taskDone: "Task finished", subtaskFailed: "Subtask failed" }
};

export function boardNotificationFor(
  kind: BoardNotificationKind,
  focused: boolean,
  enabled: boolean,
  taskTitle: string,
  lang: "tr" | "en" = "tr"
): AgentNotificationPayload | null {
  if (focused || !enabled) return null;
  return { title: taskTitle.trim() || "NTT Studio", body: BODY[lang][kind] };
}
