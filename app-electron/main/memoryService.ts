// Bellek penceresinin ana süreç tarafı (spec 2026-10-18 ajan-bellegi §4, §6).
// Renderer yalnız (alan kimliği, bölme kimliği) yollar; anahtar config'teki
// ajan kaydından, kök alanın kaydından (memoryTarget). Serbest yol yok;
// günlükte metin, anahtar ya da yol yok.
import { isBoardId } from "../shared/boardCommands";
import {
  MEMORY_MAX_BYTES,
  isMemoryStamp,
  memoryRelPath,
  memoryTarget,
  type MemoryNotice,
  type MemoryReadResult,
  type MemoryTarget,
  type MemoryWriteResult
} from "../shared/memoryLogic";
import type { SavedTerminalWorkspace } from "../shared/types";
import type { LogFields } from "./agentMonitor";
import type { MemoryEnsure, MemoryFileRead, MemoryFileWrite } from "./memoryFiles";

export interface MemoryServiceDeps {
  workspaces(): readonly SavedTerminalWorkspace[];
  ensure(root: string, key: string, name: string): MemoryEnsure;
  read(root: string, key: string): MemoryFileRead;
  write(root: string, key: string, content: string, stamp: string): MemoryFileWrite;
  absPath(root: string, key: string): string | null;
  reveal(file: string): void;
  notice(paneId: string): MemoryNotice;
  renotify(paneId: string): boolean;
  log(tag: string, fields: LogFields): void;
}

export interface MemoryService {
  read(workspaceId: unknown, paneId: unknown): MemoryReadResult;
  write(workspaceId: unknown, paneId: unknown, content: unknown, stamp: unknown): MemoryWriteResult;
  reveal(workspaceId: unknown, paneId: unknown): boolean;
  renotify(workspaceId: unknown, paneId: unknown): boolean;
}

const isPaneId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 100;

function attempt<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function createMemoryService(deps: MemoryServiceDeps): MemoryService {
  function target(workspaceId: unknown, paneId: unknown): (MemoryTarget & { paneId: string }) | null {
    if (!isBoardId(workspaceId) || !isPaneId(paneId)) return null;
    const found = attempt(() => memoryTarget(deps.workspaces(), workspaceId, paneId), null);
    return found ? { ...found, paneId } : null;
  }

  return {
    read(workspaceId, paneId) {
      const t = target(workspaceId, paneId);
      if (!t) return { ok: false, reason: "noMemory" };
      const rel = memoryRelPath(t.key);
      const notice = attempt(() => deps.notice(t.paneId), "none" as MemoryNotice);
      // İlk açılış: yalnız yoksa yaratılır (sapma 12); sonuç okuma adımında görünür.
      attempt(() => deps.ensure(t.root, t.key, t.name), "failed" as MemoryEnsure);
      const file = attempt(() => deps.read(t.root, t.key), { ok: false, reason: "readFailed" } as MemoryFileRead);
      if (file.ok) return { ok: true, rel, content: file.content, stamp: file.stamp, notice };
      return { ok: false, reason: file.reason === "missing" ? "readFailed" : file.reason, rel, notice };
    },
    write(workspaceId, paneId, content, stamp) {
      if (typeof content !== "string" || !isMemoryStamp(stamp)) return { ok: false, reason: "invalid" };
      const t = target(workspaceId, paneId);
      if (!t) return { ok: false, reason: "noMemory" };
      // UTF-16 birimi ≤ UTF-8 baytı: bu kadar uzunsa kesin sınır dışı.
      if (content.length > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
      const res = attempt(() => deps.write(t.root, t.key, content, stamp), { ok: false, reason: "writeFailed" } as MemoryFileWrite);
      const fields: LogFields = res.ok ? { sonuc: "tamam", bayt: res.bytes } : { sonuc: res.reason, bayt: 0 };
      attempt(() => deps.log("bellek.kaydet", fields), undefined);
      return res.ok ? { ok: true, stamp: res.stamp } : { ok: false, reason: res.reason };
    },
    reveal(workspaceId, paneId) {
      const t = target(workspaceId, paneId);
      const file = t ? attempt(() => deps.absPath(t.root, t.key), null) : null;
      if (!file) return false;
      return attempt(() => {
        deps.reveal(file);
        return true;
      }, false);
    },
    renotify(workspaceId, paneId) {
      const t = target(workspaceId, paneId);
      return t ? attempt(() => deps.renotify(t.paneId), false) : false;
    }
  };
}
