// Akış sürerken de en geç 10 sn'de bir kayıt (spec §9). Parçalar ~50 ms
// aralıkla geldiği için düz debounce akış boyunca hiç tetiklenmiyordu.
import { describe, expect, it } from "vitest";
import { SAVE_DEBOUNCE_MS, SAVE_MAX_WAIT_MS, saveDelay } from "../src/lib/saveDelay";

describe("saveDelay", () => {
  it("yeni kirlenmede normal gecikme", () => {
    expect(saveDelay(1_000, 1_000)).toBe(SAVE_DEBOUNCE_MS);
  });
  it("uzun süredir kirliyse gecikme kısalıyor", () => {
    expect(saveDelay(1_000 + SAVE_MAX_WAIT_MS - 200, 1_000)).toBe(200);
  });
  it("süre dolmuşsa hemen", () => {
    expect(saveDelay(1_000 + SAVE_MAX_WAIT_MS + 5_000, 1_000)).toBe(0);
  });
});
