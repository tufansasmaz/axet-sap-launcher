// Yerleşik tarayıcının güvenlik kararları (spec 2026-10-18 tarayici §4).
// Electron'u İÇE AKTARMIYOR: dar arayüzler alıyor, testler sahtelerle
// çağırıyor. Canlı bağlantı windowGuard.ts'te (webview takma ve guest
// kuralları, `web-contents-created`) ve index.ts'te (oturum); orada yalnız
// çağrı var, karar burada.
import { BROWSER_PARTITION, browserShortcutOf, isBrowserNavAllowed, type BrowserShortcut, type KeyInput } from "../shared/browserLogic";

export type BrowserLog = (tag: string, fields: Record<string, string>) => void;

export interface WebviewAttachParams {
  src?: string;
  partition?: string;
}

/**
 * §4.1: yalnız bizim bölüm ve boş ya da http/https başlangıç adresi. Hangi
 * pencerenin taktığı çağıranda denetleniyor (yalnız ana pencere, Flow sandbox
 * asla).
 *
 * `prefs`, `will-attach-webview`'ın verdiği webPreferences nesnesi. Electron
 * `<webview webpreferences="partition=...">` dizesini `params.partition`'dan
 * SONRA yayıyor ve guest'in oturumunu bu belirliyor; bu yüzden orada boş
 * olmayan başka bir bölüm varsa takma reddediliyor (bölüm atlatma). Boş ya
 * da yoksa izin; `hardenWebviewPreferences` bizimkini yazıyor.
 */
export function allowWebviewAttach(params: WebviewAttachParams | null | undefined, prefs: Record<string, unknown> | null | undefined): boolean {
  if (!params || !prefs || params.partition !== BROWSER_PARTITION) return false;
  const prefsPartition = prefs.partition;
  if (prefsPartition !== undefined && prefsPartition !== "" && prefsPartition !== BROWSER_PARTITION) return false;
  const src = typeof params.src === "string" ? params.src : "";
  return src === "" || isBrowserNavAllowed(src);
}

/**
 * Beyaz liste: takılan webview'ın ayarlarında YALNIZ bunlar kalıyor. Gelen
 * nesnedeki her başka anahtar (preload, enableBlinkFeatures, ileride Electron'a
 * eklenecek bilinmeyen anahtarlar …) siliniyor. `type`/`embedder` Electron
 * tarafından olaydan sonra ekleniyor.
 */
const FORCED_PREFERENCES = {
  partition: BROWSER_PARTITION,
  nodeIntegration: false,
  nodeIntegrationInSubFrames: false,
  nodeIntegrationInWorker: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  plugins: false,
  webviewTag: false,
  experimentalFeatures: false,
  navigateOnDragDrop: false,
  // Sayfalar çalışsın.
  javascript: true,
  // `window.open` işleyiciye ulaşsın; işleyici her zaman `deny` döner.
  disablePopups: false,
  // Arka arkaya alert ile sayfa kilitlenmesin.
  safeDialogs: true,
  enableWebSQL: false
} as const;

/**
 * §4.1: renderer ne isterse istesin webview'ın ayarları burada zorlanıyor
 * (Electron'un "webview güvenliği" önerisi). Nesne yerinde değiştiriliyor:
 * Electron guest'i bu nesneden kuruyor.
 */
export function hardenWebviewPreferences(prefs: Record<string, unknown>): void {
  for (const key of Object.keys(prefs)) delete prefs[key];
  Object.assign(prefs, FORCED_PREFERENCES);
}

interface Preventable {
  preventDefault(): void;
}

export interface GuestContents {
  setWindowOpenHandler(handler: (details: { url: string }) => { action: "deny" }): void;
  loadURL(url: string): Promise<unknown>;
  setWebRTCIPHandlingPolicy(policy: "default_public_interface_only"): void;
  on(
    event: "select-client-certificate",
    listener: (event: Preventable, url: string, certificateList: unknown[], callback: (...certificate: never[]) => void) => void
  ): unknown;
  on(event: "select-bluetooth-device", listener: (event: Preventable, devices: unknown[], callback: (deviceId: string) => void) => void): unknown;
  on(event: "will-navigate", listener: (event: Preventable & { url: string }) => void): unknown;
  on(event: "will-redirect", listener: (event: Preventable & { url: string; isMainFrame: boolean }) => void): unknown;
  on(event: "will-attach-webview", listener: (event: Preventable) => void): unknown;
  on(event: "before-input-event", listener: (event: Preventable, input: KeyInput) => void): unknown;
}

export interface GuestRuleDeps {
  log: BrowserLog;
  onShortcut: (action: BrowserShortcut) => void;
}

function schemeOf(raw: string): string {
  try {
    return new URL(raw).protocol;
  } catch {
    return "gecersiz";
  }
}

/**
 * §4.4: webview'ın kendi webContents'i. Uygulamanın "yalnız kendi sayfası"
 * kuralı YERİNE: ana çerçeve yalnız http/https; yeni pencere asla, http(s)
 * aynı webview'da; webview içinde webview yok; istemci sertifikası
 * verilmiyor; WebRTC yerel IP göstermiyor; yalnız Ctrl+L ve Alt+Sol/Sağ
 * ana pencereye iletiliyor (sayfa odaktayken uygulama tuşu görmüyor).
 * Günlükte yalnız sonuç ve şema (§4.7).
 */
export function installBrowserGuestRules(contents: GuestContents, deps: GuestRuleDeps): void {
  const decide = (url: string): boolean => {
    const allowed = isBrowserNavAllowed(url);
    try {
      deps.log("tarayici.gezinme", { sonuc: allowed ? "izin" : "ret", sema: schemeOf(url) });
    } catch {
      // günlük hatası kararı değiştirmesin
    }
    return allowed;
  };
  contents.setWindowOpenHandler(({ url }) => {
    if (decide(url)) contents.loadURL(url).catch(() => undefined);
    return { action: "deny" };
  });
  contents.on("will-navigate", (event) => {
    if (!decide(event.url)) event.preventDefault();
  });
  contents.on("will-redirect", (event) => {
    if (!event.isMainFrame) return;
    if (!decide(event.url)) event.preventDefault();
  });
  contents.on("will-attach-webview", (event) => event.preventDefault());
  // İstemci sertifikası kullanıcıya sorulmadan asla verilmez: Electron'un
  // varsayılanı listedeki ilk sertifikayı seçmek; engelleyip sertifikasız
  // devam ediyoruz.
  contents.on("select-client-certificate", (event, _url, _certificateList, callback) => {
    event.preventDefault();
    callback();
  });
  // Bluetooth da aynı sınıf: preventDefault yoksa ilk cihaz seçiliyor. Boş
  // dize isteği iptal ediyor.
  contents.on("select-bluetooth-device", (event, _devices, callback) => {
    event.preventDefault();
    callback("");
  });
  // WebRTC yerel ağ adreslerini sayfaya göstermesin.
  contents.setWebRTCIPHandlingPolicy("default_public_interface_only");
  contents.on("before-input-event", (event, input) => {
    const action = browserShortcutOf(input);
    if (!action) return;
    event.preventDefault();
    deps.onShortcut(action);
  });
}

export interface BrowserSessionLike {
  setPermissionRequestHandler(handler: (webContents: unknown, permission: string, callback: (granted: boolean) => void) => void): void;
  setPermissionCheckHandler(handler: () => boolean): void;
  setDevicePermissionHandler(handler: () => boolean): void;
  on(event: "will-download", listener: (event: Preventable, item: unknown, webContents: { id: number } | null | undefined) => void): unknown;
  on(event: "select-hid-device", listener: (event: Preventable, details: unknown, callback: (deviceId?: string | null) => void) => void): unknown;
  on(event: "select-usb-device", listener: (event: Preventable, details: unknown, callback: (deviceId?: string) => void) => void): unknown;
  on(
    event: "select-serial-port",
    listener: (event: Preventable, portList: unknown[], webContents: unknown, callback: (portId: string) => void) => void
  ): unknown;
  webRequest: {
    onBeforeRequest(listener: (details: { url: string; resourceType?: string }, callback: (response: { cancel?: boolean }) => void) => void): void;
  };
}

const SUBRESOURCE_SCHEMES = new Set(["http:", "https:", "ws:", "wss:", "data:", "blob:"]);

/**
 * Derinlemesine savunma: oturumdaki her istek. Ana çerçeve yalnız http/https
 * (host'un `loadURL`'ü `will-navigate`'e uğramıyor); alt kaynaklarda ayrıca
 * ws/wss ve sayfaların kendi ürettiği data/blob. `file:`, `chrome:`,
 * `devtools:`, `chrome-extension:` ve her başka şema iptal.
 */
export function isBrowserRequestAllowed(url: string, resourceType: string | undefined): boolean {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    return false;
  }
  if (resourceType === "mainFrame") return protocol === "http:" || protocol === "https:";
  return SUBRESOURCE_SCHEMES.has(protocol);
}

/**
 * §4.3, §4.5: `persist:ntt-tarayici` oturumunda bütün izinler (kamera,
 * mikrofon, konum, bildirim, pano, MIDI, HID, seri port, USB, ekran
 * paylaşımı …) reddediliyor; cihaz seçimleri (HID, USB, seri port) iptal;
 * yerel ve iç şemalı istekler iptal; indirme iptal, kullanıcıya görünümde
 * uyarı.
 */
export function configureBrowserSession(ses: BrowserSessionLike, deps: { onDownloadBlocked: (webContentsId: number | null) => void }): void {
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);
  ses.on("select-hid-device", (event, _details, callback) => {
    event.preventDefault();
    callback();
  });
  ses.on("select-usb-device", (event, _details, callback) => {
    event.preventDefault();
    callback();
  });
  ses.on("select-serial-port", (event, _portList, _webContents, callback) => {
    event.preventDefault();
    callback("");
  });
  ses.webRequest.onBeforeRequest((details, callback) => {
    let cancel = true;
    try {
      cancel = !isBrowserRequestAllowed(details.url, details.resourceType);
    } finally {
      callback({ cancel });
    }
  });
  ses.on("will-download", (event, _item, webContents) => {
    event.preventDefault();
    try {
      deps.onDownloadBlocked(typeof webContents?.id === "number" ? webContents.id : null);
    } catch {
      // bildirim düşse de indirme iptal
    }
  });
}

export interface SessionLike {
  getStoragePath(): string | null;
}

export interface GuestCandidate {
  isDestroyed(): boolean;
  getType(): string;
  hostWebContents?: { id?: unknown } | null;
  session: SessionLike;
}

/** Ana pencereyle aynı webContents mi? Electron sarmalayıcıyı önbelleklese de kimlik `id`. */
function sameHost(a: { id?: unknown } | null | undefined, b: { id?: unknown } | null | undefined): boolean {
  if (!a || !b) return false;
  return typeof a.id === "number" && Number.isFinite(a.id) && a.id === b.id;
}

/** Aynı nesne ya da aynı (boş olmayan) disk yolu: `persist:` bölümünün kimliği. */
function sameSession(a: SessionLike | null | undefined, b: SessionLike): boolean {
  if (!a) return false;
  if (a === b) return true;
  const storage = a.getStoragePath();
  return !!storage && storage === b.getStoragePath();
}

/** §4.6: IPC'nin verdiği webContentsId ana pencereye bağlı, bu bölümdeki, canlı bir webview mi? */
export function isOurBrowserGuest(
  candidate: GuestCandidate | null | undefined,
  host: { id?: unknown } | null | undefined,
  browserSession: SessionLike
): boolean {
  if (!candidate || !host) return false;
  try {
    return (
      !candidate.isDestroyed() &&
      candidate.getType() === "webview" &&
      sameHost(candidate.hostWebContents, host) &&
      sameSession(candidate.session, browserSession)
    );
  } catch {
    return false;
  }
}

/** `web-contents-created` anında: bu webContents bizim tarayıcının sayfası mı? */
export function isBrowserGuestContents(contents: Pick<GuestCandidate, "getType" | "session">, browserSession: SessionLike): boolean {
  try {
    return contents.getType() === "webview" && sameSession(contents.session, browserSession);
  } catch {
    return false;
  }
}
