import type { ConnectivityState } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

const STYLES: Record<
  ConnectivityState,
  { dot: string; labelKey: TranslationKey; text: string; pillBg: string; pillBorder: string }
> = {
  unknown: {
    dot: "bg-slate-500",
    labelKey: "statusDot.unknown",
    text: "text-slate-400",
    pillBg: "bg-active/50",
    pillBorder: "border-line-strong"
  },
  // Noktalar da artık tema jetonundan besleniyor. Önceden `bg-amber-400` /
  // `bg-emerald-400` / `bg-rose-500` yazıyordu — yani Tailwind'in kendi sabit
  // renkleri, temadan bağımsız. Aynı rozetin metni jetondan, noktası başka bir
  // yerden gelince açık temada ikisi birbirini tutmuyordu; ayrıca yeni
  // paletteki turkuaz "başarı" tonu zeytin vurgusundan ayrışsın diye
  // seçilmişti, sabit emerald bunu boşa çıkarıyordu.
  checking: {
    dot: "bg-[var(--status-warning-text)] animate-pulse",
    labelKey: "statusDot.checking",
    text: "text-[var(--status-warning-text)]",
    pillBg: "bg-[var(--status-warning-bg)]",
    pillBorder: "border-[var(--status-warning-border)]"
  },
  reachable: {
    dot: "bg-[var(--status-success-text)]",
    labelKey: "statusDot.reachable",
    text: "text-[var(--status-success-text)]",
    pillBg: "bg-[var(--status-success-bg)]",
    pillBorder: "border-[var(--status-success-border)]"
  },
  unreachable: {
    dot: "bg-[var(--status-danger-text)]",
    labelKey: "statusDot.unreachable",
    text: "text-[var(--status-danger-text)]",
    pillBg: "bg-[var(--status-danger-bg)]",
    pillBorder: "border-[var(--status-danger-border)]"
  }
};

export default function StatusDot({
  state,
  showLabel = false,
  pill = false
}: {
  state: ConnectivityState;
  showLabel?: boolean;
  pill?: boolean;
}) {
  const t = useT();
  const s = STYLES[state];

  if (pill) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${s.pillBg} ${s.pillBorder} ${s.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {t(s.labelKey)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      {showLabel && <span className={`text-xs ${s.text}`}>{t(s.labelKey)}</span>}
    </span>
  );
}
