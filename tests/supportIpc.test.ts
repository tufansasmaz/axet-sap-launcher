// Sorun bildir uçtan uca (ana süreç): kaynaklar toplanıyor, kayıtlı şifre
// pakete girmiyor, zip Belgeler'de, Outlook yoksa klasör (spec 2026-10-16).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ root: "", showItemInFolder: vi.fn(), handles: new Map<string, (...a: unknown[]) => unknown>() }));

vi.mock("electron", () => ({
  app: { getPath: (name: string) => `${h.root}/${name}`, getVersion: () => "9.9.9" },
  shell: { showItemInFolder: h.showItemInFolder }
}));
vi.mock("../app-electron/main/appLog", () => ({
  appLogPath: () => path.join(h.root, "logs", "ntt-studio.log"),
  appLog: vi.fn()
}));
vi.mock("../app-electron/main/store", () => ({
  loadConfig: () => ({
    language: "tr",
    skillProfile: "module-consultant",
    supportEmail: "destek@example.test",
    lastCredentials: { a: { username: "U", password: "enc:x", client: "100" } }
  })
}));
vi.mock("../app-electron/main/secureStorage", () => ({ decryptSecret: () => "SapSifre12345" }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "ADT-TOKEN-0123456789" }));
vi.mock("../app-electron/main/sapWrite/server", () => ({ activeApprovalTokens: () => ["onay".repeat(8)] }));
vi.mock("../app-electron/main/adtReadonlyServerManager", () => ({
  probeAdtTools: async () => ({ alive: true, unauthorized: false, tools: ["adt_get_source", "adt_sql"] })
}));
vi.mock("../app-electron/main/doctor", () => ({ runDoctor: async () => ({ rows: [] }) }));
vi.mock("../app-electron/main/chatStore", () => ({
  loadChatSessions: () => ({ ok: true, state: { activeId: null, sessions: [] } })
}));
vi.mock("../app-electron/main/activeContext", () => ({
  getActiveContext: () => ({
    sap: { uuid: "u", systemId: "D01", client: "100", tier: "DEV", verified: true, projectDir: path.join(h.root, "proje") },
    gui: null
  })
}));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ axetCodeVersion: () => "1.2.3" }));
vi.mock("../app-electron/main/sapToolkit", () => ({ readToolkitVersion: () => ({ version: "t-1" }) }));
vi.mock("../app-electron/main/support/outlookDraft", async () => {
  const real = await vi.importActual<typeof import("../app-electron/main/support/outlookDraft")>(
    "../app-electron/main/support/outlookDraft"
  );
  return { ...real, openOutlookDraft: async () => "timeout" as const };
});

const { MAX_CHAT_CHARS, createSupportBundle, registerSupportIpc } = await import("../app-electron/main/support/ipc");

/** Zip'in merkezi dizininden adlar ve açılmış içerikler. */
function unzip(file: string): Record<string, string> {
  const buf = readFileSync(file);
  const eocd = buf.length - 22;
  let p = buf.readUInt32LE(eocd + 16);
  const out: Record<string, string> = {};
  for (let i = 0; i < buf.readUInt16LE(eocd + 10); i++) {
    const comp = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf-8");
    const lName = buf.readUInt16LE(local + 26);
    out[name] = inflateRawSync(buf.subarray(local + 30 + lName, local + 30 + lName + comp)).toString("utf-8");
    p += 46 + nameLen;
  }
  return out;
}

beforeEach(() => {
  h.root = mkdtempSync(path.join(tmpdir(), "support-"));
  h.showItemInFolder.mockClear();
  mkdirSync(path.join(h.root, "logs"));
  writeFileSync(path.join(h.root, "logs", "ntt-studio.log"), "giris SapSifre12345 ADT-TOKEN-0123456789\n");
  mkdirSync(path.join(h.root, "proje", ".axet-code", "logs"), { recursive: true });
  writeFileSync(path.join(h.root, "proje", ".conn_adt"), "ADT_SAP_PASSWORD=SapSifre12345\n");
});

describe("createSupportBundle", () => {
  it("zip Belgeler\\NTT Studio Destek'te; şifre ve anahtarlar maskeli; Outlook yoksa klasör", async () => {
    const result = await createSupportBundle({ note: "sohbet takıldı", chatMarkdown: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(path.dirname(result.zipPath)).toBe(path.join(h.root, "documents", "NTT Studio Destek"));
    expect(path.basename(result.zipPath)).toMatch(/^ntt-studio-destek-\d{8}-\d{6}\.zip$/);
    expect(result.draft).toBe("folder");
    expect(result.outlookTimedOut).toBe(true);
    expect(h.showItemInFolder).toHaveBeenCalledWith(result.zipPath);
    const files = unzip(result.zipPath);
    expect(Object.keys(files)).toEqual(["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json", "not.txt"]);
    const all = Object.values(files).join("\n");
    expect(all).not.toContain("SapSifre12345");
    expect(all).not.toContain("ADT-TOKEN-0123456789");
    const info = JSON.parse(files["bilgi.json"]);
    expect(info).toMatchObject({ uygulama: "9.9.9", rol: "module-consultant", sistem: { sid: "D01", kademe: "DEV" } });
    expect(info.adtSunucu).toEqual({ calisiyor: true, yetkisiz: false, aracSayisi: 2 });
  });

  it("çok uzun sohbet metni sondan kırpılıyor — inceleme M5", async () => {
    const result = await createSupportBundle({ note: "", chatMarkdown: "a".repeat(MAX_CHAT_CHARS + 1000) + "SON" });
    if (!result.ok) throw new Error(result.message);
    const md = unzip(result.zipPath)["sohbet.md"];
    expect(md.length).toBeLessThan(MAX_CHAT_CHARS + 100);
    expect(md.endsWith("SON")).toBe(true);
    expect(md.startsWith("…")).toBe(true);
  });

  it("IPC: önizleme listesi ve oluşturma kayıtlı", async () => {
    registerSupportIpc({ handle: (ch, fn) => h.handles.set(ch, fn) });
    const preview = (await h.handles.get("support:preview")!({}, { note: "", chatMarkdown: "x" })) as string[];
    expect(preview).toEqual(["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json", "sohbet.md"]);
    // Bozuk istek: varsayılanlara düşüyor, çökmüyor.
    const res = (await h.handles.get("support:create")!({}, null)) as { ok: boolean };
    expect(res.ok).toBe(true);
    expect(readdirSync(path.join(h.root, "documents", "NTT Studio Destek")).length).toBeGreaterThan(0);
  });
});
