// Piksel ofisin kat planı (spec 2026-10-18 ajanlar-yeniden §3): ajan sayısı +
// alan boyutu -> karo haritası, masa konumları, tam sayı ölçek. Saf; canvas yok.
import { describe, expect, it } from "vitest";
import {
  CELL_H,
  CELL_W,
  MAX_DESKS,
  ROOM_CAP,
  TILE,
  fitScale,
  officePlan,
  type OfficePlan
} from "../src/office/officeFloor";

const WIDE = { w: 1600, h: 420 };
const TALL = { w: 520, h: 1200 };

function tileAt(plan: OfficePlan, x: number, y: number) {
  return plan.tiles[y]?.[x];
}

function checkShape(plan: OfficePlan) {
  expect(plan.tiles).toHaveLength(plan.rows);
  for (const row of plan.tiles) expect(row).toHaveLength(plan.cols);
  // Masa hücreleri sınır içinde, üst üste binmiyor, zeminde (duvar/kapı/halı değil).
  const seen = new Set<string>();
  for (const d of plan.desks) {
    expect(d.x).toBeGreaterThanOrEqual(0);
    expect(d.y).toBeGreaterThanOrEqual(0);
    expect(d.x + CELL_W).toBeLessThanOrEqual(plan.cols);
    expect(d.y + CELL_H).toBeLessThanOrEqual(plan.rows);
    for (let y = d.y; y < d.y + CELL_H; y++)
      for (let x = d.x; x < d.x + CELL_W; x++) {
        const key = `${x},${y}`;
        expect(seen.has(key), key).toBe(false);
        seen.add(key);
        expect(tileAt(plan, x, y), key).toBe("floor");
      }
  }
}

describe("officePlan", () => {
  it("satır başına 4-6 masa; 1-4 ajan tek sıra, masa sayısı ajan sayısı", () => {
    for (let n = 1; n <= 4; n++) {
      const plan = officePlan(n, WIDE.w, WIDE.h);
      expect(plan.desks).toHaveLength(n);
      expect(plan.perRow).toBe(4);
      expect(new Set(plan.desks.map((d) => d.y)).size).toBe(1);
      checkShape(plan);
    }
  });

  it("geniş alanda sıra uzar, dar ve uzun alanda sıra 4'te kalır", () => {
    const wide = officePlan(9, WIDE.w, WIDE.h);
    const tall = officePlan(9, TALL.w, TALL.h);
    expect(wide.perRow).toBeGreaterThanOrEqual(5);
    expect(wide.perRow).toBeLessThanOrEqual(6);
    expect(tall.perRow).toBe(4);
    expect(new Set(tall.desks.map((d) => d.y)).size).toBe(3);
    checkShape(wide);
    checkShape(tall);
  });

  it("masalar sıra sırası: soldan sağa, sonra aşağı (Tab sırası bununla aynı)", () => {
    const plan = officePlan(6, TALL.w, TALL.h);
    const order = plan.desks.map((d) => [d.y, d.x]);
    const sorted = [...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(order).toEqual(sorted);
  });

  it("üst duvar, pencere/pano/saat, kapı, halı, bitki ve kahve köşesi var", () => {
    const plan = officePlan(3, WIDE.w, WIDE.h);
    expect(plan.tiles[0].every((t) => t === "wall" || t === "door")).toBe(true);
    expect(plan.tiles.flat()).toContain("rug");
    expect(tileAt(plan, plan.door.x, plan.door.y)).toBe("door");
    const kinds = plan.props.map((p) => p.kind);
    for (const k of ["window", "board", "clock", "plant", "meeting", "coffee"] as const) expect(kinds, k).toContain(k);
    for (const p of plan.props) {
      expect(p.x + p.w).toBeLessThanOrEqual(plan.cols);
      expect(p.y + p.h).toBeLessThanOrEqual(plan.rows);
    }
  });

  it("12'yi aşınca altta ikinci oda: ilk oda 12 masa, araya kapılı duvar", () => {
    expect(ROOM_CAP).toBe(12);
    const plan = officePlan(15, WIDE.w, WIDE.h);
    checkShape(plan);
    expect(plan.desks.filter((d) => d.room === 0)).toHaveLength(12);
    expect(plan.desks.filter((d) => d.room === 1)).toHaveLength(3);
    const firstBottom = Math.max(...plan.desks.filter((d) => d.room === 0).map((d) => d.y + CELL_H));
    const secondTop = Math.min(...plan.desks.filter((d) => d.room === 1).map((d) => d.y));
    const band = plan.tiles.slice(firstBottom, secondTop).filter((row) => row.some((t) => t === "wall"));
    expect(band.length).toBeGreaterThan(0);
    expect(band.some((row) => row.includes("door"))).toBe(true);
  });

  it("sınır: negatif/NaN 0 masa, kesir aşağı, üst sınır MAX_DESKS", () => {
    expect(officePlan(-2, 800, 600).desks).toHaveLength(0);
    expect(officePlan(Number.NaN, 800, 600).desks).toHaveLength(0);
    expect(officePlan(2.9, 800, 600).desks).toHaveLength(2);
    expect(officePlan(99, 800, 600).desks).toHaveLength(MAX_DESKS);
  });
});

describe("fitScale", () => {
  it("alana sığan en büyük tam sayı, 2-4 arası; ölçü yoksa 2", () => {
    const w = 25 * TILE;
    const h = 12 * TILE;
    expect(fitScale(w, h, w * 4 + 10, h * 4 + 10)).toBe(4);
    expect(fitScale(w, h, w * 3 + 10, h * 10)).toBe(3);
    expect(fitScale(w, h, w * 9, h * 2.5)).toBe(2);
    expect(fitScale(w, h, 100, 100)).toBe(2);
    expect(fitScale(w, h, 0, 0)).toBe(2);
    expect(fitScale(w, h, w * 20, h * 20)).toBe(4);
  });

  it("plan ölçeği alanla birlikte büyüyor", () => {
    expect(officePlan(3, 600, 300).scale).toBe(2);
    expect(officePlan(3, 4000, 4000).scale).toBe(4);
  });
});
