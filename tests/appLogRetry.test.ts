// Bir yazma hatası günlüğü KALICI susturmamalı (spec §11): disk bir an dolu
// ya da dosya kilitli olabilir; sonraki satırlar yine denenmeli.
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "C:/tmp-userdata" } }));
const fs = vi.hoisted(() => ({ calls: 0, failFirst: true }));
vi.mock("node:fs", async (orig) => ({
  ...(await orig<typeof import("node:fs")>()),
  mkdirSync: () => undefined,
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
