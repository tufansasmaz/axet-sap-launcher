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
    applyAppearance(root, "amber", "light", false);
    expect(root.getAttribute("data-palette")).toBe("amber");
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
    const cleanup = applyAppearance(root, "amber", "dark", true);
    cleanup();
    expect(root.classList.contains("theme-transition")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
