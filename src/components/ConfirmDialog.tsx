import { AlertTriangle } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";

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

// Evet/hayır onayı. Ortak `Modal`'ın `confirm` katmanında: açık bir pencerenin
// üstünde de açılabiliyor ve Escape yalnızca bunu kapatıyor, alttakini değil.
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
  return (
    <Modal
      open={open}
      layer="confirm"
      size="sm"
      title={title}
      icon={<AlertTriangle size={18} className={danger ? "text-[var(--status-danger-text)]" : "text-accent-400"} />}
      onClose={onCancel}
      footer={
        <>
          {/* Düğmeler tek yerden: `src/ui/buttons.ts` (`Button` onu kullanıyor).
              Onay düğmesi DÜZ DOLGU (yeni tasarım dili: gradyan/gölge yok,
              saydam "hayalet" dolgu da yok). Yıkıcı hâlde vurgu yerine
              `--status-danger-solid` dolduruyor — kullanıcı kırmızıya basarken
              neye bastığını rengin kendisinden görüyor, ince bir kenarlıktan
              değil. */}
          <ModalCancelButton label={cancelLabel} autoFocus />
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel ?? t("confirmDialog.confirm")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-400">{message}</p>
    </Modal>
  );
}
