// Proje klasörü çipi: "Git deposu başlat" yalnız `git init`, kabuksuz, süre sınırlı.
import { describe, expect, it } from "vitest";
import { GIT_INIT_TIMEOUT_MS, createGitInit } from "../app-electron/main/changesInit";
import type { GitResult, GitRunOptions } from "../app-electron/main/changesGit";

const result = (over: Partial<GitResult> = {}): GitResult => ({ ok: true, code: 0, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false, ...over });

describe("createGitInit", () => {
  it("klasörde yalnız `git init` çalıştırır, süre sınırıyla", async () => {
    const calls: [readonly string[], GitRunOptions][] = [];
    const init = createGitInit(async (args, opts) => {
      calls.push([args, opts]);
      return result();
    });
    expect(await init("C:/proje")).toEqual({ ok: true });
    expect(calls).toEqual([[["init"], { cwd: "C:/proje", timeoutMs: GIT_INIT_TIMEOUT_MS }]]);
    expect(GIT_INIT_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("git yok / süre aşımı / diğer hata ayrı nedenler", async () => {
    expect(await createGitInit(async () => result({ ok: false, missing: true }))("C:/p")).toEqual({ ok: false, reason: "noGit" });
    expect(await createGitInit(async () => result({ ok: false, timedOut: true }))("C:/p")).toEqual({ ok: false, reason: "timeout" });
    expect(await createGitInit(async () => result({ ok: false, code: 128, stderr: "izin yok" }))("C:/p")).toEqual({ ok: false, reason: "git" });
    expect(
      await createGitInit(async () => {
        throw new Error("patladı");
      })("C:/p")
    ).toEqual({ ok: false, reason: "git" });
  });
});
