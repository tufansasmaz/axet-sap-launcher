import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronUp,
  Code2,
  FileCode,
  Files,
  FlaskConical,
  FolderOpen,
  FolderTree,
  GitBranch,
  History,
  Layers,
  ListChecks,
  Mail,
  MousePointerClick,
  Package,
  Paperclip,
  RefreshCw,
  Rocket,
  Search,
  Server,
  Sparkles,
  Square,
  UploadCloud,
  X
} from "lucide-react";
import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  AxetModelEntry,
  AxetTodo,
  ChatAttachment,
  FsSearchFilesEntry
} from "../../app-electron/shared/types";
import AttachmentChip from "./AttachmentChip";
import ChatBubble, { AskUserCard, ThinkingBubble, type ChatMessage } from "./ChatBubble";
import ModelSelector from "./ModelSelector";
import { resolveFilesToPaths } from "../lib/attachments";
import { MENTION_CLASS, renderWithMentions } from "../lib/mentions";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";

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
  onAttachFiles: () => void;
  onFilesResolved: (paths: string[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  suggestionKeys: readonly string[];
  onSuggestionClick: (key: string) => void;
  // --- SAP bağlamı ---
  // Bu sohbet bir SAP bağlantısının proje klasöründe çalışıyorsa, hangisi
  // olduğu tepede bir şeritle gösteriliyor. Görünmezse kullanıcı, aynı görünen
  // iki sohbetin farklı sistemlere konuştuğunu anlayamaz. `null` = bağlamsız
  // sohbet, şerit hiç çizilmiyor.
  contextLabel?: string | null;
  contextPath?: string | null;
  // TERMİNAL DÜĞMESİ KALDIRILDI (2026-09-05, kullanıcı isteği). Konsol
  // uygulamadan silinmedi — SAP Launcher ekranının alt panelinde duruyor.
  // Klasördeki `AGENTS.md`'yi düzenleyen kutuyu açar. Şeritte duruyor çünkü
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
  onAnswerQuestion,
  onSelectModel,
  onRegenerate,
  onContinue,
  onEditMessage,
  onUndoEdit,
  onDismissCancelStuck,
  onAttachFiles,
  onFilesResolved,
  onRemoveAttachment,
  suggestionKeys,
  onSuggestionClick,
  contextLabel = null,
  contextPath = null,
  onOpenInstructions,
  filesPanel,
  filesPanelOpen = false,
  onToggleFilesPanel
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
  // Çalışma göstergesi hangi mesajın ARDINA giriyor: son kullanıcı mesajının.
  // Böylece bu turun cevabı göstergenin ALTINDA büyüyor, gösterge de büyüyen
  // metinle birlikte aşağı sürüklenmiyor (bkz. render'daki gerekçe).
  // Kullanıcı mesajı yoksa (yeniden üretme) listenin sonuna düşüyor.
  const lastUserIndex = session.messages.map((m) => m.role).lastIndexOf("user");
  const indicatorAfter = lastUserIndex >= 0 ? lastUserIndex : session.messages.length - 1;

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
  useEffect(() => {
    const el = textareaRef.current;
    // Gizli panelde `scrollHeight` 0 — o anda ölçmek kutuyu en küçük boya
    // çökertirdi. Panel görünür olduğu anda `active` değişip yeniden ölçülüyor.
    if (!el || !active) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [session.draft, active]);

  // Taslak dışarıdan boşaltıldığında (gönderme, yeni sohbet) menü de kapanmalı:
  // bahsin dayandığı metin artık yok.
  useEffect(() => {
    if (session.draft.length === 0) {
      setMention(null);
      setMentionItems([]);
      dismissedStartRef.current = null;
    }
  }, [session.draft.length]);

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
    const caret = el?.selectionStart ?? session.draft.length;
    const before = session.draft.slice(0, mention.start);
    const after = session.draft.slice(caret);
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

      {/* Bağlam şeridi. Klasör YOLU yazılı olmak zorunda: ajanın dosyaları
          nereye yazdığı tahmin edilecek bir şey olmamalı — kullanıcı isteğinin
          (*"kendi gidip txt vs yazıyor direkt göreyim"*) ilk adımı bu.
          SAP'a bağlı sohbetlerde sistem adı da var; bağlamsız sohbetlerde
          etiket "Çalışma alanı"na düşüyor ve ikon sönük kalıyor. */}
      {contextPath && (
        <div className="flex shrink-0 items-center gap-2 border-b border-line-subtle bg-card/60 px-6 py-1.5 text-[11px]">
          <Server
            size={12}
            className={`shrink-0 ${contextLabel ? "text-[var(--navy-icon)]" : "text-slate-600"}`}
          />
          <span className="shrink-0 font-medium text-slate-300">
            {contextLabel ?? t("axetCodeHome.contextWorkspace")}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-slate-500" title={contextPath}>
            {contextPath}
          </span>
          {/* İKONLAR RENKLİ, YAZI NÖTR (kullanıcı isteği, 2026-09-06:
              *"dosyalar yönergeler kısımlarındaki simgelerde renkli olsun"*).
              Renk ikonun kendi türünün rengi — klasör sarısı ve doküman
              mavisi; uygulamanın geri kalanında da aynı iki jeton kullanılıyor
              (bkz. `src/ui/fileIcons.ts`). Etiketin gri kalması bilinçli: bu
              şerit bir araç çubuğu değil bir bilgi satırı, iki renkli etiket
              yan yana durunca satır ortasındaki YOL'dan daha çok bağırıyordu.
              "Dosyalar" açıkken vurgu yeşiline geçiyor, çünkü orada renk
              türü değil DURUMU söylüyor. */}
          {onToggleFilesPanel && (
            <button
              onClick={onToggleFilesPanel}
              className={`flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-hover hover:text-slate-200 ${
                filesPanelOpen ? "text-accent-400" : "text-slate-500"
              }`}
              title={t("axetCodeHome.contextFilesHint")}
            >
              <FolderOpen
                size={12}
                className={filesPanelOpen ? undefined : "text-[var(--folder-icon)]"}
              />
              {t("axetCodeHome.contextFiles")}
            </button>
          )}
          {onOpenInstructions && (
            <button
              onClick={onOpenInstructions}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-slate-500 transition hover:bg-hover hover:text-slate-200"
              title={t("chatInstructions.title")}
            >
              <BookOpen size={12} className="text-[var(--status-info-text)]" />
              {t("chatInstructions.button")}
            </button>
          )}
        </div>
      )}

      {/* ARAMA ÇUBUĞU — akış içinde değil, ÜSTÜNDE duruyor: akışa eklenseydi
          açılıp kapandıkça mesaj listesi zıplardı ve kullanıcı okuduğu yeri
          kaybederdi. Bağlam şeridi varsa onun altına iniyor. */}
      {searchOpen && (
        <div
          className={`absolute right-4 z-30 flex items-center gap-1 rounded-xl border border-line bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur ${
            contextPath ? "top-9" : "top-2"
          }`}
        >
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
      <div ref={messagesRef} onScroll={handleScroll} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-6">
        {isEmpty ? (
          // --- AÇILIŞ: sola yaslı degradeli karşılama + öneri kartları ---
          // `min-h-full` + `justify-center`: içerik dikeyde ortalanır ama
          // pencere kısaldığında kaymak yerine normal şekilde kaydırılır.
          <div className={`${COLUMN} animate-panel-fade-in flex min-h-full flex-col justify-center py-10`}>
            {/* BAŞLIK İKİLİSİ. 2026-09-06'ya kadar iki satır da aynı boyuttaydı
                (`--chat-hero-size`, yani 40px) ve aynı ağırlıktaydı; tek
                farkları renkti. Sonuç, ekranın tepesinde 80 piksellik iki eşit
                ağırlıklı metin bloğuydu — hangisinin başlık hangisinin alt
                başlık olduğu okunmuyordu, ikisi birlikte "bir duvar" gibi
                duruyordu (kullanıcı isteği: *"balonun üstündeki yazı ... daha
                iyi olsun"*).

                Şimdi bir HİYERARŞİ var: selam tam boyda ve yarı kalın, soru
                onun %48'i ve normal ağırlıkta. Oran sabit bir piksel DEĞİL
                çünkü başlık boyutu kullanıcı ayarından geliyor (Ayarlar >
                Sohbet görünümü) — 50px'te de 70px'te de aynı ilişki kuruluyor.

                `tracking-tight`: Inter'in geniş harf aralığı büyük puntoda
                başlığı dağıtıyor; bu boyda -0.02em kelimeleri birbirine
                bağlayıp tek bir cümle gibi okutuyor.

                Degrade renkleri logonun kendi `mark` gradyanından geliyor
                (bkz. index.css `--chat-hero-*`). */}
            <h1 className="bg-gradient-to-r from-[var(--chat-hero-from)] via-[var(--chat-hero-via)] to-[var(--chat-hero-to)] bg-clip-text text-[length:var(--chat-hero-size)] font-semibold leading-[1.1] tracking-tight text-transparent">
              {greeting}
            </h1>
            <p className="mt-2 text-[length:calc(var(--chat-hero-size)*0.48)] font-normal leading-snug tracking-tight text-slate-400">
              {t("axetCodeHome.heroSubtitle")}
            </p>

            {/* BAĞLAYICI ETİKET. Selamlama ile kartlar arasında 40 piksellik
                boşluk vardı ve kartlar havada duruyordu: "Bugün ne yapalım?"
                sorusuyla altındaki üçlü arasında görsel bir bağ yoktu
                (kullanıcı geri bildirimi, 2026-09-06: *"başlık güzel ama fazla
                yalnız"*). Bilerek KÜÇÜK ve sessiz — aynı geri bildirimde
                *"bunu büyük bir başlık yapmazdım, 10-12px muted text
                yeterli"*. Aşağıdaki "SON ÇALIŞMALAR" başlığıyla aynı biçimde
                yazılıyor, böylece ekranda iki bölüm olduğu okunuyor. */}
            <div className="mt-8 pb-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {t("axetCodeHome.quickStart")}
            </div>

            {/* Dar pencerede tek sütuna iniyor: sabit üç sütunda kartlar
                ~140px'e sıkışıp metinleri dört-beş satıra bölünüyordu. */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {suggestionKeys.map((key, i) => {
                const Icon = SUGGESTION_ICONS[key] ?? Sparkles;
                // İkon rengi modül paletinden sırayla dönüyor. Kartların
                // hangisi olduğu metinden okunuyor zaten; renk, üç kartı tek bir
                // gri blok olmaktan çıkarıp birbirinden ayırıyor. Sıraya bağlı
                // olması bilinçli: öneri anahtarları bağlama göre değişiyor
                // (SAP'lı sohbette başka, boş klasörde başka), yani anahtar
                // başına sabit bir renk tablosu hem eksik kalırdı hem de bakımı
                // imkânsız olurdu.
                const tint = SUGGESTION_TINTS[i % SUGGESTION_TINTS.length];
                return (
                  <button
                    key={key}
                    onClick={() => onSuggestionClick(key)}
                    // SABİT YÜKSEKLİK KALKTI. `h-[136px]` tek satırlık bir öneri
                    // için fazlasıyla boştu; kartın içinde metin tepede, ikon
                    // dipte, arada 70 piksel hiçlik duruyordu. Grid satırları
                    // zaten varsayılan olarak eşit yükseklikte (`stretch`), yani
                    // üç kart en uzun metne göre hizalanmaya sabit boy olmadan
                    // da devam ediyor.
                    //
                    // OKUMA SIRASI da düzeldi: ikon artık sağ altta değil sol
                    // üstte. Göz karta soldan üstten giriyor, önce "ne tür bir
                    // şey" sonra "ne diyor" okuyor.
                    //
                    // Zemin TAM `bg-card`, `/60` DEĞİL: yeni açılmış palette
                    // 950 ile 900 arasında zaten 7 birim var, %60 saydamlık bunu
                    // 4'e indiriyor ve kart zeminden ayrılmıyor.
                    className="group flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-line-subtle bg-card p-4 text-left transition-colors hover:border-line-strong hover:bg-raised"
                  >
                    {/* İkon kutusu 28 -> 32px, ikon 14 -> 16px: kartın
                        içindeki tek görsel çapa buydu ve metnin yanında
                        cılız kalıyordu. */}
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-control transition-colors group-hover:bg-[color-mix(in_srgb,currentColor_16%,transparent)]"
                      style={{ color: tint }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="text-[13px] font-medium leading-snug text-slate-200 transition-colors group-hover:text-white">
                      {t(`axetCodeHome.${key}` as Parameters<typeof t>[0])}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${COLUMN} flex flex-col gap-[var(--chat-message-gap)] pb-8 pt-8`}>
            {session.messages.map((message, index) => (
              <Fragment key={message.id}>
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
                  searchState={
                    currentHitId === message.id ? "current" : hitSet?.has(message.id) ? "hit" : undefined
                  }
                />
                {/* Gösterge, istek BİTENE kadar duruyor — akış başladıktan
                    sonra da. Eskiden ilk parçada kayboluyordu, ama ajan metin
                    yazdıktan SONRA da araç çağırıyor (canlı ölçüm: mail
                    turunda iki çağrı ilk cümleden sonra) ve o anlar yine
                    karanlıkta kalıyordu.

                    KONUM: akan cevabın ALTINDA değil, ÜSTÜNDE — son kullanıcı
                    mesajının hemen ardında. Altta dururken cevap büyüdükçe
                    gösterge de onunla birlikte aşağı iniyordu (kullanıcı
                    kararı, 2026-09-04: *"düşünüyor ve altında çıkan kısımlar
                    aşağı doğru kaymasın, cevap yazılırken en üstte dursun en
                    son kaybolsun"*). Yapışkanlık da bu yüzden `bottom-0`
                    değil `top-0`: cevap altından akıp giderken gösterge
                    panelin üst kenarına tutunuyor ve ancak tur gerçekten
                    bittiğinde (`pending` düşünce) kayboluyor.

                    Degrade bir KUTU değil, bir geçiş: altından akan metin
                    göstergeye değmeden soluyor, böylece iki katman üst üste
                    binmiş gibi okunmuyor. */}
                {session.pending && index === indicatorAfter && (
                  <div className="sticky top-0 z-10 -mx-1 -mb-2 flex flex-col gap-2 bg-gradient-to-b from-[rgb(var(--base-950-rgb))] from-60% to-transparent px-1 pb-4 pt-1">
                    <ThinkingBubble phase={session.activity} steps={session.activitySteps} />
                    {/* Soru kutusu göstergenin ALTINDA: gösterge "cevabını
                        bekliyor" diyor, kart da neyi beklediğini soruyor. */}
                    {session.pendingAsk && (
                      <AskUserCard ask={session.pendingAsk} onAnswer={onAnswerQuestion} />
                    )}
                  </div>
                )}
              </Fragment>
            ))}
            {/* Hiç mesaj yokken gösterge yukarıdaki döngüye giremez; boş bir
                sohbette "pending" görünmesi olası olmasa da, göstergenin
                tamamen kaybolmasındansa burada durması yeğ. */}
            {session.pending && session.messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <ThinkingBubble phase={session.activity} steps={session.activitySteps} />
                {session.pendingAsk && (
                  <AskUserCard ask={session.pendingAsk} onAnswer={onAnswerQuestion} />
                )}
              </div>
            )}
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
                className={btn("neutral", "md", "mt-[calc(var(--chat-message-gap)*-0.6)] self-start")}
              >
                <RefreshCw size={12} />
                {t("axetCodeHome.regenerate")}
              </button>
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

        {/* `relative`: `@` menüsü composer kutusuna göre, ONUN ÜSTÜNDE
            konumlanıyor. */}
        <div className={`${COLUMN} relative`}>
          {mentionOpen && (
            <MentionMenu
              items={mentionItems}
              index={mentionIndex}
              onHover={setMentionIndex}
              onPick={applyMention}
            />
          )}
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
              ortasında asılı kalmaz.

              KİMLİĞİ BİLEŞENDEN DEĞİL DURUMDAN ALIYOR (kullanıcı kararı,
              2026-09-06: *"daha fazla komponent değil, daha iyi state'ler"*).
              Kutu ekranın en önemli öğesi ama durgun hâlde bir karttan farksız
              görünüyordu; ayrımı yükseklik ya da yeni düğmeler ekleyerek değil
              üç kademeli bir geri bildirimle kuruyoruz:

                durgun → `line-subtle`   (neredeyse görünmez, ekranı yormuyor)
                hover  → `line`          (fare yaklaşınca kutu kendini gösterir)
                odak   → lime kenarlık + `--accent-glow` halesi

              Hale `shadow`, `ring` DEĞİL: `ring` kenarlığın ÜSTÜNE keskin bir
              ikinci çizgi koyuyor ve iki hatlı bir çerçeve gibi okunuyor;
              gölge dışa doğru yumuşayıp "aydınlanma" etkisi veriyor. 3px ve
              %16 alfa kasıtlı — kutunun dikkat çekmesi yeter, parlaması değil.

              Yükseklik HİÇBİR durumda değişmiyor: kenarlık kalınlığı sabit,
              gölge yer kaplamıyor. Odaklanınca zıplayan bir kutu, tek satıra
              indirilmiş olmasının bütün kazancını geri verirdi.

              HOVER NEDEN `:not(:focus-within)` İLE KOŞULLU: düz `hover:` ile
              yazıldığında lime kenarlık ÇOĞU ZAMAN hiç görünmüyor. Tailwind
              `hover:` kurallarını `focus-within:` kurallarından SONRA basıyor
              ve ikisinin özgüllüğü eşit — yani kutu hem odaklı hem fare
              üstündeyken kazanan gri `line` oluyor. Ve bu istisnai bir durum
              değil, ana yol: kullanıcı kutuya tıklayarak odaklanıyor, fare de
              doğal olarak orada kalıyor. */}
          <div className="rounded-2xl border border-line-subtle bg-card px-2 py-1.5 transition [&:hover:not(:focus-within)]:border-line focus-within:border-accent-500 focus-within:bg-raised focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
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
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Paperclip size={16} />
              </button>
              {/* Yazı alanı + BOYAMA KAPLAMASI.
                  Bir `textarea`nın içindeki metnin bir parçası tek başına
                  renklendirilemez; standart çözüm, aynı yazı ölçüleriyle
                  çizilmiş bir katmanı arkasına koymak. Metni GÖSTEREN bu
                  katman, `textarea`nın kendi metni saydam (yalnızca imleç ve
                  seçim görünür). İkisinin yazı boyu/satır yüksekliği/dolgusu
                  ve sarma kuralı BİREBİR aynı olmak zorunda — ayrışırlarsa
                  yazılan metinle görünen metin kayar. */}
              <div className="relative min-w-0 flex-1">
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
                  {renderWithMentions(session.draft, MENTION_CLASS)}
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
                  value={session.draft}
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
                    if (e.key === "ArrowUp" && !e.shiftKey && session.draft === "" && !session.pending) {
                      const last = [...session.messages].reverse().find((m) => m.role === "user");
                      if (last?.content) {
                        e.preventDefault();
                        onDraftChange(last.content);
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
                  rows={1}
                  // Yazdığın metin okuduğun metinle AYNI boyutta olmalı — yazı
                  // boyutu ayarı composer'ı da kapsıyor. `min-h`/dikey boşluk,
                  // yandaki 36px'lik düğmelerle aynı yüksekliği tutturuyor.
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
                  className="relative block max-h-52 min-h-[36px] w-full resize-none overflow-y-scroll bg-transparent py-[7px] text-[length:var(--chat-font-size)] leading-[22px] text-transparent caret-slate-200 outline-none placeholder:text-slate-500"
                />
              </div>
              {/* Buradaki mikrofon düğmesi 2026-09-07'de KALDIRILDI: tanıma
                  güvenilir çalışmıyordu ve gömülü whisper.cpp çalışma zamanı
                  kuruluma tek başına ~297 MB ekliyordu. Geri istenirse
                  6c42f8f öncesindeki sürümde duruyor. */}
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
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-active text-slate-200 transition hover:bg-active"
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

        {/* Feragat satırı + bağlam doluluğu. Doluluk AYRI bir şeride
            konmadı: ekranın dibinde ikinci bir satır açmak, composer'ın
            zaten dar olan alanını yiyordu. */}
        <p className="mt-2 text-center text-[11px] text-slate-500">
          {t("axetCodeHome.disclaimer")}
          <ContextMeter tokens={session.contextTokens} limit={session.contextLimit} />
        </p>
      </div>
      </div>

      {/* Genişlik sabit: sürüklenebilir bir ayırıcı, okuma sütununun kendi
          kademeli genişliğiyle (bkz. COLUMN) çakışırdı — sohbetin genişliği
          zaten pencereye göre ayarlanıyor. */}
      {filesPanelOpen && filesPanel && <div className="w-[380px] shrink-0">{filesPanel}</div>}
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
 */
function PlanPanel({ todos }: { todos: AxetTodo[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const done = todos.filter((todo) => todo.status === "completed").length;
  const active = todos.find((todo) => todo.status === "in_progress");
  return (
    <div className="mb-2 rounded-xl border border-line-subtle bg-card/70 text-[12px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-slate-400 transition hover:text-slate-200"
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
        <ul className="chat-scroll max-h-48 overflow-auto border-t border-line-subtle px-3 py-2">
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
              <span className="mt-[1px] shrink-0 font-mono text-[11px]">
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

/**
 * Bağlam doluluğu — feragat satırının devamında tek bir yüzde.
 *
 * NEDEN YÜZDE, NEDEN JETON DEĞİL: ham sayı ("128.884 jeton") kullanıcıya
 * hiçbir şey söylemiyor; anlamlı olan pencerenin ne kadarının dolduğu, çünkü
 * %80'de oturum kendiliğinden yenileniyor (bkz. axetChatTui.ts
 * `CONTEXT_ROTATE_AT`) ve o an sohbetin belleği sıfırlanıyor. Kullanıcının
 * bunun geldiğini görebilmesi gerekiyor.
 *
 * MALİYET GÖSTERİLMİYOR. `sessions.cost` canlı veritabanında her oturumda 0
 * (ölçüm 2026-09-05, 8 oturum): kurumsal portal üzerinden sağlayıcı fiyat
 * bildirmiyor. Ekranda kalıcı bir "0,00 $" göstermek bilgi değil, uydurma
 * bir rakam olurdu — bu yüzden alan hiç okunmuyor.
 *
 * %60'a kadar sessiz gri; üstünde uyarı, %80'de tehlike rengine geçiyor.
 */
function ContextMeter({ tokens, limit }: { tokens: number; limit: number }) {
  const t = useT();
  // Ölçüm gelmeden hiçbir şey yazılmıyor: "%0" ile "henüz bilmiyoruz" aynı
  // şey değil ve ilki yanlış bir güven veriyor.
  if (limit <= 0 || tokens <= 0) return null;
  const pct = Math.min(100, Math.round((tokens / limit) * 100));
  const tone =
    pct >= 80
      ? "text-[var(--status-danger-text)]"
      : pct >= 60
        ? "text-[var(--status-warning-text)]"
        : "text-slate-500";
  return (
    <>
      <span className="text-slate-600"> · </span>
      <span className={tone} title={t("chatPlan.contextTitle", { tokens: tokens.toLocaleString() })}>
        {t("chatPlan.context", { pct: String(pct) })}
      </span>
    </>
  );
}
