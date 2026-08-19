import { shell } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AppConfig, FsEntry, FsImportFilesResult, FsListDirResult, FsReadDocxResult, FsReadImageResult, FsReadTextResult } from "../shared/types";

const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2MB — daha büyük dosyalar önizleme için gereksiz/yavaş
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// Dosya Gezgini paneli sadece bu uygulamanın kendi oluşturduğu proje
// klasörlerini göstermeli — renderer'dan (contextIsolation altında olsa da)
// gelen bir path'in bilgisayardaki HERHANGİ bir dosyayı okumasına izin
// vermemek için tüm fs:* çağrıları burada projectsBaseDir'in altında kalmaya
// zorlanıyor.
export function isPathAllowed(config: AppConfig, targetPath: string): boolean {
  const base = path.resolve(config.projectsBaseDir);
  const target = path.resolve(targetPath);
  if (target === base) return true;
  const relative = path.relative(base, target);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function listDir(dirPath: string): Promise<FsListDirResult> {
  try {
    const names = await fs.readdir(dirPath);
    const entries: FsEntry[] = [];
    for (const name of names) {
      const full = path.join(dirPath, name);
      try {
        const stat = await fs.stat(full);
        entries.push({
          name,
          path: full,
          isDir: stat.isDirectory(),
          size: stat.size,
          modifiedAt: stat.mtime.toISOString()
        });
      } catch {
        // erişilemeyen tekil bir dosya/klasör tüm listelemeyi düşürmesin
      }
    }
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
    });
    return { ok: true, entries };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function looksBinary(buffer: Buffer): boolean {
  const sampleLen = Math.min(buffer.length, 8000);
  for (let i = 0; i < sampleLen; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export async function readTextFile(filePath: string): Promise<FsReadTextResult> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) return { ok: false, error: "Bu bir klasör, dosya değil." };
    const truncated = stat.size > MAX_TEXT_BYTES;
    const fd = await fs.open(filePath, "r");
    try {
      const readLength = truncated ? MAX_TEXT_BYTES : stat.size;
      const buffer = Buffer.alloc(readLength);
      await fd.read(buffer, 0, readLength, 0);
      if (looksBinary(buffer)) {
        return { ok: false, error: "Bu dosya metin olarak görüntülenemiyor (ikili/binary içerik)." };
      }
      return { ok: true, content: buffer.toString("utf-8"), truncated };
    } finally {
      await fd.close();
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function readDocxFile(filePath: string): Promise<FsReadDocxResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ path: filePath });
    return { ok: true, html: result.value };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function readImageDataUrl(filePath: string): Promise<FsReadImageResult> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mime = IMAGE_MIME_BY_EXT[ext];
    if (!mime) return { ok: false, error: "Bilinmeyen resim türü." };
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Resim önizleme için çok büyük." };
    }
    const buffer = await fs.readFile(filePath);
    return { ok: true, dataUrl: `data:${mime};base64,${buffer.toString("base64")}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function openInExplorer(filePath: string): Promise<void> {
  shell.showItemInFolder(filePath);
}

export async function openExternal(filePath: string): Promise<void> {
  await shell.openPath(filePath);
}

async function findAvailableName(destDir: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const base = fileName.slice(0, fileName.length - ext.length);
  let candidate = fileName;
  let counter = 1;
  // Hedef klasörde aynı isimde bir dosya varsa üzerine yazmak yerine
  // "isim (1).ext", "isim (2).ext" şeklinde çakışmasız bir ad bulunur —
  // Explorer/Finder'ın sürükle-bırak davranışıyla aynı mantık.
  while (true) {
    try {
      await fs.access(path.join(destDir, candidate));
      candidate = `${base} (${counter}).ext`.replace(".ext", ext);
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

// Dosya Gezgini'ne sürükle-bırak veya "Dosya Ekle" diyaloğu ile dışarıdan
// eklenen dosyaları hedef proje klasörüne kopyalar. Klasörler bilinçli
// olarak atlanıyor (recursive kopyalama şimdilik kapsam dışı) — atlanan
// klasörler renderer'a bildirilip kullanıcıya toast ile gösteriliyor.
export async function importFiles(destDir: string, sourcePaths: string[]): Promise<FsImportFilesResult> {
  try {
    let imported = 0;
    const skippedDirs: string[] = [];
    for (const sourcePath of sourcePaths) {
      const stat = await fs.stat(sourcePath).catch(() => null);
      if (!stat) continue;
      if (stat.isDirectory()) {
        skippedDirs.push(path.basename(sourcePath));
        continue;
      }
      const targetName = await findAvailableName(destDir, path.basename(sourcePath));
      await fs.copyFile(sourcePath, path.join(destDir, targetName));
      imported += 1;
    }
    return { ok: true, imported, skippedDirs };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

