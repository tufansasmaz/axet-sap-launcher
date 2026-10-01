// Pencere ve terminal renklerinin tek kaynağı (grafit kimlik, spec §3.4).
//
// `parseAppearance` ana sürecin pencere adresine koyduğu `?palette=…&theme=…`
// sorgusunu okuyor. Sorgu elle değiştirilebilir ya da eski bir sürümden
// gelebilir; geçersiz değer hiçbir CSS bloğuyla eşleşmeyeceği için
// varsayılana dönüyor. `warm` tasarim/temel dalının Sıcak Nötr'ü: o dalda
// kaydedilmiş bir ayar Amber'e geçiyor.

import { describe, expect, it } from "vitest";
import {
  PALETTES,
  THEME_SURFACES,
  normalizePalette,
  parseAppearance,
  windowBackgroundChange
} from "../app-electron/shared/themeSurfaces";

describe("normalizePalette", () => {
  it("dört vurgu olduğu gibi", () => {
    expect(normalizePalette("ntt")).toBe("ntt");
    expect(normalizePalette("indigo")).toBe("indigo");
    expect(normalizePalette("amber")).toBe("amber");
    expect(normalizePalette("graphite")).toBe("graphite");
  });

  it("eski warm → amber", () => {
    expect(normalizePalette("warm")).toBe("amber");
  });

  it("yok, geçersiz ya da yanlış tip → ntt", () => {
    for (const value of [undefined, null, "", "lime", "NTT", 3, {}]) expect(normalizePalette(value)).toBe("ntt");
  });
});

describe("parseAppearance", () => {
  it("geçerli sorguyu okuyor", () => {
    expect(parseAppearance("?palette=amber&theme=light")).toEqual({ palette: "amber", theme: "light" });
  });

  it("sorgu yoksa NTT mavisi koyu", () => {
    expect(parseAppearance("")).toEqual({ palette: "ntt", theme: "dark" });
  });

  it("geçersiz değerler ayrı ayrı varsayılana dönüyor, warm amber oluyor", () => {
    expect(parseAppearance("?palette=lime&theme=blue")).toEqual({ palette: "ntt", theme: "dark" });
    expect(parseAppearance("?theme=light")).toEqual({ palette: "ntt", theme: "light" });
    expect(parseAppearance("?palette=warm&theme=")).toEqual({ palette: "amber", theme: "dark" });
    expect(parseAppearance("?palette=indigo&theme=light")).toEqual({ palette: "indigo", theme: "light" });
  });
});

describe("THEME_SURFACES", () => {
  it("dört vurgu, sıra ntt · indigo · amber · graphite", () => {
    expect(PALETTES).toEqual(["ntt", "indigo", "amber", "graphite"]);
    expect(Object.keys(THEME_SURFACES).sort()).toEqual(["amber", "graphite", "indigo", "ntt"]);
  });

  it("renkler #rrggbb biçiminde", () => {
    for (const palette of PALETTES) {
      for (const theme of ["dark", "light"] as const) {
        const s = THEME_SURFACES[palette][theme];
        for (const value of [s.app, s.card, s.accent, s.terminal.background, s.terminal.foreground, s.terminal.cursor]) {
          expect(value).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it("zemin ve kart bir temada üç vurgu için aynı", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const palette of PALETTES) {
        expect(THEME_SURFACES[palette][theme].app).toBe(THEME_SURFACES.ntt[theme].app);
        expect(THEME_SURFACES[palette][theme].card).toBe(THEME_SURFACES.ntt[theme].card);
      }
    }
  });

  it("terminal açık temada da o vurgunun koyu renklerinde kalıyor", () => {
    for (const palette of PALETTES) {
      expect(THEME_SURFACES[palette].light.terminal).toEqual(THEME_SURFACES[palette].dark.terminal);
    }
  });
});

// Ana süreç pencerenin arka plan rengini `config:save`'de bu yardımcıyla
// güncelliyor: yeniden boyutlanma ve yeniden yükleme anlarında ESKİ
// görünümün rengi belirmesin.
describe("windowBackgroundChange", () => {
  it("vurgu ya da tema değiştiyse yeni görünümün app rengi", () => {
    expect(
      windowBackgroundChange({ palette: "ntt", theme: "dark" }, { palette: "amber", theme: "dark" })
    ).toBe(THEME_SURFACES.amber.dark.app);
    expect(
      windowBackgroundChange({ palette: "ntt", theme: "dark" }, { palette: "ntt", theme: "light" })
    ).toBe(THEME_SURFACES.ntt.light.app);
  });

  it("görünüm aynıysa null — gereksiz yeniden boyama yok", () => {
    expect(windowBackgroundChange({ palette: "amber", theme: "light" }, { palette: "amber", theme: "light" })).toBeNull();
  });

  it("tanınmayan vurgu kaydı çökertmiyor, varsayılanın rengine düşüyor", () => {
    // Ekran tarafı canlı yenilenip ana süreç eski derlemede kaldığında yeni
    // bir vurgu adı buraya tanınmadan geliyor; `config:save` atmamalı.
    const unknown = { palette: "yeni" as never, theme: "dark" as const };
    expect(windowBackgroundChange({ palette: "ntt", theme: "light" }, unknown)).toBe(THEME_SURFACES.ntt.dark.app);
  });
});
