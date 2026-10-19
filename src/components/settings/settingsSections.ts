import {
  Database,
  Download,
  Languages,
  Palette,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
  type LucideIcon
} from "lucide-react";
import type { AppConfig } from "../../../app-electron/shared/types";
import type { TranslationKey } from "../../i18n/tr";

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "axetCode"
  | "terminal"
  | "dataPrivacy"
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
  /** Arama kutusunun başlık ve açıklamaya ek olarak taradığı etiketler (bölümde görünen metinler). */
  searchKeys: readonly TranslationKey[];
}

// Bir alan yalnız bir bölümde durmalı; yoksa tek değişiklik iki bölümü
// birden işaretler.
//
// AYAR DENETİMİ (2026-10-19, ayrıntı .superpowers/ayarlar-denetim.md):
// - "Sohbet görünümü" bölümü Görünüm'e katıldı: içinde tek görünüm ayarı
//   (satır sıklığı) ve yanlış yerde duran bildirim anahtarı kalmıştı.
// - Bildirimler Genel'e taşındı: ayar yalnız sohbeti değil ajan ve pano
//   bildirimlerini de yönetiyor (index.ts, `chatNotifications !== false`).
// - Destek adresi "Gelişmiş Yollar"dan "Sürüm ve destek"e taşındı: bir yol
//   değil, "Sorun bildir" düğmesiyle aynı yerde olmalı.
// - Eklenen: `sapConnectOpen` (Genel), `agentMemoryDigest` (Ajanlar).
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: "general",
    icon: Languages,
    titleKey: "settingsModal.sectionGeneral",
    descKey: "settingsModal.descGeneral",
    fields: ["language", "projectsBaseDir", "sapConnectOpen", "chatNotifications", "agentNotifications", "browserAutoOpen"],
    searchKeys: [
      "settingsModal.languageLabel",
      "settingsModal.projectsDirLabel",
      "settingsModal.sapConnectOpenLabel",
      "settingsModal.sapConnectOpenTerminal",
      "settingsModal.chatNotificationsLabel",
      "settingsModal.chatNotificationsHint",
      "settingsModal.agentNotificationsLabel",
      "settingsModal.agentNotificationsHint",
      "settingsModal.browserAutoOpenLabel",
      "settingsModal.browserAutoOpenHint"
    ]
  },
  {
    id: "appearance",
    icon: Palette,
    titleKey: "settingsModal.sectionAppearance",
    descKey: "settingsModal.descAppearance",
    fields: ["palette", "theme", "chatFontSize", "chatDensity"],
    searchKeys: [
      "settingsModal.paletteLabel",
      "settingsModal.themeLabel",
      "settingsModal.chatFontSizeLabel",
      "settingsModal.chatDensityLabel",
      "settingsModal.chatDensityHint"
    ]
  },
  {
    id: "axetCode",
    icon: Sparkles,
    titleKey: "settingsModal.sectionAxetCode",
    descKey: "settingsModal.descAxetCode",
    fields: ["axetWorkspaceDir"],
    searchKeys: ["settingsModal.axetWorkspaceDirLabel"]
  },
  {
    id: "terminal",
    icon: TerminalSquare,
    titleKey: "settingsModal.sectionTerminal",
    descKey: "settingsModal.descTerminal",
    fields: ["axetCommand", "terminal", "agentMemoryDigest", "leadTeam", "leadApproval", "leadMaxAgents", "axetAutoSetup", "axetAutoTool", "axetAutoModel", "agentAutoRetry", "agentRetryMax", "agentConcurrency", "leadStallMinutes"],
    searchKeys: [
      "settingsModal.axetCommandLabel",
      "settingsModal.shellLabel",
      "settingsModal.shellHelper",
      "settingsModal.agentMemoryDigestLabel",
      "settingsModal.agentMemoryDigestHint",
      "settingsModal.leadTeamLabel",
      "settingsModal.leadTeamHint",
      "settingsModal.leadApprovalLabel",
      "settingsModal.leadMaxLabel",
      "settingsModal.axetAutoSetupLabel",
      "settingsModal.axetAutoSetupHint",
      "settingsModal.axetAutoToolLabel",
      "settingsModal.axetAutoModelLabel",
      "settingsModal.agentAutoRetryLabel",
      "settingsModal.agentAutoRetryHint",
      "settingsModal.agentConcurrencyLabel",
      "settingsModal.agentConcurrencyHint",
      "settingsModal.leadStallLabel"
    ]
  },
  {
    id: "advanced",
    icon: Wrench,
    titleKey: "settingsModal.sectionAdvanced",
    descKey: "settingsModal.descAdvanced",
    fields: ["landscapePathOverride", "sapShcutPathOverride"],
    searchKeys: ["settingsModal.landscapePathLabel", "settingsModal.sapShcutPathLabel"]
  },
  {
    id: "manual",
    icon: Database,
    titleKey: "settingsModal.sectionManual",
    descKey: "settingsModal.descManual",
    fields: [],
    searchKeys: ["settingsModal.manualSystemsHelper", "settingsModal.exportJson", "settingsModal.importJson"]
  },
  {
    id: "updates",
    icon: Download,
    titleKey: "settingsModal.sectionUpdates",
    descKey: "settingsModal.descUpdates",
    fields: ["autoCheckUpdates", "supportEmail"],
    searchKeys: [
      "settingsModal.autoCheckLabel",
      "settingsModal.checkNow",
      "support.emailLabel",
      "support.openAction"
    ]
  },
  {
    id: "dataPrivacy",
    icon: ShieldCheck,
    titleKey: "settingsModal.sectionDataPrivacy",
    descKey: "settingsModal.descDataPrivacy",
    fields: [],
    searchKeys: []
  }
];

/** Türkçe i/ı/İ/I ve büyük/küçük harf farkını yok sayan katlama. */
function fold(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Arama kutusu: sorguyla eşleşen bölümlerin kimlikleri (sıra korunur). Boş
 * sorgu hepsini döndürür. Başlık, açıklama ve bölümde görünen etiketler
 * taranıyor — kullanıcı ayarın adını arıyor, bölümün adını bilmiyor.
 */
export function matchSettingsSections(query: string, t: (key: TranslationKey) => string): SettingsSectionId[] {
  const q = fold(query.trim());
  if (!q) return SETTINGS_SECTIONS.map((s) => s.id);
  return SETTINGS_SECTIONS.filter((s) =>
    [s.titleKey, s.descKey, ...s.searchKeys].some((key) => fold(t(key)).includes(q))
  ).map((s) => s.id);
}

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
 * `chatDisplayName` 2026-10-19'da yapılandırmadan da kaldırıldı (hiçbir yerde
 * okunmuyordu).
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
