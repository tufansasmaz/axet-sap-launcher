// Kayma teşhisi (spec §5): kabuğa bildirilen her GERÇEK boyut değişikliği
// günlüğe düşüyor; aynı boyut tekrarı ve saniyede 4'ten fazlası düşmüyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { spawn, appLog } = vi.hoisted(() => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onExit: vi.fn(() => ({ dispose: vi.fn() })),
    write: vi.fn(),
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 1
  })),
  appLog: vi.fn()
}));

vi.mock("@lydell/node-pty", () => ({ spawn }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "t" }));
vi.mock("../app-electron/main/pythonSiteEnv", () => ({ withNttPythonSite: (env: unknown) => env }));
vi.mock("../app-electron/main/appLog", () => ({ appLog }));

import { createTerminal, disposeAllTerminals, resizeTerminal } from "../app-electron/main/terminalManager";

const fakeWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } } as never;

beforeEach(() => {
  appLog.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  disposeAllTerminals();
  vi.useRealTimers();
});

let seq = 0;
function open(): string {
  const id = `pty-${++seq}-abcdefgh`;
  expect(createTerminal(fakeWindow, id, process.cwd(), 120, 30, "cmd", undefined, { createDir: false })).toBe(true);
  return id;
}

describe("terminal.boyut", () => {
  it("yalnız boyut değişince yazılıyor, içerik yok", () => {
    const id = open();
    resizeTerminal(id, 100, 40);
    resizeTerminal(id, 100, 40);
    resizeTerminal(id, 90, 40);
    const calls = appLog.mock.calls.filter(([tag]) => tag === "terminal.boyut");
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toEqual({ bolme: id.slice(0, 8), sutun: 100, satir: 40 });
    expect(calls[1][1]).toEqual({ bolme: id.slice(0, 8), sutun: 90, satir: 40 });
  });

  it("bölme başına saniyede en fazla 4 satır; bir saniye sonra yeniden yazılıyor", () => {
    const id = open();
    for (let c = 50; c < 60; c++) resizeTerminal(id, c, 20);
    expect(appLog.mock.calls.filter(([tag]) => tag === "terminal.boyut")).toHaveLength(4);
    vi.advanceTimersByTime(1001);
    resizeTerminal(id, 70, 20);
    expect(appLog.mock.calls.filter(([tag]) => tag === "terminal.boyut")).toHaveLength(5);
  });

  it("geçersiz boyut ne kabuğa ne günlüğe gidiyor", () => {
    const id = open();
    resizeTerminal(id, 0, 20);
    expect(appLog).not.toHaveBeenCalled();
  });
});
