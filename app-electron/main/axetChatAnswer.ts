// ---------------------------------------------------------------------------
// "Başarılı" ama BOŞ tur — sessiz cevap kaybının kapısı
// ---------------------------------------------------------------------------
// Ölçülmüş arıza (2026-09-08, kullanıcının bir arkadaşının makinesi, taze
// kurulum): sohbette üç tur art arda `ok: true` ile bitti, `text` boştu ve
// ekrana ÜÇ BOŞ BALON çizildi. Balonun altında kopyala düğmesi, saat damgası
// ve "Yeniden üret" vardı — yani arayüz turu başarılı sayıyordu. Kullanıcının
// gördüğü tek şey hiçbir şeydi; hangi katmanın sustuğunu söyleyen tek bir
// satır yoktu, ne ekranda ne de bir hata olarak.
//
// Boş bir turun `ok: true` dönebildiği İKİ yer var ve ikisi de gerçek:
//
//   1. `run` yedek kipi (axetChat.ts): süreç 0 ile çıkarsa cevap
//      `stdout`'un tamamı sayılıyor. axet-code hiçbir şey yazmadan 0 ile
//      çıkarsa sonuç "başarılı ve boş" oluyor.
//   2. TUI kipi (axetChatTui.ts): tur, son asistan mesajındaki `finish`
//      parçasına bakarak bitiyor. O mesajda metin parçası yoksa (parça tipi
//      bir sürümde değişirse, ya da ajan gerçekten hiç metin üretmezse)
//      biriken cevap boş kalıyor.
//
// Kural bu yüzden sonuca bakıyor, sebebine değil: **metinsiz bir tur başarılı
// değildir.** Sebep bilinmiyor olabilir; bilinmediğini söylemek, boş bir balon
// çizmekten her hâlükârda iyidir (öncelik sırası: veri kaybı → yanlış bilgi).
//
// Ayrı dosya olmasının sebebi test: `axetChat.ts` Electron'a ve süreç
// başlatmaya bağlı, bu karar ise saf.
// ---------------------------------------------------------------------------

/** Kararın baktığı alanlar — tam `AxetChatSendResult` gerekmiyor. */
export interface AnswerShape {
  ok: boolean;
  text: string;
  cancelled?: boolean;
}

/**
 * Tur "başarılı" dönüyor ama gösterilecek hiçbir metin yok mu?
 *
 * `cancelled` HARİÇ: kullanıcı durdurduğunda yarım metnin olmaması normaldir
 * ve arayüz o durumu zaten kendi ele alıyor (balonu tamamen kaldırıyor).
 */
export function isSilentEmptyAnswer(result: AnswerShape): boolean {
  return result.ok === true && result.cancelled !== true && result.text.trim() === "";
}
