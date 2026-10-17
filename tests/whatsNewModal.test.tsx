// @vitest-environment jsdom
// İş 2 bileşen testleri: WhatsNewModal + AppCommandPalette whats-new öğesi.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import WhatsNewModal from "../src/components/WhatsNewModal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount(appVersion = "1.8.3", open = true) {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <WhatsNewModal open={open} onClose={onClose} appVersion={appVersion} />
    </LanguageProvider>
  );
  return { onClose };
}

describe("WhatsNewModal", () => {
  it("açıkken madde listesi görünür", () => {
    mount("1.8.3");
    // Altı madde var (WHATS_NEW_DATA 1.8.3); en az biri ekranda.
    expect(screen.getByRole("dialog")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThan(0);
  });

  it("Tamam düğmesine basınca onClose çağrılır (kapanışta sürüm yazılır)", () => {
    const { onClose } = mount("1.8.3");
    fireEvent.click(screen.getByText("Tamam"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("WHATS_NEW_DATA'da olmayan sürüm için en son kaydı gösterir", () => {
    // Veri yoksa fallback: son kayıt gösterilir, boş ekran değil.
    mount("9.9.9");
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThan(0);
  });

  it("kapalıyken render olmaz", () => {
    mount("1.8.3", false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("buildPaletteItems — whats-new komutu", () => {
  it("openWhatsNew eylemi tetiklenir", async () => {
    const { buildPaletteItems } = await import("../src/components/AppCommandPalette");
    const openWhatsNew = vi.fn();
    const actions = {
      setActivity: vi.fn(),
      newChat: vi.fn(),
      openChat: vi.fn(),
      selectSystem: vi.fn(),
      openSettings: vi.fn(),
      reportProblem: vi.fn(),
      toggleTheme: vi.fn(),
      toggleLanguage: vi.fn(),
      openShortcuts: vi.fn(),
      openWhatsNew
    };
    const t = (k: string) => k;
    const items = buildPaletteItems(t as Parameters<typeof buildPaletteItems>[0], actions, [], [], []);
    const item = items.find((i) => i.id === "whats-new");
    expect(item).toBeTruthy();
    item!.run();
    expect(openWhatsNew).toHaveBeenCalledTimes(1);
  });
});
