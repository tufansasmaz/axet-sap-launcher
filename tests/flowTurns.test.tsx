// Tur 6: Akış olay kuralları (tahmini kaynak yanlış "başladı/bitirdi" üretmiyor),
// görev başına tek kart, aşama metni ve uygulama içi bildirim kararı.
import { describe, expect, it } from "vitest";
import { appendFlow, statusEvents, statusTransition, type FlowInput } from "../src/agents/flowEvents";
import { phaseText } from "../src/agents/agentPhase";
import { noticePlan, noticeText, pickNotices } from "../src/agents/agentNotices";
import { translate } from "../src/i18n";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const panes = new Map([["p1", { workspaceId: "w1", name: "Ayşe" }]]);
const est = (state: AgentStatus["state"], over: Partial<AgentStatus> = {}): AgentStatus => ({ state, source: "estimated", lastActivity: 1, ...over });
const ex = (state: AgentStatus["state"], over: Partial<AgentStatus> = {}): AgentStatus => ({ state, source: "exact", lastActivity: 1, ...over });
const kinds = (out: FlowInput[]) => out.map((e) => e.kind);

describe("statusEvents — tahmini kaynak", () => {
  it("çıktı hareketiyle gelen çalışıyor/boşta olay DEĞİL (istem yok)", () => {
    expect(statusEvents({ p1: est("unknown") }, { p1: est("running") }, panes, 1)).toEqual([]);
    expect(statusEvents({ p1: est("running") }, { p1: est("idle") }, panes, 2)).toEqual([]);
    expect(statusEvents({ p1: est("idle") }, { p1: est("running") }, panes, 3)).toEqual([]);
  });

  it("istem + çıktı = başladı (tahmini), sakinleşme = bitti (tahmini), tur başına bir kez", () => {
    const started = statusEvents({ p1: est("running") }, { p1: est("running", { turn: { at: 10, done: false } }) }, panes, 11);
    expect(started).toEqual([{ at: 11, workspaceId: "w1", kind: "started", paneId: "p1", name: "Ayşe", detail: "", exact: false }]);
    const a = est("running", { turn: { at: 10, done: false } });
    const b = est("idle", { turn: { at: 10, done: true } });
    expect(statusEvents({ p1: a }, { p1: b }, panes, 30)).toEqual([{ at: 30, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "", exact: false }]);
    expect(statusEvents({ p1: b }, { p1: est("running", { turn: { at: 10, done: true } }) }, panes, 31)).toEqual([]);
  });

  it("bağ kurulamama sebebi bir 'bilgi' olayı; kesin motorsuz ajanda ilk turda", () => {
    expect(kinds(statusEvents({ p1: est("running") }, { p1: est("running", { link: "notFound" }) }, panes, 1))).toEqual(["note"]);
    const out = statusEvents({ p1: est("idle", { link: "unsupported" }) }, { p1: est("running", { link: "unsupported", turn: { at: 5, done: false } }) }, panes, 6);
    expect(kinds(out)).toEqual(["started", "note"]);
    expect(out[1].detail).toBe("unsupported");
  });
});

describe("statusEvents — kesin kaynak", () => {
  it("kesin geçişler olay; sorudan çalışmaya dönüş yeni 'başladı' değil", () => {
    expect(statusTransition("asking", "running")).toBeNull();
    expect(kinds(statusEvents({ p1: ex("idle") }, { p1: ex("running") }, panes, 1))).toEqual(["started"]);
    expect(kinds(statusEvents({ p1: ex("running") }, { p1: ex("error") }, panes, 2))).toEqual(["error"]);
    expect(kinds(statusEvents({ p1: ex("asking") }, { p1: ex("running") }, panes, 3))).toEqual([]);
  });

  it("tahmini turdan kesine geçiş ikinci 'başladı' üretmiyor", () => {
    expect(statusEvents({ p1: est("running", { turn: { at: 1, done: false } }) }, { p1: ex("running") }, panes, 2)).toEqual([]);
  });
});

describe("appendFlow — görev başına tek kart", () => {
  it("bitti/hata aynı ajanın açık 'başladı' kartının yerine geçiyor ve sona taşınıyor", () => {
    const base = appendFlow([], [
      { at: 1, workspaceId: "w1", kind: "message", paneId: "p1", name: "Ayşe", detail: "yaz" },
      { at: 2, workspaceId: "w1", kind: "started", paneId: "p1", name: "Ayşe", detail: "", exact: true },
      { at: 3, workspaceId: "w1", kind: "asked", paneId: "p1", name: "Ayşe", detail: "" }
    ]);
    const next = appendFlow(base, [{ at: 9, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "", exact: true, reply: "Bitti." }]);
    expect(next.map((e) => e.kind)).toEqual(["message", "asked", "finished"]);
    expect(next[2]).toMatchObject({ reply: "Bitti.", startedAt: 2 });
  });

  it("başka ajanın kartına ya da kapanmış tura dokunmuyor", () => {
    const base = appendFlow([], [
      { at: 1, workspaceId: "w1", kind: "started", paneId: "p2", name: "Ali", detail: "" },
      { at: 2, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "" }
    ]);
    const next = appendFlow(base, [{ at: 3, workspaceId: "w1", kind: "error", paneId: "p1", name: "Ayşe", detail: "" }]);
    expect(next.map((e) => e.kind)).toEqual(["started", "finished", "error"]);
  });
});

describe("aşama metni", () => {
  const t = ((key: string, params?: Record<string, string | number>) => translate("tr", key as never, params as never)) as never;
  it("düşünüyor / araç / yazıyor", () => {
    expect(phaseText({ kind: "thinking" }, t)).toBe("düşünüyor");
    expect(phaseText({ kind: "writing" }, t)).toBe("cevap yazıyor");
    expect(phaseText({ kind: "tool", tool: "view", target: "x.ts" }, t)).toBe("dosya okuyor: x.ts");
    expect(phaseText({ kind: "tool", tool: "bash", target: "npm test" }, t, false)).toBe("komut çalıştırıyor");
    expect(phaseText({ kind: "tool", tool: "mcp:search" }, t)).toBe("araç çalıştırıyor: mcp:search");
  });
});

describe("uygulama içi bildirim", () => {
  const ev = (kind: FlowInput["kind"], at = 5, over: Partial<FlowInput> = {}): FlowInput => ({ at, workspaceId: "w1", kind, paneId: "p1", name: "Ayşe", detail: "", ...over });

  it("yalnız soru/bitti/hata; aynı olay için tek bildirim", () => {
    const seen = new Set<string>();
    const first = pickNotices([ev("asked"), ev("started"), ev("message"), ev("finished", 6, { exact: true }), ev("error", 7)], seen);
    expect(first.map((n) => n.kind)).toEqual(["asked", "finished", "error"]);
    expect(pickNotices([ev("asked"), ev("finished", 6, { exact: true })], seen)).toEqual([]);
  });

  it("ekip görünürken kısa toast ve okunmamış yok; başka ekranda uzun toast + okunmamış; kapalıysa hiçbiri", () => {
    const [n] = pickNotices([ev("finished", 6, { exact: true })], new Set());
    expect(noticePlan(n, { enabled: true, agentsVisible: true, activeWorkspaceId: "w1" })).toEqual({ toast: true, short: true, unread: false });
    expect(noticePlan(n, { enabled: true, agentsVisible: true, activeWorkspaceId: "w2" })).toEqual({ toast: true, short: false, unread: true });
    expect(noticePlan(n, { enabled: true, agentsVisible: false, activeWorkspaceId: "w1" })).toEqual({ toast: true, short: false, unread: true });
    expect(noticePlan(n, { enabled: false, agentsVisible: false, activeWorkspaceId: "w1" })).toEqual({ toast: false, short: false, unread: false });
  });

  it("metin: tahmini bitiş işaretli", () => {
    const t = ((key: string, params?: Record<string, string | number>) => translate("tr", key as never, params as never)) as never;
    const [exact] = pickNotices([ev("finished", 6, { exact: true })], new Set());
    const [guess] = pickNotices([ev("finished", 6, { exact: false })], new Set());
    expect(noticeText(exact, t)).toBe("Ayşe işini bitirdi");
    expect(noticeText(guess, t)).toBe("Ayşe işini bitirmiş görünüyor (tahmini)");
  });
});

describe("statusEvents — Tur 11: tahmini cevap", () => {
  it("tahmini bitişte ekrandan okunan cevap karta taşınıyor (≈ kalıyor)", () => {
    const a = est("running", { turn: { at: 10, done: false } });
    const b = est("idle", { turn: { at: 10, done: true }, reply: "Dosya hazır." });
    expect(statusEvents({ p1: a }, { p1: b }, panes, 30)).toEqual([
      { at: 30, workspaceId: "w1", kind: "finished", paneId: "p1", name: "Ayşe", detail: "", exact: false, reply: "Dosya hazır." }
    ]);
  });
});
