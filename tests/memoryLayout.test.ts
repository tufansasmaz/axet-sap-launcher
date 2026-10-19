import { describe, expect, it } from "vitest";
import { boundsOf, forceLayout, hashId, nearestInDirection } from "../app-electron/shared/memoryLayout";
import { buildGraph, type MemoryNote } from "../app-electron/shared/memoryNotes";

function bigGraph(count: number) {
  const notes: MemoryNote[] = Array.from({ length: count }, (_, i) => ({
    id: `n-big${String(i).padStart(5, "0")}`,
    title: `Not ${i}`,
    body: i > 0 ? `[[Not ${Math.floor(i / 3)}]]` : "",
    kind: "not",
    tags: [`t${i % 20}`],
    owner: i % 4 === 0 ? "" : `p${i % 6}`,
    created: i + 1,
    updated: i + 1
  }));
  return buildGraph(notes, Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `Ajan ${i}` })));
}

describe("kuvvet yerlesimi", () => {
  it("kararli: ayni graf ayni konumlar", () => {
    const g = bigGraph(60);
    const a = forceLayout(g);
    const b = forceLayout(g);
    expect([...a.entries()]).toEqual([...b.entries()]);
    expect(hashId("x")).toBe(hashId("x"));
  });

  it("NaN yok; dugumler ust uste binmiyor; bagli dugumler yakin", () => {
    const g = bigGraph(80);
    const pos = forceLayout(g);
    const pts = [...pos.values()];
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    let close = 0;
    for (let i = 0; i < pts.length; i += 1)
      for (let j = i + 1; j < pts.length; j += 1) if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < 4) close += 1;
    expect(close).toBe(0);
    const avgEdge =
      g.edges.reduce((s, e) => {
        const p = pos.get(e.source)!;
        const q = pos.get(e.target)!;
        return s + Math.hypot(p.x - q.x, p.y - q.y);
      }, 0) / g.edges.length;
    const b = boundsOf(pts);
    expect(avgEdge).toBeLessThan(Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2);
  });

  it("600+ dugum makul surede (olcum)", () => {
    const g = bigGraph(600);
    const start = performance.now();
    const pos = forceLayout(g);
    const ms = performance.now() - start;
    expect(pos.size).toBe(g.nodes.length);
    // Yük altında da geçsin diye gevşek sınır; gerçek ölçüm rapora yazıldı.
    expect(ms).toBeLessThan(4_000);
  });

  it("bos graf ve sinirlar", () => {
    expect(forceLayout({ nodes: [], edges: [] }).size).toBe(0);
    expect(boundsOf([])).toEqual({ minX: -100, minY: -100, maxX: 100, maxY: 100 });
  });

  it("yonle en yakin komsu", () => {
    const c = [
      { id: "r", p: { x: 10, y: 1 } },
      { id: "far", p: { x: 50, y: 0 } },
      { id: "u", p: { x: 0, y: -10 } },
      { id: "diag", p: { x: 5, y: 40 } }
    ];
    expect(nearestInDirection({ x: 0, y: 0 }, c, "right")).toBe("r");
    expect(nearestInDirection({ x: 0, y: 0 }, c, "up")).toBe("u");
    expect(nearestInDirection({ x: 0, y: 0 }, c, "down")).toBe("diag");
    expect(nearestInDirection({ x: 0, y: 0 }, c, "left")).toBeNull();
  });
});
