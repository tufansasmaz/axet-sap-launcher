import { useEffect, useState } from "react";
import { AlertTriangle, Pencil, Plug } from "lucide-react";
import type { AxetChatActivityPhase, ChatAttachment } from "../../app-electron/shared/types";
import { renderMarkdownLite } from "../lib/markdownLite";
import AttachmentChip from "./AttachmentChip";
import CopyButton from "./CopyButton";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  createdAt: number;
  // Mesajla birlikte gönderilen dosyalar. Metnin İÇİNDE değiller: yolları
  // sadece `axet-code`'a giden prompt'a ekleniyor (bkz. lib/attachments.ts
  // `promptWithAttachments`), ekranda küçük resim/çip olarak çiziliyorlar.
  attachments?: ChatAttachment[];
  // Cevap HÂLÂ akarken `true` (bkz. AxetCodeHome `onChatChunk` aboneliği);
  // `axetChat:send` sonucu döndüğünde temizlenir. Sadece görsel: metnin
  // sonuna yanıp sönen bir imleç koyar ve kopyala/saat meta satırını yarım
  // bir cevaba iliştirmemek için gizler.
  streaming?: boolean;
  // Bu cevap üretilirken Outlook/SharePoint araçları AÇIK MIYDI? `auto`
  // kipinde karar mesajın metnine bakılarak veriliyor (bkz. axetChat.ts) ve
  // yanılabilir; bu alan o kararı görünür kılıyor. Sohbet geçmişine de
  // yazılıyor, yani eski bir cevaba dönüp bakıldığında da belli.
  usedConnectors?: boolean;
}

// NOT — burada eskiden bir SİMÜLE daktilo animasyonu vardı
// (`TypewriterMarkdown`, `TARGET_REVEAL_MS`). Tamamen kaldırıldı: "axet-code
// run -q stdout'u tamponluyor, ilk çıktı process kapanana kadar gelmiyor"
// varsayımı üzerine kurulmuştu ve o varsayım canlı ölçümle ÇÜRÜTÜLDÜ (tek
// cevapta 16 saniyeye yayılmış 178 ayrı `data` chunk'ı — bkz. PROJE-BILGI.md
// düzeltme notu). Artık metin GERÇEKTEN üretildiği hızda akıyor; sahte bir
// animasyon hem gereksiz hem de gerçek akışın üstüne binerek onu geciktirir.
//
// GEMİNİ DÜZENİ (kullanıcı kararı — bkz. PROJE-BILGI.md Faz 4):
//   - Kullanıcı istemi SAĞDA, dolgun ve çok yuvarlak bir hap balon.
//   - Cevap SOLDA, balonsuz; solunda 28px'lik bir ✦ oluğu var. Bir ara
//     avatarlar tamamen kaldırılmıştı; Gemini SADECE cevap tarafında bir
//     simge kullanıyor (istem tarafında kullanmıyor) ve referans o olduğu
//     için bu asimetri bilinçli.
//   - Eylem düğmeleri (kopyala) hover'a GİZLENMİYOR — Gemini'de her zaman
//     görünürler; gizli bir düğme, varlığı bilinmediği için kullanılmıyor.
// Gövde metni boyutu kullanıcı ayarından (Ayarlar > Sohbet görünümü) geliyor;
// `App.tsx` sembolik ayarı `--chat-font-size`'a çeviriyor. Tailwind'de bir CSS
// değişkenini font boyutu olarak kullanmak `text-[length:var(...)]` yazımını
// GEREKTİRİR — `text-[var(...)]` yazılırsa Tailwind onu RENK sanır ve boyut
// hiç uygulanmaz. `leading` birimsiz bırakıldı ki boyutla birlikte ölçeklensin.
const BODY = "text-[length:var(--chat-font-size)] leading-[1.7]";

function formatClock(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ChatBubble({
  message,
  onEdit
}: {
  message: ChatMessage;
  // Kullanıcı mesajını düzenle: metni composer'a geri koyar ve sohbeti O
  // MESAJDAN itibaren keser (bkz. AxetCodeHome.handleEditMessage). Sadece
  // kullanıcı mesajlarında anlamlı.
  onEdit?: (id: string, content: string) => void;
}) {
  const t = useT();

  if (message.role === "user") {
    const attachments = message.attachments ?? [];
    return (
      <div className="group flex flex-col items-end gap-1">
        {/* Ekler balonun ÜSTÜNDE ve balonun dışında — hem sadece ek gönderilen
            (metinsiz) bir mesajda boş bir balon kalmasın, hem de görseller
            balonun dolgusuyla kırpılmasın diye. `justify-end`: istem tarafı
            sağa yaslı. */}
        {attachments.length > 0 && (
          <div className="flex max-w-[80%] flex-wrap justify-end gap-2">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} variant="message" />
            ))}
          </div>
        )}
        {message.content && (
          <div className={`max-w-[80%] rounded-3xl bg-base-800 px-5 py-3 text-slate-100 ${BODY}`}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}
        {/* İstem tarafındaki düğmeler hover'da: bir cevabı kopyalamak sık, kendi
            yazdığını kopyalamak nadir. `opacity-0` kullanılıyor `hidden` değil —
            aksi hâlde fareyi mesajın üstüne getirmek listeyi kaydırırdı. */}
        <div className="flex h-6 items-center gap-0.5 pr-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <span className="mr-1 text-[11px] text-slate-500">{formatClock(message.createdAt)}</span>
          {onEdit && (
            <button
              onClick={() => onEdit(message.id, message.content)}
              title={t("axetCodeHome.editMessage")}
              className="cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:bg-base-800 hover:text-slate-200"
            >
              <Pencil size={13} />
            </button>
          )}
          <CopyButton value={message.content} />
        </div>
      </div>
    );
  }

  // Cevap tarafında AVATAR YOK (kullanıcı geri bildirimi, 2026-09-02:
  // *"chatte hâlâ logo gözüküyor cevaplarda"*). Bir ara burada 26px'lik bir
  // logo oluğu vardı ve düzenin geri kalanı ona göre hizalanmıştı — kaldıran
  // biri, ChatSessionPane'deki "Yeniden üret" düğmesinin `ml-[42px]`
  // girintisini de kaldırmalı, yoksa düğme cevap metninden içeride kalır.
  // Kim kimden ayrılıyor artık hizadan belli: istem sağda ve balonlu, cevap
  // solda ve balonsuz.
  return (
    <div className="min-w-0">
      <div
        className={
          message.error
            ? `flex items-start gap-2.5 rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-[var(--status-danger-text)] ${BODY}`
            : `min-w-0 text-slate-200 ${BODY}`
        }
      >
        {message.error && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
        <div className="min-w-0 flex-1">
          {renderMarkdownLite(message.content)}
          {/* Akış imleci — metin hâlâ gelirken sonunda yanıp sönen blok.
              Boş bir cevabın (henüz ilk parça gelmemiş) yüksekliği sıfır
              olmasın diye `inline-block` + `align-[-2px]`. */}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-accent-400 align-[-2px]" />
          )}
        </div>
      </div>
      {/* Akış sürerken gizli — yarım bir cevabı kopyalatmanın anlamı yok. */}
      {!message.streaming && !message.error && (
        <div className="mt-1 flex h-7 items-center gap-2">
          <CopyButton value={message.content} title={t("copyButton.copyAnswer")} />
          {/* Bu cevap Outlook/SharePoint araçlarına erişebiliyor muydu?
              "Gerektiğinde" kipinde bu bir TAHMİN ve tahmin yanılabilir —
              işaret olmasa yanılgı sessiz olurdu: kullanıcı "neden mailime
              bakmadı" ya da "neden bu kadar yavaştı" diye sorar, cevabı
              hiçbir yerde yazmaz. Sadece açıkken gösteriliyor; kapalı olan
              her cevaba rozet basmak gürültü olurdu. */}
          {message.usedConnectors && (
            <span
              title={t("chatBubble.connectorsUsedHint")}
              className="flex items-center gap-1 rounded-full border border-base-700 px-1.5 py-0.5 text-[10px] text-slate-500"
            >
              <Plug size={10} />
              {t("chatBubble.connectorsUsed")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Yanıt beklenirken gösterilen gösterge. İki eski tasarım da elendi:
//  1. Sayısal bir bekleme sayacı — saniyelerin akışını izletmek beklemeyi
//     "daha yavaş" hissettiriyordu.
//  2. Logo + birkaç saniyede bir değişen durum cümleleri ("Düşünüyor…",
//     "axet.code ile konuşuluyor…") — kullanıcı geri bildirimi, 2026-09-02.
// Şimdiki tasarımda HİÇ METİN VE LOGO YOK: cevabın belireceği yerde kısa/uzun
// parçalardan oluşan tek bir satır duruyor ve üzerlerinden marka renginde bir
// ışık SIRAYLA geçiyor (bkz. index.css `.chat-morse-dot`). Beklemeyi anlatmak
// yerine gelecek cevabın YERİNİ gösteriyor.

// Parça genişlikleri (px) — kısa = nokta, uzun = çizgi. Kullanıcı isteği:
// *"mors alfabesi gibi parlayan şekilde olsun, parçalı parçalı"*, ardından
// *"çok geniş kalın olmuş, ince çizgiler ve tek satır"* (2026-09-02): üç
// satırlık kalın blok, cevap gelmeden önce ekranı fazla dolduruyordu. Artık
// TEK satır ve 3px — bir gösterge kadar yer kaplıyor, bir paragraf taslağı
// kadar değil.
//
// Desen SABİT (rastgele değil): her render'da yeniden üretilen bir desen,
// React her yeniden çizdiğinde animasyonu baştan başlatır ve dalga tökezler.
const MORSE_SEGMENTS: readonly number[] = [16, 6, 11, 6, 16, 6, 11, 16, 6];

// Işığın bir sonraki parçaya geçme gecikmesi. TOPLAMI, index.css'teki
// `chat-morse-glow` döngüsünden (2000ms) küçük kalmalı — 9 parça × 80ms =
// 720ms. Aşarsa dalga akmaz, gösterge rastgele titrer.
const MORSE_STEP_MS = 80;

// Gösterge, çubukların YANINA alt sürecin o an ne yaptığını da yazıyor
// (kullanıcı isteği, 2026-09-04: *"eğer anlık olarak bişey yapıyorsa arka
// planda onları da görsek fena olmaz"*). Kaynak `axet-code run -v`'nin canlı
// stderr'i — bkz. main/axetChat.ts.
//
// DÜRÜSTLÜK NOTU: axet-code, denetim kaydını yazdıktan sonra cevap gelene
// kadar HİÇBİR ŞEY yazmıyor (ölçüldü: 12 saniyeye varan tam sessizlik; araç
// çağrıları hiçbir akışa düşmüyor). O yüzden `thinking` aşamasında yapılan
// tek dürüst şey, geçen SÜREYİ saymak: uydurma bir "dosyaları okuyor"
// yazmaktansa "12 sn"nin kendisi daha çok bilgi.
const PHASE_KEYS: Record<AxetChatActivityPhase, TranslationKey> = {
  starting: "axetCodeHome.phaseStarting",
  connectors: "axetCodeHome.phaseConnectors",
  skills: "axetCodeHome.phaseSkills",
  agent: "axetCodeHome.phaseAgent",
  session: "axetCodeHome.phaseSession",
  indexing: "axetCodeHome.phaseIndexing",
  thinking: "axetCodeHome.phaseThinking",
  finishing: "axetCodeHome.phaseFinishing"
};

export function ThinkingBubble({ phase }: { phase: AxetChatActivityPhase | null }) {
  const t = useT();
  // Geçen süre. Sayaç bileşenin KENDİ ömrüne bağlı: gösterge tam olarak
  // "istek başladı, henüz metin gelmedi" aralığında mount kalıyor, yani ayrı
  // bir başlangıç zamanı taşımaya gerek yok.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const label = t(PHASE_KEYS[phase ?? "starting"]);

  return (
    // Cevap metniyle aynı sol kenardan başlıyor — cevap tarafında artık
    // avatar oluğu yok (bkz. yukarıdaki not). `role="status"` + `aria-label`:
    // çubuklar tamamen görsel, ekran okuyucuya aşama metni gidiyor.
    // Dış `h-6`: gösterge ince olduğu için tek başına neredeyse yüksekliksiz
    // kalıyordu ve cevap gelince satır zıplıyordu.
    <div className="flex h-6 items-center gap-3" role="status" aria-label={label}>
      <div className="flex items-center gap-1.5">
        {MORSE_SEGMENTS.map((width, index) => (
          <span
            key={index}
            className="chat-morse-dot block h-[3px]"
            style={{ width: `${width}px`, animationDelay: `${index * MORSE_STEP_MS}ms` }}
          />
        ))}
      </div>
      <span className="text-[11px] text-slate-500">
        {label}
        {/* Sayaç ilk saniyede yazılmıyor: hemen dönen bir cevapta "0 sn" bir
            an görünüp kaybolurdu ve bu, gösterge yerine bir titremeye
            benziyordu. */}
        {seconds > 0 && (
          <span className="ml-1.5 tabular-nums text-slate-600">
            {t("axetCodeHome.phaseElapsed", { seconds: String(seconds) })}
          </span>
        )}
      </span>
    </div>
  );
}
