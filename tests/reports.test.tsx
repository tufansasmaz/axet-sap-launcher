// Raporlar ekranı (2026-10-19): SAF rapor derleme, süzme ve Markdown.
import { describe, expect, it } from "vitest";
import { buildReports, durationText, filterReports, nextSteps, reportMarkdown, sinceOf } from "../src/agents/reports";
import { translate } from "../src/i18n";
import type { TranslationKey } from "../src/i18n/tr";
import type { FlowEvent } from "../src/agents/flowEvents";
import type { Board, Subtask } from "../app-electron/shared/boardTypes";
import type { Checkpoint } from "../app-electron/shared/changesTypes";

const t = (key: TranslationKey, params?: Record<string, string | number>) => translate("tr", key, params);
const M = 60_000;

const sub = (id: string, over: Partial<Subtask>): Subtask => ({
  id,
  title: `İş ${id}`,
  prompt: "",
  roleHint: "",
  dependsOn: [],
  state: "done",
  paneId: "a",
  attempts: 1,
  ...over
});

const ok = (at: number) => ({ kind: "commands" as const, ok: true, at, commands: [{ command: "npm test", exitCode: 0, durationMs: 1200, tail: "" }] });

const board: Board = {
  workspaceId: "w1",
  tasks: [
    {
      id: "t1",
      title: "Sepet",
      goal: "",
      state: "running",
      createdAt: 0,
      subtasks: [
        sub("1", { proof: ok(30 * M), dispatchedAt: 12 * M }),
        sub("2", { state: "failed", paneId: "b", dispatchedAt: 40 * M, proof: { kind: "commands", ok: false, at: 50 * M, commands: [{ command: "npm test", exitCode: 1, durationMs: 1, tail: "" }] } }),
        sub("3", { state: "running" }),
        sub("4", { state: "done", paneId: null })
      ]
    }
  ]
};

const ev = (id: number, at: number, kind: FlowEvent["kind"], paneId: string | null, detail = "", reply?: string): FlowEvent => ({
  id,
  at,
  workspaceId: "w1",
  kind,
  paneId,
  name: paneId === "a" ? "Ayşe" : "Mehmet",
  detail,
  ...(reply ? { reply } : {})
});

const events: FlowEvent[] = [
  ev(1, 5 * M, "started", "a"),
  ev(2, 10 * M, "assigned", "a", "İş 1"),
  ev(3, 11 * M, "started", "a"),
  ev(4, 29 * M, "finished", "a", "", "Sepet eklendi, testler geçti."),
  ev(5, 30 * M, "verified", "a", "İş 1"),
  ev(6, 90 * M, "finished", "a", "", "başka iş")
];

const cp: Checkpoint = {
  id: "c1",
  workspaceId: "w1",
  tree: "x",
  createdAt: 10 * M,
  reason: "dispatch",
  paneId: "a",
  agentName: "Ayşe",
  subtaskId: "1",
  label: "İş 1",
  reviewed: "pending",
  stats: { files: 2, added: 14, deleted: 3 }
};

const nameOf = (paneId: string | null) => (paneId === "a" ? "Ayşe" : paneId === "b" ? "Mehmet" : "");

describe("buildReports", () => {
  const reports = buildReports(board, events, [cp], nameOf);
  it("yalnız biten/başarısız alt görevler, en yeni önce", () => {
    expect(reports.map((r) => r.subtask.id)).toEqual(["2", "1", "4"]);
  });
  it("süre ilk atamadan doğrulamaya; cevap aralıktaki son 'bitti' olayından; adımlar o aralıktan", () => {
    const r = reports.find((x) => x.subtask.id === "1")!;
    expect(r.startedAt).toBe(10 * M);
    expect(r.durationMs).toBe(20 * M);
    expect(r.reply).toBe("Sepet eklendi, testler geçti.");
    expect(r.steps.map((s) => s.id)).toEqual([2, 3, 4, 5]);
    expect(r.agent).toBe("Ayşe");
    expect(r.checkpoint?.id).toBe("c1");
    expect(r.outcome).toBe("verified");
  });
  it("atama olayı yoksa son gönderim anı; zaman hiç yoksa süre bilinmiyor", () => {
    const failed = reports.find((x) => x.subtask.id === "2")!;
    expect(failed.durationMs).toBe(10 * M);
    expect(failed.reply).toBeNull();
    const bare = reports.find((x) => x.subtask.id === "4")!;
    expect(bare.durationMs).toBeNull();
    expect(bare.steps).toEqual([]);
  });
});

describe("filterReports / sinceOf", () => {
  const reports = buildReports(board, events, [cp], nameOf);
  it("ajan, sonuç, tarih ve arama (başlık, görev, cevap, ajan; büyük/küçük harf duyarsız)", () => {
    expect(filterReports(reports, { agent: "b", outcome: "", since: 0, query: "" }).map((r) => r.subtask.id)).toEqual(["2"]);
    expect(filterReports(reports, { agent: "", outcome: "verified", since: 0, query: "" }).map((r) => r.subtask.id)).toEqual(["1"]);
    expect(filterReports(reports, { agent: "", outcome: "", since: 45 * M, query: "" }).map((r) => r.subtask.id)).toEqual(["2"]);
    expect(filterReports(reports, { agent: "", outcome: "", since: 0, query: "TESTLER" }).map((r) => r.subtask.id)).toEqual(["1"]);
    expect(filterReports(reports, { agent: "", outcome: "", since: 0, query: "sepet" })).toHaveLength(3);
  });
  it("sinceOf: tümü 0, bugün yerel gece yarısı, 7 gün", () => {
    const now = new Date(2026, 9, 19, 15).getTime();
    expect(sinceOf("all", now)).toBe(0);
    expect(sinceOf("today", now)).toBe(new Date(2026, 9, 19).getTime());
    expect(sinceOf("7d", now)).toBe(now - 7 * 24 * 60 * M);
  });
});

describe("durationText / nextSteps / reportMarkdown", () => {
  it("süre metni", () => {
    expect(durationText(null, t)).toBe("—");
    expect(durationText(20 * 1000, t)).toBe("<1 dk");
    expect(durationText(20 * M, t)).toBe("20 dk");
    expect(durationText(65 * M, t)).toBe("1 sa 5 dk");
  });
  it("sonraki iş: başarısız → incele/yeniden gönder; kanıtsız → doğrula; bekleyen kayıt → incele", () => {
    const reports = buildReports(board, events, [cp], nameOf);
    expect(nextSteps(reports.find((r) => r.subtask.id === "2")!)).toEqual(["reports.nextFailed"]);
    expect(nextSteps(reports.find((r) => r.subtask.id === "4")!)).toEqual(["reports.nextVerify"]);
    expect(nextSteps(reports.find((r) => r.subtask.id === "1")!)).toEqual(["reports.nextReview"]);
  });
  it("Markdown: başlık, künye, özet, doğrulama, adımlar, değişiklikler, sonraki iş", () => {
    const r = buildReports(board, events, [cp], nameOf).find((x) => x.subtask.id === "1")!;
    const md = reportMarkdown(r, t, "tr");
    expect(md).toMatch(/^# İş 1\n/);
    expect(md).toContain("- **Görev:** Sepet");
    expect(md).toContain("- **Ajan:** Ayşe");
    expect(md).toContain("- **Sonuç:** Doğrulandı");
    expect(md).toContain("- **Süre:** 20 dk");
    expect(md).toContain("Sepet eklendi, testler geçti.");
    expect(md).toContain("`npm test` → 0");
    expect(md).toContain("2 dosya, +14 / -3");
    expect(md).toContain("## Sonraki iş");
  });
});
