// Piksel matrisleri ve palet (spec 2026-10-18 ajanlar-yeniden §3): her
// matrisin boyutu bildirdiğiyle aynı, her karakterin paletten bir karşılığı
// var; karakter 16x24, 4 saç x 6 gömlek; renk yalnız palet dosyasında; lime yok.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HAIR, PALETTE, SHIRT, hairIndex } from "../src/office/officePalette";
import { CHARACTER_FRAMES, SPRITES, type Sprite } from "../src/office/officeSprites";

const ROOT = path.resolve(__dirname, "..");
const HEX = /^#[0-9a-f]{6}$/;
const SLOTS = new Set(["hair", "hairShade", "shirt", "shirtShade"]);

function check(name: string, sprite: Sprite) {
  expect(sprite.rows, name).toHaveLength(sprite.h);
  for (const row of sprite.rows) {
    expect(row.length, `${name}: ${row}`).toBe(sprite.w);
    for (const ch of row) {
      if (ch === ".") continue;
      const key = sprite.legend[ch];
      expect(key, `${name}: '${ch}'`).toBeTruthy();
      expect(SLOTS.has(key) || key in PALETTE, `${name}: ${key}`).toBe(true);
    }
  }
}

describe("sprite matrisleri", () => {
  it("bütün matrislerin boyutu ve paleti tutarlı", () => {
    for (const [name, sprite] of Object.entries(SPRITES)) check(name, sprite);
    for (const [name, sprite] of Object.entries(CHARACTER_FRAMES)) check(name, sprite);
  });

  it("karakter 16x24; yazma kareleri birbirinden farklı, oturma ile yaslanma aynı boy", () => {
    for (const sprite of Object.values(CHARACTER_FRAMES)) {
      expect(sprite.w).toBe(16);
      expect(sprite.h).toBe(24);
    }
    expect(CHARACTER_FRAMES.typeA.rows).not.toEqual(CHARACTER_FRAMES.typeB.rows);
    expect(CHARACTER_FRAMES.sit.rows).not.toEqual(CHARACTER_FRAMES.typeA.rows);
  });

  it("karakter saç ve gömlek yuvalarını kullanıyor (sabit renk değil)", () => {
    const keys = new Set(CHARACTER_FRAMES.sit.rows.join("").split("").map((c) => CHARACTER_FRAMES.sit.legend[c]));
    for (const slot of SLOTS) expect(keys, slot).toContain(slot);
  });
});

describe("palet", () => {
  it("4 saç, 6 gömlek (bölme rengi başına); hepsi 6 haneli hex", () => {
    expect(HAIR).toHaveLength(4);
    expect(Object.keys(SHIRT).sort()).toEqual(["amber", "blue", "gray", "green", "red", "violet"]);
    for (const [main, shade] of Object.values(SHIRT)) {
      expect(main).toMatch(HEX);
      expect(shade).toMatch(HEX);
    }
    for (const [a, b] of HAIR) {
      expect(a).toMatch(HEX);
      expect(b).toMatch(HEX);
    }
    for (const value of Object.values(PALETTE)) expect(value).toMatch(HEX);
  });

  it("lime yok: hiçbir renk sarı-yeşil ve doygun değil (lime yalnız seçim/odak)", () => {
    const all = [...Object.values(PALETTE), ...HAIR.flat(), ...Object.values(SHIRT).flat()];
    for (const hex of all) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const limeish = g > 150 && g > r + 20 && r > b + 40;
      expect(limeish, hex).toBe(false);
    }
  });

  it("saç bölme kimliğinden kararlı seçiliyor, 0-3", () => {
    expect(hairIndex("p1")).toBe(hairIndex("p1"));
    const seen = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map(hairIndex));
    for (const i of seen) expect(i >= 0 && i < 4).toBe(true);
    expect(seen.size).toBeGreaterThan(1);
  });

  it("src/office altında renk yalnız palet dosyasında; lime sınıfı ve uydurma hata jetonu yok", () => {
    const dir = path.join(ROOT, "src", "office");
    const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));
    expect(files).toContain("officePalette.ts");
    for (const file of files) {
      const text = readFileSync(path.join(dir, file), "utf8");
      if (file !== "officePalette.ts") {
        expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(text, file).not.toMatch(/\b(rgba?|hsla?)\(/);
      }
      expect(text, file).not.toMatch(/\blime-\d/);
      expect(text, file).not.toMatch(/var\(--status-error/);
    }
  });
});
