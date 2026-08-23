import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { request as httpRequest } from "node:http";

// `adt_readonly_server.py`'yi (bkz. resources/sap-toolkit/abaper/skills/sap-adt-readonly/scripts)
// launcher'ın kendisi başlatır — RFC bridge otomatik başlatmasıyla (rfcBridgeManager.ts)
// BİREBİR AYNI desen: kullanıcı/agent artık her bağlanışta elle
// "ADT_CWD=$(pwd) py adt_readonly_server.py --port 8787" çalıştırmak zorunda değil,
// terminal açıldığında %sap-adt-readonly zaten canlı bir sunucuya sahiptir.
//
// Bu sunucu (RFC bridge'in aksine) pyrfc/SAP NW RFC SDK'ya HİÇ ihtiyaç duymuyor —
// sadece `requests`/`mcp`/`python-dotenv` (bkz. requirements.txt), düz HTTP(S)
// ile ADT'ye (veya router-only sistemlerde yerel RFC bridge'e) konuşuyor. Bu
// yüzden gömülü RFC runtime'ı KULLANILMIYOR, sistemdeki "py" çalıştırıcısı
// kullanılıyor (mevcut elle kurulum dokümantasyonuyla aynı varsayım).

export interface ReadonlyServerStartOptions {
  projectDir: string;
  scriptPath: string;
  pythonPath: string;
  port: number;
}

export interface ReadonlyServerStartResult {
  ok: boolean;
  alreadyRunning: boolean;
  external: boolean;
  message: string;
}

interface RunningServer {
  proc: ChildProcess | null;
  port: number;
  logStream: WriteStream | null;
  tail: string[];
  exited: boolean;
  exitInfo: string;
  external: boolean;
}

const running = new Map<string, RunningServer>();

function pushTail(server: RunningServer, chunk: Buffer): void {
  const text = chunk.toString("utf-8");
  server.logStream?.write(text);
  server.tail.push(text);
  if (server.tail.length > 60) server.tail.shift();
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

function describeFailure(server: RunningServer): string {
  const tail = server.tail.join("").trim();
  let hint = "";
  if (/no module named ['"]requests['"]/i.test(tail)) {
    hint = "`requests` kurulu değil.";
  } else if (/no module named ['"]mcp['"]/i.test(tail)) {
    hint = "`mcp` paketi kurulu değil.";
  } else if (/no module named ['"]dotenv['"]|python-dotenv/i.test(tail)) {
    hint = "`python-dotenv` kurulu değil.";
  } else if (/no module named/i.test(tail)) {
    hint = "Bir Python bağımlılığı kurulu değil.";
  } else if (/address already in use|eaddrinuse/i.test(tail)) {
    hint = `${server.port} portu başka bir process tarafından kullanılıyor.`;
  } else if (!tail && server.exited) {
    hint = `process erken sonlandı (${server.exitInfo}).`;
  } else if (!tail) {
    hint = "python çalıştırılabilir bulunamadı (`py` PATH'te değil mi?).";
  }
  const detail = tail ? ` Detay: ${tail.slice(-400)}` : "";
  return hint
    ? `${hint}${detail} Elle çalıştırmak için: \`pip install -r requirements.txt\` sonra ADT_CWD=<proje klasörü> py adt_readonly_server.py --port ${server.port}.`
    : `Sunucu ${server.port} portunda ayağa kalkmadı.${detail}`;
}

export async function startReadonlyServer(opts: ReadonlyServerStartOptions): Promise<ReadonlyServerStartResult> {
  const key = opts.projectDir;
  const existing = running.get(key);
  if (existing && existing.port === opts.port && (existing.external || (!existing.proc?.killed && !existing.exited))) {
    const alive = await healthCheck(existing.port);
    if (alive) {
      return { ok: true, alreadyRunning: true, external: existing.external, message: "ADT read-only sunucusu zaten çalışıyor, yeniden başlatılmadı." };
    }
    stopReadonlyServer(key);
  }

  // Uygulama kapanıp yeniden açıldıysa veya kullanıcı elle başlattıysa, bu
  // portta zaten sağlıklı bir sunucu olabilir — kendi process'imiz olmadan
  // ikinci bir process spawn edip EADDRINUSE'a düşmek yerine bunu kabul et.
  if (await healthCheck(opts.port)) {
    running.set(key, { proc: null, port: opts.port, logStream: null, tail: [], exited: false, exitInfo: "", external: true });
    return { ok: true, alreadyRunning: true, external: true, message: "ADT read-only sunucusu bu portta zaten (başka bir process tarafından) çalışıyor durumda bulundu." };
  }

  let logStream: WriteStream | null = null;
  try {
    logStream = createWriteStream(`${opts.projectDir}/adt-readonly.log`, { flags: "a" });
  } catch {
    logStream = null;
  }

  const server: RunningServer = {
    proc: null,
    port: opts.port,
    logStream,
    tail: [],
    exited: false,
    exitInfo: "",
    external: false
  };

  let proc: ChildProcess;
  try {
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--port", String(opts.port)], {
      cwd: opts.projectDir,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    logStream?.end();
    return { ok: false, alreadyRunning: false, external: false, message: `ADT read-only sunucu process'i başlatılamadı (${opts.pythonPath}): ${(err as Error).message}` };
  }

  server.proc = proc;
  proc.stdout?.on("data", (chunk: Buffer) => pushTail(server, chunk));
  proc.stderr?.on("data", (chunk: Buffer) => pushTail(server, chunk));
  proc.on("exit", (code, signal) => {
    server.exited = true;
    server.exitInfo = `exit code=${code ?? "?"} signal=${signal ?? "-"}`;
  });
  proc.on("error", (err) => {
    server.exited = true;
    server.exitInfo = err.message;
  });

  running.set(key, server);

  const timeoutMs = 15000;
  const intervalMs = 500;
  const deadline = Date.now() + timeoutMs;
  let healthy = false;
  while (Date.now() < deadline) {
    if (server.exited) break;
    if (await healthCheck(opts.port, 1200)) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const message = describeFailure(server);
    stopReadonlyServer(key);
    return { ok: false, alreadyRunning: false, external: false, message };
  }

  return { ok: true, alreadyRunning: false, external: false, message: `ADT read-only sunucusu başlatıldı (http://127.0.0.1:${opts.port}).` };
}

export function stopReadonlyServer(key: string): void {
  const entry = running.get(key);
  if (!entry) return;
  if (!entry.external) {
    try {
      entry.proc?.kill();
    } catch {
      // best effort
    }
  }
  try {
    entry.logStream?.end();
  } catch {
    // best effort
  }
  running.delete(key);
}

export function stopAllReadonlyServers(): void {
  for (const key of Array.from(running.keys())) {
    stopReadonlyServer(key);
  }
}

export function isReadonlyServerRunning(key: string): boolean {
  const entry = running.get(key);
  return Boolean(entry && (entry.external || (!entry.proc?.killed && !entry.exited)));
}
