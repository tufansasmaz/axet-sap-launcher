// Ofis çizim paketi atlası (LimeZu Modern Interiors, ücretsiz sürüm). Paket
// lisans gereği depoda DEĞİL (src/assets/office-art gitignore'da). Atlasın
// koordinatları bildirilen sayfa boyutları içinde olmalı; paket diskteyse
// sayfa boyutları gerçek PNG'lerle karşılaştırılıyor, yoksa o test atlanıyor.
// Paket yokken yükleyici null döner ve ofis elle çizilmiş yedeğe düşer.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ART_ATLAS,
  ART_FILES,
  CHARACTERS,
  PIXEL_LIFE_FILE,
  RUBBER,
  RUBBER_FILES,
  RUBBER_SIZE,
  SHEET_SIZE,
  artManifest,
  charFrame,
  shirtRecolor,
  type SheetId
} from "../src/office/officeAtlas";

const ROOT = path.resolve(__dirname, "..");
const ART_DIR = path.join(ROOT, "src", "assets", "office-art");
const HAVE_ART = existsSync(path.join(ART_DIR, ART_FILES.room));

function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe("atlas", () => {
  it("her parça kendi sayfasının içinde ve boş değil", () => {
    for (const [name, r] of Object.entries(ART_ATLAS)) {
      const [w, h] = SHEET_SIZE[r.sheet];
      expect(r.w, name).toBeGreaterThan(0);
      expect(r.h, name).toBeGreaterThan(0);
      expect(r.x, name).toBeGreaterThanOrEqual(0);
      expect(r.y, name).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, name).toBeLessThanOrEqual(w);
      expect(r.y + r.h, name).toBeLessThanOrEqual(h);
    }
  });

  it("karakter kareleri: 4 karakter; yürüme ve bekleme 4 yön x 6 kare, telefon 9 kare, hepsi sayfada", () => {
    expect(CHARACTERS).toHaveLength(4);
    for (const dir of ["down", "up", "left", "right"] as const) {
      for (let f = 0; f < 6; f++) {
        for (const kind of ["run", "idle"] as const) {
          const r = charFrame(kind, dir, f);
          const [w, h] = SHEET_SIZE[r.sheet];
          expect(r.x + r.w).toBeLessThanOrEqual(w);
          expect(r.y + r.h).toBeLessThanOrEqual(h);
        }
      }
    }
    expect(charFrame("run", "right", 0).x).toBe(0);
    expect(charFrame("run", "down", 0).x).toBe(18 * 16);
    expect(charFrame("run", "down", 7).x).toBe(charFrame("run", "down", 1).x);
    expect(charFrame("phone", "down", 8).x).toBe(8 * 16);
  });

  it("gömlek yeniden boyama: gri bölmede yok, renkli bölmede her karakterin gömlek tonları hedef renge", () => {
    for (const c of CHARACTERS) {
      expect(shirtRecolor(c, "gray")).toEqual({});
      const map = shirtRecolor(c, "blue");
      expect(Object.keys(map).length).toBeGreaterThan(0);
      for (const v of Object.values(map)) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("artManifest", () => {
  it("paket yoksa null: yedek çizime düşülür", () => {
    expect(artManifest({})).toBeNull();
    const partial = { [`/x/office-art/${ART_FILES.room}`]: "u1" };
    expect(artManifest(partial)).toBeNull();
  });

  it("Rubber Studio parçaları isteğe bağlı: yoksa rubber null, LimeZu yine yükleniyor; varsa her parçanın adresi", () => {
    const urls: Record<string, string> = {};
    const all = [ART_FILES.room, ART_FILES.interiors, ...CHARACTERS.flatMap((c) => Object.values(ART_FILES.character(c)))];
    all.forEach((f, i) => (urls[`../assets/office-art/${f}`] = `u${i}`));
    expect(artManifest(urls)?.rubber).toBeNull();
    Object.values(RUBBER_FILES).forEach((f, i) => (urls[`../assets/office-art/${f}`] = `r${i}`));
    const m = artManifest(urls);
    expect(m?.rubber?.chairUp).toBeTruthy();
    expect(Object.keys(m?.rubber ?? {}).sort()).toEqual([...RUBBER].sort());
    expect(m?.pixelLife).toBeNull();
    urls[`../assets/office-art/${PIXEL_LIFE_FILE}`] = "pl";
    expect(artManifest(urls)?.pixelLife).toBe("pl");
  });

  it("bütün dosyalar varsa her sayfanın adresi", () => {
    const urls: Record<string, string> = {};
    const all = [ART_FILES.room, ART_FILES.interiors, ...CHARACTERS.flatMap((c) => Object.values(ART_FILES.character(c)))];
    all.forEach((f, i) => (urls[`../assets/office-art/${f}`] = `u${i}`));
    const m = artManifest(urls);
    expect(m).not.toBeNull();
    expect(m?.room).toBe("u0");
    expect(m?.characters.Bob.run).toBeTruthy();
  });
});

describe.skipIf(!HAVE_ART)("paket diskte (yoksa atlanır: src/assets/office-art lisans gereği depoda değil)", () => {
  it("sayfa boyutları gerçek PNG'lerle aynı", () => {
    const check = (sheet: SheetId, file: string) => expect(pngSize(path.join(ART_DIR, file)), file).toEqual(SHEET_SIZE[sheet]);
    check("room", ART_FILES.room);
    check("interiors", ART_FILES.interiors);
    for (const c of CHARACTERS) {
      const f = ART_FILES.character(c);
      check("idle", f.idle);
      check("run", f.run);
      check("phone", f.phone);
    }
  });

  it.skipIf(!existsSync(path.join(ART_DIR, PIXEL_LIFE_FILE)))("Pixel Life sayfasının boyutu (yoksa atlanır)", () => {
    expect(pngSize(path.join(ART_DIR, PIXEL_LIFE_FILE))).toEqual(SHEET_SIZE.pixelLife);
  });

  it.skipIf(!existsSync(path.join(ART_DIR, RUBBER_FILES.chairUp)))("Rubber Studio parçalarının boyutları (yoksa atlanır)", () => {
    for (const name of RUBBER) expect(pngSize(path.join(ART_DIR, RUBBER_FILES[name])), name).toEqual(RUBBER_SIZE[name]);
  });
});
