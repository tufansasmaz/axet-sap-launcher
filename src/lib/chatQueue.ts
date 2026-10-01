// Mesaj kuyruğu — cevap sürerken yazılan mesaj. Tek bir "sıradaki" var:
// art arda yazılanlar ona ekleniyor, yani tur bitince ajana TEK mesaj
// gidiyor. Ayrı ayrı gönderilselerdi ajan ikincisini birincinin cevabını
// görmeden değil, görerek okurdu; kullanıcı ise hepsini aynı anda düşündü.
import type { ChatAttachment } from "../../app-electron/shared/types";

export interface QueuedPrompt {
  text: string;
  attachments: ChatAttachment[];
}

function joinText(first: string, second: string): string {
  return [first.trim(), second.trim()].filter(Boolean).join("\n\n");
}

export function enqueuePrompt(queued: QueuedPrompt | null, text: string, attachments: ChatAttachment[]): QueuedPrompt {
  return {
    text: joinText(queued?.text ?? "", text),
    attachments: [...(queued?.attachments ?? []), ...attachments]
  };
}

/**
 * Sıradakini taslağa geri katıyor: tur durdurulunca ya da hata verince
 * (kendiliğinden gitmesi kullanıcıyı şaşırtırdı) ve diske yazarken
 * (kuyruk diske yazılmıyor; uygulama kapanırsa metin kutuda kalsın). Sıradaki
 * önce yazıldı, önde duruyor.
 */
export function mergeQueuedIntoDraft(
  draft: string,
  attachments: ChatAttachment[],
  queued: QueuedPrompt | null
): { draft: string; attachments: ChatAttachment[] } {
  if (!queued) return { draft, attachments };
  return { draft: joinText(queued.text, draft), attachments: [...queued.attachments, ...attachments] };
}
