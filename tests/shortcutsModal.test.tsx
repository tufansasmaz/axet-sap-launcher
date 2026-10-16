// @vitest-environment jsdom
//
// Kısayollar penceresi (İş C): Ctrl+/ açar, Esc kapatır,
// listede veri dosyasındaki her öğe var, tr/en i18n anahtarları eksiksiz.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { SHORTCUTS } from "../src/lib/shortcuts";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import ShortcutsModal from "../src/components/ShortcutsModal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount(open = true) {
  const onClose = vi.fn();
  const outside = document.createElement("button");
  document.body.appendChild(outside);
  outside.focus();
  render(
    <LanguageProvider language="tr">
      <ShortcutsModal open={open} onClose={onClose} />
    </LanguageProvider>
  );
  return { onClose };
}

describe("ShortcutsModal", () => {
  it("açık=true iken modal render edilir", () => {
    mount();
    // Modal içinde bir başlık olmalı
    expect(document.querySelector("[role='dialog']") ?? document.querySelector("[aria-modal]")).toBeTruthy();
  });

  it("Escape pencereyi kapatır", () => {
    const { onClose } = mount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("veri dosyasındaki her öğenin açıklaması ekranda görünür", () => {
    mount();
    for (const shortcut of SHORTCUTS) {
      // descKey'nin tr karşılığı sayfada bulunmalı
      const label = (tr as Record<string, string>)[shortcut.descKey];
      expect(label).toBeTruthy(); // önce tr'de var mı
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("açık=false iken içerik render edilmez", () => {
    mount(false);
    expect(document.querySelector("[role='dialog']") ?? document.querySelector("[aria-modal]")).toBeNull();
  });
});

describe("SHORTCUTS veri dosyası i18n tamlığı", () => {
  it("her descKey tr'de var", () => {
    for (const s of SHORTCUTS) {
      expect((tr as Record<string, string>)[s.descKey], `tr eksik: ${s.descKey}`).toBeTruthy();
    }
  });

  it("her descKey en'de var", () => {
    for (const s of SHORTCUTS) {
      expect((en as Record<string, string>)[s.descKey], `en eksik: ${s.descKey}`).toBeTruthy();
    }
  });
});
