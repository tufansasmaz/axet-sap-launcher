// Tur sonucunun balona dönüşmesi (spec 2026-10-16 basiz-kopru §6: araç
// çalıştıysa otomatik yeniden gönderme yok, kullanıcıya "Devam et").
import { describe, expect, it } from "vitest";
import { settleAnswer } from "../src/lib/settleAnswer";

const G = "Cevap alınamadı";

describe("settleAnswer", () => {
  it("başarı: sonuç metni", () => {
    expect(settleAnswer({ ok: true, text: " cevap " }, "", G)).toEqual({ content: "cevap", error: false });
  });

  it("başarı ama boş sonuç: akmış metin kazanır", () => {
    expect(settleAnswer({ ok: true, text: "" }, "akan", G)).toEqual({ content: "akan", error: false });
  });

  it("başarı, ikisi de boş: genel hata", () => {
    expect(settleAnswer({ ok: true, text: "" }, "", G)).toEqual({ content: G, error: true });
  });

  it("hata, araç yok: hata metni, düğme yok", () => {
    expect(settleAnswer({ ok: false, text: "", error: "529" }, "yarım", G)).toEqual({ content: "529", error: true });
  });

  it("hata, araç çalıştı: yarım metin korunuyor, Devam et", () => {
    expect(settleAnswer({ ok: false, text: "yarım", error: "529 overloaded", canContinue: true }, "", G)).toEqual({
      content: "yarım",
      error: false,
      interrupted: true,
      haltReason: "529 overloaded"
    });
  });

  it("hata, araç çalıştı, metin hiç yok: balon hatanın kendisi ama devam edilebilir", () => {
    expect(settleAnswer({ ok: false, text: "", error: "529", canContinue: true }, "", G)).toEqual({
      content: "529",
      error: false,
      interrupted: true,
      haltReason: "529"
    });
  });
});
