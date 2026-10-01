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

const goTo = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

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

/** Kartın bir sırasındaki (`dark` ya da `light`) üç kutunun rengi. */
function swatchRow(radio: HTMLElement, theme: "dark" | "light"): string[] {
  const row = radio.querySelector<HTMLElement>(`[data-swatch="${theme}"]`);
  if (!row) return [];
  return Array.from(row.children).map((el) => (el as HTMLElement).style.backgroundColor);
}

describe("Ayarlar → Görünüm", () => {
  it("vurgu grubu dört kartlı, seçili olan işaretli; yazı boyutu burada, Sohbet görünümünde değil", () => {
    mount();
    goTo("Görünüm");
    const section = screen.getByRole("tabpanel", { name: "Görünüm" });
    const group = within(section).getByRole("radiogroup", { name: "Vurgu rengi" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(4);
    expect(within(group).getByRole("radio", { name: "NTT mavisi" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "İndigo" }).getAttribute("aria-checked")).toBe("false");
    expect(within(group).getByRole("radio", { name: "Amber" }).getAttribute("aria-checked")).toBe("false");
    expect(within(group).getByRole("radio", { name: "Grafit" }).getAttribute("aria-checked")).toBe("false");
    expect(within(section).getByText("Yazı boyutu")).toBeTruthy();
    goTo("Sohbet görünümü");
    const chat = screen.getByRole("tabpanel", { name: "Sohbet görünümü" });
    expect(within(chat).queryByText("Yazı boyutu")).toBeNull();
  });

  it("yalnızca seçili kart Tab sırasında; ok tuşu seçimi ve odağı birlikte taşıyor, uçta başa sarıyor", () => {
    mount();
    goTo("Görünüm");
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
    const graphite = screen.getByRole("radio", { name: "Grafit" });
    fireEvent.keyDown(amber, { key: "ArrowRight" });
    expect(graphite.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(graphite, { key: "ArrowRight" });
    expect(ntt.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(ntt, { key: "ArrowLeft" });
    expect(graphite.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(graphite);
  });

  it("her kart koyu ve açık önizlemeyi birlikte gösteriyor; Koyu/Açık seçimi örnekleri değiştirmiyor", () => {
    mount();
    goTo("Görünüm");
    for (const [name, palette] of [
      ["NTT mavisi", "ntt"],
      ["İndigo", "indigo"],
      ["Amber", "amber"],
      ["Grafit", "graphite"]
    ] as const) {
      const radio = screen.getByRole("radio", { name });
      const { dark, light } = THEME_SURFACES[palette];
      expect(swatchRow(radio, "dark")).toEqual([rgb(dark.app), rgb(dark.card), rgb(dark.accent)]);
      expect(swatchRow(radio, "light")).toEqual([rgb(light.app), rgb(light.card), rgb(light.accent)]);
    }
    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    const amber = screen.getByRole("radio", { name: "Amber" });
    expect(swatchRow(amber, "dark")[2]).toBe(rgb(THEME_SURFACES.amber.dark.accent));
    expect(swatchRow(amber, "light")[2]).toBe(rgb(THEME_SURFACES.amber.light.accent));
  });

  it("vurgu ve tema değişince rozet çıkıyor; Kaydet ikisini de yolluyor", async () => {
    const { onClose, onSave } = mount();
    goTo("Görünüm");
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
    goTo("Görünüm");
    fireEvent.click(screen.getByRole("radio", { name: "Amber" }));
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "NTT mavisi" }));
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();
  });
});

// Karşılama başlığı sohbet ekranından kalktı (2026-09-29); onu besleyen ad
// alanı ve "karşılama başlığını büyütür" ipucu artık olmayan bir şeyi vaat
// ediyordu. `chatDisplayName` yapılandırmada duruyor — Ayarlar ekranı
// yenilenirken kalkacak — ama kullanıcıya gösterilmiyor.
describe("Ayarlar — karşılama kalıntısı", () => {
  it("karşılama adı alanı yok, hiçbir ipucu karşılamadan söz etmiyor", () => {
    mount();
    for (const tab of screen.getAllByRole("tab")) {
      fireEvent.click(tab);
      expect(screen.queryByDisplayValue("Deneme")).toBeNull();
      expect(document.body.textContent ?? "").not.toMatch(/karşılama/i);
    }
  });
});
