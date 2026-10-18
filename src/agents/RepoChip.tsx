// Üst şeritte ekibin deposu (Tur 3). Ekip = alan; alanın kökü (`root`) zaten
// yeni ajanların ve kabukların klasörü, Değişiklikler ve Pano da onu kullanıyor
// (boardWorkspaceInfo). Burada yalnız GÖRÜNÜR kılınıyor:
//   bağlı değil → "Depo bağla" (klasör seç); ipucunda şu anki yedek klasör,
//   bağlı      → klasör adı çipi (tık = değiştir, × = bağı kaldır); git deposu
//                değilse / git yoksa / klasör yoksa açık uyarı.
// Depo durumu Değişiklikler yöneticisinin sondajından (changes:state).
import { useEffect, useState } from "react";
import { AlertTriangle, FolderGit2, X } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { RepoStatus } from "../../app-electron/shared/changesTypes";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { useWorkspaceChanges } from "./useRailCounts";

const basename = (p: string) => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;

export const REPO_WARNING: Partial<Record<RepoStatus, TranslationKey>> = {
  notRepo: "repo.notRepo",
  noGit: "repo.noGit",
  missingDir: "repo.missingDir"
};

/** Kök değişince kayıt (config) yazılsın diye kısa bekleme; sonra depo yeniden sorulur. */
const RECHECK_MS = 500;

export default function RepoChip({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { commands, agentCwd } = useTerminalStore();
  const root = workspace.root ?? "";
  const [checkKey, setCheckKey] = useState(root);
  useEffect(() => {
    if (checkKey === root) return;
    const timer = setTimeout(() => setCheckKey(root), RECHECK_MS);
    return () => clearTimeout(timer);
  }, [root, checkKey]);
  const changes = useWorkspaceChanges(workspace.id, checkKey);
  const repo: RepoStatus = changes?.repo ?? "unknown";
  const warning = root ? REPO_WARNING[repo] : undefined;

  const pick = async () => {
    const folder = await window.api.pickFolder();
    // Elle seçilen kök SAP bağını düşürüyor (TeamTabs menüsüyle aynı kural).
    if (folder) commands.setWorkspaceRoot(workspace.id, folder, null);
  };

  if (!root) {
    return (
      <button
        type="button"
        data-repo-chip="none"
        onClick={() => void pick()}
        title={agentCwd ? t("repo.bindHintFallback", { path: agentCwd }) : t("repo.bindHint")}
        className={`${TOOL_BUTTON} shrink-0`}
      >
        <FolderGit2 size={12} />
        {t("repo.bind")}
      </button>
    );
  }

  return (
    <span
      data-repo-chip={warning ? "warning" : repo === "ok" ? "ok" : "unknown"}
      className={`flex h-7 min-w-0 max-w-[16rem] shrink items-center gap-1 rounded-md border pl-2 pr-0.5 text-xs ${
        warning
          ? "border-[var(--status-warning-border)] text-[var(--status-warning-text)]"
          : "border-line text-slate-300"
      }`}
    >
      {warning ? <AlertTriangle size={12} className="shrink-0" /> : <FolderGit2 size={12} className="shrink-0 text-slate-400" />}
      <button
        type="button"
        onClick={() => void pick()}
        title={`${root}\n${warning ? t(warning) : t("repo.change")}`}
        aria-label={t("repo.chipLabel", { name: basename(root) })}
        className="min-w-0 cursor-pointer truncate font-mono text-2xs hover:text-slate-100"
      >
        {basename(root)}
      </button>
      {warning && <span className="shrink-0 text-2xs">{t(warning)}</span>}
      <button
        type="button"
        onClick={() => commands.setWorkspaceRoot(workspace.id, null, null)}
        aria-label={t("repo.unbind")}
        title={t("repo.unbind")}
        className={GHOST_ICON_BUTTON}
      >
        <X size={11} />
      </button>
    </span>
  );
}
