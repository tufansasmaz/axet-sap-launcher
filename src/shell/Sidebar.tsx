import type { ReactNode } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { Tabs } from "../ui/Tabs";
import SidebarFooter, { type SidebarFooterProps } from "./SidebarFooter";
import { SIDEBAR_MODES, type SidebarMode } from "./activity";

export interface SidebarProps {
  // Ortada listesi duran mod (bkz. `listModeOf`).
  mode: SidebarMode;
  readinessOpen: boolean;
  onModeChange: (mode: SidebarMode) => void;
  footer: SidebarFooterProps;
  // Modun listesi: `ChatSidebar`, `LogonSidebar` ya da `ScriptSidebar`.
  children: ReactNode;
}

const MODE_LABEL: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.modeChat",
  sapLauncher: "shell.modeLogon",
  sapGuiScripting: "shell.modeScript"
};

export default function Sidebar({ mode, readinessOpen, onModeChange, footer, children }: SidebarProps) {
  const t = useT();
  const items = SIDEBAR_MODES.map((value) => ({ value, label: t(MODE_LABEL[value]) }));

  // Hazırlık açıkken ortadaki liste son modun. Ona dokunmak o moda dönüyor:
  // listede seçilen şeyin ekranı görünsün diye, ve Script ekranı yalnızca
  // aktifken mount olduğu için `ScriptSidebar`'ın komutlarını karşılayan
  // biri ancak böyle oluyor. Fare için `pointerdown` (tıklamadan önce geliyor,
  // ekran tıklama işlenmeden mount oluyor), klavye için odak.
  const returnToMode = readinessOpen ? () => onModeChange(mode) : undefined;

  return (
    <aside
      aria-label={t("shell.sidebar")}
      className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-line-subtle bg-sidebar"
    >
      <div className="shrink-0 p-2">
        <Tabs
          label={t("shell.modes")}
          items={items}
          value={readinessOpen ? null : mode}
          onChange={onModeChange}
          stretch
        />
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onPointerDownCapture={returnToMode}
        onFocusCapture={returnToMode}
      >
        {children}
      </div>
      <SidebarFooter {...footer} />
    </aside>
  );
}
