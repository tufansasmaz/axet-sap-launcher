// Değişiklikler IPC bağlantıları ve güvenlik kuralları — kaynak düzeyinde kilit
// (bkz. boardIpcWiring.test.ts). Spec 2026-10-18 degisiklikler §2, §6, §7.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");
const live = read("app-electron", "main", "changesLive.ts");
const git = read("app-electron", "main", "changesGit.ts");
const manager = read("app-electron", "main", "changesManager.ts");

const CHANNELS = ["changes:state", "changes:live", "changes:range", "changes:diff", "changes:checkpoint", "changes:accept", "changes:prepareRevert", "changes:revert"];

describe("Değişiklikler — IPC bağlantısı", () => {
  it("kanallar ana süreçte, preload'da ve tiplerde; olay changes:changed", () => {
    for (const channel of [...CHANNELS, "changes:changed"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["changesState:", "changesLive:", "changesRange:", "changesDiff:", "changesCheckpoint:", "changesAccept:", "changesPrepareRevert:", "changesRevert:", "onChangesChanged:"]) {
      expect(types, name).toContain(name);
    }
  });

  it("her kanal kayıtlı alan kapısından geçiyor (boardWorkspaceInfo)", () => {
    for (const channel of CHANNELS) expect(main, channel).toMatch(new RegExp(`"${channel}"[\\s\\S]{0,200}changesWorkspace\\(`));
    expect(main).toMatch(/const changesWorkspace = [\s\S]{0,300}isBoardId\([\s\S]{0,300}boardWorkspaceInfo\(/);
  });

  it("renderer serbest yol gönderemez: diff yolu isSafeRelPath, geri alma listesi readRevertPaths", () => {
    expect(main).toMatch(/"changes:diff"[\s\S]{0,500}isSafeRelPath\(/);
    expect(main).toMatch(/"changes:revert"[\s\S]{0,600}readRevertPaths\(/);
  });

  it("yöneticinin klasörü yalnız config'teki alan kaydından", () => {
    expect(main).toMatch(/createChangesManager\(\{[\s\S]{0,1200}workspace:\s*\(id\)\s*=>[\s\S]{0,200}boardWorkspaceInfo\(/);
  });

  it("kancalar bağlı: istem satırı ve pano dağıtımı", () => {
    expect(main).toMatch(/onPromptLine:\s*\(reg, line\)\s*=>\s*changesManager\.onPromptLine\(reg, line\)/);
    expect(main).toMatch(/onDispatched:\s*\(workspaceId, paneId, subtaskId, title\)\s*=>\s*changesManager\.onDispatched\(workspaceId, paneId, subtaskId, title\)/);
  });

  it("alan kapatmada kayıtlar da siliniyor; kapanışta yönetici duruyor", () => {
    expect(main).toMatch(/"board:dropWorkspace"[\s\S]{0,600}changesManager\.drop\(/);
    expect(main).toMatch(/function stopBoardManager[\s\S]{0,300}changesManager\.dispose\(\)/);
  });

  it("eklenen dosya kalıcı silinmiyor: yalnız shell.trashItem", () => {
    expect(live).toContain("shell.trashItem(");
    expect(live).not.toMatch(/unlink|rmSync|rmdir|\brm\(/);
  });

  it("git yalnız execFile, kabuksuz; kullanıcının HEAD/dal/stash/ref'ini değiştiren komut yok", () => {
    // Task 3'te çalıştırıcı enjekte edilebilir oldu (createGitRunner(exec)); gerçek
    // uygulama node:child_process'ten YALNIZ execFile alıyor ve "git"i sabit veriyor.
    expect(git).toContain('import { execFile } from "node:child_process";');
    expect(git).toMatch(/exec\(\n\s+"git",\n\s+\[\.\.\.GIT_BASE_ARGS, \.\.\.args\]/);
    expect(git).not.toMatch(/shell:\s*true/);
    expect(git).not.toMatch(/\bspawn\(|execSync|spawnSync|\{[^}]*\bexec\b[^}]*\} from "node:child_process"/);
    expect(git).not.toMatch(/require\(|from "child_process"|\.exec\(/);
    expect(git.match(/child_process/g)).toHaveLength(1);
    expect(git).toMatch(/runGitDefault: GitRun = createGitRunner\(execFileNode\)/);
    for (const forbidden of ['"commit"', '"stash"', '"reset"', '"checkout"', '"update-ref"', '"gc"', '"init"', '"switch"', '"restore"']) {
      expect(git, forbidden).not.toContain(forbidden);
    }
  });

  it("günlükte yalnız iki etiket", () => {
    const tags = new Set([...manager.matchAll(/log\("([^"]+)"/g)].map((m) => m[1]));
    expect([...tags].sort()).toEqual(["degisiklik.geriAl", "degisiklik.goruntu"]);
  });
});
