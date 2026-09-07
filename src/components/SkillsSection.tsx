import { useCallback, useEffect, useState } from "react";
import { AlertCircle, PencilLine, RefreshCw } from "lucide-react";
import type { SkillProfile, SkillStatus } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";

interface Props {
  /** Ayarlar formundaki (henüz kaydedilmemiş) rol. */
  profile: SkillProfile | null;
  onProfileChange: (profile: SkillProfile) => void;
  /** O an açık proje klasörü; yoksa liste gösterilemez. */
  projectDir: string | null;
}

const ROLES: SkillProfile[] = ["module-consultant", "technical-consultant", "sandbox"];

/**
 * Ayarlar'daki "Yapay zekâ yetenekleri" bölümü.
 *
 * İki soruya cevap veriyor, ikisi de bugüne kadar cevapsızdı: "bu projede
 * hangi yetenekler kurulu?" ve "güncel mi?". Sürüm damgası (`.version`)
 * olmadan ikincisi tahmine kalıyordu.
 *
 * Güncelleme düğmesi kurulumdan sonra o projenin bosta duran sıcak
 * oturumlarını kapatıyor (ana süreçte, `skills:reinstall`) — axet-code
 * skill'leri süreç açılışında tarıyor, kapatmasak güncelleme bir sonraki
 * turda hiçbir şeyi değiştirmezdi.
 */
export default function SkillsSection({ profile, onProfileChange, projectDir }: Props) {
  const t = useT();
  const [status, setStatus] = useState<SkillStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!projectDir) {
      setStatus(null);
      return;
    }
    void window.api
      .getSkillStatus(projectDir)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [projectDir]);

  useEffect(load, [load]);

  const reinstall = async () => {
    if (!projectDir || busy) return;
    setBusy(true);
    try {
      setStatus(await window.api.reinstallSkills(projectDir, null));
    } catch {
      load();
    } finally {
      setBusy(false);
    }
  };

  const toolkitVersion = status?.toolkit?.version ?? null;
  const installedVersion = status?.stamp?.version ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {t("skillsSection.roleLabel")}
        </label>
        <div className="inline-flex items-center gap-0.5 rounded-md border border-line bg-app/40 p-0.5">
          {ROLES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onProfileChange(id)}
              className={`cursor-pointer rounded-[5px] px-3 py-1.5 text-sm font-medium transition ${
                profile === id ? "bg-accent-500/25 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t(`roleModal.role.${id}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
          <PencilLine size={12} className="mt-0.5 shrink-0" />
          {t("skillsSection.roleHint")}
        </p>
      </div>

      {!projectDir && <p className="text-xs text-slate-500">{t("skillsSection.noProject")}</p>}

      {projectDir && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 text-xs text-slate-500">
              {t("skillsSection.versionLine", {
                toolkit: toolkitVersion ?? "—",
                installed: installedVersion ?? "—"
              })}
            </span>
            <button
              type="button"
              onClick={reinstall}
              disabled={busy}
              className={`${btn("neutral", "sm")} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : undefined} />
              {t("skillsSection.update")}
            </button>
          </div>

          {status?.updateAvailable && (
            <p className="flex items-start gap-1.5 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--status-warning-text)]">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              {t("skillsSection.driftNotice")}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 rounded-lg border border-line/50 bg-control/30 p-3">
            {status && status.skills.length === 0 && (
              <span className="text-xs text-slate-500">{t("skillsSection.empty")}</span>
            )}
            {status?.skills.map((skill) => (
              <span
                key={skill.name}
                title={skill.unknown ? t("skillsSection.unknownHint") : undefined}
                className={`rounded-md border px-2 py-0.5 font-mono text-2xs ${
                  skill.writeCapable
                    ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                    : skill.unknown
                      ? "border-line/40 bg-control/50 text-slate-500"
                      : "border-line/60 bg-control text-slate-300"
                }`}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
