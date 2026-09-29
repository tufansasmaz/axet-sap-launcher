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
