// `createTerminal`'ın klasör seçeneği (spec §5.1). Terminal modu bölmeleri
// klasör yaratmıyor; varsayılan davranış (sohbet vb.) değişmedi.

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` dosyanın başına taşınıyor; fabrikanın kullandığı değişken de
// `vi.hoisted` ile oraya taşınmalı, yoksa "before initialization" hatası.
const { spawn } = vi.hoisted(() => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onExit: vi.fn(() => ({ dispose: vi.fn() })),
    write: vi.fn(),
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 1
  }))
}));

vi.mock("@lydell/node-pty", () => ({ spawn }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "t" }));
vi.mock("../app-electron/main/pythonSiteEnv", () => ({ withNttPythonSite: (env: unknown) => env }));

import { createTerminal, disposeAllTerminals } from "../app-electron/main/terminalManager";

const fakeWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } } as never;

let root = "";

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "term-"));
  spawn.mockClear();
});

afterEach(() => {
  disposeAllTerminals();
  rmSync(root, { recursive: true, force: true });
});

describe("createTerminal — klasör seçeneği", () => {
  it("createDir false ve klasör yoksa süreç açmıyor, false dönüyor", () => {
    const missing = path.join(root, "yok");
    expect(createTerminal(fakeWindow, "a", missing, 80, 24, "cmd", undefined, { createDir: false })).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
    expect(existsSync(missing)).toBe(false);
  });

  it("createDir false ve klasör boşsa false", () => {
    expect(createTerminal(fakeWindow, "b", "  ", 80, 24, "cmd", undefined, { createDir: false })).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("createDir false ve klasör varsa açıyor", () => {
    expect(createTerminal(fakeWindow, "c", root, 80, 24, "cmd", undefined, { createDir: false })).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("varsayılan davranış klasörü yaratıyor", () => {
    const fresh = path.join(root, "yeni", "alt");
    expect(createTerminal(fakeWindow, "d", fresh, 80, 24, "cmd")).toBe(true);
    expect(existsSync(fresh)).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});

// Tur 10 (ölçüldü): aynı boyutla resize ConPTY'de tam ekran yeniden çizim üretiyor;
// terminal ekranı her görünür olduğunda gönderiliyordu → ajan "çalışıyor"a dönüyordu.
describe("resizeTerminal — aynı boyut yeniden gönderilmiyor", () => {
  it("yalnız gerçek değişiklik pty'ye ve dinleyiciye gidiyor", async () => {
    const { resizeTerminal, setTerminalTap } = await import("../app-electron/main/terminalManager");
    const onResize = vi.fn();
    setTerminalTap({ onOutput: vi.fn(), onExit: vi.fn(), onResize });
    expect(createTerminal(fakeWindow, "r1", root, 80, 24, "cmd")).toBe(true);
    const proc = spawn.mock.results[0].value as { resize: ReturnType<typeof vi.fn> };
    resizeTerminal("r1", 120, 40);
    resizeTerminal("r1", 120, 40);
    resizeTerminal("r1", 120, 40);
    resizeTerminal("r1", 100, 40);
    expect(proc.resize.mock.calls).toEqual([[120, 40], [100, 40]]);
    expect(onResize.mock.calls).toEqual([["r1"], ["r1"]]);
    setTerminalTap(null);
  });
});
