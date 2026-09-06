import {
  Braces,
  FileCode,
  FileCog,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Table,
  Terminal,
  type LucideIcon,
} from "lucide-react";

// Dosya UZANTISINDAN ikon + renk.
//
// NEDEN: dosya gezgininde her satır aynı gri `File` ikonuyla çiziliyordu, yani
// ikon hiçbir şey söylemiyordu — 30 satırlık bir klasörde aranan dosyayı
// bulmak, 30 dosya adını tek tek okumak demekti. Uzantı zaten adın içinde ama
// adın SONUNDA; göz satırın başından tarıyor. İkon o bilgiyi satırın başına
// taşıyor.
//
// RENK PALETİ jetonlardan geliyor, yeni renk uydurulmuyor. Elde altı ton var
// (`--module-*`, `--folder-icon`, `--status-*-text`, `--navy-icon`) ve bu, bir
// dosya ağacını okunur kılmaya fazlasıyla yetiyor; on beş renkli bir ağaç
// tekrar gürültü olurdu. Aynı aileden dosyalar (ts/tsx/js) bilerek AYNI rengi
// paylaşıyor: ayırt edilmesi gereken "kod mu, veri mi, belge mi", TypeScript
// ile JavaScript değil.
//
// Bilinmeyen uzantı sessizce nötr griye düşüyor — burada bir liste tutmak
// zorunda kalmamak için: yeni bir uzantı eklemeyi UNUTMAK, yanlış renk
// göstermekten iyidir.

interface FileKind {
  icon: LucideIcon;
  color: string;
}

const CODE: FileKind = { icon: FileCode, color: "var(--module-sap)" };
const DATA: FileKind = { icon: Braces, color: "var(--module-guiscript)" };
const DOC: FileKind = { icon: FileText, color: "var(--status-info-text)" };
const SHEET: FileKind = {
  icon: FileSpreadsheet,
  color: "var(--status-success-text)",
};
const IMAGE: FileKind = { icon: FileImage, color: "var(--module-code)" };
const SCRIPT: FileKind = {
  icon: Terminal,
  color: "var(--status-success-text)",
};
const CONFIG: FileKind = { icon: FileCog, color: "var(--navy-icon)" };
const NEUTRAL: FileKind = { icon: FileIcon, color: "" };

const BY_EXT: Record<string, FileKind> = {
  // kod
  ts: CODE,
  tsx: CODE,
  js: CODE,
  jsx: CODE,
  mjs: CODE,
  cjs: CODE,
  py: CODE,
  abap: CODE,
  java: CODE,
  cs: CODE,
  go: CODE,
  rs: CODE,
  vue: CODE,
  svelte: CODE,
  // veri / yapılandırma
  json: DATA,
  yaml: DATA,
  yml: DATA,
  toml: DATA,
  xml: DATA,
  html: { icon: FileType, color: "var(--module-guiscript)" },
  css: { icon: FileType, color: "var(--module-code)" },
  scss: { icon: FileType, color: "var(--module-code)" },
  env: CONFIG,
  ini: CONFIG,
  conf: CONFIG,
  properties: CONFIG,
  // belge
  md: DOC,
  txt: DOC,
  pdf: { icon: FileText, color: "var(--status-danger-text)" },
  doc: DOC,
  docx: DOC,
  rtf: DOC,
  // tablo
  csv: { icon: Table, color: "var(--status-success-text)" },
  xls: SHEET,
  xlsx: SHEET,
  // görsel
  png: IMAGE,
  jpg: IMAGE,
  jpeg: IMAGE,
  gif: IMAGE,
  svg: IMAGE,
  webp: IMAGE,
  bmp: IMAGE,
  ico: IMAGE,
  // betik
  sh: SCRIPT,
  bash: SCRIPT,
  ps1: SCRIPT,
  bat: SCRIPT,
  cmd: SCRIPT,
};

// Uzantısı olmayan ama tanınan dosyalar. Küçük harfe indirilmiş TAM ad ile
// eşleşiyor — `.gitignore` gibi noktayla başlayanlar uzantı ayrıştırmasından
// geçirilirse "gitignore" uzantılı sanılırdı.
const BY_NAME: Record<string, FileKind> = {
  ".gitignore": CONFIG,
  ".npmrc": CONFIG,
  ".env": CONFIG,
  dockerfile: CONFIG,
  makefile: CONFIG,
  license: DOC,
  "package.json": DATA,
  "package-lock.json": DATA,
  "tsconfig.json": DATA,
};

/** Dosya adına göre ikon bileşeni ve (varsa) renk. Renk boşsa çağıran taraf
 *  kendi nötr sınıfını uygular. */
export function fileKind(name: string): FileKind {
  const lower = name.toLowerCase();
  const byName = BY_NAME[lower];
  if (byName) return byName;
  const dot = lower.lastIndexOf(".");
  // `dot <= 0`: uzantısı yok ya da nokta baştaysa (gizli dosya) uzantı sayılmaz.
  if (dot <= 0) return NEUTRAL;
  return BY_EXT[lower.slice(dot + 1)] ?? NEUTRAL;
}
