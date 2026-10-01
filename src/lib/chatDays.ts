// Sohbetteki gün ayırıcıları — hangi mesajın önüne satır girdiği ve satırda
// ne yazdığı. Gün, kullanıcının YEREL günü: gece yarısından sonraki mesaj
// yeni günün mesajı.
import type { AppLanguage } from "../../app-electron/shared/types";
import type { TranslateFn } from "../i18n";

function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Dün = bugünün başından bir TAKVİM günü geri; 24 saat çıkarmak yaz saatinin
// değiştiği gün yanlış güne düşerdi.
function yesterdayStart(now: number): number {
  const d = new Date(dayStart(now));
  d.setDate(d.getDate() - 1);
  return d.getTime();
}

/**
 * `prev` = bir önceki mesajın zamanı (ilk mesajda yok). İlk mesajın önüne
 * satır yalnızca bugünden eskiyse giriyor: tek günlük, bugünkü bir sohbette
 * "Bugün" başlığı bilgi değil gürültü. Zamanı bilinmeyen (`0`) mesaj
 * satır doğurmuyor — eski kayıtlarda 1970 yazardı.
 */
export function daySeparatorBefore(prev: number | undefined, cur: number, now: number): boolean {
  if (!cur) return false;
  if (prev === undefined) return dayStart(cur) !== dayStart(now);
  if (!prev) return false;
  return dayStart(prev) !== dayStart(cur);
}

export function dayLabel(ts: number, now: number, t: TranslateFn, language: AppLanguage): string {
  const day = dayStart(ts);
  if (day === dayStart(now)) return t("time.today");
  if (day === yesterdayStart(now)) return t("time.yesterday");
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric"
  }).format(ts);
}
