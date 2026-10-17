// Tests for İş 3 — Rol bazlı hazır istemler

import { describe, expect, it } from "vitest";
import { getRoleChips } from "../src/lib/promptSuggestions";
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

  it("null profil için boş liste", () => {
    expect(getRoleChips(null)).toHaveLength(0);
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
