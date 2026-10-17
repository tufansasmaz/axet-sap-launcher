// Rol bazlı hazır istemler — İş 3 (2026-10-17).
// Veri dosyası: anahtar listesi, i18n metinleri tr.ts/en.ts'te.

import type { SkillProfile } from "../../app-electron/shared/types";

export interface PromptChip {
  /** i18n anahtarı (tr.ts'teki TranslationKey). */
  key: string;
  /** Bu öneri SAP bağlamı gerektiriyor mu. */
  needsSap: boolean;
}

const MODULE_CHIPS: PromptChip[] = [
  { key: "promptSuggestions.mc1", needsSap: true },
  { key: "promptSuggestions.mc2", needsSap: true },
  { key: "promptSuggestions.mc3", needsSap: true },
  { key: "promptSuggestions.mc4", needsSap: true }
];

const TECHNICAL_CHIPS: PromptChip[] = [
  { key: "promptSuggestions.tc1", needsSap: true },
  { key: "promptSuggestions.tc2", needsSap: true },
  { key: "promptSuggestions.tc3", needsSap: true },
  { key: "promptSuggestions.tc4", needsSap: true }
];

// Rol seçilmediğinde varsayılan profil.
const DEFAULT_PROFILE: SkillProfile = "module-consultant";

/**
 * Seçili role göre hazır istem çiplerini döner.
 * - module-consultant: modül danışmanı önerileri
 * - technical-consultant / sandbox: teknik danışman önerileri
 * - null: varsayılan profil (module-consultant) kullanılır
 */
export function getRoleChips(profile: SkillProfile | null): readonly PromptChip[] {
  const effective = profile ?? DEFAULT_PROFILE;
  if (effective === "technical-consultant" || effective === "sandbox") {
    return TECHNICAL_CHIPS;
  }
  return MODULE_CHIPS;
}

/**
 * Mevcut taslak metnine çip metnini ekler.
 * - Taslak boşsa çip metni direkt yazılır.
 * - Taslak boşlukla bitmiyorsa önce boşluk eklenir (#8).
 *
 * Saf fonksiyon → izole test edilebilir.
 */
export function appendChipText(draft: string, chipText: string): string {
  if (!draft) return chipText;
  if (/\s$/.test(draft)) return draft + chipText;
  return draft + " " + chipText;
}
