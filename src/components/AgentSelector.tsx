import { useEffect, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Info } from "lucide-react";
import type { AxetAgentEntry } from "../../app-electron/shared/agentTypes";
import { isRestrictedAgent, selectableAgents } from "../lib/axetAgents";
import { useT } from "../i18n";

interface Props {
  agents: AxetAgentEntry[];
  /** Sohbetin seçtiği ajan; null = axet-code varsayılanı. */
  current: string | null;
  /** axet-code yapılandırmasındaki varsayılan ajanın adı (okunamadıysa null). */
  defaultAgent: string | null;
  onSelect: (name: string | null) => void;
  /** Menü açılınca liste ve varsayılan tazelensin (kullanıcı TUI'de değiştirmiş olabilir). */
  onOpen?: () => void;
}

// Model seçicisinin yanında, composer içinde (ghost görünüm). Seçim SOHBETE
// ait ve her turda `--agent` ile gidiyor; axet-code yapılandırmasına yazılmıyor.
export default function AgentSelector({ agents, current, defaultAgent, onSelect, onOpen }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const defaultLabel = defaultAgent
    ? t("agentSelector.defaultNamed", { name: defaultAgent })
    : t("agentSelector.defaultUnknown");
  const label = current ?? defaultLabel;
  const defaultEntry = agents.find((a) => a.name === defaultAgent) ?? null;
  // İpucu yalnız kullanıcı seçmediyse: kendi seçtiği ajanı zaten biliyor.
  const hint =
    current === null && defaultAgent && isRestrictedAgent(defaultAgent, defaultEntry)
      ? t("agentSelector.restrictedHint", { name: defaultAgent })
      : null;

  return (
    <div ref={ref} className="relative" data-escape-owner={open ? "" : undefined}>
      <button
        type="button"
        data-testid="agent-selector"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((v) => !v);
        }}
        title={hint ? `${t("agentSelector.title")} — ${hint}` : t("agentSelector.title")}
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12px] text-slate-400 transition hover:bg-hover hover:text-slate-200"
      >
        {hint ? (
          <Info size={13} className="text-[var(--status-warning-text)]" />
        ) : (
          <Bot size={13} className="text-accent-400" />
        )}
        <span className="max-w-[150px] truncate font-medium">{label}</span>
        <ChevronDown size={12} className={`text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="animate-modal-pop-in absolute bottom-full right-0 z-50 mb-1.5 w-72 overflow-hidden rounded-lg border border-line bg-card shadow-2xl shadow-black/40">
          <div className="border-b border-line px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t("agentSelector.heading")}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {[{ name: null as string | null, text: defaultLabel, description: "" }, ...selectableAgents(agents).map((a) => ({ name: a.name as string | null, text: a.name, description: a.description }))].map(
              (item) => {
                const selected = item.name === current;
                return (
                  <button
                    key={item.name ?? "__varsayilan"}
                    type="button"
                    onClick={() => {
                      onSelect(item.name);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                      selected ? "bg-accent-500/15 text-[var(--accent-soft-text)]" : "text-slate-300 hover:bg-hover"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.text}</span>
                      {item.description && (
                        <span className="block truncate text-[10px] text-slate-500">{item.description}</span>
                      )}
                    </span>
                    {selected && <Check size={13} className="mt-0.5 shrink-0" />}
                  </button>
                );
              }
            )}
          </div>
          <div className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-slate-500">
            {hint ? <span className="text-[var(--status-warning-text)]">{hint} </span> : null}
            {t("agentSelector.scopeHint")}
          </div>
        </div>
      )}
    </div>
  );
}
