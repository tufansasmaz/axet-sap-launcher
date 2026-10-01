import { Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { UpdateStatus } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CONFIRM_BUTTON } from "../ui/buttons";
import { Modal, ModalCancelButton } from "../ui/Modal";

export type UpdatePromptMode = "hidden" | "prompt" | "progress";

interface Props {
  mode: UpdatePromptMode;
  status: UpdateStatus;
  onAccept: () => void;
  onDismiss: () => void;
}

// Uygulama açılışında (main/index.ts'teki otomatik `checkForUpdates`
// tetiklemesi sonrası) veya Ayarlar'daki "Şimdi Kontrol Et" sonrası bir
// güncelleme bulunursa burada TEK BİR SORU sorulur ("İndir ve Kur mu?") —
// kullanıcı "İndir ve Kur"a bastıktan sonra indirme VE kurulum (yeniden
// başlatma) tamamen otomatik ilerler, ikinci bir onay istenmez (bkz.
// App.tsx'teki "downloaded" fazında otomatik `installUpdate()` çağrısı).
// "Daha Sonra" seçilirse bu modal o oturumda aynı sürüm için bir daha
// açılmaz (App.tsx `dismissedUpdateVersion` ile takip ediyor) — sonraki
// bir sürüm bulunduğunda (veya uygulama yeniden başlatıldığında) tekrar
// sorulur.
//
// Ortak `Modal` çerçevesinde, `confirm` katmanında: açık bir pencerenin
// üstünde de görünüyor. İndirme/kurulum sürerken kapanmıyor ve ✕ hiç
// çizilmiyor; devre dışı bir ✕ kapatılabilirmiş izlenimi verirdi.
export default function UpdatePromptModal({ mode, status, onAccept, onDismiss }: Props) {
  const t = useT();
  const locked = mode === "progress" && status.phase !== "error";

  const footer =
    mode === "prompt" ? (
      <>
        <ModalCancelButton label={t("updatePrompt.later")} />
        <button type="button" onClick={onAccept} autoFocus className={DIALOG_CONFIRM_BUTTON}>
          <Download size={14} />
          {t("updatePrompt.install")}
        </button>
      </>
    ) : mode === "progress" && status.phase === "error" ? (
      <ModalCancelButton label={t("updatePrompt.close")} />
    ) : undefined;

  return (
    <Modal
      open={mode !== "hidden"}
      layer="confirm"
      size="md"
      title={t("updatePrompt.title")}
      icon={<Download size={18} />}
      onClose={onDismiss}
      closeDisabled={locked}
      hideClose={locked}
      footer={footer}
    >
      {mode === "prompt" && (
        <p className="text-sm text-slate-400">{t("updatePrompt.message", { version: status.version ?? "" })}</p>
      )}

      {mode === "progress" && status.phase === "downloading" && (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm text-accent-400">
            <Download size={14} />
            {t("updatePrompt.downloading", { version: status.version ?? "", percent: status.percent ?? 0 })}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-control">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${status.percent ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {mode === "progress" && status.phase === "downloaded" && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--status-success-text)]">
          <CheckCircle2 size={14} />
          {t("updatePrompt.downloaded")}
        </p>
      )}

      {mode === "progress" && status.phase === "error" && (
        <p className="flex items-start gap-1.5 text-sm text-[var(--status-danger-text)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {t("updatePrompt.error", { message: status.message ?? "" })}
        </p>
      )}

      {mode === "progress" &&
        status.phase !== "downloading" &&
        status.phase !== "downloaded" &&
        status.phase !== "error" && (
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <RefreshCw size={14} className="animate-spin" />
            {t("settingsModal.checking")}
          </p>
        )}
    </Modal>
  );
}
