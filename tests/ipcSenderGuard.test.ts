import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { IpcMain, WebContents } from "electron";
import { installIpcSenderGuard, isMainWindowSenderUntrusted } from "../app-electron/main/ipcSenderGuard";

// ipcMain'in taklidi: on/once/removeListener için gerçek EventEmitter,
// handle için kanal → işleyici haritası (Electron'daki gibi tek işleyici).
class FakeIpcMain extends EventEmitter {
  handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) {
    this.handlers.set(channel, listener);
  }
  handleOnce(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) {
    this.handlers.set(channel, listener);
  }
  invoke(channel: string, event: unknown, ...args: unknown[]) {
    const h = this.handlers.get(channel);
    if (!h) throw new Error(`no handler: ${channel}`);
    return h(event, ...args);
  }
}

const trusted = { id: 1 } as unknown as WebContents;
const sandbox = { id: 2 } as unknown as WebContents;

function setup() {
  const ipc = new FakeIpcMain();
  installIpcSenderGuard(ipc as unknown as IpcMain, (event) => event?.sender === sandbox);
  return ipc;
}

describe("installIpcSenderGuard", () => {
  it("handle: ana pencereden gelen çağrı geçiyor, sandbox'tan gelen reddediliyor", async () => {
    const ipc = setup();
    const fn = vi.fn(() => "tamam");
    ipc.handle("fs:read", fn);
    expect(ipc.invoke("fs:read", { sender: trusted }, "a")).toBe("tamam");
    expect(fn).toHaveBeenCalledWith({ sender: trusted }, "a");
    expect(() => ipc.invoke("fs:read", { sender: sandbox }, "a")).toThrow("IPC reddedildi: fs:read");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("handleOnce da sarılıyor", () => {
    const ipc = setup();
    const fn = vi.fn();
    ipc.handleOnce("x", fn);
    expect(() => ipc.invoke("x", { sender: sandbox })).toThrow(/IPC reddedildi/);
    expect(fn).not.toHaveBeenCalled();
  });

  it("on: sandbox mesajı düşürülüyor ve sendSync askıda kalmasın diye returnValue null", () => {
    const ipc = setup();
    const fn = vi.fn((event: { returnValue?: unknown }) => {
      event.returnValue = "gercek";
    });
    ipc.on("sync:kanal", fn);
    const bad: { sender: WebContents; returnValue?: unknown } = { sender: sandbox };
    ipc.emit("sync:kanal", bad, 1);
    expect(fn).not.toHaveBeenCalled();
    expect(bad.returnValue).toBeNull();
    const good: { sender: WebContents; returnValue?: unknown } = { sender: trusted };
    ipc.emit("sync:kanal", good, 1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(good.returnValue).toBe("gercek");
  });

  it("once/addListener/prepend* de korunuyor", () => {
    const ipc = setup();
    const fns = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    ipc.once("k", fns[0]);
    ipc.addListener("k", fns[1]);
    ipc.prependListener("k", fns[2]);
    ipc.prependOnceListener("k", fns[3]);
    ipc.emit("k", { sender: sandbox });
    for (const fn of fns) expect(fn).not.toHaveBeenCalled();
    ipc.emit("k", { sender: trusted });
    for (const fn of fns) expect(fn).toHaveBeenCalledTimes(1);
  });

  it("removeListener/off özgün dinleyiciyle çalışmaya devam ediyor", () => {
    const ipc = setup();
    const a = vi.fn();
    const b = vi.fn();
    ipc.on("k", a);
    ipc.on("k", b);
    ipc.removeListener("k", a);
    ipc.off("k", b);
    ipc.emit("k", { sender: trusted });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(ipc.listenerCount("k")).toBe(0);
  });

  it("zincirleme çağrı (ipcMain.on(...).on(...)) bozulmuyor ve iki kez kurmak iki kez sarmıyor", () => {
    const ipc = new FakeIpcMain();
    const isUntrusted = vi.fn((event: { sender?: unknown } | null | undefined) => event?.sender === sandbox);
    installIpcSenderGuard(ipc as unknown as IpcMain, isUntrusted);
    installIpcSenderGuard(ipc as unknown as IpcMain, isUntrusted);
    const fn = vi.fn();
    expect(ipc.on("k", fn)).toBe(ipc);
    ipc.emit("k", { sender: trusted });
    expect(isUntrusted).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("isMainWindowSenderUntrusted", () => {
  const appUrl = "file:///C:/app/resources/app.asar/dist/index.html";
  const policy = {
    isFlowSandboxSender: (sender: WebContents | null | undefined) => sender === sandbox,
    isAppUrl: (url: string) => url === appUrl
  };
  const mainFrame = (url: string) => ({ url, parent: null });

  it("uygulama sayfasındaki ana çerçeve güvenilir", () => {
    expect(isMainWindowSenderUntrusted({ sender: trusted, senderFrame: mainFrame(appUrl) }, policy)).toBe(false);
  });

  it("ana pencere yabancı bir sayfaya götürülmüşse reddediliyor", () => {
    expect(isMainWindowSenderUntrusted({ sender: trusted, senderFrame: mainFrame("https://saldirgan.example/") }, policy)).toBe(true);
  });

  it("alt çerçeveden (iframe) gelen mesaj reddediliyor, URL uygulamanınki olsa bile", () => {
    expect(isMainWindowSenderUntrusted({ sender: trusted, senderFrame: { url: appUrl, parent: {} } }, policy)).toBe(true);
  });

  it("flow sandbox'ı, çerçevesi olmayan ve çerçevesi okunamayan gönderen reddediliyor", () => {
    expect(isMainWindowSenderUntrusted({ sender: sandbox, senderFrame: mainFrame(appUrl) }, policy)).toBe(true);
    expect(isMainWindowSenderUntrusted({ sender: trusted, senderFrame: null }, policy)).toBe(true);
    expect(isMainWindowSenderUntrusted({ sender: null, senderFrame: mainFrame(appUrl) }, policy)).toBe(true);
    expect(isMainWindowSenderUntrusted(undefined, policy)).toBe(true);
    const disposed = {
      parent: null,
      get url(): string {
        throw new Error("Render frame was disposed");
      }
    };
    expect(isMainWindowSenderUntrusted({ sender: trusted, senderFrame: disposed }, policy)).toBe(true);
  });

  it("bekçiyle birlikte: yabancı sayfadan gelen invoke reddediliyor", () => {
    const ipc = new FakeIpcMain();
    installIpcSenderGuard(ipc as unknown as IpcMain, (event) => isMainWindowSenderUntrusted(event, policy));
    const fn = vi.fn(() => "parola");
    ipc.handle("credentials:getDefaults", fn);
    expect(ipc.invoke("credentials:getDefaults", { sender: trusted, senderFrame: mainFrame(appUrl) })).toBe("parola");
    expect(() =>
      ipc.invoke("credentials:getDefaults", { sender: trusted, senderFrame: mainFrame("https://saldirgan.example/") })
    ).toThrow(/IPC reddedildi/);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
