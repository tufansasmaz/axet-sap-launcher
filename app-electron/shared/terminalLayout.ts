// Terminal modunun sınırları ve kayıtlı düzenin okunması (spec §4.1).
//
// Ana süreç (store.ts) ve renderer aynı sınırları kullanıyor; bu yüzden
// `shared` altında. Dosya elle düzenlenebilir ya da eski bir sürümden
// gelebilir: bozuk öğe hata fırlatmıyor, yalnızca atlanıyor.

import type {
  SavedMinimizedPane,
  SavedTerminalPane,
  SavedTerminalWorkspace,
  SavedWorkspaceSap,
  TerminalMode,
  TerminalPaneColor,
  TerminalPaneKind,
  WorkspaceView
} from "./types";
import { LEGACY_AXET_AGENT, readAgentSpec, type AgentSpec } from "./agentTypes";
import { normalizeLayout, type EdgeSide, type PaneHome } from "./terminalTree";

export const MAX_TERMINAL_PANES = 9;
export const MAX_TERMINAL_WORKSPACES = 6;

// `terminal:create` klasör yokken bu metinle hata fırlatıyor. Electron
// mesajın başına "Error invoking remote method …" ekliyor; renderer
// `includes` ile tanıyor.
export const TERMINAL_MISSING_DIR = "TERMINAL_MISSING_DIR";

export const TERMINAL_PANE_KINDS: readonly TerminalPaneKind[] = ["agent", "cmd", "powershell"];

/** "+ Terminal" penceresinin türleri: düz kabuklar. Ajan "+ Ajan"dan ekleniyor. */
export const SHELL_PANE_KINDS: readonly TerminalMode[] = ["cmd", "powershell"];

export function isTerminalPaneKind(value: unknown): value is TerminalPaneKind {
  return typeof value === "string" && (TERMINAL_PANE_KINDS as readonly string[]).includes(value);
}

/**
 * Kayıttaki bölme türü. Eski `axet` bölmesi motoru axet-code olan rolsüz bir
 * ajana dönüşüyor (spec 2026-10-17 ajan-alani §3). `agent` türünde ajan alanı
 * bozuksa bölme atlanıyor; alanın geri kalanı yerinde kalıyor.
 */
export function readPaneKind(pane: Record<string, unknown>): { kind: TerminalPaneKind; agent?: AgentSpec } | null {
  if (pane.kind === "axet") return { kind: "agent", agent: { ...LEGACY_AXET_AGENT } };
  if (pane.kind === "agent") {
    const agent = readAgentSpec(pane.agent);
    return agent ? { kind: "agent", agent } : null;
  }
  if (pane.kind === "cmd" || pane.kind === "powershell") return { kind: pane.kind };
  return null;
}

export function readWorkspaceSap(raw: unknown): SavedWorkspaceSap | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isId(record.uuid) || typeof record.label !== "string") return null;
  const label = record.label.trim().slice(0, 40);
  return label ? { uuid: record.uuid, label } : null;
}

// Görev panosunun doğrulama komutları (spec 2026-10-18 gorev-panosu §2).
// Kullanıcının kendi yazdığı metin; liderden ya da ajandan gelmez. 300'ü
// aşan satır KIRPILMIYOR, atılıyor: kırpılmış komut başka bir komuttur.
export const VERIFY_MAX_COMMANDS = 5;
export const VERIFY_COMMAND_MAX = 300;

export function readVerifyCommands(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw as unknown[]) {
    if (out.length >= VERIFY_MAX_COMMANDS) break;
    if (typeof item !== "string") continue;
    const line = item.trim();
    if (!line || line.length > VERIFY_COMMAND_MAX || /[\r\n\u0000]/.test(line)) continue;
    out.push(line);
  }
  return out;
}

/** Kayıttaki görünüm (spec 2026-10-18 ofis-gorunumu §2). "panes" ve bilinmeyen değer
 * atılıyor: alan yine açılır, Bölmeler'de. İleri sürümün yazdığı değer de böyle düşer. */
export function readWorkspaceView(raw: unknown): Exclude<WorkspaceView, "panes"> | undefined {
  return raw === "board" || raw === "office" || raw === "changes" ? raw : undefined;
}

/** Pano için alanın klasörü (kök, yoksa yedek) ve doğrulama komutları; alan yoksa null. */
export function boardWorkspaceInfo(
  workspaces: readonly SavedTerminalWorkspace[],
  fallbackDir: string,
  workspaceId: string
): { cwd: string; verify: string[] } | null {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;
  return { cwd: workspace.root?.trim() || fallbackDir, verify: readVerifyCommands(workspace.verify) };
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

// Bölme ayarları (spec 2026-10-14 §4).
export const TERMINAL_PANE_COLORS: readonly TerminalPaneColor[] = ["gray", "blue", "green", "amber", "red", "violet"];
export const PANE_FONT_MIN = 9;
export const PANE_FONT_MAX = 24;
export const PANE_FONT_DEFAULT = 13;
export const PANE_TITLE_MAX = 40;

const EDGE_SIDES: readonly EdgeSide[] = ["left", "right", "top", "bottom"];

export function isTerminalPaneColor(value: unknown): value is TerminalPaneColor {
  return typeof value === "string" && (TERMINAL_PANE_COLORS as readonly string[]).includes(value);
}

/** Sayı değilse null; değilse yuvarlanıp 9–24'e sıkıştırılır. */
export function clampPaneFontSize(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(PANE_FONT_MAX, Math.max(PANE_FONT_MIN, Math.round(value)));
}

/** Kırpılmış ad, en fazla 40 karakter; boş ya da dize değilse null. */
export function cleanPaneTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim().slice(0, PANE_TITLE_MAX).trim();
  return title || null;
}

function readHome(raw: unknown): PaneHome | null {
  if (!raw || typeof raw !== "object") return null;
  const home = raw as Record<string, unknown>;
  if (!isId(home.siblingPaneId) || !(EDGE_SIDES as readonly unknown[]).includes(home.side)) return null;
  return { siblingPaneId: home.siblingPaneId, side: home.side as EdgeSide };
}

function readPaneExtras(pane: Record<string, unknown>): Partial<SavedTerminalPane> {
  const extras: Partial<SavedTerminalPane> = {};
  const title = cleanPaneTitle(pane.title);
  if (title) extras.title = title;
  if (isTerminalPaneColor(pane.color)) extras.color = pane.color;
  const fontSize = clampPaneFontSize(pane.fontSize);
  if (fontSize !== null) extras.fontSize = fontSize;
  return extras;
}

function readMinimized(raw: unknown, paneIds: ReadonlySet<string>): SavedMinimizedPane[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: SavedMinimizedPane[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (!isId(item.paneId) || !paneIds.has(item.paneId) || seen.has(item.paneId)) continue;
    seen.add(item.paneId);
    result.push({ paneId: item.paneId, home: readHome(item.home) });
  }
  return result;
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
        const kind = readPaneKind(pane);
        if (!kind) continue;
        if (typeof pane.cwd !== "string" || !pane.cwd.trim()) continue;
        paneIds.add(pane.id);
        panes.push({
          id: pane.id,
          kind: kind.kind,
          cwd: pane.cwd,
          ...readPaneExtras(pane),
          ...(kind.agent ? { agent: kind.agent } : {})
        });
      }
    }
    workspaceIds.add(record.id);
    const workspace: SavedTerminalWorkspace = {
      id: record.id,
      name: typeof record.name === "string" ? record.name.trim() : "",
      panes
    };
    const root = typeof record.root === "string" ? record.root.trim() : "";
    if (root) workspace.root = root;
    const sap = readWorkspaceSap(record.sap);
    if (sap) workspace.sap = sap;
    const verify = readVerifyCommands(record.verify);
    if (verify.length) workspace.verify = verify;
    const view = readWorkspaceView(record.view);
    if (view) workspace.view = view;
    // Eski kayıtta bu iki anahtar yok; olduğu gibi bırakılıyor (ağacı
    // indirgeyici `fromLegacy` ile kuruyor). `normalizeLayout` eksik bölmeyi
    // ekliyor, fazlasını atıyor: hiçbir bölme kaybolmuyor.
    if ("layout" in record || "minimized" in record) {
      const minimized = readMinimized(record.minimized, new Set(panes.map((p) => p.id)));
      const hidden = new Set(minimized.map((m) => m.paneId));
      workspace.layout = normalizeLayout(record.layout, panes.map((p) => p.id).filter((id) => !hidden.has(id)));
      workspace.minimized = minimized;
    }
    result.push(workspace);
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
