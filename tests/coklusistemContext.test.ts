// Çoklu sistem bağlamı: birden fazla bağlı sistem; `sap` = odaktaki (eski
// tüketiciler); bağlam bloğu sohbetin klasörünün sistemini ve GERÇEK portunu yazıyor.
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildContextPreamble,
  clearActiveSap,
  focusActiveSap,
  getActiveContext,
  removeActiveSap,
  resetActiveContextForTest,
  setActiveSap
} from "../app-electron/main/activeContext";
import type { ActiveSapContext } from "../app-electron/shared/types";

function sys(sid: string, tier: "DEV" | "PRD", adtPort: number): ActiveSapContext {
  return {
    uuid: `u-${sid}`,
    systemId: sid,
    systemName: sid,
    customerPath: ["M"],
    host: null,
    client: "100",
    username: "U",
    tier,
    projectDir: `C:\\p\\${sid}`,
    connectedAt: "2026-11-12T00:00:00Z",
    verified: true,
    adtPort
  };
}

beforeEach(() => resetActiveContextForTest());

describe("çoklu bağlam", () => {
  it("ikinci bağlantı birinciyi düşürmüyor; odak sonuncuda", () => {
    setActiveSap(sys("DEV", "DEV", 8787));
    setActiveSap(sys("PRD", "PRD", 8800));
    const ctx = getActiveContext();
    expect(ctx.systems?.map((s) => s.systemId)).toEqual(["DEV", "PRD"]);
    expect(ctx.sap?.systemId).toBe("PRD");
  });

  it("aynı sisteme yeniden bağlanmak kaydı güncelliyor, çoğaltmıyor", () => {
    setActiveSap(sys("DEV", "DEV", 8787));
    setActiveSap({ ...sys("DEV", "DEV", 8787), client: "200" });
    expect(getActiveContext().systems).toHaveLength(1);
    expect(getActiveContext().sap?.client).toBe("200");
  });

  it("odak değişiyor; odaktaki kesilince öteki odağa geçiyor", () => {
    setActiveSap(sys("DEV", "DEV", 8787));
    setActiveSap(sys("PRD", "PRD", 8800));
    expect(focusActiveSap("u-DEV")).toBe(true);
    expect(getActiveContext().sap?.systemId).toBe("DEV");
    clearActiveSap();
    expect(getActiveContext().sap?.systemId).toBe("PRD");
    removeActiveSap("C:\\p\\PRD");
    expect(getActiveContext().sap).toBeNull();
    expect(getActiveContext().systems).toEqual([]);
  });

  it("bağlam bloğu sohbetin klasörünün sistemini ve portunu yazıyor, odaktakini değil", () => {
    setActiveSap(sys("DEV", "DEV", 8787));
    setActiveSap(sys("PRD", "PRD", 8800));
    focusActiveSap("u-PRD");
    const dev = buildContextPreamble("C:\\p\\DEV");
    expect(dev).toContain("Sistem: DEV (DEV)");
    expect(dev).toContain("127.0.0.1:8787");
    const prd = buildContextPreamble("C:\\p\\PRD");
    expect(prd).toContain("127.0.0.1:8800");
    expect(prd).not.toContain("8787");
    expect(prd).toContain("SALT OKUNUR");
    expect(buildContextPreamble("C:\\genel")).toBe("");
  });
});
