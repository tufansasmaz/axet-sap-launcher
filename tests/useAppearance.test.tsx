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
  it("nitelik yoksa Amber koyu", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("amber/dark");
  });

  it("ilk çizimde nitelikleri okuyor", () => {
    root.setAttribute("data-palette", "amber");
    root.setAttribute("data-theme", "light");
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("amber/light");
  });

  it("nitelik değişince yeniden çiziliyor", async () => {
    render(<Probe />);
    await act(async () => {
      root.setAttribute("data-palette", "amber");
    });
    expect(screen.getByTestId("probe").textContent).toBe("amber/dark");
    await act(async () => {
      root.setAttribute("data-theme", "light");
    });
    expect(screen.getByTestId("probe").textContent).toBe("amber/light");
  });

  it("tanınmayan değer varsayılana düşüyor", () => {
    root.setAttribute("data-palette", "lime");
    root.setAttribute("data-theme", "blue");
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("amber/dark");
  });

  it("eski warm niteliği amber okunuyor", () => {
    root.setAttribute("data-palette", "warm");
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("amber/dark");
  });
});
