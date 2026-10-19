// SAP bağlanınca terminalde aç (2026-10-19): bağlantının klasöründe, o SAP
// bağlamına bağlı alanda ajan ya da kabuk bölmesi açılıyor ve odaklanıyor.
// Yeni kavram yok: alanın `root` + `sap` bağı TeamTabs'in "SAP'ye bağla"
// eylemiyle aynı şey.

import { describe, expect, it } from "vitest";
import { initialTerminalState, terminalReducer } from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState } from "../src/stores/terminalTypes";
import { LEGACY_AXET_AGENT } from "../app-electron/shared/agentTypes";

const nameFor = (n: number) => `Alan ${n}`;
const SAP = { uuid: "u-d01", label: "D01" };

function run(actions: TerminalAction[], from: TerminalState = initialTerminalState): TerminalState {
  return actions.reduce(terminalReducer, from);
}

function ready(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
  ]);
}

const sapPane = (paneId: string, spare: string, extra: Partial<Extract<TerminalAction, { type: "addProjectPane" }>> = {}): TerminalAction => ({
  type: "addProjectPane",
  paneId,
  spareWorkspaceId: spare,
  cwd: "C:\\SAP\\D01",
  nameFor,
  sap: SAP,
  ...extra
});

describe("addProjectPane + sap", () => {
  it("boş seçili alan SAP'ye bağlanıyor, kök bağlantı klasörü; ajan axet-code ve odakta", () => {
    const state = terminalReducer(ready(), sapPane("a", "s"));
    const ws = state.workspaces[0];
    expect(ws.sap).toEqual(SAP);
    expect(ws.root).toBe("C:\\SAP\\D01");
    expect(ws.panes[0]).toMatchObject({ id: "a", kind: "agent", agent: LEGACY_AXET_AGENT, cwd: "C:\\SAP\\D01" });
    expect(ws.focusedPaneId).toBe("a");
    expect(ws.view).toBe("panes");
    expect(state.activeWorkspaceId).toBe("w1");
  });

  it("kabuk istenirse ajan değil kabuk bölmesi", () => {
    const state = terminalReducer(ready(), sapPane("k", "s", { shell: "powershell" }));
    const pane = state.workspaces[0].panes[0];
    expect(pane.kind).toBe("powershell");
    expect(pane.agent).toBeUndefined();
  });

  it("aynı sisteme bağlı alan varsa oraya ekliyor ve onu seçiyor", () => {
    let state = terminalReducer(ready(), sapPane("a", "s"));
    state = terminalReducer(state, { type: "addWorkspace", id: "w2", nameFor });
    expect(state.activeWorkspaceId).toBe("w2");
    state = terminalReducer(state, sapPane("b", "s2"));
    expect(state.activeWorkspaceId).toBe("w1");
    expect(state.workspaces.find((w) => w.id === "w1")?.panes.map((p) => p.id)).toEqual(["a", "b"]);
    expect(state.workspaces.find((w) => w.id === "w2")?.panes).toHaveLength(0);
  });

  it("seçili alan dolu ve bağsızsa yeni, bağlı bir alan açıyor (başkasının alanına SAP bağı eklenmiyor)", () => {
    let state = run([{ type: "addPane", workspaceId: "w1", paneId: "x", kind: "cmd", cwd: "C:\\a" }], ready());
    state = terminalReducer(state, sapPane("a", "s"));
    expect(state.workspaces.find((w) => w.id === "w1")?.sap).toBeUndefined();
    const fresh = state.workspaces.find((w) => w.id === "s");
    expect(fresh?.sap).toEqual(SAP);
    expect(fresh?.panes.map((p) => p.id)).toEqual(["a"]);
    expect(state.activeWorkspaceId).toBe("s");
  });

  it("alan Pano/Ofis görünümündeyse bölmelere çevriliyor (yeni bölme görünsün)", () => {
    let state = terminalReducer(ready(), sapPane("a", "s"));
    state = terminalReducer(state, { type: "setWorkspaceView", id: "w1", view: "board" });
    state = terminalReducer(state, sapPane("b", "s2"));
    expect(state.workspaces[0].view).toBe("panes");
  });

  it("şerit kararı beklenirken bekletiliyor ve sap bilgisiyle yerleşiyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p0", kind: "cmd" as const, cwd: "C:\\a" }] }];
    let state = run([{ type: "open", saved, activeId: "a", freshId: "x", nameFor }, sapPane("bekleyen", "s")]);
    expect(state.pending).toHaveLength(1);
    state = terminalReducer(state, { type: "restore", nameFor });
    const bound = state.workspaces.find((w) => w.sap?.uuid === SAP.uuid);
    expect(bound?.panes.map((p) => p.id)).toEqual(["bekleyen"]);
  });

  it("sap yoksa eski davranış aynen (seçili alana, bağ yok)", () => {
    const state = terminalReducer(ready(), { type: "addProjectPane", paneId: "x", spareWorkspaceId: "s", cwd: "C:\\p", nameFor });
    expect(state.workspaces[0].sap).toBeUndefined();
    expect(state.workspaces[0].root).toBeUndefined();
  });
});
