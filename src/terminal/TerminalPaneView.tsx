import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Columns2, Maximize2, Minimize2, Minus, RotateCw, Rows2, X } from "lucide-react";
import { useT } from "../i18n";
import EmbeddedTerminal from "../components/EmbeddedTerminal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { paneTone } from "../stores/terminalReducer";
import type { TerminalPane } from "../stores/terminalTypes";
import { middleEllipsis } from "../lib/paths";
import { KIND_LABEL } from "./NewPaneDialog";
import { PANE_TITLE_MAX, TERMINAL_PANE_COLORS } from "../../app-electron/shared/terminalLayout";
import type { SplitDir } from "../../app-electron/shared/terminalTree";
import { PANE_COLOR_LABEL, PANE_COLOR_VAR } from "./paneColors";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";

// Izgaradaki tek bölme: başlık şeridi + gövde (spec §5.3). Gövde sürecin
// durumuna göre ya xterm ya da tek satırlık bir durum metni.

const TONE_CLASS = {
  running: "bg-[var(--status-success-text)]",
  error: "bg-[var(--status-danger-solid)]",
  stopped: "bg-slate-500"
} as const;

export default function TerminalPaneView({
  pane,
  active,
  canMaximize,
  maximized,
  onDragStart,
  dragging = false,
  onSplit,
  canSplit = true
}: {
  pane: TerminalPane;
  active: boolean;
  canMaximize: boolean;
  maximized: boolean;
  /** Yoksa başlık sürüklenmiyor (tek bölme, büyütülmüş). */
  onDragStart?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  dragging?: boolean;
  /** Yoksa böl düğmeleri yok. */
  onSplit?: (dir: SplitDir) => void;
  /** 9 bölmede false: düğmeler kapalı. */
  canSplit?: boolean;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const [confirmClose, setConfirmClose] = useState(false);
  const [editing, setEditing] = useState(false);
  // Escape blur'u da tetikliyor; blur kaydetmesin.
  const skipCommit = useRef(false);
  const [picker, setPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const colorVar = PANE_COLOR_VAR[pane.color ?? "gray"];
  const kindLabel = t(KIND_LABEL[pane.kind]);

  // Seçici dışına tıklayınca kapanıyor.
  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPicker(false);
    };
    window.addEventListener("mousedown", close, true);
    return () => window.removeEventListener("mousedown", close, true);
  }, [picker]);
  const run = pane.run;
  const tone = paneTone(run);
  const ptyId = run.state === "running" || run.state === "exited" ? run.ptyId : null;

  const requestClose = () => {
    // Çalışan axet oturumunu kapatmak sohbeti de bitiriyor; tek tıkla
    // kaybolmasın. Kabuklar sormadan kapanıyor.
    if (pane.kind === "axet" && run.state === "running") setConfirmClose(true);
    else commands.closePane(pane.id);
  };

  const pickFolder = async () => {
    const folder = await window.api.pickFolder();
    if (folder) commands.restartPane(pane.id, folder);
  };

  return (
    <div
      onMouseDownCapture={() => commands.focusPane(pane.id)}
      onFocusCapture={() => commands.focusPane(pane.id)}
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border bg-card ${
        active ? "border-accent-500/60" : "border-line"
      } ${dragging ? "opacity-50" : ""}`}
    >
      <div
        data-pane-header=""
        onPointerDown={(e) => {
          if (!onDragStart || (e.target as HTMLElement).closest("button, input")) return;
          onDragStart(e);
        }}
        style={colorVar ? { boxShadow: `inset 3px 0 0 ${colorVar}` } : undefined}
        className={`flex h-7 shrink-0 items-center gap-2 border-b border-line px-2 ${onDragStart ? "cursor-grab" : ""}`}
      >
        <span data-tone={tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`} />
        <div ref={pickerRef} className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setPicker((open) => !open)}
            aria-expanded={picker}
            title={t("terminal.paneColor")}
            aria-label={t("terminal.paneColor")}
            className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/5"
          >
            <span className="h-2 w-2 rounded-full border border-line" style={{ background: colorVar ?? "transparent" }} />
          </button>
          {picker && (
            <div role="menu" className="absolute left-0 top-5 z-30 flex gap-1 rounded-md border border-line bg-card p-1.5 shadow-lg">
              {TERMINAL_PANE_COLORS.map((c) => {
                const selected = (pane.color ?? "gray") === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    title={t(PANE_COLOR_LABEL[c])}
                    aria-label={t(PANE_COLOR_LABEL[c])}
                    onClick={() => {
                      commands.setPaneColor(pane.id, c);
                      setPicker(false);
                    }}
                    className={`h-4 w-4 rounded-full border ${selected ? "border-accent-400" : "border-line"}`}
                    style={{ background: PANE_COLOR_VAR[c] ?? "transparent" }}
                  />
                );
              })}
            </div>
          )}
        </div>
        {editing ? (
          <input
            autoFocus
            defaultValue={pane.title ?? ""}
            placeholder={kindLabel}
            maxLength={PANE_TITLE_MAX}
            aria-label={t("terminal.paneName")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                skipCommit.current = true;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (!skipCommit.current) commands.renamePane(pane.id, e.currentTarget.value);
              skipCommit.current = false;
              setEditing(false);
            }}
            className="h-5 w-32 min-w-0 rounded border border-line bg-transparent px-1 font-mono text-2xs text-slate-200 outline-none focus:border-accent-500/60"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            title={t("terminal.renameHint")}
            className={`max-w-[12rem] shrink-0 truncate font-mono text-2xs font-medium tracking-[0.08em] text-slate-300 ${
              pane.title ? "" : "uppercase"
            }`}
          >
            {pane.title ?? kindLabel}
          </span>
        )}
        <span title={pane.cwd} className="min-w-0 flex-1 truncate font-mono text-2xs text-slate-500">
          {middleEllipsis(pane.cwd, 40)}
        </span>
        {onSplit && (
          <>
            <button
              type="button"
              disabled={!canSplit}
              onClick={() => onSplit("row")}
              title={canSplit ? t("terminal.splitRight") : t("terminal.paneMax")}
              aria-label={t("terminal.splitRight")}
              className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
            >
              <Columns2 size={12} />
            </button>
            <button
              type="button"
              disabled={!canSplit}
              onClick={() => onSplit("column")}
              title={canSplit ? t("terminal.splitDown") : t("terminal.paneMax")}
              aria-label={t("terminal.splitDown")}
              className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
            >
              <Rows2 size={12} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => commands.minimizePane(pane.id)}
          title={t("terminal.minimize")}
          aria-label={t("terminal.minimize")}
          className={GHOST_ICON_BUTTON}
        >
          <Minus size={12} />
        </button>
        {canMaximize && (
          <button
            type="button"
            onClick={() => commands.toggleMaximize(pane.id)}
            title={maximized ? t("terminal.unmaximize") : t("terminal.maximize")}
            aria-label={maximized ? t("terminal.unmaximize") : t("terminal.maximize")}
            className={GHOST_ICON_BUTTON}
          >
            {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => commands.restartPane(pane.id)}
          title={t("terminal.restart")}
          aria-label={t("terminal.restart")}
          className={GHOST_ICON_BUTTON}
        >
          <RotateCw size={12} />
        </button>
        <button
          type="button"
          onClick={requestClose}
          title={t("terminal.close")}
          aria-label={t("terminal.close")}
          className={GHOST_ICON_BUTTON}
        >
          <X size={12} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {ptyId !== null && (
          <div className="absolute inset-0 p-1">
            <EmbeddedTerminal sessionId={ptyId} active={active} />
          </div>
        )}
        {run.state === "exited" && (
          <div className="absolute inset-x-0 bottom-0 border-t border-line bg-card/95 px-3 py-1 text-xs text-slate-400">
            {t("terminal.exited", { code: run.code })}
          </div>
        )}
        {(run.state === "queued" || run.state === "starting") && (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            {run.state === "queued" ? t("terminal.queued") : t("terminal.starting")}
          </div>
        )}
        {run.state === "failed" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[var(--status-danger-text)]">
            <span className="break-all">{t("terminal.failed", { message: run.message })}</span>
            <button
              type="button"
              onClick={() => commands.restartPane(pane.id)}
              title={t("terminal.restart")}
              aria-label={t("terminal.restart")}
              className={GHOST_ICON_BUTTON}
            >
              <RotateCw size={14} />
            </button>
          </div>
        )}
        {run.state === "missingDir" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-xs text-slate-400">
            <span className="break-all">{t("terminal.missingDir", { path: pane.cwd })}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => void pickFolder()} className={TOOL_BUTTON}>
                {t("terminal.pickFolder")}
              </button>
              <button type="button" onClick={() => commands.closePane(pane.id)} className={TOOL_BUTTON}>
                {t("terminal.remove")}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title={t("terminal.closePaneTitle")}
        message={t("terminal.closePaneBody")}
        confirmLabel={t("terminal.closePaneConfirm")}
        onConfirm={() => {
          setConfirmClose(false);
          commands.closePane(pane.id);
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
