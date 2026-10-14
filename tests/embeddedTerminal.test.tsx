// @vitest-environment jsdom
// EmbeddedTerminal: yazı boyutu ve kabuğa boyut bildirimi (spec 2026-10-14 §4, §5).
// xterm sahte: gerçek tuval jsdom'da çizilmiyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import EmbeddedTerminal from "../src/components/EmbeddedTerminal";

interface FakeTerm {
  options: Record<string, unknown>;
  cols: number;
  rows: number;
  refresh: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
}
const fake = vi.hoisted(() => ({ terms: [] as FakeTerm[], fits: [] as Array<{ fit: ReturnType<typeof vi.fn> }> }));

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options: Record<string, unknown>;
    cols = 100;
    rows = 30;
    refresh = vi.fn();
    focus = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = { ...options };
      fake.terms.push(this as unknown as FakeTerm);
    }
    loadAddon() {}
    open() {}
    onData() {
      return { dispose() {} };
    }
    attachCustomKeyEventHandler() {}
    write() {}
    paste() {}
    dispose() {}
  }
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit = vi.fn();
    constructor() {
      fake.fits.push(this);
    }
  }
}));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

let observers: Array<() => void>;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let prevRO: unknown;

beforeEach(() => {
  vi.useFakeTimers();
  fake.terms.length = 0;
  fake.fits.length = 0;
  observers = [];
  prevRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    constructor(cb: () => void) {
      observers.push(cb);
    }
    observe() {}
    disconnect() {}
  };
  // jsdom'da kutular 0×0; safeFit 0 boyutta çalışmıyor.
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 400 });
  api = {
    writeTerminal: vi.fn(),
    onTerminalData: vi.fn(() => () => {}),
    onTerminalExit: vi.fn(() => () => {}),
    getTerminalBuffer: vi.fn(() => Promise.resolve("")),
    resizeTerminal: vi.fn(),
    getPathForFile: vi.fn()
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  (window as unknown as { api: unknown }).api = prevApi;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = prevRO;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});

function view(props: { active?: boolean; fontSize?: number }) {
  return (
    <LanguageProvider language="tr">
      <EmbeddedTerminal sessionId="s1" active={props.active ?? false} fontSize={props.fontSize} />
    </LanguageProvider>
  );
}

describe("EmbeddedTerminal yazı boyutu", () => {
  it("verilmezse 13, verilirse o boyutla kuruluyor", () => {
    render(view({}));
    expect(fake.terms[0].options.fontSize).toBe(13);
    cleanup();
    render(view({ fontSize: 16 }));
    expect(fake.terms[1].options.fontSize).toBe(16);
  });

  it("boyut değişince yeniden kurmadan uyguluyor, yeniden ölçüp kabuğa bildiriyor", () => {
    const r = render(view({ fontSize: 13 }));
    const fitsBefore = fake.fits[0].fit.mock.calls.length;
    r.rerender(view({ fontSize: 18 }));
    expect(fake.terms).toHaveLength(1);
    expect(fake.terms[0].options.fontSize).toBe(18);
    expect(fake.fits[0].fit.mock.calls.length).toBeGreaterThan(fitsBefore);
    act(() => {
      vi.runAllTimers();
    });
    expect(api.resizeTerminal).toHaveBeenCalledWith("s1", 100, 30);
  });
});
