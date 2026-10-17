// Tests for İş 3 — Rol bazlı hazır istemler

import { describe, expect, it } from "vitest";
import { getRoleChips, appendChipText } from "../src/lib/promptSuggestions";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";

describe("getRoleChips", () => {
  it("module-consultant için dört çip", () => {
    const chips = getRoleChips("module-consultant");
    expect(chips).toHaveLength(4);
    expect(chips.every((c) => c.needsSap)).toBe(true);
  });

  it("technical-consultant için dört çip", () => {
    const chips = getRoleChips("technical-consultant");
    expect(chips).toHaveLength(4);
  });

  it("sandbox için technical-consultant ile aynı liste", () => {
    const tc = getRoleChips("technical-consultant").map((c) => c.key);
    const sb = getRoleChips("sandbox").map((c) => c.key);
    expect(sb).toEqual(tc);
  });

  it("null profil için varsayılan profil (module-consultant) kullanılır", () => {
    // Rol seçilmemiş kullanıcı çipleri görür; boş ekran daha az yardımcı olur.
    const nullChips = getRoleChips(null).map((c) => c.key);
    const defaultChips = getRoleChips("module-consultant").map((c) => c.key);
    expect(nullChips).toEqual(defaultChips);
  });
});

describe("i18n anahtar bütünlüğü", () => {
  it("her çip anahtarı hem tr hem en'de var", () => {
    const profiles = ["module-consultant", "technical-consultant", "sandbox"] as const;
    for (const profile of profiles) {
      const chips = getRoleChips(profile);
      for (const { key } of chips) {
        expect(key in tr, `tr eksik: ${key}`).toBe(true);
        expect(key in en, `en eksik: ${key}`).toBe(true);
      }
    }
  });
});

describe("appendChipText", () => {
  it("boş taslağa chip metni direkt yazar", () => {
    expect(appendChipText("", "Bu tabloyu açıkla: ")).toBe("Bu tabloyu açıkla: ");
  });

  it("taslak boşlukla bitiyorsa direkt ekler", () => {
    expect(appendChipText("merhaba ", "chip")).toBe("merhaba chip");
  });

  it("taslak boşlukla bitmiyorsa önce boşluk ekler", () => {
    expect(appendChipText("merhaba", "chip")).toBe("merhaba chip");
  });

  it("taslak dolu ve chip boşsa boş string ekler", () => {
    expect(appendChipText("merhaba", "")).toBe("merhaba ");
  });
});
