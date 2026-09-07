// Ortam Hazırlık teşhisi.
//
// Neden var: bu uygulamanın SAP tarafı bir Python sürecine dayanıyor
// (`adt_readonly_server.py`) ve o süreç eksik bir pip paketi yüzünden
// açılmadığında kullanıcının gördüğü tek şey "sunucu başlamadı" oluyordu.
// Sebep log'un içinde, log da ekranda değil. Burası o sebebi ÖNCEDEN, tek
// ekranda gösteriyor.
//
// Her başarısız satır iki şey taşımak zorunda: hatanın kendi metni ve BT'ye
// olduğu gibi verilebilecek komut. Kurumsal makinede kullanıcının kendi
// kuramadığı bir şey çıktığında sohbetin devamı "ne yazayım onlara?" oluyor;
// cevabı satırın içinde duruyor.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { request as httpRequest } from "node:http";
import path from "node:path";
import { app } from "electron";
import { axetCodeVersion } from "./axetCodeVersion";
import { getToolkitRoot, readToolkitVersion } from "./sapToolkit";
import type { DoctorReport, DoctorRow } from "../shared/types";
import { mt } from "./i18n";

/** Kurulu olması gereken pip paketleri: pip adı -> import adı. */
export const REQUIRED_PACKAGES: Record<string, string> = {
  requests: "requests",
  "python-dotenv": "dotenv",
  mcp: "mcp",
  pandas: "pandas",
  openpyxl: "openpyxl",
  "python-docx": "docx",
  "python-pptx": "pptx",
  markdown: "markdown"
};

const PY_CANDIDATES = ["py", "python"];

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Çalıştırılabilir hiç bulunamadıysa true — "hata verdi"den farklı. */
  missing: boolean;
}

function run(exe: string, args: string[], timeoutMs = 20_000): Promise<RunResult> {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(exe, args, { windowsHide: true });
    } catch {
      resolve({ ok: false, stdout: "", stderr: "", missing: true });
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* zaten ölmüş olabilir */
      }
      finish({ ok: false, stdout, stderr: stderr || mt("doctor.timedOut"), missing: false });
    }, timeoutMs);
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    proc.on("error", () => {
      clearTimeout(timer);
      finish({ ok: false, stdout, stderr, missing: true });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      finish({ ok: code === 0, stdout, stderr, missing: false });
    });
  });
}

/** Sistemde çalışan ilk Python çalıştırıcısı — `py`, yoksa `python`. */
export async function resolvePython(): Promise<{ exe: string; version: string } | null> {
  for (const exe of PY_CANDIDATES) {
    const result = await run(exe, ["--version"], 8_000);
    if (result.ok) {
      // `py --version` sürümü bazı sürümlerde stderr'e yazıyor.
      const version = (result.stdout || result.stderr).trim();
      return { exe, version };
    }
  }
  return null;
}

function httpOk(port: number, pathname: string, timeoutMs = 1_500): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpRequest(
      { host: "127.0.0.1", port, path: pathname, method: "GET", timeout: timeoutMs },
      (res) => {
        res.resume();
        const status = res.statusCode ?? 0;
        resolve(status >= 200 && status < 300);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

const ADT_PORT = 8787;
const RFC_BRIDGE_PORT = 8788;

export async function runDoctor(): Promise<DoctorReport> {
  const rows: DoctorRow[] = [];
  const python = await resolvePython();

  rows.push(
    python
      ? { id: "python", status: "ok", detail: python.version }
      : {
          id: "python",
          status: "fail",
          detail: mt("doctor.pythonMissingDetail"),
          command: "winget install --id Python.Python.3.12 --source winget"
        }
  );

  // Paketler TEK bir Python çağrısında sorgulanıyor. Paket başına bir süreç
  // açmak (8 paket = 8 yorumlayıcı başlangıcı) bu ekranı saniyelerce
  // bekletiyordu ve verdiği bilgi aynı.
  let missingPackages: string[] = [];
  if (python) {
    const probe =
      "import importlib.util,json;" +
      `mods=${JSON.stringify(REQUIRED_PACKAGES)};` +
      "print(json.dumps({p:(importlib.util.find_spec(m) is not None) for p,m in mods.items()}))";
    const result = await run(python.exe, ["-c", probe]);
    if (result.ok) {
      try {
        const found = JSON.parse(result.stdout.trim()) as Record<string, boolean>;
        missingPackages = Object.keys(REQUIRED_PACKAGES).filter((pkg) => !found[pkg]);
      } catch {
        missingPackages = [];
      }
      rows.push(
        missingPackages.length === 0
          ? {
              id: "packages",
              status: "ok",
              detail: mt("doctor.packagesOk", { count: Object.keys(REQUIRED_PACKAGES).length })
            }
          : {
              id: "packages",
              status: "fail",
              detail: mt("doctor.packagesMissing", { list: missingPackages.join(", ") }),
              command: `${python.exe} -m pip install --user ${missingPackages.join(" ")}`,
              fixable: true
            }
      );
    } else {
      rows.push({
        id: "packages",
        status: "fail",
        detail: (result.stderr || result.stdout).trim() || mt("doctor.probeFailed"),
        command: `${python.exe} -m pip install --user ${Object.keys(REQUIRED_PACKAGES).join(" ")}`,
        fixable: true
      });
    }
  } else {
    rows.push({ id: "packages", status: "unknown", detail: mt("doctor.needsPython") });
  }

  const adtAlive = await httpOk(ADT_PORT, "/health");
  rows.push({
    id: "adtServer",
    status: adtAlive ? "ok" : "warn",
    detail: adtAlive
      ? mt("doctor.adtAlive", { port: ADT_PORT })
      : mt("doctor.adtDown", { port: ADT_PORT })
  });

  const rfcAlive = await httpOk(RFC_BRIDGE_PORT, "/health");
  rows.push({
    id: "rfcBridge",
    status: rfcAlive ? "ok" : "info",
    detail: rfcAlive
      ? mt("doctor.rfcAlive", { port: RFC_BRIDGE_PORT })
      : mt("doctor.rfcDown", { port: RFC_BRIDGE_PORT })
  });

  // RFC runtime uygulamayla birlikte geliyor; yoksa router-only sistemlerde
  // köprü hiç başlamaz ve sebebi hiçbir yerde görünmez.
  const rfcRuntime = app.isPackaged
    ? path.join(process.resourcesPath, "rfc-runtime")
    : path.join(app.getAppPath(), "resources", "rfc-runtime");
  rows.push({
    id: "rfcRuntime",
    status: existsSync(rfcRuntime) ? "ok" : "warn",
    detail: existsSync(rfcRuntime) ? rfcRuntime : mt("doctor.rfcRuntimeMissing")
  });

  const axetVersion = axetCodeVersion();
  rows.push(
    axetVersion
      ? { id: "axetCode", status: "ok", detail: axetVersion }
      : { id: "axetCode", status: "warn", detail: mt("doctor.axetUnknown") }
  );

  const toolkitRoot = getToolkitRoot();
  const toolkit = readToolkitVersion();
  rows.push(
    toolkitRoot
      ? {
          id: "toolkit",
          status: "ok",
          detail: toolkit ? `${toolkit.version} · ${toolkitRoot}` : toolkitRoot
        }
      : { id: "toolkit", status: "fail", detail: mt("doctor.toolkitMissing") }
  );

  return { rows, python: python?.exe ?? null, missingPackages, checkedAt: new Date().toISOString() };
}

/**
 * Eksik pip paketlerini kurar.
 *
 * `--user` bilinçli: kurumsal makinede yönetici olmayan kullanıcı `pip
 * install` yaptığında yazma izni olmayan bir klasöre kurmaya çalışıp
 * anlaşılmaz bir izin hatası alıyor. `--user` kendi profiline kuruyor ve
 * yönetici gerektirmiyor.
 */
export async function installMissingPackages(packages: string[]): Promise<{ ok: boolean; output: string }> {
  const clean = packages.filter((pkg) => Object.prototype.hasOwnProperty.call(REQUIRED_PACKAGES, pkg));
  if (clean.length === 0) return { ok: false, output: mt("doctor.nothingToInstall") };
  const python = await resolvePython();
  if (!python) return { ok: false, output: mt("doctor.pythonMissingDetail") };
  const result = await run(python.exe, ["-m", "pip", "install", "--user", ...clean], 300_000);
  return { ok: result.ok, output: (result.stdout + result.stderr).trim() };
}
