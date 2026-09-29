import { Moon, Plug, Settings, Stethoscope, Sun } from "lucide-react";
import type { AppTheme } from "../../app-electron/shared/types";
import { useT } from "../i18n";

export interface SidebarFooterProps {
  readinessOpen: boolean;
  readinessFault: boolean;
  onOpenReadiness: () => void;
  connectorCount: number;
  onOpenConnections: () => void;
  theme: AppTheme;
  // Gösterilen kısa ad ("TR" / "EN"); dili App biliyor.
  language: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
}

// Satırlar kenar çubuğunun listeleriyle aynı ölçüde: 28px, 8px yatay boşluk,
// seçili satır `--accent-glow` zemini ve solda 2px çizgi (spec §6.5).
const ROW =
  "relative flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors";
const ICON_BTN =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-hover hover:text-slate-100";

export default function SidebarFooter({
  readinessOpen,
  readinessFault,
  onOpenReadiness,
  connectorCount,
  onOpenConnections,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  onOpenSettings
}: SidebarFooterProps) {
  const t = useT();
  const readinessName = readinessFault
    ? `${t("shell.readiness")} — ${t("shell.readinessFault")}`
    : t("shell.readiness");
  const connectionsName =
    connectorCount > 0
      ? `${t("shell.connections")} — ${t("shell.connectorsOpen", { count: connectorCount })}`
      : t("shell.connections");

  return (
    <div className="shrink-0 border-t border-line-subtle p-2">
      <button
        type="button"
        onClick={onOpenReadiness}
        aria-label={readinessName}
        aria-current={readinessOpen ? "page" : undefined}
        className={`${ROW} ${
          readinessOpen ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
        }`}
      >
        {readinessOpen && (
          <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-400" />
        )}
        <Stethoscope size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("shell.readiness")}</span>
        {/* Arıza noktası renk; ne dediği düğmenin adında yazılı. */}
        {readinessFault && (
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-danger-text)]" />
        )}
      </button>
      <button
        type="button"
        onClick={onOpenConnections}
        aria-label={connectionsName}
        className={`${ROW} text-slate-400 hover:bg-hover/60 hover:text-slate-300`}
      >
        <Plug size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("shell.connections")}</span>
        {/* Nokta accent değil durum yeşili: bu bir seçim değil, "araçlar şu
            an açık" diyen bir sağlık göstergesi. Sayı kaç tanesinin açık
            olduğunu söylüyor. */}
        {connectorCount > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-2xs text-slate-400">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--status-success-text)]" />
            {connectorCount}
          </span>
        )}
      </button>
      <div className="mt-1 flex items-center gap-1 px-1">
        {/* Düğme "hangisine geçersin"i gösteriyor: koyu temadayken güneş. */}
        <button type="button" onClick={onToggleTheme} aria-label={t("shell.theme")} title={t("shell.theme")} className={ICON_BTN}>
          {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onToggleLanguage}
          aria-label={t("shell.language")}
          title={t("shell.language")}
          className={`${ICON_BTN} font-mono text-2xs font-semibold`}
        >
          {language}
        </button>
        <button type="button" onClick={onOpenSettings} aria-label={t("shell.settings")} title={t("shell.settings")} className={ICON_BTN}>
          <Settings size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
