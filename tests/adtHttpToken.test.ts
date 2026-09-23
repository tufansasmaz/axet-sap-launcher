// 8787'deki yazma sunucusuyla bearer token sözleşmesi.
//
// Yeniden üretilen arıza (2026-09-23, MAYA, DEV + teknik danışman): yazan motor
// (`adt_mcp_server.py --http`) `ABAP_HTTP_TOKEN` verilmezse kendi token'ını
// üretiyor ve `/health` DAHİL her isteğe token'sız 401 dönüyor. Launcher onu
// token'sız başlatıp token'sız yokluyordu; 401'i "ölü" sayıp 15 sn sonra
// sunucuyu kendi eliyle öldürüyordu. Log'da "listening" yazarken ajan
// "SAP aracı yok" diyordu. 1.6.7'de görünmüyordu çünkü o sürüm her sistemde
// token istemeyen salt-okur sunucuyu açıyordu.
//
// Sahte sunucu motorun kapısını birebir taklit ediyor (adt_mcp_server.py,
// `_guard` → `_auth_ok`): token'ı YALNIZCA ortamdan okuyor, `/health` de
// kapının arkasında. Python PATH'te olmadığı için gerçek motor değil, onun
// sözleşmesi test ediliyor.
//
// `.ts` (`.tsx` değil): `app-electron/main`'den import ediyor, node tsconfig'ine ait.

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

// i18n → store → electron zinciri testte yüklenemiyor; metnin kendisi değil
// hangi anahtarın seçildiği önemli.
vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { getAdtHttpToken } = await import("../app-electron/main/adtHttpToken");
const { startReadonlyServer, stopAllReadonlyServers } = await import("../app-electron/main/adtReadonlyServerManager");
const { axetSpawnEnv } = await import("../app-electron/main/axetSpawnEnv");

/** Boş bir port: 0'a bağlan, işletim sisteminin verdiğini oku, bırak. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close(() => (typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("port yok"))));
    });
  });
}

// Yazan motorun HTTP kapısının kopyası. Token ortamdan; yoksa üretir ve
// token'sız her isteği reddeder — gerçek motorun varsayılanı tam olarak bu.
const FAKE_WRITE_SERVER = `
const http = require("node:http");
const crypto = require("node:crypto");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.ABAP_HTTP_TOKEN || "").trim() || crypto.randomBytes(32).toString("base64url");
http.createServer((req, res) => {
  if (req.headers.authorization !== "Bearer " + token) {
    res.writeHead(401, { "WWW-Authenticate": "Bearer" });
    return res.end('{"ok":false,"error":"unauthorized"}');
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, tool_count: 2, tools: ["adt_get_source", "adt_push"] }));
}).listen(port, "127.0.0.1", () => process.stderr.write("[adt-http] listening\\n"));
`;

let workDir = "";
let fakeScript = "";

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "adt-token-"));
  fakeScript = path.join(workDir, "fake_adt_server.cjs");
  writeFileSync(fakeScript, FAKE_WRITE_SERVER);
});

const foreign: Server[] = [];
afterEach(() => {
  stopAllReadonlyServers();
  for (const s of foreign.splice(0)) s.close();
});

describe("token", () => {
  it("süreç boyunca TEK token: iki çağrı aynı değeri veriyor ve ortama yazılıyor", () => {
    const a = getAdtHttpToken();
    expect(a).toBe(getAdtHttpToken());
    expect(process.env.ABAP_HTTP_TOKEN).toBe(a);
    // 32 rastgele bayt, base64url → 43 karakter.
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it("ajan token'ı görüyor: bağlayıcılar açık da kapalı da", () => {
    const token = getAdtHttpToken();
    expect(axetSpawnEnv(true).ABAP_HTTP_TOKEN).toBe(token);
    expect(axetSpawnEnv(false).ABAP_HTTP_TOKEN).toBe(token);
  });

  it("ortamdaki değer silinse bile token DEĞİŞMİYOR (çalışan sunucuyla eşleşme bozulmasın)", () => {
    const token = getAdtHttpToken();
    delete process.env.ABAP_HTTP_TOKEN;
    // axetSpawnEnv token'ı ortama bırakmıyor, kendisi istiyor.
    expect(axetSpawnEnv(false).ABAP_HTTP_TOKEN).toBe(token);
    expect(process.env.ABAP_HTTP_TOKEN).toBe(token);
  });
});

describe("yazma sunucusu ayağa kalkıyor", () => {
  it("launcher'ın başlattığı sunucu token'lı yoklamaya cevap veriyor ve ÖLDÜRÜLMÜYOR", async () => {
    const port = await freePort();
    const result = await startReadonlyServer({
      projectDir: workDir,
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true
    });
    expect(result.message).toBe("adtServer.started " + JSON.stringify({ port }));
    expect(result.ok).toBe(true);

    // Ajanın yapacağı çağrı: aynı ortamdaki token'la.
    const status = await new Promise<number>((resolve, reject) => {
      httpRequest(
        { host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${process.env.ABAP_HTTP_TOKEN}` } },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        }
      )
        .on("error", reject)
        .end();
    });
    expect(status).toBe(200);
  }, 20_000);

  it("portta token'ını BİLMEDİĞİMİZ bir sunucu varsa bunu ADIYLA söylüyor", async () => {
    // Önceki bir oturumdan kalmış, başka token'lı sunucu.
    const port = await freePort();
    const stale = createServer((_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" });
      res.end();
    });
    foreign.push(stale);
    await new Promise<void>((r) => stale.listen(port, "127.0.0.1", () => r()));

    const result = await startReadonlyServer({
      projectDir: workDir,
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true
    });
    expect(result.ok).toBe(false);
    expect(result.external).toBe(true);
    expect(result.message).toContain("adtServer.foreignToken");
  });
});

describe("ajana verilen komutlar", () => {
  it("sap-context.md'deki her 8787 çağrısı token başlığını taşıyor, token'ın DEĞERİNİ taşımıyor", () => {
    const launcher = readFileSync(path.join(__dirname, "..", "app-electron", "main", "launcher.ts"), "utf8");
    const calls = launcher.match(/requests\.(get|post)\('http:\/\/127\.0\.0\.1:8787[^\n]*/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) expect(call).toContain("ABAP_HTTP_TOKEN");
    // Proje klasörü OneDrive'da senkronlanıyor: değer oraya yazılmamalı.
    // sap-context.md'yi üreten modül token'ın kendisine hiç erişmiyor.
    expect(launcher).not.toContain("getAdtHttpToken");
  });
});
