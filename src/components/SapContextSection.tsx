import { useCallback, useEffect, useState } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import type { SapContextPreview } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";
import CopyButton from "./CopyButton";

/**
 * Hazırlık ekranındaki "Ajan ne görüyor" bölümü.
 *
 * Kullanıcı reçeteyi dolduruyor, sisteme bağlanıyor, yetenekler kuruluyor —
 * ve bütün bunların ajana NASIL göründüğünü hiç görmüyordu. Ekranın diğer üç
 * kartı hep "ne verdim" tarafını gösteriyor; bu kart tek başına "ne gitti"
 * tarafı. İkisi arasındaki farkı ancak dosyayı okuyarak fark edebilirsin ve
 * dosya proje klasörünün içinde, kimsenin açmadığı bir yerde duruyordu.
 *
 * DÜZENLENEBİLİR DEĞİL, bilerek. `sap-context.md`'nin sahibi launcher: her
 * bağlanışta dosyayı sıfırdan üretiyor. Buraya bir düzenleme kutusu koymak,
 * bir sonraki bağlantıda sessizce silinen bir metin kutusu koymak olurdu —
 * yani veri kaybı. Kullanıcının kendi yazdıkları yalnızca notlar
 * işaretçisinin ardında hayatta kalıyor, "notların korunuyor" rozeti de tam
 * olarak bunu söylüyor.
 */
export default function SapContextSection({ projectDir }: { projectDir: string | null }) {
  const t = useT();
  const [preview, setPreview] = useState<SapContextPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!projectDir) {
      setPreview(null);
      return;
    }
    setBusy(true);
    void window.api
      .getSapContext(projectDir)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setBusy(false));
  }, [projectDir]);

  useEffect(load, [load]);

  if (!projectDir) return <p className="text-xs text-slate-500">{t("projectBrief.noProject")}</p>;
  if (!preview) return <p className="text-xs text-slate-500">{t("common.loading")}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs leading-relaxed text-slate-500">{t("sapContext.hint")}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className={`${btn("neutral", "sm")} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <RefreshCw size={12} className={busy ? "animate-spin" : undefined} />
            {t("sapContext.refresh")}
          </button>
          {preview.exists && (
            <button
              type="button"
              onClick={() => void window.api.openInExplorer(preview.path)}
              className={btn("neutral", "sm")}
            >
              <FolderOpen size={12} />
              {t("sapContext.reveal")}
            </button>
          )}
        </div>
      </div>

      {!preview.exists ? (
        // Dosyanın olmaması bir arıza DEĞİL: henüz hiçbir sisteme
        // bağlanılmamış demek. O yüzden hata rengi yok, yapılacak iş yazıyor.
        <p className="rounded-md border border-line-subtle bg-control px-3 py-2 text-xs leading-relaxed text-slate-500">
          {t("sapContext.missing")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{t("sapContext.lines", { count: preview.lineCount })}</span>
            {preview.modifiedAt && (
              <span>{t("sapContext.updated", { time: new Date(preview.modifiedAt).toLocaleString() })}</span>
            )}
            {/* Rozet turkuaz-yeşil (durum sağlığı), accent DEĞİL: accent bu
                uygulamanın her yerinde "seçili" demek. */}
            {preview.hasUserNotes && (
              <span className="text-[var(--status-success-text)]">{t("sapContext.notesKept")}</span>
            )}
            <CopyButton value={preview.content} />
          </div>

          {preview.truncated && <p className="text-xs text-[var(--status-warning-text)]">{t("sapContext.truncated")}</p>}

          {/* Kaydırma kutusu SABİT yükseklikte: dosya birkaç yüz satır ve
              kartın tamamını uzatsaydı ekranın altındaki teşhis bölümü
              erişilemez hâle gelirdi. */}
          <pre className="max-h-80 overflow-auto rounded-md border border-line bg-control px-3 py-2 text-xs leading-relaxed text-slate-300">
            {preview.content}
          </pre>
        </>
      )}
    </div>
  );
}
