import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { request as httpRequest } from "node:http";
import { connect as netConnect } from "node:net";
import { getAdtHttpToken } from "./adtHttpToken";
import { mt } from "./i18n";
import type { SystemTier } from "../shared/types";

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
   * DEV sistemde onaylı yazma sunucusunu (53 araç), aksi hâlde sarmalayıcıyı (19 araç)
   * başlatıyoruz. Bu bayrak, portta ZATEN duran bir sunucuyu sahiplenmeden
   * önce onun gerçekten doğru yüzey olduğunu doğrulamak için gerekiyor —
   * bkz. `probeHealth`/`surfaceMismatch`.
   */
  expectWritable: boolean;
  /**
   * DEV'de yazan motor doğrudan değil, onay katmanıyla (`adt_gated_server.py`)
   * başlıyor ve her yazmayı launcher'ın onay ucuna soruyor. Adres ve oturum
   * token'ı YALNIZCA bu çocuğun ortamına konur, `process.env`'e değil: ajan
   * (axet-code) launcher'ın ortamını miras alıyor ve onay oturumunu tanıması
   * için hiçbir sebep yok.
   */
  gate?: ApprovalGate;
  /**
   * Sistemin kademesi, NTT Studio'nun kendi yapılandırmasından. Çocuğun
   * ortamına `NTT_STUDIO_SAP_TIER` olarak konuyor; sarmalayıcı sunucular
   * (`ntt_tier.py`) bunu `.conn_adt`'deki `ADT_SAP_TIER`'ın alt sınırı yapıyor.
   * `.conn_adt` ajanın klasöründe, ajan onu değiştirebiliyor; bu ortamı
   * değiştiremiyor.
   */
  tier?: SystemTier;
  /**
   * Gated modda portta token'ını bilmediğimiz (401) bir sunucu varsa, önceki
   * launcher'dan kalmış gated sunucunun kalp atışıyla kapanması bu kadar
   * beklenir. Yalnızca testler kısaltır.
   */
  staleWaitMs?: number;
}

export interface ApprovalGate {
  url: string;
  token: string;
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
  /** Bu process'e verilen onay oturumu token'ı; gated değilse null. */
  gateToken: string | null;
}

/**
 * Önceki launcher'dan kalan gated sunucu, onay ucu artık onu tanımadığı için
 * kalp atışında (10 sn aralık, 3 kaçırma) kendini kapatır. Üstüne pay.
 */
const STALE_GATED_WAIT_MS = 45_000;
/** Kendi durdurduğumuz process'in portu bırakması (ölçüldü: 300 ms'den az). */
const OWN_STOP_WAIT_MS = 10_000;

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
  /**
   * Onay katmanı (`adt_gated_server.py`): motorun araçlarına ek olarak
   * `axet_teslim`'i listeler. Motorun kendisi de `adt_push`'u listelediği için
   * `writable` ikisini ayırmıyor.
   */
  gated: boolean;
}

const DEAD: HealthInfo = { alive: false, writable: false, toolCount: 0, unauthorized: false, gated: false };

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
          // 53 araç adı birkaç KB; sınırı aşan bir cevap bizim sunucumuz değil.
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
              unauthorized: false,
              gated: tools.includes("axet_teslim")
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

/**
 * Portta dinleyen var mı: HTTP değil TCP, çünkü 401 dönen ya da HTTP
 * konuşmayan bir process de portu tutar. Zaman aşımı "dolu" sayılır; emin
 * olmadan spawn etmek EADDRINUSE'a düşer.
 */
function portInUse(port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = netConnect({ host: "127.0.0.1", port });
    const done = (busy: boolean): void => {
      sock.destroy();
      resolve(busy);
    };
    sock.setTimeout(timeoutMs, () => done(true));
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}

async function waitPortFree(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (!(await portInUse(port))) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Ayaktaki sunucu bu isteğin yüzeyini mi sunuyor? */
function surfaceMatches(info: HealthInfo, opts: ReadonlyServerStartOptions): boolean {
  if (opts.gate) return info.gated;
  return !info.gated && info.writable === opts.expectWritable;
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
    // Gated'da yüzey yetmez, oturum da tutmalı: process'in ortamındaki token
    // eski oturumunsa her yazması 401 → approval_unavailable olur.
    const sameGate = opts.gate ? existing.gateToken === opts.gate.token : existing.gateToken === null;
    if (info.alive && surfaceMatches(info, opts) && sameGate) {
      return { ok: true, alreadyRunning: true, external: existing.external, message: mt("adtServer.alreadyRunning") };
    }
    // Ayakta ama YANLIŞ yüzey: kullanıcı bu proje klasörünü başka bir tier'la
    // açmış olabilir (sistemi DEV işaretlemek gibi). Kendi process'imiz, bizim
    // kapatma hakkımız var — doğrusuyla değiştir.
    stopReadonlyServer(key);
    if (!existing.external && !(await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: false, message: mt("adtServer.previousStillRunning", { port: opts.port }) };
    }
  }

  // Port tek, sahibi tek proje. Portu BİZİM başka bir projemiz tutuyorsa onu
  // durduruyoruz. Eskiden bu durumda aşağıdaki yoklama portta "sağlıklı bir
  // sunucu" bulup onu devralıyordu; oysa o sunucu öbür projenin klasöründe
  // çalışıyor, onun `.conn_adt`'ını okuyor. Gated'da daha kötüsü: onay
  // oturumu yanlış projeye bağlanırdı. Devralınmış (external) kayıt yalnızca
  // unutulur; sahibi olmadığımız process'e dokunmuyoruz, aşağıdaki yoklama
  // ona karar verir.
  for (const [otherKey, other] of Array.from(running.entries())) {
    if (otherKey === key || other.port !== opts.port) continue;
    stopReadonlyServer(otherKey);
    if (!other.external && !(await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: false, message: mt("adtServer.previousStillRunning", { port: opts.port }) };
    }
  }

  // Uygulama kapanıp yeniden açıldıysa veya kullanıcı elle başlattıysa, bu
  // portta zaten sağlıklı bir sunucu olabilir — kendi process'imiz olmadan
  // ikinci bir process spawn edip EADDRINUSE'a düşmek yerine bunu kabul et.
  //
  // AMA yalnızca yüzeyi tutuyorsa. Eskiden buradaki tek soru "ayakta mı"ydı ve
  // tek bir sunucu vardı, dolayısıyla cevap da tekti. Artık iki sunucu var:
  // DEV'de bırakılmış YAZAN bir sunucu, ardından PRD'ye bağlanıldığında sessizce
  // sahiplenilir ve canlı sisteme push edilebilir bir oturum açardı. Tersi de
  // yanlış ama zararsız: DEV'de 19 araçlık sunucuyu devralıp "neden push yok"
  // sorusunu doğurur. İkisini de reddediyoruz; sahibi olmadığımız bir process'i
  // öldürmek yerine durumu söylüyoruz.
  //
  // Gated modda HİÇ devralmıyoruz: devralınan process'in ortamındaki onay
  // token'ını bilemeyiz; ya ölü bir oturuma sorar (her yazma reddedilir) ya da
  // başka bir projenin oturumuna.
  let onPort = await probeHealth(opts.port);
  if (onPort.unauthorized && opts.gate) {
    // Büyük olasılıkla önceki launcher'dan kalan gated sunucu: onay ucu artık
    // onu tanımıyor, kalp atışında kendini kapatacak. Öldürmüyoruz, bekliyoruz.
    if (!(await waitPortFree(opts.port, opts.staleWaitMs ?? STALE_GATED_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.foreignTokenGated", { port: opts.port }) };
    }
    onPort = DEAD;
  }
  if (onPort.unauthorized) {
    // Token'ını bilmediğimiz bir sunucu: ne kullanabiliriz ne de sahibiyiz.
    // Öldürmüyoruz; kullanıcıya adıyla söylüyoruz.
    return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.foreignToken", { port: opts.port }) };
  }
  if (onPort.alive && opts.gate) {
    return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.gatedPortBusy", { port: opts.port }) };
  }
  if (onPort.alive) {
    if (!surfaceMatches(onPort, opts)) {
      return {
        ok: false,
        alreadyRunning: false,
        external: true,
        message: mt("adtServer.surfaceMismatch", {
          port: opts.port,
          found: String(onPort.toolCount),
          expected: opts.expectWritable ? "53" : "19"
        })
      };
    }
    running.set(key, { proc: null, port: opts.port, logStream: null, tail: [], exited: false, exitInfo: "", external: true, gateToken: null });
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
    external: false,
    gateToken: opts.gate?.token ?? null
  };

  // ADT_CWD: motor `.conn_adt`'ı (gated katman `.sap-review/`'u) buradan
  // okuyor. Launcher'ın ortamından miras kalan bir değer başka projenin
  // sistemine bağlardı; cwd ile aynı olduğu için açıkça veriyoruz.
  const env: NodeJS.ProcessEnv = { ...process.env, ABAP_HTTP_TOKEN: getAdtHttpToken(), ADT_CWD: opts.projectDir };
  if (opts.gate) {
    env.ADT_APPROVAL_URL = opts.gate.url;
    env.ADT_APPROVAL_TOKEN = opts.gate.token;
  }
  // Launcher'ın kendi ortamından miras kalmış bir değer (kullanıcının ortam
  // değişkeni gibi) yapılandırmadaki kademe gibi görünmesin: ya bizim değerimiz
  // ya hiç.
  delete env.NTT_STUDIO_SAP_TIER;
  if (opts.tier) env.NTT_STUDIO_SAP_TIER = opts.tier;

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
      env,
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
    // "Ayakta" yetmez: başlattığımız process portu alamadıysa cevap veren
    // başka biri olabilir. Yüzey de tutmalı.
    const info = await probeHealth(opts.port, 1200);
    if (info.alive && surfaceMatches(info, opts)) {
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
