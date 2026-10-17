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
