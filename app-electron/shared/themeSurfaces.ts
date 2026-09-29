import type { AppPalette, AppTheme } from "./types";

export type { AppPalette };

// CSS'in OKUNAMADIĞI yerler için renklerin tek kaynağı.
//
// Renklerin asıl yeri `src/index.css`'teki dört blok. Ama üç tüketici CSS
// değişkenini okuyamıyor:
//   - ana süreç, pencereyi açarken (`BrowserWindow.backgroundColor`) — sayfa
//     henüz yok;
//   - xterm — kendi tuvalini boyuyor;
//   - Ayarlar'daki palet kartları — öbür paletin renklerini göstermeleri
//     gerekiyor, o palet o an sayfada etkin değil.
// Bu tablo onlar için. Değerler CSS ile AYNI olmalı; `tests/themeTokens.test.ts`
// `app`/`card`/`accent`'i CSS'teki `--surface-app-rgb` / `--surface-card-rgb` /
// `--accent-500-rgb` ile karşılaştırıyor.
//
// Terminal açık temada da KOYU kalıyor ama paleti izliyor: standart ANSI sarı
// ve yeşil beyaz zeminde okunmuyor. Bu yüzden `light.terminal` o paletin koyu
// değerleriyle aynı.

export interface ThemeSurface {
  /** Pencere arka planı. */
  app: string;
  /** Kart yüzeyi (palet önizlemesi). */
  card: string;
  /** Vurgu dolgusu (palet önizlemesi). */
  accent: string;
  terminal: { background: string; foreground: string; cursor: string };
}

const INDIGO_TERMINAL = { background: "#121418", foreground: "#e8eaee", cursor: "#8b93ff" };
const WARM_TERMINAL = { background: "#161514", foreground: "#ece9e4", cursor: "#e08a5f" };

export const THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>> = {
  indigo: {
    dark: { app: "#121418", card: "#1b1e24", accent: "#8b93ff", terminal: INDIGO_TERMINAL },
    light: { app: "#f5f6f8", card: "#ffffff", accent: "#4f55d9", terminal: INDIGO_TERMINAL }
  },
  warm: {
    dark: { app: "#161514", card: "#201f1d", accent: "#e08a5f", terminal: WARM_TERMINAL },
    light: { app: "#f6f4f1", card: "#ffffff", accent: "#ad4e24", terminal: WARM_TERMINAL }
  }
};

const PALETTES: readonly AppPalette[] = ["indigo", "warm"];
const THEMES: readonly AppTheme[] = ["dark", "light"];

/**
 * Pencere adresindeki `?palette=…&theme=…` sorgusunu okur (ana süreç
 * `loadURL`/`loadFile` sırasında koyuyor). Eksik ya da geçersiz değer
 * varsayılana döner: hiçbir CSS bloğuyla eşleşmeyen bir değer sayfayı
 * renksiz bırakırdı.
 */
export function parseAppearance(search: string): { palette: AppPalette; theme: AppTheme } {
  const params = new URLSearchParams(search);
  const palette = params.get("palette");
  const theme = params.get("theme");
  return {
    palette: PALETTES.find((p) => p === palette) ?? "indigo",
    theme: THEMES.find((t) => t === theme) ?? "dark"
  };
}

/**
 * Görünüm (palet ya da tema) değiştiyse pencerenin yeni arka plan rengi,
 * değişmediyse `null`. Ana süreç `config:save`'de bununla
 * `BrowserWindow.setBackgroundColor` çağırıyor: açılışta verilen renk,
 * kullanıcı görünümü değiştirdikten sonra da yeniden boyutlanma ve yeniden
 * yükleme anlarında ekranda görünüyor — eski görünümde kalmamalı.
 */
export function windowBackgroundChange(
  before: { palette: AppPalette; theme: AppTheme },
  after: { palette: AppPalette; theme: AppTheme }
): string | null {
  if (before.palette === after.palette && before.theme === after.theme) return null;
  return THEME_SURFACES[after.palette][after.theme].app;
}
