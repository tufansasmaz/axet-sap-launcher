// Değişiklikler yöneticisi (spec 2026-10-18 degisiklikler §3–§8). Ana süreçte
// tek örnek. Kayıtları diskten okuyor, görüntü kancalarını (istem, dağıtım,
// elle, geri alma öncesi) alan başına SIRALI bir kuyrukta çalıştırıyor,
// aralık/diff/geri alma sağlıyor, değişince renderer'a yayıyor.
//
// Kurallar:
//   - Hiçbir yol hata fırlatmıyor; kancalar senkron dönüyor, iş arka planda.
//   - Geri almadan önce beforeRestore görüntüsü; alınamazsa hiçbir dosyaya
//     dokunulmuyor. Eklenmiş dosya çöpe (deps.trash), kalıcı silinmiyor.
//   - Yol yalnız o kaydın o anki aralık listesinden (renderer listesiyle
//     kesişim); her yazma/çöpe taşımadan hemen önce deps.insideRoot ile ALAN
//     kökü denetimi (alan deponun alt klasörü olabilir). Alan dışı yolda
//     işlem durur, o ana kadar yapılanlar döner.
//   - Geri alma başladıktan sonra bağımlılık fırlatsa da kısmi sonuç kaybolmaz.
//   - Günlüğe yol, içerik, istem ya da etiket yazılmıyor.
import type { AgentRegistration } from "../shared/agentTypes";
import { isBoardId } from "../shared/boardCommands";
import {
  capCheckpoints,
  createKeyedQueue,
  isSafeRelPath,
  labelOf,
  laterCheckpoints,
  rangeOf,
  readRevertPaths,
  shouldSnapshotPrompt,
  statsOf,
  type CheckpointRange
} from "../shared/changesLogic";
import {
  CONFLICT_SCAN_MAX,
  SNAPSHOT_TIMEOUT_MS,
  type ChangesCommandResult,
  type ChangesFailure,
  type ChangesState,
  type ChangesWarning,
  type Checkpoint,
  type CheckpointReason,
  type DiffResult,
  type FileChange,
  type PrepareRevertResult,
  type RangeResult,
  type RangeStats,
  type RepoStatus,
  type RevertConflict,
  type RevertResult,
  type SnapshotResult
} from "../shared/changesTypes";
import type { AgentPresence, LogFields } from "./agentMonitor";
import type { GitPort } from "./changesGit";
import type { CheckpointFileResult } from "./changesStore";

export interface ChangesStorePort {
  read(workspaceId: string): CheckpointFileResult;
  write(workspaceId: string, list: readonly Checkpoint[]): boolean;
  remove(workspaceId: string): void;
  indexFile(workspaceId: string): string | null;
  restoreIndexFile(workspaceId: string): string | null;
}

export interface ChangesManagerDeps {
  now(): number;
  newId(): string;
  store: ChangesStorePort;
  git: GitPort;
  /** Alanın kökü (yoksa ajanların varsayılan klasörü); kayıtlı değilse null. */
  workspace(workspaceId: string): { cwd: string } | null;
  dirExists(dir: string): boolean;
  insideRoot(root: string, rel: string): boolean;
  pathExists(root: string, rel: string): boolean;
  trash(root: string, rel: string): Promise<void>;
  agents(): AgentPresence[];
  emit(state: ChangesState): void;
  log(tag: string, fields: LogFields): void;
}

export interface SnapshotMeta {
  paneId: string | null;
  agentName: string | null;
  subtaskId: string | null;
  label: string;
}

export interface ChangesManager {
  state(workspaceId: string): Promise<ChangesState | null>;
  snapshot(workspaceId: string, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult>;
  onPromptLine(reg: AgentRegistration, line: string): void;
  onDispatched(workspaceId: string, paneId: string, subtaskId: string, title: string): void;
  live(workspaceId: string): Promise<RangeResult>;
  range(workspaceId: string, checkpointId: string): Promise<RangeResult>;
  fileDiff(workspaceId: string, checkpointId: string, path: string): Promise<DiffResult>;
  accept(workspaceId: string, checkpointId: string): ChangesCommandResult;
  prepareRevert(workspaceId: string, checkpointId: string): Promise<PrepareRevertResult>;
  revert(workspaceId: string, checkpointId: string, paths: unknown): Promise<RevertResult>;
  drop(workspaceId: string): void;
  dispose(): void;
}

interface Entry {
  checkpoints: Checkpoint[];
  expired: Set<string>;
  repo: RepoStatus;
  warning?: ChangesWarning;
  recoveredFrom?: string;
  unreadable?: boolean;
  expiryChecked: boolean;
}

interface Ctx {
  /** Alan kökü. */
  cwd: string;
  /** Deponun kökü. */
  top: string;
  /** Alan kökünün depodaki öneki ("" ya da "/" ile biten). */
  prefix: string;
}

type Internal = { ok: true; files: FileChange[]; truncated: boolean; range: CheckpointRange; toTree: string } | { ok: false; reason: ChangesFailure };

const REASON_LOG: Record<CheckpointReason, string> = {
  prompt: "istem",
  dispatch: "dagitim",
  manual: "elle",
  beforeRestore: "geriAlmaOncesi"
};

const fail = (reason: ChangesFailure) => ({ ok: false as const, reason });

export function createChangesManager(deps: ChangesManagerDeps): ChangesManager {
  const entries = new Map<string, Entry>();
  const queue = createKeyedQueue();
  /** Bölme → son istem görüntüsü anı (spec §4.2, 30 sn). */
  const lastPrompt = new Map<string, number>();
  /** Geri alma süren alanlar: ikinci geri alma "busy". */
  const reverting = new Set<string>();
  let disposed = false;

  function attempt<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  /** Söz döndüren bağımlılık fırlatsa ya da reddetse de yedek değer (yarım geri alma sonucu kaybolmasın). */
  async function attemptAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  const log = (tag: string, fields: LogFields) => attempt(() => deps.log(tag, fields), undefined);

  function load(workspaceId: string): Entry | null {
    if (!isBoardId(workspaceId)) return null;
    // Kayıtlı alan kapısı: config'te olmayan id için bellek girişi açılmaz, diske yazılmaz.
    if (!attempt(() => deps.workspace(workspaceId), null)) return null;
    let entry = entries.get(workspaceId);
    if (!entry) {
      const file = attempt<CheckpointFileResult>(() => deps.store.read(workspaceId), { checkpoints: [], unreadable: true });
      entry = { checkpoints: file.checkpoints, expired: new Set(), repo: "unknown", expiryChecked: false };
      if (file.recoveredFrom) entry.recoveredFrom = file.recoveredFrom;
      if (file.unreadable) entry.unreadable = true;
      entries.set(workspaceId, entry);
    }
    return entry;
  }

  function stateOf(workspaceId: string, entry: Entry): ChangesState {
    const state: ChangesState = { workspaceId, repo: entry.repo, checkpoints: entry.checkpoints, expired: [...entry.expired] };
    if (entry.warning) state.warning = entry.warning;
    if (entry.recoveredFrom) state.recoveredFrom = entry.recoveredFrom;
    if (entry.unreadable) state.unreadable = true;
    return state;
  }

  const emit = (workspaceId: string, entry: Entry) => attempt(() => deps.emit(stateOf(workspaceId, entry)), undefined);

  function save(workspaceId: string, entry: Entry): void {
    if (!entry.unreadable) attempt(() => deps.store.write(workspaceId, entry.checkpoints), false);
  }

  function markExpired(workspaceId: string, entry: Entry, ids: readonly string[]): void {
    let changed = false;
    for (const id of ids) {
      if (entry.expired.has(id)) continue;
      entry.expired.add(id);
      changed = true;
    }
    if (changed) emit(workspaceId, entry);
  }

  async function context(workspaceId: string, entry: Entry): Promise<{ ok: true; ctx: Ctx } | { ok: false; reason: ChangesFailure }> {
    const info = attempt(() => deps.workspace(workspaceId), null);
    if (!info) return fail("noWorkspace");
    const setRepo = (repo: RepoStatus) => {
      if (entry.repo === repo) return;
      entry.repo = repo;
      emit(workspaceId, entry);
    };
    if (!attempt(() => deps.dirExists(info.cwd), false)) {
      setRepo("missingDir");
      return fail("missingDir");
    }
    const probe = await deps.git.probe(info.cwd);
    if (!probe.ok) {
      if (probe.reason === "notRepo" || probe.reason === "noGit") setRepo(probe.reason);
      return fail(probe.reason);
    }
    setRepo("ok");
    return { ok: true, ctx: { cwd: info.cwd, top: probe.top, prefix: probe.prefix } };
  }

  /** Alan kuyruğunda, bağlamla çalıştırır; hiçbir yol fırlatmaz. */
  async function withContext<T>(workspaceId: string, onFail: (reason: ChangesFailure) => T, job: (entry: Entry, ctx: Ctx) => Promise<T>): Promise<T> {
    if (disposed || !isBoardId(workspaceId)) return onFail("invalid");
    try {
      return await queue.run(workspaceId, async () => {
        const entry = load(workspaceId);
        if (!entry) return onFail("noWorkspace");
        const c = await context(workspaceId, entry);
        if (!c.ok) return onFail(c.reason);
        return job(entry, c.ctx);
      });
    } catch {
      return onFail("git");
    }
  }

  async function freshTree(workspaceId: string, ctx: Ctx): Promise<{ ok: true; tree: string } | { ok: false; reason: ChangesFailure }> {
    const indexFile = attempt(() => deps.store.indexFile(workspaceId), null);
    if (!indexFile) return fail("invalid");
    return attemptAsync(() => deps.git.snapshot(ctx.cwd, indexFile, SNAPSHOT_TIMEOUT_MS), { ok: false as const, reason: "git" as const });
  }

  /** Kuyruğun İÇİNDEN çağrılır (kendisi kuyruğa girmez). */
  async function takeSnapshot(workspaceId: string, entry: Entry, ctx: Ctx, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult> {
    const started = deps.now();
    const out = await freshTree(workspaceId, ctx);
    const sure = Math.max(0, deps.now() - started);
    if (!out.ok) {
      entry.warning = { code: out.reason, at: deps.now() };
      log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure, sonuc: out.reason });
      emit(workspaceId, entry);
      return fail(out.reason);
    }
    const prev = entry.checkpoints.at(-1);
    let stats: RangeStats | null = null;
    if (prev && !prev.stats) {
      const d = await attemptAsync(() => deps.git.diffTrees(ctx.cwd, ctx.prefix, prev.tree, out.tree), { ok: false as const, reason: "git" as const });
      if (d.ok && !d.truncated) stats = statsOf(d.files);
    }
    // Beklerken alan kapatıldıysa (drop) hiçbir şey yazılmıyor.
    if (entries.get(workspaceId) !== entry) return fail("noWorkspace");
    const checkpoint: Checkpoint = {
      id: deps.newId(),
      workspaceId,
      tree: out.tree,
      createdAt: started,
      reason,
      paneId: meta.paneId,
      agentName: meta.agentName,
      subtaskId: meta.subtaskId,
      label: labelOf(meta.label),
      reviewed: "pending"
    };
    // Bekleme sırasında Kabul et değiştirmiş olabilir: güncel listeye uygulanıyor.
    const current = entry.checkpoints.map((c) => (stats && prev && c.id === prev.id ? { ...c, stats } : c));
    entry.checkpoints = capCheckpoints([...current, checkpoint]);
    for (const id of [...entry.expired]) if (!entry.checkpoints.some((c) => c.id === id)) entry.expired.delete(id);
    delete entry.warning;
    save(workspaceId, entry);
    log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure, sonuc: "tamam" });
    emit(workspaceId, entry);
    return { ok: true, id: checkpoint.id };
  }

  /** Kaydın aralığı: bu kayıt → sonraki kayıt; en sonuncusunda taze ağaca (çalışma ağacı). */
  async function rangeInternal(workspaceId: string, entry: Entry, ctx: Ctx, id: string): Promise<Internal> {
    const range = rangeOf(entry.checkpoints, id);
    if (!range) return fail("notFound");
    if (entry.expired.has(id)) return fail("expired");
    if (!(await deps.git.treeExists(ctx.cwd, range.from.tree))) {
      markExpired(workspaceId, entry, [id]);
      return fail("expired");
    }
    let toTree: string;
    if (range.to) {
      if (!(await deps.git.treeExists(ctx.cwd, range.to.tree))) {
        markExpired(workspaceId, entry, [range.to.id]);
        return fail("expired");
      }
      toTree = range.to.tree;
    } else {
      const fresh = await freshTree(workspaceId, ctx);
      if (!fresh.ok) return fail(fresh.reason);
      toTree = fresh.tree;
    }
    const d = await deps.git.diffTrees(ctx.cwd, ctx.prefix, range.from.tree, toTree);
    if (!d.ok) return fail(d.reason);
    return { ok: true, files: d.files, truncated: d.truncated, range, toTree };
  }

  const publicRange = (r: Internal): RangeResult => (r.ok ? { ok: true, files: r.files, truncated: r.truncated, toWorkingTree: r.range.to === null } : r);

  function snapshot(workspaceId: string, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult> {
    return withContext<SnapshotResult>(
      workspaceId,
      (reasonCode) => {
        log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure: 0, sonuc: reasonCode });
        return fail(reasonCode);
      },
      (entry, ctx) => takeSnapshot(workspaceId, entry, ctx, reason, meta)
    );
  }

  function checkExpiry(workspaceId: string): Promise<void> {
    return withContext<void>(
      workspaceId,
      () => undefined,
      async (entry, ctx) => {
        const missing: string[] = [];
        for (const c of entry.checkpoints) {
          if (!entry.expired.has(c.id) && !(await deps.git.treeExists(ctx.cwd, c.tree))) missing.push(c.id);
        }
        if (missing.length) markExpired(workspaceId, entry, missing);
      }
    );
  }

  function agentNameOf(paneId: string): string | null {
    const found = attempt(() => deps.agents(), [] as AgentPresence[]).find((p) => p.reg.paneId === paneId);
    return found?.reg.name || null;
  }

  async function revertJob(workspaceId: string, entry: Entry, ctx: Ctx, id: string, paths: readonly string[]): Promise<RevertResult> {
    const target = entry.checkpoints.find((c) => c.id === id);
    if (!target) return { ok: false, reason: "notFound", restored: [], trashed: [], skipped: [] };
    if (entry.expired.has(id)) return { ok: false, reason: "expired", restored: [], trashed: [], skipped: [] };
    // 1) Güvenlik ağı: geri almadan önce o anın görüntüsü (spec §6.2). Alınamazsa dokunma.
    const before = await takeSnapshot(workspaceId, entry, ctx, "beforeRestore", { paneId: null, agentName: null, subtaskId: null, label: target.label });
    if (!before.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: "goruntuYok" });
      return { ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] };
    }
    const result: RevertResult = { ok: false, restored: [], trashed: [], skipped: [], beforeRestoreId: before.id };
    // beforeRestore alındı: buradan sonra hiçbir hata sonucu (ve beforeRestoreId'yi) kaybettirmiyor.
    const range = await attemptAsync<Internal>(() => rangeInternal(workspaceId, entry, ctx, id), fail("git"));
    if (!range.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: range.reason });
      return { ...result, reason: range.reason };
    }
    const byPath = new Map(range.files.map((f) => [f.path, f]));
    const restoreIndex = attempt(() => deps.store.restoreIndexFile(workspaceId), null);
    let indexReady = false;
    let problem: ChangesFailure | null = null;
    for (const rel of paths) {
      const change = byPath.get(rel);
      // Onaylandıktan sonra aralıktan çıkmış: dokunulmuyor (spec §7).
      if (!change) {
        result.skipped.push(rel);
        continue;
      }
      if (change.status === "added") {
        // Alan kökü denetimi (gerçek yol; junction/sembolik bağ) taşımadan hemen önce;
        // alan dışı → dosya atlanmıyor, işlem duruyor.
        if (!attempt(() => deps.insideRoot(ctx.cwd, rel), false)) {
          problem = "invalid";
          result.failedPath = rel;
          break;
        }
        // Görüntüde yoktu: kalıcı silme yok, çöp kutusu (spec §6.3).
        if (!attempt(() => deps.pathExists(ctx.cwd, rel), false)) {
          result.skipped.push(rel);
          continue;
        }
        try {
          await deps.trash(ctx.cwd, rel);
          result.trashed.push(rel);
        } catch {
          // Çöp kutusu yoksa kalıcı silmeye düşülmüyor: işlem duruyor.
          problem = "writeFailed";
          result.failedPath = rel;
          break;
        }
        continue;
      }
      if (!indexReady) {
        // Özel index'e yükleme çalışma ağacına yazmıyor; kök denetimi asıl yazmadan hemen önce.
        indexReady = !!restoreIndex && (await attemptAsync(() => deps.git.loadIndex(ctx.top, restoreIndex, target.tree), false));
        if (!indexReady) {
          problem = "git";
          result.failedPath = rel;
          break;
        }
      }
      if (!attempt(() => deps.insideRoot(ctx.cwd, rel), false)) {
        problem = "invalid";
        result.failedPath = rel;
        break;
      }
      if (restoreIndex && (await attemptAsync(() => deps.git.restoreFile(ctx.top, restoreIndex, ctx.prefix + rel), false))) {
        result.restored.push(rel);
      } else {
        problem = "writeFailed";
        result.failedPath = rel;
        break;
      }
    }
    if (restoreIndex) attempt(() => deps.git.discardIndex(restoreIndex), undefined);
    if (!problem && entries.get(workspaceId) === entry) {
      entry.checkpoints = entry.checkpoints.map((c) => (c.id === id ? { ...c, reviewed: "reverted" as const } : c));
      save(workspaceId, entry);
      emit(workspaceId, entry);
    }
    log("degisiklik.geriAl", { dosya: result.restored.length + result.trashed.length, sonuc: problem ?? "tamam" });
    return problem ? { ...result, reason: problem } : { ...result, ok: true };
  }

  return {
    async state(workspaceId) {
      if (disposed || !isBoardId(workspaceId)) return null;
      const entry = load(workspaceId);
      if (!entry) return null;
      try {
        await queue.run(workspaceId, async () => {
          await context(workspaceId, entry);
        });
      } catch {
        // durum yine dönüyor
      }
      if (!entry.expiryChecked && entry.repo === "ok") {
        entry.expiryChecked = true;
        void checkExpiry(workspaceId).catch(() => {});
      }
      return stateOf(workspaceId, entry);
    },

    snapshot,

    onPromptLine(reg, line) {
      attempt(() => {
        const workspaceId = reg.workspaceId;
        if (disposed || !workspaceId || !isBoardId(workspaceId)) return;
        // Motor komutu istem değil (spec sapma 6).
        if (line.trim().startsWith("/")) return;
        const now = deps.now();
        if (!shouldSnapshotPrompt(lastPrompt.get(reg.paneId), now)) return;
        lastPrompt.set(reg.paneId, now);
        void snapshot(workspaceId, "prompt", { paneId: reg.paneId, agentName: reg.name || null, subtaskId: null, label: line }).catch(() => {});
      }, undefined);
    },

    onDispatched(workspaceId, paneId, subtaskId, title) {
      attempt(() => {
        if (disposed) return;
        void snapshot(workspaceId, "dispatch", { paneId, agentName: agentNameOf(paneId), subtaskId, label: title }).catch(() => {});
      }, undefined);
    },

    live(workspaceId) {
      return withContext<RangeResult>(workspaceId, fail, async (entry, ctx) => {
        const latest = entry.checkpoints.at(-1);
        if (!latest) return { ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true };
        return publicRange(await rangeInternal(workspaceId, entry, ctx, latest.id));
      });
    },

    range(workspaceId, checkpointId) {
      if (!isBoardId(checkpointId)) return Promise.resolve(fail("invalid"));
      return withContext<RangeResult>(workspaceId, fail, async (entry, ctx) => publicRange(await rangeInternal(workspaceId, entry, ctx, checkpointId)));
    },

    fileDiff(workspaceId, checkpointId, path) {
      if (!isBoardId(checkpointId) || !isSafeRelPath(path)) return Promise.resolve(fail("invalid"));
      return withContext<DiffResult>(workspaceId, fail, async (entry, ctx) => {
        const r = await rangeInternal(workspaceId, entry, ctx, checkpointId);
        if (!r.ok) return r;
        const change = r.files.find((f) => f.path === path);
        if (!change) return fail("notInRange");
        const diff = await deps.git.fileDiff(ctx.cwd, ctx.prefix, r.range.from.tree, r.toTree, change);
        return diff ? { ok: true, diff } : fail("git");
      });
    },

    accept(workspaceId, checkpointId) {
      if (disposed || !isBoardId(checkpointId)) return fail("invalid");
      const entry = load(workspaceId);
      if (!entry) return fail("noWorkspace");
      const target = entry.checkpoints.find((c) => c.id === checkpointId);
      if (!target) return fail("notFound");
      if (target.reviewed !== "pending") return { ok: true };
      entry.checkpoints = entry.checkpoints.map((c) => (c.id === checkpointId ? { ...c, reviewed: "accepted" as const } : c));
      save(workspaceId, entry);
      emit(workspaceId, entry);
      return { ok: true };
    },

    prepareRevert(workspaceId, checkpointId) {
      if (!isBoardId(checkpointId)) return Promise.resolve(fail("invalid"));
      return withContext<PrepareRevertResult>(workspaceId, fail, async (entry, ctx) => {
        const r = await rangeInternal(workspaceId, entry, ctx, checkpointId);
        if (!r.ok) return r;
        const paths = new Set(r.files.map((f) => f.path));
        const later = laterCheckpoints(entry.checkpoints, checkpointId, CONFLICT_SCAN_MAX);
        const totalLater = entry.checkpoints.length - 1 - r.range.index;
        const conflicts: RevertConflict[] = [];
        let fresh: string | null = null;
        for (const c of later) {
          const next = rangeOf(entry.checkpoints, c.id)?.to ?? null;
          let toTree = next?.tree ?? null;
          if (!toTree) {
            if (!fresh) {
              const t = await freshTree(workspaceId, ctx);
              if (!t.ok) break;
              fresh = t.tree;
            }
            toTree = fresh;
          }
          const d = await deps.git.diffTrees(ctx.cwd, ctx.prefix, c.tree, toTree);
          if (d.ok && d.files.some((f) => paths.has(f.path))) conflicts.push({ id: c.id, label: c.label, agentName: c.agentName, reason: c.reason });
        }
        const runningAgents = attempt(() => deps.agents(), [] as AgentPresence[])
          .filter((p) => p.reg.workspaceId === workspaceId && (p.status?.state === "running" || p.status?.state === "asking"))
          .map((p) => p.reg.name || p.reg.paneId);
        return { ok: true, plan: { files: r.files, conflicts, conflictsPartial: totalLater > later.length, runningAgents } };
      });
    },

    async revert(workspaceId, checkpointId, raw) {
      const empty = { restored: [] as string[], trashed: [] as string[], skipped: [] as string[] };
      const paths = readRevertPaths(raw);
      if (disposed || !isBoardId(workspaceId) || !isBoardId(checkpointId) || !paths) return { ok: false, reason: "invalid", ...empty };
      if (reverting.has(workspaceId)) return { ok: false, reason: "busy", ...empty };
      reverting.add(workspaceId);
      try {
        return await withContext<RevertResult>(
          workspaceId,
          (reason) => ({ ok: false, reason, ...empty }),
          (entry, ctx) => revertJob(workspaceId, entry, ctx, checkpointId, paths)
        );
      } finally {
        reverting.delete(workspaceId);
      }
    },

    drop(workspaceId) {
      if (!isBoardId(workspaceId)) return;
      entries.delete(workspaceId);
      attempt(() => deps.store.remove(workspaceId), undefined);
    },

    dispose() {
      disposed = true;
    }
  };
}
