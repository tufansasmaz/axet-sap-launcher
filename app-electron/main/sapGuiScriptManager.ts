import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
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

// KİMLİK (2026-09 güvenlik incelemesi): köprü `/health` dışındaki her istekte
// bearer token istiyor. SAP GUI'nin "script bağlanıyor" onayı oturum başına
// bir kez çıkıyor; onaydan sonra 127.0.0.1:8790'a ulaşan HER süreç — ya da
// bir web sayfası — kullanıcının SAP oturumunda tuşa basabiliyordu.
//
// Token her başlatışta yeniden üretiliyor ve YALNIZCA köprü sürecinin
// ortamına veriliyor. `adtHttpToken.ts`'teki ADT token'ından bilerek farklı:
// o `process.env`'e yazılıyor ki ajan terminalleri kalıtımla alsın. Bu köprüye
// ajan doğrudan değil, ana süreç üzerinden (IPC) gidiyor; token'ı ajanın
// ortamına koymak, onun SAP GUI'ye kapıyı atlayarak yazabilmesi demek olurdu.
export const GUI_BRIDGE_TOKEN_ENV = "NTT_GUI_BRIDGE_TOKEN";
export const GUI_BRIDGE_PRD_ENV = "NTT_GUI_BRIDGE_PRD_SYSTEMS";

/** Köprünün yazmayı reddedeceği sistem. `client` boşsa SID'in her mandantı. */
export interface GuiScriptPrdSystem {
  sid: string;
  client: string;
}

/** İstemcinin köprüye konuşmak için bilmesi gereken her şey. */
export interface GuiScriptBridgeEndpoint {
  port: number;
  token: string;
}

export interface GuiScriptBridgeStartOptions {
  pythonPath: string;
  scriptPath: string;
  port: number;
  prdSystems: GuiScriptPrdSystem[];
  logFilePath?: string;
}

export interface GuiScriptBridgeStartResult {
  ok: boolean;
  alreadyRunning: boolean;
  port: number;
  message: string;
}

interface RunningBridge {
  proc: ChildProcess | null;
  port: number;
  token: string;
  tail: string[];
  exited: boolean;
  exitInfo: string;
}

let current: RunningBridge | null = null;

function pushTail(bridge: RunningBridge, chunk: Buffer): void {
  bridge.tail.push(chunk.toString("utf-8"));
  if (bridge.tail.length > 60) bridge.tail.shift();
}

// "2xx döndü" YETMEZ — cevabın BİZİM köprümüzden geldiği doğrulanır.
// Aksi halde 8790'da oturan alakasız bir servis "bridge çalışıyor" diye
// benimsenir ve sonraki her çağrı anlaşılmaz bir hatayla düşer. Köprü artık `/health`'te kendi adını ve PID'ini
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
  if (current && current.port === opts.port && !current.proc?.killed && !current.exited) {
    // PID de tutmalı: cevap veren, bizim çocuğumuz değilse token'ımızı
    // bilmiyordur ve "zaten çalışıyor" demek her sonraki çağrıyı 401'e
    // gönderirdi.
    const health = await healthCheck(current.port);
    if (health.ok && health.pid === current.proc?.pid) {
      return { ok: true, alreadyRunning: true, port: current.port, message: mt("guiScriptManager.alreadyRunning") };
    }
    stopGuiScriptBridge();
  }

  // Portta başka bir köprü var (elle başlatılmış ya da önceki bir oturumdan
  // kalmış). Eskiden "external" diye BENİMSENİYORDU; artık token'ını
  // bilmediğimiz bir köprü kullanılamaz — her istek 401 alırdı. Daha kötüsü:
  // token'sız çalışan eski sürüm bir köprüyü benimsemek, tam da kapatılan
  // açığı geri getirmek olurdu. Süreci öldürmüyoruz, çünkü sahibi biz değiliz;
  // kullanıcıya PID'iyle söylüyoruz.
  const foreign = await healthCheck(opts.port);
  if (foreign.ok) {
    return {
      ok: false,
      alreadyRunning: false,
      port: opts.port,
      message: mt("guiScriptManager.foreignBridge", { port: opts.port, pid: foreign.pid ?? "?" })
    };
  }

  const token = randomBytes(32).toString("base64url");
  const bridge: RunningBridge = { proc: null, port: opts.port, token, tail: [], exited: false, exitInfo: "" };

  let proc: ChildProcess;
  try {
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--port", String(opts.port)], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      // Token ve PRD listesi argv'de DEĞİL: argv süreç listesinde aynı
      // kullanıcının her sürecine görünür.
      env: {
        ...process.env,
        [GUI_BRIDGE_TOKEN_ENV]: token,
        [GUI_BRIDGE_PRD_ENV]: JSON.stringify(opts.prdSystems)
      }
    });
  } catch (err) {
    return { ok: false, alreadyRunning: false, port: opts.port, message: mt("guiScriptManager.spawnFailed", { pythonPath: opts.pythonPath, detail: (err as Error).message }) };
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
    // Yalnızca KENDİ çocuğumuzun cevabı sayılır: arada porta başka bir köprü
    // oturduysa o bizim token'ımızı bilmez.
    const health = await healthCheck(opts.port, 1200);
    if (health.ok && health.pid === proc.pid) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const message = mt("guiScriptManager.didNotStart", { port: opts.port, detail: describeFailure(bridge) });
    stopGuiScriptBridge();
    return { ok: false, alreadyRunning: false, port: opts.port, message };
  }

  return { ok: true, alreadyRunning: false, port: opts.port, message: mt("guiScriptManager.started", { port: opts.port }) };
}

export function stopGuiScriptBridge(): void {
  if (!current) return;
  try {
    current.proc?.kill();
  } catch {
    // best effort
  }
  current = null;
}

export function isGuiScriptBridgeRunning(): boolean {
  return Boolean(current && !current.proc?.killed && !current.exited);
}

export function getGuiScriptBridgePort(): number | null {
  return current?.port ?? null;
}

/**
 * Köprüye konuşmak için port + token. Köprü ayakta değilse `null`; token
 * yalnızca bu modülde ve istemcinin o anki isteğinde yaşar, hiçbir yere
 * yazılmaz.
 */
export function getGuiScriptBridgeEndpoint(): GuiScriptBridgeEndpoint | null {
  if (!current || current.proc?.killed || current.exited) return null;
  return { port: current.port, token: current.token };
}
