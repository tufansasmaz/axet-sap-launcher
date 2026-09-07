import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mt } from "./i18n";

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

// "2xx döndü" YETMEZ — cevabın BİZİM köprümüzden geldiği doğrulanır.
// Aksi halde 8790'da oturan alakasız bir servis "bridge çalışıyor" diye
// benimsenir (aşağıdaki `external` yolu) ve sonraki her çağrı anlaşılmaz
// bir hatayla düşer. Köprü artık `/health`'te kendi adını ve PID'ini
// söylüyor; PID de "cevaplayan, benim başlattığım çocuk mu" sorusunun
// tek gerçek cevabı (aynı porta iki köprü bağlanabiliyordu — bkz.
// bridge'teki `_Server`).
function healthCheck(port: number, timeoutMs = 2000): Promise<{ ok: boolean; pid?: number }> {
  return new Promise((resolve) => {
    const req = httpRequest(
      { host: "127.0.0.1", port, path: "/health", method: "GET", timeout: timeoutMs },
      (res) => {
        const status = res.statusCode ?? 0;
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (c: string) => {
          if (body.length < 4096) body += c;
        });
        res.on("end", () => {
          if (status < 200 || status >= 300) return resolve({ ok: false });
          try {
            const json = JSON.parse(body) as { server?: string; pid?: number };
            resolve(
              json?.server === "sap-gui-scripting-bridge"
                ? { ok: true, pid: json.pid }
                : { ok: false }
            );
          } catch {
            resolve({ ok: false });
          }
        });
      }
    );
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false });
    });
    req.end();
  });
}

function describeFailure(bridge: RunningBridge): string {
  const tail = bridge.tail.join("").trim();
  let hint = "";
  if (/no module named ['"]win32com['"]|no module named ['"]pythoncom['"]/i.test(tail)) {
    hint = mt("guiScriptManager.pywin32Missing");
  } else if (/sadece windows'ta calisir/i.test(tail)) {
    hint = mt("guiScriptManager.windowsOnly");
  } else if (/address already in use|eaddrinuse|winerror 10048|only one usage of each socket/i.test(tail)) {
    // Windows'un mesajı "address already in use" DEĞİL: "Only one usage of
    // each socket address ... (WinError 10048)". Sadece BSD metnine bakan
    // eski koşul bu ipucunu Windows'ta hiç veremezdi — yani tam da bu
    // uygulamanın çalıştığı yerde.
    hint = mt("guiScriptManager.portInUse", { port: bridge.port });
  } else if (!tail && bridge.exited) {
    hint = mt("guiScriptManager.exitedEarly", { detail: bridge.exitInfo });
  } else if (!tail) {
    hint = mt("guiScriptManager.pythonMissing");
  }
  const detail = tail ? mt("common.detailSuffix", { tail: tail.slice(-500) }) : "";
  return `${hint}${detail}`;
}

export async function startGuiScriptBridge(opts: GuiScriptBridgeStartOptions): Promise<GuiScriptBridgeStartResult> {
  if (current && current.port === opts.port && (current.external || (!current.proc?.killed && !current.exited))) {
    const alive = (await healthCheck(current.port)).ok;
    if (alive) {
      return { ok: true, alreadyRunning: true, external: current.external, port: current.port, message: mt("guiScriptManager.alreadyRunning") };
    }
    stopGuiScriptBridge();
  }

  // Kullanıcı elle başlattıysa veya önceki bir oturumdan process hâlâ
  // ayaktaysa - ikinci bir process açıp EADDRINUSE'a düşme (adtReadonlyServerManager.ts
  // ile AYNI "external" tespiti).
  const foreign = await healthCheck(opts.port);
  if (foreign.ok) {
    current = { proc: null, port: opts.port, tail: [], exited: false, exitInfo: "", external: true };
    return {
      ok: true,
      alreadyRunning: true,
      external: true,
      port: opts.port,
      message: mt("guiScriptManager.externalOnPort") + (foreign.pid ? ` (PID ${foreign.pid}).` : ".")
    };
  }

  const bridge: RunningBridge = { proc: null, port: opts.port, tail: [], exited: false, exitInfo: "", external: false };

  let proc: ChildProcess;
  try {
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--port", String(opts.port)], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    return { ok: false, alreadyRunning: false, external: false, port: opts.port, message: mt("guiScriptManager.spawnFailed", { pythonPath: opts.pythonPath, detail: (err as Error).message }) };
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
    if ((await healthCheck(opts.port, 1200)).ok) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const message = mt("guiScriptManager.didNotStart", { port: opts.port, detail: describeFailure(bridge) });
    stopGuiScriptBridge();
    return { ok: false, alreadyRunning: false, external: false, port: opts.port, message };
  }

  return { ok: true, alreadyRunning: false, external: false, port: opts.port, message: mt("guiScriptManager.started", { port: opts.port }) };
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
