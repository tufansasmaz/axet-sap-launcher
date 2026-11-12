// Sohbette 429 ile biten tur: otomatik yeniden deneme plani (kararlilik-2 R4).
// Hata metni portalin olculen cumlesi (bkz. shared/agentErrors.ts basi).

import { describe, expect, it } from "vitest";
import { planRateRetry, rateLimitedTurn, type RetryMessage } from "../src/lib/chatRateRetry";

const RATE = 'POST "https://portal/v1/messages": 429 Too Many Requests {"message":"Too many tokens, please wait before trying again."}';
const msg = (over: Partial<RetryMessage>): RetryMessage => ({ role: "assistant", content: "", ...over });
const ON = { auto: true, max: 3 };
const mid = () => 0.5;

describe("rateLimitedTurn", () => {
  it("hicbir sey yapilmadan 429 ile dusen tur: ayni istem yeniden", () => {
    expect(rateLimitedTurn(msg({ error: true, content: RATE }))).toBe("regenerate");
  });

  it("arac calismisti (Devam et): kaldigi yerden devam", () => {
    expect(rateLimitedTurn(msg({ interrupted: true, content: "yarim", haltReason: RATE }))).toBe("continue");
  });

  it("429 olmayan hata, kullanici mesaji ve akan cevap: yok", () => {
    expect(rateLimitedTurn(msg({ error: true, content: "aXet portali 403" }))).toBeNull();
    expect(rateLimitedTurn(msg({ role: "user", error: true, content: RATE }))).toBeNull();
    expect(rateLimitedTurn(msg({ error: true, content: RATE, streaming: true }))).toBeNull();
    expect(rateLimitedTurn(null)).toBeNull();
  });
});

describe("planRateRetry", () => {
  it("artan bekleme: 10 sn, 30 sn, 90 sn (Tur 9 ajan kurallari)", () => {
    const last = msg({ error: true, content: RATE });
    expect(planRateRetry(last, 0, ON, mid)).toEqual({ kind: "regenerate", attempt: 1, delayMs: 10_000 });
    expect(planRateRetry(last, 1, ON, mid)?.delayMs).toBe(30_000);
    expect(planRateRetry(last, 2, ON, mid)?.delayMs).toBe(90_000);
  });

  it("en cok N deneme, sonra durur", () => {
    expect(planRateRetry(msg({ error: true, content: RATE }), 3, ON, mid)).toBeNull();
  });

  it("ayar kapaliysa denemez", () => {
    expect(planRateRetry(msg({ error: true, content: RATE }), 0, { auto: false, max: 3 }, mid)).toBeNull();
  });
});
