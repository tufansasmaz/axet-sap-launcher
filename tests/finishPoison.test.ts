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

const { finishAuthFailure, finishPoisonsHistory } = await import("../app-electron/main/axetSessionDb");

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

// TASIYICI KIMLIGI DUSTU teshisi.
//
// 2026-09-09: sohbet 13:15:59'a kadar 14 tur calisti, sonra veritabanindaki
// HER tur asagidaki `finish` ile bitti ve o andan sonra tek bir basarili tur
// olmadi. Aciklamasi jeton omru: ariza SURECE yapisik, oturuma degil.
//
// Bu teshisin degeri, `AxetFailureKind: "auth"` kurtarma yolunu acmasi —
// surec yenileniyor, mesaj bir kez daha gidiyor, gecmis tohumlamayla
// tasiniyor. Yanlis negatif kullaniciya ardarda BOS CEVAP gosteriyor (olculdu:
// bes kez, dort oturum bosuna dondu); yanlis pozitif ise saglam bir turu
// bosuna yeniden baslatiyor.
describe("finishAuthFailure", () => {
  const FORBIDDEN =
    'POST "https://axet.nttdata.com/api/llm-enabler/v3/aws-anthropic/model/eu.anthropic.claude-sonnet-5/invoke-with-response-stream/v1/messages": 403 Forbidden ';

  it("canli 403'u taniyor", () => {
    expect(finishAuthFailure(finish({ reason: "error", message: "Forbidden", details: FORBIDDEN }))).toBe(
      true
    );
  });

  it("ayrinti NESNE olarak geldiginde de taniyor", () => {
    expect(
      finishAuthFailure(finish({ reason: "error", message: "", details: { err: FORBIDDEN } }))
    ).toBe(true);
  });

  it("401 ve suresi dolmus jeton da yetki arizasi", () => {
    expect(finishAuthFailure(finish({ reason: "error", message: "401 Unauthorized" }))).toBe(true);
    expect(finishAuthFailure(finish({ reason: "error", message: "token has expired" }))).toBe(true);
  });

  it("BASKA saglayici hatalari yetki arizasi DEGIL", () => {
    // Bunlar yeniden denemeyle geciyor; surec yenilemek bedeli bosuna odetir.
    expect(finishAuthFailure(finish({ reason: "error", message: "Provider Error", details: "unexpected EOF" }))).toBe(
      false
    );
    expect(finishAuthFailure(finish({ reason: "error", message: "500 Internal Server Error" }))).toBe(
      false
    );
  });

  it("BASARILI tur yetki arizasi sayilmiyor", () => {
    // Kritik: olcut `reason === "error"` ile kapili. Ajanin kendi CEVABINDA
    // "403 Forbidden" yazmasi -- ki tam olarak bu ariza konusulurken oluyor --
    // saglam bir turu yeniden baslatmamali.
    expect(finishAuthFailure(finish({ reason: "end_turn", message: FORBIDDEN }))).toBe(false);
    expect(finishAuthFailure(finish({ reason: "tool_use" }))).toBe(false);
  });

  it("finish OLMAYAN parca ve eksik parca guvenli", () => {
    expect(finishAuthFailure(undefined)).toBe(false);
    expect(finishAuthFailure({ type: "text", data: { text: "403 Forbidden" } })).toBe(false);
  });

  it("bozuk gecmis ile yetki arizasi BIRBIRINE karismiyor", () => {
    // Ikisinin ilaci farkli: biri yeni OTURUM, digeri yeni SUREC.
    const poison = finish({
      reason: "error",
      message: "Bad Request",
      details: "`tool_use` ids were found without `tool_result` blocks"
    });
    const auth = finish({ reason: "error", message: "Forbidden", details: FORBIDDEN });
    expect(finishPoisonsHistory(poison)).toBe(true);
    expect(finishAuthFailure(poison)).toBe(false);
    expect(finishAuthFailure(auth)).toBe(true);
    expect(finishPoisonsHistory(auth)).toBe(false);
  });
});
