import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { ChatAttachment } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn, iconBtn } from "../ui/buttons";
import { useModalStack } from "../ui/Modal";

// Bir görsel ekin TAM BOY önizlemesi. Sohbetteki küçük resim en fazla 176px
// yüksekliğinde — bir ekran görüntüsündeki yazıyı okumaya yetmiyor, ki eki
// göndermenin asıl sebebi çoğunlukla o.
//
// Görsel `data:` URL'inden geliyor (bkz. AttachmentChip `usePreview`), yani
// burada yeniden bir okuma YOK: çip zaten okumuş, önbellekte duruyor.
// Büyütme, olmayan bir veriyi getirmiyor; sadece var olanı kırpmadan gösteriyor.
//
// Pencere davranışı artık Modal yığın kancası (useModalStack) üzerinden:
// Escape, Tab tuzağı ve kapanış odağı altta açık pencerelerle aynı kurallara
// uyuyor. Eski data-escape-owner + özel keydown dinleyici kaldırıldı.
export default function AttachmentLightbox({
  attachment,
  dataUrl,
  onClose,
  onOpenExternal
}: {
  attachment: ChatAttachment;
  dataUrl: string;
  onClose: () => void;
  onOpenExternal: () => void;
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Açılış anındaki odaklı öğe — kapanınca buraya dönülüyor.
  const [opener] = useState(() => document.activeElement);

  useModalStack(panelRef, "modal", onClose);

  // Kapanışta odak açan öğeye dönüyor — o öğe hâlâ sayfadaysa.
  useEffect(
    () => () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    },
    [opener]
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.name}
      tabIndex={-1}
      onClick={onClose}
      className="animate-backdrop-fade-in fixed inset-0 z-[60] flex flex-col bg-[var(--overlay-scrim)] backdrop-blur-sm"
    >
      {/* Üst şerit — dosya adı + eylemler. `stopPropagation`: buradaki bir
          tıklama katmanı kapatmamalı, yoksa "Bilgisayarda aç" düğmesine
          basmak aynı anda pencereyi de kapatırdı. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2.5"
      >
        <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200" title={attachment.path}>
          {attachment.name}
        </span>
        <button
          onClick={onOpenExternal}
          title={t("axetCodeHome.attachmentOpen")}
          className={btn("neutral", "md")}
        >
          <ExternalLink size={13} />
          {t("axetCodeHome.attachmentOpen")}
        </button>
        <button
          onClick={onClose}
          title={`${t("axetCodeHome.attachmentClose")} (Esc)`}
          className={iconBtn("neutral", "md")}
        >
          <X size={15} />
        </button>
      </div>

      {/* Görselin kendisi. Zemine yapılan tıklama kapatıyor, görselin ÜSTÜNE
          yapılan kapatmıyor — büyütülmüş bir görseli incelerken üstüne tıklamak
          (kaydırmak, işaret etmek) kapatma niyeti değil. */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <img
          onClick={(e) => e.stopPropagation()}
          src={dataUrl}
          alt={attachment.name}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl shadow-black/50"
        />
      </div>
    </div>
  );
}
