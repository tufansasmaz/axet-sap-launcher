// Ayarlar denetimi (2026-10-19): kaldırılan alanlar eski dosyadan zararsızca
// düşüyor, eklenen alanlar eski dosyada yokken bugünkü davranışı koruyor.

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

describe("kaldırılan: chatDisplayName (karşılama başlığı 2026-09-29'da kalktı, hiçbir yerde okunmuyor)", () => {
  it("eski dosyadaki değer okunurken yok sayılıyor ve bir sonraki kayıtta düşüyor", async () => {
    const { loadConfig, saveConfig } = await store({ chatDisplayName: "Tufan", language: "en" });
    const cfg = loadConfig() as unknown as Record<string, unknown>;
    expect("chatDisplayName" in cfg).toBe(false);
    expect(cfg.language).toBe("en");
    saveConfig({ theme: "light" });
    const disk = JSON.parse(readFileSync(path.join(userData, "config.json"), "utf-8"));
    expect("chatDisplayName" in disk).toBe(false);
    expect(disk.theme).toBe("light");
  });

  it("yeni kurulumda da alan yok", async () => {
    const { loadConfig } = await store(null);
    expect("chatDisplayName" in (loadConfig() as unknown as Record<string, unknown>)).toBe(false);
  });
});

describe("eklenen: sapConnectOpen (SAP bağlanınca nerede açılsın)", () => {
  it("varsayılan bugünkü davranış: sohbet", async () => {
    const { loadConfig } = await store(null);
    expect(loadConfig().sapConnectOpen).toBe("chat");
  });
  it("eski dosyada yoksa ya da bozuksa sohbet", async () => {
    expect((await store({ language: "tr" })).loadConfig().sapConnectOpen).toBe("chat");
    vi.resetModules();
    expect((await store({ sapConnectOpen: "wt" })).loadConfig().sapConnectOpen).toBe("chat");
  });
  it("terminal ve ask korunuyor", async () => {
    expect((await store({ sapConnectOpen: "terminal" })).loadConfig().sapConnectOpen).toBe("terminal");
    vi.resetModules();
    expect((await store({ sapConnectOpen: "ask" })).loadConfig().sapConnectOpen).toBe("ask");
  });
});

describe("eklenen: agentMemoryDigest (ajan başlangıç bellek özeti)", () => {
  it("varsayılan açık (bugünkü davranış)", async () => {
    expect((await store(null)).loadConfig().agentMemoryDigest).toBe(true);
    vi.resetModules();
    expect((await store({ agentMemoryDigest: "hayır" })).loadConfig().agentMemoryDigest).toBe(true);
  });
  it("kapatılan değer korunuyor", async () => {
    expect((await store({ agentMemoryDigest: false })).loadConfig().agentMemoryDigest).toBe(false);
  });
});

describe("agentMemoryDigest bağlantısı (kaynak düzeyi)", () => {
  it("bildirimcinin özeti ayar kapalıyken boş dize", async () => {
    const { readFileSync: read } = await import("node:fs");
    const main = read(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(main).toMatch(/digest: \(workspaceId, paneId\) =>\s*loadConfig\(\)\.agentMemoryDigest === false \? "" : memoryDigest\(/);
  });
});
