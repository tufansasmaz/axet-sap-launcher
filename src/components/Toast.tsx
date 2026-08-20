import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useT } from "../i18n";

export interface ToastMsg {
  id: number;
  kind: "success" | "error";
  text: string;
  count: number;
  version: number;
}

export default function Toast({ toast, onDismiss }: { toast: ToastMsg; onDismiss: (id: number) => void }) {
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.version]);

  const isSuccess = toast.kind === "success";

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      title={t("toast.dismissTitle")}
      className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur transition hover:brightness-110"
      style={{
        borderColor: isSuccess ? "var(--status-success-border)" : "var(--status-danger-border)",
        backgroundColor: isSuccess ? "var(--status-success-bg)" : "var(--status-danger-bg)",
        color: isSuccess ? "var(--status-success-text)" : "var(--status-danger-text)"
      }}
    >
      {isSuccess ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      <span>{toast.text}</span>
      {toast.count > 1 && (
        <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold">×{toast.count}</span>
      )}
    </div>
  );
}
