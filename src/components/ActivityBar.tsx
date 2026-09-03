import { Sparkles, Settings, Sun, Moon, Languages, Workflow, Radio, MousePointerClick, Plug } from "lucide-react";
import type { ReactNode } from "react";
import logo from "../assets/logo.svg";
import { useT } from "../i18n";
import type { AppTheme } from "../../app-electron/shared/types";

export type Activity = "axetCode" | "sapLauncher" | "axetFlows" | "axetFlowsLive" | "sapGuiScripting";

interface Props {
  activity: Activity;
  onChange: (activity: Activity) => void;
  theme: AppTheme;
  language: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
  onOpenConnections: () => void;
  /** En az bir uygulama bağlıysa fişin üstünde küçük bir accent nokta. */
  connectorsConnected: boolean;
}

// VS Code'un "Activity Bar"ına benzer, uygulamanın tüm modüllerini
// (axet.code sohbet ekranı, aXet SAP Launcher, ileride eklenecek
// axet.flows gibi başkaları) tek bir dikey rayda listeleyen sol şerit.
// Yeni bir modül eklemek için sadece bu dosyadaki `activities` dizisine
// bir öğe eklemek yeterli — App.tsx'teki `activity === "..."` koşuluna
// karşılık gelen bir görünüm bileşeni eklenmesi hâlâ gerekiyor, ama
// navigasyon/ikon tarafı burada merkezi.
export default function ActivityBar({
  activity,
  onChange,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  onOpenSettings,
  onOpenConnections,
  connectorsConnected
}: Props) {
  const t = useT();

  // Aktif sekme kutusunun stili — BEŞ sekmede de aynı. Önceden axet.code
  // tek başına `bg-gradient-to-br from-accent-500 to-accent-600` + `shadow-lg`
  // kullanıyordu; bu hem src/index.css'in en başında yazılı olan "gradyan/
  // parlama/dekoratif efekt yok" kuralının tek istisnasıydı (üstelik en
  // görünür yerde, uygulama ilk açıldığında bakılan yerde), hem de accent
  // gradyan üstünde `text-white` kullandığı için açık temada koyu-üstüne-koyu
  // kontrast hatasına düşüyordu (bkz. --accent-on-rgb). Vurgu artık tek bir
  // yerden geliyor: butonun solundaki 3px accent şerit.
  const activeBox = "bg-base-800 text-accent-400";
  const boxBase = "flex h-8 w-8 items-center justify-center rounded-lg transition";

  const activities: { id: Activity; label: string; render: (active: boolean) => ReactNode }[] = [
    {
      id: "axetCode",
      label: t("activityBar.axetCode"),
      render: (active) => (
        <span className={`${boxBase} ${active ? activeBox : ""}`}>
          <Sparkles size={17} />
        </span>
      )
    },
    {
      id: "sapLauncher",
      label: t("activityBar.sapLauncher"),
      render: (active) => (
        <span className={`${boxBase} ${active ? activeBox : ""}`}>
          <img src={logo} alt="" width={18} height={18} className="rounded-md" />
        </span>
      )
    },
    {
      id: "axetFlows",
      label: t("activityBar.axetFlows"),
      render: (active) => (
        <span className={`${boxBase} ${active ? activeBox : ""}`}>
          <Workflow size={17} />
        </span>
      )
    },
    {
      id: "axetFlowsLive",
      label: t("activityBar.axetFlowsLive"),
      render: (active) => (
        <span className={`${boxBase} ${active ? activeBox : ""}`}>
          <Radio size={17} />
        </span>
      )
    },
    {
      id: "sapGuiScripting",
      label: t("activityBar.sapGuiScripting"),
      render: (active) => (
        <span className={`${boxBase} ${active ? activeBox : ""}`}>
          <MousePointerClick size={17} />
        </span>
      )
    }
  ];

  return (
    <div className="flex w-14 shrink-0 flex-col items-center justify-between border-r border-base-700 bg-base-950/70 py-2">
      <div className="flex w-full flex-col items-center gap-1.5">
        {activities.map((item) => {
          const isActive = activity === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              title={item.label}
              className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:text-slate-200"
            >
              <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent-400 transition-all ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                }`}
              />
              <span className={isActive ? "text-slate-100" : ""}>{item.render(isActive)}</span>
            </button>
          );
        })}
      </div>

      {/* Alt grup butonları üsttekilerle AYNI kutu boyutunda (h-11 w-11) —
          önceden h-10 w-10 idi ve dikey ray hizası gözle görülür şekilde
          kayıyordu. Ayırıcı da panel kenarlıklarının her yerde kullandığı
          base-700 tonunda (base-800 değil). */}
      <div className="flex w-full flex-col items-center gap-1 border-t border-base-700 pt-2">
        <button
          onClick={onToggleLanguage}
          title={t("activityBar.language")}
          className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center rounded-lg text-slate-500 transition hover:bg-base-800 hover:text-slate-200"
        >
          <Languages size={15} />
          <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide">{language}</span>
        </button>
        <button
          onClick={onToggleTheme}
          title={t("activityBar.theme")}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-base-800 hover:text-slate-200"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {/* Bağlı uygulama varsa bunun uygulamanın HER YERİNDEN görünmesi
            gerekiyordu: bağlayıcılar artık yalnızca sohbetin değil iki ajanın
            da elinde, ama durumları yalnızca modal açılınca görülebiliyordu.
            Nokta, "araçlar şu an açık" demenin en ucuz yolu. */}
        <button
          onClick={onOpenConnections}
          title={t("activityBar.connections")}
          className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-base-800 hover:text-slate-200"
        >
          <Plug size={16} />
          {connectorsConnected && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-base-900 bg-accent-500" />
          )}
        </button>
        <button
          onClick={onOpenSettings}
          title={t("activityBar.settings")}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-base-800 hover:text-slate-200"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
