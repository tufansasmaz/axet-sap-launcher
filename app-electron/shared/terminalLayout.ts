// Terminal modunun sınırları ve kayıtlı düzenin okunması (spec §4.1).
//
// Ana süreç (store.ts) ve renderer aynı sınırları kullanıyor; bu yüzden
// `shared` altında. Dosya elle düzenlenebilir ya da eski bir sürümden
// gelebilir: bozuk öğe hata fırlatmıyor, yalnızca atlanıyor.

import type { SavedTerminalPane, SavedTerminalWorkspace, TerminalPaneKind } from "./types";

export const MAX_TERMINAL_PANES = 9;
export const MAX_TERMINAL_WORKSPACES = 6;

// `terminal:create` klasör yokken bu metinle hata fırlatıyor. Electron
// mesajın başına "Error invoking remote method …" ekliyor; renderer
// `includes` ile tanıyor.
export const TERMINAL_MISSING_DIR = "TERMINAL_MISSING_DIR";

export const TERMINAL_PANE_KINDS: readonly TerminalPaneKind[] = ["axet", "cmd", "powershell"];

export function isTerminalPaneKind(value: unknown): value is TerminalPaneKind {
  return typeof value === "string" && (TERMINAL_PANE_KINDS as readonly string[]).includes(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

/** `nameFor(n)` listede olmayan ilk n (1'den başlar). */
export function firstFreeWorkspaceNumber(names: readonly string[], nameFor: (n: number) => string): number {
  const taken = new Set(names);
  let n = 1;
  while (taken.has(nameFor(n))) n += 1;
  return n;
}

export function normalizeTerminalWorkspaces(raw: unknown, nameFor: (n: number) => string): SavedTerminalWorkspace[] {
  if (!Array.isArray(raw)) return [];
  const workspaceIds = new Set<string>();
  const paneIds = new Set<string>();
  const result: SavedTerminalWorkspace[] = [];
  for (const item of raw) {
    if (result.length >= MAX_TERMINAL_WORKSPACES) break;
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (!isId(record.id) || workspaceIds.has(record.id)) continue;
    const panes: SavedTerminalPane[] = [];
    if (Array.isArray(record.panes)) {
      for (const entry of record.panes) {
        if (panes.length >= MAX_TERMINAL_PANES) break;
        if (!entry || typeof entry !== "object") continue;
        const pane = entry as Record<string, unknown>;
        if (!isId(pane.id) || paneIds.has(pane.id)) continue;
        if (!isTerminalPaneKind(pane.kind)) continue;
        if (typeof pane.cwd !== "string" || !pane.cwd.trim()) continue;
        paneIds.add(pane.id);
        panes.push({ id: pane.id, kind: pane.kind, cwd: pane.cwd });
      }
    }
    workspaceIds.add(record.id);
    result.push({ id: record.id, name: typeof record.name === "string" ? record.name.trim() : "", panes });
  }
  // Adsızlar en sonda dolduruluyor: önce bütün dolu adlar biliniyor ki
  // "Çalışma alanı 1" adını elle almış bir alanla çakışılmasın.
  for (const workspace of result) {
    if (workspace.name) continue;
    workspace.name = nameFor(firstFreeWorkspaceNumber(result.map((w) => w.name), nameFor));
  }
  return result;
}

export function normalizeActiveWorkspaceId(raw: unknown, workspaces: readonly SavedTerminalWorkspace[]): string | null {
  return typeof raw === "string" && workspaces.some((w) => w.id === raw) ? raw : null;
}
