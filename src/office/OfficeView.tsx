// Ofis görünümü (spec 2026-10-18 ofis-gorunumu §3–§6): alanın ajanları
// masalarında. Yeni bilgi yok: durum `useAgentStatuses`, alt görev
// `useBoards` + `activeSubtaskOf`. Düz kabuk bölmeleri ajan değil; yalnız
// köşede sayıları. Karaktere (ya da balonuna) tıklamak görünümü Bölmeler'e
// döndürüp bölmeyi öne getiriyor. Lime yalnız odaktaki ajanın çerçevesi.
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import type { AgentStatus } from "../../app-electron/shared/agentTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes, TONE_DOT } from "../agents/agentView";
import { ENGINE_LABEL, agentName } from "../agents/agentLabels";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import { OFFICE_TASK_MAX, clipText, officeLayout, officeSeat } from "./officeLayout";
import OfficeCharacter from "./OfficeCharacter";

/** Satırlar arası ve koltuklar arası boşluk (rem); hücre genişliği hesabında da kullanılıyor. */
const GAP_REM = 0.75;

export default function OfficeView({ workspace, onAddAgent }: { workspace: TerminalWorkspace; onAddAgent: () => void }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { statuses, now } = useAgentStatuses();
  const agents = agentPanes(workspace);
  const shells = workspace.panes.length - agents.length;
  const grid = officeLayout(agents.length);
  const rows: TerminalPane[][] = [];
  let start = 0;
  for (const size of grid.rows) {
    rows.push(agents.slice(start, start + size));
    start += size;
  }
  // Hücreler bütün satırlarda eşit: eksik son satır ortalanıyor, büyümüyor.
  const cellWidth = `calc((100% - ${(grid.cols - 1) * GAP_REM}rem) / ${Math.max(1, grid.cols)})`;
  const open = (paneId: string) => {
    // Önce görünüm: bölmeler görünür olunca odak xterm'e geçebiliyor.
    commands.setWorkspaceView(workspace.id, "panes");
    commands.revealPane(paneId);
  };
  return (
    <section aria-label={t("office.label")} data-office="" className="relative flex h-full min-h-0 flex-col overflow-auto p-4">
      {agents.length === 0 ? (
        <div data-office-empty="" className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-slate-200">{t("office.empty")}</p>
          <button type="button" onClick={onAddAgent} className={PRIMARY_BUTTON}>
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      ) : (
        <div role="list" aria-label={t("office.seats")} className="m-auto flex w-full max-w-4xl flex-col" style={{ gap: `${GAP_REM}rem` }}>
          {rows.map((seats, r) => (
            <div key={r} data-office-row="" className="flex justify-center" style={{ gap: `${GAP_REM}rem` }}>
              {seats.map((pane) => (
                <div key={pane.id} role="listitem" className="min-w-0" style={{ width: cellWidth }}>
                  <OfficeSeat
                    pane={pane}
                    status={statuses[pane.id]}
                    now={now || Date.now()}
                    selected={workspace.focusedPaneId === pane.id}
                    onOpen={() => open(pane.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {shells > 0 && (
        <p data-office-shells="" className="pointer-events-none absolute bottom-2 right-3 font-mono text-2xs tabular-nums text-slate-500">
          {t("office.shellCount", { count: shells })}
        </p>
      )}
    </section>
  );
}

function OfficeSeat({
  pane,
  status,
  now,
  selected,
  onOpen
}: {
  pane: TerminalPane;
  status: AgentStatus | undefined;
  now: number;
  selected: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const { boards } = useBoards();
  const seat = officeSeat(pane, status, now);
  const name = agentName(pane, t);
  const role = pane.agent?.role ?? "";
  const engine = t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  const state = t(seat.key, seat.params);
  const job = activeSubtaskOf(boards, pane.id);
  // aria-label: görsel metne ek olarak soru içeriğini ve aktif alt görevi ekran okuyucuya iletir.
  const label = [name, role, seat.estimated ? `${state} ${t("office.estimatedSuffix")}` : state, seat.question, job?.subtask.title].filter(Boolean).join(", ");
  return (
    <button
      type="button"
      data-office-seat={pane.id}
      data-pose={seat.pose}
      aria-label={label}
      aria-pressed={selected}
      onClick={onOpen}
      className={`relative flex w-full min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border bg-card px-2 pb-2 pt-7 text-center transition-colors ${
        selected ? "border-accent-500/60" : "border-line hover:border-slate-500"
      }`}
    >
      {/* Soru balonu düğmenin içinde: ayrı bir iç içe düğme yok, tıklaması karakterinkiyle aynı. */}
      {seat.pose === "asking" && (
        <span
          data-balloon=""
          className="absolute left-1/2 top-1 flex max-w-[90%] -translate-x-1/2 items-center gap-1 rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-2xs text-[var(--status-warning-text)]"
        >
          <span aria-hidden="true" className="font-semibold">
            ?
          </span>
          {seat.question && (
            <span data-balloon-text="" className="min-w-0 truncate">
              {seat.question}
            </span>
          )}
        </span>
      )}
      <OfficeCharacter pose={seat.pose} motion={seat.motion} color={PANE_COLOR_VAR[pane.color ?? "gray"]} />
      <span className="flex w-full min-w-0 items-baseline justify-center gap-1.5">
        <span title={name} className="min-w-0 truncate text-xs font-medium text-slate-200">
          {name}
        </span>
        {role && (
          <span title={role} className="min-w-0 truncate text-2xs text-slate-500">
            {role}
          </span>
        )}
      </span>
      <span className="flex w-full min-w-0 items-center justify-center gap-1.5 text-2xs">
        <span data-tone={seat.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[seat.tone]}`} />
        <span className="min-w-0 truncate text-slate-300">{state}</span>
        {seat.estimated && (
          <span data-estimated="" title={t("agents.estimatedHint")} className="shrink-0 text-slate-500">
            ≈
          </span>
        )}
        <span className="min-w-0 shrink truncate text-slate-500">{engine}</span>
      </span>
      {job && (
        <span data-office-task="" title={job.subtask.title} className="w-full min-w-0 truncate text-2xs text-slate-500">
          {clipText(job.subtask.title, OFFICE_TASK_MAX)}
        </span>
      )}
    </button>
  );
}
