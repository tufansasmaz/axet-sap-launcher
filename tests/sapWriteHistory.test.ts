// SAP yazma kaydını işlemlere çevirme (spec 2026-10-16 sap-yazma-gecmisi §4).
import { describe, expect, it } from "vitest";
import { buildWriteHistory } from "../app-electron/shared/sapWriteHistory";

const ID = { sid: "D01", client: "100", kullanici: "TSASMAZ", mod: "dogrudan" };
const FACT = {
  arac: "adt_push",
  sinif: "TRANSPORT_ONAYLI",
  transport: "D01K900123",
  nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false }, { ad: "ZIF_B", tip: "INTF", paket: "ZPKG", yeni: true }]
};
const line = (o: Record<string, unknown>) => JSON.stringify(o);

describe("buildWriteHistory", () => {
  it("karar + cevap + sonuç tek işlem; sıra karışık olsa da", () => {
    const { ops, skipped } = buildWriteHistory([
      line({ zaman: "2026-10-16T11:00:05Z", tur: "sonuc", id: "a", arac: "adt_push", transport: "D01K900123", sap_sonucu: { success: true, activated: true }, ...ID }),
      line({ zaman: "2026-10-16T11:00:00Z", tur: "karar", id: "a", karar: "bekliyor", kaynak: null, ...FACT, ...ID }),
      line({ zaman: "2026-10-16T11:00:02Z", tur: "cevap", id: "a", secim: "bu_seferlik", ...FACT, ...ID })
    ]);
    expect(skipped).toBe(0);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      key: "a",
      zaman: "2026-10-16T11:00:00Z",
      kullanici: "TSASMAZ",
      sid: "D01",
      client: "100",
      mod: "dogrudan",
      arac: "adt_push",
      transport: "D01K900123",
      paket: "ZPKG",
      approval: "onaylandi",
      result: "basarili",
      sapMessage: null
    });
    expect(ops[0].nesneler).toEqual([{ ad: "ZCL_A", tip: "CLAS" }, { ad: "ZIF_B", tip: "INTF" }]);
  });

  it("onay türleri: reddet, oturum, oturum izni, üst onay, teslim, süresi doldu, yanıtsız", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T10:00:00Z", tur: "karar", id: "r", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:00:01Z", tur: "cevap", id: "r", secim: "reddet", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:01:00Z", tur: "karar", id: "o", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:01:01Z", tur: "cevap", id: "o", secim: "oturum", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:02:00Z", tur: "karar", id: "oi", karar: "izinli", kaynak: "oturum_izni", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:03:00Z", tur: "karar", id: "u", karar: "izinli", kaynak: "ust_onay", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:04:00Z", tur: "karar", id: "t", karar: "izinli", kaynak: "teslim_izni", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:05:00Z", tur: "karar", id: "s", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:15:00Z", tur: "karar", id: "s", karar: "sure_doldu", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:20:00Z", tur: "karar", id: "y", karar: "bekliyor", ...FACT, ...ID })
    ]);
    const byKey = Object.fromEntries(ops.map((o) => [o.key, o.approval]));
    expect(byKey).toEqual({
      r: "reddedildi",
      o: "oturum",
      oi: "oturum",
      u: "ust_onay",
      t: "teslim",
      s: "sure_doldu",
      y: "yanitsiz"
    });
    for (const o of ops) expect(o.result).toBe("yok");
  });

  it("aynı id'nin karar tekrarları tek işlem (inceleme odağı 2)", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T09:00:00Z", tur: "karar", id: "x", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T09:00:30Z", tur: "cevap", id: "x", secim: "reddet", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T09:01:00Z", tur: "karar", id: "x", karar: "reddedildi", ...FACT, ...ID })
    ]);
    expect(ops).toHaveLength(1);
    expect(ops[0].approval).toBe("reddedildi");
  });

  it("kimliksiz karar ve kalite reddi ayrı işlemler; mod ve bağlantı uyuşmazlığı listelenmiyor", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T08:00:00Z", tur: "mod", ...ID }),
      line({ zaman: "2026-10-16T08:01:00Z", tur: "karar", id: null, karar: "yerel_mod", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T08:02:00Z", tur: "karar", id: null, karar: "mod_secilmedi", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T08:03:00Z", tur: "kalite_reddi", arac: "adt_push", nesneler: [{ ad: "ZCL_Q", tip: "CLAS" }], sebep: "ATC", ...ID }),
      line({ zaman: "2026-10-16T08:04:00Z", tur: "baglanti_uyusmazligi", ...ID })
    ]);
    expect(ops.map((o) => o.approval)).toEqual(["kalite_reddi", "engellendi", "engellendi"]);
    expect(new Set(ops.map((o) => o.key)).size).toBe(3);
    expect(ops[0].nesneler).toEqual([{ ad: "ZCL_Q", tip: "CLAS" }]);
  });

  it("SAP hatası: sonuç hata, mesaj taşınıyor", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T07:00:00Z", tur: "karar", id: "h", karar: "izinli", kaynak: "oturum_izni", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T07:00:09Z", tur: "sonuc", id: "h", sap_sonucu: { success: false, error: "Syntax error in line 12" }, ...ID })
    ]);
    expect(ops[0]).toMatchObject({ result: "hata", sapMessage: "Syntax error in line 12" });
  });

  it("onay kaydı hiç yoksa 'yanıtsız' değil 'bilinmiyor' (inceleme I1)", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T06:00:00Z", tur: "sonuc", id: "z", arac: "adt_push", sap_sonucu: { success: true }, ...ID })
    ]);
    expect(ops[0]).toMatchObject({ approval: "bilinmiyor", result: "basarili" });
  });

  it("SAP'nin kaydettiği transport (corrnr) ayrı taşınıyor (inceleme I2)", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T05:00:00Z", tur: "karar", id: "c", karar: "izinli", kaynak: "ust_onay", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T05:00:03Z", tur: "sonuc", id: "c", sap_sonucu: { success: true, corrnr: "D01K900130" }, ...ID })
    ]);
    expect(ops[0]).toMatchObject({ transport: "D01K900123", sapTransport: "D01K900130" });
    const none = buildWriteHistory([line({ zaman: "2026-10-16T05:00:00Z", tur: "karar", id: "d", karar: "izinli", kaynak: "ust_onay", ...FACT, ...ID })]);
    expect(none.ops[0].sapTransport).toBeNull();
  });

  it("yüklendi ama etkinleştirilmedi 'hata' ya da 'başarılı' görünmüyor (inceleme M7)", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T04:00:00Z", tur: "sonuc", id: "u1", sap_sonucu: { success: false, source_uploaded: true, error: "Activation failed" }, ...ID }),
      line({ zaman: "2026-10-16T04:01:00Z", tur: "sonuc", id: "u2", sap_sonucu: { ok: true, activated: false }, ...ID })
    ]);
    const byKey = Object.fromEntries(ops.map((o) => [o.key, o.result]));
    expect(byKey).toEqual({ u1: "etkin_degil", u2: "etkin_degil" });
  });

  it("bozuk satırlar sayılıyor; eksik alanlı eski kayıt çökmüyor (inceleme odağı 1); en yeni üstte", () => {
    const { ops, skipped } = buildWriteHistory([
      "bu json değil",
      "",
      line({ zaman: "2026-10-15T07:00:00Z" }),
      line({ zaman: "2026-10-15T08:00:00Z", tur: "karar", id: "eski", karar: "bekliyor" }),
      line({ zaman: "2026-10-16T08:00:00Z", tur: "karar", id: "yeni", karar: "izinli", kaynak: "ust_onay", ...FACT, ...ID })
    ]);
    expect(skipped).toBe(2);
    expect(ops.map((o) => o.key)).toEqual(["yeni", "eski"]);
    expect(ops[1]).toMatchObject({ kullanici: null, sid: null, transport: null, paket: null, nesneler: [], approval: "yanitsiz" });
  });
});
