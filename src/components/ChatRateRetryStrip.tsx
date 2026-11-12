import { useEffect, useState } from "react";
import { Hourglass, X } from "lucide-react";
import { useT } from "../i18n";

export interface ChatRateRetryState {
  /** Bekleyen otomatik deneme; tükenince null ve `exhausted` true. */
  attempt: number;
  max: number;
  /** Denemenin gideceği an (epoch ms). */
  at: number;
  exhausted?: boolean;
}

// 429 sonrası otomatik deneme şeridi (kararlilik-2 R4). Sıra şeridiyle aynı
// dilde, composer'ın üstünde. Geri sayım bileşenin kendi saatiyle: üst bileşen
// her saniye yeniden çizilmesin.
export default function ChatRateRetryStrip({ state, onCancel }: { state: ChatRateRetryState; onCancel: () => void }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.exhausted) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.exhausted, state.at]);
  const seconds = Math.max(0, Math.ceil((state.at - now) / 1000));
  return (
    <div
      data-testid="chat-rate-retry"
      role="status"
      className="mb-2 flex items-start gap-2 rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[12px] text-[var(--status-warning-text)]"
    >
      <Hourglass size={13} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {state.exhausted
            ? t("chatRateRetry.exhausted", { max: state.max })
            : t("chatRateRetry.waiting", { attempt: state.attempt, max: state.max, seconds })}
        </div>
        <div className="opacity-80">{t("chatRateRetry.hint")}</div>
      </div>
      {!state.exhausted && (
        <button
          type="button"
          onClick={onCancel}
          title={t("chatRateRetry.cancel")}
          aria-label={t("chatRateRetry.cancel")}
          className="cursor-pointer rounded-md p-1 transition hover:bg-hover"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
