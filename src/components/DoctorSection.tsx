import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { DoctorReport, DoctorStatus } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";
import CopyButton from "./CopyButton";

/**
 * Ayarlar'daki "Ortam Hazırlık" bölümü.
 *
 * Buranın varlık sebebi: SAP tarafı bir Python sürecine dayanıyor ve o süreç
 * eksik bir pip paketi yüzünden açılmadığında kullanıcının gördüğü tek şey
 * "sunucu başlamadı" oluyordu — sebep log'un içinde, log da ekranda değil.
 *
 * Bu yüzden başarısız her satır İKİ şey gösteriyor: hatanın kendi metni ve
 * BT'ye olduğu gibi verilebilecek komut. Kurumsal makinede kullanıcının kendi
 * kuramadığı bir şey çıktığında sohbetin devamı "ne yazayım onlara?" oluyor;
 * cevabı satırın içinde duruyor.
 */

/** Nokta rengi — StatusDot'un aksine burada sağlık değil, teşhis sonucu. */
const DOT: Record<DoctorStatus, string> = {
  ok: "bg-[var(--status-success-text)]",
  warn: "bg-[var(--status-warning-text)]",
  fail: "bg-[var(--status-danger-text)]",
  info: "bg-slate-500",
  unknown: "bg-slate-600"
};

interface Props {
  /**
   * Her olcumden sonra cagriliyor — kenar cubugundaki ariza noktasi bu
   * ekranin sonucunu izliyor. Boylece kullanici eksik paketleri buradan
   * kurdugunda nokta ayni anda sonuyor; ikinci bir olcum gerekmiyor.
   */
  onReport?: (report: DoctorReport | null) => void;
}

export default function DoctorSection({ onReport }: Props) {
  const t = useT();
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installOutput, setInstallOutput] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const next = await window.api.runDoctor();
      setReport(next);
      onReport?.(next);
    } catch {
      setReport(null);
      onReport?.(null);
    } finally {
      setBusy(false);
    }
  }, [onReport]);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async () => {
    if (!report || report.missingPackages.length === 0 || installing) return;
    setInstalling(true);
    setInstallOutput(null);
    try {
      const result = await window.api.installPythonPackages(report.missingPackages);
      // Çıktı başarıda da gösteriliyor: pip "kurdum" derken bir paketi
      // atlayabiliyor ve sessiz bir başarı, o atlamayı görünmez kılardı.
      setInstallOutput(result.output || null);
    } catch (err) {
      setInstallOutput(String(err));
    } finally {
      setInstalling(false);
      // Ölçüm yeniden yapılıyor — kurulum sonrası satırların hâlâ "eksik"
      // demesi bu ekranın varlık sebebini yok ederdi.
      await load();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-slate-500">{t("doctorSection.hint")}</p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className={`${btn("neutral", "sm")} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <RefreshCw size={12} className={busy ? "animate-spin" : undefined} />
          {t("doctorSection.refresh")}
        </button>
      </div>

      {!report && !busy && <p className="text-xs text-slate-500">{t("doctorSection.failed")}</p>}

      {report && (
        <div className="divide-y divide-line/40 rounded-lg border border-line/50 bg-control/30">
          {report.rows.map((row) => (
            <div key={row.id} className="space-y-1.5 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[row.status]}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200">{t(`doctorSection.row.${row.id}`)}</div>
                  <div className="mt-0.5 break-words text-xs text-slate-500">{row.detail}</div>
                </div>
                {row.fixable && (
                  <button
                    type="button"
                    onClick={install}
                    disabled={installing}
                    className={`${btn("neutral", "sm")} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Download size={12} className={installing ? "animate-pulse" : undefined} />
                    {t("doctorSection.install")}
                  </button>
                )}
              </div>

              {row.command && (
                <div className="ml-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 rounded-md border border-line/50 bg-app/50 px-2 py-1">
                    <code className="min-w-0 flex-1 break-all font-mono text-2xs text-slate-300">
                      {row.command}
                    </code>
                    <CopyButton value={row.command} />
                  </div>
                  <p className="text-2xs text-slate-500">{t("doctorSection.commandCaption")}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {installOutput && (
        <pre className="max-h-40 overflow-auto rounded-lg border border-line/50 bg-app/50 p-2.5 font-mono text-2xs leading-relaxed text-slate-400">
          {installOutput}
        </pre>
      )}
    </div>
  );
}
