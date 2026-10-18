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
//   - Index dosyası uygulamanın kendi klasöründe olmalı (`indexDir`) ve hiçbir
//     zaman bir `.git` klasörünün içinde olamaz: yükleme ve atma o dosyayı
//     SİLİYOR, yanlış yol kullanıcının index'ini silerdi.
//   - Hiçbir yol hata fırlatmıyor; sonuç her zaman bir değer.
//
// Bilinen, bu katmanda kapatılmayan riskler:
//   - `git add` deponun `filter.<sürücü>.clean` komutunu, `checkout-index` de
//     `smudge`'ı çalıştırıyor (ör. Git LFS). Sürücü komutu yalnız kullanıcının
//     kendi `.git/config`'inden ya da global yapılandırmasından gelir, klonla
//     taşınmaz; yani kullanıcının kendi `git add`'iyle aynı güven düzeyi.
//     Kapatmak LFS depolarında görüntüyü ve geri yüklemeyi bozardı.
//   - `restoreFile`'da `insideRootReal` denetimi ile `checkout-index`'in
//     yazması arasında kısa bir yarış penceresi var (TOCTOU): o arada bir
//     klasör junction'a çevrilirse git onun üzerinden yazar. Git'in yazma
//     yolunu kilitlemeden kapatılamıyor; pencere milisaniyeler.
import { execFile } from "node:child_process";
import { existsSync, realpathSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath, isTreeId, mergeChanges, parseNumstatZ, parseRawZ, parseUnifiedDiff } from "../shared/changesLogic";
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
import { insideRootReal, isWithin } from "./changesFs";

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

/**
 * fsmonitor arka plan süreci başlatılmasın; yollar tırnaklanmasın.
 * splitIndex kapalı ve paylaşılan index'in süresi dolmuyor: açık olsa bizim
 * index'imize yazan `git add`, `.git/sharedindex.*` dosyalarından eskimiş
 * olanları siliyor; kullanıcının index'inin işaret ettiği dosya da onlardan
 * biriyse `.git/index` okunamaz hâle geliyor (rc=128, aşamalanmış değişiklik kaybı).
 * safecrlf kapalı: binlerce "LF will be replaced by CRLF" uyarısı stderr'i
 * maxBuffer'a taşırıp `add`'i yarıda öldürmesin (geride kilit kalırdı).
 */
/** `git add` hatasında commit'i olmayan iç içe deponun yolu (core.quotepath=false ile ham). */
const NESTED_NO_COMMIT = /error: '(.+?)\/?' does not have a commit checked out/;
/** Bir görüntüde en çok bu kadar iç içe depo atlanır; fazlası "git" hatası. */
const NESTED_EXCLUDE_MAX = 50;

export const GIT_BASE_ARGS: readonly string[] = [
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
];

export function gitEnv(indexFile?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  // Kullanıcının ortamındaki HİÇBİR git değişkeni bizim komutlarımıza karışmasın
  // (GIT_DIR, GIT_CONFIG_PARAMETERS, GIT_OBJECT_DIRECTORY, GIT_CEILING_DIRECTORIES…).
  // Windows'ta ortam anahtarları harf büyüklüğüne duyarsız: karşılaştırma da öyle.
  for (const key of Object.keys(env)) {
    if (/^git_/i.test(key)) delete env[key];
  }
  env.GIT_TERMINAL_PROMPT = "0";
  env.GIT_OPTIONAL_LOCKS = "0";
  if (indexFile) env.GIT_INDEX_FILE = indexFile;
  return env;
}

const FAILED: GitResult = { ok: false, code: null, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false };

/** execFile'ın bu katmanın kullandığı biçimi; testte sahtesi veriliyor. `shell` seçeneği bilerek yok. */
export interface GitExecOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeout: number;
  windowsHide: true;
  maxBuffer: number;
  encoding: "utf8";
}
export type ExecFileLike = (
  file: string,
  args: readonly string[],
  opts: GitExecOptions,
  callback: (err: Error | null, stdout: string, stderr: string) => void
) => void;

const execFileNode: ExecFileLike = (file, args, opts, callback) => {
  execFile(file, [...args], opts, (err, stdout, stderr) => callback(err, String(stdout ?? ""), String(stderr ?? "")));
};

export function createGitRunner(exec: ExecFileLike): GitRun {
  return (args, opts) =>
    new Promise<GitResult>((resolve) => {
      try {
        exec(
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
}

export const runGitDefault: GitRun = createGitRunner(execFileNode);

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
  /**
   * Uygulamanın index dosyalarının klasörü (checkpoints). ZORUNLU, mutlak:
   * index dosyası bu klasörün içinde olmak zorunda.
   */
  indexDir: string;
}

const literal = (fullPath: string) => `:(top,literal)${fullPath}`;
const relative = (prefix: string): string[] => (prefix ? [`--relative=${prefix}`] : []);

const hasGitPart = (p: string): boolean => p.split(/[\\/]/).some((part) => part.toLowerCase() === ".git");

/**
 * Uygulamaya ait index dosyası mı: boş ya da göreli olamaz (boş değer git'i
 * kullanıcının index'ine düşürür), `indexDir`'in içinde (kendisi değil)
 * olmalı ve hiçbir `.git` klasörünün içinde olamaz. Karşılaştırma GERÇEK
 * yollarla: 8.3 kısa ad (`GIT~1`), junction ve sembolik bağ çözülüyor.
 * Dosyanın kendisi henüz olmayabilir; üst klasörü var olmak zorunda.
 */
function isOwnIndex(indexFile: string, indexDir: string): boolean {
  if (typeof indexFile !== "string" || indexFile.length === 0 || !path.isAbsolute(indexFile)) return false;
  const resolved = path.resolve(indexFile);
  if (hasGitPart(resolved)) return false;
  try {
    const realDir = realpathSync.native(indexDir);
    const realParent = realpathSync.native(path.dirname(resolved));
    const real = existsSync(resolved) ? realpathSync.native(resolved) : path.join(realParent, path.basename(resolved));
    if (hasGitPart(realParent) || hasGitPart(real)) return false;
    return real !== realDir && isWithin(realDir, real) && isWithin(realDir, realParent);
  } catch {
    // Klasör yok ya da çözülemiyor: index işlemi yapılmaz.
    return false;
  }
}

/** Önek git'ten geliyor; yine de boş ya da `/` ile biten güvenli bir göreli yol olmalı. */
const isSafePrefix = (prefix: string): boolean => prefix === "" || (prefix.endsWith("/") && isSafeRelPath(prefix.slice(0, -1)));

function removeQuietly(file: string): void {
  try {
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // silinemeyen geçici dosya bir sonraki işte yeniden denenir
  }
}

/**
 * `indexDir` zorunlu: verilmezse, boşsa ya da göreliyse port KURULMUYOR
 * (fırlatır). Bu yalnız bağlama hatası; port'un işlemleri hiçbir zaman fırlatmıyor.
 */
export function createGitPort(partial: Partial<Omit<GitPortDeps, "indexDir">> & Pick<GitPortDeps, "indexDir">): GitPort {
  const indexDir = partial?.indexDir;
  if (typeof indexDir !== "string" || indexDir.length === 0 || !path.isAbsolute(indexDir)) {
    throw new Error("createGitPort: indexDir zorunlu ve mutlak olmalı");
  }
  const deps: GitPortDeps = {
    run: partial.run ?? runGitDefault,
    sleep: partial.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms))),
    now: partial.now ?? (() => Date.now()),
    indexDir
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
      if (!isOwnIndex(indexFile, deps.indexDir)) return { ok: false, reason: "git" };
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
      // Commit'i olmayan iç içe depo (ör. ajan alt klasörde `git init` yapıp commit
      // atmamış) `add -A`'yı rc=128 ile düşürüyor ve git her seferinde yalnız ilkini
      // söylüyor (ölçüldü, git 2.5x): görüntüden çıkarılıp yeniden deneniyor.
      const excluded: string[] = [];
      for (let attempt = 1; ; ) {
        const add = await run(["add", "-A", "--", ".", ...excluded.map((p) => `:(exclude,literal)${p}`)], {
          cwd,
          indexFile,
          timeoutMs: left()
        });
        if (add.ok) break;
        if (add.missing) return { ok: false, reason: "noGit" };
        if (add.timedOut || deps.now() >= deadline) return { ok: false, reason: "timeout" };
        const nested = add.stderr.match(NESTED_NO_COMMIT)?.[1];
        if (nested !== undefined) {
          if (excluded.includes(nested) || excluded.length >= NESTED_EXCLUDE_MAX) return { ok: false, reason: "git" };
          excluded.push(nested);
          continue;
        }
        if (!/index\.lock/i.test(add.stderr)) return { ok: false, reason: "git" };
        if (attempt >= LOCK_RETRIES) return { ok: false, reason: "locked" };
        attempt++;
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
      const names = await run([...common, "--raw", a, b], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (!names.ok && !names.tooBig) return { ok: false, reason: names.timedOut ? "timeout" : "git" };
      const nums = await run([...common, "--numstat", a, b], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (!nums.ok && !nums.tooBig) return { ok: false, reason: nums.timedOut ? "timeout" : "git" };
      const files = mergeChanges(parseRawZ(names.stdout), parseNumstatZ(nums.stdout)).filter((f) => isSafeRelPath(f.path));
      return { ok: true, files, truncated: names.tooBig || nums.tooBig };
    },

    async fileDiff(cwd, prefix, a, b, change) {
      if (!isSafePrefix(prefix) || !isSafeRelPath(change.path)) return null;
      const full = prefix + change.path;
      if (!isSafeRelPath(full)) return null;
      // Alt modül (gitlink): ağaçta yalnız bir commit kimliği; içerik bu depoda yok.
      if (change.submodule) return { kind: "submodule" };
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
      if (!isTreeId(tree) || !isOwnIndex(indexFile, deps.indexDir)) return false;
      removeQuietly(indexFile);
      const r = await run(["read-tree", tree], { cwd: top, indexFile, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    async restoreFile(top, indexFile, fullPath) {
      if (!isOwnIndex(indexFile, deps.indexDir) || !isSafeRelPath(fullPath)) return false;
      // Yazmadan hemen önce: junction/sembolik bağ ile deponun kökü dışına çıkış yok.
      if (!insideRootReal(top, fullPath)) return false;
      // checkout-index yol belirteci değil düz yol alıyor (deponun köküne göre).
      const r = await run(["checkout-index", "-f", "--", fullPath], { cwd: top, indexFile, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    discardIndex(indexFile) {
      if (!isOwnIndex(indexFile, deps.indexDir)) return;
      removeQuietly(indexFile);
      removeQuietly(`${indexFile}.lock`);
    }
  };
}
