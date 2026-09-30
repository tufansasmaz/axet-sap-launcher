// Terminal modunun saf indirgeyicisi (spec §4.2, §5). Yan etki yok:
// süreç başlatma/kapatma sağlayıcıda (terminalStore.tsx). Hiçbir şey
// değişmiyorsa AYNI durum nesnesi dönüyor ki sık gelen çıktı olayları
// yeniden çizim tetiklemesin.

import type { SavedTerminalWorkspace } from "../../app-electron/shared/types";
import {
  MAX_TERMINAL_PANES,
  MAX_TERMINAL_WORKSPACES,
  firstFreeWorkspaceNumber
} from "../../app-electron/shared/terminalLayout";
import type {
  NameFor,
  PaneRun,
  PendingProjectPane,
  TerminalAction,
  TerminalPane,
  TerminalState,
  TerminalWorkspace
} from "./terminalTypes";

// Aynı anda başlayan süreç sayısı (spec §5.1): geri yüklemede dokuz
// axet-code birden açılıp makineyi kilitlemesin.
export const SPAWN_CONCURRENCY = 2;

export const initialTerminalState: TerminalState = {
  phase: "closed",
  saved: [],
  savedActiveId: null,
  workspaces: [],
  activeWorkspaceId: null,
  visible: false,
  pending: [],
  limitHits: 0
};

function emptyWorkspace(id: string, name: string): TerminalWorkspace {
  return { id, name, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false };
}

export function isWorkspaceVisible(state: TerminalState, workspaceId: string): boolean {
  return state.visible && state.activeWorkspaceId === workspaceId;
}

export function findPane(state: TerminalState, paneId: string): { workspace: TerminalWorkspace; pane: TerminalPane } | null {
  for (const workspace of state.workspaces) {
    const pane = workspace.panes.find((p) => p.id === paneId);
    if (pane) return { workspace, pane };
  }
  return null;
}

function ptyOf(run: PaneRun): string | null {
  return run.state === "running" || run.state === "exited" ? run.ptyId : null;
}

export function paneByPty(state: TerminalState, ptyId: string): { workspace: TerminalWorkspace; pane: TerminalPane } | null {
  for (const workspace of state.workspaces) {
    const pane = workspace.panes.find((p) => ptyOf(p.run) === ptyId);
    if (pane) return { workspace, pane };
  }
  return null;
}

function replaceWorkspace(state: TerminalState, next: TerminalWorkspace): TerminalState {
  return { ...state, workspaces: state.workspaces.map((w) => (w.id === next.id ? next : w)) };
}

function setRun(workspace: TerminalWorkspace, paneId: string, run: PaneRun, patch: Partial<TerminalPane> = {}): TerminalWorkspace {
  return { ...workspace, panes: workspace.panes.map((p) => (p.id === paneId ? { ...p, ...patch, run } : p)) };
}

// Görünür alana bayrak konmuyor: kullanıcı zaten bakıyor.
function flag(state: TerminalState, workspace: TerminalWorkspace, which: "unread" | "error"): TerminalWorkspace {
  if (isWorkspaceVisible(state, workspace.id) || workspace[which]) return workspace;
  return { ...workspace, [which]: true };
}

// Seçili alan görünür olunca iki bayrak da siliniyor (spec §3.2).
function clearVisibleFlags(state: TerminalState): TerminalState {
  const id = state.activeWorkspaceId;
  if (!state.visible || !id) return state;
  const active = state.workspaces.find((w) => w.id === id);
  if (!active || (!active.unread && !active.error)) return state;
  return replaceWorkspace(state, { ...active, unread: false, error: false });
}

function withPane(workspace: TerminalWorkspace, pane: TerminalPane): TerminalWorkspace {
  return { ...workspace, panes: [...workspace.panes, pane], focusedPaneId: pane.id, maximizedPaneId: null };
}

function placeProjectPane(state: TerminalState, item: PendingProjectPane, nameFor: NameFor): TerminalState {
  const pane: TerminalPane = { id: item.paneId, kind: "axet", cwd: item.cwd, run: { state: "queued" } };
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
  if (active && active.panes.length < MAX_TERMINAL_PANES) return replaceWorkspace(state, withPane(active, pane));
  if (state.workspaces.length < MAX_TERMINAL_WORKSPACES) {
    const name = nameFor(firstFreeWorkspaceNumber(state.workspaces.map((w) => w.name), nameFor));
    const workspace = withPane(emptyWorkspace(item.spareWorkspaceId, name), pane);
    return clearVisibleFlags({ ...state, workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id });
  }
  return { ...state, limitHits: state.limitHits + 1 };
}

function becomeReady(state: TerminalState, workspaces: TerminalWorkspace[], activeWorkspaceId: string | null, nameFor: NameFor): TerminalState {
  let next: TerminalState = {
    ...state,
    phase: "ready",
    saved: [],
    savedActiveId: null,
    workspaces,
    activeWorkspaceId,
    pending: []
  };
  for (const item of state.pending) next = placeProjectPane(next, item, nameFor);
  return clearVisibleFlags(next);
}

function fromSaved(saved: SavedTerminalWorkspace): TerminalWorkspace {
  return {
    ...emptyWorkspace(saved.id, saved.name),
    panes: saved.panes.map((p) => ({ id: p.id, kind: p.kind, cwd: p.cwd, run: { state: "queued" } })),
    focusedPaneId: saved.panes[0]?.id ?? null
  };
}

export function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case "open": {
      if (state.phase !== "closed") return state;
      // Şerit yalnız geri getirilecek bir bölme varsa: yalnız boş alanlardan
      // oluşan düzen "1 alan, 0 bölme — Geri yükle?" diye sormaya değmez,
      // alanlar adlarıyla doğrudan açılıyor.
      if (action.saved.some((w) => w.panes.length > 0)) {
        return { ...state, phase: "restorePrompt", saved: action.saved, savedActiveId: action.activeId };
      }
      if (action.saved.length > 0) {
        return becomeReady(state, action.saved.map(fromSaved), action.activeId ?? action.saved[0].id, action.nameFor);
      }
      return becomeReady(state, [emptyWorkspace(action.freshId, action.nameFor(1))], action.freshId, action.nameFor);
    }
    case "restore": {
      if (state.phase !== "restorePrompt") return state;
      const workspaces = state.saved.map(fromSaved);
      const activeId = state.savedActiveId ?? workspaces[0]?.id ?? null;
      return becomeReady(state, workspaces, activeId, action.nameFor);
    }
    case "startFresh": {
      if (state.phase !== "restorePrompt") return state;
      return becomeReady(state, [emptyWorkspace(action.freshId, action.nameFor(1))], action.freshId, action.nameFor);
    }
    case "setVisible": {
      if (state.visible === action.visible) return state;
      return clearVisibleFlags({ ...state, visible: action.visible });
    }
    case "addWorkspace": {
      if (state.phase !== "ready" || state.workspaces.length >= MAX_TERMINAL_WORKSPACES) return state;
      const name = action.nameFor(firstFreeWorkspaceNumber(state.workspaces.map((w) => w.name), action.nameFor));
      return { ...state, workspaces: [...state.workspaces, emptyWorkspace(action.id, name)], activeWorkspaceId: action.id };
    }
    case "selectWorkspace": {
      if (state.activeWorkspaceId === action.id || !state.workspaces.some((w) => w.id === action.id)) return state;
      return clearVisibleFlags({ ...state, activeWorkspaceId: action.id });
    }
    case "renameWorkspace": {
      const name = action.name.trim();
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!name || !workspace || workspace.name === name) return state;
      return replaceWorkspace(state, { ...workspace, name });
    }
    case "closeWorkspace": {
      const index = state.workspaces.findIndex((w) => w.id === action.id);
      if (state.phase !== "ready" || index < 0) return state;
      const rest = state.workspaces.filter((_, i) => i !== index);
      if (rest.length === 0) {
        return { ...state, workspaces: [emptyWorkspace(action.freshId, action.nameFor(1))], activeWorkspaceId: action.freshId };
      }
      const activeWorkspaceId =
        state.activeWorkspaceId === action.id ? rest[Math.min(index, rest.length - 1)].id : state.activeWorkspaceId;
      return clearVisibleFlags({ ...state, workspaces: rest, activeWorkspaceId });
    }
    case "addPane": {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId);
      if (state.phase !== "ready" || !workspace || workspace.panes.length >= MAX_TERMINAL_PANES || !action.cwd.trim()) {
        return state;
      }
      const pane: TerminalPane = { id: action.paneId, kind: action.kind, cwd: action.cwd, run: { state: "queued" } };
      return replaceWorkspace(state, withPane(workspace, pane));
    }
    case "addProjectPane": {
      const item = { paneId: action.paneId, spareWorkspaceId: action.spareWorkspaceId, cwd: action.cwd };
      if (state.phase !== "ready") return { ...state, pending: [...state.pending, item] };
      return placeProjectPane(state, item, action.nameFor);
    }
    case "closePane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const { workspace } = found;
      const index = workspace.panes.findIndex((p) => p.id === action.paneId);
      const panes = workspace.panes.filter((p) => p.id !== action.paneId);
      const focusedPaneId =
        workspace.focusedPaneId === action.paneId ? (panes[Math.min(index, panes.length - 1)]?.id ?? null) : workspace.focusedPaneId;
      const maximizedPaneId = workspace.maximizedPaneId === action.paneId ? null : workspace.maximizedPaneId;
      return replaceWorkspace(state, { ...workspace, panes, focusedPaneId, maximizedPaneId });
    }
    case "restartPane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const cwd = action.cwd ?? found.pane.cwd;
      return replaceWorkspace(state, setRun(found.workspace, action.paneId, { state: "queued" }, { cwd }));
    }
    case "focusPane": {
      const found = findPane(state, action.paneId);
      if (!found || found.workspace.focusedPaneId === action.paneId) return state;
      return replaceWorkspace(state, { ...found.workspace, focusedPaneId: action.paneId });
    }
    case "toggleMaximize": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const maximizedPaneId = found.workspace.maximizedPaneId === action.paneId ? null : action.paneId;
      return replaceWorkspace(state, { ...found.workspace, maximizedPaneId, focusedPaneId: action.paneId });
    }
    case "spawnStarted": {
      const found = findPane(state, action.paneId);
      if (!found || found.pane.run.state !== "queued") return state;
      return replaceWorkspace(state, setRun(found.workspace, action.paneId, { state: "starting", token: action.token }));
    }
    case "spawnSucceeded": {
      const found = findPane(state, action.paneId);
      const run = found?.pane.run;
      if (!found || run?.state !== "starting" || run.token !== action.token) return state;
      return replaceWorkspace(state, setRun(found.workspace, action.paneId, { state: "running", ptyId: action.ptyId }));
    }
    case "spawnFailed": {
      const found = findPane(state, action.paneId);
      const run = found?.pane.run;
      if (!found || run?.state !== "starting" || run.token !== action.token) return state;
      const next: PaneRun = action.missingDir ? { state: "missingDir" } : { state: "failed", message: action.message };
      return replaceWorkspace(state, flag(state, setRun(found.workspace, action.paneId, next), "error"));
    }
    case "ptyExit": {
      const found = paneByPty(state, action.ptyId);
      if (!found || found.pane.run.state !== "running") return state;
      const workspace = setRun(found.workspace, found.pane.id, { state: "exited", ptyId: action.ptyId, code: action.code });
      return replaceWorkspace(state, action.code !== 0 ? flag(state, workspace, "error") : workspace);
    }
    case "ptyData": {
      const found = paneByPty(state, action.ptyId);
      if (!found) return state;
      const workspace = flag(state, found.workspace, "unread");
      return workspace === found.workspace ? state : replaceWorkspace(state, workspace);
    }
  }
}

/** Şimdi başlatılabilecek bölmeler: seçili alan önce, sınır `limit`. */
export function nextToStart(state: TerminalState, limit = SPAWN_CONCURRENCY): TerminalPane[] {
  if (state.phase !== "ready") return [];
  const ordered = [
    ...state.workspaces.filter((w) => w.id === state.activeWorkspaceId),
    ...state.workspaces.filter((w) => w.id !== state.activeWorkspaceId)
  ];
  let starting = 0;
  const queued: TerminalPane[] = [];
  for (const workspace of ordered) {
    for (const pane of workspace.panes) {
      if (pane.run.state === "starting") starting += 1;
      else if (pane.run.state === "queued") queued.push(pane);
    }
  }
  return queued.slice(0, Math.max(0, limit - starting));
}

/** Kapatınca ölecek süreç sayısı (onay metni için). */
export function liveCount(workspace: TerminalWorkspace): number {
  return workspace.panes.filter((p) => p.run.state === "running" || p.run.state === "starting").length;
}

export function workspaceDot(workspace: TerminalWorkspace): "error" | "unread" | null {
  if (workspace.error) return "error";
  return workspace.unread ? "unread" : null;
}

export function paneTone(run: PaneRun): "running" | "stopped" | "error" {
  if (run.state === "running") return "running";
  if (run.state === "failed" || run.state === "missingDir") return "error";
  if (run.state === "exited" && run.code !== 0) return "error";
  return "stopped";
}

export function toSaved(state: TerminalState): { workspaces: SavedTerminalWorkspace[]; activeId: string | null } {
  return {
    workspaces: state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      panes: w.panes.map((p) => ({ id: p.id, kind: p.kind, cwd: p.cwd }))
    })),
    activeId: state.activeWorkspaceId
  };
}
