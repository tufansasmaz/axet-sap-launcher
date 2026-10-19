// Üst şeritte ekibin PROJE KLASÖRÜ. Ekip = alan; alanın kökü (`root`) yeni
// ajanların ve kabukların klasörü, Değişiklikler ve Pano da onu kullanıyor
// (boardWorkspaceInfo). Kullanıcıya "depo/git" değil "proje klasörü" diye
// anlatılıyor: git yalnız Değişiklikler sekmesi için gerekli.
//   seçili değil → "Proje klasörü seç" (ipucunda şu anki yedek klasör),
//   seçili      → klasör adı çipi; tık = küçük panel: tam yol, durum satırı,
//                 duruma göre yardım (git init / git kurulumu / klasör yok) ve
//                 eylemler (başka klasör, Gezgin'de aç, bağı kaldır).
// Depo durumu Değişiklikler yöneticisinin sondajından (changes:state); klasör
// değişince yeni kök kaydedilene kadar "kontrol ediliyor…" (eski kökün durumu
// yeni klasöre yazılmıyor).
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, FolderGit2, Loader2 } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { ChangesState, RepoStatus } from "../../app-electron/shared/changesTypes";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";

const basename = (p: string) => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;

export const REPO_WARNING: Partial<Record<RepoStatus, TranslationKey>> = {
  notRepo: "repo.notRepo",
  noGit: "repo.noGit",
  missingDir: "repo.missingDir"
};

const REPO_DETAIL: Record<RepoStatus, TranslationKey> = {
  ok: "repo.okDetail",
  unknown: "repo.unknownDetail",
  notRepo: "repo.notRepoDetail",
  noGit: "repo.noGitDetail",
  missingDir: "repo.missingDirDetail"
};

export const GIT_INSTALL_COMMAND = "winget install Git.Git";
const GIT_SITE = "https://git-scm.com/download/win";

/** Kök değişince kayıt (config) yazılsın diye kısa bekleme; sonra depo yeniden sorulur. */
const RECHECK_MS = 500;
const PANEL_W = 320;
const EDGE = 8;

/**
 * Kökün depo durumu. `key` = kök + yenileme sayacı; yanıt hangi anahtar için
 * istendiyse ona yazılıyor, anahtar tutmuyorsa "kontrol ediliyor".
 */
function useRepoStatus(workspaceId: string, root: string, nonce: number): { repo: RepoStatus; checking: boolean } {
  const key = `${workspaceId}\u0000${root}\u0000${nonce}`;
  const [seen, setSeen] = useState<{ key: string; repo: RepoStatus } | null>(null);
  const asked = useRef<{ ws: string; root: string } | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;
  const seenRef = useRef(seen);
  seenRef.current = seen;

  useEffect(() => {
    const api = typeof window === "undefined" ? undefined : window.api;
    if (!root || !api?.changesState) return;
    let alive = true;
    const ask = () =>
      api.changesState(workspaceId).then(
        (next) => {
          if (alive) setSeen({ key, repo: next?.repo ?? "unknown" });
        },
        () => {
          if (alive) setSeen({ key, repo: "unknown" });
        }
      );
    // İlk açılışta, ekip değişince ve yenilemede hemen; aynı ekipte kök değişince
    // yeni kök config'e yazılsın diye kısa bekleme.
    const prev = asked.current;
    const delay = prev && prev.ws === workspaceId && prev.root !== root ? RECHECK_MS : 0;
    asked.current = { ws: workspaceId, root };
    if (delay === 0) {
      void ask();
      return () => {
        alive = false;
      };
    }
    const timer = setTimeout(() => void ask(), delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [workspaceId, root, key]);

  useEffect(() => {
    const api = typeof window === "undefined" ? undefined : window.api;
    if (!api?.onChangesChanged) return;
    return api.onChangesChanged((next: ChangesState) => {
      // Kontrol sürerken gelen yayın eski köke ait olabilir: yalnız güncel anahtara.
      if (next.workspaceId !== workspaceId || seenRef.current?.key !== keyRef.current) return;
      setSeen({ key: keyRef.current, repo: next.repo });
    });
  }, [workspaceId]);

  const checking = !seen || seen.key !== key;
  return { repo: checking ? "unknown" : seen.repo, checking };
}

export default function RepoChip({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { commands, agentCwd } = useTerminalStore();
  const root = workspace.root ?? "";
  const [nonce, setNonce] = useState(0);
  const { repo, checking } = useRepoStatus(workspace.id, root, nonce);
  const warning = root && !checking ? REPO_WARNING[repo] : undefined;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: EDGE, top: EDGE });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [copied, setCopied] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setError(null);
    setCopied(false);
    if (restoreFocus) chipRef.current?.focus();
  }, []);

  // Dış tık kapatır.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && (panelRef.current?.contains(target) || chipRef.current?.contains(target))) return;
      close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // Açılınca odak panelin ilk düğmesine.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("button, a[href]");
    (first ?? panelRef.current)?.focus();
  }, [open]);

  const pick = async () => {
    const folder = await window.api.pickFolder();
    // Elle seçilen kök SAP bağını düşürüyor (TeamTabs menüsüyle aynı kural).
    if (folder) commands.setWorkspaceRoot(workspace.id, folder, null);
  };

  const toggle = () => {
    if (open) return close(false);
    const rect = chipRef.current?.getBoundingClientRect();
    if (rect) setPos({ left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - PANEL_W - EDGE)), top: rect.bottom + 4 });
    setOpen(true);
  };

  const initRepo = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await window.api.changesInitRepo(workspace.id);
      if (result.ok) setNonce((n) => n + 1);
      else setError(result.reason === "timeout" ? "repo.initTimeout" : result.reason === "noGit" ? "repo.noGitDetail" : "repo.initFailed");
    } catch {
      setError("repo.initFailed");
    } finally {
      setBusy(false);
    }
  };

  const copyCommand = async () => {
    const r = await window.api.writeClipboard(GIT_INSTALL_COMMAND).catch(() => ({ ok: false }));
    setCopied(r.ok);
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

  const chipState = checking ? "checking" : warning ? "warning" : repo === "ok" ? "ok" : "unknown";
  const status = checking ? t("repo.checking") : t(REPO_DETAIL[repo]);

  return (
    <>
      <span
        data-repo-chip={chipState}
        className={`flex h-7 min-w-0 max-w-[18rem] shrink items-center rounded-md border text-xs ${
          warning ? "border-[var(--status-warning-border)] text-[var(--status-warning-text)]" : "border-line text-slate-300"
        }`}
      >
        <button
          ref={chipRef}
          type="button"
          onClick={toggle}
          title={`${root}\n${status}`}
          aria-label={t("repo.chipLabel", { name: basename(root) })}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-full min-w-0 cursor-pointer items-center gap-1 rounded-md px-2 hover:text-slate-100"
        >
          {checking ? (
            <Loader2 size={12} className="shrink-0 animate-spin text-slate-400" />
          ) : warning ? (
            <AlertTriangle size={12} className="shrink-0" />
          ) : (
            <FolderGit2 size={12} className="shrink-0 text-slate-400" />
          )}
          <span className="min-w-0 truncate font-mono text-2xs">{basename(root)}</span>
          {checking && <span className="shrink-0 text-2xs text-slate-400">{t("repo.checking")}</span>}
          {warning && <span className="shrink-0 text-2xs">{t(warning)}</span>}
        </button>
      </span>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("repo.title")}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            }
          }}
          className="fixed z-dropdown flex flex-col gap-2 rounded-md border border-line bg-card p-3 text-xs text-slate-300 shadow-xl outline-none"
          style={{ width: PANEL_W, left: pos.left, top: pos.top }}
        >
          <div className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{t("repo.title")}</div>
          <div className="break-all font-mono text-2xs text-slate-100">{root}</div>
          <div data-repo-status={chipState} className={warning ? "text-[var(--status-warning-text)]" : "text-slate-300"}>
            {status}
          </div>
          {!checking && repo === "notRepo" && (
            <button type="button" disabled={busy} onClick={() => void initRepo()} className={`${PRIMARY_BUTTON} self-start`}>
              {busy ? t("repo.initRunning") : t("repo.init")}
            </button>
          )}
          {!checking && repo === "noGit" && (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-app px-2 py-1 font-mono text-2xs text-slate-100">{GIT_INSTALL_COMMAND}</code>
              <button type="button" onClick={() => void copyCommand()} className={TOOL_BUTTON}>
                {copied ? t("repo.copied") : t("repo.copyCommand")}
              </button>
              <button type="button" onClick={() => void window.api.openExternalUrl(GIT_SITE)} className={TOOL_BUTTON}>
                {t("repo.gitSite")}
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="text-[var(--status-warning-text)]">
              {t(error)}
            </div>
          )}
          <p className="text-2xs leading-relaxed text-slate-400">{t("repo.bindHint")}</p>
          <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                close(false);
                void pick();
              }}
              className={TOOL_BUTTON}
            >
              {t("repo.change")}
            </button>
            {repo !== "missingDir" && (
              <button type="button" onClick={() => void window.api.changesOpenRoot(workspace.id)} className={TOOL_BUTTON}>
                {t("repo.open")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                close(false);
                commands.setWorkspaceRoot(workspace.id, null, null);
              }}
              className={TOOL_BUTTON}
            >
              {t("repo.unbind")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
