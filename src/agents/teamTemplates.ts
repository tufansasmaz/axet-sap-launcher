// Ekip şablonları (spec 2026-10-18 ajanlar-yeniden §2b): "+ Ekip" boş bir
// alan ya da hazır bir ekip açar. Şablon yalnız ajan bölmeleri açar: motor
// axet-code, rol bir etiket (`--agent` ile başlatılmıyor; axet-code'un kendi
// ajan listesine ve rol kapısına dokunulmuyor), klasör alanın varsayılanı.
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { NewAgentInput } from "../stores/terminalStoreContext";
import { ROLE_PRESETS } from "./rolePresets";

export type TeamTemplateId = "sapDev" | "analysis" | "support";

export interface TeamTemplate {
  id: TeamTemplateId;
  titleKey: TranslationKey;
  hintKey: TranslationKey;
  agents: readonly { roleKey: TranslationKey; color: TerminalPaneColor }[];
}

export const TEAM_TEMPLATES: readonly TeamTemplate[] = [
  {
    id: "sapDev",
    titleKey: "teams.tplSapDev",
    hintKey: "teams.tplSapDevHint",
    agents: [
      { roleKey: "agents.roleLead", color: "violet" },
      { roleKey: "agents.roleDeveloper", color: "blue" },
      { roleKey: "agents.roleTest", color: "green" }
    ]
  },
  {
    id: "analysis",
    titleKey: "teams.tplAnalysis",
    hintKey: "teams.tplAnalysisHint",
    agents: [
      { roleKey: "agents.roleLead", color: "violet" },
      { roleKey: "agents.roleAnalyst", color: "amber" }
    ]
  },
  {
    id: "support",
    titleKey: "teams.tplSupport",
    hintKey: "teams.tplSupportHint",
    agents: [{ roleKey: "teams.roleSupport", color: "blue" }]
  }
];

export function templateAgents(id: TeamTemplateId, t: (key: TranslationKey) => string, cwd: string): NewAgentInput[] {
  const template = TEAM_TEMPLATES.find((x) => x.id === id);
  if (!template) return [];
  return template.agents.map(({ roleKey, color }) => {
    const role = t(roleKey);
    return {
      spec: { engine: "axet-code", role, roleKind: ROLE_PRESETS.includes(roleKey) ? "preset" : "custom" },
      name: role,
      color,
      cwd
    };
  });
}
