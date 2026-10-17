import { useT } from "../i18n";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "./agentStatusContext";
import { ENGINE_LABEL } from "./agentLabels";

// Hiç ajan yokken (spec 2026-10-17 ajan-alani §4): kısa açıklama, tek ana
// eylem, kurulu motorlar. Düz terminal ikincil düğme olarak kalıyor (spec §2.8).
export default function AgentsEmptyState({
  allMinimized,
  onAddAgent,
  onAddShell
}: {
  allMinimized: boolean;
  onAddAgent: () => void;
  onAddShell: () => void;
}) {
  const t = useT();
  const { engines } = useAgentStatuses();
  const installed = (engines ?? []).filter((e) => e.installed && e.id !== "ozel").map((e) => t(ENGINE_LABEL[e.id]));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-sm text-slate-200">{allMinimized ? t("agents.allMinimized") : t("agents.emptyTitle")}</p>
        {!allMinimized && <p className="text-xs text-slate-500">{t("agents.emptyBody")}</p>}
      </div>
      <button type="button" onClick={onAddAgent} className={PRIMARY_BUTTON}>
        {t("agents.addFirst")}
      </button>
      {engines !== null && (
        <p className="text-2xs text-slate-500">
          {installed.length > 0 ? t("agents.installedEngines", { list: installed.join(", ") }) : t("agents.noEngines")}
        </p>
      )}
      <button type="button" onClick={onAddShell} className={TOOL_BUTTON}>
        {t("agents.addShellLong")}
      </button>
    </div>
  );
}
