// Akış geçmişi (Tur 4): doğrulama, gizli süzgeci, dosya (yükle/yaz/temizle), birleştirme.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FLOW_HISTORY_MAX, parseFlowHistory, sanitizeFlowEvents } from "../app-electron/shared/flowHistory";
import { clearFlowHistory, loadFlowHistory, saveFlowHistory } from "../app-electron/main/flowHistoryStore";
import { appendFlow, mergeHistory, toStored, type FlowEvent } from "../src/agents/flowEvents";

const WS = "11111111-2222-3333-4444-555555555555";
const ev = (at: number, extra: Record<string, unknown> = {}) => ({ at, kind: "message", paneId: "p1", name: "Ayşe", detail: `m${at}`, ...extra });

describe("sanitizeFlowEvents", () => {
  it("geçersizleri atıyor, son N'i tutuyor, alanları kırpıyor", () => {
    const list = sanitizeFlowEvents([ev(1), { at: "x" }, ev(2, { kind: "bilinmez" }), ev(3, { reply: "r", exact: true }), null]);
    expect(list.map((e) => e.at)).toEqual([1, 3]);
    expect(list[1]).toMatchObject({ reply: "r", exact: true });
    expect(sanitizeFlowEvents(Array.from({ length: 10 }, (_, i) => ev(i + 1)), undefined, 4).map((e) => e.at)).toEqual([7, 8, 9, 10]);
    expect(sanitizeFlowEvents([ev(1, { detail: "x".repeat(5000) })])[0].detail).toHaveLength(2000);
    expect(parseFlowHistory("bozuk")).toEqual([]);
  });

  it("gizli süzgeci metin alanlarına uygulanıyor", () => {
    const list = sanitizeFlowEvents([ev(1, { detail: "token=abc" })], (t) => t.replace("abc", "«gizli»"));
    expect(list[0].detail).toBe("token=«gizli»");
  });
});

describe("flowHistoryStore", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("yaz → oku → temizle; geçersiz alan kimliği reddediliyor; JWT maskeleniyor", () => {
    dir = mkdtempSync(path.join(tmpdir(), "flow-"));
    const jwt = "eyJhbGciOi.eyJzdWIiOiIx.c2lnbmF0dXJl";
    expect(saveFlowHistory(dir, WS, [ev(1), ev(2, { detail: `anahtar ${jwt}` })])).toBe(true);
    expect(readFileSync(path.join(dir, `${WS}.json`), "utf-8")).not.toContain(jwt);
    const loaded = loadFlowHistory(dir, WS);
    expect(loaded.map((e) => e.at)).toEqual([1, 2]);
    expect(saveFlowHistory(dir, "../kacis", [ev(1)])).toBe(false);
    expect(clearFlowHistory(dir, WS)).toBe(true);
    expect(loadFlowHistory(dir, WS)).toEqual([]);
    writeFileSync(path.join(dir, `${WS}.json`), "{bozuk", "utf-8");
    expect(loadFlowHistory(dir, WS)).toEqual([]);
  });
});

describe("mergeHistory / toStored / alan başına sınır", () => {
  it("geçmiş oturum olaylarından önce, zamana göre; kimlikler yeniden", () => {
    let list: FlowEvent[] = appendFlow([], [{ at: 50, workspaceId: WS, kind: "started", paneId: "p1", name: "Ayşe", detail: "" }]);
    list = mergeHistory(list, WS, [ev(10) as never, ev(20) as never]);
    expect(list.map((e) => e.at)).toEqual([10, 20, 50]);
    expect(list.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(toStored(list, WS)).toHaveLength(3);
    expect(toStored(list, "baska")).toEqual([]);
  });

  it("sınır alan başına: bir alanın taşması ötekini silmiyor", () => {
    let list: FlowEvent[] = appendFlow([], [{ at: 1, workspaceId: "B", kind: "started", paneId: null, name: "", detail: "" }]);
    list = appendFlow(
      list,
      Array.from({ length: FLOW_HISTORY_MAX + 5 }, (_, i) => ({ at: i + 2, workspaceId: "A", kind: "started" as const, paneId: null, name: "", detail: "" }))
    );
    expect(list.filter((e) => e.workspaceId === "A")).toHaveLength(FLOW_HISTORY_MAX);
    expect(list.filter((e) => e.workspaceId === "B")).toHaveLength(1);
  });
});
