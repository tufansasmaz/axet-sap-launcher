import { memo, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, CornerDownLeft, Pencil, RefreshCw } from "lucide-react";
import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  ChatAttachment
} from "../../app-electron/shared/types";
import { renderMarkdownLite } from "../lib/markdownLite";
import { MENTION_CLASS, renderWithMentions } from "../lib/mentions";
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
//   2. `onEdit` ve `onContinue` kararlı olmalı — ikisi de `useCallback`
//      (`handleEditMessage`, `handleContinue`). Buraya satır içi ok
//      fonksiyonu (`onEdit={(id, c) => ...}`) verilirse memo tamamen
//      ETKİSİZLEŞİR.
function ChatBubble({
  message,
  onEdit,
  onContinue,
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
  // Araç dökümü VARSAYILAN OLARAK KAPALI. Cevabın kendisi asıl içerik; her
  // balonun üstünde açık duran on satırlık bir döküm, sohbeti okunmaz hâle
  // getirirdi. Kapalıyken tek satır, tıklanınca açılıyor.
  const [stepsOpen, setStepsOpen] = useState(false);
  // Hangi adımların AYRINTISI açık. Küme, çünkü birden fazla adımın farkını
  // yan yana görmek isteniyor — tek bir "açık adım" olsaydı ikinci tıklama
  // birincisini kapatırdı.
  const [openSteps, setOpenSteps] = useState<Set<string>>(() => new Set());
  const toggleStep = (key: string) =>
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toolLabel = useToolLabel();

  // Arama vurgusu `outline` ile çiziliyor (bkz. index.css) — kenarlıktan
  // farklı olarak yer kaplamadığı için vurgu gelip gittikçe liste oynamıyor.
  const searchClass =
    searchState === "current" ? " chat-search-current" : searchState === "hit" ? " chat-search-hit" : "";

  if (message.role === "user") {
    const attachments = message.attachments ?? [];
    return (
      <div data-mid={message.id} className={`group flex flex-col items-end gap-1${searchClass}`}>
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
            {/* `@dosya` bahisleri balonda da VURGULU: composer'da renkli
                görünen bir yol, gönderilince düz metne dönseydi kullanıcı
                bahsin tutmadığını sanırdı. */}
            <p className="whitespace-pre-wrap break-words">
              {renderWithMentions(message.content, MENTION_CLASS)}
            </p>
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
  const steps = message.steps ?? [];

  return (
    <div data-mid={message.id} className={`min-w-0${searchClass}`}>
      {/* ARAÇ DÖKÜMÜ — cevabın ÜSTÜNDE, katlanır.
          Neden cevabın üstünde: olaylar cevaptan ÖNCE oldu; altına konsaydı
          okuma sırası tersine dönerdi. Neden kalıcı: eskiden bu bilgi sadece
          bekleme göstergesinde anlık görünüyor, tur bitince yok oluyordu —
          ajan dosya okuyup komut çalıştırdığı hâlde geriye dönüp "bunu nereden
          çıkardı" diye bakmanın yolu yoktu.
          Akış sürerken çizilmiyor: o sırada canlı gösterge zaten aynı bilgiyi
          gösteriyor, ikisi birden ekranda olsa aynı şey iki kere yazılırdı. */}
      {steps.length > 0 && !message.streaming && (
        <div className="mb-2 text-[11px]">
          <button
            onClick={() => setStepsOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-slate-500 transition hover:bg-base-800 hover:text-slate-300"
          >
            {stepsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{t("chatBubble.stepsToggle", { count: String(steps.length) })}</span>
            {/* Kapalıyken de bir ipucu: hangi araçlar çalıştı. Tekrarlar
                ayıklanıyor — aynı aracın on kez geçtiği bir liste bilgi
                vermiyor, gürültü yapıyor. */}
            {!stepsOpen && (
              <span className="truncate text-slate-600">
                {Array.from(new Set(steps.map((s) => toolLabel(s.tool ?? "")))).join(", ")}
              </span>
            )}
          </button>
          {stepsOpen && (
            <div className="mt-1 flex flex-col gap-1 rounded-lg border border-[rgb(var(--base-700-rgb)/0.55)] bg-base-800 px-2 py-1.5">
              {steps.map((step, i) => {
                const key = step.callId ?? String(i);
                // Ayrıntısı olan adım TIKLANABİLİR. Olmayanı tıklanabilir
                // göstermek boş bir söz olurdu — imleç değişir, bir şey açılmaz.
                const detail = step.diff || step.output || "";
                const open = openSteps.has(key);
                return (
                  <div key={key} className="min-w-0">
                    <div
                      role={detail ? "button" : undefined}
                      onClick={detail ? () => toggleStep(key) : undefined}
                      className={`flex min-w-0 items-baseline gap-1.5 rounded px-0.5 ${
                        detail ? "cursor-pointer hover:bg-[rgb(var(--base-700-rgb)/0.5)]" : ""
                      }`}
                    >
                      <span className={step.failed ? "text-[var(--status-warning-text)]" : "text-accent-500"}>
                        {detail ? (open ? "▾" : "▸") : "·"}
                      </span>
                      <span className="shrink-0 text-slate-500">{toolLabel(step.tool ?? "")}</span>
                      {step.target && (
                        <span className="truncate font-mono text-[10px] text-slate-600" title={step.target}>
                          {step.target}
                        </span>
                      )}
                      {step.result && (
                        <span
                          className={`flex min-w-0 items-baseline gap-1 ${
                            step.failed ? "text-[var(--status-warning-text)]" : "text-slate-600"
                          }`}
                          title={step.result}
                        >
                          <span className="shrink-0">↳</span>
                          <span className="truncate font-mono text-[10px]">
                            {step.extraLines
                              ? t("axetCodeHome.toolMoreLines", { count: String(step.extraLines) })
                              : step.result}
                          </span>
                        </span>
                      )}
                    </div>
                    {open && detail && <StepDetail diff={step.diff} output={step.output} />}
                  </div>
                );
              })}
            </div>
          )}
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
      {/* Akış sürerken gizli — yarım bir cevabı kopyalatmanın anlamı yok. */}
      {!message.streaming && !message.error && (
        <div className="mt-1 flex h-7 items-center gap-2">
          <CopyButton value={message.content} title={t("copyButton.copyAnswer")} />
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

/**
 * Bir araç adımının ayrıntısı: dosya farkı ya da tam çıktı.
 *
 * FARK ÖNCELİKLİ. Bir `edit` çağrısında aracın kendi çıktısı yalnızca
 * "Content replaced in file: …" diyor — yani en az bilgi veren metin. Asıl
 * merak edilen NE değiştiği ve o, girdiden üretilen farkta duruyor.
 *
 * Yükseklik sınırlı ve kendi içinde kaydırılıyor: 4000 karakterlik bir çıktı
 * sohbeti aşağı doğru metrelerce iterdi.
 */
function StepDetail({ diff, output }: { diff?: string; output?: string }) {
  if (diff) {
    const lines = diff.split("\n");
    return (
      <pre className="chat-scroll mt-1 max-h-64 overflow-auto rounded-md bg-base-950 p-2 font-mono text-[10px] leading-[1.5]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith("+")
                ? "text-[var(--status-success-text)]"
                : line.startsWith("-")
                  ? "text-[var(--status-danger-text)]"
                  : "text-slate-500"
            }
          >
            {/* Boş satır da bir satır: yüksekliği çökmesin diye sıfır genişlikli
                boşlukla dolduruluyor. */}
            {line || "​"}
          </div>
        ))}
      </pre>
    );
  }
  return (
    <pre className="chat-scroll mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-base-950 p-2 font-mono text-[10px] leading-[1.5] text-slate-400">
      {output}
    </pre>
  );
}

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
// Şimdiki düzen (2026-09-04) SABİT YÜKSEKLİKTE, iki satır:
//
//   ┌────────────────────────────────────────┐
//   │ ◜  Düşünüyor              3. adım · 14sn│
//   │ ▸ İçerikte arıyor  composer  ↳ +12 satır│
//   └────────────────────────────────────────┘
//
// Yani geçmiş BİRİKMİYOR: en yeni adım bir öncekinin YERİNE geçiyor, sayaç da
// kaçıncı adımda olduğunu söylüyor. İki satır her zaman çiziliyor (henüz araç
// çağrılmamışken alt satır boş duruyor), böylece kutu ilk kareden son kareye
// kadar aynı yüksekliği tutuyor ve altındaki hiçbir şey zıplamıyor.
//
// Bilginin kaynağı axet-code'un kendi oturum veritabanı (bkz.
// main/axetSessionDb.ts); araç adı, girdisi ve sonucun ilk satırı oradan
// geliyor.
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
  finishing: "axetCodeHome.phaseFinishing"
};

/** Oturumun neden yenilendiği — cevabın altındaki satırın metni. */
const RESTART_KEYS: Record<NonNullable<ChatMessage["restartedReason"]>, TranslationKey> = {
  auth: "chatBubble.restartedAuth",
  context: "chatBubble.restartedContext",
  provider: "chatBubble.restartedProvider"
};

// axet-code'un araç adları → okunur metin. Liste KAPALI DEĞİL: bilinmeyen bir
// ad çeviriye zorlanmıyor, `toolGeneric` ile ham hâliyle gösteriliyor. Yeni
// bir araç eklendiğinde gösterge yanlış bir şey söylemektense sade bir şey
// söylüyor.
const TOOL_KEYS: Record<string, TranslationKey> = {
  view: "axetCodeHome.toolView",
  read: "axetCodeHome.toolView",
  edit: "axetCodeHome.toolEdit",
  write: "axetCodeHome.toolWrite",
  bash: "axetCodeHome.toolBash",
  glob: "axetCodeHome.toolGlob",
  grep: "axetCodeHome.toolGrep",
  ls: "axetCodeHome.toolLs",
  fetch: "axetCodeHome.toolFetch",
  download: "axetCodeHome.toolFetch",
  agent: "axetCodeHome.toolAgent",
  todo: "axetCodeHome.toolTodo"
};

/** Araç adının okunur karşılığı. Bilinmeyen ad ham hâliyle geçiyor. */
function useToolLabel(): (tool: string) => string {
  const t = useT();
  return useMemo(
    () => (tool: string) => {
      // MCP araçlarında "Uygulama bağlantısı:" ÖN EKİ YOK (kullanıcı kararı,
      // 2026-09-04: *"Uygulama bağlantıları bu yazmasına gerek yok"*). Adın
      // kendisi zaten hangi uygulama olduğunu söylüyor (`outlook list emails`);
      // önüne bir de kategori adı koymak, dar bir satırda asıl bilgiyi
      // kırpılmaya itiyordu.
      if (tool.startsWith("mcp:")) return tool.slice(4).replace(/_/g, " ");
      const key = TOOL_KEYS[tool];
      return key ? t(key) : t("axetCodeHome.toolGeneric", { name: tool });
    },
    [t]
  );
}

export function ThinkingBubble({
  phase,
  steps
}: {
  phase: AxetChatActivityPhase | null;
  steps?: AxetChatActivity[];
}) {
  const t = useT();
  const toolLabel = useToolLabel();
  // Geçen süre. Sayaç bileşenin KENDİ ömrüne bağlı: gösterge tam olarak isteğin
  // sürdüğü aralıkta mount kalıyor, yani ayrı bir başlangıç zamanı taşımaya
  // gerek yok. Nefes animasyonunun ayrı bir zamanlayıcısı YOK — o tamamen CSS,
  // yani saniyede altı kez render tetiklemiyor.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Üst satır ARAÇ ADINI TEKRARLAMIYOR: araç zaten alt satırda duruyor, üstte
  // ikinci kez yazmak göstergeyi gereksizce gürültülü yapardı.
  //
  // `connectors` aşaması da "Düşünüyor" diye yazılıyor (kullanıcı kararı,
  // 2026-09-04: *"Uygulama bağlantıları bu yazmasına gerek yok"*). Bağlantıların
  // hazırlanması bizim iç işimiz; kullanıcı için hepsi aynı şeyin parçası —
  // cevap bekleniyor. Aşama yine de tipte DURUYOR, çünkü log ve gelecekteki bir
  // teşhis için hangi aşamada olunduğu bilgisi gerçek.
  const quiet = phase === "tool" || phase === "connectors";
  const label = t(PHASE_KEYS[quiet ? "thinking" : phase ?? "starting"]);
  const all = steps ?? [];
  const step = all.length > 0 ? all[all.length - 1] : null;

  return (
    // Cevap metniyle aynı sol kenardan başlıyor — cevap tarafında avatar oluğu
    // yok. `role="status"` + `aria-label`: glif tamamen görsel, ekran okuyucuya
    // aşama metni gidiyor.
    <div className="flex flex-col gap-1 text-[11px]" role="status" aria-label={label}>
      {/* Durum satırı KUTUSUZ (kullanıcı kararı, 2026-09-04: *"düşünüyor falan
          şeyini kutunun içersine almışsın alma onu da"*). Zaten kalıcı bir bilgi
          değil, bir nefes — çerçevelenince sohbete yerleşmiş bir kart gibi
          duruyordu. Saydam kutu yalnızca ALTTAKİ araç satırında kalıyor: orada
          gerçekten ayrı bir bilgi var ve ayrışması gerekiyor. */}
      <div className="flex items-center gap-2">
        <span className="chat-breathe block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
        <span className="text-slate-400">{label}</span>
        <span className="flex items-center gap-1.5 pl-1 tabular-nums text-slate-600">
          {/* Adım sayacı, biriken satırların yerini tutuyor: geçmiş artık
              ekranda durmuyor ama kaçıncı adımda olduğumuz görünüyor. */}
          {all.length > 1 && <span>{t("axetCodeHome.phaseStepCount", { count: String(all.length) })}</span>}
          {/* Sayaç ilk saniyede yazılmıyor: hemen dönen bir cevapta "0 sn" bir
              an görünüp kaybolurdu ve bu, gösterge yerine bir titremeye
              benziyordu. */}
          {seconds > 0 && <span>{t("axetCodeHome.phaseElapsed", { seconds: String(seconds) })}</span>}
        </span>
      </div>
      {/* Araç satırı.
          Araç yokken de çiziliyor (`min-h`, içi boş, çerçevesiz): göstergenin
          yüksekliği ilk kareden itibaren sabit kalsın, ilk araç çağrısı gelince
          altındaki sohbet zıplamasın.
          BURAYA `backdrop-blur` GERİ EKLENMESİN. Bir ara zemin yarı saydam +
          `backdrop-blur-sm` idi; gösterge `sticky top-0` yapıldıktan sonra bu,
          akan cevap kaydıkça HER KAREDE altındaki metni yeniden bulanıklaştıran
          bir katman hâline geldi (kullanıcı: *"cevabı çok kasarak yavaş
          yazıyor"*). Zemin artık opak — zaten sticky sarmalayıcının kendi
          `--base-950` gradyanı arkada duruyor, saydamlıktan görsel olarak
          kazanılan bir şey yoktu. */}
      <div
        className={`flex min-h-[22px] w-fit max-w-full items-center gap-1.5 rounded-lg px-2 py-1 ${
          step ? "border border-[rgb(var(--base-700-rgb)/0.55)] bg-base-800" : ""
        }`}
      >
        {step && (
          <>
            <span className={step.failed ? "text-[var(--status-warning-text)]" : "text-accent-500"}>▸</span>
            <span className="shrink-0 text-slate-500">{toolLabel(step.tool ?? "")}</span>
            {/* Hedef (dosya yolu, komut, desen) tek satırda ve kırpılarak —
                uzun bir bash komutu göstergeyi sarmalayıp kutuyu büyütmesin. */}
            {step.target && (
              <span className="truncate font-mono text-[10px] text-slate-600" title={step.target}>
                {step.target}
              </span>
            )}
            {/* Sonuç AYNI SATIRDA, alta inmiyor. Yeni bir satır açmak kutuyu
                büyütür ve kullanıcının yadırgadığı şey tam olarak buydu. */}
            {step.result && (
              <span
                className={`flex min-w-0 items-center gap-1 ${
                  step.failed ? "text-[var(--status-warning-text)]" : "text-slate-600"
                }`}
                title={step.result}
              >
                <span className="shrink-0 text-slate-600">↳</span>
                <span className="truncate font-mono text-[10px]">
                  {step.extraLines
                    ? t("axetCodeHome.toolMoreLines", { count: String(step.extraLines) })
                    : step.result}
                </span>
              </span>
            )}
          </>
        )}
      </div>
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
 */
export function AskUserCard({
  ask,
  onAnswer
}: {
  ask: AxetChatActivity;
  onAnswer: (index: number, customText?: string) => void;
}) {
  const t = useT();
  const options = ask.options ?? [];
  // Basılan düğmenin dizini. Çift tıklama koruması ve seçimin ANLIK geri
  // bildirimi: kart bir kare sonra kayboluyor, ama o kare boyunca hangi şıkkın
  // gittiği görünüyor.
  const [chosen, setChosen] = useState<number | null>(null);
  // Serbest metin alanı açık mı, ve içinde ne var. Alan varsayılan olarak
  // KAPALI: kartın işi tek tıkla bitsin, yazmak isteyen açsın.
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const sendCustom = () => {
    const text = custom.trim();
    if (!text || chosen !== null) return;
    // `options.length` = kutudaki "Other" satırının dizini; ana süreç zaten
    // kendi listesinden hesaplıyor, bu yalnızca "şık değil" işareti.
    setChosen(options.length);
    onAnswer(options.length, text);
  };
  return (
    // Kutu değil ŞERİT: soldaki ince accent çizgisi dışında çerçevesi yok.
    // Sohbet balonlarının arasına bir pencere daha koymamak için — kart,
    // konuşmanın kesildiği yeri işaretlesin yeter.
    <div className="flex flex-col gap-2 border-l-2 border-accent-500/70 py-0.5 pl-3">
      {ask.header && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-400/90">
          {ask.header}
        </span>
      )}
      <p className="text-[13px] leading-snug text-slate-200">
        {ask.question || t("axetCodeHome.askUserFallback")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option, index) => {
          const isChosen = chosen === index;
          return (
            <button
              key={`${index}-${option}`}
              disabled={chosen !== null}
              onClick={() => {
                setChosen(index);
                onAnswer(index);
              }}
              className={`rounded-full border px-3 py-1 text-[12.5px] leading-tight transition-all duration-150 ${
                isChosen
                  ? "border-accent-500 bg-accent-500/25 text-[var(--accent-soft-text)]"
                  : "border-base-700 bg-base-850/70 text-slate-300 hover:-translate-y-px hover:border-accent-500/60 hover:bg-accent-500/10 hover:text-[var(--accent-soft-text)]"
              } ${chosen !== null && !isChosen ? "opacity-35" : ""} disabled:cursor-default`}
            >
              {option}
            </button>
          );
        })}
        {!customOpen && (
          <button
            disabled={chosen !== null}
            onClick={() => setCustomOpen(true)}
            className={`rounded-full border border-dashed border-base-700 bg-transparent px-3 py-1 text-[12.5px] leading-tight text-slate-400 transition-all duration-150 hover:-translate-y-px hover:border-accent-500/60 hover:text-[var(--accent-soft-text)] ${
              chosen !== null ? "opacity-35" : ""
            } disabled:cursor-default`}
          >
            {t("axetCodeHome.askUserCustom")}
          </button>
        )}
      </div>
      {customOpen && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={custom}
            disabled={chosen !== null}
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
            className="min-w-0 flex-1 rounded-lg border border-base-700 bg-base-850/70 px-2.5 py-1 text-[12.5px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent-500/60"
          />
          <button
            disabled={chosen !== null || custom.trim() === ""}
            onClick={sendCustom}
            title={t("axetCodeHome.askUserCustom")}
            className="rounded-lg border border-base-700 bg-base-850/70 p-1.5 text-slate-300 transition-colors hover:border-accent-500/60 hover:text-[var(--accent-soft-text)] disabled:opacity-35"
          >
            <CornerDownLeft size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
