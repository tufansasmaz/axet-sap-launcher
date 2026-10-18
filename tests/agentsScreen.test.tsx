// @vitest-environment jsdom
// Ajanlar ekranı (spec 2026-10-18 ajanlar-yeniden §2, §2a): orta sekmeler
// Sohbet | Ofis | Terminal | Görevler | Değişiklikler | Tarayıcı; Sohbet
// bileşeni ve TerminalMode hep takılı, yalnız görünürlükleri değişiyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentsScreen from "../src/agents/AgentsScreen";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

beforeEach(() => {
  (window as unknown as { api: unknown }).api = { pickFolder: vi.fn(), axetAgents: vi.fn(async () => []) };
});
afterEach(cleanup);

const ws = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Satış",
  panes: [],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  ...over
});

function setup(chatActive: boolean, workspace: TerminalWorkspace = ws(), language: "tr" | "en" = "tr") {
  const commands = { setWorkspaceView: vi.fn(), selectWorkspace: vi.fn(), addWorkspace: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: !chatActive, workspaces: [workspace], activeWorkspaceId: workspace.id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const onShowChat = vi.fn();
  const onShowAgents = vi.fn();
  const ui = (chat: boolean) => (
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <AgentsScreen chatActive={chat} onShowChat={onShowChat} onShowAgents={onShowAgents} chat={<div data-testid="chat">sohbet</div>} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(chatActive));
  return { commands, onShowChat, onShowAgents, rerender: (chat: boolean) => r.rerender(ui(chat)) };
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("AgentsScreen", () => {
  it("altı orta sekme; Sohbet'teyken Sohbet seçili ve sohbet görünür, terminal gizli ama takılı", () => {
    const { rerender } = setup(true);
    const list = screen.getByRole("tablist", { name: "Görünüm" });
    expect(Array.from(list.querySelectorAll("[role=tab]")).map((t) => t.textContent)).toEqual(["Sohbet", "Ofis", "Terminal", "Görevler", "Değişiklikler", "Tarayıcı"]);
    expect(tab("Sohbet").getAttribute("aria-selected")).toBe("true");
    const chat = screen.getByTestId("chat");
    expect((chat.parentElement as HTMLElement).className.split(" ")).not.toContain("hidden");
    rerender(false);
    // Aynı düğüm: sohbet sökülmedi (akan cevap, taslak kaybolmuyor).
    expect(screen.getByTestId("chat")).toBe(chat);
    expect((chat.parentElement as HTMLElement).className.split(" ")).toContain("hidden");
    expect(tab("Ofis").getAttribute("aria-selected")).toBe("true");
  });

  it("Sohbet sekmesi Sohbet'i açıyor; ajan sekmesi görünümü kaydedip Ajanlar'ı açıyor", () => {
    const { commands, onShowChat, onShowAgents } = setup(false);
    fireEvent.click(tab("Sohbet"));
    expect(onShowChat).toHaveBeenCalledTimes(1);
    fireEvent.click(tab("Görevler"));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "board");
    expect(onShowAgents).toHaveBeenCalled();
  });

  it("ok tuşları sekmeler arasında geziyor; yalnız seçili sekme Tab sırasında", () => {
    const { commands, onShowChat } = setup(false, ws({ view: "panes" }));
    expect(tab("Terminal").tabIndex).toBe(0);
    expect(tab("Ofis").tabIndex).toBe(-1);
    fireEvent.keyDown(tab("Terminal"), { key: "ArrowRight" });
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("a", "board");
    fireEvent.keyDown(tab("Terminal"), { key: "Home" });
    expect(onShowChat).toHaveBeenCalledTimes(1);
  });

  it("Sohbet'teyken + Ajan Ajanlar'ı açıp ajan penceresini getiriyor", () => {
    const { onShowAgents } = setup(true);
    fireEvent.click(screen.getAllByRole("button", { name: "Ajan" })[0]);
    expect(onShowAgents).toHaveBeenCalled();
    expect(screen.getByText("Ajan ekle")).toBeTruthy();
  });

  it("ekip sekmesi üst şeritte; seçimi Ajanlar'ı açıyor", () => {
    const { onShowAgents, commands } = setup(true);
    fireEvent.click(screen.getByRole("tab", { name: /Satış/ }));
    expect(commands.selectWorkspace).toHaveBeenCalledWith("a");
    expect(onShowAgents).toHaveBeenCalled();
  });

  it("İngilizce sekme adları", () => {
    setup(false, ws(), "en");
    expect(tab("Chat")).toBeTruthy();
    expect(tab("Tasks")).toBeTruthy();
    expect(tab("Terminal")).toBeTruthy();
  });
});
