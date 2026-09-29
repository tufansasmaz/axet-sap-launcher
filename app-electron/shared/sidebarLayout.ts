// Kabuğun kenar çubuğu ölçüleri (grafit, 2026-09-29). Ana süreç config'i
// okurken, arayüz sürüklerken aynı sınırları kullanıyor; iki kopya olsa
// biri ötekinden kayardı.

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 420;
export const SIDEBAR_DEFAULT_WIDTH = 264;
export const SIDEBAR_COLLAPSED_WIDTH = 48;
// Tutamaç odaktayken sol/sağ ok bir adım, Shift ile dört adım.
export const SIDEBAR_KEY_STEP = 8;
export const SIDEBAR_KEY_STEP_LARGE = 32;

// Sayı değilse (elle düzenlenmiş dosya, "300" gibi bir dize) varsayılan;
// sayıysa tam piksele yuvarlanıp sınırlara kırpılıyor.
export function clampSidebarWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));
}

// `sidebarCollapsed` 2026-09-29'da Sohbet'in `chatSidebarOpen` ayarının
// yerini aldı. Yeni alan yoksa eski alan `false` ise (kullanıcı listeyi
// kapalı açılsın diye ayarlamış) daraltılmış başlıyor.
export function readSidebarCollapsed(parsed: Record<string, unknown>): boolean {
  if (typeof parsed.sidebarCollapsed === "boolean") return parsed.sidebarCollapsed;
  return parsed.chatSidebarOpen === false;
}
