# Grafit Kimlik ve Kabuk — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Uygulamayı tek renkli grafit bir kimliğe (iki tema × üç vurgu rengi, JetBrains Mono, mono bölüm etiketleri, yeni başlık çubuğu) geçirmek; sonra ikon şeridini kaldırıp üç modun listesini tek geniş kenar çubuğunda toplamak.

**Mimari:** 1a'da renkler `src/index.css`'te iki yüzey bloğu + altı vurgu bloğu olarak duruyor; bir test altı görünümü ölçüyor. `THEME_SURFACES` CSS okuyamayan tüketicilerin tek kaynağı olarak kalıyor. 1b'de sohbet ve script listelerinin verisi React bağlamlarına (`ChatStore`, `ScriptStore`) çıkıyor; `src/shell/Sidebar.tsx` mod seçici, modun listesi ve dip bloktan oluşan tek kenar çubuğunu çiziyor. Taşımadan önce bugünkü davranışı sabitleyen testler yazılıyor.

**Teknoloji:** Electron + React 18 + TypeScript + Tailwind 3; test için vitest (+ jsdom, @testing-library/react); xterm.

**Spec:** `docs/superpowers/specs/2026-09-29-grafit-kimlik-ve-kabuk-design.md` — plan bu belgeye dayanıyor; ikisi çelişirse spec geçerli.

## Genel Kurallar

- Dal: `tasarim/grafit`. Push, merge, sürüm artırma YOK (her biri ayrıca onay istiyor).
- Yeni npm paketi eklenmiyor. (Görev 3'te yazı tipi dosyaları geçici bir klasörde `npm pack` ile alınıyor; `package.json` değişmiyor.)
- Tailwind'e giden renkler `"R G B"` tripleti olarak yazılıyor (bkz. `tailwind.config.js` `withOpacity`); `#hex` yalnızca doğrudan CSS'e giden `--*-text`, `--module-*` gibi değişkenlerde.
- Yeni kodda `text-[Npx]` yazılmıyor; `text-2xs/xs/sm/base/lg/xl/2xl` kullanılıyor. `tests/designScale.test.ts` cırcırı yalnızca aşağı iner.
- Vibe'ın (`C:\workspace\vibe`) renk ve ölçü değerleri kopyalanmıyor; bu plandaki değerler bizim.
- Kod yorumları Türkçe ve tam Türkçe karakterli (ç, ğ, ı, ö, ş, ü). Commit mesajları ASCII Türkçe ve şu satırla bitiyor: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- `git add` dosya dosya; `git add -A` / `git add .` YOK. Prettier çalıştırılmıyor.
- Var olan dosyalar CRLF; düzenlerken satır sonlarını değiştirme. Testler dosya okurken `.replace(/\r\n/g, "\n")` yapıyor.
- Test çalıştırma: tek dosya `npx vitest run tests/<ad>`; hepsi `npm test`; tip denetimi `npm run typecheck`. İki tsconfig'te de `noUnusedLocals` / `noUnusedParameters` açık: kullanılmayan import bırakma.
- `tests/**/*.ts` dosyaları `src/`'den import ETMEZ, gerekiyorsa dosyayı metin olarak okur. `src/`'yi import eden testler `.tsx` olur ve ilk satırı `// @vitest-environment jsdom`'dur.
- jsdom testlerinde jest-dom yok: `getAttribute`, `className`, `toBeTruthy`, `toBeNull` kullan. Her `.tsx` testi `afterEach(cleanup)` çağırır, bileşeni `<LanguageProvider language="tr">` (kaynak `src/i18n`) içinde çizer ve kullandığı `window.api` işlevlerini `vi.fn` ile tanımlar.
- `tests/dialogDataLoss.test.tsx` hiç değiştirilmeden yeşil kalıyor.
- `resources/rfc-runtime` ve `resources/guiscript-runtime` asla `git add` edilmiyor (SAP'nin lisanslı SDK'sı).
- Çalışan NTT Studio'yu ve VS Code'u kapatma; `npm run dev` tek örnek kilidi yüzünden hemen çıkıyorsa kullanıcıdan NTT Studio'yu kapatmasını iste.

## Gözden Geçirme Odağı

Kullanıcıyı en çok ısırabilecek, spec'in ima ettiği ama kolayca gözden kaçan beş durum. Her birinin testi sahibi olan görevde yazılı.

1. `config.json`'da `palette: "warm"` (tasarim/temel dalında kaydedilmiş), `"indigo"` ya da geçersiz bir değer var: `warm` → `amber`, `indigo` olduğu gibi, geçersiz → `ntt`; uygulama renksiz açılmıyor. Pencere adresindeki `?palette=` için de aynı. → Görev 1, `tests/appearanceConfig.test.ts`, `tests/themeSurfaces.test.ts`.
2. `config.json`'da bozuk `sidebarWidth` (`"abc"`, `-5`, `9999`, `NaN`): varsayılan 264'e döner ya da 220–420'ye kırpılır; kenar çubuğu görünmez ya da ekranı kaplayan genişlikte açılmaz. → Görev 15, `tests/sidebarConfig.test.ts`.
3. Silinmiş bir projeye işaret eden sohbet (`projectId` artık `projects`'te yok): kaybolmuyor; klasörü (`cwd`) varsa SAP grubunda, yoksa Genel'de görünüyor. → Görev 9, `tests/chatSessionGroups.test.tsx`.
4. Script ekranından çıkılıp dönüldüğünde seçili oturum SAP'de kapatılmış: seçim, düğümler ve seçili öğe temizleniyor; eski oturuma istek gitmiyor. → Görev 12, `tests/scriptStore.test.tsx`.
5. Kısayollar yazıya karışmıyor: bir yazı alanında (input, textarea, contenteditable) `/` yazmak hiçbir şeyi odaklamıyor; gömülü terminalin (xterm) içindeyken Ctrl+1/2/3 mod değiştirmiyor. → Görev 16, `tests/shellShortcuts.test.tsx`.

## Görev haritası

| # | Görev | Parça |
|---|---|---|
| 1 | Renk yapısı: iki yüzey + altı vurgu bloğu, `ntt/indigo/amber` | 1a |
| 2 | Ayarlar: vurgu kartları koyu + açık önizlemeyle | 1a |
| 3 | JetBrains Mono | 1a |
| 4 | `Eyebrow` bölüm etiketi | 1a |
| 5 | Belge dili (`<html lang>`) | 1a |
| 6 | Başlık çubuğu | 1a |
| 7 | **DUR: 1a gözle kontrol** | 1a |
| 8 | `Tabs` borçları | 1b |
| 9 | Sohbet: gruplama saf fonksiyona, taşıma öncesi testler | 1b |
| 10 | `ChatStore` | 1b |
| 11 | Sohbet komutları ve `ChatSidebar` | 1b |
| 12 | `ScriptStore` ve `ScriptSidebar` | 1b |
| 13 | `LogonSidebar` | 1b |
| 14 | `Sidebar`, `SidebarFooter`, `activity.ts`; `ActivityBar` siliniyor | 1b |
| 15 | Genişlik ve daraltma ayarı, `chatSidebarOpen` geçişi | 1b |
| 16 | Kısayollar | 1b |
| 17 | **DUR: 1b gözle kontrol** | 1b |

---

### Görev 1: Renk yapısı — iki yüzey bloğu, altı vurgu bloğu, üç vurgu adı

Dört tam blok (İndigo/Sıcak × koyu/açık) yerine iki yüzey bloğu (grafit koyu, grafit açık) ve yalnızca vurgu jetonlarını taşıyan altı vurgu bloğu. `AppPalette` `"ntt" | "indigo" | "amber"` oluyor; eski `"warm"` okunurken `"amber"`e çevriliyor. Bu görev bölünemez: tür değişince CSS, tek kaynak tablo, ayar okuma, Ayarlar ekranı ve testler aynı işlemede değişmezse tip denetimi ya da testler kırmızı kalır.

**Dosyalar:**
- Değiştir: `src/index.css:111-134` (başlık yorumu), `:147-532` (dört görünüm bloğu → iki yüzey + altı vurgu bloğu). `:136-145` (`:root` sohbet değişkenleri) ve `:534` sonrası (`body`, `html:not([data-palette])`, `::selection`, kaydırma çubuğu) DEĞİŞMİYOR.
- Değiştir: `app-electron/shared/themeSurfaces.ts` (tamamı)
- Değiştir: `app-electron/shared/types.ts:307-311` (`AppPalette`)
- Değiştir: `app-electron/main/store.ts:17-18` (import), `:30` (`VALID_PALETTES` siliniyor), `:99` (varsayılan), `:166-172` (okuma)
- Değiştir: `src/ui/useAppearance.ts:1-2`, `:17`
- Değiştir: `src/App.tsx:324`
- Değiştir: `src/components/SettingsModal.tsx:21` (import), `:115` (yerel `PALETTES` siliniyor), `:515-531` (adlar)
- Değiştir: `src/i18n/tr.ts:550-554`, `src/i18n/en.ts:492-496`
- Test: `tests/themeTokens.test.ts` (yeniden yazılıyor), `tests/themeSurfaces.test.ts` (yeniden yazılıyor), `tests/appearanceConfig.test.ts` (yeniden yazılıyor), `tests/useAppearance.test.tsx`, `tests/appearance.test.tsx`, `tests/settingsAppearance.test.tsx` (yeniden yazılıyor)

**Arayüzler:**
- Tüketir: yok.
- Üretir:
  - `type AppPalette = "ntt" | "indigo" | "amber"` (`app-electron/shared/types.ts`)
  - `app-electron/shared/themeSurfaces.ts`: `THEME_SURFACES: Record<AppPalette, Record<AppTheme, ThemeSurface>>`, `export const PALETTES: readonly AppPalette[]` (`["ntt", "indigo", "amber"]`), `export function normalizePalette(value: unknown): AppPalette`, `parseAppearance`, `windowBackgroundChange` (imzalar aynı).
  - i18n anahtarları: `settingsModal.paletteLabel`, `settingsModal.paletteNtt`, `settingsModal.paletteNttDesc`, `settingsModal.paletteIndigo`, `settingsModal.paletteIndigoDesc`, `settingsModal.paletteAmber`, `settingsModal.paletteAmberDesc`. `settingsModal.paletteWarm` ve `settingsModal.paletteWarmDesc` siliniyor.

- [ ] **Adım 1: Kırılan testleri yaz**

`tests/themeTokens.test.ts` dosyasının TAMAMINI şununla değiştir:

```ts
// Renk jetonlarının ölçümü (grafit kimlik, 2026-09-29; spec §3).
//
// `src/index.css` metin olarak okunuyor. İki yüzey bloğu (koyu, açık) ve
// altı vurgu bloğu (ntt/indigo/amber × koyu/açık) ayrıştırılıyor; bir
// görünüm = o temanın yüzey bloğu + o vurgunun o temadaki bloğu. Ölçülenler:
//   - yüzey blokları aynı jeton kümesini, vurgu blokları tam olarak dokuz
//     vurgu jetonunu tanımlıyor mu (unutulan jeton o görünümde sessizce boş
//     kalır, tarayıcı hata vermez);
//   - altı görünümde metin, vurgu ve durum renkleri en zayıf dinlenme
//     yüzeyinde (app / card / control / sidebar) WCAG AA 4.5:1'i geçiyor mu;
//   - yüzey/kenarlık sıralaması doğru mu (yanlışsa hover dolgusu ince
//     kenarlığı yutuyor).
// Bir rengi değiştirmeden önce bu testi çalıştır; ölçmeden renk değiştirme.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_SURFACES } from "../app-electron/shared/themeSurfaces";

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

const THEMES = ["dark", "light"] as const;
const PALETTES = ["ntt", "indigo", "amber"] as const;
type Theme = (typeof THEMES)[number];
type Palette = (typeof PALETTES)[number];
type View = `${Palette}/${Theme}`;
const VIEW_NAMES: View[] = PALETTES.flatMap((p) => THEMES.map((t) => `${p}/${t}` as View));

const surfaceSelector = (theme: Theme) => `html[data-theme="${theme}"]`;
const accentSelector = (palette: Palette, theme: Theme) =>
  `html[data-palette="${palette}"][data-theme="${theme}"]`;

function ruleFor(selector: string): Rule {
  const found = RULES.filter((r) => r.selectors.includes(selector));
  if (found.length !== 1) throw new Error(`${selector}: ${found.length} blok bulundu, 1 bekleniyordu`);
  return found[0];
}

// Vurgu bloğunun tanımladığı jetonlar — ne eksik ne fazla.
const ACCENT_KEYS = [
  "--accent-600-rgb",
  "--accent-500-rgb",
  "--accent-400-rgb",
  "--accent-on-rgb",
  "--accent-cyan-rgb",
  "--accent-glow",
  "--accent-soft-text",
  "--chat-hero-via",
  "--chat-hero-to"
].sort();

function split(view: View): [Palette, Theme] {
  return view.split("/") as [Palette, Theme];
}

/** Görünümün etkin jetonları: yüzey bloğu, üstüne vurgu bloğu. */
function declsFor(view: View): Decls {
  const [palette, theme] = split(view);
  return new Map([...ruleFor(surfaceSelector(theme)).decls, ...ruleFor(accentSelector(palette, theme)).decls]);
}

const tokens = (decls: Decls) => [...decls.keys()].filter((k) => k.startsWith("--")).sort();

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

// Kenar çubuğu artık listelerin tamamını taşıyor; yazının en çok durduğu yer.
const SURFACES = ["--surface-app-rgb", "--surface-card-rgb", "--surface-control-rgb", "--surface-sidebar-rgb"];

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

describe("iki yüzey bloğu, altı vurgu bloğu", () => {
  it("her tema ve her vurgu tam bir blokta; koyu yüzey ve NTT koyu aynı zamanda :root", () => {
    for (const theme of THEMES) ruleFor(surfaceSelector(theme));
    for (const view of VIEW_NAMES) ruleFor(accentSelector(...split(view)));
    expect(ruleFor(surfaceSelector("dark")).selectors).toContain(":root");
    expect(ruleFor(accentSelector("ntt", "dark")).selectors).toContain(":root");
  });

  it("iki yüzey bloğu aynı jeton kümesini tanımlıyor ve vurgu jetonu taşımıyor", () => {
    const dark = tokens(ruleFor(surfaceSelector("dark")).decls);
    expect(dark.length).toBeGreaterThan(50);
    expect(tokens(ruleFor(surfaceSelector("light")).decls)).toEqual(dark);
    for (const key of ACCENT_KEYS) expect(dark).not.toContain(key);
  });

  it("altı vurgu bloğu yalnızca dokuz vurgu jetonunu tanımlıyor", () => {
    for (const view of VIEW_NAMES) {
      expect(tokens(ruleFor(accentSelector(...split(view))).decls)).toEqual(ACCENT_KEYS);
    }
  });

  it.each(VIEW_NAMES)("%s: eş jetonlar birbiriyle tutarlı", (view) => {
    const decls = declsFor(view);
    const hex = (token: string) => rgbOf(decls, decls.get(token));
    // Eski adıyla duran cyan 500'ün kendisi; degrade yumuşak vurgu → vurgu.
    expect(hex("--accent-cyan-rgb")).toEqual(hex("--accent-500-rgb"));
    expect(hex("--chat-hero-via")).toEqual(hex("--accent-soft-text"));
    expect(hex("--chat-hero-to")).toEqual(hex("--accent-500-rgb"));
    // Seçili zemin: 500'ün koyuda %13, açıkta %10'u.
    const glow = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(decls.get("--accent-glow") ?? "");
    expect(glow).not.toBeNull();
    expect([Number(glow![1]), Number(glow![2]), Number(glow![3])]).toEqual(hex("--accent-500-rgb"));
    expect(Number(glow![4])).toBe(view.endsWith("/dark") ? 0.13 : 0.1);
  });
});

describe.each(VIEW_NAMES)("kontrast: %s", (view) => {
  const decls = declsFor(view);

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

  // `tailwind.config.js` renkleri `extend` altında tanımlıyor; Tailwind'in
  // varsayılan `lime` paleti hâlâ derleniyor. Jetonlardan limonu kaldırmak
  // yetmiyor, `border-lime-400` gibi doğrudan sınıflar ekranı yine boyuyor.
  it("Tailwind lime-* sınıfı kalmadı", () => {
    const hits: string[] = [];
    for (const file of walk(path.join(ROOT, "src"))) {
      const m = /\blime-\d{2,3}\b/.exec(readFileSync(file, "utf8"));
      if (m) hits.push(`${path.relative(ROOT, file)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });
});

describe("THEME_SURFACES CSS ile aynı", () => {
  const hex = ([r, g, b]: Rgb) => "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");

  it.each(VIEW_NAMES)("%s", (view) => {
    const [palette, theme] = split(view);
    const decls = declsFor(view);
    const surface = THEME_SURFACES[palette][theme];
    expect(surface.app).toBe(hex(rgbOf(decls, decls.get("--surface-app-rgb"))));
    expect(surface.card).toBe(hex(rgbOf(decls, decls.get("--surface-card-rgb"))));
    expect(surface.accent).toBe(hex(rgbOf(decls, decls.get("--accent-500-rgb"))));
  });

  it("terminal koyu grafit zeminde, imleç o vurgunun koyu accent-400'ü", () => {
    for (const palette of PALETTES) {
      const decls = declsFor(`${palette}/dark`);
      const terminal = THEME_SURFACES[palette].dark.terminal;
      expect(terminal.background).toBe(hex(rgbOf(decls, decls.get("--surface-app-rgb"))));
      expect(terminal.foreground).toBe(hex(rgbOf(decls, decls.get("--ink-100-rgb"))));
      expect(terminal.cursor).toBe(hex(rgbOf(decls, decls.get("--accent-400-rgb"))));
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

`tests/themeSurfaces.test.ts` dosyasının TAMAMINI şununla değiştir:

```ts
// Pencere ve terminal renklerinin tek kaynağı (grafit kimlik, spec §3.4).
//
// `parseAppearance` ana sürecin pencere adresine koyduğu `?palette=…&theme=…`
// sorgusunu okuyor. Sorgu elle değiştirilebilir ya da eski bir sürümden
// gelebilir; geçersiz değer hiçbir CSS bloğuyla eşleşmeyeceği için
// varsayılana dönüyor. `warm` tasarim/temel dalının Sıcak Nötr'ü: o dalda
// kaydedilmiş bir ayar Amber'e geçiyor.

import { describe, expect, it } from "vitest";
import {
  PALETTES,
  THEME_SURFACES,
  normalizePalette,
  parseAppearance,
  windowBackgroundChange
} from "../app-electron/shared/themeSurfaces";

describe("normalizePalette", () => {
  it("üç vurgu olduğu gibi", () => {
    expect(normalizePalette("ntt")).toBe("ntt");
    expect(normalizePalette("indigo")).toBe("indigo");
    expect(normalizePalette("amber")).toBe("amber");
  });

  it("eski warm → amber", () => {
    expect(normalizePalette("warm")).toBe("amber");
  });

  it("yok, geçersiz ya da yanlış tip → ntt", () => {
    for (const value of [undefined, null, "", "lime", "NTT", 3, {}]) expect(normalizePalette(value)).toBe("ntt");
  });
});

describe("parseAppearance", () => {
  it("geçerli sorguyu okuyor", () => {
    expect(parseAppearance("?palette=amber&theme=light")).toEqual({ palette: "amber", theme: "light" });
  });

  it("sorgu yoksa NTT mavisi koyu", () => {
    expect(parseAppearance("")).toEqual({ palette: "ntt", theme: "dark" });
  });

  it("geçersiz değerler ayrı ayrı varsayılana dönüyor, warm amber oluyor", () => {
    expect(parseAppearance("?palette=lime&theme=blue")).toEqual({ palette: "ntt", theme: "dark" });
    expect(parseAppearance("?theme=light")).toEqual({ palette: "ntt", theme: "light" });
    expect(parseAppearance("?palette=warm&theme=")).toEqual({ palette: "amber", theme: "dark" });
    expect(parseAppearance("?palette=indigo&theme=light")).toEqual({ palette: "indigo", theme: "light" });
  });
});

describe("THEME_SURFACES", () => {
  it("üç vurgu, sıra ntt · indigo · amber", () => {
    expect(PALETTES).toEqual(["ntt", "indigo", "amber"]);
    expect(Object.keys(THEME_SURFACES).sort()).toEqual(["amber", "indigo", "ntt"]);
  });

  it("renkler #rrggbb biçiminde", () => {
    for (const palette of PALETTES) {
      for (const theme of ["dark", "light"] as const) {
        const s = THEME_SURFACES[palette][theme];
        for (const value of [s.app, s.card, s.accent, s.terminal.background, s.terminal.foreground, s.terminal.cursor]) {
          expect(value).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it("zemin ve kart bir temada üç vurgu için aynı", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const palette of PALETTES) {
        expect(THEME_SURFACES[palette][theme].app).toBe(THEME_SURFACES.ntt[theme].app);
        expect(THEME_SURFACES[palette][theme].card).toBe(THEME_SURFACES.ntt[theme].card);
      }
    }
  });

  it("terminal açık temada da o vurgunun koyu renklerinde kalıyor", () => {
    for (const palette of PALETTES) {
      expect(THEME_SURFACES[palette].light.terminal).toEqual(THEME_SURFACES[palette].dark.terminal);
    }
  });
});

// Ana süreç pencerenin arka plan rengini `config:save`'de bu yardımcıyla
// güncelliyor: yeniden boyutlanma ve yeniden yükleme anlarında ESKİ
// görünümün rengi belirmesin.
describe("windowBackgroundChange", () => {
  it("vurgu ya da tema değiştiyse yeni görünümün app rengi", () => {
    expect(
      windowBackgroundChange({ palette: "ntt", theme: "dark" }, { palette: "amber", theme: "dark" })
    ).toBe(THEME_SURFACES.amber.dark.app);
    expect(
      windowBackgroundChange({ palette: "ntt", theme: "dark" }, { palette: "ntt", theme: "light" })
    ).toBe(THEME_SURFACES.ntt.light.app);
  });

  it("görünüm aynıysa null — gereksiz yeniden boyama yok", () => {
    expect(windowBackgroundChange({ palette: "amber", theme: "light" }, { palette: "amber", theme: "light" })).toBeNull();
  });
});
```

`tests/appearanceConfig.test.ts` dosyasının TAMAMINI şununla değiştir:

```ts
// Görünüm ayarı: vurgu + koyu/açık (grafit kimlik, 2026-09-29).
//
// `palette` alanı tasarim/temel dalında eklendi ve orada `"indigo" | "warm"`
// idi; o dal hiç yayımlanmadı ama geliştirme makinelerindeki ayar
// dosyalarında bu değerler olabilir. Geçersiz bir değer doğrudan
// `<html data-palette>`'e gidiyor ve hiçbir CSS bloğuyla eşleşmezse uygulama
// renksiz açılır — bu yüzden okurken doğrulanıyor.

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
  it("ayar dosyası yoksa NTT mavisi koyu", async () => {
    const cfg = await load(null);
    expect(cfg.palette).toBe("ntt");
    expect(cfg.theme).toBe("dark");
  });

  it("eski dosyada palet yoksa ntt geliyor, kayıtlı tema korunuyor", async () => {
    const cfg = await load({ theme: "light" });
    expect(cfg.palette).toBe("ntt");
    expect(cfg.theme).toBe("light");
  });

  it("kayıtlı seçim olduğu gibi okunuyor", async () => {
    for (const palette of ["ntt", "indigo", "amber"]) {
      vi.resetModules();
      const cfg = await load({ palette, theme: "light" });
      expect(cfg.palette).toBe(palette);
      expect(cfg.theme).toBe("light");
    }
  });

  it("tasarim/temel'in warm'ı amber oluyor", async () => {
    const cfg = await load({ palette: "warm", theme: "dark" });
    expect(cfg.palette).toBe("amber");
  });

  it("geçersiz değerler varsayılana dönüyor", async () => {
    const cfg = await load({ palette: "lime", theme: "blue" });
    expect(cfg.palette).toBe("ntt");
    expect(cfg.theme).toBe("dark");
  });

  it("yanlış tipteki değerler de varsayılana dönüyor", async () => {
    const cfg = await load({ palette: 3, theme: null });
    expect(cfg.palette).toBe("ntt");
    expect(cfg.theme).toBe("dark");
  });
});
```

`tests/useAppearance.test.tsx` içinde üç değişiklik:

1. `it("nitelik yoksa İndigo koyu"` testini şununla değiştir:

```tsx
  it("nitelik yoksa NTT mavisi koyu", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("ntt/dark");
  });
```

2. Kalan iki testte `"warm"` → `"amber"`, beklenen metinlerde `warm/` → `amber/` (dört yer: `setAttribute("data-palette", "warm")` iki kez, `"warm/light"` iki kez, `"warm/dark"` bir kez).

3. `it("tanınmayan değer varsayılana düşüyor"` testinde beklenen `"indigo/dark"` → `"ntt/dark"`. Hemen altına ekle:

```tsx
  it("eski warm niteliği amber okunuyor", () => {
    root.setAttribute("data-palette", "warm");
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("amber/dark");
  });
```

`tests/appearance.test.tsx` içinde `"warm"` geçen üç yeri (satır 22, 23, 43) `"amber"` yap. Satır 22 `applyAppearance(root, "amber", "light", false)`, satır 23 `toBe("amber")`, satır 43 `applyAppearance(root, "amber", "dark", true)`. Satır 31'deki `"indigo"` kalıyor (hâlâ geçerli bir vurgu).

`tests/settingsAppearance.test.tsx` dosyasının TAMAMINI şununla değiştir (renk örneği testi Görev 2'de yeniden yazılacak; bu hâli bugünkü tek sıralı örneklerle geçiyor):

```tsx
// @vitest-environment jsdom
//
// Ayarlar → Görünüm (grafit kimlik, spec §3.4). Sabitlenenler: vurgu kartları
// gerçek bir radyo grubu (ok tuşları, gezici tabindex), renk örnekleri tek
// kaynaktan (`THEME_SURFACES`) geliyor, seçim Kaydet'le `palette`/`theme`
// olarak gidiyor, yazı boyutu bu bölümde.

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
  palette: "ntt",
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
  it("vurgu grubu üç kartlı, seçili olan işaretli; yazı boyutu burada, Sohbet görünümünde değil", () => {
    mount();
    const section = screen.getByRole("region", { name: "Görünüm" });
    const group = within(section).getByRole("radiogroup", { name: "Vurgu rengi" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(within(group).getByRole("radio", { name: "NTT mavisi" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "İndigo" }).getAttribute("aria-checked")).toBe("false");
    expect(within(group).getByRole("radio", { name: "Amber" }).getAttribute("aria-checked")).toBe("false");
    expect(within(section).getByText("Yazı boyutu")).toBeTruthy();
    const chat = screen.getByRole("region", { name: "Sohbet görünümü" });
    expect(within(chat).queryByText("Yazı boyutu")).toBeNull();
  });

  it("yalnızca seçili kart Tab sırasında; ok tuşu seçimi ve odağı birlikte taşıyor, uçta başa sarıyor", () => {
    mount();
    const ntt = screen.getByRole("radio", { name: "NTT mavisi" });
    const indigo = screen.getByRole("radio", { name: "İndigo" });
    const amber = screen.getByRole("radio", { name: "Amber" });
    expect(ntt.getAttribute("tabindex")).toBe("0");
    expect(indigo.getAttribute("tabindex")).toBe("-1");
    expect(amber.getAttribute("tabindex")).toBe("-1");
    ntt.focus();
    fireEvent.keyDown(ntt, { key: "ArrowRight" });
    expect(indigo.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(indigo);
    fireEvent.keyDown(indigo, { key: "ArrowDown" });
    expect(amber.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(amber);
    fireEvent.keyDown(amber, { key: "ArrowRight" });
    expect(ntt.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(ntt, { key: "ArrowLeft" });
    expect(amber.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(amber);
  });

  it("renk örnekleri THEME_SURFACES'ten geliyor", () => {
    mount();
    const amber = screen.getByRole("radio", { name: "Amber" });
    const dark = THEME_SURFACES.amber.dark;
    expect(swatches(amber)).toEqual([rgb(dark.app), rgb(dark.card), rgb(dark.accent)]);
  });

  it("vurgu ve tema değişince rozet çıkıyor; Kaydet ikisini de yolluyor", async () => {
    const { onClose, onSave } = mount();
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Amber" }));
    const light = screen.getByRole("button", { name: "Açık" });
    fireEvent.click(light);
    expect(light.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as Partial<AppConfig>;
    expect(patch.palette).toBe("amber");
    expect(patch.theme).toBe("light");
    expect(patch.chatFontSize).toBe("md");
  });

  it("eski seçime dönülünce değişiklik sayılmıyor", () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Amber" }));
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "NTT mavisi" }));
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
  });
});
```

- [ ] **Adım 2: Testlerin kırıldığını gör**

Çalıştır: `npx vitest run tests/themeTokens.test.ts tests/themeSurfaces.test.ts tests/appearanceConfig.test.ts tests/useAppearance.test.tsx tests/appearance.test.tsx tests/settingsAppearance.test.tsx`
Beklenen: FAIL. `themeTokens`'ta `html[data-theme="dark"]: 0 blok bulundu`; `themeSurfaces`'ta `normalizePalette is not a function` / `PALETTES` tanımsız; `appearanceConfig`'te `expected 'indigo' to be 'ntt'`; `settingsAppearance`'ta `Vurgu rengi` adlı radiogroup bulunamıyor. `appearance.test.tsx` geçebilir (fonksiyon değeri olduğu gibi yazıyor) — sorun değil.

- [ ] **Adım 3: CSS — başlık yorumu**

`src/index.css`'te `/* NTT Studio tasarım dili (2026-09-28, "Tasarım sistemi temeli"; öncesi` ile başlayıp `Tailwind'e değil doğrudan CSS'e gidiyor.) */` ile biten yorumu (satır 111-134) şununla değiştir:

```css
/* NTT Studio tasarım dili — grafit (2026-09-29, "Grafit kimlik ve kabuk";
   öncesi "Tasarım sistemi temeli", 2026-09-28).
   Tek cümlede: tek renkli grafit yüzeyler; renk yalnızca seçili öğede, ana
   düğmede, odak halkasında ve bağlantıda; geri kalan her şey gri.

   İKİ YÜZEY BLOĞU + ALTI VURGU BLOĞU. `<html data-theme>` (`dark` | `light`)
   yüzeyleri, kenarlıkları, metni, durum ve ortam renklerini, gölgeleri
   seçiyor. Vurgu `<html data-palette>` (`ntt` | `indigo` | `amber`) ile
   temanın BİRLİKTE seçtiği blokta; o blok yalnızca dokuz vurgu jetonunu
   tanımlıyor. Sırayı seçici ağırlığı kuruyor: vurgu bloğu (0,2,1) hem yüzey
   bloklarını hem `:root`'u, açık yüzey bloğu (0,1,1) `:root`'u yeniyor.
   `tests/themeTokens.test.ts` blokları okuyup altı görünümü ölçüyor: jeton
   kümeleri eksiksiz mi, metin/durum renkleri en zayıf yüzeyde (app, card,
   control, sidebar) ≥ 4.5:1 mi, yüzey sıralaması doğru mu. Bir rengi
   değiştirirken önce o testi çalıştır.

   RENK BİLGİ MİMARİSİNİN PARÇASI, DEKORASYON DEĞİL. Vurgu dışındaki her renk
   bir ANLAM taşıyor ve o anlamın dışında kullanılmıyor:
     vurgu    → birincil eylem / seçili  (--accent-*)
     mavi     → sistem, bilgi, DEV       (--status-info-*, --tier-dev-*, --navy-icon)
     kehribar → uyarı, QA                (--status-warning-*, --tier-qa-*)
     kırmızı  → hata, PRD                (--status-danger-*, --tier-prd-*)
     yeşil    → başarılı                 (--status-success-*)
     mor      → proje                    (--project-*)
   NTT mavisi DEV mavisine, Amber QA kehribarına yakın; bu yüzden ortam her
   zaman yazıyla da gösteriliyor (DEV/QA/PRD), renk tek başına anlam
   taşımıyor.

   Renkler "R G B" tripleti (bkz. tailwind.config.js withOpacity()) — bu format
   opacity varyantlarının (bg-accent-500/10 vb.) doğru derlenmesi için gerekli,
   "#hex" YAZMA. (Hex değerli `--*-text` değişkenleri bunun dışında; onlar
   Tailwind'e değil doğrudan CSS'e gidiyor.) */
```

- [ ] **Adım 4: CSS — dört blok yerine iki yüzey + altı vurgu bloğu**

`src/index.css`'te `:root,\nhtml[data-palette="indigo"][data-theme="dark"] {` satırından başlayıp `html[data-palette="warm"][data-theme="light"] { … }` bloğunun kapanan `}`'sine kadar olan her şeyi (satır 147-532; `body {` satırından hemen önceki boş satıra kadar) şununla değiştir:

```css
:root,
html[data-theme="dark"] {
  /* Grafit · koyu yüzey bloğu. `:root` bu blokla AYNI blok: nitelikler henüz
     yazılmamışken (ilk kare) de doğru renk olsun diye. Jeton gerekçeleri
     yalnızca bu blokta yazılı; açık blok aynı jeton kümesini kendi
     değerleriyle tanımlıyor. Vurgu jetonları burada DEĞİL, aşağıdaki vurgu
     bloklarında. */
  /* Chromium'un yerleşik denetimleri (`<select>` açılır listesi, kaydırma çubuğu) CSS ile değil `color-scheme`'e göre boyanıyor; bu satır olmadan koyu temada beyaz liste açılır. */
  color-scheme: dark;
  /* Yüzeyler ROLE göre: app (pencere) · sidebar · card · raised · hover ·
     control (girdi, çip) · active (basılı).
     SIRALAMA KURALI (test denetliyor): koyu temada `hover` ve `control`
     `border-subtle`dan, `active` `border-line`dan koyu; açık temada `control`
     ve `hover` `border-subtle`dan açık. Bozulursa ince kenarlıklı kartın
     üstüne gelindiğinde dolgu kenarlığı yutar.
     `app` ve `card` değerleri `app-electron/shared/themeSurfaces.ts` içinde de
     duruyor (pencere zemini, terminal, Ayarlar önizlemesi); ikisini bir test
     eşliyor. */
  --surface-app-rgb: 14 15 17;
  --surface-sidebar-rgb: 19 20 23;
  --surface-card-rgb: 23 25 28;
  --surface-raised-rgb: 27 29 33;
  --surface-hover-rgb: 31 33 37;
  --surface-control-rgb: 29 31 35;
  --surface-active-rgb: 40 43 48;

  --border-subtle-rgb: 37 39 43;
  --border-line-rgb: 46 49 54;
  --border-strong-rgb: 65 69 75;

  /* Eski ham merdiven. Kullananlar: `src/flows/flows.css` (buradan `--base-*`
     türetiyor; `FlowCanvas.jsx`, `RadialGauge.jsx` o türevleri okuyor),
     `ChatBubble.tsx` (`--base-700-rgb`), `ChatSessionPane.tsx`
     (`--base-950-rgb`). */
  --base-950-rgb: var(--surface-app-rgb);
  --base-900-rgb: var(--surface-card-rgb);
  --base-850-rgb: var(--surface-raised-rgb);
  --base-800-rgb: var(--surface-control-rgb);
  --base-700-rgb: var(--border-line-rgb);
  --base-600-rgb: var(--border-strong-rgb);

  /* Metin: 100 ana · 200 ikincil · 300/400 ipucu, üst bilgi, bölüm etiketi
     (≥ 4.5:1) · 500 yer tutucu, devre dışı (≥ 3:1) · 600 yalnız süs, okunacak
     metinde KULLANILMAZ. Ölçüm `app`/`card`/`control`/`sidebar`ın en
     zayıfına karşı. */
  --ink-100-rgb: 236 236 238;
  --ink-200-rgb: 180 184 191;
  --ink-300-rgb: 141 146 155;
  --ink-400-rgb: 141 146 155;
  --ink-500-rgb: 108 113 122;
  --ink-600-rgb: 70 74 81;
  --ink-strong-rgb: 255 255 255;

  --scrollbar-thumb: #33363c;
  --scrollbar-thumb-hover: #45494f;

  /* Kırmızı dolgu ya da resim üstü siyah örtü gibi, temadan bağımsız koyu
     zeminlerin üstündeki yazı. İki blokta da beyaz. */
  --on-solid-rgb: 255 255 255;

  /* Sohbet karşılama başlığının degradesi: ana metin → yumuşak vurgu → vurgu.
     Son ikisi vurgu bloklarında. */
  --chat-hero-from: #e8eaee;

  /* Tür gösterge renkleri. Modül ikonları grafitte renk taşımıyor (ink-300):
     seçili olan zaten vurgu rengine dönüyor, gerisi gri. Klasör ve proje
     "bu ne" bilgisi olarak renkli kalıyor. */
  --navy-icon: #8fb0d6;
  --module-code: #8d929b;
  --module-sap: #8d929b;
  --module-guiscript: #8d929b;
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

html[data-theme="light"] {
  /* Grafit · açık yüzey bloğu. Jeton gerekçeleri koyu blokta. */
  color-scheme: light;
  --surface-app-rgb: 246 247 248;
  --surface-sidebar-rgb: 239 240 242;
  --surface-card-rgb: 255 255 255;
  --surface-raised-rgb: 250 251 251;
  --surface-hover-rgb: 236 238 241;
  --surface-control-rgb: 241 242 244;
  --surface-active-rgb: 226 229 233;

  --border-subtle-rgb: 230 232 235;
  --border-line-rgb: 218 221 226;
  --border-strong-rgb: 195 199 206;

  --base-950-rgb: var(--surface-app-rgb);
  --base-900-rgb: var(--surface-card-rgb);
  --base-850-rgb: var(--surface-raised-rgb);
  --base-800-rgb: var(--surface-control-rgb);
  --base-700-rgb: var(--border-line-rgb);
  --base-600-rgb: var(--border-strong-rgb);

  --ink-100-rgb: 22 24 27;
  --ink-200-rgb: 71 76 85;
  --ink-300-rgb: 98 103 111;
  --ink-400-rgb: 98 103 111;
  --ink-500-rgb: 128 133 141;
  --ink-600-rgb: 185 189 196;
  --ink-strong-rgb: 15 17 20;

  --scrollbar-thumb: #d3d6db;
  --scrollbar-thumb-hover: #bec2c9;

  --on-solid-rgb: 255 255 255;

  --chat-hero-from: #1a1d24;

  --navy-icon: #3a6690;
  --module-code: #62676f;
  --module-sap: #62676f;
  --module-guiscript: #62676f;
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

/* VURGU BLOKLARI. Her birinde aynı dokuz jeton:
     500 dolgu (üstündeki yazı `text-accent-on`) · 400 metin, ikon, seçili
     satır çizgisi, odak halkası · 600 dolgunun basılı hâli ·
     `--accent-cyan-rgb` eski adıyla duruyor, değeri 500 · `--accent-glow`
     seçili zemin, 500'ün koyuda %13'ü, açıkta %10'u · `--accent-soft-text`
     yumuşak vurgu metni · `--chat-hero-via` = soft-text, `--chat-hero-to` =
     500.
   NTT koyu dolgusu bilerek görece koyu: daha parlak bir mavinin üstünde beyaz
   yazı 4.5:1'in altına düşüyor. `:root` NTT koyu ile aynı blok (ilk kare). */
:root,
html[data-palette="ntt"][data-theme="dark"] {
  --accent-600-rgb: 29 99 179;
  --accent-500-rgb: 37 116 204;
  --accent-400-rgb: 90 162 238;
  --accent-on-rgb: 255 255 255;
  --accent-cyan-rgb: 37 116 204;
  --accent-glow: rgba(37, 116, 204, 0.13);
  --accent-soft-text: #9cc6f5;
  --chat-hero-via: #9cc6f5;
  --chat-hero-to: #2574cc;
}

html[data-palette="ntt"][data-theme="light"] {
  --accent-600-rgb: 24 90 163;
  --accent-500-rgb: 31 111 196;
  --accent-400-rgb: 27 102 182;
  --accent-on-rgb: 255 255 255;
  --accent-cyan-rgb: 31 111 196;
  --accent-glow: rgba(31, 111, 196, 0.1);
  --accent-soft-text: #185aa3;
  --chat-hero-via: #185aa3;
  --chat-hero-to: #1f6fc4;
}

html[data-palette="indigo"][data-theme="dark"] {
  --accent-600-rgb: 122 130 245;
  --accent-500-rgb: 139 147 255;
  --accent-400-rgb: 160 166 255;
  --accent-on-rgb: 15 16 32;
  --accent-cyan-rgb: 139 147 255;
  --accent-glow: rgba(139, 147, 255, 0.13);
  --accent-soft-text: #c3c7ff;
  --chat-hero-via: #c3c7ff;
  --chat-hero-to: #8b93ff;
}

html[data-palette="indigo"][data-theme="light"] {
  --accent-600-rgb: 68 73 196;
  --accent-500-rgb: 79 85 217;
  --accent-400-rgb: 74 80 210;
  --accent-on-rgb: 255 255 255;
  --accent-cyan-rgb: 79 85 217;
  --accent-glow: rgba(79, 85, 217, 0.1);
  --accent-soft-text: #3f44b0;
  --chat-hero-via: #3f44b0;
  --chat-hero-to: #4f55d9;
}

html[data-palette="amber"][data-theme="dark"] {
  --accent-600-rgb: 201 143 46;
  --accent-500-rgb: 224 163 63;
  --accent-400-rgb: 235 184 95;
  --accent-on-rgb: 26 18 4;
  --accent-cyan-rgb: 224 163 63;
  --accent-glow: rgba(224, 163, 63, 0.13);
  --accent-soft-text: #f3d08f;
  --chat-hero-via: #f3d08f;
  --chat-hero-to: #e0a33f;
}

html[data-palette="amber"][data-theme="light"] {
  --accent-600-rgb: 130 82 12;
  --accent-500-rgb: 154 98 16;
  --accent-400-rgb: 143 90 12;
  --accent-on-rgb: 255 255 255;
  --accent-cyan-rgb: 154 98 16;
  --accent-glow: rgba(154, 98, 16, 0.1);
  --accent-soft-text: #7a4c0a;
  --chat-hero-via: #7a4c0a;
  --chat-hero-to: #9a6210;
}
```

Not: `--accent-glow` açıkta `0.1` yazılıyor (`0.10` değil); test `Number()` ile karşılaştırıyor, ikisi de geçer.

- [ ] **Adım 5: Tek kaynak tablo**

`app-electron/shared/themeSurfaces.ts` dosyasının TAMAMINI şununla değiştir:

```ts
import type { AppPalette, AppTheme } from "./types";

export type { AppPalette };

// CSS'in OKUNAMADIĞI yerler için renklerin tek kaynağı.
//
// Renklerin asıl yeri `src/index.css`'teki iki yüzey ve altı vurgu bloğu. Ama
// üç tüketici CSS değişkenini okuyamıyor:
//   - ana süreç, pencereyi açarken (`BrowserWindow.backgroundColor`) — sayfa
//     henüz yok;
//   - xterm — kendi tuvalini boyuyor;
//   - Ayarlar'daki vurgu kartları — öbür vurgunun ve öbür temanın renklerini
//     göstermeleri gerekiyor, onlar o an sayfada etkin değil.
// Bu tablo onlar için. Değerler CSS ile AYNI olmalı; `tests/themeTokens.test.ts`
// altı görünümde `app`/`card`/`accent`'i `--surface-app-rgb` /
// `--surface-card-rgb` / `--accent-500-rgb` ile, terminali koyu yüzey ve
// `--accent-400-rgb` ile karşılaştırıyor.
//
// `app` ve `card` bir temada üç vurgu için aynı (grafit yüzeyler vurgudan
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

const DARK = { app: "#0e0f11", card: "#17191c" };
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
  amber: accentPair("#e0a33f", "#9a6210", "#ebb85f")
};

/** Ayarlar'daki sıra; ilki varsayılan. */
export const PALETTES: readonly AppPalette[] = ["ntt", "indigo", "amber"];
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
  return THEME_SURFACES[after.palette][after.theme].app;
}
```

- [ ] **Adım 6: Tür, ayar okuma, görünüm kancası, App**

`app-electron/shared/types.ts:307-311` — yorum ve türü şununla değiştir:

```ts
// Vurgu rengi. Koyu/açık hâlden (`AppTheme`) BAĞIMSIZ: her vurgu iki hâlde de
// var; `src/index.css`'te iki yüzey bloğu ve altı vurgu bloğu (bkz. tasarım
// belgesi docs/superpowers/specs/2026-09-29-grafit-kimlik-ve-kabuk-design.md).
// Alanın adı `palette` olarak kaldı; okurken `normalizePalette` doğruluyor.
export type AppPalette = "ntt" | "indigo" | "amber";
```

`app-electron/main/store.ts`:
- Satır 18'deki `  AppPalette,` import satırını sil.
- Satır 30'daki `const VALID_PALETTES: AppPalette[] = ["indigo", "warm"];` satırını sil.
- `./samlPolicy` import'unun altına ekle: `import { normalizePalette } from "../shared/themeSurfaces";`
- `defaultConfig()` içindeki `palette: "indigo",` → `palette: "ntt",`
- Okuma kısmındaki yorum ve satırı şununla değiştir:

```ts
    // Görünüm de aynı muameleyi görüyor: değer doğrudan `<html data-palette /
    // data-theme>`'e yazılıyor ve hiçbir CSS bloğuyla eşleşmeyen bir değer
    // uygulamayı renksiz açardı. `palette` yoksa, geçersizse ya da
    // tasarim/temel'in `"warm"`ıysa `normalizePalette` karar veriyor.
    const theme = VALID_THEMES.includes(parsed.theme) ? parsed.theme : fallback.theme;
    const palette = normalizePalette(parsed.palette);
```

`src/ui/useAppearance.ts`:
- İkinci import'un altına ekle: `import { normalizePalette } from "../../app-electron/shared/themeSurfaces";`
- `palette: root.getAttribute("data-palette") === "warm" ? "warm" : "indigo",` → `palette: normalizePalette(root.getAttribute("data-palette")),`

`src/App.tsx:324`: `const palette = config.palette ?? "indigo";` → `const palette = config.palette ?? "ntt";`

- [ ] **Adım 7: Ayarlar ve çeviriler**

`src/components/SettingsModal.tsx`:
- Satır 21'deki `THEME_SURFACES` import'unu `PALETTES` ile genişlet: `import { PALETTES, THEME_SURFACES } from "../../app-electron/shared/themeSurfaces";` (satırın bugünkü biçimini koru, yalnızca `PALETTES` ekle).
- Satır 115'teki `const PALETTES: AppPalette[] = ["indigo", "warm"];` satırını sil. (`move()` artık import edilen `PALETTES`'i kullanıyor; `readonly` dizi `indexOf` ve indeksle okumayı destekliyor.)
- PalettePicker'ın üstündeki yorumun ilk satırını `// Vurgu seçimi: üç kart, her birinde o vurgunun üç rengi (zemin, kart, vurgu).` yap.
- Satır 515-531'deki `names={{ … }}` nesnesini şununla değiştir:

```tsx
                names={{
                  ntt: {
                    name: t("settingsModal.paletteNtt"),
                    description: t("settingsModal.paletteNttDesc")
                  },
                  indigo: {
                    name: t("settingsModal.paletteIndigo"),
                    description: t("settingsModal.paletteIndigoDesc")
                  },
                  amber: {
                    name: t("settingsModal.paletteAmber"),
                    description: t("settingsModal.paletteAmberDesc")
                  }
                }}
```

- PalettePicker'daki `grid grid-cols-2 gap-3` → `grid grid-cols-3 gap-3`.

`src/i18n/tr.ts:550-554` beş satırı şu yedi satırla değiştir:

```ts
  "settingsModal.paletteLabel": "Vurgu rengi",
  "settingsModal.paletteNtt": "NTT mavisi",
  "settingsModal.paletteNttDesc": "Kurumsal mavi; varsayılan",
  "settingsModal.paletteIndigo": "İndigo",
  "settingsModal.paletteIndigoDesc": "Yumuşak mavi-mor",
  "settingsModal.paletteAmber": "Amber",
  "settingsModal.paletteAmberDesc": "Sıcak kehribar",
```

`src/i18n/en.ts:492-496` beş satırı şu yedi satırla değiştir:

```ts
  "settingsModal.paletteLabel": "Accent color",
  "settingsModal.paletteNtt": "NTT blue",
  "settingsModal.paletteNttDesc": "Corporate blue; the default",
  "settingsModal.paletteIndigo": "Indigo",
  "settingsModal.paletteIndigoDesc": "Soft blue-violet",
  "settingsModal.paletteAmber": "Amber",
  "settingsModal.paletteAmberDesc": "Warm amber",
```

- [ ] **Adım 8: Testleri ve tip denetimini çalıştır**

Çalıştır: `npx vitest run tests/themeTokens.test.ts tests/themeSurfaces.test.ts tests/appearanceConfig.test.ts tests/useAppearance.test.tsx tests/appearance.test.tsx tests/settingsAppearance.test.tsx tests/i18n.test.ts`
Beklenen: PASS.

Çalıştır: `npm run typecheck`
Beklenen: hata yok. `'warm'` ya da `AppPalette` kullanılmıyor hatası çıkarsa, kalan eski kullanımı `grep -rn '"warm"' src app-electron` ile bul ve düzelt.

Çalıştır: `npm test`
Beklenen: bütün takım PASS.

- [ ] **Adım 9: Commit**

```bash
git add src/index.css app-electron/shared/themeSurfaces.ts app-electron/shared/types.ts app-electron/main/store.ts
git add src/ui/useAppearance.ts src/App.tsx src/components/SettingsModal.tsx src/i18n/tr.ts src/i18n/en.ts
git add tests/themeTokens.test.ts tests/themeSurfaces.test.ts tests/appearanceConfig.test.ts tests/useAppearance.test.tsx tests/appearance.test.tsx tests/settingsAppearance.test.tsx
git commit -m "Grafit: iki yuzey blogu ve uc vurgu rengi (ntt, indigo, amber)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Ayarlar — vurgu kartlarında koyu ve açık önizleme

Bugün kartların renk örnekleri formdaki Koyu/Açık seçimini izliyor; yani kullanıcı bir vurgunun öbür temadaki hâlini görmüyor. Spec §3.4: her kart iki sıra örnek gösteriyor (üstte koyu, altta açık) ve bu sıralar tema seçimiyle değişmiyor. `PalettePicker`'ın `theme` özelliği kalkıyor.

**Dosyalar:**
- Değiştir: `src/components/SettingsModal.tsx` (satır 20 import; satır 115-197 `PalettePicker`; satır 519 `theme={form.theme}`)
- Test: `tests/settingsAppearance.test.tsx` (renk örneği testi)

**Arayüzler:**
- Tüketir: Görev 1'den `PALETTES`, `THEME_SURFACES`, `AppPalette`.
- Üretir: `PalettePicker({ value, label, names, onChange })` — `theme` yok. Her kartta `data-swatch="dark"` ve `data-swatch="light"` işaretli iki sıra, her sırada `app`, `card`, `accent` renginde üç kutu.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/settingsAppearance.test.tsx`'te `swatches` yardımcısını şununla değiştir:

```tsx
/** Kartın bir sırasındaki (`dark` ya da `light`) üç kutunun rengi. */
function swatchRow(radio: HTMLElement, theme: "dark" | "light"): string[] {
  const row = radio.querySelector<HTMLElement>(`[data-swatch="${theme}"]`);
  if (!row) return [];
  return Array.from(row.children).map((el) => (el as HTMLElement).style.backgroundColor);
}
```

`it("renk örnekleri THEME_SURFACES'ten geliyor"` testini şununla değiştir:

```tsx
  it("her kart koyu ve açık önizlemeyi birlikte gösteriyor; Koyu/Açık seçimi örnekleri değiştirmiyor", () => {
    mount();
    for (const [name, palette] of [
      ["NTT mavisi", "ntt"],
      ["İndigo", "indigo"],
      ["Amber", "amber"]
    ] as const) {
      const radio = screen.getByRole("radio", { name });
      const { dark, light } = THEME_SURFACES[palette];
      expect(swatchRow(radio, "dark")).toEqual([rgb(dark.app), rgb(dark.card), rgb(dark.accent)]);
      expect(swatchRow(radio, "light")).toEqual([rgb(light.app), rgb(light.card), rgb(light.accent)]);
    }
    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    const amber = screen.getByRole("radio", { name: "Amber" });
    expect(swatchRow(amber, "dark")[2]).toBe(rgb(THEME_SURFACES.amber.dark.accent));
    expect(swatchRow(amber, "light")[2]).toBe(rgb(THEME_SURFACES.amber.light.accent));
  });
```

(Koyu/Açık düğmesinin erişilebilir adı "Açık" değilse — `grep -n "settingsModal.themeLight" src/i18n/tr.ts` ile metni oku — testteki adı ona göre yaz; tema seçimi `radio` ise `getByRole("radio", …)` kullan.)

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/settingsAppearance.test.tsx`
Beklenen: FAIL — yeni test `expected [] to deeply equal [ 'rgb(…)', … ]` (bugünkü kutuların `data-swatch` değeri boş, sıra yok).

- [ ] **Adım 3: `PalettePicker`'ı değiştir**

`src/components/SettingsModal.tsx`:

1. Satır 20'deki type import'tan `AppTheme`'i çıkar:

```tsx
import type { AppConfig, AppPalette, UpdateStatus } from "../../app-electron/shared/types";
```

Dosyada başka `AppTheme` kullanımı kalıyorsa (`grep -n AppTheme src/components/SettingsModal.tsx`) import'ta bırak — typecheck karar verir (`noUnusedLocals` açık).

2. `PalettePicker`'ın üstündeki yorumu ve bileşenin tamamını şununla değiştir:

```tsx
// Vurgu seçimi: üç kart; her kartta o vurgunun iki sırası — üstte koyu, altta
// açık — ve her sırada üç renk (zemin, kart, vurgu). Renkler CSS
// değişkeninden DEĞİL `THEME_SURFACES`'ten geliyor: seçili olmayan vurgunun ve
// öbür temanın değişkenleri o an sayfada tanımlı değil. İki sıra da her zaman
// görünüyor; kullanıcı bir vurguyu seçerken iki temadaki hâlini birlikte
// görüyor (grafit spec §3.4).
//
// Klavye, radyo grubu kalıbında: Tab grupta yalnızca seçili karta duruyor, ok
// tuşları seçimi ve odağı birlikte taşıyor (sondan başa sarıyor).
function PalettePicker({
  value,
  label,
  names,
  onChange
}: {
  value: AppPalette;
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
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-3">
      {PALETTES.map((palette) => {
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
            <span className="flex flex-col gap-1" aria-hidden="true">
              {(["dark", "light"] as const).map((theme) => {
                const surface = THEME_SURFACES[palette][theme];
                return (
                  <span key={theme} data-swatch={theme} className="flex gap-1">
                    {[surface.app, surface.card, surface.accent].map((color, index) => (
                      <span
                        key={index}
                        className="h-4 flex-1 rounded-sm border border-line"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                );
              })}
            </span>
            <span id={`${baseId}-${palette}-name`} className="text-sm font-medium text-slate-100">
              {names[palette].name}
            </span>
            <span id={`${baseId}-${palette}-desc`} className="text-xs text-slate-400">
              {names[palette].description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

Bugünkü `onKeyDown` gövdesi yukarıdakinden farklıysa (ör. `Home`/`End` da işliyorsa) bugünkünü koru; değişen yalnızca imza, `grid-cols-3` ve renk örneği bloğu.

3. Satır 519 civarındaki `<PalettePicker` kullanımından `theme={form.theme}` satırını sil. Koyu/Açık düğmelerine dokunma.

- [ ] **Adım 4: Testleri ve tip denetimini çalıştır**

Çalıştır: `npx vitest run tests/settingsAppearance.test.tsx`
Beklenen: PASS (5 test).

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Adım 5: Commit**

```bash
git add src/components/SettingsModal.tsx
git add tests/settingsAppearance.test.tsx
git commit -m "Grafit: vurgu kartlari koyu ve acik onizlemeyi birlikte gosteriyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: JetBrains Mono

Mono yazı (`font-mono`) bugün Tailwind'in varsayılan yığınında: Windows'ta Consolas. Grafit kimlikte etiketler, sistem adları ve bağlam rozeti mono; JetBrains Mono gömülü geliyor. Inter'deki düzen aynen: iki woff2 (latin + latin-ext), yanında lisans, paket bağımlılığı yok. Terminal (xterm) Consolas'ta kalıyor (spec §4.1).

**Dosyalar:**
- Oluştur: `src/assets/fonts/jetbrains-mono-latin-wght-normal.woff2`, `src/assets/fonts/jetbrains-mono-latin-ext-wght-normal.woff2`, `src/assets/fonts/JetBrainsMono-LICENSE.txt` (npm paketinden kopya)
- Değiştir: `src/index.css` (Inter'in ikinci `@font-face` kuralından sonra)
- Değiştir: `tailwind.config.js` (`theme.extend` içine `fontFamily`)
- Test: `tests/monoFont.test.ts` (yeni)

**Arayüzler:**
- Tüketir: yok.
- Üretir: `font-mono` sınıfı `"JetBrains Mono Variable"` ile başlayan yığın. Görev 4 (`Eyebrow`) ve Görev 6 (başlık çubuğu) bunu kullanıyor.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/monoFont.test.ts`:

```ts
// JetBrains Mono gömülü geliyor (grafit spec §4.1).
//
// Inter'deki düzenin aynısı: iki woff2 (latin + latin-ext; Türkçe'nin ğ/ş/İ
// harfleri latin-ext'te), yanında lisans, npm bağımlılığı yok. Terminal
// (xterm) BİLEREK Consolas'ta: hücre genişliğini açılışta ölçüyor, yazı tipi
// geç yüklenirse karakterler kayar.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");

describe("JetBrains Mono", () => {
  const css = read("src", "index.css");
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((body) => body.includes('"JetBrains Mono Variable"'));

  it("iki @font-face kuralı var ve dosyaları diskte", () => {
    expect(faces).toHaveLength(2);
    for (const body of faces) {
      const url = /url\("\.\/([^"]+)"\)/.exec(body);
      expect(url).not.toBeNull();
      expect(existsSync(path.join(ROOT, "src", url![1]))).toBe(true);
      expect(body).toContain("font-display: swap");
      expect(body).toContain("unicode-range");
    }
    expect(faces.some((b) => b.includes("jetbrains-mono-latin-ext-wght-normal.woff2"))).toBe(true);
  });

  it("lisans dosyası yanında", () => {
    expect(read("src", "assets", "fonts", "JetBrainsMono-LICENSE.txt")).toContain("SIL Open Font License");
  });

  it("Tailwind mono yığını JetBrains Mono ile başlıyor", () => {
    expect(read("tailwind.config.js")).toMatch(/mono:\s*\[\s*"JetBrains Mono Variable"/);
  });

  it("paket bağımlılığı bırakılmadı", () => {
    expect(read("package.json")).not.toContain("@fontsource");
  });

  it("terminal Consolas'ta kalıyor", () => {
    const terminal = read("src", "components", "EmbeddedTerminal.tsx");
    expect(terminal).toContain("Consolas");
    expect(terminal).not.toContain("JetBrains");
  });
});
```

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/monoFont.test.ts`
Beklenen: FAIL — `expected [] to have a length of 2`, lisans dosyası yok (ENOENT), mono yığını eşleşmiyor. Son iki test geçer.

- [ ] **Adım 3: Dosyaları al**

Depo dışında geçici bir klasörde paketi indir; iki dosyayı ve lisansı kopyala (sürüm sabit; ağırlık aralığı 100–800, lisans OFL 1.1):

```bash
mkdir -p /tmp/jbmono && cd /tmp/jbmono && npm pack @fontsource-variable/jetbrains-mono@5.3.0 && tar -xzf fontsource-variable-jetbrains-mono-5.3.0.tgz
cd /c/workspace/aXet-SAP-Launcher
cp /tmp/jbmono/package/files/jetbrains-mono-latin-wght-normal.woff2 src/assets/fonts/
cp /tmp/jbmono/package/files/jetbrains-mono-latin-ext-wght-normal.woff2 src/assets/fonts/
cp /tmp/jbmono/package/LICENSE src/assets/fonts/JetBrainsMono-LICENSE.txt
```

`package.json` ve `package-lock.json` DEĞİŞMEMELİ (`git status` ile bak). `npm pack` paketi yalnızca indirip tgz yazıyor, projeye kurmuyor.

- [ ] **Adım 4: `@font-face` kuralları**

`src/index.css`'te Inter'in ikinci `@font-face` kuralının (latin-ext) kapanan `}`'sinden sonra ekle:

```css

/* JetBrains Mono (değişken ağırlık, 100–800) — etiketler, sistem adları,
   bağlam rozeti, kod. Inter'le aynı düzen: yalnızca latin + latin-ext
   gömülü, lisans (SIL OFL 1.1) `JetBrainsMono-LICENSE.txt`. `unicode-range`
   değerleri paketin kendi CSS'inden (Inter'inkiyle aynı değil).
   Terminal (xterm) bu yazı tipini KULLANMIYOR, bkz. EmbeddedTerminal.tsx. */
@font-face {
  font-family: "JetBrains Mono Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 100 800;
  src: url("./assets/fonts/jetbrains-mono-latin-wght-normal.woff2") format("woff2-variations");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "JetBrains Mono Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 100 800;
  src: url("./assets/fonts/jetbrains-mono-latin-ext-wght-normal.woff2") format("woff2-variations");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7,
    U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF,
    U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
```

- [ ] **Adım 5: Tailwind yığını**

`tailwind.config.js`'te `fontSize: {` bloğunun kapanışından sonra (aynı girinti) ekle:

```js
      // Mono yığını: gömülü JetBrains Mono (bkz. src/index.css), yoksa
      // sistemin mono yazı tipi. Terminal (xterm) bunu kullanmıyor, kendi
      // yığını var (EmbeddedTerminal.tsx).
      fontFamily: {
        mono: ["JetBrains Mono Variable", "ui-monospace", "Cascadia Mono", "Consolas", "monospace"]
      },
```

- [ ] **Adım 6: Testleri çalıştır**

Çalıştır: `npx vitest run tests/monoFont.test.ts tests/themeTokens.test.ts`
Beklenen: PASS. (`themeTokens`'ın CSS ayrıştırıcısı yeni `@font-face` kurallarını da okuyor ama tema seçicisi taşımadıkları için sayılmıyorlar.)

- [ ] **Adım 7: Commit**

```bash
git add src/assets/fonts/jetbrains-mono-latin-wght-normal.woff2
git add src/assets/fonts/jetbrains-mono-latin-ext-wght-normal.woff2
git add src/assets/fonts/JetBrainsMono-LICENSE.txt
git add src/index.css tailwind.config.js tests/monoFont.test.ts
git commit -m "Grafit: JetBrains Mono gomulu geliyor, terminal Consolas'ta kaliyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: `Eyebrow` bölüm etiketi

Bölüm başlıkları bugün beş yerde elle yazılmış `text-[10px] font-semibold uppercase tracking-wider text-slate-500`. Grafit'te bunlar tek bileşen: mono, `text-2xs`, büyük harf, geniş aralık, `ink-300`, isteğe bağlı sağa yaslı sayı (spec §4.2). Beş yer çevrilince `text-[Npx]` cırcırı 191'den 186'ya iniyor.

**Dosyalar:**
- Oluştur: `src/ui/Eyebrow.tsx`
- Değiştir: `src/components/AxetCodeHome.tsx:50` (import), `:2897-2913` (Projeler), `:3011-3027` (SAP sistemleri), `:3117-3133` (Genel), `:3167-3169` (Sistemler)
- Değiştir: `src/components/ChatSessionPane.tsx:48` (import), `:812-814` (Hızlı başlangıç)
- Değiştir: `tests/designScale.test.ts:92-101` (cırcır)
- Test: `tests/eyebrow.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: Görev 3'ten `font-mono`.
- Üretir: `export function Eyebrow(props: { children: ReactNode; count?: ReactNode; as?: "div" | "span" | "h2" | "h3"; className?: string })` (`src/ui/Eyebrow.tsx`). 1b'deki kenar çubuğu bileşenleri bölüm başlıklarında bunu kullanıyor.

- [ ] **Adım 1: Kırılan testleri yaz**

`tests/eyebrow.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Bölüm etiketi (grafit spec §4.2): mono, küçük, büyük harf, geniş aralık,
// ink-300. Büyük harf CSS'le (`uppercase`) yapılıyor; metnin kendisi i18n'deki
// gibi kalıyor, "i → İ" dönüşümünü `<html lang>` belirliyor (Görev 5).

import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Eyebrow } from "../src/ui/Eyebrow";

afterEach(cleanup);

describe("Eyebrow", () => {
  it("mono, büyük harf, ink-300 sınıflarıyla çiziliyor; varsayılan etiket div", () => {
    render(<Eyebrow>Sistemler</Eyebrow>);
    const label = screen.getByText("Sistemler");
    const root = label.parentElement!;
    expect(root.tagName).toBe("DIV");
    for (const cls of ["font-mono", "text-2xs", "font-medium", "uppercase", "tracking-[0.12em]", "text-slate-300"]) {
      expect(root.className).toContain(cls);
    }
    expect(label.className).toContain("truncate");
  });

  it("count verilince sağda gösteriliyor, verilmeyince hiç çizilmiyor", () => {
    const { rerender, container } = render(<Eyebrow count={3}>Sistemler</Eyebrow>);
    const count = screen.getByText("3");
    expect(count.className).toContain("tabular-nums");
    expect(count.className).toContain("shrink-0");
    rerender(<Eyebrow>Sistemler</Eyebrow>);
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  it("count 0 da gösteriliyor", () => {
    render(<Eyebrow count={0}>Projeler</Eyebrow>);
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("as ve className uygulanıyor", () => {
    render(
      <Eyebrow as="h2" className="mt-8 pb-2.5">
        Hızlı başlangıç
      </Eyebrow>
    );
    const root = screen.getByText("Hızlı başlangıç").parentElement!;
    expect(root.tagName).toBe("H2");
    expect(root.className).toContain("mt-8 pb-2.5");
  });
});

describe("elle yazılmış bölüm başlığı kalmadı", () => {
  it("AxetCodeHome ve ChatSessionPane'de eski kalıp yok, Eyebrow kullanılıyor", () => {
    for (const name of ["AxetCodeHome.tsx", "ChatSessionPane.tsx"]) {
      const text = readFileSync(path.join(__dirname, "..", "src", "components", name), "utf8");
      expect(text).not.toContain("text-[10px] font-semibold uppercase tracking-wider");
      expect(text).toContain("<Eyebrow");
    }
  });
});
```

`tests/designScale.test.ts:92-101` cırcırında yorumu ve testi şununla değiştir (gövdenin sayma kısmı aynı kalıyor, yalnızca sınır ve ad değişiyor):

```ts
  // 207 → 205 (Görev 1, düğme boyları) → 191 (Görev 8, taşınan beş pencere)
  // → 186 (grafit Görev 4, beş bölüm başlığı Eyebrow'a).
  it("186'yı geçmiyor", () => {
```

ve aynı testteki `toBeLessThanOrEqual(191)` → `toBeLessThanOrEqual(186)`.

- [ ] **Adım 2: Testlerin kırıldığını gör**

Çalıştır: `npx vitest run tests/eyebrow.test.tsx tests/designScale.test.ts`
Beklenen: FAIL — `Failed to resolve import "../src/ui/Eyebrow"`; cırcır `expected 191 to be less than or equal to 186`.

- [ ] **Adım 3: Bileşeni yaz**

`src/ui/Eyebrow.tsx`:

```tsx
import type { ReactNode } from "react";

// Bölüm etiketi (grafit spec §4.2): "SİSTEMLER 3". Mono, küçük, büyük harf,
// geniş harf aralığı, ink-300. Büyük harf CSS'le yapılıyor; Türkçe'de "i"nin
// "İ" olması `<html lang>`'a bağlı (bkz. useDocumentLanguage).
//
// `count` sağa yaslı ve eşit genişlikli rakamla; 0 da gösteriliyor, yalnızca
// verilmezse çizilmiyor. Başlık anlamı gerekiyorsa `as="h2"`/`"h3"`; bir
// düğmenin içindeyse `as="span"` (düğmenin içine blok öğe konmaz).
export function Eyebrow({
  children,
  count,
  as: Tag = "div",
  className = ""
}: {
  children: ReactNode;
  count?: ReactNode;
  as?: "div" | "span" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      className={`flex items-center gap-2 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-slate-300 ${className}`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && <span className="shrink-0 tabular-nums">{count}</span>}
    </Tag>
  );
}
```

- [ ] **Adım 4: Beş yeri çevir**

`src/components/AxetCodeHome.tsx` satır 50'deki `import { useT } from "../i18n";` satırının altına: `import { Eyebrow } from "../ui/Eyebrow";`

Üç grup düğmesinde (satır 2900, 3014, 3120) aynı değişiklik; her birinde `KEY`, `pt-N`, sayı ve metin anahtarı farklı:

| Satır | `KEY` | `pt-N` | sayı | metin |
|---|---|---|---|---|
| 2900 | `PROJECTS_SECTION_KEY` | `pt-2` | `projects.length` | `axetCodeHome.projectsTitle` |
| 3014 | `SAP_SECTION_KEY` | `pt-3` | `sessionGroups.sapGroups.length` | `axetCodeHome.sapChatsTitle` |
| 3120 | `GENERAL_GROUP_KEY` | `pt-3` | `sessionGroups.general.length` | `axetCodeHome.generalChatsTitle` |

Projeler için tam hâli (öbür ikisi tablodaki değerlerle aynı biçimde):

```tsx
                  <button
                    onClick={() => toggleGroup(PROJECTS_SECTION_KEY)}
                    aria-expanded={groupOpen(PROJECTS_SECTION_KEY)}
                    className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-2 text-left text-slate-400 transition hover:text-slate-200"
                  >
                    {groupOpen(PROJECTS_SECTION_KEY) ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <Eyebrow as="span" count={projects.length} className="min-w-0 flex-1 group-hover:text-slate-200">
                      {t("axetCodeHome.projectsTitle")}
                    </Eyebrow>
                  </button>
```

SAP sistemleri:

```tsx
                  <button
                    onClick={() => toggleGroup(SAP_SECTION_KEY)}
                    aria-expanded={groupOpen(SAP_SECTION_KEY)}
                    className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-3 text-left text-slate-400 transition hover:text-slate-200"
                  >
                    {groupOpen(SAP_SECTION_KEY) ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <Eyebrow as="span" count={sessionGroups.sapGroups.length} className="min-w-0 flex-1 group-hover:text-slate-200">
                      {t("axetCodeHome.sapChatsTitle")}
                    </Eyebrow>
                  </button>
```

Genel:

```tsx
                  <button
                    onClick={() => toggleGroup(GENERAL_GROUP_KEY)}
                    aria-expanded={groupOpen(GENERAL_GROUP_KEY)}
                    className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-3 text-left text-slate-400 transition hover:text-slate-200"
                  >
                    {groupOpen(GENERAL_GROUP_KEY) ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <Eyebrow as="span" count={sessionGroups.general.length} className="min-w-0 flex-1 group-hover:text-slate-200">
                      {t("axetCodeHome.generalChatsTitle")}
                    </Eyebrow>
                  </button>
```

Girinti bugünkü satırlarınkiyle aynı kalsın; yukarıdaki girinti yalnızca örnek.

Sistemler başlığı (satır 3167):

```tsx
              <Eyebrow className="px-0.5 pb-1.5">{t("axetCodeHome.systemsTitle")}</Eyebrow>
```

`src/components/ChatSessionPane.tsx` satır 48'deki `useT` import'unun altına `import { Eyebrow } from "../ui/Eyebrow";`; satır 812'deki başlığı şununla değiştir:

```tsx
            <Eyebrow className="mt-8 pb-2.5">{t("axetCodeHome.quickStart")}</Eyebrow>
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `npx vitest run tests/eyebrow.test.tsx tests/designScale.test.ts tests/dialogDataLoss.test.tsx`
Beklenen: PASS. Cırcır tam 186 saymalı: `grep -o 'text-\[[0-9.]*px\]' -r src | wc -l` → `186`. Farklıysa beş yerden biri eksik ya da fazla çevrilmiştir.

Çalıştır: `npm test`
Beklenen: PASS. Bölüm başlığını metinle arayan bir test kırılırsa, metin DOM'da i18n'deki hâliyle duruyor (büyük harfi CSS yapıyor) — testte i18n metnini ara. Sayı artık ayrı bir `span`'da; başlığı `getByRole("button", { name: … })` ile arayan test adın sonunda sayıyı da görür, `name: /Projeler/` kalıbına çevir.

- [ ] **Adım 6: Commit**

```bash
git add src/ui/Eyebrow.tsx
git add src/components/AxetCodeHome.tsx src/components/ChatSessionPane.tsx
git add tests/eyebrow.test.tsx tests/designScale.test.ts
git commit -m "Grafit: bolum basliklari Eyebrow bileseninde, circir 186

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: Belge dili (`<html lang>`)

`index.html` `lang="tr"` ile açılıyor ve dil İngilizce'ye çevrilince değişmiyor. `uppercase` büyük harfi dile göre yapıyor: `lang="tr"` iken İngilizce "files" "FİLES" oluyor. `App` dil değişince `document.documentElement.lang`'ı güncelliyor (spec §4.3). `index.html`'deki `lang="tr"` ilk kare için kalıyor.

**Dosyalar:**
- Oluştur: `src/ui/useDocumentLanguage.ts`
- Değiştir: `src/App.tsx` (satır 65 import; satır 175 civarı çağrı)
- Test: `tests/documentLanguage.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: `AppLanguage` (`app-electron/shared/types.ts:313`).
- Üretir: `export function useDocumentLanguage(language: AppLanguage): void`.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/documentLanguage.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// `<html lang>` dil ayarını izliyor (grafit spec §4.3). `uppercase` büyük
// harfi bu niteliğe göre yapıyor: yanlış dilde "files" → "FİLES" olur.

import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppLanguage } from "../app-electron/shared/types";
import { useDocumentLanguage } from "../src/ui/useDocumentLanguage";

afterEach(() => {
  cleanup();
  document.documentElement.lang = "";
});

function Probe({ language }: { language: AppLanguage }) {
  useDocumentLanguage(language);
  return null;
}

describe("useDocumentLanguage", () => {
  it("dil değişince <html lang> değişiyor", () => {
    const { rerender } = render(<Probe language="tr" />);
    expect(document.documentElement.lang).toBe("tr");
    rerender(<Probe language="en" />);
    expect(document.documentElement.lang).toBe("en");
  });

  it("App dil ayarıyla çağırıyor; index.html ilk kare için tr", () => {
    const root = path.join(__dirname, "..");
    expect(readFileSync(path.join(root, "src", "App.tsx"), "utf8")).toContain("useDocumentLanguage(language)");
    expect(readFileSync(path.join(root, "index.html"), "utf8")).toContain('<html lang="tr">');
  });
});
```

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/documentLanguage.test.tsx`
Beklenen: FAIL — `Failed to resolve import "../src/ui/useDocumentLanguage"`.

- [ ] **Adım 3: Kancayı yaz ve bağla**

`src/ui/useDocumentLanguage.ts`:

```ts
import { useEffect } from "react";
import type { AppLanguage } from "../../app-electron/shared/types";

// `<html lang>`'ı dil ayarına bağlar. Tarayıcı `text-transform: uppercase`'i
// bu niteliğe göre yapıyor: `lang="tr"` iken İngilizce "files" "FİLES" olur,
// `lang="en"` iken Türkçe "sistemler" "SISTEMLER" olur. `index.html`'deki
// `lang="tr"` yalnızca ilk kare için; ayar okununca bu kanca devralıyor.
export function useDocumentLanguage(language: AppLanguage): void {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
```

`src/App.tsx`:
- Satır 65'teki `import { useActiveContext } from "./lib/useActiveContext";` satırının altına: `import { useDocumentLanguage } from "./ui/useDocumentLanguage";`
- `const language = config?.language ?? "tr";` satırının hemen altına: `useDocumentLanguage(language);`

Bu satırın üstünde erken `return` olmadığını `sed -n 150,180p src/App.tsx` ile doğrula (kancalar koşulsuz çağrılmalı).

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/documentLanguage.test.tsx`
Beklenen: PASS (2 test).

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Adım 5: Commit**

```bash
git add src/ui/useDocumentLanguage.ts src/App.tsx tests/documentLanguage.test.tsx
git commit -m "Grafit: html lang dil ayarini izliyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 6: Başlık çubuğu

Yapı ve davranış aynı, görünüm yeni (spec §4.4): bağlam rozeti mono etiket, "bağlamı temizle" düğmesi yalnızca rozetin üstüne gelince ya da odak rozetteyken görünüyor, pencere düğmeleri `hover` zemininde, "by tsasmaz" küçük ve `ink-500`.

**Dosyalar:**
- Değiştir: `src/components/TitleBar.tsx` (CRLF — satır sonlarını koru)
- Test: `tests/titleBar.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: Görev 3'ten `font-mono`.
- Üretir: yok (bileşen imzası aynı: `export default function TitleBar({ context, onShowSystem, onClearSap })`).

- [ ] **Adım 1: Kırılan testi yaz**

`tests/titleBar.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Başlık çubuğu (grafit spec §4.4). Sabitlenenler: bağlam yokken rozet hiç
// çizilmiyor; varken mono etiket, ortam etiketi, tıklayınca sistemi gösterme;
// temizle düğmesi yalnızca rozetin üstüne gelince / odak rozetteyken görünüyor
// ama DOM'da duruyor, Tab ile ulaşılıyor; kapatma kırmızı.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveContext, ActiveSapContext } from "../app-electron/shared/types";
import TitleBar from "../src/components/TitleBar";
import { LanguageProvider } from "../src/i18n";

afterEach(cleanup);

beforeEach(() => {
  (window as unknown as { api: unknown }).api = {
    windowIsMaximized: vi.fn(() => Promise.resolve(false)),
    onWindowStateChanged: vi.fn(() => () => {}),
    windowMinimize: vi.fn(),
    windowToggleMaximize: vi.fn(() => Promise.resolve(false)),
    windowClose: vi.fn()
  };
});

const SAP: ActiveSapContext = {
  uuid: "u1",
  systemId: "S4D",
  systemName: "S4D",
  customerPath: ["Müşteri", "S4D"],
  host: "h",
  client: "100",
  username: "TSASMAZ",
  tier: "DEV",
  projectDir: "C:\\p",
  connectedAt: "2026-09-29T00:00:00Z",
  verified: true
};

function mount(context: ActiveContext) {
  const onShowSystem = vi.fn();
  const onClearSap = vi.fn();
  render(
    <LanguageProvider language="tr">
      <TitleBar context={context} onShowSystem={onShowSystem} onClearSap={onClearSap} />
    </LanguageProvider>
  );
  return { onShowSystem, onClearSap };
}

describe("TitleBar", () => {
  it("bağlam yokken rozet ve temizle düğmesi yok", () => {
    mount({ sap: null, gui: null });
    expect(screen.queryByTitle("Sistemi göster · Müşteri › S4D")).toBeNull();
    expect(screen.queryByTitle("Aktif bağlamı temizle (bağlantıyı kapatmaz)")).toBeNull();
  });

  it("rozet mono; sistem, istemci/kullanıcı ve ortam etiketi görünüyor; tıklayınca sistemi gösteriyor", () => {
    const { onShowSystem } = mount({ sap: SAP, gui: null });
    const show = screen.getByTitle("Sistemi göster · Müşteri › S4D");
    expect(show.className).toContain("font-mono");
    expect(show.textContent).toContain("S4D");
    expect(show.textContent).toContain("100 / TSASMAZ");
    expect(screen.getByText("DEV")).toBeTruthy();
    fireEvent.click(show);
    expect(onShowSystem).toHaveBeenCalledTimes(1);
  });

  it("temizle düğmesi gizli başlıyor, rozetin üstünde ve odakta görünüyor; tıklayınca bağlamı temizliyor", () => {
    const { onClearSap } = mount({ sap: SAP, gui: null });
    const clear = screen.getByTitle("Aktif bağlamı temizle (bağlantıyı kapatmaz)");
    for (const cls of ["opacity-0", "group-hover:opacity-100", "group-focus-within:opacity-100", "focus-visible:opacity-100"]) {
      expect(clear.className).toContain(cls);
    }
    const badge = clear.closest(".group");
    expect(badge).not.toBeNull();
    expect(badge!.contains(screen.getByTitle("Sistemi göster · Müşteri › S4D"))).toBe(true);
    fireEvent.click(clear);
    expect(onClearSap).toHaveBeenCalledTimes(1);
  });

  it("imza küçük ve soluk; pencere düğmeleri hover zemininde, kapatma kırmızı", () => {
    mount({ sap: null, gui: null });
    const by = screen.getByText("by tsasmaz");
    expect(by.className).toContain("text-2xs");
    expect(by.className).toContain("text-slate-500");
    expect(screen.getByTitle("Küçült").className).toContain("hover:bg-hover");
    expect(screen.getByTitle("Büyüt").className).toContain("hover:bg-hover");
    const close = screen.getByTitle("Kapat");
    expect(close.className).toContain("hover:bg-[var(--status-danger-solid)]");
    expect(close.className).toContain("hover:text-on-solid");
  });
});
```

Ortam etiketi (`TierBadge`) "DEV" metnini başka biçimde yazıyorsa (ör. `title` niteliğinde), `getByText("DEV")` yerine `TierBadge`'in bugün ürettiği metni kullan — `grep -n "export" -A 20 src/components/TierBadge.tsx`.

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/titleBar.test.tsx`
Beklenen: FAIL — `font-mono` yok, `opacity-0` yok, `.group` bulunamıyor, `text-2xs` yok, `hover:bg-hover` yok. İlk test geçer.

- [ ] **Adım 3: Bileşeni değiştir**

`src/components/TitleBar.tsx`'te beş sınıf değişikliği; başka hiçbir şeye dokunma:

1. "by tsasmaz": `<span className="text-slate-500">by tsasmaz</span>` → `<span className="text-2xs text-slate-500">by tsasmaz</span>`

2. Rozet kabı: `className="flex min-w-0 items-center gap-1.5 rounded-sm border border-line bg-control px-2 py-0.5"` → `className="group flex min-w-0 items-center gap-1.5 rounded-sm border border-line bg-control px-2 py-0.5"`

   Kabın üstündeki yoruma şu cümleyi ekle: `// Temizle düğmesi yalnızca rozetin üstüne gelince ya da odak rozetin içindeyken görünüyor (`group`); DOM'da her zaman duruyor, Tab ile ulaşılıyor.`

3. Sistemi göster düğmesi: `className="flex min-w-0 cursor-pointer items-center gap-1.5 text-xs text-slate-300 hover:text-white"` → `className="flex min-w-0 cursor-pointer items-center gap-1.5 font-mono text-xs text-slate-300 hover:text-white"`

4. Temizle düğmesi: `className="ml-0.5 shrink-0 cursor-pointer rounded-sm p-0.5 text-slate-500 hover:bg-active hover:text-slate-200"` → `className="ml-0.5 shrink-0 cursor-pointer rounded-sm p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"`

5. Küçült ve Büyüt/Geri yükle düğmelerinde `hover:bg-active` → `hover:bg-hover` (iki yer). Kapat düğmesi ve üstündeki uzun yorum değişmiyor.

Dosya CRLF; düzenleyici satır sonlarını değiştirmemeli (`git diff --stat` yalnızca birkaç satır göstermeli).

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/titleBar.test.tsx`
Beklenen: PASS (4 test).

Çalıştır: `npm test`
Beklenen: PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/components/TitleBar.tsx tests/titleBar.test.tsx
git commit -m "Grafit: baslik cubugu mono baglam rozeti, temizle dugmesi uzerine gelince

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 7: DUR — 1a gözle kontrol

Kod değişikliği yok (bulunan küçük sorunlar hariç). 1b bu adım bitmeden ve kullanıcı bakmadan BAŞLAMIYOR (spec §4.5).

**Dosyalar:** bulunan soruna göre.

- [ ] **Adım 1: Takımı ve tipleri çalıştır**

Çalıştır: `npm test && npm run typecheck`
Beklenen: hepsi PASS, tip hatası yok.

- [ ] **Adım 2: Uygulamayı aç**

Kullanıcıdan çalışan NTT Studio'yu kapatmasını iste (tek örnek kilidi `npm run dev`'i hemen kapatıyor). Sonra: `npm run dev`.

- [ ] **Adım 3: Altı görünümde gez**

Ayarlar → Görünüm'den sırayla NTT mavisi, İndigo, Amber × Koyu, Açık. Her görünümde pencere önce 980px genişlikte, sonra geniş; şu ekranlar: Sohbet (boş karşılama + bir sohbet), Logon (sistem ağacı + bir sistem paneli), Script (köprü kapalı hâli yeterli), Hazırlık, Ayarlar. Her ekranda bak:
- taşan ya da kesilen metin, özellikle mono etiketler ve başlık çubuğu rozeti;
- okunmayan metin (soluk gri üstünde soluk gri);
- eski renk kalıntısı (limon, eski İndigo/Sıcak tonu, elle yazılmış `#hex`);
- seçili satır çizgisiyle DEV/QA/PRD etiketinin yan yana geldiği yerler (NTT mavisi ~ DEV mavisi, Amber ~ QA kehribarı — spec §8);
- bölüm başlıklarında Türkçe büyük harf ("SİSTEMLER"); dil İngilizce'ye çevrilince "SYSTEMS", "FILES" (noktalı İ yok).

- [ ] **Adım 4: Bulunanları düzelt ya da not et**

Küçük sorun (tek sınıf, tek renk) o anda düzeltiliyor; her düzeltme kendi testiyle ve kendi commit'iyle. Renk değişikliğinden önce `tests/themeTokens.test.ts` kontrast sınırını ölçüyor — ölçmeden renk değiştirme. Büyük olanlar kullanıcıya liste olarak veriliyor.

- [ ] **Adım 5: Kullanıcıya göster ve onay bekle**

Kullanıcıya altı görünümün kısa özetini ve bulunanları yaz; "1b'ye geçelim mi?" diye sor. Onay gelmeden Görev 8'e geçme.

---

### Görev 8: `Tabs` borçları

Mod seçici (Görev 14) `Tabs`'i kullanacak. Hazırlık açıkken hiçbir sekme seçili değil; bugün bu durumda sekmelere Tab tuşuyla ulaşılamıyor (hiçbir sekmenin `tabIndex`'i 0 değil). Spec §6.2'deki iki park edilmiş borç burada kapanıyor; ayrıca kenar çubuğu için panelsiz ve tam genişlik kullanım ekleniyor.

**Dosyalar:**
- Değiştir: `src/ui/Tabs.tsx` (tamamı aşağıda)
- Test: `tests/layoutParts.test.tsx` (`describe("Tabs"` bloğuna yeni testler; bugün ~67. satır)

**Arayüzler:**
- Tüketir: yok.
- Üretir: `Tabs<T extends string>({ label, items, value: T | null, onChange: (value: T) => boolean | void, children?, className?, stretch?: boolean })`. `onChange` `false` dönerse odak kaymıyor. `children` verilmezse panel çizilmiyor. `stretch` şeridi tam genişlik yapıyor, sekmeler eşit bölünüyor. Görev 14 bunu `value={null}`, `stretch`, `children`'sız kullanıyor.

- [ ] **Adım 1: Kırılan testleri yaz**

`tests/layoutParts.test.tsx`'te `TabsHarness`'in altına ikinci bir yardımcı ekle:

```tsx
function NullTabs({ onChange }: { onChange: (v: Section) => boolean | void }) {
  return <Tabs label="Modlar" items={ITEMS} value={null} onChange={onChange} stretch />;
}
```

`describe("Tabs", () => {` bloğunun sonuna (kapanan `});`'dan önce) şu testleri ekle:

```tsx
  it("değer yokken hiçbir sekme seçili değil ama ilk sekme Tab ile odaklanabiliyor", () => {
    wrap(<NullTabs onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(0);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });

  it("değer yokken sağ ok ilk sekmeyi, sol ok ve End son sekmeyi seçiyor", () => {
    const onChange = vi.fn();
    wrap(<NullTabs onChange={onChange} />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "ArrowRight" });
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    fireEvent.keyDown(list, { key: "End" });
    fireEvent.keyDown(list, { key: "Home" });
    expect(onChange.mock.calls.map((call) => call[0])).toEqual(["genel", "gelismis", "gelismis", "genel"]);
  });

  it("onChange false dönerse odak kaymıyor", () => {
    wrap(<NullTabs onChange={() => false} />);
    const [first] = screen.getAllByRole("tab");
    first.focus();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(document.activeElement).toBe(first);
  });

  it("children yoksa panel ve aria-controls yok", () => {
    wrap(<NullTabs onChange={() => {}} />);
    expect(screen.queryByRole("tabpanel")).toBeNull();
    for (const tab of screen.getAllByRole("tab")) expect(tab.getAttribute("aria-controls")).toBeNull();
  });

  it("stretch şeridi tam genişlik yapıyor, sekmeler eşit bölünüyor", () => {
    wrap(<NullTabs onChange={() => {}} />);
    expect(screen.getByRole("tablist").className).toContain("w-full");
    for (const tab of screen.getAllByRole("tab")) expect(tab.className).toContain("flex-1");
  });
```

- [ ] **Adım 2: Testlerin kırıldığını gör**

Çalıştır: `npx vitest run tests/layoutParts.test.tsx`
Beklenen: FAIL — `tabIndex` dizisi `[-1, -1, -1]`, sol ok `gelismis` yerine `gorunum` veriyor, odak son sekmeye kayıyor, panel var, `w-full` yok. Ayrıca `value={null}` için tip hatası (vitest tipleri denetlemediği için yalnızca `npm run typecheck`'te görünür). Eski `Tabs` testleri geçiyor.

- [ ] **Adım 3: `src/ui/Tabs.tsx`'i değiştir**

Dosyanın tamamı (CRLF koru):

```tsx
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

// Sekmeler (spec §6.4), WAI-ARIA "tabs" kalıbı, otomatik etkinleştirme:
// ok tuşu seçimi ve odağı birlikte taşıyor. Yalnızca seçili sekme Tab
// sırasında (gezici tabindex) — Tab tuşu sekme şeridinden panele atlıyor,
// her sekmede durmuyor.
//
// Bileşen denetimli (controlled): seçili değer çağıranda. `children` seçili
// sekmenin paneli; paneller arasında durum saklamak çağıranın işi.
//
// `value` null olabilir: kenar çubuğunun mod seçicisinde Hazırlık açıkken
// hiçbir mod seçili değil. O zaman ilk sekme Tab sırasına giriyor; yoksa
// şeride klavyeyle hiç ulaşılamazdı. `onChange` `false` dönerse çağıran
// değişikliği reddetmiş demek, odak yerinde kalıyor. `children` verilmezse
// panel çizilmiyor: mod seçicinin "paneli" kenar çubuğunun kendisi.

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
  className,
  stretch = false
}: {
  label: string;
  items: TabItem<T>[];
  value: T | null;
  onChange: (value: T) => boolean | void;
  children?: ReactNode;
  className?: string;
  stretch?: boolean;
}) {
  const base = useId();
  const tabId = (v: T) => `${base}-tab-${v}`;
  const panelId = `${base}-panel`;
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const hasPanel = children !== undefined;
  const selectedIndex = items.findIndex((item) => item.value === value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;

  function selectAt(index: number) {
    const item = items[(index + items.length) % items.length];
    if (onChange(item.value) === false) return;
    tabRefs.current.get(item.value)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const none = selectedIndex < 0;
    if (e.key === "ArrowRight") selectAt(none ? 0 : selectedIndex + 1);
    else if (e.key === "ArrowLeft") selectAt(none ? items.length - 1 : selectedIndex - 1);
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
        className={`${stretch ? "flex w-full" : "inline-flex"} items-center gap-1 rounded-lg border border-line bg-control p-1`}
      >
        {items.map((item, index) => {
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
              aria-controls={selected && hasPanel ? panelId : undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={`h-8 rounded-md px-3 text-sm font-medium transition ${stretch ? "min-w-0 flex-1 truncate" : ""} ${
                selected ? "bg-card text-white shadow-elev-1" : "text-slate-400 hover:bg-hover hover:text-slate-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {hasPanel && value !== null && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)} tabIndex={0} className="mt-4 outline-none">
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/layoutParts.test.tsx`
Beklenen: PASS (eski `Tabs` testleri dahil).

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok (`Tabs`'i kullanan Ayarlar ekranı `T` veriyor, `T | null`'a uyuyor; `onChange`'ine `void` dönen işlev geçmesi de uyuyor).

- [ ] **Adım 5: Commit**

```bash
git add src/ui/Tabs.tsx tests/layoutParts.test.tsx
git commit -m "Grafit: Tabs secimsiz durumda Tab ile ulasilabiliyor, reddedilen degisiklikte odak kaymiyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 9: Sohbet — gruplama saf fonksiyona, taşıma öncesi testler

Sohbet listesinin sıralama, arama ve gruplama hesabı `AxetCodeHome`'dan saf bir modüle çıkıyor (spec §5.1 son madde). Aynı görevde, bugünkü davranışı sabitleyen ekran testleri yazılıyor (spec §5.4). Bu testler Görev 10 ve 11'deki taşımalardan sonra da **gövdeleri değişmeden** yeşil kalmalı; yalnızca en üstteki `renderChatHome()` yardımcısı değişecek.

Seçili satır bugün yalnızca sınıfıyla ayırt ediliyor; Görev 11 sınıfı değiştireceği için satıra `aria-current` ekleniyor ve test buna bakıyor.

**Dosyalar:**
- Yarat: `src/lib/chatSessionGroups.ts`
- Değiştir: `src/components/AxetCodeHome.tsx` — gruplama bloğu (bugün ~2321–2462: `orderedSessions`'tan etkin yolu açan efektin sonuna kadar), `renderSessionRow`'daki satır `div`'i (bugün ~2615), import satırları
- Değiştir: `tests/chatTreeCollapsed.test.ts` (3. test)
- Test: `tests/chatSessionGroups.test.tsx`, `tests/chatHomeBehaviour.test.tsx`

**Arayüzler:**
- Tüketir: `ChatProject` (`app-electron/shared/types.ts`).
- Üretir (`src/lib/chatSessionGroups.ts`):
  - `GENERAL_GROUP_KEY = "__general__"`, `SAP_SECTION_KEY = "__sap__"`, `PROJECTS_SECTION_KEY = "__projects__"`
  - `interface GroupableSession { id: string; title: string; messages: readonly { content: string }[]; updatedAt: number; cwd: string | null; sapLabel: string | null; projectId: string | null; keepInGeneral: boolean }`
  - `normalizeSessionQuery(query: string): string`
  - `orderSessions<S extends GroupableSession>(sessions: readonly S[]): S[]` — en yeni önce
  - `filterSessions<S extends GroupableSession>(ordered: S[], normalizedQuery: string): S[]`
  - `groupSessions<S extends GroupableSession>(visible: readonly S[], projects: readonly ChatProject[], searching: boolean): SessionGroups<S>` → `{ projectGroups: { key: string; project: ChatProject; sessions: S[] }[]; sapGroups: { key: string; cwd: string; label: string; sessions: S[] }[]; general: S[] }`
  - `activeGroupKeys(session: GroupableSession, projects: readonly ChatProject[]): string[]`
- Üretir (test): `tests/chatHomeBehaviour.test.tsx` içinde `renderChatHome(state)` yardımcısı; Görev 10 ve 11 yalnızca bu yardımcıyı değiştiriyor.

- [ ] **Adım 1: Saf fonksiyon testlerini yaz**

`tests/chatSessionGroups.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  activeGroupKeys,
  filterSessions,
  GENERAL_GROUP_KEY,
  groupSessions,
  normalizeSessionQuery,
  orderSessions,
  PROJECTS_SECTION_KEY,
  SAP_SECTION_KEY,
  type GroupableSession
} from "../src/lib/chatSessionGroups";
import type { ChatProject } from "../app-electron/shared/types";

function s(id: string, over: Partial<GroupableSession> = {}): GroupableSession {
  return { id, title: id, messages: [], updatedAt: 0, cwd: null, sapLabel: null, projectId: null, keepInGeneral: false, ...over };
}
const P1: ChatProject = { id: "p1", name: "Proje A", instructions: "", createdAt: 10, updatedAt: 10 };
const P2: ChatProject = { id: "p2", name: "Proje B", instructions: "", createdAt: 20, updatedAt: 20 };

describe("chatSessionGroups", () => {
  it("en yeni sohbet önce", () => {
    const ordered = orderSessions([s("a", { updatedAt: 1 }), s("b", { updatedAt: 3 }), s("c", { updatedAt: 2 })]);
    expect(ordered.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("arama başlıkta ve mesajlarda, Türkçe küçük harfle", () => {
    const list = [
      s("a", { title: "İstanbul raporu" }),
      s("b", { title: "x", messages: [{ content: "ISTASYON listesi" }] }),
      s("c", { title: "başka" })
    ];
    expect(normalizeSessionQuery("  İSTANBUL ")).toBe("istanbul");
    expect(filterSessions(list, normalizeSessionQuery("İSTANBUL")).map((x) => x.id)).toEqual(["a"]);
    expect(filterSessions(list, normalizeSessionQuery("listesi")).map((x) => x.id)).toEqual(["b"]);
    expect(filterSessions(list, "")).toHaveLength(3);
  });

  it("proje, SAP klasörü ve genel gruplarına ayırıyor", () => {
    const g = groupSessions(
      [
        s("p", { projectId: "p1" }),
        s("sap1", { cwd: "C:\\sap\\S4D", sapLabel: "S4D · 100", updatedAt: 5 }),
        s("sap2", { cwd: "c:\\SAP\\s4d", updatedAt: 4 }),
        s("gen", {}),
        s("kept", { cwd: "C:\\sap\\S4D", keepInGeneral: true })
      ],
      [P1],
      false
    );
    expect(g.projectGroups.map((x) => [x.key, x.sessions.map((y) => y.id)])).toEqual([["p1", ["p"]]]);
    expect(g.sapGroups).toHaveLength(1);
    expect(g.sapGroups[0].label).toBe("S4D · 100");
    expect(g.sapGroups[0].sessions.map((x) => x.id)).toEqual(["sap1", "sap2"]);
    expect(g.general.map((x) => x.id)).toEqual(["gen", "kept"]);
  });

  it("SAP grubunun etiketi yoksa klasör adı", () => {
    const g = groupSessions([s("a", { cwd: "C:\\work\\DS4\\" })], [], false);
    expect(g.sapGroups[0].label).toBe("DS4");
  });

  it("silinmiş projeye işaret eden sohbet kaybolmuyor: klasörü varsa SAP grubunda, yoksa genelde", () => {
    const g = groupSessions([s("withCwd", { projectId: "gone", cwd: "C:\\sap\\S4D" }), s("noCwd", { projectId: "gone" })], [P1], false);
    expect(g.projectGroups[0].sessions).toHaveLength(0);
    expect(g.sapGroups[0].sessions.map((x) => x.id)).toEqual(["withCwd"]);
    expect(g.general.map((x) => x.id)).toEqual(["noCwd"]);
  });

  it("boş proje aramada gizleniyor, aramasızken görünüyor", () => {
    expect(groupSessions([], [P1, P2], false).projectGroups.map((x) => x.key)).toEqual(["p2", "p1"]);
    expect(groupSessions([], [P1, P2], true).projectGroups).toHaveLength(0);
  });

  it("etkin sohbetin açılması gereken grup anahtarları", () => {
    expect(activeGroupKeys(s("a", { projectId: "p1" }), [P1])).toEqual([PROJECTS_SECTION_KEY, "p1"]);
    expect(activeGroupKeys(s("a", { projectId: "gone" }), [P1])).toEqual([GENERAL_GROUP_KEY]);
    expect(activeGroupKeys(s("a", { cwd: "C:\\SAP\\S4D" }), [])).toEqual([SAP_SECTION_KEY, "c:\\sap\\s4d"]);
    expect(activeGroupKeys(s("a", { cwd: "C:\\SAP\\S4D", keepInGeneral: true }), [])).toEqual([GENERAL_GROUP_KEY]);
  });
});
```

(Dosya `.tsx` ve jsdom ortamında çünkü `src/`'den import ediyor; Genel Kurallar'daki kural.)

- [ ] **Adım 2: Ekran davranışı testlerini yaz**

`tests/chatHomeBehaviour.test.tsx`. Bu testler BUGÜNKÜ koda karşı yeşil olmalı (satırdaki `aria-current` hariç: o Adım 5'te ekleniyor):

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AxetCodeHome from "../src/components/AxetCodeHome";

// Görev 10 ve 11 YALNIZCA bu yardımcıyı değiştiriyor; aşağıdaki `it`
// gövdeleri taşımadan önce ve sonra aynı kalmalı (spec §5.4).
function renderChatHome() {
  return render(
    <LanguageProvider language="tr">
      <AxetCodeHome
        active
        config={null}
        pushToast={() => {}}
        recentEntries={[]}
        connectivity={{}}
        tierOverrides={{}}
        onOpenSapLauncher={() => {}}
        onQuickConnectSap={() => {}}
        sapChatRequest={null}
        workDirRequest={null}
        activeSap={null}
      />
    </LanguageProvider>
  );
}

const saveChatSessions = vi.fn(() => Promise.resolve({ ok: true }));
let loadResolve: ((v: unknown) => void) | null = null;

beforeEach(() => {
  saveChatSessions.mockClear();
  loadResolve = null;
  const impl: Record<string, unknown> = {
    loadChatSessions: () => new Promise((r) => { loadResolve = r; }),
    saveChatSessions
  };
  // Tanımlanmayan her `window.api` işlevi hiç dönmeyen bir söz veriyor;
  // `on…` abonelikleri boş bir abonelik iptali.
  (window as unknown as { api: unknown }).api = new Proxy({}, {
    get: (_t, k: string) => {
      if (k in impl) return impl[k];
      if (k.startsWith("on")) return () => () => {};
      return () => new Promise(() => {});
    }
  });
  // jsdom'da ikisi de yok; sohbet paneli seçilen sohbeti açarken çağırıyor.
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.scrollTo = () => {};
});
afterEach(cleanup);

const T0 = 1_700_000_000_000;
function session(id: string, title: string, over: Record<string, unknown> = {}) {
  return {
    id, title, model: null, draft: "", createdAt: T0, updatedAt: T0,
    messages: [{ id: `${id}-m`, role: "user", content: `${title} içeriği`, createdAt: T0 }],
    ...over
  };
}
const PROJECT = { id: "p1", name: "Proje A", instructions: "", createdAt: T0, updatedAt: T0 };

async function load(state: Record<string, unknown>) {
  await act(async () => {
    loadResolve?.({ ok: true, state });
  });
}
async function wait(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}
const rowOf = (title: string) => screen.getAllByTitle(title).find((el) => el.getAttribute("role") === "button")!;

describe("sohbet listesi (taşıma öncesi davranış)", () => {
  it("proje, SAP ve genel gruplarının başlıkları sayılarıyla görünüyor", async () => {
    renderChatHome();
    await load({
      activeId: null,
      projects: [PROJECT],
      sessions: [
        session("a", "Proje sohbeti", { projectId: "p1" }),
        session("b", "SAP sohbeti", { cwd: "C:\\sap\\S4D", sapLabel: "S4D · 100" }),
        session("c", "Genel bir", {}),
        session("d", "Genel iki", {})
      ]
    });
    expect(screen.getByRole("button", { name: /^Projeler\s*1$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^SAP sohbetleri\s*1$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Sohbetler\s*2$/ })).toBeTruthy();
  });

  it("arama grupları açıp yalnızca eşleşeni gösteriyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Fatura listesi"), session("d", "Stok raporu")] });
    fireEvent.change(screen.getByPlaceholderText("Sohbetlerde ara…"), { target: { value: "fatura" } });
    expect(rowOf("Fatura listesi")).toBeTruthy();
    expect(screen.queryByTitle("Stok raporu")).toBeNull();
  });

  it("yeniden adlandırma: Enter kaydediyor, Escape vazgeçiyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Eski ad")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(screen.getAllByTitle("Yeniden adlandır")[0]);
    const input = screen.getByDisplayValue("Eski ad");
    fireEvent.change(input, { target: { value: "Yeni ad" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(rowOf("Yeni ad")).toBeTruthy();

    fireEvent.click(screen.getAllByTitle("Yeniden adlandır")[0]);
    const again = screen.getByDisplayValue("Yeni ad");
    fireEvent.change(again, { target: { value: "Vazgeçilen" } });
    fireEvent.keyDown(again, { key: "Escape" });
    expect(rowOf("Yeni ad")).toBeTruthy();
    expect(screen.queryByTitle("Vazgeçilen")).toBeNull();
  });

  it("silme onay istiyor, onaylayınca satır gidiyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Silinecek")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(screen.getAllByTitle("Sohbeti sil")[0]);
    expect(rowOf("Silinecek")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(screen.queryByTitle("Silinecek")).toBeNull();
  });

  it("projeye taşıma sohbeti proje grubuna alıyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [PROJECT], sessions: [session("c", "Taşınacak")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(screen.getAllByTitle("Projeye taşı")[0]);
    const menuItems = screen.getAllByTitle("Proje A");
    fireEvent.click(menuItems[menuItems.length - 1]);
    // Genel grup boşaldığı için başlığı kalktı; sohbet kapalı proje grubunda.
    expect(screen.queryByRole("button", { name: /^Sohbetler\s*\d+$/ })).toBeNull();
    expect(screen.queryByTitle("Taşınacak")).toBeNull();
    fireEvent.click(rowOf("Proje A"));
    expect(rowOf("Taşınacak")).toBeTruthy();
  });

  it("seçili satır aria-current taşıyor; Yeni sohbet seçimi kaldırıyor", async () => {
    renderChatHome();
    // Diskteki `activeId` yüklemede bilerek yok sayılıyor (her açılış boş
    // sohbetle başlıyor); seçim tıklayarak kuruluyor.
    await load({ activeId: null, projects: [], sessions: [session("c", "Seçili"), session("d", "Diğer")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(rowOf("Seçili"));
    expect(rowOf("Seçili").getAttribute("aria-current")).toBe("true");
    expect(rowOf("Diğer").getAttribute("aria-current")).toBeNull();
    fireEvent.click(screen.getByTitle("Yeni sohbet (Ctrl+N)"));
    expect(rowOf("Seçili").getAttribute("aria-current")).toBeNull();
  });

  it("yükleme bitmeden kayıt çağrılmıyor, bittikten sonra çağrılıyor", async () => {
    renderChatHome();
    fireEvent.click(screen.getByTitle("Yeni proje"));
    await wait(700);
    expect(saveChatSessions).not.toHaveBeenCalled();
    await load({ activeId: null, projects: [], sessions: [session("c", "Var olan")] });
    fireEvent.click(screen.getByTitle("Yeni proje"));
    await wait(700);
    expect(saveChatSessions).toHaveBeenCalled();
  });
});
```

Notlar:
- Gruplar varsayılan kapalı; satırlara ulaşmak için önce başlığa tıklanıyor. Arama sırasında gruplar kendiliğinden açık.
- "Proje A" metni hem proje grubunun satırında hem taşıma menüsünde `title` olarak var; menü sonra çizildiği için son eleman menüdeki.
- Bir test kırmızıysa `screen.debug()` ile gerçek metne bak ve **testi bugünkü davranışa** uydur, kodu değil. Bu adımda `AxetCodeHome.tsx`'e dokunulmuyor.

- [ ] **Adım 3: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatSessionGroups.test.tsx tests/chatHomeBehaviour.test.tsx`
Beklenen: `chatSessionGroups` FAIL (modül yok). `chatHomeBehaviour`'da yalnızca "seçili satır aria-current taşıyor" FAIL (`aria-current` yok); diğer altı test PASS.

- [ ] **Adım 4: `src/lib/chatSessionGroups.ts`'i yaz**

Hesap `AxetCodeHome`'daki bugünkü koddan birebir; yorumlar da onunla taşınıyor. Yeni dosya LF olabilir ama repo CRLF kullanıyor, CRLF ile yaz.

```ts
import type { ChatProject } from "../../app-electron/shared/types";

// Sohbet kenar çubuğunun sıralama, arama ve gruplama hesabı. `AxetCodeHome`'dan
// çıkarıldı (grafit, spec §5.1): kenar çubuğu ayrı bir bileşene taşınırken
// hesabın ekranla birlikte değil kendi başına test edilebilmesi için.

export const GENERAL_GROUP_KEY = "__general__";
export const SAP_SECTION_KEY = "__sap__";
export const PROJECTS_SECTION_KEY = "__projects__";

// Gruplamanın bir sohbetten okuduğu alanlar. `ChatSession`'ın tamamı değil:
// testler süren tur, model, taslak gibi alanları kurmak zorunda kalmasın.
export interface GroupableSession {
  id: string;
  title: string;
  messages: readonly { content: string }[];
  updatedAt: number;
  cwd: string | null;
  sapLabel: string | null;
  projectId: string | null;
  keepInGeneral: boolean;
}

export interface ProjectGroup<S> {
  key: string;
  project: ChatProject;
  sessions: S[];
}

export interface SapGroup<S> {
  key: string;
  cwd: string;
  label: string;
  sessions: S[];
}

export interface SessionGroups<S> {
  projectGroups: ProjectGroup<S>[];
  sapGroups: SapGroup<S>[];
  general: S[];
}

// Türkçe küçük harf: "İ" → "i", "I" → "ı". Varsayılan yerel ayarla
// "İSTANBUL" araması "istanbul"u bulmazdı.
export function normalizeSessionQuery(query: string): string {
  return query.trim().toLocaleLowerCase("tr");
}

export function orderSessions<S extends GroupableSession>(sessions: readonly S[]): S[] {
  return sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function filterSessions<S extends GroupableSession>(ordered: S[], normalizedQuery: string): S[] {
  if (!normalizedQuery) return ordered;
  return ordered.filter(
    (s) =>
      s.title.toLocaleLowerCase("tr").includes(normalizedQuery) ||
      s.messages.some((m) => m.content.toLocaleLowerCase("tr").includes(normalizedQuery))
  );
}

export function groupSessions<S extends GroupableSession>(
  visible: readonly S[],
  projects: readonly ChatProject[],
  searching: boolean
): SessionGroups<S> {
  const byProject = new Map<string, S[]>();
  const sap = new Map<string, SapGroup<S>>();
  const general: S[] = [];
  const knownProjects = new Set(projects.map((p) => p.id));
  for (const s of visible) {
    if (s.projectId && knownProjects.has(s.projectId)) {
      const list = byProject.get(s.projectId);
      if (list) list.push(s);
      else byProject.set(s.projectId, [s]);
      continue;
    }
    const cwd = s.cwd ?? "";
    if (!cwd || s.keepInGeneral) {
      general.push(s);
      continue;
    }
    const key = cwd.toLowerCase();
    const existing = sap.get(key);
    if (existing) existing.sessions.push(s);
    else
      sap.set(key, {
        key,
        cwd,
        label: s.sapLabel || cwd.split(/[\\/]/).filter(Boolean).pop() || cwd,
        sessions: [s]
      });
  }
  const sapGroups = Array.from(sap.values()).sort((a, b) => b.sessions[0].updatedAt - a.sessions[0].updatedAt);
  const projectGroups = projects
    .map((project) => ({ key: project.id, project, sessions: byProject.get(project.id) ?? [] }))
    .filter((g) => !searching || g.sessions.length > 0)
    .sort(
      (a, b) => (b.sessions[0]?.updatedAt ?? b.project.createdAt) - (a.sessions[0]?.updatedAt ?? a.project.createdAt)
    );
  return { projectGroups, sapGroups, general };
}

// Etkin sohbetin görünmesi için açık olması gereken grupların anahtarları,
// dıştan içe. Kural `groupSessions`'la aynı: bilinmeyen proje genele ya da
// SAP grubuna düşüyor.
export function activeGroupKeys(session: GroupableSession, projects: readonly ChatProject[]): string[] {
  if (session.projectId && projects.some((p) => p.id === session.projectId)) {
    return [PROJECTS_SECTION_KEY, session.projectId];
  }
  if (!session.cwd || session.keepInGeneral) return [GENERAL_GROUP_KEY];
  return [SAP_SECTION_KEY, session.cwd.toLowerCase()];
}
```

`AxetCodeHome.tsx`'teki bloklardaki uzun Türkçe yorumları (neden `keepInGeneral`, neden bilinmeyen proje genele düşüyor, neden SAP grupları en yeni önce, neden arama sırasında boş proje gizleniyor) bu dosyada karşılık gelen satırın üstüne aynen taşı.

- [ ] **Adım 5: `AxetCodeHome.tsx`'i yeni modüle bağla**

1. Import ekle (diğer `../lib/` importlarının yanına):

```ts
import {
  activeGroupKeys,
  filterSessions,
  GENERAL_GROUP_KEY,
  groupSessions,
  normalizeSessionQuery,
  orderSessions,
  PROJECTS_SECTION_KEY,
  SAP_SECTION_KEY
} from "../lib/chatSessionGroups";
```

2. `const orderedSessions = useMemo(...)`'dan `const sessionGroups = useMemo(...)`'nun kapanışına kadar (bugün ~2321–2430) şununla değiştir; yerel `GENERAL_GROUP_KEY`/`SAP_SECTION_KEY`/`PROJECTS_SECTION_KEY` sabitleri siliniyor, blokların önündeki yorumlar kalıyor ama gövde yorumları Adım 4'te taşındı:

```ts
  const orderedSessions = useMemo(() => orderSessions(sessions), [sessions]);
  const normalizedQuery = normalizeSessionQuery(query);
  const visibleSessions = useMemo(
    () => filterSessions(orderedSessions, normalizedQuery),
    [normalizedQuery, orderedSessions],
  );
  const sessionGroups = useMemo(
    () => groupSessions(visibleSessions, projects, Boolean(normalizedQuery)),
    [normalizedQuery, projects, visibleSessions],
  );
```

3. Etkin yolu açan efektin gövdesi (bugün `const s = activeSession;` ile `}, [activeSession?.id]);` arası):

```ts
  useEffect(() => {
    const s = activeSession;
    if (!s) return;
    const keys = activeGroupKeys(s, projects);
    setOpenGroups((prev) =>
      keys.every((k) => prev[k])
        ? prev
        : { ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);
```

`openGroups`, `toggleGroup`, `groupOpen` satırları değişmiyor.

4. `renderSessionRow`'daki `role="button"` satırına, `title={session.title}`'ın altına:

```tsx
        aria-current={isActive ? "true" : undefined}
```

5. Satır ~762'deki `(bkz. sessionGroups)` yorumu `(bkz. src/lib/chatSessionGroups.ts)` olsun.

`ChatSession` `GroupableSession`'a yapısal olarak uyuyor (`messages` `ChatMessage[]`, `content: string`); tip dönüşümü gerekmiyor.

- [ ] **Adım 6: `tests/chatTreeCollapsed.test.ts`'in 3. testini güncelle**

Üçüncü testte `PROJECTS_SECTION_KEY`, `GENERAL_GROUP_KEY`, `SAP_SECTION_KEY` beklentilerini sil, yerine:

```ts
    expect(body).toContain("activeGroupKeys(");
```

(`body`, testin `const s = activeSession;` ile `}, [activeSession?.id]);` arasını kestiği değişken; adı farklıysa testteki adı kullan.)

- [ ] **Adım 7: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatSessionGroups.test.tsx tests/chatHomeBehaviour.test.tsx tests/chatTreeCollapsed.test.ts`
Beklenen: PASS (7 + 7 + 3).

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok.

- [ ] **Adım 8: Commit**

```bash
git add src/lib/chatSessionGroups.ts src/components/AxetCodeHome.tsx tests/chatSessionGroups.test.tsx tests/chatHomeBehaviour.test.tsx tests/chatTreeCollapsed.test.ts
git commit -m "Grafit: sohbet gruplamasi saf fonksiyona cikti, tasima oncesi davranis testleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 10: `ChatStore`

Sohbet verisi (`sessions`, `activeId`, `projects`, `sessionsLoaded`) `AxetCodeHome`'un `useState`'lerinden bir React bağlamına çıkıyor (spec §5.1). Böylece Görev 11'de kenar çubuğu aynı veriyi okuyabiliyor. Değiştiricilerin imzası `useState`'inkiyle aynı (`Dispatch<SetStateAction<…>>`), bu yüzden `AxetCodeHome`'daki `setSessions(...)` çağrılarının hiçbiri değişmiyor. **Yükleme ve kayıt `AxetCodeHome`'da kalıyor** (`loadedRef` ile birlikte).

Bu görevde ekranda hiçbir şey değişmiyor. Görev 9'un davranış testleri gövdeleri değişmeden yeşil kalmalı.

**İşlemlerin tarafı** (spec §5.1'in istediği tablo):

| İşlem | Taraf | Kenar çubuğu nasıl çağırıyor (Görev 11) |
|---|---|---|
| Yeniden adlandırma | Store: `renameSession(id, title)` | doğrudan |
| Projeye taşıma / projeden çıkarma | Store: `moveSession(id, projectId)` | doğrudan |
| Proje oluşturma | Store: `createProject()` → yeni proje ya da sınırdaysa `null` (bildirim store'da) | doğrudan, sonra `commands.openProjectDialog(p.id)` |
| Proje silme | Store: `deleteProject(id)`; sohbet ekranı bunu sarıp taslağın `newProjectId`'sini ve pencereyi de temizliyor | kenar çubuğu çağırmıyor (silme proje penceresinden) |
| Dışa aktarma | Store: `exportSession(id)` | doğrudan |
| Yeni sohbet | Sohbet ekranı (yazma kutusunu sıfırlıyor, odaklıyor) | `commands.newSession(binding?, notice?, projectId?)` |
| Sohbet silme | Sohbet ekranı (süren cevabı iptal ediyor, TUI oturumunu kapatıyor, onay penceresi) | `commands.requestDelete(id)` |
| Proje penceresini açma | Sohbet ekranı (pencere orada çiziliyor) | `commands.openProjectDialog(id)` |
| Kısayol listesini açma | Sohbet ekranı (liste orada çiziliyor, F1 de orada) | `commands.openShortcuts()` |
| Yönergeler penceresi | Sohbet ekranı | kenar çubuğu çağırmıyor, komutu yok |
| Aramayı temizleme | Kenar çubuğu (`query` orada) | sohbet ekranı `resetSearch()` çağırıyor, kenar çubuğu `searchResetKey` değişince temizliyor |

Kısayol listesi spec §5.1'in listesinde yok. Düğmesi bugün arama kutusunun yanında duruyor ve F1'in tek görünür kapısı; kaybolmasın diye komut olarak ekleniyor.

**Dosyalar:**
- Yarat: `src/stores/chatTypes.ts`, `src/stores/chatStore.tsx`
- Değiştir: `src/components/AxetCodeHome.tsx`: tür ve sabit tanımları (bugün ~65–148 `EditUndo` + `ChatSession`, ~180–185 `RecentEntry`, ~239–245 `TITLE_MAX_LEN` + `deriveTitle`, ~275–279 `MAX_PROJECTS`), dört `useState` (~589, ~590, ~624, ~706), `commitRename` / `handleExportSession` / `handleCreateProject` / `handleDeleteProject` / `handleMoveSession` (~1209–1337), dışa aktarma import'ları (~48–49)
- Değiştir: `src/App.tsx` (import, `return`'deki `LanguageProvider`'ın içi)
- Değiştir: `tests/chatHomeBehaviour.test.tsx` (yalnızca `renderChatHome`)
- Test: `tests/chatStore.test.tsx`

**Arayüzler:**
- Tüketir: `chatToMarkdown`, `safeFileName` (`src/lib/chatExport.ts`), `chatToPrintHtml` (`src/lib/chatPrint.ts`), `useT` (`src/i18n`), `ChatProject` (`app-electron/shared/types.ts`).
- Üretir (`src/stores/chatTypes.ts`): `export interface EditUndo`, `export interface ChatSession` (alanlar bugünküyle aynı), `export interface RecentEntry { path: string[]; service: SapService; itemUuid: string; connectedAt: string }`, `export const TITLE_MAX_LEN = 42`, `export function deriveTitle(text: string): string`.
- Üretir (`src/stores/chatStore.tsx`):
  - `export const MAX_PROJECTS = 40`
  - `export interface ChatCommands { newSession(binding?: { cwd: string; label: string } | null, notice?: string | null, projectId?: string | null): void; requestDelete(id: string): void; openProjectDialog(id: string): void; openShortcuts(): void }`
  - `export interface ChatStore { sessions; setSessions; activeId; setActiveId; projects; setProjects; sessionsLoaded; setSessionsLoaded; searchResetKey: number; resetSearch(): void; renameSession(id: string, title: string): void; moveSession(id: string, projectId: string | null): void; createProject(): ChatProject | null; deleteProject(id: string): void; exportSession(id: string): Promise<void>; registerChatCommands(commands: ChatCommands): () => void }`
  - `export function ChatStoreProvider(props: { pushToast: (kind: "success" | "error", text: string) => void; children: ReactNode })`
  - `export function useChatStore(): ChatStore` (Provider yoksa hata fırlatıyor)
  - `export function useChatCommands(): ChatCommands`: kimliği hiç değişmeyen bir aracı; kayıt yoksa hiçbir şey yapmıyor.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/chatStore.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import {
  ChatStoreProvider,
  MAX_PROJECTS,
  useChatCommands,
  useChatStore,
  type ChatCommands,
  type ChatStore
} from "../src/stores/chatStore";
import type { ChatSession } from "../src/stores/chatTypes";

let store: ChatStore;
let commands: ChatCommands;
function Probe() {
  store = useChatStore();
  commands = useChatCommands();
  return null;
}

const pushToast = vi.fn();
const exportChat = vi.fn(() => Promise.resolve({ ok: true }));

function renderStore() {
  return render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={pushToast}>
        <Probe />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

function session(id: string, over: Partial<ChatSession> = {}): ChatSession {
  return {
    id, title: id, messages: [], model: null, draft: "", attachments: [], pending: false, requestId: null,
    activity: null, activitySteps: [], stalledMinutes: 0, pendingAsk: null, todos: [], contextTokens: 0,
    contextLimit: 0, editUndo: null, cancelStuck: false, createdAt: 1, updatedAt: 1, cwd: null, sapLabel: null,
    projectId: null, keepInGeneral: false, ...over
  };
}

beforeEach(() => {
  pushToast.mockClear();
  exportChat.mockClear();
  (window as unknown as { api: unknown }).api = { exportChat };
});
afterEach(cleanup);

describe("ChatStore", () => {
  it("Provider olmadan kullanılırsa açık bir hata veriyor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ChatStoreProvider/);
    spy.mockRestore();
  });

  it("değiştiriciler useState gibi hem değer hem fonksiyon alıyor", () => {
    renderStore();
    act(() => store.setSessions([session("a")]));
    act(() => store.setSessions((prev) => [...prev, session("b")]));
    act(() => store.setActiveId("b"));
    expect(store.sessions.map((s) => s.id)).toEqual(["a", "b"]);
    expect(store.activeId).toBe("b");
  });

  it("yeniden adlandırma kırpıyor, boş adı yok sayıyor, uzun adı kısaltıyor", () => {
    renderStore();
    act(() => store.setSessions([session("a", { title: "Eski", updatedAt: 1 })]));
    act(() => store.renameSession("a", "  Yeni ad  "));
    expect(store.sessions[0].title).toBe("Yeni ad");
    expect(store.sessions[0].updatedAt).toBeGreaterThan(1);
    act(() => store.renameSession("a", "   "));
    expect(store.sessions[0].title).toBe("Yeni ad");
    act(() => store.renameSession("a", "x".repeat(60)));
    expect(store.sessions[0].title).toBe(`${"x".repeat(42)}…`);
  });

  it("taşıma updatedAt'e dokunmuyor", () => {
    renderStore();
    act(() => store.setSessions([session("a", { updatedAt: 5 })]));
    act(() => store.moveSession("a", "p1"));
    expect(store.sessions[0].projectId).toBe("p1");
    expect(store.sessions[0].updatedAt).toBe(5);
    act(() => store.moveSession("a", null));
    expect(store.sessions[0].projectId).toBeNull();
  });

  it("proje oluşturma varsayılan adla ekliyor; sınırda bildirim verip null dönüyor", () => {
    renderStore();
    let created: ReturnType<ChatStore["createProject"]> = null;
    act(() => {
      created = store.createProject();
    });
    expect(created).not.toBeNull();
    expect(store.projects.map((p) => p.name)).toEqual(["Yeni proje"]);

    const full = Array.from({ length: MAX_PROJECTS }, (_, i) => ({
      id: `p${i}`, name: `P${i}`, instructions: "", createdAt: i, updatedAt: i
    }));
    act(() => store.setProjects(full));
    act(() => {
      created = store.createProject();
    });
    expect(created).toBeNull();
    expect(store.projects).toHaveLength(MAX_PROJECTS);
    expect(pushToast).toHaveBeenCalledWith("error", `En fazla ${MAX_PROJECTS} proje oluşturabilirsin.`);
  });

  it("proje silmek sohbetleri silmiyor, yalnızca projeden çıkarıyor", () => {
    renderStore();
    act(() => {
      store.setProjects([{ id: "p1", name: "A", instructions: "", createdAt: 1, updatedAt: 1 }]);
      store.setSessions([session("a", { projectId: "p1" }), session("b")]);
    });
    act(() => store.deleteProject("p1"));
    expect(store.projects).toHaveLength(0);
    expect(store.sessions.map((s) => [s.id, s.projectId])).toEqual([["a", null], ["b", null]]);
  });

  it("dışa aktarma boş sohbette çağrılmıyor, doluda iki biçimle çağrılıyor", async () => {
    renderStore();
    act(() =>
      store.setSessions([
        session("bos"),
        session("dolu", { title: "Rapor", messages: [{ id: "m", role: "user", content: "merhaba", createdAt: 1 }] })
      ])
    );
    await act(() => store.exportSession("bos"));
    expect(exportChat).not.toHaveBeenCalled();
    await act(() => store.exportSession("dolu"));
    expect(exportChat).toHaveBeenCalledTimes(1);
    const [name, payload] = exportChat.mock.calls[0] as unknown as [string, { markdown: string; html: string }];
    expect(name.endsWith(".pdf")).toBe(true);
    expect(payload.markdown).toContain("merhaba");
    expect(payload.html).toContain("merhaba");
  });

  it("komutlar: kayıt yokken sessiz, kayıtlıyken iletiliyor, kayıt kalkınca yine sessiz", () => {
    renderStore();
    const first = commands;
    expect(() => commands.newSession()).not.toThrow();
    const newSession = vi.fn();
    const requestDelete = vi.fn();
    let unregister = () => {};
    act(() => {
      unregister = store.registerChatCommands({
        newSession, requestDelete, openProjectDialog: vi.fn(), openShortcuts: vi.fn()
      });
    });
    commands.newSession({ cwd: "C:\\x", label: "X" }, null, "p1");
    commands.requestDelete("a");
    expect(newSession).toHaveBeenCalledWith({ cwd: "C:\\x", label: "X" }, null, "p1");
    expect(requestDelete).toHaveBeenCalledWith("a");
    act(() => unregister());
    commands.newSession();
    expect(newSession).toHaveBeenCalledTimes(1);
    expect(commands).toBe(first);
  });

  it("eski kaydın iptali yeni kaydı silmiyor", () => {
    renderStore();
    const a = vi.fn();
    const b = vi.fn();
    const base = { requestDelete: vi.fn(), openProjectDialog: vi.fn(), openShortcuts: vi.fn() };
    let offA = () => {};
    act(() => {
      offA = store.registerChatCommands({ ...base, newSession: a });
      store.registerChatCommands({ ...base, newSession: b });
    });
    act(() => offA());
    commands.newSession();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("resetSearch searchResetKey'i artırıyor", () => {
    renderStore();
    const before = store.searchResetKey;
    act(() => store.resetSearch());
    expect(store.searchResetKey).toBe(before + 1);
  });
});
```

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/chatStore.test.tsx`
Beklenen: FAIL, `Failed to resolve import "../src/stores/chatStore"`.

- [ ] **Adım 3: `src/stores/chatTypes.ts`'i yaz**

`AxetCodeHome.tsx`'ten şu tanımları **yorumlarıyla birlikte** kes ve bu dosyaya yapıştır, her birinin başına `export` koy:
- `EditUndo` (bugün ~65–73, üstündeki "Bir düzenlemenin geri alınması için gereken HER ŞEY…" yorumuyla)
- `ChatSession` (bugün ~71–148, alan yorumlarıyla)
- `RecentEntry` (bugün ~180–185)
- `TITLE_MAX_LEN` ve `deriveTitle` (bugün ~239–245)

Dosyanın başı:

```ts
// Sohbet ekranı, sohbet kenar çubuğu ve `ChatStore`'un ortak türleri.
// `AxetCodeHome.tsx`'ten çıkarıldı (grafit, spec §5.1): üç dosya aynı türü
// kullanıyor, türün sahibi bileşenlerden biri olursa diğerleri ona bağımlı
// kalıyordu.

import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  AxetModelEntry,
  AxetTodo,
  ChatAttachment,
  SapService
} from "../../app-electron/shared/types";
import type { ChatMessage } from "../components/ChatBubble";
```

Tanımlar bugünkü gibi. `ChatSession`'ın alanlarını ya da `deriveTitle`'ın gövdesini değiştirme. Dosya CRLF.

- [ ] **Adım 4: `src/stores/chatStore.tsx`'i yaz**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
import type { ChatProject } from "../../app-electron/shared/types";
import { chatToMarkdown, safeFileName } from "../lib/chatExport";
import { chatToPrintHtml } from "../lib/chatPrint";
import { useT } from "../i18n";
import { deriveTitle, type ChatSession } from "./chatTypes";

// Sohbet verisinin tek sahibi (grafit, spec §5.1). `AxetCodeHome` ve sohbet
// kenar çubuğu aynı listeyi okuyor. Diskten yükleme ve diske kayıt BURADA
// DEĞİL, `AxetCodeHome`'da: o bileşen hiç unmount olmuyor ve `loadedRef`
// koruması orada. Taşımak yalnızca veri kaybı riski getirirdi.

// Proje sayısının tavanı. Ana süreçteki `chatStore.ts` ile AYNI olmalı: orada
// fazlası kesiliyor, burada ise daha oluşturulmadan söyleniyor. Sınırın
// diskte sessizce uygulanması, kullanıcının kurduğu projenin bir sonraki
// açılışta yok olması demek olurdu.
export const MAX_PROJECTS = 40;

// Sohbet ekranında kalan işlemler: yazma kutusuna ya da süren cevaba
// dokunuyorlar. Ekran bunları `registerChatCommands` ile bırakıyor, kenar
// çubuğu `useChatCommands` ile çağırıyor.
export interface ChatCommands {
  newSession(binding?: { cwd: string; label: string } | null, notice?: string | null, projectId?: string | null): void;
  requestDelete(id: string): void;
  openProjectDialog(id: string): void;
  openShortcuts(): void;
}

export interface ChatStore {
  sessions: ChatSession[];
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  projects: ChatProject[];
  setProjects: Dispatch<SetStateAction<ChatProject[]>>;
  sessionsLoaded: boolean;
  setSessionsLoaded: Dispatch<SetStateAction<boolean>>;
  // Arama metni kenar çubuğunda duruyor; sohbet ekranı onu temizlemek
  // istediğinde (yeni sohbet, SAP'den gelen sohbet) bu sayacı artırıyor.
  searchResetKey: number;
  resetSearch(): void;
  renameSession(id: string, title: string): void;
  moveSession(id: string, projectId: string | null): void;
  createProject(): ChatProject | null;
  deleteProject(id: string): void;
  exportSession(id: string): Promise<void>;
  registerChatCommands(commands: ChatCommands): () => void;
}

interface ChatStoreContextValue extends ChatStore {
  commands: ChatCommands;
}

const ChatStoreContext = createContext<ChatStoreContextValue | null>(null);

export function ChatStoreProvider({
  pushToast,
  children
}: {
  pushToast: (kind: "success" | "error", text: string) => void;
  children: ReactNode;
}) {
  const t = useT();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [searchResetKey, setSearchResetKey] = useState(0);

  // `App`'in `pushToast`'u her çizimde yeni bir fonksiyon. Bağımlılık
  // yapılsaydı store'un bütün işlemleri her çizimde yenilenirdi.
  const pushToastRef = useRef(pushToast);
  pushToastRef.current = pushToast;

  const resetSearch = useCallback(() => setSearchResetKey((k) => k + 1), []);

  const renameSession = useCallback((id: string, title: string) => {
    const next = title.trim();
    // Boş ada izin verilmiyor: sohbet listede görünmez hâle gelirdi.
    if (!next) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: deriveTitle(next), updatedAt: Date.now() } : s))
    );
  }, []);

  // `updatedAt` BİLEREK dokunulmuyor: taşımak bir konuşma değil. Taşınan
  // sohbet birdenbire en üste zıplasaydı kullanıcı onu kaybederdi.
  const moveSession = useCallback((id: string, projectId: string | null) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, projectId } : s)));
  }, []);

  const createProject = useCallback((): ChatProject | null => {
    if (projects.length >= MAX_PROJECTS) {
      pushToastRef.current("error", t("axetCodeHome.projectLimit", { count: MAX_PROJECTS }));
      return null;
    }
    const now = Date.now();
    const project: ChatProject = {
      id: crypto.randomUUID(),
      name: t("axetCodeHome.newProjectName"),
      instructions: "",
      createdAt: now,
      updatedAt: now
    };
    setProjects((prev) => [...prev, project]);
    return project;
  }, [projects.length, t]);

  // Proje silmek SOHBETLERİ SİLMİYOR, yalnızca aidiyeti kopuyor ve sohbetler
  // "Sohbetler" başlığına düşüyor. Aksi hâlde tek bir çöp kutusu düğmesi bir
  // klasör dolusu konuşmayı uyarısız yok ederdi.
  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setSessions((prev) => prev.map((s) => (s.projectId === id ? { ...s, projectId: null } : s)));
  }, []);

  // İÇERİK burada üretiliyor, kaydetme diyaloğu ve yazma ana süreçte
  // (`chat:export`). İki biçim de gönderiliyor çünkü hangisinin isteneceği
  // ancak kaydetme kutusu kapandığında belli oluyor. Hata bildirimi ana
  // süreçte (`dialog.showErrorBox`).
  const exportSession = useCallback(
    async (id: string) => {
      const target = sessions.find((s) => s.id === id);
      if (!target || target.messages.length === 0) return;
      const input = {
        title: target.title,
        messages: target.messages,
        contextPath: target.cwd,
        contextLabel: target.sapLabel
      };
      await window.api.exportChat(safeFileName(target.title, "pdf"), {
        markdown: chatToMarkdown(input),
        html: chatToPrintHtml(input)
      });
    },
    [sessions]
  );

  // Kayıtlı komutlar bir ref'te: kenar çubuğunun elindeki aracı (`commands`)
  // hiç değişmiyor, her çağrıda o anki kaydı okuyor. Kayıt yokken (ilk kare)
  // çağrı hiçbir şey yapmıyor.
  const registeredRef = useRef<ChatCommands | null>(null);
  const registerChatCommands = useCallback((next: ChatCommands) => {
    registeredRef.current = next;
    return () => {
      // Yalnızca HÂLÂ bu kayıt duruyorsa temizle: yeniden çizimde yeni kayıt
      // eskisinin iptalinden önce gelirse, eski iptal yeniyi silmesin.
      if (registeredRef.current === next) registeredRef.current = null;
    };
  }, []);
  const commands = useMemo<ChatCommands>(
    () => ({
      newSession: (...args) => registeredRef.current?.newSession(...args),
      requestDelete: (id) => registeredRef.current?.requestDelete(id),
      openProjectDialog: (id) => registeredRef.current?.openProjectDialog(id),
      openShortcuts: () => registeredRef.current?.openShortcuts()
    }),
    []
  );

  const value = useMemo<ChatStoreContextValue>(
    () => ({
      sessions,
      setSessions,
      activeId,
      setActiveId,
      projects,
      setProjects,
      sessionsLoaded,
      setSessionsLoaded,
      searchResetKey,
      resetSearch,
      renameSession,
      moveSession,
      createProject,
      deleteProject,
      exportSession,
      registerChatCommands,
      commands
    }),
    [
      sessions,
      activeId,
      projects,
      sessionsLoaded,
      searchResetKey,
      resetSearch,
      renameSession,
      moveSession,
      createProject,
      deleteProject,
      exportSession,
      registerChatCommands,
      commands
    ]
  );

  return <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>;
}

function useChatStoreContext(): ChatStoreContextValue {
  const value = useContext(ChatStoreContext);
  if (!value) throw new Error("useChatStore yalnızca ChatStoreProvider içinde kullanılabilir");
  return value;
}

export function useChatStore(): ChatStore {
  return useChatStoreContext();
}

export function useChatCommands(): ChatCommands {
  return useChatStoreContext().commands;
}
```

- [ ] **Adım 5: Store testini çalıştır**

Çalıştır: `npx vitest run tests/chatStore.test.tsx`
Beklenen: PASS (10 test).

- [ ] **Adım 6: `AxetCodeHome.tsx`'i store'a bağla**

1. Adım 3'te kesilen tanımların yerine import:

```ts
import { MAX_PROJECTS, useChatStore } from "../stores/chatStore";
import { deriveTitle, type ChatSession, type EditUndo, type RecentEntry } from "../stores/chatTypes";
```

`EditUndo` bugün `export` ediliyor ama başka dosya kullanmıyor; `AxetCodeHome` içinde kullanılmıyorsa import listesinden çıkar (tip denetimi söyler). Yerel `MAX_PROJECTS` sabiti ve yorumu siliniyor, bu görevden sonra `AxetCodeHome`'da `MAX_PROJECTS` hiç kullanılmıyorsa import'tan da çıkar.

2. Dört `useState`'i sil (`sessions`, `activeId`, `projects`, `sessionsLoaded`; yanlarındaki yorumlar kalıyor) ve bileşenin başına, `const t = useT();`'nin altına ekle:

```ts
  const {
    sessions,
    setSessions,
    activeId,
    setActiveId,
    projects,
    setProjects,
    sessionsLoaded,
    setSessionsLoaded,
    renameSession,
    moveSession,
    createProject,
    deleteProject,
    exportSession
  } = useChatStore();
```

3. `commitRename`'i şununla değiştir:

```ts
  const commitRename = useCallback(() => {
    const id = renamingId;
    if (!id) return;
    setRenamingId(null);
    renameSession(id, renameDraft);
  }, [renameDraft, renamingId, renameSession]);
```

4. `handleExportSession`'ı ve üstündeki yorumu sil (yorum store'a taşındı). `renderSessionRow`'daki `void handleExportSession(session.id);` → `void exportSession(session.id);`.

5. `handleCreateProject`:

```ts
  // Yeni proje HEMEN ayar kutusunu açıyor: varsayılan adıyla ("Yeni proje")
  // bırakılan bir proje, ikinci projeden itibaren ayırt edilemez olurdu.
  const handleCreateProject = useCallback(() => {
    const project = createProject();
    if (project) setProjectDialogId(project.id);
  }, [createProject]);
```

(Üstündeki "--- Projeler ---" yorum bloğu kalıyor.)

6. `handleDeleteProject`:

```ts
  const handleDeleteProject = useCallback(
    (id: string) => {
      deleteProject(id);
      setNewProjectId((current) => (current === id ? null : current));
      setProjectDialogId(null);
    },
    [deleteProject],
  );
```

7. `handleMoveSession`:

```ts
  const handleMoveSession = useCallback(
    (sessionId: string, projectId: string | null) => {
      moveSession(sessionId, projectId);
      setMoveMenu(null);
    },
    [moveSession],
  );
```

8. `chatToMarkdown`, `safeFileName`, `chatToPrintHtml` import'larını sil (artık yalnızca store'da).

- [ ] **Adım 7: `App.tsx`'te Provider'ı koy**

Import (diğer `./components` import'larının altına):

```ts
import { ChatStoreProvider } from "./stores/chatStore";
```

`return`'de `<LanguageProvider language={language}>`'ın hemen içine `<ChatStoreProvider pushToast={pushToast}>`, `</LanguageProvider>`'ın hemen önüne `</ChatStoreProvider>` koy. Provider `useT` kullandığı için `LanguageProvider`'ın **içinde** olmak zorunda.

- [ ] **Adım 8: Davranış testinin yardımcısını güncelle**

`tests/chatHomeBehaviour.test.tsx`'te yalnızca import'a `import { ChatStoreProvider } from "../src/stores/chatStore";` ekle ve `renderChatHome`'u şöyle yap:

```tsx
function renderChatHome() {
  return render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <AxetCodeHome
          active
          config={null}
          pushToast={() => {}}
          recentEntries={[]}
          connectivity={{}}
          tierOverrides={{}}
          onOpenSapLauncher={() => {}}
          onQuickConnectSap={() => {}}
          sapChatRequest={null}
          workDirRequest={null}
          activeSap={null}
        />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}
```

`it` gövdelerine dokunma.

- [ ] **Adım 9: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatStore.test.tsx tests/chatHomeBehaviour.test.tsx tests/chatSessionGroups.test.tsx tests/chatTreeCollapsed.test.ts`
Beklenen: PASS (10 + 7 + 7 + 3).

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok. Tip denetimi kullanılmayan bir import gösterirse (ör. `AxetTodo`, `ChatProject`) yalnızca onu sil.

- [ ] **Adım 10: Commit**

```bash
git add src/stores/chatTypes.ts src/stores/chatStore.tsx src/components/AxetCodeHome.tsx src/App.tsx tests/chatStore.test.tsx tests/chatHomeBehaviour.test.tsx
git commit -m "Grafit: sohbet verisi ChatStore baglamina cikti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 11: Sohbet komutları ve `ChatSidebar`

Sohbet listesi `AxetCodeHome`'dan kendi bileşenine taşınıyor (spec §5.1). Veri Görev 10'daki `ChatStore`'dan geliyor. Kenar çubuğunun sohbet ekranında kalan işleri (yeni sohbet, silme, proje penceresi, kısayol listesi) yapabilmesi için sohbet ekranı bunları `registerChatCommands` ile kaydediyor.

Bu görevde kabuk henüz değişmiyor: `App` sohbet ekranının solunda geçici bir `aside` içinde `ChatSidebar`'ı çiziyor. Genişlik ayarı ve daraltma Görev 15'te geliyor, bu yüzden bugünkü daraltma düğmesi bu görevde **kalkıyor** ve kenar çubuğu 264px'te sabit duruyor. `config.chatSidebarOpen` Görev 15'e kadar okunmuyor.

Bu görevde satırlar da yeni yoğunluğa geçiyor (spec §6.6): 28px yükseklik, kenarlıksız, seçili satırda solda 2px'lik bir çizgi ve hafif vurgu zemini.

Görev 9'un davranış testleri gövdeleri değişmeden yeşil kalmalı. Yalnızca `renderChatHome` yardımcısı iki bileşeni birlikte çiziyor.

**Dosyalar:**
- Yarat: `src/components/ChatSidebar.tsx`
- Değiştir: `src/components/AxetCodeHome.tsx`: props (bugün ~187–229), import'lar (~1–50), `MOVE_MENU_MAX_H` (~281–284), `moveMenu` (~630), `query` / `searchInputRef` / `renamingId` / `renameDraft` (~672–675), `sidebarOpen` ve ilk değer efekti (~683–694), `handleNewSession`'daki `setQuery("")` (~1004), `sapChatRequest` efektindeki `setQuery("")` (~1058), `commitRename` / `handleCreateProject` / `handleMoveSession` (~1255–1337), `clearSearch` (~1995–2003), gruplama bloğu (~2321–2462; Görev 9'dan sonra), `moveTarget` (~2531), `renderSessionRow` (~2583–2719), `aside` (~2735–3255), taşıma menüsü (~3416–3474)
- Değiştir: `src/App.tsx` (sohbet ekranının sarmalayıcısı, bugün ~1080)
- Değiştir: `tests/chatHomeBehaviour.test.tsx` (yalnızca `renderChatHome`), `tests/chatTreeCollapsed.test.ts` (dosya yolu), `tests/eyebrow.test.tsx` (son `describe`'daki dosya listesi)
- Test: `tests/chatSidebar.test.tsx`

**Arayüzler:**
- Tüketir: Görev 10'dan `useChatStore()` (`sessions`, `activeId`, `setActiveId`, `projects`, `searchResetKey`, `renameSession`, `moveSession`, `createProject`, `exportSession`), `useChatCommands()`, `ChatCommands`, `registerChatCommands`, `resetSearch`; `RecentEntry` (`src/stores/chatTypes.ts`). Görev 9'dan `orderSessions`, `normalizeSessionQuery`, `filterSessions`, `groupSessions`, `activeGroupKeys`, `GENERAL_GROUP_KEY`, `SAP_SECTION_KEY`, `PROJECTS_SECTION_KEY` (`src/lib/chatSessionGroups.ts`). Görev 4'ten `Eyebrow` (`src/ui/Eyebrow.tsx`).
- Üretir: `export default function ChatSidebar(props: ChatSidebarProps)`:

```ts
export interface ChatSidebarProps {
  recentEntries: RecentEntry[];
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  activeSap: ActiveSapContext | null;
  onOpenSapLauncher: () => void;
  onQuickConnectSap: (path: string[], service: SapService, itemUuid: string) => void;
}
```

  Bileşen kendi genişliğini belirlemiyor (`flex min-h-0 flex-1 flex-col`); genişlik onu saran kabuğun işi. Arama kutusu `data-sidebar-search` taşıyor: Görev 16'daki `/` kısayolu onu bu işaretle buluyor.
- Değişir: `AxetCodeHome`'un props'undan `connectivity`, `tierOverrides`, `onOpenSapLauncher`, `onQuickConnectSap` çıkıyor. `recentEntries` ve `activeSap` kalıyor, çünkü sohbet ekranı bunları kenar çubuğu dışında da kullanıyor (tip denetimi kullanılmadıklarını söylerse onlar da çıkar ve `App`'teki geçişleri silinir).

- [ ] **Adım 1: Kırılan testi yaz**

`tests/chatSidebar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import ChatSidebar from "../src/components/ChatSidebar";
import { ChatStoreProvider, useChatStore, type ChatStore } from "../src/stores/chatStore";
import type { ChatSession } from "../src/stores/chatTypes";

let store: ChatStore;
function Probe() {
  store = useChatStore();
  return null;
}

function renderSidebar() {
  return render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <Probe />
        <ChatSidebar
          recentEntries={[]}
          connectivity={{}}
          tierOverrides={{}}
          activeSap={null}
          onOpenSapLauncher={() => {}}
          onQuickConnectSap={() => {}}
        />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

function session(id: string, title: string): ChatSession {
  return {
    id, title, model: null, draft: "", attachments: [], pending: false, requestId: null, activity: null,
    activitySteps: [], stalledMinutes: 0, pendingAsk: null, todos: [], contextTokens: 0, contextLimit: 0,
    editUndo: null, cancelStuck: false, createdAt: 1, updatedAt: 1, cwd: null, sapLabel: null, projectId: null,
    keepInGeneral: false,
    messages: [{ id: `${id}-m`, role: "user", content: `${title} içeriği`, createdAt: 1 }]
  };
}

function registerSpies() {
  const spies = {
    newSession: vi.fn(),
    requestDelete: vi.fn(),
    openProjectDialog: vi.fn(),
    openShortcuts: vi.fn()
  };
  act(() => {
    store.registerChatCommands(spies);
  });
  return spies;
}

// Etkin sohbet seçilince yolu (burada "Sohbetler" grubu) kendiliğinden açılıyor.
function seed() {
  act(() => {
    store.setSessions([session("a", "Birinci"), session("b", "İkinci")]);
    store.setActiveId("a");
  });
}

const rowOf = (title: string) =>
  screen.getAllByTitle(title).find((el) => el.getAttribute("role") === "button")!;

afterEach(cleanup);

describe("ChatSidebar", () => {
  it("satırlar 28px ve kenarlıksız; seçili satırda sol çizgi var", () => {
    renderSidebar();
    seed();
    const active = rowOf("Birinci");
    const other = rowOf("İkinci");
    expect(active.className).toContain("h-7");
    expect(active.className).not.toContain("border");
    expect(active.getAttribute("aria-current")).toBe("true");
    expect(active.querySelector("[data-active-line]")).not.toBeNull();
    expect(other.querySelector("[data-active-line]")).toBeNull();
  });

  it("Yeni sohbet, Sohbeti sil ve kısayollar kayıtlı komutlara gidiyor", () => {
    renderSidebar();
    seed();
    const spies = registerSpies();
    fireEvent.click(screen.getByTitle("Yeni sohbet (Ctrl+N)"));
    expect(spies.newSession).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByTitle("Sohbeti sil")[0]);
    expect(spies.requestDelete).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByTitle("Klavye kısayolları"));
    expect(spies.openShortcuts).toHaveBeenCalledTimes(1);
  });

  it("Yeni proje projeyi store'da kuruyor ve pencereyi komutla açtırıyor", () => {
    renderSidebar();
    const spies = registerSpies();
    fireEvent.click(screen.getByTitle("Yeni proje"));
    expect(store.projects).toHaveLength(1);
    expect(spies.openProjectDialog).toHaveBeenCalledWith(store.projects[0].id);
  });

  it("resetSearch arama kutusunu boşaltıyor", () => {
    renderSidebar();
    const input = screen.getByPlaceholderText("Sohbetlerde ara…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "fatura" } });
    expect(input.value).toBe("fatura");
    act(() => store.resetSearch());
    expect(input.value).toBe("");
  });

  it("arama kutusu kısayolun bulacağı işareti taşıyor", () => {
    renderSidebar();
    expect(document.querySelector("[data-sidebar-search]")).toBe(screen.getByPlaceholderText("Sohbetlerde ara…"));
  });
});
```

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/chatSidebar.test.tsx`
Beklenen: FAIL, `Failed to resolve import "../src/components/ChatSidebar"`.

- [ ] **Adım 3: `src/components/ChatSidebar.tsx`'in iskeletini yaz**

Dosya CRLF. İskelet (JSX gövdesi Adım 4'te taşınıyor):

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Download,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Keyboard,
  Link2,
  Pencil,
  Plus,
  Search,
  Server,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import type {
  ActiveSapContext,
  ConnectivityState,
  SapService,
  SystemTier,
} from "../../app-electron/shared/types";
import { useT } from "../i18n";
import {
  activeGroupKeys,
  filterSessions,
  groupSessions,
  normalizeSessionQuery,
  orderSessions,
  GENERAL_GROUP_KEY,
  PROJECTS_SECTION_KEY,
  SAP_SECTION_KEY,
} from "../lib/chatSessionGroups";
import { resolveTier } from "../lib/tier";
import { useChatCommands, useChatStore } from "../stores/chatStore";
import type { ChatSession, RecentEntry } from "../stores/chatTypes";
import { Eyebrow } from "../ui/Eyebrow";
import StatusDot from "./StatusDot";
import SystemHoverCard from "./SystemHoverCard";
import TierBadge from "./TierBadge";

// Sohbet listesi: arama, proje / SAP / genel grupları, SAP bağlantıları.
// `AxetCodeHome`'dan taşındı (grafit, spec §5.1). Veri `ChatStore`'da;
// yazma kutusuna ya da süren cevaba dokunan işler (yeni sohbet, silme,
// proje penceresi, kısayol listesi) sohbet ekranında kalıyor ve buradan
// `useChatCommands` ile çağrılıyor.

// Taşıma menüsünün en fazla yüksekliği. Menünün konumu bununla alt kenara
// sıkıştırılıyor, yani ikisi aynı sayı olmak zorunda.
const MOVE_MENU_MAX_H = 280;

export interface ChatSidebarProps {
  recentEntries: RecentEntry[];
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  activeSap: ActiveSapContext | null;
  onOpenSapLauncher: () => void;
  onQuickConnectSap: (path: string[], service: SapService, itemUuid: string) => void;
}

export default function ChatSidebar({
  recentEntries,
  connectivity,
  tierOverrides,
  activeSap,
  onOpenSapLauncher,
  onQuickConnectSap,
}: ChatSidebarProps) {
  const t = useT();
  const {
    sessions,
    activeId,
    setActiveId,
    projects,
    searchResetKey,
    renameSession,
    moveSession,
    createProject,
    exportSession,
  } = useChatStore();
  const commands = useChatCommands();

  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [moveMenu, setMoveMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);

  // Sohbet ekranı aramayı temizlemek istediğinde (yeni sohbet, SAP'den
  // gelen sohbet) sayacı artırıyor. İlk çizimde de çalışıyor, zararsız.
  useEffect(() => {
    setQuery("");
  }, [searchResetKey]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const orderedSessions = useMemo(() => orderSessions(sessions), [sessions]);
  const normalizedQuery = normalizeSessionQuery(query);
  const visibleSessions = useMemo(
    () => filterSessions(orderedSessions, normalizedQuery),
    [normalizedQuery, orderedSessions],
  );
  const sessionGroups = useMemo(
    () => groupSessions(visibleSessions, projects, Boolean(normalizedQuery)),
    [normalizedQuery, projects, visibleSessions],
  );

  // (AxetCodeHome'daki "Yalnızca AÇILMIŞ olanlar tutuluyor" yorumunu buraya taşı.)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  // (AxetCodeHome'daki "Arama sırasında daraltma YOK SAYILIYOR" yorumunu buraya taşı.)
  const groupOpen = (key: string) =>
    Boolean(normalizedQuery) || Boolean(openGroups[key]);
  // (AxetCodeHome'daki "Etkin sohbetin yolu açılıyor" yorumunu buraya taşı.)
  useEffect(() => {
    const s = activeSession;
    if (!s) return;
    const keys = activeGroupKeys(s, projects);
    setOpenGroups((prev) =>
      keys.every((k) => prev[k])
        ? prev
        : { ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  const commitRename = useCallback(() => {
    const id = renamingId;
    if (!id) return;
    setRenamingId(null);
    renameSession(id, renameDraft);
  }, [renameDraft, renamingId, renameSession]);

  // Yeni proje HEMEN ayar kutusunu açıyor: varsayılan adıyla ("Yeni proje")
  // bırakılan bir proje, ikinci projeden itibaren ayırt edilemez olurdu.
  // Pencere sohbet ekranında çiziliyor, bu yüzden komutla açılıyor.
  const handleCreateProject = useCallback(() => {
    const project = createProject();
    if (project) commands.openProjectDialog(project.id);
  }, [commands, createProject]);

  const handleMoveSession = useCallback(
    (sessionId: string, projectId: string | null) => {
      moveSession(sessionId, projectId);
      setMoveMenu(null);
    },
    [moveSession],
  );

  const moveTarget = moveMenu
    ? sessions.find((s) => s.id === moveMenu.sessionId) ?? null
    : null;

  const renderSessionRow = (session: ChatSession) => {
    /* Adım 5 */
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Adım 4 */}
    </div>
  );
}
```

"(… yorumunu buraya taşı.)" satırları, `AxetCodeHome.tsx`'teki aynı yerdeki yorumların kendisiyle değiştiriliyor; yorumlar kelimesi kelimesine taşınıyor. İki `/* Adım N */` yeri bir sonraki iki adımda dolduruluyor; bu adımda dosya henüz derlenmiyor.

`import` yolları bugünkü `AxetCodeHome.tsx`'teki `StatusDot` / `TierBadge` / `SystemHoverCard` / `resolveTier` import'larından kopyalanmalı (yol ya da varsayılan/adlı dışa aktarım farklıysa oradakini kullan). Lucide listesi, taşınan JSX'in kullandıklarıdır. Adım 7'deki tip denetimi fazla olanı `noUnusedLocals` ile gösterir; yalnızca onu sil.

- [ ] **Adım 4: Kenar çubuğu JSX'ini taşı**

`AxetCodeHome.tsx`'teki `<aside …>` (bugün ~2735) ile `</aside>` (bugün ~3255) arasındaki içeriği **ve** taşıma menüsünü (`{moveMenu && (` ile başlayan blok, üstündeki yorumla birlikte; bugün ~3416–3474) keserek `ChatSidebar`'ın dönen `div`'inin içine koy. Taşıma menüsü dönen `div`'in en sonunda duruyor; `fixed` olduğu için yeri görünümü etkilemiyor.

Taşırken şunları değiştir:

| Bugün | Taşındıktan sonra |
|---|---|
| `handleNewSession(` | `commands.newSession(` |
| `setProjectDialogId(x)` | `commands.openProjectDialog(x)` |
| `requestDeleteSession(` | `commands.requestDelete(` |
| `setShortcutsOpen(true)` | `commands.openShortcuts()` |
| `onClick={clearSearch}` | `onClick={() => setQuery("")}` |
| `ref={searchInputRef}` | `ref={searchInputRef}` ve hemen altına `data-sidebar-search` |
| `sidebarOpen ? A : B` | `A` |
| `{sidebarOpen && ( … )}` ve `{sidebarOpen && <x/>}` | içindeki `…` / `<x/>` (sarmalayıcı `<>…</>` da kalkıyor) |
| `text-[10px]`, `text-[11px]` | `text-2xs` |
| `text-[12px]` | `text-xs` |
| `text-[13px]` | `text-sm` |

Ayrıca:
- Başlık şeridindeki **daraltma düğmesini** (`PanelLeftClose` / `PanelLeft`, `setSidebarOpen((v) => !v)` çağıran `button`) üstündeki yorumla birlikte sil. Görev 15 daraltmayı kabuğa taşıyor. Şeritte arama kutusu ve kısayol düğmesi kalıyor.
- "Daraltılmışken listenin tamamı gizli" yorumunu sil; artık doğru değil.
- `<aside>`'ın kendisi taşınmıyor: genişlik, kenarlık ve zemin kabuğun işi (bu görevde `App`, Görev 14'ten sonra `Sidebar`).

- [ ] **Adım 5: Satırı yeni yoğunlukta yaz**

`renderSessionRow`'u şu kodla doldur. Yeniden adlandırma kutusu ve dört düğme bugünküyle aynı davranıyor; değişen, satırın ölçüsü ve seçili gösterimi (spec §6.6). Bugünkü satırdaki "Keskin köşe", "Kenarlık HER satırda var", "Sohbet ikonu KALDIRILDI", "Projeye taşı", "Dışa aktarma yalnızca DOLU sohbetlerde" ve `focus-visible:opacity-100` yorumlarından artık doğru olmayan ilk ikisi siliniyor, diğerleri kalıyor:

```tsx
  const renderSessionRow = (session: ChatSession) => {
    const isActive = activeId === session.id;
    if (renamingId === session.id) {
      return (
        <div key={session.id} className="flex h-7 items-center px-1">
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                // Escape'te `commitRename` çalışmamalı; blur onu yine
                // tetiklemesin diye önce state kapatılıyor.
                setRenamingId(null);
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded bg-app px-2 py-0.5 text-sm text-slate-100 outline-none ring-1 ring-accent-500/50"
          />
        </div>
      );
    }
    const actionClass =
      "shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover:opacity-100";
    return (
      <div
        key={session.id}
        role="button"
        tabIndex={0}
        onClick={() => setActiveId(session.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveId(session.id);
          }
        }}
        title={session.title}
        aria-current={isActive ? "true" : undefined}
        // 28px satır (spec §6.6): eskiden 36px'ti ve kenarlıklıydı. Seçili
        // satır zeminden ve soldaki çizgiden tanınıyor; kenarlık yok, yani
        // seçim satırın ölçüsünü değiştirmiyor.
        className={`group relative flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors ${
          isActive
            ? "bg-[var(--accent-glow)] text-slate-100"
            : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
        }`}
      >
        {isActive && (
          <span
            data-active-line
            aria-hidden
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-400"
          />
        )}
        {/* Sohbet ikonu KALDIRILDI (kullanıcı isteği, 2026-09-06: *"chat
            kısmında sohbetlerin yanındaki iconu kaldıralım"*). Bir sohbet
            listesinde her satıra "bu bir sohbettir" ikonu koymak bilgi
            taşımıyordu; kalkınca başlıklar da daha geniş yer buldu. */}
        <span className="min-w-0 flex-1 truncate">{session.title}</span>
        {session.pending && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
        )}
        {/* "Projeye taşı" — yalnızca gidecek bir proje varsa. Proje kurmamış
            kullanıcıya boş bir menü açan düğme göstermenin anlamı yok.
            Menü SABİT konumlu (bkz. `moveMenu`): kaydırılan listenin içinde
            açılsaydı listeyle kayar ve kenar çubuğunun sınırında kırpılırdı. */}
        {projects.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              // Alt kenara sıkıştırma: listenin en altındaki bir sohbette menü
              // ekranın dışında açılır ve tıklanamaz olurdu.
              setMoveMenu({
                sessionId: session.id,
                x: rect.left,
                y: Math.min(
                  rect.bottom + 4,
                  window.innerHeight - MOVE_MENU_MAX_H - 8,
                ),
              });
            }}
            title={t("axetCodeHome.moveToProject")}
            className={actionClass}
          >
            <FolderInput size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRenameDraft(session.title);
            setRenamingId(session.id);
          }}
          title={t("axetCodeHome.renameTitle")}
          className={actionClass}
        >
          <Pencil size={12} />
        </button>
        {/* Dışa aktarma yalnızca DOLU sohbetlerde: boş bir sohbetin dosyası
            yalnızca başlıktan ibaret olurdu. Biçim seçimi burada DEĞİL,
            kaydetme kutusunun kendi "dosya türü" listesinde — bu şeride ikinci
            bir ikon koymak gürültü olurdu. */}
        {session.messages.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void exportSession(session.id);
            }}
            title={t("axetCodeHome.exportTitle")}
            className={actionClass}
          >
            <Download size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            commands.requestDelete(session.id);
          }}
          title={t("axetCodeHome.deleteTitle")}
          // `focus-visible:opacity-100` olmadan bu buton klavyeyle gezildiğinde
          // odaklanıyor ama GÖRÜNMÜYORDU.
          className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-[var(--status-danger-text)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };
```

- [ ] **Adım 6: `AxetCodeHome.tsx`'te komutları kaydet ve taşınanları sil**

1. `import { useCallback, useEffect, useMemo, useRef, useState } from "react";` satırına `useLayoutEffect` ekle. Store'dan `resetSearch` ve `registerChatCommands`'ı da al; `renameSession`, `moveSession` ve `exportSession` artık burada kullanılmıyor, destructuring'den çıkar.

2. `requestDeleteSession`'ın tanımının (bugün ~1188–1198) hemen altına:

```ts
  // Kenar çubuğunun çağırdığı işler (bkz. stores/chatStore.tsx
  // `ChatCommands`). Ref üzerinden: kayıt bir kere yapılıyor, her çağrı
  // o anki fonksiyona gidiyor. Kayıt `useLayoutEffect`'te, yani ilk
  // boyamadan önce: kullanıcı ilk karede tıklasa da komut boşa düşmüyor.
  const commandsRef = useRef({
    newSession: handleNewSession,
    requestDelete: requestDeleteSession,
    openProjectDialog: setProjectDialogId,
    openShortcuts: () => setShortcutsOpen(true),
  });
  commandsRef.current = {
    newSession: handleNewSession,
    requestDelete: requestDeleteSession,
    openProjectDialog: setProjectDialogId,
    openShortcuts: () => setShortcutsOpen(true),
  };
  useLayoutEffect(
    () =>
      registerChatCommands({
        newSession: (...args) => commandsRef.current.newSession(...args),
        requestDelete: (id) => commandsRef.current.requestDelete(id),
        openProjectDialog: (id) => commandsRef.current.openProjectDialog(id),
        openShortcuts: () => commandsRef.current.openShortcuts(),
      }),
    [registerChatCommands],
  );
```

`handleNewSession` ve `requestDeleteSession` bu satırlardan **önce** tanımlı olmalı (`const` TDZ). `setProjectDialogId`'nin state tanımı dosyanın başında, sorun yok.

3. `handleNewSession` içindeki `setQuery("");` (bugün ~1004) → `resetSearch();` ve `useCallback` bağımlılığı `[]` → `[resetSearch]`. `sapChatRequest` efektindeki `setQuery("");` (bugün ~1058) → `resetSearch();` (efektin bağımlılık listesi elle yazılmışsa `resetSearch` ekle; `useCallback` ile sabit olduğu için davranış değişmiyor).

4. Şunları **sil** (üstlerindeki yorumlarla birlikte; yorumların doğru olanları Adım 3–5'te `ChatSidebar`'a taşındı):
   - `MOVE_MENU_MAX_H` sabiti
   - `moveMenu` state'i, `moveTarget`
   - `query`, `searchInputRef`, `renamingId`, `renameDraft` state'leri
   - `sidebarOpen` state'i, ilk değer ref'i ve `config.chatSidebarOpen`'ı okuyan efekt
   - `commitRename`, `handleCreateProject`, `handleMoveSession`, `clearSearch`
   - `normalizedQuery`, `visibleSessions`, `sessionGroups`, `openGroups`, `toggleGroup`, `groupOpen` ve etkin yolu açan efekt. **`orderedSessions` kalıyor:** Ctrl+Yukarı/Aşağı kısayolu onu kullanıyor.
   - `renderSessionRow`
   - `<aside>…</aside>` (içi Adım 4'te taşındı) ve taşıma menüsü
   - props'tan `connectivity`, `tierOverrides`, `onOpenSapLauncher`, `onQuickConnectSap` (arayüzde ve bileşenin parametre listesinde)
   - Artık kullanılmayan import'lar: lucide'dan kenar çubuğuna ait olanlar, `StatusDot`, `TierBadge`, `SystemHoverCard`, `resolveTier`, `chatSessionGroups`'tan gruplama işlevleri (yalnızca `orderSessions` kalıyor), `MAX_PROJECTS`, `Eyebrow` (sohbet ekranında başka yerde kullanılmıyorsa). Neyin kaldığını Adım 7'deki tip denetimi söylüyor.

5. `AxetCodeHome`'un dönen kökü bugün `aside` + ana alan yan yana duran bir satır. `aside` gidince kök yalnızca ana alanı taşıyor; kökteki `flex` sınıfı kalabilir, görünüm değişmiyor.

- [ ] **Adım 7: `App.tsx`'te geçici kenar çubuğunu çiz**

Import:

```ts
import ChatSidebar from "./components/ChatSidebar";
```

Sohbet ekranının sarmalayıcısını (bugün `activity === "axetCode" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"`) bir satıra çevir ve `AxetCodeHome`'un önüne kenar çubuğunu koy:

```tsx
            <div className={activity === "axetCode" ? "flex min-h-0 flex-1 overflow-hidden" : "hidden"}>
              {/* Geçici: Görev 14'te kabuğun `Sidebar`'ı bu `aside`'ın yerini alıyor. */}
              <aside className="flex w-[264px] shrink-0 flex-col border-r border-line-subtle bg-sidebar">
                <ChatSidebar
                  recentEntries={recentEntries}
                  connectivity={connectivity}
                  tierOverrides={config?.systemTiers ?? {}}
                  activeSap={activeContext.sap}
                  onOpenSapLauncher={() => setActivity("sapLauncher")}
                  onQuickConnectSap={handleQuickConnectSap}
                />
              </aside>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <AxetCodeHome
                  active={activity === "axetCode"}
                  config={config}
                  pushToast={pushToast}
                  recentEntries={recentEntries}
                  sapChatRequest={sapChatRequest}
                  workDirRequest={workDirRequest}
                  activeSap={activeContext.sap}
                />
              </div>
            </div>
```

`AxetCodeHome`'dan kalkan dört prop'un (`connectivity`, `tierOverrides`, `onOpenSapLauncher`, `onQuickConnectSap`) geçişleri artık `ChatSidebar`'da. Adım 6'da `recentEntries` ya da `activeSap` da çıktıysa onların geçişini de sil. Sarmalayıcının üstündeki uzun yorum kalıyor.

- [ ] **Adım 8: Testleri yeni yapıya göre güncelle**

1. `tests/chatHomeBehaviour.test.tsx`: import'a `import ChatSidebar from "../src/components/ChatSidebar";` ekle, `renderChatHome`'u şöyle yap (`it` gövdelerine dokunma):

```tsx
function renderChatHome() {
  return render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <ChatSidebar
          recentEntries={[]}
          connectivity={{}}
          tierOverrides={{}}
          activeSap={null}
          onOpenSapLauncher={() => {}}
          onQuickConnectSap={() => {}}
        />
        <AxetCodeHome
          active
          config={null}
          pushToast={() => {}}
          recentEntries={[]}
          sapChatRequest={null}
          workDirRequest={null}
          activeSap={null}
        />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}
```

(Adım 6'da `recentEntries` ya da `activeSap` da `AxetCodeHome`'dan çıktıysa buradan da çıkar.)

2. `tests/chatTreeCollapsed.test.ts`: okunan dosya yolunu `src/components/AxetCodeHome.tsx` → `src/components/ChatSidebar.tsx` yap. Beklentilere dokunma; `ChatSidebar`'daki ilgili üç satır Adım 3'te birebir aynı yazıldı.

3. `tests/eyebrow.test.tsx`: son `describe`'daki `["AxetCodeHome.tsx", "ChatSessionPane.tsx"]` → `["ChatSidebar.tsx", "ChatSessionPane.tsx"]`. Bölüm başlıkları artık `ChatSidebar`'da.

- [ ] **Adım 9: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatSidebar.test.tsx tests/chatHomeBehaviour.test.tsx tests/chatTreeCollapsed.test.ts tests/eyebrow.test.tsx tests/chatStore.test.tsx`
Beklenen: PASS. `chatHomeBehaviour`'ın yedi testi gövdeleri değişmeden yeşil.

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok. Taşıma `text-[..px]` sayısını düşürdüyse `tests/designScale.test.ts`'teki üst sınıra **dokunma**; cırcır Görev 17'de ölçülerek iniyor.

- [ ] **Adım 10: Commit**

```bash
git add src/components/ChatSidebar.tsx src/components/AxetCodeHome.tsx src/App.tsx tests/chatSidebar.test.tsx tests/chatHomeBehaviour.test.tsx tests/chatTreeCollapsed.test.ts tests/eyebrow.test.tsx
git commit -m "Grafit: sohbet listesi ChatSidebar bilesenine tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 12: `ScriptStore` ve `ScriptSidebar`

Script ekranının ağaç verisi `SapGuiScriptingHome`'un `useState`'lerinden bir React bağlamına çıkıyor (spec §5.2). Bu veri şunlar: bağlantılar, oturumlar, seçili oturum, düğümler, açık düğümler ve seçili öğe. Sol paneldeki bağlantı/oturum listesi ile ekran ağacı `ScriptSidebar` bileşenine taşınıyor.

**Köprüyle konuşan her şey ekranda kalıyor.** Bunlar durum yoklaması, bağlantı ve oturum okuma, düğüm okuma, ekran görüntüsü ve eylemler. Kenar çubuğu yalnızca okuyor; tıklamaları `useScriptCommands()` üzerinden ekrana gidiyor. Ekran yalnızca Script modunda çiziliyor, yani **arka planda istek atılmıyor**.

Bugün ekran başka bir moda geçince unmount oluyor ve seçim kayboluyor. Store'dan sonra davranış şöyle:

- **Seçim korunuyor.** Dönüşte eski ağaç hemen görünüyor, bağlantılar arka planda yeniden okunuyor.
- **Seçili oturum kapanmışsa** seçim, düğümler ve seçili öğe temizleniyor. Eski oturuma **hiç istek gitmiyor**.
- **Oturum hâlâ açıksa** ekran bilgisi ve görüntüsü tazeleniyor. Bu, aktif GUI bağlamını yeniden yayımlıyor.
- **Köprü arada kapanmışsa** ağaç tamamen temizleniyor.

Ekrandan çıkarken aktif GUI bağlamı **bilerek silinmiyor**. Bugünkü kodun yorumu nedenini anlatıyor: sohbete geçen kullanıcı tam o anda bağlama ihtiyaç duyuyor. Bu kalıyor.

Taşımadan önce bugünkü koda karşı iki davranış testi yazılıyor (spec §5.4): oturum seçilince ağaç yükleniyor, düğüm açılınca çocukları okunuyor. Bu testler taşımadan sonra da gövdeleri değişmeden yeşil kalmalı. Taşıma sırasında yalnızca `renderScript` yardımcısı değişiyor.

**Dosyalar:**
- Yarat: `tests/scriptApiFake.tsx`, `tests/scriptBehaviour.test.tsx`, `src/stores/scriptTypes.ts`, `src/stores/scriptStore.tsx`, `src/components/ScriptSidebar.tsx`
- Değiştir: `src/components/SapGuiScriptingHome.tsx`:
  - tür ve yardımcılar (bugün ~55–62 `NodeState`, `SelectedSession`, `ROOT_KEY`; ~91–93 `nodeKey`)
  - yedi `useState` (~186–193)
  - `refreshStatus` ve efekti (~223–231)
  - `handleStop` (~296–310)
  - `renderTreeNode` (~627–684) ve `rootKey`/`rootState` (~686–687)
  - sol panel (~1026–1115)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` (bir anahtar)
- Değiştir: `src/App.tsx` (import, `ScriptStoreProvider`, `sapGuiScripting` dalı)
- Test: `tests/scriptStore.test.tsx`

**Arayüzler:**
- Tüketir: `CountBadge`, `EmptyState`, `PanelHeader` (`src/components/sapgui/ui.tsx`). Türler `app-electron/shared/types.ts`'ten: `GuiScriptComponentDetail`, `GuiScriptComponentSummary`, `GuiScriptConnectionInfo`, `GuiScriptSessionInfo`, `GuiScriptBridgeStatus`, `GuiScriptScreenState`. Ayrıca `ChatStoreProvider`'ın `App`'teki yeri (Görev 10).
- Üretir (`src/stores/scriptTypes.ts`): `export type NodeState = GuiScriptComponentDetail | "loading" | "error"`, `export interface SelectedSession { connIdx: number; sessIdx: number }`, `export const ROOT_KEY = "__root__"`, `export function nodeKey(connIdx: number, sessIdx: number, elementId: string): string`.
- Üretir (`src/stores/scriptStore.tsx`):
  - `export type ConnectionsState = GuiScriptConnectionInfo[] | "loading" | "error" | null`
  - `export type SessionsByConn = Record<number, GuiScriptSessionInfo[] | "loading" | "error">`
  - `export interface ScriptCommands { selectSession(connIdx: number, sessIdx: number): void; toggleConn(connIdx: number): void; toggleNode(elementId: string): void; selectElement(elementId: string): void }`
  - `export interface ScriptStore { connections; setConnections; sessionsByConn; setSessionsByConn; expandedConn; setExpandedConn; activeSession; setActiveSession; nodesByKey; setNodesByKey; expandedNodes; setExpandedNodes; selectedElementId; setSelectedElementId; treeVisible: boolean; setTreeVisible; clearSelection(): void; registerScriptCommands(commands: ScriptCommands): () => void }`. Değiştiriciler `Dispatch<SetStateAction<…>>`.
  - `export function ScriptStoreProvider(props: { children: ReactNode })`
  - `export function useScriptStore(): ScriptStore` (Provider yoksa hata fırlatıyor)
  - `export function useScriptCommands(): ScriptCommands`: kimliği hiç değişmiyor; kayıt yoksa hiçbir şey yapmıyor.
- Üretir (`src/components/ScriptSidebar.tsx`): `export default function ScriptSidebar()`. Prop'u yok. Görev 14 bunu kabuğun kenar çubuğuna koyuyor.
- Üretir (i18n): `sapGuiScripting.bridgeOff`.

- [ ] **Adım 1: Sahte köprüyü ve taşıma öncesi testi yaz**

`tests/scriptApiFake.tsx`. İçinde JSX yok, ama `window` kullandığı için `.tsx`: `tsconfig.web.json` yalnızca `tests/**/*.tsx`'e DOM tiplerini veriyor. Adı `.test.` içermediği için vitest bunu test olarak çalıştırmıyor.

```tsx
import { vi } from "vitest";
import type {
  GuiScriptBridgeStatus,
  GuiScriptComponentDetail,
  GuiScriptComponentSummary,
  GuiScriptConnectionInfo,
  GuiScriptScreenState,
  GuiScriptSessionInfo
} from "../app-electron/shared/types";

// Script ekranı testlerinin sahte köprüsü. Bir bağlantı, içinde SE38'de
// duran bir oturum ve üç katlı bir ekran ağacı var. `window.api`'de burada
// tanımlanmayan her işlev hiç dönmeyen bir söz veriyor; `on…` abonelikleri
// boş bir iptal döndürüyor.

export const CONNECTION: GuiScriptConnectionInfo = { index: 0, description: "S4D Geliştirme", sessionCount: 1 };

export const SESSION: GuiScriptSessionInfo = {
  index: 0,
  id: "/app/con[0]/ses[0]",
  busy: false,
  info: { Transaction: "SE38", Program: "SAPLWBABAP", SystemName: "S4D", Client: "100", User: "TESTUSER" }
};

const SCREEN: GuiScriptScreenState = {
  systemName: "S4D",
  client: "100",
  user: "TESTUSER",
  transaction: "SE38",
  program: "SAPLWBABAP",
  title: "ABAP Editörü"
};

const USR: GuiScriptComponentSummary = { id: "wnd[0]/usr", type: "GuiUserArea", name: "usr", hasChildren: true };
const FIELD: GuiScriptComponentSummary = {
  id: "wnd[0]/usr/ctxtRS38M-PROGRAMM",
  type: "GuiCTextField",
  name: "RS38M-PROGRAMM",
  hasChildren: false
};

function detail(id: string, type: string, name: string, children: GuiScriptComponentSummary[]): GuiScriptComponentDetail {
  return { id, type, name, tooltip: "", changeable: false, subType: "", children };
}

// Anahtar, `getGuiScriptNode`'a giden öğe kimliği; kök `null` ile isteniyor.
const NODES: Record<string, GuiScriptComponentDetail> = {
  "": detail("wnd[0]", "GuiMainWindow", "wnd[0]", [USR]),
  "wnd[0]": detail("wnd[0]", "GuiMainWindow", "wnd[0]", [USR]),
  "wnd[0]/usr": detail("wnd[0]/usr", "GuiUserArea", "usr", [FIELD])
};

function createFake() {
  return {
    getGuiScriptBridgeStatus: vi.fn(
      (): Promise<GuiScriptBridgeStatus> => Promise.resolve({ running: true, port: 8790, external: false })
    ),
    listGuiScriptConnections: vi.fn(
      (): Promise<{ ok: boolean; connections?: GuiScriptConnectionInfo[]; error?: string }> =>
        Promise.resolve({ ok: true, connections: [CONNECTION] })
    ),
    listGuiScriptSessions: vi.fn(
      (_connIdx: number): Promise<{ ok: boolean; sessions?: GuiScriptSessionInfo[]; error?: string }> =>
        Promise.resolve({ ok: true, sessions: [SESSION] })
    ),
    getGuiScriptNode: vi.fn(
      (
        _connIdx: number,
        _sessIdx: number,
        elementId: string | null,
        _window?: { rows?: number; rowOffset?: number }
      ): Promise<{ ok: boolean; node?: GuiScriptComponentDetail; error?: string }> => {
        const node = NODES[elementId ?? ""];
        return Promise.resolve(node ? { ok: true, node } : { ok: false, error: "yok" });
      }
    ),
    getGuiScriptScreen: vi.fn(
      (_connIdx: number, _sessIdx: number): Promise<{ ok: boolean; screen?: GuiScriptScreenState; error?: string }> =>
        Promise.resolve({ ok: true, screen: SCREEN })
    ),
    // Görüntü hiç gelmiyor: ekran görüntüsü alanı bu testlerin konusu değil.
    captureGuiScriptScreenshot: vi.fn(
      (_connIdx: number | null, _sessIdx: number | null, _method: string): Promise<unknown> => new Promise(() => {})
    ),
    setActiveGuiContext: vi.fn((_gui: unknown): Promise<unknown> => Promise.resolve({}))
  };
}

export type ScriptApiFake = ReturnType<typeof createFake>;

export function installScriptApi(): ScriptApiFake {
  const fake = createFake();
  const impl: Record<string, unknown> = fake;
  (window as unknown as { api: unknown }).api = new Proxy(
    {},
    {
      get: (_t, k: string) => {
        if (k in impl) return impl[k];
        if (k.startsWith("on")) return () => () => {};
        return () => new Promise(() => {});
      }
    }
  );
  // jsdom'da yok; canlı ekran alanı (`ScreenViewer`) boyut izlemek için kuruyor.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  return fake;
}
```

`tests/scriptBehaviour.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SapGuiScriptingHome from "../src/components/SapGuiScriptingHome";
import { installScriptApi, type ScriptApiFake } from "./scriptApiFake";

// Taşıma (Görev 12) yalnızca bu fonksiyonu değiştiriyor; `it` gövdeleri
// taşımadan önce ve sonra aynı kalmalı (spec §5.4).
function renderScript() {
  return render(
    <LanguageProvider language="tr">
      <SapGuiScriptingHome activeSap={null} />
    </LanguageProvider>
  );
}

let api: ScriptApiFake;
beforeEach(() => {
  api = installScriptApi();
});
afterEach(cleanup);

async function openSession() {
  fireEvent.click(await screen.findByRole("button", { name: "S4D Geliştirme" }));
  fireEvent.click(await screen.findByRole("button", { name: /^SE38 S4D/ }));
}

// Ağaç satırındaki açma oku: adın durduğu satırın ilk düğmesi.
function chevronOf(name: string) {
  return screen.getByText(name).parentElement!.querySelector("button")!;
}

describe("Script ağacı (taşıma öncesi davranış)", () => {
  it("oturum seçilince ağacın kökü o oturumdan okunuyor", async () => {
    renderScript();
    await openSession();
    expect(await screen.findByText("wnd[0]")).toBeTruthy();
    expect(api.getGuiScriptNode).toHaveBeenCalledWith(0, 0, null, undefined);
    expect(api.getGuiScriptScreen).toHaveBeenCalledWith(0, 0);
  });

  it("düğüm açılınca çocukları okunuyor", async () => {
    renderScript();
    await openSession();
    await screen.findByText("wnd[0]");
    fireEvent.click(chevronOf("wnd[0]"));
    expect(await screen.findByText("usr")).toBeTruthy();
    fireEvent.click(chevronOf("usr"));
    expect(await screen.findByText("RS38M-PROGRAMM")).toBeTruthy();
    expect(api.getGuiScriptNode).toHaveBeenCalledWith(0, 0, "wnd[0]/usr", undefined);
  });
});
```

- [ ] **Adım 2: Testin bugünkü kodla GEÇTİĞİNİ gör**

Çalıştır: `npx vitest run tests/scriptBehaviour.test.tsx`
Beklenen: PASS (2 test). Bu testler kırılan test değil; bugünkü davranışı çiviliyor.

Kırılırsa kodu değil testi düzelt. Muhtemel sebepler:
- Düğmenin erişilebilir adı farklı. Bugün bağlantı düğmesi `conn.description`, oturum düğmesi "işlem + sistem · istemci · kullanıcı".
- `wnd[0]` metni ekranda iki yerde çıkıyor.

Kodda bir şeyi değiştirmen gerekiyorsa DUR ve sor.

- [ ] **Adım 3: Taşıma öncesi testleri commit'le**

```bash
git add tests/scriptApiFake.tsx tests/scriptBehaviour.test.tsx
git commit -m "Grafit: script agaci icin tasima oncesi davranis testleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Adım 4: Store için kırılan testi yaz**

`tests/scriptStore.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SapGuiScriptingHome from "../src/components/SapGuiScriptingHome";
import ScriptSidebar from "../src/components/ScriptSidebar";
import {
  ScriptStoreProvider,
  useScriptCommands,
  useScriptStore,
  type ScriptCommands,
  type ScriptStore
} from "../src/stores/scriptStore";
import { installScriptApi, type ScriptApiFake } from "./scriptApiFake";

let store: ScriptStore;
let commands: ScriptCommands;
function Probe() {
  store = useScriptStore();
  commands = useScriptCommands();
  return null;
}

// `show` false iken ekran ve kenar çubuğu unmount oluyor: kullanıcının başka
// bir moda geçmesi. Store yerinde kalıyor, `App`'teki gibi.
function Harness({ show }: { show: boolean }) {
  return (
    <LanguageProvider language="tr">
      <ScriptStoreProvider>
        <Probe />
        {show && (
          <>
            <ScriptSidebar />
            <SapGuiScriptingHome activeSap={null} />
          </>
        )}
      </ScriptStoreProvider>
    </LanguageProvider>
  );
}

let api: ScriptApiFake;
beforeEach(() => {
  api = installScriptApi();
});
afterEach(cleanup);

async function openSession() {
  fireEvent.click(await screen.findByRole("button", { name: "S4D Geliştirme" }));
  fireEvent.click(await screen.findByRole("button", { name: /^SE38 S4D/ }));
  await screen.findByText("wnd[0]");
}

const noop: ScriptCommands = {
  selectSession() {},
  toggleConn() {},
  toggleNode() {},
  selectElement() {}
};

describe("ScriptStore", () => {
  it("Provider olmadan kullanılırsa açık bir hata veriyor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ScriptStoreProvider/);
    spy.mockRestore();
  });

  it("komutlar kayıttan önce sessiz, sonra kayda gidiyor; aracının kimliği değişmiyor", () => {
    render(<Harness show={false} />);
    const first = commands;
    expect(() => commands.selectSession(0, 0)).not.toThrow();
    const selectSession = vi.fn();
    let off = () => {};
    act(() => {
      off = store.registerScriptCommands({ ...noop, selectSession });
    });
    commands.selectSession(1, 2);
    expect(selectSession).toHaveBeenCalledWith(1, 2);
    act(() => off());
    commands.selectSession(3, 4);
    expect(selectSession).toHaveBeenCalledTimes(1);
    expect(commands).toBe(first);
  });

  it("eski kaydın iptali yeni kaydı silmiyor", () => {
    render(<Harness show={false} />);
    const a = vi.fn();
    const b = vi.fn();
    let offA = () => {};
    act(() => {
      offA = store.registerScriptCommands({ ...noop, toggleNode: a });
      store.registerScriptCommands({ ...noop, toggleNode: b });
    });
    act(() => offA());
    commands.toggleNode("x");
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith("x");
  });

  it("clearSelection seçimi, düğümleri ve seçili öğeyi temizliyor", () => {
    render(<Harness show={false} />);
    act(() => {
      store.setActiveSession({ connIdx: 0, sessIdx: 0 });
      store.setNodesByKey({ "0:0:__root__": "loading" });
      store.setExpandedNodes({ "0:0:__root__": true });
      store.setSelectedElementId("wnd[0]");
    });
    act(() => store.clearSelection());
    expect(store.activeSession).toBeNull();
    expect(store.nodesByKey).toEqual({});
    expect(store.expandedNodes).toEqual({});
    expect(store.selectedElementId).toBe("");
  });
});

describe("Script'ten çıkıp dönmek", () => {
  it("seçim ve ağaç korunuyor, oturum hâlâ açıksa bağlam yeniden yayımlanıyor", async () => {
    const view = render(<Harness show />);
    await openSession();
    view.rerender(<Harness show={false} />);
    expect(store.activeSession).toEqual({ connIdx: 0, sessIdx: 0 });

    api.getGuiScriptNode.mockClear();
    api.getGuiScriptScreen.mockClear();
    api.setActiveGuiContext.mockClear();
    view.rerender(<Harness show />);

    // Eski ağaç istek beklemeden görünüyor.
    expect(screen.getByText("wnd[0]")).toBeTruthy();
    await waitFor(() => expect(api.getGuiScriptScreen).toHaveBeenCalledWith(0, 0));
    await waitFor(() =>
      expect(api.setActiveGuiContext).toHaveBeenCalledWith(
        expect.objectContaining({ connectionIndex: 0, sessionIndex: 0, transaction: "SE38" })
      )
    );
    expect(screen.getByRole("button", { name: /^SE38 S4D/ }).getAttribute("aria-current")).toBe("true");
    // Düğümler önbellekten geliyor.
    expect(api.getGuiScriptNode).not.toHaveBeenCalled();
  });

  it("seçili oturum arada kapandıysa seçim temizleniyor ve eski oturuma istek gitmiyor", async () => {
    const view = render(<Harness show />);
    await openSession();
    fireEvent.click(screen.getByText("wnd[0]"));
    await waitFor(() => expect(store.selectedElementId).toBe("wnd[0]"));
    view.rerender(<Harness show={false} />);

    api.listGuiScriptSessions.mockResolvedValue({ ok: true, sessions: [] });
    api.getGuiScriptNode.mockClear();
    api.getGuiScriptScreen.mockClear();
    api.captureGuiScriptScreenshot.mockClear();
    view.rerender(<Harness show />);

    await waitFor(() => expect(store.activeSession).toBeNull());
    expect(store.nodesByKey).toEqual({});
    expect(store.expandedNodes).toEqual({});
    expect(store.selectedElementId).toBe("");
    expect(screen.getByText("Ekran ağacını görmek için sol taraftan bir oturum seç.")).toBeTruthy();
    expect(api.getGuiScriptNode).not.toHaveBeenCalled();
    expect(api.getGuiScriptScreen).not.toHaveBeenCalled();
    // Oturumsuz `window` yakalaması (ilk iki argüman null) serbest; oturuma giden yok.
    expect(api.captureGuiScriptScreenshot.mock.calls.filter((call) => call[0] !== null)).toEqual([]);
  });

  it("köprü arada kapandıysa ağaç temizleniyor ve kenar çubuğu 'Köprü kapalı' diyor", async () => {
    const view = render(<Harness show />);
    await openSession();
    view.rerender(<Harness show={false} />);

    api.getGuiScriptBridgeStatus.mockResolvedValue({ running: false, port: null, external: false });
    view.rerender(<Harness show />);

    await waitFor(() => expect(store.connections).toBeNull());
    expect(store.activeSession).toBeNull();
    expect(await screen.findByText("Köprü kapalı")).toBeTruthy();
  });
});
```

- [ ] **Adım 5: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/scriptStore.test.tsx`
Beklenen: FAIL, `Failed to resolve import "../src/components/ScriptSidebar"` (ya da `../src/stores/scriptStore`).

- [ ] **Adım 6: `src/stores/scriptTypes.ts`'i yaz**

`SapGuiScriptingHome.tsx`'teki tanımlar birebir buraya taşınıyor. Dosya CRLF.

```ts
import type { GuiScriptComponentDetail } from "../../app-electron/shared/types";

// Script ağacının ortak türleri: ekran (`SapGuiScriptingHome`), store ve
// kenar çubuğu (`ScriptSidebar`) aynı anahtarlarla konuşuyor.

export type NodeState = GuiScriptComponentDetail | "loading" | "error";

export interface SelectedSession {
  connIdx: number;
  sessIdx: number;
}

export const ROOT_KEY = "__root__";

export function nodeKey(connIdx: number, sessIdx: number, elementId: string): string {
  return `${connIdx}:${sessIdx}:${elementId || ROOT_KEY}`;
}
```

- [ ] **Adım 7: `src/stores/scriptStore.tsx`'i yaz**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
import type { GuiScriptConnectionInfo, GuiScriptSessionInfo } from "../../app-electron/shared/types";
import type { NodeState, SelectedSession } from "./scriptTypes";

// Script ekranının AĞAÇ verisinin sahibi (grafit, spec §5.2). Ekran
// (`SapGuiScriptingHome`) başka bir moda geçilince unmount oluyor. Veri
// burada durduğu için seçili oturum ve açık düğümler dönüşte kaybolmuyor.
// Köprüyle konuşan HİÇBİR ŞEY burada değil: ekran kapalıyken arka planda
// istek atılmıyor.

export type ConnectionsState = GuiScriptConnectionInfo[] | "loading" | "error" | null;
export type SessionsByConn = Record<number, GuiScriptSessionInfo[] | "loading" | "error">;

// Köprüye dokunan işler ekranda kalıyor. Ekran bunları
// `registerScriptCommands` ile bırakıyor, kenar çubuğu `useScriptCommands`
// ile çağırıyor.
export interface ScriptCommands {
  selectSession(connIdx: number, sessIdx: number): void;
  toggleConn(connIdx: number): void;
  toggleNode(elementId: string): void;
  selectElement(elementId: string): void;
}

export interface ScriptStore {
  connections: ConnectionsState;
  setConnections: Dispatch<SetStateAction<ConnectionsState>>;
  sessionsByConn: SessionsByConn;
  setSessionsByConn: Dispatch<SetStateAction<SessionsByConn>>;
  expandedConn: Record<number, boolean>;
  setExpandedConn: Dispatch<SetStateAction<Record<number, boolean>>>;
  activeSession: SelectedSession | null;
  setActiveSession: Dispatch<SetStateAction<SelectedSession | null>>;
  nodesByKey: Record<string, NodeState>;
  setNodesByKey: Dispatch<SetStateAction<Record<string, NodeState>>>;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: Dispatch<SetStateAction<Record<string, boolean>>>;
  selectedElementId: string;
  setSelectedElementId: Dispatch<SetStateAction<string>>;
  // Köprü çalışıyor ve teşhis ekranı gösterilmiyor mu? Ekran yazıyor, kenar
  // çubuğu okuyor. false iken ağaç yerine "Köprü kapalı" çiziliyor.
  treeVisible: boolean;
  setTreeVisible: Dispatch<SetStateAction<boolean>>;
  clearSelection(): void;
  registerScriptCommands(commands: ScriptCommands): () => void;
}

interface ScriptStoreContextValue extends ScriptStore {
  commands: ScriptCommands;
}

const ScriptStoreContext = createContext<ScriptStoreContextValue | null>(null);

export function ScriptStoreProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<ConnectionsState>(null);
  const [sessionsByConn, setSessionsByConn] = useState<SessionsByConn>({});
  const [expandedConn, setExpandedConn] = useState<Record<number, boolean>>({});
  const [activeSession, setActiveSession] = useState<SelectedSession | null>(null);
  const [nodesByKey, setNodesByKey] = useState<Record<string, NodeState>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedElementId, setSelectedElementId] = useState("");
  const [treeVisible, setTreeVisible] = useState(false);

  // Seçili oturuma bağlı her şey birlikte gidiyor. Yarım bir temizlik
  // (örneğin seçili öğe kalıp oturum gitse) denetçiyi var olmayan bir
  // öğeyi göstermeye bırakırdı.
  const clearSelection = useCallback(() => {
    setActiveSession(null);
    setNodesByKey({});
    setExpandedNodes({});
    setSelectedElementId("");
  }, []);

  // Kayıtlı komutlar bir ref'te: kenar çubuğunun elindeki aracı (`commands`)
  // hiç değişmiyor, her çağrıda o anki kaydı okuyor. Kayıt yokken çağrı
  // hiçbir şey yapmıyor.
  const registeredRef = useRef<ScriptCommands | null>(null);
  const registerScriptCommands = useCallback((next: ScriptCommands) => {
    registeredRef.current = next;
    return () => {
      // Yalnızca HÂLÂ bu kayıt duruyorsa temizle: yeniden çizimde yeni kayıt
      // eskisinin iptalinden önce gelirse, eski iptal yeniyi silmesin.
      if (registeredRef.current === next) registeredRef.current = null;
    };
  }, []);
  const commands = useMemo<ScriptCommands>(
    () => ({
      selectSession: (connIdx, sessIdx) => registeredRef.current?.selectSession(connIdx, sessIdx),
      toggleConn: (connIdx) => registeredRef.current?.toggleConn(connIdx),
      toggleNode: (elementId) => registeredRef.current?.toggleNode(elementId),
      selectElement: (elementId) => registeredRef.current?.selectElement(elementId)
    }),
    []
  );

  const value = useMemo<ScriptStoreContextValue>(
    () => ({
      connections,
      setConnections,
      sessionsByConn,
      setSessionsByConn,
      expandedConn,
      setExpandedConn,
      activeSession,
      setActiveSession,
      nodesByKey,
      setNodesByKey,
      expandedNodes,
      setExpandedNodes,
      selectedElementId,
      setSelectedElementId,
      treeVisible,
      setTreeVisible,
      clearSelection,
      registerScriptCommands,
      commands
    }),
    [
      connections,
      sessionsByConn,
      expandedConn,
      activeSession,
      nodesByKey,
      expandedNodes,
      selectedElementId,
      treeVisible,
      clearSelection,
      registerScriptCommands,
      commands
    ]
  );

  return <ScriptStoreContext.Provider value={value}>{children}</ScriptStoreContext.Provider>;
}

function useScriptStoreContext(): ScriptStoreContextValue {
  const value = useContext(ScriptStoreContext);
  if (!value) throw new Error("useScriptStore yalnızca ScriptStoreProvider içinde kullanılabilir");
  return value;
}

export function useScriptStore(): ScriptStore {
  return useScriptStoreContext();
}

export function useScriptCommands(): ScriptCommands {
  return useScriptStoreContext().commands;
}
```

- [ ] **Adım 8: i18n anahtarını ekle**

`src/i18n/tr.ts`'te `"sapGuiScripting.bridgeStopped"` satırının (bugün ~813) altına:

```ts
  "sapGuiScripting.bridgeOff": "Köprü kapalı",
```

`src/i18n/en.ts`'te aynı yere (bugün ~745):

```ts
  "sapGuiScripting.bridgeOff": "Bridge is off",
```

- [ ] **Adım 9: `src/components/ScriptSidebar.tsx`'i yaz**

İskelet:

```tsx
import { ChevronDown, ChevronRight, ListTree, Network, Plug } from "lucide-react";
import { useT } from "../i18n";
import { useScriptCommands, useScriptStore } from "../stores/scriptStore";
import { nodeKey } from "../stores/scriptTypes";
import type { GuiScriptComponentSummary } from "../../app-electron/shared/types";
import { CountBadge, EmptyState, PanelHeader } from "./sapgui/ui";

// Script modunun kenar çubuğu (grafit, spec §5.2): bağlantılar → oturumlar,
// altında seçili oturumun ekran ağacı. Veri `ScriptStore`'da. Köprüye
// dokunan her tıklama `useScriptCommands` üzerinden ekrana gidiyor. Kendi
// durumu yok.
export default function ScriptSidebar() {
  const t = useT();
  const {
    connections,
    sessionsByConn,
    expandedConn,
    activeSession,
    nodesByKey,
    expandedNodes,
    selectedElementId,
    treeVisible
  } = useScriptStore();
  const commands = useScriptCommands();

  // Köprü kapalıyken ya da teşhis ekranı açıkken ağacın gösterecek bir
  // şeyi yok. Eski liste burada dursaydı tıklanabilir görünürdü, ama
  // tıklamanın karşılığı olmazdı.
  if (!treeVisible) {
    return <EmptyState icon={<Plug size={20} />} text={t("sapGuiScripting.bridgeOff")} />;
  }

  // BURAYA: Home'daki renderTreeNode (Adım 10'daki tabloyla)

  const rootKey = activeSession ? nodeKey(activeSession.connIdx, activeSession.sessIdx, "") : "";
  const rootState = activeSession ? nodesByKey[rootKey] : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* BURAYA: Home'daki sol panelin iki bölümü (Adım 10) */}
    </div>
  );
}
```

`useT`, `useScriptStore` ve `useScriptCommands` erken dönüşten **önce** çağrılıyor. Hook sırası değişmesin.

- [ ] **Adım 10: Ağacı ve listeyi taşı**

Şu iki parçayı `SapGuiScriptingHome.tsx`'ten keserek `ScriptSidebar`'daki iki `BURAYA` yorumunun yerine koy:

1. `renderTreeNode` (bugün ~627–684), üstündeki boşlukla.
2. Sol panelin **içi** (bugün ~1028–1114): `<div className="flex max-h-[45%] …">` ile başlayan bağlantılar bölümü ve `<div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line">` ile başlayan ağaç bölümü.

Dıştaki `<div className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar">` ve üstündeki `{/* Sol: … */}` yorumu **taşınmıyor, siliniyor**. Genişlik ve kenarlık artık kabuğun işi (bu görevde `App`'teki geçici `aside`, Görev 14'te `Sidebar`).

Taşırken şunları değiştir:

| Bugün | Taşındıktan sonra |
|---|---|
| `onClick={() => toggleConn(conn.index)}` | `onClick={() => commands.toggleConn(conn.index)}` |
| `onClick={() => handleSelectSession(conn.index, session.index)}` | `onClick={() => commands.selectSession(conn.index, session.index)}` |
| `onClick={() => handleSelectElement(summary.id)}` | `onClick={() => commands.selectElement(summary.id)}` |
| `toggleNode(summary.id);` | `commands.toggleNode(summary.id);` |
| `text-[10px]`, `text-[11px]` | `text-2xs` |
| oturum düğmesi (`key={session.index}`) | ayrıca `aria-current={isActive ? "true" : undefined}` |

Başka hiçbir sınıfa ve metne dokunma. Kenar çubuğunun yeni yoğunluğu (28px satırlar) Görev 14'ün işi değil; Script ağacının satırları bugünkü yüksekliğinde kalıyor.

- [ ] **Adım 11: `SapGuiScriptingHome.tsx`'i store'a bağla**

1. Import'lar. `useLayoutEffect`'i React import'una ekle, sonra şunları ekle:

```ts
import { useScriptStore, type ScriptCommands, type SessionsByConn } from "../stores/scriptStore";
import { nodeKey, type NodeState, type SelectedSession } from "../stores/scriptTypes";
```

2. `type NodeState …`, `interface SelectedSession …`, `const ROOT_KEY …` (bugün ~55–62) ve `function nodeKey …` (~91–93) tanımlarını sil.

3. Yedi `useState`'i (bugün ~186–193) şununla değiştir:

```ts
  // Ağaç verisi store'da (grafit, spec §5.2): bu ekran başka bir moda
  // geçilince unmount oluyor, seçili oturum ve açık düğümler dönüşte
  // yerinde dursun.
  const {
    connections,
    setConnections,
    sessionsByConn,
    setSessionsByConn,
    expandedConn,
    setExpandedConn,
    activeSession,
    setActiveSession,
    nodesByKey,
    setNodesByKey,
    expandedNodes,
    setExpandedNodes,
    selectedElementId,
    setSelectedElementId,
    setTreeVisible,
    clearSelection,
    registerScriptCommands
  } = useScriptStore();
```

4. `refreshStatus`'u (bugün ~223–227) şöyle yap. Altındaki `useEffect(() => { refreshStatus(); }, [refreshStatus]);` efektini **sil**; yerini madde 7'deki efekt alıyor.

```ts
  // Durum bir kez okunmadan kenar çubuğuna "görünür/görünmez" yazılmıyor
  // (bkz. `treeVisible` efekti). Aksi hâlde dönüşte ağaç bir kare
  // "Köprü kapalı"ya düşüp geri gelirdi.
  const [statusKnown, setStatusKnown] = useState(false);
  const refreshStatus = useCallback(async () => {
    const next = await window.api.getGuiScriptBridgeStatus();
    setStatus(next);
    setStatusKnown(true);
    return next;
  }, []);
```

5. `loadConnections`'ın hemen altına:

```ts
  // Köprü yokken ağaç da yok. Durdurma düğmesi ve dönüşte köprünün
  // kapanmış bulunması aynı temizliği yapıyor.
  const clearTree = useCallback(() => {
    setConnections(null);
    setSessionsByConn({});
    setExpandedConn({});
    clearSelection();
  }, [setConnections, setSessionsByConn, setExpandedConn, clearSelection]);
```

`handleStop`'taki altı satırı (`setConnections(null);` … `setSelectedElementId("");`, bugün ~299–304) `clearTree();` ile değiştir. `useCallback` bağımlılığı `[]` → `[clearTree]`.

6. `refreshScreen`'in (bugün ~371–378) hemen altına dönüş doğrulamasını ekle:

```ts
  // DÖNÜŞ: mount anında store'da bir bağlantı listesi (ya da yarım kalmış
  // bir yükleme, ya da hatası) varsa kullanıcı bu ekrana daha önce gelmiş,
  // başka bir moda geçip dönmüş demektir. Eski
  // ağaç hemen görünüyor, arada SAP tarafında olanlar burada doğrulanıyor.
  // Liste "loading"e çekilmiyor: doğrulama sürerken eski liste görünür
  // kalsın.
  //
  // Seçili oturum arada kapandıysa (SAP'de pencere kapatıldı, SAP Logon
  // yeniden açıldı) ona İSTEK GİTMİYOR. Seçim, düğümler ve seçili öğe
  // temizleniyor. Oturum hâlâ duruyorsa ekran bilgisi tazeleniyor, bu da
  // aktif GUI bağlamını yeniden yayımlıyor. `activeSession` ve
  // `expandedConn` mount anındaki değerler: doğrulanan şey tam olarak
  // kullanıcının bıraktığı durum.
  const returning = useRef(connections !== null);
  const revalidateAfterReturn = async () => {
    const result = await window.api.listGuiScriptConnections();
    if (!result.ok || !result.connections) {
      setConnections("error");
      clearSelection();
      return;
    }
    const alive = new Set(result.connections.map((c) => c.index));
    setConnections(result.connections);
    const selected = activeSession;
    const toRead = Object.keys(expandedConn)
      .map(Number)
      .filter((idx) => expandedConn[idx] && alive.has(idx));
    if (selected && alive.has(selected.connIdx) && !toRead.includes(selected.connIdx)) toRead.push(selected.connIdx);
    const lists: SessionsByConn = {};
    await Promise.all(
      toRead.map(async (idx) => {
        const r = await window.api.listGuiScriptSessions(idx);
        lists[idx] = r.ok && r.sessions ? r.sessions : "error";
      })
    );
    setSessionsByConn(lists);
    setExpandedConn((prev) => Object.fromEntries(Object.entries(prev).filter(([idx]) => alive.has(Number(idx)))));
    if (!selected) return;
    const sessions = lists[selected.connIdx];
    if (!Array.isArray(sessions) || !sessions.some((s) => s.index === selected.sessIdx)) {
      clearSelection();
      return;
    }
    refreshScreen(selected);
    refreshScreenshot(selected);
  };
```

7. `revalidateAfterReturn`'ün hemen altına, madde 4'te silinen efektin yerine:

```ts
  useEffect(() => {
    (async () => {
      const next = await refreshStatus();
      if (!returning.current) return;
      if (next.running) await revalidateAfterReturn();
      else clearTree();
    })();
    // Yalnızca mount'ta: dönüş bir kez doğrulanıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

`autoLoadTried` efektine (bugün ~272–277) dokunma. Dönüşte `connections` `null` olmadığı için o efekt zaten çalışmıyor. İlk gelişte (`connections === null`) bugünkü gibi yüklüyor.

Aktif GUI bağlamı efektine (bugün ~380–413) de dokunma. Dönüşte ilk karede `screen` henüz yok, efekt bir kez `null` yayımlıyor; `refreshScreen` bitince bağlam geri geliyor. Unmount'ta temizlik yapılmaması bilerek (efektin yorumu).

8. `handleSelectElement`'in (bugün ~461–467) hemen altına komut kaydını ekle:

```ts
  // Kenar çubuğunun çağırdığı işler (bkz. stores/scriptStore.tsx
  // `ScriptCommands`). Ref üzerinden: kayıt bir kere yapılıyor, her çağrı o
  // anki fonksiyona gidiyor. Kayıt `useLayoutEffect`'te, yani ilk boyamadan
  // önce: kullanıcı ilk karede tıklasa da komut boşa düşmüyor.
  const commandsRef = useRef<ScriptCommands>({
    selectSession: handleSelectSession,
    toggleConn,
    toggleNode,
    selectElement: handleSelectElement
  });
  commandsRef.current = {
    selectSession: handleSelectSession,
    toggleConn,
    toggleNode,
    selectElement: handleSelectElement
  };
  useLayoutEffect(
    () =>
      registerScriptCommands({
        selectSession: (connIdx, sessIdx) => commandsRef.current.selectSession(connIdx, sessIdx),
        toggleConn: (connIdx) => commandsRef.current.toggleConn(connIdx),
        toggleNode: (elementId) => commandsRef.current.toggleNode(elementId),
        selectElement: (elementId) => commandsRef.current.selectElement(elementId)
      }),
    [registerScriptCommands]
  );
```

9. `preflightVisible`'ın (bugün ~701) hemen altına:

```ts
  // Kenar çubuğu ağacı yalnızca çalışma alanı açıkken gösteriyor.
  useEffect(() => {
    if (statusKnown) setTreeVisible(status.running && !preflightVisible);
  }, [statusKnown, status.running, preflightVisible, setTreeVisible]);
```

10. Sol panelin dış `div`'i Adım 10'da silindi. Çalışma alanı satırı (`<div className="flex min-h-0 flex-1 overflow-hidden">`, bugün ~1025) artık `ScreenViewer` ile başlıyor.

11. Kullanılmayan import'ları sil. Beklenenler:
- lucide'dan `ChevronDown`, `ChevronRight`, `Network`
- `./sapgui/ui`'den `EmptyState`
- türlerden `GuiScriptComponentDetail`, `GuiScriptComponentSummary`, `GuiScriptConnectionInfo`, `GuiScriptSessionInfo`

`ListTree`, `CountBadge` ve `PanelHeader` ekranın başka yerlerinde de kullanılıyor olabilir. Neyin kaldığını Adım 14'teki tip denetimi söylüyor.

- [ ] **Adım 12: `App.tsx`'te store'u ve geçici kenar çubuğunu ekle**

1. Import'lar (`SapGuiScriptingHome` import'unun yanına):

```ts
import ScriptSidebar from "./components/ScriptSidebar";
import { ScriptStoreProvider } from "./stores/scriptStore";
```

2. Görev 10'da eklenen `<ChatStoreProvider pushToast={pushToast}>` açılışının hemen altına `<ScriptStoreProvider>`, `</ChatStoreProvider>` kapanışının hemen üstüne `</ScriptStoreProvider>`.

3. `sapGuiScripting` dalını (bugün ~1107–1108):

```tsx
        ) : activity === "sapGuiScripting" ? (
          <SapGuiScriptingHome activeSap={activeContext.sap} />
```

şöyle yap (dalın başındaki `{activity === "axetCode" ? null :` aynen kalıyor):

```tsx
        ) : activity === "sapGuiScripting" ? (
          // Geçici: Görev 14'te kabuğun `Sidebar`'ı bu `aside`'ın yerini alıyor.
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="flex w-[264px] shrink-0 flex-col border-r border-line-subtle bg-sidebar">
              <ScriptSidebar />
            </aside>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <SapGuiScriptingHome activeSap={activeContext.sap} />
            </div>
          </div>
```

- [ ] **Adım 13: Taşıma öncesi testin yardımcısını güncelle**

`tests/scriptBehaviour.test.tsx`'te import'lara ekle:

```tsx
import ScriptSidebar from "../src/components/ScriptSidebar";
import { ScriptStoreProvider } from "../src/stores/scriptStore";
```

`renderScript`'i şöyle yap (`it` gövdelerine ve `openSession`/`chevronOf`'a dokunma):

```tsx
function renderScript() {
  return render(
    <LanguageProvider language="tr">
      <ScriptStoreProvider>
        <ScriptSidebar />
        <SapGuiScriptingHome activeSap={null} />
      </ScriptStoreProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Adım 14: Testleri çalıştır**

Çalıştır: `npx vitest run tests/scriptStore.test.tsx tests/scriptBehaviour.test.tsx tests/i18n.test.ts`
Beklenen: PASS. `scriptStore`'da 7 test. `scriptBehaviour`'ın iki testi gövdeleri değişmeden yeşil.

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok. Taşıma `text-[..px]` sayısını düşürdüyse `tests/designScale.test.ts`'teki üst sınıra **dokunma**; cırcır Görev 17'de ölçülerek iniyor.

- [ ] **Adım 15: Commit**

```bash
git add src/stores/scriptTypes.ts src/stores/scriptStore.tsx src/components/ScriptSidebar.tsx src/components/SapGuiScriptingHome.tsx src/i18n/tr.ts src/i18n/en.ts src/App.tsx tests/scriptStore.test.tsx tests/scriptBehaviour.test.tsx
git commit -m "Grafit: script agaci ScriptStore ve ScriptSidebar'a tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 13: `LogonSidebar`

Logon ekranının sol panelinin içi `App.tsx`'ten `src/components/LogonSidebar.tsx`'e çıkıyor (spec §5.3). Taşınanlar:
- Sistemler/Dosyalar geçişi
- `RecentSystems`
- sistem ağacı (`Tree`)
- `FileExplorer`

Arama kutusu da üst şeritten buraya iniyor.

Veri `App`'te kalıyor ve bileşene prop olarak geçiyor. Bu bileşenin kendi durumu yok.

Panelin dış kabuğu bu görevde `App`'te kalıyor: genişlik, daraltma düğmesi ve sürükleme tutamacı. Görev 14 kabuğu `Sidebar`'a alıyor, Görev 15 genişliği ve daraltmayı ayara bağlıyor.

Üst şeritte dört düğme kalıyor: Sistem Ekle, SAP Logon'dan Getir, Terminal ve Yenile. Arama kutusunun yerine boş bir `flex-1` geliyor, böylece düğmeler bugünkü gibi iki yana yaslanıyor.

İki davranış kararı:

- **Dosyalar görünümünde arama kutusu duruyor.** Arama yalnızca sistemleri süzüyor. Dosyalar görünümündeyken kutuya yazmak Sistemler görünümüne geçiriyor. Böylece Ctrl+F'nin (ve Görev 16'da `/`'nin) her zaman odaklayacağı bir kutu var.
- **Ctrl+F kenar çubuğu daraltılmışken onu açıyor.** Bugün kutu üst şeritte olduğu için daraltma onu gizlemiyordu. Kutu artık kenar çubuğunda; açmadan odaklamak hiçbir şey yapmamak olurdu.

**Dosyalar:**
- Yarat: `src/components/LogonSidebar.tsx`
- Değiştir: `src/App.tsx`:
  - import'lar
  - Ctrl+F efekti (bugün ~434–443)
  - üst şeritteki arama kutusu (~1181–1203)
  - `aside`'ın içi (~1241–1311)
- Test: `tests/logonSidebar.test.tsx`

**Arayüzler:**
- Tüketir: `RecentSystems`, `Tree`, `FileExplorer`, `useT`; Görev 10'dan `RecentEntry` (`src/stores/chatTypes.ts`). Türler `app-electron/shared/types.ts`'ten: `ConnectivityState`, `FsEntry`, `FsImportFilesResult`, `SapNode`, `SapService`, `SystemTier`.
- Üretir:
  - `export type LogonPanelMode = "systems" | "files"`
  - `export interface LogonFilesView { rootDir: string; rootLabel: string; selectedPath: string | null; onSelectFile(entry: FsEntry): void; onImportComplete(result: FsImportFilesResult, destDir: string): void; onRootPicked(dir: string): void }`
  - `export interface LogonSidebarProps { search: string; onSearchChange(value: string): void; searchInputRef: RefObject<HTMLInputElement>; mode: LogonPanelMode; onModeChange(mode: LogonPanelMode): void; files: LogonFilesView | null; loading: boolean; customers: SapNode[]; recentEntries: RecentEntry[]; selectedUuid: string | null; connectivity: Record<string, ConnectivityState>; tierOverrides: Record<string, SystemTier>; onSelect(path: string[], service: SapService, itemUuid: string): void }`
  - `export default function LogonSidebar(props: LogonSidebarProps)`
  - Arama kutusunda `data-sidebar-search` niteliği. Görev 16'daki `/` kısayolu kutuyu bununla buluyor.

- [ ] **Adım 1: Kırılan testi yaz**

`tests/logonSidebar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import LogonSidebar, { type LogonSidebarProps } from "../src/components/LogonSidebar";
import type { SapNode, SapService } from "../app-electron/shared/types";

afterEach(cleanup);

const SERVICE: SapService = {
  uuid: "svc-1",
  systemId: "S4D",
  name: "S4D Geliştirme",
  type: "SAPGUI",
  host: "s4d.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

const CUSTOMERS: SapNode[] = [
  { uuid: "cust-1", name: "Test Müşteri", nodes: [], items: [{ uuid: "item-1", service: SERVICE }] }
];

function renderSidebar(overrides: Partial<LogonSidebarProps> = {}) {
  const props: LogonSidebarProps = {
    search: "",
    onSearchChange: vi.fn(),
    searchInputRef: createRef<HTMLInputElement>(),
    mode: "systems",
    onModeChange: vi.fn(),
    files: null,
    loading: false,
    customers: CUSTOMERS,
    recentEntries: [
      { path: ["Test Müşteri"], service: SERVICE, itemUuid: "item-1", connectedAt: "2026-09-29T08:00:00.000Z" }
    ],
    selectedUuid: null,
    connectivity: {},
    tierOverrides: {},
    onSelect: vi.fn(),
    ...overrides
  };
  render(
    <LanguageProvider language="tr">
      <LogonSidebar {...props} />
    </LanguageProvider>
  );
  return props;
}

const FILES = {
  rootDir: "C:/proje",
  rootLabel: "S4D",
  selectedPath: null,
  onSelectFile: vi.fn(),
  onImportComplete: vi.fn(),
  onRootPicked: vi.fn()
};

function searchBox() {
  return screen.getByRole("textbox", { name: "Müşteri veya sistem ara… (Ctrl+F)" });
}

describe("LogonSidebar", () => {
  it("arama kutusu kenar çubuğunda; yazılan App'e gidiyor ve ref kutuya bağlı", () => {
    const props = renderSidebar();
    const input = searchBox();
    expect(input.hasAttribute("data-sidebar-search")).toBe(true);
    expect(props.searchInputRef.current).toBe(input);
    fireEvent.change(input, { target: { value: "s4d" } });
    expect(props.onSearchChange).toHaveBeenCalledWith("s4d");
  });

  it("Escape ve temizle düğmesi aramayı boşaltıyor", () => {
    const props = renderSidebar({ search: "s4d" });
    fireEvent.keyDown(searchBox(), { key: "Escape" });
    expect(props.onSearchChange).toHaveBeenLastCalledWith("");
    fireEvent.click(screen.getByRole("button", { name: "Aramayı temizle" }));
    expect(props.onSearchChange).toHaveBeenCalledTimes(2);
  });

  it("son bağlanılanlar yalnızca arama boşken görünüyor", () => {
    renderSidebar();
    expect(screen.getByText("Son Bağlanılanlar")).toBeTruthy();
    expect(screen.getByText("Test Müşteri")).toBeTruthy();
    cleanup();
    renderSidebar({ search: "s4d" });
    expect(screen.queryByText("Son Bağlanılanlar")).toBeNull();
  });

  it("liste ilk kez yüklenirken yükleniyor yazıyor", () => {
    renderSidebar({ loading: true, customers: [] });
    expect(screen.getByText("Yükleniyor…")).toBeTruthy();
    expect(screen.queryByText("Test Müşteri")).toBeNull();
  });

  it("dosya görünümü yoksa geçiş düğmeleri de yok", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: "Dosya gezgini" })).toBeNull();
  });

  it("dosya görünümü varken geçiş düğmeleri modu değiştiriyor", () => {
    const props = renderSidebar({ files: FILES });
    const systems = screen.getByRole("button", { name: "Sistem listesi" });
    expect(systems.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Dosya gezgini" }));
    expect(props.onModeChange).toHaveBeenCalledWith("files");
  });

  it("dosyalar görünümünde aramaya yazmak sistemlere geçiriyor", () => {
    // `FileExplorer` açılışta klasörü okuyor; cevap hiç gelmiyor, konumuz değil.
    (window as unknown as { api: unknown }).api = new Proxy(
      {},
      { get: (_t, k: string) => (k.startsWith("on") ? () => () => {} : () => new Promise(() => {})) }
    );
    const props = renderSidebar({ files: FILES, mode: "files" });
    expect(screen.queryByText("Test Müşteri")).toBeNull();
    fireEvent.change(searchBox(), { target: { value: "s4d" } });
    expect(props.onModeChange).toHaveBeenCalledWith("systems");
    expect(props.onSearchChange).toHaveBeenCalledWith("s4d");
  });
});
```

- [ ] **Adım 2: Testin kırıldığını gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx`
Beklenen: FAIL, `Failed to resolve import "../src/components/LogonSidebar"`.

- [ ] **Adım 3: `src/components/LogonSidebar.tsx`'i yaz**

Dosya CRLF. Arama kutusunun sınıfları üst şeritteki kutudan geliyor, yalnızca iki fark var:
- Kutu `h-8`: kenar çubuğunun satırları üst şeritten sık.
- Yazı `text-xs`: bugünkü `text-[12px]`'nin ölçekteki karşılığı.

Liste gövdesi `App`'teki `aside`'dan birebir geliyor.

```tsx
import type { RefObject } from "react";
import { FolderTree, Search, Server, X } from "lucide-react";
import type {
  ConnectivityState,
  FsEntry,
  FsImportFilesResult,
  SapNode,
  SapService,
  SystemTier
} from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { RecentEntry } from "../stores/chatTypes";
import FileExplorer from "./FileExplorer";
import RecentSystems from "./RecentSystems";
import Tree from "./Tree";

export type LogonPanelMode = "systems" | "files";

// Dosyalar görünümü yalnızca seçili sistemin proje klasörü varken var.
export interface LogonFilesView {
  rootDir: string;
  rootLabel: string;
  selectedPath: string | null;
  onSelectFile(entry: FsEntry): void;
  onImportComplete(result: FsImportFilesResult, destDir: string): void;
  onRootPicked(dir: string): void;
}

export interface LogonSidebarProps {
  search: string;
  onSearchChange(value: string): void;
  // Ctrl+F kutuyu `App`'ten odaklıyor.
  searchInputRef: RefObject<HTMLInputElement>;
  mode: LogonPanelMode;
  onModeChange(mode: LogonPanelMode): void;
  files: LogonFilesView | null;
  // Liste henüz hiç gelmedi (ilk okuma sürüyor).
  loading: boolean;
  customers: SapNode[];
  recentEntries: RecentEntry[];
  selectedUuid: string | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  onSelect(path: string[], service: SapService, itemUuid: string): void;
}

// Logon modunun kenar çubuğu (grafit, spec §5.3): arama, Sistemler/Dosyalar
// geçişi, son bağlanılanlar ve sistem ağacı ya da dosya gezgini. Veri
// `App`'te; burada durum yok.
export default function LogonSidebar({
  search,
  onSearchChange,
  searchInputRef,
  mode,
  onModeChange,
  files,
  loading,
  customers,
  recentEntries,
  selectedUuid,
  connectivity,
  tierOverrides,
  onSelect
}: LogonSidebarProps) {
  const t = useT();
  const showFiles = mode === "files" && files !== null;

  const modeButton = (value: LogonPanelMode, label: string, icon: JSX.Element) => (
    <button
      onClick={() => onModeChange(value)}
      title={label}
      aria-label={label}
      aria-pressed={mode === value}
      className={`cursor-pointer rounded-sm p-1.5 ${
        mode === value ? "bg-active text-white" : "text-slate-400 hover:bg-active"
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <div className="flex h-8 min-w-0 flex-1 items-center rounded-lg bg-control ring-1 ring-inset ring-line focus-within:ring-accent-500/40">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500">
            <Search size={14} />
          </span>
          <input
            ref={searchInputRef}
            data-sidebar-search
            value={search}
            onChange={(e) => {
              // Arama yalnızca sistemleri süzüyor: dosyalardayken yazmak
              // sonucun görüneceği yere geçiriyor.
              if (showFiles) onModeChange("systems");
              onSearchChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && search) onSearchChange("");
            }}
            placeholder={t("app.searchPlaceholder")}
            aria-label={t("app.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              title={t("app.clearSearch")}
              aria-label={t("app.clearSearch")}
              className="mr-1.5 shrink-0 cursor-pointer rounded p-1 text-slate-500 transition hover:bg-active hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {files && (
          <div className="flex shrink-0 items-center gap-1 rounded-sm border border-line p-0.5">
            {modeButton("systems", t("app.systemsMode"), <Server size={14} />)}
            {modeButton("files", t("app.filesMode"), <FolderTree size={14} />)}
          </div>
        )}
      </div>
      {showFiles ? (
        <div className="flex-1 overflow-hidden">
          <FileExplorer
            rootDir={files.rootDir}
            rootLabel={files.rootLabel}
            selectedPath={files.selectedPath}
            onSelectFile={files.onSelectFile}
            onImportComplete={files.onImportComplete}
            onRootPicked={files.onRootPicked}
            browsable
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 pt-0">
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">{t("common.loading")}</div>
          ) : (
            <>
              {!search.trim() && (
                <RecentSystems
                  entries={recentEntries}
                  selectedUuid={selectedUuid}
                  connectivity={connectivity}
                  tierOverrides={tierOverrides}
                  onSelect={onSelect}
                />
              )}
              <Tree
                nodes={customers}
                search={search}
                selectedUuid={selectedUuid}
                connectivity={connectivity}
                tierOverrides={tierOverrides}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

`showFiles` doğruyken TypeScript `files`'ın `null` olmadığını bilmiyor; `files.rootDir` satırları hata verirse koşulu `mode === "files" && files ? (` diye doğrudan yaz ve `showFiles`'ı yalnızca `onChange`'te kullan.

- [ ] **Adım 4: Testin geçtiğini gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx`
Beklenen: PASS (7 test).

- [ ] **Adım 5: `App.tsx`'i `LogonSidebar`'a bağla**

1. Import'lar:
   - `import LogonSidebar from "./components/LogonSidebar";` ekle.
   - `RecentSystems`, `Tree` ve `FileExplorer` import'ları `App`'te başka yerde kullanılmıyorsa sil; `npm run typecheck` söylüyor.
   - lucide'dan `Search`, `X`, `Server`, `FolderTree` aynı şekilde: yalnızca kullanılmıyorsa sil.

2. Ctrl+F efekti (bugün ~434–443):

```ts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        // Arama kutusu kenar çubuğunda: daraltılmışsa önce açılıyor, odak
        // kutu çizildikten sonra veriliyor.
        setSidebarCollapsed(false);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
```

3. Üst şeritteki arama kutusunun tamamını sil (bugün ~1181–1203): `<div className="flex h-9 min-w-0 flex-1 items-center rounded-lg bg-control …">` ile başlayıp `{search && (…)}` bloğundan sonra kapanan `</div>`. Yerine şunu koy:

```tsx
          {/* Arama kenar çubuğunda (`LogonSidebar`); boşluk düğmeleri iki yana yaslıyor. */}
          <div className="min-w-0 flex-1" />
```

Şeridin üstündeki uzun yorumdaki 3. madde ("Arama kutusu: …") artık bu şeritte değil. O maddeyi şu tek cümleyle değiştir:

```
              3. Arama kutusu 2026-09-29'da kenar çubuğuna indi (`LogonSidebar`).
```

4. `aside`'ın içi (bugün ~1241–1311). Daraltma düğmesinin satırı kalıyor, geçiş düğmeleri oradan çıkıyor. Satırın sonrası `LogonSidebar` oluyor:

```tsx
              <div className="flex items-center gap-2 p-2">
                <button
                  onClick={handleToggleSidebar}
                  title={sidebarCollapsed ? t("app.expandSidebar") : t("app.collapseSidebar")}
                  className="cursor-pointer rounded-sm p-1.5 text-slate-400 hover:bg-active hover:text-white"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
              </div>
              {!sidebarCollapsed && (
                <LogonSidebar
                  search={search}
                  onSearchChange={setSearch}
                  searchInputRef={searchInputRef}
                  mode={leftPanelMode}
                  onModeChange={setLeftPanelMode}
                  files={
                    selection && projectDir
                      ? {
                          rootDir: projectDir,
                          rootLabel: selection.service.systemId || selection.service.name,
                          selectedPath: activeFilePath,
                          onSelectFile: handleOpenFile,
                          onImportComplete: handleImportComplete,
                          onRootPicked: handleExplorerRootPicked
                        }
                      : null
                  }
                  loading={loading && !landscape}
                  customers={landscape?.customers ?? []}
                  recentEntries={recentEntries}
                  selectedUuid={selection?.itemUuid ?? null}
                  connectivity={connectivity}
                  tierOverrides={config?.systemTiers ?? {}}
                  onSelect={handleSelect}
                />
              )}
```

`handleExplorerRootPicked` `async` olduğu için `Promise<void>` dönüyor. `onRootPicked(dir: string): void` bunu kabul ediyor; bugün `FileExplorer`'a da aynı şekilde geçiyor.

- [ ] **Adım 6: Testleri çalıştır**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx`
Beklenen: PASS.

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok. `tests/designScale.test.ts` sınırına dokunma (Görev 17).

- [ ] **Adım 7: Commit**

```bash
git add src/components/LogonSidebar.tsx src/App.tsx tests/logonSidebar.test.tsx
git commit -m "Grafit: Logon listesi ve aramasi LogonSidebar'a tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 14: Kabuğun kenar çubuğu — `Sidebar`, `SidebarFooter`, `ActivityBar` gidiyor

Solda iki şerit vardı: 56px'lik `ActivityBar` ve her ekranın kendi listesi. Bu görevde ikisi tek bir `Sidebar`'da birleşiyor. Tepede mod seçici (Sohbet / Logon / Script), ortada o modun listesi (Görev 11, 12, 13'te çıkarılan `ChatSidebar`, `ScriptSidebar`, `LogonSidebar`), dipte Hazırlık, Bağlantılar ve ikon düğmeler var.

Görev 11, 12 ve 13'te `App`'e konan üç geçici `aside` ve Logon'un eski `aside`'ı (daraltma düğmesi, genişlik tutamacı, yerel genişlik durumu) bu görevde kalkıyor. Kenar çubuğu bu görevde 264px'te sabit. Genişlik ayarı ve daraltma Görev 15'te, kabuğun kendi durumu olarak geri geliyor.

Hazırlık açıkken hiçbir sekme seçili değil ve orta alanda son modun listesi kalıyor. O listeye dokunmak (tıklamak ya da klavyeyle odaklamak) listenin moduna geri dönüyor. Script ekranı yalnızca aktifken mount olduğu için `ScriptSidebar`'ın komutlarını karşılayan biri ancak böyle oluyor. Sohbet ve Logon'da da doğal olan bu: listede seçilen şeyin ekranı görünüyor.

**Dosyalar:**
- Oluştur: `src/shell/activity.ts`
- Oluştur: `src/shell/SidebarFooter.tsx`
- Oluştur: `src/shell/Sidebar.tsx`
- Sil: `src/components/ActivityBar.tsx`
- Değiştir: `src/App.tsx`: import'lar (bugün ~1–40), sabitler (~71–74), durumlar (~146–147), Ctrl+F efekti (Görev 13'te yazıldı), `handleToggleSidebar` / `handleSidebarResizeStart` (~815–837), kabuk (~1062–1077), sohbet sarmalayıcısı (Görev 11), Script dalı (Görev 12), Logon'un `aside`'ı ve tutamacı (~1235–1322), `AppConnectionsModal` yorumu (~1421)
- Değiştir: `src/components/AppConnectionsModal.tsx:16,29` (yorum), `src/components/SapGuiScriptingHome.tsx:156` (yorum)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/shellSidebar.test.tsx`

**Arayüzler:**
- Tüketir: Görev 8'deki `Tabs<T>({ label, items, value: T | null, onChange, stretch })`. Görev 11'deki `ChatSidebar` ve props'u (`recentEntries`, `connectivity`, `tierOverrides`, `activeSap`, `onOpenSapLauncher`, `onQuickConnectSap`). Görev 12'deki `ScriptSidebar` (props'suz, `ScriptStore`'dan okuyor). Görev 13'teki `LogonSidebar` ve `LogonSidebarProps`.
- Üretir:
  - `src/shell/activity.ts`: `type Activity` (değerler aynı), `type SidebarMode = "axetCode" | "sapLauncher" | "sapGuiScripting"`, `SIDEBAR_MODES: SidebarMode[]`, `isSidebarMode(a: Activity): a is SidebarMode`, `listModeOf(activity: Activity, last: SidebarMode): SidebarMode`.
  - `src/shell/SidebarFooter.tsx`: `export interface SidebarFooterProps { readinessOpen: boolean; readinessFault: boolean; onOpenReadiness: () => void; connectorCount: number; onOpenConnections: () => void; theme: AppTheme; language: string; onToggleTheme: () => void; onToggleLanguage: () => void; onOpenSettings: () => void }`, varsayılan dışa aktarım `SidebarFooter`.
  - `src/shell/Sidebar.tsx`: `export interface SidebarProps { mode: SidebarMode; readinessOpen: boolean; onModeChange: (mode: SidebarMode) => void; footer: SidebarFooterProps; children: ReactNode }`, varsayılan dışa aktarım `Sidebar`. Görev 15 buna genişlik ve daraltma ekliyor, Görev 16 kısayolları `SIDEBAR_MODES` üzerinden kuruyor.
  - Çeviri anahtarları `activityBar.*` → `shell.*` (ön ek değişiyor, değerler aynı), yeni: `shell.sidebar`, `shell.modes`, `shell.modeChat`, `shell.modeLogon`, `shell.modeScript`, `shell.connectorsOpen`.

- [ ] **Adım 1: Başarısız testi yaz**

`tests/shellSidebar.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Kabuğun kenar çubuğu: mod seçici, Hazırlık açıkken sekmelere ulaşılması,
// son modun listesine dokununca o moda dönülmesi ve dip bloğun eylemleri.
// `App` burada çizilmiyor; `listModeOf` App'in "hangi liste görünüyor"
// kararının kendisi.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import Sidebar from "../src/shell/Sidebar";
import type { SidebarFooterProps } from "../src/shell/SidebarFooter";
import { isSidebarMode, listModeOf, type SidebarMode } from "../src/shell/activity";

afterEach(cleanup);

function footerProps(over: Partial<SidebarFooterProps> = {}): SidebarFooterProps {
  return {
    readinessOpen: false,
    readinessFault: false,
    onOpenReadiness: vi.fn(),
    connectorCount: 0,
    onOpenConnections: vi.fn(),
    theme: "dark",
    language: "TR",
    onToggleTheme: vi.fn(),
    onToggleLanguage: vi.fn(),
    onOpenSettings: vi.fn(),
    ...over
  };
}

function renderSidebar(
  opts: { mode?: SidebarMode; readinessOpen?: boolean; footer?: Partial<SidebarFooterProps> } = {}
) {
  const onModeChange = vi.fn();
  const footer = footerProps({ readinessOpen: opts.readinessOpen ?? false, ...opts.footer });
  render(
    <LanguageProvider language="tr">
      <Sidebar
        mode={opts.mode ?? "axetCode"}
        readinessOpen={opts.readinessOpen ?? false}
        onModeChange={onModeChange}
        footer={footer}
      >
        <button type="button">Liste satırı</button>
      </Sidebar>
    </LanguageProvider>
  );
  return { onModeChange, footer };
}

describe("listModeOf", () => {
  it("mod ekranında o modun listesi, Hazırlık'ta son modun listesi", () => {
    expect(listModeOf("sapGuiScripting", "axetCode")).toBe("sapGuiScripting");
    expect(listModeOf("readiness", "sapLauncher")).toBe("sapLauncher");
    expect(listModeOf("axetFlows", "sapGuiScripting")).toBe("sapGuiScripting");
    expect(isSidebarMode("readiness")).toBe(false);
    expect(isSidebarMode("sapLauncher")).toBe(true);
  });
});

describe("Sidebar", () => {
  it("modun sekmesi seçili, başka sekmeye tıklamak o modu istiyor", () => {
    const { onModeChange } = renderSidebar({ mode: "axetCode" });
    expect(screen.getByRole("tablist", { name: "Modlar" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Sohbet" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Script" }).getAttribute("aria-selected")).toBe("false");
    fireEvent.click(screen.getByRole("tab", { name: "Logon" }));
    expect(onModeChange).toHaveBeenCalledWith("sapLauncher");
    expect(screen.getByRole("button", { name: "Liste satırı" })).toBeTruthy();
  });

  it("Hazırlık açıkken hiçbir sekme seçili değil ama ilk sekmeye Tab ile ulaşılıyor", () => {
    renderSidebar({ mode: "sapGuiScripting", readinessOpen: true });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.every((tab) => tab.getAttribute("aria-selected") === "false")).toBe(true);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(screen.getByRole("button", { name: "Hazırlık" }).getAttribute("aria-current")).toBe("page");
  });

  it("Hazırlık açıkken son modun listesine dokunmak o moda dönüyor", () => {
    const { onModeChange } = renderSidebar({ mode: "sapGuiScripting", readinessOpen: true });
    const row = screen.getByRole("button", { name: "Liste satırı" });
    fireEvent.pointerDown(row);
    expect(onModeChange).toHaveBeenLastCalledWith("sapGuiScripting");
    onModeChange.mockClear();
    fireEvent.focus(row);
    expect(onModeChange).toHaveBeenLastCalledWith("sapGuiScripting");
  });

  it("mod ekranındayken listeye dokunmak mod değiştirmiyor", () => {
    const { onModeChange } = renderSidebar({ mode: "axetCode" });
    const row = screen.getByRole("button", { name: "Liste satırı" });
    fireEvent.pointerDown(row);
    fireEvent.focus(row);
    expect(onModeChange).not.toHaveBeenCalled();
  });
});

describe("SidebarFooter", () => {
  it("her düğme kendi eylemini çağırıyor", () => {
    const { footer } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Hazırlık" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygulama Bağlantıları" }));
    fireEvent.click(screen.getByRole("button", { name: "Tema" }));
    fireEvent.click(screen.getByRole("button", { name: "Dil" }));
    fireEvent.click(screen.getByRole("button", { name: "Ayarlar" }));
    expect(footer.onOpenReadiness).toHaveBeenCalledTimes(1);
    expect(footer.onOpenConnections).toHaveBeenCalledTimes(1);
    expect(footer.onToggleTheme).toHaveBeenCalledTimes(1);
    expect(footer.onToggleLanguage).toHaveBeenCalledTimes(1);
    expect(footer.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Hazırlık" }).getAttribute("aria-current")).toBeNull();
  });

  it("açık bağlayıcı sayısı ve Hazırlık arızası adda okunuyor", () => {
    renderSidebar({ footer: { connectorCount: 2, readinessFault: true } });
    expect(screen.getByRole("button", { name: "Uygulama Bağlantıları — 2 açık" }).textContent).toContain("2");
    expect(screen.getByRole("button", { name: "Hazırlık — çözülmesi gereken bir şey var" })).toBeTruthy();
  });

  it("dil düğmesi dilin kısa adını gösteriyor", () => {
    renderSidebar({ footer: { language: "EN" } });
    expect(screen.getByRole("button", { name: "Dil" }).textContent).toBe("EN");
  });
});
```

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/shellSidebar.test.tsx`
Beklenen: FAIL, `../src/shell/Sidebar` bulunamıyor.

- [ ] **Adım 3: Çeviri anahtarlarını taşı ve ekle**

`ActivityBar` gidince `activityBar.*` anahtarlarının adı yanlış yeri gösteriyor. Ön eki iki dosyada da değiştir:

```bash
sed -i 's/"activityBar\./"shell./' src/i18n/tr.ts src/i18n/en.ts
```

`grep -c '"activityBar\.' src/i18n/tr.ts src/i18n/en.ts` ikisinde de `0` vermeli. `axetFlows` / `axetFlowsLive` anahtarları da taşınıyor ve kalıyor; o ekranlar geri açılırsa etiketleri hazır.

`src/i18n/tr.ts`'te `"shell.connections": …` satırının altına ekle:

```ts
  "shell.sidebar": "Kenar çubuğu",
  "shell.modes": "Modlar",
  "shell.modeChat": "Sohbet",
  "shell.modeLogon": "Logon",
  "shell.modeScript": "Script",
  "shell.connectorsOpen": "{count} açık",
```

`src/i18n/en.ts`'te aynı yere:

```ts
  "shell.sidebar": "Sidebar",
  "shell.modes": "Modes",
  "shell.modeChat": "Chat",
  "shell.modeLogon": "Logon",
  "shell.modeScript": "Script",
  "shell.connectorsOpen": "{count} on",
```

Etiketler 7 karakteri geçmiyor (spec §6.2): dördüncü mod (Terminal) eklendiğinde de 264px'e sığıyorlar.

- [ ] **Adım 4: `src/shell/activity.ts`'i yaz**

```ts
// Uygulamanın hangi ekranda olduğu. Değerler `ActivityBar`'dan aynen
// taşındı (2026-09-29): config'e ya da başka bir yere yazılmıyorlar ama
// `axetFlows` / `axetFlowsLive` o ekranlar geri açılırsa diye duruyor.
export type Activity =
  | "axetCode"
  | "sapLauncher"
  | "axetFlows"
  | "axetFlowsLive"
  | "sapGuiScripting"
  | "readiness";

// Kenar çubuğunda listesi olan ekranlar; mod seçicinin sekmeleri bu sırada.
export type SidebarMode = "axetCode" | "sapLauncher" | "sapGuiScripting";

export const SIDEBAR_MODES: SidebarMode[] = ["axetCode", "sapLauncher", "sapGuiScripting"];

export function isSidebarMode(activity: Activity): activity is SidebarMode {
  return (SIDEBAR_MODES as Activity[]).includes(activity);
}

// Kenar çubuğunun ortasında hangi modun listesi duruyor. Hazırlık gibi
// listesi olmayan bir ekrandayken son modunki kalıyor (spec §6.2): liste
// boşalıp geri dolmuyor, kullanıcı nereden geldiğini görüyor.
export function listModeOf(activity: Activity, last: SidebarMode): SidebarMode {
  return isSidebarMode(activity) ? activity : last;
}
```

- [ ] **Adım 5: `src/shell/SidebarFooter.tsx`'i yaz**

```tsx
import { Moon, Plug, Settings, Stethoscope, Sun } from "lucide-react";
import type { AppTheme } from "../../app-electron/shared/types";
import { useT } from "../i18n";

export interface SidebarFooterProps {
  readinessOpen: boolean;
  readinessFault: boolean;
  onOpenReadiness: () => void;
  connectorCount: number;
  onOpenConnections: () => void;
  theme: AppTheme;
  // Gösterilen kısa ad ("TR" / "EN"); dili App biliyor.
  language: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
}

// Satırlar kenar çubuğunun listeleriyle aynı ölçüde: 28px, 8px yatay boşluk,
// seçili satır `--accent-glow` zemini ve solda 2px çizgi (spec §6.5).
const ROW =
  "relative flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors";
const ICON_BTN =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-hover hover:text-slate-100";

export default function SidebarFooter({
  readinessOpen,
  readinessFault,
  onOpenReadiness,
  connectorCount,
  onOpenConnections,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  onOpenSettings
}: SidebarFooterProps) {
  const t = useT();
  const readinessName = readinessFault
    ? `${t("shell.readiness")} — ${t("shell.readinessFault")}`
    : t("shell.readiness");
  const connectionsName =
    connectorCount > 0
      ? `${t("shell.connections")} — ${t("shell.connectorsOpen", { count: connectorCount })}`
      : t("shell.connections");

  return (
    <div className="shrink-0 border-t border-line-subtle p-2">
      <button
        type="button"
        onClick={onOpenReadiness}
        aria-label={readinessName}
        aria-current={readinessOpen ? "page" : undefined}
        className={`${ROW} ${
          readinessOpen ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
        }`}
      >
        {readinessOpen && (
          <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-400" />
        )}
        <Stethoscope size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("shell.readiness")}</span>
        {/* Arıza noktası renk; ne dediği düğmenin adında yazılı. */}
        {readinessFault && (
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-danger-text)]" />
        )}
      </button>
      <button
        type="button"
        onClick={onOpenConnections}
        aria-label={connectionsName}
        className={`${ROW} text-slate-400 hover:bg-hover/60 hover:text-slate-300`}
      >
        <Plug size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("shell.connections")}</span>
        {/* Nokta accent değil durum yeşili: bu bir seçim değil, "araçlar şu
            an açık" diyen bir sağlık göstergesi. Sayı kaç tanesinin açık
            olduğunu söylüyor. */}
        {connectorCount > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-2xs text-slate-400">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--status-success-text)]" />
            {connectorCount}
          </span>
        )}
      </button>
      <div className="mt-1 flex items-center gap-1 px-1">
        {/* Düğme "hangisine geçersin"i gösteriyor: koyu temadayken güneş. */}
        <button type="button" onClick={onToggleTheme} aria-label={t("shell.theme")} title={t("shell.theme")} className={ICON_BTN}>
          {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onToggleLanguage}
          aria-label={t("shell.language")}
          title={t("shell.language")}
          className={`${ICON_BTN} font-mono text-2xs font-semibold`}
        >
          {language}
        </button>
        <button type="button" onClick={onOpenSettings} aria-label={t("shell.settings")} title={t("shell.settings")} className={ICON_BTN}>
          <Settings size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Adım 6: `src/shell/Sidebar.tsx`'i yaz**

```tsx
import type { ReactNode } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { Tabs } from "../ui/Tabs";
import SidebarFooter, { type SidebarFooterProps } from "./SidebarFooter";
import { SIDEBAR_MODES, type SidebarMode } from "./activity";

export interface SidebarProps {
  // Ortada listesi duran mod (bkz. `listModeOf`).
  mode: SidebarMode;
  readinessOpen: boolean;
  onModeChange: (mode: SidebarMode) => void;
  footer: SidebarFooterProps;
  // Modun listesi: `ChatSidebar`, `LogonSidebar` ya da `ScriptSidebar`.
  children: ReactNode;
}

const MODE_LABEL: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.modeChat",
  sapLauncher: "shell.modeLogon",
  sapGuiScripting: "shell.modeScript"
};

export default function Sidebar({ mode, readinessOpen, onModeChange, footer, children }: SidebarProps) {
  const t = useT();
  const items = SIDEBAR_MODES.map((value) => ({ value, label: t(MODE_LABEL[value]) }));

  // Hazırlık açıkken ortadaki liste son modun. Ona dokunmak o moda dönüyor:
  // listede seçilen şeyin ekranı görünsün diye, ve Script ekranı yalnızca
  // aktifken mount olduğu için `ScriptSidebar`'ın komutlarını karşılayan
  // biri ancak böyle oluyor. Fare için `pointerdown` (tıklamadan önce geliyor,
  // ekran tıklama işlenmeden mount oluyor), klavye için odak.
  const returnToMode = readinessOpen ? () => onModeChange(mode) : undefined;

  return (
    <aside
      aria-label={t("shell.sidebar")}
      className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-line-subtle bg-sidebar"
    >
      <div className="shrink-0 p-2">
        <Tabs
          label={t("shell.modes")}
          items={items}
          value={readinessOpen ? null : mode}
          onChange={onModeChange}
          stretch
        />
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onPointerDownCapture={returnToMode}
        onFocusCapture={returnToMode}
      >
        {children}
      </div>
      <SidebarFooter {...footer} />
    </aside>
  );
}
```

- [ ] **Adım 7: Testi çalıştır**

Çalıştır: `npx vitest run tests/shellSidebar.test.tsx`
Beklenen: PASS, 8 test.

- [ ] **Adım 8: `App.tsx`'i kabuğa bağla**

1. Import'lar:
   - `import ActivityBar, { type Activity } from "./components/ActivityBar";` satırını sil, yerine:

```ts
import Sidebar from "./shell/Sidebar";
import { listModeOf, isSidebarMode, type Activity, type SidebarMode } from "./shell/activity";
```

   - lucide listesinden `PanelLeftClose` ve `PanelLeftOpen`'ı sil (başka yerde kullanılmıyorlar).
   - Hemen altındaki yorumda (bugün ~38) `ActivityBar girdisi` → `kenar çubuğundaki mod sekmesi (src/shell/activity.ts)`.

2. Sabitlerden `MIN_SIDEBAR_WIDTH`, `MAX_SIDEBAR_WIDTH`, `DEFAULT_SIDEBAR_WIDTH`, `COLLAPSED_SIDEBAR_WIDTH` satırlarını (bugün ~71–74) sil.

3. `sidebarCollapsed` ve `sidebarWidth` durumlarını (bugün ~146–147), `handleToggleSidebar` ile `handleSidebarResizeStart`'ı (bugün ~815–837) sil. Genişlik ve daraltma Görev 15'te kabuğa geliyor.

4. `const [activity, setActivity] = useState<Activity>("axetCode");` satırının altına:

```ts
  // Kenar çubuğunun ortasında duran liste. Hazırlık açılınca son modunki
  // kalıyor (spec §6.2), bu yüzden son mod ayrıca tutuluyor.
  const [lastListMode, setLastListMode] = useState<SidebarMode>("axetCode");
  useEffect(() => {
    if (isSidebarMode(activity)) setLastListMode(activity);
  }, [activity]);
  const listMode = listModeOf(activity, lastListMode);
```

5. Ctrl+F efektinde (Görev 13'te yazıldı) yorumla `setSidebarCollapsed(false);` satırını sil, yerine tek satır yorum koy. Efekt şöyle kalıyor:

```ts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        // Arama kutusu kenar çubuğunda (`LogonSidebar`); odak bir kare sonra.
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
```

6. Kabukta `<ActivityBar … />` (bugün ~1066–1077) yerine:

```tsx
        {/* Terminal tam ekranı (Logon) kenar çubuğunu da gizliyor (spec §6.3).
            `terminalFullscreen` Logon'un durumu; başka ekrana geçince
            kenar çubuğu geri geliyor. */}
        {!(activity === "sapLauncher" && terminalFullscreen) && (
          <Sidebar
            mode={listMode}
            readinessOpen={activity === "readiness"}
            onModeChange={setActivity}
            footer={{
              readinessOpen: activity === "readiness",
              readinessFault,
              onOpenReadiness: () => setActivity("readiness"),
              connectorCount: Object.values(config?.connectorEnabled ?? {}).filter(Boolean).length,
              onOpenConnections: () => setConnectionsOpen(true),
              theme: config?.theme ?? "dark",
              language: language.toUpperCase(),
              onToggleTheme: handleToggleTheme,
              onToggleLanguage: handleToggleLanguage,
              onOpenSettings: () => setSettingsOpen(true)
            }}
          >
            {listMode === "axetCode" ? (
              <ChatSidebar
                recentEntries={recentEntries}
                connectivity={connectivity}
                tierOverrides={config?.systemTiers ?? {}}
                activeSap={activeContext.sap}
                onOpenSapLauncher={() => setActivity("sapLauncher")}
                onQuickConnectSap={handleQuickConnectSap}
              />
            ) : listMode === "sapLauncher" ? (
              <LogonSidebar
                search={search}
                onSearchChange={setSearch}
                searchInputRef={searchInputRef}
                mode={leftPanelMode}
                onModeChange={setLeftPanelMode}
                files={
                  selection && projectDir
                    ? {
                        rootDir: projectDir,
                        rootLabel: selection.service.systemId || selection.service.name,
                        selectedPath: activeFilePath,
                        onSelectFile: handleOpenFile,
                        onImportComplete: handleImportComplete,
                        onRootPicked: handleExplorerRootPicked
                      }
                    : null
                }
                loading={loading && !landscape}
                customers={landscape?.customers ?? []}
                recentEntries={recentEntries}
                selectedUuid={selection?.itemUuid ?? null}
                connectivity={connectivity}
                tierOverrides={config?.systemTiers ?? {}}
                onSelect={handleSelect}
              />
            ) : (
              <ScriptSidebar />
            )}
          </Sidebar>
        )}
```

`ChatSidebar` ve `LogonSidebar`'ın props'ları Görev 11 ve 13'teki geçici yerlerinden aynen geliyor. `ChatSidebar` artık yalnızca Sohbet listesi görünürken mount; durumu `ChatStore`'da olduğu için mod değişince bir şey kaybolmuyor. Arama kutusunun yazısı `ChatSidebar`'ın kendi durumu, mod değişince sıfırlanıyor; bu kabul edilebilir.

7. Sohbet sarmalayıcısını Görev 11'den önceki hâline döndür. Geçici `aside` ve iç `div` gidiyor:

```tsx
        <div className={activity === "axetCode" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>
          <AxetCodeHome
            active={activity === "axetCode"}
            config={config}
            pushToast={pushToast}
            recentEntries={recentEntries}
            sapChatRequest={sapChatRequest}
            workDirRequest={workDirRequest}
            activeSap={activeContext.sap}
          />
        </div>
```

Üstündeki uzun "axet.code HER ZAMAN mount" yorumuna dokunma.

8. Script dalını Görev 12'den önceki hâline döndür (geçici yorum, sarmalayıcı `div` ve `aside` gidiyor):

```tsx
        ) : activity === "sapGuiScripting" ? (
          <SapGuiScriptingHome activeSap={activeContext.sap} />
```

9. Logon dalında `{!terminalFullscreen && (<aside …>…</aside>)}` bloğunun tamamını (daraltma düğmesinin satırı ve `LogonSidebar` dahil; Adım 6'da kabuğa taşındı) ve hemen altındaki tutamacı sil:

```tsx
          {!terminalFullscreen && !sidebarCollapsed && (
            <div
              onMouseDown={handleSidebarResizeStart}
              title={t("app.resizeWidthTitle")}
              className="w-1 shrink-0 cursor-col-resize hover:bg-accent-500/50"
            />
          )}
```

Kapsayan `<div className="flex min-h-0 flex-1 overflow-hidden">` ve içindeki `<div className="flex min-w-0 flex-1 flex-col overflow-hidden">` (ana alan) kalıyor. `app.expandSidebar`, `app.collapseSidebar`, `app.resizeWidthTitle` çevirileri artık kullanılmıyor; Görev 15 temizliyor.

10. `AppConnectionsModal`'ın `onClose` yorumunda (bugün ~1421) `ActivityBar'daki nokta` → `kenar çubuğundaki nokta`.

- [ ] **Adım 9: `ActivityBar`'ı sil, yorumları düzelt**

```bash
git rm src/components/ActivityBar.tsx
```

- `src/components/AppConnectionsModal.tsx:16`: `yani ActivityBar'ın alt köşesinde` → `yani o günkü ActivityBar'ın alt köşesinde (2026-09-29'dan beri kenar çubuğunun dibinde)`. Tarihli bir alıntının açıklaması; eski adı silmek alıntıyı anlaşılmaz yapıyor.
- `src/components/AppConnectionsModal.tsx:29`: `onu açan ActivityBar butonunda` → `onu açan kenar çubuğu düğmesinde`.
- `src/components/SapGuiScriptingHome.tsx:156`: `(bkz. ActivityBar.tsx/App.tsx)` → `(bkz. src/shell/activity.ts, App.tsx)`.
- `src/components/AxetFlowsHome.tsx:11`'e dokunma: kapalı bir ekranın geçmişini anlatıyor.

Kontrol:

Çalıştır: `grep -rn "ActivityBar" src tests`
Beklenen: yalnızca `AppConnectionsModal.tsx:16` ve `AxetFlowsHome.tsx:11`.

- [ ] **Adım 10: Bütün takımı çalıştır**

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok. `tests/i18n.test.ts` yeni anahtarları iki dilde buluyor. `sidebarCollapsed` ya da `sidebarWidth` için "declared but never read" hatası çıkarsa Adım 8'in 3. maddesinde bir kullanım kalmış demektir. `tests/designScale.test.ts` sınırına dokunma (Görev 17).

- [ ] **Adım 11: Commit**

```bash
git add src/shell/activity.ts src/shell/SidebarFooter.tsx src/shell/Sidebar.tsx
git add src/App.tsx src/components/AppConnectionsModal.tsx src/components/SapGuiScriptingHome.tsx
git add src/i18n/tr.ts src/i18n/en.ts tests/shellSidebar.test.tsx
git commit -m "Grafit: kabugun kenar cubugu; ActivityBar ve gecici kenar cubuklari kalkti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git rm` silmeyi zaten sahneye koydu.

---

### Görev 15: Kenar çubuğu genişliği ve daraltma, `chatSidebarOpen` göçü

Kenar çubuğu üç modda ortak bir genişlik ve daraltma kazanıyor, ikisi de config'e yazılıyor. Varsayılan 264px, sınırlar 220–420px (spec §6.3). Tutamaç fareyle sürükleniyor; odaktayken sol/sağ ok 8px, Shift ile 32px. Genişlik yalnızca sürükleme bitince ya da tuş bırakılınca kaydediliyor. Daraltılmış hâl 48px'lik bir şerit: üstte açma düğmesi ve üç modun ikonu, dipte Hazırlık, Bağlantılar, Ayarlar.

Sohbet'in eski "açılışta liste açık olsun" ayarı (`chatSidebarOpen`) bu ayarın yerini alan `sidebarCollapsed`'a göç ediyor. `sidebarCollapsed` yoksa ve eski alan `false` ise kenar çubuğu daraltılmış açılıyor. Eski alan türden, Ayarlar'dan ve çevirilerden kalkıyor; config dosyasından da ilk kayıtta düşüyor.

Sınırlar ve okuma kuralı hem ana süreçte hem arayüzde gerekiyor. Bu yüzden `app-electron/shared/sidebarLayout.ts`'te duruyorlar (`themeSurfaces.ts` gibi). Ana süreç okurken kırpıyor, arayüz sürüklerken.

**Dosyalar:**
- Oluştur: `app-electron/shared/sidebarLayout.ts`
- Değiştir: `app-electron/shared/types.ts:366-368` (`chatSidebarOpen` ve yorumu)
- Değiştir: `app-electron/main/store.ts`: import'lar (~1–21), varsayılan (~109), okuma (~176–184)
- Değiştir: `src/shell/Sidebar.tsx`, `src/shell/SidebarFooter.tsx` (Görev 14)
- Değiştir: `src/App.tsx`: import'lar, Ctrl+F efekti, `<Sidebar>` (Görev 14)
- Değiştir: `src/components/SettingsModal.tsx:312,623-630`
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Değiştir: `tests/dialogMigration.test.tsx:239`, `tests/settingsAppearance.test.tsx:30`, `tests/settingsOpenForm.test.tsx:36`
- Test: `tests/sidebarConfig.test.ts` (yeni; `src/`'ye dokunmuyor), `tests/shellSidebar.test.tsx` (Görev 14'ün dosyası)

**Arayüzler:**
- Tüketir: Görev 14'teki `Sidebar` / `SidebarProps`, `SidebarFooter` / `SidebarFooterProps`, `SIDEBAR_MODES`, `SidebarMode`; `App`'teki `listMode`.
- Üretir:
  - `app-electron/shared/sidebarLayout.ts`: `SIDEBAR_MIN_WIDTH = 220`, `SIDEBAR_MAX_WIDTH = 420`, `SIDEBAR_DEFAULT_WIDTH = 264`, `SIDEBAR_COLLAPSED_WIDTH = 48`, `SIDEBAR_KEY_STEP = 8`, `SIDEBAR_KEY_STEP_LARGE = 32`, `clampSidebarWidth(value: unknown): number`, `readSidebarCollapsed(parsed: Record<string, unknown>): boolean`.
  - `AppConfig.sidebarWidth: number`, `AppConfig.sidebarCollapsed: boolean`; `AppConfig.chatSidebarOpen` yok.
  - `SidebarProps`'a eklenen: `width: number; collapsed: boolean; onWidthCommit: (width: number) => void; onCollapsedChange: (collapsed: boolean) => void`.
  - `SidebarFooter`'ın ikinci prop kümesi (yalnızca `Sidebar` veriyor): `collapsed?: boolean; onCollapse?: () => void`.
  - `App`'te `sidebarCollapsed` (config'ten türetilmiş) ve `handleSidebarCollapsedChange(collapsed: boolean): Promise<void>`. Görev 16 ikisini kısayollarda kullanıyor.
  - Çeviri: `shell.collapseSidebar`, `shell.expandSidebar` (eski `axetCodeHome.*` anahtarlarından taşınıyor), `shell.resizeWidth`.

- [ ] **Adım 1: Ana süreç tarafının başarısız testini yaz**

`tests/sidebarConfig.test.ts`:

```ts
// Kenar çubuğu genişliği ve daraltması (grafit kabuğu, 2026-09-29).
//
// `sidebarWidth` elle düzenlenmiş bir dosyadan saçma bir değerle gelebilir;
// okurken sınırlara kırpılıyor. `sidebarCollapsed` eski `chatSidebarOpen`'ın
// yerini aldı: eski dosyada yalnızca o varsa ondan türetiliyor, ilk kayıtta
// da dosyadan düşüyor.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clampSidebarWidth, readSidebarCollapsed } from "../app-electron/shared/sidebarLayout";

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-"));
  vi.resetModules();
});

async function store(raw: Record<string, unknown> | null) {
  if (raw) writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  return import("../app-electron/main/store");
}

describe("clampSidebarWidth", () => {
  it("sınırların içindeki değer yuvarlanıp aynen kalıyor", () => {
    expect(clampSidebarWidth(300)).toBe(300);
    expect(clampSidebarWidth(263.6)).toBe(264);
  });

  it("sınırların dışındaki değer kırpılıyor", () => {
    expect(clampSidebarWidth(100)).toBe(220);
    expect(clampSidebarWidth(-5)).toBe(220);
    expect(clampSidebarWidth(999)).toBe(420);
  });

  it("sayı olmayan değer varsayılana dönüyor", () => {
    for (const value of ["300", null, undefined, Number.NaN, Number.POSITIVE_INFINITY, {}]) {
      expect(clampSidebarWidth(value)).toBe(264);
    }
  });
});

describe("readSidebarCollapsed", () => {
  it("yeni alan varsa o geçerli, eski alana bakılmıyor", () => {
    expect(readSidebarCollapsed({ sidebarCollapsed: true })).toBe(true);
    expect(readSidebarCollapsed({ sidebarCollapsed: false, chatSidebarOpen: false })).toBe(false);
  });

  it("yeni alan yoksa eski chatSidebarOpen === false daraltılmış demek", () => {
    expect(readSidebarCollapsed({ chatSidebarOpen: false })).toBe(true);
    expect(readSidebarCollapsed({ chatSidebarOpen: true })).toBe(false);
    expect(readSidebarCollapsed({})).toBe(false);
  });

  it("yanlış tipteki yeni alan yok sayılıyor", () => {
    expect(readSidebarCollapsed({ sidebarCollapsed: "yes" })).toBe(false);
    expect(readSidebarCollapsed({ sidebarCollapsed: 1, chatSidebarOpen: false })).toBe(true);
  });
});

describe("loadConfig: kenar çubuğu", () => {
  it("ayar dosyası yoksa 264px, açık", async () => {
    const cfg = (await store(null)).loadConfig();
    expect(cfg.sidebarWidth).toBe(264);
    expect(cfg.sidebarCollapsed).toBe(false);
  });

  it("kayıtlı genişlik kırpılarak okunuyor, bozuğu varsayılana dönüyor", async () => {
    expect((await store({ sidebarWidth: 1000 })).loadConfig().sidebarWidth).toBe(420);
    vi.resetModules();
    expect((await store({ sidebarWidth: "geniş" })).loadConfig().sidebarWidth).toBe(264);
  });

  it("eski chatSidebarOpen: false daraltılmış açılıyor ve alan config'te yok", async () => {
    const cfg = (await store({ chatSidebarOpen: false })).loadConfig();
    expect(cfg.sidebarCollapsed).toBe(true);
    expect("chatSidebarOpen" in cfg).toBe(false);
  });

  it("ilk kayıtta eski alan dosyadan düşüyor, göç edilen değer yazılıyor", async () => {
    const { saveConfig } = await store({ chatSidebarOpen: false, theme: "dark" });
    saveConfig({ theme: "light" });
    const written = JSON.parse(readFileSync(path.join(userData, "config.json"), "utf-8"));
    expect("chatSidebarOpen" in written).toBe(false);
    expect(written.sidebarCollapsed).toBe(true);
    expect(written.sidebarWidth).toBe(264);
    expect(written.theme).toBe("light");
  });
});
```

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/sidebarConfig.test.ts`
Beklenen: FAIL, `../app-electron/shared/sidebarLayout` bulunamıyor.

- [ ] **Adım 3: `app-electron/shared/sidebarLayout.ts`'i yaz**

```ts
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
```

- [ ] **Adım 4: Türü ve ana süreci değiştir**

1. `app-electron/shared/types.ts`'te `chatSidebarOpen` ve üstündeki iki satırlık yorumu (bugün ~366–368) şununla değiştir:

```ts
  // Kabuğun kenar çubuğu (2026-09-29), üç modda ortak. Genişlik piksel,
  // okunurken 220–420'ye kırpılıyor (bkz. shared/sidebarLayout.ts).
  // `sidebarCollapsed` eski `chatSidebarOpen`'ın yerini aldı; eski dosyada
  // o alan okunup göç ettiriliyor. İkisi de kenar çubuğundan değişince
  // hemen yazılıyor, Ayarlar'da karşılıkları yok.
  sidebarWidth: number;
  sidebarCollapsed: boolean;
```

2. `app-electron/main/store.ts`:
   - Import'ların sonuna:

```ts
import { SIDEBAR_DEFAULT_WIDTH, clampSidebarWidth, readSidebarCollapsed } from "../shared/sidebarLayout";
```

   - `defaultConfig()`'te `chatSidebarOpen: true,` satırını şununla değiştir:

```ts
    sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
    sidebarCollapsed: false,
```

   - `loadConfig()`'te `const merged: AppConfig = {` satırının hemen üstüne:

```ts
    // `chatSidebarOpen` artık yok (bkz. readSidebarCollapsed). Birleştirmeye
    // girmesin diye ayıklanıyor; yoksa `...parsed` onu taşır ve her kayıtta
    // dosyaya geri yazılırdı.
    const rest = { ...parsed };
    delete rest.chatSidebarOpen;
```

   - `merged`'deki `...parsed,` satırını `...rest,` yap.
   - `chatSidebarOpen: typeof parsed.chatSidebarOpen === …` satırını şununla değiştir:

```ts
      sidebarWidth: clampSidebarWidth(parsed.sidebarWidth),
      sidebarCollapsed: readSidebarCollapsed(parsed),
```

`parsed` `JSON.parse`'tan geldiği için `any`; `rest` de öyle, `delete` tip hatası vermiyor.

- [ ] **Adım 5: Testi çalıştır**

Çalıştır: `npx vitest run tests/sidebarConfig.test.ts tests/appearanceConfig.test.ts`
Beklenen: PASS.

- [ ] **Adım 6: `chatSidebarOpen`'ı Ayarlar'dan, çevirilerden ve test verilerinden kaldır**

1. `src/components/SettingsModal.tsx`:
   - `EDITED_FIELDS`'ten `"chatSidebarOpen",` satırını (bugün 312) sil.
   - Sohbet bölümünün sonundaki onay kutusunu (bugün ~623–630; `<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">` ile başlayıp `{t("settingsModal.chatSidebarOpenLabel")}` ve `</label>` ile biten blok) sil. Hemen altındaki `</Section>` kalıyor.

2. Üç test verisinden `chatSidebarOpen: true,` satırını sil: `tests/dialogMigration.test.tsx:239`, `tests/settingsAppearance.test.tsx:30`, `tests/settingsOpenForm.test.tsx:36`. Verilerin sonu `as unknown as AppConfig`; yeni alanları eklemek gerekmiyor.

3. Çeviriler. Önce hangi anahtarların artık kullanılmadığını doğrula:

Çalıştır: `grep -rn "chatSidebarOpenLabel\|app\.expandSidebar\|app\.collapseSidebar\|app\.resizeWidthTitle\|axetCodeHome\.collapseSidebar\|axetCodeHome\.expandSidebar" src --include=*.tsx`
Beklenen: yalnızca `SettingsModal.tsx`'teki satır, o da 1. maddede silindiyse hiçbir şey. (`app.*` üçlüsü Görev 14'te, `axetCodeHome.*` ikilisi Görev 11'de kullanılmaz oldu.)

Sonra iki dosyada birden:

```bash
sed -i '/"settingsModal\.chatSidebarOpenLabel"/d; /"app\.expandSidebar"/d; /"app\.collapseSidebar"/d; /"app\.resizeWidthTitle"/d; s/"axetCodeHome\.\(collapse\|expand\)Sidebar"/"shell.\1Sidebar"/' src/i18n/tr.ts src/i18n/en.ts
```

`shell.collapseSidebar` / `shell.expandSidebar` değerleri ("Kenar çubuğunu daralt" / "genişlet", "Collapse sidebar" / "Expand sidebar") olduğu gibi doğru. `src/i18n/tr.ts`'te `"shell.connectorsOpen": …` satırının altına:

```ts
  "shell.resizeWidth": "Kenar çubuğunun genişliği",
```

`src/i18n/en.ts`'te aynı yere:

```ts
  "shell.resizeWidth": "Sidebar width",
```

Kontrol:

Çalıştır: `grep -rn "chatSidebarOpen" src app-electron tests`
Beklenen: yalnızca `app-electron/shared/sidebarLayout.ts`, `app-electron/main/store.ts` (göç) ve `tests/sidebarConfig.test.ts`.

- [ ] **Adım 7: Kenar çubuğunun başarısız testlerini yaz**

`tests/shellSidebar.test.tsx`'te `renderSidebar`'ı genişlik ve daraltmayı da alacak şekilde değiştir (Görev 14'teki testler olduğu gibi çalışmaya devam ediyor):

```tsx
function renderSidebar(
  opts: {
    mode?: SidebarMode;
    readinessOpen?: boolean;
    footer?: Partial<SidebarFooterProps>;
    width?: number;
    collapsed?: boolean;
  } = {}
) {
  const onModeChange = vi.fn();
  const onWidthCommit = vi.fn();
  const onCollapsedChange = vi.fn();
  const footer = footerProps({ readinessOpen: opts.readinessOpen ?? false, ...opts.footer });
  render(
    <LanguageProvider language="tr">
      <Sidebar
        mode={opts.mode ?? "axetCode"}
        readinessOpen={opts.readinessOpen ?? false}
        onModeChange={onModeChange}
        footer={footer}
        width={opts.width ?? 264}
        collapsed={opts.collapsed ?? false}
        onWidthCommit={onWidthCommit}
        onCollapsedChange={onCollapsedChange}
      >
        <button type="button">Liste satırı</button>
      </Sidebar>
    </LanguageProvider>
  );
  return { onModeChange, onWidthCommit, onCollapsedChange, footer };
}
```

Dosyanın sonuna iki `describe` ekle:

```tsx
describe("Sidebar genişliği", () => {
  const separator = () => screen.getByRole("separator", { name: "Kenar çubuğunun genişliği" });

  it("tutamaç değerini ve sınırlarını söylüyor", () => {
    renderSidebar({ width: 300 });
    expect(separator().getAttribute("aria-valuenow")).toBe("300");
    expect(separator().getAttribute("aria-valuemin")).toBe("220");
    expect(separator().getAttribute("aria-valuemax")).toBe("420");
    expect(separator().getAttribute("aria-orientation")).toBe("vertical");
    expect(separator().tabIndex).toBe(0);
  });

  it("ok 8px, Shift ile 32px; tuş bırakılınca bir kez kaydediliyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 264 });
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(separator().getAttribute("aria-valuenow")).toBe("272");
    fireEvent.keyDown(separator(), { key: "ArrowLeft", shiftKey: true });
    expect(separator().getAttribute("aria-valuenow")).toBe("240");
    expect(onWidthCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(separator(), { key: "ArrowLeft" });
    expect(onWidthCommit).toHaveBeenCalledTimes(1);
    expect(onWidthCommit).toHaveBeenCalledWith(240);
  });

  it("sınırda ok değeri değiştirmiyor, değişmeyen genişlik kaydedilmiyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 220 });
    fireEvent.keyDown(separator(), { key: "ArrowLeft", shiftKey: true });
    expect(separator().getAttribute("aria-valuenow")).toBe("220");
    fireEvent.keyUp(separator(), { key: "ArrowLeft" });
    expect(onWidthCommit).not.toHaveBeenCalled();
  });

  it("sürüklerken kırpılıyor, yalnızca bırakınca kaydediliyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 264 });
    fireEvent.mouseDown(separator(), { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 150 });
    expect(separator().getAttribute("aria-valuenow")).toBe("314");
    fireEvent.mouseMove(window, { clientX: 900 });
    expect(separator().getAttribute("aria-valuenow")).toBe("420");
    expect(onWidthCommit).not.toHaveBeenCalled();
    fireEvent.mouseUp(window);
    expect(onWidthCommit).toHaveBeenCalledTimes(1);
    expect(onWidthCommit).toHaveBeenCalledWith(420);
    fireEvent.mouseMove(window, { clientX: 100 });
    expect(separator().getAttribute("aria-valuenow")).toBe("420");
  });
});

describe("Sidebar daraltılmış", () => {
  it("daraltma düğmesi daraltılmış hâli istiyor", () => {
    const { onCollapsedChange } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Kenar çubuğunu daralt" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("şeritte mod ikonları ve dipte üç düğme var; liste, sekmeler ve tutamaç yok", () => {
    const { onModeChange, onCollapsedChange, footer } = renderSidebar({ collapsed: true, mode: "sapLauncher" });
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("separator")).toBeNull();
    expect(screen.queryByRole("button", { name: "Liste satırı" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tema" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dil" })).toBeNull();

    expect(screen.getByRole("button", { name: "aXet SAP Logon" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Axet Chat" }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "SAP GUI Scripting" }));
    expect(onModeChange).toHaveBeenCalledWith("sapGuiScripting");

    fireEvent.click(screen.getByRole("button", { name: "Hazırlık" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygulama Bağlantıları" }));
    fireEvent.click(screen.getByRole("button", { name: "Ayarlar" }));
    expect(footer.onOpenReadiness).toHaveBeenCalledTimes(1);
    expect(footer.onOpenConnections).toHaveBeenCalledTimes(1);
    expect(footer.onOpenSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Kenar çubuğunu genişlet" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it("Hazırlık açıkken şeritte mod seçili değil, Hazırlık seçili; adlar arıza ve sayıyı taşıyor", () => {
    renderSidebar({ collapsed: true, readinessOpen: true, footer: { readinessFault: true, connectorCount: 1 } });
    for (const name of ["Axet Chat", "aXet SAP Logon", "SAP GUI Scripting"]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-current")).toBeNull();
    }
    expect(
      screen.getByRole("button", { name: "Hazırlık — çözülmesi gereken bir şey var" }).getAttribute("aria-current")
    ).toBe("page");
    expect(screen.getByRole("button", { name: "Uygulama Bağlantıları — 1 açık" })).toBeTruthy();
  });
});
```

- [ ] **Adım 8: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/shellSidebar.test.tsx`
Beklenen: FAIL; Görev 14'ün 8 testi geçiyor, yeni testler `separator` ve daraltma düğmesini bulamıyor.

- [ ] **Adım 9: `SidebarFooter`'a daraltılmış hâli ve daraltma düğmesini ekle**

`src/shell/SidebarFooter.tsx`'in tamamı:

```tsx
import { Moon, PanelLeftClose, Plug, Settings, Stethoscope, Sun } from "lucide-react";
import type { AppTheme } from "../../app-electron/shared/types";
import { useT } from "../i18n";

export interface SidebarFooterProps {
  readinessOpen: boolean;
  readinessFault: boolean;
  onOpenReadiness: () => void;
  connectorCount: number;
  onOpenConnections: () => void;
  theme: AppTheme;
  // Gösterilen kısa ad ("TR" / "EN"); dili App biliyor.
  language: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
}

// Bunları App değil `Sidebar` veriyor: daraltma kenar çubuğunun kendi işi.
interface ShellOnlyProps {
  collapsed?: boolean;
  onCollapse?: () => void;
}

// Satırlar kenar çubuğunun listeleriyle aynı ölçüde: 28px, 8px yatay boşluk,
// seçili satır `--accent-glow` zemini ve solda 2px çizgi (spec §6.5).
const ROW =
  "relative flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors";
const ICON_BTN =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-hover hover:text-slate-100";
// Daraltılmış şeridin kare düğmesi: 48px şeritte iki yanda 6px boşluk.
const STRIP_BTN =
  "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors";

function selectedClass(selected: boolean) {
  return selected ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:bg-hover/60 hover:text-slate-300";
}

function ActiveLine() {
  return <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-400" />;
}

export default function SidebarFooter({
  readinessOpen,
  readinessFault,
  onOpenReadiness,
  connectorCount,
  onOpenConnections,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  onOpenSettings,
  collapsed = false,
  onCollapse
}: SidebarFooterProps & ShellOnlyProps) {
  const t = useT();
  const readinessName = readinessFault
    ? `${t("shell.readiness")} — ${t("shell.readinessFault")}`
    : t("shell.readiness");
  const connectionsName =
    connectorCount > 0
      ? `${t("shell.connections")} — ${t("shell.connectorsOpen", { count: connectorCount })}`
      : t("shell.connections");

  // Daraltılmış şeritte yalnızca üç düğme (spec §6.3): tema ve dil sık
  // değişen şeyler değil, genişletince yerindeler.
  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-line-subtle py-2">
        <button
          type="button"
          onClick={onOpenReadiness}
          aria-label={readinessName}
          title={readinessName}
          aria-current={readinessOpen ? "page" : undefined}
          className={`${STRIP_BTN} ${selectedClass(readinessOpen)}`}
        >
          {readinessOpen && <ActiveLine />}
          <Stethoscope size={16} aria-hidden />
          {readinessFault && (
            <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--status-danger-text)]" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpenConnections}
          aria-label={connectionsName}
          title={connectionsName}
          className={`${STRIP_BTN} ${selectedClass(false)}`}
        >
          <Plug size={16} aria-hidden />
          {connectorCount > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--status-success-text)]" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t("shell.settings")}
          title={t("shell.settings")}
          className={`${STRIP_BTN} ${selectedClass(false)}`}
        >
          <Settings size={16} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-line-subtle p-2">
      <button
        type="button"
        onClick={onOpenReadiness}
        aria-label={readinessName}
        aria-current={readinessOpen ? "page" : undefined}
        className={`${ROW} ${selectedClass(readinessOpen)}`}
      >
        {readinessOpen && <ActiveLine />}
        <Stethoscope size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("shell.readiness")}</span>
        {/* Arıza noktası renk; ne dediği düğmenin adında yazılı. */}
        {readinessFault && (
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-danger-text)]" />
        )}
      </button>
      <button
        type="button"
        onClick={onOpenConnections}
        aria-label={connectionsName}
        className={`${ROW} ${selectedClass(false)}`}
      >
        <Plug size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("shell.connections")}</span>
        {/* Nokta accent değil durum yeşili: bu bir seçim değil, "araçlar şu
            an açık" diyen bir sağlık göstergesi. Sayı kaç tanesinin açık
            olduğunu söylüyor. */}
        {connectorCount > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-2xs text-slate-400">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--status-success-text)]" />
            {connectorCount}
          </span>
        )}
      </button>
      <div className="mt-1 flex items-center gap-1 px-1">
        {/* Düğme "hangisine geçersin"i gösteriyor: koyu temadayken güneş. */}
        <button type="button" onClick={onToggleTheme} aria-label={t("shell.theme")} title={t("shell.theme")} className={ICON_BTN}>
          {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onToggleLanguage}
          aria-label={t("shell.language")}
          title={t("shell.language")}
          className={`${ICON_BTN} font-mono text-2xs font-semibold`}
        >
          {language}
        </button>
        <button type="button" onClick={onOpenSettings} aria-label={t("shell.settings")} title={t("shell.settings")} className={ICON_BTN}>
          <Settings size={14} aria-hidden />
        </button>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={t("shell.collapseSidebar")}
            title={t("shell.collapseSidebar")}
            className={`${ICON_BTN} ml-auto`}
          >
            <PanelLeftClose size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Adım 10: `Sidebar`'a genişliği, tutamacı ve daraltılmış şeridi ekle**

`src/shell/Sidebar.tsx`'in tamamı:

```tsx
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { MousePointerClick, PanelLeftOpen, Server, Sparkles, type LucideIcon } from "lucide-react";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_KEY_STEP,
  SIDEBAR_KEY_STEP_LARGE,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clampSidebarWidth
} from "../../app-electron/shared/sidebarLayout";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { Tabs } from "../ui/Tabs";
import SidebarFooter, { type SidebarFooterProps } from "./SidebarFooter";
import { SIDEBAR_MODES, type SidebarMode } from "./activity";

export interface SidebarProps {
  // Ortada listesi duran mod (bkz. `listModeOf`).
  mode: SidebarMode;
  readinessOpen: boolean;
  onModeChange: (mode: SidebarMode) => void;
  footer: SidebarFooterProps;
  // Kayıtlı genişlik; sürüklerken gösterilen değer bileşenin kendi durumu.
  width: number;
  collapsed: boolean;
  // Sürükleme bitince ya da ok tuşu bırakılınca, değer değiştiyse bir kez.
  onWidthCommit: (width: number) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  // Modun listesi: `ChatSidebar`, `LogonSidebar` ya da `ScriptSidebar`.
  children: ReactNode;
}

const MODE_LABEL: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.modeChat",
  sapLauncher: "shell.modeLogon",
  sapGuiScripting: "shell.modeScript"
};

// Daraltılmış şeritte sekme yok, ikon var; ipucu ve erişilebilir ad modun
// uzun adı.
const MODE_ICON: Record<SidebarMode, LucideIcon> = {
  axetCode: Sparkles,
  sapLauncher: Server,
  sapGuiScripting: MousePointerClick
};
const MODE_NAME: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.axetCode",
  sapLauncher: "shell.sapLauncher",
  sapGuiScripting: "shell.sapGuiScripting"
};

const STRIP_BTN =
  "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors";

export default function Sidebar({
  mode,
  readinessOpen,
  onModeChange,
  footer,
  width,
  collapsed,
  onWidthCommit,
  onCollapsedChange,
  children
}: SidebarProps) {
  const t = useT();
  const items = SIDEBAR_MODES.map((value) => ({ value, label: t(MODE_LABEL[value]) }));

  // Gösterilen genişlik. Sürüklerken her harekette değişiyor ama config'e
  // yalnızca bırakınca gidiyor (spec §6.3); ref, pencere dinleyicilerinin
  // eski bir render'ın değerini okumaması için.
  const [liveWidth, setLiveWidth] = useState(() => clampSidebarWidth(width));
  const liveRef = useRef(liveWidth);
  useEffect(() => {
    const next = clampSidebarWidth(width);
    liveRef.current = next;
    setLiveWidth(next);
  }, [width]);

  function setLive(next: number) {
    const clamped = clampSidebarWidth(next);
    liveRef.current = clamped;
    setLiveWidth(clamped);
  }

  function commit() {
    if (liveRef.current !== width) onWidthCommit(liveRef.current);
  }

  function onResizeMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = liveRef.current;
    const onMove = (ev: MouseEvent) => setLive(startWidth + ev.clientX - startX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      commit();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onResizeKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.shiftKey ? SIDEBAR_KEY_STEP_LARGE : SIDEBAR_KEY_STEP;
    setLive(liveRef.current + (e.key === "ArrowRight" ? step : -step));
  }

  function onResizeKeyUp(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") commit();
  }

  // Hazırlık açıkken ortadaki liste son modun. Ona dokunmak o moda dönüyor:
  // listede seçilen şeyin ekranı görünsün diye, ve Script ekranı yalnızca
  // aktifken mount olduğu için `ScriptSidebar`'ın komutlarını karşılayan
  // biri ancak böyle oluyor. Fare için `pointerdown` (tıklamadan önce geliyor,
  // ekran tıklama işlenmeden mount oluyor), klavye için odak.
  const returnToMode = readinessOpen ? () => onModeChange(mode) : undefined;

  if (collapsed) {
    return (
      <aside
        aria-label={t("shell.sidebar")}
        style={{ width: SIDEBAR_COLLAPSED_WIDTH }}
        className="flex shrink-0 flex-col items-center overflow-hidden border-r border-line-subtle bg-sidebar"
      >
        <div className="flex flex-col items-center gap-1 py-2">
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            aria-label={t("shell.expandSidebar")}
            title={t("shell.expandSidebar")}
            className={`${STRIP_BTN} text-slate-400 hover:bg-hover hover:text-slate-100`}
          >
            <PanelLeftOpen size={16} aria-hidden />
          </button>
          <nav aria-label={t("shell.modes")} className="mt-1 flex flex-col items-center gap-1">
            {SIDEBAR_MODES.map((value) => {
              const Icon = MODE_ICON[value];
              const current = !readinessOpen && value === mode;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  aria-label={t(MODE_NAME[value])}
                  title={t(MODE_NAME[value])}
                  aria-current={current ? "page" : undefined}
                  className={`${STRIP_BTN} ${
                    current
                      ? "bg-[var(--accent-glow)] text-slate-100"
                      : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
                  }`}
                >
                  {current && (
                    <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-400" />
                  )}
                  <Icon size={16} aria-hidden />
                </button>
              );
            })}
          </nav>
        </div>
        <div className="min-h-0 flex-1" />
        <SidebarFooter {...footer} collapsed />
      </aside>
    );
  }

  return (
    <aside
      aria-label={t("shell.sidebar")}
      style={{ width: liveWidth }}
      className="relative flex shrink-0 flex-col overflow-hidden border-r border-line-subtle bg-sidebar"
    >
      <div className="shrink-0 p-2">
        <Tabs
          label={t("shell.modes")}
          items={items}
          value={readinessOpen ? null : mode}
          onChange={onModeChange}
          stretch
        />
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onPointerDownCapture={returnToMode}
        onFocusCapture={returnToMode}
      >
        {children}
      </div>
      <SidebarFooter {...footer} onCollapse={() => onCollapsedChange(true)} />
      {/* Tutamaç kenar çubuğunun sağ kenarında, içeride: `overflow-hidden`
          dışarı taşanı kesiyor. 4px geniş, fare ve klavyeyle kullanılıyor. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("shell.resizeWidth")}
        aria-valuenow={liveWidth}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        tabIndex={0}
        onMouseDown={onResizeMouseDown}
        onKeyDown={onResizeKeyDown}
        onKeyUp={onResizeKeyUp}
        className="absolute inset-y-0 right-0 w-1 cursor-col-resize outline-none hover:bg-accent-500/50 focus-visible:bg-accent-500/50"
      />
    </aside>
  );
}
```

`shell.axetCode`, `shell.sapLauncher`, `shell.sapGuiScripting` Görev 14'te `activityBar.*`'tan taşınan anahtarlar ("Axet Chat", "aXet SAP Logon", "SAP GUI Scripting").

- [ ] **Adım 11: Testi çalıştır**

Çalıştır: `npx vitest run tests/shellSidebar.test.tsx`
Beklenen: PASS, 15 test.

- [ ] **Adım 12: `App.tsx`'i bağla**

1. Import:

```ts
import { SIDEBAR_DEFAULT_WIDTH } from "../app-electron/shared/sidebarLayout";
```

2. `handleToggleLanguage`'ın hemen altına:

```ts
  // Kenar çubuğunun genişliği ve daraltması config'te duruyor; bileşen
  // değer değişince bir kez haber veriyor, burada doğrudan yazılıyor.
  const sidebarWidth = config?.sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH;
  const sidebarCollapsed = config?.sidebarCollapsed ?? false;

  const handleSidebarWidthCommit = useCallback(async (width: number) => {
    setConfig(await window.api.saveConfig({ sidebarWidth: width }));
  }, []);

  const handleSidebarCollapsedChange = useCallback(async (collapsed: boolean) => {
    setConfig(await window.api.saveConfig({ sidebarCollapsed: collapsed }));
  }, []);
```

3. `<Sidebar>`'a (Görev 14) dört prop ekle:

```tsx
            width={sidebarWidth}
            collapsed={sidebarCollapsed}
            onWidthCommit={handleSidebarWidthCommit}
            onCollapsedChange={handleSidebarCollapsedChange}
```

`onWidthCommit` `(width) => void` bekliyor, `Promise<void>` dönen işlevi kabul ediyor.

4. Ctrl+F efekti. Arama kutusu daraltılmış kenar çubuğunda çizili değil, önce açılması gerekiyor. Açma bir IPC gidiş-dönüşü, odak da ondan sonra veriliyor. Efekti şöyle yap ve `handleSidebarCollapsedChange`'in **altına** taşı (tanımından önce kullanılamaz):

```ts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const focusSearch = () => requestAnimationFrame(() => searchInputRef.current?.focus());
        // Arama kutusu kenar çubuğunda (`LogonSidebar`). Daraltılmışsa kutu
        // çizili değil: önce açılıyor, odak config güncellenince veriliyor.
        if (sidebarCollapsed && listMode === "sapLauncher") {
          void handleSidebarCollapsedChange(false).then(focusSearch);
          return;
        }
        focusSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarCollapsed, listMode, handleSidebarCollapsedChange]);
```

Başka ekrandayken Ctrl+F bugünkü gibi yalnızca varsayılanı engelliyor; Logon'un arama kutusu orada çizili değil. Görev 16 bu efekti kısayol kancasına taşıyor.

- [ ] **Adım 13: Bütün takımı çalıştır**

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok. `tests/i18n.test.ts` taşınan ve silinen anahtarlardan sonra da iki dili eşit buluyor. `tests/designScale.test.ts` sınırına dokunma (Görev 17).

- [ ] **Adım 14: Commit**

```bash
git add app-electron/shared/sidebarLayout.ts app-electron/shared/types.ts app-electron/main/store.ts
git add src/shell/Sidebar.tsx src/shell/SidebarFooter.tsx src/App.tsx src/components/SettingsModal.tsx
git add src/i18n/tr.ts src/i18n/en.ts
git add tests/sidebarConfig.test.ts tests/shellSidebar.test.tsx
git add tests/dialogMigration.test.tsx tests/settingsAppearance.test.tsx tests/settingsOpenForm.test.tsx
git commit -m "Grafit: kenar cubugu genisligi ve daraltma config'te; chatSidebarOpen gocu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 16: Kabuk kısayolları — `useShellShortcuts`

Kısayollar tek bir kancada toplanıyor (spec §6.4):

- **Ctrl+1 / 2 / 3:** Sohbet / Logon / Script. Olay gömülü terminalin (xterm) içinden geliyorsa dokunulmuyor; terminal bu tuşları kendisi kullanabilir.
- **`/`:** o modun arama kutusunu (`[data-sidebar-search]`, Görev 11 ve 13) odaklıyor. Odak bir yazı alanındaysa (input, textarea, select, contenteditable, xterm) hiçbir şey olmuyor. Sohbet kutusundaki `/` menüsü de bu yüzden etkilenmiyor. Script'te arama yok, orada da bir şey olmuyor. Kenar çubuğu daraltılmışsa önce açılıyor, odak açıldıktan sonra veriliyor.
- **Ctrl+F:** bugünkü gibi her ekranda tarayıcının bul çubuğunu engelliyor; Logon'daysa arama kutusunu odaklıyor. Görev 15'te App'e eklenen efekt buraya taşınıyor.
- **Ctrl+B yok:** gömülü terminalde axet-code'un kendi kısayolu.

Logon'un terminali tam ekrandayken kenar çubuğu gizli (Görev 14). O sırada `/` ve Ctrl+F kutuyu aramıyor, daraltılmış kenar çubuğunu da açmıyor.

Kanca dinleyiciyi bir kez kuruyor, güncel değerleri bir ref'ten okuyor. Böylece her render'da yeniden kurulmuyor.

**Dosyalar:**
- Oluştur: `src/shell/useShellShortcuts.ts`
- Değiştir: `src/App.tsx`: Görev 15'teki Ctrl+F efekti kalkıyor; kanca çağrısı; `sidebarHidden`
- Test: `tests/shellShortcuts.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: `SIDEBAR_MODES`, `SidebarMode` (Görev 14, `src/shell/activity.ts`); `data-sidebar-search` niteliği (Görev 11 `ChatSidebar`, Görev 13 `LogonSidebar`); App'teki `listMode` (Görev 14), `sidebarCollapsed` ve `handleSidebarCollapsedChange` (Görev 15).
- Üretir:
  - `export interface ShellShortcutOptions { listMode: SidebarMode; sidebarCollapsed: boolean; sidebarHidden: boolean; onModeChange: (mode: SidebarMode) => void; onExpandSidebar: () => Promise<void> }`
  - `export function useShellShortcuts(options: ShellShortcutOptions): void`
  - `export function isInTerminal(target: EventTarget | null): boolean`
  - `export function isTypingTarget(target: EventTarget | null): boolean`

- [ ] **Adım 1: Başarısız testi yaz**

`tests/shellShortcuts.test.tsx`:

```tsx
// @vitest-environment jsdom
// Kabuk kısayolları (spec §6.4). Kanca `window`'u dinliyor; olaylar gerçek
// öğelerden kabarcıkla geliyor, böylece "odak nerede" kuralı sınanıyor.
// `fireEvent` olay engellendiyse `false` döndürüyor.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SidebarMode } from "../src/shell/activity";
import { isTypingTarget, useShellShortcuts, type ShellShortcutOptions } from "../src/shell/useShellShortcuts";

afterEach(cleanup);

beforeEach(() => {
  // Odak bir kare sonra veriliyor; testte kare hemen işlesin.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Harness(props: ShellShortcutOptions) {
  useShellShortcuts(props);
  return (
    <div>
      <input aria-label="Ara" data-sidebar-search />
      <textarea aria-label="Mesaj" />
      <div aria-label="Düzenlenebilir" contentEditable suppressContentEditableWarning />
      <div className="xterm">
        <textarea aria-label="Terminal girdisi" />
      </div>
      <button type="button">Düğme</button>
    </div>
  );
}

function setup(over: Partial<ShellShortcutOptions> = {}) {
  const props: ShellShortcutOptions = {
    listMode: "axetCode",
    sidebarCollapsed: false,
    sidebarHidden: false,
    onModeChange: vi.fn(),
    onExpandSidebar: vi.fn(async () => {}),
    ...over
  };
  const utils = render(<Harness {...props} />);
  return { props, ...utils };
}

const search = () => screen.getByRole("textbox", { name: "Ara" });

describe("Ctrl+1 / 2 / 3", () => {
  it("sırayla Sohbet, Logon, Script", () => {
    const { props } = setup();
    const modes: SidebarMode[] = ["axetCode", "sapLauncher", "sapGuiScripting"];
    modes.forEach((mode, i) => {
      expect(fireEvent.keyDown(document.body, { key: String(i + 1), ctrlKey: true })).toBe(false);
      expect(props.onModeChange).toHaveBeenLastCalledWith(mode);
    });
  });

  it("sıradan bir yazı alanında da çalışıyor", () => {
    const { props } = setup();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Mesaj" }), { key: "2", ctrlKey: true });
    expect(props.onModeChange).toHaveBeenCalledWith("sapLauncher");
  });

  it("terminalin içinden gelince dokunulmuyor", () => {
    const { props } = setup();
    const terminal = screen.getByRole("textbox", { name: "Terminal girdisi" });
    expect(fireEvent.keyDown(terminal, { key: "2", ctrlKey: true })).toBe(true);
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("Shift, Alt ya da başka bir rakamla hiçbir şey olmuyor", () => {
    const { props } = setup();
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true, altKey: true });
    fireEvent.keyDown(document.body, { key: "4", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "1" });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("bileşen kalkınca dinleyici de kalkıyor", () => {
    const { props, unmount } = setup();
    unmount();
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });
});

describe("/", () => {
  it("yazı alanı dışındayken arama kutusunu odaklıyor", () => {
    setup({ listMode: "sapLauncher" });
    const button = screen.getByRole("button", { name: "Düğme" });
    button.focus();
    expect(fireEvent.keyDown(button, { key: "/" })).toBe(false);
    expect(document.activeElement).toBe(search());
  });

  it("yazı alanlarında ve terminalde karışmıyor", () => {
    setup();
    for (const name of ["Mesaj", "Terminal girdisi", "Ara"]) {
      const field = screen.getByRole("textbox", { name });
      field.focus();
      expect(fireEvent.keyDown(field, { key: "/" })).toBe(true);
      expect(document.activeElement).toBe(field);
    }
    const editable = screen.getByLabelText("Düzenlenebilir");
    expect(fireEvent.keyDown(editable, { key: "/" })).toBe(true);
  });

  it("Script'te ve kenar çubuğu gizliyken hiçbir şey olmuyor", () => {
    setup({ listMode: "sapGuiScripting" });
    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(true);
    expect(document.activeElement).not.toBe(search());
    cleanup();

    const { props } = setup({ listMode: "sapLauncher", sidebarHidden: true, sidebarCollapsed: true });
    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(true);
    expect(props.onExpandSidebar).not.toHaveBeenCalled();
  });

  it("kenar çubuğu daraltılmışsa önce açıyor, sonra odaklıyor", async () => {
    const { props } = setup({ sidebarCollapsed: true });
    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(false);
    expect(props.onExpandSidebar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(search()));
  });

  it("Ctrl ile basılınca kısayol değil", () => {
    setup();
    expect(fireEvent.keyDown(document.body, { key: "/", ctrlKey: true })).toBe(true);
    expect(document.activeElement).not.toBe(search());
  });
});

describe("Ctrl+F", () => {
  it("Logon'da yazı alanından bile arama kutusunu odaklıyor", () => {
    setup({ listMode: "sapLauncher" });
    const message = screen.getByRole("textbox", { name: "Mesaj" });
    message.focus();
    expect(fireEvent.keyDown(message, { key: "f", ctrlKey: true })).toBe(false);
    expect(document.activeElement).toBe(search());
  });

  it("başka modda yalnızca tarayıcının bul çubuğunu engelliyor", () => {
    setup({ listMode: "axetCode" });
    expect(fireEvent.keyDown(document.body, { key: "F", ctrlKey: true })).toBe(false);
    expect(document.activeElement).not.toBe(search());
  });

  it("Logon'da daraltılmışsa önce açıyor; gizliyken açmıyor", async () => {
    const first = setup({ listMode: "sapLauncher", sidebarCollapsed: true });
    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    expect(first.props.onExpandSidebar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(search()));
    cleanup();

    const second = setup({ listMode: "sapLauncher", sidebarCollapsed: true, sidebarHidden: true });
    expect(fireEvent.keyDown(document.body, { key: "f", ctrlKey: true })).toBe(false);
    expect(second.props.onExpandSidebar).not.toHaveBeenCalled();
  });
});

describe("isTypingTarget", () => {
  it("yazı alanlarını ve terminali tanıyor, düğmeyi değil", () => {
    setup();
    expect(isTypingTarget(screen.getByRole("textbox", { name: "Mesaj" }))).toBe(true);
    expect(isTypingTarget(screen.getByRole("textbox", { name: "Terminal girdisi" }))).toBe(true);
    expect(isTypingTarget(screen.getByLabelText("Düzenlenebilir"))).toBe(true);
    expect(isTypingTarget(screen.getByRole("button", { name: "Düğme" }))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
```

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/shellShortcuts.test.tsx`
Beklenen: FAIL, `../src/shell/useShellShortcuts` bulunamıyor.

- [ ] **Adım 3: Kancayı yaz**

`src/shell/useShellShortcuts.ts`:

```ts
import { useEffect, useRef } from "react";
import { SIDEBAR_MODES, type SidebarMode } from "./activity";

export interface ShellShortcutOptions {
  // Ortada listesi duran mod; `/` ve Ctrl+F hangi arama kutusunun
  // kastedildiğini buradan biliyor.
  listMode: SidebarMode;
  sidebarCollapsed: boolean;
  // Logon terminali tam ekranken kenar çubuğu hiç çizilmiyor.
  sidebarHidden: boolean;
  onModeChange: (mode: SidebarMode) => void;
  // Config'e yazıp döndüğünde kutu çizilmiş oluyor; odak ondan sonra.
  onExpandSidebar: () => Promise<void>;
}

// Gömülü terminal (xterm) kendi tuşlarını kendi işliyor; axet-code'un TUI'si
// Ctrl+rakam ve `/` kullanabilir.
export function isInTerminal(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".xterm") !== null;
}

// `/` yazılabilen yerde bir karakter, kısayol değil. `isContentEditable`
// jsdom'da yok; nitelikten bakılıyor.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isInTerminal(target)) return true;
  if (target.closest('[contenteditable]:not([contenteditable="false"])')) return true;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function focusSidebarSearch() {
  // Bir kare sonra: kutu o anda çizilmiyor olabilir (daraltma yeni açıldı,
  // Hazırlık'tan dönülüyor).
  requestAnimationFrame(() => {
    document.querySelector<HTMLInputElement>("[data-sidebar-search]")?.focus();
  });
}

// Kabuk kısayolları (spec §6.4). Ctrl+B bilerek yok: gömülü terminalde
// axet-code'un kendi kısayolu.
export function useShellShortcuts(options: ShellShortcutOptions): void {
  // Dinleyici bir kez kuruluyor, değerler her render'da buraya yazılıyor.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const openSearch = () => {
      const { sidebarCollapsed, onExpandSidebar } = latest.current;
      if (sidebarCollapsed) {
        void onExpandSidebar().then(focusSidebarSearch);
        return;
      }
      focusSidebarSearch();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const { listMode, sidebarHidden, onModeChange } = latest.current;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && !e.altKey && !e.shiftKey && /^[1-3]$/.test(e.key)) {
        if (isInTerminal(e.target)) return;
        e.preventDefault();
        onModeChange(SIDEBAR_MODES[Number(e.key) - 1]);
        return;
      }

      // Tarayıcının bul çubuğu bu uygulamada anlamsız; her ekranda
      // engelleniyor (bugünkü davranış). Kutu yalnızca Logon'da.
      if (mod && !e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (listMode === "sapLauncher" && !sidebarHidden) openSearch();
        return;
      }

      if (e.key === "/" && !mod && !e.altKey) {
        if (sidebarHidden || listMode === "sapGuiScripting" || isTypingTarget(e.target)) return;
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
```

`/`'de Shift'e bakılmıyor: Türkçe Q klavyede `/` Shift+7, `e.key` yine `"/"`.

- [ ] **Adım 4: Testi çalıştır**

Çalıştır: `npx vitest run tests/shellShortcuts.test.tsx`
Beklenen: PASS, 14 test.

- [ ] **Adım 5: `App.tsx`'i bağla**

1. Import:

```ts
import { useShellShortcuts } from "./shell/useShellShortcuts";
```

2. Görev 15'te `handleSidebarCollapsedChange`'in altına taşınan Ctrl+F efektini (`if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f")` içeren `useEffect`) bütünüyle sil. Yerine:

```ts
  // Logon terminali tam ekranken kenar çubuğu çizilmiyor (bkz. <Sidebar>).
  const sidebarHidden = activity === "sapLauncher" && terminalFullscreen;

  useShellShortcuts({
    listMode,
    sidebarCollapsed,
    sidebarHidden,
    onModeChange: setActivity,
    onExpandSidebar: () => handleSidebarCollapsedChange(false)
  });
```

3. `<Sidebar>`'ı saran koşulu (Görev 14: `{!(activity === "sapLauncher" && terminalFullscreen) && (`) `{!sidebarHidden && (` yap.

4. `searchInputRef` `LogonSidebar`'a verilmeye devam ediyor; App'te başka kullanımı kalmadıysa da tanımı kalıyor (prop olarak kullanılıyor).

Kontrol:

Çalıştır: `grep -n 'toLowerCase() === "f"' src/App.tsx`
Beklenen: çıktı yok.

- [ ] **Adım 6: Bütün takımı çalıştır**

Çalıştır: `npm test && npm run typecheck`
Beklenen: PASS, tip hatası yok.

- [ ] **Adım 7: Commit**

```bash
git add src/shell/useShellShortcuts.ts src/App.tsx tests/shellShortcuts.test.tsx
git commit -m "Grafit: kabuk kisayollari; Ctrl+1/2/3, / ve Ctrl+F tek kancada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 17: DUR — 1b gözle kontrol

Kod değişikliği yok; istisnalar cırcır ve bulunan küçük sorunlar. Dal bu adım bitmeden ve kullanıcı bakmadan "bitti" sayılmıyor (spec §7: "1a ve 1b sonunda altı görünüm çalışan uygulamada gözle kontrol edildi").

**Dosyalar:**
- Değiştir: `tests/designScale.test.ts` (cırcır; Görev 4'teki hâli)
- Diğerleri bulunan soruna göre.

- [ ] **Adım 1: Cırcırı ölçülen değere indir**

1b'de `ActivityBar` silindi, üç kenar çubuğu yeni bileşenlere taşındı; elle yazılmış `text-[Npx]` sayısı düşmüş olmalı. Ölç:

Çalıştır: `grep -o 'text-\[[0-9.]*px\]' -r src | wc -l`
Beklenen: 186 ya da daha az. 186'dan fazlaysa 1b'de yeni `text-[Npx]` yazılmış demek; `grep -rn 'text-\[[0-9.]*px\]' src` ile bul, ölçekteki karşılığıyla (`text-2xs` 11px, `text-xs` 12.5px, `text-sm` 14px) değiştir, sonra yeniden ölç.

`tests/designScale.test.ts`'te "cırcır: elle yazılmış px yazı boyu" testinin yorumunu, adını ve sınırını ölçülen sayıyla (aşağıda `<N>` yazan yerler, üçü de aynı sayı) güncelle:

```ts
  // 207 → 205 (Görev 1, düğme boyları) → 191 (Görev 8, taşınan beş pencere)
  // → 186 (grafit Görev 4, beş bölüm başlığı Eyebrow'a)
  // → <N> (grafit Görev 17, kenar çubukları kabuğa taşındı).
  it("<N>'i geçmiyor", () => {
```

ve `toBeLessThanOrEqual(186)` → `toBeLessThanOrEqual(<N>)`. Türkçe ek sayıya göre değişiyor ("190'ı", "180'i", "175'i"); sayıyı okuyarak yaz. Sayı 186'ya eşitse bu adımı atla, commit'e bu dosyayı ekleme.

Çalıştır: `npx vitest run tests/designScale.test.ts`
Beklenen: PASS.

- [ ] **Adım 2: Takımı ve tipleri çalıştır**

Çalıştır: `npm test && npm run typecheck`
Beklenen: hepsi PASS, tip hatası yok; `tests/dialogDataLoss.test.tsx` dahil.

Çalıştır: `grep -rn "ActivityBar\|chatSidebarOpen" src app-electron`
Beklenen: `ActivityBar` yalnızca iki yorumda (`AppConnectionsModal.tsx`, `AxetFlowsHome.tsx`; Görev 14); `chatSidebarOpen` yalnızca göç kodunda (`app-electron/shared/sidebarLayout.ts`, `app-electron/main/store.ts`; Görev 15).

- [ ] **Adım 3: Cırcırı commit et**

Adım 1'de dosya değiştiyse:

```bash
git add tests/designScale.test.ts
git commit -m "Grafit: px yazi boyu circiri 1b sonundaki olcume indi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Adım 4: Uygulamayı aç**

Kullanıcıdan çalışan NTT Studio'yu kapatmasını iste (tek örnek kilidi `npm run dev`'i hemen kapatıyor). Sonra: `npm run dev`. Uygulama kullanıcının gerçek `config.json`'ıyla açılıyor; Görev 15'in göçü burada ilk kez gerçek bir dosyada çalışıyor. Açılışta kenar çubuğunun hâli, eski "Sohbet listesi açık başlasın" ayarıyla uyuşmalı (kapalıysa daraltılmış).

- [ ] **Adım 5: Altı görünümde kabuğu gez**

Ayarlar → Görünüm'den sırayla NTT mavisi, İndigo, Amber × Koyu, Açık. Her görünümde pencere önce 980px genişlikte, sonra geniş. Bak:

- **Mod sekmeleri:** Sohbet, Logon, Script arasında geçiş; seçili sekme vurgu renginde; liste değişiyor, ekran değişiyor.
- **Listeler:** Sohbet grupları (SAP, Genel, projeler), Logon ağacı ve son kullanılanlar, Script oturumları. Seçili satırda solda 2px çizgi ve `--accent-glow` zemini; DEV/QA/PRD etiketi seçili satırla yan yana gelince ayırt ediliyor mu (NTT mavisi ~ DEV mavisi, Amber ~ QA kehribarı — spec §8).
- **Dip blok:** Hazırlık (arıza varsa kırmızı nokta), Uygulama Bağlantıları (açık bağlayıcı sayısı, yeşil nokta), tema, dil, Ayarlar, daraltma düğmesi. Tema ve dil düğmeleri anında değiştiriyor.
- **Hazırlık:** açıkken hiçbir sekme seçili değil, liste son modun; listeye tıklamak o moda dönüyor. Tab ile sekmelere ulaşılıyor.
- **Genişlik:** tutamacı sürükle; 220 ve 420'de duruyor. Tutamaca Tab ile gel, oklarla ve Shift+oklarla değiştir. Uygulamayı kapatıp aç: genişlik kalmış.
- **Daraltma:** 48px şerit; üç mod ikonu (ipucu modun adı), Hazırlık, Bağlantılar, Ayarlar. Açma düğmesi geri getiriyor. Kapatıp aç: hâl kalmış.
- **Kısayollar:** Ctrl+1/2/3 modu değiştiriyor, gömülü terminalin içindeyken değiştirmiyor. `/` Sohbet'te ve Logon'da arama kutusunu odaklıyor; sohbet kutusunda yazarken `/` menüsü eskisi gibi açılıyor. Ctrl+F Logon'da aramayı odaklıyor. Daraltılmışken `/` önce açıyor.
- **Logon terminali tam ekran:** kenar çubuğu gizleniyor, çıkınca geri geliyor.
- **Script:** bir oturum seçip Sohbet'e geç, geri dön; seçim duruyor. Oturum o arada SAP'de kapandıysa seçim temizlenmiş (Görev 12).
- **Genel:** taşan ya da kesilen metin (uzun sistem adları, uzun sohbet başlıkları, 220px'te); soluk gri üstünde soluk gri; eski renk kalıntısı.

- [ ] **Adım 6: Bulunanları düzelt ya da not et**

Küçük sorun (tek sınıf, tek renk, tek yorum) o anda düzeltiliyor; her düzeltme kendi testiyle ve kendi commit'iyle. Renk değişikliğinden önce `tests/themeTokens.test.ts` kontrast sınırını ölçüyor — ölçmeden renk değiştirme. Büyük olanlar kullanıcıya liste olarak veriliyor.

- [ ] **Adım 7: Kullanıcıya göster**

Kullanıcıya altı görünümün kısa özetini, bulunanları ve düzeltilenleri yaz. Dalın birleştirilmesi (`tasarim/grafit` → `main`) ayrıca onay istiyor; onay gelmeden birleştirme, push yok.
