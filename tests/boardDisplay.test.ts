// Pano görünüm yardımcıları (spec 2026-10-18 gorev-panosu §8). Saf.
import { describe, expect, it } from "vitest";
import {
  activeSubtaskOf,
  assignablePanes,
  FAILURE_KEY,
  failedCount,
  LEAD_ERROR_KEY,
  NOTE_KEY,
  sameFolderParallel,
  SUBTASK_STATE_KEY,
  subtaskColumn,
  taskColor,
  taskColumn,
  taskCount,
  taskProgress
} from "../src/board/boardDisplay";
import { BOARD_FAILURES } from "../app-electron/shared/boardCommands";
import { LEAD_ERROR_CODES, SUBTASK_NOTES, SUBTASK_STATES, type Board, type BoardTask, type Subtask } from "../app-electron/shared/boardTypes";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";

const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: id,
  prompt: "p",
  roleHint: "",
  dependsOn: [],
  state: "ready",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (id: string, subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id,
  title: id,
  goal: "",
  state: "running",
  createdAt: 1,
  approvedAt: 2,
  subtasks,
  ...over
});
const board = (tasks: BoardTask[], workspaceId = "w1"): Board => ({ workspaceId, tasks });
const pane = (id: string, cwd: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd,
  run: { state: "running", ptyId: `t-${id}` }
});
const ws = (panes: TerminalPane[]): TerminalWorkspace => ({
  id: "w1",
  name: "A",
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
});

describe("sütunlar", () => {
  it("görev: onaysız taslak, bitmiş bitti, ötekiler çalışıyor", () => {
    expect(taskColumn(task("t", [], { approvedAt: undefined, state: "stuck" }))).toBe("draft");
    expect(taskColumn(task("t", [], { state: "done" }))).toBe("done");
    expect(taskColumn(task("t", [], { state: "stuck" }))).toBe("running");
  });

  it("alt görev: waiting/ready sırada, running/asking çalışıyor, verifying/failed doğrulama, done bitti", () => {
    const map = Object.fromEntries(SUBTASK_STATES.map((s) => [s, subtaskColumn(sub("a", { state: s }))]));
    expect(map).toEqual({ waiting: "queued", ready: "queued", running: "running", asking: "running", verifying: "verifying", failed: "verifying", done: "done" });
  });
});

describe("ilerleme, renk, sayılar", () => {
  it("ilerleme bitmiş/toplam", () => {
    expect(taskProgress(task("t", [sub("a", { state: "done" }), sub("b")]))).toEqual({ done: 1, total: 2 });
  });

  it("renk oluşturulma sırasına göre dört renkte dönüyor; bilinmeyen gri", () => {
    const tasks = [5, 1, 3, 2, 4].map((n) => task(`t${n}`, [], { createdAt: n }));
    expect(["t1", "t2", "t3", "t4", "t5"].map((id) => taskColor(tasks, id))).toEqual(["blue", "green", "amber", "violet", "blue"]);
    expect(taskColor(tasks, "yok")).toBe("gray");
  });

  it("başarısız alt görev ve görev sayısı", () => {
    const b = board([task("t1", [sub("a", { state: "failed" }), sub("b", { state: "failed" })]), task("t2", [sub("c")])]);
    expect(failedCount(b)).toBe(2);
    expect(taskCount(b)).toBe(2);
    expect(failedCount(undefined)).toBe(0);
  });
});

describe("ajan ilişkisi", () => {
  it("ajanın üstündeki alt görev: running/asking/verifying; failed ve done değil", () => {
    const boards = {
      w1: board([task("t1", [sub("a", { state: "done", paneId: "p1" }), sub("b", { state: "asking", paneId: "p1" }), sub("c", { state: "failed", paneId: "p2" })])])
    };
    expect(activeSubtaskOf(boards, "p1")?.subtask.id).toBe("b");
    expect(activeSubtaskOf(boards, "p2")).toBeNull();
  });

  it("aynı klasörde paralel: yol büyük/küçük harf ve sondaki ayraç duyarsız", () => {
    const tasks = [
      task("t1", [sub("a", { state: "running", paneId: "p1" }), sub("b", { state: "asking", paneId: "p2" }), sub("c", { state: "running", paneId: "p3" })])
    ];
    const set = sameFolderParallel(tasks, ws([pane("p1", "C:\\proje"), pane("p2", "c:\\PROJE\\"), pane("p3", "C:\\baska")]));
    expect([...set].sort()).toEqual(["a", "b"]);
  });

  it("elle atanabilir bölmeler: çalışan ajan bölmeleri", () => {
    const stopped: TerminalPane = { ...pane("p2", "C:\\a"), run: { state: "exited", ptyId: "x", code: 0 } };
    const shell: TerminalPane = { id: "p3", kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: "y" } };
    expect(assignablePanes(ws([pane("p1", "C:\\a"), stopped, shell])).map((p) => p.id)).toEqual(["p1"]);
  });
});

describe("metin anahtarları", () => {
  it("her durum, not, lider hatası ve komut hatası için iki dilde metin var", () => {
    const keys = [
      ...SUBTASK_STATES.map((s) => SUBTASK_STATE_KEY[s]),
      ...SUBTASK_NOTES.map((n) => NOTE_KEY[n]),
      ...LEAD_ERROR_CODES.map((c) => LEAD_ERROR_KEY[c]),
      ...BOARD_FAILURES.map((f) => FAILURE_KEY[f])
    ];
    for (const key of keys) {
      expect(tr[key], key).toBeTruthy();
      expect(en[key], key).toBeTruthy();
    }
  });
});
