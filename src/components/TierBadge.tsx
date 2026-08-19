import type { SystemTier } from "../../app-electron/shared/types";

const STYLES: Record<SystemTier, string> = {
  DEV: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  QA: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  PRD: "border-rose-500/40 bg-rose-500/15 text-rose-300"
};

export default function TierBadge({ tier, className = "" }: { tier: SystemTier; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[tier]} ${className}`}
    >
      {tier}
    </span>
  );
}
