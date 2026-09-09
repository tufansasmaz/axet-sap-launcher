// Gunluk satirindan TUR ARIZASI siniflandirmasi.
//
// Bu siniflandiricinin ciktisi dogrudan bir eyleme baglaniyor: "auth" ve
// "context" axet-code SURECINI yeniletiyor (axetChatTui.ts `restartSession`).
// Yani yanlis pozitif saglam bir turu ~3 saniyelik acilis bedeliyle yeniden
// baslatiyor; yanlis negatif ise kullaniciya ardarda BOS CEVAP gosteriyor.
//
// Buradaki testlerin agirligi ikinci hatada, cunku 2026-09-09'da tam olarak o
// yasandi: tasiyicinin kimligi dustugunde gunluge dusen TEK kanit bir baslik
// uretimi satiriydi ve susturma filtresi onu atiyordu.

import { describe, expect, it } from "vitest";

import { classifyFailure, type AxetLogLine } from "../app-electron/main/axetCodeLog";

const line = (over: Partial<AxetLogLine>): AxetLogLine => ({
  level: "ERROR",
  msg: "",
  sessionId: "",
  error: "",
  finishReason: "",
  shouldSummarize: false,
  ...over
});

const FORBIDDEN =
  'forbidden: POST "https://axet.nttdata.com/api/llm-enabler/v3/aws-anthropic/model/eu.anthropic.claude-sonnet-5/invoke-with-response-stream/v1/messages": 403 Forbidden ';

describe("classifyFailure", () => {
  it("BASLIK URETIMINDEKI 403 yetki arizasi sayiliyor", () => {
    // Asil hata bu. Canli gunlukten (2026-09-09T16:24:04+03:00) birebir satir:
    // kullanicinin turu ayni anda 403 aliyordu ama turun kendi hatasi gunluge
    // HIC dusmuyor -- yalnizca veritabanindaki `finish` parcasinda duruyor.
    // Dolayisiyla bu satir gunlukteki tek kanary; susturulursa kurtarma yolu
    // hic acilmiyor.
    expect(
      classifyFailure(
        line({ msg: "Error generating title with small model; trying big model", error: FORBIDDEN })
      )
    ).toBe("auth");
  });

  it("baslik uretimindeki 503 hala GORMEZDEN geliniyor", () => {
    // Susturma filtresinin var olma sebebi: bu gercekten zararsiz, kendi
    // yedegine gecip basariyla tamamlaniyor. Duzeltme onu bozmamali.
    expect(
      classifyFailure(
        line({ msg: "Error generating title with small model; trying big model", error: "503 Service Unavailable" })
      )
    ).toBeNull();
  });

  it("baglayici senkronizasyonu tur arizasi degil", () => {
    // Baglayicilar kapaliyken her acilista dusuyor (canli gunlukte 22 kez).
    expect(classifyFailure(line({ msg: "connector.sync failed", error: "dial tcp: timeout" }))).toBeNull();
  });

  it("baglayici senkronizasyonundaki YETKI hatasi yine de bildiriliyor", () => {
    // Kaynagi ne olursa olsun 403 bir tur arizasi: ayni jeton, ayni portal.
    expect(classifyFailure(line({ msg: "connector.sync failed", error: FORBIDDEN }))).toBe("auth");
  });

  it("baglam ve saglayici siniflari korunuyor", () => {
    expect(classifyFailure(line({ msg: "", error: "context window exceeded" }))).toBe("context");
    expect(classifyFailure(line({ msg: "provider error after 5 retries", error: "" }))).toBe("provider");
  });

  it("INFO satirlari hicbir zaman ariza degil", () => {
    // "AXET anthropic request" gibi bilgi satirlarinda ayni sozcukler
    // zararsizca geciyor; onlari ariza saymak saglam bir turu yeniden
    // baslatmak olurdu. Seviye denetimi yetki denetiminin ONUNDE kalmali.
    expect(classifyFailure(line({ level: "INFO", msg: "AXET request", error: FORBIDDEN }))).toBeNull();
    expect(classifyFailure(line({ level: "DEBUG", error: "403 Forbidden" }))).toBeNull();
  });

  it("siradan bir satir null donuyor", () => {
    expect(classifyFailure(line({ msg: "tool call failed", error: "file not found" }))).toBeNull();
  });
});
