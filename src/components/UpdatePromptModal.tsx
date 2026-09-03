import { Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { UpdateStatus } from "../../app-electron/shared/types";
import { useT } from "../i18n";

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
export default function UpdatePromptModal({ mode, status, onAccept, onDismiss }: Props) {
  const t = useT();
  if (mode === "hidden") return null;

  return (
    <div className="animate-backdrop-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-modal-pop-in w-[420px] rounded-2xl border border-base-700/60 bg-base-900 p-6 shadow-2xl shadow-black/50">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/15">
            <Download size={16} className="text-accent-400" />
          </span>
          <h3 className="text-base font-semibold text-white">{t("updatePrompt.title")}</h3>
        </div>

        {mode === "prompt" && (
          <>
            <p className="mb-5 text-sm text-slate-400">
              {t("updatePrompt.message", { version: status.version ?? "" })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onDismiss}
                className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:bg-base-700"
              >
                {t("updatePrompt.later")}
              </button>
              <button
                onClick={onAccept}
                autoFocus
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-4 py-2.5 text-sm font-medium text-accent-on shadow-lg shadow-accent-600/20 transition hover:brightness-110 active:scale-[0.98]"
              >
                <Download size={14} />
                {t("updatePrompt.install")}
              </button>
            </div>
          </>
        )}

        {mode === "progress" && status.phase === "downloading" && (
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-sm text-accent-400">
              <Download size={14} />
              {t("updatePrompt.downloading", { version: status.version ?? "", percent: status.percent ?? 0 })}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-800">
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
          <>
            <p className="mb-5 flex items-start gap-1.5 text-sm text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {t("updatePrompt.error", { message: status.message ?? "" })}
            </p>
            <div className="flex justify-end">
              <button
                onClick={onDismiss}
                className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:bg-base-700"
              >
                {t("updatePrompt.close")}
              </button>
            </div>
          </>
        )}

        {mode === "progress" && status.phase !== "downloading" && status.phase !== "downloaded" && status.phase !== "error" && (
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <RefreshCw size={14} className="animate-spin" />
            {t("settingsModal.checking")}
          </p>
        )}
      </div>
    </div>
  );
}
