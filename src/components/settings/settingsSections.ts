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

/** Ayarlar penceresinin düzenlediği bütün alanlar. */
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
