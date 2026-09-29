import { Moon, PanelLeftClose, Plug, Settings, Stethoscope, Sun } from "lucide-react";
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

// Bunları App değil `Sidebar` veriyor: daraltma kenar çubuğunun kendi işi.
interface ShellOnlyProps {
  collapsed?: boolean;
  onCollapse?: () => void;
}

// Satırlar kenar çubuğunun listeleriyle aynı ölçüde: 28px, 8px yatay boşluk,
// seçili satır `--accent-glow` zemini ve solda 2px çizgi (spec §6.5).
const ROW =
  "relative flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors";
const ICON_BTN =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-hover hover:text-slate-100";
// Daraltılmış şeridin kare düğmesi: 48px şeritte iki yanda 6px boşluk.
// Bu üçü `Sidebar`'ın şeridindeki mod ikonlarında da kullanılıyor; iki
// kopya olsa seçili hâl biri ötekinden kayardı.
export const STRIP_BTN =
  "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors";

export function selectedClass(selected: boolean) {
  return selected ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:bg-hover/60 hover:text-slate-300";
}

export function ActiveLine() {
  return <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-400" />;
}

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
  onOpenSettings,
  collapsed = false,
  onCollapse
}: SidebarFooterProps & ShellOnlyProps) {
  const t = useT();
  const readinessName = readinessFault
    ? `${t("shell.readiness")} — ${t("shell.readinessFault")}`
    : t("shell.readiness");
  const connectionsName =
    connectorCount > 0
      ? `${t("shell.connections")} — ${t("shell.connectorsOpen", { count: connectorCount })}`
      : t("shell.connections");

  // Daraltılmış şeritte yalnızca üç düğme (spec §6.3): tema ve dil sık
  // değişen şeyler değil, genişletince yerindeler.
  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-line-subtle py-2">
        <button
          type="button"
          onClick={onOpenReadiness}
          aria-label={readinessName}
          title={readinessName}
          aria-current={readinessOpen ? "page" : undefined}
          className={`${STRIP_BTN} ${selectedClass(readinessOpen)}`}
        >
          {readinessOpen && <ActiveLine />}
          <Stethoscope size={16} aria-hidden />
          {readinessFault && (
            <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--status-danger-text)]" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpenConnections}
          aria-label={connectionsName}
          title={connectionsName}
          className={`${STRIP_BTN} ${selectedClass(false)}`}
        >
          <Plug size={16} aria-hidden />
          {connectorCount > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--status-success-text)]" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t("shell.settings")}
          title={t("shell.settings")}
          className={`${STRIP_BTN} ${selectedClass(false)}`}
        >
          <Settings size={16} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-line-subtle p-2">
      <button
        type="button"
        onClick={onOpenReadiness}
        aria-label={readinessName}
        aria-current={readinessOpen ? "page" : undefined}
        className={`${ROW} ${selectedClass(readinessOpen)}`}
      >
        {readinessOpen && <ActiveLine />}
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
        className={`${ROW} ${selectedClass(false)}`}
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
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={t("shell.collapseSidebar")}
            title={t("shell.collapseSidebar")}
            className={`${ICON_BTN} ml-auto`}
          >
            <PanelLeftClose size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
