// Ajanlar ekranının orta alanı (spec 2026-10-17 ajan-alani §4; ajanlar-yeniden §2; ajanlar-ux §4): solda dikey görünüm rayı, yanında bölmeler (Terminal), Görevler, Ofis, Değişiklikler, Tarayıcı ya da Bellek. Sekmeler ve ekle düğmeleri üstteki AgentsScreen'de; ekle istekleri `addRequest` ile geliyor. Bütün alanlar HEP takılı: seçili olmayanlar ve öbür görünümlerdeyken bölmeler hidden.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { layoutOf, minimizedOf, workspaceViewOf } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import { leafIds, type DropZone, type SplitDir } from "../../app-electron/shared/terminalTree";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalPaneView from "./TerminalPaneView";
import NewPaneDialog from "./NewPaneDialog";
import { paneLabel } from "../agents/agentLabels";
import LayoutView from "./LayoutView";
import { zoneBox, type Box } from "./dropZone";
import { usePaneDrag } from "./usePaneDrag";
import { PANE_COLOR_VAR } from "./paneColors";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes } from "../agents/agentView";
import AgentsEmptyState from "../agents/AgentsEmptyState";
import AddAgentDialog from "../agents/AddAgentDialog";
import BoardView from "../board/BoardView";
import OfficeView from "../office/OfficeView";
import ChangesView from "../changes/ChangesView";
import { ChangesFocusProvider } from "../changes/changesFocus";
import BrowserView from "../browser/BrowserView";
import ViewRail from "../agents/ViewRail";
import { useRailCounts } from "../agents/useRailCounts";
import MemoryView from "../agents/MemoryView";
import OverviewView from "../agents/OverviewView";
import ToolsView from "../agents/ToolsView";
import type { WorkspaceView } from "../../app-electron/shared/types";

type PaneSplit = { targetPaneId: string; dir: SplitDir };

/** Üst şeritteki "+ Ajan" / "+ Kabuk"; `seq` her tıkta artıyor. */
export type AddRequest = { kind: "agent" | "shell"; seq: number };

export default function TerminalMode({ addRequest = null }: { addRequest?: AddRequest | null } = {}) {
  const t = useT();
  const { state, commands, defaultKind, defaultCwd, agentCwd } = useTerminalStore();
  const { engines } = useAgentStatuses();
  // Açıkken hangi bölmenin bölüneceği (yoksa odaktakinin sağı).
  const [dialog, setDialog] = useState<{ split?: PaneSplit } | null>(null);
  const [agentDialog, setAgentDialog] = useState<{ split?: PaneSplit } | null>(null);
  // Alan başına son ölçülen bölme kutuları: düğme uzun kenardan bölsün diye (spec 2026-10-14 §3.2).
  const rects = useRef<Record<string, Record<string, Box>>>({});

  // Tarayıcı (spec 2026-10-18 tarayici §2): bir alanda bir kez açılan sayfa
  // oturum boyunca takılı kalıyor, öbür görünümlerde gizleniyor; geri/ileri
  // geçmişi görünüm değişince kaybolmasın. Alan kapanınca sökülüyor.
  const splitFor = (w: TerminalWorkspace): PaneSplit | undefined => {
    const target = w.focusedPaneId;
    if (!target || !leafIds(layoutOf(w)).includes(target)) return undefined;
    const box = rects.current[w.id]?.[target];
    return { targetPaneId: target, dir: box && box.width > box.height ? "row" : "column" };
  };

  const [browserOpened, setBrowserOpened] = useState<string[]>([]);
  const browserActiveId = state.workspaces.find((w) => w.id === state.activeWorkspaceId && w.view === "browser")?.id ?? null;
  useEffect(() => {
    if (browserActiveId && !browserOpened.includes(browserActiveId)) setBrowserOpened((prev) => [...prev, browserActiveId]);
  }, [browserActiveId, browserOpened]);

  // Üst şeritten gelen ekle isteği: odaktaki bölmeyi uzun kenarından bölüyor (eski TeamStrip düğmeleri gibi).
  const handledAdd = useRef(0);
  useEffect(() => {
    if (!addRequest || addRequest.seq === handledAdd.current) return;
    handledAdd.current = addRequest.seq;
    const w = state.workspaces.find((x) => x.id === state.activeWorkspaceId);
    if (!w || state.phase !== "ready") return;
    const split = splitFor(w);
    if (addRequest.kind === "agent") setAgentDialog({ split });
    else setDialog({ split });
  });

  if (state.phase === "closed") return null;

  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const savedPanes = state.saved.reduce((sum, w) => sum + w.panes.length, 0);
  // Görünüm alan başına; bölmeler yalnız "panes"te görünür, öbürlerinde gizli ama takılı.
  const view: WorkspaceView = active ? workspaceViewOf(active) : "office";

  return (
    <ChangesFocusProvider>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {state.phase === "restorePrompt" && (
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2 text-sm text-slate-300">
          <span className="min-w-0 flex-1 truncate">
            {t("terminal.restorePrompt", { workspaces: state.saved.length, panes: savedPanes })}
          </span>
          <button type="button" onClick={() => commands.startFresh()} className={TOOL_BUTTON}>
            {t("terminal.startFresh")}
          </button>
          <button type="button" onClick={() => commands.restore()} className={PRIMARY_BUTTON}>
            {t("terminal.restoreLayout")}
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          {/* Görünüm rayı: içeriğin üstünde yüzen, sol kenarda ortalı; kapalıyken tek yuvarlak düğme, üzerine gelince açılır. */}
          {state.phase === "ready" && active && <CountedViewRail workspace={active} />}
          {state.workspaces.map((w) => (
            <div
              key={w.id}
              data-workspace={w.id}
              className={`${w.id === state.activeWorkspaceId && view === "panes" ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
            >
              <div className="relative min-h-0 flex-1">
                {w.panes.length > 0 && (
                  <WorkspaceLayout
                    workspace={w}
                    focusable={state.visible && w.id === state.activeWorkspaceId && view === "panes"}
                    canSplit={w.panes.length < MAX_TERMINAL_PANES}
                    onSplit={(paneId, dir) => setDialog({ split: { targetPaneId: paneId, dir } })}
                    onRects={(next) => {
                      rects.current[w.id] = next;
                    }}
                  />
                )}
                {/* Hiç bölme yoksa ya da hepsi şeritteyse. Bölmelerin üstünde: tıklamayı onlar almasın. */}
                {leafIds(layoutOf(w)).length === 0 && (
                  <div className="absolute inset-0 z-10">
                    <AgentsEmptyState
                      allMinimized={w.panes.length > 0}
                      onAddAgent={() => setAgentDialog({})}
                      onAddShell={() => setDialog({})}
                    />
                  </div>
                )}
              </div>
              <MinimizedStrip workspace={w} />
            </div>
          ))}
          {state.phase === "ready" && active && view === "board" && (
            <div className="absolute inset-0">
              <BoardView workspace={active} />
            </div>
          )}
          {state.phase === "ready" && active && view === "office" && (
            <div className="absolute inset-0">
              <OfficeView workspace={active} visible={state.visible} onAddAgent={() => setAgentDialog({})} />
            </div>
          )}
          {state.phase === "ready" && active && view === "overview" && (
            <div className="absolute inset-0">
              <OverviewView key={active.id} workspace={active} />
            </div>
          )}
          {state.phase === "ready" && active && view === "tools" && (
            <div className="absolute inset-0">
              <ToolsView />
            </div>
          )}
          {state.phase === "ready" && active && view === "memory" && (
            <div className="absolute inset-0">
              <MemoryView key={active.id} workspace={active} />
            </div>
          )}
          {state.phase === "ready" && active && view === "changes" && (
            <div className="absolute inset-0">
              <ChangesView key={active.id} workspace={active} />
            </div>
          )}
          {state.phase === "ready" &&
            state.workspaces
              .filter((w) => w.id === browserActiveId || browserOpened.includes(w.id))
              .map((w) => {
                const shown = w.id === browserActiveId;
                return (
                  <div key={`browser-${w.id}`} data-browser={w.id} className={shown ? "absolute inset-0" : "hidden"}>
                    <BrowserView workspace={w} visible={shown && state.visible} />
                  </div>
                );
              })}
        </div>
      </div>

      <NewPaneDialog
        open={dialog !== null}
        defaultKind={defaultKind}
        defaultCwd={defaultCwd}
        onOpen={(kind, cwd) => {
          const split = dialog?.split;
          setDialog(null);
          commands.addPane(kind, cwd, split);
        }}
        onCancel={() => setDialog(null)}
      />

      <AddAgentDialog
        open={agentDialog !== null}
        defaultCwd={agentCwd}
        defaultName={t("agents.defaultName", { n: (active ? agentPanes(active).length : 0) + 1 })}
        engines={engines}
        onAdd={(input) => {
          const split = agentDialog?.split;
          setAgentDialog(null);
          commands.addAgent(input, split);
        }}
        onCancel={() => setAgentDialog(null)}
      />
      </div>
    </ChangesFocusProvider>
  );
}

/**
 * Bölmenin yeri. Bölmeler ağaçtan bağımsız, `paneId` anahtarıyla bir kez
 * çiziliyor; ağaç yalnız kutuyu veriyor (spec §6.2). Ağaçta olmayan
 * (küçültülmüş) ya da başka bölme büyütülmüşken gizli ama takılı.
 */
function paneStyle(paneId: string, visible: readonly string[], maximized: string | null, rects: Record<string, Box>): CSSProperties {
  if (maximized === paneId) return { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 };
  const box = rects[paneId];
  if (maximized || !visible.includes(paneId) || !box) return { display: "none" };
  return { position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height };
}

function WorkspaceLayout({
  workspace,
  focusable,
  canSplit,
  onSplit,
  onRects
}: {
  workspace: TerminalWorkspace;
  focusable: boolean;
  canSplit: boolean;
  onSplit: (paneId: string, dir: SplitDir) => void;
  onRects: (rects: Record<string, Box>) => void;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const [rects, setRects] = useState<Record<string, Box>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef(rects);
  rectsRef.current = rects;
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const layout = layoutOf(workspace);
  const visible = leafIds(layout);
  const maximized = workspace.maximizedPaneId;

  const { drag, start } = usePaneDrag({
    containerRef,
    rectsRef,
    // Bırakma anındaki durum: sürüklerken kapanan/küçültülen bölmeye bırakılmıyor.
    canDrop: (paneId, targetId) => {
      const now = leafIds(layoutOf(workspaceRef.current));
      return now.includes(paneId) && now.includes(targetId);
    },
    onDrop: (paneId: string, targetId: string, zone: DropZone) => commands.movePane(paneId, targetId, zone)
  });
  const canDrag = !maximized && visible.length > 1;
  const ghost = drag?.active && drag.target && drag.zone && rects[drag.target] ? zoneBox(rects[drag.target], drag.zone) : null;

  return (
    <div ref={containerRef} className="absolute inset-0">
      <LayoutView
        layout={layout}
        dividers={!maximized}
        onRects={(next) => {
          setRects(next);
          onRects(next);
        }}
        onResize={(path, index, delta, min) => commands.resizeSplit(workspace.id, path, index, delta, min)}
        onEqualize={(path) => commands.equalizeSplit(workspace.id, path)}
        labels={{ row: t("terminal.resizeColumns"), column: t("terminal.resizeRows") }}
      />
      {workspace.panes.map((pane) => (
        <div key={pane.id} data-pane={pane.id} className="min-h-0 min-w-0" style={paneStyle(pane.id, visible, maximized, rects)}>
          <TerminalPaneView
            pane={pane}
            active={focusable && workspace.focusedPaneId === pane.id}
            canMaximize={visible.length > 1}
            maximized={maximized === pane.id}
            onDragStart={canDrag ? (e) => start(pane.id, e) : undefined}
            dragging={drag?.active === true && drag.paneId === pane.id}
            onSplit={(dir) => onSplit(pane.id, dir)}
            canSplit={canSplit}
          />
        </div>
      ))}
      {ghost && (
        <div
          data-drop-ghost={drag?.zone ?? ""}
          className="pointer-events-none absolute z-20 rounded-md border border-accent-400/70 bg-accent-400/15 transition-all duration-75"
          style={{ left: ghost.left, top: ghost.top, width: ghost.width, height: ghost.height }}
        />
      )}
    </div>
  );
}

/** Küçültülen bölmeler: ad + renk, çıktı geldiyse nokta; tık → geri gelir (spec §4). */
function MinimizedStrip({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const items = minimizedOf(workspace);
  if (items.length === 0) return null;
  return (
    <div role="toolbar" aria-label={t("terminal.minimizedStrip")} className="mt-1.5 flex h-7 shrink-0 items-center gap-1 overflow-x-auto">
      {items.map((m) => {
        const pane = workspace.panes.find((p) => p.id === m.paneId);
        if (!pane) return null;
        const color = PANE_COLOR_VAR[pane.color ?? "gray"];
        return (
          <button
            key={m.paneId}
            type="button"
            data-minimized={m.paneId}
            onClick={() => commands.restorePane(m.paneId)}
            title={t("terminal.restorePane")}
            className={`${TOOL_BUTTON} h-6 max-w-[14rem]`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
            <span className="min-w-0 truncate font-mono text-2xs">{pane.title ?? paneLabel(pane, t)}</span>
            {m.unread && <span data-unread="" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />}
          </button>
        );
      })}
    </div>
  );
}

/** Ray + sayaçları (hook yalnız ray çizilirken çalışsın diye ayrı bileşen). */
function CountedViewRail({ workspace }: { workspace: TerminalWorkspace }) {
  const counts = useRailCounts(workspace);
  return <ViewRail workspace={workspace} counts={counts} />;
}
