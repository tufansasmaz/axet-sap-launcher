// Ajan kartı, durum metni ve Kararlar listesi: saf yardımcılar (spec 2026-10-17 ajan-alani §4, §7).
import { describe, expect, it } from "vitest";
import { askingCount, cardStatus, decisionsOf, statusText, statusTone } from "../src/agents/agentView";
import { AGENT_ENGINE_MISSING, LEGACY_AXET_AGENT, type AgentQuestion, type AgentStatus } from "../app-electron/shared/agentTypes";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";

const pane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: LEGACY_AXET_AGENT,
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  ...over
});
const ws = (id: string, panes: TerminalPane[]): TerminalWorkspace => ({
  id,
  name: id,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
});
const q = (callId: string, askedAt: number, over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId,
  question: "?",
  header: "",
  options: ["A", "B"],
  multiSelect: false,
  askedAt,
  ...over
});
const asking = (question: AgentQuestion, source: AgentStatus["source"] = "exact"): AgentStatus => ({
  state: "asking",
  source,
  lastActivity: question.askedAt,
  question
});
const NOW = 10_000_000;

describe("statusText ve statusTone", () => {
  it("durum yoksa bilinmiyor; boşta süresi dakikayla", () => {
    expect(statusText(undefined, NOW)).toEqual({ key: "agents.stateUnknown" });
    expect(statusText({ state: "idle", source: "exact", lastActivity: NOW - 30_000 }, NOW)).toEqual({ key: "agents.stateIdle" });
    expect(statusText({ state: "idle", source: "exact", lastActivity: NOW - 3 * 60_000 }, NOW)).toEqual({
      key: "agents.stateIdleFor",
      params: { min: 3 }
    });
    expect(statusText({ state: "asking", source: "exact", lastActivity: 1 }, NOW)).toEqual({ key: "agents.stateAsking" });
  });

  it("renk tonları: çalışıyor yeşil, soru kehribar, hata kırmızı, öteki gri", () => {
    expect(statusTone("running")).toBe("success");
    expect(statusTone("asking")).toBe("warning");
    expect(statusTone("error")).toBe("danger");
    expect(statusTone("idle")).toBe("muted");
    expect(statusTone(undefined)).toBe("muted");
  });
});

describe("cardStatus", () => {
  it("bölme durumu önce gelir: sırada, başlatılıyor, kurulu değil, hata, kapandı", () => {
    expect(cardStatus(pane("a", { run: { state: "queued" } }), undefined, NOW)).toMatchObject({ key: "terminal.queued", tone: "muted" });
    expect(cardStatus(pane("a", { run: { state: "starting", token: 1 } }), undefined, NOW).key).toBe("terminal.starting");
    expect(cardStatus(pane("a", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), undefined, NOW)).toMatchObject({
      key: "agents.notInstalled",
      tone: "danger",
      restartable: true
    });
    expect(cardStatus(pane("a", { run: { state: "failed", message: "x" } }), undefined, NOW).key).toBe("agents.stateError");
    expect(cardStatus(pane("a", { run: { state: "exited", ptyId: "t", code: 0 } }), undefined, NOW)).toMatchObject({
      key: "agents.stateFinished",
      restartable: true
    });
  });

  it("çalışan bölmede izleyicinin durumu; tahmini işaretli; bitti yeniden başlatılabilir", () => {
    expect(cardStatus(pane("a"), { state: "running", source: "estimated", lastActivity: NOW }, NOW)).toEqual({
      key: "agents.stateRunning",
      tone: "success",
      estimated: true,
      restartable: false
    });
    expect(cardStatus(pane("a"), { state: "finished", source: "exact", lastActivity: NOW }, NOW)).toMatchObject({
      estimated: false,
      restartable: true
    });
    expect(cardStatus(pane("a"), undefined, NOW)).toMatchObject({ key: "agents.stateUnknown", estimated: true });
  });
});

describe("decisionsOf ve askingCount", () => {
  it("bütün alanların açık soruları, eskisi önce; listeden cevap yalnız kesin tek seçimlide", () => {
    const workspaces = [ws("w1", [pane("a"), pane("b")]), ws("w2", [pane("c")])];
    const statuses: Record<string, AgentStatus> = {
      a: asking(q("ca", 300)),
      b: asking(q("cb", 100, { multiSelect: true })),
      c: asking(q("cc", 200), "estimated")
    };
    const rows = decisionsOf(workspaces, statuses);
    expect(rows.map((r) => [r.paneId, r.workspaceId, r.answerable])).toEqual([
      ["b", "w1", false],
      ["c", "w2", false],
      ["a", "w1", LIST_ANSWER_ENABLED]
    ]);
  });

  it("kapanmış bölmenin eski sorusu ve kabuk bölmesi listeye girmiyor", () => {
    const workspaces = [
      ws("w1", [pane("a", { run: { state: "exited", ptyId: "t", code: 0 } }), pane("s", { kind: "cmd", agent: undefined })])
    ];
    const statuses = { a: asking(q("ca", 1)), s: asking(q("cs", 2)) };
    expect(decisionsOf(workspaces, statuses)).toEqual([]);
    expect(askingCount(workspaces[0], statuses)).toBe(0);
  });

  it("askingCount yalnız çalışan ajanların sorularını sayıyor", () => {
    const w = ws("w1", [pane("a"), pane("b"), pane("c")]);
    expect(askingCount(w, { a: asking(q("x", 1)), b: { state: "idle", source: "exact", lastActivity: 1 } })).toBe(1);
  });
});
