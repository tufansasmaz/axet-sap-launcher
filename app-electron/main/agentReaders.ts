// Motor → okuyucu (spec 2026-10-17 ajan-alani §6). Kesin okuyucusu olmayan
// motor genel okuyucuyu alıyor; Claude Code/Codex kesin okuyucuları ölçüldükçe
// burada takılacak (ekran değişmez).
import { AGENT_ENGINES } from "../shared/agentEngines";
import type { AgentRegistration } from "../shared/agentTypes";
import { AxetReader, type AxetDbPort, type MatchOutcome, type SessionRegistry } from "./agentAxetReader";
import { GenericReader, genericAgentReader, type AgentReader } from "./agentGenericReader";
import { findSessionsByPrompt, readSessionMessages, resolveSessionDb } from "./axetSessionDb";

/** Gerçek oturum veritabanı (salt okuma, better-sqlite3; yalnız Electron'da). */
export const liveAxetDbPort: AxetDbPort = {
  resolveDb: resolveSessionDb,
  findSessions: findSessionsByPrompt,
  readMessages: readSessionMessages
};

export interface ReaderDeps {
  now: () => number;
  port: AxetDbPort;
  registry: SessionRegistry;
  onMatch: (reg: AgentRegistration, outcome: MatchOutcome) => void;
}

export function createAgentReader(reg: AgentRegistration, deps: ReaderDeps): AgentReader {
  const axet = AGENT_ENGINES[reg.engine].reader === "axet";
  // Tur 9: kesin okuyucusu olmayan motorda tur sonu terminal hata satırı taranır.
  const generic = new GenericReader({ command: reg.command, now: deps.now, scanErrors: !axet });
  if (!axet) return genericAgentReader(generic);
  return new AxetReader({
    agentId: reg.paneId,
    cwd: reg.cwd,
    startedAtMs: deps.now(),
    port: deps.port,
    registry: deps.registry,
    generic,
    now: deps.now,
    onMatch: (outcome) => deps.onMatch(reg, outcome)
  });
}
