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
  // 207 → 205 (Görev 1, düğme boyları) → 191 (Görev 8, taşınan beş pencere).
  // Sınır ölçülen değer: bir ekran ölçeğe taşındıkça burası da aşağı çekilir.
  it("191'i geçmiyor", () => {
    let count = 0;
    for (const file of walk(SRC)) {
      count += (readFileSync(file, "utf8").match(/text-\[[0-9.]+px\]/g) ?? []).length;
    }
    expect(count).toBeLessThanOrEqual(191);
  });
});
