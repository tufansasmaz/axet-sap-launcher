// Değişiklikler görünümünün git katmanı (spec 2026-10-18 degisiklikler §2, §6, §7).
//
// Kurallar:
//   - Git yalnız execFile + sabit argümanla, kabuksuz. Argümana yalnız
//     doğrulanmış ağaç kimliği, `:(top,literal)` belirteçli doğrulanmış yol ve
//     git'in kendi verdiği önek giriyor.
//   - Kullanıcının index'i, HEAD'i, dalı, stash'i ve ref'leri DEĞİŞMEZ: index'e
//     yazan her komut GIT_INDEX_FILE ile uygulamaya ait bir dosyada çalışıyor;
//     ağaç ve blob yalnız nesne veritabanına gidiyor. Index dosyası boş ya da
//     göreli verilirse komut hiç çalıştırılmıyor (boş değer git'i kullanıcının
//     `.git/index`'ine düşürürdü).
//   - Dosya yolu git'e gitmeden önce `isSafeRelPath`; çalışma ağacına yazan
//     geri yüklemede ayrıca `insideRootReal` (junction/sembolik bağ ile kök dışı).
//   - Hiçbir yol hata fırlatmıyor; sonuç her zaman bir değer.
import { execFile } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath, isTreeId, mergeChanges, parseNameStatusZ, parseNumstatZ, parseUnifiedDiff } from "../shared/changesLogic";
import {
  DIFF_MAX_BYTES,
  GIT_TIMEOUT_MS,
  LARGE_FILE_BYTES,
  LOCK_RETRIES,
  LOCK_RETRY_MS,
  STALE_LOCK_MS,
  type FileChange,
  type FileDiff
} from "../shared/changesTypes";
import { insideRootReal } from "./changesFs";

export interface GitResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Çıktı maxBuffer'ı aştı; stdout o ana kadarki kısım. */
  tooBig: boolean;
  /** git bulunamadı (ENOENT). */
  missing: boolean;
}

export interface GitRunOptions {
  cwd: string;
  indexFile?: string;
  timeoutMs: number;
  maxBuffer?: number;
}

export type GitRun = (args: readonly string[], opts: GitRunOptions) => Promise<GitResult>;

/** fsmonitor arka plan süreci başlatılmasın; yollar tırnaklanmasın. */
export const GIT_BASE_ARGS: readonly string[] = ["-c", "core.fsmonitor=false", "-c", "core.quotepath=false"];

export function gitEnv(indexFile?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
  // Kullanıcının ortamındaki yönlendirmeler bizim komutlarımıza karışmasın.
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  if (indexFile) env.GIT_INDEX_FILE = indexFile;
  return env;
}

const FAILED: GitResult = { ok: false, code: null, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false };

export const runGitDefault: GitRun = (args, opts) =>
  new Promise<GitResult>((resolve) => {
    try {
      execFile(
        "git",
        [...GIT_BASE_ARGS, ...args],
        {
          cwd: opts.cwd,
          env: gitEnv(opts.indexFile),
          timeout: opts.timeoutMs,
          windowsHide: true,
          maxBuffer: opts.maxBuffer ?? DIFF_MAX_BYTES,
          encoding: "utf8"
        },
        (err, stdout, stderr) => {
          const e = err as (Error & { code?: unknown; killed?: boolean; signal?: unknown }) | null;
          const missing = e?.code === "ENOENT";
          const tooBig = e?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
          // Süre aşımında Node süreci öldürüyor: `killed` ya da sinyal dolu geliyor.
          const killed = !!e && (e.killed === true || (typeof e.signal === "string" && e.signal !== ""));
          resolve({
            ok: !e,
            code: !e ? 0 : typeof e.code === "number" ? e.code : null,
            stdout: String(stdout ?? ""),
            stderr: String(stderr ?? ""),
            timedOut: !missing && !tooBig && killed,
            tooBig,
            missing
          });
        }
      );
    } catch {
      resolve({ ...FAILED });
    }
  });

export type ProbeResult = { ok: true; top: string; prefix: string } | { ok: false; reason: "notRepo" | "noGit" | "git" | "timeout" };
export type SnapshotOutcome = { ok: true; tree: string } | { ok: false; reason: "noGit" | "locked" | "timeout" | "git" };
export type TreesDiff = { ok: true; files: FileChange[]; truncated: boolean } | { ok: false; reason: "git" | "timeout" };

export interface GitPort {
  probe(cwd: string): Promise<ProbeResult>;
  snapshot(cwd: string, indexFile: string, timeoutMs: number): Promise<SnapshotOutcome>;
  treeExists(cwd: string, tree: string): Promise<boolean>;
  diffTrees(cwd: string, prefix: string, a: string, b: string): Promise<TreesDiff>;
  fileDiff(cwd: string, prefix: string, a: string, b: string, change: FileChange): Promise<FileDiff | null>;
  loadIndex(top: string, indexFile: string, tree: string): Promise<boolean>;
  restoreFile(top: string, indexFile: string, fullPath: string): Promise<boolean>;
  discardIndex(indexFile: string): void;
}

export interface GitPortDeps {
  run: GitRun;
  sleep(ms: number): Promise<void>;
  now(): number;
}

const literal = (fullPath: string) => `:(top,literal)${fullPath}`;
const relative = (prefix: string): string[] => (prefix ? [`--relative=${prefix}`] : []);

/** Uygulamaya ait index dosyası: boş ya da göreli olamaz. */
const isOwnIndex = (indexFile: string): boolean => typeof indexFile === "string" && indexFile.length > 0 && path.isAbsolute(indexFile);

/** Önek git'ten geliyor; yine de boş ya da `/` ile biten güvenli bir göreli yol olmalı. */
const isSafePrefix = (prefix: string): boolean => prefix === "" || (prefix.endsWith("/") && isSafeRelPath(prefix.slice(0, -1)));

function removeQuietly(file: string): void {
  try {
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // silinemeyen geçici dosya bir sonraki işte yeniden denenir
  }
}

export function createGitPort(partial: Partial<GitPortDeps> = {}): GitPort {
  const deps: GitPortDeps = {
    run: partial.run ?? runGitDefault,
    sleep: partial.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms))),
    now: partial.now ?? (() => Date.now())
  };
  const run = async (args: readonly string[], opts: GitRunOptions): Promise<GitResult> => {
    try {
      return await deps.run(args, opts);
    } catch {
      return { ...FAILED };
    }
  };

  /** Çökmüş bir git'ten kalan KENDİ kilidimiz (spec sapma 10). Kullanıcının `.git/index.lock`'una dokunulmuyor. */
  function clearStaleLock(indexFile: string): void {
    const lock = `${indexFile}.lock`;
    try {
      if (existsSync(lock) && deps.now() - statSync(lock).mtimeMs > STALE_LOCK_MS) unlinkSync(lock);
    } catch {
      // kilit silinemezse add aşağıda "locked" der
    }
  }

  return {
    async probe(cwd) {
      const r = await run(["rev-parse", "--is-inside-work-tree", "--show-toplevel", "--show-prefix"], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (r.missing) return { ok: false, reason: "noGit" };
      if (r.timedOut) return { ok: false, reason: "timeout" };
      if (!r.ok) return { ok: false, reason: /not a git repository/i.test(r.stderr) ? "notRepo" : "git" };
      const [inside, top, prefix = ""] = r.stdout.replace(/\r/g, "").split("\n");
      if (inside !== "true" || !top) return { ok: false, reason: "notRepo" };
      if (!isSafePrefix(prefix)) return { ok: false, reason: "git" };
      return { ok: true, top, prefix };
    },

    async snapshot(cwd, indexFile, timeoutMs) {
      if (!isOwnIndex(indexFile)) return { ok: false, reason: "git" };
      const deadline = deps.now() + timeoutMs;
      const left = () => Math.max(1, deadline - deps.now());
      clearStaleLock(indexFile);
      // İlk kullanım: HEAD ile tohumla (izlenen ama .gitignore'a takılan dosyalar da görüntüde; HEAD yoksa önemsiz).
      if (!existsSync(indexFile)) {
        const seed = await run(["read-tree", "HEAD"], { cwd, indexFile, timeoutMs: left() });
        if (seed.missing) return { ok: false, reason: "noGit" };
        if (seed.timedOut) return { ok: false, reason: "timeout" };
        if (!seed.ok) removeQuietly(indexFile);
      }
      for (let attempt = 1; ; attempt++) {
        const add = await run(["add", "-A", "--", "."], { cwd, indexFile, timeoutMs: left() });
        if (add.ok) break;
        if (add.missing) return { ok: false, reason: "noGit" };
        if (add.timedOut || deps.now() >= deadline) return { ok: false, reason: "timeout" };
        if (!/index\.lock/i.test(add.stderr)) return { ok: false, reason: "git" };
        if (attempt >= LOCK_RETRIES) return { ok: false, reason: "locked" };
        await deps.sleep(LOCK_RETRY_MS);
      }
      const written = await run(["write-tree"], { cwd, indexFile, timeoutMs: left() });
      if (!written.ok) return { ok: false, reason: written.timedOut ? "timeout" : "git" };
      const tree = written.stdout.trim();
      return isTreeId(tree) ? { ok: true, tree } : { ok: false, reason: "git" };
    },

    async treeExists(cwd, tree) {
      if (!isTreeId(tree)) return false;
      const r = await run(["cat-file", "-e", `${tree}^{tree}`], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    async diffTrees(cwd, prefix, a, b) {
      if (!isTreeId(a) || !isTreeId(b) || !isSafePrefix(prefix)) return { ok: false, reason: "git" };
      const common = ["diff-tree", "-r", "--no-renames", "-z", ...relative(prefix)];
      const names = await run([...common, "--name-status", a, b], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (!names.ok && !names.tooBig) return { ok: false, reason: names.timedOut ? "timeout" : "git" };
      const nums = await run([...common, "--numstat", a, b], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (!nums.ok && !nums.tooBig) return { ok: false, reason: nums.timedOut ? "timeout" : "git" };
      const files = mergeChanges(parseNameStatusZ(names.stdout), parseNumstatZ(nums.stdout)).filter((f) => isSafeRelPath(f.path));
      return { ok: true, files, truncated: names.tooBig || nums.tooBig };
    },

    async fileDiff(cwd, prefix, a, b, change) {
      if (!isSafePrefix(prefix) || !isSafeRelPath(change.path)) return null;
      const full = prefix + change.path;
      if (!isSafeRelPath(full)) return null;
      if (change.binary) return { kind: "binary" };
      if (!isTreeId(a) || !isTreeId(b)) return null;
      const sides: string[] = [];
      if (change.status !== "added") sides.push(a);
      if (change.status !== "deleted") sides.push(b);
      for (const tree of sides) {
        const size = await run(["cat-file", "-s", `${tree}:${full}`], { cwd, timeoutMs: GIT_TIMEOUT_MS });
        if (!size.ok) return null;
        if (Number(size.stdout.trim()) > LARGE_FILE_BYTES) return { kind: "large" };
      }
      const patch = await run(
        ["diff-tree", "-r", "-p", "--no-renames", "--no-color", "--no-ext-diff", "--no-textconv", "-U3", a, b, "--", literal(full)],
        { cwd, timeoutMs: GIT_TIMEOUT_MS, maxBuffer: DIFF_MAX_BYTES }
      );
      if (!patch.ok && !patch.tooBig) return null;
      const parsed = parseUnifiedDiff(patch.stdout, patch.tooBig);
      return { kind: "text", lines: parsed.lines, truncated: parsed.truncated };
    },

    async loadIndex(top, indexFile, tree) {
      if (!isTreeId(tree) || !isOwnIndex(indexFile)) return false;
      removeQuietly(indexFile);
      const r = await run(["read-tree", tree], { cwd: top, indexFile, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    async restoreFile(top, indexFile, fullPath) {
      if (!isOwnIndex(indexFile) || !isSafeRelPath(fullPath)) return false;
      // Yazmadan hemen önce: junction/sembolik bağ ile deponun kökü dışına çıkış yok.
      if (!insideRootReal(top, fullPath)) return false;
      // checkout-index yol belirteci değil düz yol alıyor (deponun köküne göre).
      const r = await run(["checkout-index", "-f", "--", fullPath], { cwd: top, indexFile, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    discardIndex(indexFile) {
      if (!isOwnIndex(indexFile)) return;
      removeQuietly(indexFile);
      removeQuietly(`${indexFile}.lock`);
    }
  };
}
