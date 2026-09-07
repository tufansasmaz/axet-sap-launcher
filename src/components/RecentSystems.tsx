import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Server } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { resolveTier } from "../lib/tier";
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

// Daraltma tercihi diskte DEĞİL localStorage'da: SAP Launcher ekranı sekme
// değişince tamamen unmount oluyor (bkz. App.tsx'teki koşullu render), yani
// bileşen state'i her dönüşte sıfırlanır ve kullanıcı listeyi her seferinde
// yeniden kapatmak zorunda kalırdı. AppConfig'e taşımak da yapılabilirdi ama
// bu bir uygulama ayarı değil, tek bir listenin açık/kapalı hâli.
const COLLAPSE_KEY = "axet.recentSystems.collapsed";

export default function RecentSystems({ entries, selectedUuid, connectivity, tierOverrides, onSelect }: Props) {
  const t = useT();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      // localStorage yoksa açık başla — varsayılan davranış eskisiyle aynı.
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Yazılamıyorsa sessizce geç: daraltma bu oturumda yine çalışıyor.
      }
      return next;
    });
  };

  if (entries.length === 0) return null;

  return (
    <div className="mb-3 border-b border-line pb-3">
      {/* Ok CSS döndürmesiyle değil AYRI İKONLA (ChevronRight/ChevronDown) —
          uygulamanın geri kalanındaki daraltılabilir başlıklarla aynı desen.
          Sayı rozeti kapalıyken de duruyor: daraltılmış bir listenin kaç satır
          sakladığını göstermek, açıp bakma ihtiyacını çoğu zaman ortadan
          kaldırıyor. */}
      <button
        onClick={toggle}
        title={collapsed ? t("recentSystems.expand") : t("recentSystems.collapse")}
        className="mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-300"
      >
        {collapsed ? <ChevronRight size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}
        <Clock size={12} className="shrink-0 text-[var(--navy-icon)]" />
        {t("recentSystems.heading")}
        <span className="ml-auto shrink-0 rounded-full bg-control px-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-400">
          {entries.length}
        </span>
      </button>
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
              className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                isSelected ? "bg-accent-500/20 text-white" : "text-slate-300 hover:bg-active/60"
              }`}
            >
              <Server size={13} className="shrink-0 text-[var(--navy-icon)]" />
              <span className="truncate">{entry.service.name}</span>
              {tier && <TierBadge tier={tier} />}
              {/* lang="en": SID teknik bir kimlik, Türkçe değil — küçük harfli
                  kaydedilmiş bir SID Türkçe büyütme kuralıyla bozulurdu. */}
              <span lang="en" className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                {entry.service.systemId}
              </span>
              <StatusDot state={state} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
