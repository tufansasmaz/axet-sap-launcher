// Teşhis satırları -> kenar çubuğundaki arıza noktası.
//
// Buradaki asıl güvence "kırmızı noktanın ucuzlamaması": `warn` satırları
// normal bir başlangıç durumu (ADT sunucusu henüz bağlanılmadığı için kapalı,
// RFC köprüsü gerekmediği için kapalı) ve bunlara da nokta konsaydı uygulama
// HER açılışta uyarı gösterirdi. Bir hafta sonra kimse o noktaya bakmazdı —
// yani gerçek bir arıza çıktığında da görünmezdi.

import { describe, expect, it } from "vitest";
import { doctorFaultIds, hasDoctorFault } from "../app-electron/shared/doctorSeverity";
import type { DoctorRow, DoctorRowId, DoctorStatus } from "../app-electron/shared/types";

function row(id: DoctorRowId, status: DoctorStatus): DoctorRow {
  return { id, status, detail: "" };
}

describe("hasDoctorFault", () => {
  it("bos raporda nokta yok", () => {
    expect(hasDoctorFault([])).toBe(false);
  });

  it("her sey yolundayken nokta yok", () => {
    expect(hasDoctorFault([row("python", "ok"), row("toolkit", "ok")])).toBe(false);
  });

  it("baglanilmamis bir makinenin NORMAL hali nokta uretmez", () => {
    // Uygulama ilk acildiginda gorulen tablo: sunucular kapali, katalog
    // esitlenmemis. Hicbiri kullanicinin cozecegi bir sey degil.
    const normal = [
      row("python", "ok"),
      row("packages", "ok"),
      row("adtServer", "warn"),
      row("rfcBridge", "info"),
      row("rfcRuntime", "warn"),
      row("axetCode", "warn"),
      row("toolkit", "ok"),
      row("catalog", "info")
    ];
    expect(hasDoctorFault(normal)).toBe(false);
  });

  it("tek bir fail yeter", () => {
    expect(hasDoctorFault([row("adtServer", "warn"), row("packages", "fail")])).toBe(true);
  });

  it("unknown ariza sayilmaz", () => {
    // Python bulunamayinca paketler satiri "unknown" oluyor; ayni arizayi
    // iki kez saymanin anlami yok, zaten python satiri "fail".
    expect(hasDoctorFault([row("packages", "unknown")])).toBe(false);
  });
});

describe("doctorFaultIds", () => {
  it("yalnizca arizali satirlarin kimliklerini, sirayla verir", () => {
    expect(doctorFaultIds([row("python", "fail"), row("adtServer", "warn"), row("toolkit", "fail")])).toEqual([
      "python",
      "toolkit"
    ]);
  });
});
