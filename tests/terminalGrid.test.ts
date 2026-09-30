// Terminal ızgarasının hesabı (spec §3.3) ve bölme başlığındaki yol kısaltma.

import { describe, expect, it } from "vitest";
import { dragRatios, equalRatios, gridLayout } from "../src/terminal/gridLayout";
import { middleEllipsis } from "../src/lib/paths";

describe("gridLayout", () => {
  it("bölme sayısına göre sütun ve satır", () => {
    const table: Array<[number, number, number]> = [
      [1, 1, 1],
      [2, 2, 1],
      [3, 2, 2],
      [4, 2, 2],
      [5, 3, 2],
      [6, 3, 2],
      [7, 3, 3],
      [8, 3, 3],
      [9, 3, 3]
    ];
    for (const [count, cols, rows] of table) {
      const layout = gridLayout(count);
      expect([count, layout.cols, layout.rows]).toEqual([count, cols, rows]);
      expect(layout.cells).toHaveLength(count);
    }
  });

  it("3 bölmede ilki sol sütunu boydan kaplıyor, satır ayırıcı 2. sütundan başlıyor", () => {
    expect(gridLayout(3)).toEqual({
      cols: 2,
      rows: 2,
      cells: [
        { col: 0, row: 0, rowSpan: 2 },
        { col: 1, row: 0, rowSpan: 1 },
        { col: 1, row: 1, rowSpan: 1 }
      ],
      rowDividerStartCol: 1
    });
  });

  it("hücreler satır satır diziliyor", () => {
    expect(gridLayout(5).cells.map((c) => [c.col, c.row])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ]);
    expect(gridLayout(5).rowDividerStartCol).toBe(0);
  });

  it("0, negatif, sayı olmayan ve 9'dan büyük değerlere karşı korunuyor", () => {
    expect(gridLayout(0)).toEqual({ cols: 1, rows: 1, cells: [], rowDividerStartCol: 0 });
    expect(gridLayout(-3).cells).toEqual([]);
    expect(gridLayout(Number.NaN).cells).toEqual([]);
    expect(gridLayout(Number.POSITIVE_INFINITY).cells).toEqual([]);
    expect(gridLayout(10).cells).toHaveLength(9);
    expect(gridLayout(2.7).cells).toHaveLength(2);
  });
});

describe("equalRatios", () => {
  it("eşit paylar, en az 1", () => {
    expect(equalRatios(2)).toEqual([0.5, 0.5]);
    expect(equalRatios(0)).toEqual([1]);
  });
});

describe("dragRatios", () => {
  const sum = (r: number[]) => r.reduce((a, b) => a + b, 0);

  it("yalnız iki komşuyu değiştiriyor, toplam korunuyor", () => {
    const next = dragRatios([1 / 3, 1 / 3, 1 / 3], 0, 0.1);
    expect(next[0]).toBeCloseTo(1 / 3 + 0.1);
    expect(next[1]).toBeCloseTo(1 / 3 - 0.1);
    expect(next[2]).toBeCloseTo(1 / 3);
    expect(sum(next)).toBeCloseTo(1);
  });

  it("bölme %8'in altına inmiyor, hangi hızda çekilirse çekilsin", () => {
    expect(dragRatios([0.5, 0.5], 0, 5)).toEqual([0.92, 0.08].map((v) => expect.closeTo(v)));
    expect(dragRatios([0.5, 0.5], 0, -5)).toEqual([0.08, 0.92].map((v) => expect.closeTo(v)));
  });

  it("geçersiz indeks, sayı olmayan delta ya da sıkışmış çift kopya döndürüyor", () => {
    const base = [0.5, 0.5];
    for (const [index, delta] of [[-1, 0.1], [1, 0.1], [0.5, 0.1], [0, Number.NaN]] as const) {
      const next = dragRatios(base, index, delta);
      expect(next).toEqual(base);
      expect(next).not.toBe(base);
    }
    expect(dragRatios([0.9, 0.05, 0.05], 1, 0.01)).toEqual([0.9, 0.05, 0.05]);
  });
});

describe("middleEllipsis", () => {
  it("kısa metin aynen", () => {
    expect(middleEllipsis("C:\\a")).toBe("C:\\a");
  });

  it("uzun metin ortadan kısaltılıyor, uzunluk sınırda", () => {
    const text = "C:\\Users\\kullanici\\projeler\\cok-uzun-bir-klasor-adi\\alt\\son";
    const short = middleEllipsis(text, 20);
    expect(short).toHaveLength(20);
    expect(short.startsWith("C:\\Users\\")).toBe(true);
    expect(short.endsWith("alt\\son")).toBe(true);
    expect(short).toContain("…");
  });

  it("çok küçük sınır", () => {
    expect(middleEllipsis("abcdef", 1)).toBe("…");
  });
});
