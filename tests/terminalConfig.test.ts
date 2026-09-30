// Terminal modu düzeninin config'ten okunması (spec §4.1).
//
// Dosya elle düzenlenebilir ya da eski bir sürümden gelebilir; bozuk bir
// alan uygulamayı açılışta düşürmemeli, yalnızca atlanmalı.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_TERMINAL_PANES,
  MAX_TERMINAL_WORKSPACES,
  firstFreeWorkspaceNumber,
  normalizeActiveWorkspaceId,
  normalizeTerminalWorkspaces
} from "../app-electron/shared/terminalLayout";

const nameFor = (n: number) => `Alan ${n}`;

describe("normalizeTerminalWorkspaces", () => {
  it("dizi olmayan değer boş liste", () => {
    for (const raw of [undefined, null, "x", 3, {}]) {
      expect(normalizeTerminalWorkspaces(raw, nameFor)).toEqual([]);
    }
  });

  it("geçerli düzen aynen kalıyor", () => {
    const raw = [{ id: "w1", name: "D01", panes: [{ id: "p1", kind: "axet", cwd: "C:\\a" }] }];
    expect(normalizeTerminalWorkspaces(raw, nameFor)).toEqual(raw);
  });

  it("bozuk bölmeler atlanıyor: bilinmeyen tür, boş klasör, boş/uzun/yinelenen kimlik", () => {
    const raw = [
      {
        id: "w1",
        name: "D01",
        panes: [
          { id: "p1", kind: "bash", cwd: "C:\\a" },
          { id: "p2", kind: "cmd", cwd: "  " },
          { id: "", kind: "cmd", cwd: "C:\\a" },
          { id: "x".repeat(101), kind: "cmd", cwd: "C:\\a" },
          { id: "p3", kind: "cmd", cwd: "C:\\a" },
          { id: "p3", kind: "powershell", cwd: "C:\\b" },
          null,
          "p4"
        ]
      }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[0].panes).toEqual([{ id: "p3", kind: "cmd", cwd: "C:\\a" }]);
  });

  it("bölme kimliği alanlar arasında da tekil", () => {
    const raw = [
      { id: "w1", name: "A", panes: [{ id: "p1", kind: "cmd", cwd: "C:\\a" }] },
      { id: "w2", name: "B", panes: [{ id: "p1", kind: "cmd", cwd: "C:\\b" }] }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[1].panes).toEqual([]);
  });

  it("geçersiz ya da yinelenen kimlikli alan atlanıyor", () => {
    const raw = [{ id: "", name: "A", panes: [] }, { id: "w1", name: "B", panes: [] }, { id: "w1", name: "C", panes: [] }, 7];
    expect(normalizeTerminalWorkspaces(raw, nameFor).map((w) => w.name)).toEqual(["B"]);
  });

  it("alan başına ilk 9 bölme, ilk 6 alan", () => {
    const panes = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, kind: "cmd", cwd: "C:\\a" }));
    const raw = Array.from({ length: 8 }, (_, i) => ({ id: `w${i}`, name: `W${i}`, panes: i === 0 ? panes : [] }));
    const result = normalizeTerminalWorkspaces(raw, nameFor);
    expect(result).toHaveLength(MAX_TERMINAL_WORKSPACES);
    expect(result[0].panes).toHaveLength(MAX_TERMINAL_PANES);
    expect(result[0].panes[8].id).toBe("p8");
  });

  it("ad kırpılıyor; boş ad ilk boş numarayı alıyor", () => {
    const raw = [
      { id: "w1", name: "  ", panes: [] },
      { id: "w2", name: " Alan 1 ", panes: [] },
      { id: "w3", panes: [] }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor).map((w) => w.name)).toEqual(["Alan 2", "Alan 1", "Alan 3"]);
  });
});

describe("firstFreeWorkspaceNumber", () => {
  it("alınmamış ilk sayıyı veriyor", () => {
    expect(firstFreeWorkspaceNumber([], nameFor)).toBe(1);
    expect(firstFreeWorkspaceNumber(["Alan 1", "Alan 3"], nameFor)).toBe(2);
  });
});

describe("normalizeActiveWorkspaceId", () => {
  const ws = [{ id: "w1", name: "A", panes: [] }];
  it("listede varsa aynen, yoksa null", () => {
    expect(normalizeActiveWorkspaceId("w1", ws)).toBe("w1");
    expect(normalizeActiveWorkspaceId("w9", ws)).toBeNull();
    expect(normalizeActiveWorkspaceId(5, ws)).toBeNull();
  });
});

// --- store.ts üzerinden uçtan uca ---

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-"));
  vi.resetModules();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

async function store(raw: Record<string, unknown> | null) {
  if (raw) writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  return import("../app-electron/main/store");
}

describe("loadConfig — terminal düzeni", () => {
  it("dosya yoksa boş liste ve null", async () => {
    const { loadConfig } = await store(null);
    const config = loadConfig();
    expect(config.terminalWorkspaces).toEqual([]);
    expect(config.terminalActiveWorkspaceId).toBeNull();
  });

  it("bozuk düzen ayıklanıyor, yok olan seçili alan null oluyor", async () => {
    const { loadConfig } = await store({
      terminalWorkspaces: [{ id: "w1", name: "", panes: [{ id: "p1", kind: "zsh", cwd: "C:\\a" }] }],
      terminalActiveWorkspaceId: "w9"
    });
    const config = loadConfig();
    expect(config.terminalWorkspaces).toEqual([{ id: "w1", name: "Çalışma alanı 1", panes: [] }]);
    expect(config.terminalActiveWorkspaceId).toBeNull();
  });

  it("İngilizce arayüzde boş ad İngilizce", async () => {
    const { loadConfig } = await store({ language: "en", terminalWorkspaces: [{ id: "w1", name: "", panes: [] }] });
    expect(loadConfig().terminalWorkspaces[0].name).toBe("Workspace 1");
  });
});
