import { useEffect, useState } from "react";
import type { AppPalette, AppTheme } from "../../app-electron/shared/types";
import { normalizePalette } from "../../app-electron/shared/themeSurfaces";

// CSS değişkenini okuyamayan bileşenler için (xterm kendi tuvalini boyuyor)
// o an EKRANDAKİ görünüm. Kaynak ayar nesnesi değil `<html>`'in
// nitelikleri: onları `applyAppearance` yazıyor (bkz. src/ui/appearance.ts)
// ve renk ekranda neyse bileşen de onu kullanmalı.

export interface Appearance {
  palette: AppPalette;
  theme: AppTheme;
}

function read(): Appearance {
  const root = document.documentElement;
  return {
    palette: normalizePalette(root.getAttribute("data-palette")),
    theme: root.getAttribute("data-theme") === "light" ? "light" : "dark"
  };
}

export function useAppearance(): Appearance {
  const [appearance, setAppearance] = useState<Appearance>(read);
  useEffect(() => {
    const update = () => {
      const next = read();
      setAppearance((prev) => (prev.palette === next.palette && prev.theme === next.theme ? prev : next));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-theme"] });
    // İlk çizim ile gözlemcinin kurulması arasında değişmiş olabilir.
    update();
    return () => observer.disconnect();
  }, []);
  return appearance;
}
