// Pano grafikleri (spec yok; kullanıcı isteği 2026-10-19): SAF toplama,
// aralık, kova ve oran yardımcıları.
import { describe, expect, it } from "vitest";
import {
  bucketIndex,
  changeSummary,
  eventHistogram,
  groupOf,
  occupancy,
  rangeSpec,
  ratio,
  seriesPerBucket,
  startOfToday,
  subtaskFunnel,
  timelines,
  topFiles,
  verifyRate
} from "../src/agents/dashboard";
import type { FlowEvent } from "../src/agents/flowEvents";
import type { Board, Subtask } from "../app-electron/shared/boardTypes";
import type { Checkpoint } from "../app-electron/shared/changesTypes";

const H = 3_600_000;
const M = 60_000;
const ev = (id: number, at: number, kind: FlowEvent["kind"], paneId: string | null = "a", name = "Ayşe"): FlowEvent => ({
  id,
  at,
  workspaceId: "w1",
  kind,
  paneId,
  name,
  detail: ""
});

describe("rangeSpec", () => {
  const now = new Date(2026, 9, 19, 14, 37).getTime();
  it("1s: 12 × 5 dk, sona hizalı, son kova şimdiyi içeriyor", () => {
    const r = rangeSpec("1h", now);
    expect(r.starts).toHaveLength(12);
    expect(r.bucketMs).toBe(5 * M);
    expect(r.to).toBeGreaterThan(now);
    expect(r.to - r.from).toBe(12 * 5 * M);
    expect(r.starts[0]).toBe(r.from);
  });
  it("24s: 24 × 1 saat; 7g: 7 gün yerel gece yarısına hizalı", () => {
    expect(rangeSpec("24h", now).starts).toHaveLength(24);
    const week = rangeSpec("7d", now);
    expect(week.starts).toHaveLength(7);
    expect(new Date(week.starts[6]).getHours()).toBe(0);
    expect(week.starts[6]).toBe(startOfToday(now));
    expect(week.to).toBe(new Date(2026, 9, 20).getTime());
  });
  it("bucketIndex: aralık dışı -1", () => {
    const r = rangeSpec("1h", now);
    expect(bucketIndex(r, r.from)).toBe(0);
    expect(bucketIndex(r, r.from - 1)).toBe(-1);
    expect(bucketIndex(r, r.to)).toBe(-1);
    expect(bucketIndex(r, r.to - 1)).toBe(11);
  });
});

describe("eventHistogram / seriesPerBucket", () => {
  const now = new Date(2026, 9, 19, 14, 0).getTime();
  const r = rangeSpec("24h", now);
  const events = [ev(1, now - 30 * M, "started"), ev(2, now - 20 * M, "finished"), ev(3, now - 10 * M, "error"), ev(4, now - 48 * H, "started")];
  it("tür grupları", () => {
    expect(groupOf("relay")).toBe("work");
    expect(groupOf("verified")).toBe("done");
    expect(groupOf("failed")).toBe("problem");
    expect(groupOf("checkpoint")).toBe("change");
    expect(groupOf("asked")).toBe("asked");
  });
  it("kova başına grup sayıları; aralık dışı sayılmıyor", () => {
    const h = eventHistogram(events, r);
    expect(h).toHaveLength(24);
    const total = h.reduce((s, b) => s + b.total, 0);
    expect(total).toBe(3);
    const last = h[bucketIndex(r, now - 30 * M)];
    expect(last.counts.work).toBe(1);
    expect(last.counts.done).toBe(1);
    expect(last.counts.problem).toBe(1);
  });
  it("seriesPerBucket süzgeçle", () => {
    const s = seriesPerBucket(events, r, (e) => e.kind === "started");
    expect(s.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("timelines / occupancy", () => {
  const now = 10 * H;
  const r = { key: "24h" as const, from: 0, to: 10 * H, bucketMs: H, starts: Array.from({ length: 10 }, (_, i) => i * H) };
  it("olaylardan aralıklar; aralıktan önceki son durum taşınıyor; son aralık şimdiye kadar", () => {
    const list = timelines([ev(1, -H, "started"), ev(2, 2 * H, "asked"), ev(3, 3 * H, "started"), ev(4, 5 * H, "finished"), ev(5, 7 * H, "error", "b", "Mehmet")], r, now);
    const a = list.find((l) => l.key === "a")!;
    expect(a.name).toBe("Ayşe");
    expect(a.segments).toEqual([
      { state: "running", start: 0, end: 2 * H },
      { state: "asking", start: 2 * H, end: 3 * H },
      { state: "running", start: 3 * H, end: 5 * H },
      { state: "idle", start: 5 * H, end: 10 * H }
    ]);
    const b = list.find((l) => l.key === "b")!;
    expect(b.segments).toEqual([{ state: "error", start: 7 * H, end: 10 * H }]);
  });
  it("durum olayı olmayan ajan (yalnız kayıt) şeritte yok", () => {
    expect(timelines([ev(1, H, "checkpoint")], r, now)).toEqual([]);
  });
  it("occupancy: kovada en az bir an o durumda olan ajan sayısı", () => {
    const list = timelines([ev(1, 0, "started"), ev(2, 90 * M, "finished"), ev(3, 30 * M, "started", "b", "B"), ev(4, 50 * M, "finished", "b", "B")], r, now);
    const s = occupancy(list, r, "running");
    expect(s[0]).toBe(2);
    expect(s[1]).toBe(1);
    expect(s[2]).toBe(0);
  });
});

const sub = (id: string, state: Subtask["state"], proof?: Subtask["proof"]): Subtask => ({
  id,
  title: id,
  prompt: "",
  roleHint: "",
  dependsOn: [],
  state,
  paneId: null,
  attempts: 1,
  ...(proof ? { proof } : {})
});

describe("subtaskFunnel / verifyRate / ratio", () => {
  const ok = { kind: "commands" as const, commands: [], ok: true, at: 1 };
  const bad = { kind: "commands" as const, commands: [], ok: false, at: 1 };
  const manual = { kind: "manual" as const, commands: [], ok: true, at: 1 };
  const board: Board = {
    workspaceId: "w1",
    tasks: [
      { id: "t1", title: "", goal: "", state: "running", createdAt: 1, subtasks: [sub("1", "done", ok), sub("2", "failed", bad), sub("3", "running")] },
      { id: "t2", title: "", goal: "", state: "draft", createdAt: 1, subtasks: [sub("4", "waiting")] },
      { id: "t3", title: "", goal: "", state: "done", createdAt: 1, subtasks: [sub("5", "done", manual)] }
    ]
  };
  it("taslak görevler sayılmıyor; durum sırası sabit", () => {
    const f = subtaskFunnel(board);
    expect(f.map((s) => s.state)).toEqual(["waiting", "ready", "running", "asking", "verifying", "done", "failed"]);
    expect(f.find((s) => s.state === "done")!.count).toBe(2);
    expect(f.find((s) => s.state === "waiting")!.count).toBe(0);
    expect(subtaskFunnel(null).every((s) => s.count === 0)).toBe(true);
  });
  it("doğrulama oranı yalnız komutlu kanıtlardan; elle onay ayrı", () => {
    expect(verifyRate(board)).toEqual({ passed: 1, failed: 1, manual: 1, rate: 0.5 });
    expect(verifyRate(null).rate).toBeNull();
  });
  it("ratio: payda 0 ise null", () => {
    expect(ratio(1, 4)).toBe(0.25);
    expect(ratio(0, 0)).toBeNull();
  });
});

const cp = (id: string, createdAt: number, reviewed: Checkpoint["reviewed"], stats?: Checkpoint["stats"]): Checkpoint => ({
  id,
  workspaceId: "w1",
  tree: "x",
  createdAt,
  reason: "prompt",
  paneId: null,
  agentName: null,
  subtaskId: null,
  label: "",
  reviewed,
  ...(stats ? { stats } : {})
});

describe("changeSummary / topFiles", () => {
  it("aralıktaki kayıtlar; süresi dolanlar dışarıda; istatistiksiz kayıt ayrı sayılıyor", () => {
    const s = changeSummary(
      [cp("1", 5, "pending", { files: 2, added: 10, deleted: 3 }), cp("2", 6, "accepted", { files: 1, added: 1, deleted: 0 }), cp("3", 7, "pending"), cp("4", 1, "pending", { files: 9, added: 9, deleted: 9 }), cp("5", 8, "reverted", { files: 1, added: 0, deleted: 4 })],
      ["5"],
      4,
      100
    );
    expect(s).toEqual({ checkpoints: 3, files: 3, added: 11, deleted: 3, pending: 2, accepted: 1, reverted: 0, withoutStats: 1 });
  });
  it("topFiles: yol başına toplam, büyükten küçüğe, sınırlı", () => {
    const top = topFiles(
      [
        [
          { path: "a.ts", status: "modified", added: 5, deleted: 1, binary: false },
          { path: "b.ts", status: "added", added: 1, deleted: 0, binary: false }
        ],
        [{ path: "a.ts", status: "modified", added: 2, deleted: 2, binary: false }]
      ],
      1
    );
    expect(top).toEqual([{ path: "a.ts", added: 7, deleted: 3, times: 2 }]);
  });
});
