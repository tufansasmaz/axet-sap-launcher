// Ajanlar ekranı (spec 2026-10-18 ajanlar-yeniden §2, §2a; ajanlar-ux §1):
// üstte TEK alçak satır — ekip sekmeleri (taşarsa yatay kayar) + "+ Ekip",
// sağda bölme sayısı, "+ Kabuk" / "+ Ajan". Görünüm seçimi içerik alanının
// sol kenarındaki dikey rayda (ViewRail, TerminalMode içinde). "Sohbet"
// sekmesi yok (uygulama sol menüsüyle erişiliyor). Sohbet bileşeni (`chat`) ve TerminalMode HER ZAMAN takılı,
// yalnız görünürlükleri chatActive'e bağlı (akan cevap, taslak, pty'ler).
// Tur 3: Sohbet ekranında ekip şeridi ÇİZİLMİYOR (çalışma alanı sohbette görünmez);
// şeritte ekip sekmelerinin yanında ekibin deposu (RepoChip).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import type { ActiveSapContext } from "../../app-electron/shared/types";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalMode, { type AddRequest } from "../terminal/TerminalMode";
import TeamTabs from "./TeamTabs";
import { onAddAgentRequest } from "./addAgentBus";
import RepoChip from "./RepoChip";

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
  // Akış ve Bellek boş durumlarındaki "İlk ajanını ekle" (ayrı ağaçlar; addAgentBus).
  const requestAddRef = useRef(requestAdd);
  requestAddRef.current = requestAdd;
  useEffect(() => onAddAgentRequest(() => requestAddRef.current("agent")), []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {!chatActive && (
      <div data-agents-strip="" className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 shrink">
            <TeamTabs activeSap={activeSap} onSelected={onShowAgents} />
          </div>
          {active && ready && <RepoChip workspace={active} />}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {active && (
            <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">{t("terminal.paneCount", { count: active.panes.length })}</span>
          )}
          <button
            type="button"
            onClick={() => requestAdd("shell")}
            disabled={!ready || full}
            title={full ? t("terminal.paneMax") : t("agents.addShellLong")}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("agents.addShell")}
          </button>
          <button
            type="button"
            onClick={() => requestAdd("agent")}
            disabled={!ready || full}
            title={full ? t("terminal.paneMax") : t("agents.addTitle")}
            className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className={chatActive ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "hidden"}>{chat}</div>
        <div className={chatActive ? "hidden" : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"}>
          <TerminalMode addRequest={addRequest} />
        </div>
      </div>
    </div>
  );
}
