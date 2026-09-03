import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  FolderTree,
  Layers,
  Loader2,
  Mic,
  Package,
  Paperclip,
  RefreshCw,
  Sparkles,
  Square,
  UploadCloud
} from "lucide-react";
import type { AxetModelEntry, ChatAttachment } from "../../app-electron/shared/types";
import AttachmentChip from "./AttachmentChip";
import ChatBubble, { ThinkingBubble, type ChatMessage } from "./ChatBubble";
import ModelSelector from "./ModelSelector";
import { resolveFilesToPaths } from "../lib/attachments";
import { useT } from "../i18n";

// Açılış ekranındaki öneri kartlarının ikonları. Bilinmeyen bir anahtar
// gelirse `Sparkles`'a düşer, yani yeni öneri eklemek bu haritayı
// güncellemeyi ZORUNLU kılmaz.
const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  suggestion1: Layers,
  suggestion2: FolderTree,
  suggestion3: Package
};

// Okuma sütunu. Mesajlar, karşılama ve composer AYNI genişliği kullanır —
// yazdığın satırla okuduğun satır aynı hizada olsun diye.
//
// Genişlik PENCEREYE göre büyüyor (kullanıcı isteği, 2026-09-02: *"tam ekran
// yaptığımda boyut aynı kalıyor"*). Sabit `max-w-3xl` (768px), 2560px'lik bir
// ekranda sohbeti ortada dar bir şerit olarak bırakıyordu.
//
// Sınırsız DEĞİL, ve bu bilinçli: satır uzunluğu okunabilirliğin kendisi —
// 1500px genişliğinde bir paragrafta göz satır sonundan satır başına
// dönemiyor. Kademeler Tailwind'in kendi kırılma noktalarında: xl (1280px) →
// 896px, 2xl (1536px) → 1024px. Üstü artık büyümüyor.
const COLUMN = "mx-auto w-full max-w-3xl xl:max-w-4xl 2xl:max-w-5xl";

export interface ChatSessionData {
  id: string;
  messages: ChatMessage[];
  model: AxetModelEntry | null;
  draft: string;
  // Henüz gönderilmemiş ekler. Taslak metninden AYRI tutuluyorlar — eskiden
  // dosya yolları doğrudan `draft`'a yazılıyordu (bkz. shared/types.ts
  // `ChatAttachment`).
  attachments: ChatAttachment[];
  pending: boolean;
}

interface Props {
  session: ChatSessionData;
  active: boolean;
  models: AxetModelEntry[];
  modelsLoading: boolean;
  modelsError: string | null;
  attaching: boolean;
  // Açılış ekranındaki karşılama başlığı ("Günaydın, Tufan" vb.) — saat ve
  // kullanıcı adı AxetCodeHome tarafında hesaplanıyor, bu bileşen gösteriyor.
  greeting: string;
  registerTextarea: (el: HTMLTextAreaElement | null) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onSelectModel: (entry: AxetModelEntry) => void;
  onRegenerate: () => void;
  onEditMessage: (id: string, content: string) => void;
  onAttachFiles: () => void;
  // Kaydı başlatır/durdurur. Tanınan metni taslağa ekleme işi çağırana ait
  // (bkz. AxetCodeHome `handleDictate`).
  onDictate: () => void;
  dictationState: "idle" | "recording" | "transcribing";
  onFilesResolved: (paths: string[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  suggestionKeys: readonly string[];
  onSuggestionClick: (key: string) => void;
}

// axet.code sohbet ekranındaki tek bir sohbetin TAMAMI.
//
// GEMİNİ DÜZENİ (kullanıcı kararı, 2026-09-02 — bkz. PROJE-BILGI.md Faz 4).
// Bundan önceki iki tasarım denemesi de reddedildi ("her şey rahatsız etti"),
// bu yüzden burada referans alınan düzenin KURALLARI şunlar ve bir sonraki
// dokunuşta yanlışlıkla geri alınmasınlar diye yazılı:
//
//   1. Composer HER ZAMAN dipte. Boş sohbette composer'ı ekranın ortasına
//      alan desen (ChatGPT/Claude) BİLİNÇLİ olarak kullanılmıyor: Gemini'de
//      yazı kutusu ilk andan itibaren aynı yerde durur, ilk mesajdan sonra
//      aşağı "zıplamaz".
//   2. Karşılama SOLA yaslı, büyük ve degradeli (`--chat-hero-*`).
//   3. Öneriler çip değil KART, ikon kartın sağ altında bir daire içinde.
//
// Bu kuralların İKİSİ kullanıcı isteğiyle sonradan DEĞİŞTİ (2026-09-02) —
// geri alınmasınlar diye yazılı:
//   - "kenarlık değil dolgu" kuralı gevşetildi: composer'ın artık ince bir
//     kenarlığı var (*"borderler daha keskin olsun"*). Yuvarlaklık da hap
//     (`rounded-3xl`) değil `rounded-2xl`.
//   - Model seçici SAĞ ÜSTTEKİ şeritten composer'ın alt satırına indi
//     (*"model seçimi chat box içersinde olsun sağ tarafta"*).
//
// Sürükle-bırak/yapıştırma, `FileExplorer.tsx`'teki KANITLANMIŞ desenle
// (React'ın kendi sentetik `onDrop`/`onDragOver` prop'ları, `stopPropagation`
// ile) birebir aynı — uygulamada zaten çalıştığı bilinen bir mekanizma.
export default function ChatSessionPane({
  session,
  active,
  models,
  modelsLoading,
  modelsError,
  attaching,
  greeting,
  registerTextarea,
  onDraftChange,
  onSend,
  onCancel,
  onSelectModel,
  onRegenerate,
  onEditMessage,
  onAttachFiles,
  onDictate,
  dictationState,
  onFilesResolved,
  onRemoveAttachment,
  suggestionKeys,
  onSuggestionClick
}: Props) {
  const t = useT();
  const [dragOver, setDragOver] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  // Kullanıcı listeyi yukarı kaydırıp eski bir mesajı okuyorsa, akan cevap
  // onu zorla dibe çekmemeli. `true` olduğu sürece otomatik kaydırma yapılır.
  const stickToBottomRef = useRef(true);
  // Aynı bilgi state olarak da tutuluyor: "dibe in" düğmesinin görünürlüğü
  // render'a bağlı, ref tek başına yeniden render tetiklemez.
  const [atBottom, setAtBottom] = useState(true);

  const lastMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
  const streaming = lastMessage?.streaming === true;
  const isEmpty = session.messages.length === 0 && !session.pending;
  // Hatalı bir cevap da yeniden üretilebilir olmalı — asıl işe yaradığı
  // durumlardan biri zaten "cevap alınamadı" balonu.
  const canRegenerate = !session.pending && !streaming && lastMessage?.role === "assistant";

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    // Akan cevapta mesaj SAYISI değişmiyor, sadece son mesajın metni uzuyor —
    // bu yüzden içerik uzunluğu da bağımlılık listesinde.
  }, [session.messages.length, session.pending, lastMessage?.content.length]);

  // Gizli bir panelin (`display:none`) `scrollHeight`'i 0 olduğu için yukarıdaki
  // efekt o sırada hiçbir işe yaramıyor; sohbete geri dönüldüğünde liste EN
  // ÜSTTE açılıyordu. Panel görünür olduğu anda dibe sabitle.
  useEffect(() => {
    if (!active) return;
    stickToBottomRef.current = true;
    setAtBottom(true);
    requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [active]);

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    // 48px'lik tolerans: tam piksel eşitliği aramak, kesirli scroll
    // yüksekliklerinde (tarayıcı zoom/DPI) asla tutmayabilir.
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickToBottomRef.current = near;
    setAtBottom(near);
  };

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    stickToBottomRef.current = true;
    setAtBottom(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.files && dt.files.length > 0) {
      const paths = await resolveFilesToPaths(Array.from(dt.files));
      onFilesResolved(paths);
      return;
    }
    // Dosya değil DÜZ METİN bırakıldı (örn. bir seçim, bir URL). Bu bir ek
    // değil, yazılmış metindir — taslağın sonuna ekleniyor. (Eskiden bu da
    // "ek" muamelesi görüyordu, çünkü ekler zaten metne yazılıyordu.)
    const text = dt.getData("text/plain");
    if (text) onDraftChange(session.draft ? `${session.draft} ${text}` : text);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return; // düz metin yapıştırma — textarea'nın native davranışına bırak
    e.preventDefault();
    const paths = await resolveFilesToPaths(Array.from(files));
    onFilesResolved(paths);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ display: active ? "flex" : "none" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-3xl bg-accent-500/10 ring-2 ring-dashed ring-accent-400">
          <div className="flex items-center gap-2 rounded-full bg-base-900/90 px-4 py-2.5 text-sm font-medium text-accent-400 shadow-lg">
            <UploadCloud size={16} />
            {t("axetCodeHome.dropFilesHint")}
          </div>
        </div>
      )}

      {/* NOT — burada bir ara SADECE model seçiciyi taşıyan bir ÜST ŞERİT
          vardı. Kullanıcı isteğiyle (2026-09-02: *"model seçimi chat box
          içersinde olsun sağ tarafta"*) seçici composer'ın alt satırına indi
          ve şerit tamamen kaldırıldı — tek bir düğme için ekranın tepesinden
          52px ayırmak, sohbete ayrılan yeri boşuna kısaltıyordu. */}

      <div ref={messagesRef} onScroll={handleScroll} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-5">
        {isEmpty ? (
          // --- AÇILIŞ: sola yaslı degradeli karşılama + öneri kartları ---
          // `min-h-full` + `justify-center`: içerik dikeyde ortalanır ama
          // pencere kısaldığında kaymak yerine normal şekilde kaydırılır.
          <div className={`${COLUMN} animate-panel-fade-in flex min-h-full flex-col justify-center py-10`}>
            {/* Degrade renkleri logonun kendi `mark` gradyanından geliyor
                (bkz. index.css `--chat-hero-*`) — ekranın "bizim" olmasının
                en görünür yeri burası. Boyut kullanıcı ayarıyla ölçekleniyor. */}
            <h1 className="bg-gradient-to-r from-[var(--chat-hero-from)] via-[var(--chat-hero-via)] to-[var(--chat-hero-to)] bg-clip-text text-[length:var(--chat-hero-size)] font-medium leading-tight text-transparent">
              {greeting}
            </h1>
            <p className="mt-1 text-[length:var(--chat-hero-size)] font-medium leading-tight text-slate-500">
              {t("axetCodeHome.heroSubtitle")}
            </p>

            {/* Dar pencerede tek sütuna iniyor: sabit üç sütunda kartlar
                ~140px'e sıkışıp metinleri dört-beş satıra bölünüyordu. */}
            <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {suggestionKeys.map((key) => {
                const Icon = SUGGESTION_ICONS[key] ?? Sparkles;
                return (
                  <button
                    key={key}
                    onClick={() => onSuggestionClick(key)}
                    // Kenarlık + `rounded-xl`: composer'la aynı dil. Kartlar
                    // eskiden kenarlıksız ve daha yuvarlaktı (bkz. yukarıdaki
                    // kural notu).
                    className="group flex h-[136px] cursor-pointer flex-col justify-between rounded-xl border border-base-800 bg-base-900 p-4 text-left transition hover:border-base-700 hover:bg-base-800"
                  >
                    <span className="text-[13px] leading-snug text-slate-300">
                      {t(`axetCodeHome.${key}` as Parameters<typeof t>[0])}
                    </span>
                    {/* İkon hover'da marka rengine dönüyor — kartın tıklanabilir
                        olduğunu zemin tonundaki tek kademelik değişimden daha
                        net söylüyor. */}
                    <span className="flex h-8 w-8 items-center justify-center self-end rounded-lg bg-base-800 text-slate-400 transition-colors group-hover:bg-accent-500/15 group-hover:text-accent-400">
                      <Icon size={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${COLUMN} flex flex-col gap-[var(--chat-message-gap)] py-6`}>
            {session.messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                onEdit={message.role === "user" && !session.pending ? onEditMessage : undefined}
              />
            ))}
            {/* "Düşünüyor" göstergesi SADECE ilk parça gelene kadar. Metin
                akmaya başladıktan sonra da göstermek, cevabın altında
                sürekli zıplayan ikinci bir satır demek olurdu. */}
            {session.pending && !streaming && <ThinkingBubble />}
            {/* "Yeniden üret" sohbetin SONUNDA, sadece son mesaj bitmiş bir
                asistan cevabıysa — her cevapta değil yalnızca sonuncusunda
                anlamlı. Cevap tarafında artık avatar oluğu olmadığı için
                girinti de yok: düğme cevap metniyle aynı sol kenardan
                başlıyor. */}
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                title={t("axetCodeHome.regenerateTitle")}
                // Üstteki cevaba yaklaşsın diye negatif üst boşluk, ama sabit
                // bir piksel DEĞİL: mesaj aralığı kullanıcı ayarıyla
                // değiştiği için ona oranlı.
                className="mt-[calc(var(--chat-message-gap)*-0.6)] flex cursor-pointer items-center gap-1.5 self-start rounded-md border border-base-800 bg-base-900 px-3 py-1.5 text-[12px] text-slate-400 transition hover:border-base-700 hover:bg-base-800 hover:text-slate-200"
              >
                <RefreshCw size={12} />
                {t("axetCodeHome.regenerate")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative shrink-0 px-5 pb-3 pt-2">
        {/* "Dibe in" düğmesi — uzun bir cevap akarken kullanıcı yukarı
            kaydırdıysa geri dönmesi için. */}
        {!atBottom && !isEmpty && (
          <button
            onClick={scrollToBottom}
            title={t("axetCodeHome.jumpToBottom")}
            className="absolute -top-2 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-full cursor-pointer items-center justify-center rounded-full bg-base-800 text-slate-300 shadow-lg transition hover:bg-base-700 hover:text-slate-100"
          >
            <ArrowDown size={14} />
          </button>
        )}

        <div className={COLUMN}>
          {/* Composer — TEK SATIR, tek kutunun içinde:
                [ataç] [yazı alanı] [mikrofon] [model] [gönder]
              Bir ara yazı alanı ile araç çubuğu ayrı satırlardaydı; kullanıcı
              geri aldırdı (2026-09-02: *"chat box çok kalın, tek box'ın içine
              gömülü şekilde tek satıra indir"*). İki satırlı hâl kutuyu boş
              bir sohbette ~90px yüksekliğe çıkarıyordu.

              Tek satırın bedeli, model seçicisinin dar pencerede yazı
              alanından yer çalması. Karşılığı `ghost` varyantının dar etiketi
              (bkz. ModelSelector) — kutuyu inceltmek bundan daha önemli.

              Ekler kutunun İÇİNDE, ayrı bir üst satırda: kullanıcı geri
              bildirimi, 2026-09-02 — *"yolu gitmesin, chatte yukarıda
              gözüksün"*. Kutunun dışında ayrı bir şerit olsaydı gönderilecek
              şeyle görsel bağı kopardı.

              `items-end`: yazı alanı büyüdükçe düğmeler dipte kalır, satırın
              ortasında asılı kalmaz. */}
          <div className="rounded-2xl border border-base-800 bg-base-900 px-2 py-1.5 transition focus-within:border-base-700 focus-within:bg-base-850">
            {session.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
                {session.attachments.map((a) => (
                  <AttachmentChip key={a.id} attachment={a} variant="composer" onRemove={onRemoveAttachment} />
                ))}
              </div>
            )}
            <div className="flex items-end gap-1">
              <button
                onClick={onAttachFiles}
                disabled={attaching}
                title={t("axetCodeHome.attachTitle")}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-base-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Paperclip size={16} />
              </button>
              <textarea
                ref={registerTextarea}
                value={session.draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                onPaste={handlePaste}
                placeholder={t("axetCodeHome.composerPlaceholder")}
                rows={1}
                // Yazdığın metin okuduğun metinle AYNI boyutta olmalı — yazı
                // boyutu ayarı composer'ı da kapsıyor. `min-h`/dikey boşluk,
                // yandaki 36px'lik düğmelerle aynı yüksekliği tutturuyor.
                className="max-h-52 min-h-[36px] min-w-0 flex-1 resize-none bg-transparent py-[7px] text-[length:var(--chat-font-size)] leading-[22px] text-slate-200 outline-none placeholder:text-slate-500"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 208)}px`;
                }}
              />
              {/* Mikrofon, model seçicinin SOLUNDA (kullanıcı isteği,
                  2026-09-02) — sağ uçtaki üçlü soldan sağa "söyle → hangi
                  modele → gönder" sırasında ilerliyor.

                  Bir AÇ/KAPA düğmesi: tanıma gömülü whisper.cpp ile YEREL
                  yapılıyor (bkz. main/dictation.ts), yani konuşmanın ne zaman
                  bittiğini uygulamanın bilmesi gerekiyor. Üç hâlin üçü de
                  GÖRÜNÜR olmalı — kaydın sürdüğünü göstermeyen bir mikrofon,
                  kullanıcının boşluğa konuşmasına yol açar.

                  Çeviri sürerken düğme KİLİTLİ: whisper birkaç saniye
                  sürebiliyor ve bu arada ikinci bir kayıt başlatmak, biten
                  çevirinin metnini nereye yazacağını belirsizleştirirdi. */}
              <button
                onClick={onDictate}
                disabled={dictationState === "transcribing"}
                title={
                  dictationState === "recording"
                    ? t("axetCodeHome.dictateStopTitle")
                    : dictationState === "transcribing"
                      ? t("axetCodeHome.dictateBusyTitle")
                      : t("axetCodeHome.dictateTitle")
                }
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${
                  dictationState === "recording"
                    ? // Kayıt sürerken nabız gibi atıyor: durağan kırmızı bir
                      // ikon "hata" gibi okunuyordu.
                      "animate-pulse bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] cursor-pointer"
                    : dictationState === "transcribing"
                      ? "cursor-not-allowed text-slate-500"
                      : "cursor-pointer text-slate-400 hover:bg-base-800 hover:text-slate-200"
                }`}
              >
                {dictationState === "transcribing" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mic size={16} />
                )}
              </button>
              <ModelSelector
                models={models}
                current={session.model}
                loading={modelsLoading}
                error={modelsError}
                onSelect={onSelectModel}
                // Tetikleyici ekranın DİBİNDE — menü yukarı açılmalı.
                direction="up"
                variant="ghost"
              />
              {session.pending ? (
                <button
                  onClick={onCancel}
                  title={t("axetCodeHome.stopGenerating")}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-base-700 text-slate-200 transition hover:bg-base-600"
                >
                  <Square size={13} />
                </button>
              ) : (
                // Gönder düğmesi gönderilecek bir şey YOKKEN hiç çizilmiyor
                // (Gemini deseni): soluk ve tıklanamaz bir düğme bırakmak
                // yerine yer kaplamıyor. Tek başına bir ek de gönderilebilir —
                // bir görsel bırakıp "bu ne?" yazmadan göndermek meşru bir
                // kullanım.
                (session.draft.trim().length > 0 || session.attachments.length > 0) && (
                  <button
                    onClick={onSend}
                    title={t("axetCodeHome.send")}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent-500 text-accent-on transition hover:bg-accent-600"
                  >
                    <ArrowUp size={16} />
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-500">{t("axetCodeHome.disclaimer")}</p>
      </div>
    </div>
  );
}
