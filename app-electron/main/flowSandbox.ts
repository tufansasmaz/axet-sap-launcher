// Flow sandbox penceresi — function node kodunun ve xlsx işlerinin koştuğu
// gizli, Chromium sandbox'lı pencere.
//
// Neden ayrı pencere: ana süreçte `node:vm` bir sınır değildi (bkz.
// flowSandboxHost.ts). Chromium'un renderer sandbox'ı ise işletim sistemi
// düzeyinde bir sınır: Node yok, dosya sistemi yok, alt süreç yok. Üstüne
// ağ da kesiliyor — kod kullanıcının flow'undan geliyor ve içinde SAP'den
// okunmuş veri taşıyor; dışarı sızdırabileceği bir kanal kalmasın.
//
// Pencere tembel kuruluyor (ilk function/xlsx çalışmasında), flow durunca
// ya da bir çalışma zaman aşımına uğrayınca atılıp gerektiğinde yeniden
// kuruluyor. Ayrı `partition` ayrı bir BrowserContext demek; Chromium iki
// farklı BrowserContext'i asla aynı renderer sürecine koymuyor, yani bu
// pencerenin sürecini öldürmek ana pencereye dokunmuyor.

import { BrowserWindow, session, type WebContents } from "electron";
import path from "node:path";
import { FlowSandboxHost, isAllowedSandboxUrl, type SandboxPage, type SandboxPageHandlers } from "./flowSandboxHost";

// "persist:" öneki YOK: oturum yalnızca bellekte, diske çerez/önbellek/
// localStorage yazılmıyor ve uygulama kapanınca iz kalmıyor.
export const FLOW_SANDBOX_PARTITION = "flow-sandbox";

const sandboxSenderIds = new Set<number>();
const sandboxWindows = new WeakSet<BrowserWindow>();
let sessionPrepared = false;

// ipcSenderGuard ve pencere sayımı (dialog sahibi, SAML ebeveyni) için:
// sandbox'ın webContents'i hiçbir zaman ana pencerenin yerine geçmemeli.
export function isFlowSandboxSender(sender: WebContents | null | undefined): boolean {
  return !!sender && sandboxSenderIds.has(sender.id);
}

export function isFlowSandboxWindow(win: BrowserWindow | null | undefined): boolean {
  return !!win && sandboxWindows.has(win);
}

export interface FlowSandboxOptions {
  // Paketlenmiş main betiğinin klasörü (dist-electron/main).
  mainDir: string;
  // Geliştirmede Vite sunucusu; paketlenmiş uygulamada null.
  devServerUrl: string | null;
}

function prepareSession(distDir: string, devOrigin: string | null): void {
  if (sessionPrepared) return;
  sessionPrepared = true;
  const ses = session.fromPartition(FLOW_SANDBOX_PARTITION);
  // CSP sayfanın kendi beyanı; kullanıcı kodu aynı sayfada koştuğu için tek
  // başına yetmez. Oturum filtresi süreç dışında, ana süreçte uygulanıyor.
  ses.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedSandboxUrl(details.url, { distDir, devOrigin }) });
  });
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);
  ses.on("will-download", (event) => event.preventDefault());
}

function openPage(opts: FlowSandboxOptions, handlers: SandboxPageHandlers): SandboxPage {
  const distDir = path.join(opts.mainDir, "../../dist");
  const devOrigin = opts.devServerUrl;
  prepareSession(distDir, devOrigin);

  const win = new BrowserWindow({
    show: false,
    skipTaskbar: true,
    focusable: false,
    width: 320,
    height: 240,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      partition: FLOW_SANDBOX_PARTITION,
      preload: path.join(opts.mainDir, "../preload/flowSandbox.cjs"),
      devTools: false,
      // Gizli pencerede Chromium zamanlayıcıları yavaşlatırdı; kullanıcının
      // setTimeout'u eskisi gibi zamanında çalışsın.
      backgroundThrottling: false,
      // alert/confirm görünmez bir pencerede sonsuza dek beklerdi.
      disableDialogs: true,
      spellcheck: false,
      webgl: false,
      navigateOnDragDrop: false
    }
  });
  const wc = win.webContents;
  const wcId = wc.id;
  // Kimlik pencere kapansa da kümede kalıyor: kapanış ile geç gelen bir IPC
  // arasında bekçinin onu ana pencere sanmasına yer bırakmamak için.
  sandboxSenderIds.add(wcId);
  sandboxWindows.add(win);

  wc.setWindowOpenHandler(() => ({ action: "deny" }));
  wc.on("will-navigate", (event) => event.preventDefault());
  wc.on("will-redirect", (event) => event.preventDefault());
  wc.on("will-frame-navigate", (event) => event.preventDefault());
  wc.on("will-attach-webview", (event) => event.preventDefault());
  // WebRTC'nin UDP/STUN trafiği HTTP isteği değil; webRequest filtresi onu
  // görmüyor. Sayfa kurucuları siliyor, bu da doğrudan UDP'yi kapatıyor.
  wc.setWebRTCIPHandlingPolicy("disable_non_proxied_udp");

  wc.on("render-process-gone", (_event, details) => handlers.gone(`render-process-gone: ${details.reason}`));
  wc.on("did-fail-load", (_event, code, description, _url, isMainFrame) => {
    if (isMainFrame) handlers.gone(`did-fail-load: ${code} ${description}`);
  });
  wc.on("preload-error", (_event, _preloadPath, error) => handlers.gone(`preload-error: ${error.message}`));
  win.on("closed", () => handlers.gone("closed"));

  const fromPage = (event: { sender: WebContents }) => event.sender === wc;
  wc.ipc.on("flow-sandbox:ready", (event) => {
    if (fromPage(event)) handlers.ready();
  });
  wc.ipc.on("flow-sandbox:done", (event, reply: unknown) => {
    if (fromPage(event)) handlers.done(reply);
  });
  wc.ipc.on("flow-sandbox:log", (event, token: unknown, level: unknown, text: unknown) => {
    if (fromPage(event)) handlers.log(token, level, text);
  });
  // Senkron kanal: returnValue HER yolda atanmalı, yoksa sayfa (ve içindeki
  // bütün çalışmalar) bir yanıt beklerken donar.
  wc.ipc.on("flow-sandbox:context", (event, op: unknown, token: unknown, scope: unknown, key: unknown, value: unknown) => {
    let reply: unknown;
    try {
      reply = fromPage(event)
        ? handlers.context(op, token, scope, key, value)
        : { ok: false, error: "context: yetkisiz gonderici" };
    } catch (err) {
      reply = { ok: false, error: `context: ${err instanceof Error ? err.message : String(err)}` };
    }
    event.returnValue = reply;
  });

  const load = devOrigin
    ? win.loadURL(`${devOrigin.replace(/\/$/, "")}/flow-sandbox.html`)
    : win.loadFile(path.join(distDir, "flow-sandbox.html"));
  load.catch((err: unknown) => handlers.gone(`load: ${err instanceof Error ? err.message : String(err)}`));

  return {
    send: (request) => {
      if (!wc.isDestroyed()) wc.send("flow-sandbox:run", request);
    },
    // Sonsuz döngüdeki renderer kapanış olaylarını işleyemez; önce süreci
    // zorla düşürüp sonra pencereyi yok ediyoruz.
    destroy: () => {
      try {
        if (!wc.isDestroyed()) wc.forcefullyCrashRenderer();
      } catch {
        // süreç zaten gitmiş olabilir
      }
      try {
        if (!win.isDestroyed()) win.destroy();
      } catch {
        // pencere zaten gitmiş olabilir
      }
    }
  };
}

export function createFlowSandbox(opts: FlowSandboxOptions): FlowSandboxHost {
  return new FlowSandboxHost((handlers) => openPage(opts, handlers));
}
