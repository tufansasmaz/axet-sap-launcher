import { memo, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CornerDownLeft,
  Pencil,
  RefreshCw
} from "lucide-react";
import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  ChatAttachment
} from "../../app-electron/shared/types";
import { renderMarkdownLite } from "../lib/markdownLite";
import { MENTION_CLASS, renderWithMentions } from "../lib/mentions";
import AttachmentChip from "./AttachmentChip";
import CopyButton from "./CopyButton";
import ChatToolRun from "./ChatToolRun";
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
  // Bu cevap alınmadan önce axet-code oturumu YENİLENDİYSE sebebi (403/yetki,
  // bağlam sınırı, sağlayıcı). Görünür olması şart: yenilenen oturum eski
  // oturum belleğini kaybediyor — sohbet geçmişi yeniden tohumlanıyor ama
  // ajanın "kafasındaki" ara durum gitmiş oluyor. Sessiz kalırsa kullanıcı
  // cevabın neden birden ton değiştirdiğini hiçbir yerde okuyamaz.
  restartedReason?: "auth" | "context" | "provider";
  // Bu cevap üretilirken çalışan araçlar, sırayla — cevabın ÜSTÜNDE katlanır
  // bir döküm olarak çiziliyor. Eskiden bu bilgi yalnızca bekleme
  // göstergesinde anlık görünüyordu ve tur bitince yok oluyordu: ajan dosya
  // okuyor, komut çalıştırıyor, mail tarıyor — ama sohbete dönüp "bunu
  // nereden çıkardı" diye bakmanın yolu yoktu. Diske de yazılıyor
  // (StoredChatMessage.steps).
  steps?: AxetChatActivity[];
  // Uygulama tur ortasında kapandı; bu metin axet-code'un veritabanından geri
  // getirildi ve CÜMLENİN ORTASINDA bitiyor olabilir. Görünür olması şart —
  // aksi hâlde kırpılmış bir cevap tam bir cevap sanılır.
  interrupted?: boolean;
}

// NOT — burada eskiden bir SİMÜLE daktilo animasyonu vardı
// (`TypewriterMarkdown`, `TARGET_REVEAL_MS`). Tamamen kaldırıldı: "axet-code
// run -q stdout'u tamponluyor, ilk çıktı process kapanana kadar gelmiyor"
// varsayımı üzerine kurulmuştu ve o varsayım canlı ölçümle ÇÜRÜTÜLDÜ (tek
// cevapta 16 saniyeye yayılmış 178 ayrı `data` chunk'ı — bkz. PROJE-BILGI.md
// düzeltme notu). Artık metin GERÇEKTEN üretildiği hızda akıyor; sahte bir
// animasyon hem gereksiz hem de gerçek akışın üstüne binerek onu geciktirir.
//
// DÜZEN (bkz. docs/superpowers/specs/2026-09-29-sohbet-ekrani-design.md):
//   - Kullanıcı istemi SAĞDA, `bg-raised` silik bir balon; saat, Düzenle ve
//     Kopyala hover'da balonun altında.
//   - Cevap SOLDA ve balonsuz, avatarsız.
//   - Turun araç çağrıları cevabın ÜSTÜNDE tek satırda (`ChatToolRun`).
//   - Cevabın altında simge düğmeler: SON cevapta hep görünür ve Yeniden
//     üret'i taşır, öteki cevaplarda hover'a kadar gizli.
// Gövde metni boyutu kullanıcı ayarından (Ayarlar > Görünüm) geliyor;
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

// AKIŞ SIRASINDA HER PARÇADA HER BALON YENİDEN ÇİZİLMESİN diye `memo` ile
// sarmalı (dosya sonundaki `export default`). Kullanıcı geri bildirimi
// (2026-09-05): *"cevabı çok kasarak yavaş yazıyor"*. Sebep ölçüldü: akan
// cevabın her parçasında üst bileşen tüm listeyi yeniden çiziyor ve
// DEĞİŞMEMİŞ her balon `renderMarkdownLite`'ı (338 satırlık ayrıştırıcı)
// baştan çalıştırıyordu — maliyet sohbet uzadıkça büyüyor, yani tam da
// "kasma" hissi. `memo` çalışsın diye iki koşul var ve İKİSİ DE KORUNMALI:
//   1. `message` nesnesinin kimliği değişmemeli. AxetCodeHome akış sırasında
//      yalnızca akan mesajı yeni nesneyle değiştiriyor, geri kalanı aynı
//      referansla taşıyor.
//   2. `onEdit`, `onContinue` ve `onRegenerate` kararlı olmalı — üçü de
//      `useCallback` (`handleEditMessage`, `handleContinue`, `handleRegenerate`). Buraya satır içi ok
//      fonksiyonu (`onEdit={(id, c) => ...}`) verilirse memo tamamen
//      ETKİSİZLEŞİR.
function ChatBubble({
  message,
  onEdit,
  onContinue,
  onRegenerate,
  searchState
}: {
  message: ChatMessage;
  // Kullanıcı mesajını düzenle: metni composer'a geri koyar ve sohbeti O
  // MESAJDAN itibaren keser (bkz. AxetCodeHome.handleEditMessage). Sadece
  // kullanıcı mesajlarında anlamlı.
  onEdit?: (id: string, content: string) => void;
  // Yarıda kalmış cevaba devam ettir. Verilmezse düğme çizilmiyor — çağıran
  // yalnızca SON mesaj için veriyor. `onEdit` gibi kararlı olmalı (memo).
  onContinue?: () => void;
  // Son cevabı sil ve yeniden üret. Verilmezse düğme çizilmiyor — çağıran
  // yalnızca SON cevap için ve yeniden üretme mümkünken veriyor. `onEdit`
  // gibi kararlı olmalı (memo).
  onRegenerate?: () => void;
  // Sohbet içi aramanın (Ctrl+F) sonucu: `hit` eşleşen mesaj, `current` o an
  // gezinilen eşleşme. Arama kapalıyken `undefined` — memo'yu bozmaması için
  // ChatSessionPane bu durumda hiç değer üretmiyor.
  searchState?: "hit" | "current";
}) {
  const t = useT();

  // Markdown ayrıştırma metne bağlı; balon başka bir sebeple çizilirse (tema,
  // dil, hover) tekrarlanmasın. Kullanıcı balonunda hiç çalışmıyor: orada metin
  // düz `whitespace-pre-wrap` olarak basılıyor. Kanca KOŞULSUZ çağrılmak
  // zorunda, bu yüzden aşağıdaki `role === "user"` erken dönüşünden ÖNCE.
  const body = useMemo(
    () => (message.role === "assistant" ? renderMarkdownLite(message.content) : null),
    [message.role, message.content]
  );
  // Arama vurgusu `outline` ile çiziliyor (bkz. index.css) — kenarlıktan
  // farklı olarak yer kaplamadığı için vurgu gelip gittikçe liste oynamıyor.
  const searchClass =
    searchState === "current" ? " chat-search-current" : searchState === "hit" ? " chat-search-hit" : "";

  if (message.role === "user") {
    const attachments = message.attachments ?? [];
    return (
      <div data-mid={message.id} className={`group relative flex flex-col items-end gap-1 pb-5${searchClass}`}>
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
          <div className={`max-w-[80%] rounded-2xl bg-raised px-4 py-2.5 text-slate-100 ${BODY}`}>
            {/* `@dosya` bahisleri balonda da VURGULU: composer'da renkli
                görünen bir yol, gönderilince düz metne dönseydi kullanıcı
                bahsin tutmadığını sanırdı. */}
            <p className="whitespace-pre-wrap break-words">
              {renderWithMentions(message.content, MENTION_CLASS)}
            </p>
          </div>
        )}
        {/* İstem tarafındaki düğmeler hover'da: bir cevabı kopyalamak sık, kendi
            yazdığını kopyalamak nadir. Satır MUTLAK konumlu ve yerini dış
            div'in `pb-5`'i ayırıyor: hover'da hiçbir şey kaymıyor. */}
        <div className="absolute bottom-0 right-0 flex h-5 items-center gap-0.5 pr-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <span className="mr-1 text-2xs text-slate-500">{formatClock(message.createdAt)}</span>
          {onEdit && (
            <button
              onClick={() => onEdit(message.id, message.content)}
              title={t("axetCodeHome.editMessage")}
              className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-hover hover:text-slate-200"
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
  // *"chatte hâlâ logo gözüküyor cevaplarda"*). Kim kimden ayrılıyor artık hizadan belli: istem sağda ve balonlu, cevap
  // solda ve balonsuz.
  const steps = message.steps ?? [];

  return (
    <div data-mid={message.id} className={`group min-w-0${searchClass}`}>
      {/* ARAÇ DÖKÜMÜ — cevabın ÜSTÜNDE, katlanır.
          Neden cevabın üstünde: olaylar cevaptan ÖNCE oldu; altına konsaydı
          okuma sırası tersine dönerdi. Neden kalıcı: eskiden bu bilgi sadece
          bekleme göstergesinde anlık görünüyor, tur bitince yok oluyordu —
          ajan dosya okuyup komut çalıştırdığı hâlde geriye dönüp "bunu nereden
          çıkardı" diye bakmanın yolu yoktu.
          Akış sürerken çizilmiyor: o sırada canlı gösterge zaten aynı bilgiyi
          gösteriyor, ikisi birden ekranda olsa aynı şey iki kere yazılırdı. */}
      {steps.length > 0 && !message.streaming && (
        <div className="mb-2">
          <ChatToolRun steps={steps} status="done" />
        </div>
      )}
      <div
        className={
          message.error
            ? `flex items-start gap-2.5 rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-[var(--status-danger-text)] ${BODY}`
            : `min-w-0 text-slate-200 ${BODY}`
        }
      >
        {message.error && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
        <div className="min-w-0 flex-1">
          {body}
          {/* Akış imleci — metin hâlâ gelirken sonunda yanıp sönen blok.
              Boş bir cevabın (henüz ilk parça gelmemiş) yüksekliği sıfır
              olmasın diye `inline-block` + `align-[-2px]`. */}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-accent-400 align-[-2px]" />
          )}
        </div>
      </div>
      {/* Oturum yenilendiyse SÖYLENİYOR. Hata balonunda da görünüyor (meta
          satırının aksine): "yeniden başlattık, yine olmadı" ile "hiç
          denemedik" arasındaki fark kullanıcı için büyük. Rozet değil satır,
          çünkü bu bir nitelik değil bir OLAY — sohbetin akışında bir yeri
          var. */}
      {message.restartedReason && !message.streaming && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--status-warning-text)]">
          <RefreshCw size={11} className="shrink-0" />
          <span>{t(RESTART_KEYS[message.restartedReason])}</span>
        </div>
      )}
      {/* Yarıda kalmış cevap: metin cümlenin ortasında bitiyor olabilir ve bunu
          söylemeyen bir arayüz, kırpılmış bir cevabı tam bir cevap gibi
          gösterirdi. `restartedReason` ile aynı biçim — ikisi de bir OLAY. */}
      {message.interrupted && !message.streaming && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--status-warning-text)]">
          <span className="flex items-center gap-1.5">
            <RefreshCw size={11} className="shrink-0" />
            <span>{t("chatBubble.interrupted")}</span>
          </span>
          {/* Notu OKUMAK yetmiyordu: kullanıcı yarım cevabı görüp ne
              yapacağını bilemiyordu (2026-09-05). Devam etmek, yeniden
              üretmekten farklı — üretilmiş metin atılmıyor, üstüne ekleniyor. */}
          {onContinue && (
            <button
              onClick={onContinue}
              className="cursor-pointer rounded-md border border-[var(--status-warning-border)] px-2 py-0.5 font-medium transition hover:bg-[var(--status-warning-bg)]"
            >
              {t("chatBubble.continueAnswer")}
            </button>
          )}
        </div>
      )}
      {/* Akış sürerken gizli — yarım bir cevabı kopyalatmanın anlamı yok.
          SON cevabın satırı hep görünür ve Yeniden üret'i taşıyor; öteki
          cevaplarınki hover'a kadar gizli ama yer ayrılı (`opacity-0`, `hidden`
          değil) — fare üstüne gelince liste kaymasın. Hata cevabında
          kopyalanacak bir şey yok; yalnız Yeniden üret anlamlı. */}
      {!message.streaming && (!message.error || onRegenerate) && (
        <div
          data-testid="answer-row"
          className={`mt-1 flex h-7 items-center gap-0.5${
            onRegenerate ? "" : " opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
          }`}
        >
          {!message.error && <CopyButton value={message.content} title={t("copyButton.copyAnswer")} />}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title={t("axetCodeHome.regenerateTitle")}
              className="cursor-pointer rounded-md p-1 text-slate-500 transition hover:bg-active hover:text-slate-200"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {/* Cevabın saati — uzun bir sohbette "bu cevap ne zaman geldi"
              sorusunun karşılığı (kullanıcı bulgusu 2026-09-05). */}
          {!message.error && (
            <span className="ml-1.5 text-2xs text-slate-600">{formatClock(message.createdAt)}</span>
          )}
          {/* BURAYA "Uygulama bağlantıları" ROZETİ GERİ EKLENMESİN.
              Cevabın altında, bağlayıcılar açıkken her seferinde basılan bir
              rozet vardı; gerekçesi "tahmin yanılırsa sessiz kalmasın" idi.
              Kullanıcı iki kez kaldırılmasını istedi (2026-09-04: *"Uygulama
              bağlantıları bu yazmasına gerek yok"*, 2026-09-05: *"hâlâ
              uygulama bağlantıları yazıyor"*) — her cevapta tekrarlanan
              değişmez bir etiket bilgi taşımıyor, gürültü yapıyor.
              `usedConnectors` alanı TİPTE DURUYOR: sonuçta gerçek bir bilgi
              ve teşhis için (log, gelecekte bir ayrıntı paneli) lazım. */}
        </div>
      )}
    </div>
  );
}

export default memo(ChatBubble);

// ---------------------------------------------------------------------------
// Bekleme göstergesi — terminaldeki döküm
// ---------------------------------------------------------------------------
// ÜÇ tasarım elendi:
//  1. Sayısal bir bekleme sayacı — saniyeleri izletmek beklemeyi "daha yavaş"
//     hissettiriyordu.
//  2. Logo + birkaç saniyede bir değişen durum cümleleri (2026-09-02).
//  3. Mors alfabesi gibi yanıp sönen ince çubuklar (2026-09-02 – 2026-09-04).
//     Çubuklar cevabın YERİNİ gösteriyordu ama NE OLDUĞUNU söylemiyordu ve
//     kullanıcının şikâyeti tam olarak buydu: *"arkada bişey yaparken uzun
//     süre chatdeki çubuklar yanıp sönüyor"*.
//
//  4. Terminal dökümünün birebir taklidi: biten her adım kendi satırında
//     kalıyor, blok aşağı doğru büyüyordu (2026-09-04 sabahı). Bilgi doğruydu
//     ama kullanıcı haklı olarak yadırgadı: *"sonuç geldiğinde o bilgi kısmı
//     aşağı doğru gidiyor o saçma gibi geldi"* — gösterge, henüz gelmemiş bir
//     cevabın altındaki boşluğu her araç çağrısında yeniden büyütüyor ve
//     sohbeti aşağı itiyordu.
//
//  5. (2026-09-29) Araç satırı göstergeden ayrıldı. Adımlar artık
//     `ChatToolRun`'da, konuşmanın sonunda duruyor. Gösterge yalnız durum,
//     adım sayısı ve süre.
//
// Adımların kaynağı axet-code'un kendi oturum veritabanı (bkz.
// main/axetSessionDb.ts).
//
// Gösterge glifi: NEFES ALAN bir nokta (`.chat-breathe`, bkz. index.css).
//
// Önce dönen bir karakter döngüsü vardı (◜◝◞◟, 160 ms). Kullanıcı kararı
// (2026-09-04): *"düşünüyorun yanındaki dönen işaret çok kasıyor onu nefes alır
// şekil yapalım"* — haklı olarak, hızlı dönen bir glif bekleyişi sakinleştirmek
// yerine acele ettiriyordu. Artık 2 saniyelik yavaş bir opaklık/ölçek nefesi:
// hâlâ "çalışıyor" diyor, ama telaş etmiyor.
//
// Karakter yerine CSS: dönen glifte her kare farklı genişlikteydi ve hizayı
// korumak için ayrıca sabitlemek gerekiyordu; bir noktanın böyle bir sorunu yok.

//
// YEDEK KİPTE (`axet-code run`, bkz. main/axetChat.ts) axet-code denetim
// kaydını yazdıktan sonra cevap gelene kadar HİÇBİR ŞEY yazmıyor (ölçüldü: 12
// saniyeye varan tam sessizlik; araç çağrıları hiçbir akışa düşmüyor). Orada
// `thinking` sırasında yapılan tek dürüst şey geçen SÜREYİ saymak. KALICI
// OTURUM kipinde ise araç çağrıları görünüyor (kaynak: axet-code'un kendi
// oturum veritabanı — bkz. main/axetSessionDb.ts) ve `tool` aşaması tam olarak
// o sessizliği dolduruyor.
const PHASE_KEYS: Record<AxetChatActivityPhase, TranslationKey> = {
  starting: "axetCodeHome.phaseStarting",
  connectors: "axetCodeHome.phaseConnectors",
  skills: "axetCodeHome.phaseSkills",
  agent: "axetCodeHome.phaseAgent",
  session: "axetCodeHome.phaseSession",
  indexing: "axetCodeHome.phaseIndexing",
  thinking: "axetCodeHome.phaseThinking",
  tool: "axetCodeHome.phaseTool",
  // `toolResult` bir AŞAMA değil, açılmış bir satırın tamamlanması — alt
  // satırda hiçbir zaman görünmüyor. Yine de burada bir karşılığı var, çünkü
  // `Record` eksik anahtara izin vermiyor ve tipi gevşetmek, ileride gerçekten
  // eksik kalan bir aşamayı da sessizce geçirirdi.
  toolResult: "axetCodeHome.phaseTool",
  restarting: "axetCodeHome.phaseRestarting",
  askUser: "axetCodeHome.phaseAskUser",
  // Dakika sayısı bu haritadan GELMİYOR — `label` aşağıda ayrıca kuruluyor,
  // çünkü metin parametreli. Buradaki karşılık yalnızca `Record`'un eksik
  // anahtar kabul etmemesi için.
  stalled: "axetCodeHome.phaseStalled",
  finishing: "axetCodeHome.phaseFinishing"
};

/** Oturumun neden yenilendiği — cevabın altındaki satırın metni. */
const RESTART_KEYS: Record<NonNullable<ChatMessage["restartedReason"]>, TranslationKey> = {
  auth: "chatBubble.restartedAuth",
  context: "chatBubble.restartedContext",
  provider: "chatBubble.restartedProvider"
};

export function ThinkingBubble({
  phase,
  steps,
  stalledMinutes
}: {
  phase: AxetChatActivityPhase | null;
  steps?: AxetChatActivity[];
  /** `stalled` aşamasında kaç dakikadır belirti gelmediği; başka aşamada 0. */
  stalledMinutes?: number;
}) {
  const t = useT();
  // Geçen süre. Sayaç bileşenin KENDİ ömrüne bağlı: gösterge tam olarak isteğin
  // sürdüğü aralıkta mount kalıyor, yani ayrı bir başlangıç zamanı taşımaya
  // gerek yok. Nefes animasyonunun ayrı bir zamanlayıcısı YOK — o tamamen CSS,
  // yani saniyede altı kez render tetiklemiyor.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Durum satırı ARAÇ ADINI TEKRARLAMIYOR: araç zaten hemen üstteki
  // `ChatToolRun` satırında duruyor, ikinci kez yazmak gürültü olurdu.
  //
  // `connectors` aşaması da "Düşünüyor" diye yazılıyor (kullanıcı kararı,
  // 2026-09-04: *"Uygulama bağlantıları bu yazmasına gerek yok"*). Bağlantıların
  // hazırlanması bizim iç işimiz; kullanıcı için hepsi aynı şeyin parçası —
  // cevap bekleniyor. Aşama yine de tipte DURUYOR, çünkü log ve gelecekteki bir
  // teşhis için hangi aşamada olunduğu bilgisi gerçek.
  const quiet = phase === "tool" || phase === "connectors";
  // `stalled` tek parametreli aşama: dakikayı metne gömmek gerekiyor, o yüzden
  // `PHASE_KEYS` üzerinden düz çeviriye gitmiyor.
  const label =
    phase === "stalled"
      ? t("axetCodeHome.phaseStalled", { minutes: String(stalledMinutes ?? 0) })
      : t(PHASE_KEYS[quiet ? "thinking" : phase ?? "starting"]);
  const all = steps ?? [];

  return (
    // Cevap metniyle aynı sol kenardan başlıyor — cevap tarafında avatar oluğu
    // yok. `role="status"` + `aria-label`: glif tamamen görsel, ekran okuyucuya
    // aşama metni gidiyor. KUTUSUZ (kullanıcı kararı, 2026-09-04: *"düşünüyor
    // falan şeyini kutunun içersine almışsın alma onu da"*).
    <div className="flex items-center gap-2 text-2xs" role="status" aria-label={label}>
      <span className="chat-breathe block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 pl-1 tabular-nums text-slate-600">
        {all.length > 1 && <span>{t("axetCodeHome.phaseStepCount", { count: String(all.length) })}</span>}
        {/* Sayaç ilk saniyede yazılmıyor: hemen dönen bir cevapta "0 sn" bir
            an görünüp kaybolurdu ve bu, gösterge yerine bir titremeye
            benziyordu. */}
        {seconds > 0 && <span>{t("axetCodeHome.phaseElapsed", { seconds: String(seconds) })}</span>}
      </span>
    </div>
  );
}

/**
 * Ajanın sorduğu sorunun kartı — seçenekler tıklanabilir düğmeler.
 *
 * Bu kart bir SÜS değil, turun tek çıkışı: seçim, TUI'deki soru kutusuna tuş
 * olarak gidiyor (bkz. axetChatTui.ts `answerTuiQuestion`) ve tur oradan devam
 * ediyor. Seçilmediği sürece ajan bekliyor.
 *
 * Düğme SIRASI dizinle birebir: dizin, kutuda kaç kez aşağı okuna basılacağını
 * belirliyor. Bu yüzden burada sıralama/filtreleme YAPILMIYOR.
 *
 * Şıkların yanında SERBEST METİN de var: TUI kutusunun kendi "Other" satırı
 * bunu kabul ediyor (bkz. axetChatTui.ts `answerTuiQuestion`). Şıklar ajanın
 * tahmini; kullanıcının aklındaki cevap listede olmayabilir ve o durumda tek
 * çıkışın "vazgeç" olması turu boşa harcardı.
 *
 * ÇOKLU SEÇİMDE (`ask.multiSelect`) davranış değişiyor: tıklamak göndermiyor,
 * işaretliyor; gönderme ayrı bir düğmede. Tek tıkla göndermek, ajanın açıkça
 * "birden fazla" diye sorduğu yerde kullanıcıyı tek cevaba mahkûm ederdi.
 */
export function AskUserCard({
  ask,
  onAnswer
}: {
  ask: AxetChatActivity;
  onAnswer: (index: number | number[], customText?: string) => void;
}) {
  const t = useT();
  const options = ask.options ?? [];
  const multi = ask.multiSelect === true;
  // Basılan düğmenin dizini. Çift tıklama koruması ve seçimin ANLIK geri
  // bildirimi: kart bir kare sonra kayboluyor, ama o kare boyunca hangi şıkkın
  // gittiği görünüyor.
  const [chosen, setChosen] = useState<number | null>(null);
  // Çoklu seçimde İŞARETLİ dizinler. Burada sıralanmıyor — ana süreç zaten
  // sıralıyor, çünkü sıra orada teknik bir zorunluluk: imleç yalnızca aşağı
  // yürüyor (bkz. axetChatTui.ts `answerTuiQuestion`).
  const [picked, setPicked] = useState<number[]>([]);
  // Cevap YOLA ÇIKTI mı. Çoklu seçimde `chosen` tek başına yetmiyor: orada
  // tıklamak göndermek değil, sadece işaretlemek.
  const [sent, setSent] = useState(false);
  // Serbest metin alanı açık mı, ve içinde ne var. Alan varsayılan olarak
  // KAPALI: kartın işi tek tıkla bitsin, yazmak isteyen açsın.
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const sendCustom = () => {
    const text = custom.trim();
    if (!text || sent) return;
    // `options.length` = kutudaki "Other" satırının dizini; ana süreç zaten
    // kendi listesinden hesaplıyor, bu yalnızca "şık değil" işareti.
    setSent(true);
    onAnswer(options.length, text);
  };
  const sendPicked = () => {
    if (sent || picked.length === 0) return;
    setSent(true);
    onAnswer(picked);
  };
  return (
    // Kutu değil ŞERİT: soldaki ince accent çizgisi dışında çerçevesi yok.
    // Sohbet balonlarının arasına bir pencere daha koymamak için — kart,
    // konuşmanın kesildiği yeri işaretlesin yeter.
    <div className="flex flex-col gap-2 border-l-2 border-accent-500/70 py-0.5 pl-3">
      {/* lang="en": başlık axet-code'dan geliyor ve İngilizce. `uppercase`
          büyütmesi dile göre değiştiğinden, Türkçe arayüzde işaretlenmezse
          "Login" gibi bir başlık "LOGİN" diye çizilir. */}
      {ask.header && (
        <span lang="en" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-400/90">
          {ask.header}
        </span>
      )}
      <p className="text-[13px] leading-snug text-slate-200">
        {ask.question || t("axetCodeHome.askUserFallback")}
      </p>
      {/* Çoklu seçimde kullanıcının bilmesi gereken tek şey: tıklamak
          göndermiyor. Tek seçimliyle aynı görünen bir kartın farklı çalışması,
          söylenmezse "düğmem çalışmadı" olarak okunurdu. */}
      {multi && (
        <span className="-mt-0.5 text-2xs text-slate-500">{t("axetCodeHome.askUserMultiHint")}</span>
      )}
      <div className="flex flex-col gap-1.5">
        {options.map((option, index) => {
          const isChosen = multi ? picked.includes(index) : chosen === index;
          // Sönükleştirme yalnızca cevap gittikten SONRA: çoklu seçimde
          // işaretlenmemiş şıklar hâlâ tıklanabilir olmalı.
          const dimmed = sent && !isChosen;
          return (
            <button
              key={`${index}-${option}`}
              disabled={sent}
              onClick={() => {
                if (multi) {
                  setPicked((prev) =>
                    prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
                  );
                  return;
                }
                setChosen(index);
                setSent(true);
                onAnswer(index);
              }}
              className={`flex w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-xs leading-tight transition-colors ${
                isChosen
                  ? "border-accent-500 bg-accent-500/25 text-[var(--accent-soft-text)]"
                  : "border-line bg-raised/70 text-slate-300 hover:border-accent-500/60 hover:bg-accent-500/10 hover:text-[var(--accent-soft-text)]"
              } ${dimmed ? "opacity-35" : ""} disabled:cursor-default`}
            >
              {multi && (
                <span
                  className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border ${
                    isChosen ? "border-accent-500 bg-accent-500/70" : "border-line-strong"
                  }`}
                >
                  {/* Kutunun zemini accent dolgusu (`bg-accent-500/70`), o
                      yüzden tik `text-accent-on` — `text-white` açık temada
                      koyu griye düşüp dolgunun üstünde kayboluyordu. */}
                  {isChosen && <Check size={9} strokeWidth={3} className="text-accent-on" />}
                </span>
              )}
              {option}
            </button>
          );
        })}
      </div>
      {/* Serbest cevap ve çoklu seçimin Gönder düğmesi şıklardan AYRI satırda:
          şıklar alt alta dizilirken bunlar onların arasına karışmasın. */}
      <div className="flex flex-wrap gap-1.5">
        {!customOpen && (
          <button
            disabled={sent}
            onClick={() => setCustomOpen(true)}
            className={`rounded-lg border border-dashed border-line bg-transparent px-3 py-1 text-xs leading-tight text-slate-400 transition-colors hover:border-accent-500/60 hover:text-[var(--accent-soft-text)] ${
              sent ? "opacity-35" : ""
            } disabled:cursor-default`}
          >
            {t("axetCodeHome.askUserCustom")}
          </button>
        )}
        {/* Gönder düğmesi YALNIZCA çoklu seçimde: tek seçimlide tıklama zaten
            gönderiyor ve fazladan bir adım, kartın tek tıklık işini iki tıka
            çıkarırdı. Hiçbir şey işaretli değilken kapalı — boş bir onay,
            TUI'de hiçbir şey seçmeden `enter` basmak olurdu. */}
        {multi && (
          <button
            disabled={sent || picked.length === 0}
            onClick={sendPicked}
            className="flex items-center gap-1.5 rounded-lg border border-accent-500/60 bg-accent-500/15 px-3 py-1 text-xs leading-tight text-[var(--accent-soft-text)] transition-colors hover:bg-accent-500/25 disabled:cursor-default disabled:opacity-35"
          >
            <CornerDownLeft size={12} />
            {picked.length > 0
              ? t("axetCodeHome.askUserSendCount", { count: String(picked.length) })
              : t("axetCodeHome.askUserSend")}
          </button>
        )}
      </div>
      {customOpen && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={custom}
            disabled={sent}
            onChange={(event) => setCustom(event.target.value)}
            // Enter GÖNDERİR: kutu tek satırlık, alt satır diye bir şey yok.
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendCustom();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setCustomOpen(false);
              }
            }}
            placeholder={t("axetCodeHome.askUserCustomPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-line bg-raised/70 px-2.5 py-1 text-[12.5px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent-500/60"
          />
          <button
            disabled={sent || custom.trim() === ""}
            onClick={sendCustom}
            title={t("axetCodeHome.askUserCustom")}
            className="rounded-lg border border-line bg-raised/70 p-1.5 text-slate-300 transition-colors hover:border-accent-500/60 hover:text-[var(--accent-soft-text)] disabled:opacity-35"
          >
            <CornerDownLeft size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
