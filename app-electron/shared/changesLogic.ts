// Değişiklikler görünümünün saf mantığı (spec 2026-10-18 degisiklikler §3–§7).
// Dosya sistemi, git ve Electron yok; ana süreç ve renderer ortak kullanıyor.
import {
  CONFLICT_SCAN_MAX,
  LABEL_MAX,
  MAX_CHECKPOINTS,
  MAX_DIFF_LINES,
  PATH_MAX,
  PROMPT_THROTTLE_MS,
  REVERT_PATHS_MAX,
  type Checkpoint,
  type DiffLine,
  type FileChange,
  type FileStatus,
  type RangeStats
} from "./changesTypes";

const TREE = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** `git write-tree` çıktısı: SHA-1 (40) ya da SHA-256 (64) küçük hex. */
export function isTreeId(value: unknown): value is string {
  return typeof value === "string" && TREE.test(value);
}

/** Etiket: boşluklar tekleşiyor, en çok 80 kod noktası (vekil çift bölünmüyor). */
export function labelOf(text: string): string {
  return Array.from(text.replace(/\s+/g, " ").trim()).slice(0, LABEL_MAX).join("");
}

/** Aynı ajan için 30 sn içinde ikinci istem görüntüsü yok (spec §4.2). Saat geri gittiyse ya da lastAt geçersizse izin. */
export function shouldSnapshotPrompt(lastAt: number | undefined, now: number): boolean {
  return lastAt === undefined || !Number.isFinite(lastAt) || now < lastAt || now - lastAt >= PROMPT_THROTTLE_MS;
}

/** En yeni 200 kayıt (spec §3); liste eskiden yeniye. */
export function capCheckpoints(list: readonly Checkpoint[]): Checkpoint[] {
  return list.length > MAX_CHECKPOINTS ? list.slice(list.length - MAX_CHECKPOINTS) : [...list];
}

export interface CheckpointRange {
  from: Checkpoint;
  /** null: en sonuncusu, çalışma ağacına kadar (spec §5). */
  to: Checkpoint | null;
  index: number;
}

export function rangeOf(list: readonly Checkpoint[], id: string): CheckpointRange | null {
  const index = list.findIndex((c) => c.id === id);
  if (index < 0) return null;
  return { from: list[index], to: list[index + 1] ?? null, index };
}

export function laterCheckpoints(list: readonly Checkpoint[], id: string, max = CONFLICT_SCAN_MAX): Checkpoint[] {
  const index = list.findIndex((c) => c.id === id);
  return index < 0 ? [] : list.slice(index + 1, index + 1 + max);
}

/** "N bekliyor" (spec §5): geri alma öncesi güvenlik kayıtları sayılmıyor. */
export function pendingCount(list: readonly Checkpoint[]): number {
  return list.filter((c) => c.reviewed === "pending" && c.reason !== "beforeRestore").length;
}

// Yasak karakterler: C0 (\u0000-\u001f) + DEL+C1 (\u007f-\u009f), ters eğik çizgi,
// ADS (:), sıfır genişlikli/bidi (​-‏, ‪-‮, ⁦-⁩),
// BOM (﻿), yalnız surrogate (\ud800-\udfff).
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\\:​-‏‪-‮⁦-⁩﻿\ud800-\udfff]/;

// Windows ayrılmış adlar; uzantılı biçimi de (örn. con.txt, LPT1.log) kapsar.
// ¹=üst1, ²=üst2, ³=üst3 (COM/LPT1-9 ve üst simge karşılıkları).
const WIN_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

/**
 * Git'in verdiği, alan köküne göre yol mu (spec §6.4, §7). Kök dışı (`..`),
 * mutlak, sürücü harfli, ters eğik çizgili, `.git` (ve 8.3 kısa adı), NTFS
 * akışı (`:`), Windows ayrılmış adlar, sondaki nokta/boşluk, görünmez/bidi
 * karakterler, yalnız surrogate reddediliyor.
 */
export function isSafeRelPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > PATH_MAX) return false;
  if (UNSAFE_CHARS.test(value)) return false;
  if (value.startsWith("/")) return false;
  return value.split("/").every((part) => {
    if (part === "" || part === "." || part === "..") return false;
    // Sondaki nokta/boşluk: Windows yol normalleştirmesi siler (örn. .git. → .git)
    if (/[. ]$/.test(part)) return false;
    if (part.toLowerCase() === ".git") return false;
    if (/^git~\d+$/i.test(part)) return false;
    if (WIN_RESERVED.test(part)) return false;
    return true;
  });
}

/** Geri alınacak yollar (IPC): dizi, boş değil, ≤ 5000, hepsi güvenli; tekrarlar tekleşiyor. */
export function readRevertPaths(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > REVERT_PATHS_MAX) return null;
  // Array.from seyrek dizinin deliklerini undefined yapıyor (every deliği atlardı).
  const items = Array.from(raw as unknown[]);
  if (!items.every(isSafeRelPath)) return null;
  return [...new Set(items as string[])];
}

/** `-z` çıktısının yalnız tamamlanmış kayıtları: kırpılmış son kayıt atılıyor. */
function completeZ(out: string): string {
  return out.endsWith("\0") ? out : out.slice(0, out.lastIndexOf("\0") + 1);
}

/** `git diff-tree -r --no-renames --name-status -z` çıktısı.
 *  R/C (yeniden adlandırma/kopyalama): `--no-renames` geçilse de savunma için iki yol tüketip atlıyor. */
export function parseNameStatusZ(out: string): { path: string; status: FileStatus }[] {
  const parts = completeZ(out).split("\0");
  const result: { path: string; status: FileStatus }[] = [];
  let i = 0;
  while (i + 1 < parts.length) {
    const code = parts[i];
    if (!code) break;
    const firstChar = code[0];
    if (firstChar === "R" || firstChar === "C") {
      // İki yol: eski-yol + yeni-yol; hizayı korumak için üçünü birden tüket.
      i += 3;
      continue;
    }
    const path = parts[i + 1];
    if (!path) break;
    result.push({ path, status: firstChar === "A" ? "added" : firstChar === "D" ? "deleted" : "modified" });
    i += 2;
  }
  return result;
}

/** `git diff-tree -r --no-renames --numstat -z` çıktısı; ikili dosya "-\t-". */
export function parseNumstatZ(out: string): Map<string, { added: number; deleted: number; binary: boolean }> {
  const map = new Map<string, { added: number; deleted: number; binary: boolean }>();
  for (const entry of completeZ(out).split("\0")) {
    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]+)$/.exec(entry);
    if (!match) continue;
    const binary = match[1] === "-" && match[2] === "-";
    map.set(match[3], { added: binary ? 0 : Number(match[1]), deleted: binary ? 0 : Number(match[2]), binary });
  }
  return map;
}

export function mergeChanges(
  names: readonly { path: string; status: FileStatus }[],
  stats: ReadonlyMap<string, { added: number; deleted: number; binary: boolean }>
): FileChange[] {
  return names
    .map((n) => ({ path: n.path, status: n.status, ...(stats.get(n.path) ?? { added: 0, deleted: 0, binary: false }) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function statsOf(files: readonly FileChange[]): RangeStats {
  return files.reduce<RangeStats>((s, f) => ({ files: s.files + 1, added: s.added + f.added, deleted: s.deleted + f.deleted }), { files: 0, added: 0, deleted: 0 });
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Tek dosyanın birleşik diff'i → satır numaralı satırlar (spec §5). Başlık
 * satırları atlanıyor; "\ No newline at end of file" ve satır sonu CR'si
 * gösterilmiyor. Kırpılmış girdinin yarım son satırı atılıyor; en çok
 * MAX_DIFF_LINES satır.
 */
export function parseUnifiedDiff(patch: string, inputTruncated: boolean): { lines: DiffLine[]; truncated: boolean } {
  const raw = patch.split("\n");
  if (inputTruncated || raw[raw.length - 1] === "") raw.pop();
  const lines: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;
  for (const rawLine of raw) {
    if (lines.length >= MAX_DIFF_LINES) return { lines, truncated: true };
    const text = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const hunk = HUNK.exec(text);
    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      inHunk = true;
      lines.push({ kind: "hunk", oldNo: null, newNo: null, text });
      continue;
    }
    if (text.startsWith("diff --git ")) {
      inHunk = false;
      continue;
    }
    if (!inHunk) continue;
    const sign = text[0];
    if (sign === "+") lines.push({ kind: "add", oldNo: null, newNo: newNo++, text: text.slice(1) });
    else if (sign === "-") lines.push({ kind: "del", oldNo: oldNo++, newNo: null, text: text.slice(1) });
    else if (sign === " ") lines.push({ kind: "context", oldNo: oldNo++, newNo: newNo++, text: text.slice(1) });
  }
  return { lines, truncated: inputTruncated };
}

export interface KeyedQueue {
  run<T>(key: string, job: () => Promise<T>): Promise<T>;
  idle(key: string): boolean;
}

/** Aynı anahtarda işler sırayla (spec §7: aynı alanda eşzamanlı iki git işlemi yok). */
export function createKeyedQueue(): KeyedQueue {
  const tails = new Map<string, Promise<void>>();
  return {
    run<T>(key: string, job: () => Promise<T>): Promise<T> {
      const prev = tails.get(key) ?? Promise.resolve();
      // Önceki işin hatası zinciri kırmıyor; argümansız çağrı tip güvenliği açısından daha açık.
      const next = prev.then(() => job(), () => job());
      const tail = next.then(
        () => undefined,
        () => undefined
      );
      tails.set(key, tail);
      void tail.then(() => {
        if (tails.get(key) === tail) tails.delete(key);
      });
      return next;
    },
    idle(key: string): boolean {
      return !tails.has(key);
    }
  };
}
