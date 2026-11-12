import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { request as httpRequest } from "node:http";
import { connect as netConnect } from "node:net";
import path from "node:path";
import { getAdtHttpToken } from "./adtHttpToken";
import { withNttPythonSite } from "./pythonSiteEnv";
import { mt } from "./i18n";
import type { SystemTier } from "../shared/types";
import { applySapBindingEnv, sapBindingKey, type SapBinding } from "./sapBinding";

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
   * DEV sistemde onaylı yazma sunucusunu (68 araç), aksi hâlde sarmalayıcıyı (30 araç)
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
   * NTT Studio'nun `.conn_adt`'ye yazdığı bağlantı (adres/client/kullanıcı),
   * aynı nesneden (`sapBindingFor`). Çocuğun ortamına `NTT_STUDIO_SAP_*`
   * olarak konuyor; sarmalayıcı sunucular (`ntt_binding.py`) `.conn_adt` başka
   * bir sistemi gösterirse çağrıyı SAP'a göndermiyor. Parola yok.
   */
  binding?: SapBinding;
  /**
   * Gated modda portta token'ını bilmediğimiz (401) bir sunucu varsa, önceki
   * launcher'dan kalmış gated sunucunun kalp atışıyla kapanması bu kadar
   * beklenir. Yalnızca testler kısaltır.
   */
  staleWaitMs?: number;
  /**
   * Portu tutan (bizim anahtarımızı bilen) süreci kapatır; kapattıysa true.
   * Varsayılan: Windows'ta netstat + taskkill /T. Yalnızca testler değiştirir.
   */
  reclaimPort?: (port: number) => Promise<boolean>;
  /** 401 veren sunucunun sahiplik denetimi (staleOwnServer). Yalnızca testler değiştirir. */
  inspectForeign?: (port: number) => Promise<{ reclaimed: boolean; name: string }>;
  /**
   * Bu sistemin ADT jetonu (sapSystems.ts). Çoklu sistemde her sunucunun
   * jetonu ayrı; verilmezse sürecin varsayılan jetonu (tek sistem / testler).
   */
  token?: string;
}

/** 127.0.0.1:port'ta DİNLEYEN sürecin PID'i (`netstat -ano`); yoksa null. */
export function listeningPid(netstatOutput: string, port: number): number | null {
  for (const line of netstatOutput.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    // TCP  127.0.0.1:8787  0.0.0.0:0  LISTENING  1234
    if (cols.length < 5 || cols[0].toUpperCase() !== "TCP") continue;
    if (!/:(\d+)$/.test(cols[1]) || Number(/:(\d+)$/.exec(cols[1])![1]) !== port) continue;
    if (!/^(127\.0\.0\.1|0\.0\.0\.0|\[::1?\])$/.test(cols[1].replace(/:\d+$/, ""))) continue;
    if (cols[3].toUpperCase() !== "LISTENING") continue;
    const pid = Number(cols[4]);
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) return pid;
  }
  return null;
}

function runQuiet(file: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(file, args, { windowsHide: true, timeout: 10_000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) =>
        resolve(err ? null : String(stdout))
      );
    } catch {
      resolve(null);
    }
  });
}

export interface ProcInfo {
  pid: number;
  ppid: number;
  name: string;
  cmd: string;
}

const OUR_SERVER_SCRIPT = /[\\/]sap-adt(?:-readonly)?[\\/]scripts[\\/]adt_(?:readonly|gated)_server\.py\b/i;
const LAUNCH_CHAIN = /^(?:py|pyw|python\d*(?:\.\d+)?|pythonw|cmd|conhost)\.exe$/i;

/**
 * Jeton dışında sahiplik kanıtı: dinleyen süreç bizim `adt_*_server.py`
 * betiğimizi çalıştıran bir Python ve onu başlatan zincirde (py/python/cmd
 * dışında) YAŞAYAN bir süreç yok — ya da yaşayan tek ata eski bir NTT Studio /
 * bu süreç. Kanıt yoksa `ours: false`; ad ekranda söyleniyor.
 */
export function staleOwnServer(listenPid: number, procs: Map<number, ProcInfo>, selfPid: number): { ours: boolean; name: string } {
  const me = procs.get(listenPid);
  if (!me) return { ours: false, name: "" };
  const name = me.name;
  if (!/^(?:py|python\d*(?:\.\d+)?|pythonw)\.exe$/i.test(name) || !OUR_SERVER_SCRIPT.test(me.cmd)) return { ours: false, name };
  const seen = new Set<number>([listenPid]);
  let cur = procs.get(me.ppid);
  while (cur && !seen.has(cur.pid)) {
    seen.add(cur.pid);
    if (!LAUNCH_CHAIN.test(cur.name)) {
      const ours = cur.pid === selfPid || /^NTT Studio\.exe$/i.test(cur.name);
      return { ours, name };
    }
    cur = procs.get(cur.ppid);
  }
  // Zincirin üstü artık yok: başlatan (eski NTT Studio ya da onun ajanı) ölmüş.
  return { ours: true, name };
}

async function processTable(): Promise<Map<number, ProcInfo>> {
  const out = await runQuiet("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    // UTF-8: komut satırlarındaki Türkçe karakterler OEM kod sayfasında JSON'u bozmasın.
    "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress"
  ]);
  const map = new Map<number, ProcInfo>();
  if (!out) return map;
  try {
    const rows = JSON.parse(out) as { ProcessId: number; ParentProcessId: number; Name: string; CommandLine: string | null }[];
    for (const r of Array.isArray(rows) ? rows : [rows]) {
      map.set(r.ProcessId, { pid: r.ProcessId, ppid: r.ParentProcessId, name: String(r.Name ?? ""), cmd: String(r.CommandLine ?? "") });
    }
  } catch {
    /* okunamadı: kanıt yok */
  }
  return map;
}

/** 401 veren sunucu bizim arta kalanımızsa kapatır; değilse sürecin adını döner. */
async function inspectForeignOwner(port: number): Promise<{ reclaimed: boolean; name: string }> {
  if (process.platform !== "win32") return { reclaimed: false, name: "" };
  const out = await runQuiet("netstat", ["-ano", "-p", "TCP"]);
  const pid = out ? listeningPid(out, port) : null;
  if (!pid) return { reclaimed: false, name: "" };
  let table = await processTable();
  // PowerShell/WMI ara sıra boş dönüyor (ölçüldü: ilk denemelerde 0 satır); bir kez daha.
  if (!table.has(pid)) table = await processTable();
  const verdict = staleOwnServer(pid, table, process.pid);
  if (!verdict.ours) return { reclaimed: false, name: verdict.name };
  const killed = (await runQuiet("taskkill", ["/PID", String(pid), "/T", "/F"])) !== null;
  return { reclaimed: killed, name: verdict.name };
}

async function reclaimOwnPort(port: number): Promise<boolean> {
  if (process.platform !== "win32") return false;
  const out = await runQuiet("netstat", ["-ano", "-p", "TCP"]);
  const pid = out ? listeningPid(out, port) : null;
  if (!pid) return false;
  // Ağacıyla: `py` başlatıcısının altındaki python.exe de gitsin.
  return (await runQuiet("taskkill", ["/PID", String(pid), "/T", "/F"])) !== null;
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
  /** Başarısızlığın adı (günlük için; ham çıktı değil). */
  reason?: string;
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
  /**
   * Bu process'in ortamına verilen kademe + bağlantı (`envKeyFor`). Devralınan
   * (external) sunucuda bilinmiyor: null.
   */
  envKey: string | null;
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
  /**
   * Tablo okuma (`adt_sql`) listede mi. Salt okunur sarmalayıcı onu yalnız
   * `ADT_RO_ALLOW_SQL=true` ile kaydediyor; bu sürümden önce başlamış bir
   * sarmalayıcı (19 araç) listelemez ve devralınmamalı.
   */
  readsData: boolean;
  /** Sunucunun saydığı araç adları (ekrandaki "Ajan bu sistemde" öbeği bunlardan kuruluyor). */
  tools: string[];
}

const DEAD: HealthInfo = { alive: false, writable: false, toolCount: 0, unauthorized: false, gated: false, readsData: false, tools: [] };

function probeHealth(port: number, timeoutMs = 2000, token: string = getAdtHttpToken()): Promise<HealthInfo> {
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
        headers: { Authorization: `Bearer ${token}` }
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
          // 68 araç adı birkaç KB; sınırı aşan bir cevap bizim sunucumuz değil.
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
              gated: tools.includes("axet_teslim"),
              readsData: tools.includes("adt_sql") && tools.includes("adt_dump_detail"),
              tools
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
 * 8787'deki sunucunun araç listesi, anahtarla. Doktor ve "Ajan bu sistemde"
 * öbeği için: sunucu `/health`'i de anahtarın arkasında tutuyor, anahtarsız
 * soran çalışan sunucuyu kapalı sanıyor.
 */
export async function probeAdtTools(
  port: number,
  timeoutMs = 1500,
  token?: string
): Promise<{ alive: boolean; unauthorized: boolean; tools: string[] }> {
  const info = await probeHealth(port, timeoutMs, token);
  return { alive: info.alive, unauthorized: info.unauthorized, tools: info.tools };
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

/**
 * Çocuğun ortamından okunan ve sonradan değiştirilemeyen iki değer: kademe ve
 * bağlantı. İkisi de süreç açılırken bir kez yakalanıyor (`ntt_tier.py`,
 * `ntt_binding.py`); aynı projeye başka kullanıcı, başka köprü portu ya da
 * başka kademeyle yeniden bağlanınca eski süreç eski değerlerle çalışmaya
 * devam ederdi. Anahtar farklıysa süreç yeniden başlatılıyor.
 */
function envKeyFor(opts: ReadonlyServerStartOptions): string {
  return JSON.stringify([opts.tier ?? "", sapBindingKey(opts.binding)]);
}

/** Ayaktaki sunucu bu isteğin yüzeyini mi sunuyor? */
function surfaceMatches(info: HealthInfo, opts: ReadonlyServerStartOptions): boolean {
  if (opts.gate) return info.gated;
  // Salt okunur yüzey tablo okumayı da sunmalı (kullanıcı kararı 2026-10-15).
  return !info.gated && info.writable === opts.expectWritable && (opts.expectWritable || info.readsData);
}

/**
 * Sunucuyu açmanın komut satırı. `py` başlatıcısına `-3` veriliyor: betiklerin
 * ilk satırı `#!/usr/bin/env python3` ve py.exe bu satırı görünce varsayılan
 * Python'u değil PATH'te ilk bulduğu `python3.exe`'yi çalıştırıyor (ölçüldü
 * 2026-11-12; Store takma adı atlanıyor, uv'nin ~/.local/bin'e bıraktığı ya da
 * bozuk bir python3.exe atlanmıyor). `-3` satırı yok sayıyor: Doktor'un
 * sorduğu ve `py -m pip`'in paket kurduğu yorumlayıcı çalışıyor.
 */
export function pythonArgs(pythonPath: string, scriptPath: string, rest: string[]): string[] {
  const launcher = /^py(\.exe)?$/i.test(path.win32.basename(pythonPath));
  return launcher ? ["-3", scriptPath, ...rest] : [scriptPath, ...rest];
}

export type AdtServerFailureReason =
  | "requestsMissing"
  | "mcpMissing"
  | "dotenvMissing"
  | "someDepMissing"
  | "pythonBadExe"
  | "portInUse"
  | "exitedEarly"
  | "pythonMissing"
  | "unknown";

/** Sunucunun açılış çıktısından sebebin adı (günlük ve ekran için; ham metin değil). */
export function failureReason(tail: string, exited: boolean): AdtServerFailureReason {
  if (/no module named ['"]requests['"]/i.test(tail)) return "requestsMissing";
  if (/no module named ['"]mcp['"]/i.test(tail)) return "mcpMissing";
  if (/no module named ['"]dotenv['"]|python-dotenv/i.test(tail)) return "dotenvMissing";
  if (/no module named/i.test(tail)) return "someDepMissing";
  // py.exe'nin bozuk/başka mimari bir yorumlayıcıyı açamadığı durum (çıkış 101).
  if (/unable to create process|not a valid win32 application|can't run on your pc/i.test(tail)) return "pythonBadExe";
  if (/address already in use|eaddrinuse|winerror 10048/i.test(tail)) return "portInUse";
  if (!tail && exited) return "exitedEarly";
  if (!tail) return "pythonMissing";
  return "unknown";
}

/** Son başarısız açılış: "Ajan bu sistemde" öbeği "neden" sorusunu buradan cevaplıyor. */
// Sistem (proje klasörü) başına: bir sistemin açılamaması ötekinin öbeğinde görünmesin.
type FailureInfo = { reason: AdtServerFailureReason | string; message: string; at: number };
const lastFailures = new Map<string, FailureInfo>();
let lastFailure: FailureInfo | null = null;

export function lastAdtServerFailure(projectDir?: string): FailureInfo | null {
  if (projectDir === undefined) return lastFailure;
  return lastFailures.get(projectDir) ?? null;
}

function describeFailure(server: RunningServer): { message: string; reason: AdtServerFailureReason } {
  const tail = server.tail.join("").trim();
  const reason = failureReason(tail, server.exited);
  let hint = "";
  switch (reason) {
    case "requestsMissing":
    case "mcpMissing":
    case "dotenvMissing":
    case "someDepMissing":
    case "pythonBadExe":
    case "pythonMissing":
      hint = mt(`adtServer.${reason}` as Parameters<typeof mt>[0]);
      break;
    case "portInUse":
      hint = mt("adtServer.portInUse", { port: server.port });
      break;
    case "exitedEarly":
      hint = mt("adtServer.exitedEarly", { detail: server.exitInfo });
      break;
    default:
      hint = "";
  }
  const detail = tail ? mt("common.detailSuffix", { tail: tail.slice(-400) }) : "";
  const message = hint
    ? mt("adtServer.failureWithHint", { hint, detail, port: server.port })
    : mt("adtServer.didNotStart", { port: server.port, detail });
  return { message, reason };
}

function tokenOf(opts: ReadonlyServerStartOptions): string {
  return opts.token || getAdtHttpToken();
}

export async function startReadonlyServer(opts: ReadonlyServerStartOptions): Promise<ReadonlyServerStartResult> {
  const result = await startReadonlyServerInner(opts);
  if (!result.ok) {
    lastFailure = { reason: (result.reason ?? "unknown") as AdtServerFailureReason | string, message: result.message, at: Date.now() };
    lastFailures.set(opts.projectDir, lastFailure);
  } else {
    lastFailure = null;
    lastFailures.delete(opts.projectDir);
  }
  return result;
}

async function startReadonlyServerInner(opts: ReadonlyServerStartOptions): Promise<ReadonlyServerStartResult> {
  const key = opts.projectDir;
  const existing = running.get(key);
  if (existing && existing.port === opts.port && (existing.external || (!existing.proc?.killed && !existing.exited))) {
    const info = await probeHealth(existing.port, 2000, tokenOf(opts));
    // Gated'da yüzey yetmez, oturum da tutmalı: process'in ortamındaki token
    // eski oturumunsa her yazması 401 → approval_unavailable olur.
    const sameGate = opts.gate ? existing.gateToken === opts.gate.token : existing.gateToken === null;
    // Devralınan sunucunun ortamını bilmiyoruz; onun için karar eskisi gibi
    // yüzeye göre (aşağıdaki yoklama da aynısını yapardı).
    const sameEnv = existing.external || existing.envKey === envKeyFor(opts);
    if (info.alive && surfaceMatches(info, opts) && sameGate && sameEnv) {
      return { ok: true, alreadyRunning: true, external: existing.external, message: mt("adtServer.alreadyRunning") };
    }
    // Ayakta ama YANLIŞ yüzey: kullanıcı bu proje klasörünü başka bir tier'la
    // açmış olabilir (sistemi DEV işaretlemek gibi). Kendi process'imiz, bizim
    // kapatma hakkımız var — doğrusuyla değiştir.
    stopReadonlyServer(key);
    if (!existing.external && !(await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: false, reason: "previousStillRunning", message: mt("adtServer.previousStillRunning", { port: opts.port }) };
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
      return { ok: false, alreadyRunning: false, external: false, reason: "previousStillRunning", message: mt("adtServer.previousStillRunning", { port: opts.port }) };
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
  // yanlış ama zararsız: DEV'de 30 araçlık sunucuyu devralıp "neden push yok"
  // sorusunu doğurur. İkisini de reddediyoruz; sahibi olmadığımız bir process'i
  // öldürmek yerine durumu söylüyoruz.
  //
  // Gated modda HİÇ devralmıyoruz: devralınan process'in ortamındaki onay
  // token'ını bilemeyiz; ya ölü bir oturuma sorar (her yazma reddedilir) ya da
  // başka bir projenin oturumuna.
  let onPort = await probeHealth(opts.port, 2000, tokenOf(opts));
  // Jetonumuzu bilmeyen (401) sunucu: önceki oturumdan arta kalan BİZİM
  // sunucumuz mu, jeton dışında kanıtla (staleOwnServer). Eskiden hiç
  // dokunulmuyordu ve uygulama çöktükten sonra hiçbir sisteme ADT
  // çalışmıyordu (kararlılık 3, 2026-11-12). Kanıt yoksa adıyla söylenir.
  let foreignName = "";
  if (onPort.unauthorized) {
    const owner = await (opts.inspectForeign ?? inspectForeignOwner)(opts.port);
    foreignName = owner.name;
    if (owner.reclaimed && (await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) onPort = DEAD;
  }
  if (onPort.unauthorized && opts.gate) {
    // Büyük olasılıkla önceki launcher'dan kalan gated sunucu: onay ucu artık
    // onu tanımıyor, kalp atışında kendini kapatacak. Öldürmüyoruz, bekliyoruz.
    if (!(await waitPortFree(opts.port, opts.staleWaitMs ?? STALE_GATED_WAIT_MS))) {
      return foreignName
        ? { ok: false, alreadyRunning: false, external: true, reason: "portBusyOther", message: mt("adtServer.portBusyOther", { port: opts.port, name: foreignName }) }
        : { ok: false, alreadyRunning: false, external: true, reason: "foreignTokenGated", message: mt("adtServer.foreignTokenGated", { port: opts.port }) };
    }
    onPort = DEAD;
  }
  if (onPort.unauthorized) {
    // Token'ını bilmediğimiz bir sunucu: ne kullanabiliriz ne de sahibiyiz.
    // Öldürmüyoruz; kullanıcıya adıyla söylüyoruz.
    return foreignName
      ? { ok: false, alreadyRunning: false, external: true, reason: "portBusyOther", message: mt("adtServer.portBusyOther", { port: opts.port, name: foreignName }) }
      : { ok: false, alreadyRunning: false, external: true, reason: "foreignToken", message: mt("adtServer.foreignToken", { port: opts.port }) };
  }
  // Portta BİZİM anahtarımızı bilen ama yanlış yüzeyi sunan bir süreç: anahtar
  // yalnız bu sürecin belleğinde ve çocuklarının ortamında, yani o süreç bizim
  // ağacımızdan doğdu — tipik olarak açılış başarısız olunca ajanın kabuğundan
  // elle başlatılan, kapısız (19-20 araçlık) salt okunur sunucu. Eskiden burada
  // vazgeçiliyordu ve yeniden bağlanmak hiçbir şeyi değiştirmiyordu (R3,
  // 2026-11-12): DEV'e yazma o süreç kapanana kadar hiç açılmıyordu.
  if (onPort.alive && (opts.gate || !surfaceMatches(onPort, opts))) {
    const reclaimed = await (opts.reclaimPort ?? reclaimOwnPort)(opts.port);
    if (reclaimed && (await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) onPort = DEAD;
  }
  if (onPort.alive && opts.gate) {
    return { ok: false, alreadyRunning: false, external: true, reason: "gatedPortBusy", message: mt("adtServer.gatedPortBusy", { port: opts.port }) };
  }
  if (onPort.alive) {
    if (!surfaceMatches(onPort, opts)) {
      return {
        ok: false,
        alreadyRunning: false,
        external: true,
        reason: "surfaceMismatch",
        message: mt("adtServer.surfaceMismatch", {
          port: opts.port,
          found: String(onPort.toolCount),
          expected: opts.expectWritable ? "68" : "30"
        })
      };
    }
    running.set(key, { proc: null, port: opts.port, logStream: null, tail: [], exited: false, exitInfo: "", external: true, gateToken: null, envKey: null });
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
    gateToken: opts.gate?.token ?? null,
    envKey: envKeyFor(opts)
  };

  // ADT_CWD: motor `.conn_adt`'ı (gated katman `.sap-review/`'u) buradan
  // okuyor. Launcher'ın ortamından miras kalan bir değer başka projenin
  // sistemine bağlardı; cwd ile aynı olduğu için açıkça veriyoruz.
  // PYTHONPATH (python-site): sunucu `install()` ile yalnızca motorun
  // oturumunu koruyor; motorun içinden çağrılan JWT sağlayıcısı istemci
  // sırrını ayrı bir `requests.post(verify=False)` ile gönderiyor. Süreç geneli
  // kural onu da kapsıyor (pythonSiteEnv.ts).
  const env: NodeJS.ProcessEnv = withNttPythonSite({
    ...process.env,
    ABAP_HTTP_TOKEN: tokenOf(opts),
    ADT_CWD: opts.projectDir
  });
  // Ajan sürecine verilen adres değişkenleri sunucunun işi değil; miras kalan
  // değer başka bir sistemin portunu gösterebilir.
  delete env.ABAP_HTTP_URL;
  delete env.ABAP_HTTP_PORT;
  // Salt okunur sarmalayıcının veri okuma kapıları (adt_readonly_server.py
  // GATED). Kullanıcı kararı 2026-10-15: tablo ve dump okuma her kademede
  // açık — modül danışmanı read-only yüzeyde hatanın kaynağına bakamıyordu.
  // `adt_unit_test` ABAP ÇALIŞTIRIYOR; kapalı kalıyor, launcher'ın ortamından
  // miras kalan bir "true" da onu açmıyor. Onaylı yazma sunucusu bu
  // değişkenleri okumuyor (motorun bütün araçları zaten onda).
  env.ADT_RO_ALLOW_SQL = "true";
  env.ADT_RO_ALLOW_DUMPS = "true";
  // Dump'ın içi (bölümler + hatanın düştüğü satır; bkz. ntt_dump_detail.py).
  // Liste tek başına hatayı göstermiyor (2026-10-16). Alan değerleri yine QA/PRD'de
  // kullanıcının onayına bağlı (GR_PII).
  env.ADT_RO_ALLOW_DUMP_DETAIL = "true";
  delete env.ADT_RO_ALLOW_UNIT_TEST;
  if (opts.gate) {
    env.ADT_APPROVAL_URL = opts.gate.url;
    env.ADT_APPROVAL_TOKEN = opts.gate.token;
  }
  // Launcher'ın kendi ortamından miras kalmış bir değer (kullanıcının ortam
  // değişkeni gibi) yapılandırmadaki kademe gibi görünmesin: ya bizim değerimiz
  // ya hiç.
  delete env.NTT_STUDIO_SAP_TIER;
  if (opts.tier) env.NTT_STUDIO_SAP_TIER = opts.tier;
  // Bağlantı da aynı desenle: miras silinir, yalnızca `.conn_adt`'ye yazılan
  // değerin aynısı konur. Parola ortama girmez (bkz. sapBinding.ts).
  applySapBindingEnv(env, opts.binding);

  let proc: ChildProcess;
  try {
    // `--http` ŞART. Yukarı akış motoru böldüğünde her iki sunucunun da
    // varsayılan taşıması stdio MCP oldu; bayraksız çalıştırmak sessizce
    // stdin'i dinleyen, /health'i olmayan bir process bırakıyor ve biz 15
    // saniye boyunca gelmeyecek bir cevabı bekliyorduk.
    proc = spawn(opts.pythonPath, pythonArgs(opts.pythonPath, opts.scriptPath, ["--http", "--port", String(opts.port)]), {
      cwd: opts.projectDir,
      // Token verilmezse motor kendi token'ını üretip log'a basıyor — hem biz
      // onu bilmiyoruz hem de log OneDrive'daki proje klasöründe.
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    logStream?.end();
    return { ok: false, alreadyRunning: false, external: false, reason: "spawnFailed", message: mt("adtServer.spawnFailed", { pythonPath: opts.pythonPath, detail: (err as Error).message }) };
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
    const info = await probeHealth(opts.port, 1200, tokenOf(opts));
    if (info.alive && surfaceMatches(info, opts)) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const { message, reason } = describeFailure(server);
    stopReadonlyServer(key);
    return { ok: false, alreadyRunning: false, external: false, message, reason };
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
