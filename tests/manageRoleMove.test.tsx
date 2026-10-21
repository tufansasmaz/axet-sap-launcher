// @vitest-environment jsdom
// Tur 13: Ajan yönetiminde kabuk ajanına "Rol ver", ajanın rolünü değiştirme ve ekibe taşıma.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ManageView from "../src/agents/ManageView";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";

let agentUpdate: ReturnType<typeof vi.fn>;
beforeEach(() => {
  agentUpdate = vi.fn(async () => true);
  (window as unknown as { api: unknown }).api = { agentUpdate, memoryRead: vi.fn(async () => ({ ok: false })) };
});
afterEach(cleanup);

const ws = (id: string, panes: TerminalPane[]): TerminalWorkspace => ({ id, name: `Ekip ${id}`, panes, focusedPaneId: null, maximizedPaneId: null, unread: false, error: false });
const shellPane: TerminalPane = {
  id: "k1",
  kind: "cmd",
  cwd: "C:\\p",
  title: "Kabuk",
  launched: true,
  agent: { engine: "claude", role: "", roleKind: "custom" },
  run: { state: "running", ptyId: "t-k1" }
};

function harness(workspaces: TerminalWorkspace[]) {
  const commands = {
    revealPane: vi.fn(),
    restartPane: vi.fn(),
    closePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    enablePaneMemory: vi.fn(),
    setShellAgent: vi.fn(),
    setPaneRole: vi.fn(),
    movePaneToWorkspace: vi.fn(() => true)
  } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces, activeWorkspaceId: workspaces[0].id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet",
    setupRuns: {}
  } as TerminalStoreValue;
  const record = vi.fn();
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={{ statuses: {}, engines: [], now: 1_000_000, answer: vi.fn(), answerText: vi.fn() } as unknown as AgentStatusValue}>
          <FlowContext.Provider value={{ ...EMPTY_FLOW, record }}>
            <ManageView />
          </FlowContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, record };
}

describe("kabuk ajanına Rol ver", () => {
  it("rol + bellek kaydediliyor, izleyiciye rol gidiyor, Akış'a not", () => {
    const h = harness([ws("a", [shellPane])]);
    const row = screen.getByText("Kabuk").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Rol ver" }));
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "Analist" } });
    fireEvent.click(screen.getByLabelText("Kalıcı bellek açık"));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(h.commands.setShellAgent).toHaveBeenCalledWith("k1", "Analist", true);
    expect(agentUpdate).toHaveBeenCalledWith("k1", { role: "Analist" });
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "note", workspaceId: "a", paneId: "k1", detail: "roleChanged||Analist" }));
  });
});

const agentPane = (id: string, agent: TerminalPane["agent"]): TerminalPane => ({ id, kind: "agent", cwd: "C:\\p", title: `Ajan ${id}`, agent, run: { state: "running", ptyId: `t-${id}` } });

describe("rolü değiştir", () => {
  it("yalnız etiket: yeniden başlatma yok, izleyiciye rol, Akış'a not", () => {
    const h = harness([ws("a", [agentPane("p1", { engine: "axet-code", role: "Test", roleKind: "preset" })])]);
    const row = screen.getByText("Ajan p1").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Rolü değiştir" }));
    expect(screen.queryByLabelText("Kalıcı bellek açık")).toBeNull();
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "Lider" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(h.commands.setPaneRole).toHaveBeenCalledWith("p1", "Lider");
    expect(h.commands.restartPane).not.toHaveBeenCalled();
    expect(agentUpdate).toHaveBeenCalledWith("p1", { role: "Lider" });
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "note", detail: "roleChanged|Test|Lider" }));
  });

  it("açılış komutu değişiyorsa (Claude lideri): uyarı + onaylı yeniden başlatma", () => {
    const h = harness([ws("a", [agentPane("p1", { engine: "claude", role: "Analist", roleKind: "custom" })])]);
    const row = screen.getByText("Ajan p1").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Rolü değiştir" }));
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "Lider" } });
    expect(screen.getByText(/yeniden başlatılır/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet ve yeniden başlat" }));
    expect(h.commands.setPaneRole).toHaveBeenCalledWith("p1", "Lider");
    expect(h.commands.restartPane).toHaveBeenCalledWith("p1");
    expect(agentUpdate).not.toHaveBeenCalled();
  });
});

describe("ekibe taşı", () => {
  it("hedef ekip seçilip taşınıyor; izleyiciye yeni alan; iki ekibin Akış'ına not", () => {
    const h = harness([ws("a", [agentPane("p1", { engine: "axet-code", role: "Test", roleKind: "preset" })]), ws("b", [])]);
    const row = screen.getByText("Ajan p1").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Ekibe taşı" }));
    fireEvent.change(screen.getByLabelText("Hedef ekip"), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Taşı" }));
    expect(h.commands.movePaneToWorkspace).toHaveBeenCalledWith("p1", "b");
    expect(agentUpdate).toHaveBeenCalledWith("p1", { workspaceId: "b" });
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "note", workspaceId: "b", detail: "movedTeam|Ekip a|Ekip b" }));
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "note", workspaceId: "a", detail: "movedTeam|Ekip a|Ekip b" }));
  });

  it("tek ekip varken düğme kapalı", () => {
    harness([ws("a", [agentPane("p1", { engine: "axet-code", role: "Test", roleKind: "preset" })])]);
    const row = screen.getByText("Ajan p1").closest("tr") as HTMLElement;
    expect((within(row).getByRole("button", { name: "Ekibe taşı" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
