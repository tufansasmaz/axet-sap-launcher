// @vitest-environment jsdom
//
// Boştaki sistemi uyutma (kucukler-3 madde 1): uyuyan sistem bağlı listesinde
// kalıyor, çipte "uyuyor" yazıyor; ayar Genel bölümünde.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveSapContext } from "../app-electron/shared/types";
import TitleBar from "../src/components/TitleBar";
import { LanguageProvider } from "../src/i18n";
import { SETTINGS_SECTIONS } from "../src/components/settings/settingsSections";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import { getActiveContext, resetActiveContextForTest, setActiveSap, setActiveSapSleeping } from "../app-electron/main/activeContext";

afterEach(cleanup);
beforeEach(() => {
  (window as unknown as { api: unknown }).api = {
    windowIsMaximized: vi.fn(() => Promise.resolve(false)),
    onWindowStateChanged: vi.fn(() => () => {}),
    windowMinimize: vi.fn(),
    windowToggleMaximize: vi.fn(() => Promise.resolve(false)),
    windowClose: vi.fn()
  };
  resetActiveContextForTest();
});

const SAP: ActiveSapContext = {
  uuid: "u1",
  systemId: "S4D",
  systemName: "S4D",
  customerPath: ["M", "S4D"],
  host: "h",
  client: "100",
  username: "DEV1",
  tier: "DEV",
  projectDir: "C:\p",
  connectedAt: "2026-11-12T00:00:00Z",
  verified: true
};

describe("uyuyan sistem", () => {
  it("bağlamda işaretlenir ve uyanınca kalkar; sistem listeden düşmez", () => {
    setActiveSap(SAP);
    setActiveSapSleeping("C:\P", true);
    expect(getActiveContext().systems?.[0].sleeping).toBe(true);
    expect(getActiveContext().sap?.sleeping).toBe(true);
    setActiveSapSleeping("C:\p", false);
    expect(getActiveContext().systems?.[0].sleeping).toBeFalsy();
    expect(getActiveContext().systems).toHaveLength(1);
  });

  it("çipte 'uyuyor' yazar", () => {
    const sap = { ...SAP, sleeping: true };
    render(
      <LanguageProvider language="tr">
        <TitleBar context={{ sap, gui: null, systems: [sap] }} onShowSystem={vi.fn()} onClearSap={vi.fn()} onFocusSap={vi.fn()} />
      </LanguageProvider>
    );
    expect(screen.getByTestId("system-sleeping").textContent).toBe("uyuyor");
  });

  it("ayar Genel bölümünde, tr/en metinleri eşli", () => {
    const general = SETTINGS_SECTIONS.find((s) => s.id === "general")!;
    expect(general.fields).toContain("systemIdleSleepMinutes");
    for (const k of ["settingsModal.systemIdleSleepLabel", "settingsModal.systemIdleSleepHint", "settingsModal.systemIdleSleepOff", "activeContext.sleeping", "activeContext.sleepingTitle"]) {
      expect(k in tr, k).toBe(true);
      expect(k in en, k).toBe(true);
    }
    expect(tr["settingsModal.systemIdleSleepLabel"]).toBe("Boştaki sistemin sunucusunu kapat");
  });
});
