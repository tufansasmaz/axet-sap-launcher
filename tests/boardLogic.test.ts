// Pano durum geçişleri (spec 2026-10-18 gorev-panosu §2, §4–§7). Saf.
import { describe, expect, it } from "vitest";
import {
  advanceDependencies,
  applyAgentStatuses,
  applyProof,
  approveTask,
  assignSubtask,
  deriveTaskState,
  graphError,
  manualProof,
  mapSubtask,
  requeueSubtask,
  restoreAfterRestart
} from "../app-electron/shared/boardLogic";
import type { BoardTask, Proof, Subtask } from "../app-electron/shared/boardTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: `Alt ${id}`,
  prompt: `İstem ${id}`,
  roleHint: "",
  dependsOn: [],
  state: "waiting",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id: "t1",
  title: "İade akışı",
  goal: "Ödeme modülüne iade akışı ekle",
  state: "draft",
  createdAt: 1,
  subtasks,
  ...over
});
const approved = (subtasks: Subtask[]) => task(subtasks, { approvedAt: 10, state: "running" });
const exact = (state: AgentStatus["state"], lastActivity: number | null = 5_000): AgentStatus => ({ state, source: "exact", lastActivity });
const estimated = (state: AgentStatus["state"], lastActivity: number | null = 5_000): AgentStatus => ({ state, source: "estimated", lastActivity });
const running = (over: Partial<Subtask> = {}) => sub("a", { state: "running", paneId: "p1", attempts: 1, dispatchedAt: 10_000, ...over });
const proof = (ok: boolean, timedOut = false): Proof => ({
  kind: "commands",
  commands: [{ command: "npm test", exitCode: ok ? 0 : timedOut ? null : 1, durationMs: 5, tail: "", ...(timedOut ? { timedOut: true } : {}) }],
  ok,
  at: 99
});

describe("deriveTaskState", () => {
  it("onaydan önce: alt görevsiz draft, alt görevli awaitingApproval, lider hatası stuck", () => {
    expect(deriveTaskState(task([]))).toBe("draft");
    expect(deriveTaskState(task([sub("a")]))).toBe("awaitingApproval");
    expect(deriveTaskState(task([], { leadError: "noJson" }))).toBe("stuck");
  });

  it("onaydan sonra: hepsi done → done; biri failed → stuck; yoksa running", () => {
    expect(deriveTaskState(approved([sub("a", { state: "done" }), sub("b", { state: "done" })]))).toBe("done");
    expect(deriveTaskState(approved([sub("a", { state: "done" }), sub("b", { state: "failed" })]))).toBe("stuck");
    expect(deriveTaskState(approved([sub("a", { state: "ready" }), sub("b", { state: "waiting" })]))).toBe("running");
    expect(deriveTaskState(approved([sub("a", { state: "verifying" })]))).toBe("running");
  });
});

describe("graphError", () => {
  it("geçersiz bağımlılık: olmayan id, kendine bağımlılık, tekrar eden id", () => {
    expect(graphError([sub("a", { dependsOn: ["x"] })])).toBe("badDependency");
    expect(graphError([sub("a", { dependsOn: ["a"] })])).toBe("badDependency");
    expect(graphError([sub("a"), sub("a")])).toBe("badDependency");
  });

  it("döngü bulunuyor, düz zincir geçiyor", () => {
    expect(graphError([sub("a", { dependsOn: ["b"] }), sub("b", { dependsOn: ["a"] })])).toBe("cycle");
    expect(graphError([sub("a"), sub("b", { dependsOn: ["a"] }), sub("c", { dependsOn: ["a", "b"] })])).toBeNull();
  });
});

describe("approveTask", () => {
  it("bağımlılığı olmayan ready, olan waiting; lider alanları siliniyor", () => {
    const t = task([sub("a"), sub("b", { dependsOn: ["a"] })], { leadError: "noJson", leadDetail: "x", leadRaw: "{", leadChangedFiles: true });
    const next = approveTask(t, 50)!;
    expect(next.approvedAt).toBe(50);
    expect(next.state).toBe("running");
    expect(next.subtasks.map((s) => s.state)).toEqual(["ready", "waiting"]);
    expect("leadError" in next || "leadRaw" in next || "leadDetail" in next || "leadChangedFiles" in next).toBe(false);
  });

  it("onaylanamaz: alt görev yok, boş istem, döngü, planlanıyor, zaten onaylı", () => {
    expect(approveTask(task([]), 1)).toBeNull();
    expect(approveTask(task([sub("a", { prompt: "  " })]), 1)).toBeNull();
    expect(approveTask(task([sub("a", { dependsOn: ["b"] }), sub("b", { dependsOn: ["a"] })]), 1)).toBeNull();
    expect(approveTask(task([sub("a")], { planning: true }), 1)).toBeNull();
    expect(approveTask(approved([sub("a")]), 1)).toBeNull();
  });
});

describe("advanceDependencies", () => {
  it("bağımlılıkların hepsi done olan waiting → ready; failed bağımlılık waiting kalıyor", () => {
    const t = approved([
      sub("a", { state: "done" }),
      sub("b", { state: "failed" }),
      sub("c", { dependsOn: ["a"] }),
      sub("d", { dependsOn: ["a", "b"] })
    ]);
    expect(advanceDependencies(t).subtasks.map((s) => s.state)).toEqual(["done", "failed", "ready", "waiting"]);
  });

  it("değişiklik yoksa aynı nesne; onaysız görevde dokunmuyor", () => {
    const t = approved([sub("a", { state: "ready" })]);
    expect(advanceDependencies(t)).toBe(t);
    const draft = task([sub("a", { state: "waiting" })]);
    expect(advanceDependencies(draft)).toBe(draft);
  });
});

describe("assignSubtask", () => {
  it("running, ajan, deneme sayısı, gönderim anı; held ve not siliniyor", () => {
    const next = assignSubtask(sub("a", { state: "ready", held: true, note: "restarted", attempts: 1, sawBusy: true }), "p9", 777);
    expect(next).toMatchObject({ state: "running", paneId: "p9", attempts: 2, dispatchedAt: 777, sawBusy: false });
    // Yeni deneme eski (kırmızı) kanıtı taşımıyor.
    expect(assignSubtask(sub("a", { state: "failed", paneId: "p9", attempts: 1, proof: proof(false) }), "p9", 778).proof).toBeUndefined();
    expect("held" in next || "note" in next).toBe(false);
  });
});

describe("applyAgentStatuses", () => {
  const apply = (s: Subtask, status: AgentStatus | null | "gone") => {
    const map = new Map<string, AgentStatus | null>();
    if (status !== "gone") map.set("p1", status);
    return applyAgentStatuses(approved([s]), map);
  };

  it("ajan soru soruyor → asking; cevaplanınca running; ikisinde de sawBusy", () => {
    const asked = apply(running(), exact("asking")).task.subtasks[0];
    expect(asked).toMatchObject({ state: "asking", sawBusy: true });
    expect(apply(asked, exact("running")).task.subtasks[0]).toMatchObject({ state: "running", sawBusy: true });
  });

  it("tahmini running sawBusy kurmuyor; sonraki kesin eski idle doğrulamayı erken başlatmıyor", () => {
    const t = approved([running()]);
    const echoed = applyAgentStatuses(t, new Map([["p1", estimated("running", 10_100)]]));
    expect(echoed.task).toBe(t);
    expect(echoed.task.subtasks[0].sawBusy).toBeUndefined();
    const later = apply(echoed.task.subtasks[0], exact("idle", 9_000)).task.subtasks[0];
    expect(later.state).toBe("running");
    expect(apply(running({ state: "asking" }), estimated("running")).task.subtasks[0]).toMatchObject({ state: "running" });
    expect(apply(running({ state: "asking" }), estimated("running")).task.subtasks[0].sawBusy).toBeUndefined();
  });

  it("kesin: çalıştığı görüldükten sonra idle → verifying ve doğrulama listesine giriyor", () => {
    const result = apply(running({ sawBusy: true }), exact("idle", 1_000));
    expect(result.task.subtasks[0].state).toBe("verifying");
    expect(result.toVerify).toEqual(["a"]);
  });

  it("kesin: çalışma görülmese de son etkinlik gönderimden sonraysa → verifying", () => {
    expect(apply(running(), exact("idle", 10_500)).task.subtasks[0].state).toBe("verifying");
  });

  it("kesin idle ama son etkinlik gönderimden eski: geçiş yok, aynı nesne", () => {
    const t = approved([running()]);
    const result = applyAgentStatuses(t, new Map([["p1", exact("idle", 9_000)]]));
    expect(result.task).toBe(t);
    expect(result.toVerify).toEqual([]);
  });

  it("tahmini boşta: çalışma görülmüş olsa da kendiliğinden doğrulamaya geçmiyor", () => {
    expect(apply(running({ sawBusy: true }), estimated("idle", 20_000)).task.subtasks[0].state).toBe("running");
  });

  it("kesin error → verifying, not agentError", () => {
    expect(apply(running({ sawBusy: true }), exact("error")).task.subtasks[0]).toMatchObject({ state: "verifying", note: "agentError" });
  });

  it("motor kapandı (finished) ya da kayıt yok → ready + held + agentClosed, ajan boşalıyor", () => {
    for (const status of [exact("finished"), estimated("finished"), "gone" as const]) {
      const s = apply(running({ state: "asking", sawBusy: true }), status).task.subtasks[0];
      expect(s).toMatchObject({ state: "ready", paneId: null, held: true, note: "agentClosed", sawBusy: false });
    }
  });

  it("kayıtlı ama durumu henüz yok: dokunmuyor", () => {
    const t = approved([running()]);
    expect(applyAgentStatuses(t, new Map([["p1", null]])).task).toBe(t);
  });
});

describe("applyProof, manualProof, requeueSubtask", () => {
  it("yeşil → done, kırmızı → failed; süre aşımı notu", () => {
    const v = sub("a", { state: "verifying", paneId: "p1" });
    expect(applyProof(v, proof(true)).state).toBe("done");
    expect(applyProof(v, proof(false))).toMatchObject({ state: "failed" });
    expect(applyProof(v, proof(false, true))).toMatchObject({ state: "failed", note: "timeout" });
  });

  it("verifying olmayan alt göreve kanıt yazılmıyor (geç gelen sonuç)", () => {
    const r = sub("a", { state: "ready" });
    expect(applyProof(r, proof(true))).toBe(r);
  });

  it("elle kanıt: manual, ok, komutsuz", () => {
    expect(manualProof(7)).toEqual({ kind: "manual", commands: [], ok: true, at: 7 });
  });

  it("yeniden sıraya al: held ready ve failed; ötekiler null", () => {
    expect(requeueSubtask(sub("a", { state: "ready", held: true, note: "agentClosed" }))).toMatchObject({ state: "ready", paneId: null });
    const f = requeueSubtask(sub("a", { state: "failed", paneId: "p1", note: "timeout" }))!;
    expect(f).toMatchObject({ state: "ready", paneId: null });
    expect("held" in f || "note" in f).toBe(false);
    expect(requeueSubtask(sub("a", { state: "ready" }))).toBeNull();
    expect(requeueSubtask(running())).toBeNull();
  });
});

describe("restoreAfterRestart ve mapSubtask", () => {
  it("yeniden başlatma: running/asking/verifying → ready + held + restarted; done dokunulmuyor; planning siliniyor", () => {
    const t = approved([
      running(),
      sub("b", { state: "asking", paneId: "p2" }),
      sub("c", { state: "verifying", paneId: "p3" }),
      sub("d", { state: "done", paneId: "p4" })
    ]);
    const next = restoreAfterRestart({ ...t, planning: true });
    expect(next.subtasks.map((s) => [s.state, s.held ?? false, s.note ?? null, s.paneId])).toEqual([
      ["ready", true, "restarted", null],
      ["ready", true, "restarted", null],
      ["ready", true, "restarted", null],
      ["done", false, null, "p4"]
    ]);
    expect("planning" in next).toBe(false);
  });

  it("mapSubtask: bulunamazsa ya da fn null dönerse null; değilse durum yeniden türetiliyor", () => {
    const t = approved([sub("a", { state: "verifying" })]);
    expect(mapSubtask(t, "x", (s) => s)).toBeNull();
    expect(mapSubtask(t, "a", () => null)).toBeNull();
    expect(mapSubtask(t, "a", (s) => ({ ...s, state: "done" }))!.state).toBe("done");
  });
});
