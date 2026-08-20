import { AlertTriangle } from "lucide-react";
import { useT } from "../i18n";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  onConfirm,
  onCancel
}: Props) {
  const t = useT();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 "
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="w-[380px] rounded-sm border border-base-700 bg-base-900 p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className={danger ? "text-[var(--status-danger-text)]" : "text-accent-400"} />
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <p className="mb-5 text-sm text-slate-400">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-sm px-4 py-2 text-sm text-slate-300 hover:bg-base-700"
            autoFocus
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`cursor-pointer rounded-sm border px-4 py-2 text-sm font-medium ${
              danger
                ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] hover:bg-[var(--status-danger-border)]"
                : "border-accent-500/40 bg-accent-500/15 text-[var(--accent-soft-text)] hover:bg-accent-500/25"
            }`}
          >
            {confirmLabel ?? t("confirmDialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
