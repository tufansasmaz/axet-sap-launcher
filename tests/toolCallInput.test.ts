import { describe, expect, it } from "vitest";
import { toolInputComplete } from "../app-electron/main/toolCallInput";
import { mergeToolStep } from "../src/lib/toolSteps";
import type { AxetChatActivity } from "../app-electron/shared/types";

describe("toolInputComplete", () => {
  it("boş ya da yarım girdi tamam değil", () => {
    expect(toolInputComplete(undefined, undefined)).toBe(false);
    expect(toolInputComplete("", false)).toBe(false);
    expect(toolInputComplete('{"file_path": "C:/pro', false)).toBe(false);
  });

  it("ayrıştırılabilen girdi ya da finished bayrağı tamam sayılıyor", () => {
    expect(toolInputComplete('{"file_path": "a.ts"}', false)).toBe(true);
    expect(toolInputComplete('{"file_path": "C:/pro', true)).toBe(true);
  });
});

describe("mergeToolStep", () => {
  const row: AxetChatActivity = { phase: "tool", tool: "edit", callId: "c1", result: "ok" };

  it("ikinci olay hedefi ve farkı mevcut satıra yazıyor, sonucu koruyor", () => {
    const merged = mergeToolStep([row], { phase: "tool", tool: "edit", callId: "c1", target: "a.ts", diff: "-x\n+y" });
    expect(merged).toEqual([{ ...row, target: "a.ts", diff: "-x\n+y" }]);
  });

  it("boş gelen alan dolu satırı boşaltmıyor", () => {
    const full = { ...row, target: "a.ts", diff: "-x\n+y" };
    const steps = [full];
    expect(mergeToolStep(steps, { phase: "tool", tool: "edit", callId: "c1" })).toBe(steps);
  });

  it("satır yoksa null — çağıran yeni satır açar", () => {
    expect(mergeToolStep([row], { phase: "tool", tool: "view", callId: "c2" })).toBeNull();
    expect(mergeToolStep([row], { phase: "tool", tool: "view" })).toBeNull();
  });
});
