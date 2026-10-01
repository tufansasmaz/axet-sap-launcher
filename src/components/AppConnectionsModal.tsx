import { Plug } from "lucide-react";
import { useT } from "../i18n";
import { Modal, ModalCancelButton } from "../ui/Modal";
import AppConnectionsSection from "./AppConnectionsSection";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenProjectTerminal: () => void;
  /** Yalnızca içeriye geçiriliyor — bkz. AppConnectionsSection.Props. */
  projectDir: string | null;
}

// Uygulama Bağlantıları — kullanıcı isteğiyle (2026-08-29, aynı gün ikinci
// tur) Ayarlar modal'ının İÇİNDEN çıkarıldı: "ayarların içinde değil de
// ayarlar butonunun üstünde de olsun" — yani o günkü ActivityBar'ın alt
// köşesinde, dil/tema/ayarlar butonlarının sırasında (2026-09-29'dan beri
// kenar çubuğunun dibinde, Ayarlar'ın durduğu ikon sırasının üstünde) ayrı
// bir buton, kendi bağımsız modal'ını açıyor. İçerik
// (`AppConnectionsSection.tsx`) DEĞİŞMEDİ.
//
// Çerçeve ortak `Modal` (2026-10-01): Escape eskiden yalnız pencerenin
// içinden kabaran tuşu dinliyordu ve odak dışarıdayken ölüydü (kullanıcı
// bildirdi, 2026-09-07). Bu kutuda belirgin bir "ilk alan" yok, içerik
// bağlayıcı listesi — ilk odak pencerenin kendisi (`initialFocus="dialog"`).
export default function AppConnectionsModal({ open, onClose, onOpenProjectTerminal, projectDir }: Props) {
  const t = useT();

  // "AXET Projesi Seç" tıklanınca hem Terminal moduna geçilip AXET bölmesi
  // ekleniyor hem bu modal KAPATILIYOR — aksi halde modal'ın arka planı
  // Terminal modunu görünmez şekilde ÖRTERDİ, kullanıcı yeni bölmeyi hiç
  // göremezdi.
  const handleOpenProjectTerminal = () => {
    onOpenProjectTerminal();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      initialFocus="dialog"
      icon={<Plug size={18} />}
      title={t("appConnectionsModal.title")}
      subtitle={t("appConnectionsModal.subtitle")}
      footer={<ModalCancelButton label={t("common.close")} />}
    >
      <AppConnectionsSection onOpenProjectTerminal={handleOpenProjectTerminal} projectDir={projectDir} />
    </Modal>
  );
}
