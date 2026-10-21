// Bellek notlarının diskteki kaydı (Tur 5): userData/memory-notes/<ekip>.json.
// Ekip başına tek dosya (ekip + ajan notları birlikte). Metinler gizli
// süzgecinden (redact) geçerek yazılıyor ve okunurken yine süzülüyor.
// Yazım atomik: aynı klasörde geçici dosya ("wx", fsync) → rename. Ana süreç
// tek iş parçacığı ve işlemler eşzamanlı (sync) olduğu için okuma-değiştirme-
// yazma arasında başka yazıcı yok. Hiçbir yol fırlatmıyor. Ekip kapanınca
// dosya SİLİNMİYOR (ikinci beyin kalıcı; öksüz dosya veri kaybından iyidir).
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import {
  applyPatch,
  createNote,
  isNoteId,
  newNoteId,
  NOTES_FILE_MAX,
  NOTES_MAX,
  parseNotes,
  serializeNotes,
  type MemoryNote,
  type NoteInput,
  type NotePatch,
  type NoteResult
} from "../shared/memoryNotes";
import { scrubFlowText } from "./flowHistoryStore";

export const scrubNoteText = scrubFlowText;

function fileOf(dir: string, workspaceId: unknown): string | null {
  return isBoardId(workspaceId) ? path.join(dir, `${workspaceId}.json`) : null;
}

export function loadNotes(dir: string, workspaceId: unknown): MemoryNote[] {
  const file = fileOf(dir, workspaceId);
  if (!file) return [];
  try {
    if (!existsSync(file) || statSync(file).size > NOTES_FILE_MAX) return [];
    return parseNotes(readFileSync(file, "utf-8"), scrubNoteText);
  } catch {
    return [];
  }
}

/** Atomik yazım; başarısızsa asıl dosyaya dokunulmaz. */
export function writeNotesAtomic(file: string, notes: readonly MemoryNote[]): "ok" | "tooLarge" | "writeFailed" {
  return writeTextAtomic(file, serializeNotes(notes), NOTES_FILE_MAX);
}

/** Tur 13: genel atomik yazım (geçici dosya "wx" + fsync → rename); lider görevleri ve kurallar da kullanıyor. */
export function writeTextAtomic(file: string, text: string, max: number): "ok" | "tooLarge" | "writeFailed" {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length > max) return "tooLarge";
  const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  let fd: number | null = null;
  let created = false;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    fd = openSync(temp, "wx");
    created = true;
    for (let done = 0; done < bytes.length; ) done += writeSync(fd, bytes, done, bytes.length - done);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    renameSync(temp, file);
    created = false;
    return "ok";
  } catch {
    try {
      if (fd !== null) closeSync(fd);
    } catch {
      // kapanmadıysa da silmeyi deneriz
    }
    try {
      if (created) unlinkSync(temp);
    } catch {
      // yalnız kendi geçici dosyamız; silinemese de asıl dosya sağlam
    }
    return "writeFailed";
  }
}

export interface NotesStore {
  list(workspaceId: unknown): MemoryNote[];
  add(workspaceId: unknown, input: NoteInput): NoteResult;
  /** `expectedUpdated` verilirse ve not o arada değiştiyse "changed". */
  update(workspaceId: unknown, id: unknown, patch: NotePatch, expectedUpdated?: number): NoteResult;
  remove(workspaceId: unknown, id: unknown): boolean;
}

export function createNotesStore(dir: () => string, now: () => number = Date.now): NotesStore {
  const write = (file: string, notes: MemoryNote[]): NoteResult | null => {
    const result = writeNotesAtomic(file, notes);
    return result === "ok" ? null : { ok: false, reason: result };
  };
  return {
    list: (workspaceId) => loadNotes(dir(), workspaceId),
    add(workspaceId, input) {
      const file = fileOf(dir(), workspaceId);
      if (!file || !input || typeof input !== "object") return { ok: false, reason: "invalid" };
      const notes = loadNotes(dir(), workspaceId);
      if (notes.length >= NOTES_MAX) return { ok: false, reason: "full" };
      const at = now();
      let id = newNoteId(at);
      while (notes.some((n) => n.id === id)) id = newNoteId(at);
      const note = createNote(input, at, id, scrubNoteText);
      if (!note) return { ok: false, reason: "invalid" };
      return write(file, [...notes, note]) ?? { ok: true, note };
    },
    update(workspaceId, id, patch, expectedUpdated) {
      const file = fileOf(dir(), workspaceId);
      if (!file || !isNoteId(id) || !patch || typeof patch !== "object") return { ok: false, reason: "invalid" };
      const notes = loadNotes(dir(), workspaceId);
      const at = notes.findIndex((n) => n.id === id);
      if (at < 0) return { ok: false, reason: "missing" };
      if (typeof expectedUpdated === "number" && notes[at].updated !== expectedUpdated) return { ok: false, reason: "changed" };
      const next = applyPatch(notes[at], patch, now(), scrubNoteText);
      if (!next) return { ok: false, reason: "invalid" };
      const list = [...notes];
      list[at] = next;
      return write(file, list) ?? { ok: true, note: next };
    },
    remove(workspaceId, id) {
      const file = fileOf(dir(), workspaceId);
      if (!file || !isNoteId(id)) return false;
      const notes = loadNotes(dir(), workspaceId);
      const list = notes.filter((n) => n.id !== id);
      if (list.length === notes.length) return false;
      return writeNotesAtomic(file, list) === "ok";
    }
  };
}
