import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Cpu, AlertCircle } from "lucide-react";
import type { AxetModelEntry } from "../../app-electron/shared/types";
import { formatModelLabel, formatProviderLabel, modelKey } from "../lib/axetModels";
import { useT } from "../i18n";

interface Props {
  models: AxetModelEntry[];
  current: AxetModelEntry | null;
  loading: boolean;
  error: string | null;
  onSelect: (entry: AxetModelEntry) => void;
  // Aç​ılış yönü: composer bar'ları (axet.code sohbeti, ekranın ALTINDA)
  // "up" kullanır (menü yukarı açılır, aşağıda yer yok); axet.flows'un
  // ChatPanel başlığı gibi bir panelin ÜSTÜNDEKİ tetikleyiciler "down"
  // kullanmalı (menü aşağı açılır). Varsayılan "up" — mevcut composer
  // kullanımlarını değiştirmemek için.
  direction?: "up" | "down";
  // Tetikleyicinin görünümü. `outline` (varsayılan) kenarlıklı hap — axet.flows
  // ChatPanel gibi mevcut kullanımlar bunu bekliyor. `filled`, axet.code sohbet
  // ekranının Gemini düzeni için: orada KURAL kenarlık yerine dolgu (bkz.
  // ChatSessionPane.tsx üstündeki not), kenarlıklı bir hap tek başına yabancı
  // duruyordu. Varsayılanı değiştirmek diğer ekranların görünümünü bozardı.
  //
  // `ghost`: seçici artık COMPOSER'IN İÇİNDE (kullanıcı isteği, 2026-09-02),
  // yani kendisi zaten dolgulu bir kutunun içinde duruyor. Orada ikinci bir
  // dolgu ya da kenarlık, kutunun içine ikinci bir kutu çizmek olurdu — bu
  // varyantın zemini yok, sadece hover'da beliriyor.
  variant?: "outline" | "filled" | "ghost";
}

// axet.code'un birincil ("large") modelini seçmek için — `axet-code models`
// çıktısından türeyen listeyi sağlayıcıya (provider) göre gruplayıp gösteren
// özel bir dropdown. Native <select> KULLANILMADI çünkü provider gruplaması +
// uygulamanın kendi tema renkleri/köşe yuvarlaklığı ile tutarlı bir görünüm
// native select'te mümkün değil.
export default function ModelSelector({
  models,
  current,
  loading,
  error,
  onSelect,
  direction = "up",
  variant = "outline"
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Menü varsayılan olarak SOLA hizalı açılıyor (`left-0`) — bu tetikleyici
    // ekranın sağ tarafındaki bir panelde (örn. axet.flows'un ChatPanel
    // başlığı) olduğunda sabit `w-72` (288px) genişlik ekranın sağından
    // TAŞIP kırpılıyordu. Açılırken tetikleyicinin gerçek konumunu ölçüp
    // taşma olacaksa SAĞA hizalıyoruz (`right-0`) — ekran boyutu/panel
    // genişliği ne olursa olsun menü her zaman görünür alanda kalır.
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 288;
      setAlignRight(rect.left + menuWidth > window.innerWidth - 8);
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, AxetModelEntry[]>();
    for (const entry of models) {
      const list = map.get(entry.provider) ?? [];
      list.push(entry);
      map.set(entry.provider, list);
    }
    return Array.from(map.entries());
  }, [models]);

  const currentLabel = current ? formatModelLabel(current) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        title={t("modelSelector.title")}
        className={`flex cursor-pointer items-center gap-1.5 text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === "filled"
            ? "rounded-full bg-card px-3.5 py-2 text-[13px] hover:bg-hover"
            : variant === "ghost"
              ? // Yükseklik SABİT 36px — composer satırındaki ataç/mikrofon/
                // gönder düğmeleriyle aynı. Dikey dolgudan türeyen yükseklik
                // (`py-1.5`) ~30px kalıyordu ve satır `items-end` hizalandığı
                // için seçici komşularından birkaç piksel AŞAĞIDA duruyordu
                // (kullanıcı: *"model seçimi boxu tam ortalamıyor gibi hafif
                // altta kalmış"*).
                "h-9 rounded-md px-2 text-[12px] text-slate-400 hover:bg-hover hover:text-slate-200"
              : "rounded-full border border-line bg-transparent px-2.5 py-1.5 text-xs hover:border-line-strong hover:bg-hover"
        }`}
      >
        <Cpu size={13} className="text-accent-400" />
        {/* Composer içindeki varyantta daha dar: orada bu etiket yazı
            alanıyla aynı satırı paylaşıyor, 160px'i yazıdan çalardı. */}
        <span className={`truncate font-medium ${variant === "ghost" ? "max-w-[120px]" : "max-w-[160px]"}`}>
          {loading ? t("modelSelector.loading") : currentLabel ?? t("modelSelector.placeholder")}
        </span>
        <ChevronDown size={12} className={`text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`animate-modal-pop-in absolute z-50 w-72 overflow-hidden rounded-lg border border-line bg-card shadow-2xl shadow-black/40 ${
            alignRight ? "right-0" : "left-0"
          } ${direction === "down" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
        >
          <div className="border-b border-line px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t("modelSelector.heading")}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {error && (
              <div className="mx-2 my-1.5 flex items-start gap-1.5 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-2.5 py-2 text-[11px] text-[var(--status-danger-text)]">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                {t("modelSelector.loadError", { message: error })}
              </div>
            )}
            {!error && grouped.length === 0 && !loading && (
              <div className="px-3 py-3 text-xs text-slate-500">{t("modelSelector.empty")}</div>
            )}
            {grouped.map(([provider, entries]) => (
              <div key={provider} className="px-1.5 py-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {formatProviderLabel(provider)}
                </div>
                {entries.map((entry) => {
                  const isCurrent = current ? modelKey(current) === modelKey(entry) : false;
                  return (
                    <button
                      key={modelKey(entry)}
                      onClick={() => {
                        onSelect(entry);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                        isCurrent ? "bg-accent-500/15 text-[var(--accent-soft-text)]" : "text-slate-300 hover:bg-hover"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{formatModelLabel(entry)}</span>
                      {isCurrent && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Seçim `axet-code`'un global "large" model ayarını yazıyor (bkz.
              AxetCodeHome `handleSelectModel`), yani sadece bu sohbeti değil
              yeni sohbetleri de etkiliyor. Bu davranışı açıklayan i18n metni
              zaten yazılmıştı ama HİÇBİR yerde kullanılmıyordu — kullanıcı
              seçimin kapsamını tahmin etmek zorunda kalıyordu. */}
          {!error && grouped.length > 0 && (
            <div className="border-t border-line px-3 py-2">
              <span className="text-[10px] leading-relaxed text-slate-500">
                {t("modelSelector.appliesNextChatHint")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
