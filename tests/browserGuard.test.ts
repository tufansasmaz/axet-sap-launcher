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
  isOurBrowserGuest,
  type BrowserSessionLike,
  type GuestContents
} from "../app-electron/main/browserGuard";
import { BROWSER_PARTITION } from "../app-electron/shared/browserLogic";

describe("allowWebviewAttach (§4.1)", () => {
  it("yalnız bizim bölüm ve boş ya da http/https başlangıç adresi", () => {
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "https://help.sap.com/" })).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "http://localhost:5173/" })).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src: "" })).toBe(true);
    expect(allowWebviewAttach({ partition: BROWSER_PARTITION })).toBe(true);
    for (const src of ["file:///C:/x.html", "javascript:alert(1)", "data:text/html,x", "chrome://gpu", "about:blank", "devtools://devtools/x"]) {
      expect(allowWebviewAttach({ partition: BROWSER_PARTITION, src }), src).toBe(false);
    }
    for (const partition of [undefined, "", "persist:ntt-tarayici2", "ntt-tarayici", "persist:saml-x", "persist:NTT-TARAYICI", "flow-sandbox"]) {
      expect(allowWebviewAttach({ partition, src: "https://a.com/" }), String(partition)).toBe(false);
    }
    expect(allowWebviewAttach(null)).toBe(false);
    expect(allowWebviewAttach(undefined)).toBe(false);
  });
});

describe("hardenWebviewPreferences (§4.1)", () => {
  it("preload ve tehlikeli anahtarlar siliniyor; Node, izolasyon, sandbox, web güvenliği zorla; zararsız ayar kalıyor", () => {
    const prefs: Record<string, unknown> = {
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
      additionalArguments: ["--x"],
      zoomFactor: 1.5
    };
    hardenWebviewPreferences(prefs);
    expect(prefs).toEqual({
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
      zoomFactor: 1.5
    });
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
    expect(g.openHandler!({ url: "https://a.com/" })).toEqual({ action: "deny" });
    await Promise.resolve();
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
  check: (() => boolean) | null = null;
  device: (() => boolean) | null = null;
  setPermissionRequestHandler(handler: (webContents: unknown, permission: string, callback: (granted: boolean) => void) => void) {
    this.request = handler;
  }
  setPermissionCheckHandler(handler: () => boolean) {
    this.check = handler;
  }
  setDevicePermissionHandler(handler: () => boolean) {
    this.device = handler;
  }
}

describe("configureBrowserSession (§4.3, §4.5)", () => {
  it("bütün izin istekleri ve denetimleri reddediliyor", () => {
    const ses = new FakeSession();
    configureBrowserSession(ses as unknown as BrowserSessionLike, { onDownloadBlocked: vi.fn() });
    for (const permission of [
      "media",
      "geolocation",
      "notifications",
      "clipboard-read",
      "clipboard-sanitized-write",
      "deprecated-sync-clipboard-read",
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
    }
    expect(ses.check!()).toBe(false);
    expect(ses.device!()).toBe(false);
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
