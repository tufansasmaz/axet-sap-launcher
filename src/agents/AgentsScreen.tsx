// Ajanlar ekranı (spec 2026-10-18 ajanlar-yeniden §2, §2a, düzen rev.2):
// üstte ekip sekmeleri + sağda "+ Kabuk" / "+ Ajan". Görünüm sekmeleri
// (Terminal | Görevler | Ofis | Değişiklikler | Tarayıcı) FlowSidebar'ın
// alt kenarına taşındı; "Sohbet" sekmesi kaldırıldı (uygulama sol menüsüyle
// erişiliyor). Sohbet bileşeni (`chat`) ve TerminalMode HER ZAMAN takılı,
// yalnız görünürlükleri chatActive'e bağlı (akan cevap, taslak, pty'ler).
import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import type { ActiveSapContext } from "../../app-electron/shared/types";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalMode, { type AddRequest } from "../terminal/TerminalMode";
import TeamTabs from "./TeamTabs";

export default function AgentsScreen({
  chatActive,
  onShowAgents,
  chat,
  activeSap = null
}: {
  chatActive: boolean;
  onShowAgents: () => void;
  chat: ReactNode;
  activeSap?: ActiveSapContext | null;
}) {
  const t = useT();
  const { state } = useTerminalStore();
  const [addRequest, setAddRequest] = useState<AddRequest | null>(null);
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const ready = state.phase === "ready" && active !== null;
  const full = (active?.panes.length ?? 0) >= MAX_TERMINAL_PANES;

  const requestAdd = (kind: AddRequest["kind"]) => {
    onShowAgents();
    setAddRequest((prev) => ({ kind, seq: (prev?.seq ?? 0) + 1 }));
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-0.5 border-b border-line px-3 pb-1.5 pt-1">
        <TeamTabs activeSap={activeSap} onSelected={onShowAgents} />
        <div className="flex min-w-0 items-center gap-2">
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
