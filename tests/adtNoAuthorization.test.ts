// 403 ExceptionResourceNoAuthorization = şifre doğru, ADT YETKİSİ YOK.
//
// Canlı bulgu (2026-10-14, NTT'nin canlı ERP'si, herkeste): bağlanırken
// kullanıcı "Beklenmeyen HTTP durumu: 403 — <?xml …>" gördü. SAP kullanıcıyı
// tanıyor (401 değil), ama rolünde ADT kaynaklarına erişim (S_ADT_RES,
// /sap/bc/adt/*) yok — canlı sistemlerde bilerek verilmeyen bir yetki. Uygulama
// bunu çözemez; yapabileceği şey ham XML yerine sebebi ve kime gidileceğini
// söylemek.
//
// `.ts`: app-electron/main'den import ediyor.

import { describe, expect, it } from "vitest";
import { unexpectedStatusMessage } from "../app-electron/main/adtDiscovery";

// Kullanıcının ekranındaki gövde (kırpılmamış hâli SAP'ın standart biçimi).
const BODY =
  '<?xml version="1.0" encoding="utf-8"?><exc:exception xmlns:exc="http://www.sap.com/abapxml/types/communicationframework"><namespace id="com.sap.adt"/><type id="ExceptionResourceNoAuthorization"/><message lang="EN">No authorization to access the resource /sap/bc/adt/discovery.</message><localizedMessage lang="TR">No authorization to access the resource /sap/bc/adt/discovery.</localizedMessage><properties/></exc:exception>';

describe("403 ExceptionResourceNoAuthorization", () => {
  it("ham XML yerine sebebi ve yetki nesnesini söylüyor (TR)", () => {
    const msg = unexpectedStatusMessage("tr", 403, BODY, "application/xml");
    expect(msg).not.toContain("<?xml");
    expect(msg).not.toContain("Beklenmeyen");
    expect(msg).toContain("S_ADT_RES");
    expect(msg).toMatch(/şifre(n)? doğru/i);
    expect(msg).toMatch(/Basis/);
  });

  it("İngilizce de aynı bilgiyi veriyor", () => {
    const msg = unexpectedStatusMessage("en", 403, BODY, "application/xml");
    expect(msg).not.toContain("<?xml");
    expect(msg).toContain("S_ADT_RES");
    expect(msg).toMatch(/Basis/);
  });

  it("başka bir 403 (tanınmayan gövde) eski davranışta kalıyor", () => {
    const msg = unexpectedStatusMessage("tr", 403, "Forbidden by proxy", "text/plain");
    expect(msg).toContain("Beklenmeyen HTTP durumu: 403");
    expect(msg).not.toContain("S_ADT_RES");
  });

  it("aynı istisna 403 dışında bir kodla gelirse yetki mesajı verilmiyor", () => {
    expect(unexpectedStatusMessage("tr", 500, BODY, "application/xml")).not.toContain("S_ADT_RES");
  });
});
