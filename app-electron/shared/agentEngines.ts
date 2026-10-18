// Ajan motorlarının tanımları ve başlangıç komutu (spec 2026-10-17 ajan-alani §3, §5).
//
// İzin kipi: axet-code bugünkü kararla `-y` (kullanıcı kararı 2026-09-24; SAP
// yazmaları ayrıca SapWriteGate'ten geçiyor). Öteki motorlara izin atlatma
// bayrağı EKLENMİYOR: motor kendi onayını terminalde soruyor.
import type { AgentEngineId, AgentSpec } from "./agentTypes";

export interface AgentEngineDef {
  id: AgentEngineId;
  /** PATH'te aranan program; `ozel` için null (komutun ilk parçası, bkz. engineBinary). */
  binary: string | null;
  /** Varsayılan komut. axet-code'da ayarlardaki `axetCommand` önce geliyor. */
  base: string;
  /** Model bayrağı; bilinmiyorsa null ve ekleme penceresinde model alanı yok. */
  modelFlag: string | null;
  /** `axet`: oturum veritabanından kesin durum · `generic`: terminal hareketinden tahmini. */
  reader: "axet" | "generic";
}

export const AGENT_ENGINES: Record<AgentEngineId, AgentEngineDef> = {
  // axet-code TUI'sinde model bayrağı yok (`-m` yalnız `run`'da; spec §14).
  "axet-code": { id: "axet-code", binary: "axet-code", base: "axet-code -y", modelFlag: null, reader: "axet" },
  claude: { id: "claude", binary: "claude", base: "claude", modelFlag: "--model", reader: "generic" },
  codex: { id: "codex", binary: "codex", base: "codex", modelFlag: "--model", reader: "generic" },
  gemini: { id: "gemini", binary: "gemini", base: "gemini", modelFlag: "--model", reader: "generic" },
  ozel: { id: "ozel", binary: null, base: "", modelFlag: null, reader: "generic" }
};

// Komut kabuğa yazılıyor (cmd/PowerShell). Model ve ajan adı kullanıcıdan
// geldiği için yalnız harf/rakamla başlayan, boşluksuz ve kabuk karakteri
// taşımayan değerler komuta giriyor; ötekiler sessizce atlanıyor.
const SAFE_ARG = /^[A-Za-z0-9][\w.:/@-]*$/;

export function isSafeArg(value: string): boolean {
  return SAFE_ARG.test(value);
}

/**
 * Araçlar ekranındaki tek satırlık kurulum komutu (Tur 3). axet-code kurum içi
 * yükleyiciyle geliyor, özel komut kullanıcının: ikisinde komut yok.
 */
export const ENGINE_INSTALL: Record<AgentEngineId, string | null> = {
  "axet-code": null,
  claude: "npm install -g @anthropic-ai/claude-code",
  codex: "npm install -g @openai/codex",
  gemini: "npm install -g @google/gemini-cli",
  ozel: null
};

/** PATH'te aranacak program. `ozel`de komutun ilk parçası (tırnaklı yol olabilir). */
export function engineBinary(spec: AgentSpec): string | null {
  if (spec.engine !== "ozel") return AGENT_ENGINES[spec.engine].binary;
  const match = /^\s*"([^"]+)"|^\s*(\S+)/.exec(spec.command ?? "");
  const first = (match?.[1] ?? match?.[2] ?? "").trim();
  return first || null;
}

export function buildAgentCommand(spec: AgentSpec, axetCommand: string): string {
  if (spec.engine === "ozel") return (spec.command ?? "").trim();
  const def = AGENT_ENGINES[spec.engine];
  const parts = [spec.engine === "axet-code" ? axetCommand.trim() || def.base : def.base];
  if (spec.engine === "axet-code" && spec.roleKind === "axetAgent" && isSafeArg(spec.role)) {
    parts.push("--agent", spec.role);
  }
  if (def.modelFlag && spec.model && isSafeArg(spec.model)) parts.push(def.modelFlag, spec.model);
  return parts.join(" ");
}
