// R3 (1.9.x kullanıcı raporu): DEV sisteme bağlı; ajan "8787'de yalnızca ~20
// salt okunur araç var, yazma yok; yeniden bağlan" diyor; kullanıcı yeniden
// bağlasa da değişmiyor.
//
// Koddan ve bu testle ölçülen yol: NTT Studio'nun sunucusu açılamayınca
// sap-context.md ajana sunucuyu ELLE başlatmayı söylüyor (DEV dışı için) ve
// ajanın kabuğu NTT Studio'nun ortamını (ABAP_HTTP_TOKEN dahil) miras aldığı
// için elle açılan salt okunur sunucu bizim anahtarımızla cevap veriyor —
// ama ADT_RO_ALLOW_* kapıları olmadan (19-20 araç). Yeniden bağlanınca
// yönetici portta "başka bir sunucu" buluyor ve gated'da `gatedPortBusy`,
// salt okunurda `surfaceMismatch` ile VAZGEÇİYORDU: o süreç kapanana kadar
// (kullanıcı bulamaz) DEV'e yazma hiç açılmıyordu.
//
// Bizim bellekteki anahtarımızı bilen bir süreç bizim süreç ağacımızdan
// doğmuştur; yanlış yüzeydeyse kapatılıp doğrusu açılıyor.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { getAdtHttpToken } = await import("../app-electron/main/adtHttpToken");
const { startReadonlyServer, stopAllReadonlyServers } = await import("../app-electron/main/adtReadonlyServerManager");

// Gated ise (ADT_APPROVAL_TOKEN) onaylı yüzey, değilse kapılara göre salt okunur.
const FAKE = `
const http = require("node:http");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.ABAP_HTTP_TOKEN || "").trim();
let tools = ["adt_get_source", "adt_search"];
if (process.env.ADT_APPROVAL_TOKEN) tools = tools.concat(["adt_push", "axet_teslim", "adt_sql", "adt_dump_detail"]);
else for (const [n, v] of [["adt_sql", "ADT_RO_ALLOW_SQL"], ["adt_dump_detail", "ADT_RO_ALLOW_DUMP_DETAIL"]]) if (process.env[v] === "true") tools.push(n);
http.createServer((req, res) => {
  if (req.headers.authorization !== "Bearer " + token) { res.writeHead(401); return res.end("{}"); }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, tools }));
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

function tools(port: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    httpRequest({ host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${getAdtHttpToken()}` } }, (res) => {
      let t = "";
      res.setEncoding("utf-8");
      res.on("data", (c: string) => (t += c));
      res.on("end", () => resolve(JSON.parse(t).tools));
    })
      .on("error", reject)
      .end();
  });
}

async function waitUp(port: number): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try {
      await tools(port);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("sahte sunucu açılmadı");
}

let dir = "";
let script = "";
const strays: ChildProcess[] = [];

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "adt-reclaim-"));
  script = path.join(dir, "fake.cjs");
  writeFileSync(script, FAKE);
});

afterEach(() => {
  stopAllReadonlyServers();
  for (const c of strays.splice(0)) {
    try {
      c.kill();
    } catch {
      /* zaten kapandı */
    }
  }
});

describe.skipIf(process.platform !== "win32")("8787'yi tutan, bizim anahtarımızı bilen yanlış yüzeyli süreç", () => {
  it("DEV'e (gated) yeniden bağlanınca kapatılıyor ve onaylı sunucu açılıyor", async () => {
    getAdtHttpToken();
    const port = await freePort();
    // Ajanın elle başlattığı salt okunur sunucu: ortamı miras, kapılar yok.
    const stray = spawn(process.execPath, [script, "--port", String(port)], { env: { ...process.env }, stdio: "ignore", windowsHide: true });
    strays.push(stray);
    await waitUp(port);
    expect(await tools(port)).not.toContain("axet_teslim");

    const r = await startReadonlyServer({
      projectDir: dir,
      scriptPath: script,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: { url: "http://127.0.0.1:1", token: "onay" }
    });
    expect(r.message).toBe("adtServer.started " + JSON.stringify({ port }));
    expect(await tools(port)).toContain("axet_teslim");
  }, 30_000);

  it("salt okunurda da: kapısız (19 araçlık) süreç yerine tam yüzey açılıyor", async () => {
    const port = await freePort();
    const stray = spawn(process.execPath, [script, "--port", String(port)], { env: { ...process.env }, stdio: "ignore", windowsHide: true });
    strays.push(stray);
    await waitUp(port);
    const r = await startReadonlyServer({ projectDir: dir, scriptPath: script, pythonPath: process.execPath, port, expectWritable: false });
    expect(r.ok).toBe(true);
    expect(await tools(port)).toContain("adt_sql");
  }, 30_000);
});

describe("listeningPid", () => {
  it("yalnız loopback'te DİNLEYEN satırın PID'i", async () => {
    const { listeningPid } = await import("../app-electron/main/adtReadonlyServerManager");
    const out = [
      "  Proto  Local Address          Foreign Address        State           PID",
      "  TCP    127.0.0.1:8787         127.0.0.1:51000        ESTABLISHED     111",
      "  TCP    10.0.0.5:8787          0.0.0.0:0              LISTENING       222",
      "  TCP    127.0.0.1:87870        0.0.0.0:0              LISTENING       333",
      "  TCP    127.0.0.1:8787         0.0.0.0:0              LISTENING       444"
    ].join("\r\n");
    expect(listeningPid(out, 8787)).toBe(444);
    expect(listeningPid(out, 9999)).toBeNull();
  });
});
