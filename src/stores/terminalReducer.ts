// Terminal modunun saf indirgeyicisi (spec §4.2, §5). Yan etki yok:
// süreç başlatma/kapatma sağlayıcıda (terminalStore.tsx). Hiçbir şey
// değişmiyorsa AYNI durum nesnesi dönüyor ki sık gelen çıktı olayları
// yeniden çizim tetiklemesin.

import type { SavedTerminalWorkspace, WorkspaceView } from "../../app-electron/shared/types";
import {
  MAX_TERMINAL_PANES,
  MAX_TERMINAL_WORKSPACES,
  clampPaneFontSize,
  cleanPaneTitle,
  firstFreeWorkspaceNumber,
  isTerminalPaneColor,
  readVerifyCommands,
  readWorkspaceView
} from "../../app-electron/shared/terminalLayout";
import { AGENT_ROLE_MAX, LEGACY_AXET_AGENT } from "../../app-electron/shared/agentTypes";
import type { ShellAgentRecord } from "../../app-electron/shared/types";
import { readBrowserUrl } from "../../app-electron/shared/browserLogic";
import { isMemoryKey, withMemoryKey } from "../../app-electron/shared/memoryLogic";
import {
  equalizeSplit,
  fromLegacy,
  homeOf,
  insertPane,
  leafIds,
  movePane as moveInTree,
  normalizeLayout,
  removePane,
  resizeSplit,
  restoreInto,
  type EdgeSide,
  type LayoutNode,
  type SplitDir
} from "../../app-electron/shared/terminalTree";
import type {
  MinimizedPane,
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
  return { id, name, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, layout: null, minimized: [] };
}

export function isWorkspaceVisible(state: TerminalState, workspaceId: string): boolean {
  return state.visible && state.activeWorkspaceId === workspaceId;
}

export function minimizedOf(workspace: TerminalWorkspace): MinimizedPane[] {
  return workspace.minimized ?? [];
}

/** Alanın ağacı. Tanımsızsa (elle kurulmuş durum) görünür bölmelerden. */
export function layoutOf(workspace: TerminalWorkspace): LayoutNode | null {
  if (workspace.layout !== undefined) return workspace.layout;
  const hidden = new Set(minimizedOf(workspace).map((m) => m.paneId));
  return fromLegacy(workspace.panes.filter((p) => !hidden.has(p.id)).map((p) => p.id));
}

function isMinimized(workspace: TerminalWorkspace, paneId: string): boolean {
  return minimizedOf(workspace).some((m) => m.paneId === paneId);
}

function updatePane(workspace: TerminalWorkspace, paneId: string, patch: Partial<TerminalPane>): TerminalWorkspace {
  return { ...workspace, panes: workspace.panes.map((p) => (p.id === paneId ? { ...p, ...patch } : p)) };
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

function withPane(workspace: TerminalWorkspace, pane: TerminalPane, split?: { targetPaneId: string; dir: SplitDir }): TerminalWorkspace {
  const layout = layoutOf(workspace);
  const visible = leafIds(layout);
  // Hedef küçültülmüş ya da kapanmışsa odaktaki bölme; o da yoksa son yaprak.
  const anchor = [split?.targetPaneId, workspace.focusedPaneId].find((id): id is string => !!id && visible.includes(id));
  const side: EdgeSide = split?.dir === "column" ? "bottom" : "right";
  return {
    ...workspace,
    panes: [...workspace.panes, pane],
    layout: insertPane(layout, pane.id, anchor ? { paneId: anchor, side } : null),
    minimized: minimizedOf(workspace),
    focusedPaneId: pane.id,
    maximizedPaneId: null
  };
}

/** Bölmeyi alandan çıkarır (ağaç, küçültülenler, odak, büyütme). */
function withoutPane(workspace: TerminalWorkspace, paneId: string): TerminalWorkspace {
  const before = leafIds(layoutOf(workspace));
  const layout = removePane(layoutOf(workspace), paneId);
  const after = leafIds(layout);
  const index = before.indexOf(paneId);
  const focusedPaneId =
    workspace.focusedPaneId === paneId ? (after[Math.min(Math.max(index, 0), after.length - 1)] ?? null) : workspace.focusedPaneId;
  return {
    ...workspace,
    panes: workspace.panes.filter((p) => p.id !== paneId),
    layout,
    minimized: minimizedOf(workspace).filter((m) => m.paneId !== paneId),
    focusedPaneId,
    maximizedPaneId: workspace.maximizedPaneId === paneId ? null : workspace.maximizedPaneId
  };
}

function patchPane(workspace: TerminalWorkspace, paneId: string, patch: Partial<TerminalPane>): TerminalWorkspace {
  return { ...workspace, panes: workspace.panes.map((p) => (p.id === paneId ? { ...p, ...patch } : p)) };
}

/** Tur 12: kabukta başlatılan motor kapandı; bölme yeniden düz kabuk. */
function dropLaunch(workspace: TerminalWorkspace, paneId: string): TerminalWorkspace {
  return {
    ...workspace,
    panes: workspace.panes.map((p) => {
      if (p.id !== paneId) return p;
      const { launched: _launched, agent: _agent, ...rest } = p;
      return rest;
    })
  };
}

function placeProjectPane(state: TerminalState, item: PendingProjectPane, nameFor: NameFor): TerminalState {
  const title = item.shell ? undefined : cleanPaneTitle(item.title);
  const pane: TerminalPane = item.shell
    ? { id: item.paneId, kind: item.shell, cwd: item.cwd, run: { state: "queued" } }
    : {
        id: item.paneId,
        kind: "agent",
        agent: { ...LEGACY_AXET_AGENT },
        cwd: item.cwd,
        run: { state: "queued" },
        ...(title ? { title } : {}),
        ...(item.sap ? { openedFrom: "sap" as const } : {})
      };
  if (item.sap) return placeSapPane(state, item, item.sap, pane, nameFor);
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
  if (active && active.panes.length < MAX_TERMINAL_PANES) return replaceWorkspace(state, withPane(active, pane));
  if (state.workspaces.length < MAX_TERMINAL_WORKSPACES) {
    const name = nameFor(firstFreeWorkspaceNumber(state.workspaces.map((w) => w.name), nameFor));
    const workspace = withPane(emptyWorkspace(item.spareWorkspaceId, name), pane);
    return clearVisibleFlags({ ...state, workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id });
  }
  return { ...state, limitHits: state.limitHits + 1 };
}

/**
 * SAP bağlantısının bölmesi: önce o sisteme zaten bağlı alan, sonra boş ve
 * bağsız seçili alan (bağlanıyor), en son yeni bir bağlı alan. Dolu bir alanın
 * bağı DEĞİŞTİRİLMİYOR — içindeki ajanlar başka bir klasörde çalışıyor olabilir.
 * Seçilen alan öne alınıyor ve bölmeler görünümüne çevriliyor (kayıtsız
 * görünüm Ofis'tir; yeni bölme görünmezdi).
 */
function placeSapPane(
  state: TerminalState,
  item: PendingProjectPane,
  sap: NonNullable<PendingProjectPane["sap"]>,
  pane: TerminalPane,
  nameFor: NameFor
): TerminalState {
  const show = (workspace: TerminalWorkspace): TerminalWorkspace => ({
    ...withPane(workspace, pane),
    view: "panes"
  });
  const bound = state.workspaces.find((w) => w.sap?.uuid === sap.uuid && w.panes.length < MAX_TERMINAL_PANES);
  if (bound) return { ...replaceWorkspace(state, show(bound)), activeWorkspaceId: bound.id };
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
  if (active && active.panes.length === 0 && !active.sap) {
    return replaceWorkspace(state, show({ ...active, root: item.cwd, sap }));
  }
  if (state.workspaces.length < MAX_TERMINAL_WORKSPACES) {
    const name = nameFor(firstFreeWorkspaceNumber(state.workspaces.map((w) => w.name), nameFor));
    const workspace = show({ ...emptyWorkspace(item.spareWorkspaceId, name), root: item.cwd, sap });
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
  const ids = saved.panes.map((p) => p.id);
  const minimized = (saved.minimized ?? []).filter((m) => ids.includes(m.paneId)).map((m) => ({ paneId: m.paneId, home: m.home }));
  const hidden = new Set(minimized.map((m) => m.paneId));
  // Ağaçsız eski kayıt: normalizeLayout `fromLegacy`'ye düşüyor.
  const layout = normalizeLayout(saved.layout, ids.filter((id) => !hidden.has(id)));
  const view = readWorkspaceView(saved.view);
  const browserUrl = readBrowserUrl(saved.browserUrl);
  return {
    ...emptyWorkspace(saved.id, saved.name),
    ...(saved.root ? { root: saved.root } : {}),
    ...(saved.sap ? { sap: saved.sap } : {}),
    ...(saved.verify?.length ? { verify: [...saved.verify] } : {}),
    ...(view ? { view } : {}),
    ...(browserUrl ? { browserUrl } : {}),
    panes: saved.panes.map((p) => ({
      id: p.id,
      kind: p.kind,
      cwd: p.cwd,
      title: p.title,
      color: p.color,
      fontSize: p.fontSize,
      ...(p.kind !== "agent" && p.shellAgent ? { shellAgent: p.shellAgent } : {}),
      // Ajan alanı eksik `agent` kaydı (elle düzenlenmiş): rolsüz axet-code.
      ...(p.kind === "agent" ? { agent: p.agent ?? { ...LEGACY_AXET_AGENT } } : {}),
      run: { state: "queued" as const }
    })),
    layout,
    minimized,
    focusedPaneId: leafIds(layout)[0] ?? null
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
      // Ajan bölmesi tanımsız eklenmiyor: hangi motorun başlayacağı belli değil.
      if (action.kind === "agent" && !action.agent) return state;
      const title = cleanPaneTitle(action.title);
      // Kalıcı bellek (spec 2026-10-18 ajan-bellegi §2): anahtar addan, bütün alanlarda tekil.
      const agent =
        action.kind === "agent" && action.agent
          ? action.memory === true
            ? withMemoryKey(action.agent, title ?? action.agent.engine, state.workspaces)
            : action.agent
          : undefined;
      const pane: TerminalPane = {
        id: action.paneId,
        kind: action.kind,
        cwd: action.cwd,
        run: { state: "queued" },
        ...(agent ? { agent } : {}),
        ...(title ? { title } : {}),
        ...(action.color && isTerminalPaneColor(action.color) ? { color: action.color } : {})
      };
      return replaceWorkspace(state, withPane(workspace, pane, action.split));
    }
    case "addProjectPane": {
      const item: PendingProjectPane = {
        paneId: action.paneId,
        spareWorkspaceId: action.spareWorkspaceId,
        cwd: action.cwd,
        ...(action.sap ? { sap: action.sap } : {}),
        ...(action.shell ? { shell: action.shell } : {}),
        ...(action.title ? { title: action.title } : {})
      };
      if (state.phase !== "ready") return { ...state, pending: [...state.pending, item] };
      return placeProjectPane(state, item, action.nameFor);
    }
    case "shellAgentStarted": {
      const found = findPane(state, action.paneId);
      if (!found || found.pane.kind === "agent" || found.pane.launched || found.pane.run.state !== "running") return state;
      // Tur 13: bölmenin kalıcı kaydı (Rol ver) varsa rol ve bellek ondan.
      const record = found.pane.shellAgent;
      const agent = record
        ? { ...action.agent, ...(record.role ? { role: record.role } : {}), ...(record.memory ? { memory: record.memory } : {}) }
        : action.agent;
      return replaceWorkspace(state, patchPane(found.workspace, action.paneId, { launched: true, agent }));
    }
    case "setShellAgent": {
      // Tur 13: kabuk bölmesine rol/bellek. Anahtar bir kez türetiliyor; bellek
      // kapatılınca kayıttan düşüyor (dosya diskte kalır). Boş rol + kapalı bellek → kayıt yok.
      const found = findPane(state, action.paneId);
      if (!found || found.pane.kind === "agent") return state;
      const role = action.role.replace(/\s+/g, " ").trim().slice(0, AGENT_ROLE_MAX).trim();
      const previous = found.pane.shellAgent?.memory ?? (found.pane.launched ? found.pane.agent?.memory : undefined);
      const memory = action.memory
        ? isMemoryKey(previous)
          ? previous
          : withMemoryKey({ engine: found.pane.agent?.engine ?? "axet-code", role: "", roleKind: "custom" }, found.pane.title ?? found.pane.kind, state.workspaces).memory
        : undefined;
      const record: ShellAgentRecord | undefined = role || memory ? { role, ...(memory ? { memory } : {}) } : undefined;
      let next: TerminalWorkspace = {
        ...found.workspace,
        panes: found.workspace.panes.map((p) => {
          if (p.id !== action.paneId) return p;
          const { shellAgent: _old, ...rest } = p;
          return record ? { ...rest, shellAgent: record } : rest;
        })
      };
      if (found.pane.launched && found.pane.agent) {
        const { memory: _m, ...base } = found.pane.agent;
        next = updatePane(next, action.paneId, { agent: { ...base, role, ...(memory ? { memory } : {}) } });
      }
      return replaceWorkspace(state, next);
    }
    case "shellAgentEnded": {
      const found = findPane(state, action.paneId);
      if (!found?.pane.launched) return state;
      return replaceWorkspace(state, dropLaunch(found.workspace, action.paneId));
    }
    case "closePane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      return replaceWorkspace(state, withoutPane(found.workspace, action.paneId));
    }
    case "movePaneToWorkspace": {
      // Tur 13: ekibe taşı. Bölme (ve run içindeki ptyId) olduğu gibi gidiyor:
      // süreç yeniden başlatılmıyor. Lider-açımı bağı kalkıyor (taşınanın ve
      // taşınan liderin kaynakta açtıklarının); lider kuralı yeni ekipte baştan.
      const found = findPane(state, action.paneId);
      const target = state.workspaces.find((w) => w.id === action.workspaceId);
      if (state.phase !== "ready" || !found || !target || target.id === found.workspace.id || target.panes.length >= MAX_TERMINAL_PANES) return state;
      const unlink = (p: TerminalPane): TerminalPane => {
        if (!p.agent?.spawnedBy || (p.id !== action.paneId && p.agent.spawnedBy !== action.paneId)) return p;
        const { spawnedBy: _s, ...agent } = p.agent;
        return { ...p, agent };
      };
      const source = withoutPane(found.workspace, action.paneId);
      const next = replaceWorkspace(state, { ...source, panes: source.panes.map(unlink) });
      return replaceWorkspace(next, withPane(target, unlink(found.pane)));
    }
    case "setPaneRole": {
      // Tur 13: rol etiketi. Komutu değişen (axet --agent, Claude lideri) bölmeyi çağıran yeniden başlatıyor.
      const found = findPane(state, action.paneId);
      const agent = found?.pane.kind === "agent" ? found.pane.agent : undefined;
      if (!found || !agent) return state;
      const role = action.role.replace(/\s+/g, " ").trim().slice(0, AGENT_ROLE_MAX).trim();
      if (role === agent.role) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { agent: { ...agent, role } }));
    }
    case "restartPane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const cwd = action.cwd ?? found.pane.cwd;
      const restarted = setRun(found.workspace, action.paneId, { state: "queued" }, { cwd });
      return replaceWorkspace(state, found.pane.launched ? dropLaunch(restarted, action.paneId) : restarted);
    }
    case "focusPane": {
      const found = findPane(state, action.paneId);
      if (!found || found.workspace.focusedPaneId === action.paneId || isMinimized(found.workspace, action.paneId)) return state;
      return replaceWorkspace(state, { ...found.workspace, focusedPaneId: action.paneId });
    }
    case "toggleMaximize": {
      const found = findPane(state, action.paneId);
      if (!found || isMinimized(found.workspace, action.paneId)) return state;
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
      const exited = setRun(found.workspace, found.pane.id, { state: "exited", ptyId: action.ptyId, code: action.code });
      const workspace = found.pane.launched ? dropLaunch(exited, found.pane.id) : exited;
      return replaceWorkspace(state, action.code !== 0 ? flag(state, workspace, "error") : workspace);
    }
    case "ptyData": {
      const found = paneByPty(state, action.ptyId);
      if (!found) return state;
      let workspace = flag(state, found.workspace, "unread");
      // Küçültülmüş bölmeye çıktı: şeritteki sekmede nokta.
      const entry = minimizedOf(workspace).find((m) => m.paneId === found.pane.id);
      if (entry && !entry.unread) {
        workspace = { ...workspace, minimized: minimizedOf(workspace).map((m) => (m === entry ? { ...m, unread: true } : m)) };
      }
      return workspace === found.workspace ? state : replaceWorkspace(state, workspace);
    }
    case "movePane": {
      const found = findPane(state, action.paneId);
      if (!found || !found.workspace.panes.some((p) => p.id === action.targetPaneId)) return state;
      const before = layoutOf(found.workspace);
      const layout = moveInTree(before, action.paneId, action.targetPaneId, action.zone);
      if (layout === before) return state;
      return replaceWorkspace(state, { ...found.workspace, layout, focusedPaneId: action.paneId, maximizedPaneId: null });
    }
    case "resizeSplit":
    case "equalizeSplit": {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId);
      if (!workspace) return state;
      const before = layoutOf(workspace);
      const layout =
        action.type === "resizeSplit"
          ? resizeSplit(before, action.path, action.index, action.delta, action.min)
          : equalizeSplit(before, action.path);
      if (layout === before) return state;
      return replaceWorkspace(state, { ...workspace, layout });
    }
    case "minimizePane": {
      const found = findPane(state, action.paneId);
      if (!found || isMinimized(found.workspace, action.paneId)) return state;
      const workspace = found.workspace;
      const before = layoutOf(workspace);
      const home = homeOf(before, action.paneId);
      const layout = removePane(before, action.paneId);
      const visible = leafIds(layout);
      // Odak hiçbir zaman küçültülmüş bölmede durmuyor.
      const focusedPaneId =
        workspace.focusedPaneId !== action.paneId
          ? workspace.focusedPaneId
          : home && visible.includes(home.siblingPaneId)
            ? home.siblingPaneId
            : (visible[0] ?? null);
      return replaceWorkspace(state, {
        ...workspace,
        layout,
        minimized: [...minimizedOf(workspace), { paneId: action.paneId, home }],
        focusedPaneId,
        maximizedPaneId: workspace.maximizedPaneId === action.paneId ? null : workspace.maximizedPaneId
      });
    }
    case "restorePane": {
      const found = findPane(state, action.paneId);
      const entry = found ? minimizedOf(found.workspace).find((m) => m.paneId === action.paneId) : undefined;
      if (!found || !entry) return state;
      const workspace = found.workspace;
      return replaceWorkspace(state, {
        ...workspace,
        layout: restoreInto(layoutOf(workspace), action.paneId, entry.home, workspace.focusedPaneId),
        minimized: minimizedOf(workspace).filter((m) => m !== entry),
        focusedPaneId: action.paneId,
        maximizedPaneId: null
      });
    }
    case "renamePane": {
      const found = findPane(state, action.paneId);
      const title = cleanPaneTitle(action.title) ?? undefined;
      if (!found || found.pane.title === title) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { title }));
    }
    case "setPaneColor": {
      const found = findPane(state, action.paneId);
      if (!found || !isTerminalPaneColor(action.color) || found.pane.color === action.color) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { color: action.color }));
    }
    case "setPaneFontSize": {
      const found = findPane(state, action.paneId);
      const fontSize = action.fontSize === null ? undefined : (clampPaneFontSize(action.fontSize) ?? undefined);
      if (!found || found.pane.fontSize === fontSize) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { fontSize }));
    }
    case "setWorkspaceRoot": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!workspace) return state;
      const root = action.root?.trim() || undefined;
      const sap = action.sap ?? undefined;
      if (workspace.root === root && workspace.sap?.uuid === sap?.uuid && workspace.sap?.label === sap?.label) return state;
      const next = { ...workspace };
      delete next.root;
      delete next.sap;
      return replaceWorkspace(state, { ...next, ...(root ? { root } : {}), ...(sap ? { sap } : {}) });
    }
    case "setWorkspaceVerify": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!workspace) return state;
      const verify = readVerifyCommands(action.verify);
      if (JSON.stringify(workspace.verify ?? []) === JSON.stringify(verify)) return state;
      const next = { ...workspace };
      delete next.verify;
      return replaceWorkspace(state, verify.length ? { ...next, verify } : next);
    }
    case "setWorkspaceView": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      // Bilinmeyen değer: kayıtta görünüm yok, yani varsayılan Ofis (ajanlar-yeniden §2).
      const view = readWorkspaceView(action.view);
      if (!workspace || workspace.view === view) return state;
      const next = { ...workspace };
      delete next.view;
      return replaceWorkspace(state, view ? { ...next, view } : next);
    }
    case "setWorkspaceBrowserUrl": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      // Son adres (spec 2026-10-18 tarayici §2, §5): yalniz http/https, ≤ 2048,
      // kimlik bilgisi yok; degilse kayit degismiyor.
      const url = readBrowserUrl(action.url);
      if (!workspace || !url || workspace.browserUrl === url) return state;
      return replaceWorkspace(state, { ...workspace, browserUrl: url });
    }
    case "enablePaneMemory": {
      // Belleği etkinleştir (spec 2026-10-18 ajan-bellegi §4): anahtar bir kez
      // türetiliyor; açıksa ya da ad sonradan değiştiyse dokunulmuyor (dosya aynı kalır).
      const found = findPane(state, action.paneId);
      const agent = found?.pane.kind === "agent" ? found.pane.agent : undefined;
      if (!found || !agent || isMemoryKey(agent.memory)) return state;
      const next = withMemoryKey(agent, found.pane.title ?? agent.engine, state.workspaces);
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { agent: next }));
    }
  }
}

/** Şimdi başlatılabilecek bölmeler: seçili alan önce, sınır `limit`.
 * `extraOccupied`: axet pty'lerinin "hazır" olana kadar tuttuğu ek yuva sayısı. */
export function nextToStart(state: TerminalState, limit = SPAWN_CONCURRENCY, extraOccupied = 0): TerminalPane[] {
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
  return queued.slice(0, Math.max(0, limit - starting - extraOccupied));
}

/** Kapatınca ölecek süreç sayısı (onay metni için). */
/** Alanın görünümü; kaydı yoksa Ofis (spec 2026-10-18 ajanlar-yeniden §2). */
export function workspaceViewOf(workspace: Pick<TerminalWorkspace, "view">): WorkspaceView {
  return workspace.view ?? "office";
}

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
      panes: w.panes.map((p) => ({
        id: p.id,
        kind: p.kind,
        cwd: p.cwd,
        ...(p.title ? { title: p.title } : {}),
        ...(p.color ? { color: p.color } : {}),
        ...(p.fontSize !== undefined ? { fontSize: p.fontSize } : {}),
        // Tur 12: kabukta başlatılan motorun tanımı yalnız bellekte.
        ...(p.agent && p.kind === "agent" ? { agent: p.agent } : {}),
        // Tur 13: kabuğun rol/bellek kaydı kalıcı (tür kabuk kalıyor).
        ...(p.kind !== "agent" && p.shellAgent ? { shellAgent: p.shellAgent } : {})
      })),
      layout: layoutOf(w),
      minimized: minimizedOf(w).map((m) => ({ paneId: m.paneId, home: m.home })),
      ...(w.root ? { root: w.root } : {}),
      ...(w.sap ? { sap: w.sap } : {}),
      ...(w.verify?.length ? { verify: w.verify } : {}),
      ...(w.view ? { view: w.view } : {}),
      ...(w.browserUrl ? { browserUrl: w.browserUrl } : {})
    })),
    activeId: state.activeWorkspaceId
  };
}
