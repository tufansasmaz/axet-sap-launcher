import { useEffect, useState } from "react";
import { Check, Lock, PenLine } from "lucide-react";
import type { SystemTier } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";
import TierBadge from "./TierBadge";

interface Props {
  open: boolean;
  /** Sistemin ekranda görünen adı; hangi sistem için sorulduğu belli olsun. */
  systemLabel: string;
  /** Addan tahmin (`guessTier`). Yalnızca İPUCU — seçili gelmiyor. */
  guess: SystemTier | null;
  onChoose: (tier: SystemTier) => void;
  /** Kaydetmeden devam: sistem işaretsiz kalır, salt okunur bağlanılır. */
  onSkip: () => void;
}

const TIERS: SystemTier[] = ["DEV", "QA", "PRD"];

/**
 * İşaretsiz sisteme bağlanırken "bu sistem hangisi?" sorusu.
 *
 * Kullanıcı kararı (2026-09-23): *"Sadece dev sisteminde geliştirme
 * sisteminde yazma olarak açılsın diğer sistemlerde readonly modda
 * açılsın"*. Yazma kapısı `.conn_adt`'taki `ADT_SAP_TIER`'a bakıyor ve
 * işaretsiz sistem QA yazılıyor (bkz. launcher `buildConnAdt`). Bu pencere
 * olmadan geliştirici DEV sistemine bağlanıp neden yazamadığını ajandan
 * öğrenirdi; burada, kararın verildiği anda soruluyor.
 *
 * Cevap `systemTiers`'a yazılıyor ve o sistem için BİR DAHA sorulmuyor
 * (sistem panelindeki rozetten değiştirilebilir). "Şimdi değil" hiçbir şey
 * kaydetmiyor: bağlantı salt okunur kurulur, bir sonraki bağlanışta yine
 * sorulur.
 *
 * Addan tahmin (`guessTier`) SEÇİLİ GELMİYOR, yalnızca ipucu olarak
 * gösteriliyor. Adında "DEV" geçen bir sistemi önceden seçmek, yazmayı tek
 * tıkla açmak olurdu — ve adlar yalan söyleyebiliyor (müşterinin "DEV2"si
 * pekâlâ bir kalite sistemi olabilir).
 */
export default function TierPromptModal({ open, systemLabel, guess, onChoose, onSkip }: Props) {
  const t = useT();
  const [tier, setTier] = useState<SystemTier | null>(null);

  // Her açılışta sıfırdan: bir önceki sistem için yapılan seçim bu sisteme
  // taşınmasın.
  useEffect(() => {
    if (open) setTier(null);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="animate-backdrop-fade-in fixed inset-0 z-[65] flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onSkip();
      }}
    >
      <div className="animate-modal-pop-in flex w-[520px] flex-col rounded-2xl border border-line/60 bg-card shadow-2xl shadow-black/50">
        <div className="border-b border-line/50 px-6 py-4">
          <h3 className="text-base font-semibold text-white">{t("tierPrompt.title")}</h3>
          <p className="mt-1 text-xs text-slate-400">{t("tierPrompt.subtitle", { system: systemLabel })}</p>
        </div>

        <div className="space-y-2 px-6 py-4">
          {TIERS.map((id) => {
            const selected = tier === id;
            const Icon = id === "DEV" ? PenLine : Lock;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTier(id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                  selected
                    ? "border-lime-400/60 bg-lime-400/10"
                    : "border-line/60 bg-control/40 hover:border-line hover:bg-control/70"
                }`}
              >
                <Icon size={15} className={`mt-0.5 shrink-0 ${selected ? "text-lime-300" : "text-slate-400"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <TierBadge tier={id} />
                    <span className="text-sm font-medium text-white">{t(`tierPrompt.option.${id}`)}</span>
                    {guess === id && <span className="text-2xs text-slate-500">{t("tierPrompt.guessHint")}</span>}
                    {selected && <Check size={13} className="text-lime-300" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                    {t(`tierPrompt.desc.${id}`)}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="pt-1 text-xs text-slate-500">{t("tierPrompt.changeLater")}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
          <button type="button" onClick={onSkip} className={DIALOG_CANCEL_BUTTON}>
            {t("tierPrompt.skip")}
          </button>
          <button
            type="button"
            disabled={tier === null}
            onClick={() => tier && onChoose(tier)}
            className={`${DIALOG_CONFIRM_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t("tierPrompt.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
