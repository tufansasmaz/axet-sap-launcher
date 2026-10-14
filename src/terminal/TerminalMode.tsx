import { useRef, useState, type CSSProperties } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { layoutOf, minimizedOf } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import { MAX_TERMINAL_PANES, TERMINAL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";
import { leafIds, type DropZone, type SplitDir } from "../../app-electron/shared/terminalTree";
import { middleEllipsis } from "../lib/paths";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalPaneView from "./TerminalPaneView";
import NewPaneDialog, { KIND_LABEL } from "./NewPaneDialog";
import LayoutView from "./LayoutView";
import { zoneBox, type Box } from "./dropZone";
import { usePaneDrag } from "./usePaneDrag";
import { PANE_COLOR_VAR } from "./paneColors";

// Terminal modunun sağ tarafı (spec §3, §5). Bütün alanlar HEP takılı:
// seçili olmayanlar `hidden`. Alan değiştirince xterm'ler yeniden kurulmuyor,
// çıktı kaybolmuyor (Sohbet'teki hep-takılı düzenin aynısı).

type PaneSplit = { targetPaneId: string; dir: SplitDir };

export default function TerminalMode() {
  const t = useT();
  const { state, commands, defaultKind, defaultCwd } = useTerminalStore();
  // Açıkken hangi bölmenin bölüneceği (yoksa odaktakinin sağı).
  const [dialog, setDialog] = useState<{ split?: PaneSplit } | null>(null);
  // Alan başına son ölçülen bölme kutuları: "Bölme" düğmesi uzun kenardan
  // bölsün diye (spec 2026-10-14 §3.2).
  const rects = useRef<Record<string, Record<string, Box>>>({});

  if (state.phase === "closed") return null;

  const splitFor = (w: TerminalWorkspace): PaneSplit | undefined => {
    const target = w.focusedPaneId;
    if (!target || !leafIds(layoutOf(w)).includes(target)) return undefined;
    const box = rects.current[w.id]?.[target];
    return { targetPaneId: target, dir: box && box.width > box.height ? "row" : "column" };
  };

  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const full = (active?.panes.length ?? 0) >= MAX_TERMINAL_PANES;
  const savedPanes = state.saved.reduce((sum, w) => sum + w.panes.length, 0);

  return (
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

      {state.phase === "ready" && active && (
        <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
          <span className="min-w-0 truncate text-sm text-slate-200">{active.name}</span>
          <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">
            {t("terminal.paneCount", { count: active.panes.length })}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setDialog({ split: splitFor(active) })}
            disabled={full}
            title={full ? t("terminal.paneMax") : undefined}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("terminal.addPane")}
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {state.workspaces.map((w) => (
          <div
            key={w.id}
            data-workspace={w.id}
            className={`${w.id === state.activeWorkspaceId ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
          >
            <div className="relative min-h-0 flex-1">
              {w.panes.length > 0 && (
                <WorkspaceLayout
                  workspace={w}
                  focusable={state.visible && w.id === state.activeWorkspaceId}
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
                  <EmptyWorkspace defaultCwd={defaultCwd} onPick={(kind, cwd) => commands.addPane(kind, cwd)} />
                </div>
              )}
            </div>
            <MinimizedStrip workspace={w} />
          </div>
        ))}
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
    </div>
  );
}

function EmptyWorkspace({
  defaultCwd,
  onPick
}: {
  defaultCwd: string;
  onPick: (kind: TerminalPaneKind, cwd: string) => void;
}) {
  const t = useT();
  const [picked, setPicked] = useState<string | null>(null);
  const cwd = picked ?? defaultCwd;

  const change = async () => {
    const folder = await window.api.pickFolder();
    if (folder) setPicked(folder);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-200">{t("terminal.emptyTitle")}</p>
        <p className="text-xs text-slate-500">{t("terminal.emptyHint")}</p>
      </div>
      <div className="flex gap-2">
        {TERMINAL_PANE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!cwd}
            onClick={() => onPick(k, cwd)}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            {t(KIND_LABEL[k])}
          </button>
        ))}
      </div>
      <div className="flex max-w-full items-center gap-2 text-xs">
        <FolderOpen size={14} className="shrink-0 text-accent-400" />
        <span title={cwd || undefined} className="min-w-0 truncate font-mono text-slate-400">
          {cwd ? middleEllipsis(cwd, 56) : t("terminal.noFolder")}
        </span>
        <button type="button" onClick={() => void change()} className={TOOL_BUTTON}>
          {t("terminal.changeFolder")}
        </button>
      </div>
    </div>
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
            <span className="min-w-0 truncate font-mono text-2xs">{pane.title ?? t(KIND_LABEL[pane.kind])}</span>
            {m.unread && <span data-unread="" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />}
          </button>
        );
      })}
    </div>
  );
}
