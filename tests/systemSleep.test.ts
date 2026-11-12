// Boştaki sistemi uyutma (kucukler-3 madde 1). Uzun süre ADT isteği almayan,
// bağlı bölmesi ve bekleyen onayı olmayan sistemin ADT sunucusu + RFC köprüsü
// kapanıyor; kayıt "uyuyor" olarak kalıyor; ilk istekte/odakta aynı port ve
// YENİ jetonla geri açılıyor.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adtEnvForCwd,
  getSystem,
  markSystemSleeping,
  resetSystemsForTest,
  setSystemAdtPort,
  setSystemWakeHandler,
  upsertSystem
} from "../app-electron/main/sapSystems";
import { pickSleepers, sleepIdleSystems } from "../app-electron/main/systemSleep";
import { SYSTEM_SLEEP_DEFAULT, SYSTEM_SLEEP_OPTIONS, normalizeSystemSleepMinutes } from "../app-electron/shared/systemSleep";
import { isAdtActivity } from "../app-electron/main/adtReadonlyServerManager";

const ident = (sid: string) => ({ uuid: `u-${sid}`, systemId: sid, client: "100", user: "DEV1", tier: "DEV" as const });
const MIN = 60_000;

beforeEach(() => {
  resetSystemsForTest();
  setSystemWakeHandler(null);
});

describe("ayar", () => {
  it("varsayılan 30 dk, 0 = kapalı, bozuk değer varsayılana döner", () => {
    expect(SYSTEM_SLEEP_DEFAULT).toBe(30);
    expect(SYSTEM_SLEEP_OPTIONS).toContain(0);
    expect(normalizeSystemSleepMinutes(0)).toBe(0);
    expect(normalizeSystemSleepMinutes(60)).toBe(60);
    expect(normalizeSystemSleepMinutes(7)).toBe(30);
    expect(normalizeSystemSleepMinutes("30")).toBe(30);
  });
});

describe("pickSleepers", () => {
  const deps = (over: Partial<Parameters<typeof pickSleepers>[0]> = {}) => ({
    now: 100 * MIN,
    idleMinutes: 30,
    hasOpenPane: () => false,
    hasPendingApproval: () => false,
    ...over
  });

  it("eşiği aşan, sunucusu açık, bölmesiz sistemi seçer; tazesini seçmez", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 10 * MIN);
    setSystemAdtPort("C:\\p\\A", 8787);
    upsertSystem("C:\\p\\B", ident("BBB"), 90 * MIN);
    setSystemAdtPort("C:\\p\\B", 8800);
    expect(pickSleepers(deps()).map((s) => s.systemId)).toEqual(["AAA"]);
  });

  it("kapalı ayar (0) hiçbir şey seçmez", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 0);
    setSystemAdtPort("C:\\p\\A", 8787);
    expect(pickSleepers(deps({ idleMinutes: 0 }))).toEqual([]);
  });

  it("bağlı bölmesi olan sistem ASLA uyumaz", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 0);
    setSystemAdtPort("C:\\p\\A", 8787);
    expect(pickSleepers(deps({ hasOpenPane: (d) => d === "C:\\p\\A" }))).toEqual([]);
  });

  it("onay bekleyen sistem uyumaz", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 0);
    setSystemAdtPort("C:\\p\\A", 8787);
    expect(pickSleepers(deps({ hasPendingApproval: () => true }))).toEqual([]);
  });

  it("zaten uyuyan ya da sunucusu hiç açılmamış sistem tekrar seçilmez", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 0);
    setSystemAdtPort("C:\\p\\A", 8787);
    markSystemSleeping("C:\\p\\A");
    upsertSystem("C:\\p\\B", ident("BBB"), 0);
    expect(pickSleepers(deps())).toEqual([]);
  });
});

describe("uyutma ve uyandırma", () => {
  it("sleepIdleSystems sunucuları durdurur, kaydı ve portu korur", () => {
    upsertSystem("C:\\p\\A", ident("AAA"), 0);
    setSystemAdtPort("C:\\p\\A", 8787);
    const stop = vi.fn();
    const slept = sleepIdleSystems({ now: 100 * MIN, idleMinutes: 30, hasOpenPane: () => false, hasPendingApproval: () => false, stopServers: stop });
    expect(slept).toEqual(["C:\\p\\A"]);
    expect(stop).toHaveBeenCalledWith("C:\\p\\A");
    const rec = getSystem("C:\\p\\A")!;
    expect(rec.sleeping).toBe(true);
    expect(rec.adtPort).toBe(8787);
  });

  it("uyuyan sisteme ilk istek: aynı port, YENİ jeton, uyandırıcı bir kez çağrılır", () => {
    const a = upsertSystem("C:\\p\\A", ident("AAA"));
    setSystemAdtPort(a.projectDir, 8787);
    const oldToken = a.token;
    markSystemSleeping(a.projectDir);
    const wake = vi.fn();
    setSystemWakeHandler(wake);
    const env = adtEnvForCwd("C:\\p\\A\\alt");
    expect(env?.ABAP_HTTP_PORT).toBe("8787");
    expect(env?.ABAP_HTTP_TOKEN).not.toBe(oldToken);
    expect(getSystem(a.projectDir)!.sleeping).toBe(false);
    expect(wake).toHaveBeenCalledTimes(1);
    expect(wake.mock.calls[0][0].token).toBe(env?.ABAP_HTTP_TOKEN);
    adtEnvForCwd("C:\\p\\A");
    expect(wake).toHaveBeenCalledTimes(1);
  });
});

describe("ADT isteği izi", () => {
  it("motorun istek başına yazdığı [adt-audit] satırı etkinlik sayılır, başka çıktı sayılmaz", () => {
    expect(isAdtActivity('[adt-audit] {"event": "call", "tool": "adt_sql"}\n')).toBe(true);
    expect(isAdtActivity("[adt-gated] onaylı yüzey: 68 araç\n")).toBe(false);
  });
});

describe("bağlı bölme", () => {
  it("klasörün kendisi ya da altındaki bölme/tur sistemi bağlı tutar; benzer adlı kardeş klasör tutmaz", async () => {
    const { anyCwdUnder } = await import("../app-electron/main/systemSleep");
    expect(anyCwdUnder(["c:/p/a/alt"], "C:\\p\\A")).toBe(true);
    expect(anyCwdUnder(["C:\\p\\A"], "C:\\p\\A\\")).toBe(true);
    expect(anyCwdUnder(["C:\\p\\AB"], "C:\\p\\A")).toBe(false);
    expect(anyCwdUnder([], "C:\\p\\A")).toBe(false);
  });
});
