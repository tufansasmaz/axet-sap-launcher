import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import logo from "../assets/logo.svg";

export default function TitleBar() {
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
        aXet SAP Launcher
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">by tsasmaz</span>
      </div>
      <div className="flex h-full" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          title="Küçült"
          className="flex h-9 w-11 items-center justify-center text-slate-400 hover:bg-base-700 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleToggleMaximize}
          title={isMaximized ? "Geri yükle" : "Büyüt"}
          className="flex h-9 w-11 items-center justify-center text-slate-400 hover:bg-base-700 hover:text-white"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          title="Kapat"
          className="flex h-9 w-11 items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
