// Rayın sayaçlarını toplar: pano (bağlamdan), soru soran ajanlar (durum
// bağlamından), incelenmeyi bekleyen değişiklikler (alanın kayıt durumu).
// Değişiklik durumu ana süreçten okunuyor; köprü yoksa (testler) yalnız 0.
import { useEffect, useState } from "react";
import { useBoards } from "../board/boardContext";
import { useAgentStatuses } from "./agentStatusContext";
import { askingCount } from "./agentView";
import { railCounts, type RailCounts } from "./railCounts";
import type { ChangesState } from "../../app-electron/shared/changesTypes";
import type { TerminalWorkspace } from "../stores/terminalTypes";

function useChangesForRail(workspaceId: string): ChangesState | null {
  const [state, setState] = useState<ChangesState | null>(null);
  useEffect(() => {
    const api = typeof window === "undefined" ? undefined : window.api;
    if (!api?.changesState || !api.onChangesChanged) return;
    let alive = true;
    const off = api.onChangesChanged((next) => {
      if (alive && next.workspaceId === workspaceId) setState(next);
    });
    api.changesState(workspaceId).then(
      (next) => {
        if (alive && next) setState((prev) => prev ?? next);
      },
      () => {}
    );
    return () => {
      alive = false;
      off();
    };
  }, [workspaceId]);
  return state && state.workspaceId === workspaceId ? state : null;
}

export function useRailCounts(workspace: TerminalWorkspace): RailCounts {
  const { boards } = useBoards();
  const { statuses } = useAgentStatuses();
  const changes = useChangesForRail(workspace.id);
  return railCounts({ board: boards[workspace.id], changes, asking: askingCount(workspace, statuses) });
}
