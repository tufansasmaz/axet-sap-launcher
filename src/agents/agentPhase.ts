// Tur 6: kesin kaynaktaki aşamanın metni (Akış kartı ve ekip satırı). Araç
// adı → tür eşlemesi sohbet ekranındaki araç özetiyle aynı aileler
// (ChatToolRun KIND_OF); listede olmayan araç (MCP dahil) kendi adıyla.
import type { AgentPhase } from "../../app-electron/shared/agentTypes";
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

const TOOL_KEY: Record<string, TranslationKey> = {
  view: "agents.phase.tool.read",
  read: "agents.phase.tool.read",
  edit: "agents.phase.tool.edit",
  multiedit: "agents.phase.tool.edit",
  patch: "agents.phase.tool.edit",
  write: "agents.phase.tool.write",
  bash: "agents.phase.tool.run",
  glob: "agents.phase.tool.search",
  grep: "agents.phase.tool.search",
  ls: "agents.phase.tool.search",
  fetch: "agents.phase.tool.fetch",
  download: "agents.phase.tool.fetch",
  agent: "agents.phase.tool.agent"
};

/** "dosya okuyor: x.ts" · `withTarget` false: yalnız etiket (dar ekip satırı). */
export function phaseText(phase: AgentPhase, t: TranslateFn, withTarget = true): string {
  if (phase.kind === "thinking") return t("agents.phase.thinking");
  if (phase.kind === "writing") return t("agents.phase.writing");
  const tool = phase.tool ?? "";
  const key = TOOL_KEY[tool.toLowerCase()];
  const label = key ? t(key) : t("agents.phase.tool.other", { tool: tool || "?" });
  return withTarget && phase.target ? `${label}: ${phase.target}` : label;
}
