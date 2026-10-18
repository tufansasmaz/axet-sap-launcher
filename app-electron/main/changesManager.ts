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
//   - Sıra: önce aralıktaki eklenmiş dosyalar çöpe, SONRA geri yükleme; her
//     geri yüklemeden hemen önce yol ve üst parçaları için dosya↔klasör
//     çakışma denetimi (deps.pathKind); hedefteki BOŞ klasör kaldırılır
//     (deps.removeEmptyDir), dolu klasör/üstte dosya/herhangi bir yerde bağ
//     (junction)/kayıtta silinmiş yolda sonradan konmuş dosya ya da seçilmemiş
//     büyük/küçük harf eşi → işlem durur (pathConflict).
//   - Bu çakışmalar önce, beforeRestore alınmadan, yalnız okuyan bir ön
//     taramayla aranıyor (preflight): bulunursa hiçbir dosyaya dokunulmuyor.
//     Yazma anı denetimleri (araya giren değişiklik için) yerinde kalıyor.
//   - Alan kapatma (drop) uçuştaki ya da kuyruktaki işi geçersiz kılar (kuşak):
//     kayıt dosyası yeniden yaratılmaz, bellek girdisi geri gelmez, yayın yok.
//   - beforeRestore kaydı diske yazılamazsa geri alma başlamaz (storeFailed);
//     depo yazma hatası uyarı olarak saklanır.
//   - 200 sınırı beforeRestore eklenirken geri alınan kaydı düşürmez.
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
  MAX_CHECKPOINTS,
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

/** lstat ile (bağı izlemeden): sembolik bağ ve junction (yeniden ayrıştırma noktası) her zaman "link". */
export type PathKind = "file" | "dir" | "link" | "none";

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
  /**
   * Yolun diskteki türü (bağı İZLEMEDEN, lstat): dosya, klasör, bağ ya da yok.
   * Sembolik bağ ve junction "link" olmalı (klasör ya da dosya DEĞİL): git
   * for Windows junction'ı klasör sanıp içinden özyinelemeli siler.
   * Geri yüklemede çakışma denetimi: `checkout-index -f` yolu kapatan klasörü
   * içeriğiyle, üst parçadaki dosyayı/bağı da çöpü atlayarak kalıcı siler.
   * Hedefte ya da herhangi bir üst parçada "link" → her zaman pathConflict.
   */
  pathKind(root: string, rel: string): PathKind;
  /**
   * Yoldaki klasörü YALNIZ gerçekten boşsa kaldırır (özyinelemesiz rmdir);
   * bağ/junction ya da dolu klasörde false. Dolu klasör asla silinmez.
   */
  removeEmptyDir(root: string, rel: string): boolean;
  /** Salt okur: yoldaki gerçek (bağ olmayan) klasör boş mu; yok/bağ/dosya/hata → false. */
  dirIsEmpty(root: string, rel: string): boolean;
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
  /** Görüntüsü süren istem bölmeleri. */
  const promptPending = new Set<string>();
  /** Geri alma süren alanlar: ikinci geri alma "busy". */
  const reverting = new Set<string>();
  /**
   * Alan kuşağı: drop artırıyor. Drop'tan ÖNCE istenmiş (uçuştaki ya da
   * kuyrukta bekleyen) iş eski kuşakta kalıyor: girdiyi belleğe geri koymuyor,
   * kayıt dosyasını yeniden yaratmıyor, yayın yapmıyor.
   */
  const generations = new Map<string, number>();
  const generationOf = (workspaceId: string) => generations.get(workspaceId) ?? 0;
  /** Girdi hâlâ bellekteki güncel girdi mi (arada drop olmadı mı). */
  const live = (workspaceId: string, entry: Entry) => entries.get(workspaceId) === entry;
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

  const emit = (workspaceId: string, entry: Entry) => {
    // Kapatılmış alanın durumu yayınlanmıyor.
    if (live(workspaceId, entry)) attempt(() => deps.emit(stateOf(workspaceId, entry)), undefined);
  };

  /**
   * Kayıt listesini diske yazar; yazılabildi mi döner. Okunamayan dosyanın
   * üzerine yazılmıyor (false, uyarı zaten `unreadable`). Yazma başarısızsa
   * uyarı satırı saklanıyor (sessiz yutma yok); yayın çağıranın işi.
   */
  function save(workspaceId: string, entry: Entry): boolean {
    // Alan kapatıldıysa (drop) kayıt dosyası yeniden yaratılmıyor.
    if (entry.unreadable || !live(workspaceId, entry)) return false;
    const ok = attempt(() => deps.store.write(workspaceId, entry.checkpoints), false);
    if (!ok) entry.warning = { code: "storeFailed", at: deps.now() };
    return ok;
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
    const generation = generationOf(workspaceId);
    try {
      return await queue.run(workspaceId, async () => {
        // Kuyrukta beklerken alan kapatıldı: girdi yeniden yüklenmiyor.
        if (generationOf(workspaceId) !== generation) return onFail("noWorkspace");
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

  /**
   * 200 sınırı; `keepId` verildiyse o kayıt (geri alınan) ve sonrası asla
   * düşmüyor: yalnız ondan eskiler kesiliyor, yetmezse liste sınırı aşıyor
   * ve diske öyle yazılıyor (depo okurken KESMİYOR); `keepId`'siz bir sonraki
   * görüntü listeyi yine 200'e indiriyor.
   */
  function capKeeping(list: readonly Checkpoint[], keepId: string | undefined): Checkpoint[] {
    const index = keepId ? list.findIndex((c) => c.id === keepId) : -1;
    if (list.length <= MAX_CHECKPOINTS || index < 0) return capCheckpoints(list);
    return list.slice(Math.min(list.length - MAX_CHECKPOINTS, index));
  }

  /** Kuyruğun İÇİNDEN çağrılır (kendisi kuyruğa girmez). `persisted`: kayıt diske yazıldı mı. */
  async function takeSnapshot(
    workspaceId: string,
    entry: Entry,
    ctx: Ctx,
    reason: CheckpointReason,
    meta: SnapshotMeta,
    keepId?: string
  ): Promise<{ ok: true; id: string; persisted: boolean } | { ok: false; reason: ChangesFailure }> {
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
    if (!live(workspaceId, entry)) return fail("noWorkspace");
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
    entry.checkpoints = capKeeping([...current, checkpoint], keepId);
    for (const id of [...entry.expired]) if (!entry.checkpoints.some((c) => c.id === id)) entry.expired.delete(id);
    delete entry.warning;
    const persisted = save(workspaceId, entry);
    log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure, sonuc: "tamam" });
    emit(workspaceId, entry);
    return { ok: true, id: checkpoint.id, persisted };
  }

  /**
   * Yol ya da bir üst parçası beklenmeyen türde mi: üstte dosya, hedefte klasör.
   * Hedefteki klasör gerçekten boşsa (eklenmiş içerik çöpe gitmiş) kaldırılıp
   * devam ediliyor; dolu klasör çakışma. Sorgu fırlatırsa çakışma sayılıyor.
   * `mustBeAbsent`: aralıkta SİLİNMİŞ yol; diskte orada dosya varsa onu
   * kullanıcı (ya da ajan) sonradan koymuş, checkout-index -f çöpsüz ezerdi.
   */
  function pathConflict(root: string, rel: string, mustBeAbsent: boolean): boolean {
    return attempt(() => {
      if (ancestorBlocked(root, rel)) return true;
      const kind = deps.pathKind(root, rel);
      if (kind === "link") return true;
      if (kind === "file") return mustBeAbsent;
      if (kind !== "dir") return false;
      // Yalnız gerçek (bağ olmayan) klasör, yalnız boşsa.
      return deps.removeEmptyDir(root, rel) !== true;
    }, true);
  }

  /** Yolun üst parçalarından biri dosya ya da bağ mı (bağ: içinden yazma/taşıma yok). Fırlatabilir. */
  function ancestorBlocked(root: string, rel: string): boolean {
    const parts = rel.split("/");
    for (let i = 1; i < parts.length; i += 1) {
      const kind = deps.pathKind(root, parts.slice(0, i).join("/"));
      if (kind === "file" || kind === "link") return true;
    }
    return false;
  }

  /** Renderer listesini o anki aralıkla kesiştirir: eklenmiş (çöpe), diğerleri (geri yükleme), aralıkta olmayan (atlanan). */
  function splitRevertPaths(files: readonly FileChange[], paths: readonly string[]) {
    const byPath = new Map(files.map((f) => [f.path, f]));
    const added: string[] = [];
    const others: string[] = [];
    const skipped: string[] = [];
    for (const rel of paths) {
      const change = byPath.get(rel);
      // Onaylandıktan sonra aralıktan çıkmış: dokunulmuyor (spec §7). Alt modül
      // (gitlink): checkout-index onu yazmaz, eklenmişse çöpe taşımak iç içe
      // deponun tamamını götürürdü → ikisinde de dokunulmuyor.
      if (!change || change.submodule) skipped.push(rel);
      else if (change.status === "added") added.push(rel);
      else others.push(rel);
    }
    return { byPath, added, others, skipped };
  }

  /**
   * Yazmadan ÖNCE, yalnız okuyan ön tarama: önceden bilinebilen çakışmalar
   * (hedefte bağ ya da dolu klasör, üst parçada dosya/bağ, silinmiş yolda
   * sonradan konmuş dosya, seçilmemiş büyük/küçük harf eşi). Bulunursa geri
   * alma hiçbir şeye dokunmadan durur. Çöpe gidecek eklenmiş yollar (harf
   * büyüklüğü duyarsız) ve altlarında eklenmiş dosya olan klasörler çakışma
   * sayılmıyor; onların son hâli asıl döngüdeki yazma anı denetimine kalıyor.
   * insideRoot burada çağrılmıyor: alan dışı denetimi yazmadan hemen önce.
   */
  function preflight(ctx: Ctx, files: readonly FileChange[], added: readonly string[], others: readonly string[]): string | null {
    const selected = new Set([...added, ...others]);
    const trashedLower = new Set(added.map((p) => p.toLowerCase()));
    const willBeTrashed = (rel: string) => trashedLower.has(rel.toLowerCase());
    for (const rel of others) {
      const lower = rel.toLowerCase();
      // Yalnız büyük/küçük harfle ayrışan iki ad aralıkta (Windows'ta aynı dosya):
      // eşi seçilmeden geri yüklenirse checkout-index eşi çöpsüz siler.
      if (files.some((f) => f.path !== rel && f.path.toLowerCase() === lower && !selected.has(f.path))) return rel;
    }
    for (const rel of added) {
      if (attempt(() => ancestorBlocked(ctx.cwd, rel), true)) return rel;
    }
    for (const rel of others) {
      const blocked = attempt(() => {
        const parts = rel.split("/");
        for (let i = 1; i < parts.length; i += 1) {
          const part = parts.slice(0, i).join("/");
          const kind = deps.pathKind(ctx.cwd, part);
          if (kind === "link") return true;
          if (kind === "file" && !willBeTrashed(part)) return true;
        }
        const kind = deps.pathKind(ctx.cwd, rel);
        if (kind === "link") return true;
        if (willBeTrashed(rel)) return false;
        if (kind === "file") return files.find((f) => f.path === rel)?.status === "deleted";
        if (kind !== "dir") return false;
        const prefix = `${rel.toLowerCase()}/`;
        if (added.some((p) => p.toLowerCase().startsWith(prefix))) return false;
        return deps.dirIsEmpty(ctx.cwd, rel) !== true;
      }, true);
      if (blocked) return rel;
    }
    return null;
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
        // Aralığın sonu yoksa bu kaydın aralığı da hesaplanamaz: ikisi de süresi doldu.
        markExpired(workspaceId, entry, [id, range.to.id]);
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
      async (entry, ctx) => {
        const taken = await takeSnapshot(workspaceId, entry, ctx, reason, meta);
        return taken.ok ? { ok: true, id: taken.id } : taken;
      }
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
    const none = (reason: ChangesFailure): RevertResult => ({ ok: false, reason, restored: [], trashed: [], skipped: [] });
    const target = entry.checkpoints.find((c) => c.id === id);
    if (!target) return none("notFound");
    if (target.reviewed === "reverted") return none("alreadyReverted");
    if (entry.expired.has(id)) return none("expired");
    // 0) Ağaçlar hâlâ var mı: süresi dolmuşsa beforeRestore boşuna birikmesin.
    const range0 = rangeOf(entry.checkpoints, id);
    const fromOk = await attemptAsync(() => deps.git.treeExists(ctx.cwd, target.tree), null);
    const toOk = range0?.to ? await attemptAsync(() => deps.git.treeExists(ctx.cwd, range0.to!.tree), null) : true;
    if (fromOk === null || toOk === null) return none("git");
    if (!fromOk || !toOk) {
      markExpired(workspaceId, entry, !fromOk || !range0?.to ? [id] : [id, range0.to.id]);
      log("degisiklik.geriAl", { dosya: 0, sonuc: "expired" });
      return none("expired");
    }
    // 0b) Ön tarama (salt okur): önceden bilinebilen çakışma varsa beforeRestore
    //     alınmadan, hiçbir dosyaya dokunmadan dur (yarım geri alma kalmasın).
    const preRange = await attemptAsync<Internal>(() => rangeInternal(workspaceId, entry, ctx, id), fail("git"));
    if (!preRange.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: preRange.reason });
      return none(preRange.reason);
    }
    const preSplit = splitRevertPaths(preRange.files, paths);
    const preConflict = preflight(ctx, preRange.files, preSplit.added, preSplit.others);
    if (preConflict !== null) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: "pathConflict" });
      return { ...none("pathConflict"), failedPath: preConflict };
    }
    // 1) Güvenlik ağı: geri almadan önce o anın görüntüsü (spec §6.2). Alınamazsa dokunma.
    //    200 sınırı geri alınan kaydı düşürmesin (keepId).
    const before = await takeSnapshot(workspaceId, entry, ctx, "beforeRestore", { paneId: null, agentName: null, subtaskId: null, label: target.label }, id);
    if (!before.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: "goruntuYok" });
      return none("snapshotFailed");
    }
    // 2) beforeRestore kaydı diske yazılamadıysa (uygulama kapanınca kaybolur) geri alma başlamıyor.
    if (!before.persisted) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: "storeFailed" });
      return { ...none("storeFailed"), beforeRestoreId: before.id };
    }
    const result: RevertResult = { ok: false, restored: [], trashed: [], skipped: [], beforeRestoreId: before.id };
    // beforeRestore alındı: buradan sonra hiçbir hata sonucu (ve beforeRestoreId'yi) kaybettirmiyor.
    const range = await attemptAsync<Internal>(() => rangeInternal(workspaceId, entry, ctx, id), fail("git"));
    if (!range.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: range.reason });
      return { ...result, reason: range.reason };
    }
    // Renderer listesi ile yöneticinin o an (beforeRestore'dan sonra) hesapladığı aralığın kesişimi.
    const { byPath, added, others, skipped } = splitRevertPaths(range.files, paths);
    result.skipped.push(...skipped);
    let problem: ChangesFailure | null = null;
    const stop = (reason: ChangesFailure, rel: string) => {
      problem = reason;
      result.failedPath = rel;
    };
    // Ön tarama aralık yeniden hesaplandıktan sonra bir kez daha (arada değişmiş
    // olabilir); yazma anı denetimleri yine de asıl döngüde (TOCTOU).
    const lateConflict = preflight(ctx, range.files, added, others);
    if (lateConflict !== null) stop("pathConflict", lateConflict);
    // 3) Önce eklenmiş dosyalar çöpe: geri yüklenecek yolu kapatan dosya/klasör
    //    checkout-index -f'e kalıcı sildirilmesin (büyük/küçük harf yeniden adlandırma dahil).
    for (const rel of (problem as ChangesFailure | null) ? [] : added) {
      // Alan kökü denetimi (gerçek yol; junction/sembolik bağ) taşımadan hemen önce;
      // alan dışı → dosya atlanmıyor, işlem duruyor.
      if (!attempt(() => deps.insideRoot(ctx.cwd, rel), false)) {
        stop("invalid", rel);
        break;
      }
      // Üst parçada bağ/junction: bağın içinden taşıma yok.
      if (attempt(() => ancestorBlocked(ctx.cwd, rel), true)) {
        stop("pathConflict", rel);
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
        stop("writeFailed", rel);
        break;
      }
    }
    // 4) Sonra değişen/silinen dosyalar kaydın ağacından.
    const restoreIndex = attempt(() => deps.store.restoreIndexFile(workspaceId), null);
    let indexReady = false;
    for (const rel of problem ? [] : others) {
      if (!indexReady) {
        // Özel index'e yükleme çalışma ağacına yazmıyor; denetimler asıl yazmadan hemen önce.
        indexReady = !!restoreIndex && (await attemptAsync(() => deps.git.loadIndex(ctx.top, restoreIndex, target.tree), false));
        if (!indexReady) {
          stop("git", rel);
          break;
        }
      }
      if (!attempt(() => deps.insideRoot(ctx.cwd, rel), false)) {
        stop("invalid", rel);
        break;
      }
      if (pathConflict(ctx.cwd, rel, byPath.get(rel)?.status === "deleted")) {
        stop("pathConflict", rel);
        break;
      }
      if (restoreIndex && (await attemptAsync(() => deps.git.restoreFile(ctx.top, restoreIndex, ctx.prefix + rel), false))) {
        result.restored.push(rel);
      } else {
        stop("writeFailed", rel);
        break;
      }
    }
    if (restoreIndex) attempt(() => deps.git.discardIndex(restoreIndex), undefined);
    const failed = problem as ChangesFailure | null;
    if (!failed && live(workspaceId, entry)) {
      entry.checkpoints = entry.checkpoints.map((c) => (c.id === id ? { ...c, reviewed: "reverted" as const } : c));
      save(workspaceId, entry);
      emit(workspaceId, entry);
    }
    log("degisiklik.geriAl", { dosya: result.restored.length + result.trashed.length, sonuc: failed ?? "tamam" });
    return failed ? { ...result, reason: failed } : { ...result, ok: true };
  }

  return {
    async state(workspaceId) {
      if (disposed || !isBoardId(workspaceId)) return null;
      const entry = load(workspaceId);
      if (!entry) return null;
      const generation = generationOf(workspaceId);
      try {
        await queue.run(workspaceId, async () => {
          await context(workspaceId, entry);
        });
      } catch {
        // durum yine dönüyor
      }
      // Beklerken alan kapatıldı: eski durum dönmüyor, girdi geri gelmiyor.
      if (generationOf(workspaceId) !== generation || !live(workspaceId, entry)) return null;
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
        const paneId = reg.paneId;
        // Aynı bölmenin görüntüsü sürüyorsa ikincisi yok; 30 sn sayacı yalnız başarılı görüntüde başlıyor.
        if (promptPending.has(paneId)) return;
        const now = deps.now();
        if (!shouldSnapshotPrompt(lastPrompt.get(paneId), now)) return;
        promptPending.add(paneId);
        void snapshot(workspaceId, "prompt", { paneId, agentName: reg.name || null, subtaskId: null, label: line })
          .then((r) => {
            if (r.ok) lastPrompt.set(paneId, now);
          })
          .catch(() => {})
          .finally(() => promptPending.delete(paneId));
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
        if (entry.checkpoints.find((c) => c.id === checkpointId)?.reviewed === "reverted") return fail("alreadyReverted");
        const r = await rangeInternal(workspaceId, entry, ctx, checkpointId);
        if (!r.ok) return r;
        // Alt modül (gitlink) geri alınmıyor: etkilenecek dosyalara da çakışma taramasına da girmiyor.
        const files = r.files.filter((f) => !f.submodule);
        const paths = new Set(files.map((f) => f.path));
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
        return { ok: true, plan: { files, conflicts, conflictsPartial: totalLater > later.length, runningAgents } };
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
      generations.set(workspaceId, generationOf(workspaceId) + 1);
      entries.delete(workspaceId);
      attempt(() => deps.store.remove(workspaceId), undefined);
    },

    dispose() {
      disposed = true;
    }
  };
}
