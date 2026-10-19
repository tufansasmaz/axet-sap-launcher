import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { useAgentStatuses } from "./agentStatusContext";
import { askingCount } from "./agentView";
import { useFlow } from "./flowContext";

// Başka moddayken "Ajanlar" sekmesindeki işaret: soru bekleyen ajan sayısı
// (spec 2026-10-17 ajan-alani §4). Kehribar: durum rengi, seçim değil.
// Tur 6: okunmamış ajan bildirimi (soru/bitti/hata) varsa sayı rozeti
// (nötr gri, 9+ kırpılır; ray sayaçlarıyla aynı dil). Ajanlar açılınca sıfırlanır.
export default function AgentsModeBadge() {
  const t = useT();
  const { state } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { unread } = useFlow();
  const asking = state.workspaces.reduce((sum, w) => sum + askingCount(w, statuses), 0);
  if (unread > 0) {
    const label = t("agents.unread", { count: unread });
    return (
      <span
        data-agents-unread={unread}
        title={label}
        aria-label={label}
        className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${
          asking > 0 ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]" : "bg-control text-slate-300"
        }`}
      >
        {unread > 9 ? "9+" : unread}
      </span>
    );
  }
  if (asking === 0) return null;
  const label = t("agents.askingCount", { count: asking });
  return (
    <span data-agents-asking={asking} title={label} className="relative flex h-2 w-2 shrink-0">
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-warning-text)]" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
