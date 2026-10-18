// Pano (genel bakış) görünümünün SAF özeti (Tur 3). Yeni arka uç verisi yok:
// alan (bölmeler + kök), ajan durumları, görev panosu, değişiklik kayıtları,
// Akış olayları ve motor bilgisi — hepsi zaten renderer'da olan kaynaklar.
import type { AgentEngineInfo, AgentStatus } from "../../app-electron/shared/agentTypes";
import type { Board, BoardTask } from "../../app-electron/shared/boardTypes";
import type { ChangesState, Checkpoint, RepoStatus } from "../../app-electron/shared/changesTypes";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { agentPanes, decisionsOf } from "./agentView";
import type { FlowEvent } from "./flowEvents";
import { openSubtaskCount, pendingChangeCount } from "./railCounts";

export interface Overview {
  agents: { total: number; running: number; asking: number; idle: number; error: number };
  tasks: { open: number; done: number; draft: number; openSubtasks: number; recent: BoardTask[] };
  questions: number;
  changes: { pending: number; recent: Checkpoint[] };
  events: FlowEvent[];
  repo: { root: string | null; status: RepoStatus };
  engines: { installed: number; total: number; known: boolean };
}

const RECENT_TASKS = 3;
const RECENT_CHANGES = 3;
const RECENT_EVENTS = 6;

export function overviewOf(input: {
  workspace: TerminalWorkspace;
  statuses: Record<string, AgentStatus>;
  board?: Board | null;
  changes?: ChangesState | null;
  events: readonly FlowEvent[];
  engines: AgentEngineInfo[] | null;
}): Overview {
  const { workspace, statuses, board, changes, events, engines } = input;
  const agents = { total: 0, running: 0, asking: 0, idle: 0, error: 0 };
  for (const pane of agentPanes(workspace)) {
    agents.total += 1;
    const run = pane.run.state;
    if (run === "failed" || run === "missingDir" || statuses[pane.id]?.state === "error") agents.error += 1;
    else if (run !== "running") agents.idle += 1;
    else if (statuses[pane.id]?.state === "running") agents.running += 1;
    else if (statuses[pane.id]?.state === "asking") agents.asking += 1;
    else agents.idle += 1;
  }
  const tasks = board?.tasks ?? [];
  const expired = new Set(changes?.expired ?? []);
  const real = (engines ?? []).filter((e) => e.id !== "ozel");
  return {
    agents,
    tasks: {
      open: tasks.filter((t) => t.state !== "draft" && t.state !== "done").length,
      done: tasks.filter((t) => t.state === "done").length,
      draft: tasks.filter((t) => t.state === "draft").length,
      openSubtasks: openSubtaskCount(board),
      recent: tasks.slice(-RECENT_TASKS).reverse()
    },
    questions: decisionsOf([workspace], statuses).length,
    changes: {
      pending: pendingChangeCount(changes),
      recent: (changes?.checkpoints ?? []).filter((c) => !expired.has(c.id)).slice(-RECENT_CHANGES).reverse()
    },
    events: events.filter((e) => e.workspaceId === workspace.id).slice(-RECENT_EVENTS).reverse(),
    repo: { root: workspace.root?.trim() || null, status: changes?.repo ?? "unknown" },
    engines: { installed: real.filter((e) => e.installed).length, total: real.length, known: engines !== null }
  };
}
