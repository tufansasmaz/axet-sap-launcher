// Tarayici gorununun alan kaydi (spec 2026-10-18 tarayici §2, §5): "browser"
// gorunumu ve son adres okunuyor/yaziliyor; gecersiz deger atiliyor, alan yine aciliyor.
import { describe, expect, it } from "vitest";
import { normalizeTerminalWorkspaces, readWorkspaceView } from "../app-electron/shared/terminalLayout";
import { BROWSER_URL_MAX } from "../app-electron/shared/browserLogic";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;

describe("readWorkspaceView — browser", () => {
  it("browser okunuyor; yazim farki atiliyor", () => {
    expect(readWorkspaceView("browser")).toBe("browser");
    // Tur 3: Pano ve Araçlar da kayda giriyor.
    expect(readWorkspaceView("overview")).toBe("overview");
    expect(readWorkspaceView("tools")).toBe("tools");
    expect(readWorkspaceView("Browser")).toBeUndefined();
    expect(readWorkspaceView("tarayici")).toBeUndefined();
  });
});

describe("normalizeTerminalWorkspaces — browserUrl", () => {
  it("gecerli son adres okunuyor; gecersiz olan atiliyor, alan yine aciliyor", () => {
    const list = normalizeTerminalWorkspaces(
      [
        { id: "w1", name: "A", panes: [], view: "browser", browserUrl: "http://localhost:5173/" },
        { id: "w2", name: "B", panes: [], browserUrl: "javascript:alert(1)" },
        { id: "w3", name: "C", panes: [], browserUrl: "https://ali:sifre@sap.example.com/" },
        { id: "w4", name: "D", panes: [], browserUrl: `https://a.com/${"x".repeat(BROWSER_URL_MAX)}` },
        { id: "w5", name: "E", panes: [], browserUrl: 42 }
      ],
      nameFor
    );
    expect(list.map((w) => w.id)).toEqual(["w1", "w2", "w3", "w4", "w5"]);
    expect(list[0]).toMatchObject({ view: "browser", browserUrl: "http://localhost:5173/" });
    for (const w of list.slice(1)) expect("browserUrl" in w, w.id).toBe(false);
  });
});

describe("indirgeyici", () => {
  const ready = (): TerminalState => ({
    ...initialTerminalState,
    phase: "ready",
    workspaces: [{ id: "w1", name: "A", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false }],
    activeWorkspaceId: "w1"
  });

  it("setWorkspaceView browser kaydediliyor ve toSaved'e giriyor", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceView", id: "w1", view: "browser" });
    expect(s.workspaces[0].view).toBe("browser");
    expect(toSaved(s).workspaces[0].view).toBe("browser");
  });

  it("setWorkspaceBrowserUrl: gecerli adres kaydediliyor; ayni adres ayni durum; gecersiz adres ve bilinmeyen alan yok sayiliyor", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceBrowserUrl", id: "w1", url: "https://help.sap.com/docs" });
    expect(s.workspaces[0].browserUrl).toBe("https://help.sap.com/docs");
    expect(toSaved(s).workspaces[0].browserUrl).toBe("https://help.sap.com/docs");
    expect(terminalReducer(s, { type: "setWorkspaceBrowserUrl", id: "w1", url: "https://help.sap.com/docs" })).toBe(s);
    for (const bad of ["file:///C:/x", "https://ali:pw@a.com/", "chrome-error://chromewebdata/", ""]) {
      expect(terminalReducer(s, { type: "setWorkspaceBrowserUrl", id: "w1", url: bad }), bad).toBe(s);
    }
    expect(terminalReducer(s, { type: "setWorkspaceBrowserUrl", id: "yok", url: "https://a.com/" })).toBe(s);
    expect("browserUrl" in toSaved(ready()).workspaces[0]).toBe(false);
  });

  it("geri yukleme: kayittaki browser gorunumu ve son adres alana geliyor", () => {
    const opened = terminalReducer(initialTerminalState, {
      type: "open",
      saved: [{ id: "w1", name: "A", panes: [], view: "browser", browserUrl: "http://localhost:5173/" }],
      activeId: "w1",
      freshId: "f",
      nameFor
    });
    expect(opened.workspaces[0]).toMatchObject({ view: "browser", browserUrl: "http://localhost:5173/" });
  });
});
