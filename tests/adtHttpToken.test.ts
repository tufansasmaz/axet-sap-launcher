// 8787'deki yazma sunucusuyla bearer token sözleşmesi.
//
// Yeniden üretilen arıza (2026-09-23, SID-I, DEV + teknik danışman): yazan motor
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
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

// Onay katmanının (adt_gated_server.py) kopyası: aynı token kapısı, araç
// listesinde `axet_teslim`, ve test için /health'te ortamdan aldığı onay
// adresi/token'ı ile çalışma klasörü. Gerçek sunucu bunları DÖNDÜRMEZ; burada
// yalnızca launcher'ın çocuğa ne verdiğini görmek için.
const FAKE_GATED_SERVER = `
const http = require("node:http");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.ABAP_HTTP_TOKEN || "").trim();
http.createServer((req, res) => {
  if (!token || req.headers.authorization !== "Bearer " + token) {
    res.writeHead(401, { "WWW-Authenticate": "Bearer" });
    return res.end('{"ok":false,"error":"unauthorized"}');
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true, tool_count: 3, tools: ["adt_get_source", "adt_push", "axet_teslim"],
    approvalUrl: process.env.ADT_APPROVAL_URL || null,
    approvalToken: process.env.ADT_APPROVAL_TOKEN || null,
    sapTier: process.env.NTT_STUDIO_SAP_TIER || null,
    cwd: process.cwd(),
    adtCwd: process.env.ADT_CWD || null
  }));
}).listen(port, "127.0.0.1", () => process.stderr.write("[adt-http] listening\\n"));
`;

let workDir = "";
let fakeScript = "";
let fakeGatedScript = "";

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "adt-token-"));
  fakeScript = path.join(workDir, "fake_adt_server.cjs");
  writeFileSync(fakeScript, FAKE_WRITE_SERVER);
  fakeGatedScript = path.join(workDir, "fake_gated_server.cjs");
  writeFileSync(fakeGatedScript, FAKE_GATED_SERVER);
});

function projectDir(name: string): string {
  const dir = path.join(workDir, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 8787'ye ajanın gönderdiği gibi (ADT token'ıyla) /health. */
function health(port: number): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    httpRequest(
      { host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${process.env.ABAP_HTTP_TOKEN}` } },
      (res) => {
        let text = "";
        res.setEncoding("utf-8");
        res.on("data", (c: string) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : {} }));
      }
    )
      .on("error", reject)
      .end();
  });
}

/** Test içinde, sahibi launcher OLMAYAN bir sunucu. */
async function foreignServer(port: number, handler: Parameters<typeof createServer>[1]): Promise<Server> {
  const srv = createServer(handler);
  foreign.push(srv);
  await new Promise<void>((r) => srv.listen(port, "127.0.0.1", () => r()));
  return srv;
}

const GATE_A = { url: "http://127.0.0.1:1", token: "a".repeat(64) };
const GATE_B = { url: "http://127.0.0.1:2", token: "b".repeat(64) };

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

describe("kademe çocuğun ortamında (ntt_tier.py alt sınırı)", () => {
  it("yapılandırmadaki kademe NTT_STUDIO_SAP_TIER olarak gidiyor", async () => {
    const port = await freePort();
    const result = await startReadonlyServer({
      projectDir: projectDir("tier-env"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      // Sahte onaylı sunucu (ortamı /health'te gösteren tek sahte) — yöneticinin
      // yüzey denetimi için yazma beklentisi ve onay ucu gerekiyor. Kademe
      // değeri yöneticiye göre opak: ne verilirse çocuğa o gidiyor.
      expectWritable: true,
      gate: GATE_A,
      tier: "QA"
    });
    expect(result.ok).toBe(true);
    expect((await health(port)).body.sapTier).toBe("QA");
  }, 20_000);

  it("launcher'ın ortamından miras kalan değer kademe gibi geçmiyor", async () => {
    // Kullanıcının makinesinde ortam değişkeni olarak duran bir DEV,
    // yapılandırmada kademesi verilmemiş bir sunucuya DEV diye gitmesin.
    process.env.NTT_STUDIO_SAP_TIER = "DEV";
    try {
      const port = await freePort();
      const result = await startReadonlyServer({
        projectDir: projectDir("tier-inherit"),
        scriptPath: fakeGatedScript,
        pythonPath: process.execPath,
        port,
        expectWritable: true,
        gate: GATE_A
      });
      expect(result.ok).toBe(true);
      expect((await health(port)).body.sapTier).toBeNull();
    } finally {
      delete process.env.NTT_STUDIO_SAP_TIER;
    }
  }, 20_000);
});

describe("onaylı (gated) sunucu", () => {
  it("onay adresi ve token'ı YALNIZCA çocuğun ortamına gidiyor, launcher'ın ortamına değil", async () => {
    const port = await freePort();
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-env"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A
    });
    expect(result.ok).toBe(true);
    const { body } = await health(port);
    expect(body.approvalUrl).toBe(GATE_A.url);
    expect(body.approvalToken).toBe(GATE_A.token);
    // Ajan launcher'ın ortamını miras alıyor.
    expect(process.env.ADT_APPROVAL_TOKEN).toBeUndefined();
    expect(process.env.ADT_APPROVAL_URL).toBeUndefined();
  }, 20_000);

  it("aynı oturum: yeniden başlatılmıyor; yeni oturum: yeniden başlıyor ve yeni token çocukta", async () => {
    const port = await freePort();
    const dir = projectDir("gated-session");
    const base = { projectDir: dir, scriptPath: fakeGatedScript, pythonPath: process.execPath, port, expectWritable: true };
    expect((await startReadonlyServer({ ...base, gate: GATE_A })).ok).toBe(true);
    const again = await startReadonlyServer({ ...base, gate: GATE_A });
    expect(again.alreadyRunning).toBe(true);
    const next = await startReadonlyServer({ ...base, gate: GATE_B });
    expect(next.ok).toBe(true);
    expect(next.alreadyRunning).toBe(false);
    expect((await health(port)).body.approvalToken).toBe(GATE_B.token);
  }, 40_000);

  it("gated modda portta canlı bir sunucu DEVRALINMIYOR ve öldürülmüyor", async () => {
    const port = await freePort();
    await foreignServer(port, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, tools: ["adt_push", "axet_teslim"] }));
    });
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-busy"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.gatedPortBusy");
    expect((await health(port)).status).toBe(200);
  });

  it("gated olmayan istek de portta duran gated sunucuyu devralmıyor", async () => {
    const port = await freePort();
    await foreignServer(port, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, tools: ["adt_push", "axet_teslim"] }));
    });
    const result = await startReadonlyServer({
      projectDir: projectDir("plain-vs-gated"),
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.surfaceMismatch");
  });

  it("401 dönen eski sunucu kapanınca yenisi başlıyor (öldürülmeden beklendi)", async () => {
    const port = await freePort();
    const stale = await foreignServer(port, (_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" });
      res.end();
    });
    // Önceki launcher'ın gated sunucusu: kalp atışı kaçırınca kendini kapatır.
    setTimeout(() => stale.close(), 1000);
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-stale"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A,
      staleWaitMs: 10_000
    });
    expect(result.ok).toBe(true);
    expect(result.alreadyRunning).toBe(false);
    expect((await health(port)).body.approvalToken).toBe(GATE_A.token);
  }, 30_000);

  it("401 dönen sunucu kapanmazsa bunu adıyla söylüyor ve öldürmüyor", async () => {
    const port = await freePort();
    await foreignServer(port, (_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" });
      res.end();
    });
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-stale-stuck"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A,
      staleWaitMs: 800
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.foreignTokenGated");
    expect((await health(port)).status).toBe(401);
  });

  it("başka projenin (bizim) sunucusu durdurulup port boşalınca yenisi o projenin klasöründe başlıyor", async () => {
    const port = await freePort();
    const dirA = projectDir("proj-a");
    const dirB = projectDir("proj-b");
    const base = { scriptPath: fakeGatedScript, pythonPath: process.execPath, port, expectWritable: true };
    expect((await startReadonlyServer({ ...base, projectDir: dirA, gate: GATE_A })).ok).toBe(true);
    const b = await startReadonlyServer({ ...base, projectDir: dirB, gate: GATE_B });
    expect(b.ok).toBe(true);
    expect(b.external).toBe(false);
    expect(b.alreadyRunning).toBe(false);
    const { body } = await health(port);
    expect(body.approvalToken).toBe(GATE_B.token);
    expect(path.resolve(String(body.cwd))).toBe(path.resolve(dirB));
    expect(body.adtCwd).toBe(dirB);
  }, 40_000);
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
    // Onay token'ı da: launcher onu yalnızca yöneticiye değer olarak geçiriyor.
    expect(launcher).not.toContain("ADT_APPROVAL_TOKEN");
  });

  it("DEV'in yazan yüzeyi motorun kendisi değil, onay katmanı", () => {
    const launcher = readFileSync(path.join(__dirname, "..", "app-electron", "main", "launcher.ts"), "utf8");
    expect(launcher).toContain('["sap-adt", "scripts", "adt_gated_server.py"]');
    expect(launcher).not.toContain('["sap-adt", "scripts", "adt_mcp_server.py"]');
  });
});
