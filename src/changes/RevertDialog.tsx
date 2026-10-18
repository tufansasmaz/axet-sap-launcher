// Geri alma onayı (spec 2026-10-18 degisiklikler §6.1, §6.6): etkilenecek
// dosyalar, sonraki değişikliklerin de geri alınacağı uyarısı, çakışan kayıtlar
// adıyla, alanda çalışan ajanlar, çöp notu. Yıkıcı onay: alertdialog, kırmızı
// düğme, ilk odak İptal'de. Ortak Modal'ın confirm katmanı.
import { AlertTriangle } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";
import type { RevertPlan } from "../../app-electron/shared/changesTypes";
import { REASON_KEY, STATUS_KEY, STATUS_MARK } from "./changesFormat";

export default function RevertDialog({
  open,
  plan,
  checkpointLabel,
  onConfirm,
  onCancel
}: {
  open: boolean;
  plan: RevertPlan | null;
  checkpointLabel: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  if (!plan) return null;
  const added = plan.files.filter((f) => f.status === "added").length;
  const confirmText = plan.files.length === 1 ? t("changes.revertConfirm1") : t("changes.revertConfirm", { count: plan.files.length });
  return (
    <Modal
      open={open}
      layer="confirm"
      size="md"
      role="alertdialog"
      title={t("changes.revertTitle")}
      icon={<AlertTriangle size={18} className="text-[var(--status-danger-text)]" />}
      onClose={onCancel}
      footer={
        <>
          <ModalCancelButton autoFocus />
          <Button variant="danger" onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-slate-400">
        {checkpointLabel && <p className="text-xs font-medium text-slate-300">{checkpointLabel}</p>}
        <p>{t("changes.revertBody", { count: plan.files.length })}</p>
        <p>{t("changes.revertLaterWarning")}</p>
        <p data-revert-all-agents="">{t("changes.revertAllAgents")}</p>
        {added > 0 && <p>{t("changes.revertTrashNote", { count: added })}</p>}
        <ul aria-label={t("changes.revertFiles")} className="chat-scroll max-h-48 overflow-y-auto rounded border border-line p-2 font-mono text-2xs text-slate-300">
          {plan.files.map((f) => (
            <li key={f.path} className="flex gap-2">
              <span title={t(STATUS_KEY[f.status])} className="w-3 shrink-0 text-slate-500">
                {STATUS_MARK[f.status]}
              </span>
              <span title={f.path} className="min-w-0 truncate">
                {f.path}
              </span>
            </li>
          ))}
        </ul>
        {plan.conflicts.length > 0 && (
          <div
            data-revert-conflicts=""
            className="flex flex-col gap-1 rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-2 text-2xs text-[var(--status-warning-text)]"
          >
            <p>{t("changes.revertConflicts")}</p>
            <ul>
              {plan.conflicts.map((c) => (
                <li key={c.id}>{[c.agentName, c.label || t(REASON_KEY[c.reason])].filter(Boolean).join(" · ")}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.conflictsPartial && <p className="text-2xs">{t("changes.conflictsPartial")}</p>}
        {plan.runningAgents.length > 0 && (
          <p data-revert-running="" className="text-2xs text-[var(--status-warning-text)]">
            {t("changes.revertRunning", { names: plan.runningAgents.join(", ") })}
          </p>
        )}
      </div>
    </Modal>
  );
}
