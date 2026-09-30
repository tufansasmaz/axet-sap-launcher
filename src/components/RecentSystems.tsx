import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { resolveTier } from "../lib/tier";
import { useT } from "../i18n";
import { ActiveLine } from "../shell/SidebarFooter";
import { SectionToggle, usePersistentCollapse } from "../ui/SectionToggle";

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

// Daraltma tercihinin anahtarı; neden localStorage, bkz. usePersistentCollapse.
const COLLAPSE_KEY = "axet.recentSystems.collapsed";

export default function RecentSystems({ entries, selectedUuid, connectivity, tierOverrides, onSelect }: Props) {
  const t = useT();
  const [collapsed, toggle] = usePersistentCollapse(COLLAPSE_KEY);

  if (entries.length === 0) return null;

  return (
    <div className="mb-3 border-b border-line pb-3">
      <SectionToggle
        label={t("recentSystems.heading")}
        count={entries.length}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <div className={collapsed ? "hidden" : "space-y-0.5"}>
        {entries.map((entry) => {
          const isSelected = selectedUuid === entry.itemUuid;
          const state = connectivity[entry.service.uuid] ?? "unknown";
          const tier = resolveTier(entry.service, tierOverrides);
          return (
            <button
              key={entry.itemUuid}
              onClick={() => onSelect(entry.path, entry.service, entry.itemUuid)}
              title={entry.path.join(" / ")}
              aria-current={isSelected ? "true" : undefined}
              // Satır ölçüsü ve seçim Sohbet listesiyle aynı (spec §6.5).
              className={`relative flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                isSelected ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-300 hover:bg-active/60"
              }`}
            >
              {isSelected && <ActiveLine />}
              {/* Ağaçla aynı satır: durum başta, sunucu simgesi yok. */}
              <span data-status-slot className="flex w-2.5 shrink-0 justify-center">
                <StatusDot state={state} />
              </span>
              <span className="min-w-0 flex-1 truncate">{entry.service.name}</span>
              {tier && <TierBadge tier={tier} />}
              {/* lang="en": SID teknik bir kimlik, Türkçe değil — küçük harfli
                  kaydedilmiş bir SID Türkçe büyütme kuralıyla bozulurdu. */}
              <span lang="en" className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                {entry.service.systemId}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
