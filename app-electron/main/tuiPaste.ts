// İstemi axet-code'un TUI'sine YAPIŞTIRARAK yazmak (bracketed paste).
//
// Neden: tuş tuş yazılan istemde axet-code her karakterde giriş kutusunu
// yeniden hesaplıyor; maliyet metin boyuyla karesel büyüyor. Ölçüm
// (2026-10-06, yerel axet-code, Enter'a basılmadan): 13.000 karakter tuş tuş
// 215 sn / 239 sn işlemci, yapıştırarak 2 sn. Sahada 10-20 bin karakterlik
// istemler (tohumlama, bağlam önsözü) axet-code'a medyan 183 sn sonra
// ulaşıyordu; kullanıcı bunu "kısa bir şeye bile dakikalarca düşünüyor" diye
// gördü.
//
// İki ölçülmüş tuzak parçalamayı belirliyor:
//   - ~10 satırdan uzun TEK yapıştırmayı axet-code `paste_1.txt` ekine
//     çeviriyor; metin kutuya hiç düşmüyor (ve istemin veritabanına inişini
//     izleyen iğne onu bulamaz). Yapıştırma başına en fazla MAX_LINES satır
//     sonu.
//   - Yapıştırmanın sonundaki satır sonu kırpılabiliyor: hiçbir yapıştırma
//     satır sonuyla bitmiyor. Sona denk gelen satır sonları yapıştırmanın
//     DIŞINDA, düz tuş olarak gidiyor (TUI'de `\n` = ctrl+j = yeni satır; tuş
//     tuş yolda birebir doğru çıktığı ölçüldü). Bunlar yalnızca parça
//     sınırında ve boş satır dizilerinde oluyor — birkaç tuş, maliyeti yok.
// Bu kurallarla 128 satır / 13.000 karakterin kutuya birebir düştüğü
// axet-code'un "harici düzenleyicide aç" çıktısıyla doğrulandı. Tek fark
// sekme: yapıştırmada 4 boşluk oluyor (tuş tuş yolda sekme odak değiştirip
// tamamen kayboluyordu).

export const PASTE_START = "\x1b[200~";
export const PASTE_END = "\x1b[201~";

/** 10'da ek dosyaya dönüşme ölçüldü; pay bırakılıyor. */
const MAX_LINES = 8;
/** Tek satırda 13.000 karakter sorunsuzdu; yine de sınırsız bırakılmıyor. */
const MAX_CHARS = 2000;

export interface PasteSegment {
  /** `true`: yapıştırma olarak gider; `false`: yalnızca satır sonları, düz tuş. */
  paste: boolean;
  text: string;
}

/**
 * Metni yapıştırma ve düz satır sonu parçalarına böler. Parçaların metinleri
 * birleşince metnin kendisi çıkıyor; hiçbir yapıştırma satır sonuyla
 * bitmiyor ya da boş değil, hiçbirinde MAX_LINES'tan fazla satır sonu ya da
 * MAX_CHARS'tan fazla karakter yok, vekil çiftler (emoji) bölünmüyor.
 */
export function pasteSegments(text: string, maxLines = MAX_LINES, maxChars = MAX_CHARS): PasteSegment[] {
  const out: PasteSegment[] = [];
  let cur: string[] = [];
  let lines = 0;
  const keys = (count: number) => {
    if (count <= 0) return;
    const last = out[out.length - 1];
    // Ardışık düz parçalar birleşiyor: aynı şey, tek yazma.
    if (last && !last.paste) last.text += "\n".repeat(count);
    else out.push({ paste: false, text: "\n".repeat(count) });
  };
  /**
   * Biriken parçayı yapıştırma olarak çıkarır. Sondaki satır sonları
   * yapıştırmada kalamaz; `carry` true ise SONRAKİ yapıştırmanın başına
   * taşınıyor (düz tuş her basışta koca kutuyu yeniden hesaplatıyor —
   * 772 satırlık ölçümde 2 sn → 38 sn). Taşınamayan fazlası düz tuş.
   */
  const flush = (carry: boolean) => {
    let end = cur.length;
    while (end > 0 && cur[end - 1] === "\n") end -= 1;
    const trailing = cur.length - end;
    if (end > 0) out.push({ paste: true, text: cur.slice(0, end).join("") });
    // Yeni parçada en az bir satır sonuna (gelen karakter olabilir) yer kalsın.
    const kept = carry ? Math.min(trailing, maxLines - 1) : 0;
    keys(trailing - kept);
    cur = Array.from({ length: kept }, () => "\n");
    lines = kept;
  };
  for (const ch of text) {
    if (cur.length >= maxChars || (ch === "\n" && lines >= maxLines)) flush(true);
    cur.push(ch);
    if (ch === "\n") lines += 1;
  }
  flush(false);
  return out;
}

/** pty'ye sırayla yazılacak diziler. Enter (`\r`) DAHİL DEĞİL: onu çağıran,
 *  son parçadan sonra ayrıca yazıyor — yapıştırmanın içindeki `\r` gönderim
 *  değil, metin sayılırdı. */
export function pasteSequence(text: string): string[] {
  return pasteSegments(text).map((s) => (s.paste ? `${PASTE_START}${s.text}${PASTE_END}` : s.text));
}
