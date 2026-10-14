// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalMode from "../src/terminal/TerminalMode";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { LayoutNode } from "../app-electron/shared/terminalTree";

// Taşımada xterm'in yeniden kurulmadığını saymak için (spec §6.2).
const mounts = vi.hoisted(() => ({ count: 0 }));
vi.mock("../src/components/EmbeddedTerminal", async () => {
  const { useEffect } = await vi.importActual<typeof import("react")>("react");
  return {
    default: function FakeTerminal({ sessionId, active }: { sessionId: string; active: boolean }) {
      useEffect(() => {
        mounts.count += 1;
      }, []);
      return <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />;
    }
  };
});

const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const split = (dir: "row" | "column", ids: string[], sizes?: number[]): LayoutNode => ({
  type: "split",
  dir,
  children: ids.map(leaf),
  sizes: sizes ?? ids.map(() => 1 / ids.length)
});

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

/** `n` çalışan bölmeli alan; bölme kimlikleri `<id>-p1…`, pty'ler `<id>-t1…`. */
function ws(id: string, n: number, extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    id,
    name: `Alan ${id}`,
    panes: Array.from({ length: n }, (_, i) => ({
      id: `${id}-p${i + 1}`,
      kind: "cmd" as const,
      cwd: "C:\\a",
      run: { state: "running", ptyId: `${id}-t${i + 1}` } as PaneRun
    })),
    focusedPaneId: n > 0 ? `${id}-p1` : null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    ...extra
  };
}

function setup(over: Partial<TerminalState> = {}, defaultCwd = "C:\\a") {
  const commands = commandsMock();
  const make = (o: Partial<TerminalState>): TerminalStoreValue => ({
    state: { ...initialTerminalState, phase: "ready", visible: true, ...o },
    commands,
    defaultKind: "cmd",
    defaultCwd
  });
  const ui = (o: Partial<TerminalState>) => (
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={make(o)}>
        <TerminalMode />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(over));
  return { commands, rerender: (o: Partial<TerminalState>) => r.rerender(ui(o)) };
}

function cell(paneId: string): HTMLElement {
  return document.querySelector(`[data-pane="${paneId}"]`) as HTMLElement;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("TerminalMode", () => {
  it("kapalı evrede hiçbir şey çizmiyor", () => {
    setup({ phase: "closed" });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("geri yükleme şeridi: sayılar ve iki düğme; + Bölme yok", () => {
    const { commands } = setup({
      phase: "restorePrompt",
      saved: [
        { id: "a", name: "A", panes: [{ id: "x", kind: "cmd", cwd: "C:\\a" }] },
        { id: "b", name: "B", panes: [{ id: "y", kind: "cmd", cwd: "C:\\a" }, { id: "z", kind: "axet", cwd: "C:\\a" }] }
      ]
    });
    expect(screen.getByText("Son düzen: 2 alan, 3 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Geri yükle" }));
    fireEvent.click(screen.getByRole("button", { name: "Boş başla" }));
    expect(commands.restore).toHaveBeenCalledTimes(1);
    expect(commands.startFresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Bölme" })).toBeNull();
  });

  it("boş alan: tür düğmesi varsayılan klasörde bölme açıyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" });
    expect(screen.getByText("Bu alanda terminal yok")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "PowerShell" }));
    expect(commands.addPane).toHaveBeenCalledWith("powershell", "C:\\a");
  });

  it("boş alan: Değiştir klasörü değiştiriyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" });
    pick.mockResolvedValueOnce("C:\\b");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "axet-code" }));
    expect(commands.addPane).toHaveBeenCalledWith("axet", "C:\\b");
  });

  it("boş alan: klasör yoksa tür düğmeleri kapalı", () => {
    setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" }, "");
    expect(screen.getByText("Klasör seçilmedi")).toBeTruthy();
    expect((screen.getByRole("button", { name: "cmd" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("üst şerit: ad, sayı; + Bölme pencereyi açıyor ve odaktaki bölmeyi bölüyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.getByText("Alan a")).toBeTruthy();
    expect(screen.getByText("2 / 9 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bölme" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    // jsdom'da kutular 0×0: genişlik yükseklikten büyük değil → alta.
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", { targetPaneId: "a-p1", dir: "column" });
    expect(screen.queryByText("Yeni bölme")).toBeNull();
  });

  it("9 bölmede + Bölme kapalı ve nedenini söylüyor", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    const add = screen.getByRole("button", { name: "Bölme" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(add.title).toBe("En fazla 9 bölme");
  });

  it("3 bölme: solda tek, sağda üst üste iki yer tutucu (eski ızgaraya benzer)", () => {
    setup({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    const root = document.querySelector('[data-workspace="a"] [data-split="row"]') as HTMLElement;
    expect(root.querySelector(':scope > [data-slot="a-p1"]')).toBeTruthy();
    const right = root.querySelector(':scope > [data-split="column"]') as HTMLElement;
    expect([...right.querySelectorAll("[data-slot]")].map((el) => el.getAttribute("data-slot"))).toEqual(["a-p2", "a-p3"]);
  });

  it("xterm odağı: yalnız görünür + seçili alan + odaktaki bölme", () => {
    const { rerender } = setup({
      workspaces: [ws("a", 2, { focusedPaneId: "a-p2" }), ws("b", 1)],
      activeWorkspaceId: "a"
    });
    expect(screen.getByTestId("xterm-a-t1").getAttribute("data-active")).toBe("false");
    expect(screen.getByTestId("xterm-a-t2").getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("xterm-b-t1").getAttribute("data-active")).toBe("false");
    rerender({ workspaces: [ws("a", 2, { focusedPaneId: "a-p2" }), ws("b", 1)], activeWorkspaceId: "a", visible: false });
    expect(screen.getByTestId("xterm-a-t2").getAttribute("data-active")).toBe("false");
  });

  it("seçili olmayan alan takılı kalıyor ama gizli", () => {
    setup({ workspaces: [ws("a", 1), ws("b", 1)], activeWorkspaceId: "a" });
    const hidden = screen.getByTestId("xterm-b-t1").closest("[data-workspace]") as HTMLElement;
    const shown = screen.getByTestId("xterm-a-t1").closest("[data-workspace]") as HTMLElement;
    expect(hidden.className.split(" ")).toContain("hidden");
    expect(shown.className.split(" ")).not.toContain("hidden");
  });

  it("büyütme: ötekiler display none ama takılı, ayırıcı yok", () => {
    setup({ workspaces: [ws("a", 3, { maximizedPaneId: "a-p2" })], activeWorkspaceId: "a" });
    expect(cell("a-p1").style.display).toBe("none");
    expect(cell("a-p3").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
    expect(cell("a-p2").style.left).toBe("0px");
    expect(cell("a-p2").style.right).toBe("0px");
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });

  it("tek bölmede ayırıcı ve büyüt düğmesi yok", () => {
    setup({ workspaces: [ws("a", 1)], activeWorkspaceId: "a" });
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
    expect(screen.queryByTitle("Büyüt")).toBeNull();
  });

  it("ayırıcı: değer ağaçtaki paydan; ok tuşu ve çift tık komut gönderiyor", () => {
    const { commands } = setup({
      workspaces: [ws("a", 2, { layout: split("row", ["a-p1", "a-p2"], [0.7, 0.3]) })],
      activeWorkspaceId: "a"
    });
    const sep = screen.getByRole("separator", { name: "Sütun genişliği" });
    expect(sep.getAttribute("aria-valuenow")).toBe("70");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(commands.resizeSplit).toHaveBeenCalledWith("a", [], 0, 0.02, expect.any(Number));
    fireEvent.keyDown(sep, { key: "ArrowUp" }); // yatay ayırıcıda dikey ok: yok sayılıyor
    expect(commands.resizeSplit).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(sep);
    expect(commands.equalizeSplit).toHaveBeenCalledWith("a", []);
  });

  it("4 bölme: iki satır kabında birer sütun ayırıcısı, kökte bir satır ayırıcısı", () => {
    setup({ workspaces: [ws("a", 4)], activeWorkspaceId: "a" });
    expect(screen.getAllByRole("separator", { name: "Sütun genişliği" })).toHaveLength(2);
    expect(screen.getAllByRole("separator", { name: "Satır yüksekliği" })).toHaveLength(1);
  });

  it("ağaç değişince (takas, yön, küçültme) xterm yeniden kurulmuyor (spec §6.2)", () => {
    const { rerender } = setup({ workspaces: [ws("a", 2, { layout: split("row", ["a-p1", "a-p2"]) })], activeWorkspaceId: "a" });
    const before = mounts.count;
    rerender({ workspaces: [ws("a", 2, { layout: split("column", ["a-p2", "a-p1"]) })], activeWorkspaceId: "a" });
    rerender({
      workspaces: [ws("a", 2, { layout: leaf("a-p1"), minimized: [{ paneId: "a-p2", home: null }] })],
      activeWorkspaceId: "a"
    });
    expect(mounts.count).toBe(before);
    expect(cell("a-p2").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t2")).toBeTruthy();
  });
});
