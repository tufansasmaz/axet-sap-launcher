// Pano yöneticisi (spec 2026-10-18 gorev-panosu §3–§7, §9). Depo, izleyici,
// lider, doğrulama, bildirim ve günlük sahte; axet-code çalıştırılmıyor.
import { describe, expect, it, vi } from "vitest";
import { createBoardManager } from "../app-electron/main/boardManager";
import { boardNotificationFor } from "../app-electron/main/boardNotification";
import type { AgentPresence, AgentPromptResult, LogFields } from "../app-electron/main/agentMonitor";
import type { BoardFileResult } from "../app-electron/main/boardStore";
import type { LeadOutcome } from "../app-electron/main/boardLead";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { SubtaskDraft } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Proof } from "../app-electron/shared/boardTypes";

const exact = (state: AgentStatus["state"], lastActivity: number | null = 500): AgentStatus => ({ state, source: "exact", lastActivity });
const presence = (
  paneId: string,
  status: AgentStatus | null,
  over: Partial<AgentPresence["reg"]> = {},
  inputIdle = true
): AgentPresence => ({
  reg: {
    paneId,
    ptyId: `t-${paneId}`,
    engine: "axet-code",
    cwd: "C:\\kok",
    command: "axet-code -y",
    name: paneId,
    roleKind: "custom",
    sap: false,
    added: false,
    workspaceId: "w1",
    role: "",
    ...over
  },
  status,
  inputIdle
});
const proof = (ok: boolean): Proof => ({
  kind: "commands",
  ok,
  at: 9,
  commands: [{ command: "npm test", exitCode: ok ? 0 : 1, durationMs: 40, tail: ok ? "geçti" : "FAIL x.test.ts" }]
});
const flush = () => new Promise((r) => setTimeout(r, 0));
const draft = (id: string, over: Partial<SubtaskDraft> = {}): SubtaskDraft => ({
  id,
  title: `Alt ${id}`,
  prompt: `İstem ${id}\nikinci satır`,
  roleHint: "",
  dependsOn: [],
  ...over
});

function harness(opts: { verify?: string[]; files?: Record<string, BoardFileResult> } = {}) {
  const clock = { ms: 1_000 };
  let seq = 0;
  let writeCallCount = 0;
  const written = new Map<string, BoardTask[]>();
  const removed: string[] = [];
  const emitted: Board[] = [];
  const notified: [string, string, string][] = [];
  const logs: [string, LogFields][] = [];
  const prompts: [string, string][] = [];
  const settlers: ((outcome: "sent" | "aborted") => void)[] = [];
  const state = {
    agents: [] as AgentPresence[],
    promptResult: "ok" as AgentPromptResult,
    agentsThrow: false,
    /** true ise sendPrompt içinde onSettled("aborted") eşzamanlı çağrılır. */
    promptAbortedSync: false
  };
  const leads: { cwd: string; prompt: string; resolve: (o: LeadOutcome) => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const verifies: { commands: readonly string[]; cwd: string; resolve: (p: Proof) => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const info = { cwd: "C:\\kok", verify: opts.verify ?? ["npm test"] };
  const manager = createBoardManager({
    now: () => clock.ms,
    newId: () => `id${++seq}`,
    store: {
      read: (id) => opts.files?.[id] ?? { tasks: [] },
      write: (id, tasks) => {
        writeCallCount++;
        written.set(id, JSON.parse(JSON.stringify(tasks)));
        return true;
      },
      remove: (id) => {
        removed.push(id);
      },
      list: () => [...new Set([...written.keys(), ...Object.keys(opts.files ?? {})])]
    },
    agents: () => {
      if (state.agentsThrow) throw new Error("izleyici patladı");
      return state.agents;
    },
    sendPrompt: (paneId, text, onSettled) => {
      if (state.promptResult === "ok") {
        prompts.push([paneId, text]);
        if (onSettled) {
          if (state.promptAbortedSync) {
            onSettled("aborted");
          } else {
            settlers.push(onSettled);
          }
        }
      }
      return state.promptResult;
    },
    workspace: (id) => (id === "w1" ? info : null),
    startLead: (cwd, prompt) => {
      let resolve: (o: LeadOutcome) => void = () => {};
      const done = new Promise<LeadOutcome>((r) => {
        resolve = r;
      });
      const cancel = vi.fn();
      leads.push({ cwd, prompt, resolve, cancel });
      return { done, cancel };
    },
    startVerify: (commands, cwd) => {
      let resolve: (p: Proof) => void = () => {};
      const done = new Promise<Proof>((r) => {
        resolve = r;
      });
      const cancel = vi.fn();
      verifies.push({ commands, cwd, resolve, cancel });
      return { done, cancel };
    },
    emit: (b) => emitted.push(b),
    notify: (kind, ws, title) => notified.push([kind, ws, title]),
    log: (tag, fields) => logs.push([tag, fields])
  });
  const board = () => manager.get("w1")!;
  const task = (id = "id1") => board().tasks.find((t) => t.id === id)!;
  const save = (subtasks: SubtaskDraft[]) =>
    manager.command("w1", { type: "saveDraft", taskId: "id1", title: "İade akışı", goal: "Ödeme modülüne iade ekle", subtasks });
  const getWriteCount = () => writeCallCount;
  return { clock, manager, written, removed, emitted, notified, logs, prompts, settlers, state, leads, verifies, info, board, task, save, getWriteCount };
}

type H = ReturnType<typeof harness>;

/** Görev oluşturur, taslağı kaydeder, onaylar; görev kimliği "id1". */
function approvedTask(h: H, subtasks: SubtaskDraft[] = [draft("a")]) {
  expect(h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Ödeme modülüne iade ekle" })).toEqual({ ok: true, taskId: "id1" });
  expect(h.save(subtasks)).toEqual({ ok: true, taskId: "id1" });
  expect(h.manager.command("w1", { type: "approve", taskId: "id1" })).toEqual({ ok: true, taskId: "id1" });
}

/** "a" alt görevini p1'e verip ajanı bitirtir: a verifying. */
function runToVerifying(h: H) {
  h.state.agents = [presence("p1", exact("idle"))];
  h.manager.tick();
  h.state.agents = [presence("p1", exact("idle", 1_500))];
  h.manager.tick();
}

describe("görev, taslak, onay", () => {
  it("alt görevsiz onay reddediliyor; onayda ready/waiting, dosyaya yazılıyor, yayınlanıyor", () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    expect(h.manager.command("w1", { type: "approve", taskId: "id1" })).toEqual({ ok: false, reason: "badState" });
    h.save([draft("a"), draft("b", { dependsOn: ["a"] })]);
    expect(h.task().state).toBe("awaitingApproval");
    expect(h.manager.command("w1", { type: "approve", taskId: "id1" }).ok).toBe(true);
    expect(h.task().subtasks.map((s) => s.state)).toEqual(["ready", "waiting"]);
    expect(h.written.get("w1")![0].subtasks.map((s) => s.state)).toEqual(["ready", "waiting"]);
    expect(h.emitted.at(-1)!.tasks[0].state).toBe("running");
  });

  it("taslak: döngü ve geçersiz bağımlılık reddediliyor; onaylı görevde düzenleme yok", () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "" });
    expect(h.save([draft("a", { dependsOn: ["b"] }), draft("b", { dependsOn: ["a"] })])).toEqual({ ok: false, reason: "cycle" });
    expect(h.save([draft("a", { dependsOn: ["x"] })])).toEqual({ ok: false, reason: "badDependency" });
    h.save([draft("a")]);
    h.manager.command("w1", { type: "approve", taskId: "id1" });
    expect(h.save([draft("a")])).toEqual({ ok: false, reason: "badState" });
  });

  it("saveDraft boş başlık reddediliyor", () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "" });
    expect(h.manager.command("w1", { type: "saveDraft", taskId: "id1", title: "   ", goal: "", subtasks: [draft("a")] })).toEqual({
      ok: false,
      reason: "invalid"
    });
  });

  it("pano başına 50 görev", () => {
    const h = harness();
    for (let i = 0; i < 50; i += 1) h.manager.command("w1", { type: "createTask", title: `G${i}`, goal: "" });
    expect(h.manager.command("w1", { type: "createTask", title: "fazla", goal: "" })).toEqual({ ok: false, reason: "limit" });
  });
});

describe("lider", () => {
  it("Böl: alan kökünde; istemde hedef ve bu alanın rolleri; planlanıyor; plan taslağa geliyor; günlükte hedef/istem yok", async () => {
    const h = harness();
    h.state.agents = [presence("p1", exact("idle"), { role: "coder" }), presence("p9", exact("idle"), { role: "başka", workspaceId: "w2" })];
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "GİZLİ HEDEF" });
    expect(h.manager.command("w1", { type: "split", taskId: "id1" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.leads[0].cwd).toBe("C:\\kok");
    expect(h.leads[0].prompt).toContain("GİZLİ HEDEF");
    expect(h.leads[0].prompt).toContain("rolleri: coder");
    expect(h.leads[0].prompt).not.toContain("başka");
    expect(h.task().planning).toBe(true);
    expect(h.manager.command("w1", { type: "split", taskId: "id1" })).toEqual({ ok: false, reason: "badState" });
    expect(h.manager.command("w1", { type: "approve", taskId: "id1" })).toEqual({ ok: false, reason: "badState" });
    h.leads[0].resolve({
      ok: true,
      changedFiles: true,
      durationMs: 1200,
      subtasks: [
        { title: "Model", prompt: "Tabloyu ekle", roleHint: "coder", dependsOn: [] },
        { title: "Test", prompt: "Testleri yaz", roleHint: "", dependsOn: [0] }
      ]
    });
    await flush();
    const t = h.task();
    expect(t.planning).toBeUndefined();
    expect(t.state).toBe("awaitingApproval");
    expect(t.leadChangedFiles).toBe(true);
    expect(t.subtasks.map((s) => [s.id, s.title, s.dependsOn, s.state])).toEqual([
      ["id2", "Model", [], "waiting"],
      ["id3", "Test", ["id2"], "waiting"]
    ]);
    expect(h.logs).toContainEqual(["pano.lider", { sure: 1200, altGorev: 2, sonuc: "tamam" }]);
    expect(JSON.stringify(h.logs)).not.toContain("GİZLİ HEDEF");
    expect(JSON.stringify(h.logs)).not.toContain("Tabloyu ekle");
  });

  it("lider hatası: stuck, açık kod, ham cevap; Yeniden dene yeni lider başlatıyor ve hatayı siliyor", async () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    h.manager.command("w1", { type: "split", taskId: "id1" });
    h.leads[0].resolve({ ok: false, error: "noJson", raw: "Bölemem.", changedFiles: false, durationMs: 5 });
    await flush();
    expect(h.task()).toMatchObject({ state: "stuck", leadError: "noJson", leadRaw: "Bölemem." });
    expect(h.logs).toContainEqual(["pano.lider", { sure: 5, altGorev: 0, sonuc: "gecersiz" }]);
    expect(h.manager.command("w1", { type: "split", taskId: "id1" }).ok).toBe(true);
    expect(h.leads).toHaveLength(2);
    expect(h.task().leadError).toBeUndefined();
  });

  it("axet-code yok: binary + Doktor mesajı; elle alt görev ekleyince hata siliniyor", async () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    h.manager.command("w1", { type: "split", taskId: "id1" });
    h.leads[0].resolve({ ok: false, error: "binary", detail: "axet-code bulunamadı", changedFiles: false, durationMs: 1 });
    await flush();
    expect(h.task()).toMatchObject({ state: "stuck", leadError: "binary", leadDetail: "axet-code bulunamadı" });
    expect(h.logs).toContainEqual(["pano.lider", { sure: 1, altGorev: 0, sonuc: "motor" }]);
    h.save([draft("a")]);
    expect(h.task()).toMatchObject({ state: "awaitingApproval" });
    expect(h.task().leadError).toBeUndefined();
  });

  it("silinmiş göreve geç lider sonucu yazılmıyor; silme lideri iptal ediyor", async () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    h.manager.command("w1", { type: "split", taskId: "id1" });
    expect(h.manager.command("w1", { type: "deleteTask", taskId: "id1" }).ok).toBe(true);
    expect(h.leads[0].cancel).toHaveBeenCalled();
    h.leads[0].resolve({ ok: true, changedFiles: false, durationMs: 1, subtasks: [{ title: "A", prompt: "B", roleHint: "", dependsOn: [] }] });
    await flush();
    expect(h.board().tasks).toEqual([]);
  });
});

describe("dağıtım", () => {
  it("kendiliğinden: uygun ajana tek satır istem; deneme, gönderim anı; günlükte istem yok; ikinci turda yeniden yazmıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(h.prompts).toEqual([["p1", "[Gorev a] İstem a ikinci satır"]]);
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", paneId: "p1", attempts: 1, dispatchedAt: 1_000 });
    expect(h.logs).toContainEqual(["pano.dagitim", { altGorev: "a", bolme: "p1", yol: "oto" }]);
    expect(JSON.stringify(h.logs)).not.toContain("İstem");
    h.manager.tick();
    expect(h.prompts).toHaveLength(1);
  });

  it("istem öneki: başta ! olan istem oto, elle ve geri gönderimde '[Gorev ' ile başlıyor", async () => {
    const h = harness();
    approvedTask(h, [draft("a", { prompt: "!rm -rf src" }), draft("b", { prompt: "/exit" })]);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(h.prompts).toEqual([["p1", "[Gorev a] !rm -rf src"]]);
    h.state.agents = [presence("p1", exact("running")), presence("p2", { state: "idle", source: "estimated", lastActivity: 900 })];
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" }).ok).toBe(true);
    expect(h.prompts.at(-1)).toEqual(["p2", "[Gorev b] /exit"]);
    h.state.agents = [presence("p1", exact("idle", 1_500)), presence("p2", exact("running"))];
    h.manager.tick();
    h.verifies[0].resolve(proof(false));
    await flush();
    h.state.agents = [presence("p1", exact("idle", 1_500)), presence("p2", exact("running"))];
    expect(h.manager.command("w1", { type: "sendBack", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.prompts.at(-1)![1].startsWith("[Gorev a] Doğrulama başarısız")).toBe(true);
    for (const [, text] of h.prompts) expect(text.startsWith("[Gorev ")).toBe(true);
  });

  it("istem öneki: aynı cümleyle başlayan iki paralel alt görevin ilk 80 karakteri farklı", () => {
    const h = harness();
    const common = "Bu depo bir Electron uygulamasıdır ve görev panosu modülünü içerir; lütfen dikkatle ";
    approvedTask(h, [draft("x1", { prompt: `${common}modeli ekle` }), draft("x2", { prompt: `${common}testleri yaz` })]);
    h.state.agents = [presence("p1", exact("idle")), presence("p2", exact("idle"))];
    h.manager.tick();
    expect(h.prompts).toHaveLength(2);
    expect(h.prompts[0][1].slice(0, 80)).not.toBe(h.prompts[1][1].slice(0, 80));
  });

  it("motor kapalı (kabuk istemi) ya da kullanıcı yazıyor: hiçbir şey yazılmıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", { state: "finished", source: "estimated", lastActivity: 1 }), presence("p2", exact("idle"), {}, false)];
    h.manager.tick();
    expect(h.prompts).toEqual([]);
    expect(h.task().subtasks[0].state).toBe("ready");
  });

  it("izleyici son anda reddederse (notRunning) alt görev ready kalıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.state.promptResult = "notRunning";
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", paneId: null, attempts: 0 });
  });

  it("Ajana ver: tahmini boşta ajana elle verilebiliyor; meşgul ajana, yazan kullanıcıya, başka alanın ajanına verilemiyor", () => {
    const h = harness();
    approvedTask(h, [draft("a"), draft("b")]);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p1" })).toEqual({ ok: false, reason: "notEligible" });
    const quiet: AgentStatus = { state: "idle", source: "estimated", lastActivity: 900 };
    h.state.agents = [presence("p1", exact("running")), presence("p2", quiet, {}, false), presence("p3", exact("idle"), { workspaceId: "w2" })];
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: false, reason: "typing" });
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p3" })).toEqual({ ok: false, reason: "notEligible" });
    h.state.agents[1] = presence("p2", quiet);
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.prompts.at(-1)).toEqual(["p2", "[Gorev b] İstem b ikinci satır"]);
    expect(h.logs).toContainEqual(["pano.dagitim", { altGorev: "b", bolme: "p2", yol: "elle" }]);
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: false, reason: "badState" });
  });

  it("ajan kapandı → ready + held, dağıtıcı atlıyor; Yeniden sıraya al → dağıtılıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    h.state.agents = [presence("p2", exact("idle"))];
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, note: "agentClosed", paneId: null });
    h.manager.tick();
    expect(h.prompts).toHaveLength(1);
    expect(h.manager.command("w1", { type: "requeue", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.prompts.at(-1)).toEqual(["p2", "[Gorev a] İstem a ikinci satır"]);
  });

  it("yeniden başlatma: diskten held gelen alt görev kendiliğinden gönderilmiyor", () => {
    const held: BoardTask = {
      id: "t1",
      title: "İade",
      goal: "",
      state: "running",
      createdAt: 1,
      approvedAt: 2,
      subtasks: [{ id: "a", title: "A", prompt: "P", roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 1, held: true, note: "restarted" }]
    };
    const h = harness({ files: { w1: { tasks: [held] } } });
    h.state.agents = [presence("p1", exact("idle"))];
    expect(h.board().tasks[0].subtasks[0].note).toBe("restarted");
    h.manager.tick();
    expect(h.prompts).toEqual([]);
  });

  it("izleyici fırlatırsa o turda reconcile atlanır, running alt görevler agentClosed olmaz ve diske yazılmaz", () => {
    const h = harness();
    approvedTask(h, [draft("a"), draft("b")]);
    h.state.agents = [presence("p1", exact("idle")), presence("p2", exact("idle"))];
    h.manager.tick(); // a → running(p1), b → running(p2)
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", paneId: "p1" });
    expect(h.task().subtasks[1]).toMatchObject({ state: "running", paneId: "p2" });
    const countBefore = h.getWriteCount();
    h.state.agentsThrow = true;
    h.manager.tick(); // agents() fırlatıyor → reconcile atlanmalı
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", paneId: "p1" });
    expect(h.task().subtasks[1]).toMatchObject({ state: "running", paneId: "p2" });
    expect(h.getWriteCount()).toBe(countBefore);
  });

  it("promptAborted (oto): Enter gelmeyince alt görev ready + held + promptAborted", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(h.task().subtasks[0].state).toBe("running");
    expect(h.settlers).toHaveLength(1);
    h.settlers[0]("aborted");
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, paneId: null, note: "promptAborted" });
  });

  it("promptAborted eşzamanlı (oto): sendPrompt anında aborted bildirirse alt görev ready+held+promptAborted", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.state.promptAbortedSync = true;
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, paneId: null, note: "promptAborted" });
  });

  it("promptAborted (elle): Ajana ver sonrası Enter gelmeyince ready + held + promptAborted", () => {
    const h = harness();
    approvedTask(h, [draft("x"), draft("y")]);
    h.state.agents = [presence("p1", exact("idle"))]; // yalnız p1
    h.manager.tick(); // "x" p1'e gönderildi
    h.state.agents = [presence("p1", exact("running")), presence("p2", exact("idle"))];
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "y", paneId: "p2" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.task("id1").subtasks.find((s) => s.id === "y")!.state).toBe("running");
    const settler = h.settlers.at(-1)!;
    settler("aborted");
    expect(h.task("id1").subtasks.find((s) => s.id === "y")).toMatchObject({ state: "ready", held: true, paneId: null, note: "promptAborted" });
  });

  it("promptAborted eşzamanlı (elle): sendPrompt anında aborted bildirirse alt görev ready+held+promptAborted", () => {
    const h = harness();
    approvedTask(h, [draft("x"), draft("y")]);
    h.state.agents = [presence("p1", exact("idle")), presence("p2", exact("idle"))];
    h.manager.tick(); // "x" p1'e, "y" p2'ye oto
    // Elle atama için başka bir harness kuralım
    const h2 = harness();
    approvedTask(h2, [draft("a"), draft("b")]);
    h2.state.agents = [presence("p1", exact("idle"))];
    h2.manager.tick(); // "a" p1'e
    h2.state.agents = [presence("p1", exact("running")), presence("p2", exact("idle"))];
    h2.state.promptAbortedSync = true;
    expect(h2.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: true, taskId: "id1" });
    expect(h2.task("id1").subtasks.find((s) => s.id === "b")).toMatchObject({ state: "ready", held: true, paneId: null, note: "promptAborted" });
  });

  it("promptAborted (geri): Düzeltmeye geri gönder sonrası Enter gelmeyince ready + held + promptAborted", async () => {
    const h = harness();
    approvedTask(h);
    runToVerifying(h);
    h.verifies[0].resolve(proof(false));
    await flush();
    expect(h.task().subtasks[0].state).toBe("failed");
    h.state.agents = [presence("p1", exact("idle"))];
    expect(h.manager.command("w1", { type: "sendBack", taskId: "id1", subtaskId: "a" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", note: "sentBack" });
    const settler = h.settlers.at(-1)!;
    settler("aborted");
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, paneId: null, note: "promptAborted" });
  });

  it("promptAborted: aynı bölmeye yeni dispatchedAt ile yeniden gönderimde eski settler yok sayılıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick(); // "a" → running(p1), dispatchedAt: 1_000
    const oldSettler = h.settlers[0];
    // Ajan kapandı → ready + held
    h.state.agents = [];
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true });
    // Yeniden sıraya al; 2000'de p1 ile tekrar dağıt
    h.clock.ms = 2_000;
    h.manager.command("w1", { type: "requeue", taskId: "id1", subtaskId: "a" });
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick(); // "a" → running(p1), dispatchedAt: 2_000
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", paneId: "p1", dispatchedAt: 2_000 });
    // Eski settler: dispatchedAt 1000 ≠ 2000 → yok say
    oldSettler("aborted");
    expect(h.task().subtasks[0].state).toBe("running");
  });

  it("promptAborted: alt görev artık running değilse eski onSettled yok sayılıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick(); // "a" → running(p1), dispatchedAt: 1_000
    const oldSettler = h.settlers[0];
    // Ajan kapandı → "a" ready + held (agentClosed)
    h.state.agents = [];
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, note: "agentClosed" });
    // Eski settler ateşlenince (state artık running değil) durum bozulmuyor
    oldSettler("aborted");
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, note: "agentClosed" });
  });
});

describe("doğrulama ve kanıt", () => {
  it("kesin bitiş → doğrulama alan kökünde → yeşil → done; bağımlı ready; görev bitince bildirim", async () => {
    const h = harness();
    approvedTask(h, [draft("a"), draft("b", { dependsOn: ["a"] })]);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    h.state.agents = [presence("p1", exact("running"))];
    h.manager.tick();
    h.state.agents = [presence("p1", exact("idle", 2_000))];
    h.manager.tick();
    expect(h.task().subtasks[0].state).toBe("verifying");
    expect(h.verifies).toHaveLength(1);
    expect(h.verifies[0]).toMatchObject({ commands: ["npm test"], cwd: "C:\\kok" });
    h.verifies[0].resolve(proof(true));
    await flush();
    expect(h.task().subtasks.map((s) => s.state)).toEqual(["done", "ready"]);
    expect(h.logs).toContainEqual(["pano.dogrulama", { komut: 0, cikis: 0, sure: 40 }]);
    expect(h.notified).toEqual([]);
    h.clock.ms = 3_000;
    h.manager.tick();
    expect(h.prompts.at(-1)).toEqual(["p1", "[Gorev b] İstem b ikinci satır"]);
    h.state.agents = [presence("p1", exact("idle", 4_000))];
    h.manager.tick();
    h.verifies[1].resolve(proof(true));
    await flush();
    expect(h.task().state).toBe("done");
    expect(h.notified).toEqual([["taskDone", "w1", "İade akışı"]]);
  });

  it("kırmızı → failed + bildirim; kendiliğinden geri gönderme yok; Düzeltmeye geri gönder aynı ajana", async () => {
    const h = harness();
    approvedTask(h);
    runToVerifying(h);
    h.verifies[0].resolve(proof(false));
    await flush();
    expect(h.task().subtasks[0]).toMatchObject({ state: "failed", paneId: "p1" });
    expect(h.task().state).toBe("stuck");
    expect(h.notified).toEqual([["subtaskFailed", "w1", "İade akışı"]]);
    h.manager.tick();
    expect(h.prompts).toHaveLength(1);
    expect(h.manager.command("w1", { type: "sendBack", taskId: "id1", subtaskId: "a" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.prompts.at(-1)).toEqual(["p1", "[Gorev a] Doğrulama başarısız: npm test çıktısının sonu: FAIL x.test.ts Düzelt."]);
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", attempts: 2, note: "sentBack" });
    expect(h.logs).toContainEqual(["pano.dagitim", { altGorev: "a", bolme: "p1", yol: "geri" }]);
  });

  it("doğrulama komutu yoksa: verifying'de kalıyor; Doğrula noVerify; Onayla elle kanıt → done", () => {
    const h = harness({ verify: [] });
    approvedTask(h);
    runToVerifying(h);
    expect(h.task().subtasks[0].state).toBe("verifying");
    expect(h.verifies).toEqual([]);
    expect(h.manager.command("w1", { type: "verify", taskId: "id1", subtaskId: "a" })).toEqual({ ok: false, reason: "noVerify" });
    expect(h.manager.command("w1", { type: "approveManual", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.task().subtasks[0]).toMatchObject({ state: "done", proof: { kind: "manual", ok: true, commands: [] } });
  });

  it("komut varken elle onay reddediliyor; tahmini ajanda Doğrula elle başlatılıyor; çift Doğrula reddediliyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", { state: "idle", source: "estimated", lastActivity: null })];
    h.manager.tick();
    h.state.agents = [presence("p1", { state: "idle", source: "estimated", lastActivity: 5_000 })];
    h.manager.tick();
    expect(h.task().subtasks[0].state).toBe("running");
    expect(h.manager.command("w1", { type: "approveManual", taskId: "id1", subtaskId: "a" })).toEqual({ ok: false, reason: "hasVerify" });
    expect(h.manager.command("w1", { type: "verify", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.task().subtasks[0].state).toBe("verifying");
    expect(h.manager.command("w1", { type: "verify", taskId: "id1", subtaskId: "a" })).toEqual({ ok: false, reason: "badState" });
    expect(h.verifies).toHaveLength(1);
  });

  it("silinmiş göreve geç doğrulama sonucu yazılmıyor; silme doğrulamayı iptal ediyor", async () => {
    const h = harness();
    approvedTask(h);
    runToVerifying(h);
    h.manager.command("w1", { type: "deleteTask", taskId: "id1" });
    expect(h.verifies[0].cancel).toHaveBeenCalled();
    h.verifies[0].resolve(proof(true));
    await flush();
    expect(h.board().tasks).toEqual([]);
    expect(h.notified).toEqual([]);
  });
});

describe("kimlik, okunamayan pano, uyarı, budama", () => {
  it("geçersiz alan kimliği: get null, komut noBoard; okunamayan pano komutları reddediyor ve yazılmıyor", () => {
    const h = harness({ files: { w1: { tasks: [], unreadable: true } } });
    expect(h.manager.get("../x")).toBeNull();
    expect(h.manager.command("../x", { type: "createTask", title: "A", goal: "" })).toEqual({ ok: false, reason: "noBoard" });
    expect(h.board().unreadable).toBe(true);
    expect(h.manager.command("w1", { type: "createTask", title: "A", goal: "" })).toEqual({ ok: false, reason: "writeFailed" });
    expect(h.written.size).toBe(0);
  });

  it("kayıtlı olmayan alan: get null, createTask noBoard, diske yazılmıyor", () => {
    const h = harness();
    // harness workspace: (id) => id === "w1" ? info : null
    // "w-kayitsiz" geçerli boardId deseni ama config'te kayıtlı değil.
    expect(h.manager.get("w-kayitsiz")).toBeNull();
    expect(h.manager.command("w-kayitsiz", { type: "createTask", title: "A", goal: "" })).toEqual({ ok: false, reason: "noBoard" });
    expect(h.written.size).toBe(0); // diske yazılmadı
  });

  it("bozuk dosya uyarısı panoda; kapatılınca gidiyor", () => {
    const h = harness({ files: { w1: { tasks: [], recoveredFrom: "w1.json.bozuk-5" } } });
    expect(h.board().recoveredFrom).toBe("w1.json.bozuk-5");
    expect(h.manager.command("w1", { type: "dismissWarning" }).ok).toBe(true);
    expect(h.board().recoveredFrom).toBeUndefined();
  });

  it("budama: listede olmayan pano siliniyor; boş liste hiçbir şey silmiyor", () => {
    const h = harness({ files: { w1: { tasks: [] }, w2: { tasks: [] } } });
    h.manager.get("w2");
    h.manager.prune([]);
    expect(h.removed).toEqual([]);
    h.manager.prune(["w1"]);
    expect(h.removed).toEqual(["w2"]);
  });

  it("dispose sonrası tick ve command no-op", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.dispose();
    h.manager.tick();
    expect(h.prompts).toEqual([]);
    expect(h.manager.command("w1", { type: "createTask", title: "X", goal: "" })).toEqual({ ok: false, reason: "writeFailed" });
  });

  it("diskten yüklenen onaylı görev 'draft' değil 'running' durumunda görünüyor", () => {
    // readTask boardStore'da state: "draft" sabit yazıyor; withDerivedState türetiyor.
    // Harnes deposu dönüşüm yapmaz; yöneticinin load() fonksiyonu withDerivedState uygulamalı.
    const approvedRaw: BoardTask = {
      id: "t1",
      title: "İade",
      goal: "",
      state: "draft", // deponun ham hâli
      createdAt: 1,
      approvedAt: 2,
      subtasks: [{ id: "a", title: "A", prompt: "P", roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 0 }]
    };
    const h = harness({ files: { w1: { tasks: [approvedRaw] } } });
    expect(h.board().tasks[0].state).toBe("running");
  });
});

describe("boardNotificationFor", () => {
  it("odaktayken ya da ayar kapalıyken yok; başlık görev başlığı, gövde sabit", () => {
    expect(boardNotificationFor("taskDone", true, true, "İade")).toBeNull();
    expect(boardNotificationFor("taskDone", false, false, "İade")).toBeNull();
    expect(boardNotificationFor("taskDone", false, true, "İade")).toEqual({ title: "İade", body: "Görev bitti" });
    expect(boardNotificationFor("subtaskFailed", false, true, "  ", "en")).toEqual({ title: "NTT Studio", body: "Subtask failed" });
  });
});
