// "Yenilikler" penceresi — İş 2 (2026-10-17).
// Uygulama açılışında, sürüm yeniyse bir kez gösterilir.
// Komut paletinden her zaman açılabilir.

import { CheckCircle2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useT } from "../i18n";
import { getWhatsNewEntry } from "../lib/whatsNew";
import { useLanguage } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  appVersion: string;
}

export default function WhatsNewModal({ open, onClose, appVersion }: Props) {
  const t = useT();
  const language = useLanguage();
  const entry = getWhatsNewEntry(appVersion);

  const footer = (
    <Button variant="primary" onClick={onClose}>
      {t("whatsNew.close")}
    </Button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("whatsNew.title", { version: appVersion })}
      size="md"
      footer={footer}
    >
      {entry ? (
        <ul className="space-y-2.5 py-2">
          {(language === "en" ? entry.items.en : entry.items.tr).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--module-sap)]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        // Veri dosyasında bu sürüm yoksa boş göster — komut paletinden
        // elle açıldığında olabilir.
        <p className="py-4 text-sm text-slate-500">{appVersion}</p>
      )}
    </Modal>
  );
}
