// Sohbette 429 ile biten tur için otomatik yeniden deneme (kararlilik-2 R4).
//
// Kullanıcı: büyük analizlerde LLM portalından "429 Too many tokens / too many
// requests"; axet-code kendi içinde 3 kez (2 sn, 4 sn) deniyor, sonra duruyor.
// Ajanlar ekranında bunun cevabı Tur 9'da verildi (agentMonitor: artan bekleme,
// en çok N, iptal edilebilir); sohbet aynı kuralları ve aynı ayarları
// (Ayarlar > Ajanlar: "Otomatik yeniden dene", "En çok deneme") kullanıyor.
//
// Hangi yoldan sürdürülür:
//   - ajan araç çalıştırmıştı (`interrupted`, "Devam et" düğmesi) → devam et;
//     yapılan iş tekrarlanmasın.
//   - hiçbir şey yapılmadan düştü (`error`) → aynı istem yeniden gönderilir.
import { classifyAgentError, decideRetry, retryDelayMs } from "../../app-electron/shared/agentErrors";
import type { ChatMessage } from "../components/ChatBubble";

export type RateRetryKind = "regenerate" | "continue";

/** Son mesaj 429 ile biten bir tur mu; öyleyse hangi yoldan sürdürülür. */
export function rateLimitedTurn(last: ChatMessage | null | undefined): RateRetryKind | null {
  if (!last || last.role !== "assistant" || last.streaming) return null;
  if (last.interrupted && last.haltReason && classifyAgentError(last.haltReason) === "rateLimit") return "continue";
  if (last.error && classifyAgentError(last.content) === "rateLimit") return "regenerate";
  return null;
}

export interface RateRetryPlan {
  kind: RateRetryKind;
  attempt: number;
  delayMs: number;
}

/**
 * Bir sonraki deneme. `attempts`: bu zincirde (son başarılı turdan beri)
 * gönderilmiş otomatik deneme sayısı. `null` = deneme yok (kapalı, tükendi ya
 * da 429 değil).
 */
export function planRateRetry(
  last: ChatMessage | null | undefined,
  attempts: number,
  settings: { auto: boolean; max: number },
  rand: () => number = Math.random
): RateRetryPlan | null {
  const kind = rateLimitedTurn(last);
  if (!kind) return null;
  const decision = decideRetry({ cls: "rateLimit", attempts, auto: settings.auto, max: settings.max, alive: true });
  if (!decision.auto) return null;
  return { kind, attempt: decision.attempt, delayMs: retryDelayMs(decision.attempt, rand) };
}
