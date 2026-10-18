// Saf dağıtıcı (spec 2026-10-18 gorev-panosu §5, §6). Uygunluk 1–6, motor
// kapalıyken yazmama, yazma koruması, rol eşleşmesi, istem satırı.
import { describe, expect, it } from "vitest";
import {
  agentEligible,
  boardPrompt,
  busyPanes,
  foldRole,
  planDispatch,
  sendBackPrompt,
  toPromptLine,
  type AgentInfo
} from "../app-electron/shared/boardDispatch";
import type { BoardTask, Subtask } from "../app-electron/shared/boardTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const idleExact: AgentStatus = { state: "idle", source: "exact", lastActivity: 5_000 };
const agent = (paneId: string, over: Partial<AgentInfo> = {}): AgentInfo => ({
  paneId,
  workspaceId: "w1",
  role: "",
  status: idleExact,
  inputIdle: true,
  ...over
});
const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: id,
  prompt: `İstem ${id}`,
  roleHint: "",
  dependsOn: [],
  state: "ready",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (id: string, subtasks: Subtask[], createdAt = 1): BoardTask => ({
  id,
  title: id,
  goal: "",
  state: "running",
  createdAt,
  approvedAt: createdAt,
  subtasks
});

describe("agentEligible", () => {
  const none = new Set<string>();

  it("2: motor kapalı (finished) ya da durum yok → uygun değil", () => {
    expect(agentEligible(agent("p1", { status: { state: "finished", source: "exact", lastActivity: 1 } }), none, "auto")).toBe(false);
    expect(agentEligible(agent("p1", { status: { state: "finished", source: "estimated", lastActivity: 1 } }), none, "manual")).toBe(false);
    expect(agentEligible(agent("p1", { status: null }), none, "manual")).toBe(false);
  });

  it("3: çalışıyor / soru soruyor / hata → uygun değil; kesin boşta uygun", () => {
    for (const state of ["running", "asking", "error", "unknown"] as const) {
      expect(agentEligible(agent("p1", { status: { state, source: "exact", lastActivity: 1 } }), none, "manual")).toBe(false);
    }
    expect(agentEligible(agent("p1"), none, "auto")).toBe(true);
  });

  it("3: tahmini boşta yalnız elle uygun; başlangıçtaki 'boşta ≈' kendiliğinden de uygun", () => {
    const quiet = agent("p1", { status: { state: "idle", source: "estimated", lastActivity: 9_000 } });
    expect(agentEligible(quiet, none, "auto")).toBe(false);
    expect(agentEligible(quiet, none, "manual")).toBe(true);
    const fresh = agent("p1", { status: { state: "idle", source: "estimated", lastActivity: null } });
    expect(agentEligible(fresh, none, "auto")).toBe(true);
  });

  it("4: başka alt göreve atanmış ajan uygun değil", () => {
    expect(agentEligible(agent("p1"), new Set(["p1"]), "manual")).toBe(false);
  });

  it("5: kullanıcı o bölmede yazıyorsa uygun değil", () => {
    expect(agentEligible(agent("p1", { inputIdle: false }), none, "manual")).toBe(false);
  });
});

describe("busyPanes", () => {
  it("running/asking/verifying alt görevlerin ajanları; failed ve done meşgul sayılmıyor", () => {
    const t = task("t", [
      sub("a", { state: "running", paneId: "p1" }),
      sub("b", { state: "asking", paneId: "p2" }),
      sub("c", { state: "verifying", paneId: "p3" }),
      sub("d", { state: "failed", paneId: "p4" }),
      sub("e", { state: "done", paneId: "p5" })
    ]);
    expect([...busyPanes([t])].sort()).toEqual(["p1", "p2", "p3"]);
  });
});

describe("planDispatch", () => {
  it("bir turda bir ajana tek alt görev", () => {
    const out = planDispatch([task("t", [sub("a"), sub("b")])], "w1", [agent("p1")]);
    expect(out).toEqual([{ taskId: "t", subtaskId: "a", paneId: "p1" }]);
  });

  it("1: başka alandaki ajan seçilmiyor", () => {
    expect(planDispatch([task("t", [sub("a")])], "w1", [agent("p9", { workspaceId: "w2" })])).toEqual([]);
  });

  it("4: held, waiting ve onaysız görevin alt görevleri dağıtılmıyor; meşgul ajan atlanıyor", () => {
    const draft: BoardTask = { ...task("d", [sub("x")]), approvedAt: undefined, state: "awaitingApproval" };
    const busy = task("b", [sub("r", { state: "running", paneId: "p1" })]);
    const out = planDispatch([draft, busy, task("t", [sub("h", { held: true }), sub("w", { state: "waiting" })])], "w1", [agent("p1")]);
    expect(out).toEqual([]);
  });

  it("6: rol ipucu büyük/küçük harf ve Türkçe İ/ı duyarsız eşleşiyor; eşleşen yoksa herhangi biri", () => {
    const agents = [agent("p1", { role: "coder" }), agent("p2", { role: "İnceleme" })];
    expect(planDispatch([task("t", [sub("a", { roleHint: "inceleme" })])], "w1", agents)[0].paneId).toBe("p2");
    expect(planDispatch([task("t", [sub("a", { roleHint: "analist" })])], "w1", agents)[0].paneId).toBe("p1");
    expect(foldRole(" INTEGRATION ")).toBe(foldRole("integration"));
  });

  it("eski görev önce", () => {
    const out = planDispatch([task("yeni", [sub("y")], 20), task("eski", [sub("e")], 10)], "w1", [agent("p1")]);
    expect(out).toEqual([{ taskId: "eski", subtaskId: "e", paneId: "p1" }]);
  });

  it("motoru kapalı ajan uygun değil: hiçbir dağıtım üretilmiyor", () => {
    const shell = agent("p1", { status: { state: "finished", source: "estimated", lastActivity: 1 } });
    expect(planDispatch([task("t", [sub("a")])], "w1", [shell])).toEqual([]);
  });
});

describe("toPromptLine ve sendBackPrompt", () => {
  it("satır sonları ve denetim karakterleri boşluğa; tek satır, ≤ 4000", () => {
    expect(toPromptLine("  Birinci satır\r\nİkinci\tsatır\x1b[31m kırmızı\x03 \n")).toBe("Birinci satır İkinci satır [31m kırmızı");
    expect(toPromptLine("x".repeat(5000)).length).toBe(4000);
  });

  it("geri gönderme istemi: ilk kırmızı komut ve çıktının sonu, tek satır", () => {
    const text = sendBackPrompt({
      kind: "commands",
      ok: false,
      at: 1,
      commands: [
        { command: "npm run lint", exitCode: 0, durationMs: 1, tail: "temiz" },
        { command: "npm test", exitCode: 1, durationMs: 1, tail: "FAIL a.test.ts\n  beklenen 2" }
      ]
    })!;
    expect(text).toBe("Doğrulama başarısız: npm test çıktısının sonu: FAIL a.test.ts beklenen 2 Düzelt.");
    expect(text).not.toMatch(/[\r\n]/);
  });

  it("pano istemi nötr önekle başlıyor: ilk karakter ! / # @ olamaz; ≤ 4000", () => {
    for (const body of ["!rm -rf", "/exit", "#not", "@dosya", "  \n!del"]) {
      const line = boardPrompt("3f9c2a1b-7d", body);
      expect(line.startsWith("[Gorev 3f9c2a1b] ")).toBe(true);
    }
    expect(boardPrompt("3f9c2a1b-7d", "!rm -rf")).toBe("[Gorev 3f9c2a1b] !rm -rf");
    expect(boardPrompt("a", "x\r\ny")).toBe("[Gorev a] x y");
    expect(boardPrompt("_-", "x")).toBe("[Gorev 0] x");
    expect(boardPrompt("abc", "z".repeat(5000)).length).toBe(4000);
  });

  it("aynı cümleyle başlayan iki alt görevin istemleri eşleme penceresinde (80) ayrışıyor", () => {
    const common = "Bu depo bir Electron uygulamasıdır ve görev panosu modülünü içerir; lütfen ".repeat(3);
    const key = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 80);
    const a = boardPrompt("aaaa1111-x", `${common} model`);
    const b = boardPrompt("bbbb2222-x", `${common} test`);
    expect(key(a)).not.toBe(key(b));
  });

  it("geri gönderme istemi önekle birlikte 4000'e sığıyor ve sonu korunuyor", () => {
    const text = sendBackPrompt({ kind: "commands", ok: false, at: 1, commands: [{ command: "x", exitCode: 1, durationMs: 1, tail: "y".repeat(9000) }] })!;
    const line = boardPrompt("3f9c2a1b-7d", text);
    expect(line.length).toBeLessThanOrEqual(4000);
    expect(line.endsWith("Düzelt.")).toBe(true);
  });

  it("uzun çıktı 4000'e sığacak şekilde baştan kırpılıyor; kırmızı komut yoksa null", () => {
    const text = sendBackPrompt({ kind: "commands", ok: false, at: 1, commands: [{ command: "x", exitCode: null, durationMs: 1, tail: "y".repeat(9000), timedOut: true }] })!;
    expect(text.length).toBeLessThanOrEqual(4000);
    expect(text.endsWith("Düzelt.")).toBe(true);
    expect(sendBackPrompt({ kind: "manual", ok: true, at: 1, commands: [] })).toBeNull();
  });
});
