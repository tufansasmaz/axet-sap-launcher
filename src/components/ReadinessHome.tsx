import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, ChevronRight, ClipboardList, Eye, Loader2, Sparkles, Stethoscope } from "lucide-react";
import type { AppConfig, DoctorReport, SkillProfile } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import DoctorSection from "./DoctorSection";
import ProjectBriefSection from "./ProjectBriefSection";
import SapContextSection from "./SapContextSection";
import SkillsSection from "./SkillsSection";
import { computeReadinessSteps, sortReadinessSteps, type ReadinessStep } from "../lib/readinessSteps";
import { doctorIssueCount } from "../lib/doctorRows";
import type { SettingsSectionId } from "./settings/settingsSections";
import { btn } from "../ui/buttons";

interface Props {
  projectDir: string | null;
  skillProfile: SkillProfile | null;
  /** Teşhis sonucunu App'e taşır — kenar çubuğundaki arıza noktası bunu izliyor. */
  onDoctorReport?: (report: DoctorReport | null) => void;
  // Hazırlık kartı için ekstra veriler (İş 4 — 2026-10-17).
  config?: AppConfig | null;
  everConnected?: boolean;
  onOpenSettings?: (section?: SettingsSectionId) => void;
  onOpenRoleModal?: () => void;
  onGoToLogon?: () => void;
}

/**
 * "Hazırlık" ekranı — bir turun BAŞLAMADAN ÖNCE doğru olması gerekenler tek
 * yerde: ajan neyi bilecek (proje reçetesi), neyi yapabilecek (yetenek
 * profili), bunlar ona NASIL göründü (sap-context.md), ve makine hepsini
 * taşıyabiliyor mu (ortam teşhisi).
 *
 * Üçü de önce Ayarlar'ın içindeydi ve orada bulunamıyordu (kullanıcı,
 * 2026-09-07: *"ekranlar nerde hacı"*). Sebebi yerleşim değil sınıflandırma
 * hatasıydı: Ayarlar "bir kere kur, unut" kutusudur, buradaki üç şey ise her
 * projede yeniden bakılan, arıza anında ilk açılan şeyler. Ayrı bir ekran
 * olmaları, dişlinin altına gömülmelerinden daha doğru — ama AYRI ÜÇ ekran
 * olmaları yanlış olurdu, çünkü üçü tek bir soruyu cevaplıyor: "bu proje
 * çalışmaya hazır mı?".
 *
 * Bölümlerin kendisi taşınmadı, olduğu gibi kullanılıyor: aynı bileşenler
 * Ayarlar'da da dursaydı iki ekran aynı durumu ayrı ayrı yazardı.
 */
export default function ReadinessHome({
  projectDir,
  skillProfile,
  onDoctorReport,
  config,
  everConnected = false,
  onOpenSettings,
  onOpenRoleModal,
  onGoToLogon
}: Props) {
  const t = useT();
  // DoctorSection'dan gelen teşhis sonucu — ReadinessCard için de kullanılıyor.
  // null = henüz bilinmiyor (kart gösterilmez); DoctorSection rapor gelince set eder.
  const [localDoctorReport, setLocalDoctorReport] = useState<DoctorReport | null>(null);

  const handleDoctorReport = (report: DoctorReport | null) => {
    setLocalDoctorReport(report);
    onDoctorReport?.(report);
  };

  // Adım 2: proje klasörü gerçekten var mı? IPC ile doğrula (#3).
  // listDir başarıyla dönerse → true, hata verirse (klasör yok) → false.
  // null = henüz bilinmiyor (kontrol sürüyor).
  const projectsBaseDir = (config?.projectsBaseDir ?? "").trim();
  const [projectsDirExists, setProjectsDirExists] = useState<boolean | null>(null);
  useEffect(() => {
    if (!projectsBaseDir) { setProjectsDirExists(false); return; }
    let cancelled = false;
    window.api.listDir(projectsBaseDir).then((r) => {
      // listDir asla reject etmez; {ok:false} ile hata bildirir.
      if (!cancelled) setProjectsDirExists(r.ok === true);
    }).catch(() => {
      if (!cancelled) setProjectsDirExists(false);
    });
    return () => { cancelled = true; };
  }, [projectsBaseDir]);

  // Hazırlık adımlarını hesapla — projectsDirExists null ise (kontrol sürüyor)
  // adım 2 "bilinmiyor" (false gibi davranır) ve kart flash atmaz.
  const readinessSteps = computeReadinessSteps({
    language: config?.language ?? null,
    skillProfile: config?.skillProfile ?? skillProfile,
    projectsBaseDir,
    projectsDirExists: projectsDirExists ?? false,
    doctorReport: localDoctorReport,
    everConnected
  });

  const doctorIssues = localDoctorReport ? doctorIssueCount(localDoctorReport.rows) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Başlık şeridi SAP Launcher ekranıyla aynı deri (`bg-sidebar`, `py-2.5`,
          alt kenarlık) — iki tam ekran arasında geçiş yaparken şeridin
          yerinden oynamaması için. */}
      <header className="flex items-center gap-3 border-b border-line bg-sidebar px-4 py-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-control"
          style={{ color: "var(--navy-icon)" }}
        >
          <Stethoscope size={17} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-200">{t("readiness.title")}</h1>
          <p className="truncate text-xs text-slate-500">{t("readiness.subtitle")}</p>
        </div>
      </header>

      {/* DÜZEN (2026-10-19, kullanıcı: *"hazırlık ekranı göze batıyor,
          düzeni hiç iyi değil"*). "Daha fazla arayüz değil, daha güçlü
          hiyerarşi":

          1. Üstte TEK soru: hazır mıyım? Dört adım tek sütun, hizalı satırlar
             (simge · ad · kısa açıklama · tek eylem). Eksikler üstte ve
             vurgulu, tamamlananlar sade ve altta. Teşhis sürerken adım 3
             "denetleniyor" — kart gizlenmiyor, yerinden oynamıyor.
          2. Altında ayrıntılar İKİ BAĞIMSIZ SÜTUNDA (dar ekranda tek). Eski
             3'lü ızgarada kartlar satır boyuna göre diziliyordu ve kısa
             kartın altında koca boşluklar kalıyordu; sütunlar ayrı yığın
             olunca boşluk yok. Sol: makine (teşhis — sorunlar üstte) ve
             ajanın gördüğü dosya; sağ: kullanıcının verdikleri (reçete,
             yetenekler).
          Genişlik 1400px'te duruyor: 1920px'lik ekranda iki sütun ~680px;
          daha geniş satırlar okunmuyordu. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4">
          {onOpenSettings && (
            <ReadinessCard
              steps={readinessSteps}
              onOpenSettings={onOpenSettings}
              onOpenRoleModal={onOpenRoleModal}
              onGoToLogon={onGoToLogon}
            />
          )}

          <h2 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("readiness.sectionDetails")}
          </h2>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
              <Card
                icon={Stethoscope}
                title={t("settingsModal.sectionDoctor")}
                badge={
                  doctorIssues === null ? null : doctorIssues > 0 ? (
                    <StatusBadge tone="danger">{t("doctorSection.summaryIssues", { count: doctorIssues })}</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">{t("doctorSection.summaryOk")}</StatusBadge>
                  )
                }
              >
                <DoctorSection onReport={handleDoctorReport} />
              </Card>
              <Card icon={Eye} title={t("readiness.sectionContext")}>
                <SapContextSection projectDir={projectDir} />
              </Card>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <Card icon={ClipboardList} title={t("settingsModal.sectionProjectBrief")}>
                <ProjectBriefSection projectDir={projectDir} />
              </Card>
              <Card icon={Sparkles} title={t("settingsModal.sectionSkills")}>
                <SkillsSection profile={skillProfile} projectDir={projectDir} />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Hazırlık kartı (İş 4 — 2026-10-17; düzen 2026-10-19) ---

interface ReadinessCardProps {
  steps: ReadinessStep[];
  onOpenSettings: (section?: SettingsSectionId) => void;
  onOpenRoleModal?: () => void;
  onGoToLogon?: () => void;
}

const BADGE_TONE = {
  danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  success: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
} as const;

function StatusBadge({ tone, children }: { tone: keyof typeof BADGE_TONE; children: React.ReactNode }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium ${BADGE_TONE[tone]}`}>{children}</span>
  );
}

function ReadinessCard({ steps, onOpenSettings, onOpenRoleModal, onGoToLogon }: ReadinessCardProps) {
  const t = useT();
  const ordered = sortReadinessSteps(steps);
  const doneCount = steps.filter((s) => s.done).length;
  const missing = steps.filter((s) => !s.done && !s.checking).length;
  const allDone = doneCount === steps.length;

  function handleAction(step: ReadinessStep) {
    const { action } = step;
    if (action.kind === "settings") onOpenSettings(action.section);
    else if (action.kind === "roleModal") onOpenRoleModal?.();
    else if (action.kind === "navigate") onGoToLogon?.();
  }

  return (
    <section
      data-testid="readiness-card"
      aria-labelledby="readiness-steps-title"
      className={`rounded-lg border bg-card ${missing > 0 ? "border-[var(--status-warning-border)]" : "border-line"}`}
    >
      <header className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
        <h2 id="readiness-steps-title" className="text-sm font-semibold text-slate-200">
          {t("readiness.stepsCardTitle")}
        </h2>
        <span className="text-xs text-slate-500">{t("readiness.stepsProgress", { done: doneCount, total: steps.length })}</span>
        <span className="ml-auto">
          {missing > 0 ? (
            <StatusBadge tone="warning">{t("readiness.stepsMissing", { count: missing })}</StatusBadge>
          ) : allDone ? (
            <StatusBadge tone="success">{t("readiness.stepsAllDone")}</StatusBadge>
          ) : null}
        </span>
      </header>
      {/* Hepsi tamamsa liste kapanıyor: başlıktaki "hazır" yeterli, dört
          yeşil satır ekranın en değerli yerini boşuna kaplıyordu. */}
      {!allDone && (
        <ul className="divide-y divide-line-subtle">
          {ordered.map((step) => {
            const todo = !step.done && !step.checking;
            return (
              <li
                key={step.titleKey}
                data-state={step.done ? "done" : step.checking ? "checking" : "todo"}
                className={`flex items-center gap-3 px-4 ${step.done ? "py-2" : "min-h-[56px] py-2.5"}`}
              >
                <span className="flex w-5 shrink-0 justify-center" aria-hidden>
                  {step.done ? (
                    <CheckCircle2 size={16} className="text-[var(--status-success-text)]" />
                  ) : step.checking ? (
                    <Loader2 size={16} className="animate-spin text-slate-500" />
                  ) : (
                    <AlertCircle size={16} className="text-[var(--status-warning-text)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${step.done ? "text-slate-500" : "font-medium text-slate-200"}`}>
                    {t(step.titleKey)}
                    <span className="sr-only">
                      {" — "}
                      {step.done
                        ? t("readiness.stepDoneSr")
                        : step.checking
                          ? t("readiness.stepChecking")
                          : t("readiness.stepTodoSr")}
                    </span>
                  </div>
                  {!step.done && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {step.checking ? t("readiness.stepChecking") : t(step.descKey)}
                    </p>
                  )}
                </div>
                {todo && (
                  <button
                    type="button"
                    data-step={step.titleKey}
                    onClick={() => handleAction(step)}
                    className={btn("neutral", "sm", "shrink-0")}
                  >
                    {t("readiness.stepsDo")}
                    <ChevronRight size={13} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Ayarlar'daki `Section` ile aynı okunuşu veren kart — o bileşen o dosyanın
 *  içinde yerel olduğu için burada tekrar yazıldı; dışarı alınması Ayarlar'ın
 *  tamamını bu ekrana bağlardı. */
function Card({
  icon: Icon,
  title,
  badge,
  children,
  className = ""
}: {
  icon: LucideIcon;
  title: string;
  /** Başlığın sağındaki kısa durum (ör. "2 sorun"). */
  badge?: React.ReactNode;
  children: React.ReactNode;
  /** Izgarada kaç sütun kaplayacağı — yalnızca yerleşim, görünüm değil. */
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-card ${className}`}>
      <header className="flex h-11 items-center gap-2 border-b border-line-subtle px-4">
        <Icon size={15} className="shrink-0 text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {badge && <span className="ml-auto">{badge}</span>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
