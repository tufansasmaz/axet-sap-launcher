import { describe, expect, it } from "vitest";
import type { AppConfig } from "../app-electron/shared/types";
import { dirtySections, EDITED_FIELDS, SETTINGS_SECTIONS } from "../src/components/settings/settingsSections";

const base = {
  language: "tr",
  projectsBaseDir: "C:\\p",
  palette: "ntt",
  theme: "dark",
  chatFontSize: "md",
  axetWorkspaceDir: "C:\\w",
  chatDensity: "comfortable",
  axetCommand: "axet",
  terminal: "cmd",
  landscapePathOverride: null,
  sapShcutPathOverride: null,
  autoCheckUpdates: true
} as unknown as AppConfig;

describe("settingsSections", () => {
  it("sekiz bölüm, spec'teki sırayla", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      "general", "appearance", "axetCode", "chatAppearance", "terminal", "advanced", "manual", "updates"
    ]);
  });

  it("bir alan yalnız bir bölümde", () => {
    expect(new Set(EDITED_FIELDS).size).toBe(EDITED_FIELDS.length);
  });

  it("değişiklik yoksa boş küme", () => {
    expect(dirtySections({ ...base }, base).size).toBe(0);
    expect(dirtySections(null, base).size).toBe(0);
    expect(dirtySections(base, null).size).toBe(0);
  });

  it("değişen alanın bölümü işaretleniyor", () => {
    const form = { ...base, theme: "light", axetCommand: "x" } as AppConfig;
    expect([...dirtySections(form, base)].sort()).toEqual(["appearance", "terminal"]);
  });

  it("boş yol ('') null'dan farklı sayılıyor", () => {
    const form = { ...base, landscapePathOverride: "" } as AppConfig;
    expect([...dirtySections(form, base)]).toEqual(["advanced"]);
  });
});
