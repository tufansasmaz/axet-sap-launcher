// Sohbette asili kalan tur: kart ve ust sure (kararlilik-2 R8c).
import { describe, expect, it } from "vitest";
import { STALL_AUTO_STOP_MIN, stallAction } from "../src/lib/chatStall";

describe("stallAction", () => {
  it("ilk sessizlik olayinda kart", () => {
    expect(stallAction("stalled", 5)).toBe("card");
    expect(stallAction("stalled", 25)).toBe("card");
  });

  it("30 dk belirtisiz tur kendiliginden durdurulur", () => {
    expect(STALL_AUTO_STOP_MIN).toBe(30);
    expect(stallAction("stalled", 30)).toBe("autoStop");
    expect(stallAction("stalled", 95)).toBe("autoStop");
  });

  it("soru karti, SAP onayi ve calisan arac sayilmaz", () => {
    expect(stallAction("askUser", 40)).toBe("none");
    expect(stallAction("sapApproval", 40)).toBe("none");
    expect(stallAction("tool", 40)).toBe("none");
    expect(stallAction(null, 0)).toBe("none");
  });
});
