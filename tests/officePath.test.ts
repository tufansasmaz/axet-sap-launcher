// Izgara üzerinde yol bulma (spec 2026-10-18 ajanlar-yeniden, kalite turu):
// 4 yönlü BFS, duvardan kapıdan geçerek; ek engel kümesi (başka kişi).
import { describe, expect, it } from "vitest";
import { findPath, reachable } from "../src/office/officePath";

// 0 boş, 1 duvar; ortada tek kapılı duvar (x=3, y=2 açık).
const MAP = ["0001000", "0001000", "0000000", "0001000", "0001000"].map((r) => [...r].map((c) => c === "1"));

describe("findPath", () => {
  it("kapıdan geçerek en kısa yol; başlangıç hariç, hedef dahil; adımlar komşu", () => {
    const path = findPath(MAP, { x: 0, y: 0 }, { x: 6, y: 0 });
    expect(path).not.toBeNull();
    const p = path as Array<[number, number]>;
    expect(p[p.length - 1]).toEqual([6, 0]);
    expect(p).toContainEqual([3, 2]);
    let prev: [number, number] = [0, 0];
    for (const step of p) {
      expect(Math.abs(step[0] - prev[0]) + Math.abs(step[1] - prev[1])).toBe(1);
      expect(MAP[step[1]][step[0]]).toBe(false);
      prev = step;
    }
    expect(p).toHaveLength(10);
  });

  it("aynı karo: boş yol; ulaşılamaz: null; ek engel kapıyı kapatınca null", () => {
    expect(findPath(MAP, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
    expect(findPath(MAP, { x: 0, y: 0 }, { x: 3, y: 0 })).toBeNull();
    expect(findPath(MAP, { x: 0, y: 0 }, { x: 6, y: 0 }, new Set(["3,2"]))).toBeNull();
  });

  it("reachable: bir taraftan öbürü kapı üzerinden", () => {
    const seen = reachable(MAP, { x: 0, y: 0 });
    expect(seen.has("6,4")).toBe(true);
    expect(seen.has("3,0")).toBe(false);
  });
});
