/** Boştaki sistemin sunucusunu kapatma eşiği (dk; 0 = kapalı). Bkz. main/systemSleep.ts. */
export const SYSTEM_SLEEP_DEFAULT = 30;
export const SYSTEM_SLEEP_OPTIONS = [0, 15, 30, 60, 120] as const;

export function normalizeSystemSleepMinutes(value: unknown): number {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && (SYSTEM_SLEEP_OPTIONS as readonly number[]).includes(n) ? n : SYSTEM_SLEEP_DEFAULT;
}
