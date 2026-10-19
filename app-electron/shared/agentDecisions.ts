// Kararlar paneli: hangi soru listeden cevaplanabilir, hangi tuşlar gönderilir
// (spec 2026-10-17 ajan-alani §7).
//
// axet-code soru kutusunda imleç ilk seçenekte açılıyor; `i` numaralı seçenek
// = `i` kez aşağı ok + Enter (eski TUI köprüsü 2026-09-05 ölçümü, 1.4.x için
// Task 1 ölçümü, spec §15). Serbest metin ve çok seçimli soru terminalde
// cevaplanıyor.
import type { AgentQuestion } from "./agentTypes";

/** Task 1 Karar A: 1.4.x TUI'de tek yazımla seçenek seçimi tuttu mu. */
export const LIST_ANSWER_ENABLED = true;

export function isListAnswerable(question: AgentQuestion): boolean {
  return LIST_ANSWER_ENABLED && !question.multiSelect && question.options.length >= 2;
}

export function optionKeys(index: number): string {
  const steps = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return "\x1b[B".repeat(steps) + "\r";
}

/** Serbest cevabın en çok uzunluğu (karakter; tek satıra indirgendikten sonra). */
export const CUSTOM_ANSWER_MAX = 500;

/**
 * Serbest cevap metni (Tur 7): satır sonları ve denetim karakterleri boşluğa,
 * art arda boşluklar teke iniyor, kırpılıyor. Boşsa ya da sınırı aşıyorsa null
 * (sessizce kesilmiyor: kullanıcı ne gönderdiğini bilmeli).
 */
export function cleanCustomAnswer(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text || text.length > CUSTOM_ANSWER_MAX) return null;
  return text;
}

/**
 * axet-code 1.4.x soru kutusunda serbest cevap (Tur 7 ölçümü, gerçek oturum):
 * seçeneklerin altında "Other" satırı ve "Type a custom answer" kutusu var.
 * İmleç ilk seçenekte açılıyor; seçenek sayısı kadar aşağı ok "Other"a iniyor,
 * yazılan metin kutuya giriyor, AYRI yazılan Enter (150 ms sonra) gönderiyor.
 * Araç sonucu `{"answers":[metin],"custom":true}`. Enter bu dizide YOK.
 */
export function customAnswerKeys(optionCount: number, text: string): string {
  const steps = Number.isFinite(optionCount) ? Math.max(0, Math.floor(optionCount)) : 0;
  return "\x1b[B".repeat(steps) + text;
}

/** Serbest cevap: listeden cevaplanabilen (tek seçimli, ≥2 seçenek) soruyla aynı koşul. */
export function isCustomAnswerable(question: AgentQuestion): boolean {
  return isListAnswerable(question);
}
