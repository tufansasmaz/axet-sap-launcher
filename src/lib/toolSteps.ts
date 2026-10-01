import type { AxetChatActivity } from "../../app-electron/shared/types";

/**
 * Aynı çağrı için İKİNCİ kez gelen `tool` olayını mevcut satıra işler.
 *
 * Main tarafı satırı girdi henüz akarken açıyor, girdi tamamlanınca hedefi ve
 * farkı aynı `callId` ile yeniden gönderiyor (bkz. main/toolCallInput.ts).
 * Yalnızca DOLU gelen alanlar yazılıyor: yeniden bağlanan bir pencereye düşen
 * eski bir kopya, dolmuş bir satırı boşaltmamalı. Satır bulunamazsa `null` —
 * çağıran yeni satır açar.
 */
export function mergeToolStep(steps: AxetChatActivity[], activity: AxetChatActivity): AxetChatActivity[] | null {
  if (!activity.callId) return null;
  const index = steps.findIndex((step) => step.callId === activity.callId);
  if (index < 0) return null;
  const current = steps[index];
  const target = activity.target || current.target;
  const diff = activity.diff || current.diff;
  if (target === current.target && diff === current.diff) return steps;
  const next = steps.slice();
  next[index] = { ...current, ...(target ? { target } : {}), ...(diff ? { diff } : {}) };
  return next;
}
