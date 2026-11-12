// Çoklu sistem kaydı (docs/superpowers/specs/2026-11-12-coklu-sistem-design.md).
// Sistem = proje klasörü; sistem başına port, jeton, odak, LRU sınırı.
import { beforeEach, describe, expect, it } from "vitest";
import {
  ADT_DEFAULT_PORT,
  DYNAMIC_PORT_FIRST,
  MAX_SYSTEMS,
  RFC_DEFAULT_PORT,
  adtEnvForCwd,
  allSystemTokens,
  allocatePort,
  focusSystem,
  focusedSystem,
  getSystem,
  listSystems,
  pickEviction,
  removeSystem,
  resetSystemsForTest,
  setSystemAdtPort,
  systemForCwd,
  touchSystem,
  upsertSystem
} from "../app-electron/main/sapSystems";

const ident = (sid: string) => ({ uuid: `u-${sid}`, systemId: sid, client: "100", user: "DEV1", tier: "DEV" as const });

beforeEach(() => resetSystemsForTest());

describe("kayıt", () => {
  it("ilk sistem 8787'yi alıyor; ikinci sistem 8787'yi ALMIYOR (dinamik aralık)", async () => {
    const a = upsertSystem("C:\\p\\A", ident("AAA"));
    const portA = await allocatePort(ADT_DEFAULT_PORT, "adt", a.projectDir, { isFree: async () => true });
    setSystemAdtPort(a.projectDir, portA);
    const b = upsertSystem("C:\\p\\B", ident("BBB"));
    const portB = await allocatePort(ADT_DEFAULT_PORT, "adt", b.projectDir, { isFree: async () => true });
    expect(portA).toBe(8787);
    expect(portB).toBeGreaterThanOrEqual(DYNAMIC_PORT_FIRST);
    expect(portB).not.toBe(RFC_DEFAULT_PORT);
  });

  it("dinamik aralıkta dolu port atlanıyor", async () => {
    upsertSystem("C:\\p\\A", ident("AAA"));
    setSystemAdtPort("C:\\p\\A", 8787);
    const busy = new Set([DYNAMIC_PORT_FIRST, DYNAMIC_PORT_FIRST + 1]);
    const port = await allocatePort(ADT_DEFAULT_PORT, "adt", "C:\\p\\B", { isFree: async (p) => !busy.has(p) });
    expect(port).toBe(DYNAMIC_PORT_FIRST + 2);
  });

  it("varsayılan port için boşluk DENENMİYOR (eski sunucuyu sahiplik kanıtı mantığı ele alıyor)", async () => {
    const port = await allocatePort(ADT_DEFAULT_PORT, "adt", "C:\\p\\A", { isFree: async () => false });
    expect(port).toBe(ADT_DEFAULT_PORT);
  });

  it("avoidPreferred: varsayılan yabancı süreçteyse doğrudan dinamik", async () => {
    const port = await allocatePort(ADT_DEFAULT_PORT, "adt", "C:\\p\\A", { isFree: async () => true, avoidPreferred: true });
    expect(port).toBe(DYNAMIC_PORT_FIRST);
  });

  it("aynı klasöre yeniden bağlanmak jetonu ve portu KORUYOR (açık bölmeler kopmasın)", async () => {
    const a1 = upsertSystem("C:\\p\\A", ident("AAA"));
    setSystemAdtPort(a1.projectDir, 8787);
    const a2 = upsertSystem("c:\\p\\a\\", { ...ident("AAA"), client: "200" });
    expect(a2.token).toBe(a1.token);
    expect(a2.adtPort).toBe(8787);
    expect(a2.client).toBe("200");
    expect(listSystems()).toHaveLength(1);
  });

  it("her sistemin jetonu farklı ve en az 43 karakter", () => {
    const a = upsertSystem("C:\\p\\A", ident("AAA"));
    const b = upsertSystem("C:\\p\\B", ident("BBB"));
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43);
    expect(allSystemTokens().sort()).toEqual([a.token, b.token].sort());
  });

  it("kayıttaki portu kendi sistemi yeniden alabiliyor", async () => {
    upsertSystem("C:\\p\\A", ident("AAA"));
    setSystemAdtPort("C:\\p\\A", 8805);
    expect(await allocatePort(ADT_DEFAULT_PORT, "adt", "C:\\p\\A", { isFree: async () => false })).toBe(8805);
  });
});

describe("cwd → sistem", () => {
  it("alt klasör de sistemine ait; en uzun eşleşme kazanıyor", () => {
    upsertSystem("C:\\p\\A", ident("AAA"));
    upsertSystem("C:\\p\\A\\alt", ident("SUB"));
    expect(systemForCwd("C:\\p\\A\\src")?.systemId).toBe("AAA");
    expect(systemForCwd("C:\\p\\A\\alt\\x")?.systemId).toBe("SUB");
    expect(systemForCwd("C:\\p\\AB")).toBeNull();
  });

  it("ortam: cwd'nin sistemi; değilse odaktaki; hiçbiri yoksa null", () => {
    expect(adtEnvForCwd("C:\\x")).toBeNull();
    const a = upsertSystem("C:\\p\\A", ident("AAA"));
    setSystemAdtPort(a.projectDir, 8787);
    const b = upsertSystem("C:\\p\\B", ident("BBB"));
    setSystemAdtPort(b.projectDir, 8800);
    focusSystem(a.projectDir);
    expect(adtEnvForCwd("C:\\p\\B")).toEqual({ ABAP_HTTP_TOKEN: b.token, ABAP_HTTP_URL: "http://127.0.0.1:8800", ABAP_HTTP_PORT: "8800" });
    expect(adtEnvForCwd("C:\\baska")?.ABAP_HTTP_TOKEN).toBe(a.token);
  });

  it("portu henüz olmayan sistem ortam vermiyor", () => {
    upsertSystem("C:\\p\\A", ident("AAA"));
    expect(adtEnvForCwd("C:\\p\\A")).toBeNull();
  });
});

describe("odak ve sınır", () => {
  it("son bağlanan odakta; odaktaki kesilince bir sonraki en yeni sisteme geçiyor", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 1);
    upsertSystem("C:\\p\\B", ident("BBB"), 2);
    expect(focusedSystem()?.systemId).toBe("BBB");
    removeSystem("C:\\p\\B");
    expect(focusedSystem()?.systemId).toBe("AAA");
    expect(getSystem("C:\\p\\B")).toBeNull();
  });

  it(`sınır ${MAX_SYSTEMS}: yeni sistem gelince en uzun süredir kullanılmayan seçiliyor`, () => {
    expect(MAX_SYSTEMS).toBe(4);
    for (const [i, s] of ["A", "B", "C", "D"].entries()) upsertSystem(`C:\\p\\${s}`, ident(s), 10 + i);
    touchSystem("C:\\p\\A", 100);
    expect(pickEviction("C:\\p\\E")?.systemId).toBe("B");
    // Zaten kayıtlı klasöre yeniden bağlanmak kimseyi düşürmüyor.
    expect(pickEviction("C:\\p\\C")).toBeNull();
  });

  it("sınırın altında kimse düşmüyor", () => {
    upsertSystem("C:\\p\\A", ident("A"));
    expect(pickEviction("C:\\p\\B")).toBeNull();
  });
});
