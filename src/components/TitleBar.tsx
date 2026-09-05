import { useEffect, useState } from "react";
import { Minus, Square, Copy, X, MonitorPlay, Unplug } from "lucide-react";
import type { ActiveContext } from "../../app-electron/shared/types";
import logo from "../assets/logo.svg";
import TierBadge from "./TierBadge";
import { useT } from "../i18n";

interface Props {
  // Aktif bağlam rozeti BAŞLIK ÇUBUĞUNDA, çünkü aynı anda üç ekranın da
  // üstünde duran tek yer burası. Rozeti bir ekranın içine koymak, "bu bilgi
  // o ekrana ait" demek olurdu — oysa mesele tam tersi: üçü de aynı şeye
  // bakıyor (bkz. app-electron/main/activeContext.ts).
  context: ActiveContext;
  onShowSystem: () => void;
  onClearSap: () => void;
}

export default function TitleBar({ context, onShowSystem, onClearSap }: Props) {
  const t = useT();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.api.windowIsMaximized().then(setIsMaximized);
    const unsubscribe = window.api.onWindowStateChanged(setIsMaximized);
    return unsubscribe;
  }, []);

  const handleMinimize = () => window.api.windowMinimize();
  const handleToggleMaximize = async () => {
    const maximized = await window.api.windowToggleMaximize();
    setIsMaximized(maximized);
  };
  const handleClose = () => window.api.windowClose();

  return (
    <div
      className="flex h-9 shrink-0 items-center justify-between border-b border-base-700 bg-base-900 pl-3"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <img src={logo} alt="" width={16} height={16} className="rounded-[3px]" />
        <span className="font-semibold text-slate-200">aXet Studio</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">by tsasmaz</span>
      </div>

      {/* Aktif bağlam. Bağlantı yoksa rozet HİÇ ÇİZİLMİYOR — "bağlı değil"
          yazan boş bir rozet, olmayan bir durumu varmış gibi gösterirdi. */}
      {context.sap && (
        <div
          className="flex min-w-0 items-center gap-1.5 rounded-sm border border-base-700 bg-base-800 px-2 py-0.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${context.sap.verified ? "bg-[var(--status-success-text)]" : "bg-[var(--status-warning-text)]"}`}
            title={context.sap.verified ? t("activeContext.verified") : t("activeContext.unverified")}
          />
          <button
            onClick={onShowSystem}
            title={t("activeContext.showSystem", { path: context.sap.customerPath.join(" › ") })}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 text-xs text-slate-300 hover:text-white"
          >
            <span className="truncate font-semibold">{context.sap.systemId}</span>
            <span className="shrink-0 text-slate-500">·</span>
            <span className="shrink-0 text-slate-400">
              {context.sap.client} / {context.sap.username}
            </span>
          </button>
          {context.sap.tier && <TierBadge tier={context.sap.tier} />}
          {/* SAP GUI oturumu ayrı bir parça: bağlı sistem ile açık GUI ekranı
              FARKLI şeyler ve aynı anda ikisi de doğru olabilir. */}
          {context.gui && (
            <span
              className="flex shrink-0 items-center gap-1 border-l border-base-700 pl-1.5 text-xs text-slate-400"
              title={t("activeContext.guiSession", {
                system: context.gui.systemName ?? "?",
                title: context.gui.title ?? ""
              })}
            >
              <MonitorPlay size={12} />
              {context.gui.transaction || context.gui.program || "SAP GUI"}
            </span>
          )}
          <button
            onClick={onClearSap}
            title={t("activeContext.clear")}
            className="ml-0.5 shrink-0 cursor-pointer rounded-sm p-0.5 text-slate-500 hover:bg-base-700 hover:text-slate-200"
          >
            <Unplug size={12} />
          </button>
        </div>
      )}

      <div className="flex h-full" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          title={t("titleBar.minimize")}
          className="flex h-9 w-11 items-center justify-center text-slate-400 hover:bg-base-700 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleToggleMaximize}
          title={isMaximized ? t("titleBar.restore") : t("titleBar.maximize")}
          className="flex h-9 w-11 items-center justify-center text-slate-400 hover:bg-base-700 hover:text-white"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          title={t("titleBar.close")}
          // Hover'da dolu tehlike zemini geliyor (`--status-danger-solid`,
          // sabit `rose-600` değil — bkz. index.css). `hover:text-white` açık
          // temada koyu griye düşüp ~2.9:1 kontrast veriyordu (kapat butonu
          // görünmez hâle geliyordu). `text-accent-on` tema-bağımsız gerçek
          // beyaz.
          className="flex h-9 w-11 items-center justify-center text-slate-400 hover:bg-[var(--status-danger-solid)] hover:text-accent-on"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
