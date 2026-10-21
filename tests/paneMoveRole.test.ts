// Tur 13: ajanı başka ekibe taşı (pty korunur) ve rolü değiştir.
import { describe, expect, it } from "vitest";
import { initialTerminalState, layoutOf, terminalReducer } from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState } from "../src/stores/terminalTypes";
import { leafIds } from "../app-electron/shared/terminalTree";
import { roleNeedsRestart } from "../src/agents/manageLogic";

const nameFor = (n: number) => `Alan ${n}`;
const run = (actions: TerminalAction[], from: TerminalState = initialTerminalState) => actions.reduce(terminalReducer, from);
const AXET = { engine: "axet-code" as const, role: "Lider", roleKind: "preset" as const };

function twoTeams(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor },
    { type: "addPane", workspaceId: "w1", paneId: "L", kind: "agent", cwd: "C:\\p", agent: AXET },
    { type: "addPane", workspaceId: "w1", paneId: "D", kind: "agent", cwd: "C:\\p", agent: { engine: "axet-code", role: "Test", roleKind: "preset", spawnedBy: "L" } },
    { type: "addPane", workspaceId: "w1", paneId: "E", kind: "agent", cwd: "C:\\p", agent: { engine: "claude", role: "Analist", roleKind: "custom", spawnedBy: "L" } },
    { type: "spawnStarted", paneId: "D", token: 1 },
    { type: "spawnSucceeded", paneId: "D", token: 1, ptyId: "pty-D" },
    { type: "addWorkspace", id: "w2", nameFor }
  ]);
}

describe("ekibe taşı", () => {
  it("bölme süreciyle (ptyId) birlikte taşınıyor; kaynak ağaçtan çıkıyor, hedefe giriyor; lider-açımı bağı kalkıyor", () => {
    const state = terminalReducer(twoTeams(), { type: "movePaneToWorkspace", paneId: "D", workspaceId: "w2" });
    const [w1, w2] = state.workspaces;
    expect(w1.panes.map((p) => p.id)).toEqual(["L", "E"]);
    expect(leafIds(layoutOf(w1))).not.toContain("D");
    const moved = w2.panes.find((p) => p.id === "D");
    expect(moved?.run).toEqual({ state: "running", ptyId: "pty-D" });
    expect(moved?.agent?.spawnedBy).toBeUndefined();
    expect(leafIds(layoutOf(w2))).toEqual(["D"]);
    expect(w2.focusedPaneId).toBe("D");
  });

  it("taşınan lider: kaynakta açtıklarının bağı da kalkıyor", () => {
    const state = terminalReducer(twoTeams(), { type: "movePaneToWorkspace", paneId: "L", workspaceId: "w2" });
    expect(state.workspaces[0].panes.every((p) => !p.agent?.spawnedBy)).toBe(true);
  });

  it("aynı ekip, olmayan ekip ya da dolu ekip: değişmiyor", () => {
    let full = twoTeams();
    for (let i = 0; i < 9; i++) full = terminalReducer(full, { type: "addPane", workspaceId: "w2", paneId: `x${i}`, kind: "cmd", cwd: "C:\\p" });
    expect(terminalReducer(full, { type: "movePaneToWorkspace", paneId: "D", workspaceId: "w2" })).toBe(full);
    const s = twoTeams();
    expect(terminalReducer(s, { type: "movePaneToWorkspace", paneId: "D", workspaceId: "w1" })).toBe(s);
    expect(terminalReducer(s, { type: "movePaneToWorkspace", paneId: "D", workspaceId: "yok" })).toBe(s);
  });
});

describe("rolü değiştir", () => {
  it("ajan bölmesinde rol etiketi değişiyor; kabukta yok sayılıyor", () => {
    let state = terminalReducer(twoTeams(), { type: "setPaneRole", paneId: "D", role: "  Gelistirici  " });
    expect(state.workspaces[0].panes.find((p) => p.id === "D")?.agent?.role).toBe("Gelistirici");
    state = terminalReducer(state, { type: "addPane", workspaceId: "w1", paneId: "k", kind: "cmd", cwd: "C:\\p" });
    expect(terminalReducer(state, { type: "setPaneRole", paneId: "k", role: "X" })).toBe(state);
  });

  it("yeniden başlatma gerekir mi: axet --agent ve Claude lideri evet, öteki etiket", () => {
    expect(roleNeedsRestart({ engine: "axet-code", role: "build", roleKind: "axetAgent" }, "plan")).toBe(true);
    expect(roleNeedsRestart({ engine: "axet-code", role: "Test", roleKind: "preset" }, "Lider")).toBe(false);
    expect(roleNeedsRestart({ engine: "claude", role: "Analist", roleKind: "custom" }, "Lider")).toBe(true);
    expect(roleNeedsRestart({ engine: "claude", role: "Lider", roleKind: "preset" }, "Test")).toBe(true);
    expect(roleNeedsRestart({ engine: "claude", role: "Analist", roleKind: "custom" }, "Test")).toBe(false);
    expect(roleNeedsRestart({ engine: "claude", role: "Analist", roleKind: "custom", spawnedBy: "L" }, "Lider")).toBe(false);
    expect(roleNeedsRestart({ engine: "axet-code", role: "build", roleKind: "axetAgent" }, "build")).toBe(false);
  });
});
