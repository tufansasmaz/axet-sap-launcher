// SAP yazma geçmişinin CSV'si (spec 2026-10-16 sap-yazma-gecmisi §5).
import { describe, expect, it } from "vitest";
import { toCsv, type WriteOp } from "../app-electron/shared/sapWriteHistory";

const OP: WriteOp = {
  key: "a",
  zaman: new Date(2026, 9, 16, 14, 32, 5).toISOString(),
  kullanici: "TSASMAZ",
  sid: "D01",
  client: "100",
  mod: "dogrudan",
  arac: "adt_push",
  transport: "D01K900123",
  paket: "ZPKG",
  nesneler: [{ ad: "ZCL_A", tip: "CLAS" }, { ad: "ZIF_B", tip: "INTF" }],
  approval: "onaylandi",
  result: "basarili",
  sapMessage: null
};

describe("toCsv", () => {
  it("başlık + satır; yerel saat; ; ayracı; CRLF; BOM yok", () => {
    const csv = toCsv([OP], "tr");
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Zaman;Kullanıcı;SID;Client;Mod;Araç;Nesneler;Paket;Transport;Onay;Sonuç;SAP mesajı");
    expect(lines[1]).toBe("2026-10-16 14:32:05;TSASMAZ;D01;100;dogrudan;adt_push;ZCL_A (CLAS), ZIF_B (INTF);ZPKG;D01K900123;Onaylandı;Başarılı;");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("İngilizce başlık ve etiketler", () => {
    const lines = toCsv([{ ...OP, approval: "sure_doldu", result: "yok" }], "en").split("\r\n");
    expect(lines[0]).toBe("Time;User;SID;Client;Mode;Tool;Objects;Package;Transport;Approval;Result;SAP message");
    expect(lines[1]).toContain(";Expired;None;");
  });

  it("; tırnak ve satır sonu içeren hücre tırnaklanıyor", () => {
    const csv = toCsv([{ ...OP, result: "hata", sapMessage: 'Hata; "satır 12"\nyeniden dene' }], "tr");
    expect(csv).toContain('"Hata; ""satır 12""\nyeniden dene"');
  });

  it("formül gibi başlayan hücre çalışmıyor (inceleme odağı 3)", () => {
    const csv = toCsv(
      [{ ...OP, nesneler: [{ ad: "=SUM(A1)", tip: "CLAS" }], paket: "+ZPKG", transport: "-K1", sapMessage: "@cmd" }],
      "tr"
    );
    const cells = csv.split("\r\n")[1].split(";");
    expect(cells[6]).toBe("'=SUM(A1) (CLAS)");
    expect(cells[7]).toBe("'+ZPKG");
    expect(cells[8]).toBe("'-K1");
    expect(cells[11]).toBe("'@cmd");
  });

  it("boş alanlar boş hücre; liste boşsa yalnız başlık", () => {
    const csv = toCsv([{ ...OP, kullanici: null, transport: null, nesneler: [] }], "tr");
    expect(csv.split("\r\n")[1].split(";").slice(0, 9)).toEqual(["2026-10-16 14:32:05", "", "D01", "100", "dogrudan", "adt_push", "", "ZPKG", ""]);
    expect(toCsv([], "tr").split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});
