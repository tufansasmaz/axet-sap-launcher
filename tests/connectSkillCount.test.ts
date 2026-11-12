// Baglanti bildirimindeki beceri sayisi (kararlilik-2, R8b).
//
// Kullanici: "Baglandiginda skiller 0 olarak yaziyor ama sorunca yuklu diyor."
// Kok neden: global kurulum saglamken proje kurulumu yalniz SAP'a yazan
// yetenekleri kopyaliyor; bildirim yalniz bu kopyalari sayiyordu. Modul
// danismaninda proje kapsaminda kopyalanan yetenek olmayabiliyor -> "0".
// Ajan ise global klasordeki yetenekleri goruyor.

import { describe, expect, it } from "vitest";
import { skillCountForNotice } from "../app-electron/main/sapToolkit";

describe("skillCountForNotice", () => {
  it("global kurulum saglamken global yetenekleri de sayar", () => {
    expect(
      skillCountForNotice({ installed: [], globalSkills: ["sap-docs", "clean-core", "office-pdf"] })
    ).toBe(3);
  });

  it("proje + global toplanir, ayni ad iki kez sayilmaz", () => {
    expect(
      skillCountForNotice({ installed: ["sap-adt-readonly", "sap-docs"], globalSkills: ["sap-docs", "clean-core"] })
    ).toBe(3);
  });

  it("global kurulum yoksa (yedek davranis) yalniz proje kopyalari", () => {
    expect(skillCountForNotice({ installed: ["a", "b"], globalSkills: [] })).toBe(2);
  });
});
