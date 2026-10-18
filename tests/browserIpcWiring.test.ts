// Yerleşik tarayıcı: ana süreç bağlantısı ve güvenlik kilitleri — kaynak
// düzeyinde (bkz. changesIpcWiring.test.ts). Spec 2026-10-18 tarayici §4, §8.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");
const guard = read("app-electron", "main", "windowGuard.ts");
const browserGuard = read("app-electron", "main", "browserGuard.ts");
const live = read("app-electron", "main", "browserLive.ts");
const send = read("app-electron", "main", "browserSend.ts");
const files = read("app-electron", "main", "browserFiles.ts");
const sandbox = read("app-electron", "main", "flowSandbox.ts");
const saml = read("app-electron", "main", "samlLogin.ts");
const mainDirFiles = readdirSync(path.join(ROOT, "app-electron", "main")).filter((f) => f.endsWith(".ts"));

describe("Tarayıcı — webview kapısı (§4.1)", () => {
  it("webviewTag yalnız ana pencerede açık", () => {
    const createWindow = main.slice(main.indexOf("function createWindow()"), main.indexOf("mainWindow = win;"));
    expect(createWindow).toMatch(/\n\s+webviewTag: true,/);
    expect(main.match(/webviewTag:\s*true/g)).toHaveLength(1);
    for (const name of mainDirFiles.filter((f) => f !== "index.ts")) {
      expect(read("app-electron", "main", name), name).not.toMatch(/webviewTag:\s*true/);
    }
  });

  it("Flow sandbox ve SAML pencerelerinin webPreferences'ında webviewTag yok", () => {
    expect(sandbox).not.toContain("webviewTag");
    expect(saml).not.toContain("webviewTag");
  });

  it("Flow sandbox penceresi hâlâ bütün webview'ları reddediyor", () => {
    expect(sandbox).toContain('wc.on("will-attach-webview", (event) => event.preventDefault());');
  });

  it("windowGuard: takma yalnız sandbox değilse + ana pencereyse + allowWebviewAttach; izinde ayarlar zorlanıyor, değilse preventDefault", () => {
    expect(guard).toMatch(/"will-attach-webview"[\s\S]{0,700}!deps\.isFlowSandbox\(contents\)[\s\S]{0,200}browser\.isMainWindow\(contents\)[\s\S]{0,200}allowWebviewAttach\(/);
    expect(guard).toMatch(/if \(!allowed\) \{\s*event\.preventDefault\(\);\s*return;\s*\}\s*hardenWebviewPreferences\(/);
  });

  it("guest'e uygulamanın gezinme kuralı değil tarayıcı kuralı", () => {
    // Guest dalı (kural kurulamazsa kilit dahil) uygulamanın kurallarından
    // ÖNCE dönüyor. Aralık, Task 3 fix round 1'in kilit dalı yüzünden geniş.
    expect(guard).toMatch(/browser\.isGuest\(contents\)[\s\S]{0,300}installBrowserGuestRules\([\s\S]{0,1200}lockBrokenGuest\(contents\);[\s\S]{0,300}\n {6}return;\n {4}\}/);
    const guestReturn = guard.indexOf("\n      return;\n    }", guard.indexOf("installBrowserGuestRules(contents"));
    expect(guestReturn).toBeGreaterThan(0);
    expect(guestReturn).toBeLessThan(guard.indexOf("contents.setWindowOpenHandler(({ url })"));
  });
});

describe("Tarayıcı — izin, sertifika, yeni pencere (§4.3, §4.4, §6)", () => {
  it("guest yeni pencere açamıyor; izin ya da sertifika istisnası yok", () => {
    expect(browserGuard).toContain('return { action: "deny" };');
    expect(browserGuard).not.toContain('action: "allow"');
    for (const [name, src] of Object.entries({ browserGuard, live, send, files })) {
      expect(src, name).not.toMatch(/callback\(true\)/);
      expect(src, name).not.toContain("certificate-error");
      expect(src, name).not.toContain("setCertificateVerifyProc");
    }
    expect(main).not.toMatch(/app\.on\("certificate-error"/);
  });

  it("seçili metin yalnız izole dünyada okunuyor", () => {
    expect(live).toContain("executeJavaScriptInIsolatedWorld(");
    expect(live).not.toMatch(/executeJavaScript\(/);
  });

  it("tarayıcı oturumunda tek webRequest dinleyicisi: configureBrowserSession'ınki", () => {
    // Electron oturum başına TEK onBeforeRequest dinleyicisi tutuyor; ikincisi
    // birincisini (şema filtresini) sessizce ezerdi.
    expect(browserGuard.match(/\.onBeforeRequest\(/g)).toHaveLength(1);
    for (const [name, src] of Object.entries({ main, live, send, files, guard })) {
      expect(src, name).not.toContain("webRequest");
    }
    const withListener = mainDirFiles.filter((f) => /onBeforeRequest/.test(read("app-electron", "main", f))).sort();
    expect(withListener).toEqual(["browserGuard.ts", "flowSandbox.ts"]);
    // Flow sandbox'ın dinleyicisi kendi bölümünde.
    expect(sandbox).toContain("session.fromPartition(FLOW_SANDBOX_PARTITION)");
    expect(sandbox).not.toMatch(/BROWSER_PARTITION|browserSession|ntt-tarayici/);
  });
});

describe("Tarayıcı — index bağlantısı (§4.6)", () => {
  it("korumalara tarayıcı bağımlılığı; oturum ayarı ilk pencereden önce", () => {
    const ready = main.slice(main.indexOf("app.whenReady().then("));
    expect(ready).toMatch(
      /installWindowGuards\(\{[\s\S]{0,800}browser: \{[\s\S]{0,200}isMainWindow: \(contents\) => !!mainWindow && !mainWindow\.isDestroyed\(\) && contents === mainWindow\.webContents/
    );
    const configure = ready.indexOf("configureBrowserSession(");
    expect(configure).toBeGreaterThan(0);
    expect(configure).toBeLessThan(ready.indexOf("createWindow();"));
  });

  it("isGuest sözleşmesi: webview + tarayıcı oturumu + ana pencereye bağlı (host kimliği)", () => {
    const ready = main.slice(main.indexOf("app.whenReady().then("));
    const start = ready.indexOf("isGuest: (contents) =>");
    expect(start).toBeGreaterThan(0);
    const body = ready.slice(start, ready.indexOf("log: (tag, fields)", start));
    expect(body).toContain("!!mainWindow");
    expect(body).toContain("!mainWindow.isDestroyed()");
    expect(body).toContain("isBrowserGuestContents(contents, browserSession())");
    expect(body).toMatch(/contents\.hostWebContents\?\.id === mainWindow\.webContents\.id/);
    expect(body).not.toContain("||");
  });

  it("browser:send yalnız ana pencereden; hedef webview doğrulanıyor", () => {
    expect(main).toMatch(/"browser:send"[\s\S]{0,300}event\.sender !== mainWindow\.webContents/);
    expect(main).toMatch(/guest: \(id\) => liveBrowserGuest\(id,/);
    expect(live).toMatch(/isOurBrowserGuest\(wc, host, browserSession\(\)\)/);
    expect(main).toMatch(/workspace: \(id\) => browserWorkspace\(loadConfig\(\)\.terminalWorkspaces, id\)/);
    expect(main).toMatch(/sendPrompt: \(paneId, text, onSettled\) => agentMonitor\.sendPrompt\(paneId, text, onSettled\)/);
  });

  it("kanallar ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["browser:send", "browser:downloadBlocked", "browser:shortcut"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["browserSend:", "onBrowserDownloadBlocked:", "onBrowserShortcut:"]) {
      expect(types, name).toContain(name);
    }
  });

  it("günlükte yalnız iki etiket", () => {
    const tags = new Set([...[browserGuard, send, live, files].join("\n").matchAll(/log\("([^"]+)"/g)].map((m) => m[1]));
    expect([...tags].sort()).toEqual(["tarayici.gezinme", "tarayici.gonder"]);
  });
});
