import { AlertTriangle, ChevronRight, LogIn, Pencil, Terminal, Trash2 } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { systemAddress } from "./SystemInfoList";
import { Button } from "../ui/Button";
import { iconBtn, tintBtn } from "../ui/buttons";
import { formatRelativeTime } from "../lib/time";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

const STATE_LABEL: Record<ConnectivityState, TranslationKey> = {
  unknown: "statusDot.unknown",
  checking: "statusDot.checking",
  reachable: "statusDot.reachable",
  unreachable: "statusDot.unreachable"
};

function Warning({ text }: { text: string }) {
  return (
    <div
      className="animate-alert-slide-in flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
      style={{
        borderColor: "var(--status-danger-border)",
        backgroundColor: "var(--status-danger-bg)",
        color: "var(--status-danger-text)"
      }}
    >
      <AlertTriangle size={15} className="shrink-0" />
      {text}
    </div>
  );
}

export default function SystemHeader({
  path,
  service,
  state,
  tier,
  lastConnectedAt,
  onCheck,
  onConnect,
  onOpenSapLogon,
  onEditManual,
  onDeleteManual
}: {
  path: string[];
  service: SapService;
  state: ConnectivityState;
  tier: SystemTier | null;
  lastConnectedAt: string | null;
  onCheck: () => void;
  onConnect: () => void;
  onOpenSapLogon: () => void;
  onEditManual: () => void;
  onDeleteManual: () => void;
}) {
  const t = useT();
  // Alt satır: olmayan parça hiç yazılmıyor, ayracı da (spec §3.3).
  const facts = [
    systemAddress(service),
    service.type,
    lastConnectedAt
      ? t("systemPanel.lastConnected", { time: formatRelativeTime(lastConnectedAt, t) })
      : t("systemPanel.neverConnected")
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
        {path.map((segment, i) => (
          <span key={`${segment}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="shrink-0 text-slate-600" />}
            <span className="truncate">{segment}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="min-w-0 truncate text-lg font-semibold text-white" title={service.name}>
            {service.name}
          </h2>
          {tier && <TierBadge tier={tier} />}
          {/* Durum yazısı aynı zamanda "yeniden denetle" düğmesi (spec §3.2).
              Denetim sürerken devre dışı; bu tıklama 30 sn'lik pencereden
              geçmiyor, her seferinde gerçekten denetliyor. */}
          <button
            type="button"
            onClick={onCheck}
            disabled={state === "checking"}
            aria-label={`${t(STATE_LABEL[state])} · ${t("systemPanel.recheck")}`}
            title={t("systemPanel.recheck")}
            className="shrink-0 cursor-pointer rounded-full px-1.5 py-0.5 transition-colors hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
          >
            <StatusDot state={state} showLabel />
          </button>
          {service.isManual && (
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={onEditManual}
                aria-label={t("common.edit")}
                title={t("systemPanel.editTitle")}
                className={iconBtn("ghost", "sm")}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onDeleteManual}
                aria-label={t("common.delete")}
                title={t("systemPanel.deleteTitle")}
                className={iconBtn(
                  "ghost",
                  "sm",
                  "hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger-text)]"
                )}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <p className="truncate font-mono text-xs text-slate-500" title={facts}>
          {facts}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onConnect}>
          <Terminal size={15} />
          {t("systemPanel.openInAxet")}
        </Button>
        {/* Buradaki koşul, main tarafındaki `canOpenInSapLogon` ile AYNI
            olmak zorunda — ayrışırsa buton ya hiç görünmez ya da görünüp
            "missingHostOrPort" ile başarısız olur. Cloud testi sadece tipe
            bakar; ADT adresi girilmiş bir on-prem sistem hâlâ SAP GUI ile
            açılabilir. */}
        {service.type !== "BTP/CLOUD" && service.host && service.port && (
          <button
            type="button"
            onClick={onOpenSapLogon}
            title={t("systemPanel.openInSapLogonTitle")}
            className={tintBtn("sap", "lg", "gap-1.5 px-3")}
          >
            <LogIn size={15} />
            {t("systemPanel.openInSapLogon")}
          </button>
        )}
      </div>

      {state === "unreachable" && <Warning text={t("systemPanel.unreachableWarning")} />}
      {tier === "PRD" && <Warning text={t("systemPanel.prodWarning")} />}
    </header>
  );
}
