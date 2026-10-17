// @vitest-environment jsdom
// İş 4 bileşen testleri: ReadinessHome kartı.
// DoctorSection vi.mock ile stub'lanıyor; test per-test onReport çağırabilir.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import type { DoctorReport } from "../app-electron/shared/types";

// DoctorSection stub'ı onReport'u bir ref aracılığıyla dışarı açıyor.
// Her test dilediği zaman drReport(value) ile doctor sonucu inject edebilir.
let _drReporter: ((r: DoctorReport | null) => void) | null = null;

vi.mock("../src/components/DoctorSection", () => ({
  default: ({ onReport }: { onReport?: (r: DoctorReport | null) => void }) => {
    _drReporter = onReport ?? null;
    return null;
  }
}));
vi.mock("../src/components/ProjectBriefSection", () => ({ default: () => null }));
vi.mock("../src/components/SkillsSection", () => ({ default: () => null }));
vi.mock("../src/components/SapContextSection", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  _drReporter = null;
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

// window.api mock.
const origApi = (window as unknown as Record<string, unknown>).api;
(window as unknown as Record<string, unknown>).api = {
  ...(origApi as object),
  listDir: vi.fn().mockResolvedValue({ ok: false, error: "ENOENT" })
};

const DOCTOR_OK = {
  rows: [{ id: "axetCode", status: "ok", detail: "ok" }],
  python: null,
  missingPackages: [],
  checkedAt: Date.now()
} as unknown as DoctorReport;

// Eksiksiz config: dil+profil+klasör+bağlantı hepsi tamam + doktor ok → allDone.
const FULL_CONFIG = {
  language: "tr",
  skillProfile: "module-consultant",
  projectsBaseDir: "C:\\Projects"
} as unknown as import("../app-electron/shared/types").AppConfig;

// Boş config: hiçbir adım tamamlanmamış.
const PARTIAL_CONFIG = {
  language: null,
  skillProfile: null,
  projectsBaseDir: ""
} as unknown as import("../app-electron/shared/types").AppConfig;

import ReadinessHome from "../src/components/ReadinessHome";

function mountHome({
  config = PARTIAL_CONFIG,
  everConnected = false,
  onOpenSettings = vi.fn(),
  onOpenRoleModal = vi.fn(),
  onGoToLogon = vi.fn()
} = {}) {
  render(
    <LanguageProvider language="tr">
      <ReadinessHome
        projectDir={config.projectsBaseDir ?? null}
        skillProfile={(config.skillProfile as import("../app-electron/shared/types").SkillProfile) ?? null}
        config={config}
        everConnected={everConnected}
        onOpenSettings={onOpenSettings}
        onOpenRoleModal={onOpenRoleModal}
        onGoToLogon={onGoToLogon}
      />
    </LanguageProvider>
  );
  return { onOpenSettings, onOpenRoleModal, onGoToLogon };
}

describe("ReadinessCard görünürlük", () => {
  it("doktor raporu gelmeden kart görünmez (flash yok)", () => {
    // DoctorSection stub _drReporter'ı doldurur ama çağırmaz.
    mountHome();
    // Senkron kontrol: rapor yok → kart yok.
    expect(screen.queryByTestId("readiness-card")).toBeNull();
  });

  it("onOpenSettings prop'u geçilmezse kart görünmez", async () => {
    render(
      <LanguageProvider language="tr">
        <ReadinessHome
          projectDir={null}
          skillProfile={null}
          config={PARTIAL_CONFIG}
          everConnected={false}
          // onOpenSettings geçilmedi
        />
      </LanguageProvider>
    );
    // Doktor raporu inject et.
    await act(async () => { _drReporter?.(DOCTOR_OK); });
    // onOpenSettings yok → kart render edilmez.
    expect(screen.queryByTestId("readiness-card")).toBeNull();
  });

  it("doktor raporu gelince eksik adım varsa kart görünür", async () => {
    mountHome({ config: PARTIAL_CONFIG });
    await act(async () => { _drReporter?.(DOCTOR_OK); });
    expect(screen.getByTestId("readiness-card")).toBeTruthy();
  });

  it("tüm adımlar tamamsa kart görünmez", async () => {
    // listDir: klasör var
    (window as unknown as Record<string, unknown>).api = {
      ...((window as unknown as Record<string, unknown>).api as object),
      listDir: vi.fn().mockResolvedValue({ ok: true, entries: [] })
    };
    // FULL_CONFIG: dil + profil + klasör; everConnected=true → adım 4 de tamam.
    // Doktor raporu: axetCode=ok → adım 3 tamam.
    mountHome({ config: FULL_CONFIG, everConnected: true });
    await act(async () => { _drReporter?.(DOCTOR_OK); });
    // allDone → kart YOK.
    expect(screen.queryByTestId("readiness-card")).toBeNull();
  });
});

describe("ReadinessCard — \"Şimdi yap\" düğmeleri", () => {
  it("adım 2 Şimdi yap → onOpenSettings çağrılır (general)", async () => {
    // Adım 2: projectsBaseDir boş → step done=false → "Şimdi yap" gösterilir.
    const { onOpenSettings } = mountHome({ config: PARTIAL_CONFIG });
    await act(async () => { _drReporter?.(DOCTOR_OK); });

    // data-step="readiness.step2" düğmesini bul.
    const btn = document.querySelector('[data-step="readiness.step2"]') as HTMLElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onOpenSettings).toHaveBeenCalledWith("general");
  });

  it("adım 4 Şimdi yap → onGoToLogon çağrılır", async () => {
    // Adım 4: everConnected=false → step done=false.
    // Adım 1-3 tamam olsun: dil + profil var, doktor ok, listDir ok.
    (window as unknown as Record<string, unknown>).api = {
      ...((window as unknown as Record<string, unknown>).api as object),
      listDir: vi.fn().mockResolvedValue({ ok: true, entries: [] })
    };
    const config = { language: "tr", skillProfile: "module-consultant", projectsBaseDir: "C:\\Projects" } as unknown as import("../app-electron/shared/types").AppConfig;
    const { onGoToLogon } = mountHome({ config, everConnected: false });
    await act(async () => { _drReporter?.(DOCTOR_OK); });

    const btn = document.querySelector('[data-step="readiness.step4"]') as HTMLElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onGoToLogon).toHaveBeenCalledTimes(1);
  });
});
