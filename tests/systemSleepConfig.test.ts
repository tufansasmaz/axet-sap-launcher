// Boştaki sistemi uyutma ayarı: eski dosyada yokken 30 dk, 0 = kapalı, bozuk değer varsayılan.
// index.ts zamanlayıcıyı, etkinlik dinleyicisini ve uyandırıcıyı bağlıyor.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let userData = "";
vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr", getVersion: () => "1.0.0" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-"));
  vi.resetModules();
});

async function store(raw: Record<string, unknown> | null) {
  if (raw) writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  return import("../app-electron/main/store");
}

describe("systemIdleSleepMinutes", () => {
  it("yokken 30, 0 korunur, bozuk değer 30", async () => {
    expect((await store(null)).loadConfig().systemIdleSleepMinutes).toBe(30);
    vi.resetModules();
    expect((await store({ systemIdleSleepMinutes: 0 })).loadConfig().systemIdleSleepMinutes).toBe(0);
    vi.resetModules();
    expect((await store({ systemIdleSleepMinutes: 13 })).loadConfig().systemIdleSleepMinutes).toBe(30);
  });

  it("index.ts uyutma döngüsünü, ADT etkinliğini ve uyandırmayı bağlıyor", () => {
    const main = readFileSync(path.join(__dirname, "../app-electron/main/index.ts"), "utf-8");
    expect(main).toContain("sleepIdleSystems(");
    expect(main).toContain("setAdtActivityListener(");
    expect(main).toContain("setSystemWakeHandler(");
    expect(main).toContain("normalizeSystemSleepMinutes(loadConfig().systemIdleSleepMinutes)");
  });
});
