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
  /** Rolü KAYDEDER ve kayıt bitince çözülür — yetenek bölümü kurulumu buna
   *  zincirliyor, yoksa kurulum bir önceki rolü okuyordu. */
  onProfileChange: (profile: SkillProfile) => Promise<void> | void;
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
        <div className="grid w-full grid-cols-1 items-start gap-3 p-4 xl:grid-cols-2 2xl:grid-cols-3">
          <Card icon={ClipboardList} title={t("settingsModal.sectionProjectBrief")}>
            <ProjectBriefSection projectDir={projectDir} />
          </Card>

          <Card icon={Sparkles} title={t("settingsModal.sectionSkills")}>
            <SkillsSection profile={skillProfile} onProfileChange={onProfileChange} projectDir={projectDir} />
          </Card>

          <Card icon={Stethoscope} title={t("settingsModal.sectionDoctor")}>
            <DoctorSection onReport={onDoctorReport} />
          </Card>

          <Card icon={Eye} title={t("readiness.sectionContext")} className="xl:col-span-2 2xl:col-span-3">
            <SapContextSection projectDir={projectDir} />
          </Card>
        </div>
      </div>
    </div>
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
