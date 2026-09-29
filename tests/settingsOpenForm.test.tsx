// @vitest-environment jsdom
//
// Ayarlar açıkken `config` değişince kullanıcının düzenlemesi korunuyor
// (tasarım sistemi temeli, son düzeltme turu 2026-09-29).
//
// Eskiden form `config` prop'u HER değiştiğinde baştan dolduruluyordu. Açık
// pencerede `config`'i değiştiren iki yol vardı: "Güncellemeleri Şimdi Kontrol
// Et" (`autoCheckUpdates`'i kaydediyor) ve "İçe aktar" (listeyi yeniliyor).
// İkisi de kaydedilmemiş düzenlemeyi SESSİZCE siliyordu; güncelleme kontrolü
// üstüne bir de "Ayarlar kaydedildi" bildirimi çıkarıyordu.
//
// Aynı dosyada iki erişilebilirlik düzeltmesi: ilk odak dil düğmesine değil
// pencereye iniyor (Enter dili değiştirmesin), tercih grupları görünen
// başlıklarıyla adlandırılıyor.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  palette: "indigo",
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

const UNSAVED = "Kaydedilmemiş değişiklik var";

function installApi() {
  const api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
    pickFolder: vi.fn(() => Promise.resolve(null)),
    checkForUpdates: vi.fn(() => Promise.resolve()),
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  };
  (window as unknown as { api: unknown }).api = api;
  return api;
}

function setup(initial: AppConfig = CONFIG) {
  const api = installApi();
  const onClose = vi.fn();
  const onSave = vi.fn((_partial: Partial<AppConfig>, _options?: { silent?: boolean }) => Promise.resolve());
  const ui = (open: boolean, config: AppConfig) => (
    <LanguageProvider language="tr">
      <SettingsModal
        open={open}
        onClose={onClose}
        config={config}
        onSave={onSave}
        onExportManualSystems={vi.fn(() => Promise.resolve())}
        onImportManualSystems={vi.fn(() => Promise.resolve())}
      />
    </LanguageProvider>
  );
  const view = render(ui(true, initial));
  const rerender = (open: boolean, config: AppConfig) => view.rerender(ui(open, config));
  return { api, onClose, onSave, rerender };
}

const projectsInput = () => screen.getByDisplayValue("C:\\projeler") as HTMLInputElement;

describe("Ayarlar — açıkken config değişince", () => {
  it("düzenlenen alan korunuyor, kirli durum sürüyor; dokunulmayan alan yeni değeri alıyor", async () => {
    const { onSave, onClose, rerender } = setup();
    fireEvent.change(projectsInput(), { target: { value: "D:\\yeni" } });
    expect(screen.getByText(UNSAVED)).toBeTruthy();

    // Ana süreçten gelen yeni config: düzenlenmeyen iki alan değişmiş.
    rerender(true, { ...CONFIG, axetWorkspaceDir: "D:\\baska", axetCommand: "axet2" } as AppConfig);

    expect(screen.getByDisplayValue("D:\\yeni")).toBeTruthy();
    expect(screen.getByText(UNSAVED)).toBeTruthy();
    expect(screen.getByDisplayValue("D:\\baska")).toBeTruthy();
    expect(screen.getByDisplayValue("axet2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = onSave.mock.calls[0][0];
    expect(patch.projectsBaseDir).toBe("D:\\yeni");
    expect(patch.axetWorkspaceDir).toBe("D:\\baska");
    expect(patch.axetCommand).toBe("axet2");
  });

  it("kullanıcının değiştirdiği alanı yeni config ezmiyor", () => {
    const { rerender } = setup();
    fireEvent.change(projectsInput(), { target: { value: "D:\\yeni" } });
    rerender(true, { ...CONFIG, projectsBaseDir: "E:\\disardan" } as AppConfig);
    expect(screen.getByDisplayValue("D:\\yeni")).toBeTruthy();
    expect(screen.queryByDisplayValue("E:\\disardan")).toBeNull();
    expect(screen.getByText(UNSAVED)).toBeTruthy();
  });

  it("kapatıp açınca form yeni config'ten doluyor", () => {
    const { rerender } = setup();
    fireEvent.change(projectsInput(), { target: { value: "D:\\yeni" } });
    rerender(false, CONFIG);
    rerender(true, { ...CONFIG, projectsBaseDir: "F:\\sonra" } as AppConfig);
    expect(screen.getByDisplayValue("F:\\sonra")).toBeTruthy();
    expect(screen.queryByDisplayValue("D:\\yeni")).toBeNull();
    expect(screen.queryByText(UNSAVED)).toBeNull();
  });

  it("güncelleme kontrolü bildirimsiz kaydediyor ve düzenlemeyi silmiyor", async () => {
    const { api, onSave, rerender } = setup();
    fireEvent.change(projectsInput(), { target: { value: "D:\\yeni" } });
    fireEvent.click(screen.getByRole("button", { name: /Güncellemeleri Şimdi Kontrol Et/ }));
    await waitFor(() => expect(api.checkForUpdates).toHaveBeenCalledTimes(1));
    // İkinci argüman `silent`: App'teki kayıt işleyicisi "Ayarlar kaydedildi"
    // bildirimini bununla atlıyor.
    expect(onSave).toHaveBeenCalledWith({ autoCheckUpdates: true }, { silent: true });
    // App kaydın ardından config'i yeniliyor.
    rerender(true, { ...CONFIG } as AppConfig);
    expect(screen.getByDisplayValue("D:\\yeni")).toBeTruthy();
    expect(screen.getByText(UNSAVED)).toBeTruthy();
  });
});

describe("Ayarlar — erişilebilirlik", () => {
  it("ilk odak pencerenin kendisinde, dil düğmesinde değil", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
    // Enter'a basmak hiçbir şeyi değiştirmiyor.
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Türkçe" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("tercih grupları görünen başlıklarıyla adlandırılıyor", () => {
    setup();
    expect(screen.getByRole("group", { name: "Tema" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Uygulama dili" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Yazı boyutu" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Satır sıklığı" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Gömülü terminal kabuğu" })).toBeTruthy();
  });
});
