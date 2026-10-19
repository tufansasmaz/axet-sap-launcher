import { useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { readDefaultEngine } from "./defaultEngine";
import { canLeadClose, planLeadSpawn } from "./teamLead";

// Lider açılışı ve kapatması (Tur 7): ana süreç ister, burada terminal
// deposunun yolundan (addPane / closePane) yapılır, sonuç team:reply ile döner.
// TerminalStoreProvider'ın İÇİNDE çizilmeli. Onay kartı FlowProvider'da.
export default function TeamLeadListener() {
  const { state, commands, agentCwd } = useTerminalStore();
  const latest = useRef({ state, agentCwd });
  latest.current = { state, agentCwd };
  useEffect(() => {
    const api = typeof window !== "undefined" ? window.api : undefined;
    if (!api?.onTeamSpawn || !api.onTeamClose || !api.teamReply) return;
    const offSpawn = api.onTeamSpawn((req) => {
      const plan = planLeadSpawn(latest.current.state, req, readDefaultEngine(), latest.current.agentCwd);
      if (!plan.ok) {
        void api.teamReply(req.requestId, { ok: false, reason: plan.reason }).catch(() => {});
        return;
      }
      const added = commands.addAgentAt(req.workspaceId, req.paneId, plan.input);
      void api.teamReply(req.requestId, added ? { ok: true, engine: plan.engine } : { ok: false, reason: "full" }).catch(() => {});
    });
    const offClose = api.onTeamClose((req) => {
      const ok = canLeadClose(latest.current.state, req);
      if (ok) commands.closePane(req.paneId);
      void api.teamReply(req.requestId, ok).catch(() => {});
    });
    return () => {
      offSpawn();
      offClose();
    };
  }, [commands]);
  return null;
}
