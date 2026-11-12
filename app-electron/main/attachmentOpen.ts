import path from "node:path";

// Sohbet eki "dışarıda aç" (kararlilik-2 R8e).
//
// Ölçüm: sohbete Explorer'dan sürüklenen dosyanın yolu OLDUĞU GİBİ ekte
// duruyor (çoğunlukla İndirilenler). Ek çipine tıklamak `fs:openExternal`'a
// gidiyordu; o kanal yalnız izinli köklerde (proje/çalışma klasörü) açıyor ve
// gerisini SESSİZCE yok sayıyordu: kullanıcı tıklıyor, hiçbir şey olmuyor
// (günlükte İndirilenler'deki .png/.docx/.md için tekrarlanan denemeler).
//
// Kural: izinli kökteyse eskisi gibi açılır. Kök dışındaysa yalnız BELGE ve
// GÖRSEL uzantıları varsayılan uygulamayla açılır; başka her şey (exe, bat,
// ps1, lnk, uzantısız…) yalnızca klasörde GÖSTERİLİR — renderer'dan gelen bir
// yolla program çalıştırılmıyor.

const SAFE_OPEN_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
  ".pdf", ".txt", ".md", ".csv", ".json", ".xml", ".log",
  ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".odt", ".ods"
]);

export type AttachmentOpenAction = "open" | "reveal" | "none";

export function attachmentOpenAction(filePath: unknown, inAllowedRoot: boolean, exists: boolean): AttachmentOpenAction {
  if (typeof filePath !== "string" || !filePath.trim() || !path.isAbsolute(filePath) || !exists) return "none";
  if (inAllowedRoot) return "open";
  return SAFE_OPEN_EXTENSIONS.has(path.extname(filePath).toLowerCase()) ? "open" : "reveal";
}
