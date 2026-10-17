import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Circle, ClipboardList, Eye, Sparkles, Stethoscope } from "lucide-react";
import type { AppConfig, DoctorReport, SkillProfile } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import DoctorSection from "./DoctorSection";
import ProjectBriefSection from "./ProjectBriefSection";
import SapContextSection from "./SapContextSection";
import SkillsSection from "./SkillsSection";
import { computeReadinessSteps, type ReadinessStep } from "../lib/readinessSteps";
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
    window.api.listDir(projectsBaseDir).then(() => {
      if (!cancelled) setProjectsDirExists(true);
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

  // Kart: doktor raporu gelene kadar gösterme (#4).
  // null = henüz ölçülmedi → flash'ı önle.
  const doctorReady = localDoctorReport !== null;
  const allDone = readinessSteps.every((s) => s.done);

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

      {/* IZGARA — kartlar SIRAYLA yerleşiyor, sütunlara elle bölünmüyor
          (kullanıcı isteği, 2026-09-08: *"proje reçetesi ve yapay zekâ
          yetenekleri yan yana olsun, hatta 3 sütun"*, ve *"ekranın her yerini
          kullanabilirsin, boşluk var sağda solda"*).

          Bu yüzden `max-w-*` YOK: ortalanmış dar bir sütun, 1920px'lik bir
          ekranda iki yanda 350'şer piksel boş bırakıyordu. Genişlik artık
          pencerenin kendisi.

          Kırılımlar: 1280px'e (xl) kadar tek sütun, sonra iki, 1536px'ten
          (2xl) sonra üç. Sol kenar çubuğu (272px) ve ray (48px) çıktıktan
          sonra üç sütun ancak orada ~390px'e ulaşıyor; daha dar ekranda reçete
          formunun alanları okunmayacak kadar kısalırdı.

          Dizilim: Reçete · Yetenekler · Teşhis aynı satırda ("ne verdim" ve
          "makine taşıyor mu" birlikte görünüyor), bağlam dosyası ise ALTTA
          tam genişlikte — o bir okuma değil, doğrulama yüzeyi ve dar bir
          sütunda satırları kırılıyor.

          `items-start`: kartlar satır boyuna GERİLMİYOR — gerildiklerinde
          içeriği kısa olan kartın altında sebepsiz boşluk kalıyordu. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Hazırlık kartı: doktor raporu gelince ve eksik adım varsa görünür (#4). */}
        {doctorReady && !allDone && onOpenSettings && (
          <div className="px-4 pt-4">
            <ReadinessCard
              steps={readinessSteps}
              onOpenSettings={onOpenSettings}
              onOpenRoleModal={onOpenRoleModal}
              onGoToLogon={onGoToLogon}
            />
          </div>
        )}

        <div className="grid w-full grid-cols-1 items-start gap-3 p-4 xl:grid-cols-2 2xl:grid-cols-3">
          <Card icon={ClipboardList} title={t("settingsModal.sectionProjectBrief")}>
            <ProjectBriefSection projectDir={projectDir} />
          </Card>

          <Card icon={Sparkles} title={t("settingsModal.sectionSkills")}>
            <SkillsSection profile={skillProfile} projectDir={projectDir} />
          </Card>

          <Card icon={Stethoscope} title={t("settingsModal.sectionDoctor")}>
            <DoctorSection onReport={handleDoctorReport} />
          </Card>

          <Card icon={Eye} title={t("readiness.sectionContext")} className="xl:col-span-2 2xl:col-span-3">
            <SapContextSection projectDir={projectDir} />
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Hazırlık kartı (İş 4 — 2026-10-17) ---

interface ReadinessCardProps {
  steps: ReadinessStep[];
  onOpenSettings: (section?: SettingsSectionId) => void;
  onOpenRoleModal?: () => void;
  onGoToLogon?: () => void;
}

function ReadinessCard({ steps, onOpenSettings, onOpenRoleModal, onGoToLogon }: ReadinessCardProps) {
  const t = useT();

  function handleAction(step: ReadinessStep) {
    const { action } = step;
    if (action.kind === "settings") onOpenSettings(action.section);
    else if (action.kind === "roleModal") onOpenRoleModal?.();
    else if (action.kind === "navigate") onGoToLogon?.();
  }

  return (
    <section
      data-testid="readiness-card"
      className="rounded-lg border border-line bg-card p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-200">{t("readiness.stepsCardTitle")}</h2>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.titleKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              {step.done ? (
                <CheckCircle2 size={15} className="shrink-0 text-[var(--status-success-text)]" aria-hidden />
              ) : (
                <Circle size={15} className="shrink-0 text-slate-600" aria-hidden />
              )}
              <span className={step.done ? "text-slate-400" : "text-slate-200"}>{t(step.titleKey)}</span>
            </span>
            {!step.done && (
              <button
                type="button"
                data-step={step.titleKey}
                onClick={() => handleAction(step)}
                className={btn("neutral", "sm")}
              >
                {t("readiness.stepsDo")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ayarlar'daki `Section` ile aynı okunuşu veren kart — o bileşen o dosyanın
 *  içinde yerel olduğu için burada tekrar yazıldı; dışarı alınması Ayarlar'ın
 *  tamamını bu ekrana bağlardı. */
function Card({
  icon: Icon,
  title,
  children,
  className = ""
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  /** Izgarada kaç sütun kaplayacağı — yalnızca yerleşim, görünüm değil. */
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-card ${className}`}>
      <header className="flex items-center gap-2 border-b border-line-subtle px-4 py-2.5">
        <Icon size={15} className="shrink-0 text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
