// Ekran görüntüsünün diske yazılması (spec 2026-10-18 tarayici §3, §5).
// Yalnız alan kökünün altındaki .ntt-studio/tarayici/ klasörüne, var olan
// dosyanın üstüne yazmadan ("wx"). Kök içindeki bir junction/bağ dışarıyı
// gösteriyorsa yazılmıyor (Değişiklikler'in insideRootReal denetimi; mkdir'den
// önce ve sonra).
import { mkdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SCREENSHOT_DIR, SCREENSHOT_NAME_TRIES, screenshotRelPath } from "../shared/browserLogic";
import { isSafeRelPath } from "../shared/changesLogic";
import { insideRootReal } from "./changesFs";
import type { ScreenshotWrite } from "./browserSend";

const absolute = (root: string, rel: string) => path.join(root, ...rel.split("/"));

export function writeBrowserScreenshot(root: string, png: Uint8Array, now: Date): ScreenshotWrite {
  try {
    if (!statSync(root).isDirectory()) return { ok: false, reason: "noRoot" };
  } catch {
    return { ok: false, reason: "noRoot" };
  }
  for (let n = 1; n <= SCREENSHOT_NAME_TRIES; n += 1) {
    const rel = screenshotRelPath(now, n);
    if (!isSafeRelPath(rel) || !insideRootReal(root, rel)) return { ok: false, reason: "writeFailed" };
    const file = absolute(root, rel);
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      if (!insideRootReal(root, rel)) return { ok: false, reason: "writeFailed" };
      writeFileSync(file, png, { flag: "wx" });
      return { ok: true, rel };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") continue;
      return { ok: false, reason: "writeFailed" };
    }
  }
  return { ok: false, reason: "writeFailed" };
}

/** Yalnız tarayıcı klasörünün DOĞRUDAN içindeki bir .png (alt klasör yok). */
function isScreenshotRel(rel: string): boolean {
  const prefix = `${SCREENSHOT_DIR}/`;
  if (!isSafeRelPath(rel) || !rel.startsWith(prefix)) return false;
  const name = rel.slice(prefix.length);
  return !name.includes("/") && name.toLowerCase().endsWith(".png");
}

/** Gönderme düşünce kendi yazdığımız görüntüyü geri alıyoruz; tarayıcı klasörü dışına asla. */
export function removeBrowserScreenshot(root: string, rel: string): void {
  if (!isScreenshotRel(rel) || !insideRootReal(root, rel)) return;
  try {
    unlinkSync(absolute(root, rel));
  } catch {
    // yoksa ya da silinemiyorsa olduğu gibi kalır
  }
}
