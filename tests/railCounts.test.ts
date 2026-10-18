// Görünüm rayı sayaçları (Tur 2): yalnız verisi olan sekmeler, sıfır çizilmez.
import { describe, expect, it } from "vitest";
import { openSubtaskCount, pendingChangeCount, railCounts } from "../src/agents/railCounts";
import type { Board, BoardTask, Subtask } from "../app-electron/shared/boardTypes";
import type { ChangesState, Checkpoint } from "../app-electron/shared/changesTypes";

const sub = (state: Subtask["state"]) => ({ state }) as Subtask;
const task = (state: BoardTask["state"], states: Subtask["state"][]) => ({ state, subtasks: states.map(sub) }) as BoardTask;
const cp = (id: string, reviewed: Checkpoint["reviewed"], files?: number) =>
  ({ id, reviewed, ...(files === undefined ? {} : { stats: { files, added: 1, deleted: 0 } }) }) as Checkpoint;

describe("railCounts", () => {
  it("açık alt görev: taslak ve bitmiş görevler sayılmıyor, bitmiş alt görev sayılmıyor", () => {
    const board = {
      workspaceId: "w",
      tasks: [task("draft", ["waiting"]), task("running", ["done", "running", "asking", "failed"]), task("done", ["done"]), task("stuck", ["waiting"])]
    } as Board;
    expect(openSubtaskCount(board)).toBe(4);
    expect(openSubtaskCount(null)).toBe(0);
  });

  it("değişiklik: incelenmeyi bekleyen, dosya değiştirmiş, süresi geçmemiş kayıtlar; repo yoksa 0", () => {
    const state = {
      workspaceId: "w",
      repo: "ok",
      checkpoints: [cp("a", "pending", 2), cp("b", "accepted", 3), cp("c", "pending", 0), cp("d", "pending"), cp("e", "pending", 1)],
      expired: ["e"]
    } as ChangesState;
    expect(pendingChangeCount(state)).toBe(1);
    expect(pendingChangeCount({ ...state, repo: "notRepo" })).toBe(0);
  });

  it("sıfırlar anahtar olarak çıkmıyor; soru sayısı Ofis'te", () => {
    expect(railCounts({ asking: 0 })).toEqual({});
    const board = { workspaceId: "w", tasks: [task("running", ["running"])] } as Board;
    expect(railCounts({ board, asking: 2 })).toEqual({ board: 1, office: 2 });
  });
});
