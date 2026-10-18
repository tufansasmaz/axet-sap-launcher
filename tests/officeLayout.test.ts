// Ofis görünümünün saf mantığı (spec 2026-10-18 ofis-gorunumu §3, §4, §7):
// durum→poz eşlemesi (kesin/tahmini ayrımı, bilinmiyor), metin kırpma. Kat planı: officeFloor.
import { describe, expect, it } from "vitest";
import {
  AGENT_ENGINE_MISSING,
  type AgentQuestion,
  type AgentState,
  type AgentStatus,
  type AgentStatusSource
} from "../app-electron/shared/agentTypes";
import type { PaneRun, TerminalPane } from "../src/stores/terminalTypes";
import { OFFICE_MAX_SEATS, OFFICE_QUESTION_MAX, clipText, officeSeat } from "../src/office/officeLayout";

const RUN: PaneRun = { state: "running", ptyId: "t1" };
const pane = (run: PaneRun = RUN): TerminalPane => ({
  id: "p1",
  kind: "agent",
  agent: { engine: "axet-code", role: "coder", roleKind: "custom" },
  cwd: "C:\\a",
  run
});
const st = (state: AgentState, source: AgentStatusSource = "exact", over: Partial<AgentStatus> = {}): AgentStatus => ({
  state,
  source,
  lastActivity: null,
  ...over
});
const q = (question: string, header = "Başlık"): AgentQuestion => ({
  callId: "c1",
  question,
  header,
  options: ["Evet", "Hayır"],
  multiSelect: false,
  askedAt: 1
});
const NOW = 10_000_000;

describe("OFFICE_MAX_SEATS", () => {
  it("alan sınırı bölme sınırıyla aynı (ızgara yerini kat planına bıraktı: officeFloor)", () => {
    expect(OFFICE_MAX_SEATS).toBe(9);
  });
});

describe("clipText", () => {
  it("sınırda dokunmuyor; aşınca sınır uzunluğunda … ile bitiyor", () => {
    expect(clipText("a".repeat(60), 60)).toBe("a".repeat(60));
    const clipped = clipText("a".repeat(61), 60);
    expect(Array.from(clipped)).toHaveLength(60);
    expect(clipped.endsWith("…")).toBe(true);
  });

  it("satır sonu ve fazla boşluk tek boşluk; kırpmadan önce sondaki boşluk atılıyor", () => {
    expect(clipText("  Bir\n\nsoru\t var  ", 60)).toBe("Bir soru var");
    expect(clipText("abc def", 5)).toBe("abc…");
    expect(clipText("", 10)).toBe("");
  });

  it("vekil çiftleri (emoji) bölünmüyor", () => {
    const text = "😀".repeat(5);
    expect(clipText(text, 5)).toBe(text);
    expect(clipText(text, 3)).toBe("😀😀…");
  });
});

describe("officeSeat", () => {
  it("kesin running: yazıyor, hareket var, ≈ yok", () => {
    expect(officeSeat(pane(), st("running"), NOW)).toEqual({
      pose: "typing",
      motion: true,
      estimated: false,
      question: null,
      tone: "success",
      key: "agents.stateRunning"
    });
  });

  it("tahmini running: aynı poz, hareket YOK, ≈", () => {
    expect(officeSeat(pane(), st("running", "estimated"), NOW)).toMatchObject({ pose: "typing", motion: false, estimated: true });
  });

  it("hareket yalnız kesin running'de (bütün durum × kaynak)", () => {
    const states: AgentState[] = ["running", "idle", "asking", "finished", "error", "unknown"];
    for (const state of states) {
      for (const source of ["exact", "estimated"] as const) {
        expect(officeSeat(pane(), st(state, source), NOW).motion, `${state}/${source}`).toBe(state === "running" && source === "exact");
      }
    }
  });

  it("kesin asking: soru metni ilk 60 karakter; metin boşsa başlık", () => {
    const long = "Bu tabloya yeni bir alan eklensin mi, yoksa mevcut yapı mı korunsun, karar ver lütfen";
    const seat = officeSeat(pane(), st("asking", "exact", { question: q(long) }), NOW);
    expect(seat).toMatchObject({ pose: "asking", tone: "warning", estimated: false, key: "agents.stateAsking" });
    // Kesim noktası bir boşluğa denk geldiğinde boşluk atılıyor; sınır üst sınırdır.
    expect(Array.from(seat.question ?? "").length).toBeLessThanOrEqual(OFFICE_QUESTION_MAX);
    expect(Array.from(seat.question ?? "").length).toBeGreaterThan(OFFICE_QUESTION_MAX - 5);
    expect(seat.question?.endsWith("…")).toBe(true);
    expect(long.startsWith((seat.question ?? "").slice(0, -1))).toBe(true);
    expect(officeSeat(pane(), st("asking", "exact", { question: q("  ", "Onay") }), NOW).question).toBe("Onay");
  });

  it("tahmini asking ya da sorusuz asking: balon pozu var, metin yok", () => {
    expect(officeSeat(pane(), st("asking", "estimated", { question: q("Gizli mi?") }), NOW)).toMatchObject({ pose: "asking", question: null, estimated: true });
    expect(officeSeat(pane(), st("asking"), NOW)).toMatchObject({ pose: "asking", question: null });
  });

  it("idle ve finished: dinleniyor; boşta süresi metinde", () => {
    expect(officeSeat(pane(), st("idle", "exact", { lastActivity: NOW - 3 * 60_000 }), NOW)).toMatchObject({
      pose: "resting",
      motion: false,
      key: "agents.stateIdleFor",
      params: { min: 3 }
    });
    expect(officeSeat(pane(), st("finished"), NOW)).toMatchObject({ pose: "resting", key: "agents.stateFinished" });
  });

  it("error: hata pozu, tehlike tonu", () => {
    expect(officeSeat(pane(), st("error"), NOW)).toMatchObject({ pose: "error", tone: "danger", key: "agents.stateError" });
  });

  it("kayıt yok: bilinmiyor, ≈ YOK; kayıt unknown ve tahmini: bilinmiyor, ≈", () => {
    expect(officeSeat(pane(), undefined, NOW)).toEqual({
      pose: "unknown",
      motion: false,
      estimated: false,
      question: null,
      tone: "muted",
      key: "agents.stateUnknown"
    });
    expect(officeSeat(pane(), st("unknown", "estimated"), NOW)).toMatchObject({ pose: "unknown", estimated: true });
  });

  it("motor kurulu değil: boş masa", () => {
    expect(officeSeat(pane({ state: "failed", message: AGENT_ENGINE_MISSING }), undefined, NOW)).toMatchObject({
      pose: "absent",
      key: "agents.notInstalled",
      tone: "danger",
      estimated: false
    });
  });

  it("bölmenin hâli izleyiciden önce gelir: başlatma hatası, klasör yok, sırada, başlatılıyor", () => {
    expect(officeSeat(pane({ state: "failed", message: "spawn ENOENT" }), st("running"), NOW)).toMatchObject({ pose: "error", motion: false, key: "agents.stateError" });
    expect(officeSeat(pane({ state: "missingDir" }), st("running"), NOW)).toMatchObject({ pose: "error", motion: false });
    expect(officeSeat(pane({ state: "queued" }), st("running"), NOW)).toMatchObject({ pose: "unknown", motion: false, key: "terminal.queued" });
    expect(officeSeat(pane({ state: "starting", token: 1 }), st("running"), NOW)).toMatchObject({ pose: "unknown", motion: false, key: "terminal.starting" });
  });

  it("bayat asking: süreç bitmiş bölmede balon yok, dinleniyor, 'Bitti'", () => {
    const seat = officeSeat(pane({ state: "exited", ptyId: "t1", code: 0 }), st("asking", "exact", { question: q("Devam?") }), NOW);
    expect(seat).toMatchObject({ pose: "resting", question: null, motion: false, estimated: false, key: "agents.stateFinished" });
  });
});
