// "Ajana gönder" menüsi (spec 2026-10-18 tarayici §3): alandaki ajan
// bölmeleri (kabuk yok) adı, rolü ve durumuyla. Menüde seçmek onaydır; ayrı
// onay penceresi yok. "Ekran görüntüsü ekle" menüde bir onay kutusu; alanın
// kök klasörü yoksa kapalı. Lime yalnız seçim: işaretli kutu.
// Erişilebilirlik: menü kapanınca odak düğmeye döner; ArrowDown/Up menüitem'ler
// arasında gezinir; açılışta menüye odak verilir.
import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { useT } from "../i18n";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { TOOL_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes, cardStatus, TONE_DOT } from "../agents/agentView";
import { agentName } from "../agents/agentLabels";

const ITEM =
  "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 " +
  "hover:bg-hover hover:text-slate-100 disabled:cursor-default disabled:opacity-50";

export default function AgentSendMenu({
  workspace,
  disabled,
  sending,
  onSend
}: {
  workspace: TerminalWorkspace;
  disabled: boolean;
  sending: boolean;
  onSend: (paneId: string, name: string, withScreenshot: boolean) => void;
}) {
  const t = useT();
  const { statuses, now } = useAgentStatuses();
  const [open, setOpen] = useState(false);
  const [withShot, setWithShot] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const agents = agentPanes(workspace);
  const canShot = !!workspace.root;
  const checked = withShot && canShot;

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={sending || undefined}
        disabled={disabled || sending}
        onClick={() => setOpen((value) => !value)}
        className={TOOL_BUTTON}
      >
        <Send size={14} aria-hidden />
        {sending ? t("browser.sending") : t("browser.send")}
      </button>
      {open && (
        <>
          <div aria-hidden data-testid="menu-backdrop" className="fixed inset-0 z-dropdown" onClick={close} />
          <div
            role="menu"
            aria-label={t("browser.sendMenu")}
            tabIndex={-1}
            ref={(el) => el?.focus()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
                return;
              }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const allItems = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
                );
                if (allItems.length === 0) return;
                const idx = allItems.indexOf(document.activeElement as HTMLElement);
                if (event.key === "ArrowDown") {
                  allItems[idx < 0 ? 0 : (idx + 1) % allItems.length]?.focus();
                } else {
                  allItems[idx < 0 ? allItems.length - 1 : (idx - 1 + allItems.length) % allItems.length]?.focus();
                }
              }
            }}
            className="absolute right-0 top-full z-dropdown mt-1 w-72 rounded-md border border-line bg-card p-1 shadow-xl outline-none"
          >
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={checked}
              disabled={!canShot}
              onClick={() => setWithShot((value) => !value)}
              className={ITEM}
            >
              <span
                aria-hidden
                className={`h-3 w-3 shrink-0 rounded-sm border ${checked ? "border-accent-500 bg-[var(--accent-glow)]" : "border-line-strong"}`}
              />
              {t("browser.withScreenshot")}
            </button>
            {!canShot && <p className="px-2 pb-1 text-2xs text-slate-500">{t("browser.noRootForScreenshot")}</p>}
            <div className="my-1 border-t border-line" />
            {agents.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-slate-400">{t("browser.noAgents")}</p>
            ) : (
              agents.map((pane) => {
                const name = agentName(pane, t);
                const status = cardStatus(pane, statuses[pane.id], now || Date.now());
                const role = pane.agent?.role?.trim();
                return (
                  <button
                    key={pane.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onSend(pane.id, name, checked);
                    }}
                    className={ITEM}
                  >
                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[status.tone]}`} />
                    <span className="min-w-0 flex-1 truncate">
                      {name}
                      {role ? <span className="text-slate-500"> · {role}</span> : null}
                    </span>
                    <span className="shrink-0 text-2xs text-slate-500">
                      {t(status.key, status.params)}
                      {status.estimated ? " ≈" : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
