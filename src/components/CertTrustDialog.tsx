import { ShieldAlert } from "lucide-react";
import type { CertTrustPrompt } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";

// SAP sunucusunun TLS sertifikası doğrulanamadığında (kurumsal CA, kendinden
// imzalı) ya da daha önce onaylanan sertifika DEĞİŞTİĞİNDE gösterilir.
// Ana süreç bu noktada kimlik bilgisini GÖNDERMEDEN durmuş durumda; kullanıcı
// "Güven" demedikçe hiçbir pin yazılmıyor ve bağlantı kurulmuyor.
//
// ConfirmDialog'un kalıbı, iki farkla: parmak izleri tam gösterilsin diye
// geniş, ve renk uyarı tonu (`--status-warning-*`) — bu bir karar anı,
// seçim değil (vurgu rengi yalnızca seçim içindir).
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
    <Modal
      open
      onClose={onCancel}
      // Onay ya da bağlantı sürerken kapanmıyor.
      closeDisabled={busy}
      width={560}
      icon={<ShieldAlert size={18} className="text-[var(--status-warning-text)]" />}
      title={changed ? t("certTrust.changedTitle") : t("certTrust.untrustedTitle")}
      footer={
        <>
          {/* Varsayılan odak İptal'de: Enter'a refleksle basan kullanıcı
              sertifikaya güvenmiş olmasın. */}
          <ModalCancelButton autoFocus />
          <Button variant="primary" onClick={onTrust} disabled={busy}>
            {t("certTrust.trust")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          {changed ? t("certTrust.changedMessage", { endpoint }) : t("certTrust.untrustedMessage", { endpoint })}
        </p>
        <div className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning-text)]">
          {changed ? t("certTrust.changedWarning") : t("certTrust.untrustedWarning")}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          {changed && prompt.previousFingerprint && (
            <>
              <dt className="text-slate-500">{t("certTrust.previousFingerprint")}</dt>
              <dd className="break-all font-mono text-2xs text-slate-400">
                {groupFingerprint(prompt.previousFingerprint)}
              </dd>
            </>
          )}
          <dt className="text-slate-500">{changed ? t("certTrust.newFingerprint") : t("certTrust.fingerprint")}</dt>
          <dd className="break-all font-mono text-2xs text-slate-200">{groupFingerprint(prompt.fingerprint)}</dd>
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
      </div>
    </Modal>
  );
}
