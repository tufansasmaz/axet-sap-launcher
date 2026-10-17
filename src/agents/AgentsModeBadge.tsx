import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { useAgentStatuses } from "./agentStatusContext";
import { askingCount } from "./agentView";

// Başka moddayken "Ajanlar" sekmesindeki işaret: soru bekleyen ajan sayısı
// (spec 2026-10-17 ajan-alani §4). Kehribar: durum rengi, seçim değil.
export default function AgentsModeBadge() {
  const t = useT();
  const { state } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const asking = state.workspaces.reduce((sum, w) => sum + askingCount(w, statuses), 0);
  if (asking === 0) return null;
  const label = t("agents.askingCount", { count: asking });
  return (
    <span data-agents-asking={asking} title={label} className="relative flex h-2 w-2 shrink-0">
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-warning-text)]" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
