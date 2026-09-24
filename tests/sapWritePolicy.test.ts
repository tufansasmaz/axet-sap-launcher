import { describe, expect, it } from "vitest";
import type { FactObject, WriteFact } from "../app-electron/shared/sapWriteTypes";
import {
  APPROVED_TTL_MS,
  PENDING_TTL_MS,
  STICKY_TTL_MS,
  TESLIM_TTL_MS,
  UST_ONAY_TTL_MS,
  canSession,
  decide,
  newSessionState,
  respond,
  setMode,
  sweep,
  validateFact,
  type WriteSessionState,
} from "../app-electron/main/sapWrite/policy";

const H = (c: string) => c.repeat(64);
const T0 = 1_000_000;

function obj(over: Partial<FactObject> = {}): FactObject {
  return { ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")], ...over };
}

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [obj()],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Test", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

function session(mode: "dogrudan" | "yerel" | null = "dogrudan"): WriteSessionState {
  const s = newSessionState("s1", "C:/p", { sid: "DS4", client: "100", user: "DEV1" });
  if (mode) setMode(s, mode);
  return s;
}

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

describe("decide — temel akış", () => {
  it("mod seçilmeden her yazma mod_secilmedi", () => {
    const s = session(null);
    expect(decide(s, fact(), T0, ids()).karar).toBe("mod_secilmedi");
    expect(s.records).toHaveLength(0);
  });

  it("ilk çağrı bekliyor; aynı hash tekrar gelince aynı kayıt, yeni pencere yok", () => {
    const s = session();
    const next = ids();
    const a = decide(s, fact(), T0, next);
    const b = decide(s, fact(), T0 + 1000, next);
    expect(a).toMatchObject({ karar: "bekliyor", id: "id1", created: true });
    expect(b).toMatchObject({ karar: "bekliyor", id: "id1", created: false });
    expect(s.records).toHaveLength(1);
  });

  it("bu_seferlik onay tek kullanımlık: bir kez izinli, sonra yeni istek", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    expect(respond(s, "id1", "bu_seferlik", T0 + 1000)).toEqual({ ok: true });
    expect(decide(s, fact(), T0 + 2000, next)).toMatchObject({ karar: "izinli", id: "id1", kaynak: "pencere" });
    expect(decide(s, fact(), T0 + 3000, next)).toMatchObject({ karar: "bekliyor", id: "id2", created: true });
  });

  it("tek argüman farkı (farklı hash) yeni istek açar", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "bu_seferlik", T0 + 1000);
    expect(decide(s, fact({ arg_hash: H("b") }), T0 + 2000, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("onay 60 dakika sonra kullanılamaz", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, fact(), T0 + APPROVED_TTL_MS + 1, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("red yapışkan: 10 dk boyunca aynı hash reddedildi, sonra yeni istek", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "reddet", T0);
    expect(decide(s, fact(), T0 + STICKY_TTL_MS - 1, next).karar).toBe("reddedildi");
    expect(decide(s, fact(), T0 + STICKY_TTL_MS + 1, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("sure_doldu yapışkan: cevapsız 10 dk → sure_doldu, 10 dk daha aynı cevap", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    const t1 = T0 + PENDING_TTL_MS;
    expect(sweep(s, t1).expired).toEqual(["id1"]);
    expect(decide(s, fact(), t1 + 1, next).karar).toBe("sure_doldu");
    expect(decide(s, fact(), t1 + STICKY_TTL_MS - 1, next).karar).toBe("sure_doldu");
    expect(decide(s, fact(), t1 + STICKY_TTL_MS + 1, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("süresi dolmuş bekleyen kayda sonradan onay verilemez", () => {
    const s = session();
    decide(s, fact(), T0, ids());
    expect(respond(s, "id1", "bu_seferlik", T0 + PENDING_TTL_MS + 1)).toEqual({ ok: false, error: "karar_verilmis" });
  });

  it("respond: bilinmeyen id ve iki kez cevap", () => {
    const s = session();
    decide(s, fact(), T0, ids());
    expect(respond(s, "yok", "reddet", T0)).toEqual({ ok: false, error: "bulunamadi" });
    respond(s, "id1", "reddet", T0);
    expect(respond(s, "id1", "bu_seferlik", T0)).toEqual({ ok: false, error: "karar_verilmis" });
  });

  it("setMode yalnızca bir kez", () => {
    const s = session(null);
    expect(setMode(s, "yerel")).toBe(true);
    expect(setMode(s, "dogrudan")).toBe(false);
    expect(s.mode).toBe("yerel");
  });
});

describe("oturum izni", () => {
  it("aynı transport + paket için sonraki nesneler pencere açmaz", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    expect(respond(s, "id1", "oturum", T0)).toEqual({ ok: true });
    const other = fact({ arg_hash: H("c"), nesneler: [obj({ ad: "ZCL_B" })] });
    const r = decide(s, other, T0 + 1000, next);
    expect(r).toMatchObject({ karar: "izinli", kaynak: "oturum_izni" });
    expect(r.id).toBeTruthy();
  });

  it("farklı transport ya da farklı paket yeni pencere açar", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "oturum", T0);
    expect(decide(s, fact({ arg_hash: H("c"), transport: "DS4K900002" }), T0, next).karar).toBe("bekliyor");
    expect(decide(s, fact({ arg_hash: H("d"), nesneler: [obj({ paket: "ZDIGER" })] }), T0, next).karar).toBe("bekliyor");
  });

  it("canSession: yalnızca doğrudan mod, TRANSPORT_ONAYLI, tek paket, transport ya da $TMP", () => {
    expect(canSession("dogrudan", fact())).toBe(true);
    expect(canSession("yerel", fact())).toBe(false);
    expect(canSession("dogrudan", fact({ sinif: "HER_SEFER" }))).toBe(false);
    expect(canSession("dogrudan", fact({ arac: "axet_teslim" }))).toBe(false);
    expect(canSession("dogrudan", fact({ nesneler: [obj(), obj({ ad: "ZCL_B", paket: "ZDIGER" })] }))).toBe(false);
    expect(canSession("dogrudan", fact({ transport: "" }))).toBe(false);
    expect(canSession("dogrudan", fact({ transport: "", nesneler: [obj({ paket: "$TMP" })] }))).toBe(true);
    expect(canSession("dogrudan", fact({ nesneler: [], paket: "" }))).toBe(false);
  });

  it("canSession false iken oturum cevabı reddedilir", () => {
    const s = session();
    decide(s, fact({ sinif: "HER_SEFER", arac: "adt_delete_object" }), T0, ids());
    expect(respond(s, "id1", "oturum", T0)).toEqual({ ok: false, error: "oturum_izni_verilemez" });
    expect(s.records[0].status).toBe("bekliyor");
  });

  it("HER_SEFER oturum izniyle geçmez", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "oturum", T0);
    const del = fact({ arac: "adt_delete_object", sinif: "HER_SEFER", arg_hash: H("e") });
    expect(decide(s, del, T0, next).karar).toBe("bekliyor");
  });
});

describe("yerel mod ve teslim", () => {
  const teslim = (over: Partial<WriteFact> = {}) =>
    fact({
      arac: "axet_teslim",
      arg_hash: H("f"),
      nesneler: [obj(), obj({ ad: "ZR_X", tip: "PROG", kaynak_sha256: [H("2")] })],
      teslim: { yontem: "adt" },
      ...over,
    });

  it("yerel modda tek tek TRANSPORT_ONAYLI yazma yerel_mod; HER_SEFER ve teslim pencereye gider", () => {
    const s = session("yerel");
    const next = ids();
    expect(decide(s, fact(), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arac: "adt_create_transport", sinif: "HER_SEFER", nesneler: [], arg_hash: H("9") }), T0, next).karar).toBe("bekliyor");
    expect(decide(s, teslim(), T0, next).karar).toBe("bekliyor");
  });

  it("onaylı teslim listedeki nesneleri aynı transport'ta 4 saat kapsar", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    const push = fact({ arg_hash: H("3"), nesneler: [obj({ ad: "ZR_X", tip: "PROG", kaynak_sha256: [H("2")] })] });
    expect(decide(s, push, T0 + 1000, next)).toMatchObject({ karar: "izinli", kaynak: "teslim_izni" });
    expect(decide(s, { ...push, arg_hash: H("4") }, T0 + 2000, next)).toMatchObject({ karar: "izinli", kaynak: "teslim_izni" });
    expect(decide(s, { ...push, arg_hash: H("5") }, T0 + TESLIM_TTL_MS + 1, next).karar).toBe("yerel_mod");
  });

  it("teslimden sonra değişen kaynak, listede olmayan nesne ve farklı transport kapsanmaz", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, fact({ arg_hash: H("3"), nesneler: [obj({ kaynak_sha256: [H("7")] })] }), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arg_hash: H("4"), nesneler: [obj({ ad: "ZCL_YOK" })] }), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arg_hash: H("5"), transport: "DS4K900009" }), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arg_hash: H("6"), nesneler: [obj({ paket: "ZDIGER" })] }), T0, next).karar).toBe("yerel_mod");
  });

  it("teslim, nesnesiz araçlardan yalnızca aynı transport'a adt_set_transport'u kapsar", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, fact({ arac: "adt_set_transport", nesneler: [], arg_hash: H("3") }), T0, next).karar).toBe("izinli");
    expect(decide(s, fact({ arac: "adt_activate", nesneler: [], arg_hash: H("4") }), T0, next).karar).toBe("yerel_mod");
  });

  it("abapGit teslimi: aynı ZIP hash'i kapsanır, farklı ZIP kapsanmaz", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim({ teslim: { yontem: "abapgit", zip_sha256: H("z") }, paket: "ZPKG" }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    const ag = (zip: string, h: string) =>
      fact({ arac: "axet_abapgit_onay", nesneler: [], arg_hash: H(h), abapgit: { script: "abapgit_deploy", zip_sha256: zip } });
    expect(decide(s, ag(H("z"), "3"), T0, next)).toMatchObject({ karar: "izinli", kaynak: "teslim_izni" });
    expect(decide(s, ag(H("y"), "4"), T0, next).karar).toBe("yerel_mod");
  });

  it("abapGit teslimi ZIP'siz script'te paketle eşleşir", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim({ teslim: { yontem: "abapgit", zip_sha256: H("z") }, paket: "ZPKG" }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    const ag = (paket: string, h: string) =>
      fact({ arac: "axet_abapgit_onay", nesneler: [], arg_hash: H(h), abapgit: { script: "gui_import_zip", paket } });
    expect(decide(s, ag("ZPKG", "3"), T0, next).karar).toBe("izinli");
    expect(decide(s, ag("", "4"), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, ag("ZDIGER", "5"), T0, next).karar).toBe("yerel_mod");
  });
});

describe("üst onay zinciri (abapgit_deploy alt adımları)", () => {
  const ag = (over: Partial<WriteFact> = {}) =>
    fact({ arac: "axet_abapgit_onay", nesneler: [], abapgit: { script: "abapgit_deploy", paket: "ZPKG" }, ...over });

  it("onaylı ebeveynin alt adımı pencere açmaz", () => {
    const s = session();
    const next = ids();
    decide(s, ag({ arg_hash: H("1") }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    decide(s, ag({ arg_hash: H("1") }), T0, next);
    const child = ag({ arg_hash: H("2"), abapgit: { script: "gui_import_zip", paket: "ZPKG" }, ust_onay: "id1" });
    expect(decide(s, child, T0 + 1000, next)).toMatchObject({ karar: "izinli", kaynak: "ust_onay" });
  });

  it("farklı transport, 60 dk sonrası ya da abapGit olmayan ebeveyn geçmez", () => {
    const s = session();
    const next = ids();
    decide(s, ag({ arg_hash: H("1") }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, ag({ arg_hash: H("2"), ust_onay: "id1", transport: "DS4K900002" }), T0, next).karar).toBe("bekliyor");
    expect(decide(s, ag({ arg_hash: H("3"), ust_onay: "id1" }), T0 + UST_ONAY_TTL_MS + 1, next).karar).toBe("bekliyor");
    decide(s, fact({ arg_hash: H("4") }), T0, next);
    const pushId = s.records[s.records.length - 1].id;
    respond(s, pushId, "bu_seferlik", T0);
    expect(decide(s, ag({ arg_hash: H("5"), ust_onay: pushId }), T0, next).karar).toBe("bekliyor");
  });
});

describe("validateFact", () => {
  it("geçerli bilgiyi kabul eder", () => {
    expect(validateFact(fact())).toBe(true);
    expect(validateFact(fact({ transport_bilgi: null, nesneler: [], paket: "ZPKG" }))).toBe(true);
  });

  it("bozuk bilgiyi reddeder", () => {
    expect(validateFact(null)).toBe(false);
    expect(validateFact({ ...fact(), arg_hash: "abc" })).toBe(false);
    expect(validateFact({ ...fact(), arg_hash: H("A") })).toBe(false);
    expect(validateFact({ ...fact(), sinif: "SERBEST" })).toBe(false);
    expect(validateFact({ ...fact(), arac: "" })).toBe(false);
    expect(validateFact({ ...fact(), nesneler: [{ ad: "X" }] })).toBe(false);
    expect(validateFact({ ...fact(), nesneler: [obj({ kaynak_sha256: ["kisa"] })] })).toBe(false);
    expect(validateFact({ ...fact(), transport: 5 })).toBe(false);
    expect(validateFact({ ...fact(), transport_bilgi: { aciklama: "x" } })).toBe(false);
  });
});
