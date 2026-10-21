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

describe("OverviewView (grafikli pano)", () => {
  const NOW = Date.now();
  const live: FlowEvent[] = [
    { id: 1, at: NOW - 2 * 3_600_000, workspaceId: "w1", kind: "started", paneId: "a", name: "Ayşe", detail: "" },
    { id: 2, at: NOW - 10 * 60_000, workspaceId: "w1", kind: "started", paneId: "a", name: "Ayşe", detail: "" },
    { id: 3, at: NOW - 5 * 60_000, workspaceId: "w1", kind: "finished", paneId: "a", name: "Ayşe", detail: "" },
    { id: 4, at: NOW - 60_000, workspaceId: "w2", kind: "started", paneId: "z", name: "Başka", detail: "" }
  ];
  let commands: TerminalCommands;

  beforeEach(() => {
    (window as unknown as { api: unknown }).api = {
      changesState: vi.fn(async () => ({ workspaceId: "w1", repo: "notRepo", checkpoints: [], expired: [] })),
      onChangesChanged: vi.fn(() => () => {})
    };
    commands = { setWorkspaceView: vi.fn(), revealPane: vi.fn() } as unknown as TerminalCommands;
  });
  afterEach(cleanup);

  async function draw(language: "tr" | "en" = "tr") {
    const workspace = ws();
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [workspace], activeWorkspaceId: "w1" },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a",
      setupRuns: {}
    };
    const status: AgentStatusValue = { statuses, engines: null, now: 0, answer: async () => ({ ok: false, reason: "noAgent" }) };
    render(
      <LanguageProvider language={language}>
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={status}>
            <FlowContext.Provider value={{ ...EMPTY_FLOW, events: live, record: () => {} }}>
              <OverviewView workspace={workspace} />
            </FlowContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
  }

  it("KPI kutuları değer + eğilim çizgisiyle; tıklanınca ilgili görünüm", async () => {
    await draw();
    const kpis = screen.getByRole("list", { name: "Göstergeler" });
    expect(kpis.querySelectorAll("[data-sparkline]").length).toBe(8);
    fireEvent.click(screen.getByRole("button", { name: /^Aktif ajan: 2 \/ 3\./}));
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "office");
    fireEvent.click(screen.getByRole("button", { name: /^Açık görev: 0\./ }));
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "board");
    fireEvent.click(screen.getByRole("button", { name: /^İnceleme bekleyen: 0\./ }));
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "changes");
    for (const [target, name] of [
      ["changes", "Depo"],
      ["tools", "Motorlar"],
      ["memory", "Bellek"],
      ["board", "Görev ilerlemesi"]
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: `${name} — aç` }));
      expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", target);
    }
    expect(screen.getByText("Git deposu değil")).toBeTruthy();
    expect(screen.queryByText("Başka")).toBeNull();
  });

  it("aralık seçici: 24 saat → 1 saat olay sayısını değiştiriyor", async () => {
    await draw();
    const chart = () => screen.getByRole("img", { name: /olay;/ });
    expect(chart().getAttribute("aria-label")).toMatch(/^24 saat içinde 3 olay/);
    const hour = screen.getByRole("radio", { name: "1 saat" });
    fireEvent.click(hour);
    expect(hour.getAttribute("aria-checked")).toBe("true");
    expect(chart().getAttribute("aria-label")).toMatch(/^1 saat içinde 2 olay/);
  });

  it("2026-10-21: bellekteki listeden eski olaylar kalıcı kayıttan (flow:range) grafiğe giriyor", async () => {
    const flowRange = vi.fn(async (_ws: string, from: number) => ({
      events: [
        { at: NOW - 3 * 86_400_000, kind: "started", paneId: "a", name: "Ayşe", detail: "" },
        { at: NOW - 2 * 3_600_000, kind: "started", paneId: "a", name: "Ayşe", detail: "" }
      ].filter((e) => e.at >= from),
      total: 2,
      oldest: NOW - 3 * 86_400_000,
      full: false
    }));
    (window as unknown as { api: Record<string, unknown> }).api.flowRange = flowRange;
    await draw();
    fireEvent.click(screen.getByRole("radio", { name: "7 gün" }));
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
    expect(flowRange).toHaveBeenCalledWith("w1", expect.any(Number));
    // Bellekte 3 (w1) + diskte bellekten eski 1 = 4; diskteki kopya (2 saat önce) ikilenmiyor.
    expect(screen.getByRole("img", { name: /olay;/ }).getAttribute("aria-label")).toMatch(/^7 gün içinde 4 olay/);
  });

  it("grafiğin tablo karşılığı ve klavyeyle ipucu", async () => {
    await draw();
    const chart = screen.getByRole("img", { name: /olay;/ });
    fireEvent.keyDown(chart, { key: "End" });
    expect(screen.getByRole("status").textContent).toContain("Toplam");
    fireEvent.click(screen.getByRole("button", { name: "Etkinlik yoğunluğu: tablo olarak göster" }));
    const table = screen.getByRole("table", { name: "Etkinlik yoğunluğu" });
    expect(table.querySelectorAll("tbody tr").length).toBe(24);
    expect(screen.queryByRole("img", { name: /olay;/ })).toBeNull();
  });

  it("durum şeridi ve ajan tablosu: ada tıklayınca terminal açılıyor", async () => {
    await draw();
    expect(document.querySelector('[data-lane="a"]')).toBeTruthy();
    const table = screen.getByRole("table", { name: "Ajan karşılaştırma" });
    expect(table.querySelectorAll("tbody tr").length).toBe(3);
    fireEvent.click(screen.getAllByRole("button", { name: "Ayşe — terminali aç" })[0]);
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("boş durumlar (en)", async () => {
    await draw("en");
    expect(screen.getByText("No approved tasks.")).toBeTruthy();
    expect(screen.getByText("No command verification yet.")).toBeTruthy();
  });
});

