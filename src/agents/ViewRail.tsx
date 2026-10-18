// Görünüm rayı (spec 2026-10-18 ajanlar-ux §4): ana içerik alanının sol
// kenarına gömülü, alt alta simge düğmeleri. Terminal | Görevler | Ofis |
// Değişiklikler | Tarayıcı | Bellek — Ofis ortada. Seçili lime çizgi (lime
// yalnız seçim); etiket ipucunda ve aria-label'da. Klavye: yukarı/aşağı ok,
// Home/End; yalnız seçili düğme sekme sırasında.
import { useRef, type KeyboardEvent } from "react";
import { BookOpen, Building2, ClipboardList, GitBranch, Globe, Terminal, type LucideIcon } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { workspaceViewOf } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { WorkspaceView } from "../../app-electron/shared/types";
import type { RailCounts } from "./railCounts";

const COUNT_KEY: Partial<Record<WorkspaceView, TranslationKey>> = {
  board: "rail.count.board",
  changes: "rail.count.changes",
  office: "rail.count.office"
};

export const VIEW_TABS: readonly WorkspaceView[] = ["panes", "board", "office", "changes", "browser", "memory"];

const VIEW_TAB_KEY: Record<WorkspaceView, TranslationKey> = {
  panes: "tabs.terminal",
  board: "tabs.tasks",
  office: "office.view",
  changes: "changes.view",
  browser: "browser.view",
  memory: "memory.view"
};

const VIEW_TAB_ICON: Record<WorkspaceView, LucideIcon> = {
  panes: Terminal,
  board: ClipboardList,
  office: Building2,
  changes: GitBranch,
  browser: Globe,
  memory: BookOpen
};

export default function ViewRail({ workspace, counts }: { workspace: TerminalWorkspace; counts?: RailCounts }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const tabRefs = useRef(new Map<WorkspaceView, HTMLButtonElement>());
  const current = workspaceViewOf(workspace);

  const choose = (next: WorkspaceView, focus = false) => {
    commands.setWorkspaceView(workspace.id, next);
    if (focus) tabRefs.current.get(next)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = VIEW_TABS.indexOf(current);
    if (e.key === "ArrowDown") choose(VIEW_TABS[(index + 1) % VIEW_TABS.length], true);
    else if (e.key === "ArrowUp") choose(VIEW_TABS[(index - 1 + VIEW_TABS.length) % VIEW_TABS.length], true);
    else if (e.key === "Home") choose(VIEW_TABS[0], true);
    else if (e.key === "End") choose(VIEW_TABS[VIEW_TABS.length - 1], true);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="tablist"
      aria-label={t("board.viewLabel")}
      aria-orientation="vertical"
      data-view-rail=""
      onKeyDown={onKeyDown}
      className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-line py-1.5"
    >
      {VIEW_TABS.map((v) => {
        const selected = current === v;
        const Icon = VIEW_TAB_ICON[v];
        const count = counts?.[v] ?? 0;
        const countKey = COUNT_KEY[v];
        // Sayı etikete ve ipucuna ekleniyor: rozet yalnız görsel (ekran okuyucu etiketten okuyor).
        const label = count > 0 && countKey ? `${t(VIEW_TAB_KEY[v])} — ${t(countKey, { count })}` : t(VIEW_TAB_KEY[v]);
        return (
          <button
            key={v}
            ref={(el) => {
              if (el) tabRefs.current.set(v, el);
              else tabRefs.current.delete(v);
            }}
            type="button"
            role="tab"
            data-screen-tab={v}
            aria-selected={selected}
            aria-label={label}
            tabIndex={selected ? 0 : -1}
            title={label}
            onClick={() => choose(v)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              selected ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-500 hover:bg-hover hover:text-slate-200"
            }`}
          >
            {selected && <span aria-hidden className="absolute -left-1 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent-400" />}
            <Icon size={15} />
            {count > 0 && countKey && (
              <span
                aria-hidden
                data-rail-count=""
                className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-slate-600 px-0.5 text-center text-[9px] font-semibold leading-[14px] text-slate-100"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
