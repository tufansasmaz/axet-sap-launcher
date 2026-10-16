// Bir yazma hatası günlüğü KALICI susturmamalı (spec §11): disk bir an dolu
// ya da dosya kilitli olabilir; sonraki satırlar yine denenmeli.
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "C:/tmp-userdata" } }));
const fs = vi.hoisted(() => ({ calls: 0, failFirst: true, mkdirCalls: 0, mkdirFails: 0 }));
vi.mock("node:fs", async (orig) => ({
  ...(await orig<typeof import("node:fs")>()),
  mkdirSync: () => {
    fs.mkdirCalls++;
    if (fs.mkdirFails > 0) {
      fs.mkdirFails--;
      throw new Error("ENOSPC");
    }
  },
  statSync: () => ({ size: 0 }),
  appendFileSync: () => {
    fs.calls++;
    if (fs.failFirst && fs.calls === 1) throw new Error("EBUSY");
  }
}));

const { appLog } = await import("../app-electron/main/appLog");

describe("appLog", () => {
  it("ilk yazma hatasından sonra da yazmayı deniyor", () => {
    appLog("a");
    appLog("b");
    expect(fs.calls).toBe(2);
  });
});

// Klasör kurulamadıysa (disk dolu) her satır yeniden mkdirSync denemesin:
// 30 sn bekleniyor, sonra yeniden deneniyor — kalıcı susma yok.
describe("appLog klasör hatası", () => {
  afterEach(() => {
    vi.useRealTimers();
    fs.mkdirFails = 0;
  });

  it("mkdirSync hatası kalıcı değil: bekleme sonrası sonraki appLog yeniden deniyor ve yazıyor", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T10:00:00Z"));
    vi.resetModules();
    const fresh = await import("../app-electron/main/appLog");
    fs.calls = 0;
    fs.failFirst = false;
    fs.mkdirCalls = 0;
    fs.mkdirFails = 1;
    fresh.appLog("a");
    expect(fs.mkdirCalls).toBe(1);
    expect(fs.calls).toBe(0);
    vi.setSystemTime(new Date("2026-10-16T10:00:31Z"));
    fresh.appLog("b");
    expect(fs.mkdirCalls).toBe(2);
    expect(fs.calls).toBe(1);
  });

  it("hatadan sonraki 30 sn içinde mkdirSync her satırda denenmiyor", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T10:00:00Z"));
    vi.resetModules();
    const fresh = await import("../app-electron/main/appLog");
    fs.calls = 0;
    fs.failFirst = false;
    fs.mkdirCalls = 0;
    fs.mkdirFails = 100;
    for (let i = 0; i < 10; i++) fresh.appLog("dolu");
    expect(fs.mkdirCalls).toBe(1);
    vi.setSystemTime(new Date("2026-10-16T10:00:29Z"));
    fresh.appLog("dolu");
    expect(fs.mkdirCalls).toBe(1);
    vi.setSystemTime(new Date("2026-10-16T10:00:30Z"));
    fresh.appLog("dolu");
    expect(fs.mkdirCalls).toBe(2);
  });
});
