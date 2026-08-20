import type { SystemTier } from "../../app-electron/shared/types";

const STYLES: Record<SystemTier, string> = {
  DEV: "border-[var(--tier-dev-border)] bg-[var(--tier-dev-bg)] text-[var(--tier-dev-text)]",
  QA: "border-[var(--tier-qa-border)] bg-[var(--tier-qa-bg)] text-[var(--tier-qa-text)]",
  PRD: "border-[var(--tier-prd-border)] bg-[var(--tier-prd-bg)] text-[var(--tier-prd-text)]"
};

export default function TierBadge({ tier, className = "" }: { tier: SystemTier; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[tier]} ${className}`}
    >
      {tier}
    </span>
  );
}
