// BOZULMUS GECMIS teshisi.
//
// Saglayici, cevabi gelmemis bir `tool_use` blogu tasiyan gecmisi topluca
// reddediyor:
//
//   400 Bad Request  `tool_use` ids were found without `tool_result`
//                    blocks immediately after: toolu_...
//
// Ayrim kritik: bu hata TURA degil GECMISE ait. Siradan bir saglayici
// hatasinda (403, EOF) tekrar denemek ise yariyor; burada ayni oturuma
// yazilan HER sonraki mesaj da ayni 400'u aliyor ve kullanicinin gordugu tek
// sey ardarda bos cevaplar oluyor. 2026-09-08'de bir sohbet tam olarak boyle
// oldu. Bu testlerin korudugu sey, o ayrimin dogru yapilmasi: yanlis pozitif
// gereksiz yere oturum yeniliyor (bir buyuk istem), yanlis negatif sohbeti
// oldurmeye devam ediyor.

import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));

const { finishPoisonsHistory } = await import("../app-electron/main/axetSessionDb");

const finish = (data: Record<string, unknown>) => ({ type: "finish", data });

describe("finishPoisonsHistory", () => {
  it("400 metnini ayrinti alanindan taniyor", () => {
    expect(
      finishPoisonsHistory(
        finish({
          reason: "error",
          message: "Bad Request",
          details:
            "messages.1.content: `tool_use` ids were found without `tool_result` blocks immediately after: toolu_bdrk_01"
        })
      )
    ).toBe(true);
  });

  it("ayrinti NESNE olarak geldiginde de taniyor", () => {
    // Alan bazen duz metin, bazen nesne geliyor.
    expect(
      finishPoisonsHistory(
        finish({
          reason: "error",
          message: "Bad Request",
          details: { error: { message: "`tool_use` ids were found without `tool_result` blocks" } }
        })
      )
    ).toBe(true);
  });

  it("siradan saglayici hatasi gecmisi bozmuyor", () => {
    // 403 ve EOF gecici: oturum saglam, tekrar denemek ise yariyor.
    expect(finishPoisonsHistory(finish({ reason: "error", message: "Forbidden" }))).toBe(false);
    expect(
      finishPoisonsHistory(finish({ reason: "error", message: "Provider Error", details: "unexpected EOF" }))
    ).toBe(false);
  });

  it("normal bitis bozuk sayilmiyor", () => {
    expect(finishPoisonsHistory(finish({ reason: "end_turn" }))).toBe(false);
    expect(finishPoisonsHistory(finish({ reason: "tool_use" }))).toBe(false);
  });

  it("finish OLMAYAN parca ve eksik parca guvenli", () => {
    expect(finishPoisonsHistory(undefined)).toBe(false);
    expect(
      finishPoisonsHistory({ type: "text", data: { text: "`tool_use` ve `tool_result` yaziyorum" } })
    ).toBe(false);
  });

  it("tek basina `tool_use` YETMIYOR", () => {
    // Arac adlarinda ve normal metinde tek basina gecebiliyor; ikisi birden
    // yalnizca bu hatada bir araya geliyor.
    expect(finishPoisonsHistory(finish({ reason: "error", message: "tool_use limit exceeded" }))).toBe(
      false
    );
  });
});
