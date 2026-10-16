// Görünüm ayarı: vurgu + koyu/açık (grafit kimlik, 2026-09-29).
//
// `palette` alanı tasarim/temel dalında eklendi ve orada `"indigo" | "warm"`
// idi; o dal hiç yayımlanmadı ama geliştirme makinelerindeki ayar
// dosyalarında bu değerler olabilir. Geçersiz bir değer doğrudan
// `<html data-palette>`'e gidiyor ve hiçbir CSS bloğuyla eşleşmezse uygulama
// renksiz açılır — bu yüzden okurken doğrulanıyor.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-"));
  vi.resetModules();
});

async function load(raw: Record<string, unknown> | null) {
  if (raw) writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  const { loadConfig } = await import("../app-electron/main/store");
  return loadConfig();
}

describe("görünüm ayarı", () => {
  it("ayar dosyası yoksa Amber koyu", async () => {
    const cfg = await load(null);
    expect(cfg.palette).toBe("amber");
    expect(cfg.theme).toBe("dark");
  });

  it("eski dosyada palet yoksa amber geliyor, kayıtlı tema korunuyor", async () => {
    const cfg = await load({ theme: "light" });
    expect(cfg.palette).toBe("amber");
    expect(cfg.theme).toBe("light");
  });

  it("kayıtlı seçim olduğu gibi okunuyor", async () => {
    for (const palette of ["ntt", "indigo", "amber", "graphite"]) {
      vi.resetModules();
      const cfg = await load({ palette, theme: "light" });
      expect(cfg.palette).toBe(palette);
      expect(cfg.theme).toBe("light");
    }
  });

  it("tasarim/temel'in warm'ı amber oluyor", async () => {
    const cfg = await load({ palette: "warm", theme: "dark" });
    expect(cfg.palette).toBe("amber");
  });

  it("geçersiz değerler varsayılana dönüyor", async () => {
    const cfg = await load({ palette: "lime", theme: "blue" });
    expect(cfg.palette).toBe("amber");
    expect(cfg.theme).toBe("dark");
  });

  it("yanlış tipteki değerler de varsayılana dönüyor", async () => {
    const cfg = await load({ palette: 3, theme: null });
    expect(cfg.palette).toBe("amber");
    expect(cfg.theme).toBe("dark");
  });
});

describe("previousProjectsBaseDirs", () => {
  async function save(partial: Record<string, unknown>) {
    const { saveConfig } = await import("../app-electron/main/store");
    return saveConfig(partial as never);
  }

  it("projectsBaseDir değişince eski değer listeye ekleniyor", async () => {
    const cfg1 = await load({ projectsBaseDir: "/eski/yol" });
    expect(cfg1.previousProjectsBaseDirs).toEqual([]);
    vi.resetModules();
    const cfg2 = await save({ projectsBaseDir: "/yeni/yol" });
    expect(cfg2.previousProjectsBaseDirs).toContain("/eski/yol");
    expect(cfg2.projectsBaseDir).toBe("/yeni/yol");
  });

  it("aynı değere yazılırsa liste değişmiyor", async () => {
    await load({ projectsBaseDir: "/yol", previousProjectsBaseDirs: ["/onceki"] });
    vi.resetModules();
    const cfg = await save({ projectsBaseDir: "/yol" });
    expect(cfg.previousProjectsBaseDirs).toEqual(["/onceki"]);
  });

  it("tekrarlı değerler listeye bir kez giriyor; en fazla 5", async () => {
    await load({ projectsBaseDir: "/p6", previousProjectsBaseDirs: ["/p5", "/p4", "/p3", "/p2", "/p1"] });
    vi.resetModules();
    const cfg = await save({ projectsBaseDir: "/p7" });
    // "/p6" eklendi ama liste en fazla 5 → "/p1" düştü
    expect(cfg.previousProjectsBaseDirs?.length).toBe(5);
    expect(cfg.previousProjectsBaseDirs?.[0]).toBe("/p6");
    expect(cfg.previousProjectsBaseDirs).not.toContain("/p1");
  });
});
