// Bölme ağacında yer değiştirme, taşıma, boyutlandırma (spec 2026-10-14 §3.3–3.4, §4 küçült).
import { describe, expect, it } from "vitest";
import {
  assertLayout,
  dragSizes,
  equalizeSplit,
  fromLegacy,
  homeOf,
  leafIds,
  movePane,
  nodeAt,
  resizeSplit,
  restoreInto,
  removePane,
  swapPanes,
  type LayoutNode
} from "../app-electron/shared/terminalTree";

const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const four = () => fromLegacy(["a", "b", "c", "d"]); // column[row[a,b], row[c,d]]

describe("swapPanes / movePane", () => {
  it("orta: yer değiştiriyor, yapı aynı", () => {
    const next = movePane(four(), "a", "d", "center");
    expect(leafIds(next)).toEqual(["d", "b", "c", "a"]);
    assertLayout(next, ["a", "b", "c", "d"]);
    expect(swapPanes(four(), "a", "d")).toEqual(next);
  });

  it("kenar: kaynaktan çıkıp hedefin o tarafına giriyor", () => {
    const next = movePane(four(), "a", "d", "right");
    assertLayout(next, ["a", "b", "c", "d"]);
    // a üst satırdan çıktı: üst satır yalnız b; alt satır c, d, a
    expect(next).toEqual({
      type: "split",
      dir: "column",
      children: [leaf("b"), { type: "split", dir: "row", children: [leaf("c"), leaf("d"), leaf("a")], sizes: [0.5, 0.25, 0.25] }],
      sizes: [0.5, 0.5]
    });
  });

  it("kendi üstüne, bilinmeyen kimlik: değişmiyor", () => {
    const base = four();
    expect(movePane(base, "a", "a", "left")).toBe(base);
    expect(movePane(base, "a", "yok", "left")).toBe(base);
    expect(movePane(base, "yok", "a", "center")).toBe(base);
  });

  it("iki bölmede kenara taşıma yön değiştiriyor", () => {
    const next = movePane(fromLegacy(["a", "b"]), "a", "b", "bottom");
    expect(next).toEqual({ type: "split", dir: "column", children: [leaf("b"), leaf("a")], sizes: [0.5, 0.5] });
  });
});

describe("dragSizes / resizeSplit / equalizeSplit", () => {
  it("yalnız iki komşu değişiyor, toplam korunuyor, alt sınır tutuyor", () => {
    const moved = dragSizes([0.25, 0.25, 0.5], 0, 0.1, 0.05);
    expect(moved[0]).toBeCloseTo(0.35);
    expect(moved[1]).toBeCloseTo(0.15);
    expect(moved[2]).toBe(0.5);
    const clamped = dragSizes([0.25, 0.25, 0.5], 0, 0.5, 0.05);
    expect(clamped[0]).toBeCloseTo(0.45);
    expect(clamped[1]).toBeCloseTo(0.05);
    expect(clamped[2]).toBe(0.5);
    expect(dragSizes([0.5, 0.5], 1, 0.1, 0.05)).toEqual([0.5, 0.5]); // son ayırıcı yok
    expect(dragSizes([0.5, 0.5], 0, Number.NaN, 0.05)).toEqual([0.5, 0.5]);
  });

  it("resizeSplit yola göre iç kabı değiştiriyor", () => {
    const next = resizeSplit(four(), [1], 0, 0.2, 0.05);
    const inner = nodeAt(next, [1]);
    expect(inner?.type === "split" && inner.sizes[0]).toBeCloseTo(0.7);
    expect(nodeAt(next, [0])).toEqual(nodeAt(four(), [0])); // üst satır etkilenmedi
    assertLayout(next, ["a", "b", "c", "d"]);
  });

  it("geçersiz yol ya da yaprak: değişmiyor", () => {
    const base = four();
    expect(resizeSplit(base, [5], 0, 0.1, 0.05)).toBe(base);
    expect(resizeSplit(base, [0, 0], 0, 0.1, 0.05)).toBe(base);
  });

  it("equalizeSplit kabın çocuklarını eşitliyor", () => {
    const skewed = resizeSplit(four(), [], 0, 0.3, 0.05);
    const next = equalizeSplit(skewed, []);
    expect(next?.type === "split" && next.sizes).toEqual([0.5, 0.5]);
  });
});

describe("homeOf / restoreInto — küçült ve geri getir", () => {
  it("sonraki kardeşin solu / üstü; yoksa önceki kardeşin sağı / altı", () => {
    expect(homeOf(fromLegacy(["a", "b"]), "a")).toEqual({ siblingPaneId: "b", side: "left" });
    expect(homeOf(fromLegacy(["a", "b"]), "b")).toEqual({ siblingPaneId: "a", side: "right" });
    expect(homeOf(four(), "c")).toEqual({ siblingPaneId: "d", side: "left" });
    expect(homeOf(leaf("a"), "a")).toBeNull();
  });

  it("çocuğu kap olan kardeşte ilk / son yaprak", () => {
    // row[a, column[b, c]]: a'nın komşusu kabın ilk yaprağı b
    expect(homeOf(fromLegacy(["a", "b", "c"]), "a")).toEqual({ siblingPaneId: "b", side: "left" });
  });

  it("küçültüp geri getirmek yaprak sırasını koruyor", () => {
    const base = fromLegacy(["a", "b"]);
    const home = homeOf(base, "a");
    const without = removePane(base, "a");
    expect(leafIds(restoreInto(without, "a", home, null))).toEqual(["a", "b"]);
  });

  it("kardeş artık yoksa yedek bölmenin sağına; ağaç boşsa tek yaprak", () => {
    expect(leafIds(restoreInto(leaf("x"), "a", { siblingPaneId: "gitti", side: "left" }, "x"))).toEqual(["x", "a"]);
    expect(restoreInto(null, "a", null, null)).toEqual(leaf("a"));
  });
});
