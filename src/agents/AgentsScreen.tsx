// Ajanlar ekranı (spec 2026-10-18 ajanlar-yeniden §2, §2a): üstte ekip
// sekmeleri, altında orta sekmeler (Sohbet | Ofis | Terminal | Görevler |
// Değişiklikler | Tarayıcı) ve sağda "+ Kabuk" / "+ Ajan". Sohbet ve Ajanlar
// aynı ekran: Sohbet bileşeni (`chat`) ve TerminalMode HER ZAMAN takılı,
// yalnız görünürlükleri sekmeye bağlı (akan cevap, taslak, pty'ler yaşıyor).
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { workspaceViewOf } from "../stores/terminalReducer";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import type { ActiveSapContext, WorkspaceView } from "../../app-electron/shared/types";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalMode, { type AddRequest } from "../terminal/TerminalMode";
import TeamTabs from "./TeamTabs";

export type ScreenTab = "chat" | WorkspaceView;

export const SCREEN_TABS: readonly ScreenTab[] = ["chat", "office", "panes", "board", "changes", "browser"];

const TAB_KEY: Record<ScreenTab, TranslationKey> = {
  chat: "tabs.chat",
  office: "office.view",
  panes: "tabs.terminal",
  board: "tabs.tasks",
  changes: "changes.view",
  browser: "browser.view"
};

export default function AgentsScreen({
  chatActive,
  onShowChat,
  onShowAgents,
  chat,
  activeSap = null
}: {
  chatActive: boolean;
  onShowChat: () => void;
  onShowAgents: () => void;
  chat: ReactNode;
  activeSap?: ActiveSapContext | null;
}) {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const [addRequest, setAddRequest] = useState<AddRequest | null>(null);
  const tabRefs = useRef(new Map<ScreenTab, HTMLButtonElement>());
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const ready = state.phase === "ready" && active !== null;
  const tab: ScreenTab = chatActive ? "chat" : active ? workspaceViewOf(active) : "office";
  const full = (active?.panes.length ?? 0) >= MAX_TERMINAL_PANES;

  const choose = (next: ScreenTab, focus = false) => {
    if (next === "chat") onShowChat();
    else {
      if (active) commands.setWorkspaceView(active.id, next);
      onShowAgents();
    }
    if (focus) tabRefs.current.get(next)?.focus();
  };

  // Ajan sekmeleri ekip yokken (kapalı evre / geri yükleme sorusu) seçilemiyor; Sohbet her zaman.
  const tabs = ready ? SCREEN_TABS : SCREEN_TABS.filter((v) => v === "chat" || v === tab);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.indexOf(tab);
    if (e.key === "ArrowRight") choose(tabs[(index + 1) % tabs.length], true);
    else if (e.key === "ArrowLeft") choose(tabs[(index - 1 + tabs.length) % tabs.length], true);
    else if (e.key === "Home") choose(tabs[0], true);
    else if (e.key === "End") choose(tabs[tabs.length - 1], true);
    else return;
    e.preventDefault();
  };

  const requestAdd = (kind: AddRequest["kind"]) => {
    onShowAgents();
    setAddRequest((prev) => ({ kind, seq: (prev?.seq ?? 0) + 1 }));
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-0.5 border-b border-line px-3 pb-1.5 pt-1">
        <TeamTabs activeSap={activeSap} onSelected={onShowAgents} />
        <div className="flex min-w-0 items-center gap-2">
          <div role="tablist" aria-label={t("board.viewLabel")} onKeyDown={onKeyDown} className="flex shrink-0 gap-0.5 rounded-md bg-control p-0.5">
            {SCREEN_TABS.map((v) => {
              const selected = tab === v;
              const disabled = !tabs.includes(v);
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
                  tabIndex={selected ? 0 : -1}
                  disabled={disabled}
                  onClick={() => choose(v)}
                  className={`cursor-pointer rounded px-2.5 py-1 text-xs transition-colors disabled:cursor-default disabled:opacity-40 ${
                    selected ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t(TAB_KEY[v])}
                </button>
              );
            })}
          </div>
          <span className="min-w-0 flex-1" />
          {active && (
            <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">{t("terminal.paneCount", { count: active.panes.length })}</span>
          )}
          <button
            type="button"
            onClick={() => requestAdd("shell")}
            disabled={!ready || full}
            title={full ? t("terminal.paneMax") : undefined}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("agents.addShell")}
          </button>
          <button
            type="button"
            onClick={() => requestAdd("agent")}
            disabled={!ready || full}
            title={full ? t("terminal.paneMax") : undefined}
            className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className={chatActive ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "hidden"}>{chat}</div>
        <div className={chatActive ? "hidden" : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"}>
          <TerminalMode addRequest={addRequest} />
        </div>
      </div>
    </div>
  );
}
