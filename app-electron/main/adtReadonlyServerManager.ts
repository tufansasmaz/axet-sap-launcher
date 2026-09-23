import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { request as httpRequest } from "node:http";
import { getAdtHttpToken } from "./adtHttpToken";
import { mt } from "./i18n";

// `adt_readonly_server.py`'yi (bkz. resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/scripts)
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
  /**
   * DEV sistemde yazan motoru (33 araç), aksi hâlde sarmalayıcıyı (17 araç)
   * başlatıyoruz. Bu bayrak, portta ZATEN duran bir sunucuyu sahiplenmeden
   * önce onun gerçekten doğru yüzey olduğunu doğrulamak için gerekiyor —
   * bkz. `probeHealth`/`surfaceMismatch`.
   */
  expectWritable: boolean;
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

/**
 * `/health` cevabı. `tools` alanı iki sunucuda da var ve ASIL KAYNAK odur:
 * yazan motor `adt_push`'ı listeler, sarmalayıcı listelemez çünkü o araç MCP
 * kaydına hiç girmemiştir. Yani yüzeyi bir etiketten değil, sunucunun kendi
 * saydığı araçlardan okuyoruz.
 */
interface HealthInfo {
  alive: boolean;
  writable: boolean;
  toolCount: number;
  /**
   * Portta biri var ama bizim token'ımızı reddediyor (401): önceki bir
   * oturumdan kalmış, başka token'la başlamış bir yazma sunucusu. "Ölü" ile
   * aynı şey değil — üstüne spawn etmek EADDRINUSE'a düşer.
   */
  unauthorized: boolean;
}

const DEAD: HealthInfo = { alive: false, writable: false, toolCount: 0, unauthorized: false };

function probeHealth(port: number, timeoutMs = 2000): Promise<HealthInfo> {
  return new Promise((resolve) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        path: "/health",
        method: "GET",
        timeout: timeoutMs,
        // Yazan motor `/health`'i de kapının arkasında tutuyor; token'sız
        // yoklama ayakta bir sunucuyu ölü sanıp öldürüyordu (bkz. adtHttpToken.ts).
        headers: { Authorization: `Bearer ${getAdtHttpToken()}` }
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status === 401) {
          res.resume();
          resolve({ ...DEAD, unauthorized: true });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          resolve(DEAD);
          return;
        }
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk: string) => {
          // 33 araç adı birkaç KB; sınırı aşan bir cevap bizim sunucumuz değil.
          if (body.length < 64_000) body += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body) as { tools?: unknown; tool_count?: unknown };
            const tools = Array.isArray(parsed.tools) ? parsed.tools.map(String) : [];
            resolve({
              alive: true,
              writable: tools.includes("adt_push"),
              toolCount: typeof parsed.tool_count === "number" ? parsed.tool_count : tools.length,
              unauthorized: false
            });
          } catch {
            // Ayakta ama cevabı okunamıyor: sahiplenmek için yeterli değil.
            resolve(DEAD);
          }
        });
        res.on("error", () => resolve(DEAD));
      }
    );
    req.on("error", () => resolve(DEAD));
    req.on("timeout", () => {
      req.destroy();
      resolve(DEAD);
    });
    req.end();
  });
}

function healthCheck(port: number, timeoutMs = 2000): Promise<boolean> {
  return probeHealth(port, timeoutMs).then((info) => info.alive);
}

function describeFailure(server: RunningServer): string {
  const tail = server.tail.join("").trim();
  let hint = "";
  if (/no module named ['"]requests['"]/i.test(tail)) {
    hint = mt("adtServer.requestsMissing");
  } else if (/no module named ['"]mcp['"]/i.test(tail)) {
    hint = mt("adtServer.mcpMissing");
  } else if (/no module named ['"]dotenv['"]|python-dotenv/i.test(tail)) {
    hint = mt("adtServer.dotenvMissing");
  } else if (/no module named/i.test(tail)) {
    hint = mt("adtServer.someDepMissing");
  } else if (/address already in use|eaddrinuse/i.test(tail)) {
    hint = mt("adtServer.portInUse", { port: server.port });
  } else if (!tail && server.exited) {
    hint = mt("adtServer.exitedEarly", { detail: server.exitInfo });
  } else if (!tail) {
    hint = mt("adtServer.pythonMissing");
  }
  const detail = tail ? mt("common.detailSuffix", { tail: tail.slice(-400) }) : "";
  return hint
    ? mt("adtServer.failureWithHint", { hint, detail, port: server.port })
    : mt("adtServer.didNotStart", { port: server.port, detail });
}

export async function startReadonlyServer(opts: ReadonlyServerStartOptions): Promise<ReadonlyServerStartResult> {
  const key = opts.projectDir;
  const existing = running.get(key);
  if (existing && existing.port === opts.port && (existing.external || (!existing.proc?.killed && !existing.exited))) {
    const info = await probeHealth(existing.port);
    if (info.alive && info.writable === opts.expectWritable) {
      return { ok: true, alreadyRunning: true, external: existing.external, message: mt("adtServer.alreadyRunning") };
    }
    // Ayakta ama YANLIŞ yüzey: kullanıcı bu proje klasörünü başka bir tier'la
    // açmış olabilir (sistemi DEV işaretlemek gibi). Kendi process'imiz, bizim
    // kapatma hakkımız var — doğrusuyla değiştir.
    stopReadonlyServer(key);
  }

  // Uygulama kapanıp yeniden açıldıysa veya kullanıcı elle başlattıysa, bu
  // portta zaten sağlıklı bir sunucu olabilir — kendi process'imiz olmadan
  // ikinci bir process spawn edip EADDRINUSE'a düşmek yerine bunu kabul et.
  //
  // AMA yalnızca yüzeyi tutuyorsa. Eskiden buradaki tek soru "ayakta mı"ydı ve
  // tek bir sunucu vardı, dolayısıyla cevap da tekti. Artık iki sunucu var:
  // DEV'de bırakılmış YAZAN bir sunucu, ardından PRD'ye bağlanıldığında sessizce
  // sahiplenilir ve canlı sisteme push edilebilir bir oturum açardı. Tersi de
  // yanlış ama zararsız: DEV'de 17 araçlık sunucuyu devralıp "neden push yok"
  // sorusunu doğurur. İkisini de reddediyoruz; sahibi olmadığımız bir process'i
  // öldürmek yerine durumu söylüyoruz.
  const onPort = await probeHealth(opts.port);
  if (onPort.unauthorized) {
    // Token'ını bilmediğimiz bir sunucu: ne kullanabiliriz ne de sahibiyiz.
    // Öldürmüyoruz; kullanıcıya adıyla söylüyoruz.
    return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.foreignToken", { port: opts.port }) };
  }
  if (onPort.alive) {
    if (onPort.writable !== opts.expectWritable) {
      return {
        ok: false,
        alreadyRunning: false,
        external: true,
        message: mt("adtServer.surfaceMismatch", {
          port: opts.port,
          found: onPort.writable ? "33" : "17",
          expected: opts.expectWritable ? "33" : "17"
        })
      };
    }
    running.set(key, { proc: null, port: opts.port, logStream: null, tail: [], exited: false, exitInfo: "", external: true });
    return { ok: true, alreadyRunning: true, external: true, message: mt("adtServer.externalOnPort") };
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
    // `--http` ŞART. Yukarı akış motoru böldüğünde her iki sunucunun da
    // varsayılan taşıması stdio MCP oldu; bayraksız çalıştırmak sessizce
    // stdin'i dinleyen, /health'i olmayan bir process bırakıyor ve biz 15
    // saniye boyunca gelmeyecek bir cevabı bekliyorduk.
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--http", "--port", String(opts.port)], {
      cwd: opts.projectDir,
      // Token verilmezse motor kendi token'ını üretip log'a basıyor — hem biz
      // onu bilmiyoruz hem de log OneDrive'daki proje klasöründe.
      env: { ...process.env, ABAP_HTTP_TOKEN: getAdtHttpToken() },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    logStream?.end();
    return { ok: false, alreadyRunning: false, external: false, message: mt("adtServer.spawnFailed", { pythonPath: opts.pythonPath, detail: (err as Error).message }) };
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

  return { ok: true, alreadyRunning: false, external: false, message: mt("adtServer.started", { port: opts.port }) };
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
