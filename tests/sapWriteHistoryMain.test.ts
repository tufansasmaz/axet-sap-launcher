// SAP yazma geçmişi, ana süreç (spec 2026-10-16 sap-yazma-gecmisi §5).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ BrowserWindow: { getFocusedWindow: () => null }, dialog: { showSaveDialog: vi.fn() } }));

const { MAX_HISTORY_BYTES, csvFileName, exportWriteHistoryCsv, readWriteHistory } = await import(
  "../app-electron/main/sapWrite/history"
);

const ROW = (id: string, zaman: string) =>
  JSON.stringify({ zaman, tur: "karar", id, karar: "izinli", kaynak: "ust_onay", sid: "D01", arac: "adt_push", nesneler: [{ ad: "ZCL_A", tip: "CLAS" }] });

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "yazma-"));
});

describe("readWriteHistory", () => {
  it("proje klasörü ya da kayıt yoksa boş liste, hata değil (inceleme odağı 4)", () => {
    expect(readWriteHistory(path.join(dir, "yok"))).toEqual({ ok: true, ops: [], skipped: 0, truncated: false });
    expect(readWriteHistory(dir)).toEqual({ ok: true, ops: [], skipped: 0, truncated: false });
  });

  it("kaydı okuyup işlemlere çeviriyor", () => {
    writeFileSync(path.join(dir, "sap-yazma-gunlugu.jsonl"), `${ROW("a", "2026-10-16T10:00:00Z")}\n${ROW("b", "2026-10-16T11:00:00Z")}\n`);
    const r = readWriteHistory(dir);
    expect(r.ok && r.ops.map((o) => o.key)).toEqual(["b", "a"]);
  });

  it("sınırı aşan kayıt sondan okunuyor, truncated", () => {
    const filler = `${ROW("eski", "2026-01-01T00:00:00Z")}\n`.repeat(50);
    writeFileSync(path.join(dir, "sap-yazma-gunlugu.jsonl"), filler + `${ROW("son", "2026-10-16T12:00:00Z")}\n`);
    const r = readWriteHistory(dir, 300);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.truncated).toBe(true);
    expect(r.ops[0].key).toBe("son");
    expect(r.skipped).toBe(0); // yarım ilk satır atıldı, bozuk sayılmadı
  });

  it("okunamıyorsa okunamadi (inceleme odağı 5)", () => {
    // Kayıt adında bir KLASÖR: var ama dosya olarak okunamıyor.
    mkdirSync(path.join(dir, "sap-yazma-gunlugu.jsonl"));
    expect(readWriteHistory(dir)).toEqual({ ok: false, reason: "okunamadi" });
  });

  it("varsayılan sınır 5 MB", () => {
    expect(MAX_HISTORY_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("exportWriteHistoryCsv", () => {
  it("BOM + CSV yazıyor; önerilen ad SID ve tarih", async () => {
    writeFileSync(path.join(dir, "sap-yazma-gunlugu.jsonl"), `${ROW("a", "2026-10-16T10:00:00Z")}\n`);
    const target = path.join(dir, "cikti.csv");
    const pickPath = vi.fn(async () => target);
    const r = await exportWriteHistoryCsv(dir, "D01", "tr", { pickPath, now: new Date(2026, 9, 16) });
    expect(pickPath).toHaveBeenCalledWith("sap-yazma-D01-20261016.csv");
    expect(r).toEqual({ ok: true, path: target, count: 1 });
    const bytes = readFileSync(target);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.toString("utf-8")).toContain("\r\n");
  });

  it("iptal edilirse dosya yok", async () => {
    const r = await exportWriteHistoryCsv(dir, "D01", "tr", { pickPath: async () => null });
    expect(r).toEqual({ ok: false, canceled: true });
  });

  it("dosya adı güvenli", () => {
    expect(csvFileName("D/0:1", new Date(2026, 0, 2))).toBe("sap-yazma-D_0_1-20260102.csv");
  });
});
