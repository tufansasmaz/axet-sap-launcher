import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { MousePointerClick, PanelLeftOpen, Server, Sparkles, TerminalSquare, type LucideIcon } from "lucide-react";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_KEY_STEP,
  SIDEBAR_KEY_STEP_LARGE,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clampSidebarWidth
} from "../../app-electron/shared/sidebarLayout";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { Tabs } from "../ui/Tabs";
import SidebarFooter, { ActiveLine, STRIP_BTN, selectedClass, type SidebarFooterProps } from "./SidebarFooter";
import { SIDEBAR_MODES, type SidebarMode } from "./activity";

export interface SidebarProps {
  // Ortada listesi duran mod (bkz. `listModeOf`).
  mode: SidebarMode;
  readinessOpen: boolean;
  onModeChange: (mode: SidebarMode) => void;
  footer: SidebarFooterProps;
  // Kayıtlı genişlik; sürüklerken gösterilen değer bileşenin kendi durumu.
  width: number;
  collapsed: boolean;
  // Sürükleme bitince ya da ok tuşu bırakılınca, değer değiştiyse bir kez.
  onWidthCommit: (width: number) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  // Modun listesi: `ChatSidebar`, `LogonSidebar`, `ScriptSidebar` ya da `TerminalSidebar`.
  children: ReactNode;
}

const MODE_LABEL: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.modeChat",
  sapLauncher: "shell.modeLogon",
  sapGuiScripting: "shell.modeScript",
  terminal: "shell.modeTerminal"
};

// Daraltılmış şeritte sekme yok, ikon var; ipucu ve erişilebilir ad modun
// uzun adı.
const MODE_ICON: Record<SidebarMode, LucideIcon> = {
  axetCode: Sparkles,
  sapLauncher: Server,
  sapGuiScripting: MousePointerClick,
  terminal: TerminalSquare
};
const MODE_NAME: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.axetCode",
  sapLauncher: "shell.sapLauncher",
  sapGuiScripting: "shell.sapGuiScripting",
  terminal: "shell.terminal"
};

export default function Sidebar({
  mode,
  readinessOpen,
  onModeChange,
  footer,
  width,
  collapsed,
  onWidthCommit,
  onCollapsedChange,
  children
}: SidebarProps) {
  const t = useT();
  const items = SIDEBAR_MODES.map((value) => ({ value, label: t(MODE_LABEL[value]) }));

  // Gösterilen genişlik. Sürüklerken her harekette değişiyor ama config'e
  // yalnızca bırakınca gidiyor (spec §6.3); ref, pencere dinleyicilerinin
  // eski bir render'ın değerini okumaması için.
  const [liveWidth, setLiveWidth] = useState(() => clampSidebarWidth(width));
  const liveRef = useRef(liveWidth);
  useEffect(() => {
    const next = clampSidebarWidth(width);
    liveRef.current = next;
    setLiveWidth(next);
  }, [width]);

  function setLive(next: number) {
    const clamped = clampSidebarWidth(next);
    liveRef.current = clamped;
    setLiveWidth(clamped);
  }

  function commit() {
    if (liveRef.current !== width) onWidthCommit(liveRef.current);
  }

  function onResizeMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = liveRef.current;
    const onMove = (ev: MouseEvent) => setLive(startWidth + ev.clientX - startX);
    const detach = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragCleanupRef.current = null;
    };
    const onUp = () => {
      detach();
      commit();
    };
    dragCleanupRef.current?.();
    dragCleanupRef.current = detach;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onResizeKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.shiftKey ? SIDEBAR_KEY_STEP_LARGE : SIDEBAR_KEY_STEP;
    setLive(liveRef.current + (e.key === "ArrowRight" ? step : -step));
  }

  function onResizeKeyUp(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") commit();
  }

  // Daraltma/genişletme düğmesine basılınca o düğme kendi dalıyla birlikte
  // unmount oluyor ve odak `<body>`'ye düşüyordu. Beklenen durum burada;
  // config'ten o değer geri gelince karşı düğme (şeritte genişlet, altta
  // daralt) odaklanıyor. Kısayolla genişletmede (Ctrl+F) iz yok, odağa
  // dokunulmuyor.
  const asideRef = useRef<HTMLElement>(null);
  const pendingToggleRef = useRef<boolean | null>(null);
  function toggleCollapsed(next: boolean) {
    pendingToggleRef.current = next;
    onCollapsedChange(next);
  }
  useEffect(() => {
    if (pendingToggleRef.current !== collapsed) return;
    pendingToggleRef.current = null;
    asideRef.current?.querySelector<HTMLElement>("[data-sidebar-toggle]")?.focus();
  }, [collapsed]);

  // Sürüklerken kenar çubuğu unmount olursa
  // pencere dinleyicileri bir sonraki mouseup'a kadar yaşıyor ve unmount
  // olmuş bileşende `commit` çağırıyordu. Temizlik burada tutuluyor.
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanupRef.current?.(), []);

  // Hazırlık açıkken ortadaki liste son modun. Ona dokunmak o moda dönüyor:
  // listede seçilen şeyin ekranı görünsün diye, ve Script ekranı yalnızca
  // aktifken mount olduğu için `ScriptSidebar`'ın komutlarını karşılayan
  // biri ancak böyle oluyor. Fare için `pointerdown` (tıklamadan önce geliyor,
  // ekran tıklama işlenmeden mount oluyor), klavye için odak.
  const returnToMode = readinessOpen ? () => onModeChange(mode) : undefined;

  if (collapsed) {
    return (
      <aside
        ref={asideRef}
        aria-label={t("shell.sidebar")}
        style={{ width: SIDEBAR_COLLAPSED_WIDTH }}
        className="flex shrink-0 flex-col items-center overflow-hidden border-r border-line-subtle bg-sidebar"
      >
        <div className="flex flex-col items-center gap-1 py-2">
          <button
            type="button"
            onClick={() => toggleCollapsed(false)}
            data-sidebar-toggle
            aria-label={t("shell.expandSidebar")}
            title={t("shell.expandSidebar")}
            className={`${STRIP_BTN} text-slate-400 hover:bg-hover hover:text-slate-100`}
          >
            <PanelLeftOpen size={16} aria-hidden />
          </button>
          <nav aria-label={t("shell.modes")} className="mt-1 flex flex-col items-center gap-1">
            {SIDEBAR_MODES.map((value) => {
              const Icon = MODE_ICON[value];
              const current = !readinessOpen && value === mode;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  aria-label={t(MODE_NAME[value])}
                  title={t(MODE_NAME[value])}
                  aria-current={current ? "page" : undefined}
                  className={`${STRIP_BTN} ${selectedClass(current)}`}
                >
                  {current && <ActiveLine />}
                  <Icon size={16} aria-hidden />
                </button>
              );
            })}
          </nav>
        </div>
        <div className="min-h-0 flex-1" />
        <SidebarFooter {...footer} collapsed />
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      aria-label={t("shell.sidebar")}
      style={{ width: liveWidth }}
      className="relative flex shrink-0 flex-col overflow-hidden border-r border-line-subtle bg-sidebar"
    >
      {/* Dört sekme 2×2: tek satırda 264px'te sekme başına ~44px yazı alanı
          kalıyor, "Terminal" ~56px istiyor ve kesiliyordu (ölçüldü, 2026-09-30). */}
      <div className="shrink-0 p-2">
        <Tabs
          label={t("shell.modes")}
          items={items}
          value={readinessOpen ? null : mode}
          onChange={onModeChange}
          columns={2}
        />
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onPointerDownCapture={returnToMode}
        onFocusCapture={returnToMode}
      >
        {children}
      </div>
      <SidebarFooter {...footer} onCollapse={() => toggleCollapsed(true)} />
      {/* Tutamaç kenar çubuğunun sağ kenarında, içeride: `overflow-hidden`
          dışarı taşanı kesiyor. 4px geniş, fare ve klavyeyle kullanılıyor. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("shell.resizeWidth")}
        aria-valuenow={liveWidth}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        tabIndex={0}
        onMouseDown={onResizeMouseDown}
        onKeyDown={onResizeKeyDown}
        onKeyUp={onResizeKeyUp}
        className="absolute inset-y-0 right-0 w-1 cursor-col-resize outline-none hover:bg-accent-500/50 focus-visible:bg-accent-500/50"
      />
    </aside>
  );
}
