// Ajan durumlarının renderer'daki kopyası (spec 2026-10-17 ajan-alani §4).
// Gerçek tek kaynak ana süreçteki izleyici; burada yalnız son bildirdiği.
// Varsayılan değer boş: sağlayıcısız çizilen bileşenler (testler) çökmüyor.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgentAnswerResult, AgentEngineInfo, AgentStatus } from "../../app-electron/shared/agentTypes";

export interface AgentStatusValue {
  statuses: Record<string, AgentStatus>;
  engines: AgentEngineInfo[] | null;
  /** "Boşta 3 dk" için saat; NOW_TICK_MS'de bir ilerliyor. */
  now: number;
  answer: (paneId: string, callId: string, index: number) => Promise<AgentAnswerResult>;
}

const EMPTY: AgentStatusValue = {
  statuses: {},
  engines: null,
  now: 0,
  answer: async () => ({ ok: false, reason: "noAgent" })
};

export const AgentStatusContext = createContext<AgentStatusValue>(EMPTY);

export function useAgentStatuses(): AgentStatusValue {
  return useContext(AgentStatusContext);
}

export const NOW_TICK_MS = 30_000;

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [engines, setEngines] = useState<AgentEngineInfo[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const off = window.api.onAgentStatus((event) => setStatuses((prev) => ({ ...prev, [event.paneId]: event.status })));
    // Yeniden yüklemeden (Ctrl+R) sonra son durumlar; olaydan gelen daha yeni değer ezilmiyor.
    window.api.agentSnapshot().then(
      (list) => {
        if (!alive) return;
        setStatuses((prev) => {
          const next = { ...prev };
          for (const event of list) if (!(event.paneId in next)) next[event.paneId] = event.status;
          return next;
        });
      },
      () => {}
    );
    window.api.agentEngines().then(
      (list) => {
        if (alive) setEngines(list);
      },
      () => {
        if (alive) setEngines([]);
      }
    );
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => {
      alive = false;
      off();
      window.clearInterval(timer);
    };
  }, []);

  const answer = useCallback(
    (paneId: string, callId: string, index: number) =>
      window.api.agentAnswer(paneId, callId, index).catch((): AgentAnswerResult => ({ ok: false, reason: "writeFailed" })),
    []
  );

  const value = useMemo(() => ({ statuses, engines, now, answer }), [statuses, engines, now, answer]);
  return <AgentStatusContext.Provider value={value}>{children}</AgentStatusContext.Provider>;
}
