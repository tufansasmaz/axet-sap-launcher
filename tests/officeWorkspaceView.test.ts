// Ofis görünümünün alan kaydı (spec 2026-10-18 ofis-gorunumu §2): "office"
// okunuyor ve yazılıyor; bilinmeyen değer atılıyor; "panes" kayda girmiyor.
import { describe, expect, it } from "vitest";
import { normalizeTerminalWorkspaces, readWorkspaceView } from "../app-electron/shared/terminalLayout";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState } from "../src/stores/terminalTypes";
import type { WorkspaceView } from "../app-electron/shared/types";

const nameFor = (n: number) => `Alan ${n}`;

describe("readWorkspaceView", () => {
  it("yalnız board ve office; panes, bilinmeyen ve dize olmayan atılıyor", () => {
    expect(readWorkspaceView("board")).toBe("board");
    expect(readWorkspaceView("office")).toBe("office");
    for (const raw of ["panes", "salon", "Office", "", 3, null, undefined, ["office"], { view: "office" }]) {
      expect(readWorkspaceView(raw)).toBeUndefined();
    }
  });
});

describe("normalizeTerminalWorkspaces — office", () => {
  it("office okunuyor; bilinmeyen değer atılıyor, alan yine açılıyor", () => {
    const [office, bad] = normalizeTerminalWorkspaces(
      [
        { id: "w1", name: "A", panes: [], view: "office" },
        { id: "w2", name: "B", panes: [], view: "salon" }
      ],
      nameFor
    );
    expect(office.view).toBe("office");
    expect(bad.id).toBe("w2");
    expect("view" in bad).toBe(false);
  });
});

describe("indirgeyici: setWorkspaceView office", () => {
  const ready = (): TerminalState => ({
    ...initialTerminalState,
    phase: "ready",
    workspaces: [{ id: "w1", name: "A", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false }],
    activeWorkspaceId: "w1"
  });

  it("office kaydediliyor ve toSaved'e giriyor; aynı değer aynı durum; board↔office; panes kaldırıyor", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceView", id: "w1", view: "office" });
    expect(s.workspaces[0].view).toBe("office");
    expect(toSaved(s).workspaces[0].view).toBe("office");
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "office" })).toBe(s);
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "board" }).workspaces[0].view).toBe("board");
    const panes = terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "panes" });
    expect("view" in panes.workspaces[0]).toBe(false);
    expect("view" in toSaved(panes).workspaces[0]).toBe(false);
  });

  it("bilinmeyen görünüm değeri Bölmeler sayılıyor; zaten Bölmeler'deyse aynı durum", () => {
    const start = ready();
    expect(terminalReducer(start, { type: "setWorkspaceView", id: "w1", view: "salon" as WorkspaceView })).toBe(start);
    const office = terminalReducer(start, { type: "setWorkspaceView", id: "w1", view: "office" });
    expect("view" in terminalReducer(office, { type: "setWorkspaceView", id: "w1", view: "salon" as WorkspaceView }).workspaces[0]).toBe(false);
  });

  it("geri yükleme: kayıttaki office alana geliyor", () => {
    const opened = terminalReducer(initialTerminalState, {
      type: "open",
      saved: [{ id: "w1", name: "A", panes: [], view: "office" }],
      activeId: "w1",
      freshId: "f",
      nameFor
    });
    expect(opened.workspaces[0].view).toBe("office");
  });
});
