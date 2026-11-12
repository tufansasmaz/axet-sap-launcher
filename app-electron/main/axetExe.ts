// axet-code.exe'nin sağlamlığı — programı ÇALIŞTIRMADAN, diskte okunarak.
//
// Neden çalıştırmadan: axet-code'un güncelleyicisi, program kullanımdayken
// exe'yi 0 bayta indirip "başarılı" diyebiliyor (MSI 1310; 2026-10-15/16'da
// iki kez görüldü). Ölçüldü (2026-11-12): böyle bir exe
//   * cmd.exe üzerinden (`exec("axet-code models")`) çalıştırılınca cmd.exe
//     Windows'un "This app can't run on your PC" penceresini açıyor;
//   * `spawn`/`execFile` ile çalıştırılınca Node EFTYPE'ı 'error' olayıyla
//     değil SENKRON istisnayla bildiriyor — Promise kurucusunun içindeyse
//     Promise reddediliyor, "bozuk" teşhisine hiç ulaşılmıyordu.
// Bu modül exe'yi bulur (PATH + PATHEXT, cmd.exe'nin sırasıyla) ve ilk
// baytlarına bakar: boyut 0, "MZ" yok ya da PE imzası yok → bozuk.
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import path from "node:path";

export type ExeCheck =
  | { kind: "ok"; path: string }
  | { kind: "missing" }
  | { kind: "broken"; path: string; reason: "empty" | "notPe" | "unreadable" };

const HEAD_BYTES = 1024;

/** Dosyanın ilk baytları geçerli bir Windows programı mı (MZ + PE\0\0). */
export function inspectExe(file: string): ExeCheck {
  let size: number;
  try {
    size = statSync(file).size;
  } catch {
    return { kind: "missing" };
  }
  if (size === 0) return { kind: "broken", path: file, reason: "empty" };
  let head: Buffer;
  try {
    const fd = openSync(file, "r");
    try {
      head = Buffer.alloc(Math.min(HEAD_BYTES, size));
      readSync(fd, head, 0, head.length, 0);
    } finally {
      closeSync(fd);
    }
  } catch {
    return { kind: "broken", path: file, reason: "unreadable" };
  }
  if (head.length < 0x40 || head.toString("latin1", 0, 2) !== "MZ") return { kind: "broken", path: file, reason: "notPe" };
  const peAt = head.readUInt32LE(0x3c);
  if (peAt + 4 > head.length || head.toString("latin1", peAt, peAt + 4) !== "PE\0\0") {
    return { kind: "broken", path: file, reason: "notPe" };
  }
  return { kind: "ok", path: file };
}

function envValue(env: Record<string, string | undefined>, name: string): string {
  const key = Object.keys(env).find((k) => k.toLowerCase() === name.toLowerCase());
  return (key ? env[key] : undefined) ?? "";
}

/**
 * `name`'in cmd.exe'nin bulacağı dosyası: PATH klasörleri sırayla, her
 * klasörde PATHEXT sırasıyla. Hiçbir şey çalıştırılmıyor.
 */
export function findOnPath(
  name: string,
  env: Record<string, string | undefined> = process.env,
  exists: (p: string) => boolean = existsSync
): string | null {
  const dirs = envValue(env, "PATH")
    .split(";")
    .map((d) => d.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
  const exts = path.extname(name)
    ? [""]
    : (envValue(env, "PATHEXT") || ".COM;.EXE;.BAT;.CMD")
        .split(";")
        .map((e) => e.trim())
        .filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext.toLowerCase());
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

/** PATH'teki `axet-code`'un durumu. .exe dışı bir sarmalayıcı (.cmd) bulunursa ona dokunulmuyor: ok. */
export function axetExeCheck(env: Record<string, string | undefined> = process.env): ExeCheck {
  if (process.platform !== "win32") return { kind: "ok", path: "axet-code" };
  const found = findOnPath("axet-code", env);
  if (!found) return { kind: "missing" };
  if (!/\.exe$/i.test(found)) return { kind: "ok", path: found };
  return inspectExe(found);
}
