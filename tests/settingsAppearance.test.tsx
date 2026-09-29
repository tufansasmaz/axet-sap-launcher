// @vitest-environment jsdom
//
// Ayarlar → Görünüm (grafit kimlik, spec §3.4). Sabitlenenler: vurgu kartları
// gerçek bir radyo grubu (ok tuşları, gezici tabindex), renk örnekleri tek
// kaynaktan (`THEME_SURFACES`) geliyor, seçim Kaydet'le `palette`/`theme`
// olarak gidiyor, yazı boyutu bu bölümde.

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
  palette: "ntt",
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
  it("vurgu grubu üç kartlı, seçili olan işaretli; yazı boyutu burada, Sohbet görünümünde değil", () => {
    mount();
    const section = screen.getByRole("region", { name: "Görünüm" });
    const group = within(section).getByRole("radiogroup", { name: "Vurgu rengi" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(within(group).getByRole("radio", { name: "NTT mavisi" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "İndigo" }).getAttribute("aria-checked")).toBe("false");
    expect(within(group).getByRole("radio", { name: "Amber" }).getAttribute("aria-checked")).toBe("false");
    expect(within(section).getByText("Yazı boyutu")).toBeTruthy();
    const chat = screen.getByRole("region", { name: "Sohbet görünümü" });
    expect(within(chat).queryByText("Yazı boyutu")).toBeNull();
  });

  it("yalnızca seçili kart Tab sırasında; ok tuşu seçimi ve odağı birlikte taşıyor, uçta başa sarıyor", () => {
    mount();
    const ntt = screen.getByRole("radio", { name: "NTT mavisi" });
    const indigo = screen.getByRole("radio", { name: "İndigo" });
    const amber = screen.getByRole("radio", { name: "Amber" });
    expect(ntt.getAttribute("tabindex")).toBe("0");
    expect(indigo.getAttribute("tabindex")).toBe("-1");
    expect(amber.getAttribute("tabindex")).toBe("-1");
    ntt.focus();
    fireEvent.keyDown(ntt, { key: "ArrowRight" });
    expect(indigo.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(indigo);
    fireEvent.keyDown(indigo, { key: "ArrowDown" });
    expect(amber.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(amber);
    fireEvent.keyDown(amber, { key: "ArrowRight" });
    expect(ntt.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(ntt, { key: "ArrowLeft" });
    expect(amber.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(amber);
  });

  it("renk örnekleri THEME_SURFACES'ten geliyor", () => {
    mount();
    const amber = screen.getByRole("radio", { name: "Amber" });
    const dark = THEME_SURFACES.amber.dark;
    expect(swatches(amber)).toEqual([rgb(dark.app), rgb(dark.card), rgb(dark.accent)]);
  });

  it("vurgu ve tema değişince rozet çıkıyor; Kaydet ikisini de yolluyor", async () => {
    const { onClose, onSave } = mount();
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Amber" }));
    const light = screen.getByRole("button", { name: "Açık" });
    fireEvent.click(light);
    expect(light.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as Partial<AppConfig>;
    expect(patch.palette).toBe("amber");
    expect(patch.theme).toBe("light");
    expect(patch.chatFontSize).toBe("md");
  });

  it("eski seçime dönülünce değişiklik sayılmıyor", () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Amber" }));
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "NTT mavisi" }));
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
  });
});
