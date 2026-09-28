// Flow sandbox — kaynak düzeyinde kilitler. Electron'u açmadan sınanamayan
// ayarlar (pencere seçenekleri, oturum filtresi, CSP, paketleme) burada
// metin olarak kilitleniyor: bir yeniden yazım bunlardan birini sessizce
// gevşetirse test kırılsın. Davranış flowSandboxHost/ipcSenderGuard
// testlerinde ölçülüyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
// Yorumlar açıklamada eski durumu anlatıyor (ör. "`node:vm` ile"); kontroller
// yalnızca koda bakmalı.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const runtime = code(read("app-electron", "main", "flowRuntime.js"));
const sandboxMain = read("app-electron", "main", "flowSandbox.ts");
const html = read("flow-sandbox.html");
const viteConfig = read("electron.vite.config.ts");
const indexTs = read("app-electron", "main", "index.ts");
const preloadSrc = read("app-electron", "preload", "flowSandbox.cjs");

describe("flowRuntime.js — ana süreçte kullanıcı kodu ve xlsx yok", () => {
  it("vm, xlsx, xlsx-populate, createRequire ve process.env kullanılmıyor", () => {
    expect(runtime).not.toMatch(/node:vm|from ["']vm["']|require\(["']vm["']\)/);
    expect(runtime).not.toMatch(/["']xlsx["']|["']xlsx-populate["']/);
    expect(runtime).not.toContain("createRequire");
    expect(runtime).not.toMatch(/process\.env/);
    expect(runtime).not.toMatch(/new Function|\beval\(/);
  });

  it("function ve excel node'ları sandbox'a gidiyor, stop sandbox'ı sıfırlıyor", () => {
    expect(runtime).toContain("this._requireSandbox().runFunction(");
    expect(runtime).toContain("this._requireSandbox().xlsxWrite(");
    expect(runtime).toContain("this._requireSandbox().xlsxRead(");
    expect(runtime).toMatch(/async stop\(\) \{[\s\S]*?this\.sandbox\.reset\(/);
  });
});

describe("flowSandbox.ts — pencere ve oturum ayarları", () => {
  it("webPreferences sandbox'lı ve Node'suz", () => {
    for (const line of [
      "sandbox: true,",
      "contextIsolation: true,",
      "nodeIntegration: false,",
      "nodeIntegrationInWorker: false,",
      "nodeIntegrationInSubFrames: false,",
      "webSecurity: true,",
      "partition: FLOW_SANDBOX_PARTITION,",
      "devTools: false,",
      "show: false,"
    ]) {
      expect(sandboxMain).toContain(line);
    }
    expect(sandboxMain).toContain('export const FLOW_SANDBOX_PARTITION = "flow-sandbox";');
    expect(code(sandboxMain)).not.toContain("persist:");
    // Sandbox penceresi ana pencerenin preload'unu (bütün IPC yüzeyi) almamalı.
    expect(sandboxMain).toContain('"../preload/flowSandbox.cjs"');
    expect(sandboxMain).not.toMatch(/preload\/index\.(mjs|js|cjs)/);
  });

  it("ağ filtresi, izinler, gezinme ve yeni pencere kapalı", () => {
    expect(sandboxMain).toMatch(/onBeforeRequest\([\s\S]*?cancel: !isAllowedSandboxUrl\(/);
    expect(sandboxMain).toContain("setPermissionRequestHandler((_wc, _permission, callback) => callback(false))");
    expect(sandboxMain).toContain("setPermissionCheckHandler(() => false)");
    expect(sandboxMain).toContain("setDevicePermissionHandler(() => false)");
    expect(sandboxMain).toContain('setWindowOpenHandler(() => ({ action: "deny" }))');
    for (const ev of ["will-navigate", "will-redirect", "will-frame-navigate", "will-attach-webview", "will-download"]) {
      expect(sandboxMain).toMatch(new RegExp(`on\\("${ev}", \\(event\\) => event\\.preventDefault\\(\\)\\)`));
    }
    expect(sandboxMain).toContain('setWebRTCIPHandlingPolicy("disable_non_proxied_udp")');
  });

  it("sandbox kanalları yalnızca kendi webContents'inden kabul ediliyor", () => {
    expect(sandboxMain).toContain("const fromPage = (event: { sender: WebContents }) => event.sender === wc;");
    const listeners = sandboxMain.match(/wc\.ipc\.on\("flow-sandbox:[a-z]+"/g) ?? [];
    expect(listeners).toHaveLength(4);
    expect(sandboxMain).not.toMatch(/ipcMain\.(on|handle)\("flow-sandbox/);
  });

  it("index.ts ipcMain bekçisini IPC kayıtlarından önce kuruyor", () => {
    const guard = indexTs.indexOf("installIpcSenderGuard(ipcMain,");
    const register = indexTs.indexOf("registerIpc();", guard);
    expect(guard).toBeGreaterThan(0);
    expect(register).toBeGreaterThan(guard);
    // Bekçinin kararı flow sandbox göndericisini hâlâ içeriyor (çerçeve/URL
    // denetimi onun üstüne eklendi, bkz. isMainWindowSenderUntrusted).
    expect(indexTs.slice(guard, register)).toMatch(/isMainWindowSenderUntrusted\(event, \{ isFlowSandboxSender,/);
    expect(indexTs).toContain("sandbox: flowSandbox");
  });
});

describe("flow-sandbox.html ve paketleme", () => {
  it("CSP ağı kapatıyor, yalnızca kendi betiği + eval", () => {
    expect(html).toContain(
      `content="default-src 'none'; script-src 'self' 'unsafe-eval'; form-action 'none'; base-uri 'none'"`
    );
    // Satır içi betik yok (yalnızca src'li modül).
    expect(html.match(/<script\b[^>]*>/g)).toEqual(['<script type="module" src="/src/flowSandbox/main.ts">']);
  });

  it("vite sayfayı ve preload'u pakete alıyor", () => {
    expect(viteConfig).toContain('flowSandbox: "flow-sandbox.html"');
    expect(viteConfig).toContain('resolve("app-electron/preload/flowSandbox.cjs")');
    expect(viteConfig).toContain('fileName: "flowSandbox.cjs"');
    expect(viteConfig).toMatch(/plugins: \[externalizeDepsPlugin\(\), copyFlowSandboxPreload\(\)\]/);
  });
});

describe("preload (flowSandbox.cjs) — dar köprü", () => {
  function loadPreload() {
    const exposed: Record<string, unknown> = {};
    const listeners: Record<string, (...args: unknown[]) => void> = {};
    const ipcRenderer = {
      on: vi.fn((channel: string, fn: (...args: unknown[]) => void) => {
        listeners[channel] = fn;
      }),
      send: vi.fn(),
      sendSync: vi.fn(() => ({ ok: true, value: 1 }))
    };
    const electron = {
      contextBridge: { exposeInMainWorld: (name: string, api: unknown) => (exposed[name] = api) },
      ipcRenderer
    };
    const fakeRequire = (id: string) => {
      if (id !== "electron") throw new Error(`sandbox preload yalnızca electron'u yükleyebilir: ${id}`);
      return electron;
    };
    new Function("require", preloadSrc)(fakeRequire);
    return { exposed, listeners, ipcRenderer };
  }

  it("yalnızca `take` açılıyor ve köprü bir kez alınabiliyor", () => {
    const { exposed } = loadPreload();
    expect(Object.keys(exposed)).toEqual(["flowSandbox"]);
    const holder = exposed.flowSandbox as { take(): Record<string, unknown> | null };
    expect(Object.keys(holder)).toEqual(["take"]);
    const api = holder.take();
    expect(api && Object.keys(api).sort()).toEqual(
      ["contextGet", "contextKeys", "contextSet", "done", "log", "onRun", "ready"].sort()
    );
    expect(holder.take()).toBeNull();
  });

  it("kanallar sabit, onRun ikinci kaydı reddediyor", () => {
    const { exposed, listeners, ipcRenderer } = loadPreload();
    type Api = {
      contextGet(t: string, s: string, k: string): unknown;
      contextSet(t: string, s: string, k: string, v: unknown): unknown;
      contextKeys(t: string, s: string): unknown;
      log(t: string, l: string, x: string): void;
      done(r: unknown): void;
      ready(): void;
      onRun(h: unknown): boolean;
    };
    const api = (exposed.flowSandbox as { take(): Api }).take();
    api.contextGet("t", "node", "k");
    api.contextSet("t", "flow", "k", 5);
    api.contextKeys("t", "global");
    api.log("t", "info", "x");
    api.done({ runId: "r" });
    api.ready();
    expect(ipcRenderer.sendSync.mock.calls).toEqual([
      ["flow-sandbox:context", "get", "t", "node", "k"],
      ["flow-sandbox:context", "set", "t", "flow", "k", 5],
      ["flow-sandbox:context", "keys", "t", "global"]
    ]);
    expect(ipcRenderer.send.mock.calls.map((c) => c[0])).toEqual([
      "flow-sandbox:log",
      "flow-sandbox:done",
      "flow-sandbox:ready"
    ]);

    const first = vi.fn();
    const second = vi.fn();
    expect(api.onRun("fonksiyon degil")).toBe(false);
    expect(api.onRun(first)).toBe(true);
    expect(api.onRun(second)).toBe(false);
    listeners["flow-sandbox:run"]({}, { runId: "r1" });
    expect(first).toHaveBeenCalledWith({ runId: "r1" });
    expect(second).not.toHaveBeenCalled();
    expect(Object.keys(listeners)).toEqual(["flow-sandbox:run"]);
  });
});
