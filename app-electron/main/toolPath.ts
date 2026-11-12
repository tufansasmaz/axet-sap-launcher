// Araçlar'dan kurulan npm motorları (Claude Code, Gemini, Codex) %APPDATA%\npm
// altına düşüyor; bazı makinelerde bu klasör PATH'te değil (ölçüldü: kurulum
// başarılı, `where claude` boş, Araçlar "kurulu değil"). Ana süreç açılırken
// ve motorlar yeniden denetlenirken PATH'e, diskte varsa, ekleniyor; kabuklar
// ve `where` ortamı process.env'den aldığı için ikisi de görüyor.
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Eklenecek klasörler: Claude Code'un yerel kurulumu (~/.local/bin; Tur 10 — "yerel
 * kurulum önce"), npm genel klasörü ve Node.js'in kurulum klasörü.
 */
function toolDirs(env: Record<string, string | undefined>): string[] {
  const out: string[] = [];
  if (env.USERPROFILE) out.push(path.win32.join(env.USERPROFILE, ".local", "bin"));
  if (env.APPDATA) out.push(path.win32.join(env.APPDATA, "npm"));
  if (env.ProgramFiles) out.push(path.win32.join(env.ProgramFiles, "nodejs"));
  return out;
}

const norm = (p: string) => p.trim().replace(/[\\/]+$/, "").toLowerCase();

/** PATH'te olmayan ve diskte bulunan araç klasörlerini sona ekler; gerisine dokunmaz. */
export function withToolDirs(
  current: string | undefined,
  env: Record<string, string | undefined>,
  isDir: (p: string) => boolean = existsSync
): string {
  const parts = (current ?? "").split(";").filter((p) => p.trim() !== "");
  const have = new Set(parts.map(norm));
  const added = toolDirs(env).filter((dir) => !have.has(norm(dir)) && isDir(dir));
  if (added.length === 0) return current ?? "";
  // Yalnız SONA. 1.9.1'de ~/.local/bin npm klasörünün önüne konuyordu (Claude'un
  // yerel kurulumu kazansın diye); ama o klasörde başka araçların ikilileri de
  // var (uv'nin python3.exe'si) ve PATH'i miras alan HER süreç onları önce
  // buluyordu — py.exe betik satırındaki `python3`'ü PATH'te arıyor ve 8787
  // sunucusu yanlış Python'la düşüyordu (ölçüm 2026-11-12). Claude'un yerel
  // önceliği yalnız Claude için: agentEngineProbe.pickBinary.
  return [...parts, ...added].join(";");
}

/** Ana sürecin PATH'ini yerinde günceller (Windows'ta anahtar `Path` olabilir). */
export function ensureToolDirsOnPath(): void {
  const key = Object.keys(process.env).find((k) => k.toLowerCase() === "path") ?? "Path";
  process.env[key] = withToolDirs(process.env[key], process.env);
}
