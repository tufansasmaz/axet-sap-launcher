// Tur 13: kabukta başlatılan ajana rol ve bellek. Bölme türü kabuk kalıyor;
// bölme başına kalıcı küçük kayıt (shellAgent: rol + bellek anahtarı).
import { describe, expect, it } from "vitest";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState } from "../src/stores/terminalTypes";
import { normalizeTerminalWorkspaces } from "../app-electron/shared/terminalLayout";
import { memoryTarget, takenMemoryKeys } from "../app-electron/shared/memoryLogic";

const nameFor = (n: number) => `Alan ${n}`;
const run = (actions: TerminalAction[], from: TerminalState = initialTerminalState) => actions.reduce(terminalReducer, from);
const CLAUDE = { engine: "claude" as const, role: "", roleKind: "custom" as const };

function withShell(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor },
    { type: "addPane", workspaceId: "w1", paneId: "k", kind: "cmd", cwd: "C:\\p", title: "Kabuk" },
    { type: "spawnStarted", paneId: "k", token: 1 },
    { type: "spawnSucceeded", paneId: "k", token: 1, ptyId: "pty-k" }
  ]);
}

describe("kabuk ajanına rol ver", () => {
  it("rol ve bellek bölmeye yazılıyor; tür kabuk; kalıcı düzende duruyor", () => {
    const state = terminalReducer(withShell(), { type: "setShellAgent", paneId: "k", role: "Analist", memory: true });
    const pane = state.workspaces[0].panes[0];
    expect(pane.kind).toBe("cmd");
    expect(pane.shellAgent?.role).toBe("Analist");
    expect(pane.shellAgent?.memory).toMatch(/^[a-z0-9-]+$/);
    const saved = toSaved(state).workspaces[0].panes[0];
    expect(saved.kind).toBe("cmd");
    expect(saved.shellAgent).toEqual(pane.shellAgent);
    expect(saved).not.toHaveProperty("agent");
  });

  it("motor açıkken rol verilince ajan tanımı da güncelleniyor; sonraki başlatma kaydı kullanıyor", () => {
    let state = terminalReducer(withShell(), { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    state = terminalReducer(state, { type: "setShellAgent", paneId: "k", role: "Test", memory: true });
    const pane = state.workspaces[0].panes[0];
    expect(pane.agent?.role).toBe("Test");
    expect(pane.agent?.memory).toBe(pane.shellAgent?.memory);
    state = terminalReducer(state, { type: "shellAgentEnded", paneId: "k" });
    expect(state.workspaces[0].panes[0].shellAgent?.role).toBe("Test");
    state = terminalReducer(state, { type: "shellAgentStarted", paneId: "k", agent: CLAUDE });
    expect(state.workspaces[0].panes[0].agent).toMatchObject({ engine: "claude", role: "Test", memory: pane.shellAgent?.memory });
  });

  it("bellek kapatılınca anahtar kalmıyor; boş rol ve bellek kapalı → kayıt siliniyor", () => {
    let state = terminalReducer(withShell(), { type: "setShellAgent", paneId: "k", role: "Analist", memory: true });
    const key = state.workspaces[0].panes[0].shellAgent?.memory;
    state = terminalReducer(state, { type: "setShellAgent", paneId: "k", role: "Analist", memory: true });
    expect(state.workspaces[0].panes[0].shellAgent?.memory).toBe(key);
    state = terminalReducer(state, { type: "setShellAgent", paneId: "k", role: "Analist", memory: false });
    expect(state.workspaces[0].panes[0].shellAgent).toEqual({ role: "Analist" });
    state = terminalReducer(state, { type: "setShellAgent", paneId: "k", role: "  ", memory: false });
    expect(state.workspaces[0].panes[0].shellAgent).toBeUndefined();
  });

  it("ajan bölmesine setShellAgent yok sayılıyor", () => {
    const state = run([{ type: "addPane", workspaceId: "w1", paneId: "a", kind: "agent", cwd: "C:\\p", agent: { engine: "axet-code", role: "", roleKind: "custom" } }], withShell());
    expect(terminalReducer(state, { type: "setShellAgent", paneId: "a", role: "X", memory: false })).toBe(state);
  });

  it("kayıttan okuma: kabukta geçerli kayıt kalıyor, bozuğu ve ajan türündeki atılıyor", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [
          { id: "k1", kind: "cmd", cwd: "C:\\p", shellAgent: { role: "Analist", memory: "analist" } },
          { id: "k2", kind: "powershell", cwd: "C:\\p", shellAgent: { role: 5, memory: "../x" } },
          { id: "a1", kind: "agent", cwd: "C:\\p", agent: { engine: "claude", role: "" }, shellAgent: { role: "Y" } }
        ]
      }
    ];
    const panes = normalizeTerminalWorkspaces(raw, nameFor)[0].panes;
    expect(panes[0].shellAgent).toEqual({ role: "Analist", memory: "analist" });
    expect(panes[1].shellAgent).toBeUndefined();
    expect(panes[2].shellAgent).toBeUndefined();
  });

  it("bellek hedefi ve anahtar tekilliği kabuk kaydını da sayıyor", () => {
    const workspaces = [{ id: "w1", name: "A", root: "C:\\kok", panes: [{ id: "k1", kind: "cmd" as const, cwd: "C:\\p", title: "Kabuk", shellAgent: { role: "Analist", memory: "analist" } }] }];
    expect(memoryTarget(workspaces, "w1", "k1")).toEqual({ root: "C:\\kok", key: "analist", name: "Kabuk" });
    expect(takenMemoryKeys(workspaces).has("analist")).toBe(true);
  });
});

describe("ekip üyeleri: kabukta açılan motor da sayılıyor", () => {
  it("canlı kayıtlı kabuk rolüyle üye; motoru kapalı kabuk üye değil", async () => {
    const { teamAgentPanes } = await import("../app-electron/shared/terminalLayout");
    const ws = {
      id: "w1",
      name: "A",
      panes: [
        { id: "a1", kind: "agent" as const, cwd: "C:\p", agent: { engine: "claude" as const, role: "Lider", roleKind: "preset" as const } },
        { id: "k1", kind: "cmd" as const, cwd: "C:\p", title: "Kabuk", shellAgent: { role: "Analist" } },
        { id: "k2", kind: "powershell" as const, cwd: "C:\p" }
      ]
    };
    const live = (id: string) => (id === "k1" ? ("axet-code" as const) : null);
    expect(teamAgentPanes(ws, live).map((m) => [m.paneId, m.role, m.engine])).toEqual([
      ["a1", "Lider", "claude"],
      ["k1", "Analist", "axet-code"]
    ]);
  });
});
