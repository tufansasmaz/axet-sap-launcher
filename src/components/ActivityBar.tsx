import { Sparkles, Settings, Stethoscope, Sun, Moon, Languages, MousePointerClick, Plug, Server } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../i18n";
import type { AppTheme } from "../../app-electron/shared/types";

export type Activity =
  | "axetCode"
  | "sapLauncher"
  | "axetFlows"
  | "axetFlowsLive"
  | "sapGuiScripting"
  | "readiness";

interface Props {
  activity: Activity;
  onChange: (activity: Activity) => void;
  theme: AppTheme;
  language: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
  onOpenConnections: () => void;
  /** En az bir uygulama bağlıysa fişin üstünde küçük bir accent nokta. */
  connectorsConnected: boolean;
}

// VS Code'un "Activity Bar"ına benzer, NTT Studio'nun tüm modüllerini
// (axet.code sohbet ekranı, SAP Launcher, SAP GUI Scripting) tek bir dikey
// rayda listeleyen sol şerit.
// Yeni bir modül eklemek için sadece bu dosyadaki `activities` dizisine
// bir öğe eklemek yeterli — App.tsx'teki `activity === "..."` koşuluna
// karşılık gelen bir görünüm bileşeni eklenmesi hâlâ gerekiyor, ama
// navigasyon/ikon tarafı burada merkezi.
export default function ActivityBar({
  activity,
  onChange,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  onOpenSettings,
  onOpenConnections,
  connectorsConnected
}: Props) {
  const t = useT();

  // Aktif sekme kutusunun stili — sekmelerin HEPSİNDE aynı. Önceden axet.code
  // tek başına `bg-gradient-to-br from-accent-500 to-accent-600` + `shadow-lg`
  // kullanıyordu; bu hem src/index.css'in en başında yazılı olan "gradyan/
  // parlama/dekoratif efekt yok" kuralının tek istisnasıydı (üstelik en
  // görünür yerde, uygulama ilk açıldığında bakılan yerde), hem de accent
  // gradyan üstünde `text-white` kullandığı için açık temada koyu-üstüne-koyu
  // kontrast hatasına düşüyordu (bkz. --accent-on-rgb). Vurgu artık tek bir
  // yerden geliyor: butonun solundaki 3px accent şerit + kutunun içi.
  const boxBase = "flex h-8 w-8 items-center justify-center rounded-lg transition-colors";

  // Her modülün KENDİ rengi var (bkz. index.css `--module-*`). Seçili olan bu
  // renklerin hiçbirini kullanmıyor, vurgu yeşiline geçiyor: renk "hangi
  // modül", yeşil "hangisi açık" demek. İkisi aynı anda konuşsaydı, üç renkli
  // ikon arasından seçili olanı bulmak yine okumayı gerektirirdi.
  //
  // Seçili DEĞİLKEN renk %70 opaklıkta duruyor. Tam doygunlukta üç ikon da
  // aynı anda öne çıkıyor ve şerit "üç düğmeli bir oyuncak" gibi görünüyordu;
  // hover'da %100'e çıkması, farenin altındakinin diğer ikisinden ayrılmasına
  // yetiyor.
  const activities: { id: Activity; label: string; color: string; render: () => ReactNode }[] = [
    {
      id: "axetCode",
      label: t("activityBar.axetCode"),
      color: "var(--module-code)",
      render: () => <Sparkles size={17} />
    },
    {
      id: "sapLauncher",
      label: t("activityBar.sapLauncher"),
      // Logo DEĞİL, diğerleri gibi düz bir lucide ikonu (kullanıcı isteği,
      // 2026-09-04): tek renkli ikonların arasında duran renkli uygulama
      // logosu, SAP Launcher'ı bir "modül" değil "uygulamanın kendisi" gibi
      // gösteriyordu. Bu karar 2026-09-06'daki renklendirmede de korundu —
      // ikon artık renkli ama hâlâ diğer ikisiyle AYNI cinsten bir ikon,
      // gömülü bir marka işareti değil.
      color: "var(--module-sap)",
      render: () => <Server size={17} />
    },
    // axet.flows ve axet.flows Live girdileri BİLEREK yok (2026-09-04) —
    // bkz. App.tsx'in tepesindeki not. `Activity` birleşim tipinde
    // duruyorlar ki geri açmak tek bir dizi girdisi eklemek olsun.
    {
      id: "sapGuiScripting",
      label: t("activityBar.sapGuiScripting"),
      color: "var(--module-guiscript)",
      render: () => <MousePointerClick size={17} />
    },
    {
      id: "readiness",
      label: t("activityBar.readiness"),
      // Kimlik renkleri için YENİ BİR HUE UYDURULMADI. index.css'in tepesindeki
      // palet sözleşmesinde dört anlam var (lime/mavi/mor/turuncu/kırmızı) ve
      // bu ekran tam olarak "sistem, bilgi" ailesine düşüyor — ama SAP
      // Launcher'ın doygun mavisiyle aynı rayda karışmaması gerekiyordu.
      // `--navy-icon` bu yüzden seçildi: aynı mavi ailesinin nötr, çelik tonu,
      // zaten "bunlardan biri değilim" demek için var (bkz. dişli düğmesi).
      color: "var(--navy-icon)",
      render: () => <Stethoscope size={17} />
    }
  ];

  return (
    // Ray 56px DEĞİL 48px (kullanıcı isteği, 2026-09-06: "ilk rayı biraz daha
    // dar ve daha sakin yapardım"). Ekranın dörtte birinin navigasyon olduğu
    // hissini azaltmak için; asıl sidebar'a (272px) dokunulmadı, o kullanıcının
    // açık kararıyla aynı kaldı. Kutular da 44 -> 40px; ikon boyu (17px) ve
    // içteki hover kutusu (32px) sabit, yani daralan şey yalnızca boşluk.
    <div className="flex w-12 shrink-0 flex-col items-center justify-between border-r border-line bg-sidebar py-2">
      <div className="flex w-full flex-col items-center gap-1">
        {activities.map((item) => {
          const isActive = activity === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              title={item.label}
              className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors"
            >
              {/* Şerit PARLAK lime (`accent-500`), fonksiyonel ton değil:
                  kullanıcının "aktif navigation" için istediği yer tam burası
                  ve iki katmanlı lime kuralında küçük durum göstergesi parlak
                  tondan beslenir. İkon ise metin/ikon rolünde olduğu için
                  `accent-400`'de kalıyor. */}
              <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent-500 transition-all ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                }`}
              />
              <span
                className={`${boxBase} ${
                  isActive
                    ? "bg-accent-500/10 text-accent-400"
                    : "opacity-70 group-hover:bg-hover/60 group-hover:opacity-100"
                }`}
                // Seçiliyken renk sınıftan (`text-accent-400`) geliyor, bu
                // yüzden satır içi renk yalnızca seçili DEĞİLKEN veriliyor.
                style={isActive ? undefined : { color: item.color }}
              >
                {item.render()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alt grup butonları üsttekilerle AYNI kutu boyutunda (h-10 w-10) —
          bir ara h-11 idi, ray 48px'e inince ikisi birden küçüldü. Boyutun
          ORTAK olması şart: farklı olduğu sürümde dikey ray hizası gözle
          görülür şekilde kayıyordu. Ayırıcı da panel kenarlıklarının her
          yerde kullandığı base-700 tonunda (base-800 değil).

          RENK BURADA DA DURGUN HÂLDE VAR (kullanıcı isteği, 2026-09-06:
          *"ayarlar ve üstündeki simgelerin renkleri gözükmüyor"*). Önceki
          sürümde renk yalnızca hover'da geliyordu; gerekçesi "üstteki üç
          renkli ikonun taşıdığı bilgi kaybolmasın" idi ama pratikte sonuç
          şuydu: şeridin alt yarısı, fareyi üzerinden geçirene kadar gri bir
          ikon yığınıydı — yani renk hiç görülmüyordu.

          Üst ve alt grubun ayrımı artık renkle DEĞİL, opaklıkla yapılıyor:
          alt grup %75'te duruyor, hover'da %100'e çıkıyor. Böylece renk
          durgun hâlde de okunuyor ama navigasyon ikonlarının önüne geçmiyor.

          Tek istisna FİŞ: bağlıyken opaklığı da tam, çünkü orada renk bir
          dekorasyon değil bir DURUM. */}
      <div className="flex w-full flex-col items-center gap-1 border-t border-line pt-2">
        <button
          onClick={onToggleLanguage}
          title={t("activityBar.language")}
          className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center rounded-lg text-[var(--status-info-text)] opacity-75 transition hover:bg-hover hover:opacity-100"
        >
          <Languages size={15} />
          <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide">{language}</span>
        </button>
        {/* Güneş kehribar, ay mor: ikisi de ikonun kendi doğal rengi, yani
            öğrenilmesi gereken bir eşleme değil. Düğme "şu an hangi temadasın"
            değil "hangisine geçersin" gösteriyor (koyu temadayken güneş
            çiziliyor), renk de o hedefin rengi. */}
        <button
          onClick={onToggleTheme}
          title={t("activityBar.theme")}
          className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg opacity-75 transition hover:bg-hover hover:opacity-100 ${
            theme === "light" ? "text-[var(--module-code)]" : "text-[var(--action-amber-text)]"
          }`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {/* Bağlı uygulama varsa bunun uygulamanın HER YERİNDEN görünmesi
            gerekiyordu: bağlayıcılar artık yalnızca sohbetin değil iki ajanın
            da elinde, ama durumları yalnızca modal açılınca görülebiliyordu.
            Nokta, "araçlar şu an açık" demenin en ucuz yolu.

            Nokta artık accent DEĞİL, durum yeşili: bu bir seçim değil bir
            sağlık göstergesi ve accent yeşili uygulamanın her yerinde
            "seçili" demek. */}
        <button
          onClick={onOpenConnections}
          title={t("activityBar.connections")}
          className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[var(--status-success-text)] transition hover:bg-hover hover:opacity-100 ${
            connectorsConnected ? "opacity-100" : "opacity-75"
          }`}
        >
          <Plug size={16} />
          {connectorsConnected && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-line-subtle bg-[var(--status-success-text)]" />
          )}
        </button>
        {/* Ayarlar da renkli. Önceden bilerek renksizdi ("diğer her şey"
            düğmesinin konusu yok, o hâlde rengi de olmasın) — ama kullanıcı
            şeridin alt yarısını gri gördüğünde ilk saydığı ikon buydu, yani
            "nötr" niyeti "eksik" olarak okunuyordu. Nötr çelik mavisi
            (`--navy-icon`) seçildi: yanındaki dört renkten hiçbiriyle
            eşleşmiyor, dolayısıyla hâlâ "bunlardan biri değilim" diyor, ama
            artık gri değil. */}
        <button
          onClick={onOpenSettings}
          title={t("activityBar.settings")}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[var(--navy-icon)] opacity-75 transition hover:bg-hover hover:opacity-100"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
