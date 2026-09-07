// Proje reçetesi: projenin SAP'tan okunamayan yarısı.
//
// Bağlanma sırasında sistemin kimliği, host'u, client'ı, ADT adresi zaten
// keşfediliyor ve `sap-context.md`'ye yazılıyor. Keşfedilemeyen kısım işin
// kendisi: amaç, paket, taşıma isteği, kime sorulacağı. Ajan bunları
// bilmediğinde susmuyor — TAHMİN EDİYOR. Bir paket adını tahmin etmek bu
// projede açıkça yasak (bkz. proje kuralları), ama yasak olması ajanın
// bilmediğini fark etmesini sağlamıyor.
//
// Bu yüzden boş alanlar dosyadan DÜŞMÜYOR, `[BİLİNMİYOR]` olarak yazılıyor.
// Yazılmayan bir alan ajan için yok hükmünde; `[BİLİNMİYOR]` yazan bir alan
// ise açık bir talimat: burayı sor.
//
// Reçetenin kendisi `project-brief.json`'da tutuluyor, `sap-context.md`'ye
// yalnızca YANSITILIYOR. Sebep: sap-context.md her bağlanışta yeniden
// üretiliyor (yalnızca "Notlar" başlığından sonrası korunuyor) — tek kopya
// orada dursaydı ikinci bağlanışta silinirdi.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ProjectBrief } from "../shared/types";

const BRIEF_FILENAME = "project-brief.json";
const BLOCK_START = "<!-- axet-sap-launcher:brief -->";
const BLOCK_END = "<!-- /axet-sap-launcher:brief -->";
const NOTES_MARKER = "<!-- axet-sap-launcher:notes -->";

/** Reçetenin alan sırası — hem forma hem markdown'a bu sırayla giriyor. */
export const BRIEF_FIELDS = [
  "customer",
  "modules",
  "packageName",
  "transport",
  "goal",
  "outOfScope",
  "contact",
  "constraints"
] as const;

export type BriefField = (typeof BRIEF_FIELDS)[number];

export function emptyBrief(): ProjectBrief {
  return {
    customer: "",
    modules: "",
    packageName: "",
    transport: "",
    goal: "",
    outOfScope: "",
    contact: "",
    constraints: "",
    savedAt: null
  };
}

export function readProjectBrief(projectDir: string): ProjectBrief {
  const file = path.join(projectDir, BRIEF_FILENAME);
  if (!existsSync(file)) return emptyBrief();
  try {
    const raw = JSON.parse(readFileSync(file, "utf-8")) as Partial<ProjectBrief>;
    const brief = emptyBrief();
    for (const field of BRIEF_FIELDS) {
      const value = raw[field];
      if (typeof value === "string") brief[field] = value;
    }
    brief.savedAt = typeof raw.savedAt === "string" ? raw.savedAt : null;
    return brief;
  } catch {
    // Bozuk/elle düzenlenmiş dosya formu kilitlemesin — boş reçete ile devam.
    return emptyBrief();
  }
}

/**
 * Reçeteyi diske yazar ve `sap-context.md`'deki bloğu tazeler.
 *
 * İkisi tek çağrıda: ayrı olsalardı kaydeden ama yansıtmayan bir yol açılırdı
 * ve ajan, kullanıcının dolu sandığı bir reçeteyi hiç görmezdi.
 */
export function writeProjectBrief(projectDir: string, brief: ProjectBrief): ProjectBrief {
  const saved: ProjectBrief = { ...brief, savedAt: new Date().toISOString() };
  writeFileSync(path.join(projectDir, BRIEF_FILENAME), `${JSON.stringify(saved, null, 2)}\n`, "utf-8");
  syncBriefIntoContext(projectDir, saved);
  return saved;
}

/** Reçete bloğunu `sap-context.md` içine yazar (varsa değiştirir, yoksa ekler). */
export function syncBriefIntoContext(projectDir: string, brief?: ProjectBrief): void {
  const contextFile = path.join(projectDir, "sap-context.md");
  if (!existsSync(contextFile)) return;
  const data = brief ?? readProjectBrief(projectDir);
  try {
    const existing = readFileSync(contextFile, "utf-8");
    writeFileSync(contextFile, replaceBlock(existing, renderBriefMarkdown(data)), "utf-8");
  } catch {
    // Bağlam dosyası yazılamadıysa reçete yine de diskte — sessizce geç.
  }
}

function replaceBlock(content: string, block: string): string {
  const start = content.indexOf(BLOCK_START);
  const end = content.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    return content.slice(0, start) + block + content.slice(end + BLOCK_END.length);
  }
  // Blok "Notlar" başlığının ÜSTÜNE giriyor: o başlıktan sonrası kullanıcının
  // serbest alanı ve yeniden bağlanmada olduğu gibi korunuyor; blok oraya
  // düşseydi her bağlanışta ikinci bir kopyası çıkardı.
  const notes = content.indexOf(NOTES_MARKER);
  if (notes !== -1) {
    return `${content.slice(0, notes)}${block}\n\n${content.slice(notes)}`;
  }
  return `${content.replace(/\s*$/, "")}\n\n${block}\n`;
}

/** Markdown'daki başlıklar — dosyanın geri kalanı gibi Türkçe (bkz. launcher.ts). */
const MARKDOWN_LABELS: Record<BriefField, string> = {
  customer: "Müşteri / proje",
  modules: "SAP modülleri",
  packageName: "Geliştirme paketi",
  transport: "Taşıma isteği",
  goal: "Hedef",
  outOfScope: "Kapsam dışı",
  contact: "Danışılacak kişi",
  constraints: "Kısıtlar / kurallar"
};

const UNKNOWN = "[BİLİNMİYOR]";

export function renderBriefMarkdown(brief: ProjectBrief): string {
  const lines = BRIEF_FIELDS.map((field) => {
    const raw = brief[field].trim();
    return `- **${MARKDOWN_LABELS[field]}**: ${raw.length > 0 ? raw : UNKNOWN}`;
  });
  return [
    BLOCK_START,
    "",
    "## Proje Reçetesi (kullanıcının doldurduğu)",
    "Bu bölümü uygulama keşfetmedi, kullanıcı yazdı. Sistem bilgileri yukarıda; burası işin kendisi.",
    "",
    ...lines,
    "",
    `**\`${UNKNOWN}\` yazan bir alanı TAHMİN ETME — kullanıcıya sor.** Özellikle paket adı ve taşıma isteği: yanlış paket ya da yanlış taşıma isteğiyle yapılan iş geri alınamaz.`,
    "",
    BLOCK_END
  ].join("\n");
}
