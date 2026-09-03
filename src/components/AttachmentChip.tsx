import { useEffect, useState } from "react";
import { FileText, Maximize2, X } from "lucide-react";
import type { ChatAttachment } from "../../app-electron/shared/types";
import AttachmentLightbox from "./AttachmentLightbox";
import { useT } from "../i18n";

// Bir ekin küçük resmi. Renderer bu dosyayı KENDİSİ okuyamaz (dev'de sayfanın
// kaynağı `http://localhost:5173`, oradan `file://` bir görsele erişmek
// engelli), bu yüzden main process'ten `data:` URL'i olarak isteniyor
// (bkz. chatAttachments.ts `readAttachmentPreview`).
//
// Önizlemeler diske YAZILMIYOR (bkz. shared/types.ts `ChatAttachment`) — her
// açılışta yeniden okunuyorlar. Bu yüzden burada bir bellek içi önbellek var:
// olmadan, aynı görsel listede her göründüğünde/her yeniden render'da tekrar
// IPC'den geçerdi.
//
// Önbellek SINIRLI: değerler base64 görseller, sınırsız bir Map uzun bir
// sohbette onlarca megabayt tutardı. En eski kayıt atılıyor (Map ekleme
// sırasını korur). Atılan bir kayıt kaybolmuyor, sadece bir kez daha okunuyor.
const MAX_CACHED_PREVIEWS = 30;
const previewCache = new Map<string, string | null>();

function rememberPreview(path: string, value: string | null): void {
  if (previewCache.size >= MAX_CACHED_PREVIEWS) {
    const oldest = previewCache.keys().next();
    if (!oldest.done) previewCache.delete(oldest.value);
  }
  previewCache.set(path, value);
}

// `null` = görsel değil ya da okunamadı; ikonlu çipe düşülür.
function usePreview(path: string): string | null {
  const [url, setUrl] = useState<string | null>(() => previewCache.get(path) ?? null);

  useEffect(() => {
    const cached = previewCache.get(path);
    if (cached !== undefined) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    window.api
      .readChatAttachmentPreview(path)
      .then((result) => {
        const value = result.ok && result.dataUrl ? result.dataUrl : null;
        rememberPreview(path, value);
        if (!cancelled) setUrl(value);
      })
      .catch(() => {
        // Önizleme kozmetik — okunamaması bir hata olarak yüzeye çıkmıyor.
        rememberPreview(path, null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}

// `composer`: gönderilmeden önce, yazı kutusunun ÜSTÜNDE — silinebilir.
// `message`: gönderilmiş mesajın içinde — silinemez, görseller daha büyük.
//
// HER İKİ varyantta da ek TIKLANABİLİR (kullanıcı isteği, 2026-09-02: *"chate
// eklenilen görseller dosyalar önizleme yapılabilsin, ekranda büyütebilelim
// görebilelim tıklarsak"*):
//   - görsel  → tam boy katman (AttachmentLightbox)
//   - görsel değil → işletim sisteminin varsayılan uygulamasıyla açılır
// İkisi tek bir jestin iki karşılığı; "büyüt" bir PDF'te anlamsız, "aç" bir
// ekran görüntüsünde gereksiz bir uygulama açardı.
export default function AttachmentChip({
  attachment,
  variant,
  onRemove
}: {
  attachment: ChatAttachment;
  variant: "composer" | "message";
  onRemove?: (id: string) => void;
}) {
  const t = useT();
  const preview = usePreview(attachment.path);
  const [zoomed, setZoomed] = useState(false);
  // Yolun tamamı ekranda DEĞİL ama tooltip'te var: kullanıcı hangi dosya
  // olduğunu doğrulayabilmeli, sadece dosya adı iki farklı klasördeki aynı
  // ismi ayırt etmiyor.
  const title = attachment.path;

  // Açma hatası sessiz: bu kozmetik bir eylem ve bu bileşenin toast kanalı
  // yok — hata için tüm ağacı `pushToast` ile donatmak, kazandırdığından çok
  // bağ kurardı.
  const openExternal = () => {
    window.api.openExternal(attachment.path).catch(() => {});
  };
  const activate = () => (preview ? setZoomed(true) : openExternal());
  const actionTitle = preview ? t("axetCodeHome.attachmentZoom") : t("axetCodeHome.attachmentOpen");

  const lightbox =
    zoomed && preview ? (
      <AttachmentLightbox
        attachment={attachment}
        dataUrl={preview}
        onClose={() => setZoomed(false)}
        onOpenExternal={openExternal}
      />
    ) : null;

  if (variant === "message" && preview) {
    return (
      <>
        <button
          onClick={activate}
          title={`${attachment.name} — ${actionTitle}`}
          className="group/img relative cursor-zoom-in overflow-hidden rounded-xl"
        >
          <img src={preview} alt={attachment.name} className="max-h-44 max-w-[240px] object-cover" />
          {/* Büyütme imkânı hover'da GÖRÜNÜR hâle geliyor: `cursor-zoom-in`
              tek başına, fareyi zaten oraya götürmemiş kullanıcıya hiçbir şey
              anlatmıyor. */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100">
            <Maximize2 size={18} className="text-white" />
          </span>
        </button>
        {lightbox}
      </>
    );
  }

  return (
    <>
      <div
        title={title}
        className={`group/chip relative flex items-center gap-2 rounded-lg bg-base-800 ${
          variant === "composer" ? "py-1.5 pl-1.5 pr-2" : "px-2.5 py-1.5"
        }`}
      >
        {/* Çipin ADI + küçük resmi tek bir düğme: satırın tamamı tıklanabilir
            olsaydı, composer'daki "kaldır" düğmesine basmak aynı anda dosyayı
            da açardı. */}
        <button
          onClick={activate}
          title={actionTitle}
          className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
        >
          {preview ? (
            <img src={preview} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-base-700 text-slate-400">
              <FileText size={15} />
            </span>
          )}
          {/* `min-w-0` + `truncate`: uzun dosya adı composer'ı genişletmesin. */}
          <span className="min-w-0 max-w-[180px] truncate text-[12px] text-slate-300">{attachment.name}</span>
        </button>
        {variant === "composer" && onRemove && (
          <button
            onClick={() => onRemove(attachment.id)}
            title={t("axetCodeHome.attachmentRemove")}
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition hover:bg-base-700 hover:text-slate-200"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {lightbox}
    </>
  );
}
