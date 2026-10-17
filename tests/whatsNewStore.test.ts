// loadConfig whatsNewSeenVersion sentinel testleri.
// Sidebarconfig.test.ts'den alınan mkdtemp/vi.resetModules patterniyle.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let userData = "";

vi.mock("electron", () => ({
  app: {
    getPath: () => userData,
    getLocale: () => "tr",
    getVersion: () => "1.8.3"
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: vi.fn(),
    decryptString: vi.fn()
  }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "whats-new-store-"));
  vi.resetModules();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

async function loadStore(raw: Record<string, unknown> | null) {
  if (raw !== null) {
    writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  }
  // vi.resetModules() önden çağrıldığı için her import taze modülü yükler.
  return import("../app-electron/main/store");
}

describe("loadConfig — whatsNewSeenVersion sentinel", () => {
  it("dosya yoksa (ilk kurulum) defaultConfig → app.getVersion() ile eşleşir", async () => {
    const { loadConfig } = await loadStore(null);
    const cfg = loadConfig();
    // electron mock getVersion() "1.8.3" döndürüyor.
    expect(cfg.whatsNewSeenVersion).toBe("1.8.3");
  });

  it("dosya var ama alan eksikse '0' sentinel yazar", async () => {
    const { loadConfig } = await loadStore({ language: "tr" });
    const cfg = loadConfig();
    expect(cfg.whatsNewSeenVersion).toBe("0");
  });

  it("dosyada alan varsa olduğu gibi okunur", async () => {
    const { loadConfig } = await loadStore({ whatsNewSeenVersion: "1.8.2" });
    const cfg = loadConfig();
    expect(cfg.whatsNewSeenVersion).toBe("1.8.2");
  });

  it("dosyada alan string değilse '0' sentinel döner", async () => {
    const { loadConfig } = await loadStore({ whatsNewSeenVersion: 123 });
    const cfg = loadConfig();
    expect(cfg.whatsNewSeenVersion).toBe("0");
  });
});
