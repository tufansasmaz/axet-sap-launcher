import type { ConnectivityState } from "../../app-electron/shared/types";

const STYLES: Record<ConnectivityState, { dot: string; label: string; text: string }> = {
  unknown: { dot: "bg-slate-500", label: "Bilinmiyor", text: "text-slate-400" },
  checking: { dot: "bg-amber-400 animate-pulse", label: "Kontrol ediliyor…", text: "text-[var(--status-warning-text)]" },
  reachable: { dot: "bg-emerald-400", label: "Erişilebilir", text: "text-[var(--status-success-text)]" },
  unreachable: { dot: "bg-rose-500", label: "Erişilemiyor", text: "text-[var(--status-danger-text)]" }
};

export default function StatusDot({ state, showLabel = false }: { state: ConnectivityState; showLabel?: boolean }) {
  const s = STYLES[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      {showLabel && <span className={`text-xs ${s.text}`}>{s.label}</span>}
    </span>
  );
}
