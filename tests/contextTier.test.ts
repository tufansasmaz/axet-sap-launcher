import { describe, expect, it } from "vitest";
import { contextTierFor } from "../src/lib/contextTier";
import type { ActiveSapContext } from "../app-electron/shared/types";

const sap = (projectDir: string, tier: ActiveSapContext["tier"]) =>
  ({ projectDir, tier }) as ActiveSapContext;

describe("contextTierFor", () => {
  it("sohbetin klasörü bağlı sistemin klasörüyse rozet o sistemin", () => {
    expect(contextTierFor("C:\\Proj\\P01\\", sap("c:/proj/p01", "PRD"))).toBe("PRD");
  });

  // Review Focus 5
  it("başka sistemin klasöründeki eski sohbette rozet yok", () => {
    expect(contextTierFor("C:/Proj/D01", sap("C:/Proj/P01", "PRD"))).toBeNull();
  });

  it("bağlı sistem, klasör ya da seviye yoksa null", () => {
    expect(contextTierFor("C:/Proj/P01", null)).toBeNull();
    expect(contextTierFor("", sap("C:/Proj/P01", "PRD"))).toBeNull();
    expect(contextTierFor("C:/Proj/P01", sap("C:/Proj/P01", null))).toBeNull();
  });
});
