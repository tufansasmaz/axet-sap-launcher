// @vitest-environment jsdom
// Tur 7: lider ekip yönetiminin arayüzü — Akış kartları, onay kartı, @ekip → Lider,
// "Lider ekle" önerisi, lider açımı işareti, renderer'ın açılış/kapatma kuralları.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import FlowSidebar from "../src/agents/FlowSidebar";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext, type LeadApproval } from "../src/agents/flowContext";
import type { FlowEvent } from "../src/agents/flowEvents";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentSendResult } from "../app-electron/shared/agentMessage";
import { canLeadClose, planLeadSpawn } from "../src/agents/teamLead";
import { onAddAgentRequest } from "../src/agents/addAgentBus";
import type { LeadSpawnRequest } from "../app-electron/shared/leadCommands";

let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  send = vi.fn(async (): Promise<AgentSendResult> => ({ ok: true }));
  (window as unknown as { api: unknown }).api = { agentSend: send, memoryRead: vi.fn(async () => ({ ok: false, reason: "invalid" })) };
});
afterEach(cleanup);

const pane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const ws = (id: string, panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id,
  name: id,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  ...over
});
const leadPane = pane("L", { title: "Ayşe", agent: { engine: "axet-code", role: "Lider", roleKind: "preset" } });

function setup(workspaces: TerminalWorkspace[], extra: { events?: FlowEvent[]; approvals?: LeadApproval[] } = {}) {
  const commands = { revealPane: vi.fn(), enablePaneMemory: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces, activeWorkspaceId: workspaces[0]?.id ?? null },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet",
    setupRuns: {}
  };
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn() };
  const record = vi.fn();
  const answerApproval = vi.fn();
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <FlowContext.Provider value={{ ...EMPTY_FLOW, events: extra.events ?? [], approvals: extra.approvals ?? [], record, answerApproval }}>
            <FlowSidebar />
          </FlowContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { record, answerApproval };
}

const box = () => screen.getByRole("combobox", { name: "Ajana mesaj" }) as HTMLTextAreaElement;
async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}
const toTeam = () => {
  fireEvent.change(box(), { target: { value: "@ek", selectionStart: 3 } });
  fireEvent.keyDown(box(), { key: "Enter" });
};

describe("Akış — lider kartları", () => {
  it("açtı / görev / sonuç / kapattı / reddedildi çipleriyle", () => {
    const ev = (id: number, act: FlowEvent["act"], name: string, detail: string): FlowEvent => ({ id, at: id, workspaceId: "w1", kind: "relay", paneId: "L", name, detail, act });
    setup([ws("w1", [leadPane])], {
      events: [
        ev(1, "spawn", "Ayşe", "Test (Test)"),
        ev(2, "assign", "Ayşe → Test", "[G-ab12] README yaz"),
        ev(3, "result", "Test → Ayşe", "[G-ab12] yazildi"),
        ev(4, "close", "Ayşe", "Test"),
        ev(5, "denied", "Ayşe", "Analist (Analist)")
      ]
    });
    const cards = Array.from(document.querySelectorAll('[data-flow-event="relay"]')).map((c) => c.textContent ?? "");
    expect(cards[0]).toContain("Ayşe → yeni ajan açtı");
    expect(cards[0]).toContain("yeni ajan");
    expect(cards[0]).toContain("Test (Test)");
    expect(cards[1]).toContain("Ayşe → Test");
    expect(cards[1]).toContain("görev");
    expect(cards[2]).toContain("sonuç");
    expect(cards[3]).toContain("Ayşe → ajanı kapattı");
    expect(cards[4]).toContain("onaylanmadı");
  });

  it("onay kartı: Aç / Reddet cevabı iletir", () => {
    const item: LeadApproval = { requestId: "r1", workspaceId: "w1", leaderPaneId: "L", leader: "Ayşe", name: "Test", role: "Test", engine: null, task: "test yaz", at: 1 };
    const { answerApproval } = setup([ws("w1", [leadPane])], { approvals: [item, { ...item, requestId: "r2", workspaceId: "w2" }] });
    expect(document.querySelectorAll("[data-flow-approval]")).toHaveLength(1);
    expect(screen.getByText("Ayşe yeni ajan açmak istiyor: Test (Test)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(answerApproval).toHaveBeenCalledWith("r1", true);
    fireEvent.click(screen.getByRole("button", { name: "Reddet" }));
    expect(answerApproval).toHaveBeenCalledWith("r1", false);
  });

  it("lider açımı ajanın satırında işaret", () => {
    setup([ws("w1", [leadPane, pane("T", { title: "Test", agent: { engine: "claude", role: "Test", roleKind: "preset", spawnedBy: "L" } })])]);
    expect(document.querySelectorAll("[data-agent-spawned]")).toHaveLength(1);
    expect(screen.getByLabelText("Lider açtı (yalnız o kapatabilir)")).toBeTruthy();
  });
});

describe("Akış — @ekip ve Lider", () => {
  it("ekipte Lider varsa iş yalnız ona gider", async () => {
    const { record } = setup([ws("w1", [leadPane, pane("b", { title: "Ali" })])]);
    toTeam();
    fireEvent.change(box(), { target: { value: "README yaz" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send.mock.calls).toEqual([["w1", "L", "README yaz"]]);
    expect(record).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("İş Lider Ayşe ajanına gitti; ekibi o kurup dağıtacak.");
  });

  it("Lider yoksa herkese gider ve 'Lider ekle' önerilir; tık ekle penceresini Lider rolüyle ister", async () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" }), pane("b", { title: "Ali" })])]);
    toTeam();
    fireEvent.change(box(), { target: { value: "derle" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send).toHaveBeenCalledTimes(2);
    const seen: unknown[] = [];
    const off = onAddAgentRequest((o) => seen.push(o));
    fireEvent.click(screen.getByRole("button", { name: "Lider ekle" }));
    off();
    expect(seen).toEqual([{ lead: true }]);
  });
});

describe("renderer açılış/kapatma kuralları", () => {
  const state = (panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalState => ({
    ...initialTerminalState,
    phase: "ready",
    workspaces: [ws("w1", panes, over)],
    activeWorkspaceId: "w1"
  });
  const req = (over: Partial<LeadSpawnRequest> = {}): LeadSpawnRequest => ({
    workspaceId: "w1",
    paneId: "N1",
    name: "Test",
    role: "Test",
    roleKind: "preset",
    leaderPaneId: "L",
    leaderEngine: "axet-code",
    engine: null,
    ...over
  });

  it("alanın kökü, varsayılan motor, spawnedBy; serbest rol custom", () => {
    const plan = planLeadSpawn(state([leadPane], { root: "C:\\repo" }), req({ roleKind: "custom", role: "Veri göçü" }), "gemini", "C:\\axet");
    expect(plan).toEqual({
      ok: true,
      engine: "gemini",
      input: { spec: { engine: "gemini", role: "Veri göçü", roleKind: "custom", spawnedBy: "L" }, name: "Test", cwd: "C:\\repo" }
    });
  });

  it("kök yoksa liderin klasörü; varsayılan yetkiyi aşıyorsa liderin motoru", () => {
    const claudeLead = pane("L", { cwd: "C:\\lider", agent: { engine: "claude", role: "Lider", roleKind: "preset" } });
    const plan = planLeadSpawn(state([claudeLead]), req({ leaderEngine: "claude" }), "axet-code", "C:\\axet");
    expect(plan).toMatchObject({ ok: true, engine: "claude", input: { cwd: "C:\\lider" } });
  });

  it("lider yok / lider açımı / dolu alan / aynı kimlik reddediliyor", () => {
    expect(planLeadSpawn(state([pane("X")]), req({ leaderPaneId: "Y" }), null, "C:\\a")).toEqual({ ok: false, reason: "noLeader" });
    const spawned = pane("L", { agent: { engine: "axet-code", role: "Lider", roleKind: "preset", spawnedBy: "Z" } });
    expect(planLeadSpawn(state([spawned]), req(), null, "C:\\a")).toEqual({ ok: false, reason: "noLeader" });
    const many = [leadPane, ...Array.from({ length: 8 }, (_, i) => pane(`p${i}`))];
    expect(planLeadSpawn(state(many), req(), null, "C:\\a")).toEqual({ ok: false, reason: "full" });
    expect(planLeadSpawn(state([leadPane, pane("N1")]), req(), null, "C:\\a")).toEqual({ ok: false, reason: "exists" });
  });

  it("kapatma yalnız o liderin açtığında", () => {
    const s = state([leadPane, pane("T", { agent: { engine: "claude", role: "Test", roleKind: "preset", spawnedBy: "L" } }), pane("U")]);
    expect(canLeadClose(s, { workspaceId: "w1", paneId: "T", leaderPaneId: "L" })).toBe(true);
    expect(canLeadClose(s, { workspaceId: "w1", paneId: "T", leaderPaneId: "Q" })).toBe(false);
    expect(canLeadClose(s, { workspaceId: "w1", paneId: "U", leaderPaneId: "L" })).toBe(false);
    expect(canLeadClose(s, { workspaceId: "w2", paneId: "T", leaderPaneId: "L" })).toBe(false);
  });
});

describe("Tur 10: özel komutlu lider", () => {
  it("işçiyi liderin komutuyla açıyor; --continue atılıyor", () => {
    const azureLead = pane("L", { cwd: "C:\\lider", agent: { engine: "ozel", role: "Lider", roleKind: "preset", command: "azure --continue" } });
    const plan = planLeadSpawn(
      { ...initialTerminalState, phase: "ready", workspaces: [ws("w1", [azureLead])], activeWorkspaceId: "w1" },
      { workspaceId: "w1", paneId: "N1", name: "Geliştirici", role: "Geliştirici", roleKind: "preset", leaderPaneId: "L", leaderEngine: "ozel", engine: null },
      "axet-code",
      "C:\\axet"
    );
    expect(plan).toMatchObject({ ok: true, engine: "ozel", input: { spec: { engine: "ozel", command: "azure", spawnedBy: "L" } } });
  });
});
