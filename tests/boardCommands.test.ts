// Pano IPC komut doğrulayıcısı (spec 2026-10-18 gorev-panosu; Global
// Constraints: renderer'dan gelen veri ana süreçte doğrulanır).
import { describe, expect, it } from "vitest";
import { isBoardId, readBoardCommand } from "../app-electron/shared/boardCommands";

const draft = (over: Record<string, unknown> = {}) => ({ id: "s1", title: "A", prompt: "B", roleHint: "", dependsOn: [], ...over });

describe("isBoardId", () => {
  it("UUID ve basit kimlik geçiyor; yol parçası, boş, uzun ve dize olmayan reddediliyor", () => {
    expect(isBoardId("3f2a1c9e-1b2c-4d5e-8f90-123456789abc")).toBe(true);
    for (const bad of ["", "..", "../x", "a/b", "a\\b", "C:", "x".repeat(101), 5, null]) expect(isBoardId(bad)).toBe(false);
  });
});

describe("readBoardCommand", () => {
  it("geçerli komutlar olduğu gibi geliyor", () => {
    expect(readBoardCommand({ type: "createTask", title: " İade ", goal: "Hedef" })).toEqual({ type: "createTask", title: "İade", goal: "Hedef" });
    expect(readBoardCommand({ type: "assign", taskId: "t1", subtaskId: "s1", paneId: "p1" })).toEqual({ type: "assign", taskId: "t1", subtaskId: "s1", paneId: "p1" });
    expect(readBoardCommand({ type: "dismissWarning" })).toEqual({ type: "dismissWarning" });
    expect(readBoardCommand({ type: "saveDraft", taskId: "t1", title: "A", goal: "", subtasks: [draft({ dependsOn: ["s0"] })] })).toEqual({
      type: "saveDraft",
      taskId: "t1",
      title: "A",
      goal: "",
      subtasks: [draft({ dependsOn: ["s0"] })]
    });
  });

  it("bilinmeyen tür, eksik kimlik, yol parçası kimlik reddediliyor", () => {
    expect(readBoardCommand({ type: "rm -rf" })).toBeNull();
    expect(readBoardCommand({ type: "approve" })).toBeNull();
    expect(readBoardCommand({ type: "approve", taskId: "../x" })).toBeNull();
    expect(readBoardCommand(null)).toBeNull();
  });

  it("sınırlar: boş ya da 80'i aşan başlık, 2000'i aşan hedef, 8'i aşan alt görev, 4000'i aşan istem, 40'ı aşan rol", () => {
    expect(readBoardCommand({ type: "createTask", title: "   ", goal: "" })).toBeNull();
    expect(readBoardCommand({ type: "createTask", title: "x".repeat(81), goal: "" })).toBeNull();
    expect(readBoardCommand({ type: "createTask", title: "a", goal: "x".repeat(2001) })).toBeNull();
    const save = (subtasks: unknown[]) => readBoardCommand({ type: "saveDraft", taskId: "t1", title: "A", goal: "", subtasks });
    expect(save(Array.from({ length: 9 }, (_, i) => draft({ id: `s${i}` })))).toBeNull();
    expect(save([draft({ prompt: "x".repeat(4001) })])).toBeNull();
    expect(save([draft({ roleHint: "x".repeat(41) })])).toBeNull();
    expect(save([draft({ dependsOn: ["../x"] })])).toBeNull();
    expect(save([draft({ id: 3 })])).toBeNull();
    // dependsOn seyrek dizi deliği (new Array(1)) — .every deliği atlıyor, Array.from reddediyor.
    expect(save([draft({ dependsOn: new Array(1) })])).toBeNull();
  });

  it("taslakta boş başlık/istem kabul (onay ayrıca denetliyor)", () => {
    expect(readBoardCommand({ type: "saveDraft", taskId: "t1", title: "A", goal: "", subtasks: [draft({ title: "", prompt: "" })] })).not.toBeNull();
  });
});
