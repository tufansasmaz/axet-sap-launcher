// @vitest-environment jsdom
//
// Ayarlar → Gelişmiş'teki "Sorun bildir…" kaydedilmemiş düzenlemeyi silmiyor
// (son inceleme I4, 2026-10-16). Kullanıcı hemen üstteki destek adresini
// değiştirip düğmeye basarsa taslak YENİ adrese gitmeli: önce kaydediliyor,
// sonra pencere açılıyor.

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
  supportEmail: "eski@example.test",
  autoCheckUpdates: true
} as unknown as AppConfig;

function setup() {
  (window as unknown as { api: unknown }).api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
    pickFolder: vi.fn(() => Promise.resolve(null))
  };
  const order: string[] = [];
  const onSave = vi.fn(async (_patch: Partial<AppConfig>) => {
    order.push("save");
  });
  const onReportProblem = vi.fn(() => order.push("report"));
  render(
    <LanguageProvider language="tr">
      <SettingsModal
        open
        onClose={vi.fn()}
        config={CONFIG}
        onSave={onSave}
        onExportManualSystems={vi.fn(() => Promise.resolve())}
        onImportManualSystems={vi.fn(() => Promise.resolve())}
        onReportProblem={onReportProblem}
      />
    </LanguageProvider>
  );
  fireEvent.click(screen.getByRole("tab", { name: "Gelişmiş Yollar" }));
  return { onSave, onReportProblem, order };
}

describe("Ayarlar → Sorun bildir…", () => {
  it("kirli formu önce kaydediyor, sonra pencereyi açıyor", async () => {
    const { onSave, order } = setup();
    fireEvent.change(screen.getByDisplayValue("eski@example.test"), { target: { value: "yeni@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Sorun bildir…" }));
    await waitFor(() => expect(order).toEqual(["save", "report"]));
    expect(onSave.mock.calls[0][0].supportEmail).toBe("yeni@example.test");
  });

  it("form temizse kaydetmeden açıyor", async () => {
    const { onSave, onReportProblem } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Sorun bildir…" }));
    await waitFor(() => expect(onReportProblem).toHaveBeenCalled());
    expect(onSave).not.toHaveBeenCalled();
  });
});
