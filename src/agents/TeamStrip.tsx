import { useState } from "react";
import { BookOpen, BookPlus, Plus, RotateCw } from "lucide-react";
import { useT } from "../i18n";
import MemoryDialog from "./MemoryDialog";
import type { AgentEngineInfo, AgentStatus } from "../../app-electron/shared/agentTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON, TOOL_BUTTON, GHOST_ICON_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "./agentStatusContext";
import { agentPanes, cardStatus, TONE_DOT } from "./agentView";
import { ENGINE_LABEL, agentName } from "./agentLabels";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import type { WorkspaceView } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";

const VIEW_KEY: Record<WorkspaceView, TranslationKey> = {
  panes: "board.viewPanes",
  board: "board.viewBoard",
  office: "office.view",
  changes: "changes.view",
  browser: "browser.view"
};
const VIEWS: readonly WorkspaceView[] = ["panes", "board", "office", "changes", "browser"];

// Ekip şeridi (spec 2026-10-17 ajan-alani §4): seçili alandaki ajanlar yan
// yana. Kart: renk şeridi, ad, rol, motor, durum noktası + metni; tahmini
// durumda "≈". Seçili kart (odaktaki bölme) lime çerçeveyle — lime YALNIZ
// seçim. Kabuk bölmelerinin kartı yok; onlar bölme alanında.

export default function TeamStrip({
  workspace,
  full,
  view,
  onView,
  onAddAgent,
  onAddShell
}: {
  workspace: TerminalWorkspace;
  full: boolean;
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
  onAddAgent: () => void;
  onAddShell: () => void;
}) {
  const t = useT();
  const { statuses, engines, now } = useAgentStatuses();
  const agents = agentPanes(workspace);
  // Kalıcı bellek penceresi (spec 2026-10-18 ajan-bellegi §4): yalnız belleği açık ajanda.
  const [memoryPaneId, setMemoryPaneId] = useState<string | null>(null);
  const memoryPane = agents.find((p) => p.id === memoryPaneId && p.agent?.memory);
  return (
    <div className="flex min-h-16 shrink-0 items-center gap-2 border-b border-line px-3">
      {/* Bölmeler | Pano | Ofis | Değişiklikler (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2, degisiklikler §5); seçim lime, alan başına hatırlanıyor. */}
      <div role="radiogroup" aria-label={t("board.viewLabel")} className="flex shrink-0 gap-0.5 rounded-md bg-control p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={() => onView(v)}
            className={`cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
              view === v ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t(VIEW_KEY[v])}
          </button>
        ))}
      </div>
      <div role="list" aria-label={t("agents.team")} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        {agents.map((pane) => (
          <AgentCard
            key={pane.id}
            pane={pane}
            selected={workspace.focusedPaneId === pane.id}
            status={statuses[pane.id]}
            engine={engines?.find((e) => e.id === (pane.agent?.engine ?? "axet-code"))}
            now={now || Date.now()}
            onOpenMemory={() => setMemoryPaneId(pane.id)}
          />
        ))}
      </div>
      <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">
        {t("terminal.paneCount", { count: workspace.panes.length })}
      </span>
      <button
        type="button"
        onClick={onAddShell}
        disabled={full}
        title={full ? t("terminal.paneMax") : undefined}
        className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
      >
        <Plus size={12} />
        {t("agents.addShell")}
      </button>
      <button
        type="button"
        onClick={onAddAgent}
        disabled={full}
        title={full ? t("terminal.paneMax") : undefined}
        className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}
      >
        <Plus size={12} />
        {t("agents.addAgent")}
      </button>
      {memoryPane && (
        <MemoryDialog
          workspaceId={workspace.id}
          paneId={memoryPane.id}
          name={agentName(memoryPane, t)}
          onClose={() => setMemoryPaneId(null)}
        />
      )}
    </div>
  );
}

function AgentCard({
  pane,
  selected,
  status,
  engine,
  now,
  onOpenMemory
}: {
  pane: TerminalPane;
  selected: boolean;
  status: AgentStatus | undefined;
  engine: AgentEngineInfo | undefined;
  now: number;
  onOpenMemory: () => void;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const view = cardStatus(pane, status, now);
  const { boards } = useBoards();
  const job = activeSubtaskOf(boards, pane.id);
  const color = PANE_COLOR_VAR[pane.color ?? "gray"];
  const engineLabel = t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  return (
    <div role="listitem" className="relative shrink-0">
      <button
        type="button"
        data-agent-card={pane.id}
        aria-pressed={selected}
        onClick={() => commands.revealPane(pane.id)}
        style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
        className={`flex min-h-12 w-52 flex-col justify-center gap-1 rounded-md border bg-card py-1 pl-3 pr-8 text-left transition-colors ${
          selected ? "border-accent-500/60" : "border-line hover:border-slate-500"
        }`}
      >
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span title={agentName(pane, t)} className="min-w-0 truncate text-xs font-medium text-slate-200">{agentName(pane, t)}</span>
          {pane.agent?.role && <span title={pane.agent.role} className="min-w-0 truncate text-2xs text-slate-500">{pane.agent.role}</span>}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs">
          <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
          <span className="min-w-0 truncate text-slate-300">{t(view.key, view.params)}</span>
          {view.estimated && (
            <span data-estimated="" title={t("agents.estimatedHint")} className="shrink-0 text-slate-500">
              ≈
            </span>
          )}
          {/* axet-code eski/bozuk (axetBinaryStatus, spec §10): motor adı uyarı renginde, mesaj ipucunda. */}
          <span
            data-engine-note={engine?.note ? "" : undefined}
            title={engine?.note}
            className={`ml-auto shrink-0 truncate ${engine?.note ? "text-[var(--status-warning-text)]" : "text-slate-500"}`}
          >
            {engineLabel}
          </span>
        </span>
        {/* Görev panosu (spec 2026-10-18 gorev-panosu §8): görevli ajanın alt görevi. */}
        {job && (
          <span data-agent-task="" title={job.subtask.title} className="min-w-0 truncate text-2xs text-slate-500">
            {job.subtask.title}
          </span>
        )}
      </button>
      {view.restartable && (
        <button
          type="button"
          onClick={() => commands.restartPane(pane.id)}
          title={t("terminal.restart")}
          aria-label={t("terminal.restart")}
          className={`${GHOST_ICON_BUTTON} absolute right-1 top-1`}
        >
          <RotateCw size={12} />
        </button>
      )}
      {/* Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4; sapma 1, 10): açıksa pencere,
          kapalıysa anahtar türetilip kaydediliyor (pencere açılmıyor). */}
      <button
        type="button"
        data-agent-memory={pane.agent?.memory ? "on" : "off"}
        onClick={() => (pane.agent?.memory ? onOpenMemory() : commands.enablePaneMemory(pane.id))}
        title={t(pane.agent?.memory ? "memory.open" : "memory.enable")}
        aria-label={t(pane.agent?.memory ? "memory.open" : "memory.enable")}
        className={`${GHOST_ICON_BUTTON} absolute bottom-1 right-1`}
      >
        {pane.agent?.memory ? <BookOpen size={12} /> : <BookPlus size={12} />}
      </button>
    </div>
  );
}
