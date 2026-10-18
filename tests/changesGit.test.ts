// Değişiklikler: git katmanı (spec 2026-10-18 degisiklikler §2, §6, §7, §9).
// Geçici klasörde GERÇEK bir test deposu. `git` PATH'te yoksa gerçek depo
// testleri atlanıyor ve sebebi yazılıyor; sahte koşucuyla olanlar her zaman çalışıyor.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGitPort, gitEnv, type GitResult, type GitRun } from "../app-electron/main/changesGit";
import { insideRootReal, isWithin } from "../app-electron/main/changesFs";
import { LARGE_FILE_BYTES, LOCK_RETRIES, type FileChange } from "../app-electron/shared/changesTypes";

function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { windowsHide: true, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const HAS_GIT = gitAvailable();
if (!HAS_GIT) console.warn("[changesGit.test] git PATH'te yok: gerçek depo testleri atlanıyor");

let base = "";
let repo = "";
let indexFile = "";
beforeEach(() => {
  base = mkdtempSync(path.join(os.tmpdir(), "degisiklik-git-"));
  repo = path.join(base, "depo");
  mkdirSync(repo);
  indexFile = path.join(base, "veri", "w1.index");
  mkdirSync(path.dirname(indexFile));
});
afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

/** Kullanıcının kendi git komutu (bizim ortamımız değil). */
function g(...args: string[]): string {
  return execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], {
    cwd: repo,
    windowsHide: true,
    encoding: "utf8"
  });
}
function write(rel: string, content: string | Buffer) {
  const file = path.join(repo, ...rel.split("/"));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function read(rel: string): string {
  return readFileSync(path.join(repo, ...rel.split("/")), "utf8");
}
function initRepo() {
  g("init", "-q", "-b", "ana");
  g("config", "core.autocrlf", "false");
  write(".gitignore", "gizli.log\n");
  write("a.txt", "bir\niki\nüç\n");
  write("src/b.ts", "export const b = 1;\n");
  write("sil.md", "silinecek\n");
  g("add", "-A");
  g("commit", "-q", "-m", "ilk");
}
/** Kullanıcının bakış açısından deponun bütün durumu. */
function userState() {
  const userIndex = path.join(repo, ".git", "index");
  return {
    index: createHash("sha256").update(readFileSync(userIndex)).digest("hex"),
    indexMtime: statSync(userIndex).mtimeMs,
    head: g("rev-parse", "HEAD").trim(),
    branch: g("symbolic-ref", "HEAD").trim(),
    stash: g("stash", "list"),
    refs: g("for-each-ref"),
    status: g("--no-optional-locks", "status", "--porcelain=v1", "-uall")
  };
}
const byPath = (files: FileChange[]) => Object.fromEntries(files.map((f) => [f.path, f]));

// Windows'ta her git süreci yüzlerce ms; tam takım paralel koşarken 5 sn'lik varsayılan yetmiyor.
describe.skipIf(!HAS_GIT)("gerçek depo", { timeout: 30_000 }, () => {
  it("probe: depo kökü önek boş; alt klasör öneki; depo olmayan klasör notRepo", async () => {
    initRepo();
    const port = createGitPort();
    const root = await port.probe(repo);
    expect(root.ok && root.prefix).toBe("");
    expect(root.ok && path.resolve(root.top)).toBe(path.resolve(repo));
    const sub = await port.probe(path.join(repo, "src"));
    expect(sub.ok && sub.prefix).toBe("src/");
    const outside = path.join(base, "duz");
    mkdirSync(outside);
    expect(await port.probe(outside)).toEqual({ ok: false, reason: "notRepo" });
  });

  it("görüntü: izlenmeyen yeni dosya dahil, .gitignore'daki hariç; durumlar, sayılar, ikili", async () => {
    initRepo();
    const port = createGitPort();
    const first = await port.snapshot(repo, indexFile, 20_000);
    expect(first.ok).toBe(true);
    write("a.txt", "bir\nİKİ\nüç\ndört\n");
    write("yeni/c.txt", "yeni dosya\n");
    write("gizli.log", "görünmemeli\n");
    write("resim.bin", Buffer.from([0, 1, 2, 0, 255]));
    rmSync(path.join(repo, "sil.md"));
    const second = await port.snapshot(repo, indexFile, 20_000);
    if (!first.ok || !second.ok) throw new Error("görüntü alınamadı");
    const diff = await port.diffTrees(repo, "", first.tree, second.tree);
    if (!diff.ok) throw new Error("diff alınamadı");
    const files = byPath(diff.files);
    expect(Object.keys(files).sort()).toEqual(["a.txt", "resim.bin", "sil.md", "yeni/c.txt"]);
    expect(files["a.txt"]).toMatchObject({ status: "modified", added: 2, deleted: 1, binary: false });
    expect(files["yeni/c.txt"]).toMatchObject({ status: "added", added: 1, deleted: 0 });
    expect(files["sil.md"]).toMatchObject({ status: "deleted", deleted: 1 });
    expect(files["resim.bin"]).toMatchObject({ status: "added", binary: true });
    expect(diff.truncated).toBe(false);
    // Değişiklik yoksa aynı ağaç.
    const third = await port.snapshot(repo, indexFile, 20_000);
    expect(third.ok && third.tree).toBe(second.tree);
  });

  it("görüntü, diff ve geri yükleme kullanıcının index'ine, HEAD'ine, dalına, stash'ine, ref'lerine dokunmuyor", async () => {
    initRepo();
    write("a.txt", "kullanıcının değişikliği\n");
    g("stash", "push", "-q", "-m", "kullanıcının stash'i");
    write("src/b.ts", "export const b = 2;\n");
    g("add", "src/b.ts");
    write("yeni.txt", "izlenmeyen\n");
    const before = userState();
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    write("yeni.txt", "ajan değiştirdi\n");
    const two = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü alınamadı");
    await port.diffTrees(repo, "", one.tree, two.tree);
    await port.fileDiff(repo, "", one.tree, two.tree, { path: "yeni.txt", status: "modified", added: 1, deleted: 1, binary: false });
    const restoreIndex = path.join(base, "veri", "w1.restore.index");
    expect(await port.loadIndex(repo, restoreIndex, one.tree)).toBe(true);
    expect(await port.restoreFile(repo, restoreIndex, "yeni.txt")).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("yeni.txt")).toBe("izlenmeyen\n");
    expect(userState()).toEqual(before);
    expect(existsSync(restoreIndex)).toBe(false);
  });

  it("kullanıcının index'e aldığı değişiklik geri yüklemeden sonra da index'te", async () => {
    initRepo();
    write("src/b.ts", "export const b = 3;\n");
    g("add", "src/b.ts");
    const staged = g("diff", "--cached", "--name-only");
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    write("src/b.ts", "export const b = 4;\n");
    if (!one.ok) throw new Error("görüntü alınamadı");
    const restoreIndex = path.join(base, "veri", "r.index");
    await port.loadIndex(repo, restoreIndex, one.tree);
    expect(await port.restoreFile(repo, restoreIndex, "src/b.ts")).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("src/b.ts")).toBe("export const b = 3;\n");
    expect(g("diff", "--cached", "--name-only")).toBe(staged);
  });

  it("geri yükleme: değişen ve silinen dosya ağaçtaki hâline dönüyor; alt klasör öneki ile", async () => {
    initRepo();
    const root = path.join(repo, "src");
    const port = createGitPort();
    const probe = await port.probe(root);
    if (!probe.ok) throw new Error("probe");
    const subIndex = path.join(base, "veri", "alt.index");
    const one = await port.snapshot(root, subIndex, 20_000);
    write("src/b.ts", "değişti\n");
    write("src/c.ts", "yeni\n");
    write("a.txt", "kök dışı değişiklik\n");
    const two = await port.snapshot(root, subIndex, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü");
    const diff = await port.diffTrees(root, probe.prefix, one.tree, two.tree);
    if (!diff.ok) throw new Error("diff");
    // Kök dışındaki a.txt görünmüyor; yollar alan köküne göreli.
    expect(diff.files.map((f) => [f.path, f.status])).toEqual([
      ["b.ts", "modified"],
      ["c.ts", "added"]
    ]);
    const restoreIndex = path.join(base, "veri", "alt.restore.index");
    expect(await port.loadIndex(probe.top, restoreIndex, one.tree)).toBe(true);
    expect(await port.restoreFile(probe.top, restoreIndex, `${probe.prefix}b.ts`)).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("src/b.ts")).toBe("export const b = 1;\n");
    // Silinen dosya geri geliyor.
    rmSync(path.join(repo, "src", "b.ts"));
    await port.loadIndex(probe.top, restoreIndex, one.tree);
    expect(await port.restoreFile(probe.top, restoreIndex, `${probe.prefix}b.ts`)).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("src/b.ts")).toBe("export const b = 1;\n");
  });

  it("dosya diff'i: satır numaralı metin; ikili; 200 KB üstü büyük; adında [1] olan dosya yalnız kendisi", async () => {
    initRepo();
    write("köşeli[1].txt", "a\n");
    write("köşeli1.txt", "x\n");
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    write("a.txt", "bir\nİKİ\nüç\n");
    write("büyük.txt", "x".repeat(LARGE_FILE_BYTES + 1));
    write("köşeli[1].txt", "b\n");
    write("köşeli1.txt", "y\n");
    const two = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü");
    const text = await port.fileDiff(repo, "", one.tree, two.tree, { path: "a.txt", status: "modified", added: 1, deleted: 1, binary: false });
    expect(text?.kind).toBe("text");
    if (text?.kind !== "text") throw new Error("metin değil");
    expect(text.lines.filter((l) => l.kind !== "context").map((l) => [l.kind, l.oldNo, l.newNo, l.text])).toEqual([
      ["hunk", null, null, "@@ -1,3 +1,3 @@"],
      ["del", 2, null, "iki"],
      ["add", null, 2, "İKİ"]
    ]);
    expect(await port.fileDiff(repo, "", one.tree, two.tree, { path: "resim.bin", status: "added", added: 0, deleted: 0, binary: true })).toEqual({ kind: "binary" });
    expect(await port.fileDiff(repo, "", one.tree, two.tree, { path: "büyük.txt", status: "added", added: 1, deleted: 0, binary: false })).toEqual({ kind: "large" });
    const star = await port.fileDiff(repo, "", one.tree, two.tree, { path: "köşeli[1].txt", status: "modified", added: 1, deleted: 1, binary: false });
    if (star?.kind !== "text") throw new Error("metin değil");
    expect(star.lines.filter((l) => l.kind === "add").map((l) => l.text)).toEqual(["b"]);
  });

  it("dosya diff'i alt klasör önekiyle: yalnız o dosya, alan köküne göre", async () => {
    initRepo();
    const root = path.join(repo, "src");
    const port = createGitPort();
    const probe = await port.probe(root);
    if (!probe.ok) throw new Error("probe");
    const subIndex = path.join(base, "veri", "alt.index");
    const one = await port.snapshot(root, subIndex, 20_000);
    write("src/b.ts", "export const b = 9;\n");
    const two = await port.snapshot(root, subIndex, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü");
    const d = await port.fileDiff(root, probe.prefix, one.tree, two.tree, { path: "b.ts", status: "modified", added: 1, deleted: 1, binary: false });
    if (d?.kind !== "text") throw new Error("metin değil");
    expect(d.lines.filter((l) => l.kind === "add").map((l) => l.text)).toEqual(["export const b = 9;"]);
  });

  it("treeExists: var olan ağaç true, uydurma ağaç false", async () => {
    initRepo();
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok) throw new Error("görüntü");
    expect(await port.treeExists(repo, one.tree)).toBe(true);
    expect(await port.treeExists(repo, "1".repeat(40))).toBe(false);
  });

  it("index.lock: taze kilitte 3 deneme sonra locked; 60 sn'den eski kendi kilidimiz siliniyor", async () => {
    initRepo();
    const sleeps: number[] = [];
    const port = createGitPort({ sleep: async (ms) => void sleeps.push(ms) });
    writeFileSync(`${indexFile}.lock`, "");
    expect(await port.snapshot(repo, indexFile, 20_000)).toEqual({ ok: false, reason: "locked" });
    expect(sleeps).toHaveLength(LOCK_RETRIES - 1);
    const old = (Date.now() - 120_000) / 1000;
    utimesSync(`${indexFile}.lock`, old, old);
    const result = await port.snapshot(repo, indexFile, 20_000);
    expect(result.ok).toBe(true);
    expect(existsSync(`${indexFile}.lock`)).toBe(false);
  });

  it("geri yükleme junction ile kök dışına yazmıyor", async () => {
    initRepo();
    const outside = path.join(base, "disari");
    mkdirSync(outside);
    write("kopru/x.txt", "depodaki\n");
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok) throw new Error("görüntü");
    rmSync(path.join(repo, "kopru"), { recursive: true, force: true });
    symlinkSync(outside, path.join(repo, "kopru"), "junction");
    const restoreIndex = path.join(base, "veri", "j.index");
    await port.loadIndex(repo, restoreIndex, one.tree);
    expect(await port.restoreFile(repo, restoreIndex, "kopru/x.txt")).toBe(false);
    port.discardIndex(restoreIndex);
    expect(existsSync(path.join(outside, "x.txt"))).toBe(false);
  });
});

describe("sahte koşucu", () => {
  const result = (over: Partial<GitResult> = {}): GitResult => ({ ok: true, code: 0, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false, ...over });

  it("git yok: probe ve snapshot noGit", async () => {
    const run: GitRun = async () => result({ ok: false, code: null, missing: true });
    const port = createGitPort({ run });
    expect(await port.probe("C:/x")).toEqual({ ok: false, reason: "noGit" });
    expect(await port.snapshot("C:/x", path.join(os.tmpdir(), "yok.index"), 20_000)).toEqual({ ok: false, reason: "noGit" });
  });

  it("süre aşımı: timeout; 'dubious ownership' notRepo değil git", async () => {
    const port = createGitPort({ run: async () => result({ ok: false, code: null, timedOut: true }) });
    expect(await port.probe("C:/x")).toEqual({ ok: false, reason: "timeout" });
    expect(await port.snapshot("C:/x", path.join(os.tmpdir(), "yok.index"), 20_000)).toEqual({ ok: false, reason: "timeout" });
    const dubious = createGitPort({ run: async () => result({ ok: false, code: 128, stderr: "fatal: detected dubious ownership in repository" }) });
    expect(await dubious.probe("C:/x")).toEqual({ ok: false, reason: "git" });
  });

  it("her çağrı sabit önek argümanları ve özel index ortamıyla; kabuk yok", async () => {
    const calls: { args: readonly string[]; indexFile?: string }[] = [];
    const run: GitRun = async (args, opts) => {
      calls.push({ args, indexFile: opts.indexFile });
      if (args[0] === "write-tree") return result({ stdout: `${"a".repeat(40)}\n` });
      return result();
    };
    const port = createGitPort({ run });
    const idx = path.join(os.tmpdir(), `yok-${process.pid}.index`);
    expect(await port.snapshot("C:/x", idx, 20_000)).toEqual({ ok: true, tree: "a".repeat(40) });
    expect(calls.map((c) => c.args.join(" "))).toEqual(["read-tree HEAD", "add -A -- .", "write-tree"]);
    expect(calls.every((c) => c.indexFile === idx)).toBe(true);
  });

  it("güvensiz yol ve ağaç kimliği git'e hiç gitmiyor", async () => {
    const calls: (readonly string[])[] = [];
    const run: GitRun = async (args) => {
      calls.push(args);
      return result({ stdout: "1\n" });
    };
    const port = createGitPort({ run });
    const tree = "a".repeat(40);
    const idx = path.join(os.tmpdir(), `yok-${process.pid}.r.index`);
    for (const bad of ["../disari.txt", "C:/Windows/x", "a\\b.txt", ".git/config", "a.txt:akış", "/kok.txt"]) {
      expect(await port.restoreFile(base, idx, bad)).toBe(false);
      expect(await port.fileDiff(base, "", tree, tree, { path: bad, status: "modified", added: 1, deleted: 1, binary: false })).toBeNull();
    }
    // Önek de birleşik yolun parçası: önekle kaçış da reddediliyor.
    expect(await port.fileDiff(base, "../", tree, tree, { path: "a.txt", status: "modified", added: 1, deleted: 1, binary: false })).toBeNull();
    expect(await port.loadIndex(base, idx, "HEAD")).toBe(false);
    expect(await port.diffTrees(base, "", "HEAD", tree)).toEqual({ ok: false, reason: "git" });
    // Boş ya da göreli index dosyası git'i kullanıcının .git/index'ine düşürürdü: hiç çalıştırılmıyor.
    for (const badIndex of ["", "w.index"]) {
      expect(await port.snapshot(base, badIndex, 20_000)).toEqual({ ok: false, reason: "git" });
      expect(await port.loadIndex(base, badIndex, tree)).toBe(false);
      expect(await port.restoreFile(base, badIndex, "a.txt")).toBe(false);
    }
    expect(calls).toEqual([]);
  });

  it("gitEnv: kullanıcının GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE'ı siliniyor; istem ve isteğe bağlı kilit kapalı", () => {
    const saved = { ...process.env };
    process.env.GIT_DIR = "C:/baska";
    process.env.GIT_WORK_TREE = "C:/baska";
    process.env.GIT_INDEX_FILE = "C:/baska/index";
    try {
      const env = gitEnv();
      expect(env.GIT_DIR).toBeUndefined();
      expect(env.GIT_WORK_TREE).toBeUndefined();
      expect(env.GIT_INDEX_FILE).toBeUndefined();
      expect(env.GIT_TERMINAL_PROMPT).toBe("0");
      expect(env.GIT_OPTIONAL_LOCKS).toBe("0");
      expect(gitEnv("C:/veri/w.index").GIT_INDEX_FILE).toBe("C:/veri/w.index");
    } finally {
      process.env = saved;
    }
  });
});

describe("insideRootReal (spec §6.4)", () => {
  it("kök içi var olan ve olmayan yol kabul; .. ve mutlak reddediliyor", () => {
    const root = path.join(base, "kok");
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "a.ts"), "");
    expect(insideRootReal(root, "src/a.ts")).toBe(true);
    expect(insideRootReal(root, "yeni/klasor/dosya.txt")).toBe(true);
    expect(insideRootReal(root, "../disari.txt")).toBe(false);
    expect(insideRootReal(root, "C:/Windows/x")).toBe(false);
    expect(insideRootReal(path.join(base, "olmayan-kok"), "a.txt")).toBe(false);
  });

  it("junction ile dışarı çıkış reddediliyor", () => {
    const root = path.join(base, "kok");
    const outside = path.join(base, "disari");
    mkdirSync(root);
    mkdirSync(outside);
    writeFileSync(path.join(outside, "gizli.txt"), "");
    symlinkSync(outside, path.join(root, "kopru"), "junction");
    expect(insideRootReal(root, "kopru/gizli.txt")).toBe(false);
    expect(insideRootReal(root, "kopru/yeni.txt")).toBe(false);
  });

  it("isWithin: kök kendisi ve altı içeride; kardeş ve ..lı ad dışarıda değil yanlış sayılmıyor", () => {
    const root = path.join(base, "kok");
    expect(isWithin(root, root)).toBe(true);
    expect(isWithin(root, path.join(root, "a", "b"))).toBe(true);
    expect(isWithin(root, path.join(root, "..kok2"))).toBe(true);
    expect(isWithin(root, path.join(base, "kok2"))).toBe(false);
  });
});
