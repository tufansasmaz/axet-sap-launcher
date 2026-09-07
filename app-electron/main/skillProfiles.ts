// Rol profilleri ve skill kataloğu.
//
// NTT skill kataloğu her skill'i üç eksende süzüyor: risk seviyesi (tier 0-3),
// çalışma alanının riski (sandbox / internal-dev / customer-dev /
// customer-production) ve takım. Bu dosya o modelin bu uygulamaya düşen
// sadeleştirilmiş hâli:
//
//   - `writeCapable`  -> skill SAP'a yazma niyeti taşıyor mu (tier >= 1 karşılığı)
//   - `SystemTier`    -> bağlanılan sistemin önemi (DEV/QA/PRD)
//   - `SkillProfile`  -> danışmanın rolü
//
// Kural: PRD işaretli bir sisteme yazma yetenekli skill KURULMAZ. SAP API
// Politikası (Mayıs 2026) ADT dahili API'leri üzerinden ajanla üretim verisine
// dokunmaya izin vermiyor; kapıyı skill kurulumunda tutuyoruz çünkü kurulan bir
// skill'i ajan er ya da geç okuyor.
//
// Tablo elle türetildi: uygulamanın katalog deposuna çalışma zamanında hiçbir
// bağımlılığı yok, olmamalı da.

import type { SkillPlanEntry, SkillProfile, SystemTier } from "../shared/types";

export type { SkillProfile };

export interface SkillDef {
  /** `resources/sap-toolkit` altındaki göreli yol. */
  path: string;
  /** SAP'a yazma niyeti taşıyor mu? PRD'de kurulmaz. */
  writeCapable?: boolean;
  /**
   * Proje kopyasına ALINMAYACAK alt klasörler. `sap-adt-readonly` için
   * `scripts/` böyle: içinde 1400 satırlık tam yetkili ADT motoru var, skill'in
   * kendisi ise zaten "script'leri asla çalıştırma, HTTP sunucusuna konuş"
   * diyor. Motor `resources/` altında kalır, launcher oradan başlatır.
   */
  excludeDirs?: string[];
}

export const SKILL_CATALOG: Record<string, SkillDef> = {
  // --- SAP: inceleme ve tasarım -------------------------------------------
  "sap-adt-readonly": { path: "sap-consultant/skills/sap-adt-readonly", excludeDirs: ["scripts"] },
  "clean-core": { path: "sap-consultant/skills/clean-core" },
  "sap-docs": { path: "sap-consultant/skills/sap-docs" },
  "library-match": { path: "sap-consultant/skills/library-match" },
  "abap-code-checker": { path: "sap-consultant/skills/abap-code-checker" },
  "screen-mockup": { path: "sap-consultant/skills/screen-mockup" },

  // --- SAP: yazma yetenekli ------------------------------------------------
  "screen-gen": { path: "sap-consultant/skills/screen-gen", writeCapable: true },

  // --- Doküman üretimi -----------------------------------------------------
  "fs-generator": { path: "sap-consultant/skills/fs-generator" },
  "ts-generator": { path: "sap-consultant/skills/ts-generator" },
  "spec-reviewer": { path: "sap-consultant/skills/spec-reviewer" },
  "meeting-notes-organizer": { path: "sap-consultant/skills/meeting-notes-organizer" },

  // --- abapGit köprüsü -----------------------------------------------------
  "abapgit-howto": { path: "abapgit-bridge/skills/abapgit-howto" },
  "abapgit-workflow": { path: "abapgit-bridge/skills/abapgit-workflow", writeCapable: true },
  "abapgit-export-zip": { path: "abapgit-bridge/skills/abapgit-export-zip", writeCapable: true },
  "abapgit-import-status-zip": {
    path: "abapgit-bridge/skills/abapgit-import-status-zip",
    writeCapable: true
  },

  // --- Office --------------------------------------------------------------
  "office-excel-read": { path: "office-tools/skills/office-excel-read" },
  "office-excel-write": { path: "office-tools/skills/office-excel-write" },
  "office-excel-transform": { path: "office-tools/skills/office-excel-transform" },
  "office-excel-report": { path: "office-tools/skills/office-excel-report" },
  "office-excel-compare": { path: "office-tools/skills/office-excel-compare" },
  "office-excel-images": { path: "office-tools/skills/office-excel-images" },
  "office-slides": { path: "office-tools/skills/office-slides" },
  "office-pdf": { path: "office-tools/skills/office-pdf" },
  "office-pptx": { path: "office-tools/skills/office-pptx" },
  "office-docx": { path: "office-tools/skills/office-docx" },
  "office-manual": { path: "office-tools/skills/office-manual" }
};

const OFFICE = Object.keys(SKILL_CATALOG).filter((n) => n.startsWith("office-"));
const ABAPGIT = Object.keys(SKILL_CATALOG).filter((n) => n.startsWith("abapgit-"));

const DOCS = ["fs-generator", "ts-generator", "spec-reviewer", "meeting-notes-organizer"];

export const PROFILE_SKILLS: Record<SkillProfile, string[]> = {
  // Modül (fonksiyonel) danışmanı: sistemi okur, doküman üretir, kod yazmaz.
  // `library-match` burada — katalogda da modül danışmanına özel olarak
  // veriliyor: "bu zaten yapılmış mı?" sorusunu soracak tek rol bu.
  "module-consultant": [
    "sap-adt-readonly",
    "sap-docs",
    "clean-core",
    "library-match",
    "screen-mockup",
    ...DOCS,
    ...OFFICE
  ],

  // Teknik danışman: geliştirme yapar. `library-match` yok (katalogda da
  // teknik danışmandan çıkarılmış), buna karşılık kod denetimi, ekran
  // üretimi ve abapGit var.
  "technical-consultant": [
    "sap-adt-readonly",
    "sap-docs",
    "clean-core",
    "abap-code-checker",
    "screen-mockup",
    "screen-gen",
    ...ABAPGIT,
    ...DOCS,
    ...OFFICE
  ],

  // Sandbox: kendi test sistemi. Her şey.
  sandbox: Object.keys(SKILL_CATALOG)
};

export const DEFAULT_PROFILE: SkillProfile = "module-consultant";

export function isSkillProfile(value: unknown): value is SkillProfile {
  return value === "module-consultant" || value === "technical-consultant" || value === "sandbox";
}

/**
 * Bir rol + sistem önem derecesi için hangi skill'lerin kurulacağını hesaplar.
 * Kurulum yapmaz — ekranda önizleme göstermek için de bu kullanılır, böylece
 * kullanıcının gördüğü liste ile diske yazılan liste aynı koddan çıkar.
 */
export function planSkills(profile: SkillProfile, tier: SystemTier | null): SkillPlanEntry[] {
  const names = PROFILE_SKILLS[profile] ?? PROFILE_SKILLS[DEFAULT_PROFILE];
  return names.map((name) => {
    const def = SKILL_CATALOG[name];
    const writeCapable = Boolean(def?.writeCapable);
    return { name, writeCapable, blockedByTier: writeCapable && tier === "PRD" };
  });
}
