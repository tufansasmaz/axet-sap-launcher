// Flow "http in" sunucusunun kapı denetimleri (O4): yalnızca 127.0.0.1'e
// bağlanıyor, Host başlığı bu sunucuya ait değilse ve tarayıcıdan gelen
// çapraz origin'li isteklerde 403, 4 MB'ı aşan gövdede 413 dönüyor. curl /
// Postman gibi Origin göndermeyen yerel istemciler eskisi gibi çalışmalı.

import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  FlowRuntime,
  HTTP_IN_MAX_BODY_BYTES,
  checkHttpInRequest
} from "../app-electron/main/flowRuntime.js";

type Runtime = {
  deploy(flow: unknown[]): Promise<{ running: boolean; port: number | null }>;
  stop(): Promise<void>;
  httpServer: http.Server | null;
};

const flow = [
  { id: "tab1", type: "tab", label: "Akis" },
  { id: "in1", type: "http in", z: "tab1", name: "echo", url: "/echo", method: "post", wires: [["out1"]] },
  { id: "out1", type: "http response", z: "tab1", name: "yanit", wires: [] }
];

let rt: Runtime | null = null;
const logs: Array<{ level: string; text: string }> = [];

async function start(): Promise<number> {
  rt = new FlowRuntime({ onLog: (e: { level: string; text: string }) => logs.push(e) }) as unknown as Runtime;
  const r = await rt.deploy(flow);
  expect(r.running).toBe(true);
  expect(r.port).toBeTypeOf("number");
  return r.port as number;
}

afterEach(async () => {
  if (rt) await rt.stop();
  rt = null;
  logs.length = 0;
});

type Reply = { status: number; body: string };

function send(port: number, headers: Record<string, string>, body = "{}"): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, agent: false, path: "/echo", method: "POST", headers: { "Content-Type": "application/json", ...headers } },
      (res) => {
        const parts: Buffer[] = [];
        res.on("data", (c) => parts.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(parts).toString("utf-8") }));
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

describe("flow http-in kapısı", () => {
  it("yalnızca 127.0.0.1'e bağlanıyor", async () => {
    await start();
    const addr = rt!.httpServer!.address();
    expect(addr && typeof addr === "object" ? addr.address : addr).toBe("127.0.0.1");
  });

  it("Origin'siz yerel istemci (curl/Postman) çalışmaya devam ediyor", async () => {
    const port = await start();
    const r = await send(port, {}, JSON.stringify({ a: 1 }));
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ a: 1 });
    const r2 = await send(port, { Host: `localhost:${port}` });
    expect(r2.status).toBe(200);
  });

  it("yabancı Host başlığı 403 (DNS rebinding)", async () => {
    const port = await start();
    const r = await send(port, { Host: `evil.example:${port}` });
    expect(r.status).toBe(403);
    const r2 = await send(port, { Host: `127.0.0.1:${port + 1}` });
    expect(r2.status).toBe(403);
    expect(logs.some((l) => l.text.includes("İstek reddedildi (403)"))).toBe(true);
  });

  it("Origin null ya da yabancıysa 403, kendi origin'i kabul", async () => {
    const port = await start();
    expect((await send(port, { Origin: "null" })).status).toBe(403);
    expect((await send(port, { Origin: "https://evil.example" })).status).toBe(403);
    expect((await send(port, { Origin: `http://localhost:${port + 1}` })).status).toBe(403);
    expect((await send(port, { Origin: `http://127.0.0.1:${port}` })).status).toBe(200);
  });

  it("tarayıcının çapraz site işareti 403", async () => {
    const port = await start();
    expect((await send(port, { "Sec-Fetch-Site": "cross-site" })).status).toBe(403);
    expect((await send(port, { "Sec-Fetch-Site": "same-site" })).status).toBe(403);
    expect((await send(port, { "Sec-Fetch-Site": "none" })).status).toBe(200);
  });

  it("bildirilen gövde 4 MB'ı aşınca 413, gövde okunmuyor", async () => {
    const port = await start();
    const r = await new Promise<Reply>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          agent: false,
          port,
          path: "/echo",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": String(HTTP_IN_MAX_BODY_BYTES + 1) }
        },
        (res) => {
          const parts: Buffer[] = [];
          res.on("data", (c) => parts.push(c));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(parts).toString("utf-8") }));
        }
      );
      // Gövdenin yalnızca başı gönderiliyor: sunucu Content-Length'e bakıp
      // beklemeden cevap vermeli, yoksa bu test zaman aşımına düşer.
      req.on("error", reject);
      req.write("x".repeat(1024));
    });
    expect(r.status).toBe(413);
    expect(JSON.parse(r.body).error).toBe("payload_too_large");
  });

  it("chunked gövde sınırı aşınca 413 ve soket kapanıyor", async () => {
    const port = await start();
    let serverSock: import("node:net").Socket | null = null;
    rt!.httpServer!.once("connection", (s: import("node:net").Socket) => {
      serverSock = s;
    });
    const outcome = await new Promise<{ status: number; closed: boolean }>((resolve) => {
      let status = 0;
      const req = http.request(
        { host: "127.0.0.1", port, agent: false, path: "/echo", method: "POST", headers: { "Transfer-Encoding": "chunked" } },
        (res) => {
          status = res.statusCode ?? 0;
          res.resume();
        }
      );
      const chunk = Buffer.alloc(256 * 1024, 0x61);
      let sent = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve({ status, closed: true });
      };
      req.on("close", finish);
      req.on("error", finish);
      // Sınırın iki katı kadar yazmaya çalış; sunucu arada kesmeli.
      const pump = () => {
        while (sent < HTTP_IN_MAX_BODY_BYTES * 2 && !done) {
          sent += chunk.length;
          if (!req.write(chunk)) {
            req.once("drain", pump);
            return;
          }
        }
        if (!done) req.end();
      };
      pump();
    });
    expect(outcome.status).toBe(413);
    expect(outcome.closed).toBe(true);
    // Okuma gerçekten kesilmiş olmalı: istemci sınırın iki katını yollamaya
    // çalıştı, sunucu sınırın biraz ötesinde durdu.
    await new Promise((r) => setTimeout(r, 200));
    const read = (serverSock as import("node:net").Socket | null)?.bytesRead ?? 0;
    expect(read).toBeGreaterThan(HTTP_IN_MAX_BODY_BYTES);
    expect(read).toBeLessThan(HTTP_IN_MAX_BODY_BYTES + 1024 * 1024);
    expect(logs.some((l) => l.text.includes("İstek reddedildi (413)"))).toBe(true);
  });
});

describe("checkHttpInRequest (saf)", () => {
  const req = (headers: Record<string, string>, raw?: string[]) => ({
    headers,
    rawHeaders: raw ?? Object.entries(headers).flat()
  });

  it("birden fazla Host başlığı reddediliyor", () => {
    const r = checkHttpInRequest(req({ host: "127.0.0.1:5000" }, ["Host", "127.0.0.1:5000", "Host", "evil:5000"]), 5000);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("Host büyük/küçük harf duyarsız", () => {
    expect(checkHttpInRequest(req({ host: "LOCALHOST:5000" }), 5000).ok).toBe(true);
  });

  it("Host başlığı yoksa reddediliyor", () => {
    expect(checkHttpInRequest(req({}), 5000).ok).toBe(false);
  });
});
