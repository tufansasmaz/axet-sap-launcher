import { describe, expect, it } from "vitest";
import { RATE_STREAK_RESET_MS, createEngineGate, type GateAgent } from "../app-electron/main/agentGate";

function setup(limit = 2) {
  const clock = { ms: 1_000_000 };
  const gate = createEngineGate({ now: () => clock.ms, rand: () => 0.5, limit: (e) => (e === "axet-code" ? limit : 0) });
  return { clock, gate };
}
const a = (paneId: string, running: boolean, engine: GateAgent["engine"] = "axet-code"): GateAgent => ({ paneId, engine, running });

describe("eşzamanlılık kapısı", () => {
  it("aynı motorda çalışan sayısı sınırdaysa dolu; kendisi ve başka motor sayılmaz", () => {
    const { gate } = setup(2);
    expect(gate.check("c", "axet-code", [a("a", true), a("b", false)])).toBe("ok");
    expect(gate.check("c", "axet-code", [a("a", true), a("b", true)])).toBe("full");
    expect(gate.check("a", "axet-code", [a("a", true), a("b", true)])).toBe("ok");
    expect(gate.check("c", "axet-code", [a("a", true), a("b", true, "claude")])).toBe("ok");
  });
  it("lider sınırdan muaf, sınır 0 sınırsız", () => {
    const { gate } = setup(1);
    expect(gate.check("L", "axet-code", [a("a", true)], { lead: true })).toBe("ok");
    expect(setup(0).gate.check("c", "axet-code", [a("a", true), a("b", true)])).toBe("ok");
  });
  it("429 ortak bekleme: lider dahil herkes, süre dolunca açılır, ardışıkta uzar", () => {
    const { clock, gate } = setup(2);
    expect(gate.noteRateLimit("axet-code")).toBe(20_000);
    expect(gate.check("L", "axet-code", [], { lead: true })).toBe("cooldown");
    expect(gate.check("c", "claude", [])).toBe("ok");
    clock.ms += 20_001;
    expect(gate.check("c", "axet-code", [])).toBe("ok");
    expect(gate.noteRateLimit("axet-code")).toBe(40_000);
    clock.ms += RATE_STREAK_RESET_MS + 1;
    expect(gate.noteRateLimit("axet-code")).toBe(20_000);
  });
  it("sapma: herkes aynı anda denemesin", () => {
    const clock = { ms: 0 };
    const low = createEngineGate({ now: () => clock.ms, rand: () => 0, limit: () => 0 });
    const high = createEngineGate({ now: () => clock.ms, rand: () => 1, limit: () => 0 });
    expect(low.noteRateLimit("axet-code")).toBe(16_000);
    expect(high.noteRateLimit("axet-code")).toBe(24_000);
  });
});
