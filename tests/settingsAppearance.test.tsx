// @vitest-environment jsdom
//
// Ayarlar → Görünüm (tasarım sistemi temeli, spec §7). Sabitlenenler:
// palet kartları gerçek bir radyo grubu (ok tuşları, gezici tabindex),
// renk örnekleri tek kaynaktan (`THEME_SURFACES`) geliyor ve seçili
// koyu/açık hâli izliyor, seçim Kaydet'le `palette`/`theme` olarak gidiyor,
// yazı boyutu bu bölüme taşınmış.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_SURFACES } from "../app-electron/shared/themeSurfaces";
import type { AppConfig } from "../app-electron/shared/types";
import SettingsModal from "../src/components/SettingsModal";
import { LanguageProvider } from "../src/i18n";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const CONFIG = {
  language: "tr",
  palette: "indigo",
  theme: "dark",
  projectsBaseDir: "C:\\projeler",
  axetWorkspaceDir: "C:\\axet",
  chatDisplayName: "Deneme",
  chatFontSize: "md",
  chatDensity: "comfortable",
  chatSidebarOpen: true,
  axetCommand: "axet",
  terminal: "cmd",
  landscapePathOverride: null,
  sapShcutPathOverride: null,
  autoCheckUpdates: true
} as unknown as AppConfig;

function mount() {
  (window as unknown as { api: unknown }).api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
    pickFolder: vi.fn(() => Promise.resolve(null)),
    checkForUpdates: vi.fn(() => Promise.resolve()),
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  };
  const onClose = vi.fn();
  const onSave = vi.fn(() => Promise.resolve());
  render(
    <LanguageProvider language="tr">
      <SettingsModal
        open
        onClose={onClose}
        config={CONFIG}
        onSave={onSave}
        onExportManualSystems={vi.fn(() => Promise.resolve())}
        onImportManualSystems={vi.fn(() => Promise.resolve())}
      />
    </LanguageProvider>
  );
  return { onClose, onSave };
}

/** jsdom `style.backgroundColor`'ı `rgb(r, g, b)` olarak döndürüyor. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function swatches(radio: HTMLElement): string[] {
  return Array.from(radio.querySelectorAll<HTMLElement>("[data-swatch]")).map((el) => el.style.backgroundColor);
}

describe("Ayarlar → Görünüm", () => {
  it("palet grubu iki kartlı, seçili olan işaretli; yazı boyutu burada, Sohbet görünümünde değil", () => {
    mount();
    const section = screen.getByRole("region", { name: "Görünüm" });
    const group = within(section).getByRole("radiogroup", { name: "Renk paleti" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(within(group).getByRole("radio", { name: "Sakin İndigo" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "Sıcak Nötr" }).getAttribute("aria-checked")).toBe("false");
    expect(within(section).getByText("Yazı boyutu")).toBeTruthy();
    const chat = screen.getByRole("region", { name: "Sohbet görünümü" });
    expect(within(chat).queryByText("Yazı boyutu")).toBeNull();
  });

  it("yalnızca seçili kart Tab sırasında; ok tuşu seçimi ve odağı birlikte taşıyor", () => {
    mount();
    const indigo = screen.getByRole("radio", { name: "Sakin İndigo" });
    const warm = screen.getByRole("radio", { name: "Sıcak Nötr" });
    expect(indigo.getAttribute("tabindex")).toBe("0");
    expect(warm.getAttribute("tabindex")).toBe("-1");
    indigo.focus();
    fireEvent.keyDown(indigo, { key: "ArrowRight" });
    expect(warm.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(warm);
    // İki kart var: sağdan devam etmek başa sarıyor.
    fireEvent.keyDown(warm, { key: "ArrowDown" });
    expect(indigo.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(indigo);
  });

  it("renk örnekleri THEME_SURFACES'ten geliyor ve Koyu/Açık seçimini izliyor", () => {
    mount();
    const warm = screen.getByRole("radio", { name: "Sıcak Nötr" });
    const dark = THEME_SURFACES.warm.dark;
    expect(swatches(warm)).toEqual([rgb(dark.app), rgb(dark.card), rgb(dark.accent)]);
    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    const light = THEME_SURFACES.warm.light;
    expect(swatches(warm)).toEqual([rgb(light.app), rgb(light.card), rgb(light.accent)]);
  });

  it("palet ve tema değişince rozet çıkıyor; Kaydet ikisini de yolluyor", async () => {
    const { onClose, onSave } = mount();
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Sıcak Nötr" }));
    const light = screen.getByRole("button", { name: "Açık" });
    fireEvent.click(light);
    expect(light.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as Partial<AppConfig>;
    expect(patch.palette).toBe("warm");
    expect(patch.theme).toBe("light");
    expect(patch.chatFontSize).toBe("md");
  });

  it("eski seçime dönülünce değişiklik sayılmıyor", () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Sıcak Nötr" }));
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Sakin İndigo" }));
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
  });
});
