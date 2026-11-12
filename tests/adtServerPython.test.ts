// R3/R5 (1.9.x kullanıcı raporu): 8787'deki ADT sunucusu hiç ayağa kalkmıyor,
// "Ajan bu sistemde: ADT sunucusu çalışmıyor" — ama Doktor Python ve paketleri
// "tamam" diyor.
//
// Ölçüldü (2026-11-12, bu makinede): sunucu `py <betik>` ile açılıyordu ve
// betiklerin ilk satırı `#!/usr/bin/env python3`. Python başlatıcısı (py.exe)
// bu satırı görünce varsayılan Python'u DEĞİL, PATH'te ilk bulduğu
// `python3.exe`'yi çalıştırıyor (Microsoft Store takma adını atlıyor):
//   PATH başında 0 baytlık python3.exe → "Unable to create process using
//   '...python3.exe ...': %1 is not a valid Win32 application." (çıkış 101)
//   `py -3 <betik>` → satırı yok sayıyor, varsayılan Python 3 (Doktor'un ve
//   `py -m pip`'in kullandığıyla aynı) çalışıyor.
// 1.9.1'den beri NTT Studio PATH'e ~/.local/bin'i (uv gibi araçların
// python3.exe bıraktığı yer) npm klasörünün ÖNÜNE ekliyordu (a2dade4); o
// python3'te `mcp`/`requests` yoksa sunucu açılıştan düşüyordu.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { startReadonlyServer, stopAllReadonlyServers, failureReason, pythonArgs, lastAdtServerFailure } = await import(
  "../app-electron/main/adtReadonlyServerManager"
);

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

// Salt okunur sarmalayıcının /health'ini taklit eden, betik satırı gerçeğiyle
// aynı olan küçük sunucu (yalnız stdlib).
const SHEBANG_SERVER = `#!/usr/bin/env python3
import json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
port = int(sys.argv[sys.argv.index("--port") + 1])
tok = os.environ.get("ABAP_HTTP_TOKEN", "")
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.headers.get("Authorization") != "Bearer " + tok:
            self.send_response(401); self.end_headers(); return
        body = json.dumps({"ok": True, "tools": ["adt_get_source", "adt_sql", "adt_dump_detail"]}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(body)
HTTPServer(("127.0.0.1", port), H).serve_forever()
`;

let workDir = "";
let pathKey = "PATH";
let savedPath: string | undefined;

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "adt-py-"));
  pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === "path") ?? "PATH";
  savedPath = process.env[pathKey];
});

afterEach(() => {
  stopAllReadonlyServers();
  process.env[pathKey] = savedPath;
});

describe("pythonArgs", () => {
  it("`py` başlatıcısına -3 veriliyor (betik satırı PATH'teki python3'ü seçmesin)", () => {
    expect(pythonArgs("py", "C:\\t\\s.py", ["--http"])).toEqual(["-3", "C:\\t\\s.py", "--http"]);
    expect(pythonArgs("PY.EXE", "s.py", [])).toEqual(["-3", "s.py"]);
  });
  it("gömülü/tam yollu python'a dokunulmuyor", () => {
    expect(pythonArgs("C:\\rt\\python\\python.exe", "s.py", ["--port", "1"])).toEqual(["s.py", "--port", "1"]);
  });
});

describe("failureReason", () => {
  it("bozuk/başka mimari python3.exe açıkça adlandırılıyor", () => {
    const tail =
      "Unable to create process using 'C:\\Users\\x\\.local\\bin\\python3.exe C:\\t\\adt_readonly_server.py --http': %1 is not a valid Win32 application.";
    expect(failureReason(tail, true)).toBe("pythonBadExe");
  });
  it("modül eksikliği ve port", () => {
    expect(failureReason("ModuleNotFoundError: No module named 'mcp'", true)).toBe("mcpMissing");
    expect(failureReason("OSError: [WinError 10048] address already in use", true)).toBe("portInUse");
    expect(failureReason("", true)).toBe("exitedEarly");
  });
});

describe.skipIf(!hasPy())("gerçek py başlatıcısı ile", () => {
  it("PATH'te bozuk python3.exe olsa da sunucu varsayılan Python 3 ile açılıyor", async () => {
    const fakeBin = path.join(workDir, "bin");
    mkdirSync(fakeBin, { recursive: true });
    writeFileSync(path.join(fakeBin, "python3.exe"), "");
    const script = path.join(workDir, "shebang_server.py");
    writeFileSync(script, SHEBANG_SERVER);
    process.env[pathKey] = `${fakeBin};${savedPath ?? ""}`;
    const port = await freePort();
    const r = await startReadonlyServer({ projectDir: workDir, scriptPath: script, pythonPath: "py", port, expectWritable: false });
    expect(r.message).toBe("adtServer.started " + JSON.stringify({ port }));
    expect(r.ok).toBe(true);
  }, 30_000);

  it("açılamayan sunucunun sebebi saklanıyor (Logon ekranı ve günlük için)", async () => {
    const script = path.join(workDir, "dies.py");
    writeFileSync(script, "import sys\nsys.stderr.write(\"ModuleNotFoundError: No module named 'mcp'\\n\")\nsys.exit(1)\n");
    const port = await freePort();
    const r = await startReadonlyServer({ projectDir: workDir, scriptPath: script, pythonPath: "py", port, expectWritable: false });
    expect(r.ok).toBe(false);
    expect(lastAdtServerFailure()?.reason).toBe("mcpMissing");
    expect(lastAdtServerFailure()?.message).toContain("adtServer.mcpMissing");
  }, 30_000);
});
