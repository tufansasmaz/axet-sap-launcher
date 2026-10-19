// Araçlar görünümü (Tur 3): ajan motorları (axet-code, Claude Code, Codex,
// Gemini CLI, özel komut). Her motor için kurulu mu, sürüm, yol; kurulu
// değilse tek satırlık kurulum komutu (kopyala) ve "Kur"; varsayılan motor
// seçimi ("+ Ajan" penceresi onunla açılır). Bilgi `agents:engines` IPC'sinden
// (PATH'te `where`, .exe'de kabuksuz `--version`, npm kabuğunda package.json).
// Gizli anahtar/token gösterilmiyor, saklanmıyor: motorların kendi oturumu
// kendi terminalinde açılır.
//
// Kur: komut sabit tablodan (`SETUP_COMMANDS`), onay penceresi çalışacak satırı
// aynen gösterir, kurulum Ajanlar'da GÖRÜNÜR bir cmd bölmesinde çalışır (gizli
// arka plan kurulumu yok). Bölmenin süreci bitince tespit yenilenir.
import { useContext, useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useT } from "../i18n";
import { AGENT_ENGINE_IDS, type AgentEngineId, type AgentEngineInfo } from "../../app-electron/shared/agentTypes";
import { ENGINE_INSTALL, isSetupKey, setupLine, SETUP_KEYS, type SetupKey } from "../../app-electron/shared/agentEngines";
import { TOOL_BUTTON } from "../ui/buttons";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";
import CopyButton from "../components/CopyButton";
import { setupRunning, TerminalStoreContext } from "../stores/terminalStoreContext";
import { useAgentStatuses } from "./agentStatusContext";
import { ENGINE_LABEL } from "./agentLabels";
import { onDefaultEngineChange, readDefaultEngine, writeDefaultEngine } from "./defaultEngine";

export default function ToolsView() {
  const t = useT();
  const { engines: shared } = useAgentStatuses();
  // Kur yalnız Ajanlar'ın bölme deposu varken (Terminal modu içinde).
  const store = useContext(TerminalStoreContext);
  const [fresh, setFresh] = useState<AgentEngineInfo[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [preferred, setPreferred] = useState<AgentEngineId | null>(() => readDefaultEngine());
  /** npm PATH'te mi; bilinmiyorsa null (Kur gösterilir, kabuk hatayı söyler). */
  const [npm, setNpm] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<{ key: SetupKey; engine: AgentEngineId } | null>(null);
  const [failed, setFailed] = useState<AgentEngineId | null>(null);
  useEffect(() => onDefaultEngineChange(() => setPreferred(readDefaultEngine())), []);

  const engines = fresh ?? shared;
  const infoOf = (id: AgentEngineId) => engines?.find((e) => e.id === id);

  const checkNpm = async () => {
    try {
      setNpm(await window.api.agentWhich("npm"));
    } catch {
      setNpm(null);
    }
  };

  const recheck = async () => {
    setChecking(true);
    try {
      void checkNpm();
      const list = await window.api.agentEngines(true);
      if (Array.isArray(list) && list.length > 0) setFresh(list);
    } catch {
      // eski bilgi kalır
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (store) void checkNpm();
  }, [store !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Süren kurulumlar; biri bitince (bölme kapandı ya da süreç çıktı) tespit
  // yenileniyor. Görünüm, kurulum sürerken kapanmış olabilir: takılınca biten
  // bir kurulum varsa da yenileniyor.
  const busyKeys = SETUP_KEYS.filter((key) => store !== null && setupRunning(store.state, store.setupRuns[key]));
  const busyRef = useRef<string[] | null>(null);
  const busySig = busyKeys.join(",");
  useEffect(() => {
    const before = busyRef.current;
    busyRef.current = busyKeys;
    const finished =
      before === null
        ? SETUP_KEYS.some((key) => store?.setupRuns[key] !== undefined && !busyKeys.includes(key))
        : before.some((key) => !busyKeys.includes(key as SetupKey));
    if (finished) void recheck();
  }, [busySig]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: AgentEngineId) => {
    writeDefaultEngine(id);
    setPreferred(id);
  };

  const nameOf = (key: SetupKey) => (key === "node" ? t("tools.nodeName") : t(ENGINE_LABEL[key]));

  const runSetup = () => {
    if (!confirm || !store) return;
    const { key, engine } = confirm;
    setConfirm(null);
    const paneId = store.commands.addSetupPane(key, t("tools.setupPaneTitle", { name: nameOf(key) }));
    if (!paneId) {
      setFailed(engine);
      return;
    }
    setFailed(null);
    store.commands.revealPane(paneId);
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
                  {store && known && isSetupKey(id) && (() => {
                    const needNode = npm === false;
                    const key: SetupKey = needNode ? "node" : id;
                    const busy = busyKeys.includes(key);
                    // Kurulu motor "Güncelle": aynı komut en son sürümü kurar.
                    if (installed && needNode) return null;
                    const label = busy ? t("tools.installing") : needNode ? t("tools.installNode") : installed ? t("tools.update") : t("tools.install");
                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          data-setup={key}
                          disabled={busy}
                          onClick={() => {
                            setFailed(null);
                            setConfirm({ key, engine: id });
                          }}
                          className={`${TOOL_BUTTON} disabled:opacity-40`}
                        >
                          {busy ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                          {label}
                        </button>
                        {needNode && !installed && <span className="text-2xs text-slate-500">{t("tools.nodeMissing")}</span>}
                      </div>
                    );
                  })()}
                  {failed === id && (
                    <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
                      {t("tools.setupFailed")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-2xs text-slate-500">{t("tools.footnote")}</p>
      </div>
      <Modal
        open={confirm !== null}
        layer="confirm"
        size="sm"
        title={confirm ? t("tools.confirmTitle", { name: nameOf(confirm.key) }) : ""}
        icon={<Download size={18} className="text-slate-300" />}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <ModalCancelButton label={t("tools.cancel")} autoFocus />
            <Button variant="primary" onClick={runSetup}>
              {t("tools.confirmRun")}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="flex flex-col gap-2">
            <code data-setup-line="" className="block break-all rounded-md bg-app px-2 py-1.5 font-mono text-xs text-slate-200">
              {setupLine(confirm.key)}
            </code>
            <p className="text-sm text-slate-400">{t("tools.confirmBody")}</p>
          </div>
        )}
      </Modal>
    </section>
  );
}
