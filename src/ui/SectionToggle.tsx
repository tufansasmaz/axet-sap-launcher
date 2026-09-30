import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useT } from "../i18n";
import { Eyebrow } from "./Eyebrow";

// Kenar çubuğu bölümlerinin açık/kapalı hâli. Diskte DEĞİL localStorage'da:
// SAP Launcher ekranı sekme değişince tamamen unmount oluyor (bkz. App.tsx'teki
// koşullu render), yani bileşen state'i her dönüşte sıfırlanır ve kullanıcı
// listeyi her seferinde yeniden kapatmak zorunda kalırdı. Bu bir uygulama
// ayarı değil, tek bir listenin açık/kapalı hâli; AppConfig'e girmiyor.
export function usePersistentCollapse(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      // localStorage yoksa açık başla.
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Yazılamıyorsa sessizce geç: daraltma bu oturumda yine çalışıyor.
      }
      return next;
    });
  };

  return [collapsed, toggle];
}

// Açılır-kapanır bölüm başlığı: ok + `Eyebrow` + sayı, Sohbet'in grup
// başlıklarıyla aynı (grafit spec §6.5). Ok CSS döndürmesiyle değil AYRI
// İKONLA. Sayı kapalıyken de duruyor: kaç satırın saklandığını görmek açıp
// bakma ihtiyacını çoğu zaman ortadan kaldırıyor. Eskiden saat ikonu ve sayı
// rozeti de vardı; 220px kenar çubuğunda başlık onlarla iki satıra
// kırılıyordu (ölçüldü, 2026-09-29).
export function SectionToggle({
  label,
  count,
  collapsed,
  onToggle
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? t("recentSystems.expand") : t("recentSystems.collapse")}
      aria-expanded={!collapsed}
      className="group mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-left text-slate-400 transition hover:text-slate-200"
    >
      {collapsed ? <ChevronRight size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}
      <Eyebrow as="span" count={count} className="min-w-0 flex-1 group-hover:text-slate-200">
        {label}
      </Eyebrow>
    </button>
  );
}
