// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AppLogo from "../src/components/AppLogo";
import { THEME_SURFACES } from "../app-electron/shared/themeSurfaces";

afterEach(cleanup);

// Eski kimliğin renkleri: lacivert zemin, mor→camgöbeği geçiş.
const OLD_COLORS = ["#0c1023", "#161b3a", "#6d5efc", "#8b7dff", "#22d3ee"];

describe("uygulama içi logo", () => {
  it("ok ve hız çizgileri vurgu jetonuyla, kutu yüzey jetonuyla boyanıyor; sabit renk yok", () => {
    const { container } = render(<AppLogo size={16} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("16");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    const html = svg.outerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(svg.querySelector("rect")!.getAttribute("fill")).toContain("--surface-");
    const strokes = [...svg.querySelectorAll("path, line")].map((el) => el.getAttribute("stroke"));
    expect(strokes.length).toBe(4);
    for (const s of strokes) expect(s).toBe("rgb(var(--accent-500-rgb))");
  });
});

describe("simge dosyaları", () => {
  const logo = readFileSync("src/assets/logo.svg", "utf8");

  it("build/icon.svg ile src/assets/logo.svg aynı", () => {
    expect(readFileSync("build/icon.svg", "utf8")).toBe(logo);
  });

  it("eski lacivert/mor renkler yok; grafit zemin, Amber ok", () => {
    for (const c of OLD_COLORS) expect(logo.toLowerCase()).not.toContain(c);
    expect(logo.toLowerCase()).toContain(THEME_SURFACES.amber.dark.accent);
    expect(logo.toLowerCase()).toContain(THEME_SURFACES.amber.dark.card);
  });
});
