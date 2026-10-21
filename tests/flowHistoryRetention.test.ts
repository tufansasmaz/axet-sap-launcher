// Akış geçmişi sınırı (2026-10-21): kalıcı kayıt zaman tabanlı (gün) + olay
// ve boyut tavanı; bellekteki görünür liste 500'de kalıyor, Pano/Raporlar
// diskten aralığa göre okuyor. Eski (version 1, ≤500 olay) dosyayla uyumlu.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FLOW_HISTORY_DAYS_DEFAULT,
  FLOW_HISTORY_MAX,
  FLOW_STORE_MAX,
  mergeStoredFlow,
  normalizeFlowHistoryDays
} from "../app-electron/shared/flowHistory";
import { loadFlowHistory, readFlowRange, saveFlowHistory } from "../app-electron/main/flowHistoryStore";
import { appendFlow, withHistory, type FlowEvent } from "../src/agents/flowEvents";

const WS = "11111111-2222-3333-4444-555555555555";
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 21, 12);
const ev = (at: number, extra: Record<string, unknown> = {}) => ({ at, kind: "message" as const, paneId: "p1", name: "Ayşe", detail: `m${at}`, ...extra });

describe("normalizeFlowHistoryDays", () => {
  it("yalnız 7/14/30; varsayılan 14", () => {
    expect(FLOW_HISTORY_DAYS_DEFAULT).toBe(14);
    expect([7, 14, 30].map(normalizeFlowHistoryDays)).toEqual([7, 14, 30]);
    expect([0, 5, "14", undefined, 31].map(normalizeFlowHistoryDays)).toEqual([14, 14, 14, 14, 14]);
  });
});

describe("mergeStoredFlow", () => {
  it("bellekten düşmüş eski olaylar diskte kalıyor; yeni pencere bellekteki listeyle değişiyor", () => {
    const disk = [ev(NOW - 5 * DAY), ev(NOW - 3 * DAY), ev(NOW - 2 * DAY, { kind: "started" })];
    const incoming = [ev(NOW - 2 * DAY, { kind: "finished" }), ev(NOW - DAY)];
    const out = mergeStoredFlow(disk, incoming, { now: NOW, days: 14 });
    expect(out.map((e) => [e.at, e.kind])).toEqual([
      [NOW - 5 * DAY, "message"],
      [NOW - 3 * DAY, "message"],
      [NOW - 2 * DAY, "finished"],
      [NOW - DAY, "message"]
    ]);
  });

  it("gün sınırından eski olay ve olay tavanını aşan baş atılıyor", () => {
    const disk = [ev(NOW - 20 * DAY), ev(NOW - 10 * DAY)];
    expect(mergeStoredFlow(disk, [ev(NOW)], { now: NOW, days: 14 }).map((e) => e.at)).toEqual([NOW - 10 * DAY, NOW]);
    expect(mergeStoredFlow(disk, [ev(NOW)], { now: NOW, days: 7 }).map((e) => e.at)).toEqual([NOW]);
    const many = Array.from({ length: 10 }, (_, i) => ev(NOW - 10 + i));
    expect(mergeStoredFlow(many, [], { now: NOW, days: 14, max: 4 }).map((e) => e.at)).toEqual([NOW - 4, NOW - 3, NOW - 2, NOW - 1]);
  });

  it("gün verilmezse yalnız tavan (geriye uyum)", () => {
    expect(mergeStoredFlow([ev(1)], [ev(2)], {}).map((e) => e.at)).toEqual([1, 2]);
  });
});

describe("flowHistoryStore: zaman tabanlı kayıt", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("500'den fazla olay diskte birikiyor; flow:load yalnız son 500'ü veriyor", () => {
    dir = mkdtempSync(path.join(tmpdir(), "flow-"));
    // Oturum boyunca bellek 500'de kayıyor: her kayıt son 500'ü gönderiyor.
    const all = Array.from({ length: 1200 }, (_, i) => ev(NOW - 1200 * 60_000 + i * 60_000));
    for (let end = 500; end <= 1200; end += 100) {
      expect(saveFlowHistory(dir, WS, all.slice(end - 500, end), { now: NOW, days: 14 })).toBe(true);
    }
    expect(loadFlowHistory(dir, WS)).toHaveLength(FLOW_HISTORY_MAX);
    expect(loadFlowHistory(dir, WS)[FLOW_HISTORY_MAX - 1].at).toBe(all[1199].at);
    const range = readFlowRange(dir, WS, 0);
    expect(range.events).toHaveLength(1200);
    expect(range.total).toBe(1200);
    expect(range.oldest).toBe(all[0].at);
    expect(range.full).toBe(false);
    expect(readFlowRange(dir, WS, all[1000].at).events).toHaveLength(200);
    expect(readFlowRange(dir, "../kacis", 0).events).toEqual([]);
  });

  it("eski biçim (version 1) okunuyor ve üzerine yazılırken kaybolmuyor", () => {
    dir = mkdtempSync(path.join(tmpdir(), "flow-"));
    const old = Array.from({ length: 500 }, (_, i) => ev(NOW - DAY + i));
    writeFileSync(path.join(dir, `${WS}.json`), JSON.stringify({ version: 1, events: old }), "utf-8");
    expect(loadFlowHistory(dir, WS)).toHaveLength(500);
    expect(saveFlowHistory(dir, WS, [...old.slice(100), ev(NOW)], { now: NOW, days: 14 })).toBe(true);
    expect(readFlowRange(dir, WS, 0).events).toHaveLength(501);
    expect(JSON.parse(readFileSync(path.join(dir, `${WS}.json`), "utf-8")).version).toBe(2);
  });

  it("dosya boyutu tavanı: en eskiler atılıyor, en yeniler kalıyor", () => {
    dir = mkdtempSync(path.join(tmpdir(), "flow-"));
    const big = Array.from({ length: 300 }, (_, i) => ev(NOW - 300 + i, { detail: "x".repeat(1500) }));
    expect(saveFlowHistory(dir, WS, big, { now: NOW, days: 14, maxBytes: 100_000 })).toBe(true);
    const size = readFileSync(path.join(dir, `${WS}.json`), "utf-8").length;
    expect(size).toBeLessThanOrEqual(100_000);
    const range = readFlowRange(dir, WS, 0);
    expect(range.events[range.events.length - 1].at).toBe(NOW - 1);
    expect(range.full).toBe(true);
    expect(FLOW_STORE_MAX).toBe(5000);
  });
});

describe("Ayarlar: Akış geçmişi süresi", () => {
  it("Ajanlar bölümünde kaydedilen ve aranabilen alan; tr/en etiketleri", async () => {
    const { SETTINGS_SECTIONS } = await import("../src/components/settings/settingsSections");
    const { tr } = await import("../src/i18n/tr");
    const { en } = await import("../src/i18n/en");
    const section = SETTINGS_SECTIONS.find((s) => s.id === "terminal")!;
    expect(section.fields).toContain("flowHistoryDays");
    expect(section.searchKeys).toContain("settingsModal.flowHistoryDaysLabel");
    for (const dict of [tr, en] as Record<string, string>[]) {
      expect(dict["settingsModal.flowHistoryDaysLabel"]).toBeTruthy();
      expect(dict["settingsModal.flowHistoryDaysHint"]).toBeTruthy();
      expect(dict["settingsModal.daysShort"]).toContain("{n}");
    }
  });
});

describe("withHistory (Pano/Raporlar)", () => {
  it("bellekteki listenin başından eski disk olayları önce; aralık dışı atılıyor; kimlikler çakışmıyor", () => {
    const live: FlowEvent[] = appendFlow([], [
      { at: NOW - DAY, workspaceId: WS, kind: "message", paneId: "p1", name: "Ayşe", detail: "a" },
      { at: NOW, workspaceId: "baska", kind: "message", paneId: "p2", name: "Ali", detail: "b" }
    ]);
    const stored = [ev(NOW - 9 * DAY), ev(NOW - 3 * DAY), ev(NOW - DAY, { detail: "eski kopya" })];
    const out = withHistory(live, WS, stored, NOW - 7 * DAY);
    expect(out.map((e) => [e.at, e.detail])).toEqual([
      [NOW - 3 * DAY, `m${NOW - 3 * DAY}`],
      [NOW - DAY, "a"]
    ]);
    expect(new Set(out.map((e) => e.id)).size).toBe(2);
    expect(out.every((e) => e.workspaceId === WS)).toBe(true);
  });
});
