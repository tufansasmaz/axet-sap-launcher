// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalPaneView from "../src/terminal/TerminalPaneView";
import { TerminalStoreContext, type TerminalCommands } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalPane } from "../src/stores/terminalTypes";
import type { TerminalPaneColor, TerminalPaneKind } from "../app-electron/shared/types";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active }: { sessionId: string; active: boolean }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />
  )
}));

let prevApi: unknown;
let pick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function commandsMock(): TerminalCommands {
  return {
    restore: vi.fn(),
    startFresh: vi.fn(),
    addWorkspace: vi.fn(),
    selectWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    addPane: vi.fn(),
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn(),
    movePane: vi.fn(),
    resizeSplit: vi.fn(),
    equalizeSplit: vi.fn(),
    minimizePane: vi.fn(),
    restorePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    setPaneFontSize: vi.fn()
  };
}

function renderPane(
  run: PaneRun,
  opts: {
    kind?: TerminalPaneKind;
    cwd?: string;
    active?: boolean;
    canMaximize?: boolean;
    maximized?: boolean;
    title?: string;
    color?: TerminalPaneColor;
    onDragStart?: () => void;
    onSplit?: (dir: "row" | "column") => void;
    canSplit?: boolean;
  } = {}
) {
  const commands = commandsMock();
  const pane: TerminalPane = { id: "p1", kind: opts.kind ?? "cmd", cwd: opts.cwd ?? "C:\\a", run, title: opts.title, color: opts.color };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider
        value={{ state: initialTerminalState, commands, defaultKind: "cmd", defaultCwd: "C:\\a" }}
      >
        <TerminalPaneView
          pane={pane}
          active={opts.active ?? false}
          canMaximize={opts.canMaximize ?? true}
          maximized={opts.maximized ?? false}
          onDragStart={opts.onDragStart}
          onSplit={opts.onSplit}
          canSplit={opts.canSplit}
        />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("TerminalPaneView", () => {
  it("çalışan bölme xterm'i gösteriyor; odak yalnız active iken", () => {
    renderPane({ state: "running", ptyId: "t1" }, { active: true });
    expect(screen.getByTestId("xterm-t1").getAttribute("data-active")).toBe("true");
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { active: false });
    expect(screen.getByTestId("xterm-t1").getAttribute("data-active")).toBe("false");
  });

  it("başlık: tür büyük harf, uzun klasör ortadan kısalıyor, tam yol title'da", () => {
    const cwd = "C:\\Users\\kullanici\\projeler\\cok-uzun-bir-klasor-adi\\alt\\son-klasor";
    renderPane({ state: "running", ptyId: "t1" }, { kind: "powershell", cwd });
    expect(screen.getByText("PowerShell").className).toContain("uppercase");
    const label = screen.getByTitle(cwd);
    expect(label.textContent).toContain("…");
    expect(label.textContent!.endsWith("son-klasor")).toBe(true);
  });

  it("nokta paneTone'a göre", () => {
    renderPane({ state: "running", ptyId: "t1" });
    expect(document.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("running");
    cleanup();
    renderPane({ state: "exited", ptyId: "t1", code: 2 });
    expect(document.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("error");
  });

  it("kapanan süreç: xterm kalıyor, altta kod ve ↻ ipucu", () => {
    renderPane({ state: "exited", ptyId: "t1", code: 3 });
    expect(screen.getByTestId("xterm-t1")).toBeTruthy();
    expect(screen.getByText("Süreç kapandı (kod 3) — yeniden başlatmak için ↻")).toBeTruthy();
  });

  it("sırada ve başlatılıyor metinleri", () => {
    renderPane({ state: "queued" });
    expect(screen.getByText("Sırada…")).toBeTruthy();
    cleanup();
    renderPane({ state: "starting", token: 1 });
    expect(screen.getByText("Başlatılıyor…")).toBeTruthy();
  });

  it("başlatılamadı: ileti ve yeniden başlat", () => {
    const c = renderPane({ state: "failed", message: "spawn EPERM" });
    expect(screen.getByText("Başlatılamadı: spawn EPERM")).toBeTruthy();
    const restarts = screen.getAllByTitle("Yeniden başlat");
    fireEvent.click(restarts[restarts.length - 1]);
    expect(c.restartPane).toHaveBeenCalledWith("p1");
  });

  it("klasör yok: Klasör seç yeni yolla yeniden başlatıyor, iptal hiçbir şey yapmıyor", async () => {
    const c = renderPane({ state: "missingDir" }, { cwd: "C:\\yok" });
    expect(screen.getByText("Klasör bulunamadı: C:\\yok")).toBeTruthy();
    pick.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole("button", { name: "Klasör seç" }));
    await flush();
    expect(c.restartPane).not.toHaveBeenCalled();
    pick.mockResolvedValueOnce("C:\\b");
    fireEvent.click(screen.getByRole("button", { name: "Klasör seç" }));
    await flush();
    expect(c.restartPane).toHaveBeenCalledWith("p1", "C:\\b");
  });

  it("klasör yok: Kaldır bölmeyi kapatıyor", () => {
    const c = renderPane({ state: "missingDir" });
    fireEvent.click(screen.getByRole("button", { name: "Kaldır" }));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });

  it("büyüt düğmesi yalnız canMaximize iken; büyütülmüşken Küçült", () => {
    const c = renderPane({ state: "running", ptyId: "t1" }, { canMaximize: true });
    fireEvent.click(screen.getByTitle("Büyüt"));
    expect(c.toggleMaximize).toHaveBeenCalledWith("p1");
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { maximized: true });
    expect(screen.getByTitle("Küçült")).toBeTruthy();
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { canMaximize: false });
    expect(screen.queryByTitle("Büyüt")).toBeNull();
  });

  it("bölmeye basınca odak komutu gidiyor", () => {
    const c = renderPane({ state: "running", ptyId: "t1" });
    fireEvent.mouseDown(screen.getByTestId("xterm-t1"));
    expect(c.focusPane).toHaveBeenCalledWith("p1");
  });

  it("axet bölmesinin başlığı ürün adını gösteriyor", () => {
    renderPane({ state: "running", ptyId: "t1" }, { kind: "axet" });
    expect(screen.getByText("axet-code").className).toContain("uppercase");
  });

  it("cmd bölmesi sormadan kapanıyor", () => {
    const c = renderPane({ state: "running", ptyId: "t1" }, { kind: "cmd" });
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });

  it("çalışan axet bölmesi önce soruyor", () => {
    const c = renderPane({ state: "running", ptyId: "t1" }, { kind: "axet" });
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(c.closePane).not.toHaveBeenCalled();
    expect(screen.getByText("Çalışan axet-code oturumu sonlanacak.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Oturumu kapat" }));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });

  it("kapanmış axet bölmesi sormadan kapanıyor", () => {
    const c = renderPane({ state: "exited", ptyId: "t1", code: 0 }, { kind: "axet" });
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });
});

describe("sürükleme tutamağı (spec 2026-10-14 §3.4)", () => {
  it("başlıktan tutunca sürükleme başlıyor, düğmeden tutunca başlamıyor", () => {
    const onDragStart = vi.fn();
    renderPane({ state: "running", ptyId: "t1" }, { onDragStart, canMaximize: true });
    fireEvent.pointerDown(screen.getByText("cmd"), { button: 0 });
    expect(onDragStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Büyüt" }), { button: 0 });
    expect(onDragStart).toHaveBeenCalledTimes(1);
  });
});

describe("başlık: ad, renk, böl, şeride indir (spec 2026-10-14 §4)", () => {
  it("ad yoksa tür; çift tık düzenliyor, Enter kaydediyor", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" });
    fireEvent.doubleClick(screen.getByText("cmd"));
    const input = screen.getByRole("textbox", { name: "Bölme adı" }) as HTMLInputElement;
    expect(input.maxLength).toBe(40);
    fireEvent.change(input, { target: { value: "derleme" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(commands.renamePane).toHaveBeenCalledWith("p1", "derleme");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("Esc vazgeçiyor", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" }, { title: "derleme" });
    fireEvent.doubleClick(screen.getByText("derleme"));
    const input = screen.getByRole("textbox", { name: "Bölme adı" });
    fireEvent.change(input, { target: { value: "başka" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(commands.renamePane).not.toHaveBeenCalled();
    expect(screen.getByText("derleme")).toBeTruthy();
  });

  it("renk seçici altı renk; seçince komut, başlıkta şerit", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" }, { color: "blue" });
    const header = screen.getByText("cmd").closest("[data-pane-header]") as HTMLElement;
    expect(header.style.boxShadow).toContain("var(--status-info-text)");
    fireEvent.click(screen.getByRole("button", { name: "Renk" }));
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(6);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Mor" }));
    expect(commands.setPaneColor).toHaveBeenCalledWith("p1", "violet");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("böl düğmeleri yönü veriyor; sınırda kapalı", () => {
    const onSplit = vi.fn();
    renderPane({ state: "running", ptyId: "t1" }, { onSplit });
    fireEvent.click(screen.getByRole("button", { name: "Sağa böl" }));
    fireEvent.click(screen.getByRole("button", { name: "Alta böl" }));
    expect(onSplit.mock.calls).toEqual([["row"], ["column"]]);
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { onSplit, canSplit: false });
    const right = screen.getByRole("button", { name: "Sağa böl" }) as HTMLButtonElement;
    expect(right.disabled).toBe(true);
    expect(right.title).toBe("En fazla 9 bölme");
  });

  it("şeride indir", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" });
    fireEvent.click(screen.getByRole("button", { name: "Şeride indir" }));
    expect(commands.minimizePane).toHaveBeenCalledWith("p1");
  });
});
