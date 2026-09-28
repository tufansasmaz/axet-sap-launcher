// Görünüm ayarı: palet + koyu/açık (tasarım sistemi temeli, 2026-09-28).
//
// `palette` alanı bu sürümde eklendi; eski `config.json` dosyalarında HİÇ
// yok. Geçersiz bir değer (elle düzenlenmiş dosya, ileride kaldırılmış bir
// palet) doğrudan `<html data-palette>`'e gidiyor ve hiçbir CSS bloğuyla
// eşleşmezse uygulama renksiz açılır — bu yüzden okurken doğrulanıyor.

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
  it("ayar dosyası yoksa Sakin İndigo koyu", async () => {
    const cfg = await load(null);
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("dark");
  });

  it("eski dosyada palet yoksa indigo geliyor, kayıtlı tema korunuyor", async () => {
    const cfg = await load({ theme: "light" });
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("light");
  });

  it("kayıtlı seçim olduğu gibi okunuyor", async () => {
    const cfg = await load({ palette: "warm", theme: "light" });
    expect(cfg.palette).toBe("warm");
    expect(cfg.theme).toBe("light");
  });

  it("geçersiz değerler varsayılana dönüyor", async () => {
    const cfg = await load({ palette: "lime", theme: "blue" });
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("dark");
  });

  it("yanlış tipteki değerler de varsayılana dönüyor", async () => {
    const cfg = await load({ palette: 3, theme: null });
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("dark");
  });
});
