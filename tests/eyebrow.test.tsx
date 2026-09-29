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
  it("ChatSidebar ve ChatSessionPane'de eski kalıp yok, Eyebrow kullanılıyor", () => {
    for (const name of ["ChatSidebar.tsx", "ChatSessionPane.tsx"]) {
      const text = readFileSync(path.join(__dirname, "..", "src", "components", name), "utf8");
      expect(text).not.toContain("text-[10px] font-semibold uppercase tracking-wider");
      expect(text).toContain("<Eyebrow");
    }
  });
});
