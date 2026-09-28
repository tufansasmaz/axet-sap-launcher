// Pencere ve terminal renklerinin tek kaynağı (spec §7).
//
// `parseAppearance` ana sürecin pencere adresine koyduğu `?palette=…&theme=…`
// sorgusunu okuyor. Sorgu elle değiştirilebilir ya da eski bir sürümden
// gelebilir; geçersiz değer hiçbir CSS bloğuyla eşleşmeyeceği için
// varsayılana dönüyor.

import { describe, expect, it } from "vitest";
import { THEME_SURFACES, parseAppearance } from "../app-electron/shared/themeSurfaces";

describe("parseAppearance", () => {
  it("geçerli sorguyu okuyor", () => {
    expect(parseAppearance("?palette=warm&theme=light")).toEqual({ palette: "warm", theme: "light" });
  });

  it("sorgu yoksa Sakin İndigo koyu", () => {
    expect(parseAppearance("")).toEqual({ palette: "indigo", theme: "dark" });
  });

  it("geçersiz değerler ayrı ayrı varsayılana dönüyor", () => {
    expect(parseAppearance("?palette=lime&theme=blue")).toEqual({ palette: "indigo", theme: "dark" });
    expect(parseAppearance("?theme=light")).toEqual({ palette: "indigo", theme: "light" });
    expect(parseAppearance("?palette=warm&theme=")).toEqual({ palette: "warm", theme: "dark" });
  });
});

describe("THEME_SURFACES", () => {
  it("renkler #rrggbb biçiminde", () => {
    for (const palette of ["indigo", "warm"] as const) {
      for (const theme of ["dark", "light"] as const) {
        const s = THEME_SURFACES[palette][theme];
        for (const value of [s.app, s.card, s.accent, s.terminal.background, s.terminal.foreground, s.terminal.cursor]) {
          expect(value).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it("terminal açık temada da o paletin koyu renklerinde kalıyor", () => {
    for (const palette of ["indigo", "warm"] as const) {
      expect(THEME_SURFACES[palette].light.terminal).toEqual(THEME_SURFACES[palette].dark.terminal);
    }
  });
});
