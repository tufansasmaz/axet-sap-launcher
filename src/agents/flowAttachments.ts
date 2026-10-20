// Akış mesaj kutusuna dosya ekleme (Tur 10, madde 4). Saf: yalnız YOLLAR mesaja
// eklenir (ajan dosyayı kendi okur); içerik okunmaz, panoya/ikili veriye dokunulmaz.
// Ajanın klasöründeki dosya göreli, dışındaki mutlak; boşluklu yol tırnaklı
// (sohbet ekranıyla aynı kural: src/lib/paths.ts quotePathIfNeeded).
import { quotePathIfNeeded } from "../lib/paths";

export const FLOW_ATTACH_MAX = 10;

const norm = (p: string) => p.trim().replace(/[\\/]+$/, "").toLowerCase();

/** Mutlak Windows yolu (sürücü ya da UNC); başka bir şey eklenmiyor. */
function isAbsolute(p: string): boolean {
  return /^[A-Za-z]:\\/.test(p) || /^\\\\[^\\]+\\/.test(p);
}

export function addAttachmentPaths(current: readonly string[], paths: readonly string[]): string[] {
  const out = [...current];
  const have = new Set(out.map(norm));
  for (const raw of paths) {
    const p = (raw ?? "").trim();
    if (!p || !isAbsolute(p) || have.has(norm(p))) continue;
    if (out.length >= FLOW_ATTACH_MAX) break;
    out.push(p);
    have.add(norm(p));
  }
  return out;
}

/** Mesajdaki gösterim: ajanın klasöründeyse göreli, değilse mutlak; boşluk varsa tırnaklı. */
export function attachmentRef(file: string, cwd: string): string {
  const base = cwd.trim().replace(/[\\/]+$/, "");
  if (base && file.toLowerCase().startsWith(`${base.toLowerCase()}\\`)) return quotePathIfNeeded(file.slice(base.length + 1));
  return quotePathIfNeeded(file);
}

/** Mesaj gövdesi + tek satır ek listesi. */
export function withAttachments(body: string, files: readonly string[], cwd: string, label: string): string {
  if (files.length === 0) return body;
  const list = files.map((f) => attachmentRef(f, cwd)).join(", ");
  return body ? `${body} (${label}: ${list})` : `${label}: ${list}`;
}

export function fileName(file: string): string {
  const parts = file.split(/[\\/]/);
  return parts[parts.length - 1] || file;
}
