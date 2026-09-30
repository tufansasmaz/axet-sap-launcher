// Logon ekranı bağlantısı — kaynak düzeyinde kilit. Üst şeridin düğmeleri
// kenar çubuğunun ＋ menüsüne, sarı uyarı bandı sağ taraftaki boş duruma
// taşındı (Logon sağ taraf spec'i). Şerit geri gelirse aynı üç eylem ekranda
// iki yerde durur.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
// Yorumlar eski durumu anlatabilir; kontroller yalnız koda bakıyor.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const app = code(read("src", "App.tsx"));
const tr = read("src", "i18n", "tr.ts");
const en = read("src", "i18n", "en.ts");

describe("App — Logon ekranı bağlantısı", () => {
  it("üst şerit ve sarı bant yok", () => {
    expect(app).not.toContain('title={t("app.addSystemTitle")}');
    expect(app).not.toContain('title={t("app.refetchTitle")}');
    expect(app).not.toContain("var(--status-warning-bg)");
  });

  it("kenar çubuğu ＋ menüsünün üç eylemi bağlı", () => {
    expect(app).toContain("onAddSystem={() => setAddSystemOpen(true)}");
    expect(app).toContain('onRefreshFromSapLogon={() => refreshWithToast("app.refreshedFromSapLogon")}');
    expect(app).toContain('onReloadList={() => refreshWithToast("app.listReloaded")}');
  });

  it("SystemPanel boş liste, uyarı ve Sistem Ekle alıyor", () => {
    expect(app).toContain("listEmpty={!!noLandscapeFile}");
    expect(app).toMatch(/emptyHint=\{\s*noLandscapeFile\s*\?\s*t\("app\.noLandscapeFile"/);
    // `onAddSystem` iki yerde: kenar çubuğu ve SystemPanel.
    expect(app.split("onAddSystem={() => setAddSystemOpen(true)}").length - 1).toBe(2);
  });

  it("kullanılmayan başlık anahtarları silindi", () => {
    for (const file of [tr, en]) {
      expect(file).not.toContain('"app.addSystemTitle"');
      expect(file).not.toContain('"app.refetchTitle"');
    }
  });
});
