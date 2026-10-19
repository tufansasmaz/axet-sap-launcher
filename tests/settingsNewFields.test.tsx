// @vitest-environment jsdom
//
// Ayar denetimi (2026-10-19): eklenen iki ayar formda görünüyor ve Kaydet
// onları yolluyor; eski dosyada alan yoksa bugünkü davranış seçili.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  autoCheckUpdates: true,
  supportEmail: ""
} as unknown as AppConfig;

function mount(config: AppConfig = CONFIG) {
  (window as unknown as { api: unknown }).api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.2.3")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null }))
  };
  const onSave = vi.fn(() => Promise.resolve());
  render(
    <LanguageProvider language="tr">
      <SettingsModal
        open
        onClose={() => {}}
        config={config}
        onSave={onSave}
        onExportManualSystems={() => Promise.resolve()}
        onImportManualSystems={() => Promise.resolve()}
        onReportProblem={() => {}}
      />
    </LanguageProvider>
  );
  return onSave;
}

describe("Ayarlar — eklenen alanlar", () => {
  it("SAP bağlanınca: alan yoksa Sohbet seçili; Her seferinde sor kaydediliyor", async () => {
    const onSave = mount();
    const group = screen.getByRole("group", { name: "SAP sistemine bağlanınca" });
    expect(screen.getByRole("button", { name: "Sohbette aç" }).getAttribute("aria-pressed")).toBe("true");
    expect(group.querySelectorAll("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Her seferinde sor" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sapConnectOpen: "ask" }));
  });

  it("bildirimler Genel'de", () => {
    mount();
    expect(screen.getByRole("switch", { name: "Masaüstü bildirimleri" })).toBeTruthy();
  });

  it("ajan bellek özeti Ajanlar ve terminal'de, varsayılan açık, kapatılınca kaydediliyor", async () => {
    const onSave = mount();
    fireEvent.click(screen.getByRole("tab", { name: "Ajanlar ve terminal" }));
    const toggle = screen.getByRole("switch", { name: "Ajan başlarken ekip belleği özeti" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ agentMemoryDigest: false }));
  });

  it("destek adresi Sürüm ve destek'te, Gelişmiş Yollar'da değil", () => {
    mount();
    fireEvent.click(screen.getByRole("tab", { name: "Gelişmiş Yollar" }));
    expect(screen.queryByText("Destek e-posta adresi")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Sürüm ve destek" }));
    expect(screen.getByText("Destek e-posta adresi")).toBeTruthy();
  });
});
