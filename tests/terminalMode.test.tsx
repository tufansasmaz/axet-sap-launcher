// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalMode from "../src/terminal/TerminalMode";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";

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
    toggleMaximize: vi.fn()
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

  it("üst şerit: ad, sayı; + Bölme pencereyi açıyor ve ekliyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.getByText("Alan a")).toBeTruthy();
    expect(screen.getByText("2 / 9 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bölme" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a");
    expect(screen.queryByText("Yeni bölme")).toBeNull();
  });

  it("9 bölmede + Bölme kapalı ve nedenini söylüyor", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    const add = screen.getByRole("button", { name: "Bölme" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(add.title).toBe("En fazla 9 bölme");
  });

  it("3 bölme: soldaki iki satırı kaplıyor", () => {
    setup({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    expect(cell("a-p1").style.gridRow).toBe("1 / span 2");
    expect(cell("a-p2").style.gridColumn).toBe("2");
    expect(cell("a-p3").style.gridRow).toBe("2 / span 1");
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
    expect(cell("a-p2").style.gridColumn).toBe("1 / -1");
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });

  it("tek bölmede ayırıcı ve büyüt düğmesi yok", () => {
    setup({ workspaces: [ws("a", 1)], activeWorkspaceId: "a" });
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
    expect(screen.queryByTitle("Büyüt")).toBeNull();
  });

  it("ayırıcı ok tuşlarıyla kayıyor; bölme sayısı değişince oranlar eşitleniyor", () => {
    const { rerender } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    const sep = () => screen.getByRole("separator", { name: "Sütun genişliği" });
    expect(sep().getAttribute("aria-valuenow")).toBe("50");
    fireEvent.keyDown(sep(), { key: "ArrowRight" });
    expect(sep().getAttribute("aria-valuenow")).toBe("52");
    fireEvent.keyDown(sep(), { key: "ArrowLeft" });
    fireEvent.keyDown(sep(), { key: "ArrowLeft" });
    expect(sep().getAttribute("aria-valuenow")).toBe("48");
    rerender({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    expect(sep().getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByRole("separator", { name: "Satır yüksekliği" })).toBeTruthy();
  });

  it("4 bölme: bir sütun, bir satır ayırıcısı", () => {
    setup({ workspaces: [ws("a", 4)], activeWorkspaceId: "a" });
    expect(screen.getAllByRole("separator", { name: "Sütun genişliği" })).toHaveLength(1);
    expect(screen.getAllByRole("separator", { name: "Satır yüksekliği" })).toHaveLength(1);
  });
});
