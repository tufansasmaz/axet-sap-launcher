import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { request as httpRequest } from "node:http";
import { mt } from "./i18n";

// Router'ın raw/native HTTPS'i reddettiği (-94 NIEROUT_PERM_DENIED) sistemlerde
// `adt_rfc_bridge.py`'yi (bkz. resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/scripts)
// launcher'ın kendisi başlatır — kullanıcı artık elle "py adt_rfc_bridge.py --port ..."
// çalıştırmak zorunda değil. Bridge process'i proje klasörü başına tek bir kez
// açılır (tekrar bağlanışlarda zaten sağlıklıysa yeniden başlatılmaz), uygulama
// kapanana kadar arka planda yaşar.

export interface RfcBridgeStartOptions {
  projectDir: string;
  scriptPath: string;
  pythonPath: string;
  bridgePort: number;
  sapnwrfcHome?: string;
}

export interface RfcBridgeStartResult {
  ok: boolean;
  alreadyRunning: boolean;
  message: string;
}

interface RunningBridge {
  proc: ChildProcess;
  port: number;
  logStream: WriteStream | null;
  tail: string[];
  exited: boolean;
  exitInfo: string;
}

const running = new Map<string, RunningBridge>();

function pushTail(bridge: RunningBridge, chunk: Buffer): void {
  const text = chunk.toString("utf-8");
  bridge.logStream?.write(text);
  bridge.tail.push(text);
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

function describeFailure(bridge: RunningBridge, usingEmbedded: boolean): string {
  const tail = bridge.tail.join("").trim();
  let hint = "";
  if (/no module named ['"]pyrfc['"]/i.test(tail)) {
    hint = usingEmbedded
      ? mt("rfcBridge.pyrfcMissingEmbedded")
      : mt("rfcBridge.pyrfcMissing");
  } else if (/dll load failed|not a valid win32 application|%1 is not a valid/i.test(tail)) {
    hint = usingEmbedded
      ? mt("rfcBridge.sdkLoadFailedEmbedded")
      : mt("rfcBridge.sdkLoadFailed");
  } else if (/sapnwrfc_home/i.test(tail)) {
    hint = mt("rfcBridge.homeNotSet");
  } else if (/python-dotenv/i.test(tail)) {
    hint = mt("rfcBridge.dotenvMissing");
  } else if (/logon|password|incorrect|invalid user/i.test(tail)) {
    hint = mt("rfcBridge.logonError");
  } else if (!tail && bridge.exited) {
    hint = mt("rfcBridge.exitedEarly", { detail: bridge.exitInfo });
  } else if (!tail) {
    hint = usingEmbedded
      ? mt("rfcBridge.pythonMissingEmbedded")
      : mt("rfcBridge.pythonMissing");
  }
  const detail = tail ? mt("common.detailSuffix", { tail: tail.slice(-500) }) : "";
  return `${hint}${detail}`;
}

export async function startRfcBridge(opts: RfcBridgeStartOptions): Promise<RfcBridgeStartResult> {
  const key = opts.projectDir;
  const existing = running.get(key);
  if (existing && existing.port === opts.bridgePort && !existing.proc.killed && !existing.exited) {
    const alive = await healthCheck(existing.port);
    if (alive) {
      return { ok: true, alreadyRunning: true, message: mt("rfcBridge.alreadyRunning") };
    }
    stopRfcBridge(key);
  }

  let logStream: WriteStream | null = null;
  try {
    logStream = createWriteStream(`${opts.projectDir}/rfc-bridge.log`, { flags: "a" });
  } catch {
    logStream = null;
  }

  const bridge: RunningBridge = {
    proc: null as unknown as ChildProcess,
    port: opts.bridgePort,
    logStream,
    tail: [],
    exited: false,
    exitInfo: ""
  };

  const env = { ...process.env };
  if (opts.sapnwrfcHome) {
    env.SAPNWRFC_HOME = opts.sapnwrfcHome;
    const libDir = `${opts.sapnwrfcHome}\\lib`;
    env.PATH = `${libDir};${env.PATH ?? ""}`;
  }

  let proc: ChildProcess;
  try {
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--port", String(opts.bridgePort)], {
      cwd: opts.projectDir,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    logStream?.end();
    return { ok: false, alreadyRunning: false, message: mt("rfcBridge.spawnFailed", { pythonPath: opts.pythonPath, detail: (err as Error).message }) };
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

  running.set(key, bridge);

  const timeoutMs = 20000;
  const intervalMs = 600;
  const deadline = Date.now() + timeoutMs;
  let healthy = false;
  while (Date.now() < deadline) {
    if (bridge.exited) break;
    if (await healthCheck(opts.bridgePort, 1500)) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const message = mt("rfcBridge.didNotStart", { port: opts.bridgePort, detail: describeFailure(bridge, Boolean(opts.sapnwrfcHome)) });
    stopRfcBridge(key);
    return { ok: false, alreadyRunning: false, message };
  }

  return { ok: true, alreadyRunning: false, message: mt("rfcBridge.started", { port: opts.bridgePort }) };
}

export function stopRfcBridge(key: string): void {
  const entry = running.get(key);
  if (!entry) return;
  try {
    entry.proc.kill();
  } catch {
    // best effort
  }
  try {
    entry.logStream?.end();
  } catch {
    // best effort
  }
  running.delete(key);
}

export function stopAllRfcBridges(): void {
  for (const key of Array.from(running.keys())) {
    stopRfcBridge(key);
  }
}

export function isRfcBridgeRunning(key: string): boolean {
  const entry = running.get(key);
  return Boolean(entry && !entry.proc.killed && !entry.exited);
}
