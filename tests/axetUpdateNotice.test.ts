import { describe, expect, it } from "vitest";
import { axetUpdateNotice } from "../src/lib/axetUpdateNotice";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";

// Anahtar + parametreleri görünür kılan sahte çevirmen.
const t = (key: string, p?: Record<string, string | number>) => `${key}${p ? JSON.stringify(p) : ""}`;

describe("axetUpdateNotice", () => {
  it("1.4.1 satırı (bayrak yok): eski Intune metni", () => {
    expect(axetUpdateNotice({ installed: "1.4.1", latest: "1.4.2" }, t)).toBe(
      'axetCodeHome.axetCodeUpdateVersions{"installed":"1.4.1","latest":"1.4.2"}'
    );
    expect(axetUpdateNotice({ installed: "", latest: "1.4.2" }, t)).toBe('axetCodeHome.axetCodeUpdate{"latest":"1.4.2"}');
  });

  it("can_auto_install: axet-code kendini kuruyor, Intune'a yönlendirilmiyor", () => {
    expect(axetUpdateNotice({ installed: "1.5.1", latest: "1.5.2", autoInstall: true }, t)).toBe(
      'axetCodeHome.axetCodeUpdateAuto{"installed":"1.5.1","latest":"1.5.2"}'
    );
  });

  it("required: zorunlu öneki", () => {
    expect(axetUpdateNotice({ installed: "1.4.0", latest: "1.5.1", required: true }, t)).toBe(
      'axetCodeHome.axetCodeUpdateRequiredaxetCodeHome.axetCodeUpdateVersions{"installed":"1.4.0","latest":"1.5.1"}'
    );
  });

  it("yeni anahtarlar tr ve en'de var, yer tutucular aynı", () => {
    for (const key of ["axetCodeHome.axetCodeUpdateAuto", "axetCodeHome.axetCodeUpdateRequired"] as const) {
      expect(tr[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
      expect(ph(tr[key])).toBe(ph(en[key]));
    }
  });
});
