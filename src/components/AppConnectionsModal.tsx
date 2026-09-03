import { X, Plug } from "lucide-react";
import { useT } from "../i18n";
import AppConnectionsSection from "./AppConnectionsSection";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenLoginTerminal: () => void;
  onOpenProjectTerminal: () => void;
}

// Uygulama Bağlantıları — kullanıcı isteğiyle (2026-08-29, aynı gün ikinci
// tur) Ayarlar modal'ının İÇİNDEN çıkarıldı: "ayarların içinde değil de
// ayarlar butonunun üstünde de olsun" — yani ActivityBar'ın alt köşesinde
// (dil/tema/ayarlar butonlarının olduğu dikey sırada) Ayarlar butonunun
// TAM ÜSTÜNDE ayrı bir buton, kendi bağımsız modal'ını açıyor. İçerik
// (`AppConnectionsSection.tsx`) DEĞİŞMEDİ — sadece bu modal'ın kendi
// başlık/kapatma çerçevesi `SettingsModal.tsx`'in modal kabuğuyla AYNI
// görsel dili (gradient üst çizgi, X kapatma butonu, ortalanmış backdrop)
// kullanıyor, tutarlılık için.
export default function AppConnectionsModal({ open, onClose, onOpenLoginTerminal, onOpenProjectTerminal }: Props) {
  const t = useT();

  if (!open) return null;

  // "Terminalde Giriş Yap"/"AXET Projesi Seç" tıklanınca hem terminal
  // açılıyor hem bu modal KAPATILIYOR — aksi halde modal'ın z-50
  // backdrop'u, App.tsx'in normal akışta (özel bir z-index olmadan)
  // render ettiği TerminalPanel'i görünmez şekilde ÖRTERDİ, kullanıcı
  // device code/proje seçim ekranını hiç göremezdi.
  const handleOpenLoginTerminal = () => {
    onOpenLoginTerminal();
    onClose();
  };

  const handleOpenProjectTerminal = () => {
    onOpenProjectTerminal();
    onClose();
  };

  return (
    <div
      className="animate-backdrop-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="animate-modal-pop-in flex max-h-[88vh] w-[640px] flex-col overflow-hidden rounded-2xl border border-base-700/60 bg-base-900 shadow-2xl shadow-black/50">
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-accent-600 via-accent-500 to-accent-400" />

        <div className="relative shrink-0 px-6 pb-4 pt-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:bg-base-700 hover:text-slate-200"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/15">
              <Plug size={20} className="text-accent-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight text-white">{t("appConnectionsModal.title")}</h3>
              <p className="truncate text-xs text-slate-500">{t("appConnectionsModal.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AppConnectionsSection onOpenLoginTerminal={handleOpenLoginTerminal} onOpenProjectTerminal={handleOpenProjectTerminal} />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-base-800 px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2.5 text-sm font-medium text-accent-on shadow-lg shadow-accent-600/20 transition hover:brightness-110 active:scale-[0.98]"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
