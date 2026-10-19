// Tests for İş 4 — "Hazır mısın?" kartı

import { describe, expect, it } from "vitest";
import { computeReadinessSteps, sortReadinessSteps } from "../src/lib/readinessSteps";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import type { DoctorReport } from "../app-electron/shared/types";

const DOCTOR_OK = {
  rows: [{ id: "axetCode", status: "ok" as const, detail: "1.4.2" }]
} as unknown as DoctorReport;

const DOCTOR_FAIL = {
  rows: [{ id: "axetCode", status: "fail" as const, detail: "bulunamadı" }]
} as unknown as DoctorReport;

const BASE = {
  language: "tr" as const,
  skillProfile: "module-consultant" as const,
  projectsBaseDir: "C:\\Projects",
  projectsDirExists: true,
  doctorReport: DOCTOR_OK,
  everConnected: true
};

describe("computeReadinessSteps", () => {
  it("her şey tamam olduğunda dört adım da tamamlanmış", () => {
    const steps = computeReadinessSteps(BASE);
    expect(steps).toHaveLength(4);
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it("skillProfile null ise adım 1 eksik", () => {
    const steps = computeReadinessSteps({ ...BASE, skillProfile: null });
    expect(steps[0].done).toBe(false);
    expect(steps[1].done).toBe(true);
  });

  it("projectsBaseDir boş ise adım 2 eksik", () => {
    const steps = computeReadinessSteps({ ...BASE, projectsBaseDir: "" });
    expect(steps[1].done).toBe(false);
  });

  it("projectsDirExists false ise adım 2 eksik", () => {
    const steps = computeReadinessSteps({ ...BASE, projectsDirExists: false });
    expect(steps[1].done).toBe(false);
  });

  it("axetCode satırı fail ise adım 3 eksik", () => {
    const steps = computeReadinessSteps({ ...BASE, doctorReport: DOCTOR_FAIL });
    expect(steps[2].done).toBe(false);
  });

  it("doctorReport null ise adım 3 eksik", () => {
    const steps = computeReadinessSteps({ ...BASE, doctorReport: null });
    expect(steps[2].done).toBe(false);
  });

  it("hiç bağlanılmadıysa adım 4 eksik", () => {
    const steps = computeReadinessSteps({ ...BASE, everConnected: false });
    expect(steps[3].done).toBe(false);
  });

  it("her adımın navigasyonu var", () => {
    const steps = computeReadinessSteps({ ...BASE, skillProfile: null, everConnected: false });
    expect(steps[0].action).toBeTruthy();
    expect(steps[3].action).toBeTruthy();
  });
});

describe("i18n anahtar bütünlüğü", () => {
  it("her adımın tr ve en karşılığı var", () => {
    const steps = computeReadinessSteps(BASE);
    for (const step of steps) {
      expect(step.titleKey in tr, `tr eksik: ${step.titleKey}`).toBe(true);
      expect(step.titleKey in en, `en eksik: ${step.titleKey}`).toBe(true);
    }
  });
});

describe("hazırlık listesi düzeni (2026-10-19)", () => {
  it("her adımın kısa açıklaması tr ve en'de var", () => {
    for (const step of computeReadinessSteps(BASE)) {
      expect(step.descKey in tr, `tr eksik: ${step.descKey}`).toBe(true);
      expect(step.descKey in en, `en eksik: ${step.descKey}`).toBe(true);
    }
  });

  it("teşhis gelmeden adım 3 'denetleniyor', eksik değil", () => {
    const steps = computeReadinessSteps({ ...BASE, doctorReport: null });
    expect(steps[2].checking).toBe(true);
    expect(steps[2].done).toBe(false);
    expect(computeReadinessSteps(BASE)[2].checking).toBe(false);
  });

  it("sıralama: eksikler üstte, denetlenenler ortada, tamamlananlar altta; kendi içinde sıra korunur", () => {
    const steps = computeReadinessSteps({ ...BASE, skillProfile: null, everConnected: false, doctorReport: null });
    expect(sortReadinessSteps(steps).map((s) => s.titleKey)).toEqual([
      "readiness.step1",
      "readiness.step4",
      "readiness.step3",
      "readiness.step2"
    ]);
  });
});
