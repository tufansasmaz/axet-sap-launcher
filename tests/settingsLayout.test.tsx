// @vitest-environment jsdom
//
// Ayarlar iki sütunlu (spec §2): solda bölüm listesi, sağda yalnız seçili
// bölüm. Ertelenmiş iki hata da burada sabitleniyor: klasör seçici formun
// eski kopyasını yazmıyor, yeniden açılışın ilk karesinde eski form görünmüyor.

import { useLayoutEffect } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  chatFontSize: "md",
  chatDensity: "comfortable",
  axetCommand: "axet",
  terminal: "cmd",
  landscapePathOverride: null,
  sapShcutPathOverride: null,
  autoCheckUpdates: true
} as unknown as AppConfig;

const UNSAVED = "Kaydedilmemiş değişiklik var";

// Her commit'te (yerleşim efekti, boyamadan önce) ekrandaki girdi değerlerini
// topluyor. Eski kodda form `useEffect`'te sıfırlandığı için yeniden açılışın
// ilk commit'inde eski değer burada görünüyordu.
function FrameProbe({ seen }: { seen: string[] }) {
  useLayoutEffect(() => {
    seen.push(...Array.from(document.querySelectorAll("input"), (input) => input.value));
  });
  return null;
}

function setup(pickFolder: () => Promise<string | null> = () => Promise.resolve(null)) {
  (window as unknown as { api: unknown }).api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.2.3")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
    pickFolder: vi.fn(pickFolder),
    checkForUpdates: vi.fn(() => Promise.resolve()),
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  };
  const seen: string[] = [];
  const ui = (open: boolean, config: AppConfig) => (
    <LanguageProvider language="tr">
      <SettingsModal
        open={open}
        onClose={() => {}}
        config={config}
        onSave={() => Promise.resolve()}
        onExportManualSystems={() => Promise.resolve()}
        onImportManualSystems={() => Promise.resolve()}
      />
      <FrameProbe seen={seen} />
    </LanguageProvider>
  );
  const view = render(ui(true, CONFIG));
  return { seen, rerender: (open: boolean, config: AppConfig) => view.rerender(ui(open, config)) };
}

const goTo = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

describe("Ayarlar — iki sütun", () => {
  it("960px, açılışta Genel seçili, panel seçili sekmeyle adlandırılıyor", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.width).toBe("960px");
    expect(screen.getByRole("tab", { name: "Genel" }).getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel", { name: "Genel" });
    expect(within(panel).getByRole("heading", { name: "Genel" })).toBeTruthy();
    expect(within(panel).getByText("Uygulama dili ve proje klasörü.")).toBeTruthy();
  });

  it("yalnız seçili bölüm görünüyor; landmark kalabalığı yok", () => {
    setup();
    expect(screen.queryByRole("group", { name: "Tema" })).toBeNull();
    goTo("Görünüm");
    expect(screen.getByRole("group", { name: "Tema" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Uygulama dili" })).toBeNull();
    expect(within(screen.getByRole("dialog")).queryAllByRole("region")).toHaveLength(0);
  });

  it("bölüm geçişi formu sıfırlamıyor; değişen bölüm işaretli kalıyor", () => {
    setup();
    goTo("Terminal");
    fireEvent.change(screen.getByDisplayValue("axet"), { target: { value: "axet-yeni" } });
    goTo("Genel");
    goTo("Terminal");
    expect(screen.getByDisplayValue("axet-yeni")).toBeTruthy();
    const terminalTab = screen.getByRole("tab", { name: "Terminal" });
    expect(terminalTab.querySelector("[data-dirty-dot]")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Genel" }).querySelector("[data-dirty-dot]")).toBeNull();
    expect(screen.getByText(UNSAVED)).toBeTruthy();
  });

  it("sürüm metni bölüm listesinin altında", async () => {
    setup();
    expect(await screen.findByText("Sürüm 1.2.3 · by tsasmaz")).toBeTruthy();
  });

  it("girdiler görünen etiketleriyle adlandırılıyor; göz at düğmesinin adı var", () => {
    setup();
    expect(screen.getByRole("textbox", { name: /Proje klasörü/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Klasör seç" })).toBeTruthy();
  });

  it("otomatik denetim bir anahtar", () => {
    setup();
    goTo("Güncellemeler");
    const toggle = screen.getByRole("switch", { name: "Uygulama açılışında otomatik kontrol et" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(UNSAVED)).toBeTruthy();
  });
});

describe("Ayarlar — ertelenmiş hatalar", () => {
  it("klasör seçici beklerken yapılan düzenleme silinmiyor", async () => {
    let resolve!: (dir: string | null) => void;
    setup(() => new Promise((r) => (resolve = r)));
    fireEvent.click(screen.getByRole("button", { name: "Klasör seç" }));
    // Seçici açıkken dil değiştirildi.
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await act(async () => resolve("Z:\\secilen"));
    expect(screen.getByDisplayValue("Z:\\secilen")).toBeTruthy();
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("yeniden açılışın ilk karesinde eski form yok; bölüm Genel'e dönüyor", () => {
    const { seen, rerender } = setup();
    fireEvent.change(screen.getByDisplayValue("C:\\projeler"), { target: { value: "D:\\yeni" } });
    goTo("Terminal");
    rerender(false, CONFIG);
    seen.length = 0;
    rerender(true, { ...CONFIG, projectsBaseDir: "F:\\sonra" } as AppConfig);
    expect(seen).not.toContain("D:\\yeni");
    expect(seen).toContain("F:\\sonra");
    expect(screen.getByRole("tab", { name: "Genel" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText(UNSAVED)).toBeNull();
  });
});
