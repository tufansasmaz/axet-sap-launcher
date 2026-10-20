// Tur 10, madde 8: "İkinci beyin öğrenmiyor, konuşmalarımdan otomatik bir şey eklemiyor".
// Ölçüm: belleğe yalnız elle ("Belleğe ekle") ya da Öğren görevinden not düşüyordu;
// Akış mesajlarından/biten işlerden otomatik yakalama yolu yoktu.
import { describe, expect, it } from "vitest";
import {
  AUTO_TAG,
  CAPTURE_PER_TEXT,
  captureCandidates,
  captureKey,
  planCapture,
  similarNote
} from "../app-electron/shared/memoryCapture";
import type { MemoryNote } from "../app-electron/shared/memoryNotes";

const note = (over: Partial<MemoryNote>): MemoryNote => ({ id: "n1", title: "", body: "", kind: "not", tags: [], owner: "", created: 1, updated: 1, ...over });

describe("captureCandidates", () => {
  it("kullanıcı mesajında karar ve kural cümleleri", () => {
    const c = captureCandidates({ source: "user", text: "Merhaba. Bundan sonra tarih alanlarında ISO 8601 biçimini kullanacağız. Bunu düzelt lütfen.", name: "Ayşe" });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: "karar" });
    expect(c[0].body).toContain("ISO 8601");
    expect(c[0].tags).toContain(AUTO_TAG);
    expect(c[0].source).toMatchObject({ type: "flow", name: "Ayşe" });
    expect(captureCandidates({ source: "user", text: "Test ortamında asla gerçek müşteri verisi kullanma." , name: "x"})[0]).toMatchObject({ kind: "olgu" });
  });

  it("ajan cevabında öğrenim (kök neden, çözüm)", () => {
    const c = captureCandidates({
      source: "agent",
      text: "Testleri çalıştırdım.\nKök neden: ConPTY aynı boyutta resize gelince ekranı yeniden çiziyor.\nTüm testler geçti.",
      name: "Ali"
    });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: "ogrenim" });
    expect(c[0].title).toContain("ConPTY");
  });

  it("soru, kısa, kod, gizli ve uygulamanın kendi işaretleri yakalanmıyor", () => {
    expect(captureCandidates({ source: "user", text: "Bundan sonra hangi biçimi kullanacağız?", name: "x" })).toEqual([]);
    expect(captureCandidates({ source: "user", text: "Karar: evet.", name: "x" })).toEqual([]);
    expect(captureCandidates({ source: "user", text: "Bundan sonra password=Gizli123456 ile bağlanacağız her zaman.", name: "x" })).toEqual([]);
    expect(captureCandidates({ source: "agent", text: "GOREV-SONUC G-ab12: Kök neden bulundu ve düzeltildi, testler geçti.", name: "x" })).toEqual([]);
    expect(captureCandidates({ source: "agent", text: "```\nkök neden: const x = a(b) => { return c; };\n```", name: "x" })).toEqual([]);
    expect(captureCandidates({ source: "user", text: "[Mesaj] Bundan sonra her zaman ISO tarih kullanacağız (Ekip araci: ...)", name: "x" })).toHaveLength(0);
  });

  it("metin başına en çok CAPTURE_PER_TEXT not", () => {
    const text = Array.from({ length: 6 }, (_, i) => `Kural ${i}: rapor dosyalarını her zaman UTF-8 olarak kaydetmeliyiz numara ${i}.`).join(" ");
    expect(captureCandidates({ source: "user", text, name: "x" }).length).toBe(CAPTURE_PER_TEXT);
  });
});

describe("benzerlik ve plan", () => {
  const input = captureCandidates({ source: "user", text: "Bundan sonra tarih alanlarında ISO 8601 biçimini kullanacağız.", name: "Ayşe" })[0];

  it("aynı anlamdaki otomatik not güncelleniyor", () => {
    const old = note({ id: "a1", title: "Bundan sonra tarih alanlarında ISO 8601 biçimi kullanılacak", body: "tarih alanlarında ISO 8601 biçimi", tags: [AUTO_TAG] });
    expect(similarNote([old], input)?.id).toBe("a1");
    expect(planCapture([old], input)).toEqual({ action: "update", id: "a1" });
  });

  it("benzer ama kullanıcının elle yazdığı not: dokunulmuyor, eklenmiyor", () => {
    const own = note({ id: "u1", title: "Tarih alanlarında ISO 8601 biçimini kullanacağız", body: "", tags: [] });
    expect(planCapture([own], input)).toEqual({ action: "skip" });
  });

  it("benzer not yoksa ekleniyor", () => {
    expect(planCapture([note({ title: "Fatura onay akışı iki aşamalı" })], input)).toEqual({ action: "add" });
  });

  it("anahtar büyük/küçük harf ve noktalama farkını yok sayıyor", () => {
    expect(captureKey("Bundan sonra ISO-8601!")).toBe(captureKey("bundan sonra iso 8601"));
  });
});
