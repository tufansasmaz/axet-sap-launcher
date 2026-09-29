// Kenar çubuğu genişliği ve daraltması (grafit kabuğu, 2026-09-29).
//
// `sidebarWidth` elle düzenlenmiş bir dosyadan saçma bir değerle gelebilir;
// okurken sınırlara kırpılıyor. `sidebarCollapsed` eski `chatSidebarOpen`'ın
// yerini aldı: eski dosyada yalnızca o varsa ondan türetiliyor, ilk kayıtta
// da dosyadan düşüyor.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clampSidebarWidth, readSidebarCollapsed } from "../app-electron/shared/sidebarLayout";

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
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

describe("clampSidebarWidth", () => {
  it("sınırların içindeki değer yuvarlanıp aynen kalıyor", () => {
    expect(clampSidebarWidth(300)).toBe(300);
    expect(clampSidebarWidth(263.6)).toBe(264);
  });

  it("sınırların dışındaki değer kırpılıyor", () => {
    expect(clampSidebarWidth(100)).toBe(220);
    expect(clampSidebarWidth(-5)).toBe(220);
    expect(clampSidebarWidth(999)).toBe(420);
  });

  it("sayı olmayan değer varsayılana dönüyor", () => {
    for (const value of ["300", null, undefined, Number.NaN, Number.POSITIVE_INFINITY, {}]) {
      expect(clampSidebarWidth(value)).toBe(264);
    }
  });
});

describe("readSidebarCollapsed", () => {
  it("yeni alan varsa o geçerli, eski alana bakılmıyor", () => {
    expect(readSidebarCollapsed({ sidebarCollapsed: true })).toBe(true);
    expect(readSidebarCollapsed({ sidebarCollapsed: false, chatSidebarOpen: false })).toBe(false);
  });

  it("yeni alan yoksa eski chatSidebarOpen === false daraltılmış demek", () => {
    expect(readSidebarCollapsed({ chatSidebarOpen: false })).toBe(true);
    expect(readSidebarCollapsed({ chatSidebarOpen: true })).toBe(false);
    expect(readSidebarCollapsed({})).toBe(false);
  });

  it("yanlış tipteki yeni alan yok sayılıyor", () => {
    expect(readSidebarCollapsed({ sidebarCollapsed: "yes" })).toBe(false);
    expect(readSidebarCollapsed({ sidebarCollapsed: 1, chatSidebarOpen: false })).toBe(true);
  });
});

describe("loadConfig: kenar çubuğu", () => {
  it("ayar dosyası yoksa 264px, açık", async () => {
    const cfg = (await store(null)).loadConfig();
    expect(cfg.sidebarWidth).toBe(264);
    expect(cfg.sidebarCollapsed).toBe(false);
  });

  it("kayıtlı genişlik kırpılarak okunuyor, bozuğu varsayılana dönüyor", async () => {
    expect((await store({ sidebarWidth: 1000 })).loadConfig().sidebarWidth).toBe(420);
    vi.resetModules();
    expect((await store({ sidebarWidth: "geniş" })).loadConfig().sidebarWidth).toBe(264);
  });

  it("eski chatSidebarOpen: false daraltılmış açılıyor ve alan config'te yok", async () => {
    const cfg = (await store({ chatSidebarOpen: false })).loadConfig();
    expect(cfg.sidebarCollapsed).toBe(true);
    expect("chatSidebarOpen" in cfg).toBe(false);
  });

  it("ilk kayıtta eski alan dosyadan düşüyor, göç edilen değer yazılıyor", async () => {
    const { saveConfig } = await store({ chatSidebarOpen: false, theme: "dark" });
    saveConfig({ theme: "light" });
    const written = JSON.parse(readFileSync(path.join(userData, "config.json"), "utf-8"));
    expect("chatSidebarOpen" in written).toBe(false);
    expect(written.sidebarCollapsed).toBe(true);
    expect(written.sidebarWidth).toBe(264);
    expect(written.theme).toBe("light");
  });
});
