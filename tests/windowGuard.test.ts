import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { App, Session, Shell, WebContents } from "electron";
import {
  installWindowGuards,
  isAppUrl,
  isExternalOpenAllowed,
  isSamlLoginSession,
  type AppOrigin
} from "../app-electron/main/windowGuard";
import { relaxCspForDev } from "../app-electron/shared/devCsp";
import { BROWSER_PARTITION } from "../app-electron/shared/browserLogic";

// Pencere/navigasyon korumaları (Y2). Electron'u açmadan: URL kararları saf
// fonksiyon olarak, `web-contents-created` kurulumu sahte app/webContents ile,
// Electron'a sınanamayan ayarlar (CSP, sandbox, iframe) kaynak metni olarak.

const win = process.platform === "win32";
const distDir = win ? "C:\\app\\resources\\app.asar\\dist" : "/app/resources/app.asar/dist";
const base = win ? "file:///C:/app/resources/app.asar" : "file:///app/resources/app.asar";
const prod: AppOrigin = { distDir, devOrigin: null };
const dev: AppOrigin = { distDir, devOrigin: "http://localhost:5173" };

describe("isAppUrl", () => {
  it("paketlenmiş uygulamada yalnızca dist/index.html", () => {
    expect(isAppUrl(`${base}/dist/index.html`, prod)).toBe(true);
    expect(isAppUrl(`${base}/dist/index.html#/sohbet`, prod)).toBe(true);
    expect(isAppUrl(`${base}/dist/flow-sandbox.html`, prod)).toBe(false);
    expect(isAppUrl(`${base}/dist/assets/index-x.js`, prod)).toBe(false);
    expect(isAppUrl(`${base}/dist/../index.html`, prod)).toBe(false);
    expect(isAppUrl("file:///C:/Users/x/Downloads/index.html", prod)).toBe(false);
    expect(isAppUrl("file://sunucu/paylasim/dist/index.html", prod)).toBe(false);
    expect(isAppUrl("https://saldirgan.example/", prod)).toBe(false);
    expect(isAppUrl("http://localhost:5173/", prod)).toBe(false);
  });

  it("görünüm sorgusu (?palette=…&theme=…) sayfayı yabancı yapmıyor", () => {
    expect(isAppUrl(`${base}/dist/index.html?palette=warm&theme=light`, prod)).toBe(true);
    expect(isAppUrl("http://localhost:5173/?palette=warm&theme=light", dev)).toBe(true);
  });

  it("Windows'ta sürücü harfi büyük/küçük farkı sayfayı yabancı yapmıyor", () => {
    if (!win) return;
    expect(isAppUrl("file:///c:/app/resources/app.asar/dist/index.html", prod)).toBe(true);
    expect(isAppUrl("file:///C:/APP/Resources/app.asar/dist/INDEX.html", prod)).toBe(true);
  });

  it("geliştirmede yalnızca Vite sunucusunun origin'i", () => {
    expect(isAppUrl("http://localhost:5173/", dev)).toBe(true);
    expect(isAppUrl("http://localhost:5173/src/main.tsx", dev)).toBe(true);
    expect(isAppUrl("http://localhost:1880/", dev)).toBe(false);
    expect(isAppUrl("http://127.0.0.1:5173/", dev)).toBe(false);
    expect(isAppUrl(`${base}/dist/index.html`, dev)).toBe(false);
  });

  it("çözümlenemeyen ve tehlikeli şemalar", () => {
    for (const url of ["", "javascript:alert(1)", "data:text/html,<script>1</script>", "about:blank", "blob:file:///x", "nonsense"]) {
      expect(isAppUrl(url, prod)).toBe(false);
      expect(isAppUrl(url, dev)).toBe(false);
    }
  });
});

describe("isExternalOpenAllowed", () => {
  it("yalnızca https, http ve mailto", () => {
    expect(isExternalOpenAllowed("https://help.sap.com/x")).toBe(true);
    expect(isExternalOpenAllowed("HTTP://localhost:1880/")).toBe(true);
    expect(isExternalOpenAllowed("mailto:ali@example.com")).toBe(true);
    for (const url of [
      "javascript:alert(1)",
      "file:///C:/Windows/System32/calc.exe",
      "ms-msdt:/id PCWDiagnostic",
      "search-ms:query=x",
      "data:text/html,x",
      "vbscript:x",
      "\\\\sunucu\\paylasim\\a.exe",
      "",
      "relative/path"
    ]) {
      expect(isExternalOpenAllowed(url)).toBe(false);
    }
    expect(isExternalOpenAllowed(undefined as unknown as string)).toBe(false);
  });
});

describe("isSamlLoginSession", () => {
  it("yalnızca varsayılan olmayan persist:saml-* bölmesi muaf", () => {
    expect(isSamlLoginSession("C:\\Users\\x\\AppData\\Roaming\\NTT Studio\\Partitions\\saml-abc-123", false)).toBe(true);
    expect(isSamlLoginSession("/home/x/.config/ntt/Partitions/saml-abc/", false)).toBe(true);
    expect(isSamlLoginSession("C:\\Users\\x\\AppData\\Roaming\\NTT Studio", true)).toBe(false);
    expect(isSamlLoginSession("C:\\x\\Partitions\\saml-abc", true)).toBe(false);
    expect(isSamlLoginSession(null, false)).toBe(false);
    expect(isSamlLoginSession("C:\\x\\Partitions\\flow-sandbox", false)).toBe(false);
    expect(isSamlLoginSession("C:\\x\\Partitions\\saml-abc\\alt", false)).toBe(false);
  });
});

// --- web-contents-created kurulumu ---------------------------------------

type NavEvent = { url: string; isMainFrame: boolean; preventDefault: () => void; defaultPrevented: boolean };

class FakeContents extends EventEmitter {
  openHandler: ((details: { url: string }) => { action: string }) | null = null;
  constructor(public session: { getStoragePath: () => string | null }) {
    super();
  }
  setWindowOpenHandler(handler: (details: { url: string }) => { action: string }) {
    this.openHandler = handler;
  }
  navigate(kind: "will-navigate" | "will-redirect", url: string, isMainFrame = true): boolean {
    const event: NavEvent = {
      url,
      isMainFrame,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      }
    };
    this.emit(kind, event, url);
    return event.defaultPrevented;
  }
  loadURL = vi.fn(async (_url: string) => undefined);
  // installBrowserGuestRules guest'te bunu çağırıyor (WebRTC yerel IP).
  setWebRTCIPHandlingPolicy = vi.fn();
  attachWebview(params: Record<string, unknown> = {}, prefs: Record<string, unknown> = {}): boolean {
    let prevented = false;
    this.emit("will-attach-webview", { preventDefault: () => (prevented = true) }, prefs, params);
    return prevented;
  }
}

function setup(origin: AppOrigin = prod, opts: { browser?: boolean } = {}) {
  const app = new EventEmitter();
  const openExternal = vi.fn().mockResolvedValue(undefined);
  const defaultSession = { getStoragePath: () => "C:\\Users\\x\\AppData\\Roaming\\NTT Studio" };
  const sandboxes = new Set<unknown>();
  const mains = new Set<unknown>();
  const guests = new Set<unknown>();
  const browserLog = vi.fn();
  const onShortcut = vi.fn();
  installWindowGuards({
    app: app as unknown as App,
    shell: { openExternal } as unknown as Shell,
    defaultSession: () => defaultSession as unknown as Session,
    origin,
    isFlowSandbox: (contents) => sandboxes.has(contents),
    ...(opts.browser
      ? {
          browser: {
            isMainWindow: (contents: WebContents) => mains.has(contents),
            isGuest: (contents: WebContents) => guests.has(contents),
            log: browserLog,
            onShortcut
          }
        }
      : {})
  });
  const create = (session: { getStoragePath: () => string | null } = defaultSession, kind: "plain" | "main" | "guest" = "plain") => {
    const contents = new FakeContents(session);
    if (kind === "main") mains.add(contents);
    if (kind === "guest") guests.add(contents);
    app.emit("web-contents-created", {}, contents as unknown as WebContents);
    return contents;
  };
  return { create, openExternal, sandboxes, mains, browserLog, onShortcut };
}

describe("installWindowGuards", () => {
  it("ana pencere: yeni pencere hiç açılmıyor, web bağlantısı sistem tarayıcısına gidiyor", () => {
    const { create, openExternal } = setup();
    const main = create();
    expect(main.openHandler!({ url: "https://saldirgan.example/" })).toEqual({ action: "deny" });
    expect(openExternal).toHaveBeenCalledWith("https://saldirgan.example/");
    expect(main.openHandler!({ url: "javascript:alert(1)" })).toEqual({ action: "deny" });
    expect(main.openHandler!({ url: "file:///C:/Windows/System32/calc.exe" })).toEqual({ action: "deny" });
    expect(openExternal).toHaveBeenCalledTimes(1);
  });

  it("ana pencere: uygulama sayfası dışına navigasyon ve yönlendirme engelleniyor", () => {
    const { create } = setup();
    const main = create();
    expect(main.navigate("will-navigate", "https://saldirgan.example/")).toBe(true);
    expect(main.navigate("will-navigate", "javascript:alert(1)")).toBe(true);
    expect(main.navigate("will-navigate", "file:///C:/Users/x/evil.html")).toBe(true);
    expect(main.navigate("will-navigate", `${base}/dist/index.html`)).toBe(false);
    expect(main.navigate("will-redirect", "https://saldirgan.example/")).toBe(true);
    // Node-RED iframe'inin kendi içindeki yönlendirmesi ana pencereyi götürmüyor.
    expect(main.navigate("will-redirect", "http://localhost:1880/login", false)).toBe(false);
    expect(main.attachWebview()).toBe(true);
  });

  it("geliştirmede Vite sunucusu serbest, başka localhost değil", () => {
    const { create } = setup(dev);
    const main = create();
    expect(main.navigate("will-navigate", "http://localhost:5173/")).toBe(false);
    expect(main.navigate("will-navigate", "http://localhost:1880/")).toBe(true);
  });

  it("SAML penceresi IdP'ye gidebiliyor ama yeni pencere açamıyor", () => {
    const { create, openExternal } = setup();
    const saml = create({ getStoragePath: () => "C:\\Users\\x\\AppData\\Roaming\\NTT Studio\\Partitions\\saml-uuid-1" });
    expect(saml.navigate("will-navigate", "https://idp.firma.example/saml2/sso")).toBe(false);
    expect(saml.navigate("will-redirect", "https://login.microsoftonline.com/x")).toBe(false);
    expect(saml.openHandler!({ url: "https://idp.firma.example/yardim" })).toEqual({ action: "deny" });
    expect(openExternal).toHaveBeenCalledTimes(1);
    expect(saml.attachWebview()).toBe(true);
  });

  it("başka bir bellek içi oturum (flow sandbox) muaf değil ve dışarıya URL açtıramıyor", () => {
    const { create, openExternal, sandboxes } = setup();
    const sandbox = create({ getStoragePath: () => null });
    sandboxes.add(sandbox);
    expect(sandbox.navigate("will-navigate", "https://saldirgan.example/")).toBe(true);
    expect(sandbox.openHandler!({ url: "https://saldirgan.example/" })).toEqual({ action: "deny" });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("oturum okunamazsa kilit yine kuruluyor", () => {
    const { create } = setup();
    const broken = create({
      getStoragePath: () => {
        throw new Error("yok");
      }
    });
    expect(broken.navigate("will-navigate", "https://saldirgan.example/")).toBe(true);
  });
});

describe("installWindowGuards — yerleşik tarayıcı (spec 2026-10-18 tarayici §4)", () => {
  const ok = { partition: BROWSER_PARTITION, src: "https://help.sap.com/" };
  const guestSession = { getStoragePath: () => "C:\\Users\\x\\AppData\\Roaming\\NTT Studio\\Partitions\\ntt-tarayici" };

  it("ana pencere yalnız bizim bölümdeki webview'ı takıyor ve ayarlarını zorluyor", () => {
    const { create } = setup(prod, { browser: true });
    const main = create(undefined, "main");
    const prefs: Record<string, unknown> = { preload: "C:/x/preload.cjs", nodeIntegration: true, contextIsolation: false, sandbox: false, webSecurity: false };
    expect(main.attachWebview(ok, prefs)).toBe(false);
    expect("preload" in prefs).toBe(false);
    expect(prefs).toMatchObject({ nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, plugins: false });
    expect(main.attachWebview({ partition: BROWSER_PARTITION, src: "" })).toBe(false);
    expect(main.attachWebview({ partition: "persist:saml-x", src: "https://a.com/" })).toBe(true);
    expect(main.attachWebview({ partition: BROWSER_PARTITION, src: "file:///C:/x.html" })).toBe(true);
    expect(main.attachWebview({ partition: BROWSER_PARTITION, src: "javascript:alert(1)" })).toBe(true);
    expect(main.attachWebview()).toBe(true);
    // Bölüm atlatma: webpreferences'taki başka bölüm reddediliyor.
    expect(main.attachWebview(ok, { partition: "persist:saml-x" })).toBe(true);
  });

  it("ana pencere dışı: flow sandbox (isMainWindow yanlışlıkla true dese de), SAML, başka pencere reddediliyor", () => {
    const { create, sandboxes, mains } = setup(prod, { browser: true });
    const sandbox = create({ getStoragePath: () => null });
    sandboxes.add(sandbox);
    mains.add(sandbox);
    expect(sandbox.attachWebview(ok)).toBe(true);
    const saml = create({ getStoragePath: () => "C:\\Users\\x\\AppData\\Roaming\\NTT Studio\\Partitions\\saml-uuid-1" });
    expect(saml.attachWebview(ok)).toBe(true);
    expect(create().attachWebview(ok)).toBe(true);
  });

  it("tarayıcı bağımlılığı yoksa ana pencere de reddediyor (eski davranış)", () => {
    const { create } = setup(prod);
    expect(create().attachWebview(ok)).toBe(true);
  });

  it("guest: uygulamanın 'yalnız kendi sayfası' kuralı uygulanmıyor, tarayıcı kuralı uygulanıyor; bağlantı sistem tarayıcısına gitmiyor", () => {
    const { create, openExternal, browserLog } = setup(prod, { browser: true });
    const g = create(guestSession, "guest");
    expect(g.navigate("will-navigate", "https://help.sap.com/docs")).toBe(false);
    expect(g.navigate("will-navigate", "http://localhost:5173/")).toBe(false);
    expect(g.navigate("will-navigate", "file:///C:/Users/x/evil.html")).toBe(true);
    expect(g.navigate("will-redirect", "data:text/html,x")).toBe(true);
    expect(g.openHandler!({ url: "https://a.com/yeni" })).toEqual({ action: "deny" });
    expect(g.loadURL).toHaveBeenCalledWith("https://a.com/yeni");
    expect(openExternal).not.toHaveBeenCalled();
    expect(g.attachWebview(ok)).toBe(true);
    expect(JSON.stringify(browserLog.mock.calls)).not.toContain("help.sap.com");
  });

  it("guest kısayolu ana pencereye, hangi sayfadan geldiğiyle iletiliyor", () => {
    const { create, onShortcut } = setup(prod, { browser: true });
    const g = create(guestSession, "guest");
    let prevented = false;
    g.emit("before-input-event", { preventDefault: () => (prevented = true) }, { type: "keyDown", key: "l", control: true, alt: false, shift: false, meta: false });
    expect(prevented).toBe(true);
    expect(onShortcut).toHaveBeenCalledWith(g, "focusAddress");
  });

  it("guest değilse (sıradan pencere) eski korumalar aynen", () => {
    const { create, openExternal } = setup(prod, { browser: true });
    const plain = create();
    expect(plain.navigate("will-navigate", "https://saldirgan.example/")).toBe(true);
    expect(plain.openHandler!({ url: "https://a.com/" })).toEqual({ action: "deny" });
    expect(openExternal).toHaveBeenCalledWith("https://a.com/");
  });
});

// --- Kaynak düzeyinde kilitler -------------------------------------------

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");

function cspOf(html: string): Map<string, string[]> {
  const match = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i);
  expect(match).not.toBeNull();
  const directives = new Map<string, string[]>();
  for (const part of match![1].split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives.set(name, sources);
  }
  return directives;
}

describe("ana pencere CSP'si (index.html)", () => {
  const html = read("index.html");
  const csp = cspOf(html);

  it("betik yalnızca paketin kendisinden; satır içi ve eval yok", () => {
    expect(csp.get("default-src")).toEqual(["'self'"]);
    expect(csp.get("script-src")).toEqual(["'self'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'none'"]);
    expect(csp.get("form-action")).toEqual(["'none'"]);
    expect(csp.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(csp.get("font-src")).toEqual(["'self'", "data:"]);
    expect(csp.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp.get("connect-src")).toEqual(["'self'", "http://localhost:*"]);
    expect(csp.get("frame-src")).toEqual(["http://localhost:*"]);
    const all = [...csp.values()].flat();
    expect(all).not.toContain("'unsafe-eval'");
    expect(all).not.toContain("*");
  });

  it("CSP, sayfadaki ilk betikten önce", () => {
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<script"));
  });

  it("geliştirme gevşetmesi yalnızca satır içi betik ve HMR websocket'i ekliyor", () => {
    const relaxed = cspOf(relaxCspForDev(html));
    expect(relaxed.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(relaxed.get("connect-src")).toEqual(["'self'", "http://localhost:*", "ws://localhost:*"]);
    for (const [name, sources] of csp) {
      if (name !== "script-src" && name !== "connect-src") expect(relaxed.get(name)).toEqual(sources);
    }
    // İki kez uygulamak aynı sonucu veriyor.
    expect(relaxCspForDev(relaxCspForDev(html))).toBe(relaxCspForDev(html));
  });

  it("geliştirme gevşetmesi yalnızca serve kipinde ve yalnızca index.html'e", () => {
    const config = read("electron.vite.config.ts");
    expect(config).toMatch(/name: "dev-content-security-policy",\s*apply: "serve"/);
    expect(config).toContain('basename(ctx.filename) === "index.html" ? relaxCspForDev(html) : html');
    expect(config).toContain("plugins: [react(), devContentSecurityPolicy()]");
  });
});

describe("ana pencere ayarları ve Node-RED iframe'i", () => {
  const indexTs = read("app-electron", "main", "index.ts");
  const config = read("electron.vite.config.ts");
  const live = read("src", "components", "AxetFlowsLiveHome.tsx");

  it("ana pencere sandbox'lı, preload CommonJS", () => {
    const createWindow = indexTs.slice(indexTs.indexOf("function createWindow()"), indexTs.indexOf("mainWindow = win;"));
    expect(createWindow).toContain('preload: path.join(__dirname, "../preload/index.cjs")');
    expect(createWindow).toMatch(/\n\s+sandbox: true,/);
    expect(createWindow).not.toMatch(/\n\s+sandbox: false/);
    expect(createWindow).toMatch(/contextIsolation: true,\s*nodeIntegration: false/);
    expect(config).toContain('output: { format: "cjs", entryFileNames: "[name].cjs" }');
  });

  it("pencere korumaları ilk pencereden önce kuruluyor", () => {
    const ready = indexTs.slice(indexTs.indexOf("app.whenReady().then("));
    const guards = ready.indexOf("installWindowGuards(");
    expect(guards).toBeGreaterThan(0);
    expect(guards).toBeLessThan(ready.indexOf("createWindow();"));
  });

  it("shell:openUrl şema kararını pencere korumalarıyla paylaşıyor", () => {
    const handler = indexTs.slice(indexTs.indexOf('ipcMain.handle("shell:openUrl"'));
    expect(handler.slice(0, 300)).toContain("if (!isExternalOpenAllowed(url))");
  });

  it("iframe sandbox'lı; popup ve üst pencere navigasyonu yok", () => {
    const match = live.match(/<iframe[\s\S]*?sandbox="([^"]*)"/);
    expect(match).not.toBeNull();
    const tokens = match![1].split(/\s+/);
    expect(tokens).toEqual(expect.arrayContaining(["allow-scripts", "allow-same-origin", "allow-forms", "allow-downloads"]));
    for (const forbidden of [
      "allow-popups",
      "allow-popups-to-escape-sandbox",
      "allow-top-navigation",
      "allow-top-navigation-by-user-activation",
      "allow-top-navigation-to-custom-protocols"
    ]) {
      expect(tokens).not.toContain(forbidden);
    }
  });
});
