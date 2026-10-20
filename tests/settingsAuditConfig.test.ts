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

describe("eklenen (Tur 7): lider ekip ayarları", () => {
  it("varsayılan: ekip kurabilir, onay kapalı, sınır 4", async () => {
    const cfg = (await store(null)).loadConfig();
    expect([cfg.leadTeam, cfg.leadApproval, cfg.leadMaxAgents]).toEqual([true, false, 4]);
  });
  it("kayıtlı değerler korunuyor, bozuk değer varsayılana", async () => {
    const cfg = (await store({ leadTeam: false, leadApproval: true, leadMaxAgents: 2 })).loadConfig();
    expect([cfg.leadTeam, cfg.leadApproval, cfg.leadMaxAgents]).toEqual([false, true, 2]);
    vi.resetModules();
    const bad = (await store({ leadTeam: "hayir", leadApproval: "evet", leadMaxAgents: 99 })).loadConfig();
    expect([bad.leadTeam, bad.leadApproval, bad.leadMaxAgents]).toEqual([true, false, 4]);
  });
  it("ana süreç: Lider'e yöneticilik rehberi, öteki ekip üyelerine ekip ipucu (kaynak düzeyi)", async () => {
    const { readFileSync: read } = await import("node:fs");
    const main = read(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8").replace(/\r\n/g, "\n");
    // Tur 10: karar saf agentHintFor'da (tests/leadTur10.test.ts); her lider mesajında.
    expect(main).toMatch(/lead: Boolean\(pane\?\.agent && isLeadRole\(pane\.agent\.role\) && !pane\.agent\.spawnedBy\)/);
    expect(main).toMatch(/first: !teamHinted\.has\(key\)/);
    expect(main).toContain("canSpawn: cfg.leadTeam !== false");
    expect(main).toContain('lead: (caller, args) => teamLead.handle(caller, args)');
  });
});

describe("eklenen (Tur 9): ajan hatası ayarları", () => {
  it("varsayılan: otomatik deneme açık, 3 deneme, axet-code için 2 eşzamanlı, takılma 10 dk", async () => {
    const cfg = (await store(null)).loadConfig();
    expect([cfg.agentAutoRetry, cfg.agentRetryMax, cfg.agentConcurrency, cfg.leadStallMinutes]).toEqual([true, 3, 2, 10]);
  });
  it("kayıtlı değerler korunuyor, bozuk değer varsayılana", async () => {
    const cfg = (await store({ agentAutoRetry: false, agentRetryMax: 5, agentConcurrency: 0, leadStallMinutes: 0 })).loadConfig();
    expect([cfg.agentAutoRetry, cfg.agentRetryMax, cfg.agentConcurrency, cfg.leadStallMinutes]).toEqual([false, 5, 0, 0]);
    vi.resetModules();
    const bad = (await store({ agentAutoRetry: "hayir", agentRetryMax: 0, agentConcurrency: 99, leadStallMinutes: 7 })).loadConfig();
    expect([bad.agentAutoRetry, bad.agentRetryMax, bad.agentConcurrency, bad.leadStallMinutes]).toEqual([true, 3, 2, 10]);
  });
  it("ana süreç: izleyiciye yeniden deneme ayarı, kapı ve lidere bilgi bağlı (kaynak düzeyi)", async () => {
    const { readFileSync: read } = await import("node:fs");
    const main = read(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(main).toContain("auto: cfg.agentAutoRetry !== false, max: cfg.agentRetryMax");
    expect(main).toContain("onFinalError: (reg, status) => teamLead.onAgentError(reg.workspaceId, reg.paneId, status)");
    expect(main).toContain('engine === "axet-code" ? loadConfig().agentConcurrency : 0');
    expect(main).toContain("stallMs: cfg.leadStallMinutes * 60_000");
  });
});

describe("eklenen (Tur 8): axet-code açılış seçimi", () => {
  it("varsayılan: otomatik açık, aXet.Code, model boş (son kullanılan)", async () => {
    const cfg = (await store(null)).loadConfig();
    expect([cfg.axetAutoSetup, cfg.axetAutoTool, cfg.axetAutoModel]).toEqual([true, "axet", ""]);
  });
  it("kayıtlı değerler korunuyor, bozuk değer varsayılana", async () => {
    const cfg = (await store({ axetAutoSetup: false, axetAutoTool: "codex", axetAutoModel: "Claude Sonnet 4.6" })).loadConfig();
    expect([cfg.axetAutoSetup, cfg.axetAutoTool, cfg.axetAutoModel]).toEqual([false, "codex", "Claude Sonnet 4.6"]);
    vi.resetModules();
    const bad = (await store({ axetAutoSetup: "hayir", axetAutoTool: "vim", axetAutoModel: "a & del" })).loadConfig();
    expect([bad.axetAutoSetup, bad.axetAutoTool, bad.axetAutoModel]).toEqual([true, "axet", ""]);
  });
  it("ana süreç izleyiciye ayarı veriyor, kapalıyken null (kaynak düzeyi)", async () => {
    const { readFileSync: read } = await import("node:fs");
    const main = read(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(main).toMatch(/axetAutoSetup: \(\) => axetAutoSetupPrefs\(loadConfig\(\)\)/);
    expect(main).toContain('mainWindow.webContents.send("agents:autoSetup"');
  });
});

describe("Tur 10: memoryAutoCapture (konuşmadan belleğe otomatik not)", () => {
  it("varsayılan açık; yalnız false kapatıyor", async () => {
    expect((await store(null)).loadConfig().memoryAutoCapture).toBe(true);
    expect((await store({ memoryAutoCapture: "hayır" })).loadConfig().memoryAutoCapture).toBe(true);
    expect((await store({ memoryAutoCapture: false })).loadConfig().memoryAutoCapture).toBe(false);
  });
});
