// @vitest-environment jsdom
// Akış sağlayıcısı (Tur 4): geçmiş yükle/yaz/temizle, ekip köprüsü kartı,
// açılış seçimindeki ajana kuyruk — seçim kapanınca kendiliğinden ve TEK kez.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { LanguageProvider } from "../src/i18n";
import { FlowProvider, useFlow, type FlowValue } from "../src/agents/flowContext";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { TeamRelayMessage } from "../app-electron/shared/flowHistory";

const WS = "w1";
const pane: TerminalPane = { id: "a", kind: "agent", agent: { engine: "axet-code", role: "", roleKind: "custom" }, cwd: "C:\\p", run: { state: "running", ptyId: "t" }, title: "Ayşe" };
const workspace: TerminalWorkspace = { id: WS, name: "Satış", panes: [pane], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false };

let api: Record<string, ReturnType<typeof vi.fn>>;
let relayListener: ((m: TeamRelayMessage) => void) | null = null;
beforeEach(() => {
  relayListener = null;
  api = {
    flowLoad: vi.fn(async () => [{ at: 10, kind: "message", paneId: "a", name: "Ayşe", detail: "eski mesaj" }]),
    flowSave: vi.fn(async () => true),
    flowClear: vi.fn(async () => true),
    agentSend: vi.fn(async () => ({ ok: true })),
    onTeamRelay: vi.fn((cb: (m: TeamRelayMessage) => void) => {
      relayListener = cb;
      return () => {};
    })
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(cleanup);

let current: FlowValue | null = null;
function Probe() {
  const flow = useFlow();
  useEffect(() => {
    current = flow;
  });
  return null;
}

function setup(statuses: Record<string, AgentStatus>) {
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [workspace], activeWorkspaceId: WS },
    commands: {} as TerminalCommands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a",
    setupRuns: {}
  };
  const ui = (s: Record<string, AgentStatus>) => {
    const value: AgentStatusValue = { statuses: s, engines: [], now: 1, answer: async () => ({ ok: false, reason: "noAgent" }) };
    return (
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={value}>
            <FlowProvider>
              <Probe />
            </FlowProvider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(ui(statuses));
  return { rerender: (s: Record<string, AgentStatus>) => r.rerender(ui(s)) };
}

describe("FlowProvider — Tur 4", () => {
  it("açılışta alanın geçmişi yükleniyor; yeni olay 1 sn sonra kalıcı kayda yazılıyor; temizle siliyor", async () => {
    setup({});
    await waitFor(() => expect(current?.events.map((e) => e.detail)).toEqual(["eski mesaj"]));
    expect(api.flowLoad).toHaveBeenCalledWith(WS);
    act(() => current!.record({ at: 20, workspaceId: WS, kind: "message", paneId: "a", name: "Ayşe", detail: "yeni" }));
    await waitFor(() => expect(api.flowSave).toHaveBeenCalled(), { timeout: 3000 });
    const [id, saved] = api.flowSave.mock.calls.at(-1) as [string, { detail: string }[]];
    expect(id).toBe(WS);
    expect(saved.map((e) => e.detail)).toEqual(["eski mesaj", "yeni"]);
    act(() => current!.clear(WS));
    expect(current!.events).toEqual([]);
    expect(api.flowClear).toHaveBeenCalledWith(WS);
  });

  it("ekip köprüsü olayı 'relay' olarak akışa düşüyor", async () => {
    setup({});
    await waitFor(() => expect(relayListener).not.toBeNull());
    act(() => relayListener!({ workspaceId: WS, paneId: "a", name: "Ayşe → Ali", detail: "durum?", at: 30 }));
    await waitFor(() => expect(current!.events.some((e) => e.kind === "relay" && e.name === "Ayşe → Ali")).toBe(true));
  });

  it("Tur 7: lider kartı act/toPaneId'yi taşıyor; kalıcı kayda da gidiyor", async () => {
    setup({});
    await waitFor(() => expect(relayListener).not.toBeNull());
    act(() => relayListener!({ workspaceId: WS, paneId: "a", name: "Ayşe → Ali", detail: "[G-ab12] yaz", at: 31, act: "assign", toPaneId: "b" }));
    await waitFor(() => expect(current!.events.some((e) => e.act === "assign" && e.toPaneId === "b")).toBe(true));
    await waitFor(() => expect(api.flowSave.mock.calls.some((c) => (c[1] as Array<{ act?: string }>).some((e) => e.act === "assign"))).toBe(true), { timeout: 3000 });
  });

  it("Tur 7: onay isteği kart olur, cevap team:reply ile gider ve kart kalkar", async () => {
    let approvalListener: ((r: unknown) => void) | null = null;
    api.onTeamApproval = vi.fn((cb: (r: unknown) => void) => {
      approvalListener = cb;
      return () => {};
    });
    api.teamReply = vi.fn(async () => {});
    setup({});
    await waitFor(() => expect(approvalListener).not.toBeNull());
    act(() => approvalListener!({ requestId: "r1", workspaceId: WS, leaderPaneId: "a", leader: "Ayşe", name: "Test", role: "Test", engine: null, task: "" }));
    await waitFor(() => expect(current!.approvals).toHaveLength(1));
    act(() => current!.answerApproval("r1", true));
    expect(api.teamReply).toHaveBeenCalledWith("r1", true);
    await waitFor(() => expect(current!.approvals).toHaveLength(0));
  });

  it("kuyruk: seçim penceresi açıkken gönderilmiyor; kapanınca bir kez gidiyor ve akışa yazılıyor", async () => {
    const setupStatus: AgentStatus = { state: "idle", source: "estimated", lastActivity: null, detail: "setup" };
    const { rerender } = setup({ a: setupStatus });
    await waitFor(() => expect(current).not.toBeNull());
    act(() => current!.queue({ workspaceId: WS, paneId: "a", name: "Ayşe", body: "derle" }));
    await new Promise((r) => setTimeout(r, 1000));
    expect(api.agentSend).not.toHaveBeenCalled();
    rerender({ a: { state: "idle", source: "estimated", lastActivity: null } });
    await waitFor(() => expect(api.agentSend).toHaveBeenCalledWith(WS, "a", "derle"), { timeout: 3000 });
    await waitFor(() => expect(current!.queued).toEqual([]));
    expect(current!.events.some((e) => e.kind === "message" && e.detail === "derle")).toBe(true);
    // Durum yeniden değişse de ikinci kez gitmiyor.
    rerender({ a: { state: "running", source: "estimated", lastActivity: 5 } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(api.agentSend).toHaveBeenCalledTimes(1);
  });

  it("kuyruktaki gönderim başarısızsa kendiliğinden yeniden denenmiyor; Yeniden gönder kullanıcıyla", async () => {
    api.agentSend.mockResolvedValueOnce({ ok: false, reason: "busy" });
    const { rerender } = setup({ a: { state: "idle", source: "estimated", lastActivity: null, detail: "setup" } });
    await waitFor(() => expect(current).not.toBeNull());
    act(() => current!.queue({ workspaceId: WS, paneId: "a", name: "Ayşe", body: "derle" }));
    rerender({ a: { state: "idle", source: "estimated", lastActivity: null } });
    await waitFor(() => expect(current!.queued[0]?.state).toBe("failed"), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 1000));
    expect(api.agentSend).toHaveBeenCalledTimes(1);
    act(() => current!.retryQueued("a"));
    await waitFor(() => expect(current!.queued).toEqual([]));
    expect(api.agentSend).toHaveBeenCalledTimes(2);
  });
});

describe("FlowProvider — Tur 8 açılış seçimi", () => {
  it("otomatik seçim akışa ajan başına bir kez sessiz not; başarısızlık ayrı kart; bildirim yok", async () => {
    let listener: ((m: unknown) => void) | null = null;
    api.onAgentAutoSetup = vi.fn((cb: (m: unknown) => void) => {
      listener = cb;
      return () => {};
    });
    setup({});
    await waitFor(() => expect(listener).not.toBeNull());
    act(() => listener!({ paneId: "a", ok: true, tool: "aXet.Code", model: "Claude Sonnet 5" }));
    act(() => listener!({ paneId: "a", ok: true, tool: "aXet.Code", model: "Claude Sonnet 5" }));
    act(() => listener!({ paneId: "yok", ok: true, tool: "aXet.Code", model: "" }));
    await waitFor(() => expect(current!.events.filter((e) => e.kind === "note")).toHaveLength(1));
    const done = current!.events.find((e) => e.kind === "note")!;
    expect(done).toMatchObject({ workspaceId: WS, paneId: "a", name: "Ayşe", detail: "autoSetup|aXet.Code|Claude Sonnet 5" });
    act(() => listener!({ paneId: "a", ok: false }));
    await waitFor(() => expect(current!.events.some((e) => e.detail === "autoSetupFailed")).toBe(true));
    expect(current!.notices).toEqual([]);
  });
});
