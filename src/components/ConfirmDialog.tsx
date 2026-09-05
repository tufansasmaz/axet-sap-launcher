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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay-scrim)] "
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="w-[380px] rounded-xl border border-base-700 bg-base-900 p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className={danger ? "text-[var(--status-danger-text)]" : "text-accent-400"} />
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <p className="mb-5 text-sm text-slate-400">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-base-700"
            autoFocus
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          {/* Onay düğmesi artık DÜZ DOLGU (yeni tasarım dili: gradyan/gölge
              yok, saydam "hayalet" dolgu da yok). Yıkıcı hâlde vurgu yerine
              `--status-danger-solid` dolduruyor — kullanıcı kırmızıya basarken
              neye bastığını rengin kendisinden görüyor, ince bir kenarlıktan
              değil. Metin her iki hâlde de `text-accent-on` (gerçek beyaz). */}
          <button
            onClick={onConfirm}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-accent-on transition ${
              danger
                ? "bg-[var(--status-danger-solid)] hover:brightness-110"
                : "bg-accent-500 hover:bg-accent-600"
            }`}
          >
            {confirmLabel ?? t("confirmDialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
