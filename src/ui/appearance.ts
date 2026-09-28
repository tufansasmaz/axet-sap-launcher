import type { AppPalette, AppTheme } from "../../app-electron/shared/types";

// `<html>`'e palet ve temayı yazan TEK yer. İki çağıran var: `src/main.tsx`
// (React çizilmeden önce, pencere adresindeki sorgudan) ve `App.tsx` (ayar
// değişince). İkisi aynı fonksiyonu kullanmasa ilk boyama ile sonraki hâl
// birbirinden sessizce ayrışabilirdi.
//
// `theme-transition` (bkz. src/index.css) yalnızca `animate` doğruyken ve
// yalnızca 260ms ekleniyor: sayfadaki her öğeye renk geçişi koyuyor, kalıcı
// olsa bedeli her hover'da ödenirdi.

const TRANSITION_MS = 260;

export function applyAppearance(
  root: HTMLElement,
  palette: AppPalette,
  theme: AppTheme,
  animate: boolean
): () => void {
  if (!animate) {
    root.setAttribute("data-palette", palette);
    root.setAttribute("data-theme", theme);
    return () => {};
  }
  root.classList.add("theme-transition");
  root.setAttribute("data-palette", palette);
  root.setAttribute("data-theme", theme);
  const timer = window.setTimeout(() => root.classList.remove("theme-transition"), TRANSITION_MS);
  return () => {
    window.clearTimeout(timer);
    root.classList.remove("theme-transition");
  };
}
