// Sistem degistirme: RFC koprusu (kararlilik-2, R8a).
//
// Kullanici: "Bir sisteme baglaninca baska sisteme gecerken o sisteme
// baglanmiyor; baglantiyi kessem de fark etmiyor."
//
// Kok neden (olculdu, ilk test bu hatayla kirmiziydi): kopru portu (8788) her
// sistem icin ayni, ama `startRfcBridge` yalniz AYNI proje klasorunun eski
// koprusunu durduruyordu. B sistemine gecince A'nin koprusu portu tutmaya
// devam ediyor, B'nin sureci EADDRINUSE ile oluyor; saglik yoklamasi ise
// portta A'yi buldugu icin "kopru ayakta" diyordu. B'nin kimlik dogrulamasi ve
// sonraki butun ADT cagrilari A'nin SAP sistemine gidiyordu.

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer, request } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { startRfcBridge, stopAllRfcBridges, stopRfcBridge } from "../app-electron/main/rfcBridgeManager";

const SCRIPT = path.join(__dirname, "fixtures", "fakeRfcBridge.cjs");

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

function health(port: number): Promise<string | null> {
  return new Promise((resolve) => {
    const req = request({ host: "127.0.0.1", port, path: "/health", timeout: 1500 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve((JSON.parse(body) as { project: string }).project);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

const tmp = mkdtempSync(path.join(os.tmpdir(), "rfc-switch-"));
function project(name: string): string {
  const dir = path.join(tmp, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

afterEach(() => {
  stopAllRfcBridges();
});

afterAll(() => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* gecici klasor; surec kilidi kalmis olabilir */
  }
});

describe("RFC koprusu: sistem degistirme", () => {
  it("B'ye gecince portu A'nin koprusu degil B'ninki tutar", async () => {
    const port = await freePort();
    const opts = { scriptPath: SCRIPT, pythonPath: process.execPath, bridgePort: port };

    const first = await startRfcBridge({ ...opts, projectDir: project("sistemA") });
    expect(first.ok).toBe(true);
    expect(await health(port)).toBe("sistemA");

    const second = await startRfcBridge({ ...opts, projectDir: project("sistemB") });
    expect(second.ok).toBe(true);
    expect(await health(port)).toBe("sistemB");
  }, 30_000);

  it("ayni sisteme yeniden baglanmak koprunu yeniler (.conn_adt yeniden yazildi)", async () => {
    const port = await freePort();
    const opts = { scriptPath: SCRIPT, pythonPath: process.execPath, bridgePort: port, projectDir: project("sistemA2") };
    expect((await startRfcBridge(opts)).ok).toBe(true);
    const again = await startRfcBridge(opts);
    expect(again.ok).toBe(true);
    // Eski surec .conn_adt'i acilista okudu; yeni kullanici/client'i bilmez.
    expect(again.alreadyRunning).toBe(false);
    expect(await health(port)).toBe("sistemA2");
  }, 30_000);

  it("portu bizim olmayan bir surec tutuyorsa basarili DEMEZ", async () => {
    const port = await freePort();
    const foreign = createServer((_req, res) => {
      res.writeHead(200);
      res.end(JSON.stringify({ project: "yabanci" }));
    });
    await new Promise<void>((r) => foreign.listen(port, "127.0.0.1", () => r()));
    try {
      const result = await startRfcBridge({
        scriptPath: SCRIPT,
        pythonPath: process.execPath,
        bridgePort: port,
        projectDir: project("sistemC"),
        portFreeWaitMs: 300
      });
      expect(result.ok).toBe(false);
    } finally {
      foreign.close();
    }
  }, 30_000);

  it("stopRfcBridge portu birakir", async () => {
    const port = await freePort();
    const dir = project("sistemD");
    await startRfcBridge({ scriptPath: SCRIPT, pythonPath: process.execPath, bridgePort: port, projectDir: dir });
    stopRfcBridge(dir);
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && (await health(port)) !== null) await new Promise((r) => setTimeout(r, 100));
    expect(await health(port)).toBeNull();
  }, 30_000);
});
