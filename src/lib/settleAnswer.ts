// Bir sohbet turunun sonucu → balonun içeriği.
//
// AxetCodeHome'daki "EMNİYET AĞI" kuralları buraya taşındı (boş balon
// çizilmez; sonuç boşsa ekranda akmış metin kazanır) ve bir kural eklendi:
// ajan araç çalıştırdıktan sonra düşen tur HATA balonu değil, "yarıda kaldı"
// balonudur. Otomatik yeniden gönderme aynı yazmayı iki kez yapabilirdi
// (spec 2026-10-16 basiz-kopru §6); karar kullanıcıda, "Devam et" ile.

import type { AxetChatSendResult } from "../../app-electron/shared/types";

export interface SettledAnswer {
  content: string;
  error: boolean;
  /** Tur düştü ama ajan iş yapmıştı: "Devam et" düğmesi çıksın. */
  interrupted?: true;
  /** Yarıda kalmanın sebebi (hata metni); yoksa "uygulama kapandı" notu. */
  haltReason?: string;
}

export function settleAnswer(
  result: Pick<AxetChatSendResult, "ok" | "text" | "error" | "canContinue">,
  streamedText: string,
  genericError: string
): SettledAnswer {
  const answer = result.text.trim() || streamedText.trim();
  if (result.ok) return answer ? { content: answer, error: false } : { content: genericError, error: true };
  const reason = result.error || genericError;
  if (result.canContinue) return { content: answer || reason, error: false, interrupted: true, haltReason: reason };
  return { content: reason, error: true };
}
