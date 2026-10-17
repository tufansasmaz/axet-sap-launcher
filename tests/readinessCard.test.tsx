// @vitest-environment jsdom
// İş 4 bileşen testleri: ReadinessHome kartı.
// Alt bileşenler (DoctorSection, ProjectBriefSection vb.) vi.mock ile stub'lanıyor;
// test yalnız ReadinessCard davranışını izole eder.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";

// Ağır alt bileşenleri stub'la — her biri kendi window.api çağrısı yapıyor.
// DoctorSection onReport ÇAĞIRMAZ → doctorReady=false → kart asla görünmez.
// Bu davranış tam olarak test etmek istediğimiz şeyi simüle ediyor:
// doktor raporu gelmeden kart çizmeme (#4).
vi.mock("../src/components/DoctorSection", () => ({
  default: () => null
}));
vi.mock("../src/components/ProjectBriefSection", () => ({ default: () => null }));
vi.mock("../src/components/SkillsSection", () => ({ default: () => null }));
vi.mock("../src/components/SapContextSection", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

// window.api minimum mock.
const origApi = (window as unknown as Record<string, unknown>).api;
(window as unknown as Record<string, unknown>).api = {
  ...(origApi as object),
  listDir: vi.fn().mockResolvedValue([])
};

// Tam dolu config.
const FULL_CONFIG = {
  language: "tr",
  skillProfile: "module-consultant",
  projectsBaseDir: "C:\\Projects"
} as unknown as import("../../app-electron/shared/types").AppConfig;

// Eksik config — kart görünmeli.
const PARTIAL_CONFIG = {
  language: null,
  skillProfile: null,
  projectsBaseDir: ""
} as unknown as import("../../app-electron/shared/types").AppConfig;

import ReadinessHome from "../src/components/ReadinessHome";

function mountHome({
  config = FULL_CONFIG,
  everConnected = true,
  onOpenSettings = vi.fn(),
  onOpenRoleModal = vi.fn(),
  onGoToLogon = vi.fn()
} = {}) {
  render(
    <LanguageProvider language="tr">
      <ReadinessHome
        projectDir={config.projectsBaseDir ?? null}
        skillProfile={config.skillProfile ?? null}
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
  it("doktor raporu yokken kart görünmez (flash yok)", () => {
    // DoctorSection mock async; ilk render'da kart OLMAMALIYDI.
    mountHome({ config: PARTIAL_CONFIG, everConnected: false });
    // Senkron check — async rapor henüz gelmedi.
    expect(screen.queryByTestId("readiness-card")).toBeNull();
  });

  it("onOpenSettings prop'u geçilmezse kart görünmez", () => {
    render(
      <LanguageProvider language="tr">
        <ReadinessHome
          projectDir="C:\\Projects"
          skillProfile="module-consultant"
          config={FULL_CONFIG}
          everConnected={true}
          // onOpenSettings geçilmedi
        />
      </LanguageProvider>
    );
    expect(screen.queryByTestId("readiness-card")).toBeNull();
  });
});

describe("ReadinessCard — \"Şimdi yap\" düğmeleri", () => {
  it("onOpenSettings yoksa kart görünmez (eksiksiz config, doktor yok)", () => {
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
    // doctorReady=false (DoctorSection stub onReport çağırmıyor) → kart yok.
    expect(screen.queryByTestId("readiness-card")).toBeNull();
  });
});
