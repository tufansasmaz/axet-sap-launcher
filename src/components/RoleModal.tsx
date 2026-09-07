import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Check, FlaskConical, Wrench } from "lucide-react";
import type { SkillPlanEntry, SkillProfile, SystemTier } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";

interface Props {
  open: boolean;
  /** Bağlanılan sistemin önem derecesi — PRD ise yazma yetenekli skill kurulmaz. */
  tier: SystemTier | null;
  /** Sistemin ekranda görünen adı; hangi bağlantı için sorulduğu belli olsun. */
  systemLabel?: string;
  onConfirm: (profile: SkillProfile, noticeAccepted: boolean) => void;
  onCancel: () => void;
}

const ROLES: { id: SkillProfile; icon: typeof BookOpen }[] = [
  { id: "module-consultant", icon: BookOpen },
  { id: "technical-consultant", icon: Wrench },
  { id: "sandbox", icon: FlaskConical }
];

/**
 * Rol seçimi. Bağlantı akışında BİR KERE sorulur, cevap ayarlara yazılır.
 *
 * Neden rol soruyoruz: kurulan her skill ajanın gördüğü bir talimat. Hepsini
 * herkese kurmak "daha çok yetenek" değil, ajanın önünde alakasız yol demek —
 * modül danışmanına abapGit anlatan bir skill, o danışmanın hiç sormadığı bir
 * işi yapmayı önerir.
 *
 * Önizleme `window.api.planSkills` ile ana süreçten geliyor: ekranda görünen
 * liste ile diske yazılan liste AYNI fonksiyondan çıksın diye. Renderer'da
 * ikinci bir kopya tutulsaydı ikisi zamanla ayrışır, kullanıcı gördüğünden
 * başkasını kurmuş olurdu.
 */
export default function RoleModal({ open, tier, systemLabel, onConfirm, onCancel }: Props) {
  const t = useT();
  const [profile, setProfile] = useState<SkillProfile>("module-consultant");
  const [plan, setPlan] = useState<SkillPlanEntry[]>([]);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void window.api
      .planSkills(profile, tier)
      .then((entries) => {
        if (alive) setPlan(entries);
      })
      .catch(() => {
        if (alive) setPlan([]);
      });
    return () => {
      alive = false;
    };
  }, [open, profile, tier]);

  // Rol değişince onay sıfırlanıyor: kullanıcı okuduğu metne değil, seçtiği
  // role onay veriyor. Rol değiştiyse onay da yenilenmeli.
  useEffect(() => {
    setAccepted(false);
  }, [profile]);

  const writeCapable = useMemo(() => plan.filter((entry) => entry.writeCapable), [plan]);
  const blocked = useMemo(() => plan.filter((entry) => entry.blockedByTier), [plan]);
  const willInstall = useMemo(() => plan.filter((entry) => !entry.blockedByTier), [plan]);

  // Onay yalnızca GERÇEKTEN kurulacak yazma yetenekli skill varsa isteniyor.
  // PRD'de hepsi zaten engellendiği için soru anlamsız olurdu.
  const needsNotice = writeCapable.some((entry) => !entry.blockedByTier);
  const canConfirm = !needsNotice || accepted;

  if (!open) return null;

  return (
    <div className="animate-backdrop-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm">
      <div className="animate-modal-pop-in flex max-h-[86vh] w-[620px] flex-col rounded-2xl border border-line/60 bg-card shadow-2xl shadow-black/50">
        <div className="border-b border-line/50 px-6 py-4">
          <h3 className="text-base font-semibold text-white">{t("roleModal.title")}</h3>
          <p className="mt-1 text-xs text-slate-400">
            {systemLabel
              ? t("roleModal.subtitleWithSystem", { system: systemLabel })
              : t("roleModal.subtitle")}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {ROLES.map(({ id, icon: Icon }) => {
              const selected = profile === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProfile(id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    selected
                      ? "border-lime-400/60 bg-lime-400/10"
                      : "border-line/60 bg-control/40 hover:border-line hover:bg-control/70"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      selected ? "border-lime-400/50 bg-lime-400/15" : "border-line/60 bg-control"
                    }`}
                  >
                    <Icon size={15} className={selected ? "text-lime-300" : "text-slate-400"} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{t(`roleModal.role.${id}`)}</span>
                      {selected && <Check size={13} className="text-lime-300" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                      {t(`roleModal.roleDesc.${id}`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("roleModal.previewTitle")}
              </span>
              <span className="text-2xs text-slate-500">
                {t("roleModal.previewCount", { count: willInstall.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-line/50 bg-control/30 p-3">
              {willInstall.map((entry) => (
                <span
                  key={entry.name}
                  className={`rounded-md border px-2 py-0.5 font-mono text-2xs ${
                    entry.writeCapable
                      ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                      : "border-line/60 bg-control text-slate-300"
                  }`}
                >
                  {entry.name}
                </span>
              ))}
              {blocked.map((entry) => (
                <span
                  key={entry.name}
                  className="rounded-md border border-line/40 bg-control/50 px-2 py-0.5 font-mono text-2xs text-slate-600 line-through"
                  title={t("roleModal.blockedHint")}
                >
                  {entry.name}
                </span>
              ))}
            </div>
          </div>

          {blocked.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--status-warning-text)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {t("roleModal.blockedNotice", { count: blocked.length })}
            </p>
          )}

          {needsNotice && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-lime-400"
              />
              <span className="text-xs leading-relaxed text-[var(--status-warning-text)]">
                {t("roleModal.noticeText")}
              </span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
          <button type="button" onClick={onCancel} className={DIALOG_CANCEL_BUTTON}>
            {t("roleModal.cancel")}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(profile, needsNotice)}
            className={`${DIALOG_CONFIRM_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t("roleModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
