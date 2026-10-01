import {
  Database,
  Download,
  Languages,
  Palette,
  Sparkles,
  TerminalSquare,
  Type,
  Wrench,
  type LucideIcon
} from "lucide-react";
import type { AppConfig } from "../../../app-electron/shared/types";
import type { TranslationKey } from "../../i18n/tr";

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "axetCode"
  | "chatAppearance"
  | "terminal"
  | "advanced"
  | "manual"
  | "updates";

export interface SettingsSection {
  id: SettingsSectionId;
  icon: LucideIcon;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  /** Bu bölümün formda değiştirdiği alanlar; "değişiklik noktası" bunlardan hesaplanıyor. */
  fields: readonly (keyof AppConfig)[];
}

// Sıra spec'teki sıra. Bir alan yalnız bir bölümde durmalı; yoksa tek
// değişiklik iki bölümü birden işaretler.
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: "general",
    icon: Languages,
    titleKey: "settingsModal.sectionGeneral",
    descKey: "settingsModal.descGeneral",
    fields: ["language", "projectsBaseDir"]
  },
  {
    id: "appearance",
    icon: Palette,
    titleKey: "settingsModal.sectionAppearance",
    descKey: "settingsModal.descAppearance",
    fields: ["palette", "theme", "chatFontSize"]
  },
  {
    id: "axetCode",
    icon: Sparkles,
    titleKey: "settingsModal.sectionAxetCode",
    descKey: "settingsModal.descAxetCode",
    fields: ["axetWorkspaceDir"]
  },
  {
    id: "chatAppearance",
    icon: Type,
    titleKey: "settingsModal.sectionChatAppearance",
    descKey: "settingsModal.descChatAppearance",
    fields: ["chatDensity"]
  },
  {
    id: "terminal",
    icon: TerminalSquare,
    titleKey: "settingsModal.sectionTerminal",
    descKey: "settingsModal.descTerminal",
    fields: ["axetCommand", "terminal"]
  },
  {
    id: "advanced",
    icon: Wrench,
    titleKey: "settingsModal.sectionAdvanced",
    descKey: "settingsModal.descAdvanced",
    fields: ["landscapePathOverride", "sapShcutPathOverride"]
  },
  {
    id: "manual",
    icon: Database,
    titleKey: "settingsModal.sectionManual",
    descKey: "settingsModal.descManual",
    fields: []
  },
  {
    id: "updates",
    icon: Download,
    titleKey: "settingsModal.sectionUpdates",
    descKey: "settingsModal.descUpdates",
    fields: ["autoCheckUpdates"]
  }
];

/**
 * Bu kutunun GERÇEKTEN düzenlediği alanlar — kaydederken yalnızca bunlar
 * gönderiliyor.
 *
 * NEDEN bir liste: `form`, kutu açıldığında alınmış bir `AppConfig`
 * ANLIK GÖRÜNTÜSÜ. Eskiden `onSave(form)` bu görüntünün TAMAMINI yolluyordu ve
 * `saveConfig` gelen nesneyi diskteki hâlin üstüne yaydığı için, kutu açıkken
 * ANA SÜRECİN yazdığı her alan sessizce eski değerine dönüyordu.
 *
 * Ana sürecin sahibi olduğu alanlar az değil: `connectorIntegrations`,
 * `connectorAutoDisabled` (bkz. connectorHealth.ts), `connectorEnabled`,
 * `lastCredentials`, `trustedCertificates`. Bunlar kullanıcı ayarı değil,
 * ÖLÇÜM sonucu — geri alınmaları hiçbir yerde görünmüyor, yalnızca etkisi
 * görünüyor (ölçüm 2026-09-05: kapatılmış iki bağlayıcı kendiliğinden geri
 * açıldı, tur başına ~24k jeton yeniden ~153k oldu).
 *
 * Buraya yeni bir alan eklerken listeye de eklemek gerekiyor; unutulursa alan
 * kaydedilmez — sessizce başka bir ayarı bozmasından iyidir.
 *
 * Liste artık elle tutulmuyor: bölümlerin `fields` listelerinden türüyor.
 * Yeni alan, ait olduğu bölümün `fields`'ına eklenince hem kaydediliyor hem
 * o bölümün "değişti" noktasını yakıyor.
 *
 * `theme` soldaki güneş/ay düğmesiyle de değişiyor; Ayarlar açıkken o düğmeye
 * ulaşılamıyor (pencere modal), iki yazar aynı anda çalışmıyor.
 * `chatDisplayName` hiçbir bölümde yok: karşılama başlığı kalktı
 * (2026-09-29), Kaydet ona dokunmuyor.
 */
export const EDITED_FIELDS: readonly (keyof AppConfig)[] = SETTINGS_SECTIONS.flatMap(
  (s) => s.fields
);

export function dirtySections(
  form: AppConfig | null,
  config: AppConfig | null
): Set<SettingsSectionId> {
  const dirty = new Set<SettingsSectionId>();
  if (!form || !config) return dirty;
  for (const section of SETTINGS_SECTIONS) {
    if (section.fields.some((field) => form[field] !== config[field])) {
      dirty.add(section.id);
    }
  }
  return dirty;
}
