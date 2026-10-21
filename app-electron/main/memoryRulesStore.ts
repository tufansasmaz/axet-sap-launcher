// Tur 13: "Kimlik ve kurallar" diskte — userData/memory-rules/<ekip>.json.
// Atomik yazım (writeTextAtomic), gizli süzgeç yazarken ve okurken. Hiç fırlatmıyor.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { sanitizeRules, type MemoryRules } from "../shared/memoryRules";
import { scrubFlowText } from "./flowHistoryStore";
import { writeTextAtomic } from "./memoryNotesStore";

const FILE_MAX = 512 * 1024;

export interface RulesStore {
  get(workspaceId: unknown): MemoryRules;
  set(workspaceId: unknown, rules: unknown): "ok" | "invalid" | "tooLarge" | "writeFailed";
}

export function createRulesStore(dir: () => string): RulesStore {
  const fileOf = (workspaceId: unknown) => (isBoardId(workspaceId) ? path.join(dir(), `${workspaceId}.json`) : null);
  return {
    get(workspaceId) {
      const file = fileOf(workspaceId);
      try {
        if (!file || !existsSync(file) || statSync(file).size > FILE_MAX) return { team: "", agents: {} };
        return sanitizeRules(JSON.parse(readFileSync(file, "utf-8")), scrubFlowText);
      } catch {
        return { team: "", agents: {} };
      }
    },
    set(workspaceId, raw) {
      const file = fileOf(workspaceId);
      if (!file || !raw || typeof raw !== "object") return "invalid";
      try {
        const rules = sanitizeRules(raw, scrubFlowText);
        return writeTextAtomic(file, JSON.stringify({ version: 1, ...rules }), FILE_MAX);
      } catch {
        return "writeFailed";
      }
    }
  };
}
