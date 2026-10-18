// @vitest-environment jsdom
// Ajanlar ekranı (spec 2026-10-18 ajanlar-yeniden §2, düzen rev.2):
// Sohbet bileşeni ve TerminalMode hep takılı. Ajanlar-ux §1, §4: üst şerit
// TEK satır (ekip sekmeleri + "+ Ekip" + "+ Kabuk" / "+ Ajan"); görünüm
// seçimi içerik alanının sol kenarındaki dikey rayda.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { requestAddAgent } from "../src/agents/addAgentBus";
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
  const onShowAgents = vi.fn();
  const ui = (chat: boolean) => (
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <AgentsScreen chatActive={chat} onShowAgents={onShowAgents} chat={<div data-testid="chat">sohbet</div>} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(chatActive));
  return { commands, onShowAgents, rerender: (chat: boolean) => r.rerender(ui(chat)) };
}

describe("AgentsScreen", () => {
  it("Sohbet'teyken sohbet görünür, terminal gizli ama takılı; Ajanlar'a geçince yer değiştirir", () => {
    const { rerender } = setup(true);
    const chat = screen.getByTestId("chat");
    expect((chat.parentElement as HTMLElement).className.split(" ")).not.toContain("hidden");
    rerender(false);
    // Aynı düğüm: sohbet sökülmedi (akan cevap, taslak kaybolmuyor).
    expect(screen.getByTestId("chat")).toBe(chat);
    expect((chat.parentElement as HTMLElement).className.split(" ")).toContain("hidden");
  });

  it("+ Ajan Ajanlar'ı açıp ajan penceresini getiriyor", () => {
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

  it("üst şerit tek satır: ekip sekmeleri, + Ekip, + Kabuk, + Ajan aynı alçak satırda; görünüm seçimi şeritte değil", () => {
    setup(false);
    const strip = document.querySelector("[data-agents-strip]") as HTMLElement;
    expect(strip.className.split(" ")).toEqual(expect.arrayContaining(["flex", "h-9", "items-center"]));
    expect(strip.className).not.toContain("flex-col");
    expect(within(strip).getByRole("tablist", { name: "Ekipler" })).toBeTruthy();
    for (const name of ["Ekip", "Kabuk", "Ajan"]) expect(within(strip).getByRole("button", { name })).toBeTruthy();
    expect(within(strip).queryByRole("tablist", { name: "Görünüm" })).toBeNull();
  });

  it("görünüm rayı içerik alanında, dikey", () => {
    setup(false);
    const rail = screen.getByRole("tablist", { name: "Görünüm" });
    expect(rail.getAttribute("aria-orientation")).toBe("vertical");
    expect(rail.closest("[data-agents-strip]")).toBeNull();
  });

  it("boş durumlardaki 'İlk ajanını ekle' isteği ajan penceresini açıyor", () => {
    const { onShowAgents } = setup(false);
    act(() => requestAddAgent());
    expect(onShowAgents).toHaveBeenCalled();
    expect(screen.getByText("Ajan ekle")).toBeTruthy();
  });
});
