// Motor → okuyucu (spec 2026-10-17 ajan-alani §6). Kesin okuyucusu olmayan
// motor genel okuyucuyu alıyor; Claude Code/Codex kesin okuyucuları ölçüldükçe
// burada takılacak (ekran değişmez).
import { homedir } from "node:os";
import { AGENT_ENGINES } from "../shared/agentEngines";
import type { AgentRegistration } from "../shared/agentTypes";
import { AxetReader, type AxetDbPort, type MatchOutcome, type SessionRegistry } from "./agentAxetReader";
import { GenericReader, genericAgentReader, type AgentReader } from "./agentGenericReader";
import { ClaudeReader, liveClaudeTranscriptPort, type ClaudeTranscriptPort } from "./agentClaudeReader";
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
  /** Tur 10: Claude Code dökümleri (yoksa gerçek dosya sistemi). */
  claudePort?: ClaudeTranscriptPort;
  home?: string;
  claudeConfigDir?: string;
}

export function createAgentReader(reg: AgentRegistration, deps: ReaderDeps): AgentReader {
  const axet = AGENT_ENGINES[reg.engine].reader === "axet";
  // Tur 9: kesin okuyucusu olmayan motorda tur sonu terminal hata satırı taranır.
  const generic = new GenericReader({ command: reg.command, now: deps.now, scanErrors: !axet });
  // Tur 10: Claude Code kesin okuyucusu; özel komut da Claude başlatıcısı olabilir (bağ kurulursa kesin).
  if (reg.engine === "claude" || reg.engine === "ozel") {
    return new ClaudeReader({
      agentId: reg.paneId,
      cwd: reg.cwd,
      home: deps.home ?? homedir(),
      configDir: deps.claudeConfigDir ?? process.env.CLAUDE_CONFIG_DIR,
      startedAtMs: deps.now(),
      port: deps.claudePort ?? liveClaudeTranscriptPort,
      registry: deps.registry,
      generic,
      now: deps.now,
      optional: reg.engine === "ozel",
      onMatch: (outcome) => deps.onMatch(reg, outcome)
    });
  }
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
