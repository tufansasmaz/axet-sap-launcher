import { AlertTriangle, CheckCircle2, Loader2, MonitorOff, RefreshCw, ShieldOff, XCircle } from "lucide-react";
import { useT } from "../../i18n";
import type { TranslationKey } from "../../i18n/tr";
import type { GuiScriptPreflight, GuiScriptPreflightRecommendation } from "../../../app-electron/shared/types";

// Teşhis sonucu → metin anahtarı. Şablon literal yerine açık bir tablo:
// yeni bir durum eklendiğinde `Record` eksik anahtarı derleme zamanında
// yakalar, `as never` gibi bir kaçış gerekmez.
const HEADLINE: Record<GuiScriptPreflightRecommendation, { title: TranslationKey; body: TranslationKey }> = {
  ready: { title: "sapGuiScripting.preflight.readyTitle", body: "sapGuiScripting.preflight.readyBody" },
  serverScriptingDisabled: {
    title: "sapGuiScripting.preflight.serverDisabledTitle",
    body: "sapGuiScripting.preflight.serverDisabledBody"
  },
  scriptingDisabled: { title: "sapGuiScripting.preflight.disabledTitle", body: "sapGuiScripting.preflight.disabledBody" },
  sapNotRunning: { title: "sapGuiScripting.preflight.notRunningTitle", body: "sapGuiScripting.preflight.notRunningBody" },
  sapGuiMissing: { title: "sapGuiScripting.preflight.missingTitle", body: "sapGuiScripting.preflight.missingBody" }
};

// Teşhis paneli — "neden çalışmıyor" sorusunu TAHMİN ETMEK YERİNE ÖLÇÜLEN
// verilerle yanıtlar. Köprünün `/preflight` uç noktası Win32 seviyesindeki
// SAP oturum penceresi sayısını ve scripting engine'in bildirdiği oturum
// sayısını AYRI AYRI okur; ikisinin farkı teşhisi kesinleştirir:
//   pencere var + scripting oturumu yok  →  scripting KAPALI (sunucu ya da
//   istemci tarafında), "SAP açık değil" ile karıştırılamaz.
// Eski hâli tek bir sabit "Gereksinimler" metniydi ve hangi maddenin bozuk
// olduğunu söyleyemiyordu.

interface Props {
  preflight: GuiScriptPreflight | null;
  loading: boolean;
  error: string | null;
  onRecheck: () => void;
}

export default function PreflightPanel({ preflight, loading, error, onRecheck }: Props) {
  const t = useT();
  const rec = preflight?.recommendation ?? null;

  const tone =
    rec === "ready"
      ? { icon: CheckCircle2, color: "var(--status-success-text)", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.30)" }
      : rec === "scriptingDisabled" || rec === "serverScriptingDisabled"
        ? { icon: ShieldOff, color: "var(--status-warning-text)", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.30)" }
        : rec === "sapNotRunning"
          ? { icon: MonitorOff, color: "var(--status-warning-text)", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.30)" }
          : { icon: XCircle, color: "var(--status-danger-text)", bg: "rgba(244,113,138,0.08)", border: "rgba(244,113,138,0.30)" };
  const ToneIcon = loading ? Loader2 : tone.icon;

  const headline = rec
    ? t(HEADLINE[rec].title)
    : loading
      ? t("sapGuiScripting.preflight.checking")
      : t("sapGuiScripting.preflight.unknownTitle");
  const body = rec ? t(HEADLINE[rec].body) : error ?? t("sapGuiScripting.preflight.checking");

  // Ölçüm satırları — teşhisin DAYANAĞI. Kullanıcı "sen nereden biliyorsun"
  // diye sorabilsin diye ham sayılar bilerek gösteriliyor.
  const measurements: { label: string; value: string; ok: boolean | null }[] = preflight
    ? [
        { label: t("sapGuiScripting.preflight.mInstalled"), value: preflight.sapGuiInstalled ? t("sapGuiScripting.yes") : t("sapGuiScripting.no"), ok: preflight.sapGuiInstalled },
        { label: t("sapGuiScripting.preflight.mWindows"), value: String(preflight.classicWindows), ok: preflight.classicWindows > 0 },
        { label: t("sapGuiScripting.preflight.mAttachable"), value: preflight.scriptingAttachable ? t("sapGuiScripting.yes") : t("sapGuiScripting.no"), ok: preflight.scriptingAttachable },
        { label: t("sapGuiScripting.preflight.mSessions"), value: String(preflight.sessions), ok: preflight.sessions > 0 },
        { label: t("sapGuiScripting.preflight.mConnections"), value: String(preflight.connections), ok: null },
        // Sunucu bayrağı: teşhisi ikiye bölen ölçüm. `null` = bu GUI sürümü
        // bildirmiyor; "kapalı değil" ile karıştırılmaması için ayrı metin.
        {
          label: t("sapGuiScripting.preflight.mDisabledByServer"),
          value:
            preflight.connectionDetails.length === 0
              ? t("sapGuiScripting.unknown")
              : preflight.connectionDetails.some((c) => c.disabledByServer === null)
                ? t("sapGuiScripting.unknown")
                : preflight.disabledByServer
                  ? t("sapGuiScripting.yes")
                  : t("sapGuiScripting.no"),
          ok: preflight.disabledByServer ? false : null
        },
        ...(preflight.guiVersion
          ? [{ label: t("sapGuiScripting.preflight.mGuiVersion"), value: preflight.guiVersion, ok: null }]
          : [])
      ]
    : [];

  // Sunucu KESİN olarak reddediyorsa istemci rehberi GÖSTERİLMEZ: bağlantı
  // listesi okunabildiğine göre istemci ayarı zaten açık, ve orada boşuna
  // vakit harcatmak teşhisin değerini düşürür.
  const showServerGuide = rec === "scriptingDisabled" || rec === "serverScriptingDisabled";
  const showClientGuide = rec === "scriptingDisabled";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <div className="rounded-lg border p-4" style={{ background: tone.bg, borderColor: tone.border }}>
        <div className="flex items-start gap-3">
          <ToneIcon size={20} className={loading ? "mt-0.5 shrink-0 animate-spin" : "mt-0.5 shrink-0"} style={{ color: tone.color }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-100">{headline}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{body}</p>
          </div>
          <button
            onClick={onRecheck}
            disabled={loading}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-base-700 bg-base-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-base-700 disabled:cursor-default disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {t("sapGuiScripting.preflight.recheck")}
          </button>
        </div>
      </div>

      {preflight && (
        <div className="rounded-lg border border-base-700 bg-base-900 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("sapGuiScripting.preflight.measurementsTitle")}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {measurements.map((m) => (
              <div key={m.label} className="flex items-center justify-between gap-3 border-b border-base-800/60 py-1 text-xs last:border-0">
                <span className="text-slate-400">{m.label}</span>
                <span
                  className="font-mono"
                  style={{ color: m.ok === null ? "#94a3b8" : m.ok ? "var(--status-success-text)" : "var(--status-warning-text)" }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
          {preflight.scriptingError && (
            <p className="mt-3 rounded-md bg-base-850 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
              {preflight.scriptingError}
            </p>
          )}
          {!preflight.screenshotFallback && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[var(--status-warning-text)]">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {t("sapGuiScripting.preflight.noScreenshotFallback")}
            </p>
          )}
        </div>
      )}

      {preflight && preflight.connectionDetails.length > 0 && (
        <div className="rounded-lg border border-base-700 bg-base-900 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("sapGuiScripting.preflight.connectionsTitle")}
          </div>
          <ul className="mt-2 space-y-1">
            {preflight.connectionDetails.map((conn) => (
              <li key={conn.index} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="min-w-0 truncate font-mono text-slate-300" title={conn.description}>
                  {conn.description || `#${conn.index}`}
                </span>
                <span className="shrink-0 text-slate-500">
                  {t("sapGuiScripting.preflight.connSessions", { count: conn.sessions })}
                  {conn.disabledByServer ? (
                    <span className="ml-2 rounded-full bg-[rgba(251,191,36,0.14)] px-1.5 py-0.5 text-[10px] text-[var(--status-warning-text)]">
                      {t("sapGuiScripting.preflight.connDisabledBadge")}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(showServerGuide || showClientGuide) && (
        <div className={`grid gap-4 ${showClientGuide ? "sm:grid-cols-2" : ""}`}>
          {showServerGuide && (
            <div className="rounded-lg border border-base-700 bg-base-900 p-4">
              <h3 className="text-xs font-semibold text-slate-100">{t("sapGuiScripting.preflight.serverTitle")}</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-slate-400">
                <li>{t("sapGuiScripting.preflight.serverStep1")}</li>
                <li>{t("sapGuiScripting.preflight.serverStep2")}</li>
              </ol>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--status-warning-text)]">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                {t("sapGuiScripting.preflight.serverBasisNote")}
              </p>
            </div>
          )}
          {showClientGuide && (
            <div className="rounded-lg border border-base-700 bg-base-900 p-4">
              <h3 className="text-xs font-semibold text-slate-100">{t("sapGuiScripting.preflight.clientTitle")}</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-slate-400">
                <li>{t("sapGuiScripting.preflight.clientStep1")}</li>
                <li>{t("sapGuiScripting.preflight.clientStep2")}</li>
                <li>{t("sapGuiScripting.preflight.clientStep3")}</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {preflight && preflight.windows.length > 0 && (
        <div className="rounded-lg border border-base-700 bg-base-900 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("sapGuiScripting.preflight.windowsTitle")}
          </div>
          <ul className="mt-2 space-y-0.5">
            {preflight.windows.map((w) => (
              <li key={w.handle} className="truncate font-mono text-[11px] text-slate-400" title={w.title}>
                {w.title || `#${w.handle}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
