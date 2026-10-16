// Destek paketinin içeriği (spec 2026-10-16 §4). Geçici klasörlerde; SAP yok.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Kilitli günlük (axet-code yazarken EBUSY): adı "kilitli" içeren yol açılamıyor.
vi.mock("node:fs", async () => {
  const real = await vi.importActual<typeof import("node:fs")>("node:fs");
  const openSync = ((p: string, ...rest: unknown[]) => {
    if (String(p).includes("kilitli")) throw Object.assign(new Error("EBUSY: resource busy or locked"), { code: "EBUSY" });
    return (real.openSync as (...a: unknown[]) => number)(p, ...rest);
  }) as typeof real.openSync;
  // Göreli ".1": günlük yolu boş dönünce aranmamalı (inceleme M6); varmış gibi davranıyor.
  const existsSync = ((p: string) => p === ".1" || real.existsSync(p)) as typeof real.existsSync;
  return { ...real, default: { ...real, openSync, existsSync }, openSync, existsSync };
});
import { MAX_LOG_BYTES, buildBundleEntries, bundleFileNames, readTail } from "../app-electron/main/support/bundle";
import type { ChatSessionsState } from "../app-electron/shared/types";

const TOKEN = "TOKEN-abcdef0123456789";
const SECRET_TEXT = "musteri-gizli-metni";

let root = "";
let appLog = "";
let projectDir = "";

const CHAT: ChatSessionsState = {
  activeId: "s1",
  sessions: [
    {
      id: "s1",
      title: `Başlık ${SECRET_TEXT}`,
      messages: [
        { id: "m1", role: "user", content: SECRET_TEXT, createdAt: 1000 },
        {
          id: "m2",
          role: "assistant",
          content: `cevap ${SECRET_TEXT}`,
          createdAt: 5000,
          error: true,
          steps: [{ phase: "tool", tool: "view", target: SECRET_TEXT } as never]
        }
      ],
      model: { provider: "axet", model: "claude" },
      draft: "",
      createdAt: 900,
      updatedAt: 5000
    }
  ]
};

function src(over: Partial<Parameters<typeof buildBundleEntries>[0]> = {}) {
  return { appLogPath: appLog, projectDir, chatState: CHAT, info: { surum: "1.8.3" }, secrets: [TOKEN], ...over };
}
const text = (entries: { name: string; data: Buffer }[], name: string) =>
  entries.find((e) => e.name === name)?.data.toString("utf-8") ?? "";

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "bundle-"));
  mkdirSync(path.join(root, "logs"));
  appLog = path.join(root, "logs", "ntt-studio.log");
  writeFileSync(appLog, `tur basladi Bearer abcdefgh12345678 anahtar ${TOKEN}\n`);
  projectDir = path.join(root, "proje");
  mkdirSync(path.join(projectDir, ".axet-code", "logs"), { recursive: true });
  writeFileSync(path.join(projectDir, ".conn_adt"), "ADT_SAP_PASSWORD=Sifre99\n");
  writeFileSync(path.join(projectDir, "config.json"), "{}");
  writeFileSync(path.join(projectDir, ".saml_cookies.json"), "{}");
  writeFileSync(path.join(projectDir, "sap-context.md"), "#");
  writeFileSync(path.join(projectDir, ".axet-code", "axet-code.db"), "db");
  writeFileSync(path.join(projectDir, "adt-readonly.log"), `[adt-http] token: ${TOKEN}\n`);
  // 3 MB'lık ajan günlüğü: satırlar JSON, her biri '{' ile başlıyor.
  const line = `{"level":"INFO","msg":"agent turn finished","token":"${TOKEN}","pad":"${"x".repeat(200)}"}\n`;
  writeFileSync(path.join(projectDir, ".axet-code", "logs", "axet-code.log"), line.repeat(Math.ceil((3 * 1024 * 1024) / line.length)));
});

describe("buildBundleEntries", () => {
  it("yalnız izinli dosyalar; yasaklılar asla yok", () => {
    const { entries } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    expect(entries.map((e) => e.name)).toEqual(["bilgi.json", "ntt-studio.log", "axet-code.log", "adt-sunucu.log", "sohbet-zamanlari.json"]);
    for (const e of entries) {
      expect(e.name).not.toMatch(/conn_adt|config\.json|saml|axet-code\.db|sap-context/);
      expect(e.data.toString("utf-8")).not.toContain("Sifre99");
    }
  });

  it("her metinde bilinen anahtar ve kalıplar maskeli; sayılar bilgi.json'da", () => {
    const { entries, redactions } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    for (const e of entries) expect(e.data.toString("utf-8")).not.toContain(TOKEN);
    expect(text(entries, "ntt-studio.log")).not.toContain("abcdefgh12345678");
    expect(redactions.known).toBeGreaterThan(2);
    expect(JSON.parse(text(entries, "bilgi.json")).maskeleme.known).toBeGreaterThan(2);
  });

  it("büyük günlük: son 2 MB, yarım ilk satır atılmış (inceleme odağı 1, 3)", () => {
    const { entries } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    const log = entries.find((e) => e.name === "axet-code.log")!.data;
    expect(log.length).toBeLessThanOrEqual(MAX_LOG_BYTES);
    expect(log.toString("utf-8").startsWith("{")).toBe(true);
  });

  it("sohbet zamanları: metin ve başlık yok, araç adı ve zamanlar var", () => {
    const { entries } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    const timings = text(entries, "sohbet-zamanlari.json");
    expect(timings).not.toContain(SECRET_TEXT);
    const parsed = JSON.parse(timings);
    expect(parsed[0].messages[1]).toMatchObject({ role: "assistant", createdAt: 5000, error: true, tools: ["view"] });
    expect(parsed[0].model).toBe("axet/claude");
  });

  it("sohbet metni yalnız istenirse; not kırpılıp maskeleniyor", () => {
    const { entries } = buildBundleEntries(src(), { note: `  çöktü ${TOKEN}  `, chatMarkdown: `# Sohbet\n${TOKEN}` });
    expect(text(entries, "sohbet.md")).toBe("# Sohbet\n«gizli»");
    expect(text(entries, "not.txt")).toBe("çöktü «gizli»");
  });

  it("bağlı proje yoksa proje günlükleri yok, bilgi.json söylüyor (inceleme odağı 2)", () => {
    const { entries } = buildBundleEntries(src({ projectDir: null }), { note: "", chatMarkdown: null });
    expect(entries.map((e) => e.name)).toEqual(["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json"]);
    expect(JSON.parse(text(entries, "bilgi.json")).eksik.join(" ")).toContain("proje");
  });

  it("okunamayan günlük paketi düşürmüyor, eksik'e yazılıyor — inceleme I3", () => {
    const locked = path.join(root, "logs", "kilitli.log");
    writeFileSync(locked, "x");
    const { entries } = buildBundleEntries(src({ appLogPath: locked }), { note: "", chatMarkdown: null });
    expect(entries.map((e) => e.name)).not.toContain("ntt-studio.log");
    expect(JSON.parse(text(entries, "bilgi.json")).eksik.join(" ")).toContain("ntt-studio.log (okunamadı");
  });

  it("günlük yolu boşsa uygulama günlüğü aranmıyor, eksik'e yazılıyor — inceleme M6", () => {
    const s = src({ appLogPath: "" });
    expect(bundleFileNames(s, { note: "", chatMarkdown: null })).not.toContain("ntt-studio.log.1");
    const { entries } = buildBundleEntries(s, { note: "", chatMarkdown: null });
    expect(entries.map((e) => e.name)).not.toContain("ntt-studio.log.1");
    expect(JSON.parse(text(entries, "bilgi.json")).eksik).toContain("ntt-studio.log");
  });

  it("ön izleme listesi paketle aynı", () => {
    const req = { note: "x", chatMarkdown: "y" };
    expect(bundleFileNames(src(), req)).toEqual(buildBundleEntries(src(), req).entries.map((e) => e.name));
  });
});

describe("readTail", () => {
  it("küçük dosyayı olduğu gibi okuyor", () => {
    expect(readTail(appLog)).toContain("tur basladi");
  });
});
