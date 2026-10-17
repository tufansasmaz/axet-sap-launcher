// Pano deposu (spec 2026-10-18 gorev-panosu §2, §7, §10). Gerçek geçici klasör.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  boardFile,
  deleteBoardFile,
  listBoardIds,
  readBoardFile,
  readTasks,
  writeBoardFile
} from "../app-electron/main/boardStore";
import type { BoardTask, SubtaskNote } from "../app-electron/shared/boardTypes";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "pano-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const WS = "3f2a1c9e-1b2c-4d5e-8f90-123456789abc";
const task = (over: Partial<BoardTask> = {}): BoardTask => ({
  id: "t1",
  title: "İade",
  goal: "Hedef",
  state: "running",
  createdAt: 5,
  approvedAt: 6,
  subtasks: [
    { id: "a", title: "A", prompt: "İstem A", roleHint: "", dependsOn: [], state: "done", paneId: "p1", attempts: 1 },
    { id: "b", title: "B", prompt: "İstem B", roleHint: "test", dependsOn: ["a"], state: "running", paneId: "p2", attempts: 1, dispatchedAt: 9 }
  ],
  ...over
});

describe("boardFile", () => {
  it("geçerli kimlik klasörün içinde; yol parçası reddediliyor", () => {
    expect(boardFile(dir, WS)).toBe(path.join(dir, `${WS}.json`));
    for (const bad of ["../x", "..", "a\\b", "C:x", ""]) expect(boardFile(dir, bad)).toBeNull();
  });
});

describe("yazma ve okuma", () => {
  it("dosya yoksa boş pano", () => {
    expect(readBoardFile(dir, WS, 1)).toEqual({ tasks: [] });
  });

  it("gidiş-dönüş: planning yazılmıyor; yarıda kalan alt görev ready + held + restarted", () => {
    expect(writeBoardFile(dir, WS, [task({ planning: true })])).toBe(true);
    const raw = JSON.parse(readFileSync(boardFile(dir, WS)!, "utf-8"));
    expect(raw.version).toBe(1);
    expect("planning" in raw.tasks[0]).toBe(false);
    const { tasks } = readBoardFile(dir, WS, 1);
    expect(tasks[0].subtasks[0].state).toBe("done");
    expect(tasks[0].subtasks[1]).toMatchObject({ state: "ready", held: true, note: "restarted", paneId: null });
    expect(tasks[0].state).toBe("running");
  });

  it("geçici dosya kalmıyor; klasör yoksa oluşturuluyor", () => {
    const nested = path.join(dir, "boards");
    expect(writeBoardFile(nested, WS, [])).toBe(true);
    expect(readdirSync(nested)).toEqual([`${WS}.json`]);
  });

  it("geçersiz kimlikle yazma false, okuma boş", () => {
    expect(writeBoardFile(dir, "../x", [task()])).toBe(false);
    expect(readBoardFile(dir, "../x", 1)).toEqual({ tasks: [] });
  });
});

describe("bozuk dosya", () => {
  it("JSON değilse .bozuk-<zaman> olarak kenara alınıyor, içerik korunuyor, boş pano + uyarı", () => {
    const file = boardFile(dir, WS)!;
    writeFileSync(file, "{ yarım", "utf-8");
    const result = readBoardFile(dir, WS, 1234);
    expect(result.tasks).toEqual([]);
    expect(result.recoveredFrom).toBe(`${WS}.json.bozuk-1234`);
    expect(existsSync(file)).toBe(false);
    expect(readFileSync(path.join(dir, `${WS}.json.bozuk-1234`), "utf-8")).toBe("{ yarım");
  });

  it("yapı bozuksa (tasks dizi değil) da kenara alınıyor", () => {
    writeFileSync(boardFile(dir, WS)!, JSON.stringify({ version: 1, tasks: "x" }), "utf-8");
    expect(readBoardFile(dir, WS, 7).recoveredFrom).toBe(`${WS}.json.bozuk-7`);
  });
});

describe("readTasks", () => {
  it("bozuk öğe atlanıyor, öteki kalıyor; olmayan bağımlılık süzülüyor; sınırlar kırpılıyor", () => {
    const tasks = readTasks({
      version: 1,
      tasks: [
        { title: "kimliksiz" },
        {
          ...task(),
          title: "x".repeat(200),
          subtasks: [
            { id: "a", title: "A", prompt: "P", roleHint: "", dependsOn: ["yok", "a"], state: "ready", paneId: null, attempts: 0 },
            { id: "b", title: "B", prompt: "P", roleHint: "", dependsOn: [], state: "uçuyor", paneId: null, attempts: 0 }
          ]
        }
      ]
    })!;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toHaveLength(80);
    expect(tasks[0].subtasks.map((s) => s.id)).toEqual(["a"]);
    expect(tasks[0].subtasks[0].dependsOn).toEqual([]);
  });

  it("yapı bozuksa null", () => {
    expect(readTasks(null)).toBeNull();
    expect(readTasks({ tasks: {} })).toBeNull();
    expect(readTasks([])).toBeNull();
  });

  it("kanıt ve not okunuyor; bilinmeyen not atlanıyor", () => {
    const tasks = readTasks({
      tasks: [
        task({
          subtasks: [
            {
              id: "a",
              title: "A",
              prompt: "P",
              roleHint: "",
              dependsOn: [],
              state: "failed",
              paneId: "p1",
              attempts: 2,
              note: "timeout",
              proof: { kind: "commands", ok: false, at: 3, commands: [{ command: "npm test", exitCode: null, durationMs: 600000, tail: "…", timedOut: true }] }
            },
            { id: "b", title: "B", prompt: "P", roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 0, note: "uydurma" as SubtaskNote }
          ]
        })
      ]
    })!;
    expect(tasks[0].subtasks[0].proof?.commands[0]).toMatchObject({ command: "npm test", exitCode: null, timedOut: true });
    expect(tasks[0].subtasks[0].note).toBe("timeout");
    expect("note" in tasks[0].subtasks[1]).toBe(false);
  });
});

describe("silme ve listeleme", () => {
  it("yalnız geçerli .json panolar listeleniyor; silme dosyayı kaldırıyor; geçersiz kimlik dokunmuyor", () => {
    writeBoardFile(dir, WS, []);
    writeBoardFile(dir, "w2", []);
    writeFileSync(path.join(dir, `${WS}.json.bozuk-1`), "x");
    writeFileSync(path.join(dir, "w3.json.tmp"), "x");
    expect(listBoardIds(dir).sort()).toEqual([WS, "w2"].sort());
    deleteBoardFile(dir, "w2");
    expect(listBoardIds(dir)).toEqual([WS]);
    deleteBoardFile(dir, "../x");
    expect(listBoardIds(path.join(dir, "yok"))).toEqual([]);
  });
});
