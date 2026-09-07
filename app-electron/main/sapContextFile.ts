// `sap-context.md` — ajanın SAP tarafında gördüğü tek dosya.
//
// Neden okunabilir olması gerekiyor: kullanıcı reçeteyi dolduruyor, sistem
// bağlanıyor, skill'ler kuruluyor — ve bütün bunların ajana NASIL göründüğünü
// hiç görmüyor. "Ajan bunu biliyor mu?" sorusunun cevabı bu dosyada duruyordu
// ama dosya proje klasörünün içinde, kimsenin açmadığı bir yerde.
//
// Dosyanın SAHİBİ burası değil: launcher her bağlanışta dosyayı sıfırdan
// üretiyor (bkz. launcher.ts) ve yalnızca notlar işaretçisinden sonrasını
// koruyor. Burası okuyor, yazmıyor.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { SapContextPreview } from "../shared/types";

/** launcher.ts ve projectBrief.ts ile AYNI işaretçi — üçü ayrışırsa notlar gider. */
const NOTES_MARKER = "<!-- axet-sap-launcher:notes -->";

/** Önizlemeye alınan en fazla karakter. */
const MAX_PREVIEW = 60_000;

/**
 * İçeriği "launcher'ın ürettiği" ve "kullanıcının yazdığı" diye ayırır.
 *
 * Diskten AYRI duruyor ki test edilebilsin. Ayrımın kendisi veri kaybı
 * sınıfında: dosya her bağlanışta yeniden üretiliyor ve notlar yalnızca bu
 * işaretçinin ARDINDA durdukları için hayatta kalıyor. Arayüzde "notların
 * korunuyor" diyebilmenin başka yolu yok.
 */
export function splitContext(content: string): { generated: string; notes: string } {
  const index = content.indexOf(NOTES_MARKER);
  if (index === -1) return { generated: content, notes: "" };
  return {
    generated: content.slice(0, index),
    notes: content.slice(index + NOTES_MARKER.length).trim()
  };
}

/** Boş bir önizleme — dosya yokken de arayüzün göstereceği bir şey olmalı. */
export function emptyPreview(filePath: string): SapContextPreview {
  return {
    exists: false,
    path: filePath,
    content: "",
    truncated: false,
    modifiedAt: null,
    lineCount: 0,
    hasUserNotes: false
  };
}

export function readSapContext(projectDir: string): SapContextPreview {
  const filePath = path.join(projectDir, "sap-context.md");
  try {
    const stat = statSync(filePath);
    const raw = readFileSync(filePath, "utf-8");
    const truncated = raw.length > MAX_PREVIEW;
    return {
      exists: true,
      path: filePath,
      content: truncated ? raw.slice(0, MAX_PREVIEW) : raw,
      truncated,
      modifiedAt: stat.mtime.toISOString(),
      // Satır sayısı KIRPILMAMIŞ metinden: "1200 satırın ilki gösteriliyor"
      // diyebilmek için gerçek uzunluk lazım.
      lineCount: raw.split("\n").length,
      hasUserNotes: splitContext(raw).notes.length > 0
    };
  } catch {
    // Dosya yok ya da okunamıyor — ikisi de "gösterecek bir şey yok".
    return emptyPreview(filePath);
  }
}
