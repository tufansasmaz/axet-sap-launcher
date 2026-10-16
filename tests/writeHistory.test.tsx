// @vitest-environment jsdom
// "SAP'ye yazılanlar" bölümü (spec 2026-10-16 sap-yazma-gecmisi §6).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WriteOp } from "../app-electron/shared/sapWriteHistory";
import type { SapService } from "../app-electron/shared/types";
import { LanguageProvider } from "../src/i18n";
import WriteHistory, { opStatus } from "../src/components/WriteHistory";

const win = window as unknown as { api: unknown };
const originalApi = win.api;
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE = { uuid: "u1", systemId: "D01", name: "D01 Geliştirme" } as SapService;

function op(i: number, over: Partial<WriteOp> = {}): WriteOp {
  return {
    key: `k${i}`,
    zaman: new Date(2026, 9, 16, 14, i).toISOString(),
    kullanici: "TSASMAZ",
    sid: "D01",
    client: "100",
    mod: "dogrudan",
    arac: "adt_push",
    transport: `D01K9000${String(i).padStart(2, "0")}`,
    paket: "ZPKG",
    nesneler: [{ ad: `ZCL_${i}`, tip: "CLAS" }],
    approval: "onaylandi",
    result: "basarili",
    sapMessage: null,
    sapTransport: null,
    ...over
  };
}

function setup(history: unknown, exportCsv = vi.fn(async () => ({ ok: true, path: "C:/x/sap-yazma-D01-20261016.csv", count: 1 }))) {
  const getWriteHistory = vi.fn(async () => history);
  win.api = { getWriteHistory, exportWriteHistoryCsv: exportCsv };
  render(
    <LanguageProvider language="tr">
      <WriteHistory path={["Müşteri"]} service={SERVICE} />
    </LanguageProvider>
  );
  return { getWriteHistory, exportCsv };
}

describe("WriteHistory", () => {
  it("kayıt boşsa hiçbir şey çizilmiyor", async () => {
    const { getWriteHistory } = setup({ ok: true, ops: [], skipped: 0, truncated: false });
    await waitFor(() => expect(getWriteHistory).toHaveBeenCalledWith(["Müşteri"], SERVICE));
    expect(screen.queryByText(/SAP'ye yazılanlar/)).toBeNull();
  });

  it("başlık sayıyla; ilk 10 satır, 'Tümünü göster' kalanı açıyor", async () => {
    setup({ ok: true, ops: Array.from({ length: 12 }, (_, i) => op(i)), skipped: 0, truncated: false });
    expect(await screen.findByText("SAP'ye yazılanlar (12)")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /D01K9000/ })).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Tümünü göster (12)" }));
    expect(screen.getAllByRole("button", { name: /D01K9000/ })).toHaveLength(12);
  });

  it("satır: nesne +N, transport, durum; tıklayınca ayrıntı", async () => {
    setup({
      ok: true,
      ops: [op(1, { nesneler: [{ ad: "ZCL_A", tip: "CLAS" }, { ad: "ZIF_B", tip: "INTF" }, { ad: "ZT", tip: "TABL" }], result: "hata", sapMessage: "Syntax error" })],
      skipped: 0,
      truncated: false
    });
    const row = await screen.findByRole("button", { name: /ZCL_A \+2/ });
    expect(row.textContent).toContain("D01K900001");
    expect(row.textContent).toContain("Hata");
    expect(screen.queryByText("Syntax error")).toBeNull();
    fireEvent.click(row);
    expect(screen.getByText("Syntax error")).toBeTruthy();
    expect(screen.getByText("ZCL_A (CLAS), ZIF_B (INTF), ZT (TABL)")).toBeTruthy();
    expect(row.getAttribute("aria-expanded")).toBe("true");
  });

  it("CSV: çağrı yapılıyor, sonuç başlığın altında", async () => {
    const { exportCsv } = setup({ ok: true, ops: [op(1)], skipped: 0, truncated: false });
    fireEvent.click(await screen.findByRole("button", { name: "CSV olarak kaydet" }));
    await waitFor(() => expect(exportCsv).toHaveBeenCalledWith(["Müşteri"], SERVICE));
    expect(await screen.findByText("Kaydedildi: sap-yazma-D01-20261016.csv")).toBeTruthy();
  });

  it("CSV iptal edilirse ileti yok; hata ileti olarak", async () => {
    const exportCsv = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, canceled: true })
      .mockResolvedValueOnce({ ok: false, message: "erişim engellendi" });
    setup({ ok: true, ops: [op(1)], skipped: 0, truncated: false }, exportCsv);
    const button = await screen.findByRole("button", { name: "CSV olarak kaydet" });
    fireEvent.click(button);
    await waitFor(() => expect(exportCsv).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Kaydedil/)).toBeNull();
    fireEvent.click(button);
    expect(await screen.findByText("Kaydedilemedi: erişim engellendi")).toBeTruthy();
  });

  it("SAP başka transport'a kaydettiyse ikisi de görünüyor (inceleme I2)", async () => {
    setup({ ok: true, ops: [op(1, { sapTransport: "D01K900199" })], skipped: 0, truncated: false });
    const row = await screen.findByRole("button", { name: /ZCL_1/ });
    expect(row.textContent).toContain("D01K900001 → D01K900199");
  });

  it("okunamadı ve kısmi okuma notları (inceleme odağı 5)", async () => {
    setup({ ok: false, reason: "okunamadi" });
    expect(await screen.findByText("Kayıt okunamadı.")).toBeTruthy();
    cleanup();
    setup({ ok: true, ops: [op(1)], skipped: 3, truncated: true });
    expect(await screen.findByText("Kayıt büyük; yalnız son 5 MB gösteriliyor.")).toBeTruthy();
    expect(screen.getByText("Okunamayan 3 satır atlandı.")).toBeTruthy();
    cleanup();
    setup({ ok: true, ops: [op(1)], skipped: 0, truncated: false });
    await screen.findByText("SAP'ye yazılanlar (1)");
    expect(screen.queryByText(/atlandı|5 MB/)).toBeNull();
  });
});

describe("opStatus", () => {
  it("sonuç onaydan önce gelir; tonlar", () => {
    expect(opStatus(op(1))).toEqual({ key: "writeHistory.status.basarili", tone: "success" });
    expect(opStatus(op(1, { result: "hata" }))).toEqual({ key: "writeHistory.status.hata", tone: "danger" });
    expect(opStatus(op(1, { result: "yok", approval: "reddedildi" }))).toEqual({ key: "writeHistory.status.reddedildi", tone: "warning" });
    expect(opStatus(op(1, { result: "yok", approval: "yanitsiz" }))).toEqual({ key: "writeHistory.status.yanitsiz", tone: "neutral" });
    expect(opStatus(op(1, { result: "yok", approval: "kalite_reddi" })).tone).toBe("warning");
    // inceleme M3: onaylı ama sonucu yok — "Onaylandı" tek başına yazılmıyor
    expect(opStatus(op(1, { result: "yok", approval: "onaylandi" }))).toEqual({ key: "writeHistory.status.approvedNoResult", tone: "neutral" });
    expect(opStatus(op(1, { result: "yok", approval: "oturum" })).key).toBe("writeHistory.status.approvedNoResult");
    expect(opStatus(op(1, { result: "yok", approval: "bilinmiyor" }))).toEqual({ key: "writeHistory.status.bilinmiyor", tone: "warning" });
    expect(opStatus(op(1, { result: "etkin_degil" }))).toEqual({ key: "writeHistory.status.etkin_degil", tone: "warning" });
  });
});
