import type { ChatAttention } from "../lib/chatAttention";
import { useT } from "../i18n";

// Sohbetin kullanıcıdan ne beklediğini gösteren nokta (bkz. lib/chatAttention.ts).
// Üç hâl yalnızca renk ve hareketle ayrılmıyor — `title` ve ekran okuyucu
// metni de var, çünkü rengi ayırt edemeyen biri için üçü aynı nokta.
//
//   working → atan mavi nokta (eskiden satırdaki tek nokta buydu)
//   unseen  → sabit mavi nokta
//   asking  → sabit kehribar nokta: tur durdu, cevabını bekliyor
export default function AttentionDot({ attention }: { attention: ChatAttention }) {
  const t = useT();
  const label = t(`chatAttention.${attention}` as const);
  const color = attention === "asking" ? "bg-[var(--status-warning-text)]" : "bg-accent-400";
  return (
    <span data-attention={attention} title={label} className="relative flex h-2 w-2 shrink-0">
      {attention === "working" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
