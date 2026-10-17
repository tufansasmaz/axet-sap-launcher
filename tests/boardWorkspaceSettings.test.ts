// Alanın doğrulama komutları ve Bölmeler/Pano seçimi (spec 2026-10-18
// gorev-panosu §2, §8): kayıttan okuma, indirgeyici, pano için alan bilgisi.
import { describe, expect, it } from "vitest";
import {
  boardWorkspaceInfo,
  normalizeTerminalWorkspaces,
  readVerifyCommands
} from "../app-electron/shared/terminalLayout";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;

describe("readVerifyCommands", () => {
  it("satırlar kırpılıyor; boş, dize olmayan, 300'ü aşan ve satır sonu içeren atılıyor; en fazla 5", () => {
    expect(readVerifyCommands(["  npm test  ", "", 5, "x".repeat(301), "a\nb", "npm run lint"])).toEqual(["npm test", "npm run lint"]);
    expect(readVerifyCommands(["1", "2", "3", "4", "5", "6"])).toEqual(["1", "2", "3", "4", "5"]);
    expect(readVerifyCommands("npm test")).toEqual([]);
  });
});

describe("normalizeTerminalWorkspaces — verify ve view", () => {
  it("eski kayıt bu alanlar olmadan açılıyor; geçerli olanlar okunuyor; bozuk view atılıyor", () => {
    const [plain, set, bad] = normalizeTerminalWorkspaces(
      [
        { id: "w1", name: "A", panes: [] },
        { id: "w2", name: "B", panes: [], verify: ["npm test", ""], view: "board" },
        { id: "w3", name: "C", panes: [], verify: "npm test", view: "office" }
      ],
      nameFor
    );
    expect("verify" in plain || "view" in plain).toBe(false);
    expect(set.verify).toEqual(["npm test"]);
    expect(set.view).toBe("board");
    expect("verify" in bad || "view" in bad).toBe(false);
  });
});

describe("boardWorkspaceInfo", () => {
  const saved = [
    { id: "w1", name: "A", panes: [], root: "C:\\kok", verify: ["npm test"] },
    { id: "w2", name: "B", panes: [] }
  ];
  it("kök varsa kök, yoksa yedek klasör; komutlar yeniden doğrulanıyor; alan yoksa null", () => {
    expect(boardWorkspaceInfo(saved, "C:\\axet", "w1")).toEqual({ cwd: "C:\\kok", verify: ["npm test"] });
    expect(boardWorkspaceInfo(saved, "C:\\axet", "w2")).toEqual({ cwd: "C:\\axet", verify: [] });
    expect(boardWorkspaceInfo(saved, "C:\\axet", "yok")).toBeNull();
    expect(boardWorkspaceInfo([{ id: "w9", name: "X", panes: [], verify: ["x".repeat(301)] }], "C:\\a", "w9")).toEqual({ cwd: "C:\\a", verify: [] });
  });
});

describe("indirgeyici: setWorkspaceVerify ve setWorkspaceView", () => {
  const ready = (): TerminalState => ({
    ...initialTerminalState,
    phase: "ready",
    workspaces: [{ id: "w1", name: "A", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false }],
    activeWorkspaceId: "w1"
  });

  it("komutlar kaydediliyor ve toSaved'e giriyor; boş liste alanı kaldırıyor; aynı değer aynı durum", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceVerify", id: "w1", verify: [" npm test ", "x".repeat(301)] });
    expect(s.workspaces[0].verify).toEqual(["npm test"]);
    expect(toSaved(s).workspaces[0].verify).toEqual(["npm test"]);
    expect(terminalReducer(s, { type: "setWorkspaceVerify", id: "w1", verify: ["npm test"] })).toBe(s);
    const cleared = terminalReducer(s, { type: "setWorkspaceVerify", id: "w1", verify: [] });
    expect("verify" in cleared.workspaces[0]).toBe(false);
  });

  it("görünüm: board kaydediliyor, panes kaldırıyor, bilinmeyen alan aynı durum", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceView", id: "w1", view: "board" });
    expect(s.workspaces[0].view).toBe("board");
    expect(toSaved(s).workspaces[0].view).toBe("board");
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "board" })).toBe(s);
    expect("view" in terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "panes" }).workspaces[0]).toBe(false);
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "yok", view: "panes" })).toBe(s);
  });

  it("geri yükleme: kayıttaki verify ve view alana geliyor", () => {
    const opened = terminalReducer(initialTerminalState, {
      type: "open",
      saved: [{ id: "w1", name: "A", panes: [], verify: ["npm test"], view: "board" }],
      activeId: "w1",
      freshId: "f",
      nameFor
    });
    // Bölmesiz kayıt geri yükleme şeridine uğramadan açılıyor (fromSaved).
    expect(opened.workspaces[0]).toMatchObject({ verify: ["npm test"], view: "board" });
  });
});
