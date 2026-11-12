// Kalan 8787 (kararlılık 3, 2026-11-12): önceki bir NTT Studio oturumundan
// kalan salt okunur sunucu yeni açılışta 401 veriyor (bellekteki jeton her
// açılışta yeni) ve "jetonumuzu bilmeyen sunucuya dokunma" kuralı yüzünden hiçbir
// sisteme ADT çalışmıyordu.
//
// Ölçüldü: NTT Studio'nun (libuv) doğrudan başlattığı sunucu ebeveyni ölünce
// onunla gidiyor (iş nesnesi); arta kalan, ağacın dışına düşmüş (ayrık
// başlatılmış: ajanın arka plan komutu gibi) sunucu. Jeton dışında kanıt:
// dinleyen süreç python/py, komut satırı bizim `sap-adt*/scripts/adt_*_server.py`
// betiğimiz ve onu başlatan zincirde (py/python/cmd dışında) yaşayan bir süreç
// yok ya da eski bir NTT Studio. Kanıt yoksa dokunulmuyor; süreç adı söyleniyor.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { getAdtHttpToken } = await import("../app-electron/main/adtHttpToken");
const { startReadonlyServer, stopAllReadonlyServers, staleOwnServer } = await import("../app-electron/main/adtReadonlyServerManager");

function hasPy(): boolean {
  if (process.platform !== "win32") return false;
  try {
    execFileSync("py", ["-3", "-c", "print(1)"], { windowsHide: true, stdio: "ignore", timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

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
    httpRequest({ host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${token}` }, timeout: 1000 }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    })
      .on("error", () => resolve(0))
      .end();
  });
}

// Salt okunur sarmalayıcının /health'i: yalnız KENDİ jetonuna 200.
const PY_SERVER = `import json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
port = int(sys.argv[sys.argv.index("--port") + 1])
tok = os.environ.get("ABAP_HTTP_TOKEN", "")
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.headers.get("Authorization") != "Bearer " + tok:
            self.send_response(401); self.end_headers(); return
        body = json.dumps({"ok": True, "tools": ["adt_get_source", "adt_sql", "adt_dump_detail"]}).encode()
        self.send_response(200); self.end_headers(); self.wfile.write(body)
HTTPServer(("127.0.0.1", port), H).serve_forever()
`;

// Ayrık başlatıp hemen çıkan ara süreç: arta kalan sunucunun ebeveyni ölü.
const ORPHAN_LAUNCHER = `
const { spawn } = require("node:child_process");
const [script, port] = process.argv.slice(2);
const c = spawn("py", ["-3", script, "--http", "--port", port], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, ABAP_HTTP_TOKEN: "onceki-oturumun-jetonu" } });
c.unref();
setTimeout(() => process.exit(0), 300);
`;

let dir = "";
let script = "";
let launcher = "";
const extra: ChildProcess[] = [];

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "adt-stale-"));
  const scripts = path.join(dir, "sap-consultant", "skills", "sap-adt-readonly", "scripts");
  mkdirSync(scripts, { recursive: true });
  script = path.join(scripts, "adt_readonly_server.py");
  writeFileSync(script, PY_SERVER);
  launcher = path.join(dir, "orphan.cjs");
  writeFileSync(launcher, ORPHAN_LAUNCHER);
});

afterEach(() => {
  stopAllReadonlyServers();
  for (const c of extra.splice(0)) {
    try {
      c.kill();
    } catch {
      /* kapandı */
    }
  }
});

describe("staleOwnServer", () => {
  const ours = "\"C:\\Program Files\\Python314\\python.exe\" C:\\P\\NTT Studio\\resources\\sap-toolkit\\sap-consultant\\skills\\sap-adt-readonly\\scripts\\adt_readonly_server.py --http --port 8787";
  const procs = (rows: [number, number, string, string][]) => new Map(rows.map(([pid, ppid, name, cmd]) => [pid, { pid, ppid, name, cmd }]));

  it("bizim betiğimiz + zincirde yaşayan başlatıcı yok → bizim arta kalanımız", () => {
    const p = procs([
      [30, 20, "python.exe", ours],
      [20, 10, "py.exe", "py -3 ..."]
    ]);
    expect(staleOwnServer(30, p, 999)).toEqual({ ours: true, name: "python.exe" });
  });

  it("zincirde eski bir NTT Studio → bizim", () => {
    const p = procs([
      [30, 20, "python.exe", ours],
      [20, 10, "py.exe", "py"],
      [10, 1, "NTT Studio.exe", "NTT Studio.exe"]
    ]);
    expect(staleOwnServer(30, p, 999).ours).toBe(true);
  });

  it("yaşayan başka bir başlatıcı (kullanıcının terminali) → dokunma", () => {
    const p = procs([
      [30, 20, "python.exe", ours],
      [20, 10, "py.exe", "py"],
      [10, 1, "WindowsTerminal.exe", "wt"]
    ]);
    expect(staleOwnServer(30, p, 999)).toEqual({ ours: false, name: "python.exe" });
  });

  it("başka bir betik ya da başka program → dokunma, adı söyleniyor", () => {
    expect(staleOwnServer(30, procs([[30, 1, "python.exe", "python other_server.py --port 8787"]]), 999).ours).toBe(false);
    expect(staleOwnServer(30, procs([[30, 1, "java.exe", "java -jar x.jar"]]), 999)).toEqual({ ours: false, name: "java.exe" });
    expect(staleOwnServer(30, new Map(), 999)).toEqual({ ours: false, name: "" });
  });
});

describe.skipIf(!hasPy())("gerçek süreçlerle", () => {
  it("önceki oturumdan kalan (401) sunucumuz kapatılıp yenisi açılıyor", async () => {
    const port = await freePort();
    spawn(process.execPath, [launcher, script, String(port)], { stdio: "ignore", windowsHide: true });
    for (let i = 0; i < 60 && (await status(port, "x")) !== 401; i++) await new Promise((r) => setTimeout(r, 250));
    expect(await status(port, getAdtHttpToken())).toBe(401);

    const r = await startReadonlyServer({ projectDir: dir, scriptPath: script, pythonPath: "py", port, expectWritable: false });
    expect(r.message).toBe("adtServer.started " + JSON.stringify({ port }));
    expect(await status(port, getAdtHttpToken())).toBe(200);
  }, 60_000);

  it("kanıtlanamayan (başka programın) 401 sunucusuna dokunulmuyor, adı söyleniyor", async () => {
    const port = await freePort();
    const other = spawn(
      process.execPath,
      ["-e", `require("http").createServer((q,s)=>{s.writeHead(401);s.end()}).listen(${port},"127.0.0.1")`],
      { stdio: "ignore", windowsHide: true }
    );
    extra.push(other);
    for (let i = 0; i < 40 && (await status(port, "x")) !== 401; i++) await new Promise((r) => setTimeout(r, 100));
    const r = await startReadonlyServer({ projectDir: dir, scriptPath: script, pythonPath: "py", port, expectWritable: false });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("portBusyOther");
    expect(r.message).toContain("node");
    expect(await status(port, "x")).toBe(401);
  }, 60_000);
});
