// Sohbetin kullanıcıdan ne beklediği: soru soruyor mu, bakılmamış cevabı
// var mı, hâlâ çalışıyor mu.
import { describe, expect, it } from "vitest";
import { overallAttention, sessionAttention } from "../src/lib/chatAttention";
import type { AxetChatActivity } from "../app-electron/shared/types";

const ask = { phase: "ask" } as unknown as AxetChatActivity;
const s = (pending: boolean, unseen = false, pendingAsk: AxetChatActivity | null = null) => ({
  pending,
  unseen,
  pendingAsk
});

describe("sessionAttention", () => {
  it("boşta ve bakılmışsa hiçbir şey", () => {
    expect(sessionAttention(s(false))).toBeNull();
  });

  it("soru soran tur 'asking', süren tur 'working', biten ve bakılmamış 'unseen'", () => {
    expect(sessionAttention(s(true, false, ask))).toBe("asking");
    expect(sessionAttention(s(true))).toBe("working");
    expect(sessionAttention(s(false, true))).toBe("unseen");
  });

  it("çalışan sohbetin eski 'bakılmadı' işareti çalışmayı örtmüyor", () => {
    expect(sessionAttention(s(true, true))).toBe("working");
  });
});

describe("overallAttention", () => {
  it("en acil olan kazanıyor: soru > bakılmamış > çalışıyor", () => {
    expect(overallAttention([s(true), s(false, true)])).toBe("unseen");
    expect(overallAttention([s(false, true), s(true, false, ask), s(true)])).toBe("asking");
    expect(overallAttention([s(false), s(true)])).toBe("working");
    expect(overallAttention([s(false)])).toBeNull();
    expect(overallAttention([])).toBeNull();
  });
});
