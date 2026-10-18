// Değişiklikler: yazmadan hemen önce yolun gerçekten alan kökünün içinde
// olduğu denetimi (spec 2026-10-18 degisiklikler §6.4). Sembolik bağ ya da
// junction ile dışarı çıkış reddediliyor: var olan en yakın ata (dosyanın
// kendisi dahil) gerçek yoluyla karşılaştırılıyor.
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath } from "../shared/changesLogic";

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
