// Akış'ın saf mantığı (spec 2026-10-18 ajanlar-yeniden §2, §6): olay üretimi
// ve sınırı, `@` ayrıştırma, ekip şablonları, Raporlar satırları.
import { describe, expect, it } from "vitest";
import {
  FLOW_MAX,
  appendFlow,
  boardEvents,
  checkpointEvents,
  statusEvents,
  statusTransition,
  type FlowInput
} from "../src/agents/flowEvents";
import { matchAgents, mentionAt, removeMention } from "../src/agents/mention";
import { TEAM_TEMPLATES, templateAgents } from "../src/agents/teamTemplates";
import { reportRows } from "../src/board/boardDisplay";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { Board, Subtask } from "../app-electron/shared/boardTypes";
import type { ChangesState, Checkpoint } from "../app-electron/shared/changesTypes";

const st = (state: AgentStatus["state"]): AgentStatus => ({ state, source: "exact", lastActivity: null });

describe("statusTransition", () => {
  it("ilk görüş ve aynı durum olay değil", () => {
    expect(statusTransition(undefined, "running")).toBeNull();
    expect(statusTransition("running", "running")).toBeNull();
  });
  it("çalışmaya başladı / bitti / hata / soru", () => {
    expect(statusTransition("idle", "running")).toBe("started");
    expect(statusTransition("asking", "running")).toBe("started");
    expect(statusTransition("running", "idle")).toBe("finished");
    expect(statusTransition("running", "finished")).toBe("finished");
    expect(statusTransition("idle", "finished")).toBeNull();
    expect(statusTransition("running", "error")).toBe("error");
    expect(statusTransition("running", "asking")).toBe("asked");
    expect(statusTransition("idle", "unknown")).toBeNull();
  });
});

describe("statusEvents", () => {
  it("yalnız bilinen bölmeler; ad ve alan eklenir", () => {
    const panes = new Map([["p1", { workspaceId: "w1", name: "Ayşe" }]]);
    const out = statusEvents({ p1: st("idle"), p2: st("idle") }, { p1: st("running"), p2: st("running") }, panes, 5);
    expect(out).toEqual([{ at: 5, workspaceId: "w1", kind: "started", paneId: "p1", name: "Ayşe", detail: "" }]);
  });

  // Ajanlar-ux §3: akışta ajanın cevabı.
  it("bitti olayı son cevabı ve kaynağın kesinliğini taşıyor", () => {
    const panes = new Map([["p1", { workspaceId: "w1", name: "Ayşe" }]]);
    const out = statusEvents({ p1: st("running") }, { p1: { ...st("idle"), reply: "Rapor hazır." } }, panes, 5);
    expect(out).toEqual([{ at: 5, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "", exact: true, reply: "Rapor hazır." }]);
    const est = statusEvents({ p1: { ...st("running"), source: "estimated" } }, { p1: { ...st("idle"), source: "estimated" } }, panes, 6);
    expect(est).toEqual([{ at: 6, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "", exact: false }]);
  });

  it("boştayken yeni cevap (çalışıyor görülmeden biten kısa tur) bitti olayı; aynı cevap ya da ilk görüş değil", () => {
    const panes = new Map([["p1", { workspaceId: "w1", name: "Ayşe" }]]);
    const a = { ...st("idle"), reply: "bir" };
    const b = { ...st("idle"), reply: "iki" };
    expect(statusEvents({ p1: a }, { p1: b }, panes, 7)).toEqual([
      { at: 7, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "", exact: true, reply: "iki" }
    ]);
    expect(statusEvents({ p1: b }, { p1: b }, panes, 8)).toEqual([]);
    expect(statusEvents({}, { p1: b }, panes, 9)).toEqual([]);
  });
});

const sub = (id: string, state: Subtask["state"], over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: `Alt ${id}`,
  prompt: "p",
  roleHint: "",
  dependsOn: [],
  state,
  paneId: "p1",
  attempts: 0,
  ...over
});
const board = (subs: Subtask[]): Board => ({
  workspaceId: "w1",
  tasks: [{ id: "t", title: "T", goal: "", state: "running", createdAt: 1, approvedAt: 2, subtasks: subs }]
});

describe("boardEvents", () => {
  const nameOf = (id: string | null) => (id === "p1" ? "Ayşe" : "");
  it("ilk pano taban: olay yok", () => {
    expect(boardEvents(undefined, board([sub("a", "running")]), nameOf, 1)).toEqual([]);
  });
  it("atandı, doğrulandı, başarısız; soru↔çalışıyor atama sayılmaz", () => {
    const prev = board([sub("a", "ready"), sub("b", "verifying"), sub("c", "running"), sub("d", "asking")]);
    const next = board([sub("a", "running"), sub("b", "done"), sub("c", "failed"), sub("d", "running")]);
    expect(boardEvents(prev, next, nameOf, 9).map((e) => [e.kind, e.detail, e.name])).toEqual([
      ["assigned", "Alt a", "Ayşe"],
      ["verified", "Alt b", "Ayşe"],
      ["failed", "Alt c", "Ayşe"]
    ]);
  });
});

const cp = (id: string, over: Partial<Checkpoint> = {}): Checkpoint =>
  ({ id, workspaceId: "w1", tree: "x", createdAt: 1, reason: "prompt", paneId: "p1", agentName: "Ayşe", subtaskId: null, label: `L${id}`, reviewed: "pending", ...over }) as Checkpoint;
const changes = (ids: string[]): ChangesState => ({ workspaceId: "w1", repo: { kind: "ok" } as never, checkpoints: ids.map((i) => cp(i)), expired: [] });

describe("checkpointEvents", () => {
  it("ilk durum taban (oturumdan önceki kayıtlar); yeni kayıtlar olay", () => {
    expect(checkpointEvents(undefined, changes(["1"]), 1)).toEqual([]);
    // İlk görülen durumda oturum açıldıktan sonra yazılmış kayıt yine olay.
    expect(checkpointEvents(undefined, changes(["1"]), 1, 1).map((e) => e.detail)).toEqual(["L1"]);
    expect(checkpointEvents(undefined, changes(["1"]), 1, 2)).toEqual([]);
    expect(checkpointEvents(changes(["1"]), changes(["1", "2"]), 3)).toEqual([
      { at: 3, workspaceId: "w1", kind: "checkpoint", paneId: "p1", name: "Ayşe", detail: "L2" }
    ]);
  });
});

describe("appendFlow", () => {
  it("en yeni sonda; en çok FLOW_MAX; kimlikler artıyor", () => {
    const input: FlowInput = { at: 1, workspaceId: "w", kind: "started", paneId: null, name: "", detail: "" };
    let list = appendFlow([], [input, input]);
    expect(list.map((e) => e.id)).toEqual([1, 2]);
    list = appendFlow(list, Array.from({ length: FLOW_MAX }, () => input));
    expect(list).toHaveLength(FLOW_MAX);
    expect(list[0].id).toBe(3);
    expect(list[FLOW_MAX - 1].id).toBe(FLOW_MAX + 2);
    expect(appendFlow(list, [])).toBe(list);
  });
});

describe("mention", () => {
  it("imleçten önceki @ sözcüğü", () => {
    expect(mentionAt("@ay", 3)).toEqual({ start: 0, query: "ay" });
    expect(mentionAt("selam @", 7)).toEqual({ start: 6, query: "" });
    expect(mentionAt("e@posta", 7)).toBeNull();
    expect(mentionAt("@ay selam", 9)).toBeNull();
  });
  it("eşleşme: önce başlayan, sonra içeren; Türkçe küçük harf", () => {
    const list = [{ name: "Test" }, { name: "İnceleme" }, { name: "Geliştirici" }, { name: "Usta Testçi" }];
    expect(matchAgents(list, "te").map((a) => a.name)).toEqual(["Test", "Usta Testçi"]);
    expect(matchAgents(list, "inc").map((a) => a.name)).toEqual(["İnceleme"]);
    expect(matchAgents(list, "")).toHaveLength(4);
  });
  it("seçince @sözcük metinden çıkar", () => {
    expect(removeMention("@ay derle", { start: 0, query: "ay" })).toBe("derle");
    expect(removeMention("derle @ay", { start: 6, query: "ay" })).toBe("derle ");
  });
});

describe("ekip şablonları", () => {
  it("üç şablon: SAP geliştirme 3, Analiz 2, Destek 1 axet-code ajanı", () => {
    expect(TEAM_TEMPLATES.map((x) => [x.id, x.agents.length])).toEqual([
      ["sapDev", 3],
      ["analysis", 2],
      ["support", 1]
    ]);
    const t = (key: string) => key;
    const agents = templateAgents("sapDev", t as never, "C:\\axet");
    expect(agents.every((a) => a.spec.engine === "axet-code" && a.cwd === "C:\\axet")).toBe(true);
    expect(agents.map((a) => a.spec.role)).toEqual(["agents.roleLead", "agents.roleDeveloper", "agents.roleTest"]);
    // --agent ile başlatılmıyor: rol yalnız etiket (axet-code ajan listesi dışında).
    expect(agents.every((a) => a.spec.roleKind !== "axetAgent")).toBe(true);
    expect(new Set(agents.map((a) => a.color)).size).toBe(3);
  });
});

describe("reportRows", () => {
  it("biten, doğrulanan ve başarısız alt görevler; en yeni önce", () => {
    const b: Board = {
      workspaceId: "w1",
      tasks: [
        {
          id: "t",
          title: "T",
          goal: "",
          state: "running",
          createdAt: 1,
          approvedAt: 2,
          subtasks: [
            sub("a", "done", { proof: { kind: "commands", ok: true, at: 10, commands: [{ command: "npm test", exitCode: 0, durationMs: 5, tail: "" }] } }),
            sub("b", "failed", { proof: { kind: "commands", ok: false, at: 20, commands: [{ command: "npm test", exitCode: 1, durationMs: 5, tail: "" }] } }),
            sub("c", "running"),
            sub("d", "done", { proof: { kind: "manual", ok: true, at: 5, commands: [] } })
          ]
        }
      ]
    };
    const rows = reportRows(b);
    expect(rows.map((r) => [r.subtask.id, r.outcome, r.at])).toEqual([
      ["b", "failed", 20],
      ["a", "verified", 10],
      ["d", "manual", 5]
    ]);
    expect(rows[1].commands).toEqual({ passed: 1, total: 1 });
    expect(reportRows(undefined)).toEqual([]);
  });
});
