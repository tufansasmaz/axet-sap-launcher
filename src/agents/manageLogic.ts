// Ajan yönetimi (Tur 7): TÜM ekiplerdeki ajanlar tek tabloda. SAF yardımcılar:
// satır üretimi, süzgeç (ekip/durum/motor), arama, sıralama, toplu seçim
// özeti. Yeni arka uç yok: veri terminal deposu + ajan durumlarından.
import type { AgentEngineId, AgentPhase, AgentStatus } from "../../app-electron/shared/agentTypes";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { isAgentPane } from "./agentView";

/** Tablodaki durum sınıfı (süzgeç değeri). */
export type ManageState = "running" | "asking" | "idle" | "error" | "stopped" | "starting";

export const MANAGE_STATES: readonly ManageState[] = ["running", "asking", "idle", "error", "stopped", "starting"];

export interface ManageRow {
  paneId: string;
  workspaceId: string;
  team: string;
  /** Bölmenin adı; yoksa boş (görünen ad motor etiketinden). */
  title: string;
  role: string;
  engine: AgentEngineId;
  model: string;
  color: TerminalPaneColor;
  state: ManageState;
  estimated: boolean;
  phase?: AgentPhase;
  lastActivity: number | null;
  /** Bu uygulama oturumunda sürecin ilk görüldüğü an (bilinmiyorsa null). */
  openedAt: number | null;
  /** Tur 12: kabukta elle başlatılan motor (bölme kalıcı düzende kabuk). */
  launched?: true;
  /** Lider tarafından açıldıysa liderin bölmesi (ekip köprüsü); kullanıcı açtıysa yok. */
  spawnedBy?: string;
  memory?: string;
  ptyId: string | null;
}

/** Bölmenin + izleyicinin durumu tek sınıfa. */
export function manageStateOf(pane: TerminalPane, status: AgentStatus | undefined): ManageState {
  const run = pane.run.state;
  if (run === "queued" || run === "starting") return "starting";
  if (run === "failed" || run === "missingDir") return "error";
  if (run === "exited") return "stopped";
  switch (status?.state) {
    case "running":
      return "running";
    case "asking":
      return "asking";
    case "error":
      return "error";
    case "finished":
      return "stopped";
    default:
      return "idle";
  }
}

export function manageRows(
  workspaces: readonly TerminalWorkspace[],
  statuses: Record<string, AgentStatus>,
  openedAt: (ptyId: string) => number | null = () => null
): ManageRow[] {
  const rows: ManageRow[] = [];
  for (const workspace of workspaces) {
    for (const pane of workspace.panes) {
      if (!isAgentPane(pane)) continue;
      const spec = pane.agent;
      const status = pane.run.state === "running" ? statuses[pane.id] : undefined;
      const ptyId = pane.run.state === "running" || pane.run.state === "exited" ? pane.run.ptyId : null;
      // Ekip köprüsünün `spawnedBy` alanı (lider açımı); yoksa kullanıcı açmış.
      const spawnedBy = (spec as { spawnedBy?: unknown } | undefined)?.spawnedBy;
      rows.push({
        paneId: pane.id,
        workspaceId: workspace.id,
        team: workspace.name,
        title: pane.title ?? "",
        role: spec?.role ?? "",
        engine: spec?.engine ?? "axet-code",
        model: spec?.model ?? "",
        color: pane.color ?? "gray",
        state: manageStateOf(pane, status),
        estimated: (status?.source ?? "estimated") === "estimated",
        ...(status?.state === "running" && status.phase ? { phase: status.phase } : {}),
        lastActivity: status?.lastActivity ?? null,
        openedAt: pane.run.state === "running" ? openedAt(pane.run.ptyId) : null,
        ...(typeof spawnedBy === "string" && spawnedBy ? { spawnedBy } : {}),
        ...(spec?.memory ? { memory: spec.memory } : {}),
        ...(pane.launched ? { launched: true as const } : {}),
        ptyId
      });
    }
  }
  return rows;
}

export interface ManageFilter {
  team: string | null;
  state: ManageState | null;
  engine: AgentEngineId | null;
  query: string;
}

export const EMPTY_FILTER: ManageFilter = { team: null, state: null, engine: null, query: "" };

/** Arama: ad, rol, ekip, motor, model içinde (büyük/küçük harf ve Türkçe I/İ duyarsız). */
export function filterRows(rows: readonly ManageRow[], filter: ManageFilter, displayName: (row: ManageRow) => string): ManageRow[] {
  const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
  const words = fold(filter.query.trim()).split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (filter.team && row.workspaceId !== filter.team) return false;
    if (filter.state && row.state !== filter.state) return false;
    if (filter.engine && row.engine !== filter.engine) return false;
    if (words.length === 0) return true;
    const hay = fold([displayName(row), row.role, row.team, row.engine, row.model].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

const STATE_ORDER: Record<ManageState, number> = { asking: 0, error: 1, running: 2, starting: 3, idle: 4, stopped: 5 };

/** Önce dikkat isteyenler (soru, hata), sonra çalışanlar; aynı sınıfta ekip, ad. */
export function sortRows(rows: readonly ManageRow[], displayName: (row: ManageRow) => string): ManageRow[] {
  return [...rows].sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      a.team.localeCompare(b.team, "tr") ||
      displayName(a).localeCompare(displayName(b), "tr")
  );
}

/** Seçim, görünen satırlara indirgenir (süzgeç değişince gizli satır toplu işe girmesin). */
export function visibleSelection(selected: ReadonlySet<string>, rows: readonly ManageRow[]): string[] {
  return rows.filter((r) => selected.has(r.paneId)).map((r) => r.paneId);
}

export type BulkAction = "restart" | "close";

/**
 * Toplu işin onay metni için özet: kaç ajan, kaçı şu an çalışıyor/soru soruyor
 * (yarıda kalacak iş), hangi ekiplerden.
 */
export function bulkSummary(rows: readonly ManageRow[], ids: readonly string[]): { count: number; busy: number; teams: number } {
  const chosen = rows.filter((r) => ids.includes(r.paneId));
  return {
    count: chosen.length,
    busy: chosen.filter((r) => r.state === "running" || r.state === "asking").length,
    teams: new Set(chosen.map((r) => r.workspaceId)).size
  };
}

/** Süreç başlangıç anları (bu uygulama oturumu; diske yazılmıyor). */
const sessionStarts = new Map<string, number>();

export function noteSession(ptyId: string, at: number): void {
  if (!sessionStarts.has(ptyId)) sessionStarts.set(ptyId, at);
}

export function sessionStart(ptyId: string): number | null {
  return sessionStarts.get(ptyId) ?? null;
}
