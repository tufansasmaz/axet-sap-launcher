import { useEffect } from "react";
import { CheckCircle2, MessageCircleQuestion, XCircle } from "lucide-react";
import { useT } from "../i18n";

export interface ToastMsg {
  id: number;
  kind: "success" | "error" | "warning";
  text: string;
  count: number;
  version: number;
  /** Tur 6 (ajan bildirimi): tıklanınca ilgili yere götürür, sonra kapanır. */
  onClick?: () => void;
  /** Ekranda kalma süresi (ms); yoksa 4500. */
  duration?: number;
}

/** Durum jetonları: success/warning/danger (lime yok — yalnız seçim). */
const TONE = {
  success: "success",
  warning: "warning",
  error: "danger"
} as const;

export default function Toast({ toast, onDismiss }: { toast: ToastMsg; onDismiss: (id: number) => void }) {
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.version]);

  const isSuccess = toast.kind === "success";
  const tone = TONE[toast.kind];

  return (
    <div
      role={toast.onClick ? "button" : undefined}
      data-toast={toast.kind}
      onClick={() => {
        toast.onClick?.();
        onDismiss(toast.id);
      }}
      title={toast.onClick ? undefined : t("toast.dismissTitle")}
      // Yüzen bir katman: gölge KALIYOR. Yeni tasarım dilindeki "gölge yok"
      // kuralı düğmeler ve kartlar için — ekranın üstünde duran şeyler
      // (modal, açılır liste, toast) yüzdüklerini gölgeyle söylüyor.
      className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-lg shadow-black/20 transition hover:brightness-110"
      style={{
        borderColor: `var(--status-${tone}-border)`,
        backgroundColor: `var(--status-${tone}-bg)`,
        color: `var(--status-${tone}-text)`
      }}
    >
      {isSuccess ? <CheckCircle2 size={16} /> : toast.kind === "warning" ? <MessageCircleQuestion size={16} /> : <XCircle size={16} />}
      <span>{toast.text}</span>
      {toast.count > 1 && (
        // Rozet zemini `bg-black/20` DEĞİL: açık temada zaten açık olan durum
        // zemininin üstünde gri bir leke oluyordu. `currentColor` kutunun kendi
        // durum rengini alıyor, yani her iki temada da doğru tonda.
        <span className="rounded-full bg-[color-mix(in_srgb,currentColor_18%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold">
          ×{toast.count}
        </span>
      )}
    </div>
  );
}
