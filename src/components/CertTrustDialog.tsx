import { ShieldAlert } from "lucide-react";
import type { CertTrustPrompt } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";

// SAP sunucusunun TLS sertifikası doğrulanamadığında (kurumsal CA, kendinden
// imzalı) ya da daha önce onaylanan sertifika DEĞİŞTİĞİNDE gösterilir.
// Ana süreç bu noktada kimlik bilgisini GÖNDERMEDEN durmuş durumda; kullanıcı
// "Güven" demedikçe hiçbir pin yazılmıyor ve bağlantı kurulmuyor.
//
// ConfirmDialog'un kalıbı, iki farkla: parmak izleri tam gösterilsin diye
// geniş, ve renk uyarı tonu (`--status-warning-*`) — bu bir karar anı,
// seçim değil (lime yalnızca seçim içindir).
interface Props {
  prompt: CertTrustPrompt | null;
  busy?: boolean;
  onTrust: () => void;
  onCancel: () => void;
}

// 64 hanelik hex'i ikişerli gruplara bölüyor: kullanıcı onu sunucu
// yöneticisinin verdiği değerle (STRUST / tarayıcı) göz göze karşılaştırabilsin.
function groupFingerprint(fp: string): string {
  return (fp.match(/.{1,2}/g) ?? []).join(":").toUpperCase();
}

export default function CertTrustDialog({ prompt, busy = false, onTrust, onCancel }: Props) {
  const t = useT();
  if (!prompt) return null;
  const changed = prompt.kind === "changed";
  const endpoint = `${prompt.host}:${prompt.port}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay-scrim)]"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="w-[560px] max-w-[92vw] rounded-xl border border-line bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert size={18} className="text-[var(--status-warning-text)]" />
          <h3 className="text-base font-semibold text-white">
            {changed ? t("certTrust.changedTitle") : t("certTrust.untrustedTitle")}
          </h3>
        </div>
        <p className="mb-3 text-sm text-slate-400">
          {changed
            ? t("certTrust.changedMessage", { endpoint })
            : t("certTrust.untrustedMessage", { endpoint })}
        </p>
        <div className="mb-3 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning-text)]">
          {changed ? t("certTrust.changedWarning") : t("certTrust.untrustedWarning")}
        </div>
        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          {changed && prompt.previousFingerprint && (
            <>
              <dt className="text-slate-500">{t("certTrust.previousFingerprint")}</dt>
              <dd className="break-all font-mono text-[11px] text-slate-400">
                {groupFingerprint(prompt.previousFingerprint)}
              </dd>
            </>
          )}
          <dt className="text-slate-500">{changed ? t("certTrust.newFingerprint") : t("certTrust.fingerprint")}</dt>
          <dd className="break-all font-mono text-[11px] text-slate-200">{groupFingerprint(prompt.fingerprint)}</dd>
          <dt className="text-slate-500">{t("certTrust.subject")}</dt>
          <dd className="break-all text-slate-300">{prompt.subject || "—"}</dd>
          <dt className="text-slate-500">{t("certTrust.issuer")}</dt>
          <dd className="break-all text-slate-300">
            {prompt.issuer || "—"}
            {prompt.selfSigned ? ` (${t("certTrust.selfSigned")})` : ""}
          </dd>
          <dt className="text-slate-500">{t("certTrust.validity")}</dt>
          <dd className="text-slate-300">
            {prompt.validFrom || "?"} — {prompt.validTo || "?"}
          </dd>
          {prompt.reason && (
            <>
              <dt className="text-slate-500">{t("certTrust.reason")}</dt>
              <dd className="break-all text-slate-400">{prompt.reason}</dd>
            </>
          )}
        </dl>
        {/* Varsayılan odak "Vazgeç"te: Enter'a refleksle basan kullanıcı
            sertifikaya güvenmiş olmasın. */}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className={DIALOG_CANCEL_BUTTON} autoFocus disabled={busy}>
            {t("common.cancel")}
          </button>
          <button onClick={onTrust} className={DIALOG_CONFIRM_BUTTON} disabled={busy}>
            {t("certTrust.trust")}
          </button>
        </div>
      </div>
    </div>
  );
}
