// Değişiklik yöneticisi (spec 2026-10-18 degisiklikler §3–§8). Git, depo,
// çöp ve izleyici sahte; gerçek git Task 3'te test ediliyor.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChangesManager, type SnapshotMeta } from "../app-electron/main/changesManager";
import type { GitPort, ProbeResult } from "../app-electron/main/changesGit";
import type { CheckpointFileResult } from "../app-electron/main/changesStore";
import type { AgentPresence, LogFields } from "../app-electron/main/agentMonitor";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";
import { MAX_CHECKPOINTS, type ChangesState, type Checkpoint, type FileChange } from "../app-electron/shared/changesTypes";

const T = (n: number) => n.toString(16).padStart(40, "0");
const change = (path: string, status: FileChange["status"] = "modified", added = 1, deleted = 1): FileChange => ({ path, status, added, deleted, binary: false });
const meta = (over: Partial<SnapshotMeta> = {}): SnapshotMeta => ({ paneId: null, agentName: null, subtaskId: null, label: "", ...over });
const flush = () => new Promise((r) => setTimeout(r, 0));
const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:/kok",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "custom",
  sap: false,
  added: false,
  workspaceId: "w1",
  ...over
});
const presence = (paneId: string, name: string, state: AgentStatus["state"] | null, workspaceId = "w1"): AgentPresence => ({
  reg: reg({ paneId, ptyId: `t-${paneId}`, name, workspaceId }),
  status: state ? { state, source: "exact", lastActivity: 1 } : null,
  inputIdle: true,
  engineReady: true
});
const saved = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "w1",
  tree: T(n),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});

function harness(opts: { files?: CheckpointFileResult; cwd?: string } = {}) {
  const clock = { ms: 1_000 };
  let seq = 0;
  const cwd = opts.cwd ?? "C:/kok";
  const written: Checkpoint[][] = [];
  const removed: string[] = [];
  const emitted: ChangesState[] = [];
  const logs: [string, LogFields][] = [];
  const events: string[] = [];
  /** insideRoot + yazma/taşıma sırası (denetim yazmadan hemen önce mi). */
  const order: string[] = [];
  const insideCalls: [string, string][] = [];
  const git = {
    probe: { ok: true, top: "C:/kok", prefix: "" } as ProbeResult,
    nextTree: opts.files ? 900 : 1,
    snapshotFail: null as null | "noGit" | "locked" | "timeout" | "git",
    snapshotThrows: false,
    diffs: new Map<string, FileChange[]>(),
    missing: new Set<string>(),
    restoreFail: new Set<string>(),
    restoreThrow: new Set<string>(),
    active: 0,
    maxActive: 0,
    gate: null as Promise<void> | null
  };
  const port: GitPort = {
    probe: async () => git.probe,
    snapshot: async () => {
      git.active += 1;
      git.maxActive = Math.max(git.maxActive, git.active);
      try {
        if (git.gate) await git.gate;
        if (git.snapshotThrows) throw new Error("git süreci açılamadı");
        if (git.snapshotFail) return { ok: false, reason: git.snapshotFail };
        const tree = T(git.nextTree++);
        events.push(`snapshot:${tree}`);
        return { ok: true, tree };
      } finally {
        git.active -= 1;
      }
    },
    treeExists: async (_cwd, tree) => !git.missing.has(tree),
    diffTrees: async (_cwd, _prefix, a, b) => ({ ok: true, files: git.diffs.get(`${a}>${b}`) ?? [], truncated: false }),
    fileDiff: async (_c, _p, _a, _b, ch) => ({ kind: "text", lines: [{ kind: "add", oldNo: null, newNo: 1, text: ch.path }], truncated: false }),
    loadIndex: async (_top, _idx, tree) => {
      events.push(`load:${tree}`);
      return true;
    },
    restoreFile: async (_top, _idx, full) => {
      if (git.restoreThrow.has(full)) throw new Error("checkout-index patladı");
      if (git.restoreFail.has(full)) return false;
      events.push(`restore:${full}`);
      order.push(`restore:${full}`);
      return true;
    },
    discardIndex: () => {}
  };
  const state = {
    agents: [] as AgentPresence[],
    agentsThrow: false,
    dirOk: true,
    inside: (_rel: string) => true,
    exists: new Set<string>(),
    trashFail: new Set<string>(),
    emitThrows: false,
    writeThrows: false,
    writeOk: true,
    /** Yolun diskteki türü (varsayılan "none"); geri yükleme çakışma denetimi. */
    kinds: new Map<string, "file" | "dir" | "link">(),
    kindThrows: false,
    /** Gerçekten boş olan klasörler (removeEmptyDir yalnız bunları kaldırır). */
    emptyDirs: new Set<string>(),
    removedDirs: [] as string[],
    /** Çöpe taşıma bu söz çözülene kadar bekler (geri alma sürerken drop). */
    trashGate: null as Promise<void> | null
  };
  const manager = createChangesManager({
    now: () => clock.ms,
    newId: () => `c${++seq}`,
    store: {
      read: () => opts.files ?? { checkpoints: [] },
      write: (_ws, list) => {
        if (state.writeThrows) throw new Error("disk dolu");
        if (!state.writeOk) return false;
        written.push(JSON.parse(JSON.stringify(list)));
        return true;
      },
      remove: (ws) => {
        removed.push(ws);
      },
      indexFile: (ws) => `C:/veri/${ws}.index`,
      restoreIndexFile: (ws) => `C:/veri/${ws}.restore.index`
    },
    git: port,
    workspace: (id) => (id === "w1" ? { cwd } : null),
    dirExists: () => state.dirOk,
    insideRoot: (root, rel) => {
      insideCalls.push([root, rel]);
      order.push(`inside:${rel}`);
      return state.inside(rel);
    },
    pathExists: (_root, rel) => state.exists.has(rel),
    removeEmptyDir: (_root, rel) => {
      if (!state.emptyDirs.has(rel) || state.kinds.get(rel) !== "dir") return false;
      state.kinds.delete(rel);
      state.removedDirs.push(rel);
      order.push(`rmdir:${rel}`);
      return true;
    },
    dirIsEmpty: (_root, rel) => state.emptyDirs.has(rel),
    pathKind: (_root, rel) => {
      if (state.kindThrows) throw new Error("lstat patladı");
      return state.kinds.get(rel) ?? "none";
    },
    trash: async (_root, rel) => {
      if (state.trashGate) await state.trashGate;
      if (state.trashFail.has(rel)) throw new Error("çöp kutusu yok");
      events.push(`trash:${rel}`);
      order.push(`trash:${rel}`);
      // Sahte disk: taşınan yol artık yok (Windows gibi büyük/küçük harf eşi de).
      state.exists.delete(rel);
      for (const key of [...state.kinds.keys()]) if (key.toLowerCase() === rel.toLowerCase()) state.kinds.delete(key);
    },
    agents: () => {
      if (state.agentsThrow) throw new Error("izleyici patladı");
      return state.agents;
    },
    emit: (s) => {
      if (state.emitThrows) throw new Error("pencere yok");
      emitted.push(JSON.parse(JSON.stringify(s)));
    },
    log: (tag, fields) => logs.push([tag, fields])
  });
  const last = () => emitted.at(-1) as ChangesState;
  const ids = () => last().checkpoints.map((c) => c.id);
  return { clock, git, state, manager, written, removed, emitted, logs, events, order, insideCalls, last, ids };
}

type H = ReturnType<typeof harness>;

/** İki kayıt: c1 (T1) ve c2 (T2); c1'in aralığı T1>T2. */
async function twoCheckpoints(h: H, range: FileChange[]) {
  h.git.diffs.set(`${T(1)}>${T(2)}`, range);
  expect(await h.manager.snapshot("w1", "prompt", meta({ paneId: "p1", agentName: "Ayşe", label: "ilk istem" }))).toEqual({ ok: true, id: "c1" });
  h.clock.ms += 1_000;
  expect(await h.manager.snapshot("w1", "prompt", meta({ paneId: "p1", agentName: "Ayşe", label: "ikinci istem" }))).toEqual({ ok: true, id: "c2" });
}

describe("görüntü", () => {
  it("elle: kayıt ekleniyor, diske yazılıyor, yayınlanıyor; günlükte etiket yok", async () => {
    const h = harness();
    expect(await h.manager.snapshot("w1", "manual", meta({ label: "gizli etiket" }))).toEqual({ ok: true, id: "c1" });
    expect(h.written.at(-1)).toEqual([
      { id: "c1", workspaceId: "w1", tree: T(1), createdAt: 1_000, reason: "manual", paneId: null, agentName: null, subtaskId: null, label: "gizli etiket", reviewed: "pending" }
    ]);
    expect(h.last().repo).toBe("ok");
    expect(h.ids()).toEqual(["c1"]);
    expect(h.logs).toContainEqual(["degisiklik.goruntu", { sebep: "elle", sure: 0, sonuc: "tamam" }]);
    expect(JSON.stringify(h.logs)).not.toContain("gizli");
  });

  it("önceki kaydın aralık istatistiği yeni görüntüde hesaplanıp saklanıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts", "modified", 3, 1), change("b.ts", "added", 2, 0)]);
    const [first, second] = h.written.at(-1)!;
    expect(first.stats).toEqual({ files: 2, added: 5, deleted: 1 });
    expect("stats" in second).toBe(false);
  });

  it("200 sınırı: en eski düşüyor", async () => {
    const h = harness({ files: { checkpoints: Array.from({ length: MAX_CHECKPOINTS }, (_, i) => saved(`s${i}`, i + 1)) } });
    await h.manager.snapshot("w1", "manual", meta());
    const list = h.written.at(-1)!;
    expect(list).toHaveLength(MAX_CHECKPOINTS);
    expect(list[0].id).toBe("s1");
    expect(list.at(-1)?.id).toBe("c1");
  });

  it("emit ve depo yazımı fırlatsa da sonuç dönüyor", async () => {
    const h = harness();
    h.state.emitThrows = true;
    h.state.writeThrows = true;
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: true, id: "c1" });
  });

  it("depo değil / git yok / klasör yok: hata fırlatmıyor, kayıt yok, uyarı satırı yok, durum mesajı", async () => {
    const h = harness();
    h.git.probe = { ok: false, reason: "notRepo" };
    expect(() => h.manager.onPromptLine(reg(), "dosyayı düzelt")).not.toThrow();
    await flush();
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: false, reason: "notRepo" });
    expect(h.written).toEqual([]);
    const s = await h.manager.state("w1");
    expect(s?.repo).toBe("notRepo");
    expect(s?.warning).toBeUndefined();
    h.git.probe = { ok: false, reason: "noGit" };
    expect((await h.manager.state("w1"))?.repo).toBe("noGit");
    h.state.dirOk = false;
    expect((await h.manager.state("w1"))?.repo).toBe("missingDir");
    expect(h.logs.every(([tag]) => tag === "degisiklik.goruntu")).toBe(true);
  });

  it("görüntü hatası (locked): uyarı satırı; sonraki başarılı görüntü uyarıyı siliyor", async () => {
    const h = harness();
    h.git.snapshotFail = "locked";
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: false, reason: "locked" });
    expect(h.last().warning).toEqual({ code: "locked", at: 1_000 });
    expect(h.logs).toContainEqual(["degisiklik.goruntu", { sebep: "elle", sure: 0, sonuc: "locked" }]);
    h.git.snapshotFail = null;
    await h.manager.snapshot("w1", "manual", meta());
    expect(h.last().warning).toBeUndefined();
  });

  it("kayıtlı olmayan alan: noWorkspace, bellek girişi yok, diske yazılmıyor; geçersiz kimlik invalid", async () => {
    const h = harness();
    expect(await h.manager.snapshot("w9", "manual", meta())).toEqual({ ok: false, reason: "noWorkspace" });
    expect(await h.manager.snapshot("../x", "manual", meta())).toEqual({ ok: false, reason: "invalid" });
    expect(await h.manager.state("w9")).toBeNull();
    expect(h.written).toEqual([]);
    expect(h.emitted).toEqual([]);
  });

  it("okunamayan kayıt dosyası: görüntü bellekte, diske yazılmıyor", async () => {
    const h = harness({ files: { checkpoints: [], unreadable: true } });
    expect((await h.manager.snapshot("w1", "manual", meta())).ok).toBe(true);
    expect(h.written).toEqual([]);
    expect(h.last().unreadable).toBe(true);
  });

  it("aynı alanda işlemler sıralı: eşzamanlı iki görüntü üst üste binmiyor", async () => {
    const h = harness();
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    const a = h.manager.snapshot("w1", "manual", meta());
    const b = h.manager.snapshot("w1", "manual", meta());
    await flush();
    open();
    await Promise.all([a, b]);
    expect(h.git.maxActive).toBe(1);
    expect(h.ids()).toEqual(["c1", "c2"]);
  });
});

describe("kancalar (spec §4)", () => {
  it("istem: senkron dönüyor; 30 sn içinde aynı ajana ikinci görüntü yok; başka ajana var; / komutu ve alansız kayıt yok", async () => {
    const h = harness();
    expect(h.manager.onPromptLine(reg(), "testleri   düzelt\tlütfen")).toBeUndefined();
    expect(h.events).toEqual([]);
    await flush();
    expect(h.last().checkpoints[0]).toMatchObject({ reason: "prompt", paneId: "p1", agentName: "Ayşe", label: "testleri düzelt lütfen" });
    h.clock.ms += 29_999;
    h.manager.onPromptLine(reg(), "ikinci");
    h.manager.onPromptLine(reg({ paneId: "p2", name: "Can" }), "başka ajan");
    h.manager.onPromptLine(reg({ paneId: "p3" }), "/exit");
    h.manager.onPromptLine(reg({ paneId: "p4", workspaceId: undefined }), "alansız");
    h.manager.onPromptLine(reg({ paneId: "p5", workspaceId: "w9" }), "kayıtsız alan");
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["testleri düzelt lütfen", "başka ajan"]);
    h.clock.ms += 1;
    h.manager.onPromptLine(reg(), "üçüncü");
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["testleri düzelt lütfen", "başka ajan", "üçüncü"]);
    expect(JSON.stringify(h.logs)).not.toContain("düzelt");
  });

  it("dağıtım: alt görev ve ajan adıyla; izleyici fırlatırsa ad boş ama görüntü alınıyor", async () => {
    const h = harness();
    h.state.agents = [presence("p1", "Ayşe", "idle")];
    expect(h.manager.onDispatched("w1", "p1", "s1", "Model tablosu")).toBeUndefined();
    await flush();
    expect(h.last().checkpoints[0]).toMatchObject({ reason: "dispatch", paneId: "p1", agentName: "Ayşe", subtaskId: "s1", label: "Model tablosu" });
    h.state.agentsThrow = true;
    h.manager.onDispatched("w1", "p1", "s2", "Test");
    await flush();
    expect(h.last().checkpoints[1]).toMatchObject({ reason: "dispatch", agentName: null, subtaskId: "s2" });
  });
});

describe("aralık ve diff (spec §5)", () => {
  it("kayıt → sonraki kayıt; sonuncusu çalışma ağacına (taze ağaç, kayıt eklenmiyor); Canlı; kayıt yoksa noCheckpoint", async () => {
    const h = harness();
    expect(await h.manager.live("w1")).toEqual({ ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true });
    await twoCheckpoints(h, [change("a.ts")]);
    expect(await h.manager.range("w1", "c1")).toEqual({ ok: true, files: [change("a.ts")], truncated: false, toWorkingTree: false });
    h.git.diffs.set(`${T(2)}>${T(3)}`, [change("b.ts", "added", 4, 0)]);
    expect(await h.manager.range("w1", "c2")).toEqual({ ok: true, files: [change("b.ts", "added", 4, 0)], truncated: false, toWorkingTree: true });
    h.git.diffs.set(`${T(2)}>${T(4)}`, [change("c.ts")]);
    expect(await h.manager.live("w1")).toEqual({ ok: true, files: [change("c.ts")], truncated: false, toWorkingTree: true });
    expect(h.ids()).toEqual(["c1", "c2"]);
    expect(await h.manager.range("w1", "yok")).toEqual({ ok: false, reason: "notFound" });
  });

  it("ağaç silinmiş (gc): süresi doldu; diff, hazırlık ve geri al reddediliyor; açılışta arka planda tespit", async () => {
    const h = harness({ files: { checkpoints: [saved("s1", 1), saved("s2", 2)] } });
    h.git.missing.add(T(1));
    await h.manager.state("w1");
    await flush();
    expect(h.last().expired).toEqual(["s1"]);
    expect(await h.manager.range("w1", "s1")).toEqual({ ok: false, reason: "expired" });
    expect(await h.manager.fileDiff("w1", "s1", "a.ts")).toEqual({ ok: false, reason: "expired" });
    expect(await h.manager.prepareRevert("w1", "s1")).toEqual({ ok: false, reason: "expired" });
    const result = await h.manager.revert("w1", "s1", ["a.ts"]);
    expect(result).toMatchObject({ ok: false, reason: "expired" });
    expect(h.events.filter((e) => e.startsWith("snapshot"))).toEqual([]);
  });

  it("fileDiff: yalnız aralıktaki yol; listede olmayan notInRange; güvensiz yol invalid", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    expect(await h.manager.fileDiff("w1", "c1", "a.ts")).toEqual({ ok: true, diff: { kind: "text", lines: [{ kind: "add", oldNo: null, newNo: 1, text: "a.ts" }], truncated: false } });
    expect(await h.manager.fileDiff("w1", "c1", "b.ts")).toEqual({ ok: false, reason: "notInRange" });
    expect(await h.manager.fileDiff("w1", "c1", "../a.ts")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("Kabul et ve Geri al (spec §5, §6)", () => {
  it("Kabul et: pending → accepted; dosyaya dokunmuyor; bilinmeyen kayıt notFound", async () => {
    const h = harness();
    await twoCheckpoints(h, []);
    const before = h.events.length;
    expect(h.manager.accept("w1", "c1")).toEqual({ ok: true });
    expect(h.written.at(-1)?.[0].reviewed).toBe("accepted");
    expect(h.events.length).toBe(before);
    expect(h.manager.accept("w1", "yok")).toEqual({ ok: false, reason: "notFound" });
  });

  it("Geri al: önce beforeRestore; değişen/silinen dosyalar ağaçtan, eklenen çöpe; kayıt reverted; günlükte yol yok", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("sil.md", "deleted", 0, 3), change("yeni.txt", "added", 2, 0)]);
    h.state.exists.add("yeni.txt");
    const result = await h.manager.revert("w1", "c1", ["a.ts", "sil.md", "yeni.txt"]);
    expect(result).toEqual({ ok: true, restored: ["a.ts", "sil.md"], trashed: ["yeni.txt"], skipped: [], beforeRestoreId: "c3" });
    // Önce eklenmiş dosyalar çöpe, sonra geri yükleme (inceleme 1: checkout-index -f çakışması).
    expect(h.events.slice(2)).toEqual([`snapshot:${T(3)}`, "trash:yeni.txt", `load:${T(1)}`, "restore:a.ts", "restore:sil.md"]);
    const list = h.written.at(-1)!;
    expect(list.map((c) => [c.id, c.reason, c.reviewed])).toEqual([
      ["c1", "prompt", "reverted"],
      ["c2", "prompt", "pending"],
      ["c3", "beforeRestore", "pending"]
    ]);
    expect(list[2].label).toBe("ilk istem");
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 3, sonuc: "tamam" }]);
    expect(JSON.stringify(h.logs)).not.toMatch(/a\.ts|sil\.md|yeni\.txt/);
  });

  it("Geri al: alt klasör önekiyle tam yol geri yükleniyor", async () => {
    const h = harness();
    h.git.probe = { ok: true, top: "C:/depo", prefix: "src/" };
    await twoCheckpoints(h, [change("a.ts")]);
    await h.manager.revert("w1", "c1", ["a.ts"]);
    expect(h.events).toContain("restore:src/a.ts");
  });

  it("Geri al: beforeRestore alınamazsa hiçbir dosyaya dokunulmuyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.git.snapshotFail = "git";
    const result = await h.manager.revert("w1", "c1", ["a.ts", "yeni.txt"]);
    expect(result).toEqual({ ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] });
    expect(h.events.filter((e) => !e.startsWith("snapshot"))).toEqual([]);
    expect(h.last().checkpoints[0].reviewed).toBe("pending");
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 0, sonuc: "goruntuYok" }]);
  });

  it("Geri al: bir dosya yazılamazsa durur, yazılanlar listelenir, kayıt reverted olmuyor, beforeRestore listede", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("b.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.git.restoreFail.add("b.ts");
    const result = await h.manager.revert("w1", "c1", ["a.ts", "b.ts", "yeni.txt"]);
    // Eklenmiş dosya önce çöpe gitti; yazma b.ts'de durdu.
    expect(result).toEqual({ ok: false, reason: "writeFailed", restored: ["a.ts"], trashed: ["yeni.txt"], skipped: [], failedPath: "b.ts", beforeRestoreId: "c3" });
    expect(h.last().checkpoints.map((c) => [c.id, c.reviewed])).toEqual([
      ["c1", "pending"],
      ["c2", "pending"],
      ["c3", "pending"]
    ]);
    expect(h.last().checkpoints[2].reason).toBe("beforeRestore");
  });

  it("Geri al: çöpe taşınamayan dosyada durur; zaten olmayan eklenmiş dosya atlanıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("gitti.txt", "added"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.state.trashFail.add("yeni.txt");
    const result = await h.manager.revert("w1", "c1", ["gitti.txt", "yeni.txt"]);
    expect(result).toMatchObject({ ok: false, reason: "writeFailed", skipped: ["gitti.txt"], trashed: [], failedPath: "yeni.txt" });
  });

  it("Geri al: onaylanan listede olup artık aralıkta olmayan atlanıyor; aralıkta olup listede olmayana dokunulmuyor; kök dışına çıkan yol reddediliyor", async () => {
    const h = harness();
    await twoCheckpoints(h, []);
    // c2 en sonuncusu: aralığı çalışma ağacına kadar; ön tarama taze ağaçla (T3),
    // beforeRestore (T4) sonrası T2>T4.
    h.git.diffs.set(`${T(2)}>${T(3)}`, [change("b.ts"), change("c.ts")]);
    h.git.diffs.set(`${T(2)}>${T(4)}`, [change("b.ts"), change("c.ts")]);
    const result = await h.manager.revert("w1", "c2", ["a.ts", "b.ts"]);
    expect(result).toMatchObject({ ok: true, restored: ["b.ts"], skipped: ["a.ts"], trashed: [] });
    expect(h.events).not.toContain("restore:c.ts");

    const h2 = harness();
    await twoCheckpoints(h2, [change("a.ts")]);
    h2.state.inside = (rel) => rel !== "a.ts";
    expect(await h2.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "invalid", failedPath: "a.ts", restored: [] });
    expect(h2.events.filter((e) => e.startsWith("restore"))).toEqual([]);
    expect(await h2.manager.revert("w1", "c1", ["../x"])).toEqual({ ok: false, reason: "invalid", restored: [], trashed: [], skipped: [] });
    expect(await h2.manager.revert("w1", "c1", "a.ts")).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("Geri al: aynı alanda ikinci geri alma busy", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    const first = h.manager.revert("w1", "c1", ["a.ts"]);
    expect(await h.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "busy" });
    open();
    expect((await first).ok).toBe(true);
  });

  it("prepareRevert: çakışan sonraki kayıtlar adıyla; çalışan/soru soran ajanlar; dosyaya dokunmuyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("b.ts")]);
    h.clock.ms += 1_000;
    await h.manager.snapshot("w1", "dispatch", meta({ paneId: "p2", agentName: "Can", subtaskId: "s1", label: "Model" }));
    h.git.diffs.set(`${T(2)}>${T(3)}`, [change("a.ts")]);
    h.git.diffs.set(`${T(3)}>${T(4)}`, [change("z.ts")]);
    h.state.agents = [presence("p1", "Ayşe", "running"), presence("p2", "Can", "asking"), presence("p3", "Ece", "idle"), presence("p4", "Baş", "running", "w2")];
    const prepared = await h.manager.prepareRevert("w1", "c1");
    expect(prepared).toEqual({
      ok: true,
      plan: {
        files: [change("a.ts"), change("b.ts")],
        conflicts: [{ id: "c2", label: "ikinci istem", agentName: "Ayşe", reason: "prompt" }],
        conflictsPartial: false,
        runningAgents: ["Ayşe", "Can"]
      }
    });
    expect(h.events.filter((e) => !e.startsWith("snapshot"))).toEqual([]);
    expect(h.ids()).toEqual(["c1", "c2", "c3"]);
  });

  it("drop: kayıt dosyaları siliniyor; bellek temizleniyor", async () => {
    const h = harness();
    await h.manager.snapshot("w1", "manual", meta());
    h.manager.drop("w1");
    expect(h.removed).toEqual(["w1"]);
    expect((await h.manager.state("w1"))?.checkpoints).toEqual([]);
  });
});

describe("Geri al güvenliği (Görev 3 incelemesi)", () => {
  it("insideRoot alan köküyle, her yazma ve çöpe taşımadan HEMEN önce çağrılıyor; önce çöp, sonra geri yükleme", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    expect((await h.manager.revert("w1", "c1", ["a.ts", "yeni.txt"])).ok).toBe(true);
    expect(h.order).toEqual(["inside:yeni.txt", "trash:yeni.txt", "inside:a.ts", "restore:a.ts"]);
    expect(h.insideCalls.every(([root]) => root === "C:/kok")).toBe(true);
  });

  it("alan alt klasör, içinde depo içindeki başka yeri gösteren junction: o dosyada durur, yazma/taşıma yok, kısmi sonuç", async () => {
    // bag/ alan içinde bir junction; gerçek yolu C:/depo/docs (depo içinde ama alan dışında).
    const sub = () => {
      const h = harness({ cwd: "C:/depo/src" });
      h.git.probe = { ok: true, top: "C:/depo", prefix: "src/" };
      h.state.inside = (rel) => !rel.startsWith("bag/");
      return h;
    };
    const h = sub();
    await twoCheckpoints(h, [change("bag/a.ts"), change("ok.ts")]);
    const result = await h.manager.revert("w1", "c1", ["ok.ts", "bag/a.ts"]);
    expect(result).toEqual({ ok: false, reason: "invalid", restored: ["ok.ts"], trashed: [], skipped: [], failedPath: "bag/a.ts", beforeRestoreId: "c3" });
    expect(h.events).not.toContain("restore:src/bag/a.ts");
    expect(h.insideCalls.map(([root]) => root)).toEqual(["C:/depo/src", "C:/depo/src"]);
    expect(h.last().checkpoints[0].reviewed).toBe("pending");
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 1, sonuc: "invalid" }]);

    const h2 = sub();
    await twoCheckpoints(h2, [change("bag/yeni.txt", "added"), change("ok.ts")]);
    h2.state.exists.add("bag/yeni.txt");
    expect(await h2.manager.revert("w1", "c1", ["ok.ts", "bag/yeni.txt"])).toEqual({
      ok: false,
      reason: "invalid",
      restored: [],
      trashed: [],
      skipped: [],
      failedPath: "bag/yeni.txt",
      beforeRestoreId: "c3"
    });
    expect(h2.events.filter((e) => e.startsWith("trash") || e.startsWith("restore"))).toEqual([]);
  });

  it("insideRoot fırlatırsa alan dışı sayılıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    h.state.inside = () => {
      throw new Error("realpath patladı");
    };
    expect(await h.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "invalid", failedPath: "a.ts", restored: [] });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);
  });

  it("restoreFile fırlatırsa durur; o ana kadar yazılanlar ve beforeRestore kimliği dönüyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("b.ts"), change("c.ts")]);
    h.git.restoreThrow.add("b.ts");
    expect(await h.manager.revert("w1", "c1", ["a.ts", "b.ts", "c.ts"])).toEqual({
      ok: false,
      reason: "writeFailed",
      restored: ["a.ts"],
      trashed: [],
      skipped: [],
      failedPath: "b.ts",
      beforeRestoreId: "c3"
    });
    expect(h.events).not.toContain("restore:c.ts");
    expect(h.last().checkpoints[0].reviewed).toBe("pending");
  });

  it("beforeRestore görüntüsü fırlatırsa geri alma hiç başlamıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.git.snapshotThrows = true;
    expect(await h.manager.revert("w1", "c1", ["a.ts", "yeni.txt"])).toEqual({ ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] });
    expect(h.order).toEqual([]);
    expect(h.events.filter((e) => !e.startsWith("snapshot"))).toEqual([]);
  });

  it("kanca: git fırlatsa da istem senkron dönüyor, uyarı saklanıyor", async () => {
    const h = harness();
    h.git.snapshotThrows = true;
    expect(() => h.manager.onPromptLine(reg(), "bir şey yap")).not.toThrow();
    await flush();
    await flush();
    expect(h.last().warning).toEqual({ code: "git", at: 1_000 });
    expect(JSON.stringify(h.logs)).not.toContain("bir şey");
  });
});

describe("Düzeltme turu 1 (Görev 4 incelemesi)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("kanca: görüntü sürerken istem ve dağıtım senkron dönüyor (sahte zamanlayıcı)", async () => {
    vi.useFakeTimers();
    const h = harness();
    h.git.gate = new Promise<void>(() => {});
    expect(h.manager.onPromptLine(reg(), "uzun iş")).toBeUndefined();
    expect(h.manager.onDispatched("w1", "p2", "s1", "Görev")).toBeUndefined();
    // Zaman ilerletilmeden kancalar dönmüş; görüntü hâlâ kapıda bekliyor.
    await vi.advanceTimersByTimeAsync(0);
    expect(h.git.active).toBeGreaterThan(0);
    expect(h.written).toEqual([]);
  });

  it("dosya→klasör: görüntüde dosya olan yerde şimdi klasör var → geri yükleme yapılmıyor, işlem duruyor", async () => {
    const h = harness();
    // c1'de dosya "a"; sonra a/ klasör oldu (a/x eklendi, içinde yok sayılan a/.cache de var).
    await twoCheckpoints(h, [change("a", "deleted"), change("a/x", "added"), change("b.ts")]);
    h.state.exists.add("a/x");
    h.state.kinds.set("a", "dir");
    h.state.kinds.set("a/x", "file");
    const result = await h.manager.revert("w1", "c1", ["a", "a/x", "b.ts"]);
    expect(result).toEqual({ ok: false, reason: "pathConflict", restored: [], trashed: ["a/x"], skipped: [], failedPath: "a", beforeRestoreId: "c3" });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);
    expect(h.last().checkpoints[0].reviewed).toBe("pending");
  });

  it("klasör→dosya: yolun üst parçası artık dosya → geri yükleme yok; o dosya eklenmişse önce çöpe gidiyor, çakışma kalkıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("d/x.ts", "deleted")]);
    h.state.kinds.set("d", "file");
    expect(await h.manager.revert("w1", "c1", ["d/x.ts"])).toMatchObject({ ok: false, reason: "pathConflict", failedPath: "d/x.ts", restored: [] });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);

    // Eklenmiş "d" dosyası aralıkta: önce çöpe (kalıcı silme yok), sonra d/x.ts geri yükleniyor.
    const h2 = harness();
    await twoCheckpoints(h2, [change("d", "added"), change("d/x.ts", "deleted")]);
    h2.state.exists.add("d");
    h2.state.kinds.set("d", "file");
    const out = await h2.manager.revert("w1", "c1", ["d/x.ts", "d"]);
    expect(out).toMatchObject({ ok: true, trashed: ["d"], restored: ["d/x.ts"] });
    expect(h2.order).toEqual(["inside:d", "trash:d", "inside:d/x.ts", "restore:d/x.ts"]);
  });

  it("tür sorgusu fırlatırsa geri yükleme yok", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    h.state.kindThrows = true;
    expect(await h.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "pathConflict", failedPath: "a.ts" });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);
  });

  it("yalnız büyük/küçük harf farklı yeniden adlandırma (Readme.md → README.md): önce çöp, sonra geri yükleme", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("README.md", "added"), change("Readme.md", "deleted")]);
    h.state.exists.add("README.md");
    h.state.kinds.set("README.md", "file");
    // Renderer sırası geri yüklemeyi önce koysa da çöp önce.
    const result = await h.manager.revert("w1", "c1", ["Readme.md", "README.md"]);
    expect(result).toMatchObject({ ok: true, restored: ["Readme.md"], trashed: ["README.md"] });
    expect(h.order).toEqual(["inside:README.md", "trash:README.md", "inside:Readme.md", "restore:Readme.md"]);
  });

  it("200 sınırı: en eski kaydı geri almak kaydı düşürmüyor; geri alma yapılıyor, kayıt reverted", async () => {
    const h = harness({ files: { checkpoints: Array.from({ length: MAX_CHECKPOINTS }, (_, i) => saved(`s${i}`, i + 1)) } });
    h.git.diffs.set(`${T(1)}>${T(2)}`, [change("a.ts")]);
    const result = await h.manager.revert("w1", "s0", ["a.ts"]);
    expect(result).toMatchObject({ ok: true, restored: ["a.ts"], beforeRestoreId: "c1" });
    const list = h.written.at(-1)!;
    expect(list[0]).toMatchObject({ id: "s0", reviewed: "reverted" });
    expect(list[1].id).toBe("s1");
    expect(list.at(-1)).toMatchObject({ id: "c1", reason: "beforeRestore" });
  });

  it("200 sınırı: ortadaki kaydı geri alırken yalnız hedeften eskiler düşüyor", async () => {
    const h = harness({ files: { checkpoints: Array.from({ length: MAX_CHECKPOINTS }, (_, i) => saved(`s${i}`, i + 1)) } });
    h.git.diffs.set(`${T(6)}>${T(7)}`, [change("a.ts")]);
    expect((await h.manager.revert("w1", "s5", ["a.ts"])).ok).toBe(true);
    const list = h.written.at(-1)!;
    expect(list).toHaveLength(MAX_CHECKPOINTS);
    expect(list[0].id).toBe("s1");
    expect(list.find((c) => c.id === "s5")?.reviewed).toBe("reverted");
  });

  it("kayıt dosyası yazılamıyorsa geri alma başlamıyor (storeFailed); dosyaya dokunulmuyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.state.writeOk = false;
    const result = await h.manager.revert("w1", "c1", ["a.ts", "yeni.txt"]);
    expect(result).toMatchObject({ ok: false, reason: "storeFailed", restored: [], trashed: [], skipped: [] });
    expect(h.order).toEqual([]);
    expect(h.events.filter((e) => !e.startsWith("snapshot"))).toEqual([]);
    expect(h.last().warning).toEqual({ code: "storeFailed", at: 2_000 });
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 0, sonuc: "storeFailed" }]);

    // Fırlatan depo da aynı.
    const h2 = harness();
    await twoCheckpoints(h2, [change("a.ts")]);
    h2.state.writeThrows = true;
    expect(await h2.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "storeFailed" });
    expect(h2.events.filter((e) => e.startsWith("restore"))).toEqual([]);
  });

  it("okunamayan kayıt dosyasında (diske yazılamaz) geri alma başlamıyor", async () => {
    const h = harness({ files: { checkpoints: [saved("s1", 1), saved("s2", 2)], unreadable: true } });
    h.git.diffs.set(`${T(1)}>${T(2)}`, [change("a.ts")]);
    expect(await h.manager.revert("w1", "s1", ["a.ts"])).toMatchObject({ ok: false, reason: "storeFailed" });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);
  });

  it("görüntü ve Kabul et: depo yazılamazsa uyarı saklanıyor (sessiz yutma yok)", async () => {
    const h = harness();
    h.state.writeOk = false;
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: true, id: "c1" });
    expect(h.last().warning).toEqual({ code: "storeFailed", at: 1_000 });
    h.state.writeOk = true;
    await h.manager.snapshot("w1", "manual", meta());
    expect(h.last().warning).toBeUndefined();
    h.state.writeOk = false;
    h.clock.ms = 5_000;
    expect(h.manager.accept("w1", "c1")).toEqual({ ok: true });
    expect(h.last().warning).toEqual({ code: "storeFailed", at: 5_000 });
  });

  it("geri alınmış kayıt yönetici düzeyinde yeniden geri alınamıyor (alreadyReverted), beforeRestore birikmiyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    expect((await h.manager.revert("w1", "c1", ["a.ts"])).ok).toBe(true);
    const count = h.last().checkpoints.length;
    expect(await h.manager.revert("w1", "c1", ["a.ts"])).toEqual({ ok: false, reason: "alreadyReverted", restored: [], trashed: [], skipped: [] });
    expect(await h.manager.prepareRevert("w1", "c1")).toEqual({ ok: false, reason: "alreadyReverted" });
    expect(h.last().checkpoints.length).toBe(count);
  });

  it("aralığın sonundaki ağaç silinmiş: hedef de süresi doldu; beforeRestore alınmıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    h.git.missing.add(T(2));
    expect(await h.manager.revert("w1", "c1", ["a.ts"])).toEqual({ ok: false, reason: "expired", restored: [], trashed: [], skipped: [] });
    expect(h.events.filter((e) => e.startsWith("snapshot"))).toHaveLength(2);
    expect([...h.last().expired].sort()).toEqual(["c1", "c2"]);
    expect(h.ids()).toEqual(["c1", "c2"]);
  });

  it("30 sn tablosu yalnız başarılı görüntüde: başarısız görüntüden hemen sonra aynı ajanın istemi görüntü alıyor", async () => {
    const h = harness();
    h.git.snapshotFail = "locked";
    h.manager.onPromptLine(reg(), "ilk");
    await flush();
    h.git.snapshotFail = null;
    h.clock.ms += 1_000;
    h.manager.onPromptLine(reg(), "ikinci");
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["ikinci"]);
    h.clock.ms += 1_000;
    h.manager.onPromptLine(reg(), "üçüncü");
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["ikinci"]);
  });

  it("aynı ajanın görüntüsü sürerken gelen ikinci istem ikinci görüntü almıyor", async () => {
    const h = harness();
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    h.manager.onPromptLine(reg(), "ilk");
    h.manager.onPromptLine(reg(), "ikinci");
    open();
    await flush();
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["ilk"]);
  });
});

describe("Boş klasör (kontrolcü eki)", () => {
  it("eklenmiş dosyalar çöpe gidince hedefte BOŞ kalan klasör kaldırılıyor, geri yükleme sürüyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a", "deleted"), change("a/x", "added")]);
    h.state.exists.add("a/x");
    h.state.kinds.set("a", "dir");
    h.state.kinds.set("a/x", "file");
    h.state.emptyDirs.add("a");
    const result = await h.manager.revert("w1", "c1", ["a", "a/x"]);
    expect(result).toEqual({ ok: true, restored: ["a"], trashed: ["a/x"], skipped: [], beforeRestoreId: "c3" });
    expect(h.order).toEqual(["inside:a/x", "trash:a/x", "inside:a", "rmdir:a", "restore:a"]);
    expect(h.state.removedDirs).toEqual(["a"]);
  });

  it("dolu klasör: pathConflict, hiçbir şey silinmiyor", async () => {
    const h = harness();
    // a/ içinde yok sayılan a/.cache var: klasör boş değil.
    await twoCheckpoints(h, [change("a", "deleted"), change("b.ts")]);
    h.state.kinds.set("a", "dir");
    const result = await h.manager.revert("w1", "c1", ["a", "b.ts"]);
    expect(result).toEqual({ ok: false, reason: "pathConflict", restored: [], trashed: [], skipped: [], failedPath: "a" });
    expect(h.state.removedDirs).toEqual([]);
    expect(h.events.filter((e) => e.startsWith("restore") || e.startsWith("trash"))).toEqual([]);
  });

  it("üst parça klasörse kaldırılmıyor; yalnız hedefin kendisi; removeEmptyDir fırlatırsa pathConflict", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("d/x.ts", "deleted")]);
    h.state.kinds.set("d", "dir");
    h.state.emptyDirs.add("d");
    expect((await h.manager.revert("w1", "c1", ["d/x.ts"])).ok).toBe(true);
    expect(h.state.removedDirs).toEqual([]);

    const h2 = harness();
    await twoCheckpoints(h2, [change("a", "deleted")]);
    h2.state.kinds.set("a", "dir");
    h2.state.emptyDirs.add("a");
    h2.state.emptyDirs.has = () => {
      throw new Error("rmdir patladı");
    };
    expect(await h2.manager.revert("w1", "c1", ["a"])).toMatchObject({ ok: false, reason: "pathConflict", failedPath: "a" });
    expect(h2.events.filter((e) => e.startsWith("restore"))).toEqual([]);
  });
});

describe("Düzeltme turu 2 (yeniden inceleme)", () => {
  it("hedef yol bağ/junction (link): geri yükleme yok, removeEmptyDir çağrılmıyor, hiçbir şey silinmiyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a", "deleted"), change("b.ts")]);
    h.state.kinds.set("a", "link");
    h.state.emptyDirs.add("a");
    const result = await h.manager.revert("w1", "c1", ["a", "b.ts"]);
    expect(result).toEqual({ ok: false, reason: "pathConflict", restored: [], trashed: [], skipped: [], failedPath: "a" });
    expect(h.state.removedDirs).toEqual([]);
    expect(h.events.filter((e) => e.startsWith("restore") || e.startsWith("trash"))).toEqual([]);
  });

  it("üst parça link: geri yükleme durur", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("bag/ic/x.ts", "deleted")]);
    h.state.kinds.set("bag", "dir");
    h.state.kinds.set("bag/ic", "link");
    expect(await h.manager.revert("w1", "c1", ["bag/ic/x.ts"])).toMatchObject({ ok: false, reason: "pathConflict", failedPath: "bag/ic/x.ts", restored: [] });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);
  });

  it("eklenmiş dosyanın üst parçası link: çöpe taşıma yok, işlem durur", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("bag/yeni.txt", "added"), change("a.ts")]);
    h.state.exists.add("bag/yeni.txt");
    h.state.kinds.set("bag", "link");
    h.state.kinds.set("bag/yeni.txt", "file");
    expect(await h.manager.revert("w1", "c1", ["bag/yeni.txt", "a.ts"])).toEqual({
      ok: false,
      reason: "pathConflict",
      restored: [],
      trashed: [],
      skipped: [],
      failedPath: "bag/yeni.txt"
    });
    expect(h.events.filter((e) => e.startsWith("trash") || e.startsWith("restore"))).toEqual([]);
  });

  it("okunan 201 kayıt olduğu gibi kalıyor; en eski (hedef) geri alınabiliyor", async () => {
    const h = harness({ files: { checkpoints: Array.from({ length: MAX_CHECKPOINTS + 1 }, (_, i) => saved(`s${i}`, i + 1)) } });
    expect((await h.manager.state("w1"))?.checkpoints).toHaveLength(MAX_CHECKPOINTS + 1);
    h.git.diffs.set(`${T(1)}>${T(2)}`, [change("a.ts")]);
    expect(await h.manager.revert("w1", "s0", ["a.ts"])).toMatchObject({ ok: true, restored: ["a.ts"] });
    const list = h.written.at(-1)!;
    expect(list[0]).toMatchObject({ id: "s0", reviewed: "reverted" });
  });

  it("yalnız büyük/küçük harf farklı iki ad aralıkta, yalnız silinen taraf seçildi: pathConflict, hiçbir şeye dokunulmuyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("README.md", "added"), change("Readme.md", "deleted"), change("b.ts")]);
    h.state.exists.add("README.md");
    h.state.kinds.set("README.md", "file");
    expect(await h.manager.revert("w1", "c1", ["b.ts", "Readme.md"])).toEqual({
      ok: false,
      reason: "pathConflict",
      restored: [],
      trashed: [],
      skipped: [],
      failedPath: "Readme.md"
    });
    expect(h.order).toEqual([]);
    // İkisi birlikte seçilince işleniyor (önce çöp, sonra geri yükleme).
    const h2 = harness();
    await twoCheckpoints(h2, [change("README.md", "added"), change("Readme.md", "deleted")]);
    h2.state.exists.add("README.md");
    h2.state.kinds.set("README.md", "file");
    expect(await h2.manager.revert("w1", "c1", ["Readme.md", "README.md"])).toMatchObject({ ok: true, trashed: ["README.md"], restored: ["Readme.md"] });
  });
});

describe("Alan kapatma uçuştaki işlemle (Görev 6)", () => {
  it("görüntü sürerken drop: uçuştaki ve kuyruktaki görüntü kayıt dosyasını yeniden yaratmıyor, bellekte eski girdi yok", async () => {
    const h = harness();
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    const first = h.manager.snapshot("w1", "manual", meta());
    const queued = h.manager.snapshot("w1", "prompt", meta({ label: "kuyrukta" }));
    await flush();
    h.manager.drop("w1");
    const emittedAt = h.emitted.length;
    open();
    expect(await first).toEqual({ ok: false, reason: "noWorkspace" });
    expect(await queued).toEqual({ ok: false, reason: "noWorkspace" });
    expect(h.written).toEqual([]);
    expect(h.removed).toEqual(["w1"]);
    expect(h.emitted.length).toBe(emittedAt);
    // Drop'tan SONRA istenen yeni işlem temiz bir girdiyle başlıyor (eski kayıt geri gelmiyor).
    h.git.gate = null;
    expect((await h.manager.snapshot("w1", "manual", meta())).ok).toBe(true);
    expect(h.written.at(-1)).toHaveLength(1);
  });

  it("geri alma sürerken drop: kayıt reverted yazılmıyor, dosya yeniden yaratılmıyor, yayın yok; kuyruktaki görüntü düşüyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("yeni.txt", "added"), change("a.ts")]);
    h.state.exists.add("yeni.txt");
    let open: () => void = () => {};
    h.state.trashGate = new Promise<void>((r) => {
      open = r;
    });
    const writes = h.written.length;
    const pending = h.manager.revert("w1", "c1", ["yeni.txt", "a.ts"]);
    const queued = h.manager.snapshot("w1", "manual", meta());
    // beforeRestore yazıldı; çöpe taşıma kapıda bekliyor.
    await vi.waitFor(() => expect(h.written.length).toBe(writes + 1));
    h.manager.drop("w1");
    const emittedAt = h.emitted.length;
    open();
    const result = await pending;
    expect(result).toMatchObject({ trashed: ["yeni.txt"], restored: ["a.ts"], beforeRestoreId: "c3" });
    expect(await queued).toEqual({ ok: false, reason: "noWorkspace" });
    expect(h.written.length).toBe(writes + 1);
    expect(h.emitted.length).toBe(emittedAt);
    expect(h.removed).toEqual(["w1"]);
    expect((await h.manager.state("w1"))?.checkpoints).toEqual([]);
  });

  it("beforeRestore görüntüsü sürerken drop: hiçbir dosyaya dokunulmuyor, hiçbir şey yazılmıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    const writes = h.written.length;
    const pending = h.manager.revert("w1", "c1", ["a.ts"]);
    await flush();
    h.manager.drop("w1");
    open();
    expect(await pending).toMatchObject({ ok: false, restored: [], trashed: [] });
    expect(h.events.filter((e) => e.startsWith("restore") || e.startsWith("trash"))).toEqual([]);
    expect(h.written.length).toBe(writes);
  });
});

describe("Silinmiş yolda yeni dosya (Görev 4 incelemesinden)", () => {
  it("kayıtta silinmiş yolda diskte artık bir dosya var: geri yükleme ezmiyor, pathConflict", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("sil.md", "deleted", 0, 3), change("b.ts")]);
    h.state.kinds.set("sil.md", "file");
    h.state.kinds.set("b.ts", "file");
    expect(await h.manager.revert("w1", "c1", ["sil.md", "b.ts"])).toEqual({
      ok: false,
      reason: "pathConflict",
      restored: [],
      trashed: [],
      skipped: [],
      failedPath: "sil.md"
    });
    expect(h.events.filter((e) => e.startsWith("restore"))).toEqual([]);
    // Değişmiş (modified) dosyanın diskte olması beklenen: geri yükleniyor.
    const h2 = harness();
    await twoCheckpoints(h2, [change("b.ts")]);
    h2.state.kinds.set("b.ts", "file");
    expect(await h2.manager.revert("w1", "c1", ["b.ts"])).toMatchObject({ ok: true, restored: ["b.ts"] });
  });
});

describe("Ön tarama (son inceleme, Important 2)", () => {
  it("R1'de silinen dosya sonradan yeniden yaratılmış: hiçbir dosya çöpe taşınmadan/yazılmadan pathConflict; çöp ve git sahteleri çağrılmıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("yeni.txt", "added"), change("sil.md", "deleted", 0, 3), change("a.ts")]);
    h.state.exists.add("yeni.txt");
    h.state.kinds.set("yeni.txt", "file");
    h.state.kinds.set("sil.md", "file");
    const writes = h.written.length;
    const eventsBefore = h.events.length;
    expect(await h.manager.revert("w1", "c1", ["yeni.txt", "sil.md", "a.ts"])).toEqual({
      ok: false,
      reason: "pathConflict",
      restored: [],
      trashed: [],
      skipped: [],
      failedPath: "sil.md"
    });
    // beforeRestore görüntüsü yok, özel index'e yükleme yok, çöp yok, geri yükleme yok.
    expect(h.events.slice(eventsBefore)).toEqual([]);
    expect(h.order).toEqual([]);
    expect(h.written.length).toBe(writes);
    expect(h.last().checkpoints.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 0, sonuc: "pathConflict" }]);
  });

  it("ön tarama dolu klasörü (eklenmiş dosyası yok) ve hedefteki bağı yazmadan buluyor; çöpe giden eklenmiş eş çakışma sayılmıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("yeni.txt", "added"), change("a", "deleted")]);
    h.state.exists.add("yeni.txt");
    h.state.kinds.set("a", "dir");
    expect(await h.manager.revert("w1", "c1", ["yeni.txt", "a"])).toMatchObject({ ok: false, reason: "pathConflict", failedPath: "a", trashed: [] });
    expect(h.events.filter((e) => e.startsWith("trash") || e.startsWith("snapshot:" + T(3)))).toEqual([]);

    const h2 = harness();
    await twoCheckpoints(h2, [change("yeni.txt", "added"), change("b.ts")]);
    h2.state.exists.add("yeni.txt");
    h2.state.kinds.set("b.ts", "link");
    expect(await h2.manager.revert("w1", "c1", ["yeni.txt", "b.ts"])).toMatchObject({ ok: false, reason: "pathConflict", failedPath: "b.ts", trashed: [] });
    expect(h2.order).toEqual([]);

    // Windows'ta lstat büyük/küçük harfe duyarsız: silinmiş Readme.md yolunda eklenmiş README.md
    // "file" görünüyor; README.md de seçili (önce çöpe gidecek) → çakışma değil.
    const h3 = harness();
    await twoCheckpoints(h3, [change("README.md", "added"), change("Readme.md", "deleted")]);
    h3.state.exists.add("README.md");
    h3.state.kinds.set("README.md", "file");
    h3.state.kinds.set("Readme.md", "file");
    const out = await h3.manager.revert("w1", "c1", ["Readme.md", "README.md"]);
    expect(out).toMatchObject({ ok: true, trashed: ["README.md"], restored: ["Readme.md"] });
  });
});
