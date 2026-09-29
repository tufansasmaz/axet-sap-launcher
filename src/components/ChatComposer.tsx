import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, FileCode, FolderOpen, Plus, Square } from "lucide-react";
import type { AxetModelEntry, ChatAttachment, FsSearchFilesEntry, SystemTier } from "../../app-electron/shared/types";
import AttachmentChip from "./AttachmentChip";
import ModelSelector from "./ModelSelector";
import TierBadge from "./TierBadge";
import { resolveFilesToPaths } from "../lib/attachments";
import { MENTION_CLASS, renderWithMentions } from "../lib/mentions";
import { useT } from "../i18n";

// Yazı alanının büyüyebileceği en fazla yükseklik. Sınıftaki `max-h-52` ile
// AYNI değer olmak zorunda (13rem = 208px): biri CSS'te kırpıyor, diğeri
// ölçülen yüksekliği kırpıyor ve ayrışırlarsa kutu ya erken duruyor ya da
// içeride gizli bir kaydırma bırakıyor.
const COMPOSER_MAX_PX = 208;

// İmlecin SOLUNDA yarım kalmış bir `@dosya` bahsi var mı? Başındaki
// `(?:^|\s)`, bir e-posta adresinin (`biri@yer.com`) menüyü açmasını engelliyor;
// `[^\s@]*` ise bahsin boşlukla bittiğini, yani tamamlanmış bir bahsin menüyü
// yeniden açmadığını söylüyor.
const MENTION_RE = /(?:^|\s)@([^\s@]*)$/;

// Arama, her tuşta değil bu kadar sessizlik sonrasında yapılıyor. Arama diskte
// yürüyor (bkz. fsExplorer.searchFiles) — hızlı yazan birinde her harf için bir
// dizin taraması başlatmak, sonucu ilk harfe ait olan bir yarışa dönerdi.
const MENTION_DEBOUNCE_MS = 120;

// Sekmede tam yol değil klasörün adı; tam yol `title`da.
const basename = (p: string) => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;

export interface ChatComposerProps {
  active: boolean;
  draft: string;
  attachments: ChatAttachment[];
  pending: boolean;
  /** Boş kutuda ↑ ile geri çağrılacak son istem. */
  recallText: string;
  models: AxetModelEntry[];
  model: AxetModelEntry | null;
  modelsLoading: boolean;
  modelsError: string | null;
  onSelectModel: (entry: AxetModelEntry) => void;
  attaching: boolean;
  onAttachFiles: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onFilesResolved: (paths: string[]) => void;
  registerTextarea: (el: HTMLTextAreaElement | null) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  /** Bahis araması bu klasörde yapılıyor; yoksa `@` menüsü açılmıyor. */
  contextPath?: string | null;
  /** Sekmedeki sistem adı; yoksa "Çalışma alanı". */
  contextLabel?: string | null;
  /** Rozet yalnız sohbetin klasörü bağlı sistemin klasörüyse (bkz. contextTierFor). */
  contextTier?: SystemTier | null;
  onOpenInstructions?: () => void;
  filesPanelOpen?: boolean;
  onToggleFilesPanel?: () => void;
  contextTokens: number;
  contextLimit: number;
}

// Sohbetin yazma kutusu — ChatSessionPane'den ayrıldı (2026-09-29). Taslak,
// ekler ve model YUKARIDA tutuluyor; burada yalnızca kutunun kendi işi var:
// yükseklik ölçümü, `@` bahsi, klavye ve gönder/durdur.
export default function ChatComposer({
  active,
  draft,
  attachments,
  pending,
  recallText,
  models,
  model,
  modelsLoading,
  modelsError,
  onSelectModel,
  attaching,
  onAttachFiles,
  onRemoveAttachment,
  onFilesResolved,
  registerTextarea,
  onDraftChange,
  onSend,
  onCancel,
  contextPath = null,
  contextLabel = null,
  contextTier = null,
  onOpenInstructions,
  filesPanelOpen = false,
  onToggleFilesPanel,
  contextTokens,
  contextLimit
}: ChatComposerProps) {
  const t = useT();
  // Yazı alanının KENDİ referansı. `registerTextarea` yukarıya (AxetCodeHome'a,
  // odaklanmak için) veriliyor ama yalnızca AKTİF sohbet için — bu bileşenin
  // yüksekliği kendi başına ayarlaması gerektiğinden burada ayrı bir referans
  // tutuluyor.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Yazı alanının ARKASINDAKİ boyama katmanı (bkz. composer'daki gerekçe).
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // --- `@` dosya bahsi ---
  // `start`, taslaktaki `@` işaretinin indeksi: seçim yapıldığında bahsin
  // TAMAMININ (işaret dâhil) yerine yol yazılabilsin diye saklanıyor.
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionItems, setMentionItems] = useState<FsSearchFilesEntry[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  // Esc'le kapatılan bahsin `start`'ı. Bu olmadan, kapattıktan sonra yazılan bir
  // sonraki harf aynı bahsi yeniden açardı — Esc'in hiçbir anlamı kalmazdı.
  const dismissedStartRef = useRef<number | null>(null);
  const mentionOpen = mention !== null && mentionItems.length > 0;

  // Yazı alanının yüksekliği. Bu ölçüm ESKİDEN `onInput`'taydı ve orada
  // OLMAMASI gerekiyordu: `onInput` yalnızca kullanıcı klavyeyle yazdığında
  // ateşleniyor. Gönderdikten sonra taslağı React `""` yapıyor, `onInput`
  // ateşlenmiyor ve inline `style.height`'e yazılmış eski değer olduğu gibi
  // kalıyordu — kutu, gönderilen çok satırlı mesajın yüksekliğinde ASILI
  // kalıyordu (kullanıcı bildirimi, 2026-09-04).
  //
  // Aynı kör nokta TERS yönde de vardı ve fark edilmemişti: dikte, öneri
  // kartı, sürüklenen düz metin ve "mesajı düzenle" taslağı PROGRAMATİK
  // yazıyor, dolayısıyla uzun bir metin kutuya girdiğinde kutu büyümüyordu.
  // Taslağı tek doğruluk kaynağı yapmak ikisini birden kapatıyor.
  const measureComposer = useCallback(() => {
    const el = textareaRef.current;
    // Gizli panelde `scrollHeight` 0 — o anda ölçmek kutuyu en küçük boya
    // çökertirdi. Panel görünür olduğu anda `active` değişip yeniden ölçülüyor.
    if (!el || !active) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [active]);

  useEffect(() => {
    measureComposer();
  }, [draft, measureComposer]);

  // GENİŞLİK değişince de yeniden ölçülmeli, taslak hiç değişmemiş olsa bile.
  // Yukarıdaki efekt yalnızca taslağa bakıyordu ve şunları kaçırıyordu: dosya
  // panelinin açılıp kapanması (380px), kenar çubuğunun daraltılması, pencere
  // boyutlandırma. Üçünde de metin yeniden sarılıyor ama yükseklik eski
  // kalıyordu — kutu ya metni kırpıyor ya boşuna büyük duruyordu
  // (kullanıcı bildirimi, 2026-09-23).
  //
  // Yalnız genişlik: yüksekliği ZATEN biz yazıyoruz, ona tepki vermek
  // gözlemciyi kendi kendini besleyen bir döngüye sokardı.
  const lastWidthRef = useRef(0);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width === lastWidthRef.current) return;
      lastWidthRef.current = width;
      measureComposer();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [measureComposer]);

  // Taslak dışarıdan boşaltıldığında (gönderme, yeni sohbet) menü de kapanmalı:
  // bahsin dayandığı metin artık yok.
  useEffect(() => {
    if (draft.length === 0) {
      setMention(null);
      setMentionItems([]);
      dismissedStartRef.current = null;
    }
  }, [draft.length]);

  // Bahis aranıyor. Bağlam klasörü yoksa (`contextPath` null) arama yapılacak
  // bir kök de yok — menü hiç açılmıyor, `@` düz metin olarak kalıyor.
  useEffect(() => {
    const root = contextPath;
    if (!mention || !root) {
      setMentionItems([]);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      const res = await window.api.searchFiles(root, mention.query);
      if (!alive) return;
      setMentionItems(res.ok ? res.entries : []);
      setMentionIndex(0);
    }, MENTION_DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [mention?.query, mention?.start, contextPath]);

  const syncMention = (value: string, caret: number) => {
    const match = MENTION_RE.exec(value.slice(0, caret));
    if (!match) {
      dismissedStartRef.current = null;
      setMention(null);
      return;
    }
    const start = caret - match[1].length - 1;
    if (dismissedStartRef.current === start) return; // Esc'le kapatılmıştı
    dismissedStartRef.current = null;
    setMention({ query: match[1], start });
  };

  const applyMention = (entry: FsSearchFilesEntry) => {
    if (!mention) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, mention.start);
    const after = draft.slice(caret);
    // Ters bölü ileri bölüye çevriliyor: yol PROMPT METNİNE giriyor ve `\s`
    // gibi bir dizi kaçış dizisi gibi okunabilir. İleri bölüyü Windows da
    // kabul ediyor.
    //
    // Sondaki BOŞLUK zorunlu, süs değil: axet-code'un kendi TUI'si `@`
    // görünce bir tamamlama menüsü açıyor ve menü açıkken Enter göndermiyor
    // (ölçüm ve kalıcı düzeltme: axetChatTui.ts `closeMentionMenus`).
    const inserted = `@${entry.rel.replace(/\\/g, "/")} `;
    onDraftChange(`${before}${inserted}${after}`);
    setMention(null);
    setMentionItems([]);
    dismissedStartRef.current = null;
    // Bir sonraki boyamada: imleç eklenen yolun ARDINA konuyor, yoksa metnin
    // başına düşer ve yazmaya devam etmek imkânsız olur.
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      const pos = before.length + inserted.length;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  };

  const dismissMention = () => {
    if (mention) dismissedStartRef.current = mention.start;
    setMention(null);
    setMentionItems([]);
  };

  // Gönderilecek bir şey var mı: yazı ya da tek başına bir ek.
  const canSend = draft.trim().length > 0 || attachments.length > 0;

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return; // düz metin yapıştırma — textarea'nın native davranışına bırak
    e.preventDefault();
    const paths = await resolveFilesToPaths(Array.from(files));
    onFilesResolved(paths);
  };
  return (
    // `relative`: `@` menüsü kutuya göre, ONUN ÜSTÜNDE konumlanıyor.
    <div className="relative">
      {mentionOpen && (
        <MentionMenu items={mentionItems} index={mentionIndex} onHover={setMentionIndex} onPick={applyMention} />
      )}
      {/* Kutu — İKİ KAT: üstte 3 satırlık yazı alanı, altında araç çubuğu
            [+] ················· [model] [bağlam] [gönder]
          (2026-09-29, bkz. docs/superpowers/specs/2026-09-29-sohbet-ekrani-design.md).
          Eskiden her şey tek satırdaydı (2026-09-02: *"chat box çok kalın"*);
          yeni tasarımda yazı alanı öne çıkıyor, düğmeler onun altına iniyor.

          Ekler kutunun İÇİNDE, ayrı bir üst satırda: kullanıcı geri
          bildirimi, 2026-09-02 — *"yolu gitmesin, chatte yukarıda
          gözüksün"*.

          KİMLİĞİ BİLEŞENDEN DEĞİL DURUMDAN ALIYOR (kullanıcı kararı,
          2026-09-06: *"daha fazla komponent değil, daha iyi state'ler"*):

            durgun → `line-subtle`   (neredeyse görünmez, ekranı yormuyor)
            hover  → `line`          (fare yaklaşınca kutu kendini gösterir)
            odak   → vurgu kenarlık + `--accent-glow` halesi

          Hale `shadow`, `ring` DEĞİL: `ring` kenarlığın ÜSTÜNE keskin bir
          ikinci çizgi koyuyor ve iki hatlı bir çerçeve gibi okunuyor.
          Yükseklik HİÇBİR durumda değişmiyor: kenarlık kalınlığı sabit,
          gölge yer kaplamıyor.

          HOVER NEDEN `:not(:focus-within)` İLE KOŞULLU: Tailwind `hover:`
          kurallarını `focus-within:` kurallarından SONRA basıyor ve ikisinin
          özgüllüğü eşit — kutu hem odaklı hem fare üstündeyken kazanan gri
          `line` oluyordu. Bu da ana yol: kullanıcı kutuya tıklayarak
          odaklanıyor, fare de orada kalıyor. */}
      {/* SİSTEM SEKMESİ — kutuya yapışık (taslakta seçilen A). Eskiden
          sohbetin tepesinde dolgulu bir şerit vardı; yazarken göz kutuda,
          PROD'da olunduğu tam oraya yazılmalı. Klasör yoksa sekme de yok.
          Dar pencerede ad ve klasör kırpılıyor, düğmeler küçülmüyor.
          İkonlar eski şeritteki gibi RENKLİ, yazı nötr (kullanıcı isteği,
          2026-09-06): klasör sarısı ve doküman mavisi; "Dosyalar" açıkken
          renk türü değil DURUMU söylüyor ve vurguya geçiyor. */}
      {contextPath && (
        <div
          data-testid="system-tab"
          className="flex w-fit min-w-0 max-w-full items-center gap-2 rounded-t-lg border border-b-0 border-line-subtle bg-card px-2.5 py-1 text-2xs"
        >
          {contextTier && <TierBadge tier={contextTier} className="shrink-0" />}
          <span data-testid="system-tab-label" className="min-w-0 truncate font-medium text-slate-200">
            {contextLabel ?? t("axetCodeHome.contextWorkspace")}
          </span>
          <span data-testid="system-tab-folder" title={contextPath} className="min-w-0 truncate font-mono text-slate-500">
            {basename(contextPath)}
          </span>
          {onToggleFilesPanel && (
            <button
              type="button"
              onClick={onToggleFilesPanel}
              title={t("axetCodeHome.contextFilesHint")}
              aria-pressed={filesPanelOpen}
              className={`flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 transition hover:text-slate-200 ${
                filesPanelOpen ? "text-accent-400" : "text-slate-400"
              }`}
            >
              <FolderOpen size={12} className={filesPanelOpen ? undefined : "text-[var(--folder-icon)]"} />
              {t("axetCodeHome.contextFiles")}
            </button>
          )}
          {onOpenInstructions && (
            <button
              type="button"
              onClick={onOpenInstructions}
              title={t("chatInstructions.title")}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 text-slate-400 transition hover:text-slate-200"
            >
              <BookOpen size={12} className="text-[var(--status-info-text)]" />
              {t("chatInstructions.button")}
            </button>
          )}
        </div>
      )}
      <div className={`rounded-2xl ${contextPath ? "rounded-tl-none " : ""}border border-line-subtle bg-card px-3 pb-2 pt-2.5 transition [&:hover:not(:focus-within)]:border-line focus-within:border-accent-500 focus-within:bg-raised focus-within:shadow-[0_0_0_3px_var(--accent-glow)]`}>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} variant="composer" onRemove={onRemoveAttachment} />
            ))}
          </div>
        )}
        {/* Yazı alanı + BOYAMA KAPLAMASI.
            Bir `textarea`nın içindeki metnin bir parçası tek başına
            renklendirilemez; standart çözüm, aynı yazı ölçüleriyle
            çizilmiş bir katmanı arkasına koymak. Metni GÖSTEREN bu
            katman, `textarea`nın kendi metni saydam (yalnızca imleç ve
            seçim görünür). İkisinin yazı boyu/satır yüksekliği/dolgusu
            ve sarma kuralı BİREBİR aynı olmak zorunda — ayrışırlarsa
            yazılan metinle görünen metin kayar. */}
        <div className="relative min-w-0">
          <div
            ref={overlayRef}
            aria-hidden
            // `pr-[10px]` kaydırma çubuğunun karşılığı: yazı alanı
            // `overflow-y-scroll` ile o 10px'i HER ZAMAN ayırıyor
            // (bkz. index.css `::-webkit-scrollbar`). Çubuk yalnızca
            // taslak uzayınca çıksaydı, çıktığı anda yazı alanının satır
            // genişliği 10px daralır, kaplamanınki daralmaz ve boyama
            // metinden kayardı.
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words py-[7px] pr-[10px] text-[length:var(--chat-font-size)] leading-[22px] text-slate-200"
          >
            {renderWithMentions(draft, MENTION_CLASS)}
          </div>
          <textarea
            ref={(el) => {
              textareaRef.current = el;
              registerTextarea(el);
            }}
            // Kutu kendi içinde kaydığında (uzun taslak) kaplama da aynı
            // kadar kaymalı, yoksa boyama metnin gerisinde kalır.
            onScroll={(e) => {
              if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
            value={draft}
            onChange={(e) => {
              onDraftChange(e.target.value);
              syncMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
            }}
            // İmleci klavyeyle/fareyle taşımak da bahsi değiştirir: yazmayı
            // bırakıp sola gitmek yarım bir bahsin içine düşebiliyor.
            onSelect={(e) => {
              const el = e.currentTarget;
              syncMention(el.value, el.selectionStart ?? el.value.length);
            }}
            onKeyDown={(e) => {
              // Menü açıkken ok tuşları ve Enter MENÜNÜN — Enter'ın burada
              // göndermemesi kritik: kullanıcı bir dosya seçmek üzere.
              if (mentionOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % mentionItems.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((i) => (i - 1 + mentionItems.length) % mentionItems.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  applyMention(mentionItems[mentionIndex] ?? mentionItems[0]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  dismissMention();
                  return;
                }
              }
              // Kutu BOŞKEN yukarı ok = son mesajın metnini GERİ ÇAĞIR.
              // Terminaldeki geçmiş çağırma gibi: metin kutuya gelir,
              // sohbetten SİLİNMEZ.
              //
              // Önce düzenleme kipini (kalem düğmesi) açıyordu ve
              // kullanıcı bunu haklı olarak yanlış buldu (2026-09-05:
              // *"yukarı basınca mesajı geri alarak son yazdığımı aşağı
              // alıyor"*): tek bir ok tuşunun sohbetin kuyruğunu kesmesi
              // ağır bir yan etki. Düzenleme kalem düğmesinde kaldı.
              //
              // Boşluk şartı pazarlık dışı: taslak varken ↑ imleci
              // taşımalı, yoksa çok satırlı bir metinde gezinmek
              // imkânsızlaşır. Bunun bir sonucu, art arda basıp geçmişte
              // geri geri yürümenin olmaması — ilk basışta kutu doluyor.
              if (e.key === "ArrowUp" && !e.shiftKey && draft === "" && !pending) {
                if (recallText) {
                  e.preventDefault();
                  onDraftChange(recallText);
                  // İmleç sona: kullanıcı çoğunlukla eklemek için çağırır.
                  requestAnimationFrame(() => {
                    const el = textareaRef.current;
                    if (el) el.setSelectionRange(el.value.length, el.value.length);
                  });
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            onPaste={handlePaste}
            placeholder={t("axetCodeHome.composerPlaceholder")}
            rows={3}
            // Yazdığın metin okuduğun metinle AYNI boyutta olmalı — yazı
            // boyutu ayarı composer'ı da kapsıyor. `min-h-[80px]` üç satır
            // (3 × 22px + dikey dolgu): kutu boşken de yazmaya davet ediyor.
            // Yükseklik burada DEĞİL, taslağa bakan bir efektte ayarlanıyor
            // (bkz. yukarıdaki not) — `onInput` klavye dışındaki taslak
            // değişikliklerini görmüyordu.
            // `text-transparent`: metni kaplama çiziyor. `caret-slate-200`
            // ŞART — saydam metinle birlikte imleç de kaybolurdu.
            // `placeholder:` kuralı daha özgül olduğu için yer tutucu
            // saydamlıktan etkilenmiyor.
            //
            // `block` PAZARLIK DIŞI (kullanıcı isteği, 2026-09-06:
            // *"sohbet boxının içindeki butonlar yazılar ortalanmış
            // değil"*). Tailwind'in preflight'ı `textarea`yı `block`
            // YAPMIYOR — satır içi bir kutu olarak kalıyor ve satır
            // kutusunun taban çizgisinin ALTINDA ~4px'lik iniş boşluğu
            // bırakıyor. Sonuç: sarmalayıcı 36px değil 40px oluyordu,
            // satır `items-end` hizalandığı için düğmeler dibe
            // yapışırken yazı 4px yukarıda asılı kalıyordu. Gözle
            // "biraz kaymış" görünen buydu; `block` satır kutusunu
            // tamamen ortadan kaldırıyor.
            className="relative block max-h-52 min-h-[80px] w-full resize-none overflow-y-scroll bg-transparent py-[7px] text-[length:var(--chat-font-size)] leading-[22px] text-transparent caret-slate-200 outline-none placeholder:text-slate-500"
          />
        </div>
        {/* Buradaki mikrofon düğmesi 2026-09-07'de KALDIRILDI: tanıma
            güvenilir çalışmıyordu ve gömülü whisper.cpp çalışma zamanı
            kuruluma tek başına ~297 MB ekliyordu. Geri istenirse 6c42f8f
            öncesindeki sürümde duruyor. */}
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={onAttachFiles}
            disabled={attaching}
            title={t("axetCodeHome.attachTitle")}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ModelSelector
              models={models}
              current={model}
              loading={modelsLoading}
              error={modelsError}
              onSelect={onSelectModel}
              // Tetikleyici ekranın DİBİNDE — menü yukarı açılmalı.
              direction="up"
              variant="ghost"
            />
            <ContextRing tokens={contextTokens} limit={contextLimit} />
            {/* Sağdaki düğme HER ZAMAN çiziliyor — durdur ya da gönder,
                ikisi de 32px.

                2026-09-23'e kadar gönder düğmesi gönderilecek bir şey
                yokken hiç çizilmiyordu (Gemini deseni). Bedeli satırın
                GENİŞLİĞİYDİ: ilk harfte düğme satıra giriyor ve yazılmakta
                olan metin yeniden sarılıyordu — kullanıcının "kaymalar
                oluyor" dediği şey buydu (2026-09-23).

                Boşken soluk ve tıklanamaz duruyor. Tek başına bir ek de
                gönderilebilir — bir görsel bırakıp "bu ne?" yazmadan
                göndermek meşru bir kullanım. */}
            {pending ? (
              <button
                type="button"
                onClick={onCancel}
                title={t("axetCodeHome.stopGenerating")}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-active text-slate-200 transition hover:bg-active"
              >
                <Square size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend}
                title={t("axetCodeHome.send")}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                  canSend
                    ? "cursor-pointer bg-accent-500 text-accent-on hover:bg-accent-600"
                    : "cursor-not-allowed bg-active text-slate-600"
                }`}
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * `@` ile açılan dosya listesi — composer'ın ÜSTÜNDE.
 *
 * Aşağı açılmıyor: kutu zaten ekranın dibinde, aşağıda yer yok.
 *
 * Fare seçimi `onMouseDown` üzerinde ve `preventDefault`'lu: `onClick`
 * beklenseydi, tıklamanın başında yazı alanı odağı kaybeder, imleç konumu
 * (`selectionStart`) belirsizleşir ve yol yanlış yere eklenirdi.
 */
function MentionMenu({
  items,
  index,
  onHover,
  onPick
}: {
  items: FsSearchFilesEntry[];
  index: number;
  onHover: (i: number) => void;
  onPick: (entry: FsSearchFilesEntry) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  // Klavyeyle seçilen satır kırpılan alanın dışına çıkabiliyor; ok tuşuyla
  // ilerlerken listenin kendiliğinden kaymaması "menü dondu" gibi okunuyor.
  useEffect(() => {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);
  return (
    <div
      ref={listRef}
      className="chat-scroll absolute bottom-full left-0 right-0 z-20 mb-2 max-h-64 overflow-auto rounded-xl border border-line bg-card py-1 shadow-lg"
    >
      {items.map((entry, i) => {
        const rel = entry.rel.replace(/\\/g, "/");
        const slash = rel.lastIndexOf("/");
        const name = slash >= 0 ? rel.slice(slash + 1) : rel;
        const dir = slash >= 0 ? rel.slice(0, slash) : "";
        return (
          <div
            key={entry.path}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(entry);
            }}
            onMouseEnter={() => onHover(i)}
            className={`flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-[12px] ${
              i === index ? "bg-control text-slate-100" : "text-slate-300"
            }`}
          >
            <FileCode size={12} className="shrink-0 self-center text-slate-500" />
            <span className="shrink-0">{name}</span>
            {dir && <span className="truncate text-[11px] text-slate-500">{dir}</span>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bağlam doluluğu — küçük bir halka. Yüzde yalnız üzerine gelince (`title`)
 * okunuyor: sürekli görünen bir sayı, çoğu zaman önemsiz olan bir bilgiyi
 * gözün önünde tutardı. Renk %60'ta uyarıya, %80'de tehlikeye dönüyor —
 * %80'de oturum kendiliğinden yenileniyor (bkz. axetChatTui.ts
 * `CONTEXT_ROTATE_AT`) ve kullanıcının bunun geldiğini görebilmesi gerekiyor.
 *
 * Ölçüm yokken (yeni oturum, ya da model sınırını bildirmedi) hiç çizilmiyor:
 * "%0" ile "henüz bilmiyoruz" aynı şey değil. Maliyet gösterilmiyor —
 * `sessions.cost` kurumsal portalda her oturumda 0 (ölçüm 2026-09-05).
 */
export function ContextRing({ tokens, limit }: { tokens: number; limit: number }) {
  const t = useT();
  if (limit <= 0 || tokens <= 0) return null;
  const pct = Math.min(100, Math.round((tokens / limit) * 100));
  const tone = pct >= 80 ? "danger" : pct >= 60 ? "warning" : "normal";
  const color =
    tone === "danger"
      ? "text-[var(--status-danger-text)]"
      : tone === "warning"
        ? "text-[var(--status-warning-text)]"
        : "text-accent-400";
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <span
      data-testid="context-ring"
      data-tone={tone}
      title={`${t("chatPlan.context", { pct: String(pct) })} · ${t("chatPlan.contextTitle", { tokens: tokens.toLocaleString() })}`}
      className={`flex h-8 w-6 shrink-0 items-center justify-center ${color}`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2" className="stroke-line" />
        <circle
          cx="9"
          cy="9"
          r={r}
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
        />
      </svg>
    </span>
  );
}
