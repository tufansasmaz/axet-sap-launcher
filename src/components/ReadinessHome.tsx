import type { LucideIcon } from "lucide-react";
import { ClipboardList, Eye, Sparkles, Stethoscope } from "lucide-react";
import type { DoctorReport, SkillProfile } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import DoctorSection from "./DoctorSection";
import ProjectBriefSection from "./ProjectBriefSection";
import SapContextSection from "./SapContextSection";
import SkillsSection from "./SkillsSection";

interface Props {
  projectDir: string | null;
  skillProfile: SkillProfile | null;
  /** Teşhis sonucunu App'e taşır — kenar çubuğundaki arıza noktası bunu izliyor. */
  onDoctorReport?: (report: DoctorReport | null) => void;
  onProfileChange: (profile: SkillProfile) => void;
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
export default function ReadinessHome({ projectDir, skillProfile, onProfileChange, onDoctorReport }: Props) {
  const t = useT();

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

      {/* Tek sütun. İki sütuna bölmek denenebilirdi ama bölümlerin çoğu
          (reçete formu, teşhis satırları, bağlam dosyası) dikey listeler ve
          yan yana konduklarında satır uzunlukları okunmayacak kadar
          kısalıyor. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
          <Card icon={ClipboardList} title={t("settingsModal.sectionProjectBrief")}>
            <ProjectBriefSection projectDir={projectDir} />
          </Card>

          <Card icon={Sparkles} title={t("settingsModal.sectionSkills")}>
            <SkillsSection profile={skillProfile} onProfileChange={onProfileChange} projectDir={projectDir} />
          </Card>

          {/* Üçüncü sıra bilerek: üstteki iki kart "ne verdim" tarafı, bu
              kart "ne gitti" tarafı, sonuncusu "makine taşıyor mu". */}
          <Card icon={Eye} title={t("readiness.sectionContext")}>
            <SapContextSection projectDir={projectDir} />
          </Card>

          <Card icon={Stethoscope} title={t("settingsModal.sectionDoctor")}>
            <DoctorSection onReport={onDoctorReport} />
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Ayarlar'daki `Section` ile aynı okunuşu veren kart — o bileşen o dosyanın
 *  içinde yerel olduğu için burada tekrar yazıldı; dışarı alınması Ayarlar'ın
 *  tamamını bu ekrana bağlardı. */
function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card">
      <header className="flex items-center gap-2 border-b border-line-subtle px-4 py-2.5">
        <Icon size={15} className="shrink-0 text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
