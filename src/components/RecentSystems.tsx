import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { resolveTier } from "../lib/tier";
import { useT } from "../i18n";
import { ActiveLine } from "../shell/SidebarFooter";
import { Eyebrow } from "../ui/Eyebrow";

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
          Sayı kapalıyken de duruyor: daraltılmış bir listenin kaç satır
          sakladığını göstermek, açıp bakma ihtiyacını çoğu zaman ortadan
          kaldırıyor.

          Başlık Sohbet'in grup başlıklarıyla aynı: ok + `Eyebrow` (spec §6.5).
          Eskiden saat ikonu ve sayı rozeti de vardı; 220px kenar çubuğunda
          başlık onlarla iki satıra kırılıyordu (ölçüldü, 2026-09-29). */}
      <button
        onClick={toggle}
        title={collapsed ? t("recentSystems.expand") : t("recentSystems.collapse")}
        aria-expanded={!collapsed}
        className="group mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-left text-slate-400 transition hover:text-slate-200"
      >
        {collapsed ? <ChevronRight size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}
        <Eyebrow as="span" count={entries.length} className="min-w-0 flex-1 group-hover:text-slate-200">
          {t("recentSystems.heading")}
        </Eyebrow>
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
