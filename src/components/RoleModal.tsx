import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Check, Lock, Wrench } from "lucide-react";
import type { SkillPlanEntry, SkillProfile, SystemTier } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CONFIRM_BUTTON } from "../ui/buttons";

interface Props {
  open: boolean;
  /** Bağlanılan sistemin önem derecesi — PRD ise yazma yetenekli skill kurulmaz. */
  tier: SystemTier | null;
  /** Sistemin ekranda görünen adı; hangi bağlantı için sorulduğu belli olsun. */
  systemLabel?: string;
  onConfirm: (profile: SkillProfile, noticeAccepted: boolean) => void;
}

/**
 * İKİ rol var, üç değil.
 *
 * `sandbox` profili `skillProfiles.ts`'te duruyor (eski kurulumlar onunla
 * kayıtlı olabilir, `store.ts` hâlâ kabul ediyor) ama SEÇİLEBİLİR değil —
 * kullanıcı, 2026-09-08: *"sadece 2 seçenek ya teknik ya modülcü olucak"*.
 * Her şeyi kuran bir profili seçenek olarak sunmak, "hangisi olduğunu
 * bilmiyorum" diyen herkesin varsayılanı olurdu ve rol ayrımının kendisini
 * anlamsızlaştırırdı.
 */
const ROLES: { id: SkillProfile; icon: typeof BookOpen }[] = [
  { id: "module-consultant", icon: BookOpen },
  { id: "technical-consultant", icon: Wrench }
];

/**
 * Rol seçimi. Uygulama İLK AÇILDIĞINDA sorulur, cevap ayarlara yazılır ve
 * **bir daha değişmez**.
 *
 * Neden rol soruyoruz: kurulan her skill ajanın gördüğü bir talimat. Hepsini
 * herkese kurmak "daha çok yetenek" değil, ajanın önünde alakasız yol demek —
 * modül danışmanına abapGit anlatan bir skill, o danışmanın hiç sormadığı bir
 * işi yapmayı önerir.
 *
 * ÜÇ KURAL, üçü de kullanıcının 2026-09-08 tarihli isteği:
 *   1. **İlk açılışta** sorulur (*"uygulama kurulduktan sonra açılır açılmaz
 *      danışmanlık statüsünü sorsun"*) — bağlantı akışında değil. Eskiden ilk
 *      bağlantıda soruluyordu; kuran ama henüz bağlanmayan kullanıcı rolsüz
 *      kalıyordu.
 *   2. **Zorunlu**: iptal yok, varsayılan seçili değil. Kapatma yolu bırakmak,
 *      seçimi "sonra hallederim"e çevirirdi — ve sonrası yok (3. kural).
 *   3. **Kalıcı**: *"daha sonra da değiştiremesin, uyarıyı da orda ver doğru
 *      seçmesi için"*. Bu yüzden uyarı bu pencerede, seçim düğmelerinin
 *      hemen altında duruyor; bilgi, kararın verildiği yerde.
 *
 * Önizleme `window.api.planSkills` ile ana süreçten geliyor: ekranda görünen
 * liste ile diske yazılan liste AYNI fonksiyondan çıksın diye. Renderer'da
 * ikinci bir kopya tutulsaydı ikisi zamanla ayrışır, kullanıcı gördüğünden
 * başkasını kurmuş olurdu.
 */
export default function RoleModal({ open, tier, systemLabel, onConfirm }: Props) {
  const t = useT();
  // Varsayılan YOK. Bir rol önceden seçili gelseydi, "İleri"ye basmak seçim
  // yapmakla aynı görünür; kalıcı bir karar için bu az.
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [plan, setPlan] = useState<SkillPlanEntry[]>([]);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open || !profile) {
      setPlan([]);
      return;
    }
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
  // Rol seçilmeden onay YOK — zorunluluğun tek gerçek karşılığı bu satır.
  const canConfirm = profile !== null && (!needsNotice || accepted);

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

          {/* KALICILIK UYARISI seçim düğmelerinin hemen altında: kullanıcı
              (2026-09-08) *"uyarıyı da orda ver doğru seçmesi için"*. Ayarlarda
              bir yerde dursaydı, kararın verildiği anda görünmezdi. */}
          <p className="flex items-start gap-2 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2.5 text-xs leading-relaxed text-[var(--status-warning-text)]">
            <Lock size={13} className="mt-0.5 shrink-0" />
            {t("roleModal.permanentWarning")}
          </p>

          {profile === null && <p className="text-xs text-slate-500">{t("roleModal.mustChoose")}</p>}

          {profile !== null && (
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
          )}

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

        {/* İPTAL DÜĞMESİ YOK — seçim zorunlu. Kapatma yolu bırakmak, kalıcı
            bir kararı "sonra" kutusuna atmak olurdu; sonra da yok. */}
        <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => profile && onConfirm(profile, needsNotice)}
            className={`${DIALOG_CONFIRM_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t("roleModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
