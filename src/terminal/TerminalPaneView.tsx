import { useState } from "react";
import { Maximize2, Minimize2, RotateCw, X } from "lucide-react";
import { useT } from "../i18n";
import EmbeddedTerminal from "../components/EmbeddedTerminal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { paneTone } from "../stores/terminalReducer";
import type { TerminalPane } from "../stores/terminalTypes";
import { middleEllipsis } from "../lib/paths";
import { KIND_LABEL } from "./NewPaneDialog";
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
  maximized
}: {
  pane: TerminalPane;
  active: boolean;
  canMaximize: boolean;
  maximized: boolean;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const [confirmClose, setConfirmClose] = useState(false);
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
      }`}
    >
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line px-2">
        <span data-tone={tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`} />
        <span className="shrink-0 font-mono text-2xs font-medium uppercase tracking-[0.08em] text-slate-300">
          {t(KIND_LABEL[pane.kind])}
        </span>
        <span title={pane.cwd} className="min-w-0 flex-1 truncate font-mono text-2xs text-slate-500">
          {middleEllipsis(pane.cwd, 40)}
        </span>
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
