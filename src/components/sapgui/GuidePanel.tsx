import { X } from "lucide-react";
import { useT } from "../../i18n";

// "Nasıl kullanılır" çekmecesi.
//
// NEDEN VAR: bu ekranın öğrenme eğrisi kendi karmaşıklığından değil, SAP'nin
// görünmeyen kurallarından geliyor — scripting'in iki ayrı kapısı olması,
// sunucu ayarının ancak yeniden logon'da geçerli olması, soluk bir tuşun
// bizim değil SAP'nin reddi olması, F1'in "çalıştığı halde bir şey olmamış
// gibi" görünmesi. Kullanıcı bunları ancak DENEYİP hata alarak öğreniyordu.
//
// İçerik i18n'de duruyor (tr/en); burada sadece sıralanıyor. Adımlar
// KULLANIM SIRASIYLA, ipuçları ise "canlı sistemde gerçekten başımıza
// gelenler" olarak ayrı bölümde.

const STEPS = [1, 2, 3, 4, 5, 6] as const;
const TIPS = [1, 2, 3, 4] as const;

interface Props {
  onClose: () => void;
}

export default function GuidePanel({ onClose }: Props) {
  const t = useT();

  return (
    // Ekranın üstüne binen bir çekmece: kullanıcı rehberi okurken SAP ekranını
    // da görebilsin diye tam ekran değil, sağda dar bir sütun.
    <div className="absolute inset-0 z-30 flex justify-end bg-[var(--overlay-scrim)]" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-base-700 bg-base-900 shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-base-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{t("sapGuiScripting.guideTitle")}</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-base-800 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="rounded-md border border-base-700 bg-base-800 px-3 py-2 text-xs leading-relaxed text-slate-300">
            {t("sapGuiScripting.guideIntro")}
          </p>

          <ol className="mt-4 space-y-3">
            {STEPS.map((n) => (
              <li key={n} className="rounded-md border border-base-800 bg-base-950/40 px-3 py-2.5">
                <h3 className="text-xs font-semibold text-slate-100">{t(`sapGuiScripting.guideStep${n}Title`)}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  {t(`sapGuiScripting.guideStep${n}Body`)}
                </p>
              </li>
            ))}
          </ol>

          <h3 className="mt-5 text-xs font-semibold text-slate-100">{t("sapGuiScripting.guideTipsTitle")}</h3>
          <ul className="mt-2 space-y-2">
            {TIPS.map((n) => (
              <li key={n} className="flex gap-2 text-[11px] leading-relaxed text-slate-400">
                <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                <span>{t(`sapGuiScripting.guideTip${n}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
