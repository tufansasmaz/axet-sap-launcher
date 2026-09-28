# Tasarım Sistemi Temeli — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Limon yeşilini bırakıp iki paletli (Sakin İndigo, Sıcak Nötr) × koyu/açık dört görünümlü, ferah ölçekli, ortak parçalı bir tasarım sistemi kurmak; beş pencereyi yeni ortak `Modal`'a taşımak; Ayarlar'a Görünüm bölümü eklemek.

**Mimari:** Renkler `src/index.css`'te dört açık CSS bloğu olarak duruyor; bir test bu blokları okuyup kontrastı ölçüyor. Ölçüler Tailwind ölçeğinin kendisi değiştirilerek geliyor (bileşenlere dokunmadan). Pencere arka planı ve terminal renkleri için tek kaynak `app-electron/shared/themeSurfaces.ts`. Ortak parçalar `src/ui/` altında; yeni paket yok.

**Teknoloji:** Electron + React 18 + TypeScript + Tailwind 3, test için vitest (+ jsdom, @testing-library/react), xterm.

**Spec:** `docs/superpowers/specs/2026-09-28-tasarim-sistemi-temeli-design.md` — plan bu belgeye dayanıyor; ikisi çelişirse spec geçerli.

## Genel Kurallar

- Dal: `tasarim/temel`. Push, merge, sürüm artırma YOK (her biri ayrıca onay istiyor).
- Yeni npm paketi eklenmiyor.
- Eski limon değerleri (`183 243 74`, `169 225 63`, `155 209 48`, `#a9e13f`, `#b7f34a`) `src/` ve `app-electron/` altında hiçbir `.ts/.tsx/.css` dosyasında kalmıyor.
- Tailwind'e giden renkler `"R G B"` tripleti olarak yazılıyor (bkz. `tailwind.config.js` `withOpacity`); `#hex` yalnızca doğrudan CSS'e giden `--*-text` gibi değişkenlerde.
- Yeni kodda `text-[Npx]` yazılmıyor; `text-2xs/xs/sm/base/lg/xl/2xl` kullanılıyor. Cırcır sınırı 205.
- Arka plan (scrim) tıklaması hiçbir pencereyi kapatmıyor.
- Kod yorumları Türkçe ve tam Türkçe karakterli (ç, ğ, ı, ö, ş, ü). Commit mesajları ASCII Türkçe ve şu satırla bitiyor: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- `git add` dosya dosya; `git add -A` / `git add .` YOK. Prettier çalıştırılmıyor.
- Var olan dosyalar CRLF; düzenlerken satır sonlarını değiştirme. Testler dosya okurken `.replace(/\r\n/g, "\n")` yapıyor.
- Test çalıştırma: tek dosya `npx vitest run tests/<ad>`; hepsi `npm test`; tip denetimi `npm run typecheck`.
- `tests/**/*.ts` dosyaları `tsconfig.node.json` ile denetleniyor: `src/`'den import ETMEZ, gerekiyorsa dosyayı metin olarak okur. `src/`'yi import eden testler `.tsx` olur ve ilk satırı `// @vitest-environment jsdom`'dur.
- jsdom testlerinde jest-dom yok: `hasAttribute`, `getAttribute`, `toBeTruthy`, `toBeNull` kullan. Her `.tsx` testi `afterEach(cleanup)` çağırır ve bileşeni `<LanguageProvider language="tr">` (kaynak `src/i18n`) içinde çizer.
- `tests/dialogDataLoss.test.tsx` (10 test) hiç değiştirilmeden yeşil kalıyor.

## Gözden Geçirme Odağı

Kullanıcıyı en çok ısırabilecek, spec'in ima ettiği ama kolayca gözden kaçan beş durum. Her birinin testi sahibi olan görevde yazılı.

1. `config.json`'da eski ya da geçersiz bir `palette`/`theme` değeri (ör. `"blue"`, `"lime"`) varsa uygulama boş/bozuk renkle açılmıyor, varsayılana (`indigo` / `dark`) dönüyor. → Görev 2, `tests/appearanceConfig.test.ts`.
2. Değişiklik yapılmış bir pencerenin üstünde "Değişiklikleri at?" onayı açıkken Escape yalnızca onayı kapatıyor; alttaki pencere ve yazılanlar yerinde kalıyor. → Görev 5, `tests/modal.test.tsx`.
3. Pencere açıkken odak pencerenin DIŞINDAYKEN (ör. açan düğmede kaldıysa) Escape yine çalışıyor. → Görev 5.
4. Tab ile gezinirken devre dışı (`disabled`) düğmeler atlanıyor; odak pencereden kaçmıyor. → Görev 5.
5. Pencereyi açan öğe pencere açıkken ekrandan kaldırıldıysa, kapanışta odak geri verilirken hata fırlamıyor ve DOM dışındaki öğeye odaklanılmıyor. → Görev 5.

---

### Görev 1: Ferah ölçekler, bildirim katmanı ve düğme boyları

Tailwind'in yazı, köşe, katman ve gölge ölçekleri yeniden tanımlanıyor; var olan sınıflar (`text-sm`, `rounded-xl`…) bileşenlere dokunmadan yeni değere kayıyor. Bildirim kutusu açık pencerelerin üstüne çıkıyor. Düğme boyları 32/36/40px oluyor.

**Dosyalar:**
- Değiştir: `tailwind.config.js` (`theme.extend` içi; `borderRadius` bloğu ve üstündeki yorum)
- Değiştir: `src/ui/buttons.ts:23-25` (başlık yorumu), `:54-56` (`SIZE`), `:62-64` (`ICON_SIZE`), `:155`, `:157`, `:163` (yorumlar)
- Değiştir: `src/App.tsx` — bildirim kutusu (`fixed bottom-4 right-4 z-50 …`, yaklaşık satır 1519)
- Test: `tests/designScale.test.ts` (yeni)

**Arayüzler:**
- Tüketir: yok.
- Üretir:
  - Tailwind sınıfları: `text-2xs` (11px), `text-xs` (12.5px), `text-sm` (14px), `text-base` (15px), `text-lg` (17px), `text-xl` (20px), `text-2xl` (24px); `z-dropdown` (40), `z-modal` (50), `z-confirm` (60), `z-critical` (70), `z-toast` (80); `shadow-elev-1/2/3` (`var(--elev-N)` — değişkenler Görev 3'te geliyor); köşe `rounded-sm` 6 · `rounded`/`rounded-md` 8 · `rounded-lg` 10 · `rounded-xl` 12 · `rounded-2xl` 16 · `rounded-3xl` 20.
  - `btn(variant, size)` boyları: `sm` 32px (`h-8`), `md` 36px (`h-9`), `lg` 40px (`h-10`). `DIALOG_*_BUTTON` sabitleri `lg` olduğu için 40px.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/designScale.test.ts`:

```ts
// Ferah ölçekler (tasarım sistemi temeli, 2026-09-28; spec §5).
//
// Ölçeğin KENDİSİ değiştiriliyor, bileşenler değil: `text-sm` her yerde 14px,
// `rounded-xl` her yerde 12px oluyor. Bu test ölçeği sabitliyor; biri bir
// değeri "bir kereliğine" değiştirirse bütün uygulama kayar ve test kırılır.
//
// Cırcır: elle yazılmış `text-[Npx]` sayısı yalnızca AZALABİLİR. Ekranlar 2.
// alt projede ölçeğe taşınana kadar yeni bir tane eklenmesin diye var.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import config from "../tailwind.config.js";

const SRC = path.join(__dirname, "..", "src");
const extend = (config as unknown as { theme: { extend: Record<string, unknown> } }).theme.extend;

function read(...parts: string[]): string {
  return readFileSync(path.join(SRC, ...parts), "utf8").replace(/\r\n/g, "\n");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("Ferah ölçekler", () => {
  it("köşe merdiveni: kontrol 8, kart/pencere 12", () => {
    expect(extend.borderRadius).toEqual({
      sm: "6px",
      DEFAULT: "8px",
      md: "8px",
      lg: "10px",
      xl: "12px",
      "2xl": "16px",
      "3xl": "20px"
    });
  });

  it("yazı merdiveni: gövde 14px, satır aralığı gövdede 1.5, başlıkta 1.3", () => {
    expect(extend.fontSize).toEqual({
      "2xs": ["11px", { lineHeight: "1.5" }],
      xs: ["12.5px", { lineHeight: "1.5" }],
      sm: ["14px", { lineHeight: "1.5" }],
      base: ["15px", { lineHeight: "1.5" }],
      lg: ["17px", { lineHeight: "1.3" }],
      xl: ["20px", { lineHeight: "1.3" }],
      "2xl": ["24px", { lineHeight: "1.3" }]
    });
  });

  it("katmanlar: bildirim her pencerenin üstünde", () => {
    expect(extend.zIndex).toEqual({ dropdown: "40", modal: "50", confirm: "60", critical: "70", toast: "80" });
  });

  it("gölgeler tema değişkenlerinden geliyor", () => {
    expect(extend.boxShadow).toEqual({
      "elev-1": "var(--elev-1)",
      "elev-2": "var(--elev-2)",
      "elev-3": "var(--elev-3)"
    });
  });
});

describe("düğme boyları", () => {
  const src = read("ui", "buttons.ts");

  it("sm 32px, md 36px, lg 40px", () => {
    expect(src).toContain('sm: "h-8 gap-1.5 px-3 text-xs"');
    expect(src).toContain('md: "h-9 gap-2 px-3.5 text-[13px]"');
    expect(src).toContain('lg: "h-10 gap-2 px-4 text-sm"');
  });

  it("ikon düğmeleri kare kalıyor", () => {
    expect(src).toContain('sm: "h-8 w-8"');
    expect(src).toContain('md: "h-9 w-9"');
    expect(src).toContain('lg: "h-10 w-10"');
  });
});

describe("bildirim katmanı", () => {
  it("bildirim kutusu z-toast'ta (açık pencerelerin arkasında kalmıyor)", () => {
    expect(read("App.tsx")).toContain("fixed bottom-4 right-4 z-toast");
  });
});

describe("cırcır: elle yazılmış px yazı boyu", () => {
  it("205'i geçmiyor", () => {
    let count = 0;
    for (const file of walk(SRC)) {
      count += (readFileSync(file, "utf8").match(/text-\[[0-9.]+px\]/g) ?? []).length;
    }
    expect(count).toBeLessThanOrEqual(205);
  });
});
```

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/designScale.test.ts`
Beklenen: FAIL — köşe merdiveni (`sm: "4px"` geliyor), yazı/katman/gölge (`undefined`), düğme boyları, `z-toast` bulunamadı ve cırcır (207 > 205).

- [ ] **Adım 3: `tailwind.config.js`'i değiştir**

`borderRadius` bloğunun üstündeki yorumda şu iki satırı:

```js
      // Tailwind'in varsayılan 2/4/6/8/12/16/24 merdiveni 4/6/6/8/10/12/16'ya
      // çekildi. Sonuç: hiçbir bileşene dokunmadan tüm uygulama aynı dile
```

şununla değiştir:

```js
      // Tailwind'in varsayılan 2/4/6/8/12/16/24 merdiveni önce 4/6/6/8/10/12/16'ya
      // çekildi; 2026-09-28'de "Ferah" yoğunlukla 6/8/8/10/12/16/20 oldu
      // (kontrol 8px, kart ve pencere 12px). Sonuç: hiçbir bileşene dokunmadan tüm uygulama aynı dile
```

`borderRadius` nesnesini ve ardından gelecek yeni ölçekleri şöyle yaz (`borderRadius: { … }` bloğunun tamamının yerine):

```js
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px"
      },
      // Yazı ölçeği de aynı yolla: sınıf adları aynı, değerler "Ferah"
      // yoğunluğa göre (spec §5). Gövde 14px (`text-sm`); `text-2xs` yalnızca
      // çip ve küçük etiketler için. Satır aralığı gövdede 1.5, başlıklarda 1.3.
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.5" }],
        xs: ["12.5px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.5" }],
        lg: ["17px", { lineHeight: "1.3" }],
        xl: ["20px", { lineHeight: "1.3" }],
        "2xl": ["24px", { lineHeight: "1.3" }]
      },
      // Katmanlar adla: `z-[60]` gibi elle yazılmış sayılar hangi pencerenin
      // hangisinin üstünde durduğunu okunmaz yapıyordu. Bildirim (`toast`) en
      // üstte — eskiden `z-50`'deydi ve açık bir pencerenin ARKASINDA kalıyordu.
      zIndex: {
        dropdown: "40",
        modal: "50",
        confirm: "60",
        critical: "70",
        toast: "80"
      },
      // Gölge değerleri temaya göre değişiyor (koyu ve açık ayrı), bu yüzden
      // CSS değişkeninden okunuyor; bkz. src/index.css `--elev-*`.
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
        "elev-3": "var(--elev-3)"
      }
```

- [ ] **Adım 4: `src/ui/buttons.ts`'i değiştir**

Başlık yorumundaki üç satırı:

```ts
//   sm → h-7  (28px) · 11px yazı · araç panelleri, satır içi eylemler
//   md → h-8  (32px) · 12px yazı · panel/modal üst şeritleri, form eylemleri
//   lg → h-9  (36px) · 13px yazı · modal ayak düğmeleri, birincil eylemler
```

şununla değiştir:

```ts
//   sm → h-8  (32px) · 12.5px yazı · araç panelleri, satır içi eylemler
//   md → h-9  (36px) · 13px yazı   · panel/modal üst şeritleri, form eylemleri
//   lg → h-10 (40px) · 14px yazı   · modal ayak düğmeleri, birincil eylemler
//   (2026-09-28 "Ferah" yoğunluk; öncesi 28/32/36px.)
```

`SIZE` ve `ICON_SIZE`:

```ts
const SIZE: Record<BtnSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-3.5 text-[13px]",
  lg: "h-10 gap-2 px-4 text-sm",
};
```

```ts
const ICON_SIZE: Record<BtnSize, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};
```

`TOOL_BUTTON`, `ICON_BUTTON` ve `PRIMARY_BUTTON`'ın üstündeki `/** … (28px). */` yorumlarında `(28px)` → `(32px)`. `GHOST_ICON_BUTTON` (24px) değişmiyor.

- [ ] **Adım 5: Bildirim kutusunu `z-toast`'a taşı**

`src/App.tsx`'te `fixed bottom-4 right-4 z-50 flex flex-col gap-2` geçen sınıf dizisinde yalnızca `z-50` → `z-toast`. Kontrol: `grep -n "fixed bottom-4 right-4" src/App.tsx` tek satır vermeli.

- [ ] **Adım 6: Testin geçtiğini gör**

Çalıştır: `npx vitest run tests/designScale.test.ts`
Beklenen: PASS (7 test).

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Adım 7: Commit**

```bash
git add tailwind.config.js src/ui/buttons.ts src/App.tsx tests/designScale.test.ts
git commit -m "Tasarim: Ferah olcekler, z-toast ve 32/36/40 dugme boylari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Palet ayarı ve `<html>` nitelikleri

`AppConfig`'e `palette` ekleniyor; eski/geçersiz değerler varsayılana dönüyor. Ana süreç seçimi pencere adresine sorgu olarak koyuyor, `src/main.tsx` React çizilmeden önce `<html data-palette data-theme>`'i yazıyor, `App.tsx` ayar değişince aynı işi 260ms'lik yumuşak geçişle yapıyor. Bu görevden sonra CSS henüz eski iki bloğu kullanıyor (onlar yalnız `data-theme`'e bakıyor), yani uygulama her adımda çalışır durumda kalıyor.

**Dosyalar:**
- Değiştir: `app-electron/shared/types.ts:306` (`AppTheme`'in altına `AppPalette`), `:349` (`theme: AppTheme;`'in altına `palette`)
- Değiştir: `app-electron/main/store.ts` (tip importu `:8-18`, `VALID_*` sabitleri `:22-26`, varsayılan `theme: "dark",` `:94`, `loadConfig` doğrulaması `:155-168`)
- Oluştur: `app-electron/shared/themeSurfaces.ts`
- Oluştur: `src/ui/appearance.ts`
- Değiştir: `src/main.tsx`
- Değiştir: `src/App.tsx:316-335` (tema efekti), import bloğu (`:63` civarı)
- Değiştir: `app-electron/main/index.ts` — `createWindow()` başı (`:250`) ve `loadURL`/`loadFile` (`:373-377`)
- Test: `tests/appearanceConfig.test.ts` (yeni), `tests/themeSurfaces.test.ts` (yeni), `tests/appearance.test.tsx` (yeni), `tests/windowGuard.test.ts` (bir `it` eklenir)

**Arayüzler:**
- Tüketir: yok.
- Üretir:
  - `app-electron/shared/types.ts`: `export type AppPalette = "indigo" | "warm";` ve `AppConfig.palette: AppPalette`.
  - `app-electron/shared/themeSurfaces.ts`:
    - `export type { AppPalette }` (types'tan yeniden dışa aktarım)
    - `export interface ThemeSurface { app: string; card: string; accent: string; terminal: { background: string; foreground: string; cursor: string } }` — hepsi `"#rrggbb"`
    - `export const THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>>`
    - `export function parseAppearance(search: string): { palette: AppPalette; theme: AppTheme }` — geçersiz/eksik değerde `indigo` / `dark`
  - `src/ui/appearance.ts`: `export function applyAppearance(root: HTMLElement, palette: AppPalette, theme: AppTheme, animate: boolean): () => void` — döndürdüğü fonksiyon temizlik (efektten `return` edilir).
  - `app-electron/main/index.ts` `createWindow()` içinde `const cfg = loadConfig();` (Görev 4 `backgroundColor` için bunu kullanıyor).

- [ ] **Adım 1: Ayar testini yaz**

`tests/appearanceConfig.test.ts`:

```ts
// Görünüm ayarı: palet + koyu/açık (tasarım sistemi temeli, 2026-09-28).
//
// `palette` alanı bu sürümde eklendi; eski `config.json` dosyalarında HİÇ
// yok. Geçersiz bir değer (elle düzenlenmiş dosya, ileride kaldırılmış bir
// palet) doğrudan `<html data-palette>`'e gidiyor ve hiçbir CSS bloğuyla
// eşleşmezse uygulama renksiz açılır — bu yüzden okurken doğrulanıyor.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-"));
  vi.resetModules();
});

async function load(raw: Record<string, unknown> | null) {
  if (raw) writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  const { loadConfig } = await import("../app-electron/main/store");
  return loadConfig();
}

describe("görünüm ayarı", () => {
  it("ayar dosyası yoksa Sakin İndigo koyu", async () => {
    const cfg = await load(null);
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("dark");
  });

  it("eski dosyada palet yoksa indigo geliyor, kayıtlı tema korunuyor", async () => {
    const cfg = await load({ theme: "light" });
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("light");
  });

  it("kayıtlı seçim olduğu gibi okunuyor", async () => {
    const cfg = await load({ palette: "warm", theme: "light" });
    expect(cfg.palette).toBe("warm");
    expect(cfg.theme).toBe("light");
  });

  it("geçersiz değerler varsayılana dönüyor", async () => {
    const cfg = await load({ palette: "lime", theme: "blue" });
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("dark");
  });

  it("yanlış tipteki değerler de varsayılana dönüyor", async () => {
    const cfg = await load({ palette: 3, theme: null });
    expect(cfg.palette).toBe("indigo");
    expect(cfg.theme).toBe("dark");
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/appearanceConfig.test.ts`
Beklenen: FAIL — `palette` `undefined` geliyor; "geçersiz değerler" testinde `theme` `"blue"` geliyor.

- [ ] **Adım 3: Tipleri ekle**

`app-electron/shared/types.ts`'te `export type AppTheme = "dark" | "light";` satırının altına:

```ts

// Renk paleti. Koyu/açık hâlden (`AppTheme`) BAĞIMSIZ: her palet iki hâlde de
// var, dört görünüm `src/index.css`'te dört ayrı blok (bkz. tasarım belgesi
// docs/superpowers/specs/2026-09-28-tasarim-sistemi-temeli-design.md).
export type AppPalette = "indigo" | "warm";
```

`AppConfig` içinde `theme: AppTheme;` satırının altına:

```ts
  palette: AppPalette;
```

- [ ] **Adım 4: Store'da varsayılan ve doğrulama**

`app-electron/main/store.ts` tip importuna `AppTheme,` ve `AppPalette,` ekle (`ConnectorMode` satırının üstüne):

```ts
  ChatDensity,
  AppTheme,
  AppPalette,
  ConnectorMode
} from "../shared/types";
```

`const VALID_CONNECTOR_MODES …` satırının altına:

```ts
const VALID_THEMES: AppTheme[] = ["dark", "light"];
const VALID_PALETTES: AppPalette[] = ["indigo", "warm"];
```

`defaultConfig()` içinde `theme: "dark",` satırının altına:

```ts
    palette: "indigo",
```

`loadConfig()` içinde `const chatDensity = …;` ifadesinin hemen altına:

```ts
    // Görünüm de aynı muameleyi görüyor: değer doğrudan `<html data-palette /
    // data-theme>`'e yazılıyor ve hiçbir CSS bloğuyla eşleşmeyen bir değer
    // uygulamayı renksiz açardı. `palette` 2026-09-28'de eklendi; daha eski
    // dosyalarda hiç yok ve varsayılana ("indigo") düşüyor.
    const theme = VALID_THEMES.includes(parsed.theme) ? parsed.theme : fallback.theme;
    const palette = VALID_PALETTES.includes(parsed.palette) ? parsed.palette : fallback.palette;
```

`merged` nesnesinde `chatDensity,` satırının altına:

```ts
      theme,
      palette,
```

- [ ] **Adım 5: Ayar testinin geçtiğini gör**

Çalıştır: `npx vitest run tests/appearanceConfig.test.ts`
Beklenen: PASS (5 test).

- [ ] **Adım 6: `themeSurfaces` testini yaz**

`tests/themeSurfaces.test.ts`:

```ts
// Pencere ve terminal renklerinin tek kaynağı (spec §7).
//
// `parseAppearance` ana sürecin pencere adresine koyduğu `?palette=…&theme=…`
// sorgusunu okuyor. Sorgu elle değiştirilebilir ya da eski bir sürümden
// gelebilir; geçersiz değer hiçbir CSS bloğuyla eşleşmeyeceği için
// varsayılana dönüyor.

import { describe, expect, it } from "vitest";
import { THEME_SURFACES, parseAppearance } from "../app-electron/shared/themeSurfaces";

describe("parseAppearance", () => {
  it("geçerli sorguyu okuyor", () => {
    expect(parseAppearance("?palette=warm&theme=light")).toEqual({ palette: "warm", theme: "light" });
  });

  it("sorgu yoksa Sakin İndigo koyu", () => {
    expect(parseAppearance("")).toEqual({ palette: "indigo", theme: "dark" });
  });

  it("geçersiz değerler ayrı ayrı varsayılana dönüyor", () => {
    expect(parseAppearance("?palette=lime&theme=blue")).toEqual({ palette: "indigo", theme: "dark" });
    expect(parseAppearance("?theme=light")).toEqual({ palette: "indigo", theme: "light" });
    expect(parseAppearance("?palette=warm&theme=")).toEqual({ palette: "warm", theme: "dark" });
  });
});

describe("THEME_SURFACES", () => {
  it("renkler #rrggbb biçiminde", () => {
    for (const palette of ["indigo", "warm"] as const) {
      for (const theme of ["dark", "light"] as const) {
        const s = THEME_SURFACES[palette][theme];
        for (const value of [s.app, s.card, s.accent, s.terminal.background, s.terminal.foreground, s.terminal.cursor]) {
          expect(value).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it("terminal açık temada da o paletin koyu renklerinde kalıyor", () => {
    for (const palette of ["indigo", "warm"] as const) {
      expect(THEME_SURFACES[palette].light.terminal).toEqual(THEME_SURFACES[palette].dark.terminal);
    }
  });
});
```

- [ ] **Adım 7: Kırıldığını gör**

Çalıştır: `npx vitest run tests/themeSurfaces.test.ts`
Beklenen: FAIL — `Failed to resolve import "../app-electron/shared/themeSurfaces"`.

- [ ] **Adım 8: `themeSurfaces.ts`'i yaz**

`app-electron/shared/themeSurfaces.ts`:

```ts
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
```

- [ ] **Adım 9: Geçtiğini gör**

Çalıştır: `npx vitest run tests/themeSurfaces.test.ts`
Beklenen: PASS (5 test).

- [ ] **Adım 10: `applyAppearance` testini yaz**

`tests/appearance.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// `<html>`'e palet ve temayı yazan tek fonksiyon (spec §7). `theme-transition`
// sınıfı yalnızca KULLANICI değiştirdiğinde ve yalnızca 260ms boyunca
// ekleniyor: o sınıf sayfadaki her öğeye renk geçişi koyuyor ve kalıcı
// olursa her hover'da bedeli ödeniyor.

import { afterEach, describe, expect, it, vi } from "vitest";
import { applyAppearance } from "../src/ui/appearance";

afterEach(() => {
  vi.useRealTimers();
});

function freshRoot(): HTMLElement {
  return document.createElement("html");
}

describe("applyAppearance", () => {
  it("geçişsiz: nitelikleri yazıyor, sınıf eklemiyor", () => {
    const root = freshRoot();
    applyAppearance(root, "warm", "light", false);
    expect(root.getAttribute("data-palette")).toBe("warm");
    expect(root.getAttribute("data-theme")).toBe("light");
    expect(root.classList.contains("theme-transition")).toBe(false);
  });

  it("geçişli: sınıf 260ms sonra kalkıyor", () => {
    vi.useFakeTimers();
    const root = freshRoot();
    applyAppearance(root, "indigo", "dark", true);
    expect(root.getAttribute("data-palette")).toBe("indigo");
    expect(root.classList.contains("theme-transition")).toBe(true);
    vi.advanceTimersByTime(259);
    expect(root.classList.contains("theme-transition")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(root.classList.contains("theme-transition")).toBe(false);
  });

  it("temizlik zamanlayıcıyı iptal edip sınıfı hemen kaldırıyor", () => {
    vi.useFakeTimers();
    const root = freshRoot();
    const cleanup = applyAppearance(root, "warm", "dark", true);
    cleanup();
    expect(root.classList.contains("theme-transition")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
```

- [ ] **Adım 11: Kırıldığını gör**

Çalıştır: `npx vitest run tests/appearance.test.tsx`
Beklenen: FAIL — `Failed to resolve import "../src/ui/appearance"`.

- [ ] **Adım 12: `applyAppearance`'ı yaz**

`src/ui/appearance.ts`:

```ts
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
```

- [ ] **Adım 13: Geçtiğini gör**

Çalıştır: `npx vitest run tests/appearance.test.tsx`
Beklenen: PASS (3 test).

- [ ] **Adım 14: Pencere adresi sorgusu için korumayı test et**

`tests/windowGuard.test.ts`'te `describe("isAppUrl", () => {` bloğunun içine, ilk `it`'in altına ekle:

```ts
  it("görünüm sorgusu (?palette=…&theme=…) sayfayı yabancı yapmıyor", () => {
    expect(isAppUrl(`${base}/dist/index.html?palette=warm&theme=light`, prod)).toBe(true);
    expect(isAppUrl("http://localhost:5173/?palette=warm&theme=light", dev)).toBe(true);
  });
```

Çalıştır: `npx vitest run tests/windowGuard.test.ts`
Beklenen: PASS (sorgu `fileURLToPath` ve `origin` karşılaştırmasında zaten yok sayılıyor; bu test bunu sabitliyor — ileride biri korumayı tam adres karşılaştırmasına çevirirse uygulama kendi sayfasını engellemesin).

- [ ] **Adım 15: Ana süreç sorguyu koysun**

`app-electron/main/index.ts`'te `createWindow()`'un ilk satırını:

```ts
  const { width, height } = preferredWindowSize();
```

şununla değiştir:

```ts
  const { width, height } = preferredWindowSize();
  // Görünüm seçimi sayfaya adres sorgusuyla gidiyor (`?palette=…&theme=…`):
  // `src/main.tsx` React çizilmeden ÖNCE `<html>`'e yazıyor. IPC ile sormak
  // bir tur beklemek demekti; o arada sayfa varsayılan (İndigo koyu) renkle
  // boyanır, açık temada bir kare koyu görünürdü.
  const cfg = loadConfig();
```

`loadURL`/`loadFile` bloğunu:

```ts
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
```

şununla değiştir:

```ts
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    const devUrl = new URL(process.env.ELECTRON_RENDERER_URL);
    devUrl.searchParams.set("palette", cfg.palette);
    devUrl.searchParams.set("theme", cfg.theme);
    win.loadURL(devUrl.toString());
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"), {
      query: { palette: cfg.palette, theme: cfg.theme }
    });
  }
```

`loadConfig` bu dosyada zaten import ediliyor (`./store`); kontrol: `grep -n "loadConfig" app-electron/main/index.ts | head -3`. Bu adımda `THEME_SURFACES` importunu EKLEME — `noUnusedLocals` kırar; Görev 4 ekliyor.

- [ ] **Adım 16: Çizici React'ten önce yazsın**

`src/main.tsx`'i şöyle yap:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { parseAppearance } from "../app-electron/shared/themeSurfaces";
import { applyAppearance } from "./ui/appearance";
import "./index.css";

// Görünüm React'ten ÖNCE yazılıyor: ana süreç seçimi adres sorgusuna koydu
// (bkz. app-electron/main/index.ts createWindow). Ayar IPC ile gelene kadar
// beklenseydi ilk kare varsayılan renkle boyanırdı.
const { palette, theme } = parseAppearance(window.location.search);
applyAppearance(document.documentElement, palette, theme, false);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Adım 17: `App.tsx` tema efektini palete genişlet**

`src/App.tsx`'te `import { btn, iconBtn, tintBtn } from "./ui/buttons";` satırının altına:

```ts
import { applyAppearance } from "./ui/appearance";
```

"Tema değişimi." yorumuyla başlayan bloğu (`const previousThemeRef = useRef<string | null>(null);` ve ardından gelen `useEffect(…, [config?.theme]);` dahil) şununla değiştir:

```tsx
  // Görünüm değişimi (palet ve koyu/açık). `theme-transition` sınıfı SADECE
  // kullanıcı değiştirdiğinde ve geçiş süresince ekleniyor (bkz.
  // src/ui/appearance.ts) — ilk yüklemede `src/main.tsx` aynı değerleri zaten
  // yazdı, burada yeniden yazmak görünür bir şey değiştirmiyor.
  const previousAppearanceRef = useRef<string | null>(null);
  useEffect(() => {
    if (!config?.theme) return;
    const palette = config.palette ?? "indigo";
    const key = `${palette}/${config.theme}`;
    const isSwitch = previousAppearanceRef.current !== null && previousAppearanceRef.current !== key;
    previousAppearanceRef.current = key;
    return applyAppearance(document.documentElement, palette, config.theme, isSwitch);
  }, [config?.palette, config?.theme]);
```

- [ ] **Adım 18: Hepsini ve tip denetimini çalıştır**

Çalıştır: `npx vitest run tests/appearanceConfig.test.ts tests/themeSurfaces.test.ts tests/appearance.test.tsx tests/windowGuard.test.ts`
Beklenen: PASS.

Çalıştır: `npm run typecheck`
Beklenen: hata yok. (`AppConfig`'e zorunlu `palette` eklendi; testlerde ya da kodda elle kurulmuş tam bir `AppConfig` nesnesi varsa tip hatası verir — `palette: "indigo"` ekleyerek düzelt.)

- [ ] **Adım 19: Commit**

```bash
git add app-electron/shared/types.ts app-electron/main/store.ts app-electron/shared/themeSurfaces.ts app-electron/main/index.ts src/ui/appearance.ts src/main.tsx src/App.tsx tests/appearanceConfig.test.ts tests/themeSurfaces.test.ts tests/appearance.test.tsx tests/windowGuard.test.ts
git commit -m "Tasarim: palet ayari, html nitelikleri React oncesi yaziliyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Dört renk bloğu ve limonun kaldırılması

`src/index.css`'teki eski iki blok (koyu ve açık, limon vurgulu) dört blokla değiştiriliyor: Sakin İndigo ve Sıcak Nötr, her biri koyu ve açık. Bir test blokları okuyup kontrastı, jeton kümelerini ve yüzey sıralamasını ölçüyor. Limonun geçtiği son üç yer de temizleniyor. Görev 2 `data-palette`'i zaten yazdığı için bu commit'ten sonra dört görünüm de çalışıyor.

**Dosyalar:**
- Değiştir: `src/index.css` — başlık yorumu (`/* NTT Studio — "Premium AI Engineering Workspace"` ile başlayan, `Tailwind'e değil doğrudan CSS'e gidiyor.) */` ile biten yorum, satır ~111-133); eski bloklar (`:root,\nhtml[data-theme="dark"] {` ile başlayıp `--tier-prd-text: #914957;\n}` ile biten aralık, satır ~145-584); `body { … }` kuralının hemen altına yeni kural
- Değiştir: `index.html:2`
- Değiştir: `src/components/AxetCodeHome.tsx:2839` (yalnız yorum)
- Değiştir: `src/components/EmbeddedTerminal.tsx:31-40` (geçici; Görev 4 bunu `THEME_SURFACES`'a bağlıyor)
- Test: `tests/themeTokens.test.ts` (yeni)

**Arayüzler:**
- Tüketir: Görev 2'nin `<html data-palette data-theme>` nitelikleri; Görev 1'in `shadow-elev-N` → `var(--elev-N)` eşlemesi.
- Üretir:
  - Dört CSS bloğu, seçiciler: `:root, html[data-palette="indigo"][data-theme="dark"]` · `html[data-palette="indigo"][data-theme="light"]` · `html[data-palette="warm"][data-theme="dark"]` · `html[data-palette="warm"][data-theme="light"]`. Her blok aynı 70 jetonu tanımlıyor (eskilerin hepsi + yeni `--elev-1/2/3`); eski jeton adlarının hiçbiri kalkmıyor.
  - `tests/themeTokens.test.ts` içinde (dışa aktarılmayan) `RULES`, `VIEWS`, `blockFor(view)`, `rgbOf(decls, value)` yardımcıları — Görev 4 AYNI dosyanın sonuna bir `describe` ekleyip bunları kullanıyor.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/themeTokens.test.ts`:

```ts
// Renk jetonlarının ölçümü (tasarım sistemi temeli, 2026-09-28; spec §4).
//
// `src/index.css` metin olarak okunuyor, dört görünüm bloğu ayrıştırılıyor ve
// her blok için:
//   - jeton kümesi öbür bloklarla AYNI mı (bir blokta unutulan jeton o
//     görünümde sessizce boş kalır, tarayıcı hata vermez);
//   - metin ve durum renkleri en zayıf yüzeyde (app / card / control)
//     WCAG AA 4.5:1'i geçiyor mu;
//   - yüzey/kenarlık sıralaması doğru mu (yanlışsa hover dolgusu ince
//     kenarlığı yutuyor).
// Bir rengi değiştirmeden önce bu testi çalıştır; ölçmeden renk değiştirme.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");

const CSS = readFileSync(path.join(ROOT, "src", "index.css"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "");

type Decls = Map<string, string>;
interface Rule {
  selectors: string[];
  decls: Decls;
}

// Yalnızca iç içe olmayan `seçici { bildirimler }` çiftleri. `@media` gibi
// sarmalayıcıların içindeki kural da yakalanıyor (dıştaki `{` başa dahil
// olmadığı için); baştaki `@tailwind …;` gibi ifadeler son `;`'den sonrası
// alınarak atılıyor.
const RULES: Rule[] = [];
for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const head = m[1].slice(m[1].lastIndexOf(";") + 1);
  const selectors = head.split(",").map((s) => s.trim()).filter(Boolean);
  const decls: Decls = new Map();
  for (const part of m[2].split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    decls.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  RULES.push({ selectors, decls });
}

const VIEWS = {
  "indigo/dark": 'html[data-palette="indigo"][data-theme="dark"]',
  "indigo/light": 'html[data-palette="indigo"][data-theme="light"]',
  "warm/dark": 'html[data-palette="warm"][data-theme="dark"]',
  "warm/light": 'html[data-palette="warm"][data-theme="light"]'
} as const;
type View = keyof typeof VIEWS;

function blockFor(view: View): Rule {
  const found = RULES.filter((r) => r.selectors.includes(VIEWS[view]));
  if (found.length !== 1) throw new Error(`${view}: ${found.length} blok bulundu, 1 bekleniyordu`);
  return found[0];
}

type Rgb = [number, number, number];

/** `var(--x)`, `#rrggbb` ya da `"R G B"` değerini sayıya çevirir. */
function rgbOf(decls: Decls, value: string | undefined, depth = 0): Rgb {
  if (value === undefined) throw new Error("tanımsız jeton");
  if (depth > 5) throw new Error(`döngüsel var(): ${value}`);
  const v = value.trim();
  let m = /^var\((--[\w-]+)\)$/.exec(v);
  if (m) return rgbOf(decls, decls.get(m[1]), depth + 1);
  m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  m = /^(\d+)\s+(\d+)\s+(\d+)$/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  throw new Error(`renk okunamadı: ${v}`);
}

function luminance([r, g, b]: Rgb): number {
  const c = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ["--surface-app-rgb", "--surface-card-rgb", "--surface-control-rgb"];

// Metin olarak okunan her jeton — en zayıf yüzeyde ≥ 4.5:1.
const TEXT = [
  "--ink-100-rgb",
  "--ink-200-rgb",
  "--ink-300-rgb",
  "--ink-400-rgb",
  "--accent-400-rgb",
  "--status-success-text",
  "--status-info-text",
  "--status-warning-text",
  "--status-danger-text",
  "--tier-dev-text",
  "--tier-qa-text",
  "--tier-prd-text",
  "--module-code",
  "--module-sap",
  "--module-guiscript",
  "--navy-icon",
  "--folder-icon",
  "--project-soft-text",
  "--accent-soft-text",
  "--action-amber-text"
];

function weakest(decls: Decls, token: string): number {
  const color = rgbOf(decls, decls.get(token));
  return Math.min(...SURFACES.map((s) => contrast(color, rgbOf(decls, decls.get(s)))));
}

const VIEW_NAMES = Object.keys(VIEWS) as View[];

describe("dört görünüm bloğu", () => {
  it("her görünüm tam bir blokta, İndigo koyu aynı zamanda :root", () => {
    for (const view of VIEW_NAMES) blockFor(view);
    expect(blockFor("indigo/dark").selectors).toContain(":root");
  });

  it("dört blok aynı jeton kümesini tanımlıyor", () => {
    const names = (view: View) => [...blockFor(view).decls.keys()].filter((k) => k.startsWith("--")).sort();
    const reference = names("indigo/dark");
    expect(reference.length).toBeGreaterThan(60);
    for (const view of VIEW_NAMES) expect(names(view)).toEqual(reference);
  });
});

describe.each(VIEW_NAMES)("kontrast: %s", (view) => {
  const decls = blockFor(view).decls;

  it.each(TEXT)("%s en zayıf yüzeyde ≥ 4.5", (token) => {
    expect(weakest(decls, token)).toBeGreaterThanOrEqual(4.5);
  });

  it("--ink-500 (ipucu, devre dışı) ≥ 3", () => {
    expect(weakest(decls, "--ink-500-rgb")).toBeGreaterThanOrEqual(3);
  });

  it("vurgu dolgusu üstündeki yazı ≥ 4.5", () => {
    expect(contrast(rgbOf(decls, decls.get("--accent-on-rgb")), rgbOf(decls, decls.get("--accent-500-rgb")))).toBeGreaterThanOrEqual(4.5);
  });

  it("kırmızı dolgu üstündeki yazı ≥ 4.5", () => {
    expect(contrast(rgbOf(decls, decls.get("--on-solid-rgb")), rgbOf(decls, decls.get("--status-danger-solid")))).toBeGreaterThanOrEqual(4.5);
  });

  it("yüzey sıralaması kenarlığı yutmuyor", () => {
    const l = (token: string) => luminance(rgbOf(decls, decls.get(token)));
    if (view.endsWith("/dark")) {
      expect(l("--surface-hover-rgb")).toBeLessThan(l("--border-subtle-rgb"));
      expect(l("--surface-control-rgb")).toBeLessThan(l("--border-subtle-rgb"));
      expect(l("--surface-active-rgb")).toBeLessThan(l("--border-line-rgb"));
    } else {
      expect(l("--surface-control-rgb")).toBeGreaterThan(l("--border-subtle-rgb"));
      expect(l("--surface-hover-rgb")).toBeGreaterThan(l("--border-subtle-rgb"));
    }
  });
});

describe("açılış", () => {
  it("nitelikler yazılmadan önce sayfa boyanmıyor", () => {
    const bodyRule = RULES.find((r) => r.selectors.includes("html:not([data-palette]) body"));
    expect(bodyRule?.decls.get("background-color")).toBe("transparent");
    const htmlRule = RULES.find((r) => r.selectors.includes("html:not([data-palette])"));
    expect(htmlRule?.decls.get("color-scheme")).toBe("normal");
  });

  it("index.html tema niteliği taşımıyor (src/main.tsx yazıyor)", () => {
    const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
    expect(html).not.toContain("data-theme");
    expect(html).not.toContain("data-palette");
  });
});

describe("limon yeşili kalmadı", () => {
  const LIME = ["183 243 74", "169 225 63", "155 209 48", "#a9e13f", "#b7f34a"];

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx|css)$/.test(name)) out.push(full);
    }
    return out;
  }

  it("src/ ve app-electron/ altında eski limon değeri yok", () => {
    const hits: string[] = [];
    for (const file of [...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "app-electron"))]) {
      const text = readFileSync(file, "utf8").toLowerCase();
      for (const lime of LIME) if (text.includes(lime)) hits.push(`${path.relative(ROOT, file)}: ${lime}`);
    }
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/themeTokens.test.ts`
Beklenen: FAIL — `indigo/dark: 0 blok bulundu`, açılış kuralları yok, `index.html` `data-theme` içeriyor, limon üç dosyada bulunuyor (`AxetCodeHome.tsx`, `EmbeddedTerminal.tsx`, `index.css`).

- [ ] **Adım 3: Yeni metinleri geçici dosyalara yaz**

Write aracıyla üç dosya oluştur (klasör `C:\Users\10134570\AppData\Local\Temp\tasarim\`; Node'da `path.join(os.tmpdir(), "tasarim")`). Dosyaları LF ile yaz; birleştirme betiği CRLF'e çeviriyor.

`header.css` — dosyanın tamamı:

```css
/* NTT Studio tasarım dili (2026-09-28, "Tasarım sistemi temeli"; öncesi
   "Premium AI Engineering Workspace", 2026-09-06).
   Kuralları tek cümlede: sakin zemin, ince kenarlıklar, ferah ölçü (gövde
   14px, kontrol 40px, kart/pencere köşesi 12px), düz dolgulu düğmeler.

   İKİ PALET × İKİ HÂL = DÖRT AÇIK BLOK. Palet `<html data-palette>`
   (`indigo` | `warm`), koyu/açık `<html data-theme>` (`dark` | `light`).
   Her blok bütün jetonları kendisi tanımlıyor; birinden ötekine miras yok.
   `tests/themeTokens.test.ts` dört bloğu okuyup ölçüyor: jeton kümeleri
   aynı mı, metin/durum renkleri en zayıf yüzeyde ≥ 4.5:1 mi, yüzey
   sıralaması doğru mu. Bir rengi değiştirirken önce o testi çalıştır.

   RENK BİLGİ MİMARİSİNİN PARÇASI, DEKORASYON DEĞİL. Vurgu dışındaki her renk
   bir ANLAM taşıyor ve o anlamın dışında kullanılmıyor:
     vurgu  → birincil eylem / seçili  (--accent-*: İndigo'da indigo, Sıcak'ta kiremit)
     mavi   → sistem, bilgi           (--module-sap, --status-info-*, --navy-icon)
     mor    → yapay zekâ / model      (--module-code, --project-*)
     turuncu→ eylem / uyarı           (--module-guiscript, --status-warning-*)
     kırmızı→ hata                    (--status-danger-*)
   Durum yeşili (`--status-success-*`) vurgudan ayrı bir tonda: biri "seçili",
   diğeri "başarılı" okunabilsin.

   Renkler "R G B" tripleti (bkz. tailwind.config.js withOpacity()) — bu format
   opacity varyantlarının (bg-accent-500/10 vb.) doğru derlenmesi için gerekli,
   "#hex" YAZMA. (Hex değerli `--*-text` değişkenleri bunun dışında; onlar
   Tailwind'e değil doğrudan CSS'e gidiyor.) */
```

`after-body.css` — dosyanın tamamı:

```css

/* JS çalışmadan önce (`src/main.tsx` `data-palette`'i yazana kadar) sayfa
   boyanmasın: arkada ana sürecin ayardaki temaya göre seçtiği pencere rengi
   (`BrowserWindow.backgroundColor`, bkz. app-electron/shared/themeSurfaces.ts)
   görünsün. `:root`'taki `color-scheme: dark` bu arada tuvali koyuya boyardı;
   açık temada açılışta bir kare koyu çerçeve görünüyordu. */
html:not([data-palette]) {
  color-scheme: normal;
}
html:not([data-palette]) body {
  background-color: transparent;
}
```

`blocks.css` — dosyanın tamamı (dört blok; değerler ölçülmüş, DEĞİŞTİRME — en düşük sonuçlar: İndigo koyu ink-300 4.80, İndigo açık folder-icon 4.59, Sıcak koyu ink-300 4.67, Sıcak açık success-text 4.79):

```css
:root,
html[data-palette="indigo"][data-theme="dark"] {
  /* Sakin İndigo · koyu. `:root` bu blokla AYNI blok: nitelikler henüz yazılmamışken
     (ilk kare) de doğru renk olsun diye. Jeton gerekçeleri yalnızca bu blokta
     yazılı; öbür üç blok aynı jeton kümesini kendi değerleriyle tanımlıyor. */
  color-scheme: dark;
  /* Yüzeyler ROLE göre: app (pencere) · sidebar · card · raised · hover ·
     control (girdi, çip, seçili satır) · active (basılı).
     SIRALAMA KURALI (test denetliyor): koyu temada `hover` ve `control`
     `border-subtle`dan, `active` `border-line`dan koyu; açık temada `control`
     ve `hover` `border-subtle`dan açık. Bozulursa ince kenarlıklı kartın
     üstüne gelindiğinde dolgu kenarlığı yutar.
     `app` değeri `app-electron/shared/themeSurfaces.ts` içinde de duruyor
     (pencere zemini, terminal); ikisini bir test eşliyor. */
  --surface-app-rgb: 18 20 24;
  --surface-sidebar-rgb: 22 25 30;
  --surface-card-rgb: 27 30 36;
  --surface-raised-rgb: 31 34 41;
  --surface-hover-rgb: 33 37 44;
  --surface-control-rgb: 34 38 45;
  --surface-active-rgb: 46 51 61;

  --border-subtle-rgb: 40 44 53;
  --border-line-rgb: 52 57 69;
  --border-strong-rgb: 68 74 87;

  /* Eski ham merdiven — yalnızca `src/flows/flows.css` kullanıyor. */
  --base-950-rgb: var(--surface-app-rgb);
  --base-900-rgb: var(--surface-card-rgb);
  --base-850-rgb: var(--surface-raised-rgb);
  --base-800-rgb: var(--surface-control-rgb);
  --base-700-rgb: var(--border-line-rgb);
  --base-600-rgb: var(--border-strong-rgb);

  /* Metin: 100 ana · 200 ikincil · 300/400 ipucu ve üst bilgi (≥ 4.5:1) ·
     500 yer tutucu, devre dışı (≥ 3:1) · 600 yalnız süs, okunacak metinde
     KULLANILMAZ. Ölçüm `app`/`card`/`control`ın en zayıfına karşı. */
  --ink-100-rgb: 232 234 238;
  --ink-200-rgb: 180 185 195;
  --ink-300-rgb: 138 145 160;
  --ink-400-rgb: 138 145 160;
  --ink-500-rgb: 111 118 134;
  --ink-600-rgb: 75 81 96;
  --ink-strong-rgb: 255 255 255;

  --scrollbar-thumb: #343945;
  --scrollbar-thumb-hover: #444a57;

  /* Vurgu: 500 dolgu (üstündeki yazı `text-accent-on`) · 400 metin, ikon,
     kenarlık, odak halkası · 600 dolgunun basılı hâli. `--accent-cyan-rgb`
     eski adıyla duruyor, değeri 500 ile aynı. */
  --accent-600-rgb: 122 130 245;
  --accent-500-rgb: 139 147 255;
  --accent-400-rgb: 160 166 255;
  --accent-on-rgb: 15 16 32;
  --accent-cyan-rgb: 139 147 255;
  /* Kırmızı dolgu ya da resim üstü siyah örtü gibi, temadan bağımsız koyu
     zeminlerin üstündeki yazı. Dört blokta da beyaz. */
  --on-solid-rgb: 255 255 255;
  --accent-glow: rgba(139, 147, 255, 0.16);
  --accent-soft-text: #c3c7ff;

  /* Sohbet karşılama başlığının degradesi: ana metin → yumuşak vurgu → vurgu. */
  --chat-hero-from: #e8eaee;
  --chat-hero-via: #c3c7ff;
  --chat-hero-to: #8b93ff;

  /* Tür gösterge renkleri — seçim değil, "bu ne" bilgisi. Sol şeritteki
     modül ikonları kendi rengini taşıyor; SEÇİLİ olan vurgu rengine dönüyor.
     Anlam haritası: mavi sistem/bilgi · mor yapay zekâ ve proje · turuncu
     eylem/otomasyon · kırmızı hata. */
  --navy-icon: #8fb0d6;
  --module-code: #c0a4f2;
  --module-sap: #5eaee0;
  --module-guiscript: #e39a62;
  --folder-icon: #d9a55a;
  --project-500-rgb: 146 128 224;
  --project-soft-text: #c4b5f5;

  --app-bg-image: none;
  --overlay-scrim: rgba(0, 0, 0, 0.55);

  /* Durum ve ortam renkleri: zemin aynı rengin %12'si (açıkta %9), kenarlık
     %28'i (açıkta %26). DEV = bilgi mavisi, QA = uyarı kehribarı, PRD = hata
     kırmızısı. `--status-danger-solid` dolgu olarak kullanılıyor; üstündeki
     beyaz yazı ≥ 4.5:1. */
  --status-danger-bg: rgba(240, 138, 149, 0.12);
  --status-danger-border: rgba(240, 138, 149, 0.28);
  --status-danger-text: #f08a95;
  --status-danger-solid: #c2334a;
  --status-warning-bg: rgba(230, 184, 102, 0.12);
  --status-warning-border: rgba(230, 184, 102, 0.28);
  --status-warning-text: #e6b866;
  --status-success-bg: rgba(92, 200, 168, 0.12);
  --status-success-border: rgba(92, 200, 168, 0.28);
  --status-success-text: #5cc8a8;
  --status-info-text: #7fb2ff;

  /* İkincil eylem kartının (SAP Logon'da Aç) tonu — uyarı değil, eşdeğer bir
     seçenek. rgb üçlüsü, çünkü kart opaklık merdiveni kullanıyor. */
  --action-amber-rgb: 220 168 108;
  --action-amber-text: #dca86c;

  --tier-dev-bg: rgba(127, 178, 255, 0.12);
  --tier-dev-border: rgba(127, 178, 255, 0.28);
  --tier-dev-text: #7fb2ff;
  --tier-qa-bg: rgba(230, 184, 102, 0.12);
  --tier-qa-border: rgba(230, 184, 102, 0.28);
  --tier-qa-text: #e6b866;
  --tier-prd-bg: rgba(240, 138, 149, 0.12);
  --tier-prd-border: rgba(240, 138, 149, 0.28);
  --tier-prd-text: #f08a95;

  /* Gölge: 1 açılır menü · 2 pencere · 3 bildirim. Koyu temada derinliği asıl
     kenarlık ve bir basamak açık yüzey veriyor; gölge yardımcı. */
  --elev-1: 0 4px 12px rgb(0 0 0 / 0.35);
  --elev-2: 0 16px 40px rgb(0 0 0 / 0.45);
  --elev-3: 0 8px 24px rgb(0 0 0 / 0.4);
}

html[data-palette="indigo"][data-theme="light"] {
  /* Sakin İndigo · açık. Jeton gerekçeleri İndigo koyu blokta. */
  color-scheme: light;
  --surface-app-rgb: 245 246 248;
  --surface-sidebar-rgb: 251 251 252;
  --surface-card-rgb: 255 255 255;
  --surface-raised-rgb: 248 249 250;
  --surface-hover-rgb: 241 243 246;
  --surface-control-rgb: 238 240 244;
  --surface-active-rgb: 227 230 236;

  --border-subtle-rgb: 232 234 239;
  --border-line-rgb: 220 223 230;
  --border-strong-rgb: 196 201 211;

  --base-950-rgb: var(--surface-app-rgb);
  --base-900-rgb: var(--surface-card-rgb);
  --base-850-rgb: var(--surface-raised-rgb);
  --base-800-rgb: var(--surface-control-rgb);
  --base-700-rgb: var(--border-line-rgb);
  --base-600-rgb: var(--border-strong-rgb);

  --ink-100-rgb: 26 29 36;
  --ink-200-rgb: 71 77 91;
  --ink-300-rgb: 100 107 120;
  --ink-400-rgb: 100 107 120;
  --ink-500-rgb: 127 133 145;
  --ink-600-rgb: 180 185 195;
  --ink-strong-rgb: 18 21 26;

  --scrollbar-thumb: #d4d8e0;
  --scrollbar-thumb-hover: #bfc5cf;

  --accent-600-rgb: 68 73 196;
  --accent-500-rgb: 79 85 217;
  --accent-400-rgb: 74 80 210;
  --accent-on-rgb: 255 255 255;
  --accent-cyan-rgb: 79 85 217;
  --on-solid-rgb: 255 255 255;
  --accent-glow: rgba(79, 85, 217, 0.14);
  --accent-soft-text: #3f44b0;

  --chat-hero-from: #1a1d24;
  --chat-hero-via: #3f44b0;
  --chat-hero-to: #4f55d9;

  --navy-icon: #3a6690;
  --module-code: #6a45c2;
  --module-sap: #1d68b0;
  --module-guiscript: #9a5a1c;
  --folder-icon: #8f6420;
  --project-500-rgb: 91 79 191;
  --project-soft-text: #5b4fbf;

  --app-bg-image: none;
  --overlay-scrim: rgba(24, 24, 27, 0.35);

  --status-danger-bg: rgba(190, 52, 70, 0.09);
  --status-danger-border: rgba(190, 52, 70, 0.26);
  --status-danger-text: #be3446;
  --status-danger-solid: #be3446;
  --status-warning-bg: rgba(138, 90, 6, 0.09);
  --status-warning-border: rgba(138, 90, 6, 0.26);
  --status-warning-text: #8a5a06;
  --status-success-bg: rgba(18, 120, 90, 0.09);
  --status-success-border: rgba(18, 120, 90, 0.26);
  --status-success-text: #12785a;
  --status-info-text: #2360c4;

  --action-amber-rgb: 128 87 28;
  --action-amber-text: #80571c;

  --tier-dev-bg: rgba(35, 96, 196, 0.09);
  --tier-dev-border: rgba(35, 96, 196, 0.26);
  --tier-dev-text: #2360c4;
  --tier-qa-bg: rgba(138, 90, 6, 0.09);
  --tier-qa-border: rgba(138, 90, 6, 0.26);
  --tier-qa-text: #8a5a06;
  --tier-prd-bg: rgba(190, 52, 70, 0.09);
  --tier-prd-border: rgba(190, 52, 70, 0.26);
  --tier-prd-text: #be3446;

  --elev-1: 0 4px 12px rgb(16 20 30 / 0.08);
  --elev-2: 0 16px 40px rgb(16 20 30 / 0.14);
  --elev-3: 0 8px 24px rgb(16 20 30 / 0.12);
}

html[data-palette="warm"][data-theme="dark"] {
  /* Sıcak Nötr · koyu. Jeton gerekçeleri İndigo koyu blokta. */
  color-scheme: dark;
  --surface-app-rgb: 22 21 20;
  --surface-sidebar-rgb: 27 26 24;
  --surface-card-rgb: 32 31 29;
  --surface-raised-rgb: 36 35 33;
  --surface-hover-rgb: 38 36 34;
  --surface-control-rgb: 41 39 37;
  --surface-active-rgb: 53 50 47;

  --border-subtle-rgb: 46 44 41;
  --border-line-rgb: 58 55 51;
  --border-strong-rgb: 74 70 65;

  --base-950-rgb: var(--surface-app-rgb);
  --base-900-rgb: var(--surface-card-rgb);
  --base-850-rgb: var(--surface-raised-rgb);
  --base-800-rgb: var(--surface-control-rgb);
  --base-700-rgb: var(--border-line-rgb);
  --base-600-rgb: var(--border-strong-rgb);

  --ink-100-rgb: 236 233 228;
  --ink-200-rgb: 189 183 174;
  --ink-300-rgb: 151 143 133;
  --ink-400-rgb: 151 143 133;
  --ink-500-rgb: 122 115 106;
  --ink-600-rgb: 84 79 73;
  --ink-strong-rgb: 255 255 255;

  --scrollbar-thumb: #3a3733;
  --scrollbar-thumb-hover: #4a4641;

  --accent-600-rgb: 207 122 80;
  --accent-500-rgb: 224 138 95;
  --accent-400-rgb: 232 150 108;
  --accent-on-rgb: 26 15 9;
  --accent-cyan-rgb: 224 138 95;
  --on-solid-rgb: 255 255 255;
  --accent-glow: rgba(224, 138, 95, 0.16);
  --accent-soft-text: #f0b99c;

  --chat-hero-from: #ece9e4;
  --chat-hero-via: #f0b99c;
  --chat-hero-to: #e08a5f;

  --navy-icon: #9db4cc;
  --module-code: #bca6e0;
  --module-sap: #74acd6;
  --module-guiscript: #e0a070;
  --folder-icon: #d6a860;
  --project-500-rgb: 160 138 210;
  --project-soft-text: #c6b6e8;

  --app-bg-image: none;
  --overlay-scrim: rgba(0, 0, 0, 0.55);

  --status-danger-bg: rgba(232, 140, 140, 0.12);
  --status-danger-border: rgba(232, 140, 140, 0.28);
  --status-danger-text: #e88c8c;
  --status-danger-solid: #b83838;
  --status-warning-bg: rgba(220, 183, 106, 0.12);
  --status-warning-border: rgba(220, 183, 106, 0.28);
  --status-warning-text: #dcb76a;
  --status-success-bg: rgba(140, 196, 154, 0.12);
  --status-success-border: rgba(140, 196, 154, 0.28);
  --status-success-text: #8cc49a;
  --status-info-text: #8fb4d9;

  --action-amber-rgb: 214 173 116;
  --action-amber-text: #d6ad74;

  --tier-dev-bg: rgba(143, 180, 217, 0.12);
  --tier-dev-border: rgba(143, 180, 217, 0.28);
  --tier-dev-text: #8fb4d9;
  --tier-qa-bg: rgba(220, 183, 106, 0.12);
  --tier-qa-border: rgba(220, 183, 106, 0.28);
  --tier-qa-text: #dcb76a;
  --tier-prd-bg: rgba(232, 140, 140, 0.12);
  --tier-prd-border: rgba(232, 140, 140, 0.28);
  --tier-prd-text: #e88c8c;

  --elev-1: 0 4px 12px rgb(0 0 0 / 0.35);
  --elev-2: 0 16px 40px rgb(0 0 0 / 0.45);
  --elev-3: 0 8px 24px rgb(0 0 0 / 0.4);
}

html[data-palette="warm"][data-theme="light"] {
  /* Sıcak Nötr · açık. Jeton gerekçeleri İndigo koyu blokta. */
  color-scheme: light;
  --surface-app-rgb: 246 244 241;
  --surface-sidebar-rgb: 251 250 248;
  --surface-card-rgb: 255 255 255;
  --surface-raised-rgb: 249 248 246;
  --surface-hover-rgb: 242 239 235;
  --surface-control-rgb: 239 235 230;
  --surface-active-rgb: 229 224 217;

  --border-subtle-rgb: 235 231 225;
  --border-line-rgb: 224 218 210;
  --border-strong-rgb: 203 195 184;

  --base-950-rgb: var(--surface-app-rgb);
  --base-900-rgb: var(--surface-card-rgb);
  --base-850-rgb: var(--surface-raised-rgb);
  --base-800-rgb: var(--surface-control-rgb);
  --base-700-rgb: var(--border-line-rgb);
  --base-600-rgb: var(--border-strong-rgb);

  --ink-100-rgb: 31 28 24;
  --ink-200-rgb: 79 72 63;
  --ink-300-rgb: 109 101 90;
  --ink-400-rgb: 109 101 90;
  --ink-500-rgb: 133 125 113;
  --ink-600-rgb: 189 181 170;
  --ink-strong-rgb: 22 19 16;

  --scrollbar-thumb: #d9d2c8;
  --scrollbar-thumb-hover: #c5bcaf;

  --accent-600-rgb: 150 66 29;
  --accent-500-rgb: 173 78 36;
  --accent-400-rgb: 164 74 34;
  --accent-on-rgb: 255 255 255;
  --accent-cyan-rgb: 173 78 36;
  --on-solid-rgb: 255 255 255;
  --accent-glow: rgba(173, 78, 36, 0.14);
  --accent-soft-text: #8f3f1c;

  --chat-hero-from: #1f1c18;
  --chat-hero-via: #8f3f1c;
  --chat-hero-to: #ad4e24;

  --navy-icon: #446482;
  --module-code: #6c4ab0;
  --module-sap: #2a649e;
  --module-guiscript: #9a4f1e;
  --folder-icon: #855f1f;
  --project-500-rgb: 97 80 176;
  --project-soft-text: #6150b0;

  --app-bg-image: none;
  --overlay-scrim: rgba(31, 28, 24, 0.35);

  --status-danger-bg: rgba(176, 54, 54, 0.09);
  --status-danger-border: rgba(176, 54, 54, 0.26);
  --status-danger-text: #b03636;
  --status-danger-solid: #b03636;
  --status-warning-bg: rgba(133, 90, 14, 0.09);
  --status-warning-border: rgba(133, 90, 14, 0.26);
  --status-warning-text: #855a0e;
  --status-success-bg: rgba(45, 116, 68, 0.09);
  --status-success-border: rgba(45, 116, 68, 0.26);
  --status-success-text: #2d7444;
  --status-info-text: #35649a;

  --action-amber-rgb: 125 86 32;
  --action-amber-text: #7d5620;

  --tier-dev-bg: rgba(53, 100, 154, 0.09);
  --tier-dev-border: rgba(53, 100, 154, 0.26);
  --tier-dev-text: #35649a;
  --tier-qa-bg: rgba(133, 90, 14, 0.09);
  --tier-qa-border: rgba(133, 90, 14, 0.26);
  --tier-qa-text: #855a0e;
  --tier-prd-bg: rgba(176, 54, 54, 0.09);
  --tier-prd-border: rgba(176, 54, 54, 0.26);
  --tier-prd-text: #b03636;

  --elev-1: 0 4px 12px rgb(31 24 16 / 0.08);
  --elev-2: 0 16px 40px rgb(31 24 16 / 0.14);
  --elev-3: 0 8px 24px rgb(31 24 16 / 0.12);
}
```

- [ ] **Adım 4: `src/index.css`'e yerleştir**

Proje kökünde çalıştır (betik bir yere kaydedilmiyor):

```bash
node -e '
const fs = require("fs"), os = require("os"), path = require("path");
const dir = path.join(os.tmpdir(), "tasarim");
const crlf = (s) => s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
const file = "src/index.css";
let css = fs.readFileSync(file, "utf8");
function splice(startAnchor, endAnchor, replacement, keepEnd) {
  const a = css.indexOf(startAnchor);
  if (a < 0) throw new Error("başlangıç bulunamadı: " + startAnchor);
  const b = css.indexOf(endAnchor, a);
  if (b < 0) throw new Error("bitiş bulunamadı: " + endAnchor);
  const end = keepEnd ? b : b + endAnchor.length;
  css = css.slice(0, a) + replacement + css.slice(end);
}
// 1) Başlık yorumu
splice("/* NTT Studio — \"Premium AI Engineering Workspace\"",
       "Tailwind\u0027e değil doğrudan CSS\u0027e gidiyor.) */",
       crlf(fs.readFileSync(path.join(dir, "header.css"), "utf8")).replace(/\r\n$/, ""), false);
// 2) Eski iki blok → dört blok
splice(":root,\r\nhtml[data-theme=\"dark\"] {",
       "--tier-prd-text: #914957;\r\n}",
       crlf(fs.readFileSync(path.join(dir, "blocks.css"), "utf8")).replace(/\r\n$/, ""), false);
// 3) body kuralının arkasına açılış kuralı
const bodyStart = css.indexOf("body {\r\n  @apply bg-app text-slate-100 antialiased;");
if (bodyStart < 0) throw new Error("body kuralı bulunamadı");
const bodyEnd = css.indexOf("\r\n}\r\n", bodyStart) + "\r\n}".length;
css = css.slice(0, bodyEnd) + crlf(fs.readFileSync(path.join(dir, "after-body.css"), "utf8")).replace(/\r\n$/, "") + css.slice(bodyEnd);
fs.writeFileSync(file, css);
console.log("tamam");
'
```

Beklenen çıktı: `tamam`. Kontrol:
- `grep -c '^html\[data-theme=' src/index.css` → `0` olmalı (eski seçiciler kalmadı).
- `grep -n 'html\[data-palette=' src/index.css` → dört satır.
- Satır sonları: `node -e "const s=require('fs').readFileSync('src/index.css','utf8'); console.log(/[^\r]\n/.test(s) ? 'LF VAR' : 'CRLF tamam')"` → `CRLF tamam`.

- [ ] **Adım 5: `index.html`**

`index.html` satır 2:

```html
<html lang="tr" data-theme="dark">
```

şununla değiştir:

```html
<html lang="tr">
```

Nitelikleri artık `src/main.tsx` yazıyor (Görev 2); burada sabit `dark` kalsaydı açık tema seçen kullanıcıda ilk kare koyu olurdu.

- [ ] **Adım 6: Limonun son iki izi**

`src/components/AxetCodeHome.tsx` (satır ~2839, yalnız yorum):

```
            2026-09-06: *"#B7F34A rengini özellikle Yeni sohbet ... için
```

şununla değiştir:

```
            2026-09-06: *"[o günkü limon vurgu] rengini özellikle Yeni sohbet ... için
```

`src/components/EmbeddedTerminal.tsx` satır 31-40 arasındaki yorum ve `theme` nesnesini:

```ts
      // xterm kendi tuvalini boyuyor, CSS değişkenlerini okumuyor — bu yüzden
      // renkler burada elle tutuluyor ve koyu temanın yüzey/ink jetonlarıyla
      // AYNI değerde olmaları gerekiyor (--surface-app-rgb / --ink-100-rgb /
      // --accent-400-rgb). Palet değişirse burası da değişmeli; bağ otomatik
      // değil.
      theme: {
        background: "#0b0c10",
        foreground: "#f1f3f5",
        cursor: "#a9e13f"
      }
```

şununla değiştir (Görev 4 bunu `THEME_SURFACES`'a bağlayana kadar geçici):

```ts
      // xterm kendi tuvalini boyuyor, CSS değişkenlerini okumuyor. Değerler
      // Sakin İndigo koyu jetonlarıyla aynı (--surface-app-rgb / --ink-100-rgb /
      // --accent-500-rgb). GEÇİCİ: bir sonraki adımda paleti izleyen
      // `THEME_SURFACES`'tan okunacak.
      theme: {
        background: "#121418",
        foreground: "#e8eaee",
        cursor: "#8b93ff"
      }
```

- [ ] **Adım 7: Testin geçtiğini gör**

Çalıştır: `npx vitest run tests/themeTokens.test.ts tests/designScale.test.ts`
Beklenen: PASS.

Çalıştır: `npm test`
Beklenen: PASS. Başka bir test eski limon değerini ya da `data-theme="dark"` seçicisini metin olarak arıyorsa kırılır; o testi yeni değere göre güncelle ve bunu raporda yaz.

- [ ] **Adım 8: Gözle kontrol**

Çalışan bir NTT Studio varsa `npm run dev` açılır açılmaz kapanır (tek kopya kilidi, `app-electron/main/index.ts:99`). O süreci ÖLDÜRME. Kullanıcıdan kapatmasını iste ya da bu adımı Görev 10'daki gözle kontrole bırak ve bunu raporda yaz. Uygulama açılabiliyorsa: Ayarlar'da tema koyu/açık arasında değişince (palet seçimi Görev 9'da geliyor) renklerin İndigo'ya geçtiğini, hiçbir yerde boş (şeffaf) zemin, görünmez yazı ya da limon yeşili kalmadığını kontrol et.

- [ ] **Adım 9: Commit**

```bash
git add src/index.css index.html src/components/AxetCodeHome.tsx src/components/EmbeddedTerminal.tsx tests/themeTokens.test.ts
git commit -m "Tasarim: dort renk blogu (Sakin Indigo, Sicak Notr), limon kaldirildi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: Pencere zemini ve terminal paleti izliyor

Pencerenin ilk boyama rengi ve gömülü terminalin renkleri artık tek kaynaktan (`THEME_SURFACES`) geliyor ve seçili paleti izliyor. Bir test bu tablonun CSS bloklarıyla aynı kaldığını denetliyor.

**Dosyalar:**
- Oluştur: `src/ui/useAppearance.ts`
- Değiştir: `app-electron/main/index.ts` — import bloğu (`./store` importunun altı, ~satır 28) ve `createWindow()` içindeki `backgroundColor` (~satır 257-260)
- Değiştir: `src/components/EmbeddedTerminal.tsx` — importlar (satır 1-6), ref'ler (satır ~17-21), `theme` nesnesi (Görev 3'ün geçici değerleri), yeni efekt (`[active, sessionId]` efektinin arkasına)
- Test: `tests/useAppearance.test.tsx` (yeni), `tests/themeTokens.test.ts` (sonuna bir `describe`)

**Arayüzler:**
- Tüketir: Görev 2'nin `THEME_SURFACES` / `ThemeSurface` (`app-electron/shared/themeSurfaces.ts`) ve `createWindow()` içindeki `const cfg = loadConfig();`; Görev 3'ün `tests/themeTokens.test.ts` yardımcıları `blockFor(view)`, `rgbOf(decls, value)`, `VIEWS`, `View`.
- Üretir: `src/ui/useAppearance.ts`:
  - `export interface Appearance { palette: AppPalette; theme: AppTheme }`
  - `export function useAppearance(): Appearance` — `<html>`'in `data-palette` / `data-theme` niteliklerini okur ve değiştikçe yeniden çizdirir. Görev 9 kullanmıyor; CSS'e erişemeyen başka bileşenler (ileride) bunu kullanır.

- [ ] **Adım 1: Kırılan testleri yaz**

`tests/useAppearance.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// CSS değişkenini okuyamayan bileşenler (xterm) için görünüm kancası.
// Kaynak `<html>`'in nitelikleri — ayar nesnesi değil: nitelikleri
// `applyAppearance` yazıyor ve ekrandaki renk o anda ne ise kanca da onu
// göstermeli.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppearance } from "../src/ui/useAppearance";

function Probe() {
  const { palette, theme } = useAppearance();
  return <span data-testid="probe">{`${palette}/${theme}`}</span>;
}

const root = document.documentElement;

afterEach(() => {
  cleanup();
  root.removeAttribute("data-palette");
  root.removeAttribute("data-theme");
});

describe("useAppearance", () => {
  it("nitelik yoksa İndigo koyu", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("indigo/dark");
  });

  it("ilk çizimde nitelikleri okuyor", () => {
    root.setAttribute("data-palette", "warm");
    root.setAttribute("data-theme", "light");
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("warm/light");
  });

  it("nitelik değişince yeniden çiziliyor", async () => {
    render(<Probe />);
    await act(async () => {
      root.setAttribute("data-palette", "warm");
    });
    expect(screen.getByTestId("probe").textContent).toBe("warm/dark");
    await act(async () => {
      root.setAttribute("data-theme", "light");
    });
    expect(screen.getByTestId("probe").textContent).toBe("warm/light");
  });

  it("tanınmayan değer varsayılana düşüyor", () => {
    root.setAttribute("data-palette", "lime");
    root.setAttribute("data-theme", "blue");
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("indigo/dark");
  });
});
```

`tests/themeTokens.test.ts` dosyasının SONUNA ekle (dosyanın başındaki importlara şu satırı da ekle: `import { THEME_SURFACES } from "../app-electron/shared/themeSurfaces";`):

```ts
describe("THEME_SURFACES CSS ile aynı", () => {
  const hex = ([r, g, b]: [number, number, number]) =>
    "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");

  it.each(Object.keys(VIEWS) as View[])("%s", (view) => {
    const [palette, theme] = view.split("/") as ["indigo" | "warm", "dark" | "light"];
    const decls = blockFor(view).decls;
    const surface = THEME_SURFACES[palette][theme];
    expect(surface.app).toBe(hex(rgbOf(decls, decls.get("--surface-app-rgb"))));
    expect(surface.card).toBe(hex(rgbOf(decls, decls.get("--surface-card-rgb"))));
    expect(surface.accent).toBe(hex(rgbOf(decls, decls.get("--accent-500-rgb"))));
  });

  it("terminal o paletin koyu yüzeyinde, koyu metniyle", () => {
    for (const palette of ["indigo", "warm"] as const) {
      const decls = blockFor(`${palette}/dark` as View).decls;
      const terminal = THEME_SURFACES[palette].dark.terminal;
      expect(terminal.background).toBe(hex(rgbOf(decls, decls.get("--surface-app-rgb"))));
      expect(terminal.foreground).toBe(hex(rgbOf(decls, decls.get("--ink-100-rgb"))));
      expect(terminal.cursor).toBe(hex(rgbOf(decls, decls.get("--accent-500-rgb"))));
    }
  });

  it("pencere zemini ve terminal elle yazılmış renk taşımıyor", () => {
    const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8");
    const main = read("app-electron", "main", "index.ts");
    expect(main).toContain("backgroundColor: THEME_SURFACES[cfg.palette][cfg.theme].app");
    const terminal = read("src", "components", "EmbeddedTerminal.tsx");
    expect(terminal).toContain("useAppearance()");
    expect(terminal.match(/THEME_SURFACES\[/g)?.length).toBe(2);
    expect(terminal).not.toMatch(/#[0-9a-f]{6}/i);
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/useAppearance.test.tsx tests/themeTokens.test.ts`
Beklenen: FAIL — `useAppearance` bulunamıyor; "elle yazılmış renk" testi `backgroundColor: "#0b0c10"` ve terminal hex'leri yüzünden kırılıyor. "CSS ile aynı" testleri bu adımda zaten GEÇMELİ (Görev 2'nin tablosu Görev 3'ün bloklarıyla aynı); geçmiyorsa tabloyu değil, hangisinin spec §4 değerinden saptığını bulup onu düzelt.

- [ ] **Adım 3: `useAppearance`'ı yaz**

`src/ui/useAppearance.ts`:

```ts
import { useEffect, useState } from "react";
import type { AppPalette, AppTheme } from "../../app-electron/shared/types";

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
    palette: root.getAttribute("data-palette") === "warm" ? "warm" : "indigo",
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
```

- [ ] **Adım 4: Pencere zemini**

`app-electron/main/index.ts`'te `import { loadConfig, saveConfig, … } from "./store";` satırının altına:

```ts
import { THEME_SURFACES } from "../shared/themeSurfaces";
```

`createWindow()` içinde:

```ts
    // Pencerenin İLK BOYAMA rengi — React yüklenene kadar görünen zemin.
    // Koyu temanın `--surface-app-rgb` değeriyle aynı tutuluyor; farklı olursa
    // açılışta bir kare boyunca yanlış renkte bir çerçeve görünüyor.
    backgroundColor: "#0b0c10",
```

şununla değiştir:

```ts
    // Pencerenin İLK BOYAMA rengi — React yüklenene kadar görünen zemin.
    // Kullanıcının seçtiği görünümün `--surface-app-rgb` değeri; farklı olursa
    // açılışta bir kare boyunca yanlış renkte bir çerçeve görünüyor. Sayfa da
    // nitelikler yazılana kadar kendini boyamıyor (bkz. src/index.css
    // `html:not([data-palette])`), yani ilk karede görünen bu renk.
    backgroundColor: THEME_SURFACES[cfg.palette][cfg.theme].app,
```

(`cfg` Görev 2'de `createWindow()`'un başında tanımlandı.)

- [ ] **Adım 5: Terminal**

`src/components/EmbeddedTerminal.tsx` importlarına ekle:

```ts
import { THEME_SURFACES } from "../../app-electron/shared/themeSurfaces";
import { useAppearance } from "../ui/useAppearance";
```

`const fitRef = useRef<FitAddon | null>(null);` satırının altına:

```ts
  // Görünüm de `t` gibi ref'ten okunuyor: kurulum efektinin bağımlılığı
  // olsaydı palet değişince terminal sıfırdan kurulur, çıktı silinirdi.
  // Açık terminal aşağıdaki ayrı efektle yeniden boyanıyor.
  const appearance = useAppearance();
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;
```

Görev 3'ün geçici yorumu ve `theme` nesnesini:

```ts
      // xterm kendi tuvalini boyuyor, CSS değişkenlerini okumuyor. Değerler
      // Sakin İndigo koyu jetonlarıyla aynı (--surface-app-rgb / --ink-100-rgb /
      // --accent-500-rgb). GEÇİCİ: bir sonraki adımda paleti izleyen
      // `THEME_SURFACES`'tan okunacak.
      theme: {
        background: "#121418",
        foreground: "#e8eaee",
        cursor: "#8b93ff"
      }
```

şununla değiştir:

```ts
      // xterm kendi tuvalini boyuyor, CSS değişkenlerini okumuyor; renkler
      // `THEME_SURFACES`'tan. Açık temada da koyu kalıyor (standart ANSI sarı
      // ve yeşil beyaz zeminde okunmuyor) ama paleti izliyor.
      theme: { ...THEME_SURFACES[appearanceRef.current.palette][appearanceRef.current.theme].terminal }
```

`[active, sessionId]` bağımlılıklı efektin kapanışının (`}, [active, sessionId]);`) altına:

```ts

  // Palet değişince açık terminal kurulum yeniden yapılmadan boyanıyor.
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = { ...THEME_SURFACES[appearance.palette][appearance.theme].terminal };
  }, [appearance.palette, appearance.theme]);
```

- [ ] **Adım 6: Geçtiğini gör**

Çalıştır: `npx vitest run tests/useAppearance.test.tsx tests/themeTokens.test.ts`
Beklenen: PASS.

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Adım 7: Commit**

```bash
git add src/ui/useAppearance.ts app-electron/main/index.ts src/components/EmbeddedTerminal.tsx tests/useAppearance.test.tsx tests/themeTokens.test.ts
git commit -m "Tasarim: pencere zemini ve terminal secili paleti izliyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: Ortak `Modal`

Beş pencerenin her biri Escape'i, odağı ve "Değişiklikleri at?" onayını kendisi yönetiyordu; biri eksik kalınca veri kaybı çıkıyordu (bkz. `1b44371`). Bu görev hepsinin taşınacağı tek `Modal`'ı kuruyor. Görev 8 pencereleri buna taşıyor.

Davranış:
- Portal ile `document.body`'ye çiziliyor. `role="dialog"`, `aria-modal="true"`, başlığa `aria-labelledby`.
- Katman: `modal` (z-modal) < `confirm` (z-confirm) < `critical` (z-critical). Aynı anda birden fazla pencere açıksa klavyeyi yalnızca EN ÜSTTEKİ dinliyor (en yüksek katman, eşitlikte en son açılan).
- Escape `document`'ta yakalama (capture) aşamasında dinleniyor: odak pencerenin dışında kalmış olsa da çalışıyor ve alttaki eski `onKeyDown` işleyicilerine ulaşmıyor.
- `dirty` doğruyken kapatma isteği (Escape, X, `ModalCancelButton`) önce "Değişiklikleri at?" onayını açıyor. Onay bir üst katmanda ayrı bir `Modal`; Escape orada yalnızca onayı kapatıyor.
- Arka plana (scrim) tıklamak hiçbir şeyi kapatmıyor.
- Tab/Shift+Tab pencerenin içinde dönüyor; devre dışı öğeler atlanıyor. Odak dışarıdaysa Tab onu pencereye geri getiriyor.
- Açılışta odak: `autoFocus`'lu öğe varsa o; yoksa gövdenin, o da yoksa ayağın ilk odaklanabilir öğesi; hiçbiri yoksa panelin kendisi. Kapat (X) düğmesi hiçbir zaman ilk odak değil. React StrictMode'un çift efekt çalıştırması bu seçimi bozmuyor.
- Kapanışta odak pencereyi açan öğeye dönüyor; o öğe o arada DOM'dan kalktıysa hiçbir şey yapılmıyor.

**Dosyalar:**
- Oluştur: `src/ui/Modal.tsx`
- Test: `tests/modal.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: Görev 1'in `z-modal` / `z-confirm` / `z-critical` sınıfları ve `shadow-elev-2`; `src/ui/buttons.ts`'ten `DIALOG_CANCEL_BUTTON`, `DIALOG_CONFIRM_BUTTON`, `iconBtn`; `useT` (`src/i18n`); var olan i18n anahtarları `common.cancel` ("İptal"), `common.close` ("Kapat"), `settingsModal.discardTitle` ("Değişiklikleri at?"), `settingsModal.discardMessage`, `settingsModal.discardConfirm` ("At ve Kapat"); `src/index.css`'teki `animate-backdrop-fade-in`, `animate-modal-pop-in`.
- Üretir (`src/ui/Modal.tsx`, isimli dışa aktarımlar):
  - `export type ModalLayer = "modal" | "confirm" | "critical";`
  - `export interface ModalProps { open: boolean; onClose: () => void; title: string; dirty?: boolean; layer?: ModalLayer; width?: number; icon?: ReactNode; subtitle?: ReactNode; footer?: ReactNode; children?: ReactNode }` — varsayılanlar `dirty=false`, `layer="modal"`, `width=480`.
  - `export function Modal(props: ModalProps): JSX.Element | null`
  - `export function ModalCancelButton(props: { label?: string; autoFocus?: boolean }): JSX.Element` — içinde bulunduğu `Modal`'ın kapatma isteğini çağırıyor (yani `dirty` ise onay açılıyor). Varsayılan yazı `common.cancel`.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/modal.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Ortak pencere (tasarım sistemi temeli, spec §6). Buradaki her test bir
// kullanıcı şikâyetine karşılık geliyor: Escape çalışmıyor, Tab pencereden
// kaçıyor, onay kutusunda Escape alttaki pencereyi de kapatıyor, kapanınca
// odak kayboluyor.

import { StrictMode, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { Modal, ModalCancelButton } from "../src/ui/Modal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

const DISCARD_TITLE = "Değişiklikleri at?";

function outsideButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "dışarıda";
  document.body.appendChild(button);
  return button;
}

describe("Modal — yapı", () => {
  it("kapalıyken hiçbir şey çizmiyor", () => {
    wrap(<Modal open={false} onClose={vi.fn()} title="Başlık" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dialog rolü, aria-modal ve başlığa bağlı etiket", () => {
    wrap(
      <Modal open onClose={vi.fn()} title="Başlık">
        gövde
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe("Başlık");
  });

  it("arka plana tıklamak kapatmıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" />);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("X ve İptal kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" footer={<ModalCancelButton />} />);
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("Modal — klavye", () => {
  it("Tab sondan başa, Shift+Tab baştan sona dönüyor; devre dışı düğme atlanıyor", () => {
    wrap(
      <Modal
        open
        onClose={vi.fn()}
        title="Başlık"
        footer={
          <>
            <button type="button">Bir</button>
            <button type="button" disabled>
              Kaydet
            </button>
          </>
        }
      >
        <input aria-label="ad" />
      </Modal>
    );
    const close = screen.getByRole("button", { name: "Kapat" });
    const last = screen.getByRole("button", { name: "Bir" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("odak dışarıdayken Tab pencereye dönüyor", () => {
    wrap(
      <Modal open onClose={vi.fn()} title="Başlık">
        <input aria-label="ad" />
      </Modal>
    );
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Tab" });
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("odak pencerenin dışındayken de Escape kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" />);
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("yazı birleştirilirken (IME) Escape pencereyi kapatmıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" />);
    fireEvent.keyDown(document.body, { key: "Escape", isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("iki pencere üst üsteyken Escape yalnızca üsttekini kapatıyor", () => {
    const under = vi.fn();
    const over = vi.fn();
    wrap(
      <>
        <Modal open dirty onClose={under} title="Alt">
          <input aria-label="ad" />
        </Modal>
        <Modal open layer="confirm" onClose={over} title="Üst">
          üst
        </Modal>
      </>
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(over).toHaveBeenCalledTimes(1);
    expect(under).not.toHaveBeenCalled();
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });
});

describe("Modal — kaydedilmemiş değişiklik", () => {
  function DirtyHarness({ onClose }: { onClose: () => void }) {
    return (
      <Modal open dirty onClose={onClose} title="Ayarlar" footer={<ModalCancelButton />}>
        <input aria-label="ad" />
      </Modal>
    );
  }

  it("Escape önce onay açıyor; onaydaki Escape yalnızca onayı kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<DirtyHarness onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText("ad"), { key: "Escape" });
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("ad")).toBeTruthy();
  });

  it("İptal de önce onay açıyor; At ve Kapat alttaki pencereyi kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<DirtyHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "At ve Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });

  it("onay açılınca odak onayın İptal düğmesinde", () => {
    wrap(<DirtyHarness onClose={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText("ad"), { key: "Escape" });
    const cancels = screen.getAllByRole("button", { name: "İptal" });
    expect(document.activeElement).toBe(cancels[cancels.length - 1]);
  });
});

describe("Modal — odak", () => {
  function Harness({ removable = false }: { removable?: boolean }) {
    const [open, setOpen] = useState(false);
    const [showOpener, setShowOpener] = useState(true);
    return (
      <>
        {showOpener && (
          <button type="button" onClick={() => setOpen(true)}>
            Aç
          </button>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Başlık">
          <input aria-label="ad" />
          {removable && (
            <button type="button" onClick={() => setShowOpener(false)}>
              Açanı kaldır
            </button>
          )}
        </Modal>
      </>
    );
  }

  it("açılışta gövdenin ilk öğesine, kapanışta açan düğmeye", () => {
    wrap(<Harness />);
    const opener = screen.getByRole("button", { name: "Aç" });
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText("ad"));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("açan öğe kaldırıldıysa kapanış hata vermiyor, DOM dışına odaklanmıyor", () => {
    wrap(<Harness removable />);
    const opener = screen.getByRole("button", { name: "Aç" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Açanı kaldır" }));
    expect(opener.isConnected).toBe(false);
    expect(() => fireEvent.keyDown(document.body, { key: "Escape" })).not.toThrow();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).not.toBe(opener);
  });

  it("StrictMode'da autoFocus'lu öğe odağı koruyor", () => {
    render(
      <StrictMode>
        <LanguageProvider language="tr">
          <Modal open onClose={vi.fn()} title="Başlık">
            <input aria-label="a" />
            <input aria-label="b" autoFocus />
          </Modal>
        </LanguageProvider>
      </StrictMode>
    );
    expect(document.activeElement).toBe(screen.getByLabelText("b"));
  });

  it("gövdede odaklanacak öğe yoksa ayağa gidiyor, X'e değil", () => {
    wrap(<Modal open onClose={vi.fn()} title="Başlık" footer={<ModalCancelButton />}>yalnız metin</Modal>);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İptal" }));
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/modal.test.tsx`
Beklenen: FAIL — `Failed to resolve import "../src/ui/Modal"`.

- [ ] **Adım 3: `Modal`'ı yaz**

`src/ui/Modal.tsx`:

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON, iconBtn } from "./buttons";

// Uygulamadaki bütün pencerelerin ortak iskeleti (spec §6).
//
// Neden tek bileşen: beş pencere Escape'i, odağı ve "Değişiklikleri at?"
// onayını ayrı ayrı yönetiyordu ve her birinde başka bir eksik vardı —
// odak pencerenin dışındayken Escape çalışmıyor, onay kutusunda Escape
// alttaki pencereyi de kapatıyor, Tab pencereden kaçıyordu. Kurallar artık
// burada bir kez yazılı:
//   - Klavyeyi yalnızca EN ÜSTTEKİ pencere dinliyor (katman sırası
//     modal < confirm < critical; eşitlikte en son açılan).
//   - Escape `document`'ta yakalama aşamasında dinleniyor: odak nerede
//     olursa olsun çalışıyor ve eski `onKeyDown` işleyicilerine ulaşmıyor.
//   - `dirty` iken kapatma isteği önce onay açıyor; onay bir üst katmanda
//     ayrı bir `Modal`.
//   - Arka plana tıklamak KAPATMIYOR: yanlışlıkla dışarı tıklayan kullanıcı
//     yazdıklarını kaybetmesin.

export type ModalLayer = "modal" | "confirm" | "critical";

const LAYER_RANK: Record<ModalLayer, number> = { modal: 1, confirm: 2, critical: 3 };
const LAYER_CLASS: Record<ModalLayer, string> = {
  modal: "z-modal",
  confirm: "z-confirm",
  critical: "z-critical"
};

// Açık pencerelerin yığını. Modül düzeyinde: pencereler birbirinin
// bileşen ağacında olmak zorunda değil (ör. App'teki bir onay ile
// SettingsModal).
interface StackEntry {
  id: number;
  rank: number;
}
const stack: StackEntry[] = [];
let nextId = 1;

function isTop(id: number): boolean {
  let top: StackEntry | undefined;
  for (const entry of stack) {
    if (!top || entry.rank > top.rank || (entry.rank === top.rank && entry.id > top.id)) top = entry;
  }
  return top?.id === id;
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !(el as HTMLButtonElement).disabled && el.tabIndex >= 0
  );
}

interface ModalContextValue {
  requestClose: () => void;
}
const ModalContext = createContext<ModalContextValue | null>(null);

/** Pencere ayağındaki "İptal". İçinde bulunduğu pencerenin kapatma isteğini
 *  çağırıyor — yani değişiklik varsa önce onay açılıyor. */
export function ModalCancelButton({ label, autoFocus }: { label?: string; autoFocus?: boolean }) {
  const t = useT();
  const ctx = useContext(ModalContext);
  return (
    <button type="button" onClick={ctx?.requestClose} className={DIALOG_CANCEL_BUTTON} autoFocus={autoFocus}>
      {label ?? t("common.cancel")}
    </button>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Kaydedilmemiş değişiklik var mı. Doğruysa kapatma isteği önce onay açar. */
  dirty?: boolean;
  layer?: ModalLayer;
  /** Panel genişliği (px). Dar pencerede ekrandan taşmıyor. */
  width?: number;
  icon?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Modal(props: ModalProps) {
  if (!props.open) return null;
  return createPortal(<ModalPanel {...props} />, document.body);
}

function ModalPanel({
  onClose,
  title,
  dirty = false,
  layer = "modal",
  width = 480,
  icon,
  subtitle,
  footer,
  children
}: ModalProps) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  // İlk çizimdeki odak = pencereyi açan öğe (autoFocus çizimden SONRA çalışıyor).
  const [opener] = useState(() => document.activeElement);
  const [id] = useState(() => nextId++);
  const [confirming, setConfirming] = useState(false);

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (dirtyRef.current) setConfirming(true);
    else onCloseRef.current();
  }, []);

  useLayoutEffect(() => {
    const entry: StackEntry = { id, rank: LAYER_RANK[layer] };
    stack.push(entry);
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
    };
  }, [id, layer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop(id) || e.isComposing) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusables(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !panel.contains(active) || active === panel) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [id, requestClose]);

  // İlk odak. StrictMode efektleri iki kez çalıştırıyor ve arada aşağıdaki
  // temizlik odağı açan öğeye geri veriyor; ilk seçilen öğe hatırlanıp
  // ikinci turda ona dönülüyor (yoksa `autoFocus` kaybolurdu).
  const initialFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const remembered = initialFocusRef.current;
    if (remembered && remembered.isConnected && panel.contains(remembered)) {
      remembered.focus();
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && panel.contains(active)) {
      initialFocusRef.current = active;
      return;
    }
    const target = focusables(bodyRef.current)[0] ?? focusables(footerRef.current)[0] ?? panel;
    initialFocusRef.current = target;
    target.focus();
  }, []);

  // Kapanışta odak açan öğeye dönüyor — o öğe hâlâ sayfadaysa.
  useEffect(
    () => () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    },
    [opener]
  );

  return (
    <ModalContext.Provider value={{ requestClose }}>
      <div
        className={`fixed inset-0 ${LAYER_CLASS[layer]} flex items-center justify-center bg-[var(--overlay-scrim)] p-4 animate-backdrop-fade-in`}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="animate-modal-pop-in flex max-h-[88vh] flex-col overflow-hidden rounded-xl border border-line bg-card shadow-elev-2 outline-none"
          style={{ width, maxWidth: "calc(100vw - 32px)" }}
        >
          <div className="flex items-start gap-3 px-6 pb-3 pt-5">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-control text-accent-400">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-white">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
            </div>
            <button type="button" onClick={requestClose} aria-label={t("common.close")} className={iconBtn("ghost", "sm")}>
              <X size={16} />
            </button>
          </div>
          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
          {footer && (
            <div ref={footerRef} className="flex items-center justify-end gap-2 border-t border-line-subtle px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <Modal
          open
          layer={layer === "modal" ? "confirm" : "critical"}
          title={t("settingsModal.discardTitle")}
          width={400}
          icon={<AlertTriangle size={18} className="text-[var(--status-warning-text)]" />}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <ModalCancelButton autoFocus />
              <button
                type="button"
                className={DIALOG_CONFIRM_BUTTON}
                onClick={() => {
                  setConfirming(false);
                  onCloseRef.current();
                }}
              >
                {t("settingsModal.discardConfirm")}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-400">{t("settingsModal.discardMessage")}</p>
        </Modal>
      )}
    </ModalContext.Provider>
  );
}
```

- [ ] **Adım 4: Geçtiğini gör**

Çalıştır: `npx vitest run tests/modal.test.tsx`
Beklenen: PASS (16 test).

Bir test kırılıyorsa `Modal`'ı düzelt, testi gevşetme — her biri bir veri kaybı ya da erişilebilirlik hatasını sabitliyor.

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Adım 5: Commit**

```bash
git add src/ui/Modal.tsx tests/modal.test.tsx
git commit -m "Tasarim: ortak Modal (katman, Escape, odak tuzagi, degisiklik onayi)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 6: `Button`, `Field` / `Input` / `Textarea` / `Select`, `Toggle`

`btn()` sınıf dizesi olarak kalıyor (her yerde çalışıyor). `Button` onun üstünde ince bir bileşen, iki kolaylık getiriyor: varsayılan `type="button"` (bir formun içindeki düğme yanlışlıkla formu göndermiyor) ve spec'teki iki boy (`sm` 32px, `md` 40px). `Field` etiketi, ipucunu ve hata metnini tek düzende gösteriyor; içindeki girdiye `id`, `aria-describedby` ve `aria-invalid`'i kendisi bağlıyor, böylece ekran okuyucu etiketi ve hatayı her seferinde okuyor.

**Dosyalar:**
- Oluştur: `src/ui/Button.tsx`
- Oluştur: `src/ui/Field.tsx`
- Oluştur: `src/ui/Toggle.tsx`
- Test: `tests/formControls.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: `btn`, `BtnVariant` (`src/ui/buttons.ts`; Görev 1'den sonra `sm`=`h-8`, `lg`=`h-10`); Tailwind renkleri `bg-control`, `border-line-strong`, `accent-500`, `accent-on`, `slate-*` (ink), `--status-danger-text`.
- Üretir:
  - `src/ui/Button.tsx`: `export type ButtonSize = "sm" | "md";` · `export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: BtnVariant; size?: ButtonSize }` · `export const Button` (`forwardRef<HTMLButtonElement, ButtonProps>`; varsayılan `variant="neutral"`, `size="md"`, `type="button"`). `sm` → `btn(v, "sm")` (32px), `md` → `btn(v, "lg")` (40px).
  - `src/ui/Field.tsx`: `export function Field(props: { label: ReactNode; hint?: ReactNode; error?: ReactNode; className?: string; children: ReactNode })` · `export const Input` (`forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>`) · `export const Textarea` (`forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>`) · `export const Select` (`forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>`) · `export function useFieldControl<P extends ControlAria>(props: P): P` (Toggle ve ileride başka girdiler için) · `export const INPUT_CLASS: string`.
  - `src/ui/Toggle.tsx`: `export function Toggle(props: { checked: boolean; onChange: (next: boolean) => void; label?: string; disabled?: boolean; id?: string })` — `label` yalnızca `Field` dışında kullanılırken gerekli (erişilebilir ad).

- [ ] **Adım 1: Kırılan testi yaz**

`tests/formControls.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Ortak form parçaları (tasarım sistemi temeli, spec §6.2–6.3). Testlerin
// çoğu erişilebilirlik bağlarını sabitliyor: etiket girdiye, ipucu ve hata
// `aria-describedby`'a bağlı mı. Bunlar gözle görünmüyor; kırıldıklarında
// ekran okuyucu kullanıcısı hatayı hiç duymuyor.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { Field, Input, Select, Textarea } from "../src/ui/Field";
import { Toggle } from "../src/ui/Toggle";

afterEach(cleanup);

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

function describedTexts(el: HTMLElement): string[] {
  const ids = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
  return ids.map((id) => document.getElementById(id)?.textContent ?? `<yok:${id}>`);
}

describe("Button", () => {
  it("varsayılan type=button: formun içinde formu göndermiyor", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    wrap(
      <form onSubmit={onSubmit}>
        <Button>Ekle</Button>
      </form>
    );
    const button = screen.getByRole("button", { name: "Ekle" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("type=submit verilince formu gönderiyor", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    wrap(
      <form onSubmit={onSubmit}>
        <Button type="submit">Kaydet</Button>
      </form>
    );
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("md 40px, sm 32px; ton sınıfı ve ek sınıf geçiyor", () => {
    wrap(
      <>
        <Button variant="primary">Büyük</Button>
        <Button size="sm" variant="danger" className="ml-auto">
          Küçük
        </Button>
      </>
    );
    const big = screen.getByRole("button", { name: "Büyük" }).className;
    const small = screen.getByRole("button", { name: "Küçük" }).className;
    expect(big).toContain("h-10");
    expect(big).toContain("bg-accent-500");
    expect(small).toContain("h-8");
    expect(small).toContain("--status-danger-solid");
    expect(small).toContain("ml-auto");
  });

  it("disabled iken tıklama işlemiyor", () => {
    const onClick = vi.fn();
    wrap(
      <Button disabled onClick={onClick}>
        Sil
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("etiket girdiye bağlı", () => {
    wrap(
      <Field label="Ad">
        <Input />
      </Field>
    );
    expect(screen.getByLabelText("Ad").tagName).toBe("INPUT");
  });

  it("ipucu aria-describedby'da; hata yokken aria-invalid yok", () => {
    wrap(
      <Field label="Ad" hint="Boş bırakılabilir">
        <Input />
      </Field>
    );
    const input = screen.getByLabelText("Ad");
    expect(describedTexts(input)).toEqual(["Boş bırakılabilir"]);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("hata varken aria-invalid=true ve hata metni de okunuyor", () => {
    wrap(
      <Field label="Ad" hint="İpucu" error="Bu alan zorunlu">
        <Input />
      </Field>
    );
    const input = screen.getByLabelText("Ad");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(describedTexts(input)).toEqual(["İpucu", "Bu alan zorunlu"]);
  });

  it("Textarea ve Select de bağlanıyor", () => {
    wrap(
      <>
        <Field label="Açıklama">
          <Textarea />
        </Field>
        <Field label="Dil">
          <Select>
            <option value="tr">Türkçe</option>
          </Select>
        </Field>
      </>
    );
    expect(screen.getByLabelText("Açıklama").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Dil").tagName).toBe("SELECT");
  });

  it("girdinin kendi id'si ve aria-describedby'ı korunuyor", () => {
    wrap(
      <>
        <p id="dis">dış açıklama</p>
        <Field label="Ad" hint="İpucu">
          <Input id="kendi-id" aria-describedby="dis" />
        </Field>
      </>
    );
    const input = screen.getByLabelText("Ad");
    expect(input.id).toBe("kendi-id");
    expect(describedTexts(input)).toEqual(["dış açıklama", "İpucu"]);
  });

  it("Field dışında Input düz bir girdi", () => {
    wrap(<Input aria-label="Arama" />);
    const input = screen.getByLabelText("Arama");
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });
});

describe("Toggle", () => {
  it("role=switch, aria-checked ve tıklayınca tersini bildiriyor", () => {
    const onChange = vi.fn();
    wrap(<Toggle checked={false} onChange={onChange} label="Bildirimler" />);
    const toggle = screen.getByRole("switch", { name: "Bildirimler" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("açıkken aria-checked=true, tıklayınca false", () => {
    const onChange = vi.fn();
    wrap(<Toggle checked onChange={onChange} label="Bildirimler" />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("disabled iken değişmiyor", () => {
    const onChange = vi.fn();
    wrap(<Toggle checked={false} disabled onChange={onChange} label="Bildirimler" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Field içinde etiketi Field'dan alıyor", () => {
    wrap(
      <Field label="Otomatik güncelle" hint="Açılışta denetler">
        <Toggle checked={false} onChange={vi.fn()} />
      </Field>
    );
    const toggle = screen.getByRole("switch", { name: "Otomatik güncelle" });
    expect(describedTexts(toggle)).toEqual(["Açılışta denetler"]);
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/formControls.test.tsx`
Beklenen: FAIL — `Failed to resolve import "../src/ui/Button"`.

- [ ] **Adım 3: `Button`'ı yaz**

`src/ui/Button.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { btn, type BtnVariant } from "./buttons";

// `btn()`'in bileşen hâli (spec §6.2). Sınıf dizesi `btn()`'de kalıyor —
// `DIALOG_CONFIRM_BUTTON` gibi sabitler ve bileşen kullanamayan yerler onu
// doğrudan kullanmaya devam ediyor.
//
// Boylar spec'teki iki kademe: `sm` 32px (araç şeritleri), `md` 40px (pencere
// ayakları, birincil eylemler). `btn()`'in 36px'lik `md`'si bileşende yok;
// ekranlar 2. alt projede taşınırken ihtiyaç çıkarsa buraya eklenir.
//
// Varsayılan `type="button"`: HTML'de düğmenin varsayılanı `submit` ve bir
// formun içine konan her düğme — "Göster", "Ekle" — formu gönderiyordu.

export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "neutral", size = "md", type = "button", className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={btn(variant, size === "sm" ? "sm" : "lg", className ?? "")}
      {...rest}
    />
  );
});
```

- [ ] **Adım 4: `Field`, `Input`, `Textarea`, `Select`'i yaz**

`src/ui/Field.tsx`:

```tsx
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";

// Etiket + girdi + ipucu + hata, tek düzende (spec §6.3).
//
// `Field` içindeki girdiye `id`, `aria-describedby` ve (hata varsa)
// `aria-invalid`'i bağlam (context) üzerinden veriyor; çağıranın bunları
// elle kurması gerekmiyor. Girdiye elle verilen `id` ve `aria-describedby`
// korunuyor: `id` onunki kalıyor, açıklamalar birleştiriliyor.

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface ControlAria {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/** Girdinin kendi niteliklerini `Field`'dan gelenlerle birleştirir. */
export function useFieldControl<P extends ControlAria>(props: P): P {
  const ctx = useContext(FieldContext);
  if (!ctx) return props;
  const describedBy = [props["aria-describedby"], ctx.describedBy].filter(Boolean).join(" ") || undefined;
  return {
    ...props,
    id: props.id ?? ctx.id,
    "aria-describedby": describedBy,
    "aria-invalid": props["aria-invalid"] ?? (ctx.invalid ? true : undefined)
  };
}

export function Field({
  label,
  hint,
  error,
  className,
  children
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const base = useId();
  const id = `${base}-control`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ""}`}>
        <label htmlFor={id} className="text-xs font-medium text-slate-300">
          {label}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-xs text-slate-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-[var(--status-danger-text)]">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

// 40px yükseklik: `Button` md ile aynı hizada dursun. Hata hâli
// `aria-invalid`'den okunuyor, ayrı bir sınıf gerekmesin diye.
export const INPUT_CLASS =
  "w-full rounded-md border border-line-strong bg-control px-3 text-sm text-slate-100 outline-none transition " +
  "placeholder:text-slate-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-[var(--status-danger-text)]";

function join(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={join(`h-10 ${INPUT_CLASS}`, className)} {...useFieldControl(props)} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={join(`py-2 ${INPUT_CLASS}`, className)} {...useFieldControl(props)} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref
) {
  return <select ref={ref} className={join(`h-10 ${INPUT_CLASS}`, className)} {...useFieldControl(props)} />;
});
```

- [ ] **Adım 5: `Toggle`'ı yaz**

`src/ui/Toggle.tsx`:

```tsx
import { useFieldControl } from "./Field";

// Açma/kapama anahtarı (spec §6.3). `role="switch"` + `aria-checked`: ekran
// okuyucu "açık/kapalı" diye okuyor, onay kutusu gibi "işaretli" diye değil.
//
// Düğme açıkken accent dolgulu; topuz `accent-on` rengiyle — açık temada
// accent dolgunun üstünde beyaz, koyu temada koyu duruyor (bkz. index.css
// `--accent-on-rgb`). Kapalıyken nötr kontrol zemini.
//
// Erişilebilir ad: `Field` içindeyse etiketi oradan (`htmlFor`), değilse
// `label` niteliğinden (`aria-label`).

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  const aria = useFieldControl({ id });
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...aria}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-accent-500 bg-accent-500" : "border-line-strong bg-control"
      }`}
    >
      <span
        className={`size-3.5 rounded-full transition-transform ${
          checked ? "translate-x-[18px] bg-accent-on" : "translate-x-[2px] bg-slate-400"
        }`}
      />
    </button>
  );
}
```

- [ ] **Adım 6: Geçtiğini gör**

Çalıştır: `npx vitest run tests/formControls.test.tsx`
Beklenen: PASS (14 test).

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

Çalıştır: `npx vitest run tests/designScale.test.ts`
Beklenen: PASS (yeni dosyalarda `text-[Npx]` yok; cırcır yerinde).

- [ ] **Adım 7: Commit**

```bash
git add src/ui/Button.tsx src/ui/Field.tsx src/ui/Toggle.tsx tests/formControls.test.tsx
git commit -m "Tasarim: Button, Field/Input/Textarea/Select ve Toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 7: `Card`, `Tabs`, `EmptyState`

Ekranlarda en sık tekrarlanan üç kalıbın ortak hâli. Bu alt projede hiçbir ekran bunlara taşınmıyor (2. alt proje); burada yalnızca yazılıp test ediliyorlar. Görev 9'daki Görünüm bölümü `Card` kullanmıyor, ayar sayfasının kendi düzeni var.

**Dosyalar:**
- Oluştur: `src/ui/Card.tsx`
- Oluştur: `src/ui/Tabs.tsx`
- Oluştur: `src/ui/EmptyState.tsx`
- Test: `tests/layoutParts.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: Tailwind `bg-card`, `bg-control`, `bg-hover`, `border-line`, `shadow-elev-1`, `rounded-xl` (Görev 1 sonrası 12px), `text-*` ölçeği.
- Üretir:
  - `src/ui/Card.tsx`: `export function Card(props: HTMLAttributes<HTMLDivElement> & { flush?: boolean })` — `flush` iç dolguyu (`p-5`) kaldırır.
  - `src/ui/Tabs.tsx`: `export interface TabItem<T extends string> { value: T; label: ReactNode }` · `export function Tabs<T extends string>(props: { label: string; items: TabItem<T>[]; value: T; onChange: (value: T) => void; children?: ReactNode; className?: string })` — `children` seçili sekmenin paneli olarak `role="tabpanel"` içinde çiziliyor.
  - `src/ui/EmptyState.tsx`: `export function EmptyState(props: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string })`.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/layoutParts.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Kart, sekme ve boş durum (tasarım sistemi temeli, spec §6.4). Sekme
// testleri klavyeyi sabitliyor: ok tuşları seçimi VE odağı birlikte
// taşıyor, uçlarda başa/sona dönüyor, Home/End ilk/son sekmeye gidiyor.

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { Card } from "../src/ui/Card";
import { EmptyState } from "../src/ui/EmptyState";
import { Tabs } from "../src/ui/Tabs";

afterEach(cleanup);

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

describe("Card", () => {
  it("kart yüzeyi, 12px köşe, ince kenarlık, iç dolgu", () => {
    wrap(<Card data-testid="kart">içerik</Card>);
    const card = screen.getByTestId("kart");
    for (const cls of ["bg-card", "rounded-xl", "border", "border-line", "p-5"]) {
      expect(card.classList.contains(cls)).toBe(true);
    }
    expect(card.textContent).toBe("içerik");
  });

  it("flush iç dolguyu kaldırıyor, ek sınıf ekleniyor", () => {
    wrap(
      <Card data-testid="kart" flush className="overflow-hidden">
        x
      </Card>
    );
    const card = screen.getByTestId("kart");
    expect(card.classList.contains("p-5")).toBe(false);
    expect(card.classList.contains("overflow-hidden")).toBe(true);
  });
});

type Section = "genel" | "gorunum" | "gelismis";
const ITEMS = [
  { value: "genel" as const, label: "Genel" },
  { value: "gorunum" as const, label: "Görünüm" },
  { value: "gelismis" as const, label: "Gelişmiş" }
];

function TabsHarness({ onChange }: { onChange?: (v: Section) => void }) {
  const [value, setValue] = useState<Section>("genel");
  return (
    <Tabs
      label="Ayar bölümleri"
      items={ITEMS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    >
      <p>{`panel:${value}`}</p>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("roller ve bağlar: tablist etiketi, seçili sekme paneli etiketliyor", () => {
    wrap(<TabsHarness />);
    expect(screen.getByRole("tablist", { name: "Ayar bölümleri" })).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(tabs[0].getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.textContent).toBe("panel:genel");
  });

  it("gezici tabindex: yalnızca seçili sekme Tab sırasında", () => {
    wrap(<TabsHarness />);
    expect(screen.getAllByRole("tab").map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("tıklama seçiyor", () => {
    const onChange = vi.fn();
    wrap(<TabsHarness onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Gelişmiş" }));
    expect(onChange).toHaveBeenCalledWith("gelismis");
    expect(screen.getByRole("tabpanel").textContent).toBe("panel:gelismis");
  });

  it("sağ ok bir sonrakine, sondan başa dönüyor; odak da taşınıyor", () => {
    wrap(<TabsHarness />);
    const [first, second, third] = screen.getAllByRole("tab");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(second, { key: "ArrowRight" });
    fireEvent.keyDown(third, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-selected")).toBe("true");
  });

  it("sol ok baştan sona dönüyor; Home ve End uçlara gidiyor", () => {
    wrap(<TabsHarness />);
    const [first, , third] = screen.getAllByRole("tab");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: "Home" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "End" });
    expect(document.activeElement).toBe(third);
    expect(screen.getByRole("tabpanel").textContent).toBe("panel:gelismis");
  });

  it("başka tuşlar seçimi değiştirmiyor", () => {
    const onChange = vi.fn();
    wrap(<TabsHarness onChange={onChange} />);
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "a" });
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "ArrowDown" });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("EmptyState", () => {
  it("başlık, açıklama ve eylem çiziliyor; simge ekran okuyucuya gizli", () => {
    const onAdd = vi.fn();
    const { container } = wrap(
      <EmptyState
        icon={<svg data-testid="simge" />}
        title="Henüz sistem yok"
        description="İlk SAP sistemini ekleyerek başla."
        action={
          <button type="button" onClick={onAdd}>
            Sistem ekle
          </button>
        }
      />
    );
    expect(screen.getByText("Henüz sistem yok")).toBeTruthy();
    expect(screen.getByText("İlk SAP sistemini ekleyerek başla.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sistem ekle" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("simge").parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).not.toContain("undefined");
  });

  it("yalnız başlıkla da çiziliyor", () => {
    wrap(<EmptyState title="Boş" />);
    expect(screen.getByText("Boş")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/layoutParts.test.tsx`
Beklenen: FAIL — `Failed to resolve import "../src/ui/Card"`.

- [ ] **Adım 3: `Card`'ı yaz**

`src/ui/Card.tsx`:

```tsx
import type { HTMLAttributes } from "react";

// Dolgulu yüzey (spec §6.4): `card` zemini, 12px köşe, saç teli kenarlık.
// Gölge yok — koyu temada gölge görünmüyor, açık temada kenarlık yetiyor;
// yükselti yalnızca üstte yüzen şeylerde (pencere, menü) kullanılıyor.
// `flush`: içinde kendi dolgusu olan liste/tablo taşıyan kartlar için.

export function Card({ flush = false, className, ...rest }: HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  const base = `rounded-xl border border-line bg-card${flush ? "" : " p-5"}`;
  return <div className={className ? `${base} ${className}` : base} {...rest} />;
}
```

- [ ] **Adım 4: `Tabs`'ı yaz**

`src/ui/Tabs.tsx`:

```tsx
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

// Sekmeler (spec §6.4), WAI-ARIA "tabs" kalıbı, otomatik etkinleştirme:
// ok tuşu seçimi ve odağı birlikte taşıyor. Yalnızca seçili sekme Tab
// sırasında (gezici tabindex) — Tab tuşu sekme şeridinden panele atlıyor,
// her sekmede durmuyor.
//
// Bileşen denetimli (controlled): seçili değer çağıranda. `children` seçili
// sekmenin paneli; paneller arasında durum saklamak çağıranın işi.

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  children,
  className
}: {
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  children?: ReactNode;
  className?: string;
}) {
  const base = useId();
  const tabId = (v: T) => `${base}-tab-${v}`;
  const panelId = `${base}-panel`;
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());

  function selectAt(index: number) {
    const item = items[(index + items.length) % items.length];
    onChange(item.value);
    tabRefs.current.get(item.value)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.value === value);
    if (e.key === "ArrowRight") selectAt(index + 1);
    else if (e.key === "ArrowLeft") selectAt(index - 1);
    else if (e.key === "Home") selectAt(0);
    else if (e.key === "End") selectAt(items.length - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="inline-flex items-center gap-1 rounded-lg border border-line bg-control p-1"
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                if (el) tabRefs.current.set(item.value, el);
                else tabRefs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={selected}
              aria-controls={selected ? panelId : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={`h-8 rounded-md px-3 text-sm font-medium transition ${
                selected ? "bg-card text-white shadow-elev-1" : "text-slate-400 hover:bg-hover hover:text-slate-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)} tabIndex={0} className="mt-4 outline-none">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Adım 5: `EmptyState`'i yaz**

`src/ui/EmptyState.tsx`:

```tsx
import type { ReactNode } from "react";

// Boş liste/ekran (spec §6.4): simge + başlık + açıklama + isteğe bağlı
// eylem. Simge süs; ekran okuyucuya gizli. Başlık bir başlık ETİKETİ değil
// düz metin: sayfadaki başlık sırasını bozmasın.

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center${className ? ` ${className}` : ""}`}>
      {icon && (
        <div aria-hidden="true" className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-control text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-white">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
```

- [ ] **Adım 6: Geçtiğini gör**

Çalıştır: `npx vitest run tests/layoutParts.test.tsx`
Beklenen: PASS (10 test).

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Adım 7: Commit**

```bash
git add src/ui/Card.tsx src/ui/Tabs.tsx src/ui/EmptyState.tsx tests/layoutParts.test.tsx
git commit -m "Tasarim: Card, Tabs ve EmptyState

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 8: Beş pencere ortak `Modal`'a taşınıyor

Spec §6'nın "ortak parça gerçekten çalışıyor mu" kanıtı: `ConfirmDialog`, `ChatInstructionsDialog`, `ChatProjectDialog`, `AddSystemModal`, `SettingsModal`. Her birinden kendi arka planı, kendi `onKeyDown` Escape'i, kendi X düğmesi, `confirmDiscard` durumu ve kardeş `ConfirmDialog`'u kalkıyor; yerine `<Modal dirty={…}>` ve ayakta `<ModalCancelButton />` geliyor. Alanlar Görev 6'nın `Field` / `Input` / `Textarea`'sına, düğmeler `Button`'a geçiyor. Diğer 10 pencere 2. alt projede.

Kural: `tests/dialogDataLoss.test.tsx` bu görevde **değişmiyor** ve yeşil kalıyor — veri kaybı kapıları taşımadan sonra da aynı.

**Dosyalar:**
- Değiştir (tamamı yeniden yazılıyor): `src/components/ConfirmDialog.tsx`, `src/components/ChatInstructionsDialog.tsx`, `src/components/ChatProjectDialog.tsx`, `src/components/AddSystemModal.tsx`
- Değiştir (parça parça): `src/components/SettingsModal.tsx`
- Test: `tests/dialogMigration.test.tsx` (yeni)
- Dokunulmuyor: `tests/dialogDataLoss.test.tsx`; `ConfirmDialog`'u kullanan `src/App.tsx`, `src/components/AxetCodeHome.tsx` (props aynı kalıyor)

**Arayüzler:**
- Tüketir:
  - Görev 5: `Modal`, `ModalCancelButton` (`src/ui/Modal.tsx`). `Modal` props: `open, onClose, title, dirty?, layer?, width?, icon?, subtitle?, footer?, children?`. `ModalCancelButton` props: `label?, autoFocus?`.
  - Görev 6: `Button` (`src/ui/Button.tsx`; `variant?: "neutral"|"primary"|"danger"|"ghost"`, `size?: "sm"|"md"`, varsayılan `type="button"`, geri kalan her şey `<button>`'a gidiyor). `Field({label, hint?, error?, className?, children})`, `Input`, `Textarea` (`src/ui/Field.tsx`; `Field` içindeki girdi etikete, ipucuna ve hataya kendiliğinden bağlanıyor, hata varken `aria-invalid="true"`).
  - Görev 1: `text-2xs` (11px), `text-xs`.
- Üretir: dışarıdan görünen props'lar DEĞİŞMİYOR. `ConfirmDialog` artık `confirm` katmanında bir `Modal` — açık bir pencerenin üstünde açılıyor, Escape yalnızca onu kapatıyor. Beş dosyada `text-[Npx]`, `fixed inset-0` ve `z-[N]` kalmıyor.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/dialogMigration.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Beş pencere ortak `Modal`'a taşındı (tasarım sistemi temeli, spec §6).
// `dialogDataLoss.test.tsx` veri kaybı kapılarını zaten sabitliyor; bu dosya
// taşımayla GELEN davranışı sabitliyor: her pencere başlığına bağlı bir
// `dialog`, X ve odak dışarıdayken Escape çalışıyor, AddSystem'in ayaktaki
// gönder düğmesi forma bağlı, Ayarlar'da değişiklik varken kapatmak soruyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, ChatProject } from "../app-electron/shared/types";
import AddSystemModal from "../src/components/AddSystemModal";
import ChatInstructionsDialog from "../src/components/ChatInstructionsDialog";
import ChatProjectDialog from "../src/components/ChatProjectDialog";
import ConfirmDialog from "../src/components/ConfirmDialog";
import SettingsModal from "../src/components/SettingsModal";
import { LanguageProvider } from "../src/i18n";
import { DIALOG_CONFIRM_BUTTON, DIALOG_DANGER_BUTTON } from "../src/ui/buttons";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const DISCARD_TITLE = "Değişiklikleri at?";

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

function setApi(api: Record<string, unknown>) {
  (window as unknown as { api: unknown }).api = api;
}

function outsideButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "dışarıda";
  document.body.appendChild(button);
  return button;
}

/** Tek açık pencerenin `aria-labelledby` ile bağlı başlık metni. */
function dialogTitle(): string {
  const dialog = screen.getByRole("dialog");
  return document.getElementById(dialog.getAttribute("aria-labelledby") ?? "")?.textContent ?? "";
}

describe("ConfirmDialog", () => {
  function mount(danger?: boolean) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    wrap(
      <ConfirmDialog
        open
        title="Silinsin mi?"
        message="Geri alınamaz."
        danger={danger}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    return { onConfirm, onCancel };
  }

  it("başlığa bağlı dialog; açılışta odak İptal'de", () => {
    mount();
    expect(dialogTitle()).toBe("Silinsin mi?");
    expect(screen.getByText("Geri alınamaz.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İptal" }));
  });

  it("Onayla onConfirm'ü, İptal ve X onCancel'ı çağırıyor", () => {
    const { onConfirm, onCancel } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("odak dışarıdayken de Escape onCancel'ı çağırıyor", () => {
    const { onCancel } = mount();
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("yıkıcıyken kırmızı dolgu, değilken vurgu dolgusu", () => {
    mount(true);
    expect(screen.getByRole("button", { name: "Onayla" }).className).toBe(DIALOG_DANGER_BUTTON);
    cleanup();
    document.body.innerHTML = "";
    mount(false);
    expect(screen.getByRole("button", { name: "Onayla" }).className).toBe(DIALOG_CONFIRM_BUTTON);
  });
});

describe("ChatInstructionsDialog", () => {
  function mount() {
    setApi({
      readTextFile: vi.fn(() => Promise.resolve({ ok: true, content: "A" })),
      writeTextFile: vi.fn(() => Promise.resolve({ ok: true }))
    });
    const onClose = vi.fn();
    wrap(<ChatInstructionsDialog cwd={"C:\\proje"} onClose={onClose} onSaved={vi.fn()} />);
    return { onClose };
  }

  it("başlıklı dialog, dosya yolu görünüyor, değişiklik yokken X kapatıyor", async () => {
    const { onClose } = mount();
    await screen.findByDisplayValue("A");
    expect(dialogTitle()).toBe("Proje yönergeleri");
    expect(screen.getByText("C:\\proje\\AGENTS.md")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("odak dışarıdayken Escape, değişiklik varsa önce soruyor", async () => {
    const { onClose } = mount();
    fireEvent.change(await screen.findByDisplayValue("A"), { target: { value: "AB" } });
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
  });
});

describe("ChatProjectDialog", () => {
  const PROJECT = { id: "p1", name: "Fatura", instructions: "Kısa yaz." } as ChatProject;

  function mount() {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onDelete = vi.fn();
    wrap(<ChatProjectDialog project={PROJECT} onClose={onClose} onSave={onSave} onDelete={onDelete} />);
    return { onClose, onSave, onDelete };
  }

  it("etiket girdiye bağlı; adda Enter kırpılmış adla kaydedip kapatıyor", () => {
    const { onClose, onSave } = mount();
    expect(dialogTitle()).toBe("Proje");
    const nameInput = screen.getByLabelText("Proje adı");
    expect(document.activeElement).toBe(nameInput);
    fireEvent.change(nameInput, { target: { value: "  Yeni ad  " } });
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("Yeni ad", "Kısa yaz.");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("silme iki aşamalı ve AYNI pencerenin içinde", () => {
    const { onClose, onDelete } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Projeyi sil" }));
    expect(screen.getByText(/Emin misin\?/)).toBeTruthy();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Evet, sil" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("değişiklik varken X önce soruyor", () => {
    const { onClose } = mount();
    fireEvent.change(screen.getByLabelText("Proje talimatı"), { target: { value: "Uzun yaz." } });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
  });
});

describe("AddSystemModal", () => {
  function mount() {
    const api = {
      addManualSystem: vi.fn(() => Promise.resolve({ id: "m1" })),
      updateManualSystem: vi.fn(() => Promise.resolve(null))
    };
    setApi(api);
    const onClose = vi.fn();
    const onAdded = vi.fn();
    wrap(<AddSystemModal open onClose={onClose} onAdded={onAdded} />);
    return { api, onClose, onAdded };
  }

  it("başlık, etiketli ilk alan odakta, tür düğmesi basılı hâlini bildiriyor", () => {
    mount();
    expect(dialogTitle()).toBe("Yeni SAP Sistemi Ekle");
    expect(document.activeElement).toBe(screen.getByLabelText("Görünen Ad"));
    expect(screen.getByRole("button", { name: "On-Premise" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "BTP / Cloud" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("ayaktaki Ekle düğmesi formun dışında ama formu gönderiyor", async () => {
    const { api, onClose, onAdded } = mount();
    fireEvent.change(screen.getByLabelText("Görünen Ad"), { target: { value: "Test DEV" } });
    fireEvent.change(screen.getByLabelText("Sistem ID (SID)"), { target: { value: "t01" } });
    fireEvent.change(screen.getByLabelText("Host (IP veya hostname)"), { target: { value: "sap.example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    await waitFor(() =>
      expect(api.addManualSystem).toHaveBeenCalledWith({
        name: "Test DEV",
        systemId: "T01",
        type: "onprem",
        host: "sap.example.com",
        diagPort: 3200,
        adtUrl: null
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onAdded).toHaveBeenCalledWith("m1");
  });

  it("DIAG portu geçersizse girdi aria-invalid, hata ona bağlı, Ekle kapalı", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Görünen Ad"), { target: { value: "Test DEV" } });
    fireEvent.change(screen.getByLabelText("Sistem ID (SID)"), { target: { value: "T01" } });
    fireEvent.change(screen.getByLabelText("Host (IP veya hostname)"), { target: { value: "sap.example.com" } });
    const port = screen.getByLabelText("SAPGUI Dispatcher (DIAG) Portu");
    fireEvent.change(port, { target: { value: "abc" } });
    expect(port.getAttribute("aria-invalid")).toBe("true");
    const described = (port.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain("Port 1–65535 arasında bir sayı olmalı.");
    expect(screen.getByRole("button", { name: "Ekle" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("SettingsModal", () => {
  const CONFIG = {
    language: "tr",
    theme: "dark",
    projectsBaseDir: "C:\\projeler",
    axetWorkspaceDir: "C:\\axet",
    chatDisplayName: "Deneme",
    chatFontSize: "md",
    chatDensity: "comfortable",
    chatSidebarOpen: true,
    axetCommand: "axet",
    terminal: "cmd",
    landscapePathOverride: null,
    sapShcutPathOverride: null,
    autoCheckUpdates: true,
    connectorEnabled: { outlook: true }
  } as unknown as AppConfig;

  function mount() {
    setApi({
      getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
      getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
      onUpdateStatus: vi.fn(() => () => {}),
      validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
      pickFolder: vi.fn(() => Promise.resolve(null)),
      checkForUpdates: vi.fn(() => Promise.resolve()),
      downloadUpdate: vi.fn(() => Promise.resolve()),
      installUpdate: vi.fn(() => Promise.resolve())
    });
    const onClose = vi.fn();
    const onSave = vi.fn(() => Promise.resolve());
    wrap(
      <SettingsModal
        open
        onClose={onClose}
        config={CONFIG}
        onSave={onSave}
        onExportManualSystems={vi.fn(() => Promise.resolve())}
        onImportManualSystems={vi.fn(() => Promise.resolve())}
      />
    );
    return { onClose, onSave };
  }

  it("Ayarlar başlıklı dialog; değişiklik yokken X kapatıyor", () => {
    const { onClose } = mount();
    expect(dialogTitle()).toBe("Ayarlar");
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("değişiklik varken rozet çıkıyor; odak dışarıdayken Escape soruyor; At ve Kapat kaydetmeden kapatıyor", () => {
    const { onClose, onSave } = mount();
    fireEvent.change(screen.getByDisplayValue("Deneme"), { target: { value: "Yeni" } });
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "At ve Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Kaydet yalnızca düzenlenen alanları yolluyor ve kapatıyor", async () => {
    const { onClose, onSave } = mount();
    fireEvent.change(screen.getByDisplayValue("Deneme"), { target: { value: "Yeni" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as Partial<AppConfig>;
    expect(patch.chatDisplayName).toBe("Yeni");
    expect("connectorEnabled" in patch).toBe(false);
  });
});

describe("taşınan dosyalar", () => {
  const DIR = path.join(__dirname, "..", "src", "components");
  const FILES = [
    "ConfirmDialog.tsx",
    "ChatInstructionsDialog.tsx",
    "ChatProjectDialog.tsx",
    "AddSystemModal.tsx",
    "SettingsModal.tsx"
  ];

  it("kendi arka planını, katmanını ve px yazı boyunu taşımıyor", () => {
    for (const file of FILES) {
      const src = readFileSync(path.join(DIR, file), "utf8");
      expect(src, file).not.toMatch(/text-\[[0-9.]+px\]/);
      expect(src, file).not.toMatch(/fixed inset-0/);
      expect(src, file).not.toMatch(/z-\[\d+\]/);
      expect(src, file).not.toMatch(/import ConfirmDialog/);
    }
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/dialogMigration.test.tsx`
Beklenen: FAIL — ör. `dialogTitle` boş dönüyor (pencerelerde `role="dialog"` yok), "Kapat" adlı düğme bulunamıyor, `getByLabelText("Proje adı")` bulunamıyor, "taşınan dosyalar" `text-[11px]` buluyor.

- [ ] **Adım 3: `ConfirmDialog`'u yeniden yaz**

`src/components/ConfirmDialog.tsx` (tamamı):

```tsx
import { AlertTriangle } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Evet/hayır onayı. Ortak `Modal`'ın `confirm` katmanında: açık bir pencerenin
// üstünde de açılabiliyor ve Escape yalnızca bunu kapatıyor, alttakini değil.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  onConfirm,
  onCancel
}: Props) {
  const t = useT();
  return (
    <Modal
      open={open}
      layer="confirm"
      width={400}
      title={title}
      icon={<AlertTriangle size={18} className={danger ? "text-[var(--status-danger-text)]" : "text-accent-400"} />}
      onClose={onCancel}
      footer={
        <>
          {/* Düğmeler tek yerden: `src/ui/buttons.ts` (`Button` onu kullanıyor).
              Onay düğmesi DÜZ DOLGU (yeni tasarım dili: gradyan/gölge yok,
              saydam "hayalet" dolgu da yok). Yıkıcı hâlde vurgu yerine
              `--status-danger-solid` dolduruyor — kullanıcı kırmızıya basarken
              neye bastığını rengin kendisinden görüyor, ince bir kenarlıktan
              değil. */}
          <ModalCancelButton label={cancelLabel} autoFocus />
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel ?? t("confirmDialog.confirm")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-400">{message}</p>
    </Modal>
  );
}
```

- [ ] **Adım 4: `ChatInstructionsDialog`'u yeniden yaz**

`src/components/ChatInstructionsDialog.tsx` (tamamı; baştaki açıklama, `joinPath`, `Props`, okuma efekti ve `save` aynen korunuyor, yalnızca `confirmDiscard` kalkıyor):

```tsx
import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

// Proje yönergeleri = çalışma klasöründeki `AGENTS.md`. Kendi icat ettiğimiz
// bir mekanizma DEĞİL: axet-code bu dosyayı kendi bağlam dosyası olarak
// okuyor. 2026-09-05'te ölçüldü — boş bir klasörde `AGENTS.md`'ye "her cevaba
// ZZQ7 ile başla" yazıldığında cevap `ZZQ7 4` geldi.
//
// Dosya adı neden `AGENTS.md`: axet-code'un "Initialize Project" komutunun
// varsayılanı bu (`--init` bayrağının açıklamasında `default=AGENTS.md`,
// alternatifler `AXET.md`/`CLAUDE.md`). Terminalde de aynı dosya okunuyor,
// yani buradan yazılan yönerge gömülü terminaldeki oturumlarda da geçerli.
//
// AYNI KLASÖRDEKİ TÜM SOHBETLER etkileniyor — bu dosya sohbete değil KLASÖRE
// ait. Sohbete özel yönerge ayrı bir iş (bizim prompt'a eklememiz gerekirdi ve
// her turda jeton yerdi); burada bilinçli olarak yapılmadı.

const FILE_NAME = "AGENTS.md";

// `path` çizici süreçte yok. Tek ihtiyaç bir dosya adı eklemek, ama sondaki
// ayraç iki kere yazılırsa (`C:\x\\AGENTS.md`) ana süreçteki izin kontrolü
// yolu farklı normalleştirebilir — o yüzden bir kez kırpılıyor.
function joinPath(dir: string, name: string): string {
  return `${dir.replace(/[\\/]+$/, "")}\\${name}`;
}

interface Props {
  /** Sohbetin çalışma klasörü. `null` ise diyalog çizilmiyor. */
  cwd: string | null;
  onClose: () => void;
  /** Kaydedildikten sonra: etkilenen sohbetlerin TUI oturumlarını bırak. */
  onSaved: (cwd: string) => void;
}

export default function ChatInstructionsDialog({ cwd, onClose, onSaved }: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `readTextFile` 2 MB'ın üstünü KESEREK okuyor. Bir yönerge dosyasının o
  // boyuta ulaşması gerçekçi değil, ama olsaydı kaydetmek dosyanın kalanını
  // sessizce silerdi — o yüzden kesilmiş içerik kaydedilemiyor.
  const [truncated, setTruncated] = useState(false);
  // Açılıştaki içerik — "kaydedilmemiş değişiklik var mı" bununla ölçülüyor.
  const [initialText, setInitialText] = useState("");
  // Dosya VAR ama okunamadı (izin, kilit, OneDrive'da inmemiş dosya…). Bu
  // durumda kutu boş açılıp Kaydet'e izin verseydi, `save` oluşturma izniyle
  // yazdığı için var olan dosyanın üstüne BOŞ metin giderdi — 2026-09-28'e
  // kadar tam olarak böyleydi. Artık metin kutusu hiç çizilmiyor, Kaydet kapalı.
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cwd) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setReadError(null);
    const open = (content: string) => {
      setText(content);
      setInitialText(content);
    };
    // Dosya YOKSA hata değil: yönergesi olmayan bir klasör normal durum, kutu
    // boş açılıyor ve kaydedince dosya oluşturuluyor (bkz. `save`, allowCreate).
    // "Yok" YALNIZCA ENOENT demek; başka her başarısızlık okuma hatası.
    window.api
      .readTextFile(joinPath(cwd, FILE_NAME))
      .then((res) => {
        if (!alive) return;
        if (res.ok) {
          open(res.content ?? "");
        } else if (res.code === "ENOENT") {
          open("");
        } else {
          open("");
          setReadError(res.error ?? t("common.unknownError"));
        }
        setTruncated(res.ok && res.truncated === true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        open("");
        setReadError(err instanceof Error ? err.message : String(err));
        setTruncated(false);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cwd]);

  if (!cwd) return null;

  // Kaydedilmemiş değişiklik. `Modal` her kapatma isteğinde (Escape — metin
  // kutusunun İÇİNDEYKEN de —, X, İptal) buna bakıp önce "Değişiklikleri at?"
  // diye soruyor. Yüklenirken ya da dosya okunamamışken sorulacak bir şey yok.
  const dirty = !loading && !readError && text !== initialText;

  const save = async () => {
    if (readError || truncated) return;
    setSaving(true);
    setError(null);
    // Üçüncü argüman OLMAZSA OLMAZ: `writeTextFile` varsayılan olarak var olmayan
    // bir dosyaya yazmayı reddediyor (ENOENT) ve bir klasörün İLK yönergesi tanım
    // gereği henüz yok — yani izinsiz hâli tam da en sık durumda patlıyordu.
    const res = await window.api.writeTextFile(joinPath(cwd, FILE_NAME), text, true);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? t("common.unknownError"));
      return;
    }
    onSaved(cwd);
    // Kaydedilmiş bir şey "atılamaz": onay kapısından geçmeden kapanıyor.
    onClose();
  };

  const filePath = joinPath(cwd, FILE_NAME);

  return (
    <Modal
      open
      onClose={onClose}
      dirty={dirty}
      title={t("chatInstructions.title")}
      subtitle={t("chatInstructions.description")}
      icon={<BookOpen size={18} />}
      width={620}
      footer={
        <>
          <ModalCancelButton />
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={loading || saving || truncated || readError !== null}
            title={truncated ? t("chatInstructions.tooLarge") : undefined}
          >
            {saving ? t("chatInstructions.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 truncate font-mono text-2xs text-slate-500" title={filePath}>
        {filePath}
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : readError !== null ? (
        <div className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-xs leading-relaxed text-[var(--status-danger-text)]">
          {t("chatInstructions.readFailed", { error: readError })}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          spellCheck={false}
          aria-label={t("chatInstructions.title")}
          placeholder={t("chatInstructions.placeholder")}
          className="chat-scroll min-h-[240px] resize-y font-mono"
        />
      )}

      {/* Yeniden başlatma uyarısı ÖLÇÜLMÜŞ bir davranışa dayanıyor: bağlam
          dosyaları süreç açılışında okunuyor, çalışan bir oturuma sonradan
          yazılan AGENTS.md'yi o oturum GÖRMÜYOR (2026-09-05 ölçümü: aynı
          süreçte ZZQ7 yok, yeni süreçte var). Bu yüzden kaydettikten sonra
          etkilenen sohbetlerin oturumları bırakılıyor. */}
      <p className="mt-3 text-2xs text-slate-500">
        {truncated ? t("chatInstructions.tooLarge") : t("chatInstructions.restartNote")}
      </p>
      {error && <p className="mt-2 text-xs text-[var(--status-danger-text)]">{error}</p>}
    </Modal>
  );
}
```

Not: yükleme sırasında gövdede odaklanacak öğe yok; `Modal` odağı ayaktaki İptal'e veriyor. Metin kutusu geldiğinde `autoFocus` odağı ona alıyor.

- [ ] **Adım 5: `ChatProjectDialog`'u yeniden yaz**

`src/components/ChatProjectDialog.tsx` (tamamı):

```tsx
import { useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import type { ChatProject } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

// Bir projenin TÜM ayarları tek kutuda: adı, kalıcı talimatı ve silme.
//
// Neden ayrı bir "yeniden adlandır" satır içi düzenlemesi YOK: kenar
// çubuğundaki proje başlığına dört ayrı düğme (yeni sohbet / ad / talimat /
// sil) sığdırmak 272px'lik bir sütunu okunmaz hâle getiriyordu. Ad ve talimat
// zaten aynı kararın iki parçası, ikisi de burada.
//
// Silme onayı bu kutunun İÇİNDE, ayakta iki aşamalı — üstüne ikinci bir
// pencere açmak arkadaki kutunun hangi projeye ait olduğunu gizlerdi.
//
// `ChatInstructionsDialog` ile KARIŞTIRILMAMALI: o kutu klasöre ait
// `AGENTS.md` dosyasını düzenliyor (axet-code onu süreç açılışında kendisi
// okuyor), bu ise sohbete ait ve prompt'a bizim eklediğimiz bir metin.

interface Props {
  /** `null` ise kutu çizilmiyor. */
  project: ChatProject | null;
  onClose: () => void;
  onSave: (name: string, instructions: string) => void;
  onDelete: () => void;
}

export default function ChatProjectDialog({ project, onClose, onSave, onDelete }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Kutu her açılışta O projenin değerleriyle doluyor. Bağımlılık `project.id`
  // değil `project`: aynı projeyi kapatıp açmak da alanları tazelemeli.
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setInstructions(project.instructions);
    setConfirmingDelete(false);
  }, [project]);

  if (!project) return null;

  const trimmedName = name.trim();

  // Kaydedilmemiş değişiklik. `Modal` her kapatma isteğinde (Escape — metin
  // kutusunun İÇİNDEYKEN de —, X, İptal) buna bakıp önce soruyor; eskiden
  // yazılan talimat tek tuşla gidiyordu.
  const dirty = name !== project.name || instructions !== project.instructions;

  const save = () => {
    // Adsız proje kenar çubuğunda tıklanamaz bir boşluk olurdu; eski ad
    // korunuyor.
    onSave(trimmedName || project.name, instructions);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      dirty={dirty}
      title={t("chatProject.title")}
      icon={<FolderOpen size={18} />}
      width={560}
      footer={
        confirmingDelete ? (
          <>
            <span className="mr-auto min-w-0 flex-1 text-xs leading-snug text-slate-400">
              {t("chatProject.deleteConfirm")}
            </span>
            <Button variant="danger" onClick={onDelete}>
              {t("chatProject.deleteYes")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)} className="mr-auto">
              <Trash2 size={14} />
              {t("chatProject.delete")}
            </Button>
            <ModalCancelButton />
            <Button variant="primary" onClick={save}>
              {t("common.save")}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t("chatProject.nameLabel")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            // Ana süreçteki `chatStore.ts` adı 80 karakterde KESİYOR. Sınır
            // burada yoksa kullanıcının yazdığı ad kaydedilmiş görünür, sonraki
            // açılışta sessizce kısalırdı.
            maxLength={80}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            placeholder={t("chatProject.namePlaceholder")}
          />
        </Field>

        <Field label={t("chatProject.instructionsLabel")} hint={t("chatProject.instructionsHint")}>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            // Aynı gerekçe: talimat diskte 8000 karakterde kesiliyor.
            maxLength={8000}
            spellCheck={false}
            placeholder={t("chatProject.instructionsPlaceholder")}
            className="chat-scroll min-h-[180px] resize-y font-mono"
          />
        </Field>

        {/* İki yönerge mekanizmasının karıştırılması en olası yanlış anlama:
            kullanıcı buraya "her cevabı Türkçe yaz" yazıp terminalde neden
            geçerli olmadığını sorabilir. */}
        <p className="text-2xs text-slate-500">{t("chatProject.folderNote")}</p>
      </div>
    </Modal>
  );
}
```

- [ ] **Adım 6: `AddSystemModal`'ı yeniden yaz**

`src/components/AddSystemModal.tsx` (tamamı). Gönder düğmesi pencerenin ayağında, yani `<form>`'un DIŞINDA; `form={formId}` onu forma bağlıyor. Enter ile gönderme de bu sayede çalışıyor (tarayıcı formun "varsayılan düğmesi"ni `form` özniteliğiyle de buluyor). `useId` erken `return`'den ÖNCE çağrılmalı — kanca sırası.

```tsx
import { useEffect, useId, useState } from "react";
import { ServerCog, Cloud, Loader2, CheckCircle2 } from "lucide-react";
import type { ManualSystemType } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

export interface EditingManualSystem {
  id: string;
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
}

// Kutunun açılıştaki değerleri. Hem alanları doldurmak hem de "kaydedilmemiş
// değişiklik var mı" ölçmek için TEK kaynak — ikisi ayrı yazılsaydı biri
// değiştiğinde öbürü unutulur, kutu hiç dokunulmamışken "atılsın mı?" sorardı.
function initialValues(editing: EditingManualSystem | null | undefined) {
  return {
    type: editing?.type ?? ("onprem" as ManualSystemType),
    name: editing?.name ?? "",
    systemId: editing?.systemId ?? "",
    host: editing?.host ?? "",
    diagPort: editing?.diagPort ? String(editing.diagPort) : "3200",
    adtUrl: editing?.adtUrl ?? ""
  };
}

interface Props {
  open: boolean;
  editing?: EditingManualSystem | null;
  onClose: () => void;
  onAdded: (id: string | null) => void;
}

const TYPE_BUTTON =
  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition";

export default function AddSystemModal({ open, editing, onClose, onAdded }: Props) {
  const t = useT();
  const formId = useId();
  const [type, setType] = useState<ManualSystemType>("onprem");
  const [name, setName] = useState("");
  const [systemId, setSystemId] = useState("");
  const [host, setHost] = useState("");
  const [diagPort, setDiagPort] = useState("3200");
  const [adtUrl, setAdtUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    const init = initialValues(editing);
    setType(init.type);
    setName(init.name);
    setSystemId(init.systemId);
    setHost(init.host);
    setDiagPort(init.diagPort);
    setAdtUrl(init.adtUrl);
    setError(null);
  }, [open, editing?.id]);

  if (!open) return null;

  const reset = () => {
    setType("onprem");
    setName("");
    setSystemId("");
    setHost("");
    setDiagPort("3200");
    setAdtUrl("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Kaydedilmemiş değişiklik. `Modal` her kapatma isteğinde (Escape, X, İptal)
  // buna bakıp önce soruyor — yazılmış bir host/ADT adresi tek tuşla sessizce
  // gitmiyor. Başarılı kayıttan sonraki kapanış bu kapıdan GEÇMİYOR
  // (`handleClose` doğrudan): kaydedilmiş bir şey "atılamaz".
  const init = initialValues(editing);
  const dirty =
    type !== init.type ||
    name !== init.name ||
    systemId !== init.systemId ||
    host !== init.host ||
    diagPort !== init.diagPort ||
    adtUrl !== init.adtUrl;

  // DIAG portu: boş bırakılabilir ama yazıldıysa geçerli bir port olmalı.
  // Eskiden `Number("abc")` → NaN → JSON'a `null` olarak yazılıyordu; kullanıcı
  // yanlış yazdığını hiç öğrenmiyor, sistem sadece sessizce "erişilemiyor"
  // oluyordu.
  const diagPortTrimmed = diagPort.trim();
  const diagPortValid =
    diagPortTrimmed.length === 0 ||
    (/^\d+$/.test(diagPortTrimmed) && Number(diagPortTrimmed) >= 1 && Number(diagPortTrimmed) <= 65535);

  const canSubmit =
    name.trim().length > 0 &&
    systemId.trim().length > 0 &&
    (type === "onprem" ? host.trim().length > 0 && diagPortValid : adtUrl.trim().length > 0) &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        systemId: systemId.trim(),
        type,
        host: type === "onprem" ? host.trim() : null,
        diagPort: type === "onprem" && diagPortTrimmed ? Number(diagPortTrimmed) : null,
        // ADT URL artık on-prem'de de gönderiliyor. Eskiden `type === "cloud"`
        // koşuluna bağlıydı; bu, ADT adresi bilinen bir on-prem sistemi
        // (çoğu S/4'te `https://host:44300`) elle girmeyi imkânsız kılıyor ve
        // kullanıcıyı port keşfine mahkûm ediyordu. Daha kötüsü: cloud olarak
        // eklenmiş bir sistemi on-prem'e çevirmek kayıtlı URL'i SESSİZCE
        // siliyordu. Boşsa yine null gider, davranış değişmez.
        adtUrl: adtUrl.trim() || null
      };
      let resultId: string | null = null;
      if (editing) {
        const updated = await window.api.updateManualSystem(editing.id, input);
        resultId = updated?.id ?? null;
      } else {
        const created = await window.api.addManualSystem(input);
        resultId = created.id;
      }
      onAdded(resultId);
      handleClose();
    } catch (err) {
      // Electron, main'den fırlayan hatayı "Error invoking remote method
      // 'x': Error: ..." diye sarıyor. Kullanıcıya gösterilen tek şey bu
      // kutu olduğu için sarmalayıcıyı soyup gerçek mesajı bırakıyoruz.
      const raw = (err as Error).message;
      setError(raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, ""));
    } finally {
      setSaving(false);
    }
  };

  const typeClass = (value: ManualSystemType) =>
    `${TYPE_BUTTON} ${
      type === value ? "border-accent-500 bg-accent-500/15 text-white" : "border-line-strong text-slate-400 hover:bg-active"
    }`;

  return (
    <Modal
      open
      onClose={handleClose}
      dirty={dirty}
      title={isEditing ? t("addSystemModal.editTitle") : t("addSystemModal.addTitle")}
      width={460}
      footer={
        <>
          <ModalCancelButton />
          <Button type="submit" form={formId} variant="primary" disabled={!canSubmit}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isEditing ? t("addSystemModal.update") : t("addSystemModal.add")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={type === "onprem"}
            onClick={() => setType("onprem")}
            className={typeClass("onprem")}
          >
            <ServerCog size={16} />
            {t("addSystemModal.onprem")}
          </button>
          <button
            type="button"
            aria-pressed={type === "cloud"}
            onClick={() => setType("cloud")}
            className={typeClass("cloud")}
          >
            <Cloud size={16} />
            {t("addSystemModal.cloud")}
          </button>
        </div>

        <Field label={t("addSystemModal.displayName")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("addSystemModal.displayNamePlaceholder")}
            autoFocus
          />
        </Field>

        <Field label={t("addSystemModal.systemId")}>
          <Input
            value={systemId}
            onChange={(e) => setSystemId(e.target.value.toUpperCase())}
            placeholder={t("addSystemModal.systemIdPlaceholder")}
            maxLength={8}
            className="uppercase"
          />
        </Field>

        {type === "onprem" ? (
          <>
            <Field label={t("addSystemModal.host")}>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={t("addSystemModal.hostPlaceholder")}
              />
            </Field>
            <Field
              label={t("addSystemModal.diagPort")}
              hint={t("addSystemModal.diagHelper")}
              error={diagPortValid ? undefined : t("addSystemModal.diagPortInvalid")}
            >
              <Input
                value={diagPort}
                onChange={(e) => setDiagPort(e.target.value)}
                placeholder={t("addSystemModal.diagPortPlaceholder")}
                inputMode="numeric"
              />
            </Field>
            <Field label={t("addSystemModal.adtUrlOnprem")} hint={t("addSystemModal.adtUrlOnpremHelper")}>
              <Input
                value={adtUrl}
                onChange={(e) => setAdtUrl(e.target.value)}
                placeholder={t("addSystemModal.adtUrlOnpremPlaceholder")}
              />
            </Field>
          </>
        ) : (
          <Field label={t("addSystemModal.adtUrl")} hint={t("addSystemModal.adtUrlHelper")}>
            <Input
              value={adtUrl}
              onChange={(e) => setAdtUrl(e.target.value)}
              placeholder={t("addSystemModal.adtUrlPlaceholder")}
            />
          </Field>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs text-[var(--status-danger-text)]"
          >
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
```

Eski `autoFocus` yorumu ("Escape'in ÇALIŞMASININ şartı…") bilinçli olarak kalktı: Escape artık `document`'ta dinleniyor, odağa bağlı değil. `autoFocus` yalnızca kolaylık için duruyor.

- [ ] **Adım 7: `SettingsModal`'ı taşı**

`src/components/SettingsModal.tsx`'te yedi değişiklik. Yerel `Field` yardımcısı OLDUĞU GİBİ kalıyor (adı `ui/Field` ile çakışıyor — `ui/Field`'ı bu dosyaya import ETME).

7a. İlk satır:

```tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
```

şu olsun:

```tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
```

7b. `lucide-react` import listesinden `  X,` satırını sil. Hemen altındaki iki import:

```tsx
import ConfirmDialog from "./ConfirmDialog";
```

```tsx
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";
```

sırasıyla şunlar olsun:

```tsx
import { Modal, ModalCancelButton } from "../ui/Modal";
```

```tsx
import { Button } from "../ui/Button";
```

7c. `Section` ve yerel `Field` içindeki iki `text-[11px]`'i `text-2xs` yap:

```tsx
        <span className="text-2xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
```

```tsx
      <label className="mb-1.5 block text-2xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
```

7d. Bileşenin başındaki şu iki satırı sil:

```tsx
  const [confirmDiscard, setConfirmDiscard] = useState(false);
```

```tsx
  const panelRef = useRef<HTMLDivElement>(null);
```

7e. "Escape'in ÇALIŞMASININ şartı." ile başlayan yorum bloğunu ve altındaki efekti (şu an `setForm(config); setConfirmDiscard(false); panelRef.current?.focus();` yapan) tamamen şununla değiştir:

```tsx
  // Kutuyu her açılışta SIFIRLIYOR. Bileşen kapanınca `null` döndürüyor ama
  // SÖKÜLMÜYOR — state olduğu gibi duruyor. Sıfırlama olmadan, kaydetmeden
  // çıkılan bir düzenleme bir sonraki açılışta hâlâ ekranda duruyordu (ve
  // "kaydedilmemiş" uyarısını da tetiklerdi).
  //
  // Escape ve ilk odak artık ortak `Modal`'da: Escape `document`'ta
  // dinleniyor (odak dışarıdayken de çalışıyor), ilk odak gövdenin ilk
  // öğesine gidiyor. Eskiden panelin kendisine elle odaklanılıyordu.
  useEffect(() => {
    if (!open) return;
    setForm(config);
  }, [open, config]);
```

7f. `if (!open || !form) return null;`'ın hemen altındaki `requestClose` bloğunu (yorumuyla birlikte: "Kapatma isteği tek kapıdan geçiyor (X, Escape, Vazgeç)…" ve `const requestClose = () => { … };`) sil. `isDirty` aynen kalıyor; artık `Modal`'a `dirty` olarak gidiyor.

7g. `return (`'dan gövde kabının açılışına kadar olan bölümü — yani şu satırla başlayıp:

```tsx
  return (
    <>
    <div
      className="animate-backdrop-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm"
```

şu satırla biten bölümü:

```tsx
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
```

şununla değiştir:

```tsx
  return (
    <Modal
      open
      onClose={onClose}
      dirty={isDirty}
      title={t("settingsModal.title")}
      subtitle={t("settingsModal.subtitle")}
      icon={<SlidersHorizontal size={18} />}
      width={560}
      footer={
        <>
          {isDirty && (
            <span className="mr-auto text-xs text-[var(--status-warning-text)]">
              {t("settingsModal.unsavedBadge")}
            </span>
          )}
          <ModalCancelButton />
          <Button variant="primary" onClick={() => void save()}>
            {t("common.save")}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
```

Gövdedeki `<Section …>` blokları olduğu gibi kalıyor; son `</Section>`'dan sonraki `        </div>` artık bu `space-y-4` kabını kapatıyor.

7h. Dosyanın sonunu — son `</Section>` ve onu izleyen `        </div>`'den SONRA gelen her şeyi, yani şununla başlayan:

```tsx
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line-subtle px-6 py-4">
```

ve eski ayak, iki kapanış `</div>`, "Ayarlar kutusunun DIŞINDA, kardeş olarak…" yorumu, kardeş `<ConfirmDialog … />`, `</>`, `);` ve `}` ile biten bölümü — şununla değiştir:

```tsx
    </Modal>
  );
}
```

Kontrol: dosyada artık `confirmDiscard`, `requestClose`, `panelRef`, `ConfirmDialog`, `DIALOG_CANCEL_BUTTON`, `DIALOG_CONFIRM_BUTTON`, `backdrop-blur`, `fixed inset-0` geçmiyor:

Çalıştır: `grep -nE "confirmDiscard|requestClose|panelRef|ConfirmDialog|DIALOG_(CANCEL|CONFIRM)_BUTTON|backdrop-blur|fixed inset-0" src/components/SettingsModal.tsx`
Beklenen: çıktı yok.

- [ ] **Adım 8: Geçtiğini gör**

Çalıştır: `npx vitest run tests/dialogMigration.test.tsx tests/dialogDataLoss.test.tsx tests/modal.test.tsx`
Beklenen: PASS (16 + 10 + 16 test). `dialogDataLoss.test.tsx`'e DOKUNMA; kırılırsa taşınan pencereyi düzelt.

Çalıştır: `npm run typecheck`
Beklenen: hata yok. (`App.tsx` ve `AxetCodeHome.tsx` `ConfirmDialog`'u aynı props'larla kullanmaya devam ediyor.)

Çalıştır: `npm test`
Beklenen: hepsi yeşil. `tests/designScale.test.ts`'teki cırcır (≤205) bu görevde yalnızca düşüyor — beş dosyadaki 14 `text-[Npx]` kalktı.

- [ ] **Adım 9: Commit**

```bash
git add src/components/ConfirmDialog.tsx src/components/ChatInstructionsDialog.tsx src/components/ChatProjectDialog.tsx src/components/AddSystemModal.tsx src/components/SettingsModal.tsx tests/dialogMigration.test.tsx
git commit -m "Tasarim: bes pencere ortak Modal'a tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 9: Ayarlar → Görünüm

Spec §7'nin kullanıcıya görünen parçası. Ayarlar'a "Görünüm" bölümü ekleniyor. İçinde renk örnekli iki palet kartı, Koyu/Açık seçimi ve "Sohbet görünümü"nden taşınan yazı boyutu var. Seçim Kaydet'e basınca `onSave` ile config'e gidiyor; `App.tsx`'teki efekt (Görev 2, Adım 17) onu 260ms'lik geçişle `<html>`'e yazıyor. Canlı önizleme YOK: kartlardaki renk örnekleri önizleme işini görüyor, İptal'de geri alınacak bir şey de kalmıyor. Soldaki güneş/ay düğmesi hızlı koyu/açık geçişi olarak aynen kalıyor.

**Dosyalar:**
- Değiştir: `src/components/SettingsModal.tsx` — import'lar, `Section`, `SegmentedControl`, yeni `PalettePicker`, `EDITED_FIELDS`, yeni bölüm, yazı boyutunun taşınması
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` — 10 yeni anahtar
- Değiştir (yalnız yorum): `src/index.css` (sohbet `:root` bloğunun yorumu), `src/components/ChatBubble.tsx:78`, `src/components/ChatSessionPane.tsx:763-764`
- Test: `tests/settingsAppearance.test.tsx` (yeni)

**Arayüzler:**
- Tüketir:
  - Görev 2: `AppPalette` (`app-electron/shared/types.ts`), `AppConfig.palette`, `THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>>` ve `ThemeSurface { app; card; accent; terminal }` (`app-electron/shared/themeSurfaces.ts`; renkler `"#rrggbb"`).
  - Görev 8: `SettingsModal` artık ortak `Modal` içinde; ayakta `settingsModal.unsavedBadge` rozeti, `ModalCancelButton`, Kaydet.
- Üretir: Ayarlar'da `section` (role `region`) olarak çizilen bölümler. Başlığı "Görünüm" olan bölümde `role="radiogroup"` (adı "Renk paleti") ve iki `role="radio"` kart bulunuyor. `EDITED_FIELDS` artık `palette` ve `theme`'i de kaydediyor. Dışarıdan görünen props aynı.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/settingsAppearance.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Ayarlar → Görünüm (tasarım sistemi temeli, spec §7). Sabitlenenler:
// palet kartları gerçek bir radyo grubu (ok tuşları, gezici tabindex),
// renk örnekleri tek kaynaktan (`THEME_SURFACES`) geliyor ve seçili
// koyu/açık hâli izliyor, seçim Kaydet'le `palette`/`theme` olarak gidiyor,
// yazı boyutu bu bölüme taşınmış.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_SURFACES } from "../app-electron/shared/themeSurfaces";
import type { AppConfig } from "../app-electron/shared/types";
import SettingsModal from "../src/components/SettingsModal";
import { LanguageProvider } from "../src/i18n";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const CONFIG = {
  language: "tr",
  palette: "indigo",
  theme: "dark",
  projectsBaseDir: "C:\\projeler",
  axetWorkspaceDir: "C:\\axet",
  chatDisplayName: "Deneme",
  chatFontSize: "md",
  chatDensity: "comfortable",
  chatSidebarOpen: true,
  axetCommand: "axet",
  terminal: "cmd",
  landscapePathOverride: null,
  sapShcutPathOverride: null,
  autoCheckUpdates: true
} as unknown as AppConfig;

function mount() {
  (window as unknown as { api: unknown }).api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
    pickFolder: vi.fn(() => Promise.resolve(null)),
    checkForUpdates: vi.fn(() => Promise.resolve()),
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  };
  const onClose = vi.fn();
  const onSave = vi.fn(() => Promise.resolve());
  render(
    <LanguageProvider language="tr">
      <SettingsModal
        open
        onClose={onClose}
        config={CONFIG}
        onSave={onSave}
        onExportManualSystems={vi.fn(() => Promise.resolve())}
        onImportManualSystems={vi.fn(() => Promise.resolve())}
      />
    </LanguageProvider>
  );
  return { onClose, onSave };
}

/** jsdom `style.backgroundColor`'ı `rgb(r, g, b)` olarak döndürüyor. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function swatches(radio: HTMLElement): string[] {
  return Array.from(radio.querySelectorAll<HTMLElement>("[data-swatch]")).map((el) => el.style.backgroundColor);
}

describe("Ayarlar → Görünüm", () => {
  it("palet grubu iki kartlı, seçili olan işaretli; yazı boyutu burada, Sohbet görünümünde değil", () => {
    mount();
    const section = screen.getByRole("region", { name: "Görünüm" });
    const group = within(section).getByRole("radiogroup", { name: "Renk paleti" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(within(group).getByRole("radio", { name: "Sakin İndigo" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "Sıcak Nötr" }).getAttribute("aria-checked")).toBe("false");
    expect(within(section).getByText("Yazı boyutu")).toBeTruthy();
    const chat = screen.getByRole("region", { name: "Sohbet görünümü" });
    expect(within(chat).queryByText("Yazı boyutu")).toBeNull();
  });

  it("yalnızca seçili kart Tab sırasında; ok tuşu seçimi ve odağı birlikte taşıyor", () => {
    mount();
    const indigo = screen.getByRole("radio", { name: "Sakin İndigo" });
    const warm = screen.getByRole("radio", { name: "Sıcak Nötr" });
    expect(indigo.getAttribute("tabindex")).toBe("0");
    expect(warm.getAttribute("tabindex")).toBe("-1");
    indigo.focus();
    fireEvent.keyDown(indigo, { key: "ArrowRight" });
    expect(warm.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(warm);
    // İki kart var: sağdan devam etmek başa sarıyor.
    fireEvent.keyDown(warm, { key: "ArrowDown" });
    expect(indigo.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(indigo);
  });

  it("renk örnekleri THEME_SURFACES'ten geliyor ve Koyu/Açık seçimini izliyor", () => {
    mount();
    const warm = screen.getByRole("radio", { name: "Sıcak Nötr" });
    const dark = THEME_SURFACES.warm.dark;
    expect(swatches(warm)).toEqual([rgb(dark.app), rgb(dark.card), rgb(dark.accent)]);
    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    const light = THEME_SURFACES.warm.light;
    expect(swatches(warm)).toEqual([rgb(light.app), rgb(light.card), rgb(light.accent)]);
  });

  it("palet ve tema değişince rozet çıkıyor; Kaydet ikisini de yolluyor", async () => {
    const { onClose, onSave } = mount();
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Sıcak Nötr" }));
    const light = screen.getByRole("button", { name: "Açık" });
    fireEvent.click(light);
    expect(light.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as Partial<AppConfig>;
    expect(patch.palette).toBe("warm");
    expect(patch.theme).toBe("light");
    expect(patch.chatFontSize).toBe("md");
  });

  it("eski seçime dönülünce değişiklik sayılmıyor", () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Sıcak Nötr" }));
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Sakin İndigo" }));
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
  });
});
```

- [ ] **Adım 2: Kırıldığını gör**

Çalıştır: `npx vitest run tests/settingsAppearance.test.tsx`
Beklenen: FAIL — `Unable to find role="region" and name "Görünüm"` (bölümler henüz `section` değil, Görünüm bölümü yok).

- [ ] **Adım 3: Çeviri anahtarlarını ekle**

`src/i18n/tr.ts`'te `"settingsModal.sectionGeneral": "Genel",` satırının hemen altına:

```ts
  "settingsModal.sectionAppearance": "Görünüm",
  "settingsModal.paletteLabel": "Renk paleti",
  "settingsModal.paletteIndigo": "Sakin İndigo",
  "settingsModal.paletteIndigoDesc": "Serin ve odaklı; uzun çalışmalar için",
  "settingsModal.paletteWarm": "Sıcak Nötr",
  "settingsModal.paletteWarmDesc": "Kâğıt tonları, kiremit vurgu",
  "settingsModal.themeLabel": "Tema",
  "settingsModal.themeDark": "Koyu",
  "settingsModal.themeLight": "Açık",
```

Aynı dosyada `"settingsModal.chatFontSizeLabel": "Yazı boyutu",` satırının hemen altına:

```ts
  "settingsModal.chatFontSizeHint": "Sohbet mesajlarını ve karşılama başlığını büyütür.",
```

`src/i18n/en.ts`'te `"settingsModal.sectionGeneral": "General",` satırının hemen altına:

```ts
  "settingsModal.sectionAppearance": "Appearance",
  "settingsModal.paletteLabel": "Color palette",
  "settingsModal.paletteIndigo": "Calm Indigo",
  "settingsModal.paletteIndigoDesc": "Cool and focused; for long sessions",
  "settingsModal.paletteWarm": "Warm Neutral",
  "settingsModal.paletteWarmDesc": "Paper tones, terracotta accent",
  "settingsModal.themeLabel": "Theme",
  "settingsModal.themeDark": "Dark",
  "settingsModal.themeLight": "Light",
```

ve `"settingsModal.chatFontSizeLabel": "Text size",` satırının hemen altına:

```ts
  "settingsModal.chatFontSizeHint": "Scales chat messages and the greeting heading.",
```

(`en.ts` `Record<TranslationKey, string>` tipinde: `tr.ts`'e eklenip `en.ts`'e eklenmeyen bir anahtar tip hatası veriyor. Bu iyi, eksik çeviri derlemede yakalanıyor.)

- [ ] **Adım 4: `SettingsModal` — import'lar**

`lucide-react` listesinde `  Type` satırını şununla değiştir:

```tsx
  Type,
  Palette
```

Şu satırı:

```tsx
import type { AppConfig, UpdateStatus } from "../../app-electron/shared/types";
```

şununla değiştir:

```tsx
import type { AppConfig, AppPalette, AppTheme, UpdateStatus } from "../../app-electron/shared/types";
import { THEME_SURFACES } from "../../app-electron/shared/themeSurfaces";
```

İlk satır (Görev 8'den sonraki hâli):

```tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
```

şu olsun (`useRef` Görev 8'de kalkmıştı, `PalettePicker` yeniden kullanıyor):

```tsx
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
```

- [ ] **Adım 5: `SettingsModal` — `Section` bölge oluyor, `SegmentedControl` basılı hâlini bildiriyor**

`Section`'ın dış kabı:

```tsx
    <div className="overflow-hidden rounded-lg border border-line bg-card/40">
```

şu olsun:

```tsx
    <section aria-label={title} className="overflow-hidden rounded-lg border border-line bg-card/40">
```

ve aynı fonksiyonun son kapanışı `    </div>` (hemen altında `  );` olan) `    </section>` olsun.

`SegmentedControl`'ün düğmesinde `type="button"` satırının altına ekle:

```tsx
          aria-pressed={value === option.key}
```

- [ ] **Adım 6: `SettingsModal` — `PalettePicker`**

`// Uyarı, hata değil: yol yanlış olsa da kaydetmek serbest.` yorumunun hemen ÜSTÜNE ekle:

```tsx
const PALETTES: AppPalette[] = ["indigo", "warm"];

// Palet seçimi: iki kart, her birinde o paletin üç rengi (zemin, kart, vurgu).
// Renkler CSS değişkeninden DEĞİL `THEME_SURFACES`'ten geliyor: seçili olmayan
// paletin değişkenleri o an sayfada tanımlı değil. Örnekler formdaki Koyu/Açık
// seçimini izliyor, yani kullanıcı Kaydet'e basmadan neyi seçtiğini görüyor.
//
// Klavye, radyo grubu kalıbında: Tab grupta yalnızca seçili karta duruyor, ok
// tuşları seçimi ve odağı birlikte taşıyor (sondan başa sarıyor).
function PalettePicker({
  value,
  theme,
  label,
  names,
  onChange
}: {
  value: AppPalette;
  theme: AppTheme;
  label: string;
  names: Record<AppPalette, { name: string; description: string }>;
  onChange: (palette: AppPalette) => void;
}) {
  const baseId = useId();
  const refs = useRef<Partial<Record<AppPalette, HTMLButtonElement | null>>>({});

  const move = (from: AppPalette, step: number) => {
    const next = PALETTES[(PALETTES.indexOf(from) + step + PALETTES.length) % PALETTES.length];
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {PALETTES.map((palette) => {
        const surface = THEME_SURFACES[palette][theme];
        const checked = value === palette;
        return (
          <button
            key={palette}
            ref={(el) => {
              refs.current[palette] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-labelledby={`${baseId}-${palette}-name`}
            aria-describedby={`${baseId}-${palette}-desc`}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(palette)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(palette, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(palette, -1);
              }
            }}
            className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition ${
              checked ? "border-accent-500 bg-accent-500/10" : "border-line hover:bg-hover"
            }`}
          >
            <span className="flex gap-1.5" aria-hidden="true">
              {[surface.app, surface.card, surface.accent].map((color, index) => (
                <span
                  key={index}
                  data-swatch
                  className="size-6 rounded-md border border-line"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span id={`${baseId}-${palette}-name`} className="text-sm font-medium text-slate-100">
              {names[palette].name}
            </span>
            <span id={`${baseId}-${palette}-desc`} className="text-xs text-slate-500">
              {names[palette].description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Adım 7: `SettingsModal` — `EDITED_FIELDS`**

Şu iki satırı:

```tsx
const EDITED_FIELDS = [
  "language",
```

şununla değiştir:

```tsx
const EDITED_FIELDS = [
  "language",
  // Görünüm (2026-09-28). `theme` soldaki güneş/ay düğmesiyle de değişiyor;
  // Ayarlar açıkken o düğmeye ulaşılamıyor (pencere modal), yani iki yazar
  // aynı anda çalışmıyor.
  "palette",
  "theme",
```

- [ ] **Adım 8: `SettingsModal` — Görünüm bölümü ve yazı boyutunun taşınması**

8a. `<Section icon={Sparkles} title={t("settingsModal.sectionAxetCode")}>` satırının hemen ÜSTÜNE (Genel bölümünün `</Section>`'ından sonraki boş satıra) ekle:

```tsx
          <Section icon={Palette} title={t("settingsModal.sectionAppearance")}>
            <Field label={t("settingsModal.paletteLabel")}>
              <PalettePicker
                value={form.palette}
                theme={form.theme}
                label={t("settingsModal.paletteLabel")}
                names={{
                  indigo: {
                    name: t("settingsModal.paletteIndigo"),
                    description: t("settingsModal.paletteIndigoDesc")
                  },
                  warm: {
                    name: t("settingsModal.paletteWarm"),
                    description: t("settingsModal.paletteWarmDesc")
                  }
                }}
                onChange={(palette) => setForm({ ...form, palette })}
              />
            </Field>
            <Field label={t("settingsModal.themeLabel")}>
              <SegmentedControl
                value={form.theme}
                onChange={(theme) => setForm({ ...form, theme })}
                options={[
                  { key: "dark", label: t("settingsModal.themeDark") },
                  { key: "light", label: t("settingsModal.themeLight") }
                ]}
              />
            </Field>
            {/* "Sohbet görünümü"nden buraya taşındı (spec §7): yazı boyutu
                okuma konforu, yani görünüm ayarı. İpucu kapsamını söylüyor —
                uygulamanın geri kalanı bu ayarla büyümüyor. */}
            <Field label={t("settingsModal.chatFontSizeLabel")} hint={t("settingsModal.chatFontSizeHint")}>
              <SegmentedControl
                value={form.chatFontSize}
                onChange={(size) => setForm({ ...form, chatFontSize: size })}
                options={[
                  { key: "sm", label: t("settingsModal.chatFontSizeSm") },
                  { key: "md", label: t("settingsModal.chatFontSizeMd") },
                  { key: "lg", label: t("settingsModal.chatFontSizeLg") }
                ]}
              />
            </Field>
          </Section>

```

8b. "Sohbet görünümü" bölümündeki ESKİ yazı boyutu alanını — şununla başlayıp:

```tsx
            <Field label={t("settingsModal.chatFontSizeLabel")}>
```

ilk `            </Field>` ile biten 11 satırı — sil. Bölümde ad, yoğunluk ve kenar çubuğu seçeneği kalıyor.

Kontrol: `grep -c 'chatFontSizeLabel' src/components/SettingsModal.tsx` → `1`.

- [ ] **Adım 9: Yorumlar yeni yeri göstersin**

Yazı boyutu artık Görünüm'de; ona "Sohbet görünümü" diye işaret eden üç yorum düzeltiliyor.

`src/index.css`:

```css
/* Sohbet ekranının okuma konforu — kullanıcı ayarından geliyor (Ayarlar >
   Sohbet görünümü). Buradaki değerler yalnızca İLK BOYAMA için: `App.tsx`
```

şu olsun:

```css
/* Sohbet ekranının okuma konforu — kullanıcı ayarından geliyor (yazı boyutu
   ve karşılama: Ayarlar > Görünüm; mesaj aralığı: Ayarlar > Sohbet
   görünümü). Buradaki değerler yalnızca İLK BOYAMA için: `App.tsx`
```

`src/components/ChatBubble.tsx`:

```tsx
// Gövde metni boyutu kullanıcı ayarından (Ayarlar > Sohbet görünümü) geliyor;
```

şu olsun:

```tsx
// Gövde metni boyutu kullanıcı ayarından (Ayarlar > Görünüm) geliyor;
```

`src/components/ChatSessionPane.tsx`:

```tsx
                çünkü başlık boyutu kullanıcı ayarından geliyor (Ayarlar >
                Sohbet görünümü) — 50px'te de 70px'te de aynı ilişki kuruluyor.
```

şu olsun:

```tsx
                çünkü başlık boyutu kullanıcı ayarından geliyor (Ayarlar >
                Görünüm) — 50px'te de 70px'te de aynı ilişki kuruluyor.
```

Kontrol: `grep -rn "Sohbet görünümü)" src` → yalnızca `src/index.css` (mesaj aralığı için, doğru).

- [ ] **Adım 10: Geçtiğini gör**

Çalıştır: `npx vitest run tests/settingsAppearance.test.tsx tests/dialogMigration.test.tsx tests/dialogDataLoss.test.tsx`
Beklenen: PASS (5 + 16 + 10 test).

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

Çalıştır: `npm test`
Beklenen: hepsi yeşil.

- [ ] **Adım 11: Commit**

```bash
git add src/components/SettingsModal.tsx src/i18n/tr.ts src/i18n/en.ts src/index.css src/components/ChatBubble.tsx src/components/ChatSessionPane.tsx tests/settingsAppearance.test.tsx
git commit -m "Tasarim: Ayarlar'a Gorunum bolumu (palet, tema, yazi boyutu)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 10: Cırcırı sıkılaştır, spec'i ölçülenle eşitle, gözle kontrol

Son görev. Üç parça: (1) cırcır sınırı ölçülen yeni sayıya iniyor ki taşınan 14 `text-[Npx]` geri gelemesin; (2) spec, plan yazılırken ölçülen gerçek değerlerle güncelleniyor; (3) dört görünüm çalışan uygulamada gözle kontrol ediliyor (spec §8 "Bitmiş sayılma" ve §9).

**Dosyalar:**
- Değiştir: `tests/designScale.test.ts` — cırcır `describe`'ı (Görev 1'de yazıldı)
- Değiştir: `docs/superpowers/specs/2026-09-28-tasarim-sistemi-temeli-design.md` — satır 3, §2 (satır ~52-53), §4.3, §5 (satır ~200-202), §7 kod bloğu, §8 Cırcır satırı, §9 son madde, sona yeni §10 (dosya CRLF)

**Arayüzler:**
- Tüketir: Görev 1'in cırcır testi (`/text-\[[0-9.]+px\]/g`, `src/` altındaki `.ts`/`.tsx`, sınır 205); Görev 2'nin `ThemeSurface { app; card; accent; terminal }`'ü; Görev 3'ün `blocks.css` ölçümleri; Görev 8'in düşürdüğü 14 kullanım; Görev 9'un Görünüm bölümü.
- Üretir: yok (son görev).

- [ ] **Adım 1: Sayıyı ölç**

Çalıştır:

```bash
grep -rhoE "text-\[[0-9.]+px\]" src --include=*.ts --include=*.tsx | wc -l
```

Beklenen: `191`. Hesap: başlangıç 207; Görev 1 `buttons.ts`'teki `SIZE`'da 3'ü 1'e indiriyor (−2 → 205); Görev 8 beş pencerede 14'ünü kaldırıyor (`ChatInstructionsDialog` 4, `ChatProjectDialog` 8, `SettingsModal` 2 → 191). Diğer görevler `text-[Npx]` eklemiyor ya da kaldırmıyor.

191 çıkmazsa sınırı çıkan sayıya YAZMA. Önce farkın hangi görevden geldiğini bul: `git log -p main..HEAD -- src | grep -nE "^[+-].*text-\[[0-9.]+px\]"`. Eklenen satır varsa onu ölçeğe (`text-2xs/xs/sm/…`) çevir. Kaldırılmamış bir satır varsa ilgili görevin adımına dön.

- [ ] **Adım 2: Cırcırı 191'e indir**

`tests/designScale.test.ts`'te:

```ts
describe("cırcır: elle yazılmış px yazı boyu", () => {
  it("205'i geçmiyor", () => {
```

şu olsun:

```ts
// 207 → 205 (Görev 1, düğme boyları) → 191 (Görev 8, taşınan beş pencere).
// Sınır ölçülen değer: bir ekran ölçeğe taşındıkça burası da aşağı çekilir.
describe("cırcır: elle yazılmış px yazı boyu", () => {
  it("191'i geçmiyor", () => {
```

ve aynı bloktaki `expect(count).toBeLessThanOrEqual(205);` → `expect(count).toBeLessThanOrEqual(191);`.

Çalıştır: `npx vitest run tests/designScale.test.ts`
Beklenen: PASS (7 test).

- [ ] **Adım 3: Spec'i ölçülenle eşitle**

Dosya CRLF; Edit aracıyla satır satır değiştir, satır sonlarını koru. Yedi değişiklik:

3a. Satır 3:

```
Tarih: 2026-09-28 · Dal: `tasarim/temel` · Durum: incelemede
```

→

```
Tarih: 2026-09-28 · Dal: `tasarim/temel` · Durum: onaylandı
```

3b. §2:

```
- Yazı boyutları dağınık: 10 farklı boyut, elle yazılmış `text-[Npx]` sınıfı
  **202** yerde, 10px yazı 59 yerde.
```

→

```
- Yazı boyutları dağınık: 10 farklı boyut, elle yazılmış `text-[Npx]` sınıfı
  **207** yerde (`src/` altında `text-\[[0-9.]+px\]` ile sayıldı; ilk
  incelemede 202 yazılmıştı), 10px yazı 59 yerde.
```

3c. §4.3'ün son cümlesi:

```
→ 4.80, Sıcak `#978f85` → 4.67). En düşük sonuç: Sıcak açık vurgu, `control`
üstünde 4.55:1.
```

→

```
→ 4.80, Sıcak `#978f85` → 4.67). Plan yazılırken dört blok yeniden ölçüldü;
her bloğun en düşüğü: İndigo koyu `ink-300` 4.80, İndigo açık `folder-icon`
4.59, Sıcak koyu `ink-300` 4.67, Sıcak açık `success-text` 4.79.
```

3d. §5:

```
Elle yazılmış 202 `text-[Npx]` kullanımı **bu alt projede taşınmıyor**; 2. alt
projede ekran ekran temizlenecek. O zamana kadar sayının artmaması için bir
"cırcır" testi var (§8).
```

→

```
Elle yazılmış `text-[Npx]` kullanımları (207) **bu alt projede toplu
taşınmıyor**; yalnızca düğme boyları ve ortak `Modal`'a taşınan beş pencere
ölçeğe geçiyor (207 → 191). Geri kalanı 2. alt projede ekran ekran
temizlenecek. O zamana kadar sayının artmaması için bir "cırcır" testi var (§8).
```

3e. §7 kod bloğu:

```
  export const THEME_SURFACES: Record<AppPalette, Record<AppTheme, {
    app: string;                       // pencere arka planı, "#rrggbb"
    terminal: { background: string; foreground: string; cursor: string };
  }>>;
```

→

```
  export interface ThemeSurface {
    app: string;                       // pencere arka planı, "#rrggbb"
    card: string;                      // kart yüzeyi (Ayarlar'daki renk örneği)
    accent: string;                    // vurgu 500 (Ayarlar'daki renk örneği)
    terminal: { background: string; foreground: string; cursor: string };
  }
  export const THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>>;
```

Hemen altındaki madde listesinin başına (`  - Ana süreç pencereyi açarken…` satırının üstüne) ekle:

```
  - `card` ve `accent` Ayarlar → Görünüm'deki palet kartlarının renk örnekleri
    için: seçili olmayan paletin CSS değişkenleri o an sayfada tanımlı değil.
    Test dördünü de CSS'teki `--surface-app-rgb`, `--surface-card-rgb`,
    `--accent-500-rgb` ile eşliyor.
```

3f. §8 tablosunda:

```
| Cırcır | Elle yazılmış `text-[Npx]` sayısı 202'yi geçmiyor |
```

→

```
| Cırcır | Elle yazılmış `text-[Npx]` sayısı ölçülen değeri geçmiyor: başlangıçta 205, alt proje sonunda 191; yalnızca aşağı çekilir |
```

3g. §9'un son maddesi:

```
- **Açık tema daha önce az kullanıldı;** gözden kaçan sabit renkler (9 yerde
  `.tsx` içinde hex var) açık temada göze batabilir. Plan bu 9 yeri tek tek
  jetona bağlamayı içeriyor.
```

→

```
- **Açık tema daha önce az kullanıldı;** gözden kaçan sabit renkler açık
  temada göze batabilir. `.tsx` içindeki hex'ler tek tek ölçüldü: gerçek
  renk olanlar `EmbeddedTerminal`'in üç değeri (artık `THEME_SURFACES`'ten
  geliyor). `AxetCodeHome`, `PreflightPanel` ve `SystemPanel`'dekiler yalnızca
  yorum. `FileViewer`'daki beyaz DOCX sayfası **bilerek sabit kalıyor**:
  önizleme her iki temada da kâğıt sayfası gibi görünmeli, gerekçesi
  dosyadaki yorumda.
```

Kontrol: `grep -n "202\|incelemede\|9 yerde" docs/superpowers/specs/2026-09-28-tasarim-sistemi-temeli-design.md` → yalnızca 3b'deki "ilk incelemede 202 yazılmıştı" satırı.

- [ ] **Adım 4: Tüm takım ve tip denetimi**

Çalıştır: `npm test`
Beklenen: hepsi yeşil. `tests/dialogDataLoss.test.tsx` 10 test, değiştirilmeden.

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

Çalıştır: `grep -rnE "183 243 74|169 225 63|155 209 48|#a9e13f|#b7f34a" -i src app-electron --include=*.ts --include=*.tsx --include=*.css`
Beklenen: çıktı yok.

- [ ] **Adım 5: Gözle kontrol (alt ajana verilmez; ana oturum kullanıcıyla birlikte yapar)**

Kurulu NTT Studio açıksa tek kopya kilidi yüzünden `npm run dev` hemen çıkar. Kullanıcıdan NTT Studio'yu kapatmasını iste; çalışan bir süreci kendin sonlandırma. Sonra `npm run dev`.

Dört görünüm (İndigo koyu, İndigo açık, Sıcak koyu, Sıcak açık; Ayarlar → Görünüm'den seçip Kaydet) × beş ekran (sohbet, SAP başlatıcı, GUI Scripting, Hazırlık, Ayarlar) × iki genişlik (980px ve tam ekran). Her birinde bak:

1. Taşan ya da kesilen metin, üst üste binen öğe (yeni 14px gövde ve 32/36/40px düğmelerle).
2. Okunamayan metin; özellikle açık temalarda sabit kalmış koyu/açık renk.
3. Limon yeşili kalmamış.
4. Tab ile gezinirken odak halkası görünüyor.
5. Palet değişimi 260ms'de yumuşak geçiyor; açık görünümde uygulamayı kapatıp açınca ilk karede koyu kare çıkmıyor.
6. Seçim kalıcı: uygulamayı kapatıp açınca aynı palet ve tema geliyor (spec başarı ölçütü 2).
7. Soldaki güneş/ay düğmesi paleti koruyarak yalnızca koyu/açık değiştiriyor; sonra Ayarlar açılınca Tema seçimi bunu gösteriyor.
8. Terminal açık temada da koyu, ama seçili paletin rengiyle.

Spec §9'a göre bulunan taşma ya o anda düzeltilir (ayrı bir commit, önce test) ya da not edilir. Notlar spec'in sonuna yeni bölüm olarak:

```
## 10. Gözle kontrol notları (2026-09-28)

Dört görünüm × beş ekran × 980px ve tam ekran bakıldı.

| Ekran | Görünüm | Genişlik | Bulunan | Ne yapıldı |
|---|---|---|---|---|
```

Her bulgu bir satır. Bulgu yoksa tablonun yerine tek cümle: `Taşma, okunmayan metin ya da kalan limon bulunmadı.` Kontrol bitince kullanıcıdan NTT Studio'yu yeniden açabileceğini söyle.

- [ ] **Adım 6: Commit**

```bash
git add tests/designScale.test.ts docs/superpowers/specs/2026-09-28-tasarim-sistemi-temeli-design.md
git commit -m "Tasarim: circir 191'e indi, spec olculen degerlerle esitlendi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
