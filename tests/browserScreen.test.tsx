// @vitest-environment jsdom
// Bölmeler | Pano | Ofis | Değişiklikler | Tarayıcı (spec 2026-10-18 tarayici §2):
// beş seçenekli geçiş; Tarayıcı'da bölmeler gizli ama takılı; sayfa öbür
// görünümde de takılı (gizli) kalıyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentsScreen from "../src/agents/AgentsScreen";
import FlowSidebar from "../src/agents/FlowSidebar";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active }: { sessionId: string; active: boolean }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />
  )
}));
vi.mock("../src/browser/BrowserPage", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function FakePage(props: { initialUrl: string }, _ref: unknown) {
      return <div data-fake-page={props.initialUrl} />;
    })
  };
});

let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = {
    pickFolder: vi.fn(),
    axetAgents: vi.fn(async () => []),
    openExternalUrl: vi.fn(),
    onBrowserShortcut: vi.fn(() => () => {}),
    onBrowserDownloadBlocked: vi.fn(() => () => {}),
    browserSend: vi.fn()
  };
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

function setup(ws: TerminalWorkspace, withFlow = false) {
  const commands = commandsMock();
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) };
  const boards: BoardContextValue = { boards: {}, command: vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true })) };
  const buildUi = (w: TerminalWorkspace, withFlow = false) => {
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [w], activeWorkspaceId: w.id },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a"
    };
    return (
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <BoardContext.Provider value={boards}>
              <FlowContext.Provider value={{ ...EMPTY_FLOW, events: [], record: () => {} }}>
                {withFlow && <FlowSidebar />}
                <AgentsScreen chatActive={false} onShowAgents={vi.fn()} chat={null} />
              </FlowContext.Provider>
            </BoardContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(buildUi(ws, withFlow));
  return { commands, rerender: (w: TerminalWorkspace, wf = withFlow) => r.rerender(buildUi(w, wf)) };
}

const hostOf = (el: Element | null) => el?.closest("[data-browser]") as HTMLElement;

describe("Tarayıcı görünümü — geçiş", () => {
  it("dokuz sekme (Tur 3: Pano başta, Araçlar sonda), dikey rayda (Sohbet yok); Tarayıcı seçimi alana kaydediliyor (tablist dikey rayda)", () => {
    // Ajanlar-ux §4: tablist içerik alanının sol kenarındaki dikey rayda.
    const { commands } = setup(workspace(), true);
    const group = screen.getByRole("tablist", { name: "Görünüm" });
    const labels = within(group).getAllByRole("tab").map((r) => r.getAttribute("aria-label"));
    expect(labels).toEqual(["Pano", "Raporlar", "Terminal", "Görevler", "Ofis", "Değişiklikler", "Tarayıcı", "Bellek", "Araçlar"]);
    fireEvent.click(within(group).getByRole("tab", { name: "Tarayıcı" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "browser");
  });

  it("Tarayıcı'dayken: seçili (FlowSidebar'da), görünüm bölgesi var, bölmeler gizli ama takılı, xterm active değil", () => {
    setup(workspace({ view: "browser" }), true);
    expect(screen.getByRole("tab", { name: "Tarayıcı" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("region", { name: "Tarayıcı görünümü" })).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect((cell.closest("[data-workspace]") as HTMLElement).className.split(" ")).toContain("hidden");
    expect(screen.getByTestId("xterm-t-p1").getAttribute("data-active")).toBe("false");
    expect(screen.queryByRole("complementary", { name: "Kararlar" })).toBeNull();
  });

  it("hiç Tarayıcı'ya geçilmemiş alanda tarayıcı takılı değil", () => {
    setup(workspace());
    expect(document.querySelector("[data-browser]")).toBeNull();
  });

  it("sayfa öbür görünümde takılı (gizli) kalıyor; geri dönünce aynı sayfa", () => {
    const { rerender } = setup(workspace({ view: "browser", browserUrl: "http://localhost:5173/" }));
    fireEvent.click(screen.getByRole("button", { name: "Son açılan: http://localhost:5173/" }));
    const fake = document.querySelector("[data-fake-page]");
    expect(fake).toBeTruthy();
    expect(hostOf(fake).className.split(" ")).not.toContain("hidden");
    rerender(workspace({ view: undefined, browserUrl: "http://localhost:5173/" }));
    expect(document.querySelector("[data-fake-page]")).toBe(fake);
    expect(hostOf(fake).className.split(" ")).toContain("hidden");
    rerender(workspace({ view: "browser", browserUrl: "http://localhost:5173/" }));
    expect(document.querySelector("[data-fake-page]")).toBe(fake);
    expect(hostOf(fake).className.split(" ")).not.toContain("hidden");
  });
});
