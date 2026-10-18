// @vitest-environment jsdom
// Ofis karakteri (spec 2026-10-18 ofis-gorunumu §4): pozlar, hareket yalnız
// kesin çalışmada, "hareketi azalt", tehlike işareti, bölme rengi; yeni renk yok.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfficeCharacter from "../src/office/OfficeCharacter";

const ROOT = path.join(__dirname, "..");

/** jsdom'da matchMedia yok; "hareketi azalt" tercihini taklit ediyor ve sonradan değiştirebiliyor. */
function mockMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn((media: string) => ({
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn)
  }));
  return {
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((fn) => fn()));
    }
  };
}

afterEach(() => {
  cleanup();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

const svg = () => document.querySelector("svg") as SVGSVGElement;
const cls = (el: Element | null) => el?.getAttribute("class") ?? "";
const moving = () => document.querySelectorAll(".office-typing, .office-glow").length;

describe("OfficeCharacter", () => {
  it("kesin çalışma: eller yazıyor, ekran parlıyor; çizim ekran okuyucudan gizli", () => {
    mockMotion(false);
    render(<OfficeCharacter pose="typing" motion color="var(--status-info-text)" />);
    expect(svg().getAttribute("aria-hidden")).toBe("true");
    expect(svg().getAttribute("data-pose")).toBe("typing");
    const hands = document.querySelectorAll("[data-hands] rect");
    expect(hands).toHaveLength(2);
    for (const hand of hands) expect(cls(hand)).toContain("office-typing");
    expect(cls(document.querySelector("[data-screen]"))).toContain("office-glow");
  });

  it("hareket istenmiyorsa (tahmini) aynı poz ama hiçbir hareket sınıfı yok", () => {
    mockMotion(false);
    render(<OfficeCharacter pose="typing" motion={false} color={null} />);
    expect(svg().getAttribute("data-pose")).toBe("typing");
    expect(moving()).toBe(0);
  });

  it("hareketi azalt açıkken motion olsa da hareket sınıfı yok", () => {
    mockMotion(true);
    render(<OfficeCharacter pose="typing" motion color={null} />);
    expect(moving()).toBe(0);
  });

  it("hareketi azalt sonradan açılınca sınıflar kalkıyor", () => {
    const media = mockMotion(false);
    render(<OfficeCharacter pose="typing" motion color={null} />);
    expect(moving()).toBe(3);
    media.set(true);
    expect(moving()).toBe(0);
  });

  it("matchMedia yoksa çökmüyor, hareket var", () => {
    render(<OfficeCharacter pose="typing" motion color={null} />);
    expect(moving()).toBe(3);
  });

  it("bölme rengi kişide; gri bölmede tema mürekkebi", () => {
    render(<OfficeCharacter pose="resting" motion={false} color="var(--status-info-text)" />);
    expect((document.querySelector("[data-person] circle") as SVGElement).style.fill).toBe("var(--status-info-text)");
    cleanup();
    render(<OfficeCharacter pose="resting" motion={false} color={null} />);
    expect(cls(document.querySelector("[data-person] circle"))).toContain("fill-slate-400");
  });

  it("hata: ekranda tehlike işareti; başka pozda yok", () => {
    render(<OfficeCharacter pose="error" motion={false} color={null} />);
    const mark = document.querySelector("[data-danger-mark]") as SVGElement;
    expect(mark).toBeTruthy();
    expect(mark.style.fill).toBe("var(--status-danger-solid)");
    cleanup();
    render(<OfficeCharacter pose="asking" motion={false} color={null} />);
    expect(document.querySelector("[data-danger-mark]")).toBeNull();
  });

  it("bilinmiyor soluk; kurulu değil: masa boş ve soluk; dinlenen kişi arkaya yaslanmış", () => {
    render(<OfficeCharacter pose="unknown" motion={false} color={null} />);
    expect(cls(svg())).toContain("opacity-40");
    expect(document.querySelector("[data-person]")).toBeTruthy();
    cleanup();
    render(<OfficeCharacter pose="absent" motion={false} color={null} />);
    expect(cls(svg())).toContain("opacity-40");
    expect(document.querySelector("[data-person]")).toBeNull();
    cleanup();
    render(<OfficeCharacter pose="resting" motion={false} color={null} />);
    expect(cls(svg())).not.toContain("opacity-40");
    expect(document.querySelector("[data-person]")?.getAttribute("transform")).toBe("rotate(-10 36 64)");
  });

  it("CSS: animasyon tanımlı ve 'hareketi azalt' bloğu ikisini de kapatıyor", () => {
    const css = readFileSync(path.join(ROOT, "src", "index.css"), "utf8").replace(/\r\n/g, "\n");
    expect(css).toMatch(/@keyframes office-typing \{/);
    expect(css).toMatch(/@keyframes office-glow \{/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.office-typing,\s*\.office-glow \{\s*animation: none;\s*\}\s*\}/);
  });

  it("src/office altında yeni renk yok: hex, rgb/hsl, lime sınıfı, uydurma hata jetonu", () => {
    const dir = path.join(ROOT, "src", "office");
    const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(path.join(dir, file), "utf8");
      expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(text, file).not.toMatch(/\b(rgba?|hsla?)\(/);
      expect(text, file).not.toMatch(/\blime-\d/);
      expect(text, file).not.toMatch(/var\(--status-error/);
    }
  });
});
