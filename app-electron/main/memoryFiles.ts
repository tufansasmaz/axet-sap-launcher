// Bellek dosyasının diskteki işleri (spec 2026-10-18 ajan-bellegi §2, §4, §5, §7).
//
// Kurallar (veri kaybı yok):
//   - Yaratma YALNIZ yoksa ("wx"); var olan dosyaya ilk içerik yazılmaz.
//   - Yazma YALNIZ diskteki baytların özeti okunduğu andakiyle aynıysa;
//     aynı klasörde geçici dosya ("wx") → rename'den hemen önce yeniden
//     özet → rename. Dosya silinmişse yeniden yaratılmaz ("changed").
//   - Bellek dosyası hiçbir yolda silinmez; yalnız kendi yarattığımız geçici
//     dosya. rename yarıda kalırsa (Windows'ta hedef açıkken EPERM/EBUSY)
//     asıl dosyaya dokunulmaz, "writeFailed" döner.
//   - Yol alan kökünün gerçekten içinde (insideRootReal, mkdir'den önce ve
//     sonra); dosyanın yerinde bağ ya da klasör varsa dokunulmaz.
//   - 256 KB üstü ve UTF-8 olmayan dosya düzenlemeye açılmaz.
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath } from "../shared/changesLogic";
import { MEMORY_MAX_BYTES, isMemoryKey, memoryInitialContent, memoryRelPath } from "../shared/memoryLogic";
import { insideRootReal } from "./changesFs";

export type MemoryEnsure = "exists" | "created" | "failed";

export type MemoryFileRead =
  | { ok: true; content: string; stamp: string }
  | { ok: false; reason: "noRoot" | "unsafe" | "tooLarge" | "encoding" | "readFailed" | "missing" };

export type MemoryFileWrite =
  | { ok: true; stamp: string; bytes: number }
  | { ok: false; reason: "noRoot" | "unsafe" | "tooLarge" | "changed" | "writeFailed" };

const BOM = String.fromCharCode(0xfeff);
const absolute = (root: string, rel: string) => path.join(root, ...rel.split("/"));

export function memoryStamp(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function rootIsDir(root: string): boolean {
  try {
    return statSync(root).isDirectory();
  } catch {
    return false;
  }
}

/** Anahtar geçerli ve yol (var olan en yakın ata dahil) kökün gerçekten içinde. */
function safeRel(root: string, key: string): string | null {
  if (!isMemoryKey(key)) return null;
  const rel = memoryRelPath(key);
  return isSafeRelPath(rel) && insideRootReal(root, rel) ? rel : null;
}

/** Bağı izlemeden: düz dosya mı, yok mu, başka bir şey mi (bağ, klasör, okunamayan). */
function fileKind(file: string): "file" | "none" | "other" {
  try {
    const stat = lstatSync(file);
    return stat.isSymbolicLink() || !stat.isFile() ? "other" : "file";
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "ENOENT" ? "none" : "other";
  }
}

const hasBom = (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;

/** Katı UTF-8; geçersiz bayt varsa null (U+FFFD ile ezmemek için). BOM düşer. */
function decode(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function memoryAbsPath(root: string, key: string): string | null {
  const rel = safeRel(root, key);
  return rel ? absolute(root, rel) : null;
}

export function ensureMemoryFile(root: string, key: string, name: string): MemoryEnsure {
  if (!rootIsDir(root)) return "failed";
  const rel = safeRel(root, key);
  if (!rel) return "failed";
  const file = absolute(root, rel);
  const kind = fileKind(file);
  if (kind === "file") return "exists";
  if (kind === "other") return "failed";
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    if (!insideRootReal(root, rel)) return "failed";
    writeFileSync(file, memoryInitialContent(name), { encoding: "utf8", flag: "wx" });
    return "created";
  } catch (error) {
    // Aynı anda biri yarattıysa onunki kalır.
    return (error as NodeJS.ErrnoException)?.code === "EEXIST" && fileKind(file) === "file" ? "exists" : "failed";
  }
}

export function readMemoryFile(root: string, key: string): MemoryFileRead {
  if (!rootIsDir(root)) return { ok: false, reason: "noRoot" };
  const rel = safeRel(root, key);
  if (!rel) return { ok: false, reason: "unsafe" };
  const file = absolute(root, rel);
  const kind = fileKind(file);
  if (kind === "none") return { ok: false, reason: "missing" };
  if (kind === "other") return { ok: false, reason: "unsafe" };
  try {
    if (statSync(file).size > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
    const bytes = readFileSync(file);
    // stat ile okuma arasında büyüdüyse
    if (bytes.length > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
    const text = decode(bytes);
    if (text === null) return { ok: false, reason: "encoding" };
    return { ok: true, content: text.replace(/\r\n/g, "\n"), stamp: memoryStamp(bytes) };
  } catch {
    return { ok: false, reason: "readFailed" };
  }
}

/** Kullanıcının metni dosyanın kendi biçimine: CRLF'liyse CRLF, BOM'luysa BOM. */
function toFileText(content: string, original: Uint8Array, originalText: string): string {
  const lf = content.replace(/\r\n/g, "\n");
  const text = originalText.includes("\r\n") ? lf.replace(/\n/g, "\r\n") : lf;
  return hasBom(original) ? BOM + text : text;
}

export function writeMemoryFile(root: string, key: string, content: string, expectedStamp: string): MemoryFileWrite {
  if (!rootIsDir(root)) return { ok: false, reason: "noRoot" };
  const rel = safeRel(root, key);
  if (!rel) return { ok: false, reason: "unsafe" };
  const file = absolute(root, rel);
  // Silinmiş ya da yerine başka bir şey konmuş: ezme yok, yeniden yaratma yok.
  if (fileKind(file) !== "file") return { ok: false, reason: "changed" };
  let current: Buffer;
  try {
    current = readFileSync(file);
  } catch {
    return { ok: false, reason: "writeFailed" };
  }
  if (memoryStamp(current) !== expectedStamp) return { ok: false, reason: "changed" };
  const originalText = decode(current);
  if (originalText === null) return { ok: false, reason: "changed" };
  const bytes = Buffer.from(toFileText(content, current, originalText), "utf8");
  if (bytes.length > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
  const temp = path.join(path.dirname(file), `.${key}.${randomBytes(4).toString("hex")}.tmp`);
  // Yalnız kendi yarattığımız geçici dosya silinir ("wx" EEXIST verdiyse o dosya bizim değil).
  let tempCreated = false;
  const dropTemp = () => {
    if (!tempCreated) return;
    try {
      unlinkSync(temp);
      tempCreated = false;
    } catch {
      // silinemediyse yapılacak bir şey yok; asıl dosyaya dokunulmadı
    }
  };
  try {
    writeFileSync(temp, bytes, { flag: "wx" });
    tempCreated = true;
    // Son bakış: rename'den hemen önce dosya hâlâ okunduğu gibi mi.
    if (fileKind(file) !== "file" || memoryStamp(readFileSync(file)) !== expectedStamp || !insideRootReal(root, rel)) {
      dropTemp();
      return { ok: false, reason: "changed" };
    }
    renameSync(temp, file);
    tempCreated = false;
    return { ok: true, stamp: memoryStamp(bytes), bytes: bytes.length };
  } catch {
    dropTemp();
    return { ok: false, reason: "writeFailed" };
  }
}
