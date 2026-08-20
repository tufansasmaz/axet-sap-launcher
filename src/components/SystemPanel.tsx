import { useEffect } from "react";
import { Cable, RefreshCw, Terminal, Router as RouterIcon, Hash, Globe, Trash2, Pencil, AlertTriangle, History } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import CopyButton from "./CopyButton";
import { resolveTier } from "../lib/tier";
import { formatRelativeTime } from "../lib/time";
import { useT } from "../i18n";

interface Selection {
  path: string[];
  service: SapService;
  itemUuid: string;
}

interface Props {
  selection: Selection | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  lastConnectedAt: string | null;
  onCheck: (service: SapService) => void;
  onConnect: (selection: Selection) => void;
  onEditManual: (service: SapService) => void;
  onDeleteManual: (service: SapService) => void;
  onSetTier: (service: SapService, tier: SystemTier | null) => void;
}

const TIER_OPTIONS: SystemTier[] = ["DEV", "QA", "PRD"];

export default function SystemPanel({
  selection,
  connectivity,
  tierOverrides,
  lastConnectedAt,
  onCheck,
  onConnect,
  onEditManual,
  onDeleteManual,
  onSetTier
}: Props) {
  const t = useT();
  useEffect(() => {
    if (selection) onCheck(selection.service);
  }, [selection?.itemUuid]);

  if (!selection) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <Cable size={40} className="mb-3 opacity-40" />
        <p className="text-sm">{t("systemPanel.emptyState")}</p>
      </div>
    );
  }

  const { service, path } = selection;
  const state = connectivity[service.uuid] ?? "unknown";
  const tier = resolveTier(service, tierOverrides);
  const explicitTier = tierOverrides[service.uuid] ?? null;

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">{path.join(" / ")}</div>
        {service.isManual && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditManual(service)}
              title={t("systemPanel.editTitle")}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-base-700"
            >
              <Pencil size={12} />
              {t("common.edit")}
            </button>
            <button
              onClick={() => onDeleteManual(service)}
              title={t("systemPanel.deleteTitle")}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-400 hover:bg-rose-950/40"
            >
              <Trash2 size={12} />
              {t("common.delete")}
            </button>
          </div>
        )}
      </div>
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-2xl font-semibold text-white">{service.name}</h2>
        {tier && <TierBadge tier={tier} />}
      </div>

      <div className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <History size={13} />
        {lastConnectedAt ? (
          <span>{t("systemPanel.lastConnected", { time: formatRelativeTime(lastConnectedAt, t) })}</span>
        ) : (
          <span>{t("systemPanel.neverConnected")}</span>
        )}
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-base-700 bg-base-900/40 px-4 py-3">
        <span className="text-xs text-slate-500">{t("systemPanel.tierLabel")}</span>
        <div className="flex items-center gap-1.5">
          {TIER_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => onSetTier(service, explicitTier === option ? null : option)}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                explicitTier === option
                  ? "border-accent-500 bg-accent-500/20 text-white"
                  : "border-base-600 text-slate-400 hover:bg-base-700"
              }`}
            >
              {option}
            </button>
          ))}
          {explicitTier && (
            <button
              onClick={() => onSetTier(service, null)}
              className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-300"
            >
              {t("systemPanel.clearTier")}
            </button>
          )}
        </div>
        {!explicitTier && tier && <span className="text-[11px] text-slate-500">{t("systemPanel.autoGuessed")}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-base-700 bg-base-900/60 p-5">
        <div>
          <div className="text-xs text-slate-500">{t("systemPanel.systemId")}</div>
          <div className="font-mono text-sm text-slate-200">{service.systemId || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("systemPanel.connectionType")}</div>
          <div className="text-sm text-slate-200">{service.type}</div>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Globe size={14} className="text-slate-500" />
          <span className="break-all font-mono text-sm text-slate-200">
            {service.manualAdtUrl
              ? service.manualAdtUrl
              : `${service.host ?? "?"}${service.port ? `:${service.port}` : ""}`}
          </span>
          <CopyButton
            value={service.manualAdtUrl ?? `${service.host ?? ""}${service.port ? `:${service.port}` : ""}`}
            title={t("systemPanel.copyAddress")}
          />
        </div>
        {service.routerString && (
          <div className="col-span-2 flex items-start gap-2">
            <RouterIcon size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <span className="break-all font-mono text-xs text-slate-400">{service.routerString}</span>
          </div>
        )}
        <div className="col-span-2 flex items-center gap-2">
          <Hash size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500">{t("systemPanel.uuidLabel", { uuid: service.uuid })}</span>
          <CopyButton value={service.uuid} title={t("systemPanel.copyUuid")} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-base-700 bg-base-900/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <StatusDot state={state} showLabel />
        </div>
        <button
          onClick={() => onCheck(service)}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700"
        >
          <RefreshCw size={13} className={state === "checking" ? "animate-spin" : ""} />
          {t("systemPanel.recheck")}
        </button>
      </div>

      {state === "unreachable" && (
        <div
          className="mt-4 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--status-danger-border)",
            backgroundColor: "var(--status-danger-bg)",
            color: "var(--status-danger-text)"
          }}
        >
          {t("systemPanel.unreachableWarning")}
        </div>
      )}

      {tier === "PRD" && (
        <div
          className="mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--status-danger-border)",
            backgroundColor: "var(--status-danger-bg)",
            color: "var(--status-danger-text)"
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          {t("systemPanel.prodWarning")}
        </div>
      )}

      <button
        onClick={() => onConnect(selection)}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-accent-500/20 transition hover:bg-accent-400"
      >
        <Terminal size={16} />
        {t("systemPanel.openInAxet")}
      </button>
    </div>
  );
}
