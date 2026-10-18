// Değişiklikler: git katmanı (spec 2026-10-18 degisiklikler §2, §6, §7, §9).
// Geçici klasörde GERÇEK bir test deposu. `git` PATH'te yoksa gerçek depo
// testleri atlanıyor ve sebebi yazılıyor; sahte koşucuyla olanlar her zaman çalışıyor.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGitPort, createGitRunner, GIT_BASE_ARGS, gitEnv, type ExecFileLike, type GitResult, type GitRun } from "../app-electron/main/changesGit";
import { dirIsEmpty, insideRootReal, isWithin, pathKind, removeEmptyDir } from "../app-electron/main/changesFs";
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
/** Uygulamanın index klasörü (testte `veri`). */
const dataDir = () => path.dirname(indexFile);
/**
 * Ortam değişkenlerini geçici olarak koyar ve anahtar anahtar geri yükler.
 * `process.env`'i düz bir nesneyle değiştirmek Windows'taki harfe duyarsız
 * özel nesneyi bozardı.
 */
async function withEnv(vars: Record<string, string>, fn: () => unknown): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(vars)) {
    previous.set(key, process.env[key]);
    process.env[key] = vars[key];
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
function initRepo() {
  g("init", "-q", "-b", "ana");
  g("config", "core.autocrlf", "false");
  // Arka plan bakımı (commit sonrası) paylaşılan index'in tarihini tazeleyip testleri yanlış yeşile çevirmesin.
  g("config", "gc.auto", "0");
  g("config", "maintenance.auto", "false");
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
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
    const port = createGitPort({ indexDir: dataDir() });
    const one = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok) throw new Error("görüntü");
    expect(await port.treeExists(repo, one.tree)).toBe(true);
    expect(await port.treeExists(repo, "1".repeat(40))).toBe(false);
  });

  it("index.lock: taze kilitte 3 deneme sonra locked; 60 sn'den eski kendi kilidimiz siliniyor", async () => {
    initRepo();
    const sleeps: number[] = [];
    const port = createGitPort({ indexDir: dataDir(), sleep: async (ms) => void sleeps.push(ms) });
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
    const port = createGitPort({ indexDir: dataDir() });
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

  it("core.splitIndex=true depoda eskimiş paylaşılan index silinmiyor; kullanıcının status'u ve aşamalanmışı duruyor", async () => {
    initRepo();
    g("config", "core.splitIndex", "true");
    g("update-index", "--split-index");
    write("src/b.ts", "export const b = 5;\n");
    g("add", "src/b.ts");
    const shared = readdirSync(path.join(repo, ".git")).filter((n) => n.startsWith("sharedindex."));
    expect(shared.length).toBeGreaterThan(0);
    const staged = g("diff", "--cached", "--name-only");
    const before = userState();
    // Eskitme EN SON: kullanıcının index'ini okuyan her git komutu paylaşılan index'in tarihini tazeliyor.
    const old = new Date("2020-01-01T00:00:00Z");
    for (const n of shared) utimesSync(path.join(repo, ".git", n), old, old);
    const port = createGitPort({ indexDir: dataDir() });
    write("yeni.txt", "izlenmeyen\n");
    const one = await port.snapshot(repo, indexFile, 20_000);
    expect(one.ok).toBe(true);
    write("yeni.txt", "değişti\n");
    expect((await port.snapshot(repo, indexFile, 20_000)).ok).toBe(true);
    rmSync(path.join(repo, "yeni.txt"));
    for (const n of shared) expect(existsSync(path.join(repo, ".git", n))).toBe(true);
    // userState içindeki `git status` rc!=0 olsa fırlatır.
    expect(userState()).toEqual(before);
    expect(g("diff", "--cached", "--name-only")).toBe(staged);
  });

  it("süreç ortamındaki GIT_* değişkenleri (GIT_DIR, GIT_CEILING_DIRECTORIES, GIT_CONFIG_PARAMETERS) çağrılara karışmıyor", async () => {
    initRepo();
    const other = path.join(base, "baska");
    mkdirSync(other);
    execFileSync("git", ["init", "-q"], { cwd: other, windowsHide: true });
    const excludes = path.join(base, "dislanan");
    writeFileSync(excludes, "*.txt\n");
    const vars = {
      GIT_DIR: path.join(other, ".git"),
      GIT_CEILING_DIRECTORIES: repo,
      GIT_CONFIG_PARAMETERS: `'core.excludesfile'='${excludes.replace(/\\/g, "/")}'`
    };
    await withEnv(vars, async () => {
      const port = createGitPort({ indexDir: dataDir() });
      const probe = await port.probe(path.join(repo, "src"));
      expect(probe.ok && probe.prefix).toBe("src/");
      expect(probe.ok && path.resolve(probe.top)).toBe(path.resolve(repo));
      const one = await port.snapshot(repo, indexFile, 20_000);
      write("yeni.txt", "görünmeli\n");
      const two = await port.snapshot(repo, indexFile, 20_000);
      if (!one.ok || !two.ok) throw new Error("görüntü");
      const diff = await port.diffTrees(repo, "", one.tree, two.tree);
      expect(diff.ok && diff.files.map((f) => f.path)).toEqual(["yeni.txt"]);
    });
    for (const key of Object.keys(vars)) expect(process.env[key]).toBeUndefined();
  });

  it("kullanıcının .git/index'i index dosyası olarak verilirse silinmiyor ve yazılmıyor", async () => {
    initRepo();
    const userIndex = path.join(repo, ".git", "index");
    const before = readFileSync(userIndex);
    // Yanlış yapılandırma: index klasörü deponun kendisi. .git denetimi yine korumalı.
    const port = createGitPort({ indexDir: repo });
    const one = await createGitPort({ indexDir: dataDir() }).snapshot(repo, indexFile, 20_000);
    if (!one.ok) throw new Error("görüntü");
    expect(await port.loadIndex(repo, userIndex, one.tree)).toBe(false);
    expect(await port.snapshot(repo, userIndex, 20_000)).toEqual({ ok: false, reason: "git" });
    expect(await port.restoreFile(repo, userIndex, "a.txt")).toBe(false);
    port.discardIndex(userIndex);
    expect(existsSync(userIndex)).toBe(true);
    expect(readFileSync(userIndex).equals(before)).toBe(true);
  });

  it("8.3 kısa adıyla (GIT~1\\index) verilen kullanıcı index'i de reddediliyor", async (ctx) => {
    initRepo();
    const shortDir = path.join(repo, "GIT~1");
    // Birimde 8.3 ad üretimi kapalıysa bu yol yok; sınanacak bir şey kalmıyor.
    if (process.platform !== "win32" || !existsSync(shortDir)) ctx.skip();
    const userIndex = path.join(repo, ".git", "index");
    const before = readFileSync(userIndex);
    const viaShort = path.join(shortDir, "index");
    const port = createGitPort({ indexDir: repo });
    const one = await createGitPort({ indexDir: dataDir() }).snapshot(repo, indexFile, 20_000);
    if (!one.ok) throw new Error("görüntü");
    expect(await port.loadIndex(repo, viaShort, one.tree)).toBe(false);
    expect(await port.snapshot(repo, viaShort, 20_000)).toEqual({ ok: false, reason: "git" });
    expect(await port.restoreFile(repo, viaShort, "a.txt")).toBe(false);
    port.discardIndex(viaShort);
    expect(existsSync(userIndex)).toBe(true);
    expect(readFileSync(userIndex).equals(before)).toBe(true);
  });
});

describe("sahte koşucu", () => {
  const result = (over: Partial<GitResult> = {}): GitResult => ({ ok: true, code: 0, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false, ...over });

  it("git yok: probe ve snapshot noGit", async () => {
    const run: GitRun = async () => result({ ok: false, code: null, missing: true });
    const port = createGitPort({ run, indexDir: os.tmpdir() });
    expect(await port.probe("C:/x")).toEqual({ ok: false, reason: "noGit" });
    expect(await port.snapshot("C:/x", path.join(os.tmpdir(), "yok.index"), 20_000)).toEqual({ ok: false, reason: "noGit" });
  });

  it("süre aşımı: timeout; 'dubious ownership' notRepo değil git", async () => {
    const port = createGitPort({ indexDir: os.tmpdir(), run: async () => result({ ok: false, code: null, timedOut: true }) });
    expect(await port.probe("C:/x")).toEqual({ ok: false, reason: "timeout" });
    expect(await port.snapshot("C:/x", path.join(os.tmpdir(), "yok.index"), 20_000)).toEqual({ ok: false, reason: "timeout" });
    const dubious = createGitPort({ indexDir: os.tmpdir(), run: async () => result({ ok: false, code: 128, stderr: "fatal: detected dubious ownership in repository" }) });
    expect(await dubious.probe("C:/x")).toEqual({ ok: false, reason: "git" });
  });

  it("indexDir zorunlu: verilmezse, boşsa ya da göreliyse port oluşturulamıyor", () => {
    expect(() => createGitPort(undefined as never)).toThrow();
    expect(() => createGitPort({} as never)).toThrow();
    expect(() => createGitPort({ indexDir: "" })).toThrow();
    expect(() => createGitPort({ indexDir: "veri" })).toThrow();
    expect(() => createGitPort({ indexDir: null } as never)).toThrow();
  });

  it("indexDir diskte yoksa index işlemlerinin hepsi reddediliyor", async () => {
    const calls: (readonly string[])[] = [];
    const run: GitRun = async (args) => {
      calls.push(args);
      return result({ stdout: `${"a".repeat(40)}\n` });
    };
    const missingDir = path.join(base, "olmayan");
    const port = createGitPort({ run, indexDir: missingDir });
    const file = path.join(missingDir, "w.index");
    expect(await port.snapshot(base, file, 20_000)).toEqual({ ok: false, reason: "git" });
    expect(await port.loadIndex(base, file, "a".repeat(40))).toBe(false);
    expect(await port.restoreFile(base, file, "a.txt")).toBe(false);
    expect(calls).toEqual([]);
  });

  it("index dosyası beklenen klasörün dışındaysa ya da .git içindeyse reddediliyor", async () => {
    const calls: (readonly string[])[] = [];
    const run: GitRun = async (args) => {
      calls.push(args);
      return result({ stdout: `${"a".repeat(40)}\n` });
    };
    const dir = path.join(base, "veri");
    const port = createGitPort({ run, indexDir: dir });
    const outsideFile = path.join(base, "baska.index");
    writeFileSync(outsideFile, "dokunma");
    mkdirSync(path.join(dir, ".GIT"));
    const gitDirFile = path.join(dir, ".GIT", "index");
    const tree = "a".repeat(40);
    for (const bad of [outsideFile, gitDirFile, path.join(dir, "..", "baska.index"), dir]) {
      expect(await port.snapshot(base, bad, 20_000)).toEqual({ ok: false, reason: "git" });
      expect(await port.loadIndex(base, bad, tree)).toBe(false);
      expect(await port.restoreFile(base, bad, "a.txt")).toBe(false);
      port.discardIndex(bad);
    }
    expect(readFileSync(outsideFile, "utf8")).toBe("dokunma");
    expect(calls).toEqual([]);
    expect(await port.loadIndex(base, path.join(dir, "w.index"), tree)).toBe(true);
  });

  it("runGitDefault: execFile'a sabit önek argümanları, kabuksuz seçenekler; süre aşımı ve git yok sınıflanıyor", async () => {
    expect(GIT_BASE_ARGS).toEqual([
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.quotepath=false",
      "-c",
      "core.splitIndex=false",
      "-c",
      "splitIndex.sharedIndexExpire=never",
      "-c",
      "core.safecrlf=false"
    ]);
    const seen: { file: string; args: readonly string[]; opts: Record<string, unknown> }[] = [];
    let reply: { err: unknown; stdout: string } = { err: null, stdout: "ok" };
    const exec: ExecFileLike = (file, args, opts, cb) => {
      seen.push({ file, args, opts: opts as unknown as Record<string, unknown> });
      cb(reply.err as Error | null, reply.stdout, "");
    };
    const runner = createGitRunner(exec);
    const idx = path.join(base, "veri", "w.index");
    expect(await runner(["write-tree"], { cwd: base, indexFile: idx, timeoutMs: 1234 })).toMatchObject({ ok: true, stdout: "ok" });
    const call = seen[0];
    expect(call.file).toBe("git");
    expect(call.args).toEqual([...GIT_BASE_ARGS, "write-tree"]);
    expect(call.opts.shell).toBeUndefined();
    expect(call.opts.windowsHide).toBe(true);
    expect(call.opts.timeout).toBe(1234);
    expect(typeof call.opts.maxBuffer).toBe("number");
    expect(call.opts.cwd).toBe(base);
    expect((call.opts.env as NodeJS.ProcessEnv).GIT_INDEX_FILE).toBe(idx);
    reply = { err: Object.assign(new Error("öldürüldü"), { killed: true, signal: "SIGTERM", code: null }), stdout: "" };
    expect(await runner(["add"], { cwd: base, timeoutMs: 1 })).toMatchObject({ ok: false, timedOut: true, missing: false });
    reply = { err: Object.assign(new Error("öldürüldü"), { killed: false, signal: "SIGTERM", code: null }), stdout: "" };
    expect(await runner(["add"], { cwd: base, timeoutMs: 1 })).toMatchObject({ ok: false, timedOut: true });
    reply = { err: Object.assign(new Error("yok"), { code: "ENOENT" }), stdout: "" };
    expect(await runner(["add"], { cwd: base, timeoutMs: 1 })).toMatchObject({ ok: false, missing: true, timedOut: false });
    reply = { err: Object.assign(new Error("büyük"), { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", killed: true, signal: "SIGTERM" }), stdout: "yarım" };
    expect(await runner(["diff-tree"], { cwd: base, timeoutMs: 1 })).toMatchObject({ ok: false, tooBig: true, timedOut: false, stdout: "yarım" });
    reply = { err: Object.assign(new Error("çıktı 128"), { code: 128 }), stdout: "" };
    expect(await runner(["add"], { cwd: base, timeoutMs: 1 })).toMatchObject({ ok: false, code: 128, timedOut: false });
  });

  it("her çağrı özel index ortamıyla, sabit komut sırasıyla", async () => {
    const calls: { args: readonly string[]; indexFile?: string }[] = [];
    const run: GitRun = async (args, opts) => {
      calls.push({ args, indexFile: opts.indexFile });
      if (args[0] === "write-tree") return result({ stdout: `${"a".repeat(40)}\n` });
      return result();
    };
    const port = createGitPort({ run, indexDir: os.tmpdir() });
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
    const port = createGitPort({ run, indexDir: os.tmpdir() });
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

  it("gitEnv: kullanıcının bütün GIT_* değişkenleri (harf büyüklüğünden bağımsız) siliniyor; istem ve isteğe bağlı kilit kapalı", async () => {
    const vars = {
      GIT_DIR: "C:/baska",
      GIT_WORK_TREE: "C:/baska",
      GIT_INDEX_FILE: "C:/baska/index",
      GIT_CONFIG_PARAMETERS: "'core.splitindex'='true'",
      GIT_CONFIG_COUNT: "1",
      GIT_OBJECT_DIRECTORY: "C:/baska/objects",
      Git_Namespace: "x"
    };
    const envBefore = { ...process.env };
    await withEnv(vars, () => {
      const env = gitEnv();
      expect(Object.keys(env).filter((k) => /^git_/i.test(k)).sort()).toEqual(["GIT_OPTIONAL_LOCKS", "GIT_TERMINAL_PROMPT"]);
      expect(env.GIT_DIR).toBeUndefined();
      expect(env.GIT_WORK_TREE).toBeUndefined();
      expect(env.GIT_INDEX_FILE).toBeUndefined();
      expect(env.GIT_TERMINAL_PROMPT).toBe("0");
      expect(env.GIT_OPTIONAL_LOCKS).toBe("0");
      expect(gitEnv("C:/veri/w.index").GIT_INDEX_FILE).toBe("C:/veri/w.index");
    });
    // Anahtar anahtar geri yüklendi: ortam testten önceki hâlinde.
    expect({ ...process.env }).toEqual(envBefore);
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

describe("pathKind ve removeEmptyDir (gerçek geçici klasör)", () => {
  it("pathKind: dosya, klasör, yok; junction ve dosya sembolik bağı 'link'; üst parça yoksa 'none'", () => {
    const root = path.join(base, "kok");
    const outside = path.join(base, "disari");
    mkdirSync(path.join(root, "klasor"), { recursive: true });
    mkdirSync(outside);
    writeFileSync(path.join(root, "a.txt"), "x");
    symlinkSync(outside, path.join(root, "kopru"), "junction");
    expect(pathKind(root, "a.txt")).toBe("file");
    expect(pathKind(root, "klasor")).toBe("dir");
    expect(pathKind(root, "yok.txt")).toBe("none");
    expect(pathKind(root, "yok/ic/x.txt")).toBe("none");
    expect(pathKind(root, "kopru")).toBe("link");
    // Dosya sembolik bağı Windows'ta yetki isteyebilir: oluşturulamazsa bu kısım atlanıyor.
    let fileLink = true;
    try {
      symlinkSync(path.join(root, "a.txt"), path.join(root, "bag.txt"), "file");
    } catch {
      fileLink = false;
    }
    if (fileLink) expect(pathKind(root, "bag.txt")).toBe("link");
  });

  it("pathKind: lstat'ın ENOENT dışı hatası fırlatıyor (yönetici çakışma sayıyor)", () => {
    const root = path.join(base, "kok");
    mkdirSync(root);
    // NUL baytı: Node ERR_INVALID_ARG_VALUE fırlatıyor; "none" sayılmamalı.
    expect(() => pathKind(root, "a\u0000b")).toThrow(/null bytes|ERR_INVALID_ARG_VALUE|string without null/i);
  });

  it("removeEmptyDir: yalnız gerçekten boş, bağ olmayan klasör; dolu/dosya/yok/junction false, hedef korunuyor", () => {
    const root = path.join(base, "kok");
    const outside = path.join(base, "disari");
    mkdirSync(path.join(root, "bos"), { recursive: true });
    mkdirSync(path.join(root, "dolu", "ic"), { recursive: true });
    writeFileSync(path.join(root, "dolu", "ic", "x.txt"), "x");
    writeFileSync(path.join(root, "a.txt"), "x");
    mkdirSync(outside);
    symlinkSync(outside, path.join(root, "kopru"), "junction");
    expect(removeEmptyDir(root, "bos")).toBe(true);
    expect(existsSync(path.join(root, "bos"))).toBe(false);
    expect(removeEmptyDir(root, "dolu")).toBe(false);
    expect(readFileSync(path.join(root, "dolu", "ic", "x.txt"), "utf8")).toBe("x");
    expect(removeEmptyDir(root, "a.txt")).toBe(false);
    expect(existsSync(path.join(root, "a.txt"))).toBe(true);
    expect(removeEmptyDir(root, "yok")).toBe(false);
    // Boş hedefi gösteren junction bile kaldırılmıyor.
    expect(removeEmptyDir(root, "kopru")).toBe(false);
    expect(pathKind(root, "kopru")).toBe("link");
    expect(existsSync(outside)).toBe(true);
  });

  it("dirIsEmpty: salt okur; boş klasör true ve yerinde kalıyor; dolu/dosya/yok/junction false", () => {
    const root = path.join(base, "kok");
    const outside = path.join(base, "disari");
    mkdirSync(path.join(root, "bos"), { recursive: true });
    mkdirSync(path.join(root, "dolu"), { recursive: true });
    writeFileSync(path.join(root, "dolu", "x.txt"), "x");
    writeFileSync(path.join(root, "a.txt"), "x");
    mkdirSync(outside);
    symlinkSync(outside, path.join(root, "kopru"), "junction");
    expect(dirIsEmpty(root, "bos")).toBe(true);
    expect(existsSync(path.join(root, "bos"))).toBe(true);
    expect(dirIsEmpty(root, "dolu")).toBe(false);
    expect(dirIsEmpty(root, "a.txt")).toBe(false);
    expect(dirIsEmpty(root, "yok")).toBe(false);
    expect(dirIsEmpty(root, "kopru")).toBe(false);
  });
});
