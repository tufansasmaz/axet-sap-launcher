// Yerleşik tarayıcının güvenlik kararları (spec 2026-10-18 tarayici §4) —
// Electron'u açmadan, sahte webContents ve oturumla.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  allowWebviewAttach,
  configureBrowserSession,
  hardenWebviewPreferences,
  installBrowserGuestRules,
  isBrowserGuestContents,
  isBrowserRequestAllowed,
  isOurBrowserGuest,
  type BrowserSessionLike,
  type GuestContents
} from "../app-electron/main/browserGuard";
import { BROWSER_PARTITION } from "../app-electron/shared/browserLogic";

describe("allowWebviewAttach (§4.1)", () => {
  it("yalnız bizim bölüm ve boş ya da http/https başlangıç adresi", () => {
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "https://help.sap.com/" }, {})).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "http://localhost:5173/" }, {})).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "HTTPS://a.com/" }, {})).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "" }, {})).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION }, {})).toBe(true);
    for (const src of [
      "file:///C:/x.html",
      "javascript:alert(1)",
      " javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,x",
      "blob:https://a.com/x",
      "chrome://gpu",
      "about:blank",
      "devtools://devtools/x"
    ]) {
      expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src }, {}), src).toBe(false);
    }
    for (const partition of [undefined, "", "persist:ntt-tarayici2", "ntt-tarayici", "persist:saml-x", "persist:NTT-TARAYICI", "flow-sandbox"]) {
      expect(allowWebviewAttach({ partition, src: "https://a.com/" }, {}), String(partition)).toBe(false);
    }
    expect(allowWebviewAttach(null, {})).toBe(false);
    expect(allowWebviewAttach(undefined, {})).toBe(false);
  });

  it("webpreferences özniteliğiyle başka bölüm: ret (bölüm atlatma)", () => {
    const params = { partition: BROWSER_PARTITION, src: "https://a.com/" };
    for (const partition of ["persist:saml-x", "persist:NTT-tarayici", "persist:NTT-TARAYICI", "ntt-tarayici", " persist:ntt-tarayici", 42, true, {}]) {
      expect(allowWebviewAttach(params, { partition }), String(partition)).toBe(false);
    }
    // Bizim bölüm, boş ya da hiç yok: izin (hardenWebviewPreferences bizimkini yazıyor).
    expect(allowWebviewAttach(params, { partition: BROWSER_PARTITION })).toBe(true);
    expect(allowWebviewAttach(params, { partition: "" })).toBe(true);
    expect(allowWebviewAttach(params, { partition: undefined })).toBe(true);
    expect(allowWebviewAttach(params, {})).toBe(true);
  });

  it("ayar nesnesi yoksa ret", () => {
    const params = { partition: BROWSER_PARTITION, src: "https://a.com/" };
    expect(allowWebviewAttach(params, null)).toBe(false);
    expect(allowWebviewAttach(params, undefined)).toBe(false);
  });
});

describe("hardenWebviewPreferences (§4.1)", () => {
  const SAFE = {
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
    javascript: true,
    disablePopups: false,
    safeDialogs: true,
    enableWebSQL: false
  };

  it("beyaz liste: tehlikeli anahtarlar siliniyor, güvenli değerler zorla, javascript açık, bölüm bizimki", () => {
    const prefs: Record<string, unknown> = {
      partition: "persist:saml-x",
      preload: "C:/x/preload.cjs",
      preloadURL: "file:///C:/x/preload.cjs",
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      plugins: true,
      webviewTag: true,
      experimentalFeatures: true,
      enableBlinkFeatures: "X",
      disableBlinkFeatures: "Y",
      additionalArguments: ["--x"],
      javascript: false,
      disablePopups: true,
      zoomFactor: 1.5,
      gelecekteBilinmeyenAnahtar: "x"
    };
    hardenWebviewPreferences(prefs);
    expect(prefs).toEqual(SAFE);
  });

  it("boş nesneye de aynı güvenli küme yazılıyor", () => {
    const prefs: Record<string, unknown> = {};
    hardenWebviewPreferences(prefs);
    expect(prefs).toEqual(SAFE);
  });
});

// --- guest kuralları -------------------------------------------------------

class FakeGuest extends EventEmitter {
  openHandler: ((details: { url: string }) => { action: string }) | null = null;
  loadURL = vi.fn(async (_url: string) => undefined);
  setWebRTCIPHandlingPolicy = vi.fn((_policy: string) => undefined);
  setWindowOpenHandler(handler: (details: { url: string }) => { action: "deny" }) {
    this.openHandler = handler;
  }
  nav(kind: "will-navigate" | "will-redirect", url: string, isMainFrame = true): boolean {
    let prevented = false;
    this.emit(kind, { url, isMainFrame, preventDefault: () => (prevented = true) });
    return prevented;
  }
  key(input: Record<string, unknown>): boolean {
    let prevented = false;
    this.emit("before-input-event", { preventDefault: () => (prevented = true) }, { type: "keyDown", key: "", control: false, alt: false, shift: false, meta: false, ...input });
    return prevented;
  }
  attach(): boolean {
    let prevented = false;
    this.emit("will-attach-webview", { preventDefault: () => (prevented = true) }, {}, { partition: BROWSER_PARTITION, src: "https://a.com/" });
    return prevented;
  }
}

function guest() {
  const g = new FakeGuest();
  const log = vi.fn();
  const onShortcut = vi.fn();
  installBrowserGuestRules(g as unknown as GuestContents, { log, onShortcut });
  return { g, log, onShortcut };
}

describe("installBrowserGuestRules (§4.4)", () => {
  it("gezinme: http/https serbest; file, javascript, data, chrome, devtools reddediliyor", () => {
    const { g } = guest();
    expect(g.nav("will-navigate", "https://help.sap.com/x")).toBe(false);
    expect(g.nav("will-navigate", "http://localhost:5173/")).toBe(false);
    for (const url of ["file:///C:/Windows/win.ini", "javascript:alert(1)", "data:text/html,x", "chrome://settings", "devtools://devtools/x", "about:blank"]) {
      expect(g.nav("will-navigate", url), url).toBe(true);
    }
  });

  it("yönlendirme: ana çerçevede http/https dışı reddediliyor; alt çerçeveye dokunulmuyor", () => {
    const { g } = guest();
    expect(g.nav("will-redirect", "https://login.example.com/")).toBe(false);
    expect(g.nav("will-redirect", "data:text/html,x")).toBe(true);
    expect(g.nav("will-redirect", "data:text/html,x", false)).toBe(false);
  });

  it("window.open: hiç pencere yok; http(s) aynı webview'da, başka şema hiç yüklenmiyor", () => {
    const { g } = guest();
    expect(g.openHandler!({ url: "https://a.com/yeni" })).toEqual({ action: "deny" });
    expect(g.loadURL).toHaveBeenCalledWith("https://a.com/yeni");
    for (const url of ["javascript:alert(1)", "file:///C:/x", "about:blank"]) {
      expect(g.openHandler!({ url })).toEqual({ action: "deny" });
    }
    expect(g.loadURL).toHaveBeenCalledTimes(1);
  });

  it("loadURL reddedilse de (ERR_ABORTED) yakalanıyor", async () => {
    const { g } = guest();
    g.loadURL.mockRejectedValueOnce(new Error("ERR_ABORTED"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      expect(g.openHandler!({ url: "https://a.com/" })).toEqual({ action: "deny" });
      expect(g.loadURL).toHaveBeenCalledWith("https://a.com/");
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("Bluetooth cihazı sorulmadan seçilmiyor: varsayılan engelleniyor, istek iptal", () => {
    const { g } = guest();
    const preventDefault = vi.fn();
    const callback = vi.fn();
    g.emit("select-bluetooth-device", { preventDefault }, [{ deviceId: "AA:BB", deviceName: "kulaklik" }], callback);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("");
  });

  it("istemci sertifikası sorulmadan verilmiyor: varsayılan seçim engelleniyor, sertifikasız devam", () => {
    const { g } = guest();
    const preventDefault = vi.fn();
    const callback = vi.fn();
    g.emit("select-client-certificate", { preventDefault }, "https://a.com/", [{ subjectName: "CN=kullanici" }], callback);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]).toEqual([]);
  });

  it("WebRTC yalnız varsayılan genel arayüzü kullanıyor (yerel IP sızmıyor)", () => {
    const { g } = guest();
    expect(g.setWebRTCIPHandlingPolicy).toHaveBeenCalledTimes(1);
    expect(g.setWebRTCIPHandlingPolicy).toHaveBeenCalledWith("default_public_interface_only");
  });

  it("webview içinde webview takılamıyor", () => {
    const { g } = guest();
    expect(g.attach()).toBe(true);
  });

  it("kısayollar: Ctrl+L, Alt+Sol, Alt+Sağ iletiliyor; Ctrl+V ve başka tuşlar sayfada kalıyor", () => {
    const { g, onShortcut } = guest();
    expect(g.key({ key: "l", control: true })).toBe(true);
    expect(g.key({ key: "ArrowLeft", alt: true })).toBe(true);
    expect(g.key({ key: "ArrowRight", alt: true })).toBe(true);
    expect(onShortcut.mock.calls.map((c) => c[0])).toEqual(["focusAddress", "back", "forward"]);
    expect(g.key({ key: "v", control: true })).toBe(false);
    expect(g.key({ key: "a" })).toBe(false);
    expect(g.key({ type: "keyUp", key: "l", control: true })).toBe(false);
    expect(onShortcut).toHaveBeenCalledTimes(3);
  });

  it("günlük: yalnız sonuç ve şema; adres yok", () => {
    const { g, log } = guest();
    g.nav("will-navigate", "file:///C:/gizli-yol/dosya.txt");
    g.nav("will-navigate", "https://gizli-sunucu.example/sayfa?token=abc");
    expect(log.mock.calls).toEqual([
      ["tarayici.gezinme", { sonuc: "ret", sema: "file:" }],
      ["tarayici.gezinme", { sonuc: "izin", sema: "https:" }]
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/gizli|token/);
  });

  it("günlük fırlatsa da karar veriliyor", () => {
    const g = new FakeGuest();
    installBrowserGuestRules(g as unknown as GuestContents, {
      log: () => {
        throw new Error("disk dolu");
      },
      onShortcut: vi.fn()
    });
    expect(g.nav("will-navigate", "file:///C:/x")).toBe(true);
    expect(g.nav("will-navigate", "https://a.com/")).toBe(false);
  });
});

// --- oturum kuralları -------------------------------------------------------

class FakeSession extends EventEmitter {
  request: ((webContents: unknown, permission: string, callback: (granted: boolean) => void) => void) | null = null;
  check: ((webContents: unknown, permission: string) => boolean) | null = null;
  device: (() => boolean) | null = null;
  setPermissionRequestHandler(handler: (webContents: unknown, permission: string, callback: (granted: boolean) => void) => void) {
    this.request = handler;
  }
  setPermissionCheckHandler(handler: (webContents: unknown, permission: string) => boolean) {
    this.check = handler;
  }
  setDevicePermissionHandler(handler: () => boolean) {
    this.device = handler;
  }
  beforeRequest: ((details: { url: string; resourceType?: string }, callback: (response: { cancel?: boolean }) => void) => void) | null = null;
  webRequest = {
    onBeforeRequest: (listener: (details: { url: string; resourceType?: string }, callback: (response: { cancel?: boolean }) => void) => void) => {
      this.beforeRequest = listener;
    }
  };
  /** İsteği geçirip iptal edilip edilmediğini döndürür. */
  requestCancelled(url: string, resourceType = "image"): boolean {
    const callback = vi.fn();
    this.beforeRequest!({ url, resourceType }, callback);
    expect(callback).toHaveBeenCalledTimes(1);
    return callback.mock.calls[0][0].cancel === true;
  }
}

describe("isBrowserRequestAllowed (derinlemesine savunma)", () => {
  it("http/https/ws/wss serbest; data/blob yalnız alt kaynakta; yerel ve iç şemalar ret", () => {
    for (const url of ["https://a.com/x.js", "http://localhost:5173/", "wss://a.com/s", "ws://a.com/s", "HTTPS://A.com/"]) {
      expect(isBrowserRequestAllowed(url, "script"), url).toBe(true);
    }
    expect(isBrowserRequestAllowed("data:image/png;base64,AA", "image")).toBe(true);
    expect(isBrowserRequestAllowed("blob:https://a.com/1", "media")).toBe(true);
    expect(isBrowserRequestAllowed("data:text/html,x", "mainFrame")).toBe(false);
    expect(isBrowserRequestAllowed("blob:https://a.com/1", "mainFrame")).toBe(false);
    expect(isBrowserRequestAllowed("wss://a.com/s", "mainFrame")).toBe(false);
    expect(isBrowserRequestAllowed("https://a.com/", "mainFrame")).toBe(true);
    for (const url of [
      "file:///C:/Windows/win.ini",
      "FILE:///C:/x",
      "devtools://devtools/x",
      "chrome://gpu",
      "chrome-extension://abc/x.js",
      "javascript:alert(1)",
      "ftp://a.com/x",
      "smb://sunucu/pay",
      "",
      "gecersiz adres"
    ]) {
      expect(isBrowserRequestAllowed(url, "image"), url).toBe(false);
    }
  });
});

describe("configureBrowserSession (§4.3, §4.5)", () => {
  it("yalnız panoya yazma (clipboard-sanitized-write) izinli; istek ve denetim tutarlı", () => {
    const ses = new FakeSession();
    configureBrowserSession(ses as unknown as BrowserSessionLike, { onDownloadBlocked: vi.fn() });
    const callback = vi.fn();
    ses.request!({}, "clipboard-sanitized-write", callback);
    expect(callback).toHaveBeenCalledWith(true);
    expect(ses.check!({}, "clipboard-sanitized-write")).toBe(true);
    expect(ses.check!({}, "clipboard-read")).toBe(false);
    expect(ses.check!(null, "deprecated-sync-clipboard-read")).toBe(false);
    expect(ses.check!({}, "")).toBe(false);
  });

  it("geri kalan bütün izin istekleri ve denetimleri reddediliyor (pano okuma dahil)", () => {
    const ses = new FakeSession();
    configureBrowserSession(ses as unknown as BrowserSessionLike, { onDownloadBlocked: vi.fn() });
    for (const permission of [
      "media",
      "geolocation",
      "notifications",
      "clipboard-read",
      "deprecated-sync-clipboard-read",
      "CLIPBOARD-SANITIZED-WRITE",
      "unknown",
      "midi",
      "midiSysex",
      "hid",
      "serial",
      "usb",
      "display-capture",
      "fullscreen",
      "pointerLock",
      "openExternal"
    ]) {
      const callback = vi.fn();
      ses.request!({}, permission, callback);
      expect(callback, permission).toHaveBeenCalledWith(false);
      expect(ses.check!({}, permission), permission).toBe(false);
    }
    expect(ses.device!()).toBe(false);
  });

  it("webRequest: file: ve iç şemalı istekler iptal, http(s) geçiyor", () => {
    const ses = new FakeSession();
    configureBrowserSession(ses as unknown as BrowserSessionLike, { onDownloadBlocked: vi.fn() });
    expect(ses.requestCancelled("file:///C:/Users/x/gizli.txt")).toBe(true);
    expect(ses.requestCancelled("chrome-extension://abc/x.js", "script")).toBe(true);
    expect(ses.requestCancelled("devtools://devtools/x", "subFrame")).toBe(true);
    expect(ses.requestCancelled("https://a.com/x.png")).toBe(false);
    expect(ses.requestCancelled("https://a.com/", "mainFrame")).toBe(false);
  });

  it("HID, seri port, USB cihaz seçimi: varsayılan engelleniyor, istek iptal", () => {
    const ses = new FakeSession();
    configureBrowserSession(ses as unknown as BrowserSessionLike, { onDownloadBlocked: vi.fn() });
    const hid = { preventDefault: vi.fn(), callback: vi.fn() };
    ses.emit("select-hid-device", hid, { deviceList: [{ deviceId: "1" }] }, hid.callback);
    expect(hid.preventDefault).toHaveBeenCalledTimes(1);
    expect(hid.callback.mock.calls).toEqual([[]]);
    const usb = { preventDefault: vi.fn(), callback: vi.fn() };
    ses.emit("select-usb-device", usb, { deviceList: [{ deviceId: "1" }] }, usb.callback);
    expect(usb.preventDefault).toHaveBeenCalledTimes(1);
    expect(usb.callback.mock.calls).toEqual([[]]);
    const serial = { preventDefault: vi.fn(), callback: vi.fn() };
    ses.emit("select-serial-port", serial, [{ portId: "COM1" }], {}, serial.callback);
    expect(serial.preventDefault).toHaveBeenCalledTimes(1);
    expect(serial.callback.mock.calls).toEqual([[""]]);
  });

  it("indirme iptal; hangi sayfadan geldiği bildiriliyor", () => {
    const ses = new FakeSession();
    const onDownloadBlocked = vi.fn();
    configureBrowserSession(ses as unknown as BrowserSessionLike, { onDownloadBlocked });
    const event = { preventDefault: vi.fn() };
    ses.emit("will-download", event, {}, { id: 42 });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onDownloadBlocked).toHaveBeenCalledWith(42);
    const second = { preventDefault: vi.fn() };
    ses.emit("will-download", second, {}, undefined);
    expect(second.preventDefault).toHaveBeenCalled();
    expect(onDownloadBlocked).toHaveBeenLastCalledWith(null);
  });

  it("bildirim fırlatsa da indirme iptal", () => {
    const ses = new FakeSession();
    configureBrowserSession(ses as unknown as BrowserSessionLike, {
      onDownloadBlocked: () => {
        throw new Error("pencere yok");
      }
    });
    const event = { preventDefault: vi.fn() };
    expect(() => ses.emit("will-download", event, {}, { id: 1 })).not.toThrow();
    expect(event.preventDefault).toHaveBeenCalled();
  });
});

// --- guest doğrulaması (§4.6) ---------------------------------------------

describe("isOurBrowserGuest / isBrowserGuestContents (§4.6)", () => {
  const ours = { getStoragePath: () => "C:\\u\\NTT Studio\\Partitions\\ntt-tarayici" };
  const host = { id: 1 };
  const candidate = (over: Record<string, unknown> = {}) => ({
    isDestroyed: () => false,
    getType: () => "webview",
    hostWebContents: host,
    session: ours,
    ...over
  });

  it("ana pencereye bağlı, bu bölümdeki, canlı webview", () => {
    expect(isOurBrowserGuest(candidate(), host, ours)).toBe(true);
    // Aynı bölüm, farklı nesne: disk yolu aynı.
    expect(isOurBrowserGuest(candidate({ session: { getStoragePath: () => ours.getStoragePath() } }), host, ours)).toBe(true);
    // Host aynı id, farklı sarmalayıcı nesne: kimlik id ile.
    expect(isOurBrowserGuest(candidate({ hostWebContents: { id: 1 } }), host, ours)).toBe(true);
  });

  it("host id'si sayı değilse ya da eksikse: hayır", () => {
    expect(isOurBrowserGuest(candidate({ hostWebContents: {} }), {}, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ hostWebContents: { id: "1" } }), { id: "1" }, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ hostWebContents: { id: Number.NaN } }), { id: Number.NaN }, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ hostWebContents: undefined }), host, ours)).toBe(false);
  });

  it("başka pencere, başka tür, yok edilmiş, başka oturum, bellek içi oturum, eksik girdi: hayır", () => {
    expect(isOurBrowserGuest(candidate({ hostWebContents: { id: 2 } }), host, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ hostWebContents: null }), host, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ getType: () => "window" }), host, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ isDestroyed: () => true }), host, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ session: { getStoragePath: () => "C:\\u\\NTT Studio\\Partitions\\saml-x" } }), host, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate({ session: { getStoragePath: () => null } }), host, { getStoragePath: () => null })).toBe(false);
    expect(isOurBrowserGuest(null, host, ours)).toBe(false);
    expect(isOurBrowserGuest(candidate(), null, ours)).toBe(false);
    expect(
      isOurBrowserGuest(
        candidate({
          getType: () => {
            throw new Error("yok edildi");
          }
        }),
        host,
        ours
      )
    ).toBe(false);
  });

  it("isBrowserGuestContents: webview + bu bölüm", () => {
    expect(isBrowserGuestContents(candidate(), ours)).toBe(true);
    expect(isBrowserGuestContents(candidate({ getType: () => "window" }), ours)).toBe(false);
    expect(isBrowserGuestContents(candidate({ session: { getStoragePath: () => null } }), ours)).toBe(false);
  });
});
