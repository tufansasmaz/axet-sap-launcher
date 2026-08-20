import type { TranslateFn } from "../i18n";

export function formatRelativeTime(iso: string, t: TranslateFn): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return t("time.justNow");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("time.minutesAgo", { count: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t("time.hoursAgo", { count: diffHour });
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return t("time.daysAgo", { count: diffDay });
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return t("time.monthsAgo", { count: diffMonth });
  const diffYear = Math.floor(diffMonth / 12);
  return t("time.yearsAgo", { count: diffYear });
}
