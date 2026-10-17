// @vitest-environment jsdom
// Bildirim tıklaması ve "Ajanlar" sekmesi rozeti (spec 2026-10-17 ajan-alani §4, §9).
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentOpenListener from "../src/agents/AgentOpenListener";
import AgentsModeBadge from "../src/agents/AgentsModeBadge";
import { AgentStatusContext } from "../src/agents/agentStatusContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

let openListener: ((paneId: string) => void) | null;
let prevApi: unknown;

beforeEach(() => {
  openListener = null;
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = {
    onAgentOpen: vi.fn((cb: (paneId: string) => void) => {
      openListener = cb;
      return () => {
        openListener = null;
      };
    })
  };
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

const workspace: TerminalWorkspace = {
  id: "w",
  name: "W",
  panes: [
    { id: "a", kind: "agent", agent: { engine: "axet-code", role: "", roleKind: "custom" }, cwd: "C:\\p", run: { state: "running", ptyId: "t" } }
  ],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
};

function wrap(children: ReactNode, statuses: Record<string, AgentStatus> = {}) {
  const commands = { revealPane: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: false, workspaces: [workspace], activeWorkspaceId: "w" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const r = render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={{ statuses, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) }}>
          {children}
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, ...r };
}

describe("AgentOpenListener", () => {
  it("bildirim tıklaması Ajanlar ekranını açıp bölmeyi öne getiriyor; kaldırılınca dinleme bitiyor", () => {
    const onShow = vi.fn();
    const { commands, unmount } = wrap(<AgentOpenListener onShow={onShow} />);
    act(() => openListener?.("a"));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(commands.revealPane).toHaveBeenCalledWith("a");
    unmount();
    expect(openListener).toBeNull();
  });
});

describe("AgentsModeBadge", () => {
  it("soru bekleyen ajan yoksa çizilmiyor; varsa sayıyla", () => {
    const { container, unmount } = wrap(<AgentsModeBadge />);
    expect(container.querySelector("[data-agents-asking]")).toBeNull();
    unmount();
    const asking: AgentStatus = {
      state: "asking",
      source: "exact",
      lastActivity: 1,
      question: { callId: "c", question: "?", header: "", options: ["A", "B"], multiSelect: false, askedAt: 1 }
    };
    const second = wrap(<AgentsModeBadge />, { a: asking });
    const badge = second.container.querySelector("[data-agents-asking]") as HTMLElement;
    expect(badge.getAttribute("data-agents-asking")).toBe("1");
    expect(badge.getAttribute("title")).toBe("1 soru bekliyor");
  });
});
