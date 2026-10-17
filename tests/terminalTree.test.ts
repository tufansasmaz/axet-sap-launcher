// Terminal bölme ağacı (spec 2026-10-14 §3). Saf; React'sız.
import { describe, expect, it } from "vitest";
import {
  assertLayout,
  fromLegacy,
  insertPane,
  leafIds,
  normalizeLayout,
  removePane,
  tidy,
  type LayoutNode
} from "../app-electron/shared/terminalTree";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });

describe("fromLegacy — eski kayıt bugünkü ızgaraya benziyor", () => {
  it("0 bölme: ağaç yok; 1 bölme: tek yaprak", () => {
    expect(fromLegacy([])).toBeNull();
    expect(fromLegacy(["p0"])).toEqual(leaf("p0"));
  });

  it("2 bölme yan yana", () => {
    expect(fromLegacy(ids(2))).toEqual({ type: "split", dir: "row", children: [leaf("p0"), leaf("p1")], sizes: [0.5, 0.5] });
  });

  it("3 bölme: sol boydan, sağda iki satır", () => {
    expect(fromLegacy(ids(3))).toEqual({
      type: "split",
      dir: "row",
      children: [leaf("p0"), { type: "split", dir: "column", children: [leaf("p1"), leaf("p2")], sizes: [0.5, 0.5] }],
      sizes: [0.5, 0.5]
    });
  });

  it.each([4, 5, 6, 7, 8, 9])("%i bölme: satır satır, hepsi var, kurallar tutuyor", (n) => {
    const layout = fromLegacy(ids(n));
    assertLayout(layout, ids(n));
    expect(leafIds(layout)).toEqual(ids(n));
    expect(layout?.type === "split" && layout.dir).toBe("column");
  });
});

describe("insertPane", () => {
  it("boş ağaca ekleme tek yaprak", () => {
    expect(insertPane(null, "a", null)).toEqual(leaf("a"));
  });

  it("sağa bölme: hedefin payı ikiye bölünüyor, komşu etkilenmiyor", () => {
    const base = fromLegacy(["a", "b"]);
    const next = insertPane(base, "c", { paneId: "b", side: "right" });
    assertLayout(next, ["a", "b", "c"]);
    expect(next).toEqual({ type: "split", dir: "row", children: [leaf("a"), leaf("b"), leaf("c")], sizes: [0.5, 0.25, 0.25] });
  });

  it("alta bölme yeni bir üst-alt kap kuruyor", () => {
    const next = insertPane(fromLegacy(["a", "b"]), "c", { paneId: "a", side: "bottom" });
    assertLayout(next, ["a", "c", "b"]);
    expect(next).toEqual({
      type: "split",
      dir: "row",
      children: [{ type: "split", dir: "column", children: [leaf("a"), leaf("c")], sizes: [0.5, 0.5] }, leaf("b")],
      sizes: [0.5, 0.5]
    });
  });

  it("sola ve üste ekleme yeni bölmeyi önce koyuyor", () => {
    expect(leafIds(insertPane(leaf("a"), "b", { paneId: "a", side: "left" }))).toEqual(["b", "a"]);
    expect(leafIds(insertPane(leaf("a"), "b", { paneId: "a", side: "top" }))).toEqual(["b", "a"]);
  });

  it("hedef yoksa ya da ağaçta değilse son yaprağın sağına", () => {
    expect(leafIds(insertPane(fromLegacy(["a", "b"]), "c", null))).toEqual(["a", "b", "c"]);
    expect(leafIds(insertPane(fromLegacy(["a", "b"]), "c", { paneId: "yok", side: "left" }))).toEqual(["a", "b", "c"]);
  });
});

describe("removePane", () => {
  it("kardeşler payı orantılı paylaşıyor", () => {
    const three: LayoutNode = { type: "split", dir: "row", children: [leaf("a"), leaf("b"), leaf("c")], sizes: [0.5, 0.25, 0.25] };
    const next = removePane(three, "a");
    assertLayout(next, ["b", "c"]);
    expect(next).toEqual({ type: "split", dir: "row", children: [leaf("b"), leaf("c")], sizes: [0.5, 0.5] });
  });

  it("tek çocuk kalan kap çözülüyor, aynı yönlü kap üstüne düzleşiyor", () => {
    const layout = fromLegacy(ids(3)); // row[p0, column[p1,p2]]
    const next = removePane(layout, "p1");
    expect(next).toEqual({ type: "split", dir: "row", children: [leaf("p0"), leaf("p2")], sizes: [0.5, 0.5] });
  });

  it("son yaprak gidince ağaç yok; olmayan kimlik ağacı değiştirmiyor", () => {
    expect(removePane(leaf("a"), "a")).toBeNull();
    const base = fromLegacy(["a", "b"]);
    expect(removePane(base, "yok")).toEqual(base);
  });
});

describe("tidy", () => {
  it("aynı yönlü iç içe kap düzleşiyor, paylar çarpılıyor", () => {
    const nested: LayoutNode = {
      type: "split",
      dir: "row",
      children: [leaf("a"), { type: "split", dir: "row", children: [leaf("b"), leaf("c")], sizes: [0.5, 0.5] }],
      sizes: [0.5, 0.5]
    };
    expect(tidy(nested)).toEqual({ type: "split", dir: "row", children: [leaf("a"), leaf("b"), leaf("c")], sizes: [0.5, 0.25, 0.25] });
  });
});

describe("normalizeLayout — kayıt elle bozulmuş olabilir", () => {
  it("geçerli ağaç aynen", () => {
    const layout = fromLegacy(ids(4));
    expect(normalizeLayout(layout, ids(4))).toEqual(layout);
  });

  it("ağaç yoksa eski düzen", () => {
    expect(normalizeLayout(undefined, ids(2))).toEqual(fromLegacy(ids(2)));
  });

  it("bilinmeyen ve çift kimlik atılıyor, eksik bölme sona ekleniyor", () => {
    const raw = { type: "split", dir: "row", children: [leaf("a"), leaf("yok"), leaf("a")], sizes: [0.3, 0.3, 0.4] };
    const next = normalizeLayout(raw, ["a", "b"]);
    assertLayout(next, ["a", "b"]);
    expect(leafIds(next)).toEqual(["a", "b"]);
  });

  it("bozuk paylar eşitleniyor; yanlış yön, yanlış tip düşüyor ama bölme kaybolmuyor", () => {
    const raw = { type: "split", dir: "row", children: [leaf("a"), leaf("b")], sizes: [Number.NaN, -1] };
    expect(normalizeLayout(raw, ["a", "b"])).toEqual(fromLegacy(["a", "b"]));
    const weird = { type: "split", dir: "diagonal", children: [leaf("a")], sizes: [1] };
    expect(leafIds(normalizeLayout(weird, ["a", "b"]))).toEqual(["a", "b"]);
    expect(leafIds(normalizeLayout("çöp", ["a"]))).toEqual(["a"]);
  });

  it("derinlik sınırı: kendini tekrar eden derin yapı çökertmiyor", () => {
    let raw: unknown = leaf("a");
    for (let i = 0; i < 50; i++) raw = { type: "split", dir: i % 2 ? "row" : "column", children: [raw, leaf(`x${i}`)], sizes: [0.5, 0.5] };
    const next = normalizeLayout(raw, ["a"]);
    expect(leafIds(next)).toEqual(["a"]);
  });

  it("bölme yoksa ağaç yok", () => {
    expect(normalizeLayout(fromLegacy(["a"]), [])).toBeNull();
  });
});

describe("assertLayout", () => {
  it("bozuk ağaçları yakalıyor", () => {
    expect(() => assertLayout({ type: "split", dir: "row", children: [leaf("a")], sizes: [1] })).toThrow();
    expect(() => assertLayout({ type: "split", dir: "row", children: [leaf("a"), leaf("a")], sizes: [0.5, 0.5] })).toThrow();
    expect(() => assertLayout({ type: "split", dir: "row", children: [leaf("a"), leaf("b")], sizes: [0.7, 0.7] })).toThrow();
    expect(() => assertLayout(fromLegacy(["a", "b"]), ["a"])).toThrow();
  });
});
