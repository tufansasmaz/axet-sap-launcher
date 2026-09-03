import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";

// `sap_gui_scripting_bridge.py`'yi (bkz. resources/sap-gui-scripting) yönetir —
// `rfcBridgeManager.ts`/`adtReadonlyServerManager.ts` ile AYNI desen
// (spawn/health-check/stop, log tail'i hata teşhisi için biriktirilir). Tek
// bir FARK: RFC bridge/readonly server proje klasörü BAŞINA bir process
// tutar (`Map<projectDir, ...>`) — bu bridge ise `connectToSystem()` akışına
// hiç bağlı değil, SAP GUI Scripting zaten kullanıcının o an açık olan
// SAP Logon oturumuna bağlanıyor, proje kavramı yok — bu yüzden TEK bir
// global (singleton) process yönetiliyor.

export interface GuiScriptBridgeStartOptions {
  pythonPath: string;
  scriptPath: string;
  port: number;
  logFilePath?: string;
}

export interface GuiScriptBridgeStartResult {
  ok: boolean;
  alreadyRunning: boolean;
  external: boolean;
  port: number;
  message: string;
}

interface RunningBridge {
  proc: ChildProcess | null;
  port: number;
  tail: string[];
  exited: boolean;
  exitInfo: string;
  external: boolean;
}

let current: RunningBridge | null = null;

function pushTail(bridge: RunningBridge, chunk: Buffer): void {
  bridge.tail.push(chunk.toString("utf-8"));
  if (bridge.tail.length > 60) bridge.tail.shift();
}

function healthCheck(port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpRequest(
      { host: "127.0.0.1", port, path: "/health", method: "GET", timeout: timeoutMs },
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

function describeFailure(bridge: RunningBridge): string {
  const tail = bridge.tail.join("").trim();
  let hint = "";
  if (/no module named ['"]win32com['"]|no module named ['"]pythoncom['"]/i.test(tail)) {
    hint = "pywin32 bulunamadı — gömülü SAP GUI Scripting runtime'ı (resources/guiscript-runtime) bozuk/eksik olabilir, uygulamayı yeniden kur.";
  } else if (/sadece windows'ta calisir/i.test(tail)) {
    hint = "SAP GUI Scripting sadece Windows'ta çalışır.";
  } else if (/address already in use|eaddrinuse/i.test(tail)) {
    hint = `${bridge.port} portu başka bir process tarafından kullanılıyor.`;
  } else if (!tail && bridge.exited) {
    hint = `process erken sonlandı (${bridge.exitInfo}).`;
  } else if (!tail) {
    hint = "gömülü Python çalıştırılabilir bulunamadı — uygulama kurulumu bozuk olabilir.";
  }
  const detail = tail ? ` Detay: ${tail.slice(-500)}` : "";
  return `${hint}${detail}`;
}

export async function startGuiScriptBridge(opts: GuiScriptBridgeStartOptions): Promise<GuiScriptBridgeStartResult> {
  if (current && current.port === opts.port && (current.external || (!current.proc?.killed && !current.exited))) {
    const alive = await healthCheck(current.port);
    if (alive) {
      return { ok: true, alreadyRunning: true, external: current.external, port: current.port, message: "SAP GUI Scripting bridge zaten çalışıyor." };
    }
    stopGuiScriptBridge();
  }

  // Kullanıcı elle başlattıysa veya önceki bir oturumdan process hâlâ
  // ayaktaysa - ikinci bir process açıp EADDRINUSE'a düşme (adtReadonlyServerManager.ts
  // ile AYNI "external" tespiti).
  if (await healthCheck(opts.port)) {
    current = { proc: null, port: opts.port, tail: [], exited: false, exitInfo: "", external: true };
    return { ok: true, alreadyRunning: true, external: true, port: opts.port, message: "SAP GUI Scripting bridge bu portta zaten (başka bir process tarafından) çalışıyor." };
  }

  const bridge: RunningBridge = { proc: null, port: opts.port, tail: [], exited: false, exitInfo: "", external: false };

  let proc: ChildProcess;
  try {
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--port", String(opts.port)], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    return { ok: false, alreadyRunning: false, external: false, port: opts.port, message: `SAP GUI Scripting bridge process başlatılamadı (${opts.pythonPath}): ${(err as Error).message}` };
  }

  bridge.proc = proc;
  proc.stdout?.on("data", (chunk: Buffer) => pushTail(bridge, chunk));
  proc.stderr?.on("data", (chunk: Buffer) => pushTail(bridge, chunk));
  proc.on("exit", (code, signal) => {
    bridge.exited = true;
    bridge.exitInfo = `exit code=${code ?? "?"} signal=${signal ?? "-"}`;
  });
  proc.on("error", (err) => {
    bridge.exited = true;
    bridge.exitInfo = err.message;
  });

  current = bridge;

  const timeoutMs = 10000;
  const intervalMs = 400;
  const deadline = Date.now() + timeoutMs;
  let healthy = false;
  while (Date.now() < deadline) {
    if (bridge.exited) break;
    if (await healthCheck(opts.port, 1200)) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const message = `SAP GUI Scripting bridge ${opts.port} portunda ayağa kalkmadı. ${describeFailure(bridge)}`;
    stopGuiScriptBridge();
    return { ok: false, alreadyRunning: false, external: false, port: opts.port, message };
  }

  return { ok: true, alreadyRunning: false, external: false, port: opts.port, message: `SAP GUI Scripting bridge başlatıldı (http://127.0.0.1:${opts.port}).` };
}

export function stopGuiScriptBridge(): void {
  if (!current) return;
  if (!current.external) {
    try {
      current.proc?.kill();
    } catch {
      // best effort
    }
  }
  current = null;
}

export function isGuiScriptBridgeRunning(): boolean {
  return Boolean(current && (current.external || (!current.proc?.killed && !current.exited)));
}

export function getGuiScriptBridgePort(): number | null {
  return current?.port ?? null;
}
