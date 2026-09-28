// SAP GUI Scripting köprüsü (8790) ile ana süreç arasındaki kimlik sözleşmesi.
//
// Açık (2026-09 güvenlik incelemesi): köprü kimlik sormuyordu. Kullanıcı SAP
// GUI'nin "script bağlanıyor" onayını bir kez verdikten sonra 127.0.0.1:8790'a
// ulaşan her süreç kullanıcının SAP oturumunda tuşa basabiliyordu; launcher da
// portta bulduğu yabancı bir köprüyü "external" diye benimsiyordu.
//
// Sahte köprü gerçek köprünün kapısını taklit ediyor (sap_gui_scripting_bridge.py,
// `_refuse_request`): token YALNIZCA ortamdan, `/health` açık, gerisi bearer
// ister. Gerçek köprünün kendisi tests/python/test_gui_bridge_security.py'de.
//
// `.ts` (`.tsx` değil): `app-electron/main`'den import ediyor, node tsconfig'ine ait.

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

// i18n → store → electron zinciri testte yüklenemiyor; metnin kendisi değil
// hangi anahtarın seçildiği önemli.
vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const manager = await import("../app-electron/main/sapGuiScriptManager");
const client = await import("../app-electron/main/sapGuiScriptClient");
const { collectPrdSystems } = await import("../app-electron/main/guiScriptPrdSystems");

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close(() => (typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("port yok"))));
    });
  });
}

function health(port: number): Promise<number> {
  return new Promise((resolve) => {
    const req = httpRequest({ host: "127.0.0.1", port, path: "/health", method: "GET", timeout: 800 }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  });
}

async function waitPortFree(port: number): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if ((await health(port)) === 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`port ${port} boşalmadı`);
}

// Gerçek köprünün kapısının kopyası. `/connections` cevabında, testin
// launcher'ın çocuğa NE verdiğini görebilmesi için ortam ve istek başlıkları
// yansıtılıyor — token'ın KENDİSİ değil, yalnızca eşleşip eşleşmediği.
// FAKE_LIE_PID=1 ise /health başka bir PID söylüyor (araya giren köprü).
const FAKE_BRIDGE = `
const http = require("node:http");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.NTT_GUI_BRIDGE_TOKEN || "").trim();
if (!token) { process.stderr.write("token yok\\n"); process.exit(2); }
let prd = JSON.parse(process.env.NTT_GUI_BRIDGE_PRD_SYSTEMS || "[]");
let lastHeaders = null;
const send = (res, status, obj) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  if (req.url === "/health") {
    return send(res, 200, { ok: true, server: "sap-gui-scripting-bridge", pid: process.env.FAKE_LIE_PID ? process.pid + 1 : process.pid });
  }
  if (req.headers.authorization !== "Bearer " + token) return send(res, 401, { ok: false, error: "unauthorized" });
  if (req.headers.origin) return send(res, 403, { ok: false, error: "origin" });
  lastHeaders = { contentType: req.headers["content-type"] || null, origin: req.headers.origin || null };
  if (req.method === "POST" && req.url === "/config/prd") {
    if (req.headers["content-type"] !== "application/json") return send(res, 415, { ok: false, error: "json" });
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { prd = JSON.parse(body).systems; send(res, 200, { ok: true, count: prd.length }); });
    return;
  }
  if (req.url === "/connections") {
    return send(res, 200, { ok: true, connections: [{
      argvHasToken: process.argv.some((a) => a.includes(token)),
      tokenLength: token.length,
      prd,
      headers: lastHeaders
    }] });
  }
  send(res, 404, { ok: false, error: "yok" });
}).listen(port, "127.0.0.1");
`;

let dir: string;
let fakeBridge: string;
let markerScript: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "gui-bridge-auth-"));
  fakeBridge = path.join(dir, "fake_bridge.cjs");
  writeFileSync(fakeBridge, FAKE_BRIDGE);
  // Spawn edilirse iz bırakan betik: yabancı köprü varken hiç çalışmamalı.
  markerScript = path.join(dir, "marker.cjs");
  writeFileSync(markerScript, `require("node:fs").writeFileSync(${JSON.stringify(path.join(dir, "spawned"))}, "1");`);
});

afterEach(async () => {
  const endpoint = manager.getGuiScriptBridgeEndpoint();
  manager.stopGuiScriptBridge();
  if (endpoint) await waitPortFree(endpoint.port);
  delete process.env.FAKE_LIE_PID;
});

async function startFake(port: number, prdSystems: { sid: string; client: string }[] = []) {
  return manager.startGuiScriptBridge({ pythonPath: process.execPath, scriptPath: fakeBridge, port, prdSystems });
}

describe("köprü token'ı", () => {
  it("her başlatışta yeni 32 baytlık token üretiyor ve argv'ye değil ortama koyuyor", async () => {
    const port = await freePort();
    const first = await startFake(port);
    expect(first.ok).toBe(true);
    const e1 = manager.getGuiScriptBridgeEndpoint();
    expect(e1?.port).toBe(port);
    // 32 bayt base64url = 43 karakter.
    expect(e1?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const listed = await client.guiScriptListConnections(e1!);
    expect(listed.ok).toBe(true);
    const echo = listed.connections![0] as any;
    expect(echo.argvHasToken).toBe(false);
    expect(echo.tokenLength).toBe(43);

    manager.stopGuiScriptBridge();
    expect(manager.getGuiScriptBridgeEndpoint()).toBeNull();
    await waitPortFree(port);

    const second = await startFake(port);
    expect(second.ok).toBe(true);
    const e2 = manager.getGuiScriptBridgeEndpoint();
    expect(e2?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(e2?.token).not.toBe(e1?.token);
  }, 30000);

  it("token'ı ana sürecin ortamına sızdırmıyor", async () => {
    const port = await freePort();
    expect((await startFake(port)).ok).toBe(true);
    expect(process.env[manager.GUI_BRIDGE_TOKEN_ENV]).toBeUndefined();
  }, 20000);

  it("PRD listesini başlangıçta ortamdan veriyor", async () => {
    const port = await freePort();
    expect((await startFake(port, [{ sid: "P01", client: "" }])).ok).toBe(true);
    const listed = await client.guiScriptListConnections(manager.getGuiScriptBridgeEndpoint()!);
    expect((listed.connections![0] as any).prd).toEqual([{ sid: "P01", client: "" }]);
  }, 20000);

  it("zaten çalışan kendi köprüsünü yeniden başlatmıyor, aynı token kalıyor", async () => {
    const port = await freePort();
    expect((await startFake(port)).ok).toBe(true);
    const before = manager.getGuiScriptBridgeEndpoint();
    const again = await startFake(port);
    expect(again.ok).toBe(true);
    expect(again.alreadyRunning).toBe(true);
    expect(manager.getGuiScriptBridgeEndpoint()?.token).toBe(before?.token);
  }, 20000);
});

describe("istemci", () => {
  it("her istekte Authorization gönderiyor, Origin göndermiyor", async () => {
    const port = await freePort();
    expect((await startFake(port)).ok).toBe(true);
    const bridge = manager.getGuiScriptBridgeEndpoint()!;
    // Önce bir POST (içerik tipi görünsün), sonra yansıtan GET.
    expect((await client.guiScriptSetPrdSystems(bridge, [{ sid: "P02", client: "" }])).ok).toBe(true);
    const listed = await client.guiScriptListConnections(bridge);
    expect(listed.ok).toBe(true);
    const echo = listed.connections![0] as any;
    expect(echo.headers.origin).toBeNull();
    expect(echo.prd).toEqual([{ sid: "P02", client: "" }]);
  }, 20000);

  it("POST'u application/json ile gönderiyor", async () => {
    const port = await freePort();
    expect((await startFake(port)).ok).toBe(true);
    const bridge = manager.getGuiScriptBridgeEndpoint()!;
    // Sahte köprü json dışını 415'le reddediyor; ok dönmesi başlığın doğru olduğu demek.
    const r = await client.guiScriptSetPrdSystems(bridge, []);
    expect(r).toEqual({ ok: true });
  }, 20000);

  it("yanlış token'la 401 alıyor ve bunu hata olarak döndürüyor", async () => {
    const port = await freePort();
    expect((await startFake(port)).ok).toBe(true);
    const wrong = { port, token: "yanlis-token" };
    const listed = await client.guiScriptListConnections(wrong);
    expect(listed.ok).toBe(false);
    expect(listed.error).toBe("unauthorized");
    const prd = await client.guiScriptSetPrdSystems(wrong, []);
    expect(prd.ok).toBe(false);
  }, 20000);
});

describe("yabancı köprü", () => {
  let foreign: Server | null = null;
  afterEach(async () => {
    await new Promise<void>((r) => (foreign ? foreign.close(() => r()) : r()));
    foreign = null;
  });

  it("portta token'ını bilmediği bir köprü varsa benimsemiyor ve süreç başlatmıyor", async () => {
    const port = await freePort();
    foreign = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, server: "sap-gui-scripting-bridge", pid: 4242 }));
    });
    await new Promise<void>((r) => foreign!.listen(port, "127.0.0.1", () => r()));

    const result = await manager.startGuiScriptBridge({
      pythonPath: process.execPath,
      scriptPath: markerScript,
      port,
      prdSystems: []
    });
    expect(result.ok).toBe(false);
    expect(result.alreadyRunning).toBe(false);
    expect(result.message).toBe(`guiScriptManager.foreignBridge ${JSON.stringify({ port, pid: 4242 })}`);
    expect(manager.getGuiScriptBridgeEndpoint()).toBeNull();
    expect(manager.isGuiScriptBridgeRunning()).toBe(false);
    expect(existsSync(path.join(dir, "spawned"))).toBe(false);
  }, 20000);

  it("sağlık cevabı kendi çocuğunun PID'ini taşımıyorsa köprüyü çalışıyor saymıyor", async () => {
    const port = await freePort();
    process.env.FAKE_LIE_PID = "1";
    const result = await startFake(port);
    expect(result.ok).toBe(false);
    expect(result.message.startsWith("guiScriptManager.didNotStart")).toBe(true);
    expect(manager.getGuiScriptBridgeEndpoint()).toBeNull();
    await waitPortFree(port);
  }, 30000);
});

describe("collectPrdSystems", () => {
  const svc = (uuid: string, systemId: string) => ({ service: { uuid, systemId } });
  const landscape = {
    customers: [
      {
        items: [svc("u-dev", "D01"), svc("u-prd", "p01 ")],
        nodes: [{ items: [svc("u-prd2", "P02"), svc("u-prd-dup", "P01"), svc("u-none", "Q01")] }]
      }
    ]
  } as any;

  it("yalnızca PRD işaretli uuid'lerin SID'lerini, mandantsız ve tekil döndürüyor", () => {
    const out = collectPrdSystems(landscape, {
      "u-dev": "DEV",
      "u-prd": "PRD",
      "u-prd2": "PRD",
      "u-prd-dup": "PRD"
    } as any);
    expect(out).toEqual([
      { sid: "P01", client: "" },
      { sid: "P02", client: "" }
    ]);
  });

  it("işaretlenmemiş sistemi PRD saymıyor (projede bilinmeyen tier QA'ya düşüyor)", () => {
    expect(collectPrdSystems(landscape, undefined)).toEqual([]);
    expect(collectPrdSystems(landscape, { "u-none": "QA" } as any)).toEqual([]);
  });
});
