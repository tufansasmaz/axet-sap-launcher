// Akış olaylarının oturumluk deposu (spec 2026-10-18 ajanlar-yeniden §2).
// Kenar çubuğu (FlowSidebar) Sohbet sekmesinde sökülüyor; olaylar orada
// kaybolmasın diye toplama App düzeyinde. Yeni kalıcı veri yok: kaynaklar
// ajan durumu, pano ve Değişiklikler yayını; en çok FLOW_MAX olay.
// AgentStatusProvider ve BoardProvider'ın İÇİNDE çizilmeli.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "../i18n";
import type { AgentStatus } from "../../app-electron/shared/agentTypes";
import type { Board } from "../../app-electron/shared/boardTypes";
import type { ChangesState } from "../../app-electron/shared/changesTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { useAgentStatuses } from "./agentStatusContext";
import { useBoards } from "../board/boardContext";
import { agentName } from "./agentLabels";
import { appendFlow, boardEvents, checkpointEvents, statusEvents, type FlowEvent, type FlowInput } from "./flowEvents";

export interface FlowValue {
  events: FlowEvent[];
  record: (input: FlowInput) => void;
}

export const FlowContext = createContext<FlowValue>({ events: [], record: () => {} });

export function useFlow(): FlowValue {
  return useContext(FlowContext);
}

export function FlowProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const { state } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { boards } = useBoards();
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const since = useRef(Date.now());
  const prevStatuses = useRef<Record<string, AgentStatus>>({});
  const prevBoards = useRef<Record<string, Board>>({});
  const prevChanges = useRef<Record<string, ChangesState>>({});
  // Bölme → (alan, ad); olay anındaki ad kaydediliyor.
  const panes = useMemo(() => {
    const map = new Map<string, { workspaceId: string; name: string }>();
    for (const w of state.workspaces) for (const p of w.panes) if (p.kind === "agent") map.set(p.id, { workspaceId: w.id, name: agentName(p, t) });
    return map;
  }, [state.workspaces, t]);
  const panesRef = useRef(panes);
  panesRef.current = panes;

  const add = useCallback((inputs: FlowInput[]) => {
    if (inputs.length) setEvents((list) => appendFlow(list, inputs));
  }, []);

  useEffect(() => {
    add(statusEvents(prevStatuses.current, statuses, panesRef.current, Date.now()));
    prevStatuses.current = statuses;
  }, [statuses, add]);

  useEffect(() => {
    const nameOf = (paneId: string | null) => (paneId ? panesRef.current.get(paneId)?.name ?? "" : "");
    const now = Date.now();
    add(Object.values(boards).flatMap((board) => boardEvents(prevBoards.current[board.workspaceId], board, nameOf, now)));
    prevBoards.current = boards;
  }, [boards, add]);

  useEffect(() => {
    const subscribe = typeof window !== "undefined" ? window.api?.onChangesChanged : undefined;
    if (!subscribe) return;
    return subscribe((next) => {
      add(checkpointEvents(prevChanges.current[next.workspaceId], next, Date.now(), since.current));
      prevChanges.current = { ...prevChanges.current, [next.workspaceId]: next };
    });
  }, [add]);

  const record = useCallback((input: FlowInput) => add([input]), [add]);
  const value = useMemo(() => ({ events, record }), [events, record]);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}
