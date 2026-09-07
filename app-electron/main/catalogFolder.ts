// Bu makineye eşitlenmiş NTT skill kataloğu klasörünü bulur.
//
// Katalog SharePoint'te yayınlanıyor ve kullanıcı "OneDrive'a kısayol ekle"
// dediğinde yerel diske iniyor. Ne jeton gerekiyor ne ağ isteği — klasör
// zaten burada, sadece nerede olduğu bilinmiyor.
//
// KLASÖR ADINA GÖRE ARANMIYOR. OneDrive yerel adı site ve kitaplık görünen
// adlarından, MAKİNENİN ARAYÜZ DİLİNDE üretiyor: aynı kitaplık Türkçe bir
// dizüstünde başka, İngilizce olanda başka bir dize. Tek kararlı kimlik
// klasörün İÇİNDEKİ `catalog.json` işareti.
//
// Derinlik 3 ile sınırlı: eşitlenmiş bir kitaplık kökün bir-iki altında durur
// (`<kök>/<Site> - <Kitaplık>/...`) ve tüm OneDrive ağacını taramak, büyük bir
// klasör kümesi olan dizüstünde insanların aracı çalıştırmayı bırakacağı kadar
// yavaş.

import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const MAX_DEPTH = 3;
const MARKER = "catalog.json";

export interface CatalogFolder {
  path: string;
  /** Katalogdaki departman damgası; eski yayınlarda yok. */
  department: string | null;
  version: string | null;
  generated: string | null;
  skillCount: number | null;
}

function regQuery(): Promise<string[]> {
  return new Promise((resolve) => {
    execFile(
      "reg",
      ["query", "HKCU\\Software\\SyncEngines\\Providers\\OneDrive", "/s", "/v", "MountPoint"],
      { windowsHide: true, timeout: 8_000 },
      (err, stdout) => {
        if (err || !stdout) {
          resolve([]);
          return;
        }
        const roots = [...stdout.matchAll(/MountPoint\s+REG_SZ\s+(.+)/g)].map((m) => m[1].trim());
        resolve(roots);
      }
    );
  });
}

async function onedriveRoots(): Promise<string[]> {
  const roots: string[] = [];
  if (process.platform === "win32") {
    roots.push(...(await regQuery()));
  }
  for (const name of ["OneDriveCommercial", "OneDrive", "OneDriveConsumer"]) {
    const value = process.env[name];
    if (value) roots.push(value);
  }
  try {
    const home = homedir();
    for (const entry of readdirSync(home, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("OneDrive")) roots.push(path.join(home, entry.name));
    }
  } catch {
    // ev dizini okunamıyorsa kayıt defteri/ortam değişkeni yolları yeter
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const root of roots) {
    const key = root.replace(/[\\/]+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      if (statSync(root).isDirectory()) unique.push(root);
    } catch {
      // eşitlenmemiş/silinmiş kök
    }
  }
  return unique;
}

function scan(root: string, depth: number, found: string[]): void {
  if (existsSync(path.join(root, MARKER))) found.push(root);
  if (depth <= 0) return;
  let children: string[];
  try {
    children = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("$"))
      .map((entry) => path.join(root, entry.name));
  } catch {
    return;
  }
  for (const child of children) scan(child, depth - 1, found);
}

function readCatalog(folder: string): CatalogFolder {
  const info: CatalogFolder = { path: folder, department: null, version: null, generated: null, skillCount: null };
  try {
    const data = JSON.parse(readFileSync(path.join(folder, MARKER), "utf-8")) as Record<string, unknown>;
    if (typeof data.department === "string") info.department = data.department;
    if (typeof data.catalog_version === "string") info.version = data.catalog_version;
    if (typeof data.generated === "string") info.generated = data.generated;
    if (Array.isArray(data.skills)) info.skillCount = data.skills.length;
  } catch {
    // İşaret dosyası bozuksa klasör yine de bulundu sayılıyor — "burada bir
    // katalog var ama okunamıyor" bilgisi, hiç bulunamadı demekten iyi.
  }
  return info;
}

/** Bu makinede eşitlenmiş katalog klasörleri (çoğunlukla sıfır ya da bir tane). */
export async function findCatalogFolders(): Promise<CatalogFolder[]> {
  const found: string[] = [];
  for (const root of await onedriveRoots()) scan(root, MAX_DEPTH, found);
  const seen = new Set<string>();
  const unique: CatalogFolder[] = [];
  for (const folder of found) {
    const key = folder.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(readCatalog(folder));
  }
  return unique;
}
