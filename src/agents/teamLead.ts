// Lider açılışlarının renderer tarafı (Tur 7), saf: ana süreçten gelen
// "team:spawn" / "team:close" isteğini terminal deposunun durumuna göre
// doğrular. Yetki yalnız AŞAĞI: motor leadCommands.pickSpawnEngine kuralıyla
// (Araçlar'daki varsayılan liderden genişse liderin motoru), alan liderin alanı,
// kapatma yalnız o liderin açtığı bölmede.
import type { AgentEngineId } from "../../app-electron/shared/agentTypes";
import { pickSpawnEngine, workerCommand, type LeadCloseRequest, type LeadSpawnRequest } from "../../app-electron/shared/leadCommands";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import type { NewAgentInput } from "../stores/terminalStoreContext";
import type { TerminalState } from "../stores/terminalTypes";

export type SpawnPlan = { ok: true; input: NewAgentInput; engine: AgentEngineId } | { ok: false; reason: string };

export function planLeadSpawn(state: TerminalState, req: LeadSpawnRequest, preferred: AgentEngineId | null, fallbackCwd: string): SpawnPlan {
  if (state.phase !== "ready") return { ok: false, reason: "notReady" };
  const workspace = state.workspaces.find((w) => w.id === req.workspaceId);
  if (!workspace) return { ok: false, reason: "noWorkspace" };
  const leader = workspace.panes.find((p) => p.id === req.leaderPaneId);
  if (!leader?.agent || leader.agent.spawnedBy) return { ok: false, reason: "noLeader" };
  if (workspace.panes.length >= MAX_TERMINAL_PANES) return { ok: false, reason: "full" };
  if (workspace.panes.some((p) => p.id === req.paneId)) return { ok: false, reason: "exists" };
  // Liderin motoru ana süreçteki kayıttan geliyor; renderer kendi kaydına güveniyor.
  const picked = pickSpawnEngine(leader.agent.engine, req.engine, preferred);
  if (!picked.ok) return { ok: false, reason: "engine" };
  const cwd = workspace.root || leader.cwd || fallbackCwd;
  if (!cwd.trim()) return { ok: false, reason: "noDir" };
  const name = req.name.trim().slice(0, 40) || req.role;
  // Tur 10: özel komutlu lider kendi komutuyla açar (oturum sürdürme bayrakları atılarak).
  let command: string | undefined;
  if (picked.engine === "ozel") {
    command = workerCommand(leader.agent.command ?? "");
    if (!command) return { ok: false, reason: "engine" };
  }
  return {
    ok: true,
    engine: picked.engine,
    input: {
      spec: { engine: picked.engine, role: req.role.slice(0, 40), roleKind: req.roleKind === "preset" ? "preset" : "custom", spawnedBy: leader.id, ...(command ? { command } : {}) },
      name,
      cwd
    }
  };
}

/** Kapatılacak bölme yalnız aynı alanda ve o liderin açtığıysa. */
export function canLeadClose(state: TerminalState, req: LeadCloseRequest): boolean {
  const workspace = state.workspaces.find((w) => w.id === req.workspaceId);
  const pane = workspace?.panes.find((p) => p.id === req.paneId);
  return Boolean(pane?.agent?.spawnedBy && pane.agent.spawnedBy === req.leaderPaneId);
}
