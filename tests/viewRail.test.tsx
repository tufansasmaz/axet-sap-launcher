// @vitest-environment jsdom
// Görünüm rayı (spec 2026-10-18 ajanlar-ux §4): içerik alanının sol kenarında
// alt alta simge düğmeleri; dikey tablist, yukarı/aşağı ok, Home/End.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ViewRail from "../src/agents/ViewRail";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

afterEach(cleanup);

function setup(view: TerminalWorkspace["view"], language: "tr" | "en" = "tr") {
  const ws: TerminalWorkspace = { id: "w1", name: "w1", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, view };
  const commands = { setWorkspaceView: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <ViewRail workspace={ws} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

const rail = () => screen.getByRole("tablist", { name: "Görünüm" });

describe("ViewRail", () => {
  it("altı sekme alt alta; Ofis ortada; Bellek sonda; dikey ve dar", () => {
    setup("office");
    const labels = screen.getAllByRole("tab").map((t) => t.getAttribute("aria-label"));
    expect(labels).toEqual(["Terminal", "Görevler", "Ofis", "Değişiklikler", "Tarayıcı", "Bellek"]);
    expect(rail().getAttribute("aria-orientation")).toBe("vertical");
    expect(rail().className.split(" ")).toEqual(expect.arrayContaining(["flex-col", "w-10"]));
    // Etiket ipucunda: her düğmenin title'ı var.
    for (const tab of screen.getAllByRole("tab")) expect(tab.getAttribute("title")).toBe(tab.getAttribute("aria-label"));
  });

  it("seçili sekme aria-selected + tabIndex 0; lime çizgi yalnız onda", () => {
    setup("office");
    const office = screen.getByRole("tab", { name: "Ofis" });
    expect(office.getAttribute("aria-selected")).toBe("true");
    expect(office.tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "Terminal" }).tabIndex).toBe(-1);
    expect(document.querySelectorAll(".bg-accent-400")).toHaveLength(1);
    expect(office.querySelector(".bg-accent-400")).toBeTruthy();
  });

  it("aşağı/yukarı ok sırayla geziyor ve uçlarda dönüyor; Home/End; yatay oklar bir şey yapmıyor", () => {
    const commands = setup("panes");
    fireEvent.keyDown(rail(), { key: "ArrowDown" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "board");
    fireEvent.keyDown(rail(), { key: "ArrowUp" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "memory");
    fireEvent.keyDown(rail(), { key: "End" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "memory");
    fireEvent.keyDown(rail(), { key: "Home" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "panes");
    const calls = (commands.setWorkspaceView as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.keyDown(rail(), { key: "ArrowRight" });
    expect((commands.setWorkspaceView as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it("tık görünümü alana kaydediyor; İngilizce etiketler", () => {
    const commands = setup("panes", "en");
    fireEvent.click(screen.getByRole("tab", { name: "Memory" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("w1", "memory");
  });
});
