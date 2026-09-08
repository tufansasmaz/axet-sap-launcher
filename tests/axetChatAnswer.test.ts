// Metinsiz bir tur BAŞARILI SAYILMAZ.
//
// Ölçülmüş arıza (2026-09-08): taze kurulmuş bir makinede sohbet üç tur
// boyunca `ok: true` + boş metin döndü ve ekrana üç BOŞ BALON çizildi —
// kopyala düğmesiyle, saat damgasıyla, "Yeniden üret" düğmesiyle. Yani
// uygulama turu başarılı sayıyordu ve kullanıcının gördüğü hiçbir şeydi.
//
// Bu blok o kuralı koruyor: `ok` tek başına yetmez, elde gösterilecek metin
// de olmalı.

import { describe, expect, it } from "vitest";
import { isSilentEmptyAnswer } from "../app-electron/main/axetChatAnswer";

describe("isSilentEmptyAnswer", () => {
  it("ok + bos metin = SESSIZ BOSLUK", () => {
    expect(isSilentEmptyAnswer({ ok: true, text: "" })).toBe(true);
  });

  it("yalnizca bosluk karakteri de bos sayilir", () => {
    // `run` kipinde cevap `stdout.trim()`; axet-code tek bir satir sonu
    // yazip 0 ile cikarsa metin "\n" olur ve balon yine bos gorunur.
    expect(isSilentEmptyAnswer({ ok: true, text: "  \n\t " })).toBe(true);
  });

  it("metin varsa dokunulmaz", () => {
    expect(isSilentEmptyAnswer({ ok: true, text: "selam" })).toBe(false);
  });

  it("zaten basarisiz olan tur bu kapiya girmez", () => {
    // Hata metni ayrica geliyor; onun uzerine ikinci bir hata yazmak,
    // gercek sebebi gizlemek olurdu.
    expect(isSilentEmptyAnswer({ ok: false, text: "" })).toBe(false);
  });

  it("KULLANICI DURDURDUYSA bos metin normaldir", () => {
    // Arayuz durdurulan turda yarim balonu zaten tamamen kaldiriyor; burada
    // hataya cevirmek, kullanicinin kendi eylemini ariza gibi gostermek olurdu.
    expect(isSilentEmptyAnswer({ ok: true, text: "", cancelled: true })).toBe(false);
  });
});
