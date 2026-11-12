// Çoklu sistem: iki sistemin ADT sunucusu AYNI ANDA, ayrı port + ayrı jetonla.
// Biri ötekini durdurmuyor; jetonlar çapraz geçmiyor; biri kesilince öteki ayakta.
// İkinci blok gerçek `adt_readonly_server.py` süreçleriyle (SAP'siz açılıyor:
// .conn_adt yokken de /health cevap veriyor), Python yoksa atlanıyor.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { startReadonlyServer, stopAllReadonlyServers, stopReadonlyServer, isReadonlyServerRunning, probeAdtTools } = await import(
  "../app-electron/main/adtReadonlyServerManager"
);

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close(() => (typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("port yok"))));
    });
  });
}

function status(port: number, token: string): Promise<number> {
  return new Promise((resolve) => {
    httpRequest({ host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${token}` }, timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    })
      .on("error", () => resolve(0))
      .end();
  });
}

const FAKE = `
const http = require("node:http");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = process.env.ABAP_HTTP_TOKEN || "";
http.createServer((req, res) => {
  if (!token || req.headers.authorization !== "Bearer " + token) { res.writeHead(401); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, tools: ["adt_get_source", "adt_sql", "adt_dump_detail"], url: process.env.ABAP_HTTP_URL || null }));
}).listen(port, "127.0.0.1");
`;

let workDir = "";
let fake = "";
let savedPyPath: string | undefined;
const TOKEN_A = "a".repeat(43);
const TOKEN_B = "b".repeat(43);

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "coklu-"));
  fake = path.join(workDir, "fake.cjs");
  writeFileSync(fake, FAKE);
  // Kabuktan miras kalan başka bir kurulumun python-site'ı motorun kendi
  // modül denetimini (yanlış ntt_tls_pin) tetikliyor.
  savedPyPath = process.env.PYTHONPATH;
  delete process.env.PYTHONPATH;
});
afterAll(() => {
  if (savedPyPath !== undefined) process.env.PYTHONPATH = savedPyPath;
});
afterEach(() => stopAllReadonlyServers());

function dir(name: string): string {
  const d = path.join(workDir, name);
  mkdirSync(d, { recursive: true });
  return d;
}

describe("iki sistem aynı anda (sahte sunucu)", () => {
  it("ikisi de ayakta, jetonlar çapraz geçmiyor, biri kesilince öteki kalıyor", async () => {
    const [pa, pb] = [await freePort(), await freePort()];
    const a = dir("A");
    const b = dir("B");
    const common = { scriptPath: fake, pythonPath: process.execPath, expectWritable: false };
    const ra = await startReadonlyServer({ ...common, projectDir: a, port: pa, token: TOKEN_A, tier: "QA" });
    const rb = await startReadonlyServer({ ...common, projectDir: b, port: pb, token: TOKEN_B, tier: "PRD" });
    expect(ra.ok && rb.ok).toBe(true);
    expect(isReadonlyServerRunning(a)).toBe(true);
    expect(isReadonlyServerRunning(b)).toBe(true);

    expect(await status(pa, TOKEN_A)).toBe(200);
    expect(await status(pb, TOKEN_B)).toBe(200);
    // B'nin jetonu A'nın sunucusunu açmıyor (ve tersi).
    expect(await status(pa, TOKEN_B)).toBe(401);
    expect(await status(pb, TOKEN_A)).toBe(401);
    expect((await probeAdtTools(pb, 1500, TOKEN_B)).alive).toBe(true);

    stopReadonlyServer(a);
    await new Promise((r) => setTimeout(r, 300));
    expect(await status(pa, TOKEN_A)).toBe(0);
    expect(await status(pb, TOKEN_B)).toBe(200);
  }, 30_000);

  it("aynı sisteme yeniden bağlanmak (aynı jeton, aynı port) süreci yeniden kullanıyor", async () => {
    const port = await freePort();
    const a = dir("A2");
    const opts = { scriptPath: fake, pythonPath: process.execPath, expectWritable: false, projectDir: a, port, token: TOKEN_A, tier: "QA" as const };
    expect((await startReadonlyServer(opts)).alreadyRunning).toBe(false);
    expect((await startReadonlyServer(opts)).alreadyRunning).toBe(true);
  }, 30_000);
});

function hasPy(): boolean {
  if (process.platform !== "win32") return false;
  try {
    execFileSync("py", ["-3", "-c", "import requests, mcp, dotenv"], { windowsHide: true, stdio: "ignore", timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

const REAL = path.resolve("resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py");

describe.runIf(hasPy())("iki sistem aynı anda (gerçek adt_readonly_server.py, SAP'siz)", () => {
  it("iki gerçek süreç ayrı port + jetonla açılıyor ve ayrı kapanıyor", async () => {
    const [pa, pb] = [await freePort(), await freePort()];
    const a = dir("RA");
    const b = dir("RB");
    const common = { scriptPath: REAL, pythonPath: "py", expectWritable: false };
    const [ra, rb] = await Promise.all([
      startReadonlyServer({ ...common, projectDir: a, port: pa, token: TOKEN_A, tier: "QA" }),
      startReadonlyServer({ ...common, projectDir: b, port: pb, token: TOKEN_B, tier: "PRD" })
    ]);
    expect(ra.message).toContain("adtServer.started");
    expect(rb.message).toContain("adtServer.started");
    expect(await status(pa, TOKEN_A)).toBe(200);
    expect(await status(pb, TOKEN_B)).toBe(200);
    expect(await status(pa, TOKEN_B)).toBe(401);
    stopReadonlyServer(b);
    await new Promise((r) => setTimeout(r, 1500));
    expect(await status(pb, TOKEN_B)).toBe(0);
    expect(await status(pa, TOKEN_A)).toBe(200);
  }, 60_000);
});
