// Tur 9: Akış hata kartı ve bildirimi — sınıf, ayrıntı, deneme; otomatik deneme
// sürerken bildirim yok; kesinleşen hata tek bildirim.
import { describe, expect, it } from "vitest";
import { statusEvents, type FlowInput } from "../src/agents/flowEvents";
import { noticeText, pickNotices } from "../src/agents/agentNotices";
import { errorCard, retrySecondsLeft } from "../src/agents/flowText";
import { flowErrorDetail } from "../app-electron/shared/agentErrors";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";

const panes = new Map([["p1", { workspaceId: "w1", name: "Ali" }]]);
const t = (key: string, vars?: Record<string, string | number>) => {
  let s = (tr as Record<string, string>)[key] ?? key;
  for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, String(v));
  return s;
};
const running: AgentStatus = { state: "running", source: "exact", lastActivity: 10 };
const err = (over: Partial<AgentStatus> = {}): AgentStatus => ({
  state: "error",
  source: "exact",
  lastActivity: 20,
  detail: "error",
  error: { cls: "rateLimit", detail: "429 Too Many Requests", source: "exact" },
  attempts: 0,
  maxAttempts: 3,
  ...over
});

describe("statusEvents hata olayı", () => {
  it("sınıf/ayrıntı/deneme detail'de; geri sayım varken retrying", () => {
    const [e] = statusEvents({ p1: running }, { p1: err({ retry: { attempt: 1, max: 3, at: 99 } }) }, panes, 1);
    expect(e).toMatchObject({ kind: "error", retrying: true, exact: true });
    expect(errorCard(e.detail)).toMatchObject({ cls: "rateLimit", detail: "429 Too Many Requests" });
  });
  it("hızlı ikinci hata (error→error, yeni an) yeni olay", () => {
    const out = statusEvents({ p1: err() }, { p1: err({ lastActivity: 30, attempts: 3, retryBlocked: "exhausted" }) }, panes, 1);
    expect(out).toHaveLength(1);
    expect(errorCard(out[0].detail)).toMatchObject({ attempts: 3, max: 3 });
    expect(out[0].retrying).toBeUndefined();
  });
  it("motor hata yazıp kapandı (bitti + hata): bitti değil hata olayı, tahmini", () => {
    const idle: AgentStatus = { state: "idle", source: "estimated", lastActivity: null };
    const out = statusEvents({ p1: idle }, { p1: { state: "finished", source: "estimated", lastActivity: 5, error: { cls: "model", detail: "x", source: "estimated" } } }, panes, 1);
    expect(out).toEqual([expect.objectContaining({ kind: "error", exact: false })]);
  });
  it("tahmini motorun terminal hatası olay üretir (bir kez)", () => {
    const before: AgentStatus = { state: "running", source: "estimated", lastActivity: 1, turn: { at: 1, done: false } };
    const next: AgentStatus = { state: "error", source: "estimated", lastActivity: 2, turn: { at: 1, done: true }, error: { cls: "unavailable", detail: "API Error: 529", source: "estimated" } };
    const out = statusEvents({ p1: before }, { p1: next }, panes, 1);
    expect(out).toEqual([expect.objectContaining({ kind: "error", exact: false })]);
    expect(statusEvents({ p1: next }, { p1: next }, panes, 2)).toEqual([]);
  });
});

describe("hata bildirimi", () => {
  it("otomatik deneme sürerken bildirim yok; kesinleşince tek", () => {
    const seen = new Set<string>();
    const pending: FlowInput = { at: 1, workspaceId: "w1", kind: "error", paneId: "p1", name: "Ali", detail: flowErrorDetail({ cls: "rateLimit", detail: "x" }), retrying: true };
    expect(pickNotices([pending], seen)).toEqual([]);
    const final: FlowInput = { ...pending, at: 2, retrying: undefined, detail: flowErrorDetail({ cls: "rateLimit", attempts: 3, max: 3, detail: "x" }) };
    const notices = pickNotices([final], seen);
    expect(notices).toHaveLength(1);
    expect(pickNotices([final], seen)).toEqual([]);
    expect(noticeText(notices[0], t as never)).toBe("Ali hata verdi: istek sınırı (3/3 deneme)");
  });
});

describe("kart metni", () => {
  it("kalıcı sınıflarda ne yapılacağı; geçicide yok", () => {
    expect(errorCard(flowErrorDetail({ cls: "model", detail: "x" }))?.hint).toBe("agents.errorHint.model");
    expect(errorCard(flowErrorDetail({ cls: "auth", detail: "x" }))?.hint).toBe("agents.errorHint.auth");
    expect(errorCard(flowErrorDetail({ cls: "rateLimit", detail: "x" }))?.hint).toBeUndefined();
    expect(errorCard("eski kayıt")).toBeNull();
  });
  it("geri sayım saniyesi", () => {
    expect(retrySecondsLeft({ attempt: 1, max: 3, at: 10_500 }, 1_000)).toBe(10);
    expect(retrySecondsLeft({ attempt: 1, max: 3, at: 500 }, 1_000)).toBe(0);
  });
  it("tr/en: her sınıf ve kalıcı ipucu anahtarı var", () => {
    for (const cls of ["unavailable", "rateLimit", "network", "auth", "model", "context", "history", "policy", "unknown"]) {
      expect((tr as Record<string, string>)[`agents.errorClass.${cls}`]).toBeTruthy();
      expect((en as Record<string, string>)[`agents.errorClass.${cls}`]).toBeTruthy();
    }
    for (const cls of ["auth", "model", "context", "history", "policy"]) {
      expect((tr as Record<string, string>)[`agents.errorHint.${cls}`]).toBeTruthy();
      expect((en as Record<string, string>)[`agents.errorHint.${cls}`]).toBeTruthy();
    }
  });
});
