// Değişiklikler: yazmadan hemen önce yolun gerçekten alan kökünün içinde
// olduğu denetimi (spec 2026-10-18 degisiklikler §6.4). Sembolik bağ ya da
// junction ile dışarı çıkış reddediliyor: var olan en yakın ata (dosyanın
// kendisi dahil) gerçek yoluyla karşılaştırılıyor.
import { lstatSync, realpathSync, rmdirSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath } from "../shared/changesLogic";
import type { PathKind } from "./changesManager";

const absolute = (root: string, rel: string) => path.join(root, ...rel.split("/"));

/**
 * Yolun diskteki türü, bağı İZLEMEDEN (lstat). ÖNCE bağ denetimi: Node
 * Windows'ta junction'ı da sembolik bağ olarak raporluyor; ikisi de "link".
 * Yok (ENOENT) → "none"; başka hata fırlatıyor (yönetici çakışma sayıyor).
 */
export function pathKind(root: string, rel: string): PathKind {
  try {
    const stat = lstatSync(absolute(root, rel));
    if (stat.isSymbolicLink()) return "link";
    if (stat.isDirectory()) return "dir";
    return "file";
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return "none";
    throw error;
  }
}

/**
 * Yoldaki klasörü YALNIZ gerçek (bağ olmayan) ve boşsa kaldırır:
 * özyinelemesiz rmdir, dolu klasörde işletim sistemi reddediyor.
 * Dolu/bağ/yok/hata → false. Özyinelemeli silme hiçbir yolda yok.
 */
export function removeEmptyDir(root: string, rel: string): boolean {
  if (!isSafeRelPath(rel)) return false;
  try {
    const target = absolute(root, rel);
    const stat = lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
    rmdirSync(target);
    return true;
  } catch {
    return false;
  }
}

export function isWithin(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  if (rel === "") return true;
  if (path.isAbsolute(rel)) return false;
  return rel.split(path.sep)[0] !== "..";
}

function exists(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function insideRootReal(root: string, rel: string): boolean {
  if (!isSafeRelPath(rel)) return false;
  try {
    const realRoot = realpathSync.native(root);
    let current = path.resolve(root, ...rel.split("/"));
    while (!exists(current)) {
      const parent = path.dirname(current);
      if (parent === current) return false;
      current = parent;
    }
    // Sarkan bağda realpath fırlatır: dışarı sayılır.
    return isWithin(realRoot, realpathSync.native(current));
  } catch {
    return false;
  }
}
