import type { AppPalette, AppTheme } from "./types";

export type { AppPalette };

// CSS'in OKUNAMADIĞI yerler için renklerin tek kaynağı.
//
// Renklerin asıl yeri `src/index.css`'teki iki yüzey ve sekiz vurgu bloğu. Ama
// üç tüketici CSS değişkenini okuyamıyor:
//   - ana süreç, pencereyi açarken (`BrowserWindow.backgroundColor`) — sayfa
//     henüz yok;
//   - xterm — kendi tuvalini boyuyor;
//   - Ayarlar'daki vurgu kartları — öbür vurgunun ve öbür temanın renklerini
//     göstermeleri gerekiyor, onlar o an sayfada etkin değil.
// Bu tablo onlar için. Değerler CSS ile AYNI olmalı; `tests/themeTokens.test.ts`
// sekiz görünümde `app`/`card`/`accent`'i `--surface-app-rgb` /
// `--surface-card-rgb` / `--accent-500-rgb` ile, terminali koyu yüzey ve
// `--accent-400-rgb` ile karşılaştırıyor.
//
// `app` ve `card` bir temada dört vurgu için aynı (grafit yüzeyler vurgudan
// bağımsız). Terminal iki temada da KOYU: standart ANSI sarı ve yeşil beyaz
// zeminde okunmuyor. İmleci o vurgunun koyu `accent-400`'ü.

export interface ThemeSurface {
  /** Pencere arka planı. */
  app: string;
  /** Kart yüzeyi (vurgu önizlemesi). */
  card: string;
  /** Vurgu dolgusu (vurgu önizlemesi). */
  accent: string;
  terminal: { background: string; foreground: string; cursor: string };
}

const DARK = { app: "#0f1114", card: "#17191c" };
const LIGHT = { app: "#f6f7f8", card: "#ffffff" };

function accentPair(darkAccent: string, lightAccent: string, cursor: string): Record<AppTheme, ThemeSurface> {
  const terminal = { background: DARK.app, foreground: "#ececee", cursor };
  return {
    dark: { ...DARK, accent: darkAccent, terminal },
    light: { ...LIGHT, accent: lightAccent, terminal }
  };
}

export const THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>> = {
  ntt: accentPair("#2574cc", "#1f6fc4", "#5aa2ee"),
  indigo: accentPair("#8b93ff", "#4f55d9", "#a0a6ff"),
  amber: accentPair("#e0a33f", "#9a6210", "#ebb85f"),
  // Renksiz vurgu (kullanıcı isteği, 2026-10-01; grafit turundaki "Saf
  // grafit" yönü): koyuda kırık beyaz, açıkta kömür. Renk yalnız durumlarda.
  graphite: accentPair("#e4e5e8", "#24262b", "#d6d8dd")
};

/** Ayarlar'daki sıra; ilki varsayılan. */
export const PALETTES: readonly AppPalette[] = ["ntt", "indigo", "amber", "graphite"];
const THEMES: readonly AppTheme[] = ["dark", "light"];

/**
 * Kayıtlı ya da adresten gelen vurgu değerini geçerli bir değere çevirir.
 * `"warm"` tasarim/temel dalının Sıcak Nötr'ü; o dal yayımlanmadı ama
 * geliştirme makinelerindeki ayar dosyalarında kalmış olabilir, en yakın
 * vurgu olan Amber'e geçiyor. Bilinmeyen her değer varsayılana (`ntt`)
 * dönüyor: hiçbir CSS bloğuyla eşleşmeyen bir değer sayfayı renksiz bırakırdı.
 */
export function normalizePalette(value: unknown): AppPalette {
  if (value === "warm") return "amber";
  return PALETTES.find((p) => p === value) ?? "ntt";
}

/**
 * Pencere adresindeki `?palette=…&theme=…` sorgusunu okur (ana süreç
 * `loadURL`/`loadFile` sırasında koyuyor). Eksik ya da geçersiz değer
 * varsayılana döner.
 */
export function parseAppearance(search: string): { palette: AppPalette; theme: AppTheme } {
  const params = new URLSearchParams(search);
  const theme = params.get("theme");
  return {
    palette: normalizePalette(params.get("palette")),
    theme: THEMES.find((t) => t === theme) ?? "dark"
  };
}

/**
 * Görünüm (vurgu ya da tema) değiştiyse pencerenin yeni arka plan rengi,
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
  // Tanınmayan vurgu (ekran ana süreçten yeni derlemedeyken olur) kaydı
  // çökertmesin: dosya o an yazılmış oluyor, atarsak ekran "kaydedilmedi" sanıyor.
  return THEME_SURFACES[normalizePalette(after.palette)][after.theme].app;
}
