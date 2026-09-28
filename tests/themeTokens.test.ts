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
