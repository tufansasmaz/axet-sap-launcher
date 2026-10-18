// Ofis çizim paketi (LimeZu "Modern Interiors", ücretsiz sürüm). Paket lisans
// gereği depoda DEĞİL: src/assets/office-art gitignore'da, kullanıcı kendi
// makinesine koyuyor. Klasör yoksa glob boş döner, artManifest null verir ve
// ofis elle çizilmiş yedeğe (officeSprites/officeCanvas) düşer. Atlas (saf
// veri) officeAtlas.ts'te; burada yalnız sayfaları yükleyen kanca.
import { useEffect, useState } from "react";
import { CHARACTERS, RUBBER, artManifest, type CharacterName, type RubberName } from "./officeAtlas";

export * from "./officeAtlas";

export interface OfficeArt {
  room: CanvasImageSource;
  interiors: CanvasImageSource;
  characters: Record<CharacterName, { idle: CanvasImageSource; run: CanvasImageSource; phone: CanvasImageSource }>;
  /** Rubber Studio parçaları; yoksa null (yerine LimeZu ya da elle çizilmiş). */
  rubber?: Record<RubberName, CanvasImageSource> | null;
  /** Pixel Life (Christian Perich) masa üstü eşyaları; yoksa null. */
  pixelLife?: CanvasImageSource | null;
}

function globUrls(): Record<string, string> {
  try {
    return import.meta.glob<string>("../assets/office-art/**/*.png", { eager: true, query: "?url", import: "default" });
  } catch {
    return {};
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });
}

let loading: Promise<OfficeArt | null> | null = null;
let override: { art: OfficeArt | null } | null = null;

/** Paketi bir kez yükler; yoksa ya da yüklenemezse null. */
export function loadOfficeArt(): Promise<OfficeArt | null> {
  if (override) return Promise.resolve(override.art);
  if (loading) return loading;
  const manifest = typeof Image === "undefined" ? null : artManifest(globUrls());
  if (!manifest) return (loading = Promise.resolve(null));
  loading = (async () => {
    try {
      const [roomImg, interiorsImg] = await Promise.all([loadImage(manifest.room), loadImage(manifest.interiors)]);
      const characters = {} as OfficeArt["characters"];
      for (const c of CHARACTERS) {
        const m = manifest.characters[c];
        const [idle, run, phone] = await Promise.all([loadImage(m.idle), loadImage(m.run), loadImage(m.phone)]);
        characters[c] = { idle, run, phone };
      }
      let rubber: Record<RubberName, CanvasImageSource> | null = null;
      if (manifest.rubber) {
        const urls = manifest.rubber;
        try {
          const images = await Promise.all(RUBBER.map((n) => loadImage(urls[n])));
          rubber = Object.fromEntries(RUBBER.map((n, i) => [n, images[i]])) as Record<RubberName, CanvasImageSource>;
        } catch {
          rubber = null;
        }
      }
      const pixelLife = manifest.pixelLife ? await loadImage(manifest.pixelLife).catch(() => null) : null;
      return { room: roomImg, interiors: interiorsImg, characters, rubber, pixelLife };
    } catch {
      return null;
    }
  })();
  return loading;
}

/** Testler için: paketi elle ver (ya da null ile yedeği zorla); undefined eski hâline döndürür. */
export function setOfficeArtForTests(art: OfficeArt | null | undefined) {
  override = art === undefined ? null : { art };
  loading = null;
}

export function useOfficeArt(): OfficeArt | null {
  const [art, setArt] = useState<OfficeArt | null>(() => override?.art ?? null);
  useEffect(() => {
    let alive = true;
    void loadOfficeArt().then((a) => {
      if (alive) setArt(a);
    });
    return () => {
      alive = false;
    };
  }, []);
  return art;
}
