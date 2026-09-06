import { AlertCircle, AlertTriangle, CheckCircle2, Info, OctagonX } from "lucide-react";
import { useT } from "../../i18n";
import { TOOL_BUTTON } from "./ui";
import type { GuiScriptScreenState } from "../../../app-electron/shared/types";

// SAP durum çubuğu şeridi + popup şeridi.
//
// NEDEN VAR: `performAction` daha önce çıplak `{ok:true}` dönüyordu — bu COM
// çağrısının başarısını gösteriyordu, SAP'nin İŞLEMİ KABUL ETTİĞİNİ değil.
// SAP'nin reddettiği bir kayıt (yetki yok, alan hatalı, kilitli belge) COM
// seviyesinde pekâlâ "başarılı" olur ve ekranda yeşil görünürdü. Durum
// çubuğunun tipi bunu kesin olarak söyler: E (Error) ve A (Abort) GERÇEK
// hatadır, S/W/I bilgilendirmedir.

// Zeminler `color-mix` ile KENDİ metin renklerinden türetiliyor. Önceden elle
// yazılmış rgba üçlüleriydi (örn. `rgba(74,222,128,0.10)`) ve o sayılar eski
// paletin yeşilinden kopyalanmıştı — tema değişince metin jetonu kayıyor,
// zemin olduğu yerde kalıyordu. Türetme sayesinde jetonu değiştirmek yetiyor.
const tint = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

const TONES: Record<string, { icon: typeof Info; color: string; bg: string; labelKey: "success" | "warning" | "error" | "abort" | "info" }> = {
  S: { icon: CheckCircle2, color: "var(--status-success-text)", bg: tint("--status-success-text", 10), labelKey: "success" },
  W: { icon: AlertTriangle, color: "var(--status-warning-text)", bg: tint("--status-warning-text", 10), labelKey: "warning" },
  E: { icon: AlertCircle, color: "var(--status-danger-text)", bg: tint("--status-danger-text", 10), labelKey: "error" },
  A: { icon: OctagonX, color: "var(--status-danger-text)", bg: tint("--status-danger-text", 16), labelKey: "abort" },
  I: { icon: Info, color: "var(--status-info-text)", bg: tint("--status-info-text", 10), labelKey: "info" }
};

const LABEL_KEYS = {
  success: "sapGuiScripting.msgSuccess",
  warning: "sapGuiScripting.msgWarning",
  error: "sapGuiScripting.msgError",
  abort: "sapGuiScripting.msgAbort",
  info: "sapGuiScripting.msgInfo"
} as const;

interface Props {
  screen: GuiScriptScreenState | null;
  onPopupChoice: (choice: "enter" | "cancel" | "yes" | "no") => void;
  onPopupButton: (buttonId: string) => void;
  busy: boolean;
}

export default function StatusBarStrip({ screen, onPopupChoice, onPopupButton, busy }: Props) {
  const t = useT();
  const status = screen?.statusBar;
  const popup = screen?.popup;
  if (!status && !popup) return null;

  const tone = status ? TONES[status.type] ?? TONES.I : null;
  const ToneIcon = tone?.icon ?? Info;

  return (
    <div className="shrink-0 border-t border-line">
      {popup && (
        // Popup ŞERİDİ — eskiden `wnd[1]` ağaçta sıradan bir düğümdü ve
        // kullanıcı bir modal pencerenin açıldığını fark etmiyordu. Butonlar
        // SAP'nin GERÇEK butonlarından okunuyor (tahmin edilen SPOP id'leri
        // değil), yanlarında da standart enter/iptal kısayolları var.
        <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle bg-[rgba(147,197,253,0.07)] px-3 py-2">
          <span className="rounded-full bg-control px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {t("sapGuiScripting.popupBadge")}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-slate-200" title={`${popup.title}\n${popup.text}`}>
            <span className="font-medium">{popup.title}</span>
            {popup.text ? <span className="text-slate-400"> — {popup.text.replace(/\n/g, " · ")}</span> : null}
          </span>
          {popup.buttons.slice(0, 5).map((button) => (
            <button
              key={button.id}
              onClick={() => onPopupButton(button.id)}
              disabled={busy}
              title={button.tooltip || button.id}
              className={TOOL_BUTTON}
            >
              {button.text || button.tooltip || button.id.split("/").pop()}
            </button>
          ))}
          <button
            onClick={() => onPopupChoice("enter")}
            disabled={busy}
            className={TOOL_BUTTON}
          >
            {t("sapGuiScripting.popupEnter")}
          </button>
          <button
            onClick={() => onPopupChoice("cancel")}
            disabled={busy}
            className={TOOL_BUTTON}
          >
            {t("sapGuiScripting.popupCancel")}
          </button>
        </div>
      )}

      {status && status.text && (
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: tone?.bg }}>
          <ToneIcon size={13} className="shrink-0" style={{ color: tone?.color }} />
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: tone?.color }}>
            {t(LABEL_KEYS[tone?.labelKey ?? "info"])}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-slate-200" title={status.text}>
            {status.text}
          </span>
          {(status.messageId || status.messageNumber) && (
            <span className="shrink-0 font-mono text-[10px] text-slate-500">
              {status.messageId}
              {status.messageNumber ? `/${status.messageNumber}` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
