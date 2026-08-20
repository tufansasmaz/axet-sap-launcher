import type { ConnectivityState } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

const STYLES: Record<ConnectivityState, { dot: string; labelKey: TranslationKey; text: string }> = {
  unknown: { dot: "bg-slate-500", labelKey: "statusDot.unknown", text: "text-slate-400" },
  checking: { dot: "bg-amber-400 animate-pulse", labelKey: "statusDot.checking", text: "text-[var(--status-warning-text)]" },
  reachable: { dot: "bg-emerald-400", labelKey: "statusDot.reachable", text: "text-[var(--status-success-text)]" },
  unreachable: { dot: "bg-rose-500", labelKey: "statusDot.unreachable", text: "text-[var(--status-danger-text)]" }
};

export default function StatusDot({ state, showLabel = false }: { state: ConnectivityState; showLabel?: boolean }) {
  const t = useT();
  const s = STYLES[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      {showLabel && <span className={`text-xs ${s.text}`}>{t(s.labelKey)}</span>}
    </span>
  );
}
