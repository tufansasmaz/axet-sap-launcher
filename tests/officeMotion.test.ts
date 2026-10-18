// Piksel ofisin zamanlaması (spec 2026-10-18 ajanlar-yeniden §2b, §3): pano
// dağıtımında ışın, liderin konuşma balonu, panonun lideri, çizgi pikselleri.
// Durum -> kare seçimi kişilerle birlikte officeActors testinde.
import { describe, expect, it } from "vitest";
import type { Board, BoardTask } from "../app-electron/shared/boardTypes";
import type { TerminalPane } from "../src/stores/terminalTypes";
import { BEAM_MS, FRAME_MS, TALK_MS, beamShape, boardLeadActive, leaderPane, linePixels, newAssignments, talking } from "../src/office/officeMotion";

describe("ışın", () => {
  it("kare saati ~4 fps", () => {
    expect(FRAME_MS).toBe(250);
  });

  it("yalnız yeni atanan alt görevde; ilk görüntüde ışın yok", () => {
    expect(newAssignments(null, { p1: "s1" })).toEqual([]);
    expect(newAssignments({ p1: null, p2: "s2" }, { p1: "s1", p2: "s2" })).toEqual(["p1"]);
    expect(newAssignments({ p1: "s1" }, { p1: "s3" })).toEqual(["p1"]);
    expect(newAssignments({ p1: "s1" }, { p1: null })).toEqual([]);
    expect(newAssignments({}, { p9: "s9" })).toEqual(["p9"]);
  });

  it("~800 ms: önce uç ilerliyor, sonra sönüyor; öncesi ve sonrası yok", () => {
    expect(BEAM_MS).toBe(800);
    expect(beamShape(1000, 999)).toBeNull();
    expect(beamShape(1000, 1000 + BEAM_MS)).toBeNull();
    expect(beamShape(1000, 1000)).toEqual({ head: 0, alpha: 1 });
    expect(beamShape(1000, 1000 + BEAM_MS / 2)).toEqual({ head: 1, alpha: 1 });
    expect(beamShape(1000, 1000 + BEAM_MS * 0.75)?.alpha).toBeCloseTo(0.5);
    expect(beamShape(1000, 1000 + BEAM_MS / 4)?.head).toBeCloseTo(0.5);
  });

  it("lider ışınla birlikte TALK_MS konuşuyor", () => {
    expect(talking([1000], 1000)).toBe(true);
    expect(talking([1000], 1000 + TALK_MS - 1)).toBe(true);
    expect(talking([1000], 1000 + TALK_MS)).toBe(false);
    expect(talking([], 5)).toBe(false);
  });

  it("lider: rolü lider/lead olan ajan; yoksa null", () => {
    const p = (id: string, role: string): TerminalPane => ({
      id,
      kind: "agent",
      agent: { engine: "axet-code", role, roleKind: "custom" },
      cwd: "C:\\a",
      run: { state: "running", ptyId: id }
    });
    expect(leaderPane([p("a", "coder"), p("b", "Takım lideri")])).toBe("b");
    expect(leaderPane([p("a", "Tech Lead"), p("b", "tester")])).toBe("a");
    expect(leaderPane([p("a", "coder")])).toBeNull();
    expect(leaderPane([p("a", "leadership coach")])).toBeNull();
  });

  it("panonun lideri: planlarken, onay beklerken ya da görev yürürken iş başında", () => {
    const task = (over: Partial<BoardTask>): BoardTask => ({ id: "t", title: "t", goal: "g", state: "draft", createdAt: 1, subtasks: [], ...over });
    const board = (tasks: BoardTask[]): Board => ({ workspaceId: "a", tasks });
    expect(boardLeadActive(undefined)).toBe(false);
    expect(boardLeadActive(board([task({ state: "done" })]))).toBe(false);
    expect(boardLeadActive(board([task({ planning: true })]))).toBe(true);
    expect(boardLeadActive(board([task({ state: "running" })]))).toBe(true);
    expect(boardLeadActive(board([task({ state: "awaitingApproval" })]))).toBe(true);
  });

  it("çizgi pikselleri uçtan uca, aralıksız", () => {
    const px = linePixels(0, 0, 5, 2);
    expect(px[0]).toEqual([0, 0]);
    expect(px[px.length - 1]).toEqual([5, 2]);
    for (let i = 1; i < px.length; i++) {
      expect(Math.abs(px[i][0] - px[i - 1][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(px[i][1] - px[i - 1][1])).toBeLessThanOrEqual(1);
    }
    expect(linePixels(3, 3, 3, 3)).toEqual([[3, 3]]);
  });
});
