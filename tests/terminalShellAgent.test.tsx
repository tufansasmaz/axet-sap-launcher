// Tur 12: logon'dan açılan ajanın adı ve Akış işareti; kabukta başlatılan
// motorun bölmeyi geçici olarak ajan yapması (kalıcı düzende kabuk kalıyor).

import { describe, expect, it } from "vitest";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState } from "../src/stores/terminalTypes";
import { agentPanes } from "../src/agents/agentView";
import { agentName } from "../src/agents/agentLabels";

const nameFor = (n: number) => `Alan ${n}`;
const t = ((key: string) => key) as never;

function run(actions: TerminalAction[], from: TerminalState = initialTerminalState): TerminalState {
  return actions.reduce(terminalReducer, from);
}

function withShell(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor },
    { type: "addPane", workspaceId: "w1", paneId: "k", kind: "cmd", cwd: "C:\\p" },
    { type: "spawnStarted", paneId: "k", token: 1 },
    { type: "spawnSucceeded", paneId: "k", token: 1, ptyId: "pty-k" }
  ]);
}

const CLAUDE = { engine: "claude" as const, role: "", roleKind: "custom" as const };

describe("kabukta başlatılan motor", () => {
  it("kabuk bölmesi ajan sayılıyor, türü kabuk kalıyor", () => {
    const state = terminalReducer(withShell(), { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    const pane = state.workspaces[0].panes[0];
    expect(pane.kind).toBe("cmd");
    expect(pane.launched).toBe(true);
    expect(pane.agent).toEqual(CLAUDE);
    expect(agentPanes(state.workspaces[0]).map((p) => p.id)).toEqual(["k"]);
    expect(agentName(pane, t)).toBe("agents.engineClaude");
  });

  it("kalıcı düzene ajan alanı yazılmıyor (yeniden açılışta kabuk)", () => {
    const state = terminalReducer(withShell(), { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    const saved = toSaved(state).workspaces[0].panes[0];
    expect(saved.kind).toBe("cmd");
    expect(saved).not.toHaveProperty("agent");
    expect(saved).not.toHaveProperty("launched");
  });

  it("motor kapanınca kabuğa dönüyor", () => {
    let state = terminalReducer(withShell(), { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    state = terminalReducer(state, { type: "shellAgentEnded", paneId: "k" });
    const pane = state.workspaces[0].panes[0];
    expect(pane.launched).toBeUndefined();
    expect(pane.agent).toBeUndefined();
    expect(agentPanes(state.workspaces[0])).toHaveLength(0);
  });

  it("kabuk süreci kapanınca da ajan işareti siliniyor", () => {
    let state = terminalReducer(withShell(), { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    state = terminalReducer(state, { type: "ptyExit", ptyId: "pty-k", code: 0 });
    expect(state.workspaces[0].panes[0].launched).toBeUndefined();
  });

  it("gerçek ajan bölmesine dokunulmuyor; ikinci başlatma yok sayılıyor", () => {
    let state = run([{ type: "addPane", workspaceId: "w1", paneId: "a", kind: "agent", cwd: "C:\\p", agent: { engine: "axet-code", role: "", roleKind: "custom" } }], withShell());
    const before = state;
    state = terminalReducer(state, { type: "shellAgentStarted", paneId: "a", agent: CLAUDE });
    expect(state).toBe(before);
    state = terminalReducer(state, { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    const once = state;
    state = terminalReducer(state, { type: "shellAgentStarted", paneId: "k", agent: { ...CLAUDE, engine: "codex" } });
    expect(state).toBe(once);
    state = terminalReducer(state, { type: "shellAgentEnded", paneId: "a" });
    expect(state.workspaces[0].panes.find((p) => p.id === "a")?.agent?.engine).toBe("axet-code");
  });
});

describe("SAP logon'dan açılan ajan", () => {
  const ready = () =>
    run([
      { type: "setVisible", visible: true },
      { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
    ]);

  it("adı istenen başlık, 'sap' kaynağıyla işaretli; kalıcı düzende işaret yok", () => {
    const state = terminalReducer(ready(), {
      type: "addProjectPane",
      paneId: "a",
      spareWorkspaceId: "s",
      cwd: "C:\\SAP\\D01",
      nameFor,
      sap: { uuid: "u", label: "D01" },
      title: "D01 ajanı"
    });
    const pane = state.workspaces[0].panes[0];
    expect(pane.title).toBe("D01 ajanı");
    expect(pane.openedFrom).toBe("sap");
    const saved = toSaved(state).workspaces[0].panes[0];
    expect(saved.title).toBe("D01 ajanı");
    expect(saved).not.toHaveProperty("openedFrom");
  });
});

describe("kabukta başlatılan motor — yeniden başlatma", () => {
  it("bölme yeniden başlatılınca düz kabuk", () => {
    let state = terminalReducer(withShell(), { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    state = terminalReducer(state, { type: "restartPane", paneId: "k" });
    expect(state.workspaces[0].panes[0].launched).toBeUndefined();
    expect(state.workspaces[0].panes[0].agent).toBeUndefined();
  });
});

import { flowBody, paneOpenNotes, sapOpenedDetail } from "../src/agents/flowText";
import { translate } from "../src/i18n";
import type { FlowEvent } from "../src/agents/flowEvents";

describe("Akış notu — logon'dan açılan / kabukta başlatılan ajan", () => {
  const tr = ((k: string, p?: Record<string, string | number>) => translate("tr", k as never, p)) as never;
  const note = (detail: string): FlowEvent => ({ id: 1, at: 1, workspaceId: "w", kind: "note", paneId: "a", name: "D01 ajanı", detail });

  it("metin: SAP sistemi ve ekip", () => {
    expect(flowBody(note(sapOpenedDetail("D01", "Alan 1")), tr)).toBe("SAP D01 için ajan açıldı (Alan 1)");
    expect(flowBody(note("shellLaunched"), tr)).toBe("Kabukta başlatılan motor ajan olarak tanındı");
  });

  it("yalnız yeni bölmeler için; mevcutlar sessiz", () => {
    let state = terminalReducer(
      run([
        { type: "setVisible", visible: true },
        { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
      ]),
      { type: "addProjectPane", paneId: "a", spareWorkspaceId: "s", cwd: "C:\D01", nameFor, sap: { uuid: "u", label: "D01" }, title: "D01 ajanı" }
    );
    const first = paneOpenNotes(new Set(), state.workspaces, 5, () => "ad");
    expect(first).toEqual([{ at: 5, workspaceId: "w1", kind: "note", paneId: "a", name: "ad", detail: sapOpenedDetail("D01", "Alan 1") }]);
    expect(paneOpenNotes(new Set(["a"]), state.workspaces, 6, () => "ad")).toEqual([]);
    state = run(
      [
        { type: "addPane", workspaceId: "w1", paneId: "k", kind: "cmd", cwd: "C:\p" },
        { type: "spawnStarted", paneId: "k", token: 1 },
        { type: "spawnSucceeded", paneId: "k", token: 1, ptyId: "pty-k" },
        { type: "shellAgentStarted", paneId: "k", agent: CLAUDE }
      ],
      state
    );
    expect(paneOpenNotes(new Set(["a"]), state.workspaces, 7, () => "ad").map((e) => e.detail)).toEqual(["shellLaunched"]);
  });
});
