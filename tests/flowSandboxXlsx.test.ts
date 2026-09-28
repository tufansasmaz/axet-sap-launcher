import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SHEET_TBD_MARK, xlsxRead, xlsxWrite } from "../src/flowSandbox/xlsxOps.js";

// excel-to-json / json-to-excel yardımcılarının sandbox'a taşınırken
// davranışının korunduğunu gösteren testler. Beklenen değerler taşımadan önce
// aynı dosyadan eski ana süreç koduyla (xlsx 0.20.3) alınan çıktı.

const require = createRequire(import.meta.url);
type Sheet = { cell(ref: string): { value(v?: unknown): { style(k: string, v: unknown): unknown } } };
type Workbook = {
  sheet(name: string): Sheet;
  addSheet(name: string): Sheet;
  sheets(): Array<{ name(): string }>;
  outputAsync(type?: string): Promise<Uint8Array>;
};
const XlsxPopulate = require("xlsx-populate") as {
  fromBlankAsync(): Promise<Workbook>;
  fromDataAsync(data: unknown): Promise<Workbook>;
};

async function fixture(): Promise<Uint8Array> {
  const wb = await XlsxPopulate.fromBlankAsync();
  const s = wb.sheet("Sheet1");
  s.cell("A1").value("Ad");
  s.cell("B1").value("Tarih");
  s.cell("C1").value("Tutar");
  s.cell("D1").value("Aktif");
  s.cell("A2").value("Ali");
  s.cell("B2").value(new Date(2024, 0, 15, 10, 30)).style("numberFormat", "dd/MM/yyyy");
  s.cell("C2").value(12.5);
  s.cell("D2").value(true);
  s.cell("A3").value("Veli");
  s.cell("C3").value(7);
  s.cell("A5").value("Son");
  s.cell("B5").value(new Date(1999, 11, 31)).style("numberFormat", "dd/MM/yyyy");
  const s2 = wb.addSheet("Ikinci");
  s2.cell("A1").value("x");
  s2.cell("B1").value("y");
  s2.cell("A2").value(1);
  s2.cell("B2").value("bir");
  return new Uint8Array(await wb.outputAsync());
}

// xlsxOps.js tipsiz JS; sonuç sayfa adı → satır listesi.
const readX = (bytes: Uint8Array, opts: Record<string, unknown>) =>
  xlsxRead({ XLSX }, bytes, opts) as Record<string, unknown[]>;

const d1 = new Date(2024, 0, 15, 10, 30);
const d2 = new Date(1999, 11, 31);

describe("xlsxRead (excel-to-json)", () => {
  it("auto başlık: her sayfa, tarihler Date, boş satırlar korunuyor", async () => {
    const data = readX(await fixture(), {});
    expect(data).toEqual({
      Sheet1: [{ Ad: "Ali", Tarih: d1, Tutar: 12.5, Aktif: true }, { Ad: "Veli", Tutar: 7 }, {}, { Ad: "Son", Tarih: d2 }],
      Ikinci: [{ x: 1, y: "bir" }]
    });
  });

  it("array / column / tanımlı başlık", async () => {
    const bytes = await fixture();
    expect(readX(bytes, { header: "array" }).Ikinci).toEqual([["x", "y"], [1, "bir"]]);
    // Boş hücre dizide delik olarak kalıyor (JSON'da null görünüyor).
    const veli = readX(bytes, { header: "array" }).Sheet1[2] as unknown[];
    expect(veli).toHaveLength(3);
    expect(1 in veli).toBe(false);
    expect([veli[0], veli[2]]).toEqual(["Veli", 7]);
    expect(readX(bytes, { header: "column" }).Sheet1[1]).toEqual({ A: "Ali", B: d1, C: 12.5, D: true });
    expect(readX(bytes, { header: ["a", "b", "c", "d"] }).Ikinci).toEqual([{ a: "x", b: "y" }, { a: 1, b: "bir" }]);
  });

  it("sayfaya göre başlık ve offset ayarı", async () => {
    const bytes = await fixture();
    const data = readX(bytes, { header: { Ikinci: "column" }, offset: { Sheet1: 1 } });
    expect(data.Ikinci).toEqual([{ A: "x", B: "y" }, { A: 1, B: "bir" }]);
    expect(data.Sheet1).toEqual([{ Ali: "Veli", "12.5": 7 }, {}, { Ali: "Son", "15/01/2024": d2 }]);
  });

  it("dosyadan gelen '__proto__' sayfa adı prototipi değiştirmiyor", async () => {
    const wb = await XlsxPopulate.fromBlankAsync();
    wb.addSheet("__proto__").cell("A1").value("k");
    const data = readX(new Uint8Array(await wb.outputAsync()), {});
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(Object.keys(data)).toContain("__proto__");
    expect(({} as Record<string, unknown>).k).toBeUndefined();
  });
});

describe("xlsxWrite (json-to-excel)", () => {
  it("boş kitaba yazıyor, varsayılan Sheet1 siliniyor", async () => {
    const out = await xlsxWrite(
      { XlsxPopulate },
      { data: { Liste: [{ Ad: "Ali", Tarih: d1 }, { Ad: "Veli", Tutar: 3 }] }, config: {}, blank: true, templateBuffer: null }
    );
    expect(out).toBeInstanceOf(Uint8Array);
    const back = readX(out, {});
    expect(Object.keys(back)).toEqual(["Liste"]);
    expect(back.Liste).toEqual([{ Ad: "Ali", Tarih: d1 }, { Ad: "Veli", Tutar: 3 }]);
    const wb = await XlsxPopulate.fromDataAsync(out);
    expect(wb.sheets().some((s) => s.name().endsWith(SHEET_TBD_MARK))).toBe(false);
  });

  it("şablonun var olan sayfalarını koruyup üzerine yazıyor", async () => {
    const template = await fixture();
    const out = await xlsxWrite(
      { XlsxPopulate },
      { data: { Ikinci: [[9, "dokuz"]] }, config: { header: "array", offset: 2 }, blank: false, templateBuffer: template }
    );
    const back = readX(out, { header: "array" });
    expect(Object.keys(back)).toEqual(["Sheet1", "Ikinci"]);
    expect(back.Ikinci).toEqual([["x", "y"], [1, "bir"], [9, "dokuz"]]);
  });

  it("null şablon eskisi gibi xlsx-populate hatası veriyor, boş kitaba dönmüyor", async () => {
    await expect(
      xlsxWrite({ XlsxPopulate }, { data: { A: [] }, config: {}, blank: false, templateBuffer: null })
    ).rejects.toThrow();
  });
});
