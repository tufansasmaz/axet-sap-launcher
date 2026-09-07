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

      {/* İKİ SÜTUN (kullanıcı isteği, 2026-09-08: *"full alt alta yapmışsın
          olmamış"*). Tek sütun dört kartı 3.000 pikselden uzun bir şeride
          diziyordu: en alttaki teşhis kartı, ekran ne kadar geniş olursa olsun
          kaydırmadan görünmüyordu — yani "bu proje hazır mı?" sorusunun cevabı
          tek bakışta okunamıyordu, ki bu ekranın tek işi o.

          Sütunlar İÇERİĞE göre bölündü, sırayla değil: solda "ne verdim"
          (reçete + yetenekler), sağda "ne gitti / makine taşıyor mu" (bağlam
          + teşhis). Basit bir `grid` bunu yapamazdı, kartları sıraya göre
          dağıtırdı; bu yüzden iki ayrı sütun elemanı var.

          `items-start`: kartlar sütun boyuna GERİLMİYOR — gerildiklerinde
          içeriği kısa olan kartın altında sebepsiz boşluk kalıyordu.

          1100px altında tek sütuna düşüyor (`xl`), çünkü asıl sidebar (272px)
          ve ray (48px) çıktıktan sonra iki sütun ancak orada nefes alıyor;
          daha dar ekranda satır uzunlukları okunmayacak kadar kısalıyor. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-3 p-4 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <Card icon={ClipboardList} title={t("settingsModal.sectionProjectBrief")}>
              <ProjectBriefSection projectDir={projectDir} />
            </Card>

            <Card icon={Sparkles} title={t("settingsModal.sectionSkills")}>
              <SkillsSection profile={skillProfile} onProfileChange={onProfileChange} projectDir={projectDir} />
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <Card icon={Stethoscope} title={t("settingsModal.sectionDoctor")}>
              <DoctorSection onReport={onDoctorReport} />
            </Card>

            {/* Teşhis ÜSTTE: arıza noktası bu ekrana çağırıyorsa aranan şey o.
                Bağlam dosyası altta, çünkü uzun ve okunmak için değil
                doğrulanmak için açılıyor. */}
            <Card icon={Eye} title={t("readiness.sectionContext")}>
              <SapContextSection projectDir={projectDir} />
            </Card>
          </div>
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
