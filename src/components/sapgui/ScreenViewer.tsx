import { useLayoutEffect, useRef, useState } from "react";
import { Camera, ImageOff, Loader2, RefreshCw } from "lucide-react";
import { useT } from "../../i18n";
import { EmptyState, GHOST_ICON_BUTTON, PanelHeader, Pill } from "./ui";
import type { GuiScriptComponentDetail, GuiScriptScreenshotMethod, GuiScriptScreenshotResult } from "../../../app-electron/shared/types";

// Canlı ekran görüntüsü paneli.
//
// NEDEN VAR: bu ekran daha önce SAP'yi yalnızca `GuiTextField` id'lerinden
// oluşan bir COM ağacı olarak gösteriyordu — kullanıcı otomasyonu KÖR
// yazıyordu. Artık gerçek ekran görünüyor.
//
// İKİ YAKALAMA YÖNTEMİ, farklı işler için:
//   window   — Win32 PrintWindow. COM'a hiç dokunmaz, dolayısıyla SCRIPTING
//              KAPALIYKEN BİLE çalışır. `auto`nun İLK tercihi budur.
//   hardcopy — SAP'nin KENDİ yakalaması. Bağlı bir DIAG oturumu ve açık
//              scripting şart, ve SAP penceresini kullanıcının üzerine
//              fırlatabiliyor (canlı ölçüm 2026-09-03) — bu yüzden `auto`da
//              yalnızca yedek. Elle seçilebilir kalıyor çünkü PrintWindow'un
//              başarısız olduğu bir sürücü/ekran kombinasyonunda son çare o.
//
// SEÇİLİ ELEMAN ÇERÇEVESİ sadece `window` yönteminde çizilir ve TAHMİN
// İÇERMEZ: köprü yakalamanın sol üst köşesinin mutlak ekran koordinatını
// (`originLeft/originTop`) döndürüyor, elemanın `screenLeft/screenTop`
// değeri de mutlak — fark doğrudan görüntü içi koordinat veriyor. HardCopy'de
// böyle bir köken bilgisi olmadığı için orada çerçeve BİLEREK çizilmiyor:
// yanlış yerde bir kutu, hiç kutu olmamasından kötüdür.

interface Props {
  shot: GuiScriptScreenshotResult | null;
  loading: boolean;
  method: GuiScriptScreenshotMethod;
  autoRefresh: boolean;
  selectedNode: GuiScriptComponentDetail | null;
  onMethodChange: (method: GuiScriptScreenshotMethod) => void;
  onAutoRefreshChange: (value: boolean) => void;
  onRefresh: () => void;
}

const METHODS: GuiScriptScreenshotMethod[] = ["auto", "hardcopy", "window"];

function numberProp(node: GuiScriptComponentDetail | null, key: string): number | null {
  const value = node?.properties?.[key];
  return typeof value === "number" ? value : null;
}

export default function ScreenViewer({
  shot,
  loading,
  method,
  autoRefresh,
  selectedNode,
  onMethodChange,
  onAutoRefreshChange,
  onRefresh
}: Props) {
  const t = useT();
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Görüntü CSS ile küçültülerek gösteriliyor; çerçeveyi doğru yere koymak
  // için gerçek piksel → görüntülenen piksel ölçeği gerekiyor.
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const update = () => {
      if (!el.naturalWidth) return;
      setScale(el.clientWidth / el.naturalWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shot?.dataUrl]);

  const screenLeft = numberProp(selectedNode, "screenLeft");
  const screenTop = numberProp(selectedNode, "screenTop");
  const elWidth = numberProp(selectedNode, "width");
  const elHeight = numberProp(selectedNode, "height");
  const canHighlight =
    shot?.method === "window" &&
    typeof shot.originLeft === "number" &&
    typeof shot.originTop === "number" &&
    screenLeft !== null &&
    screenTop !== null &&
    elWidth !== null &&
    elHeight !== null &&
    elWidth > 0 &&
    elHeight > 0;

  const highlight = canHighlight
    ? {
        left: (screenLeft! - shot!.originLeft!) * scale,
        top: (screenTop! - shot!.originTop!) * scale,
        width: elWidth! * scale,
        height: elHeight! * scale
      }
    : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <PanelHeader
        icon={<Camera size={12} className="text-slate-500" />}
        title={t("sapGuiScripting.screenTitle")}
        right={
          <>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => onAutoRefreshChange(e.target.checked)}
                className="cursor-pointer accent-[var(--accent-500)]"
              />
              {t("sapGuiScripting.autoRefresh")}
            </label>
            <select
              value={method}
              onChange={(e) => onMethodChange(e.target.value as GuiScriptScreenshotMethod)}
              className="ml-0.5 h-6 cursor-pointer rounded-md border border-line bg-control px-1.5 text-[11px] text-slate-200 outline-none focus:border-accent-500"
              title={t("sapGuiScripting.screenshotMethod")}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button onClick={onRefresh} disabled={loading} title={t("sapGuiScripting.refresh")} className={GHOST_ICON_BUTTON}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          </>
        }
      >
        {shot?.method && (
          <Pill>
            {shot.method}
            {shot.width && shot.height ? ` · ${shot.width}×${shot.height}` : ""}
          </Pill>
        )}
      </PanelHeader>

      <div className="relative flex min-h-0 flex-1 overflow-auto bg-app p-3">
        {shot?.dataUrl ? (
          // Ortalama `m-auto` ile yapılıyor, `items-center/justify-center` ile
          // DEĞİL: taşan içerikte flex ortalaması kutunun BAŞINI kırpıyor
          // (uzun bir SAP ekranının üst kenarı kaydırılamaz hâle geliyordu).
          // Otomatik kenar boşluğu, yer kalmadığında kendiliğinden 0 oluyor.
          <div className="relative m-auto inline-block">
            <img
              ref={imgRef}
              src={shot.dataUrl}
              alt={t("sapGuiScripting.screenTitle")}
              // Yalnızca GENİŞLİK sınırlanıyor: yüksekliği de sınırlamak
              // (`max-h-full`) sarmalayıcıyı görüntüden büyütür ve seçili
              // eleman çerçevesi kayar — çerçeve sarmalayıcıya göre konumlanıyor.
              // Uzun ekranlarda dış kutu zaten dikey kaydırıyor.
              className="max-w-full rounded-md border border-line"
            />
            {highlight && (
              <div
                className="pointer-events-none absolute rounded-[2px] ring-2 ring-accent-400"
                style={{
                  left: highlight.left,
                  top: highlight.top,
                  width: highlight.width,
                  height: highlight.height,
                  background: "rgba(56,189,248,0.12)"
                }}
              />
            )}
          </div>
        ) : (
          <EmptyState
            icon={loading ? <Loader2 size={22} className="animate-spin" /> : <ImageOff size={22} />}
            text={loading ? t("sapGuiScripting.screenLoading") : shot?.error || t("sapGuiScripting.screenEmpty")}
          />
        )}
      </div>

      {shot?.error && shot.dataUrl && (
        <div className="shrink-0 border-t border-line-subtle px-3 py-1 text-[10px] text-[var(--status-warning-text)]">{shot.error}</div>
      )}
      {selectedNode && !canHighlight && shot?.dataUrl && (
        <div className="shrink-0 border-t border-line-subtle px-3 py-1 text-[10px] text-slate-500">
          {t("sapGuiScripting.highlightUnavailable")}
        </div>
      )}
    </div>
  );
}
