// @vitest-environment jsdom
// Görünüm rayı: içeriğin üstünde yüzen yarı saydam grup; kapalıyken tek yuvarlak
// düğme, üzerine gelince/odakta açılır; dikey tablist, yukarı/aşağı ok, Home/End.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ViewRail from "../src/agents/ViewRail";
import type { RailCounts } from "../src/agents/railCounts";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

afterEach(cleanup);

function setup(view: TerminalWorkspace["view"], language: "tr" | "en" = "tr", counts?: RailCounts) {
  const ws: TerminalWorkspace = { id: "w1", name: "w1", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, view };
  const commands = { setWorkspaceView: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a",
    setupRuns: {}
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <ViewRail workspace={ws} counts={counts} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

const rail = () => screen.getByRole("tablist", { name: "Görünüm" });

describe("ViewRail", () => {
  it("on sekme alt alta: Pano başta, Ofis ortada, Bellek ve Araçlar sonda; dikey, içeriğin üstünde yüzüyor", () => {
    setup("office");
    const labels = screen.getAllByRole("tab").map((t) => t.getAttribute("aria-label"));
    expect(labels).toEqual(["Pano", "Raporlar", "Terminal", "Ajan yönetimi", "Görevler", "Ofis", "Değişiklikler", "Tarayıcı", "Bellek", "Araçlar"]);
    expect(rail().getAttribute("aria-orientation")).toBe("vertical");
    expect(rail().className.split(" ")).toEqual(expect.arrayContaining(["flex-col", "absolute", "rounded-full", "hover:rounded-md"]));
    // Etiket ipucunda: her düğmenin title'ı var.
    for (const tab of screen.getAllByRole("tab")) expect(tab.getAttribute("title")).toBe(tab.getAttribute("aria-label"));
  });

  it("seçili sekme aria-selected + tabIndex 0; kapalıyken yalnız seçili görünür", () => {
    setup("office");
    const office = screen.getByRole("tab", { name: "Ofis" });
    expect(office.getAttribute("aria-selected")).toBe("true");
    expect(office.tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "Terminal" }).tabIndex).toBe(-1);
    expect(office.className).not.toContain("hidden");
    const terminal = screen.getByRole("tab", { name: "Terminal" });
    expect(terminal.className.split(" ")).toEqual(expect.arrayContaining(["hidden", "group-hover:flex", "group-focus-within:flex"]));
  });

  it("aşağı/yukarı ok sırayla geziyor ve uçlarda dönüyor; Home/End; yatay oklar bir şey yapmıyor", () => {
    const commands = setup("panes");
    fireEvent.keyDown(rail(), { key: "ArrowDown" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "manage"); // Tur 7: Ajan yönetimi Terminal'in altında
    fireEvent.keyDown(rail(), { key: "ArrowUp" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "reports");
    fireEvent.keyDown(rail(), { key: "End" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "tools");
    fireEvent.keyDown(rail(), { key: "Home" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "overview");
    const calls = (commands.setWorkspaceView as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.keyDown(rail(), { key: "ArrowRight" });
    expect((commands.setWorkspaceView as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it("tık görünümü alana kaydediyor; İngilizce etiketler", () => {
    const commands = setup("panes", "en");
    fireEvent.click(screen.getByRole("tab", { name: "Memory" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("w1", "memory");
  });

  it("sayaç rozetleri: yalnız verisi olan sekmede; sayı etikette ve ipucunda; 99+ kırpma; lime değil", () => {
    setup("office", "tr", { board: 3, changes: 120, office: 1 });
    const board = screen.getByRole("tab", { name: "Görevler — 3 açık alt görev" });
    expect(board.getAttribute("title")).toBe("Görevler — 3 açık alt görev");
    expect(board.querySelector("[data-rail-count]")?.textContent).toBe("3");
    expect(screen.getByRole("tab", { name: "Değişiklikler — 120 değişiklik incelenmeyi bekliyor" }).querySelector("[data-rail-count]")?.textContent).toBe("99+");
    expect(screen.getByRole("tab", { name: "Ofis — 1 ajan soru soruyor" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Terminal" }).querySelector("[data-rail-count]")).toBeNull();
    for (const badge of document.querySelectorAll("[data-rail-count]")) expect(badge.className).not.toMatch(/accent|lime/);
  });

  it("sayaç İngilizce", () => {
    setup("panes", "en", { board: 2 });
    expect(screen.getByRole("tab", { name: "Tasks — 2 open subtasks" })).toBeTruthy();
  });
});
