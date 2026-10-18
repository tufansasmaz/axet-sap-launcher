// Ekran görüntüsü dosyası (spec 2026-10-18 tarayici §3, §5) — gerçek geçici klasörle.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { removeBrowserScreenshot, writeBrowserScreenshot } from "../app-electron/main/browserFiles";

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
