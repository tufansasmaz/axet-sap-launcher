import { describe, expect, it } from "vitest";
import type { AppConfig } from "../app-electron/shared/types";
import { dirtySections, EDITED_FIELDS, matchSettingsSections, SETTINGS_SECTIONS } from "../src/components/settings/settingsSections";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";

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
  it("sekiz bölüm (denetim 2026-10-19: Sohbet görünümü Görünüm'e katıldı)", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      "general", "appearance", "axetCode", "terminal", "advanced", "manual", "updates", "dataPrivacy"
    ]);
  });

  it("taşınan ve eklenen alanlar doğru bölümde", () => {
    const of = (id: string) => SETTINGS_SECTIONS.find((s) => s.id === id)?.fields ?? [];
    expect(of("general")).toEqual(["language", "projectsBaseDir", "sapConnectOpen", "chatNotifications", "agentNotifications", "browserAutoOpen"]); // Tur 7: otomatik tarayıcı; Tur 6: ajan bildirimleri Genel bildirim ayarının yanında
    expect(of("appearance")).toEqual(["palette", "theme", "chatFontSize", "chatDensity"]);
    expect(of("terminal")).toEqual(["axetCommand", "terminal", "agentMemoryDigest", "memoryAutoCapture", "leadTeam", "leadApproval", "leadMaxAgents", "axetAutoSetup", "axetAutoTool", "axetAutoModel", "agentAutoRetry", "agentRetryMax", "agentConcurrency", "leadStallMinutes"]);
    expect(of("advanced")).toEqual(["landscapePathOverride", "sapShcutPathOverride"]);
    expect(of("updates")).toEqual(["autoCheckUpdates", "supportEmail"]);
    expect(EDITED_FIELDS).not.toContain("chatDisplayName");
  });

  it("arama anahtarlarının tr ve en karşılığı var", () => {
    for (const section of SETTINGS_SECTIONS) {
      for (const key of section.searchKeys) {
        expect(key in tr, `tr eksik: ${key}`).toBe(true);
        expect(key in en, `en eksik: ${key}`).toBe(true);
      }
    }
  });

  it("arama: boşsa hepsi; etiketten, açıklamadan ve büyük/küçük harf bağımsız buluyor", () => {
    const t = (k: string) => (tr as Record<string, string>)[k] ?? k;
    expect(matchSettingsSections("", t)).toHaveLength(SETTINGS_SECTIONS.length);
    expect(matchSettingsSections("  ", t)).toHaveLength(SETTINGS_SECTIONS.length);
    expect(matchSettingsSections("BİLDİRİM", t)).toEqual(["general"]);
    expect(matchSettingsSections("kabuk", t)).toContain("terminal");
    expect(matchSettingsSections("satır sıklığı", t)).toEqual(["appearance"]);
    expect(matchSettingsSections("sapshcut", t)).toEqual(["advanced"]);
    expect(matchSettingsSections("zzzz", t)).toEqual([]);
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
