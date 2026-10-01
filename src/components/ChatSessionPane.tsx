import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpCircle,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronUp,
  Clock,
  CornerUpLeft,
  Code2,
  FileCode,
  Files,
  FlaskConical,
  FolderTree,
  GitBranch,
  History,
  Layers,
  ListChecks,
  Mail,
  MousePointerClick,
  Package,
  Rocket,
  Search,
  Server,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";
import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  AxetModelEntry,
  AxetTodo,
  ChatAttachment,
  SystemTier
} from "../../app-electron/shared/types";
import ChatBubble, { AskUserCard, ThinkingBubble, type ChatMessage } from "./ChatBubble";
import ChatComposer from "./ChatComposer";
import ChatToolRun from "./ChatToolRun";
import { readDraggedPaths, resolveFilesToPaths } from "../lib/attachments";
import { useLanguage, useT } from "../i18n";
import { dayLabel, daySeparatorBefore } from "../lib/chatDays";
import logo from "../assets/logo.svg";

// Açılış ekranındaki öneri kartlarının ikonları. Bilinmeyen bir anahtar
// gelirse `Sparkles`'a düşer, yani yeni öneri eklemek bu haritayı
// güncellemeyi ZORUNLU kılmaz.
// Anahtarların havuzu AxetCodeHome'da (`SUGGESTION_POOL`) — burada yalnızca
// görsel karşılıkları var.
//
// Öneri kartlarının ikon RENKLERİ ayrı bir dizi ve sırayla dönüyor (bkz.
// kullanım yeri). Modül paletinden geliyorlar ki uygulamanın geri kalanıyla
// aynı üç rengi konuşsun; dördüncü bir renk uydurmak, sol şeritteki renklerin
// taşıdığı anlamı sulandırırdı.
const SUGGESTION_TINTS = ["var(--module-code)", "var(--module-sap)", "var(--module-guiscript)"];

const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  sgArchitecture: Layers,
  sgKeyFiles: FolderTree,
  sgDependencies: Package,
  sgRecentChanges: History,
  sgTests: FlaskConical,
  sgDebug: Bug,
  sgCommitMessage: GitBranch,
  sgTodos: ListChecks,
  sgReadme: BookOpen,
  sgExplainFile: FileCode,
  sgSetup: Rocket,
  sgSapSystems: Server,
  sgAbapReport: Code2,
  sgSapDump: AlertTriangle,
  sgSapGuiAutomate: MousePointerClick,
  sgMailSummary: Mail,
  sgSharepointFind: Files
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
  // Cevap beklenirken alt sürecin bildirdiği son aşama. `null` = henüz bir
  // aşama gelmedi (ya da bekleyen istek yok).
  activity: AxetChatActivityPhase | null;
  /** Bu turda çağrılan araçlar, sırayla — sonuçları da içinde (bkz. applyActivity). */
  activitySteps: AxetChatActivity[];
  /**
   * Kaç dakikadır axet-code'dan hiçbir belirti gelmediği. `0` = akış normal.
   * Yalnızca `activity === "stalled"` iken okunuyor.
   */
  stalledMinutes: number;
  /**
   * Ajanın ŞU AN sorduğu soru. Doluyken tur DURUYOR; cevap, TUI'deki soru
   * kutusuna tuş olarak gidiyor (bkz. axetChatTui.ts `answerTuiQuestion`).
   */
  pendingAsk: AxetChatActivity | null;
  /** Ajanın kendi planı (axet-code `todos` aracı). Boşsa panel hiç çizilmiyor. */
  todos: AxetTodo[];
  /** Bağlam doluluğu. `contextLimit` 0 iken gösterge çizilmiyor (ölçüm yok). */
  contextTokens: number;
  contextLimit: number;
  /** Son düzenlemenin kestiği kuyruk — `null` ise geri alma şeridi çizilmiyor. */
  editUndo: { messages: ChatMessage[] } | null;
  /**
   * "Durdur"a basıldı ama tur DURMADI: ajan arkada üretmeye devam ediyor
   * (bkz. AxetCodeHome `cancelStuck`, axetChatTui.ts `cancelTui`).
   */
  cancelStuck: boolean;
  /** Cevap sürerken yazılan, tur bitince gidecek mesaj (bkz. lib/chatQueue.ts). */
  queued: { text: string; attachments: ChatAttachment[] } | null;
}

interface Props {
  session: ChatSessionData;
  active: boolean;
  models: AxetModelEntry[];
  modelsLoading: boolean;
  modelsError: string | null;
  attaching: boolean;
  // axet-code'un kendi güncelleme duyurusu; yoksa `null`. Yalnızca AÇILIŞ
  // ekranında gösteriliyor — süren bir sohbetin ortasına sürüm haberi
  // düşürmek, kullanıcının o an baktığı şeyle ilgisiz olurdu.
  axetUpdate: { installed: string; latest: string } | null;
  registerTextarea: (el: HTMLTextAreaElement | null) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  /**
   * Soru kutusundaki seçeneği seçer (`index < 0` = vazgeç). Çoklu seçimli
   * soruda dizin bir DİZİ olarak geliyor. `customText` doluysa şık değil,
   * kutunun serbest metin satırı kullanılıyor.
   */
  onAnswerQuestion: (index: number | number[], customText?: string) => void;
  onSelectModel: (entry: AxetModelEntry) => void;
  onRegenerate: () => void;
  /**
   * Yarıda kalmış son cevaba KALDIĞI YERDEN devam ettirir (bkz. `interrupted`).
   * Yeniden üretmekten farkı, üretilmiş metnin atılmaması.
   */
  onContinue: () => void;
  onEditMessage: (id: string, content: string) => void;
  onUndoEdit: () => void;
  /** "Durduramadım" uyarısını kapatır (bkz. `cancelStuck`). */
  onDismissCancelStuck: () => void;
  /** Sıradaki mesajı kutuya geri koyar / tamamen atar (bkz. `queued`). */
  onUnqueue: () => void;
  onDropQueued: () => void;
  onAttachFiles: () => void;
  onFilesResolved: (paths: string[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  suggestionKeys: readonly string[];
  onSuggestionClick: (key: string) => void;
  // Hiç sohbeti olmayan kullanıcı: boş ekranda üç satırlık "neler
  // yapabilirsin". İlk mesajla birlikte kendiliğinden gidiyor.
  firstRun?: boolean;
  // --- SAP bağlamı ---
  // Bu sohbet bir SAP bağlantısının proje klasöründe çalışıyorsa, hangisi
  // olduğu yazma kutusuna yapışık sekmede gösteriliyor (2026-09-29; önceden
  // tepede şeritti). Görünmezse kullanıcı, aynı görünen iki sohbetin farklı
  // sistemlere konuştuğunu anlayamaz. `null` = bağlamsız sohbet, sekme yok.
  contextLabel?: string | null;
  contextPath?: string | null;
  // Sekmedeki seviye rozeti. Yalnız sohbetin klasörü BAĞLI sistemin klasörüyse
  // dolu — bkz. src/lib/contextTier.ts.
  contextTier?: SystemTier | null;
  // TERMİNAL DÜĞMESİ KALDIRILDI (2026-09-05, kullanıcı isteği). Konsol
  // uygulamadan silinmedi — SAP Launcher ekranının alt panelinde duruyor.
  // Klasördeki `AGENTS.md`'yi düzenleyen kutuyu açar. Sekmede duruyor çünkü
  // yönerge sohbete değil BU KLASÖRE ait — bkz. ChatInstructionsDialog.
  onOpenInstructions?: () => void;
  // Sağdaki dosya paneli. Bu bileşen İÇERİĞİNİ bilmiyor, sadece yerini
  // ayırıyor — panelin kendi durumu (açık dosya, izleyici) ChatFilesPanel'de.
  filesPanel?: ReactNode;
  filesPanelOpen?: boolean;
  onToggleFilesPanel?: () => void;
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
//   2. Karşılama ORTALI ve sade: logo + tek soru (2026-09-29; önceden sola
//      yaslı, degradeli bir selamlamaydı — `--chat-hero-*`).
//   3. Öneriler çip değil KART; ikon metnin solunda, dairesiz (2026-09-29).
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
  axetUpdate,
  registerTextarea,
  onDraftChange,
  onSend,
  onCancel,
  onAnswerQuestion,
  onSelectModel,
  onRegenerate,
  onContinue,
  onEditMessage,
  onUndoEdit,
  onDismissCancelStuck,
  onUnqueue,
  onDropQueued,
  onAttachFiles,
  onFilesResolved,
  onRemoveAttachment,
  suggestionKeys,
  onSuggestionClick,
  firstRun = false,
  contextLabel = null,
  contextPath = null,
  contextTier = null,
  onOpenInstructions,
  filesPanel,
  filesPanelOpen = false,
  onToggleFilesPanel
}: Props) {
  const t = useT();
  const language = useLanguage();
  // Gün ayırıcıları için "bugün". Render anında okunuyor; gece yarısını
  // geçen açık bir sohbet bir sonraki çizimde düzeliyor.
  const now = Date.now();
  const [dragOver, setDragOver] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  // Kullanıcı listeyi yukarı kaydırıp eski bir mesajı okuyorsa, akan cevap
  // onu zorla dibe çekmemeli. `true` olduğu sürece otomatik kaydırma yapılır.
  const stickToBottomRef = useRef(true);
  // Aynı bilgi state olarak da tutuluyor: "dibe in" düğmesinin görünürlüğü
  // render'a bağlı, ref tek başına yeniden render tetiklemez.
  const [atBottom, setAtBottom] = useState(true);
  // --- sohbet içi arama (Ctrl+F) ---
  // Eşleşme MESAJ düzeyinde: eşleşen balona kaydırılıyor ve balon çerçeveleniyor,
  // metnin içindeki kelime ayrıca boyanmıyor. Boyamak için cevap gövdesindeki
  // markdown ağacını gezip metin düğümlerini bölmek gerekirdi — kod bloklarını,
  // tabloları ve linkleri bozma riski, kazanılan hassasiyetten büyük.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchHits = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (needle.length < 2) return [] as string[];
    return session.messages.filter((m) => m.content.toLowerCase().includes(needle)).map((m) => m.id);
  }, [searchQuery, session.messages]);
  // Eşleşme kümesi küçüldüğünde (harf eklendi) eski indeks aralık dışında
  // kalabiliyor; sıfırlamak, "sonraki"nin hiçbir yere gitmemesinden iyi.
  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  const lastMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
  const streaming = lastMessage?.streaming === true;
  const isEmpty = session.messages.length === 0 && !session.pending;
  // Hatalı bir cevap da yeniden üretilebilir olmalı — asıl işe yaradığı
  // durumlardan biri zaten "cevap alınamadı" balonu.
  const canRegenerate = !session.pending && !streaming && lastMessage?.role === "assistant";

  // ↑ ile geri çağrılacak son istem. Composer mesaj listesini bilmiyor.
  const recallText = useMemo(() => {
    for (let i = session.messages.length - 1; i >= 0; i--)
      if (session.messages[i].role === "user") return session.messages[i].content;
    return "";
  }, [session.messages]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    // Akan cevapta mesaj SAYISI değişmiyor, sadece son mesajın metni uzuyor —
    // bu yüzden içerik uzunluğu da bağımlılık listesinde. Canlı tur listenin
    // sonunda durduğu için yeni araç adımı ve soru kartı da listeyi uzatıyor.
  }, [
    session.messages.length,
    session.pending,
    lastMessage?.content.length,
    session.activitySteps.length,
    session.pendingAsk
  ]);

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

  // Ctrl+F yalnızca GÖRÜNÜR panelde çalışıyor: aynı anda üç sohbet paneli
  // birden DOM'da duruyor (gizli olanlar `display:none`) ve hepsi dinleseydi
  // tek tuşa üç arama kutusu açılırdı. Tarayıcının kendi bul çubuğu Electron'da
  // zaten yok, o yüzden `preventDefault` bir şeyi elden almıyor.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.select());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // Seçili eşleşmeye kaydır. `block: "center"`: eşleşen balon uzunsa üstten
  // hizalamak, aranan kelimenin ekranın dışında kalmasına yol açabiliyor.
  useEffect(() => {
    if (!searchOpen || searchHits.length === 0) return;
    const id = searchHits[Math.min(searchIndex, searchHits.length - 1)];
    const el = messagesRef.current?.querySelector(`[data-mid="${CSS.escape(id)}"]`);
    if (!el) return;
    // Aramayla gezinirken otomatik dibe yapışma KAPANMALI, yoksa akan bir
    // cevap kullanıcıyı bulduğu yerden geri çeker.
    stickToBottomRef.current = false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [searchOpen, searchIndex, searchHits]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };
  const stepSearch = (delta: number) => {
    if (searchHits.length === 0) return;
    setSearchIndex((prev) => (prev + delta + searchHits.length) % searchHits.length);
  };
  const currentHitId = searchOpen && searchHits.length > 0 ? searchHits[Math.min(searchIndex, searchHits.length - 1)] : null;
  const hitSet = searchOpen ? new Set(searchHits) : null;

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
    // ÖNCE kendi gezginimizden gelen yollar: `dataTransfer.files` boş olduğu
    // için aşağıdaki dal bunları görmezdi ve düz metin dalına düşüp taslağa
    // YOL YAZARDI. Yol zaten mutlak, `getPathForFile`e gerek yok.
    const own = readDraggedPaths(dt);
    if (own.length > 0) {
      onFilesResolved(own);
      return;
    }
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

  return (
    <div
      // Yatay bölme: solda sohbet, sağda (varsa) dosya paneli.
      className="absolute inset-0 flex"
      style={{ display: active ? "flex" : "none" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* `relative`: sürükleme kaplaması ve "dibe in" düğmesi bu sütuna göre
          konumlanıyor, dosya paneline taşmasınlar diye. */}
      <div className="relative flex min-w-0 flex-1 flex-col">
      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-3xl bg-accent-500/10 ring-2 ring-dashed ring-accent-400">
          <div className="flex items-center gap-2 rounded-full bg-card/90 px-4 py-2.5 text-sm font-medium text-accent-400 shadow-lg">
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

      {/* ARAMA ÇUBUĞU — akış içinde değil, ÜSTÜNDE duruyor: akışa eklenseydi
          açılıp kapandıkça mesaj listesi zıplardı ve kullanıcı okuduğu yeri
          kaybederdi. Sistem bilgisi artık kutunun sekmesinde (2026-09-29),
          tepede şerit yok; çubuk hep aynı yerde. */}
      {searchOpen && (
        <div className="absolute right-4 top-2 z-30 flex items-center gap-1 rounded-xl border border-line bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur">
          <Search size={13} className="shrink-0 text-slate-500" />
          <input
            ref={searchInputRef}
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeSearch();
              } else if (e.key === "Enter") {
                e.preventDefault();
                stepSearch(e.shiftKey ? -1 : 1);
              }
            }}
            placeholder={t("chatSearch.placeholder")}
            className="w-52 bg-transparent text-[13px] text-slate-200 outline-none placeholder:text-slate-500"
          />
          {/* Sayaç sabit genişlikte (`tabular-nums`): eşleşmeler arasında
              gezinirken rakam değiştikçe düğmelerin kayması rahatsız edici. */}
          <span className="shrink-0 tabular-nums text-[11px] text-slate-500">
            {searchQuery.trim().length < 2
              ? ""
              : searchHits.length === 0
                ? t("chatSearch.noResults")
                : `${Math.min(searchIndex, searchHits.length - 1) + 1}/${searchHits.length}`}
          </span>
          <button
            onClick={() => stepSearch(-1)}
            disabled={searchHits.length === 0}
            title={t("chatSearch.prev")}
            className="cursor-pointer rounded p-1 text-slate-400 transition hover:bg-hover hover:text-slate-200 disabled:cursor-default disabled:opacity-40"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => stepSearch(1)}
            disabled={searchHits.length === 0}
            title={t("chatSearch.next")}
            className="cursor-pointer rounded p-1 text-slate-400 transition hover:bg-hover hover:text-slate-200 disabled:cursor-default disabled:opacity-40"
          >
            <ChevronDown size={13} />
          </button>
          <button
            onClick={closeSearch}
            title={t("chatSearch.close")}
            className="cursor-pointer rounded p-1 text-slate-400 transition hover:bg-hover hover:text-slate-200"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* SOHBETİN ORANLARI (kullanıcı isteği, 2026-09-06: *"chat kısmında
          sohbetin sağ sol üst tarafında oran orantı olsun"*).

          Üç ayrı sayı aynı ritmi kurmak zorunda ve eskiden kurmuyordu:
            yatay boşluk          px-5  (20px)
            mesaj listesi dikey   py-6  (24px alt/üst)
            composer şeridi       pt-2 pb-3 (8/12px)

          Yani ilk mesaj bağlam şeridine 24px, composer pencerenin dibine 12px
          uzaktaydı — ekranın altı üstünden daha sıkışıktı ve yatay boşluk
          ikisinden de dardı. Şimdi tek bir 8px ızgarasına oturuyor:
            yatay 24 · üst 32 · son mesaj→composer 32+8 · composer→dip 16

          Yatayın dikeyden DAR olması kasıtlı değil, tersi: sütun zaten
          `max-w-*` ile ortalanıyor (bkz. COLUMN), yani geniş pencerede yanlarda
          zaten yüzlerce piksel boşluk var. Buradaki 24px yalnızca pencere
          daraldığında devreye giren ASGARİ pay. */}
      <div
        ref={messagesRef}
        data-testid="chat-messages"
        onScroll={handleScroll}
        className="chat-scroll min-h-0 flex-1 overflow-y-auto px-6"
      >
        {isEmpty ? (
          // BOŞ EKRAN — ortalı: logo, tek soru, düz kartlar. Renk geçişli
          // büyük selamlama ve "Hızlı başlangıç" etiketi kalktı (2026-09-29):
          // yazma kutusu zaten ekranın dibinde bekliyor, üstündeki her şey
          // yalnız bir başlangıç önerisi. `min-h-full` + `justify-center`:
          // içerik dikeyde ortalanır ama pencere kısaldığında kaydırılır.
          <div
            className={`${COLUMN} animate-panel-fade-in flex min-h-full flex-col items-center justify-center py-10 text-center`}
          >
            <img src={logo} alt="" width={40} height={40} className="mb-4 rounded-xl" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{t("axetCodeHome.heroSubtitle")}</h1>

            {/* axet-code GÜNCELLEMESİ. Kullanıcı isteğiyle (2026-09-07) Ayarlar
                yerine buraya taşındı: Ayarlar'ı kimse güncelleme haberi için
                açmıyor, oysa açılış ekranı her sohbet başlangıcında görülüyor.
                Kutu DEĞİL, tek satır: rengi taşıyor, ağırlığı taşımıyor.

                Düğme yok: kurulumu bu uygulama yapamıyor, Intune Company Portal
                dağıtıyor. Tıklanacak bir şey göstermek yanlış söz vermek olurdu. */}
            {axetUpdate && (
              <div className="mt-4 flex items-start gap-2 text-xs text-[var(--status-warning-text)]">
                <ArrowUpCircle size={13} className="mt-0.5 shrink-0" />
                <span>
                  {axetUpdate.installed
                    ? t("axetCodeHome.axetCodeUpdateVersions", {
                        installed: axetUpdate.installed,
                        latest: axetUpdate.latest
                      })
                    : t("axetCodeHome.axetCodeUpdate", { latest: axetUpdate.latest })}
                </span>
              </div>
            )}

            {/* İLK AÇILIŞ — kart değil, sessiz bir liste: öneri kartları
                hâlâ ekranın asıl işi, bu yalnızca yolu gösteriyor. Ayrı bir
                "gördüm" ayarı yok; ilk sohbet açılınca bir daha görünmüyor. */}
            {firstRun && (
              <ul
                data-testid="chat-onboarding"
                aria-label={t("axetCodeHome.introLabel")}
                className="mt-6 flex w-full max-w-md flex-col gap-2 text-left text-sm text-slate-400"
              >
                <li className="flex items-start gap-2.5">
                  <Server size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                  <span>{t("axetCodeHome.introSap")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                  <span>{t("axetCodeHome.introAsk")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Search size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                  <span>
                    <kbd className="rounded border border-line-strong px-1 font-sans text-2xs text-slate-300">Ctrl</kbd>{" "}
                    <kbd className="rounded border border-line-strong px-1 font-sans text-2xs text-slate-300">K</kbd>{" "}
                    {t("axetCodeHome.introPalette")}
                  </span>
                </li>
              </ul>
            )}

            {/* Dar pencerede tek sütuna iniyor: sabit üç sütunda kartlar
                ~140px'e sıkışıp metinleri dört-beş satıra bölünüyordu. */}
            <div className="mt-6 grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-3">
              {suggestionKeys.map((key, i) => {
                const Icon = SUGGESTION_ICONS[key] ?? Sparkles;
                // İkon rengi modül paletinden sırayla dönüyor: öneri anahtarları
                // bağlama göre değişiyor, anahtar başına sabit renk tablosu hem
                // eksik kalırdı hem bakımı imkânsız olurdu.
                const tint = SUGGESTION_TINTS[i % SUGGESTION_TINTS.length];
                return (
                  <button
                    key={key}
                    type="button"
                    data-suggestion={key}
                    onClick={() => onSuggestionClick(key)}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-line-subtle bg-card px-3 py-2.5 text-sm text-slate-300 transition hover:border-line hover:bg-hover hover:text-slate-100"
                  >
                    <Icon size={15} className="mt-0.5 shrink-0" style={{ color: tint }} />
                    <span>{t(`axetCodeHome.${key}` as Parameters<typeof t>[0])}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${COLUMN} flex flex-col gap-[var(--chat-message-gap)] pb-8 pt-8`}>
            {session.messages.map((message, index) => (
              <Fragment key={message.id}>
              {daySeparatorBefore(session.messages[index - 1]?.createdAt, message.createdAt, now) && (
                <DaySeparator label={dayLabel(message.createdAt, now, t, language)} />
              )}
              <ChatBubble
                message={message}
                onEdit={message.role === "user" && !session.pending ? onEditMessage : undefined}
                // "Devam et" YALNIZCA son mesajda: ortadaki yarım bir cevaba
                // devam etmek, arkasındaki soru-cevapları geçersiz kılardı.
                onContinue={
                  message.interrupted &&
                  !session.pending &&
                  index === session.messages.length - 1
                    ? onContinue
                    : undefined
                }
                // "Yeniden üret" de YALNIZCA son cevapta; `onRegenerate`
                // AxetCodeHome'da `useCallback`, memo bozulmuyor.
                onRegenerate={canRegenerate && index === session.messages.length - 1 ? onRegenerate : undefined}
                searchState={
                  currentHitId === message.id ? "current" : hitSet?.has(message.id) ? "hit" : undefined
                }
              />
              </Fragment>
            ))}
            {/* CANLI TUR — konuşmanın SONUNDA, yapışık değil. Eskiden gösterge
                son istemin altına yapışıyordu; araç adımları ayrı bir satıra
                (`ChatToolRun`) taşınınca en doğal yeri, cevabın geleceği yer
                oldu. Gösterge istek BİTENE kadar duruyor — akış başladıktan
                sonra da, çünkü ajan metin yazdıktan SONRA da araç çağırıyor.
                Otomatik kaydırma adım sayısını da izliyor (yukarıda). */}
            {session.pending && (
              <div data-testid="turn-live" className="flex flex-col gap-2">
                {session.activitySteps.length > 0 && (
                  <ChatToolRun steps={session.activitySteps} status="running" />
                )}
                <ThinkingBubble
                  phase={session.activity}
                  steps={session.activitySteps}
                  stalledMinutes={session.stalledMinutes}
                />
                {/* Soru kutusu göstergenin ALTINDA: gösterge "cevabını
                    bekliyor" diyor, kart da neyi beklediğini soruyor. */}
                {session.pendingAsk && <AskUserCard ask={session.pendingAsk} onAnswer={onAnswerQuestion} />}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative shrink-0 px-6 pb-4 pt-2">
        {/* "Dibe in" düğmesi — uzun bir cevap akarken kullanıcı yukarı
            kaydırdıysa geri dönmesi için. */}
        {!atBottom && !isEmpty && (
          <button
            onClick={scrollToBottom}
            title={t("axetCodeHome.jumpToBottom")}
            className="absolute -top-2 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-full cursor-pointer items-center justify-center rounded-full bg-control text-slate-300 shadow-lg transition hover:bg-active hover:text-slate-100"
          >
            <ArrowDown size={14} />
          </button>
        )}

        {/* Ajanın PLANI — composer'ın hemen üstünde, sohbet akışının DIŞINDA.
            Akışın içine konsaydı her güncellemede yeni bir satır olarak
            birikirdi; oysa bu bir olay değil, tek bir yaşayan liste (bkz.
            AxetChatProgress). Terminaldeki karşılığı da ekranın altında
            sabit durur. */}
        {session.todos.length > 0 && (
          <div className={COLUMN}>
            <PlanPanel todos={session.todos} />
          </div>
        )}

        {/* Düzenleme sonrası geri alma şeridi. Composer'ın hemen üstünde ve
            kalıcı: bir saniye sonra kaybolan bir bildirim, kesilenin fark
            edilmesinden önce gider. Düzeltilmiş soru gönderilince kendiliğinden
            kapanıyor (bkz. AxetCodeHome `handleSend`). */}
        {session.editUndo && session.editUndo.messages.length > 0 && (
          <div className={COLUMN}>
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-line-subtle bg-card/70 px-3 py-2 text-[12px] text-slate-400">
              <History size={13} className="shrink-0" />
              <span className="min-w-0 truncate">
                {t("chatEditUndo.removed", { count: String(session.editUndo.messages.length) })}
              </span>
              <button
                onClick={onUndoEdit}
                className="ml-auto shrink-0 cursor-pointer rounded-md px-2 py-1 font-medium text-accent-400 transition hover:bg-hover"
              >
                {t("chatEditUndo.undo")}
              </button>
            </div>
          </div>
        )}

        {/* "Durdur" TUTMADI. Aynı yerde ve aynı dilde, çünkü aynı işi yapıyor:
            kullanıcının göremediği bir şeyi görünür kılıyor. Uyarı, ana süreç
            axet-code'un veritabanına bakıp turun hâlâ sürdüğünü DOĞRULADIĞINDA
            geliyor (bkz. axetChatTui.ts `cancelTui`) — tahmin değil, ölçüm.
            Bir sonraki mesajda kendiliğinden kapanıyor. */}
        {session.cancelStuck && (
          <div className={COLUMN}>
            <div
              className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px]"
              style={{
                borderColor: "var(--status-warning-border)",
                background: "var(--status-warning-bg)",
                color: "var(--status-warning-text)"
              }}
            >
              <AlertTriangle size={13} className="shrink-0" />
              <span className="min-w-0">{t("chatCancelStuck.notice")}</span>
              <button
                onClick={onDismissCancelStuck}
                title={t("chatCancelStuck.dismiss")}
                className="ml-auto shrink-0 cursor-pointer rounded-md p-1 transition hover:bg-black/10"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Sıradaki mesaj. Gönderilmiş gibi listeye girmiyor — henüz gitmedi
            ve ajan onu bu turda görmüyor; listede durursa cevabın ona ait
            olduğu sanılırdı. Composer'ın üstünde, geri alma şeridiyle aynı
            dilde. */}
        {session.queued && (
          <div className={COLUMN}>
            <div
              data-testid="chat-queued"
              className="mb-2 flex items-center gap-2 rounded-xl border border-line-subtle bg-card/70 px-3 py-2 text-[12px] text-slate-400"
            >
              <Clock size={13} className="shrink-0" />
              <span className="shrink-0 font-medium text-slate-300">{t("chatQueue.label")}</span>
              <span className="min-w-0 truncate">
                {session.queued.text ||
                  session.queued.attachments.map((a) => a.name).join(", ")}
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <button
                  onClick={onUnqueue}
                  title={t("chatQueue.restore")}
                  aria-label={t("chatQueue.restore")}
                  className="cursor-pointer rounded-md p-1 transition hover:bg-hover hover:text-slate-200"
                >
                  <CornerUpLeft size={13} />
                </button>
                <button
                  onClick={onDropQueued}
                  title={t("chatQueue.drop")}
                  aria-label={t("chatQueue.drop")}
                  className="cursor-pointer rounded-md p-1 transition hover:bg-hover hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={COLUMN}>
          <ChatComposer
            active={active}
            draft={session.draft}
            attachments={session.attachments}
            pending={session.pending}
            recallText={recallText}
            models={models}
            model={session.model}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            onSelectModel={onSelectModel}
            attaching={attaching}
            onAttachFiles={onAttachFiles}
            onRemoveAttachment={onRemoveAttachment}
            onFilesResolved={onFilesResolved}
            registerTextarea={registerTextarea}
            onDraftChange={onDraftChange}
            onSend={onSend}
            onCancel={onCancel}
            contextPath={contextPath}
            contextLabel={contextLabel}
            contextTier={contextTier}
            onOpenInstructions={onOpenInstructions}
            filesPanelOpen={filesPanelOpen}
            onToggleFilesPanel={onToggleFilesPanel}
            contextTokens={session.contextTokens}
            contextLimit={session.contextLimit}
          />
        </div>
      </div>
      </div>

      {/* Genişlik sabit: sürüklenebilir bir ayırıcı, okuma sütununun kendi
          kademeli genişliğiyle (bkz. COLUMN) çakışırdı — sohbetin genişliği
          zaten pencereye göre ayarlanıyor. */}
      {/* Kartın çevresindeki 8px boşluk: soldaki kenar çubuğunun `m-2`'siyle aynı. */}
      {filesPanelOpen && filesPanel && <div className="w-[380px] shrink-0 p-2">{filesPanel}</div>}
    </div>
  );
}

/**
 * Ajanın yapılacaklar listesi.
 *
 * BİZ ÜRETMİYORUZ: liste axet-code'un kendi `todos` aracının çıktısı, oturum
 * veritabanından okunuyor (bkz. axetSessionDb.ts `sessionTodos`). Terminalde
 * bu liste görünür ve "ajan planının neresinde" sorusunun tek doğrudan
 * cevabıdır; kılıfta hiç gösterilmiyordu ve kullanıcı uzun bir turda ne
 * kadar iş kaldığını bilemiyordu.
 *
 * Varsayılan olarak KAPALI değil, ÖZET açık: tek satırda "3/7 madde" ve
 * o an çalışılan maddenin adı. Yedi maddelik bir listeyi composer'ın üstünde
 * sürekli açık tutmak ekranın yarısını yerdi.
 *
 * ÇERÇEVESİZ (2026-09-29): kutunun üstünde düz bir satır. Çerçeveli kart,
 * hemen altındaki yazma kutusuyla iki kutu gibi yarışıyordu.
 */
function PlanPanel({ todos }: { todos: AxetTodo[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const done = todos.filter((todo) => todo.status === "completed").length;
  const active = todos.find((todo) => todo.status === "in_progress");
  return (
    <div className="mb-1 text-[12px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-1 py-1 text-left text-slate-400 transition hover:text-slate-200"
      >
        <ListChecks size={13} className="shrink-0" />
        <span className="shrink-0 font-medium text-slate-300">
          {t("chatPlan.progress", { done: String(done), total: String(todos.length) })}
        </span>
        {/* Kapalıyken o an çalışılan madde görünüyor: paneli açmadan da
            "şu an ne yapıyor" okunabilsin. */}
        {!open && active && <span className="truncate text-slate-500">· {active.content}</span>}
        <span className="ml-auto shrink-0 text-slate-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="chat-scroll max-h-48 overflow-auto px-1 pb-1">
          {todos.map((todo, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 py-0.5 ${
                todo.status === "completed"
                  ? "text-slate-500 line-through"
                  : todo.status === "in_progress"
                    ? "text-slate-100"
                    : "text-slate-400"
              }`}
            >
              <span className="mt-[1px] shrink-0 font-mono text-2xs">
                {todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "▸" : "·"}
              </span>
              <span className="min-w-0 break-words">{todo.content}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Mesajlar arasında gün değişince giren satır (bkz. lib/chatDays.ts). Soluk ve
// ince: konuşmanın akışını bölmeden "bu artık başka gün" diyor.
function DaySeparator({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-3 py-1 text-2xs font-medium text-slate-500">
      <span aria-hidden className="h-px flex-1 bg-line-subtle" />
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-line-subtle" />
    </div>
  );
}
