// Araçlar görünümü (Tur 3): ajan motorları (axet-code, Claude Code, Codex,
// Gemini CLI, özel komut). Her motor için kurulu mu, sürüm, yol; kurulu
// değilse tek satırlık kurulum komutu (kopyala); varsayılan motor seçimi
// ("+ Ajan" penceresi onunla açılır). Bilgi `agents:engines` IPC'sinden
// (PATH'te `where`, .exe'de kabuksuz `--version`, npm kabuğunda package.json).
// Gizli anahtar/token gösterilmiyor, saklanmıyor: motorların kendi oturumu
// kendi terminalinde açılır.
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useT } from "../i18n";
import { AGENT_ENGINE_IDS, type AgentEngineId, type AgentEngineInfo } from "../../app-electron/shared/agentTypes";
import { ENGINE_INSTALL } from "../../app-electron/shared/agentEngines";
import { TOOL_BUTTON } from "../ui/buttons";
import CopyButton from "../components/CopyButton";
import { useAgentStatuses } from "./agentStatusContext";
import { ENGINE_LABEL } from "./agentLabels";
import { onDefaultEngineChange, readDefaultEngine, writeDefaultEngine } from "./defaultEngine";

export default function ToolsView() {
  const t = useT();
  const { engines: shared } = useAgentStatuses();
  const [fresh, setFresh] = useState<AgentEngineInfo[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [preferred, setPreferred] = useState<AgentEngineId | null>(() => readDefaultEngine());
  useEffect(() => onDefaultEngineChange(() => setPreferred(readDefaultEngine())), []);

  const engines = fresh ?? shared;
  const infoOf = (id: AgentEngineId) => engines?.find((e) => e.id === id);

  const recheck = async () => {
    setChecking(true);
    try {
      const list = await window.api.agentEngines(true);
      if (Array.isArray(list) && list.length > 0) setFresh(list);
    } catch {
      // eski bilgi kalır
    } finally {
      setChecking(false);
    }
  };

  const choose = (id: AgentEngineId) => {
    writeDefaultEngine(id);
    setPreferred(id);
  };

  return (
    <section aria-label={t("tools.title")} data-tools-view="" className="chat-scroll h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-14 py-6">
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-medium text-slate-100">{t("tools.title")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("tools.subtitle")}</p>
          </div>
          <button type="button" onClick={() => void recheck()} disabled={checking} className={`${TOOL_BUTTON} shrink-0 disabled:opacity-40`}>
            <RefreshCw size={12} className={checking ? "animate-spin" : undefined} />
            {checking ? t("tools.checking") : t("tools.recheck")}
          </button>
        </header>

        <div role="radiogroup" aria-label={t("tools.defaultLabel")} className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {AGENT_ENGINE_IDS.map((id) => {
            const info = infoOf(id);
            const known = info !== undefined;
            const installed = info?.installed ?? false;
            const install = ENGINE_INSTALL[id];
            const isDefault = preferred === id;
            return (
              <div key={id} data-engine={id} data-installed={known ? String(installed) : "unknown"} className="flex items-start gap-3 px-4 py-3">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isDefault}
                  aria-label={t("tools.makeDefault", { name: t(ENGINE_LABEL[id]) })}
                  title={t("tools.makeDefault", { name: t(ENGINE_LABEL[id]) })}
                  onClick={() => choose(id)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border ${
                    isDefault ? "border-accent-400" : "border-line-strong hover:border-slate-400"
                  }`}
                >
                  {isDefault && <span className="h-2 w-2 rounded-full bg-accent-400" />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">{t(ENGINE_LABEL[id])}</span>
                    {isDefault && <span className="text-2xs text-slate-500">{t("tools.default")}</span>}
                    <span className="ml-auto shrink-0">
                      {!known ? (
                        <span className="text-2xs text-slate-500">{t("tools.unknown")}</span>
                      ) : id === "ozel" ? (
                        <span className="text-2xs text-slate-500">{t("tools.custom")}</span>
                      ) : installed ? (
                        <span data-engine-state="installed" className="rounded-full bg-[var(--status-success-bg)] px-1.5 py-0.5 text-2xs text-[var(--status-success-text)]">
                          {info?.version ? t("tools.installedVersion", { version: info.version }) : t("tools.installed")}
                        </span>
                      ) : (
                        <span data-engine-state="missing" className="rounded-full bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-2xs text-[var(--status-warning-text)]">
                          {t("tools.missing")}
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500">{t(`tools.about.${id}` as Parameters<typeof t>[0])}</p>
                  {installed && info?.path && (
                    <p title={info.path} className="truncate font-mono text-2xs text-slate-400">
                      {info.path}
                    </p>
                  )}
                  {info?.note && <p className="text-2xs text-[var(--status-warning-text)]">{info.note}</p>}
                  {known && !installed && id !== "ozel" && (
                    install ? (
                      <div className="mt-1 flex min-w-0 items-center gap-1 rounded-md bg-app px-2 py-1">
                        <code data-install={id} className="min-w-0 flex-1 truncate font-mono text-2xs text-slate-200">
                          {install}
                        </code>
                        <CopyButton value={install} title={t("tools.copyInstall")} />
                      </div>
                    ) : (
                      <p className="text-2xs text-slate-400">{t("tools.installAxet")}</p>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-2xs text-slate-500">{t("tools.footnote")}</p>
      </div>
    </section>
  );
}
