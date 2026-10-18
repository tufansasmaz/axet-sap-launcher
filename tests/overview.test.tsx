// @vitest-environment jsdom
// Pano / genel bakış (Tur 3): mevcut kaynaklardan özet; kart tıklanınca ilgili görünüm.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import OverviewView from "../src/agents/OverviewView";
import { overviewOf } from "../src/agents/overview";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { FlowEvent } from "../src/agents/flowEvents";

const pane = (id: string, title: string, run: TerminalPane["run"] = { state: "running", ptyId: `t-${id}` }, memory = false): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom", ...(memory ? { memory: `m-${id}` } : {}) },
  cwd: "C:\\p",
  run,
  title
});

const ws = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "w1",
  name: "Satış",
  panes: [pane("a", "Ayşe", undefined, true), pane("b", "Mehmet"), pane("c", "Ali", { state: "exited", code: 0 } as TerminalPane["run"]), { id: "s", kind: "cmd", cwd: "C:\\p", run: { state: "running", ptyId: "t-s" } } as TerminalPane],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  root: "C:\\proje",
  ...over
});

const statuses: Record<string, AgentStatus> = {
  a: { state: "running", source: "exact", lastActivity: 1 },
  b: { state: "asking", source: "exact", lastActivity: 1, question: { callId: "q", question: "?", header: "", options: ["x"], multiSelect: false, askedAt: 1 } }
};

const events: FlowEvent[] = [
  { id: 1, at: 1000, workspaceId: "w1", kind: "started", paneId: "a", name: "Ayşe", detail: "" },
  { id: 2, at: 2000, workspaceId: "w2", kind: "started", paneId: "z", name: "Başka", detail: "" },
  { id: 3, at: 3000, workspaceId: "w1", kind: "finished", paneId: "a", name: "Ayşe", detail: "" }
];

describe("overviewOf", () => {
  it("ajan sayıları, sorular, olaylar (yalnız bu ekip, yeniden eskiye), depo ve motorlar", () => {
    const o = overviewOf({
      workspace: ws(),
      statuses,
      board: null,
      changes: { workspaceId: "w1", repo: "ok", checkpoints: [], expired: [] },
      events,
      engines: [
        { id: "axet-code", installed: true, blocked: false },
        { id: "claude", installed: false, blocked: true },
        { id: "ozel", installed: true, blocked: false }
      ]
    });
    expect(o.agents).toEqual({ total: 3, running: 1, asking: 1, idle: 1, error: 0 });
    expect(o.questions).toBe(1);
    expect(o.events.map((e) => e.id)).toEqual([3, 1]);
    expect(o.repo).toEqual({ root: "C:\\proje", status: "ok" });
    expect(o.engines).toEqual({ installed: 1, total: 2, known: true });
    expect(o.tasks.open).toBe(0);
  });
});

describe("OverviewView", () => {
  beforeEach(() => {
    (window as unknown as { api: unknown }).api = {
      changesState: vi.fn(async () => ({ workspaceId: "w1", repo: "notRepo", checkpoints: [], expired: [] })),
      onChangesChanged: vi.fn(() => () => {})
    };
  });
  afterEach(cleanup);

  it("kartlar özetliyor; tıklanınca ilgili görünüme geçiyor", async () => {
    const workspace = ws();
    const commands = { setWorkspaceView: vi.fn() } as unknown as TerminalCommands;
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [workspace], activeWorkspaceId: "w1" },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a"
    };
    const status: AgentStatusValue = { statuses, engines: null, now: 0, answer: async () => ({ ok: false, reason: "noAgent" }) };
    render(
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={status}>
            <FlowContext.Provider value={{ ...EMPTY_FLOW, events, record: () => {} }}>
              <OverviewView workspace={workspace} />
            </FlowContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
    // Depo uyarısı Değişiklikler sondajından.
    expect(screen.getByText("Git deposu değil")).toBeTruthy();
    expect(screen.getByText("İşini bitirdi.")).toBeTruthy();
    expect(screen.queryByText("Başka")).toBeNull();
    for (const [target, name] of [
      ["board", "Görevler"],
      ["changes", "Değişiklikler"],
      ["tools", "Motorlar"],
      ["memory", "Bellek"],
      ["office", "Ekip"]
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: `${name} — aç` }));
      expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", target);
    }
  });
});
