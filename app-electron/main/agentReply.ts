// Ajanın son cevabı (spec 2026-10-18 ajanlar-ux §3). Kaynak YALNIZ kesin
// okuyucu: axet-code oturum veritabanındaki son kullanıcı mesajından sonraki
// asistan metni. Terminal kuyruğu kullanılmıyor: axet-code bir TUI, ekran
// kutusu ANSI temizlense de okunur metin vermiyor (ölçüm:
// .superpowers/ajan-olcum, `tur1.ekranKutu`). Metin gizli süzgecinden
// (destek paketinin `redact`ı) geçiyor ve REPLY_MAX karakterle sınırlı;
// bellekte tutuluyor, diske yazılmıyor.
import { redact } from "./support/redact";

export const REPLY_MAX = 600;

/** ANSI kaçışlarını ve denetim karakterlerini atar; satır sonları kalır. */
function clean(text: string): string {
  return text
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b[\\])/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
}

/**
 * Cevap metninden kartta gösterilecek özet: boşluklar sadeleşir, ardışık boş
 * satırlar teke iner, gizliler maskelenir, en çok REPLY_MAX karakter (sonu "…").
 * Boş ya da yalnız boşluksa "".
 */
export function replySnippet(raw: string, max = REPLY_MAX): string {
  const lines = clean(raw)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd());
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";
  // Önce süz, sonra kes: kesik bir anahtar=değer kalıbı süzgeçten kaçmasın.
  const safe = redact(text, []).text;
  const chars = Array.from(safe);
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : safe;
}
