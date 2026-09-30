// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalSidebar from "../src/components/TerminalSidebar";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";

afterEach(cleanup);

function ws(id: string, name: string, runs: PaneRun[] = [], extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    id,
    name,
    panes: runs.map((run, i) => ({ id: `${id}-p${i}`, kind: "cmd" as const, cwd: "C:\\a", run })),
    focusedPaneId: null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    ...extra
  };
}

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

function renderSidebar(workspaces: TerminalWorkspace[], over: Partial<TerminalState> = {}) {
  const commands = commandsMock();
  const state: TerminalState = {
    ...initialTerminalState,
    phase: "ready",
    visible: true,
    workspaces,
    activeWorkspaceId: workspaces[0]?.id ?? null,
    ...over
  };
  const value: TerminalStoreValue = { state, commands, defaultKind: "cmd", defaultCwd: "C:\\a" };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={value}>
        <TerminalSidebar />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

const running: PaneRun = { state: "running", ptyId: "t1" };

function row(name: string): HTMLElement {
  return screen.getByText(name).closest("[role=button]") as HTMLElement;
}

describe("TerminalSidebar", () => {
  it("alanları sayısıyla listeliyor, seçiliyi işaretliyor", () => {
    renderSidebar([ws("a", "API", [running, running]), ws("b", "UI")], { activeWorkspaceId: "b" });
    expect(screen.getByText("Çalışma alanları")).toBeTruthy();
    expect(row("UI").getAttribute("aria-current")).toBe("true");
    expect(row("API").getAttribute("aria-current")).toBeNull();
    expect(row("API").textContent).toContain("2");
  });

  it("tıklama ve Enter alanı seçiyor", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI")]);
    fireEvent.click(row("UI"));
    fireEvent.keyDown(row("API"), { key: "Enter" });
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(1, "b");
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(2, "a");
  });

  it("hata noktası okunmamış noktasından önce geliyor", () => {
    renderSidebar([
      ws("a", "API", [], { error: true, unread: true }),
      ws("b", "UI", [], { unread: true }),
      ws("c", "DB")
    ]);
    expect(row("API").querySelector("[data-dot]")?.getAttribute("data-dot")).toBe("error");
    expect(row("UI").querySelector("[data-dot]")?.getAttribute("data-dot")).toBe("unread");
    expect(row("DB").querySelector("[data-dot]")).toBeNull();
  });

  it("+ yeni alan açıyor; 6 alanda kapalı ve nedenini söylüyor", () => {
    const c = renderSidebar([ws("a", "A")]);
    fireEvent.click(screen.getByTitle("Yeni çalışma alanı"));
    expect(c.addWorkspace).toHaveBeenCalledTimes(1);
    cleanup();
    renderSidebar(["1", "2", "3", "4", "5", "6"].map((n) => ws(n, `W${n}`)));
    const plus = screen.getByTitle("En fazla 6 çalışma alanı") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("geri yükleme şeridi açıkken + kapalı", () => {
    renderSidebar([], { phase: "restorePrompt" });
    const plus = screen.getByTitle("Yeni çalışma alanı") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("çift tıklayıp yeniden adlandırma: Enter kaydediyor, boşlukları kırpıyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.doubleClick(row("API"));
    const input = screen.getByLabelText("Çalışma alanı adı") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Backend  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(c.renameWorkspace).toHaveBeenCalledWith("a", "Backend");
    expect(screen.queryByLabelText("Çalışma alanı adı")).toBeNull();
  });

  it("boş ad ve Escape hiçbir şey göndermiyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.keyDown(row("API"), { key: "F2" });
    const input = screen.getByLabelText("Çalışma alanı adı");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.doubleClick(row("API"));
    fireEvent.change(screen.getByLabelText("Çalışma alanı adı"), { target: { value: "Yeni" } });
    fireEvent.keyDown(screen.getByLabelText("Çalışma alanı adı"), { key: "Escape" });
    expect(c.renameWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText("API")).toBeTruthy();
  });

  it("sağ tık menüsü: Yeniden adlandır girişi açıyor, Escape menüyü kapatıyor", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Yeniden adlandır" }));
    expect(screen.getByLabelText("Çalışma alanı adı")).toBeTruthy();
  });

  it("menü pencerenin dışına taşmıyor", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: window.innerWidth - 2, clientY: window.innerHeight - 2 });
    const menu = screen.getByRole("menu");
    expect(parseFloat(menu.style.left)).toBeLessThan(window.innerWidth - 100);
    expect(parseFloat(menu.style.top)).toBeLessThan(window.innerHeight - 40);
  });

  it("canlı süreç yoksa Kapat doğrudan kapatıyor", () => {
    const c = renderSidebar([ws("a", "API", [{ state: "exited", ptyId: "t1", code: 0 }]), ws("b", "UI")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).toHaveBeenCalledWith("a");
  });

  it("canlı süreç varsa Kapat önce soruyor, sayıyı söylüyor", () => {
    const c = renderSidebar([ws("a", "API", [running, { state: "starting", token: 1 }, { state: "queued" }])]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText("Bu alandaki 2 terminal kapanacak.")).toBeTruthy();
    // Pencerenin çarpısı da "Kapat" diye okunuyor; onay düğmesinin metni ayrı.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Alanı kapat" }));
    });
    expect(c.closeWorkspace).toHaveBeenCalledWith("a");
  });
});
