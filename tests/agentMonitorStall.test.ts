// Calisan ajanin son etkinligi dakikada bir yayinlaniyor (kararlilik-2 R8c):
// yayinlanmasaydi ekrandaki "takilmis olabilir" ilerleyen ajanda da yanardi.
import { describe, expect, it } from "vitest";
import { RUNNING_ACTIVITY_REFRESH_MS, sameStatus } from "../app-electron/main/agentMonitor";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const run = (lastActivity: number | null): AgentStatus => ({ state: "running", source: "exact", lastActivity });

describe("sameStatus (calisirken)", () => {
  it("bir dakikadan kisa ilerleme yayinlanmaz (gurultu yok)", () => {
    expect(sameStatus(run(1_000), run(1_000 + RUNNING_ACTIVITY_REFRESH_MS - 1))).toBe(true);
  });

  it("bir dakikalik ilerleme yayinlanir", () => {
    expect(sameStatus(run(1_000), run(1_000 + RUNNING_ACTIVITY_REFRESH_MS))).toBe(false);
  });

  it("bosta durumda her degisim yayinlanir (eskisi gibi)", () => {
    const idle = (t: number): AgentStatus => ({ state: "idle", source: "exact", lastActivity: t });
    expect(sameStatus(idle(1), idle(2))).toBe(false);
  });
});
