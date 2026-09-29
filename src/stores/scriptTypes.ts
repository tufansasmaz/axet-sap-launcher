import type { GuiScriptComponentDetail } from "../../app-electron/shared/types";

// Script ağacının ortak türleri: ekran (`SapGuiScriptingHome`), store ve
// kenar çubuğu (`ScriptSidebar`) aynı anahtarlarla konuşuyor.

export type NodeState = GuiScriptComponentDetail | "loading" | "error";

export interface SelectedSession {
  connIdx: number;
  sessIdx: number;
}

export const ROOT_KEY = "__root__";

export function nodeKey(connIdx: number, sessIdx: number, elementId: string): string {
  return `${connIdx}:${sessIdx}:${elementId || ROOT_KEY}`;
}
