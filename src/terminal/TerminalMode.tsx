import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import { MAX_TERMINAL_PANES, TERMINAL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";
import { dragRatios, equalRatios, gridLayout } from "./gridLayout";
import { middleEllipsis } from "../lib/paths";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalPaneView from "./TerminalPaneView";
import NewPaneDialog, { KIND_LABEL } from "./NewPaneDialog";

// Terminal modunun sağ tarafı (spec §3, §5). Bütün alanlar HEP takılı:
// seçili olmayanlar `hidden`. Alan değiştirince xterm'ler yeniden kurulmuyor,
// çıktı kaybolmuyor (Sohbet'teki hep-takılı düzenin aynısı).

const GAP = 6;
const KEY_STEP = 0.02;

export default function TerminalMode() {
  const t = useT();
  const { state, commands, defaultKind, defaultCwd } = useTerminalStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (state.phase === "closed") return null;

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
            onClick={() => setDialogOpen(true)}
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
            {w.panes.length === 0 ? (
              <EmptyWorkspace defaultCwd={defaultCwd} onPick={(kind, cwd) => commands.addPane(kind, cwd)} />
            ) : (
              <WorkspaceGrid workspace={w} focusable={state.visible && w.id === state.activeWorkspaceId} />
            )}
          </div>
        ))}
      </div>

      <NewPaneDialog
        open={dialogOpen}
        defaultKind={defaultKind}
        defaultCwd={defaultCwd}
        onOpen={(kind, cwd) => {
          setDialogOpen(false);
          commands.addPane(kind, cwd);
        }}
        onCancel={() => setDialogOpen(false)}
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

/** Oranlar bölme sayısına bağlı: sayı değişince eşitleniyor (spec §3.3). */
function useRatios(count: number, n: number) {
  const [stored, setStored] = useState<{ count: number; ratios: number[] } | null>(null);
  const ratios = stored && stored.count === count && stored.ratios.length === n ? stored.ratios : equalRatios(n);
  return [ratios, (next: number[]) => setStored({ count, ratios: next })] as const;
}

function WorkspaceGrid({ workspace, focusable }: { workspace: TerminalWorkspace; focusable: boolean }) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const count = workspace.panes.length;
  const layout = gridLayout(count);
  const [colRatios, setColRatios] = useRatios(count, layout.cols);
  const [rowRatios, setRowRatios] = useRatios(count, layout.rows);
  const maximized = workspace.maximizedPaneId;

  const gridStyle: CSSProperties = {
    display: "grid",
    gap: GAP,
    gridTemplateColumns: maximized ? "1fr" : colRatios.map((r) => `${r}fr`).join(" "),
    gridTemplateRows: maximized ? "1fr" : rowRatios.map((r) => `${r}fr`).join(" ")
  };

  return (
    <div ref={gridRef} className="relative h-full min-h-0" style={gridStyle}>
      {workspace.panes.map((pane, i) => {
        const c = layout.cells[i];
        const style: CSSProperties =
          maximized === pane.id
            ? { gridColumn: "1 / -1", gridRow: "1 / -1" }
            : maximized
              ? { display: "none" }
              : { gridColumn: `${c.col + 1}`, gridRow: `${c.row + 1} / span ${c.rowSpan}` };
        return (
          <div key={pane.id} data-pane={pane.id} className="min-h-0 min-w-0" style={style}>
            <TerminalPaneView
              pane={pane}
              active={focusable && workspace.focusedPaneId === pane.id}
              canMaximize={count > 1}
              maximized={maximized === pane.id}
            />
          </div>
        );
      })}

      {!maximized &&
        colRatios.slice(0, -1).map((_, i) => (
          <Divider
            key={`c${i}`}
            axis="x"
            index={i}
            ratios={colRatios}
            onChange={setColRatios}
            gridRef={gridRef}
            label={t("terminal.resizeColumns")}
            startOffset={null}
          />
        ))}
      {!maximized &&
        rowRatios.slice(0, -1).map((_, i) => (
          <Divider
            key={`r${i}`}
            axis="y"
            index={i}
            ratios={rowRatios}
            onChange={setRowRatios}
            gridRef={gridRef}
            label={t("terminal.resizeRows")}
            startOffset={
              layout.rowDividerStartCol === 0
                ? null
                : edgeCalc(colRatios, layout.rowDividerStartCol - 1, layout.cols, 1)
            }
          />
        ))}
    </div>
  );
}

/**
 * `index`'inci ayırıcının ortası, CSS `calc` olarak. `fr` payları aralıklar
 * düşüldükten sonraki alanı paylaşıyor: konum = pay × (100% − aralıklar)
 * + önceki aralıklar + yarım aralık. `half = 1` ise yarım yerine tam aralık
 * (satır ayırıcısının başladığı sütunun sol kenarı için).
 */
function edgeCalc(ratios: readonly number[], index: number, n: number, half: 0.5 | 1 = 0.5): string {
  const share = ratios.slice(0, index + 1).reduce((a, b) => a + b, 0);
  return `calc(${share} * (100% - ${GAP * (n - 1)}px) + ${(index + half) * GAP}px)`;
}

function Divider({
  axis,
  index,
  ratios,
  onChange,
  gridRef,
  label,
  startOffset
}: {
  axis: "x" | "y";
  index: number;
  ratios: number[];
  onChange: (next: number[]) => void;
  gridRef: RefObject<HTMLDivElement | null>;
  label: string;
  /** Satır ayırıcısı yalnız bir sütundan başlıyorsa soldaki kenar. */
  startOffset: string | null;
}) {
  const drag = useRef<{ start: number; ratios: number[]; size: number } | null>(null);
  const share = ratios.slice(0, index + 1).reduce((a, b) => a + b, 0);
  const pos = edgeCalc(ratios, index, ratios.length);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const total = axis === "x" ? rect.width : rect.height;
    const size = total - GAP * (ratios.length - 1);
    if (size <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { start: axis === "x" ? e.clientX : e.clientY, ratios, size };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = axis === "x" ? e.clientX : e.clientY;
    onChange(dragRatios(d.ratios, index, (now - d.start) / d.size));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const back = axis === "x" ? "ArrowLeft" : "ArrowUp";
    const fwd = axis === "x" ? "ArrowRight" : "ArrowDown";
    if (e.key !== back && e.key !== fwd) return;
    e.preventDefault();
    onChange(dragRatios(ratios, index, e.key === fwd ? KEY_STEP : -KEY_STEP));
  };

  // 6px'lik tutamaç aralığın tam üstünde; görünür çizgi yok, üstüne gelince
  // vurgu rengi (spec §3.3).
  const style: CSSProperties =
    axis === "x"
      ? { left: pos, top: 0, bottom: 0, width: GAP, transform: "translateX(-50%)" }
      : { top: pos, left: startOffset ?? 0, right: 0, height: GAP, transform: "translateY(-50%)" };

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={Math.round(share * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={onKeyDown}
      className={`absolute z-10 rounded-full outline-none transition-colors hover:bg-accent-400/40 focus-visible:bg-accent-400/60 ${
        axis === "x" ? "cursor-col-resize" : "cursor-row-resize"
      }`}
      style={style}
    />
  );
}
