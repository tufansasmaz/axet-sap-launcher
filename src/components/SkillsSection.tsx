import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, PencilLine, RefreshCw, Trash2 } from "lucide-react";
import type { CatalogSkillList, SkillProfile, SkillStatus } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";

interface Props {
  /** Ayarlar formundaki (henüz kaydedilmemiş) rol. */
  profile: SkillProfile | null;
  /** Rolü kaydeder; kayıt bittiğinde çözülür. */
  onProfileChange: (profile: SkillProfile) => Promise<void> | void;
  /** O an açık proje klasörü; yoksa liste gösterilemez. */
  projectDir: string | null;
}

const ROLES: SkillProfile[] = ["module-consultant", "technical-consultant", "sandbox"];

/** Kurulamama sebebi -> metin. Sebep HER ZAMAN yazılıyor; girdi gizlenmiyor. */
const BLOCKED_KEYS = {
  missing: "catalogSkills.blocked.missing",
  os: "catalogSkills.blocked.os",
  pluginRoot: "catalogSkills.blocked.pluginRoot",
  bundled: "catalogSkills.blocked.bundled"
} as const;

const ERROR_KEYS = {
  noFolder: "catalogSkills.error.noFolder",
  notFound: "catalogSkills.error.notFound",
  blocked: "catalogSkills.error.blocked",
  copy: "catalogSkills.error.copy"
} as const;

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
  const [catalog, setCatalog] = useState<CatalogSkillList | null>(null);
  /** O an kurulan/kaldırılan girdinin kimliği — yalnızca o düğme kilitleniyor. */
  const [pending, setPending] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<keyof typeof ERROR_KEYS | null>(null);

  const load = useCallback(() => {
    if (!projectDir) {
      setStatus(null);
      setCatalog(null);
      return;
    }
    void window.api
      .getSkillStatus(projectDir)
      .then(setStatus)
      .catch(() => setStatus(null));
    void window.api
      .listCatalogSkills(projectDir)
      .then(setCatalog)
      .catch(() => setCatalog(null));
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

  /**
   * Rol seçimi KURULUMU DA YAPIYOR.
   *
   * Eskiden yalnızca ayarı kaydediyordu; diskteki yetenekler "Güncelle"ye
   * basılana kadar eski rolün yetenekleriydi. Kullanıcı (2026-09-08):
   * *"danışman değişince skiller değişmiyor"*. Ayarın kendisi değiştiği hâlde
   * ajanın elindekinin değişmemesi, ekranın sessizce yanlış bilgi vermesiydi:
   * "Modül danışmanı" yazan bir kutunun altında teknik danışmanın yetenekleri
   * duruyordu.
   *
   * Sıra ŞART: önce rol diske yazılıyor (`await`), sonra kurulum. Ana süreçteki
   * `skills:reinstall` rolü config'ten okuyor — ters sırada bir önceki rolü
   * kurardı.
   */
  const chooseRole = async (id: SkillProfile) => {
    if (busy || id === profile) return;
    setBusy(true);
    try {
      await onProfileChange(id);
      if (projectDir) setStatus(await window.api.reinstallSkills(projectDir, null));
    } catch {
      load();
    } finally {
      setBusy(false);
    }
  };

  /**
   * Katalog kurulumu/kaldırması. Sonuç TAZE listeyi geri getiriyor, ama kurulu
   * yetenek rozetleri ayrı bir kaynaktan (`skills:status`) geliyor — o yüzden
   * ikisi birden tazeleniyor, yoksa çip listesi bir tur geride kalırdı.
   */
  const runCatalog = async (key: string, action: () => Promise<Awaited<ReturnType<typeof window.api.installCatalogSkill>>>) => {
    if (!projectDir || pending) return;
    setPending(key);
    setCatalogError(null);
    try {
      const result = await action();
      setCatalog(result.list);
      if (!result.ok && result.error) setCatalogError(result.error);
      setStatus(await window.api.getSkillStatus(projectDir));
    } catch {
      setCatalogError("copy");
      load();
    } finally {
      setPending(null);
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
              onClick={() => void chooseRole(id)}
              disabled={busy}
              className={`cursor-pointer rounded-[5px] px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                profile === id ? "bg-accent-500/25 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t(`roleModal.role.${id}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
          <PencilLine size={12} className="mt-0.5 shrink-0" />
          {busy ? t("skillsSection.roleApplying") : t("skillsSection.roleHint")}
        </p>
        {/* Seçili rolün NE DEMEK olduğu, seçim kutusunun hemen altında. Aynı
            metin rol penceresinde de gösteriliyor; oradan sonra bir daha
            görünmemesi, aylar sonra ayara dönen kişiyi rolün adıyla baş başa
            bırakıyordu. */}
        {profile && (
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{t(`roleModal.roleDesc.${profile}`)}</p>
        )}
        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--status-warning-text)]">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {t("skillsSection.roleWarning")}
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

          <div className="space-y-2 rounded-lg border border-line/50 bg-control/30 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">{t("catalogSkills.title")}</span>
              {catalog?.folder && (
                <span className="truncate text-2xs text-slate-500" title={catalog.folder}>
                  {t("catalogSkills.source", {
                    version: catalog.catalogVersion ?? "—",
                    department: catalog.department ?? "—"
                  })}
                </span>
              )}
            </div>

            {!catalog?.folder && <p className="text-xs leading-relaxed text-slate-500">{t("catalogSkills.noFolder")}</p>}
            {catalog?.folder && catalog.skills.length === 0 && (
              <p className="text-xs text-slate-500">{t("catalogSkills.empty")}</p>
            )}

            {catalogError && (
              <p className="flex items-start gap-1.5 text-xs text-[var(--status-danger-text)]">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                {t(ERROR_KEYS[catalogError])}
              </p>
            )}

            {catalog?.folder && catalog.skills.length > 0 && (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {catalog.skills.map((skill) => (
                  <li key={skill.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`font-mono text-2xs ${skill.blocked ? "text-slate-500" : "text-slate-300"}`}>
                        {skill.id}
                      </span>
                      {skill.installed && (
                        <span className="ml-1.5 rounded border border-line/60 bg-control px-1 py-px text-2xs text-slate-400">
                          {t("catalogSkills.installed")}
                        </span>
                      )}
                      {skill.description && !skill.blocked && (
                        <p className="truncate text-2xs text-slate-500" title={skill.description}>
                          {skill.description}
                        </p>
                      )}
                      {skill.blocked && (
                        <p className="text-2xs leading-relaxed text-slate-500">{t(BLOCKED_KEYS[skill.blocked])}</p>
                      )}
                      {!skill.blocked && skill.writeCapable && (
                        <p className="text-2xs leading-relaxed text-[var(--status-warning-text)]">
                          {t("catalogSkills.tierWarning", { tier: skill.riskTier })}
                        </p>
                      )}
                    </div>
                    {!skill.blocked && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={pending !== null}
                          onClick={() =>
                            void runCatalog(skill.id, () => window.api.installCatalogSkill(projectDir, skill.id))
                          }
                          className={`${btn("neutral", "sm")} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <Download size={12} className={pending === skill.id ? "animate-pulse" : undefined} />
                          {t(skill.installed ? "catalogSkills.reinstall" : "catalogSkills.install")}
                        </button>
                        {skill.removable && (
                          <button
                            type="button"
                            disabled={pending !== null}
                            title={t("catalogSkills.remove")}
                            onClick={() =>
                              void runCatalog(`rm:${skill.id}`, () =>
                                window.api.removeCatalogSkill(projectDir, skill.name)
                              )
                            }
                            className={`${btn("neutral", "sm")} disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
