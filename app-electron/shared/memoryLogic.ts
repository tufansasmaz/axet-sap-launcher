// Ajan başına kalıcı bellek: saf mantık (spec 2026-10-18 ajan-bellegi §2, §3, §5).
//
// Ana süreç ve renderer aynı kuralları kullanıyor; bu yüzden `shared` altında.
// Dosyaya dokunan hiçbir şey burada yok (bkz. main/memoryFiles.ts). Bellek
// kullanıcının dosyası: bu modül yalnız ad, yol ve metin üretir.
import type { AgentSpec } from "./agentTypes";
import type { SavedTerminalWorkspace } from "./types";

export const MEMORY_DIR = ".ntt-studio/bellek";
export const MEMORY_KEY_MAX = 40;
/** Bellek dosyası en çok bu kadar okunur, gösterilir, yazılır (spec §5). */
export const MEMORY_MAX_BYTES = 256 * 1024;

const FALLBACK_KEY = "ajan";
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
// Windows'un ayrılmış aygıt adları: `con.md` uzantıyla da yaratılamıyor.
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/;
const TR_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
const STAMP_RE = /^[0-9a-f]{64}$/;
const TITLE_MAX = 60;

export type MemoryNotice = "none" | "pending" | "sending" | "sent" | "failed";

export type MemoryFailure =
  | "invalid"
  | "noMemory"
  | "noRoot"
  | "unsafe"
  | "tooLarge"
  | "encoding"
  | "readFailed"
  | "changed"
  | "writeFailed";

export type MemoryReadResult =
  | { ok: true; rel: string; content: string; stamp: string; notice: MemoryNotice; mtime?: number }
  | { ok: false; reason: MemoryFailure; rel?: string; notice?: MemoryNotice };

export type MemoryWriteResult = { ok: true; stamp: string } | { ok: false; reason: MemoryFailure };

export interface MemoryTarget {
  /** Alanın kökü, yoksa ajanın çalışma klasörü. */
  root: string;
  key: string;
  /** Dosya başlığı için: bölmenin adı, yoksa motor. */
  name: string;
}

type PanesOf = readonly { panes: readonly { agent?: AgentSpec; shellAgent?: { memory?: string } }[] }[];

export function isMemoryKey(value: unknown): value is string {
  return typeof value === "string" && KEY_RE.test(value) && !RESERVED.test(value);
}

/** Bellek dosyasının SHA-256 özeti: 64 küçük onaltılık. */
export function isMemoryStamp(value: unknown): value is string {
  return typeof value === "string" && STAMP_RE.test(value);
}

/**
 * Ajan adından anahtar (spec §2): küçük harf, Türkçe harfler ASCII, öteki
 * aksanlar sökülür, `[a-z0-9-]` dışı `-`, art arda `-` teke, baş/son `-`
 * atılır, en çok 40; boşsa `ajan`; Windows ayrılmış adı `-ajan` eki alır.
 */
export function deriveMemoryKey(name: string): string {
  const key = name
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => TR_ASCII[c] ?? c)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MEMORY_KEY_MAX)
    .replace(/-+$/, "");
  if (!key) return FALLBACK_KEY;
  return RESERVED.test(key) ? `${key}-${FALLBACK_KEY}` : key;
}

/** Çakışmada `-2`, `-3`… eki; toplam yine en çok 40, ekin önünde tire birikmez. */
export function uniqueMemoryKey(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const key = `${base.slice(0, MEMORY_KEY_MAX - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!taken.has(key)) return key;
  }
}

/** Bütün alanlardaki ajanların anahtarları: iki alan aynı kökü gösterebilir (sapma 4). */
export function takenMemoryKeys(workspaces: PanesOf): Set<string> {
  const out = new Set<string>();
  for (const workspace of workspaces) {
    for (const pane of workspace.panes) {
      const key = pane.agent?.memory;
      if (isMemoryKey(key)) out.add(key);
      // Tur 13: kabuk bölmesinin kaydı (motor kapalıyken de anahtar tutulu).
      const shellKey = pane.shellAgent?.memory;
      if (isMemoryKey(shellKey)) out.add(shellKey);
    }
  }
  return out;
}

/** Spec'e tekil anahtar ekler; geçerli anahtarı varsa olduğu gibi döner. */
export function withMemoryKey(spec: AgentSpec, name: string, workspaces: PanesOf): AgentSpec {
  if (isMemoryKey(spec.memory)) return spec;
  return { ...spec, memory: uniqueMemoryKey(deriveMemoryKey(name), takenMemoryKeys(workspaces)) };
}

export function memoryRelPath(key: string): string {
  return `${MEMORY_DIR}/${key}.md`;
}

// C0, DEL, C1 ve Unicode satır/paragraf ayırıcıları (kod noktasıyla; kaynakta görünmez karakter yok).
function isControl(ch: string): boolean {
  const n = ch.codePointAt(0) ?? 0;
  return n < 0x20 || (n >= 0x7f && n <= 0x9f) || n === 0x2028 || n === 0x2029;
}

/** Yeni dosyanın içeriği (spec §2); yalnız dosya yoksa yazılır. */
export function memoryInitialContent(name: string): string {
  const flat = Array.from(name, (ch) => (isControl(ch) ? " " : ch)).join("").replace(/\s+/g, " ").trim();
  const title = Array.from(flat).slice(0, TITLE_MAX).join("").trim() || "Ajan";
  return `# ${title} — kalıcı bellek\n\nBu dosyayı ajan ve sen birlikte tutarsınız; kalıcı kararlar, öğrenilenler, yarım işler.\n`;
}

/** Ajana yazılan tek satır (spec §3). ASCII; `sendPrompt`'un kurallarına uyar. */
export function memoryPromptLine(key: string): string {
  return (
    `[Bellek] Kalici bellegin: ${memoryRelPath(key)} (alan kokune gore). Once oku. ` +
    "Kalici kararlari, ogrendiklerini ve yarim isleri oraya kisa maddelerle yaz; gizli bilgi (sifre, token) yazma."
  );
}

/**
 * Config'teki kayıttan bellek hedefi (spec §6): anahtar ajanın spec'inden,
 * kök alanın kaydından (yoksa ajanın klasörü). Bellek kapalı, kabuk, başka
 * alanın bölmesi ya da geçersiz anahtar → null.
 */
export function memoryTarget(
  workspaces: readonly SavedTerminalWorkspace[],
  workspaceId: string,
  paneId: string
): MemoryTarget | null {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const pane = workspace?.panes.find((p) => p.id === paneId);
  // Tur 13: kabukta başlatılan ajanın belleği bölmenin kaydında (shellAgent).
  const key = pane?.kind === "agent" ? pane.agent?.memory : pane?.shellAgent?.memory;
  if (!workspace || !pane || (pane.kind === "agent" && !pane.agent) || !isMemoryKey(key)) return null;
  const root = workspace.root?.trim() || pane.cwd.trim();
  if (!root) return null;
  return { root, key, name: pane.title ?? pane.agent?.engine ?? pane.kind };
}
