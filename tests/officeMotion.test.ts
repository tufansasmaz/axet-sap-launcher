// Piksel ofisin zamanlaması (spec 2026-10-18 ajanlar-yeniden §2b, §3): durum
// -> kare seçimi, ~4 fps yazma, hareketi azalt, pano dağıtımında ışın.
import { describe, expect, it } from "vitest";
import type { TerminalPane } from "../src/stores/terminalTypes";
import {
  BEAM_MS,
  FRAME_MS,
  beamShape,
  leaderPane,
  linePixels,
  needsAnimation,
  newAssignments,
  seatFrame
} from "../src/office/officeMotion";

describe("seatFrame", () => {
  it("kesin çalışıyor: iki kare yazma, ~4 fps, monitör yanık", () => {
    expect(FRAME_MS).toBe(250);
    const a = seatFrame("typing", true, false, 0);
    const b = seatFrame("typing", true, false, FRAME_MS);
    expect(a).toMatchObject({ body: "typeA", monitor: "on", mark: null, dim: false, animated: true });
    expect(b.body).toBe("typeB");
    expect(seatFrame("typing", true, false, 2 * FRAME_MS).body).toBe("typeA");
  });

  it("tahmini çalışıyor: aynı poz, hareketsiz; hareketi azalt: kesinde de hareketsiz", () => {
    for (const t of [0, FRAME_MS, 3 * FRAME_MS]) {
      expect(seatFrame("typing", false, false, t)).toMatchObject({ body: "typeA", monitor: "on", animated: false });
      expect(seatFrame("typing", true, true, t)).toMatchObject({ body: "typeA", monitor: "on", animated: false });
    }
  });

  it("soru sarı ?, hata kırmızı !, boşta yaslanır ve monitör söner, motor yok boş masa, bilinmiyor soluk", () => {
    expect(seatFrame("asking", false, false, 0)).toMatchObject({ body: "typeA", mark: "question", animated: false });
    expect(seatFrame("error", false, false, 0)).toMatchObject({ mark: "error", monitor: "error" });
    expect(seatFrame("resting", false, false, 0)).toMatchObject({ body: "rest", monitor: "off", mark: null });
    expect(seatFrame("absent", false, false, 0)).toMatchObject({ body: null, monitor: "none", mark: null });
    expect(seatFrame("unknown", false, false, 0)).toMatchObject({ body: "sit", monitor: "off", dim: true });
  });
});

describe("ışın", () => {
  it("yalnız yeni atanan alt görevde; ilk görüntüde ışın yok", () => {
    expect(newAssignments(null, { p1: "s1" })).toEqual([]);
    expect(newAssignments({ p1: null, p2: "s2" }, { p1: "s1", p2: "s2" })).toEqual(["p1"]);
    expect(newAssignments({ p1: "s1" }, { p1: "s3" })).toEqual(["p1"]);
    expect(newAssignments({ p1: "s1" }, { p1: null })).toEqual([]);
    expect(newAssignments({}, { p9: "s9" })).toEqual(["p9"]);
  });

  it("~800 ms: önce uç ilerliyor, sonra sönüyor; öncesi ve sonrası yok", () => {
    expect(BEAM_MS).toBe(800);
    expect(beamShape(1000, 999)).toBeNull();
    expect(beamShape(1000, 1000 + BEAM_MS)).toBeNull();
    expect(beamShape(1000, 1000)).toEqual({ head: 0, alpha: 1 });
    expect(beamShape(1000, 1000 + BEAM_MS / 2)).toEqual({ head: 1, alpha: 1 });
    const late = beamShape(1000, 1000 + BEAM_MS * 0.75);
    expect(late?.head).toBe(1);
    expect(late?.alpha).toBeCloseTo(0.5);
    const early = beamShape(1000, 1000 + BEAM_MS / 4);
    expect(early?.head).toBeCloseTo(0.5);
  });

  it("lider: rolü lider/lead olan ajan; yoksa null (kapıdan)", () => {
    const p = (id: string, role: string): TerminalPane => ({
      id,
      kind: "agent",
      agent: { engine: "axet-code", role, roleKind: "custom" },
      cwd: "C:\\a",
      run: { state: "running", ptyId: id }
    });
    expect(leaderPane([p("a", "coder"), p("b", "Takım lideri")])).toBe("b");
    expect(leaderPane([p("a", "Tech Lead"), p("b", "tester")])).toBe("a");
    expect(leaderPane([p("a", "coder")])).toBeNull();
    expect(leaderPane([p("a", "leadership coach")])).toBeNull();
  });

  it("çizgi pikselleri uçtan uca, aralıksız", () => {
    const px = linePixels(0, 0, 5, 2);
    expect(px[0]).toEqual([0, 0]);
    expect(px[px.length - 1]).toEqual([5, 2]);
    for (let i = 1; i < px.length; i++) {
      expect(Math.abs(px[i][0] - px[i - 1][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(px[i][1] - px[i - 1][1])).toBeLessThanOrEqual(1);
    }
    expect(linePixels(3, 3, 3, 3)).toEqual([[3, 3]]);
  });
});

describe("needsAnimation", () => {
  it("döngü yalnız görünürken, hareketi azalt kapalıyken ve hareket varken", () => {
    const frames = [seatFrame("typing", true, false, 0)];
    expect(needsAnimation(frames, 0, true, false)).toBe(true);
    expect(needsAnimation(frames, 0, false, false)).toBe(false);
    expect(needsAnimation(frames, 0, true, true)).toBe(false);
    expect(needsAnimation([seatFrame("resting", false, false, 0)], 0, true, false)).toBe(false);
    expect(needsAnimation([seatFrame("resting", false, false, 0)], 1, true, false)).toBe(true);
  });
});
