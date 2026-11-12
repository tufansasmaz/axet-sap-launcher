// Ayar dosyasi kaybi (kararlilik-2 R8e).
//
// Olcum (kod): `saveConfig` config.json'u yerinde yaziyordu (writeFileSync).
// Yazma sirasinda uygulama oldurulurse (guncelleyici, cokme, elektrik) dosya
// yarim kaliyor; `loadConfig` bozuk dosyada sessizce varsayilanlari donuyor ve
// ILK kayit (kenar cubugu genisligi bile) varsayilanlari diske yazip butun
// ayarlari - sistem kademeleri, ekipler, notlar, kimlik bilgileri - siliyordu.
// Duzeltme: once gecici dosyaya yaz, sonra yer degistir; bozuk dosya
// okunamazsa uzerine yazilmadan once yedegi aliniyor.

import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-dur-"));
  vi.resetModules();
});

describe("config.json dayanikliligi", () => {
  it("bozuk dosya uzerine yazilmadan once yedeklenir", async () => {
    const broken = '{"systemTiers":{"u1":"PRD"},"sidebarWidth":3';
    writeFileSync(path.join(userData, "config.json"), broken);
    const { loadConfig, saveConfig } = await import("../app-electron/main/store");
    loadConfig();
    saveConfig({ sidebarWidth: 300 });
    const backups = readdirSync(userData).filter((f) => f.startsWith("config.json.bozuk-"));
    expect(backups).toHaveLength(1);
    expect(readFileSync(path.join(userData, backups[0]), "utf-8")).toBe(broken);
  });

  it("ayni bozuk dosya icin tek yedek alinir", async () => {
    writeFileSync(path.join(userData, "config.json"), "{yarim");
    const { loadConfig } = await import("../app-electron/main/store");
    loadConfig();
    loadConfig();
    loadConfig();
    expect(readdirSync(userData).filter((f) => f.startsWith("config.json.bozuk-"))).toHaveLength(1);
  });

  it("kayit atomik: gecici dosya kalmaz, icerik tam", async () => {
    const { saveConfig, loadConfig } = await import("../app-electron/main/store");
    saveConfig({ sidebarWidth: 321 });
    expect(readdirSync(userData).filter((f) => f.includes(".tmp"))).toEqual([]);
    expect(JSON.parse(readFileSync(path.join(userData, "config.json"), "utf-8")).sidebarWidth).toBe(321);
    expect(loadConfig().sidebarWidth).toBe(321);
  });

  it("saglam dosyada yedek alinmaz", async () => {
    writeFileSync(path.join(userData, "config.json"), JSON.stringify({ sidebarWidth: 280 }));
    const { loadConfig } = await import("../app-electron/main/store");
    loadConfig();
    expect(existsSync(path.join(userData, "config.json"))).toBe(true);
    expect(readdirSync(userData).some((f) => f.startsWith("config.json.bozuk-"))).toBe(false);
  });
});
