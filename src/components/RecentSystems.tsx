import { Clock, Server } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { resolveTier } from "../lib/tier";
import { formatRelativeTime } from "../lib/time";
import { useT } from "../i18n";

interface RecentEntry {
  path: string[];
  service: SapService;
  itemUuid: string;
  connectedAt: string;
}

interface Props {
  entries: RecentEntry[];
  selectedUuid: string | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  onSelect: (path: string[], service: SapService, itemUuid: string) => void;
}

export default function RecentSystems({ entries, selectedUuid, connectivity, tierOverrides, onSelect }: Props) {
  const t = useT();
  if (entries.length === 0) return null;

  return (
    <div className="mb-3 border-b border-base-700 pb-3">
      <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <Clock size={12} />
        {t("recentSystems.heading")}
      </div>
      <div className="space-y-0.5">
        {entries.map((entry) => {
          const isSelected = selectedUuid === entry.itemUuid;
          const state = connectivity[entry.service.uuid] ?? "unknown";
          const tier = resolveTier(entry.service, tierOverrides);
          return (
            <button
              key={entry.itemUuid}
              onClick={() => onSelect(entry.path, entry.service, entry.itemUuid)}
              title={entry.path.join(" / ")}
              className={`flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                isSelected ? "bg-accent-500/20 text-white" : "text-slate-300 hover:bg-base-700/60"
              }`}
            >
              <Server size={13} className="mt-1 shrink-0 text-[var(--navy-icon)]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate">{entry.service.name}</span>
                  {tier && <TierBadge tier={tier} />}
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                    {entry.service.systemId}
                  </span>
                  <StatusDot state={state} />
                </span>
                {/* Listenin adı "Son Bağlananlar" ama ne kadar "son" olduğu
                    hiçbir yerde yazmıyordu — `connectedAt` veri olarak zaten
                    taşınıyor, yalnızca gösterilmiyordu. */}
                <span className="block text-[10px] text-slate-500">
                  {formatRelativeTime(entry.connectedAt, t)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
