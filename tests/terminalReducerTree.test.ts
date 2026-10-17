// İndirgeyicide bölme ağacı (spec 2026-10-14 §3–4). React'sız.
import { describe, expect, it } from "vitest";
import { assertLayout, leafIds } from "../app-electron/shared/terminalTree";
import { initialTerminalState, layoutOf, minimizedOf, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;
const run = (actions: TerminalAction[], from: TerminalState = initialTerminalState) => actions.reduce(terminalReducer, from);

function ready(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
  ]);
}
const add = (paneId: string, split?: { targetPaneId: string; dir: "row" | "column" }): TerminalAction => ({
  type: "addPane",
  workspaceId: "w1",
  paneId,
  kind: "cmd",
  cwd: "C:\\a",
  split
});
const ws = (state: TerminalState): TerminalWorkspace => state.workspaces[0];

/** Ağaçtaki yapraklar + küçültülenler = bölmeler (spec §3.1 değişmezi). */
function consistent(state: TerminalState) {
  for (const w of state.workspaces) {
    const visible = leafIds(layoutOf(w));
    const hidden = minimizedOf(w).map((m) => m.paneId);
    assertLayout(layoutOf(w), visible);
    expect([...visible, ...hidden].sort()).toEqual(w.panes.map((p) => p.id).sort());
    expect(w.focusedPaneId === null || visible.includes(w.focusedPaneId)).toBe(true);
  }
}

describe("addPane ağaçla", () => {
  it("ilk bölme kök; sonrakiler odaktakinin sağına; split yönü ve hedefi uyuluyor", () => {
    let state = run([add("p1"), add("p2")], ready());
    expect(layoutOf(ws(state))).toEqual({
      type: "split",
      dir: "row",
      children: [{ type: "pane", paneId: "p1" }, { type: "pane", paneId: "p2" }],
      sizes: [0.5, 0.5]
    });
    state = terminalReducer(state, add("p3", { targetPaneId: "p1", dir: "column" }));
    const root = layoutOf(ws(state));
    expect(root?.type === "split" && root.children[0]).toEqual({
      type: "split",
      dir: "column",
      children: [{ type: "pane", paneId: "p1" }, { type: "pane", paneId: "p3" }],
      sizes: [0.5, 0.5]
    });
    expect(ws(state).focusedPaneId).toBe("p3");
    consistent(state);
  });

  it("hedef küçültülmüşse yeni bölme yine görünür bir yere açılıyor (inceleme odağı 2)", () => {
    const state = run([add("p1"), add("p2"), { type: "minimizePane", paneId: "p2" }, add("p3", { targetPaneId: "p2", dir: "row" })], ready());
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p1", "p3"]);
    consistent(state);
  });

  it("bütün bölmeler küçültülünce ağaç boş, ekleme yine çalışıyor (inceleme odağı 3)", () => {
    let state = run([add("p1"), add("p2"), { type: "minimizePane", paneId: "p1" }, { type: "minimizePane", paneId: "p2" }], ready());
    expect(layoutOf(ws(state))).toBeNull();
    expect(ws(state).focusedPaneId).toBeNull();
    state = terminalReducer(state, add("p3"));
    expect(layoutOf(ws(state))).toEqual({ type: "pane", paneId: "p3" });
    consistent(state);
  });
});

describe("küçült / geri getir", () => {
  it("eski yerine dönüyor; odak ve büyütme kuralları", () => {
    let state = run([add("p1"), add("p2"), add("p3"), { type: "toggleMaximize", paneId: "p2" }], ready());
    state = terminalReducer(state, { type: "minimizePane", paneId: "p2" });
    expect(ws(state).maximizedPaneId).toBeNull(); // inceleme odağı 5
    expect(ws(state).focusedPaneId).toBe("p3"); // adresteki kardeş
    expect(minimizedOf(ws(state))).toEqual([{ paneId: "p2", home: { siblingPaneId: "p3", side: "left" } }]);
    consistent(state);
    state = terminalReducer(state, { type: "restorePane", paneId: "p2" });
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p1", "p2", "p3"]);
    expect(ws(state).focusedPaneId).toBe("p2");
    expect(minimizedOf(ws(state))).toEqual([]);
    consistent(state);
  });

  it("küçültülmüş bölmeye odak ve büyütme gitmiyor; ikinci küçültme ve bilinmeyen geri getirme etkisiz", () => {
    const state = run([add("p1"), add("p2"), { type: "minimizePane", paneId: "p2" }], ready());
    expect(terminalReducer(state, { type: "focusPane", paneId: "p2" })).toBe(state);
    expect(terminalReducer(state, { type: "toggleMaximize", paneId: "p2" })).toBe(state);
    expect(terminalReducer(state, { type: "minimizePane", paneId: "p2" })).toBe(state);
    expect(terminalReducer(state, { type: "restorePane", paneId: "p1" })).toBe(state);
  });

  it("küçültülmüş bölmeye çıktı gelince sekmede nokta; geri gelince siliniyor", () => {
    let state = run(
      [
        add("p1"),
        add("p2"),
        { type: "spawnStarted", paneId: "p2", token: 1 },
        { type: "spawnSucceeded", paneId: "p2", token: 1, ptyId: "t2" },
        { type: "minimizePane", paneId: "p2" },
        { type: "ptyData", ptyId: "t2" }
      ],
      ready()
    );
    expect(minimizedOf(ws(state))[0].unread).toBe(true);
    expect(terminalReducer(state, { type: "ptyData", ptyId: "t2" })).toBe(state);
    state = terminalReducer(state, { type: "restorePane", paneId: "p2" });
    expect(minimizedOf(ws(state))).toEqual([]);
  });

  it("kapatma ağaçtan da küçültülenlerden de çıkarıyor", () => {
    let state = run([add("p1"), add("p2"), add("p3"), { type: "minimizePane", paneId: "p3" }], ready());
    state = run([{ type: "closePane", paneId: "p3" }, { type: "closePane", paneId: "p1" }], state);
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p2"]);
    expect(minimizedOf(ws(state))).toEqual([]);
    expect(ws(state).focusedPaneId).toBe("p2");
    consistent(state);
  });
});

describe("taşıma ve boyut", () => {
  it("orta yer değiştiriyor, kenar taşıyor; büyütme kalkıyor, odak sürüklenende", () => {
    let state = run([add("p1"), add("p2"), add("p3"), { type: "toggleMaximize", paneId: "p1" }], ready());
    state = terminalReducer(state, { type: "movePane", paneId: "p1", targetPaneId: "p3", zone: "center" });
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p3", "p2", "p1"]);
    expect(ws(state).maximizedPaneId).toBeNull();
    expect(ws(state).focusedPaneId).toBe("p1");
    state = terminalReducer(state, { type: "movePane", paneId: "p3", targetPaneId: "p1", zone: "bottom" });
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p2", "p1", "p3"]);
    consistent(state);
  });

  it("kapanmış bölmeye ya da kendine bırakma aynı durumu döndürüyor (inceleme odağı 4)", () => {
    const state = run([add("p1"), add("p2"), { type: "closePane", paneId: "p2" }], ready());
    expect(terminalReducer(state, { type: "movePane", paneId: "p1", targetPaneId: "p2", zone: "left" })).toBe(state);
    expect(terminalReducer(state, { type: "movePane", paneId: "p2", targetPaneId: "p1", zone: "center" })).toBe(state);
    expect(terminalReducer(state, { type: "movePane", paneId: "p1", targetPaneId: "p1", zone: "left" })).toBe(state);
  });

  it("resizeSplit ve equalizeSplit yalnız o alanın ağacını değiştiriyor", () => {
    let state = run([add("p1"), add("p2")], ready());
    state = terminalReducer(state, { type: "resizeSplit", workspaceId: "w1", path: [], index: 0, delta: 0.2, min: 0.1 });
    const root = layoutOf(ws(state));
    expect(root?.type === "split" && root.sizes[0]).toBeCloseTo(0.7);
    expect(terminalReducer(state, { type: "resizeSplit", workspaceId: "yok", path: [], index: 0, delta: 0.1, min: 0.1 })).toBe(state);
    state = terminalReducer(state, { type: "equalizeSplit", workspaceId: "w1", path: [] });
    const eq = layoutOf(ws(state));
    expect(eq?.type === "split" && eq.sizes).toEqual([0.5, 0.5]);
  });
});

describe("bölme ayarları", () => {
  it("ad kırpılıyor, boş ad siliniyor; aynı değer aynı durum", () => {
    let state = run([add("p1"), { type: "renamePane", paneId: "p1", title: "  derleme " }], ready());
    expect(ws(state).panes[0].title).toBe("derleme");
    expect(terminalReducer(state, { type: "renamePane", paneId: "p1", title: "derleme" })).toBe(state);
    state = terminalReducer(state, { type: "renamePane", paneId: "p1", title: "   " });
    expect(ws(state).panes[0].title).toBeUndefined();
  });

  it("renk yalnız bilinen değer; yazı boyutu 9–24, null varsayılana dönüyor", () => {
    let state = run([add("p1"), { type: "setPaneColor", paneId: "p1", color: "violet" }], ready());
    expect(ws(state).panes[0].color).toBe("violet");
    expect(terminalReducer(state, { type: "setPaneColor", paneId: "p1", color: "pembe" as never })).toBe(state);
    state = terminalReducer(state, { type: "setPaneFontSize", paneId: "p1", fontSize: 40 });
    expect(ws(state).panes[0].fontSize).toBe(24);
    state = terminalReducer(state, { type: "setPaneFontSize", paneId: "p1", fontSize: null });
    expect(ws(state).panes[0].fontSize).toBeUndefined();
  });
});

describe("kayıt", () => {
  it("toSaved ağacı, küçültülenleri ve ayarları yazıyor; geri yükleme aynısını kuruyor", () => {
    const state = run(
      [
        add("p1"),
        add("p2"),
        add("p3", { targetPaneId: "p1", dir: "column" }),
        { type: "renamePane", paneId: "p1", title: "derleme" },
        { type: "setPaneFontSize", paneId: "p2", fontSize: 16 },
        { type: "minimizePane", paneId: "p3" }
      ],
      ready()
    );
    const saved = toSaved(state);
    expect(saved.workspaces[0].minimized).toEqual([{ paneId: "p3", home: { siblingPaneId: "p1", side: "bottom" } }]);
    expect(saved.workspaces[0].panes).toEqual([
      { id: "p1", kind: "cmd", cwd: "C:\\a", title: "derleme" },
      { id: "p2", kind: "cmd", cwd: "C:\\a", fontSize: 16 },
      { id: "p3", kind: "cmd", cwd: "C:\\a" }
    ]);
    const restored = run(
      [
        { type: "setVisible", visible: true },
        { type: "open", saved: saved.workspaces, activeId: saved.activeId, freshId: "x", nameFor },
        { type: "restore", nameFor }
      ]
    );
    expect(layoutOf(ws(restored))).toEqual(layoutOf(ws(state)));
    expect(minimizedOf(ws(restored))).toEqual(minimizedOf(ws(state)));
    expect(ws(restored).panes[0].title).toBe("derleme");
    expect(ws(restored).focusedPaneId).toBe("p1");
    consistent(restored);
  });

  it("ağaçsız eski kayıt ızgaraya benzer ağaçla açılıyor", () => {
    const panes = ["a", "b", "c"].map((id) => ({ id, kind: "cmd" as const, cwd: "C:\\a" }));
    const state = run([
      { type: "setVisible", visible: true },
      { type: "open", saved: [{ id: "w1", name: "A", panes }], activeId: "w1", freshId: "x", nameFor },
      { type: "restore", nameFor }
    ]);
    expect(leafIds(layoutOf(ws(state)))).toEqual(["a", "b", "c"]);
    consistent(state);
  });
});
