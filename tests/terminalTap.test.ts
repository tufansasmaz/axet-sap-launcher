// Ajan izleyicisinin terminal dinleyicisi (spec 2026-10-17 ajan-alani §6).
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    data: null as null | ((d: string) => void),
    exit: null as null | ((e: { exitCode: number }) => void),
    write: vi.fn()
  };
  const spawn = vi.fn(() => ({
    onData: (cb: (d: string) => void) => {
      state.data = cb;
      return { dispose: vi.fn() };
    },
    onExit: (cb: (e: { exitCode: number }) => void) => {
      state.exit = cb;
      return { dispose: vi.fn() };
    },
    write: state.write,
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 1
  }));
  return { state, spawn };
});

vi.mock("@lydell/node-pty", () => ({ spawn: h.spawn }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "t" }));
vi.mock("../app-electron/main/pythonSiteEnv", () => ({ withNttPythonSite: (env: unknown) => env }));
vi.mock("../app-electron/main/appLog", () => ({ appLog: vi.fn() }));

import { createTerminal, disposeAllTerminals, setTerminalTap, writeTerminal } from "../app-electron/main/terminalManager";

const send = vi.fn();
const fakeWindow = { isDestroyed: () => false, webContents: { send } } as never;

beforeEach(() => {
  send.mockClear();
  h.state.write.mockClear();
  createTerminal(fakeWindow, "p1", tmpdir(), 80, 24, "cmd", undefined, { createDir: false });
});

afterEach(() => {
  setTerminalTap(null);
  disposeAllTerminals();
});

describe("setTerminalTap", () => {
  it("çıktı ve çıkış dinleyiciye gidiyor; renderer akışı sürüyor", () => {
    const tap = { onOutput: vi.fn(), onExit: vi.fn() };
    setTerminalTap(tap);
    h.state.data?.("merhaba");
    h.state.exit?.({ exitCode: 0 });
    expect(tap.onOutput).toHaveBeenCalledWith("p1", "merhaba");
    expect(tap.onExit).toHaveBeenCalledWith("p1");
    expect(send).toHaveBeenCalledWith("terminal:data", "p1", "merhaba");
  });

  it("dinleyici hata fırlatsa da terminal akışı sürüyor", () => {
    setTerminalTap({
      onOutput: () => {
        throw new Error("izleyici");
      },
      onExit: () => {
        throw new Error("izleyici");
      }
    });
    expect(() => h.state.data?.("x")).not.toThrow();
    expect(send).toHaveBeenCalledWith("terminal:data", "p1", "x");
    expect(() => h.state.exit?.({ exitCode: 1 })).not.toThrow();
  });

  it("writeTerminal: bilinen bölmeye yazıp true, bilinmeyene false", () => {
    expect(writeTerminal("p1", "a")).toBe(true);
    expect(h.state.write).toHaveBeenCalledWith("a");
    expect(writeTerminal("yok", "a")).toBe(false);
  });
});
