// Sistem kartındaki "Yorum / Not" alanında şifreye benzeyen içerik.
//
// Ölçülen olay (kararlilik-2): bir kullanıcı SAP şifresini notun içine düz
// metin yazmıştı; not, sistem seçilince ekranda herkesin görebileceği yerde
// açık duruyordu. Veri SİLİNMİYOR (kullanıcının kendi notu), yalnızca
// gösterimde maskeleniyor ve kaydederken uyarı veriliyor.
//
// İki işaret:
//   1. Anahtar sözcük: "şifre: x", "password=x", "pwd x", "parola - x" …
//      Satırda yalnız anahtar sözcük varsa ("Şifre:") değer bir alt satırdadır.
//   2. Kullanıcı satırının hemen altındaki tek kelimelik satır: insanlar
//      kimlik bilgisini çoğunlukla "kullanıcı\nşifre" diye alt alta yazıyor.
//      Kullanıcı satırı "kullanıcı/user" sözcüğüyle ya da sistemin bilinen
//      kullanıcı adıyla tanınıyor.

const KEYWORD = String.raw`(?:şifre|sifre|şifresi|sifresi|parola|password|passwort|passwd|pwd|pass|pw)`;
// Anahtar sözcük + ayraç + değer. Değer satırın kalanı (boşluk dahil): şifre
// boşluk içermez ama yanında not olabilir; fazla maskelemek az maskelemekten iyi.
// `\b` Türkçe harfleri ("Ş", "ı") kelime saymıyor; sınırı harf/rakam ile kuruyoruz.
const B0 = String.raw`(?<![\p{L}\p{N}])`;
const B1 = String.raw`(?![\p{L}\p{N}])`;
const RE_INLINE = new RegExp(String.raw`^(.*?${B0}${KEYWORD}${B1}\s*(?:[:=\-–>]+\s*|\s+))(\S.*)$`, "iu");
const RE_KEYWORD_ONLY = new RegExp(String.raw`^\s*${KEYWORD}\s*[:=\-–]?\s*$`, "iu");
const RE_USER_LINE = new RegExp(String.raw`${B0}(?:kullanıcı|kullanici|user(?:name)?|uname|usr|login)${B1}`, "iu");

export const SECRET_MASK = "••••••••";

export interface MaskedNote {
  text: string;
  /** Maskelenen değer sayısı; 0 ise not olduğu gibi döner. */
  count: number;
}

function isSingleToken(line: string): boolean {
  const s = line.trim();
  return s.length >= 4 && s.length <= 64 && !/\s/.test(s);
}

function isUserLine(line: string, username: string): boolean {
  if (RE_USER_LINE.test(line)) return true;
  const u = username.trim().toLowerCase();
  if (!u) return false;
  return line.toLowerCase().split(/[\s:=,;]+/).includes(u);
}

export function maskNoteSecrets(text: string, username = ""): MaskedNote {
  const lines = text.split(/\r?\n/);
  let count = 0;
  let maskNext = false;
  const out = lines.map((line, i) => {
    if (maskNext && line.trim()) {
      maskNext = false;
      if (!RE_INLINE.test(line) && !RE_KEYWORD_ONLY.test(line)) {
        count += 1;
        return line.replace(/\S.*$/, SECRET_MASK);
      }
    }
    if (RE_KEYWORD_ONLY.test(line)) {
      maskNext = true;
      return line;
    }
    const inline = RE_INLINE.exec(line);
    if (inline) {
      count += 1;
      return `${inline[1]}${SECRET_MASK}`;
    }
    // Kullanıcı satırının altındaki tek kelime. Sonraki satır kendisi bir
    // anahtar satırıysa yukarıdaki kurallar onu zaten ele alıyor.
    const next = lines[i + 1];
    if (next !== undefined && isUserLine(line, username) && isSingleToken(next) && !isUserLine(next, username)) {
      maskNext = true;
    }
    return line;
  });
  return count > 0 ? { text: out.join("\n"), count } : { text, count: 0 };
}

export function noteHasSecrets(text: string, username = ""): boolean {
  return maskNoteSecrets(text, username).count > 0;
}
