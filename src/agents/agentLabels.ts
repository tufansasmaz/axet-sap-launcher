// Ajan ve bölme etiketleri (spec 2026-10-17 ajan-alani §4). Ürün adları
// çevrilmiyor ama sözlükte duruyor: "Özel komut" çevriliyor ve hepsi tek yerden.
import type { AgentEngineId } from "../../app-electron/shared/agentTypes";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane } from "../stores/terminalTypes";

export const ENGINE_LABEL: Record<AgentEngineId, TranslationKey> = {
  "axet-code": "agents.engineAxet",
  claude: "agents.engineClaude",
  codex: "agents.engineCodex",
  gemini: "agents.engineGemini",
  ozel: "agents.engineCustom"
};

export const KIND_LABEL: Record<TerminalPaneKind, TranslationKey> = {
  agent: "terminal.kindAgent",
  cmd: "terminal.kindCmd",
  powershell: "terminal.kindPowershell"
};

/** Adı olmayan bölmenin etiketi: ajanda motorun adı, kabukta türü. */
export function paneLabel(pane: Pick<TerminalPane, "kind" | "agent">, t: TranslateFn): string {
  // Tur 12: kabukta başlatılan motorun bölmesi de motorun adıyla.
  if (pane.kind === "agent" || pane.agent) return t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  return t(KIND_LABEL[pane.kind]);
}

/** Ajanın görünen adı: bölmenin adı, yoksa motorun adı. */
export function agentName(pane: Pick<TerminalPane, "kind" | "agent" | "title">, t: TranslateFn): string {
  return pane.title ?? paneLabel(pane, t);
}
