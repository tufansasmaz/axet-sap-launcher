// Piksel matrisleri ve palet (spec 2026-10-18 ajanlar-yeniden §3 + kalite
// turu): karakter 16x24, 4 yön, yürüme 4 kare, oturma (arkadan/önden), yazma
// 3 kare, el kaldırma, gerinme; 4 saç modeli x 5 saç rengi x 4 ten x 2
// pantolon, gömlek = bölme rengi; görünüm bölme kimliğinden kararlı.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HAIR, PALETTE, PANTS, SHIRT, SKIN, appearanceOf } from "../src/office/officePalette";
import { CHARACTER_SETS, CHARACTER_POSES, HAIR_STYLES, SPRITES, characterSprite, type Sprite } from "../src/office/officeSprites";

const ROOT = path.resolve(__dirname, "..");
const HEX = /^#[0-9a-f]{6}$/;
const SLOTS = new Set(["hair", "hairShade", "shirt", "shirtShade", "skin", "skinShade", "pants", "pantsShade"]);

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

describe("karakter kareleri", () => {
  it("her saç modelinde her kare 16x24 ve paleti tutarlı", () => {
    expect(HAIR_STYLES).toBe(4);
    expect(CHARACTER_SETS).toHaveLength(4);
    for (const set of CHARACTER_SETS) {
      for (const [name, sprite] of Object.entries(set)) {
        expect(sprite.w, name).toBe(16);
        expect(sprite.h, name).toBe(24);
        check(name, sprite);
      }
    }
  });

  it("4 yön x yürüme 4 kare; masada arkadan oturma, yazma 3 kare, el kaldırma, gerinme; önden oturma", () => {
    const set = CHARACTER_SETS[0];
    for (const dir of ["down", "up", "left", "right"]) for (const k of [0, 1, 2, 3]) expect(set[`${dir}/walk${k}`], `${dir}/walk${k}`).toBeTruthy();
    for (const pose of ["sit", "type0", "type1", "type2", "raise", "stretch"]) expect(set[`up/${pose}`], pose).toBeTruthy();
    expect(set["down/sit"]).toBeTruthy();
    expect(CHARACTER_POSES).toContain("raise");
  });

  it("kareler birbirinden farklı: yürüme adımları, yazma kareleri, yönler", () => {
    const set = CHARACTER_SETS[0];
    const rows = (k: string) => set[k].rows.join("\n");
    expect(rows("down/walk1")).not.toBe(rows("down/walk0"));
    expect(rows("down/walk3")).not.toBe(rows("down/walk1"));
    expect(rows("right/walk1")).not.toBe(rows("right/walk3"));
    expect(new Set(["up/type0", "up/type1", "up/type2"].map(rows)).size).toBe(3);
    expect(rows("up/raise")).not.toBe(rows("up/sit"));
    expect(rows("up/stretch")).not.toBe(rows("up/raise"));
    expect(rows("down/walk0")).not.toBe(rows("up/walk0"));
  });

  it("sola bakış sağa bakışın aynası", () => {
    for (const set of CHARACTER_SETS) {
      for (const k of [0, 1, 2, 3]) {
        expect(set[`left/walk${k}`].rows).toEqual(set[`right/walk${k}`].rows.map((r) => [...r].reverse().join("")));
      }
    }
  });

  it("saç modelleri farklı; önden yüzde göz var, arkadan yok", () => {
    const fronts = new Set(CHARACTER_SETS.map((s) => s["down/walk0"].rows.join("\n")));
    expect(fronts.size).toBe(4);
    const eyes = (sp: Sprite) => sp.rows.join("").split("").filter((c) => sp.legend[c] === "eye").length;
    expect(eyes(CHARACTER_SETS[0]["down/walk0"])).toBe(2);
    expect(eyes(CHARACTER_SETS[0]["up/walk0"])).toBe(0);
  });

  it("characterSprite: bilinmeyen kare yürüme 0'a düşüyor", () => {
    expect(characterSprite(0, "down", "raise")).toBe(CHARACTER_SETS[0]["down/walk0"]);
    expect(characterSprite(2, "up", "type1")).toBe(CHARACTER_SETS[2]["up/type1"]);
  });
});

describe("eşya matrisleri", () => {
  it("boyut ve palet tutarlı", () => {
    for (const [name, sprite] of Object.entries(SPRITES)) check(name, sprite);
  });
});

describe("palet ve görünüm", () => {
  it("5 saç rengi, 4 ten, 2 pantolon, 6 gömlek; hepsi 6 haneli hex çifti", () => {
    expect(HAIR).toHaveLength(5);
    expect(SKIN).toHaveLength(4);
    expect(PANTS).toHaveLength(2);
    expect(Object.keys(SHIRT).sort()).toEqual(["amber", "blue", "gray", "green", "red", "violet"]);
    for (const pair of [...HAIR, ...SKIN, ...PANTS, ...Object.values(SHIRT)]) {
      expect(pair[0]).toMatch(HEX);
      expect(pair[1]).toMatch(HEX);
    }
    for (const value of Object.values(PALETTE)) expect(value).toMatch(HEX);
  });

  it("görünüm bölme kimliğinden kararlı, aralıkta ve çeşitli", () => {
    expect(appearanceOf("p1")).toEqual(appearanceOf("p1"));
    const all = Array.from({ length: 40 }, (_, i) => appearanceOf(`pane-${i}`));
    for (const a of all) {
      expect(a.style >= 0 && a.style < 4).toBe(true);
      expect(a.hair >= 0 && a.hair < 5).toBe(true);
      expect(a.skin >= 0 && a.skin < 4).toBe(true);
      expect(a.pants >= 0 && a.pants < 2).toBe(true);
    }
    expect(new Set(all.map((a) => a.style)).size).toBe(4);
    expect(new Set(all.map((a) => a.hair)).size).toBe(5);
    expect(new Set(all.map((a) => a.skin)).size).toBe(4);
    expect(new Set(all.map((a) => a.pants)).size).toBe(2);
  });

  it("lime yok: hiçbir renk sarı-yeşil ve doygun değil (lime yalnız seçim/odak)", () => {
    const all = [...Object.values(PALETTE), ...[...HAIR, ...SKIN, ...PANTS, ...Object.values(SHIRT)].flat()];
    for (const hex of all) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      expect(g > 150 && g > r + 20 && r > b + 40, hex).toBe(false);
    }
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
