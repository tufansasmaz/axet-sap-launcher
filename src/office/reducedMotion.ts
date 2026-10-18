// "Hareketi azalt" tercihi (spec 2026-10-18 ofis-gorunumu §4). CSS'teki
// @media bloğu ikinci kapı; bu kanca sınıfı hiç vermiyor, böylece test
// edilebiliyor. matchMedia olmayan ortamda (jsdom) hareket serbest sayılıyor.
import { useEffect, useState } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function query(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const list = query();
    if (!list) return;
    const update = () => setReduced(list.matches);
    update();
    // Uygulama açıkken tercih değişirse yeniden başlatmadan uyuluyor.
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return reduced;
}
