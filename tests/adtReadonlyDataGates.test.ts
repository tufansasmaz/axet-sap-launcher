// Salt okunur 8787 sunucusunda tablo ve dump okuma (kullanıcı kararı 2026-10-15).
//
// Bir modül danışmanı read-only yüzeyde hiçbir tabloyu okuyamadığını, dump
// göremediğini bildirdi: sarmalayıcı (`adt_readonly_server.py`) `adt_sql` ve
// `adt_dumps`'ı kendi izin değişkenleri "true" değilse kayda hiç almıyor ve
// NTT Studio bu değişkenleri hiç koymuyordu. Karar: ikisi her kademede açık;
// ABAP çalıştıran `adt_unit_test` kapalı kalıyor — kullanıcının ortamından
// miras kalsa bile.
//
// Sahte sunucu sarmalayıcının kapısını taklit ediyor: araç, değişkeni tam
// olarak "true" ise listede.

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { getAdtHttpToken } = await import("../app-electron/main/adtHttpToken");
const { startReadonlyServer, stopAllReadonlyServers } = await import("../app-electron/main/adtReadonlyServerManager");

const FAKE_READONLY_SERVER = `
const http = require("node:http");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.ABAP_HTTP_TOKEN || "").trim();
const tools = ["adt_get_source", "adt_search"];
for (const [name, v] of [["adt_sql", "ADT_RO_ALLOW_SQL"], ["adt_dumps", "ADT_RO_ALLOW_DUMPS"], ["adt_dump_detail", "ADT_RO_ALLOW_DUMP_DETAIL"], ["adt_unit_test", "ADT_RO_ALLOW_UNIT_TEST"]]) {
  if (process.env[v] === "true") tools.push(name);
}
http.createServer((req, res) => {
  if (!token || req.headers.authorization !== "Bearer " + token) {
    res.writeHead(401);
    return res.end("{}");
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, tool_count: tools.length, tools }));
}).listen(port, "127.0.0.1");
`;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close(() => (typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("port yok"))));
    });
  });
}

function health(port: number): Promise<{ tools: string[] }> {
  return new Promise((resolve, reject) => {
    httpRequest({ host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${getAdtHttpToken()}` } }, (res) => {
      let text = "";
      res.setEncoding("utf-8");
      res.on("data", (c: string) => (text += c));
      res.on("end", () => resolve(JSON.parse(text)));
    })
      .on("error", reject)
      .end();
  });
}

let workDir = "";
let fakeScript = "";
const foreign: Server[] = [];

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "adt-ro-gates-"));
  fakeScript = path.join(workDir, "fake_readonly_server.cjs");
  writeFileSync(fakeScript, FAKE_READONLY_SERVER);
});

afterEach(() => {
  stopAllReadonlyServers();
  for (const s of foreign.splice(0)) s.close();
});

function projectDir(name: string): string {
  const dir = path.join(workDir, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("salt okunur sunucuda veri okuma kapıları", () => {
  it("tablo ve dump okuma açık; birim testi miras kalsa da kapalı", async () => {
    process.env.ADT_RO_ALLOW_UNIT_TEST = "true";
    try {
      const port = await freePort();
      const result = await startReadonlyServer({
        projectDir: projectDir("gates"),
        scriptPath: fakeScript,
        pythonPath: process.execPath,
        port,
        expectWritable: false,
        tier: "PRD"
      });
      expect(result.ok).toBe(true);
      const { tools } = await health(port);
      expect(tools).toContain("adt_sql");
      expect(tools).toContain("adt_dumps");
      // Dump'ın içini okuyan araç da (2026-10-16): liste tek başına hatayı göstermiyor.
      expect(tools).toContain("adt_dump_detail");
      expect(tools).not.toContain("adt_unit_test");
    } finally {
      delete process.env.ADT_RO_ALLOW_UNIT_TEST;
    }
  }, 20_000);

  it("portta tablo okumayan eski bir salt okunur sunucu varsa devralınmıyor, beklenen 22", async () => {
    const port = await freePort();
    const old = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, tool_count: 19, tools: ["adt_get_source", "adt_search"] }));
    });
    foreign.push(old);
    await new Promise<void>((r) => old.listen(port, "127.0.0.1", () => r()));
    const result = await startReadonlyServer({
      projectDir: projectDir("old-surface"),
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: false
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.surfaceMismatch");
    expect(result.message).toContain('"expected":"22"');
  }, 20_000);
});
