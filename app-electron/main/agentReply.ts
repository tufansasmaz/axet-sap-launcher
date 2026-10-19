// Ajanın son cevabı (spec 2026-10-18 ajanlar-ux §3). Kaynak YALNIZ kesin
// okuyucu: axet-code oturum veritabanındaki son kullanıcı mesajından sonraki
// asistan metni. Terminal kuyruğu kullanılmıyor: axet-code bir TUI, ekran
// kutusu ANSI temizlense de okunur metin vermiyor (ölçüm:
// .superpowers/ajan-olcum, `tur1.ekranKutu`). Metin gizli süzgecinden
// (destek paketinin `redact`ı) geçiyor ve REPLY_MAX karakterle sınırlı;
// bellekte tutuluyor, diske yazılmıyor.
import { redact } from "./support/redact";
import { learnSummaryLine } from "../shared/learnTasks";

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
  if (chars.length <= max) return safe;
  // Öğrenme görevinin özet satırı cevabın SONUNDA: kesilen önsöz değil o kalsın.
  const mark = learnSummaryLine(safe);
  if (mark) {
    const tail = Array.from(mark).slice(0, Math.floor(max * 0.75)).join("");
    const budget = max - Array.from(tail).length - 2;
    return budget > 0 ? `${chars.slice(0, budget).join("").trimEnd()}…\n${tail}` : tail;
  }
  return `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}
