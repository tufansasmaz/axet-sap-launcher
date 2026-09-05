// ---------------------------------------------------------------------------
// YARIDA KALAN TURUN CEVABINI KURTARMA
// ---------------------------------------------------------------------------
// Uygulama bir tur sürerken kapanırsa cevap SESSİZCE yok oluyordu. İki ayrı
// sebep üst üste biniyordu ve ikincisi ilkini görünmez kılıyordu:
//
//   1. Kayıt, akan mesajı zaten dışarıda bırakıyordu
//      (`messages.filter((m) => !m.streaming)`).
//   2. Bırakmasaydı bile YAZILMAYACAKTI: diske yazma 600 ms'lik bir debounce
//      ile tetikleniyor ve parçalar ~50 ms aralıklarla geldiği için zamanlayıcı
//      akış boyunca sürekli sıfırlanıyor. Yani akış sırasında hiçbir kayıt
//      çalışmıyor (bkz. AxetCodeHome'daki debounce notu).
//
// Sonuç: kullanıcı geri döndüğünde sorusunu görüyor, cevabın yerinde ise hiçbir
// şey yok — ne metin, ne "yarıda kaldı" notu. Oysa metin KAYIP DEĞİL: axet-code
// cevabı üretirken kendi veritabanına akıtıyor (zaten cevabı oradan okuyoruz,
// bkz. axetChatTui.ts başlığı). Yani kurtarılacak yer belli.
//
// Burada YAZMA yok, yalnızca okuma: ölü bir oturumun veritabanına bakıp o
// prompt'a verilmiş cevabı buluyoruz.
// ---------------------------------------------------------------------------

import {
  findSessionByPrompt,
  matchKey,
  readMessagesSince,
  resolveSessionDb
} from "./axetSessionDb";

export interface RecoveredAnswer {
  text: string;
  /**
   * axet-code turu TAMAMLADI mı?
   *
   * Ayrım kullanıcıya söyleniyor: tamamlanmış bir cevap eksiksizdir, yarıda
   * kalmış olan cümlenin ortasında biter. İkisini aynı görünümde göstermek,
   * kırpılmış bir cevabı tam sanmaya yol açardı — sessiz kaybın yerine sessiz
   * bir yanlış bilgi koymak olurdu.
   */
  finished: boolean;
}

/**
 * Eşleştirme için gereken EN AZ iğne uzunluğu (harf/rakam olarak).
 *
 * Kısa istemler ("selam", "peki") aynı klasördeki başka bir sohbetin
 * oturumuyla eşleşebilir ve o zaman kurtarma, YANLIŞ bir konuşmanın cevabını
 * bu sohbete yapıştırırdı. Kurtaramamak, yanlış kurtarmaktan iyidir.
 */
const MIN_NEEDLE = 16;

/** Prompt'un yazıldığı ana göre geriye alınan pay (saniye). */
const WINDOW_BACK_SEC = 120;

/**
 * `prompt`'a verilmiş cevabı, çalışma klasörünün axet-code veritabanından
 * okur. Bulunamazsa `null` — bu normal bir sonuç, hata değil: tur hiç
 * başlamamış, klasör değişmiş ya da axet-code veritabanı silinmiş olabilir.
 */
export function recoverAnswer(cwd: string, prompt: string, promptAtMs: number): RecoveredAnswer | null {
  if (!cwd) return null;
  const needle = matchKey(prompt).slice(0, 160);
  if (needle.length < MIN_NEEDLE) return null;

  const dbPath = resolveSessionDb(cwd);
  if (!dbPath) return null;

  const sinceSec = Math.floor(promptAtMs / 1000) - WINDOW_BACK_SEC;
  const sessionId = findSessionByPrompt(dbPath, sinceSec, needle);
  // `newestSessionSince`'e DÜŞMÜYORUZ (canlı turda düşülüyor, bkz. axetChatTui):
  // orada hangi sohbetin turu olduğunu zaten biliyoruz, burada bilmiyoruz. En
  // yeni oturumu almak, aynı klasörde açık başka bir sohbetin cevabını buraya
  // taşıma riski demek.
  if (!sessionId) return null;

  let text = "";
  let finished = false;
  let promptSeen = false;
  for (const msg of readMessagesSince(dbPath, sessionId, sinceSec)) {
    // Prompt'un KENDİSİNDEN ÖNCEKİ asistan mesajları bu turun cevabı değil:
    // aynı oturumun önceki turlarına ait. Zaman penceresi geriye 2 dakika
    // alındığı için bu gerçekten olabiliyor.
    if (!promptSeen) {
      if (msg.role !== "user") continue;
      const userText = msg.parts
        .filter((p) => p.type === "text")
        .map((p) => p.data?.text ?? "")
        .join("");
      if (matchKey(userText).includes(needle)) promptSeen = true;
      continue;
    }
    // Prompt'tan SONRA gelen ikinci bir kullanıcı mesajı = sonraki tur.
    if (msg.role === "user") break;
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (part.type === "text") text += part.data?.text ?? "";
      else if (part.type === "finish") finished = true;
    }
  }

  if (!text.trim()) return null;
  return { text, finished };
}
