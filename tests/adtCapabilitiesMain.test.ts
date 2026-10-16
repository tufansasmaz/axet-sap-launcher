// "Ajan bu sistemde" öbeğinin ana süreç tarafı ve Doktor'un 8787 kontrolü.
//
// 8787 `/health`'i de anahtarın arkasında tutuyor. Doktor anahtarsız sorduğu
// için çalışan sunucuyu "kapalı" gösterebiliyordu (2026-10-16 taraması).

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

vi.mock("../app-electron/main/i18n", () => ({ mt: (key: string) => key }));

const { getAdtHttpToken } = await import("../app-electron/main/adtHttpToken");
const { readAdtCapabilities } = await import("../app-electron/main/adtCapabilities");

const SAP = { uuid: "u-1", tier: "DEV" as const };
const servers: Server[] = [];

afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

async function serve(handler: Parameters<typeof createServer>[1]): Promise<number> {
  const srv = createServer(handler);
  servers.push(srv);
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
  const addr = srv.address();
  return typeof addr === "object" && addr ? addr.port : 0;
}

describe("readAdtCapabilities", () => {
  it("anahtarla soruyor; araç listesinden satır kuruyor", async () => {
    const port = await serve((req, res) => {
      if (req.headers.authorization !== `Bearer ${getAdtHttpToken()}`) {
        res.writeHead(401);
        return res.end("{}");
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, tools: ["adt_get_source", "adt_sql", "adt_dumps", "adt_syntax_check"] }));
    });
    const caps = await readAdtCapabilities(port, SAP, "module-consultant");
    expect(caps.systemUuid).toBe("u-1");
    expect(caps.server).toBe("running");
    expect(caps.rows.find((r) => r.id === "tables")?.state).toBe("yes");
    expect(caps.rows.find((r) => r.id === "write")).toEqual({ id: "write", state: "no", reason: "role" });
  });

  it("sunucu yoksa down ve satır yok (✓ gösterilmez)", async () => {
    const port = await serve(() => {});
    servers.pop()?.close();
    await new Promise((r) => setTimeout(r, 50));
    const caps = await readAdtCapabilities(port, SAP, "technical-consultant");
    expect(caps).toEqual({ systemUuid: "u-1", server: "down", rows: [] });
  });

  it("anahtarımızı tanımayan süreç: unauthorized, satır yok", async () => {
    const port = await serve((_req, res) => {
      res.writeHead(401);
      res.end("{}");
    });
    const caps = await readAdtCapabilities(port, SAP, "technical-consultant");
    expect(caps).toEqual({ systemUuid: "u-1", server: "unauthorized", rows: [] });
  });
});

describe("Doktor'un 8787 kontrolü", () => {
  it("anahtarlı yoklamayı kullanıyor, anahtarsız httpOk'u değil", () => {
    const doctor = readFileSync(path.join(__dirname, "..", "app-electron", "main", "doctor.ts"), "utf-8");
    expect(doctor).not.toContain("httpOk(ADT_PORT");
    expect(doctor).toContain("probeAdtTools(ADT_PORT");
  });
});
