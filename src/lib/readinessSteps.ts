// Hazırlık adımları — İş 4 (2026-10-17).
// Saf fonksiyon: UI'a bağımlı değil, test edilebilir.

import type { DoctorReport, SkillProfile } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";
import type { SettingsSectionId } from "../components/settings/settingsSections";

export type ReadinessAction =
  | { kind: "settings"; section: SettingsSectionId }
  | { kind: "roleModal" }
  | { kind: "navigate"; to: "sapLauncher" };

export interface ReadinessStep {
  titleKey: TranslationKey;
  done: boolean;
  action: ReadinessAction;
}

interface Args {
  language: string | null;
  skillProfile: SkillProfile | null;
  projectsBaseDir: string;
  projectsDirExists: boolean;
  doctorReport: DoctorReport | null;
  everConnected: boolean;
}

/**
 * Dört hazırlık adımının durumunu hesaplar.
 *
 * 1. Dil ve rol: language null değil VE skillProfile null değil.
 *    Karar: language her zaman "tr"/"en" geliyor (defaultConfig'de mevcut),
 *    asıl kontrol skillProfile; ama ikisini de kontrol ediyoruz.
 * 2. Proje klasörü: projectsBaseDir dolu VE projectsDirExists doğru.
 * 3. axet-code: DoctorReport'ta "axetCode" satırı status:"ok".
 * 4. SAP bağlantısı: connectionHistory'de en az bir kayıt var.
 */
export function computeReadinessSteps(args: Args): ReadinessStep[] {
  const { language, skillProfile, projectsBaseDir, projectsDirExists, doctorReport, everConnected } = args;

  // Adım 3: axet-code sağlığı
  const axetRow = doctorReport?.rows.find((r) => r.id === "axetCode");
  const axetOk = axetRow?.status === "ok";

  return [
    {
      titleKey: "readiness.step1",
      done: language != null && skillProfile != null,
      // Rol seçilmemişse RoleModal; dil seçilmemişse general ayarlar.
      // Pratikte language her zaman dolu; skillProfile asıl boşluk.
      action: skillProfile != null ? { kind: "settings", section: "general" } : { kind: "roleModal" }
    },
    {
      titleKey: "readiness.step2",
      done: projectsBaseDir.trim().length > 0 && projectsDirExists,
      action: { kind: "settings", section: "general" }
    },
    {
      titleKey: "readiness.step3",
      done: axetOk,
      action: { kind: "settings", section: "axetCode" }
    },
    {
      titleKey: "readiness.step4",
      done: everConnected,
      action: { kind: "navigate", to: "sapLauncher" }
    }
  ];
}
