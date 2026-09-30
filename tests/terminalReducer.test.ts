// Terminal modunun saf indirgeyicisi (spec §4.2, §5). React'sız.

import { describe, expect, it } from "vitest";
import {
  initialTerminalState,
  liveCount,
  nextToStart,
  paneByPty,
  paneTone,
  terminalReducer,
  toSaved,
  workspaceDot
} from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;

function run(actions: TerminalAction[], from: TerminalState = initialTerminalState): TerminalState {
  return actions.reduce(terminalReducer, from);
}

// Görünür, tek boş alanlı hazır durum.
function ready(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
  ]);
}

function withPanes(count: number, from = ready()): TerminalState {
  const actions: TerminalAction[] = Array.from({ length: count }, (_, i) => ({
    type: "addPane",
    workspaceId: "w1",
    paneId: `p${i + 1}`,
    kind: "cmd",
    cwd: "C:\\a"
  }));
  return run(actions, from);
}

function runningPane(state: TerminalState, paneId: string, ptyId: string): TerminalState {
  return run(
    [
      { type: "spawnStarted", paneId, token: 1 },
      { type: "spawnSucceeded", paneId, token: 1, ptyId }
    ],
    state
  );
}

describe("açılış", () => {
  it("kayıtlı düzen yoksa tek boş alan", () => {
    const state = ready();
    expect(state.phase).toBe("ready");
    expect(state.workspaces.map((w) => [w.id, w.name, w.panes.length])).toEqual([["w1", "Alan 1", 0]]);
    expect(state.activeWorkspaceId).toBe("w1");
  });

  it("kayıtlı düzen varsa önce şerit; geri yükle bölmeleri sıraya koyuyor ve seçili alanı getiriyor", () => {
    const saved = [
      { id: "a", name: "A", panes: [{ id: "p1", kind: "axet" as const, cwd: "C:\\a" }] },
      { id: "b", name: "B", panes: [{ id: "p2", kind: "cmd" as const, cwd: "C:\\b" }] }
    ];
    const prompt = run([{ type: "open", saved, activeId: "b", freshId: "x", nameFor }]);
    expect(prompt.phase).toBe("restorePrompt");
    expect(prompt.workspaces).toEqual([]);
    const restored = terminalReducer(prompt, { type: "restore", nameFor });
    expect(restored.phase).toBe("ready");
    expect(restored.activeWorkspaceId).toBe("b");
    expect(restored.workspaces[0].panes[0].run).toEqual({ state: "queued" });
    expect(restored.workspaces[0].focusedPaneId).toBe("p1");
  });

  it("yalnız boş alanlardan oluşan düzen şerit sormadan açılıyor", () => {
    const saved = [
      { id: "a", name: "A", panes: [] },
      { id: "b", name: "B", panes: [] }
    ];
    const state = run([{ type: "open", saved, activeId: "b", freshId: "x", nameFor }]);
    expect(state.phase).toBe("ready");
    expect(state.workspaces.map((w) => w.name)).toEqual(["A", "B"]);
    expect(state.activeWorkspaceId).toBe("b");
  });

  it("boş başla tek boş alan açıyor; ikinci open bir şey yapmıyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p", kind: "cmd" as const, cwd: "C:\\a" }] }];
    const fresh = run([
      { type: "open", saved, activeId: null, freshId: "x", nameFor },
      { type: "startFresh", freshId: "y", nameFor },
      { type: "open", saved, activeId: null, freshId: "z", nameFor }
    ]);
    expect(fresh.workspaces.map((w) => w.id)).toEqual(["y"]);
    expect(fresh.phase).toBe("ready");
  });
});

describe("alanlar", () => {
  it("ekle, seç, yeniden adlandır; boş ad kabul edilmiyor", () => {
    const state = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "renameWorkspace", id: "w2", name: "  QA  " },
        { type: "renameWorkspace", id: "w2", name: "   " }
      ],
      ready()
    );
    expect(state.workspaces.map((w) => w.name)).toEqual(["Alan 1", "QA"]);
    expect(state.activeWorkspaceId).toBe("w2");
  });

  it("en fazla 6 alan", () => {
    const actions: TerminalAction[] = Array.from({ length: 8 }, (_, i) => ({ type: "addWorkspace", id: `n${i}`, nameFor }));
    expect(run(actions, ready()).workspaces).toHaveLength(6);
  });

  it("seçili alan kapanınca komşusu seçiliyor; sonuncusu kapanınca yeni boş alan", () => {
    let state = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "addWorkspace", id: "w3", nameFor },
        { type: "selectWorkspace", id: "w2" },
        { type: "closeWorkspace", id: "w2", freshId: "f", nameFor }
      ],
      ready()
    );
    expect(state.activeWorkspaceId).toBe("w3");
    state = run(
      [
        { type: "closeWorkspace", id: "w1", freshId: "f", nameFor },
        { type: "closeWorkspace", id: "w3", freshId: "f", nameFor }
      ],
      state
    );
    expect(state.workspaces.map((w) => [w.id, w.name])).toEqual([["f", "Alan 1"]]);
    expect(state.activeWorkspaceId).toBe("f");
  });
});

describe("bölmeler", () => {
  it("en fazla 9 bölme, eklenen odaklanıyor ve sırada bekliyor", () => {
    const state = withPanes(11);
    const ws = state.workspaces[0];
    expect(ws.panes).toHaveLength(9);
    expect(ws.focusedPaneId).toBe("p9");
    expect(ws.panes[0].run).toEqual({ state: "queued" });
  });

  it("şerit açıkken bölme ve alan eklenmiyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p0", kind: "cmd" as const, cwd: "C:\\a" }] }];
    const prompt = run([{ type: "open", saved, activeId: null, freshId: "x", nameFor }]);
    const after = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "addPane", workspaceId: "a", paneId: "p", kind: "cmd", cwd: "C:\\a" }
      ],
      prompt
    );
    expect(after).toBe(prompt);
  });

  it("kapatma odağı komşuya, büyütmeyi sıfıra alıyor", () => {
    const state = run(
      [
        { type: "toggleMaximize", paneId: "p2" },
        { type: "closePane", paneId: "p2" }
      ],
      withPanes(3)
    );
    const ws = state.workspaces[0];
    expect(ws.panes.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(ws.focusedPaneId).toBe("p3");
    expect(ws.maximizedPaneId).toBeNull();
  });

  it("büyüt iki kez basınca geri; yeni bölme büyütmeyi kaldırıyor", () => {
    let state = terminalReducer(withPanes(2), { type: "toggleMaximize", paneId: "p1" });
    expect(state.workspaces[0].maximizedPaneId).toBe("p1");
    state = terminalReducer(state, { type: "toggleMaximize", paneId: "p1" });
    expect(state.workspaces[0].maximizedPaneId).toBeNull();
    state = run(
      [
        { type: "toggleMaximize", paneId: "p1" },
        { type: "addPane", workspaceId: "w1", paneId: "p9", kind: "cmd", cwd: "C:\\a" }
      ],
      state
    );
    expect(state.workspaces[0].maximizedPaneId).toBeNull();
  });

  it("yeniden başlatma sıraya koyuyor, verilirse klasörü değiştiriyor", () => {
    const state = run(
      [
        { type: "spawnStarted", paneId: "p1", token: 1 },
        { type: "spawnFailed", paneId: "p1", token: 1, message: "", missingDir: true },
        { type: "restartPane", paneId: "p1", cwd: "C:\\yeni" }
      ],
      withPanes(1)
    );
    expect(state.workspaces[0].panes[0]).toMatchObject({ cwd: "C:\\yeni", run: { state: "queued" } });
  });
});

describe("başlatma", () => {
  it("aynı anda en fazla 2; seçili alan önce", () => {
    let state = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "addPane", workspaceId: "w2", paneId: "q1", kind: "cmd", cwd: "C:\\a" },
        { type: "selectWorkspace", id: "w1" }
      ],
      withPanes(3)
    );
    state = run([{ type: "selectWorkspace", id: "w2" }], state);
    expect(nextToStart(state).map((p) => p.id)).toEqual(["q1", "p1"]);
    state = run([{ type: "spawnStarted", paneId: "q1", token: 1 }], state);
    expect(nextToStart(state).map((p) => p.id)).toEqual(["p1"]);
    state = run([{ type: "spawnStarted", paneId: "p1", token: 2 }], state);
    expect(nextToStart(state)).toEqual([]);
  });

  it("şerit açıkken hiçbir şey başlamıyor", () => {
    const prompt = run([
      { type: "open", saved: [{ id: "a", name: "A", panes: [{ id: "p", kind: "cmd", cwd: "C:\\a" }] }], activeId: null, freshId: "x", nameFor }
    ]);
    expect(nextToStart(prompt)).toEqual([]);
  });

  it("başka denemenin sonucu yok sayılıyor", () => {
    const state = run(
      [
        { type: "spawnStarted", paneId: "p1", token: 1 },
        { type: "restartPane", paneId: "p1" },
        { type: "spawnStarted", paneId: "p1", token: 2 },
        { type: "spawnSucceeded", paneId: "p1", token: 1, ptyId: "eski" }
      ],
      withPanes(1)
    );
    expect(state.workspaces[0].panes[0].run).toEqual({ state: "starting", token: 2 });
  });

  it("başarı çalışıyor, çıkış kodla kapanıyor ve pty kimliği kalıyor", () => {
    let state = runningPane(withPanes(1), "p1", "t1");
    expect(paneByPty(state, "t1")?.pane.id).toBe("p1");
    expect(liveCount(state.workspaces[0])).toBe(1);
    state = terminalReducer(state, { type: "ptyExit", ptyId: "t1", code: 0 });
    expect(state.workspaces[0].panes[0].run).toEqual({ state: "exited", ptyId: "t1", code: 0 });
    expect(liveCount(state.workspaces[0])).toBe(0);
  });
});

describe("noktalar", () => {
  // w1'de çalışan bir bölme, sonra w2 seçiliyor: w1 görünmez.
  function hiddenW1(): TerminalState {
    return run([{ type: "addWorkspace", id: "w2", nameFor }], runningPane(withPanes(1), "p1", "t1"));
  }

  it("görünmeyen alana çıktı mavi; görünür olunca siliniyor", () => {
    let state = terminalReducer(hiddenW1(), { type: "ptyData", ptyId: "t1" });
    expect(workspaceDot(state.workspaces[0])).toBe("unread");
    state = terminalReducer(state, { type: "selectWorkspace", id: "w1" });
    expect(workspaceDot(state.workspaces[0])).toBeNull();
  });

  it("görünür alana çıktı bayrak koymuyor ve durumu değiştirmiyor", () => {
    const state = runningPane(withPanes(1), "p1", "t1");
    expect(terminalReducer(state, { type: "ptyData", ptyId: "t1" })).toBe(state);
  });

  it("mod gizliyken seçili alan da görünmez sayılıyor; mod açılınca silinir", () => {
    let state = run(
      [
        { type: "setVisible", visible: false },
        { type: "ptyData", ptyId: "t1" }
      ],
      runningPane(withPanes(1), "p1", "t1")
    );
    expect(workspaceDot(state.workspaces[0])).toBe("unread");
    state = terminalReducer(state, { type: "setVisible", visible: true });
    expect(workspaceDot(state.workspaces[0])).toBeNull();
  });

  it("sıfırdan farklı çıkış ve başlatılamama kırmızı; kırmızı maviden önce", () => {
    let state = run(
      [
        { type: "ptyData", ptyId: "t1" },
        { type: "ptyExit", ptyId: "t1", code: 1 }
      ],
      hiddenW1()
    );
    expect(workspaceDot(state.workspaces[0])).toBe("error");
    expect(paneTone(state.workspaces[0].panes[0].run)).toBe("error");
    state = run(
      [
        { type: "addPane", workspaceId: "w2", paneId: "q", kind: "cmd", cwd: "C:\\a" },
        { type: "selectWorkspace", id: "w1" },
        { type: "spawnStarted", paneId: "q", token: 5 },
        { type: "spawnFailed", paneId: "q", token: 5, message: "yok", missingDir: false }
      ],
      state
    );
    expect(workspaceDot(state.workspaces[1])).toBe("error");
  });

  it("bölme tonu", () => {
    expect(paneTone({ state: "running", ptyId: "x" })).toBe("running");
    expect(paneTone({ state: "exited", ptyId: "x", code: 0 })).toBe("stopped");
    expect(paneTone({ state: "queued" })).toBe("stopped");
    expect(paneTone({ state: "starting", token: 1 })).toBe("stopped");
    expect(paneTone({ state: "missingDir" })).toBe("error");
    expect(paneTone({ state: "failed", message: "" })).toBe("error");
  });
});

describe("AXET projesi bölmesi (spec §5.5)", () => {
  const project = (paneId: string, spare: string): TerminalAction => ({
    type: "addProjectPane",
    paneId,
    spareWorkspaceId: spare,
    cwd: "C:\\proje",
    nameFor
  });

  it("seçili alana axet bölmesi ekliyor", () => {
    const pane = terminalReducer(ready(), project("x", "s")).workspaces[0].panes[0];
    expect(pane).toMatchObject({ id: "x", kind: "axet", cwd: "C:\\proje" });
  });

  it("alan doluysa yeni alan açıp oraya ekliyor", () => {
    const state = terminalReducer(withPanes(9), project("x", "s"));
    expect(state.workspaces.map((w) => [w.id, w.name])).toEqual([
      ["w1", "Alan 1"],
      ["s", "Alan 2"]
    ]);
    expect(state.activeWorkspaceId).toBe("s");
  });

  it("6 alan da doluysa sınır sayacı artıyor", () => {
    let state = ready();
    for (let i = 2; i <= 6; i += 1) state = terminalReducer(state, { type: "addWorkspace", id: `w${i}`, nameFor });
    for (const ws of state.workspaces) {
      for (let j = 0; j < 9; j += 1) {
        state = terminalReducer(state, { type: "addPane", workspaceId: ws.id, paneId: `${ws.id}-${j}`, kind: "cmd", cwd: "C:\\a" });
      }
    }
    state = terminalReducer(state, project("son", "yok"));
    expect(state.limitHits).toBe(1);
    expect(state.workspaces).toHaveLength(6);
    expect(state.workspaces.every((w) => w.panes.length === 9)).toBe(true);
  });

  it("şerit açıkken bekletiliyor, karardan sonra ekleniyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p0", kind: "cmd" as const, cwd: "C:\\a" }] }];
    let state = run([
      { type: "open", saved, activeId: "a", freshId: "x", nameFor },
      project("bekleyen", "s")
    ]);
    expect(state.pending).toHaveLength(1);
    state = terminalReducer(state, { type: "restore", nameFor });
    expect(state.pending).toEqual([]);
    expect(state.workspaces[0].panes.map((p) => p.id)).toEqual(["p0", "bekleyen"]);
  });

  it("mod hiç açılmadan gelirse de bekletiliyor", () => {
    const state = terminalReducer(initialTerminalState, project("erken", "s"));
    expect(state.pending.map((p) => p.paneId)).toEqual(["erken"]);
  });
});

describe("toSaved", () => {
  it("yalnız ad, tür, klasör; çalışma durumu yok", () => {
    const state = runningPane(withPanes(1), "p1", "t1");
    expect(toSaved(state)).toEqual({
      workspaces: [{ id: "w1", name: "Alan 1", panes: [{ id: "p1", kind: "cmd", cwd: "C:\\a" }] }],
      activeId: "w1"
    });
  });
});
