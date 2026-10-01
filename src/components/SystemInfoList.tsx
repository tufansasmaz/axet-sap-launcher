import type { ReactNode } from "react";
import type { SapService, SystemTier } from "../../app-electron/shared/types";
import CopyButton from "./CopyButton";
import { useT } from "../i18n";

const TIER_OPTIONS: SystemTier[] = ["DEV", "QA", "PRD"];

const TIER_ACCENT: Record<SystemTier, { border: string; bg: string; text: string }> = {
  DEV: { border: "var(--tier-dev-border)", bg: "var(--tier-dev-bg)", text: "var(--tier-dev-text)" },
  QA: { border: "var(--tier-qa-border)", bg: "var(--tier-qa-bg)", text: "var(--tier-qa-text)" },
  PRD: { border: "var(--tier-prd-border)", bg: "var(--tier-prd-bg)", text: "var(--tier-prd-text)" }
};

// "Adres" satırı sistemin AĞ kimliğini gösterir: host:port. ADT adresi artık
// on-prem sistemlerde de dolabildiği için ikisi aynı satırı paylaşamaz —
// paylaşsalardı ADT adresi girilen bir on-prem sistemin host:port'u panelde
// hiçbir yerde görünmezdi, üstelik hemen yanındaki "SAP Logon'da Aç" tam da
// o gizlenen host:port'a bağlanırdı. Cloud sistemlerde host yok, orada adres
// yine ADT URL'i.
export function systemAddress(service: SapService): string {
  return service.host
    ? `${service.host}${service.port ? `:${service.port}` : ""}`
    : (service.manualAdtUrl ?? "");
}

export function extraAdtUrl(service: SapService): string | null {
  return service.host && service.manualAdtUrl ? service.manualAdtUrl : null;
}

function Row({
  label,
  children,
  copyValue,
  copyTitle
}: {
  label: string;
  children: ReactNode;
  copyValue?: string;
  copyTitle?: string;
}) {
  return (
    // `-mb-px`: alt çizgi listenin dışına bir piksel taşıyor, `dl`'deki
    // `overflow-hidden` son satırın(ların) çizgisini kesiyor. İki sütunda son
    // sıra bir ya da iki hücre olabildiği için `last:` yetmiyor.
    <div className="group -mb-px flex min-h-8 min-w-0 items-center gap-3 border-b border-line-subtle py-1.5">
      <dt className="w-24 shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 font-mono text-xs text-slate-200">{children}</dd>
      {copyValue && (
        // Kopyala düğmesi satırın üzerine gelince ya da klavyeyle odaklanınca
        // beliriyor; görünmezken de sekme sırasında duruyor.
        <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <CopyButton value={copyValue} title={copyTitle} />
        </div>
      )}
    </div>
  );
}

export default function SystemInfoList({
  service,
  tier,
  explicitTier,
  onSetTier
}: {
  service: SapService;
  tier: SystemTier | null;
  explicitTier: SystemTier | null;
  onSetTier: (tier: SystemTier | null) => void;
}) {
  const t = useT();
  const address = systemAddress(service);
  const adtUrl = extraAdtUrl(service);

  // Değeri olmayan satır hiç çizilmiyor ("—" yok). UUID her sistemde var.
  // Geniş kartta satırlar iki sütuna yayılıyor; eşik pencerenin değil kartın
  // genişliği, `min(100%,…)` dar kartta yatay taşmayı önlüyor.
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-8 overflow-hidden">
      {service.systemId && <Row label={t("systemPanel.systemId")}>{service.systemId}</Row>}
      {address && (
        <Row label={t("systemPanel.addressLabel")} copyValue={address} copyTitle={t("systemPanel.copyAddress")}>
          <span className="truncate" title={address}>
            {address}
          </span>
        </Row>
      )}
      {adtUrl && (
        <Row label={t("systemPanel.adtUrlLabel")} copyValue={adtUrl} copyTitle={t("systemPanel.copyAdtUrl")}>
          <span className="truncate" title={adtUrl}>
            {adtUrl}
          </span>
        </Row>
      )}
      {service.routerString && (
        <Row label={t("systemPanel.routerLabel")}>
          <span className="truncate" title={service.routerString}>
            {service.routerString}
          </span>
        </Row>
      )}
      <Row label={t("systemPanel.tierRow")}>
        <div className="flex items-center gap-0.5 rounded-md border border-line p-0.5 font-sans">
          {TIER_OPTIONS.map((option) => {
            const active = explicitTier === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onSetTier(active ? null : option)}
                className={`cursor-pointer rounded-sm px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide transition ${
                  active ? "" : "text-slate-400 hover:text-slate-200"
                }`}
                style={active ? { backgroundColor: TIER_ACCENT[option].bg, color: TIER_ACCENT[option].text } : undefined}
              >
                {option}
              </button>
            );
          })}
        </div>
        {explicitTier ? (
          <button
            type="button"
            onClick={() => onSetTier(null)}
            className="cursor-pointer font-sans text-2xs text-slate-500 hover:text-slate-300"
          >
            {t("systemPanel.clearTier")}
          </button>
        ) : tier ? (
          <span className="font-sans text-2xs text-slate-500">{t("systemPanel.autoGuessed")}</span>
        ) : null}
      </Row>
      <Row label={t("systemPanel.uuid")} copyValue={service.uuid} copyTitle={t("systemPanel.copyUuid")}>
        <span className="truncate text-slate-400" title={service.uuid}>
          {service.uuid}
        </span>
      </Row>
    </dl>
  );
}
