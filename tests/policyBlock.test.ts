// PORTALIN GÜVENLİK POLİTİKASI ENGELİ ≠ YETKİ HATASI.
//
// Ölçülen olay (2026-10-06, DA8, 10:32): portal isteği içeriği yüzünden
// reddetti —
//
//   403 Forbidden {"error":"request_blocked","message":"This request is not
//   allowed under the current security policy. The event has been logged for
//   review.", ...}
//
// Uygulama bunu "yetki hatası" saydı: süreci yeniledi, AYNI içeriği bir kez
// daha gönderdi (yine engellendi, yine incelemeye kaydedildi) ve kullanıcıya
// "aXet portalı isteği yetki hatasıyla reddediyor" dedi. İkisi de yanlış:
// yeniden denemek bu engeli kaldırmaz, sebep de kimlik değil içerik.

import { describe, expect, it, vi } from "vitest";
import { MAIN_EN as en } from "../app-electron/main/i18n/en";
import { MAIN_TR as tr } from "../app-electron/main/i18n/tr";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));

const { finishAuthFailure, finishPolicyBlock } = await import("../app-electron/main/axetSessionDb");
const { classifyFailure } = await import("../app-electron/main/axetCodeLog");

const BLOCKED_DETAILS =
  'POST "https://axet.nttdata.com/api/llm-enabler/v3/aws-anthropic/model/eu.anthropic.claude-sonnet-5/invoke-with-response-stream/v1/messages": 403 Forbidden {"error":"request_blocked","message":"This request is not allowed under the current security policy. The event has been logged for review.","requestId":"1cc88d63-1f37-40f4-a1c5-2bc630c4eec7","requestDate":"2026-10-06T10:32:40.661Z"}';
const blockedFinish = { type: "finish", data: { reason: "error", message: "Forbidden", details: BLOCKED_DETAILS } };
const authFinish = {
  type: "finish",
  data: { reason: "error", message: "Forbidden", details: 'POST "https://axet.nttdata.com/...": 403 Forbidden ' }
};

describe("finish parçası", () => {
  it("politika engeli tanınıyor (canlı veriden birebir)", () => {
    expect(finishPolicyBlock(blockedFinish)).toBe(true);
  });

  it("politika engeli YETKİ arızası sayılmıyor — süreç yenilenip aynı içerik tekrar gitmesin", () => {
    expect(finishAuthFailure(blockedFinish)).toBe(false);
  });

  it("düz 403 hâlâ yetki arızası, politika engeli değil", () => {
    expect(finishAuthFailure(authFinish)).toBe(true);
    expect(finishPolicyBlock(authFinish)).toBe(false);
  });

  it("hata olmayan bitiş engel değil", () => {
    expect(finishPolicyBlock({ type: "finish", data: { reason: "end_turn" } })).toBe(false);
    expect(finishPolicyBlock(undefined)).toBe(false);
  });
});

describe("günlük satırı", () => {
  const line = (msg: string, error: string) => ({
    level: "ERROR",
    msg,
    sessionId: "",
    error,
    finishReason: "",
    shouldSummarize: false
  });

  it("başlık üretiminde görülen engel de 'blocked' (aynı içerik turda da engelleniyor)", () => {
    // Canlı günlük satırı (2026-10-06T13:32:40+03:00).
    expect(
      classifyFailure(line("Error generating title with small model; trying big model", `forbidden: ${BLOCKED_DETAILS}`))
    ).toBe("blocked");
  });

  it("düz 403 hâlâ 'auth'", () => {
    expect(classifyFailure(line("Error generating title with small model; trying big model", "forbidden: POST x: 403 Forbidden "))).toBe(
      "auth"
    );
  });
});

describe("i18n mesajı iki dilde de var ve yetki hatası demiyor", () => {
  it("EN mesajı 'authorization' içermiyor, 'policy' içeriyor", () => {
    const msg: string = en["chatTui.policyBlocked"];
    expect(msg).toBeTruthy();
    expect(msg.toLowerCase()).not.toContain("authorization");
    expect(msg.toLowerCase()).toContain("policy");
  });

  it("TR mesajı 'yetki hatası' içermiyor, 'politika' içeriyor", () => {
    const msg: string = tr["chatTui.policyBlocked"];
    expect(msg).toBeTruthy();
    expect(msg.toLowerCase()).not.toContain("yetki hatas");
    expect(msg.toLowerCase()).toContain("politika");
  });
});

