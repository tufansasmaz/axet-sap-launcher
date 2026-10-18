// Ekran görüntüsü dosyası (spec 2026-10-18 tarayici §3, §5) — gerçek geçici klasörle.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { removeBrowserScreenshot, writeBrowserScreenshot } from "../app-electron/main/browserFiles";
import { insideRootReal } from "../app-electron/main/changesFs";

// Gerçek insideRootReal; yalnız "mkdir'den sonra dışarıya döndü" yarışını kurmak için tek seferlik cevap.
vi.mock("../app-electron/main/changesFs", async (importOriginal) => {
  const real = await importOriginal<typeof import("../app-electron/main/changesFs")>();
  return { ...real, insideRootReal: vi.fn(real.insideRootReal) };
});

const NOW = new Date(2026, 9, 18, 14, 0, 0);
const dirs: string[] = [];
const temp = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ntt-tarayici-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("writeBrowserScreenshot", () => {
  it("klasörü yaratıp yazıyor; aynı saniyede ikincisi -2 alıyor, ilki ezilmiyor", () => {
    const root = temp();
    expect(writeBrowserScreenshot(root, new Uint8Array([1, 2]), NOW)).toEqual({ ok: true, rel: ".ntt-studio/tarayici/20261018-140000.png" });
    expect(writeBrowserScreenshot(root, new Uint8Array([3]), NOW)).toEqual({ ok: true, rel: ".ntt-studio/tarayici/20261018-140000-2.png" });
    const dir = path.join(root, ".ntt-studio", "tarayici");
    expect([...readFileSync(path.join(dir, "20261018-140000.png"))]).toEqual([1, 2]);
    expect([...readFileSync(path.join(dir, "20261018-140000-2.png"))]).toEqual([3]);
  });

  it("kök yok ya da dosya: noRoot", () => {
    const root = temp();
    expect(writeBrowserScreenshot(path.join(root, "yok"), new Uint8Array([1]), NOW)).toEqual({ ok: false, reason: "noRoot" });
    const file = path.join(root, "dosya.txt");
    writeFileSync(file, "x");
    expect(writeBrowserScreenshot(file, new Uint8Array([1]), NOW)).toEqual({ ok: false, reason: "noRoot" });
  });

  it("20 ad doluysa writeFailed (üstüne yazmıyor)", () => {
    const root = temp();
    for (let i = 0; i < 20; i += 1) expect(writeBrowserScreenshot(root, new Uint8Array([i]), NOW).ok).toBe(true);
    expect(writeBrowserScreenshot(root, new Uint8Array([99]), NOW)).toEqual({ ok: false, reason: "writeFailed" });
    expect([...readFileSync(path.join(root, ".ntt-studio", "tarayici", "20261018-140000.png"))]).toEqual([0]);
  });

  it(".ntt-studio kök dışını gösteren bir bağsa yazılmıyor", (ctx) => {
    const root = temp();
    const outside = temp();
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio"), "junction");
    } catch {
      ctx.skip();
    }
    expect(writeBrowserScreenshot(root, new Uint8Array([1]), NOW)).toEqual({ ok: false, reason: "writeFailed" });
    expect(readdirSync(outside)).toEqual([]);
  });
});

describe("removeBrowserScreenshot", () => {
  it("yazdığımızı siliyor; tarayıcı klasörü dışındaki ya da güvensiz yola dokunmuyor", () => {
    const root = temp();
    const written = writeBrowserScreenshot(root, new Uint8Array([1]), NOW);
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    removeBrowserScreenshot(root, written.rel);
    expect(existsSync(path.join(root, ".ntt-studio", "tarayici", "20261018-140000.png"))).toBe(false);
    writeFileSync(path.join(root, "a.txt"), "x");
    removeBrowserScreenshot(root, "a.txt");
    removeBrowserScreenshot(root, "../a.txt");
    expect(existsSync(path.join(root, "a.txt"))).toBe(true);
    mkdirSync(path.join(root, ".ntt-studio", "tarayici"), { recursive: true });
    expect(() => removeBrowserScreenshot(root, ".ntt-studio/tarayici/yok.png")).not.toThrow();
  });
});

describe("fix round 1: kilitler", () => {
  it("mkdir'den sonra yol dışarıyı gösterirse (yarış) yazılmıyor", () => {
    const root = temp();
    vi.mocked(insideRootReal).mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(writeBrowserScreenshot(root, new Uint8Array([1]), NOW)).toEqual({ ok: false, reason: "writeFailed" });
    expect(readdirSync(path.join(root, ".ntt-studio", "tarayici"))).toEqual([]);
  });

  it("silme: tarayici klasörü dışarıyı gösteren bir bağsa dış dosyaya dokunmuyor", (ctx) => {
    const root = temp();
    const outside = temp();
    writeFileSync(path.join(outside, "20261018-140000.png"), "x");
    mkdirSync(path.join(root, ".ntt-studio"));
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio", "tarayici"), "junction");
    } catch {
      ctx.skip();
    }
    removeBrowserScreenshot(root, ".ntt-studio/tarayici/20261018-140000.png");
    expect(existsSync(path.join(outside, "20261018-140000.png"))).toBe(true);
  });

  it("silme: alt klasördeki ya da .png olmayan dosyaya dokunmuyor", () => {
    const root = temp();
    const dir = path.join(root, ".ntt-studio", "tarayici");
    mkdirSync(path.join(dir, "alt"), { recursive: true });
    writeFileSync(path.join(dir, "alt", "a.png"), "x");
    writeFileSync(path.join(dir, "a.txt"), "x");
    removeBrowserScreenshot(root, ".ntt-studio/tarayici/alt/a.png");
    removeBrowserScreenshot(root, ".ntt-studio/tarayici/a.txt");
    expect(existsSync(path.join(dir, "alt", "a.png"))).toBe(true);
    expect(existsSync(path.join(dir, "a.txt"))).toBe(true);
  });
});
