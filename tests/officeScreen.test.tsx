// @vitest-environment jsdom
// Bölmeler | Pano | Ofis (spec 2026-10-18 ofis-gorunumu §2, §5): üç seçenekli
// geçiş; ofiste bölmeler gizli ama takılı ve xterm odak almıyor; Kararlar
// yerinde; boş ofisten "+ Ajan" penceresi; Pano görünümü değişmedi.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentsScreen from "../src/agents/AgentsScreen";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board } from "../app-electron/shared/boardTypes";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active }: { sessionId: string; active: boolean }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />
  )
}));

let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = { pickFolder: vi.fn(), axetAgents: vi.fn(async () => []) };
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
    addAgent: vi.fn(),
    revealPane: vi.fn(),
    setWorkspaceRoot: vi.fn(),
    setWorkspaceVerify: vi.fn(),
    setWorkspaceView: vi.fn(),
    setWorkspaceBrowserUrl: vi.fn(),
    enablePaneMemory: vi.fn(),
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

const agentPane = (id: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`
});
const shellPane = (id: string): TerminalPane => ({ id, kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: `t-${id}` } });
const workspace = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1")],
  focusedPaneId: "p1",
  maximizedPaneId: null,
  unread: false,
  error: false,
  ...over
});

function setup(ws: TerminalWorkspace, { board, language = "tr" }: { board?: Board; language?: "tr" | "en" } = {}) {
  const commands = commandsMock();
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) };
  const ui = (w: TerminalWorkspace) => {
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [w], activeWorkspaceId: w.id },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a"
    };
    const boards: BoardContextValue = {
      boards: board ? { [w.id]: board } : {},
      command: vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true }))
    };
    return (
      <LanguageProvider language={language}>
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <BoardContext.Provider value={boards}>
              <AgentsScreen chatActive={false} onShowChat={vi.fn()} onShowAgents={vi.fn()} chat={null} />
            </BoardContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(ui(ws));
  return { commands, rerender: (w: TerminalWorkspace) => r.rerender(ui(w)) };
}

const office = () => screen.queryByRole("region", { name: "Ofis görünümü" });
const xterm = () => screen.getByTestId("xterm-t-p1");

describe("orta sekmeler: Sohbet | Ofis | Terminal | Görevler | …", () => {
  it("kaydı olmayan alan Ofis'te açılıyor (ajanlar-yeniden §2)", () => {
    setup(workspace());
    expect(screen.getByRole("tab", { name: "Ofis" }).getAttribute("aria-selected")).toBe("true");
    expect(office()).toBeTruthy();
  });

  it("altı sekme; Terminal'deyken Ofis seçimi alana kaydediliyor", () => {
    const { commands } = setup(workspace({ view: "panes" }));
    const group = screen.getByRole("tablist", { name: "Görünüm" });
    expect(within(group).getAllByRole("tab").map((r) => r.textContent)).toEqual(["Sohbet", "Ofis", "Terminal", "Görevler", "Değişiklikler", "Tarayıcı"]);
    expect(within(group).getByRole("tab", { name: "Terminal" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(group).getByRole("tab", { name: "Ofis" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "office");
    expect(office()).toBeNull();
  });

  it("ofiste: Ofis seçili, bölmeler gizli ama takılı, xterm active değil, Kararlar yerinde, Pano yok", () => {
    setup(workspace({ view: "office" }));
    expect(screen.getByRole("tab", { name: "Ofis" }).getAttribute("aria-selected")).toBe("true");
    expect(office()).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect(cell).toBeTruthy();
    expect((cell.closest("[data-workspace]") as HTMLElement).className.split(" ")).toContain("hidden");
    expect(xterm().getAttribute("data-active")).toBe("false");
    expect(screen.queryByRole("complementary", { name: "Kararlar" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Taslak" })).toBeNull();
  });

  it("karaktere tıklama Bölmeler'e döndürüp bölmeyi öne getiriyor; Bölmeler'e dönünce odaktaki bölme active", () => {
    const { commands, rerender } = setup(workspace({ view: "office" }));
    // revealPane zaten setWorkspaceView'u cagiriyor (terminalStore:441); gorev-5.
    fireEvent.click(document.querySelector('[data-office-seat="p1"]') as HTMLElement);
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    expect(commands.setWorkspaceView).not.toHaveBeenCalled();
    rerender(workspace({ view: "panes" }));
    expect(office()).toBeNull();
    expect(xterm().getAttribute("data-active")).toBe("true");
    expect((document.querySelector('[data-pane="p1"]')?.closest("[data-workspace]") as HTMLElement).className.split(" ")).not.toContain("hidden");
  });

  it("boş ofis: Ajan düğmesi mevcut 'Ajan ekle' penceresini açıyor", () => {
    setup(workspace({ view: "office", panes: [shellPane("s1")], focusedPaneId: "s1" }));
    fireEvent.click(within(office() as HTMLElement).getByRole("button", { name: "Ajan" }));
    expect(screen.getByText("Ajan ekle")).toBeTruthy();
  });

  it("Pano görünümü değişmedi: Pano seçili, sütunlar var, ofis yok, xterm active değil", () => {
    setup(workspace({ view: "board" }), { board: { workspaceId: "a", tasks: [] } });
    expect(screen.getByRole("tab", { name: "Görevler" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("list", { name: "Taslak" })).toBeTruthy();
    expect(office()).toBeNull();
    expect(xterm().getAttribute("data-active")).toBe("false");
  });

  it("İngilizce: Office seçeneği", () => {
    setup(workspace({ view: "office" }), { language: "en" });
    expect(screen.getByRole("tab", { name: "Office" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("region", { name: "Office view" })).toBeTruthy();
  });

  it("Değişiklikler: seçince bölmeler gizli ama takılı, xterm active değil, görünüm bölgesi var, Kararlar yerinde", async () => {
    (window as unknown as { api: Record<string, unknown> }).api = {
      ...(window as unknown as { api: Record<string, unknown> }).api,
      changesState: vi.fn(async () => ({ workspaceId: "a", repo: "ok", checkpoints: [], expired: [] })),
      onChangesChanged: vi.fn(() => () => {}),
      changesLive: vi.fn(async () => ({ ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true }))
    };
    const { commands } = setup(workspace({ view: "panes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Değişiklikler" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "changes");
    cleanup();
    setup(workspace({ view: "changes" }));
    expect(screen.getByRole("tab", { name: "Değişiklikler" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("region", { name: "Değişiklikler görünümü" })).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect((cell.closest("[data-workspace]") as HTMLElement).className.split(" ")).toContain("hidden");
    expect(xterm().getAttribute("data-active")).toBe("false");
    expect(screen.queryByRole("complementary", { name: "Kararlar" })).toBeNull();
    await act(async () => {
      await Promise.resolve();
    });
  });
});
