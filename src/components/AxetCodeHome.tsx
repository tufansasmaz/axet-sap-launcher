import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  PanelLeft,
  PanelLeftClose,
  MessageSquare,
  Link2,
  Server,
  ArrowUpRight,
  Search,
  Pencil,
  Trash2
} from "lucide-react";
import type {
  ActiveSapContext,
  AppConfig,
  AxetChatActivityPhase,
  AxetChatMessage,
  AxetModelEntry,
  ChatAttachment,
  ChatSessionsState,
  ConnectivityState,
  SapService,
  SystemTier
} from "../../app-electron/shared/types";
import ChatSessionPane from "./ChatSessionPane";
import ChatFilesPanel from "./ChatFilesPanel";
import ConfirmDialog from "./ConfirmDialog";
import type { ChatMessage } from "./ChatBubble";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { resolveTier } from "../lib/tier";
import { DictationRecorder } from "../lib/dictationRecorder";
import { promptWithAttachments, toAttachments } from "../lib/attachments";
import { useT } from "../i18n";

// Kullanıcı yazmayı bu kadar duraklattıktan sonra alt süreç ısıtılıyor. Her
// tuşta ısıtmak süreç açıp kapatmaktan başka bir şey yapmazdı; yarım saniye,
// "yazmayı bıraktı" ile "hâlâ yazıyor"u ayıracak kadar uzun ve kazancı
// (~2–4 saniye) yemeyecek kadar kısa.
const PREWARM_DEBOUNCE_MS = 500;

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: AxetModelEntry | null;
  draft: string;
  // Henüz gönderilmemiş ekler (bkz. shared/types.ts `ChatAttachment`).
  attachments: ChatAttachment[];
  pending: boolean;
  requestId: string | null;
  // Cevap beklenirken alt sürecin bildirdiği son aşama (bkz. axetChat.ts).
  // Diske YAZILMIYOR: bekleyen bir istek yeniden başlatmayı atlatmıyor.
  activity: AxetChatActivityPhase | null;
  createdAt: number;
  // Listedeki sıralama bunun üzerinden — sohbetler artık diskte kalıcı
  // olduğu için "en son dokunulan üstte" olmadan liste hızla kullanılamaz
  // hâle geliyor (en eski sohbet en üstte kalırdı).
  updatedAt: number;
  // Bu sohbetin bağlı olduğu SAP proje klasörü (bkz. shared/types.ts
  // `StoredChatSession.cwd`). `null` = genel çalışma alanı.
  cwd: string | null;
  sapLabel: string | null;
}

// SAP'a bağlanınca App.tsx'in "bu sisteme bağlı bir sohbet aç" isteği.
// `nonce` şart: aynı sisteme arka arkaya bağlanmak AYNI projectDir/label
// nesnesini üretir ve effect bir daha tetiklenmezdi.
export interface SapChatRequest {
  projectDir: string;
  label: string;
  nonce: number;
}

interface RecentEntry {
  path: string[];
  service: SapService;
  itemUuid: string;
  connectedAt: string;
}

interface Props {
  /**
   * Bu bileşen App.tsx'te ARTIK KOŞULLU RENDER EDİLMİYOR — sekme değişince
   * CSS ile gizleniyor ki akan cevaplar ve açık sohbet seçimi hayatta kalsın.
   * Bunun bedeli: gizliyken de canlı olması. Global klavye kısayolları bu
   * bayrakla susturuluyor; yoksa SAP Launcher'dayken basılan Ctrl+N,
   * görünmeyen bir panelde sessizce yeni sohbet açardı.
   */
  active: boolean;
  config: AppConfig | null;
  pushToast: (kind: "success" | "error", text: string) => void;
  recentEntries: RecentEntry[];
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  onOpenSapLauncher: () => void;
  onQuickConnectSap: (path: string[], service: SapService, itemUuid: string) => void;
  /**
   * SAP bağlantısı başarılı olduğunda App.tsx buraya bir istek bırakıyor;
   * bu bileşen boş bir sohbete geçip onu o projeye bağlıyor. Bağlantı artık
   * terminal AÇMIYOR (kullanıcı isteği, 2026-09-04) — bağlanınca sohbete
   * düşülüyor.
   */
  sapChatRequest: SapChatRequest | null;
  /**
   * O an bağlı olunan SAP sistemi (bkz. app-electron/main/activeContext.ts).
   * `sapChatRequest`'ten FARKLI: o, "şimdi bağlandık, yeni sohbet aç" diyen
   * TEK SEFERLİK bir olay; bu ise sürekli bir durum. Bağlandıktan sonra elle
   * açılan yeni sohbetler de bu sayede aynı sisteme bağlanıyor — bağlantı
   * kurulduktan sonra "Yeni sohbet"e basmak, kullanıcıyı sessizce bağlamsız
   * bir sohbete düşürüyordu.
   */
  activeSap: ActiveSapContext | null;
  /** Terminal, silinmedi — sadece varsayılan olmaktan çıktı (rozetteki düğme). */
  onOpenChatTerminal: (cwd: string, title: string) => void;
}

function greetingKey(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

const TITLE_MAX_LEN = 42;

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LEN) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LEN)}…`;
}

// `axet-code run` her çağrıda TÜM geçmişi transkript olarak yeniden
// gönderiyor (bkz. axetChat.ts) — CLI'nin kendisi oturum hafızası
// tutmadığı için bu şart, ama sohbet uzadıkça hem gönderilen prompt boyutu
// hem (dolaylı olarak) yanıt süresi/maliyeti artar. Çok uzun sohbetlerde
// sadece SON N mesajı gönderiyoruz — en eski mesajlar bağlamdan düşüyor
// ama bu, "her mesajda tüm geçmişi sınırsız büyütme" yerine kabul edilebilir
// bir taviz (ChatGPT'nin kendi context-window kesme davranışıyla aynı ruh).
const MAX_HISTORY_MESSAGES = 24;

// Henüz kaydedilmemiş "yeni sohbet" için sahte kimlik. Yeni sohbet AÇILDIĞINDA
// listeye bir kayıt eklenmiyor; ilk mesaj gönderilene kadar sadece boş bir
// composer var (ChatGPT/Claude/Gemini'nin üçünün de davranışı). Aksi hâlde
// "Yeni sohbet"e üst üste basan kullanıcı, listeyi hiç kullanılmamış boş
// kayıtlarla dolduruyordu.
const NEW_SESSION_ID = "__new__";

// --- Açılış ekranındaki öneri kartları ---
//
// SABİT ÜÇ TANE DEĞİL (kullanıcı isteği, 2026-09-04: *"burdaki önerilen
// sorular sürekli değişen mantıklı şeyler olsun"*). Eskiden ekranda her
// zaman aynı üç kart vardı ("mimariyi özetle / src'deki dosyaları listele /
// package.json'ı açıkla"); ikinci açılıştan sonra kimse okumuyordu.
//
// "Mantıklı" kısmı `scope` ile: karşılığı olmayan bir öneri GÖSTERİLMİYOR.
// Bağlı SAP sistemi yokken "SAP sistemlerimi özetle" demek ya boş bir cevap
// ya uydurma üretir. Öneri kartının işi, kullanıcıya yapabileceği bir şeyi
// hatırlatmak — yapamayacağı bir şeyi vaat etmek değil.
type SuggestionScope = "general" | "sap" | "connector";

const SUGGESTION_POOL: readonly { key: string; scope: SuggestionScope }[] = [
  { key: "sgArchitecture", scope: "general" },
  { key: "sgKeyFiles", scope: "general" },
  { key: "sgDependencies", scope: "general" },
  { key: "sgRecentChanges", scope: "general" },
  { key: "sgTests", scope: "general" },
  { key: "sgDebug", scope: "general" },
  { key: "sgCommitMessage", scope: "general" },
  { key: "sgTodos", scope: "general" },
  { key: "sgReadme", scope: "general" },
  { key: "sgExplainFile", scope: "general" },
  { key: "sgSetup", scope: "general" },
  { key: "sgSapSystems", scope: "sap" },
  { key: "sgAbapReport", scope: "sap" },
  { key: "sgSapDump", scope: "sap" },
  { key: "sgSapGuiAutomate", scope: "sap" },
  { key: "sgMailSummary", scope: "connector" },
  { key: "sgSharepointFind", scope: "connector" }
];

const SUGGESTION_COUNT = 3;

// Tohumlanmış karıştırma (mulberry32). Düz `Math.random()` kullanılmıyor,
// çünkü seçim bir `useMemo` içinde yapılıyor: React aynı bağımlılıklarla
// gövdeyi tekrar çalıştırabildiği (StrictMode çift render, yeniden render)
// için kartlar kullanıcı hiçbir şey yapmadan gözünün önünde değişirdi.
// Tohum yalnızca "yeni sohbet"te değişiyor — yani kartlar tam olarak
// istendiği anda ve yalnızca o anda yenileniyor.
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function freshSuggestionSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

// NOT — kenar çubuğunda bir ara TARİH BAŞLIKLARI vardı ("Bugün / Dün / Bu
// hafta / Daha eski", `groupLabelKey` + yapışkan başlıklar). Gemini düzenine
// geçerken kaldırıldı: referans arayüzde liste tek ve düz bir "Son" listesi;
// 240px'lik bir sütunda her birkaç satırda bir gelen başlık, listeyi asıl
// içerikten çok ayraçla dolduruyordu. Sıralama zaten `updatedAt`'e göre, yani
// "en yeni üstte" bilgisi başlık olmadan da duruyor.

// axet.code'un ana ekranı — sol tarafta sohbet listesi, sağda TEK bir sohbet
// yüzeyi.
//
// BURADA ESKİDEN BİR "DASHBOARD" VARDI (istatistik kartları: aktif sohbet
// sayısı / SAP sistemi sayısı / sürüm, iki büyük buton, son sohbet kartları,
// son bağlantı listesi) ve uygulama açıldığında ilk gördüğün oydu. Kullanıcı
// kararıyla TAMAMEN kaldırıldı: "ben direkt ChatGPT/Claude/Gemini gibi bir şey
// istiyorum". Bir sohbet uygulaması açıldığında yazmaya hazır olmalı; o
// sayıların hiçbiri kullanıcının o an vermek istediği kararı beslemiyordu ve
// sohbete başlamak fazladan bir tıklama gerektiriyordu. Sürüm bilgisi zaten
// Ayarlar'da, sistem sayısı SAP Launcher sekmesinde.
//
// Sonuç: ekranda HER ZAMAN aynı arayüz var (ChatSessionPane) — sohbet
// seçiliyse mesajlarıyla, seçili değilse boş "yeni sohbet" hâliyle. İki ayrı
// açılış düzeni bakımı imkânsız bir çift-gerçeklik üretiyordu.
//
// Kullanıcı kararıyla artık gerçek `axet-code` TUI'sinin
// terminal görünümü BURADA hiç görünmüyor (bkz. PROJE-BILGI.md). Motor
// hâlâ gerçek `axet-code` — her mesaj `window.api.sendChatMessage` ile main
// process'te bir `axet-code run -q` (stateless, tek-atış) çağrısı olarak
// çalıştırılıyor (bkz. axetChat.ts); CLI seviyesinde oturum hafızası
// olmadığı için bağlamı biz (önceki mesajları transkript olarak göndererek)
// koruyoruz. SAP Launcher'ın kendi terminal panelinden TAMAMEN AYRI
// (kullanıcı kararı — bkz. PROJE-BILGI.md "kullanıcı kararları" bölümü).
//
// Görsel dil GEMİNİ referansına göre başladı (kullanıcı kararı, 2026-09-02 —
// bkz. PROJE-BILGI.md Faz 4): kenarlık yerine dolgu, hap köşeler. KENAR
// ÇUBUĞUNDA bu artık geçerli DEĞİL — aynı gün gelen ikinci geri bildirimle
// (*"soldaki paneli daha profesyonel şekilde düzenleyelim, borderler daha
// keskin olsun"*) burası gerçek kenarlıklara ve `rounded-md` köşelere geçti.
// Sohbet yüzeyi (ChatSessionPane) hâlâ büyük ölçüde yumuşak dilde.
//
// Model seçici bu dosyadan değil ChatSessionPane'in COMPOSER'INDAN yönetiliyor
// (seçim mantığı burada: `handleSelectModel`).
export default function AxetCodeHome({
  active,
  config,
  pushToast,
  recentEntries,
  connectivity,
  tierOverrides,
  onOpenSapLauncher,
  onQuickConnectSap,
  sapChatRequest,
  activeSap,
  onOpenChatTerminal
}: Props) {
  const t = useT();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Henüz bir sohbete bağlanmamış taslak (bkz. NEW_SESSION_ID).
  const [newDraft, setNewDraft] = useState("");
  // Henüz bir sohbete bağlanmamış taslağın ekleri — `newDraft`'ın eşleniği.
  const [newAttachments, setNewAttachments] = useState<ChatAttachment[]>([]);
  // Taslağın SAP bağlamı. Kayıt ilk mesajda doğduğu için (bkz. handleSendNew)
  // bağlantı da o ana kadar burada bekliyor: bağlanıp hiçbir şey sormayan
  // kullanıcı, listede boş bir sohbet bulmuyor.
  const [newBinding, setNewBinding] = useState<{ cwd: string; label: string } | null>(null);
  // Taslak sohbetin GERÇEKTE kullanacağı bağlantı. `newBinding` yoksa aktif
  // SAP bağlamı devreye giriyor: bir sisteme bağlandıktan sonra açılan her
  // yeni sohbet o sisteme ait sayılıyor. `newBinding` ("şu an bağlandık"
  // olayı) her zaman önce gelir — nadir de olsa ikisi farklı olabilir.
  // Bağlamsız bir sohbet istemenin yolu, başlık çubuğundaki rozetten
  // bağlamı temizlemek.
  const effectiveNewBinding = useMemo(
    () =>
      newBinding ??
      (activeSap ? { cwd: activeSap.projectDir, label: `${activeSap.systemId} · ${activeSap.client}` } : null),
    [newBinding, activeSap]
  );
  const [models, setModels] = useState<AxetModelEntry[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<AxetModelEntry | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Kenar çubuğu daraltılabilir (Gemini deseni). Kapalıyken tamamen
  // kaybolmuyor, ikon şeridine iniyor — "yeni sohbet" ve geri açma düğmesi
  // her zaman elin altında kalsın diye.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Açılış hâli Ayarlar'dan geliyor ama SADECE BİR KEZ uygulanıyor: `config`
  // asenkron yüklendiği için ilk render'da `null`, o yüzden `useState`'in
  // başlangıç değeri olarak kullanılamıyor. Bayrak olmadan, config her
  // değiştiğinde (tema/dil dâhil) kullanıcının o an ☰ ile yaptığı daraltma
  // geri alınırdı.
  const sidebarInitRef = useRef(false);
  useEffect(() => {
    if (sidebarInitRef.current || !config) return;
    sidebarInitRef.current = true;
    setSidebarOpen(config.chatSidebarOpen);
  }, [config]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Mikrofonun üç hâli. `transcribing` ayrı bir durum çünkü whisper birkaç
  // saniye sürebiliyor: kayıt bitmiş ama metin henüz yok, ve bu arada düğme
  // tekrar tıklanabilir görünmemeli.
  const [dictationState, setDictationState] = useState<"idle" | "recording" | "transcribing">("idle");
  // Diskten yükleme TAMAMLANANA kadar kaydetme yapılmaz. Bu bayrak olmadan
  // ilk render'daki boş `sessions=[]` state'i, yükleme cevabı gelmeden önce
  // debounce'lu kaydediciyi tetikleyip diskteki TÜM geçmişi silerdi.
  const loadedRef = useRef(false);
  // Öneri kartlarının tohumu — her "yeni sohbet"te yenileniyor (bkz.
  // SUGGESTION_POOL). Diske yazılmıyor: açılışta zaten yeni bir tohum
  // isteniyor.
  const [suggestionSeed, setSuggestionSeed] = useState(freshSuggestionSeed);
  // Dosya paneli TÜM sohbetler için ortak: her sohbette ayrı ayrı açmak
  // gerekseydi, panelin işi (ajanın yazdığını görmek) her yeni sohbette
  // yeniden hatırlanması gereken bir şey olurdu. Açık DOSYA ise sohbet başına
  // (bkz. ChatFilesPanel) — o gerçekten o sohbete ait.
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);

  // --- Sohbet geçmişini diskten yükle (yalnızca bir kez, mount'ta) ---
  // Bağımlılık listesi bilerek boş: `t`/`pushToast` değiştiğinde yeniden
  // çalışsaydı, o an ekranda açık olan canlı sohbetlerin üzerine diskteki
  // eski hâli yazardı.
  useEffect(() => {
    let cancelled = false;
    window.api
      .loadChatSessions()
      .then((result) => {
        if (cancelled) return;
        // `pending`/`requestId` diske YAZILMIYOR (bkz. shared/types.ts):
        // işaret ettikleri `axet-code` process'i uygulamayla birlikte öldü.
        setSessions(
          result.state.sessions.map((s) => ({
            ...s,
            messages: s.messages.map((m) => ({ ...m })),
            // Eski geçmiş dosyalarında `attachments` alanı yok — `?? []`
            // olmadan composer ilk render'da `undefined.length` ile patlardı.
            attachments: s.attachments ?? [],
            pending: false,
            requestId: null,
            activity: null,
            // Eski geçmişte bu alanlar yok — bağlamsız sohbet olarak açılıyorlar.
            cwd: s.cwd ?? null,
            sapLabel: s.sapLabel ?? null
          }))
        );
        // `result.state.activeId` BİLEREK yok sayılıyor (kullanıcı isteği,
        // 2026-09-04): uygulama her açılışta boş sohbet ekranıyla karşılasın,
        // son sohbetin yarım kalmış bağlamına düşmesin. Geçmiş listesi
        // solda duruyor, tıklayınca eskisi gibi açılıyor — kaybolan bir şey
        // yok, yalnızca AÇILIŞ noktası değişti. Alan diske hâlâ yazılıyor
        // (ChatSessionsState'in zorunlu alanı), sadece okunmuyor.
        //
        // Bu effect UYGULAMA ÖMRÜNDE BİR KEZ çalışıyor: App.tsx bu bileşeni
        // artık koşullu render etmiyor, sekme değişince CSS ile gizliyor.
        // Yani "boş sohbetle karşıla" davranışı gerçekten yalnızca AÇILIŞTA
        // geçerli — sekme değiştirip geri gelmek açık sohbeti kapatmıyor.
        if (result.recoveredFrom) {
          pushToast("error", t("axetCodeHome.historyCorrupt"));
        } else if (!result.ok && result.error) {
          pushToast("error", t("axetCodeHome.historyLoadFailed", { message: result.error }));
        }
      })
      .catch((err: Error) => {
        if (!cancelled) pushToast("error", t("axetCodeHome.historyLoadFailed", { message: err.message }));
      })
      .finally(() => {
        // Hata durumunda da açılıyor: yükleme başarısızsa kullanıcının bundan
        // SONRA yazdığı sohbetler yine de kaydedilebilmeli.
        if (!cancelled) loadedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Değişiklikleri diske yaz (debounce'lu) ---
  // 600ms'lik gecikme aynı zamanda akış sırasında yazmayı da engelliyor:
  // parçalar ~50ms aralıklarla geldiği için zamanlayıcı sürekli sıfırlanıyor,
  // kayıt ancak cevap bittikten sonra bir kez çalışıyor.
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = setTimeout(() => {
      const state: ChatSessionsState = {
        activeId,
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          // Yarım kalmış (akan) mesaj diske yazılmaz — nihai metni zaten
          // akış bitince gelen `invoke` cevabı belirliyor.
          messages: s.messages
            .filter((m) => !m.streaming)
            .map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              ...(m.error ? { error: true } : {}),
              // Yalnızca dolu olduğunda yazılıyor — eklerin BÜYÜK çoğunluğu
              // yok ve her mesaja boş bir dizi koymak geçmiş dosyasını
              // gereksiz şişirirdi.
              ...(m.attachments && m.attachments.length > 0 ? { attachments: m.attachments } : {}),
              createdAt: m.createdAt
            })),
          model: s.model,
          draft: s.draft,
          ...(s.attachments.length > 0 ? { attachments: s.attachments } : {}),
          // Bağlamsız sohbetler geçmiş dosyasını boş alanlarla şişirmesin.
          ...(s.cwd ? { cwd: s.cwd } : {}),
          ...(s.sapLabel ? { sapLabel: s.sapLabel } : {}),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }))
      };
      window.api.saveChatSessions(state).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [sessions, activeId]);

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    Promise.all([window.api.listAxetModels(), window.api.getAxetModelConfig()]).then(
      ([modelsResult, configResult]) => {
        if (cancelled) return;
        if (modelsResult.ok) {
          setModels(modelsResult.models);
          setModelsError(null);
        } else {
          setModelsError(modelsResult.error ?? null);
        }
        if (configResult.ok && configResult.config) {
          setDefaultModel(configResult.config.large);
        }
        setModelsLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  // "Yeni sohbet" artık kayıt OLUŞTURMUYOR — sadece boş composer'a dönüyor.
  // Gerçek kayıt ilk mesaj gönderilince doğuyor (handleSendNew).
  // `binding`: yalnızca SAP bağlantısından gelen çağrı doldurur; elle açılan
  // yeni sohbet bağlamsız başlar (önceki sistemin klasörü yapışıp kalmasın).
  const handleNewSession = useCallback((binding: { cwd: string; label: string } | null = null) => {
    setActiveId(null);
    setNewDraft("");
    setNewAttachments([]);
    setNewBinding(binding);
    setQuery("");
    // Boş ekrana her dönüşte kartlar yenileniyor — "sürekli değişen" burada.
    setSuggestionSeed(freshSuggestionSeed());
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // --- "Sisteme bağlan" → sohbet ---
  // Bağlantı başarılı olunca App.tsx yeni bir istek bırakıyor; burada boş
  // sohbete geçip onu o sistemin proje klasörüne bağlıyoruz. `nonce`
  // bağımlılıkta: aynı sisteme tekrar bağlanmak da yeni bir sohbet açmalı.
  useEffect(() => {
    if (!sapChatRequest) return;
    handleNewSession({ cwd: sapChatRequest.projectDir, label: sapChatRequest.label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sapChatRequest?.nonce]);

  // Ctrl+N / Cmd+N — yeni sohbet. Bir metin alanındayken de çalışıyor
  // (Ctrl+N'in girişte anlamlı bir yerel karşılığı yok), ama tarayıcının
  // kendi "yeni pencere" davranışını bastırmak için preventDefault şart.
  // Yalnızca sekme ÖNDEYKEN bağlanıyor (bkz. `active`).
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewSession();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, handleNewSession]);

  // Silme ARTIK onay istiyor: Faz 2'den önce sohbetler zaten uygulama
  // kapanınca kayboluyordu, şimdi kalıcılar — yanlışlıkla basılan bir "×"
  // aylarca birikmiş bir konuşmayı geri dönüşsüz siler.
  const handleDeleteSession = useCallback(
    (id: string) => {
      const target = sessions.find((s) => s.id === id);
      if (target?.pending && target.requestId) {
        window.api.cancelChatMessage(target.requestId).catch(() => {});
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveId((current) => (current === id ? null : current));
      setDeleteId(null);
    },
    [sessions]
  );

  // Boş bir sohbette onay sormak gereksiz bir tıklama — hiçbir şey kaybolmuyor.
  const requestDeleteSession = useCallback(
    (id: string) => {
      const target = sessions.find((s) => s.id === id);
      if (!target || target.messages.length === 0) {
        handleDeleteSession(id);
        return;
      }
      setDeleteId(id);
    },
    [handleDeleteSession, sessions]
  );

  const commitRename = useCallback(() => {
    const id = renamingId;
    if (!id) return;
    const next = renameDraft.trim();
    setRenamingId(null);
    // Boş ada izin verilmiyor — sohbet listede görünmez hâle gelirdi.
    if (!next) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: deriveTitle(next), updatedAt: Date.now() } : s))
    );
  }, [renameDraft, renamingId]);

  const handleSelectModel = useCallback(
    async (entry: AxetModelEntry) => {
      const result = await window.api.setAxetModel("large", entry);
      if (!result.ok) {
        pushToast("error", t("modelSelector.switchFailed", { message: result.error ?? "" }));
        return;
      }
      setDefaultModel(entry);
      if (activeId) {
        setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, model: entry } : s)));
      }
      pushToast("success", t("modelSelector.switched", { model: entry.model }));
    },
    [activeId, pushToast, t]
  );

  // `handleSend` ve `handleRegenerate` ORTAK gövdesi: istemi çalıştır, akan
  // cevabı sonlandır. Tek fark ikisinin çağrıdan ÖNCE mesaj listesine ne
  // yaptığı (biri kullanıcı mesajı ekler, diğeri eski cevabı atar).
  const runPrompt = useCallback(
    async (
      sessionId: string,
      text: string,
      history: AxetChatMessage[],
      model: AxetModelEntry | null,
      // Sohbete özel çalışma klasörü. SAP'a bağlanınca açılan sohbetlerde bu,
      // bağlantının proje klasörü — ajan `.conn_adt`/`sap-context.md`'yi ancak
      // orada çalışırsa görüyor. `null` ise genel çalışma alanına düşüyor.
      sessionCwd: string | null
    ) => {
      const requestId = crypto.randomUUID();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, pending: true, requestId, activity: null, updatedAt: Date.now() } : s
        )
      );

      const cwd = sessionCwd || config?.axetWorkspaceDir || "";
      const result = await window.api.sendChatMessage(requestId, cwd, model, history, text);

      setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId || s.requestId !== requestId) return s;
        // Akış sırasında oluşturulmuş (varsa) yarım asistan mesajı — sonucu
        // ona YAZIYORUZ, yeni bir mesaj eklemiyoruz. Yoksa (hiç parça
        // gelmeden hata/iptal) sıfırdan oluşturulur.
        const last = s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
        const streamed = last?.streaming === true ? last : null;

        // `updatedAt` her sonlanmada tazeleniyor: cevabın gelişi de listedeki
        // sıralamayı etkileyen bir olay.
        const done = { pending: false, requestId: null, activity: null, updatedAt: Date.now() } as const;

        if (result.cancelled) {
          // Kullanıcı durdurdu. Ekranda GÖRÜNEN yarım metni silmiyoruz —
          // kullanıcı onu zaten okudu, kaybolması "bir şey ters gitti"
          // hissi verirdi (ChatGPT de durdurulan cevabı bırakır). Hiç metin
          // gelmediyse yarım mesajı tamamen kaldır, boş balon kalmasın.
          if (!streamed) return { ...s, ...done };
          const partial = streamed.content.trim();
          return {
            ...s,
            messages: partial
              ? s.messages.map((m) => (m.id === streamed.id ? { ...m, content: partial, streaming: false } : m))
              : s.messages.filter((m) => m.id !== streamed.id),
            ...done
          };
        }

        const finalContent = result.ok ? result.text : result.error || t("axetCodeHome.chatGenericError");
        // Bağlayıcıların bu mesajda açık olup olmadığı cevaba İLİŞTİRİLİYOR:
        // "gerektiğinde" kipinde bu bir tahmin ve yanıldığında sebebi
        // görünür olmalı (bkz. ChatBubble `usedConnectors`).
        if (streamed) {
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === streamed.id
                ? { ...m, content: finalContent, error: !result.ok, streaming: false, usedConnectors: result.usedConnectors }
                : m
            ),
            ...done
          };
        }
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: finalContent,
          error: !result.ok,
          createdAt: Date.now(),
          usedConnectors: result.usedConnectors
        };
        return { ...s, messages: [...s.messages, assistantMessage], ...done };
      })
    );
    },
    [config?.axetWorkspaceDir, t]
  );

  // İlk mesaj: sohbet TAM OLUŞMUŞ hâlde (kullanıcı mesajı + başlık içinde)
  // tek seferde ekleniyor. Önce boş sohbet ekleyip sonra mesajı iliştirmek,
  // arada bir render'da listede başlıksız boş bir satır göstermek demekti.
  const handleSendNew = useCallback(async () => {
    const text = newDraft.trim();
    const attachments = newAttachments;
    // Tek başına bir ek de gönderilebilir — bir görsel bırakıp hiçbir şey
    // yazmadan göndermek meşru bir kullanım.
    if (!text && attachments.length === 0) return;
    const id = crypto.randomUUID();
    const now = Date.now();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: now,
      ...(attachments.length > 0 ? { attachments } : {})
    };
    const session: ChatSession = {
      id,
      // Metin yoksa başlık ilk ekin adından — başlıksız bir satır listede
      // hiçbir şey anlatmıyor.
      title: deriveTitle(text || attachments[0].name),
      messages: [userMessage],
      model: defaultModel,
      draft: "",
      attachments: [],
      pending: false,
      requestId: null,
      activity: null,
      createdAt: now,
      updatedAt: now,
      // Taslakta bekleyen SAP bağlamı burada kalıcılaşıyor.
      cwd: effectiveNewBinding?.cwd ?? null,
      sapLabel: effectiveNewBinding?.label ?? null
    };
    setSessions((prev) => [...prev, session]);
    setActiveId(id);
    setNewDraft("");
    setNewAttachments([]);
    setNewBinding(null);
    await runPrompt(id, promptWithAttachments(text, attachments), [], defaultModel, session.cwd);
  }, [defaultModel, newAttachments, effectiveNewBinding, newDraft, runPrompt]);

  const handleSend = useCallback(async () => {
    if (!activeId) return handleSendNew();
    const session = sessions.find((s) => s.id === activeId);
    if (!session || session.pending) return;
    const text = session.draft.trim();
    const attachments = session.attachments;
    if (!text && attachments.length === 0) return;

    // Geçmiş de `promptWithAttachments`ten geçiyor: geçmemesi hâlinde ajan,
    // iki mesaj önce konuşulan dosyanın yolunu kaybeder — ekran metninde o
    // yol yok, sadece çipin adı var.
    const historyForCall: AxetChatMessage[] = session.messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: promptWithAttachments(m.content, m.attachments ?? []) }));
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      ...(attachments.length > 0 ? { attachments } : {})
    };
    const isFirstMessage = session.messages.length === 0;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              title: isFirstMessage ? deriveTitle(text || attachments[0].name) : s.title,
              messages: [...s.messages, userMessage],
              draft: "",
              attachments: []
            }
          : s
      )
    );

    await runPrompt(activeId, promptWithAttachments(text, attachments), historyForCall, session.model, session.cwd);
  }, [activeId, handleSendNew, runPrompt, sessions]);

  // Gönderilmiş bir kullanıcı mesajını düzenle: metni composer'a geri koy ve
  // sohbeti O MESAJDAN İTİBAREN kes. Sonrasındaki cevap(lar) düzeltilmiş
  // soruya ait olmadığı için bağlamda tutulmaları yanlış olurdu — üç referans
  // arayüz de aynı şeyi yapıyor. Geri alma yok: kesilen kuyruk gerçekten
  // gidiyor, bu yüzden düğme sadece hover'da ve akış yokken görünüyor.
  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      if (!activeId) return;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          const idx = s.messages.findIndex((m) => m.id === messageId);
          if (idx < 0) return s;
          return {
            ...s,
            messages: s.messages.slice(0, idx),
            draft: content,
            // Ekler de composer'a geri geliyor: düzenlenen mesaj bir görselle
            // gönderildiyse, düzeltilmiş hâlinin o görseli kaybetmesi
            // kullanıcının istediği şey değil.
            attachments: s.messages[idx].attachments ?? [],
            updatedAt: Date.now()
          };
        })
      );
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        // İmleç sona: kullanıcı çoğunlukla eklemek/düzeltmek için giriyor,
        // metni baştan seçili bulup yanlışlıkla silmesin.
        el.setSelectionRange(el.value.length, el.value.length);
      });
    },
    [activeId]
  );

  // Son cevabı at, AYNI istemi yeniden çalıştır. `axet-code run` stateless
  // olduğu için bu, gerçekten yeni bir çağrı — önbellekten dönen bir şey yok.
  const handleRegenerate = useCallback(async () => {
    if (!activeId) return;
    const session = sessions.find((s) => s.id === activeId);
    if (!session || session.pending) return;
    const msgs = session.messages;
    const lastIndex = msgs.length - 1;
    if (lastIndex < 0 || msgs[lastIndex].role !== "assistant") return;
    // Cevaptan geriye doğru en yakın kullanıcı mesajı = yeniden çalıştırılacak istem.
    let userIndex = lastIndex - 1;
    while (userIndex >= 0 && msgs[userIndex].role !== "user") userIndex -= 1;
    if (userIndex < 0) return;

    const prompt = promptWithAttachments(msgs[userIndex].content, msgs[userIndex].attachments ?? []);
    const historyForCall: AxetChatMessage[] = msgs
      .slice(0, userIndex)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: promptWithAttachments(m.content, m.attachments ?? []) }));

    setSessions((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, messages: msgs.slice(0, lastIndex) } : s))
    );
    await runPrompt(activeId, prompt, historyForCall, session.model, session.cwd);
  }, [activeId, runPrompt, sessions]);

  const handleCancel = useCallback(() => {
    if (!activeSession?.requestId) return;
    window.api.cancelChatMessage(activeSession.requestId).catch(() => {});
  }, [activeSession]);

  // Ekleri taslağa iliştir. Eskiden dosya YOLU taslak metnine yazılıyordu;
  // artık ayrı bir alanda duruyorlar (kullanıcı geri bildirimi, 2026-09-02:
  // *"yolu gitmesin, chatte yukarıda gözüksün"*).
  //
  // Aynı dosya iki kez eklenmiyor: aynı görseli iki kez sürüklemek kolay ve
  // sonucu, prompt'a iki kez yazılan bir yol olurdu.
  const addAttachments = useCallback((sessionId: string, paths: string[]) => {
    if (paths.length === 0) return;
    const merge = (existing: ChatAttachment[]): ChatAttachment[] => {
      const known = new Set(existing.map((a) => a.path));
      return [...existing, ...toAttachments(paths.filter((p) => !known.has(p)))];
    };
    if (sessionId === NEW_SESSION_ID) {
      setNewAttachments(merge);
      return;
    }
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, attachments: merge(s.attachments) } : s)));
  }, []);

  const removeAttachment = useCallback((sessionId: string, attachmentId: string) => {
    if (sessionId === NEW_SESSION_ID) {
      setNewAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, attachments: s.attachments.filter((a) => a.id !== attachmentId) } : s))
    );
  }, []);

  const handleAttachFiles = useCallback(async () => {
    setAttaching(true);
    try {
      const paths = await window.api.pickFiles();
      if (paths.length === 0) return;
      addAttachments(activeId ?? NEW_SESSION_ID, paths);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      pushToast("error", t("axetCodeHome.attachFailed", { message: (err as Error).message }));
    } finally {
      setAttaching(false);
    }
  }, [activeId, addAttachments, pushToast, t]);

  // Arama kutusu artık HEP AÇIK (kullanıcı isteği, 2026-09-04: *"arama
  // kutusu açık olarak gelsin, kapanmasına gerek yok"*) — 2026-09-02'de
  // istenen açılır/kapanır davranış kaldırıldı. Geriye kalan tek eylem
  // metni temizlemek; kenar çubuğu daraltılırken de bu çağrılıyor, çünkü
  // görünmeyen bir süzgeç listeyi süzmeye devam ederse kullanıcı
  // sohbetlerinin neden eksik göründüğünü anlayamaz.
  const clearSearch = useCallback(() => {
    setQuery("");
  }, []);


  const handleDraftChange = useCallback(
    (value: string) => {
      if (!activeId) {
        setNewDraft(value);
        return;
      }
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, draft: value } : s)));
    },
    [activeId]
  );

  // Mikrofon. Düğme bir AÇ/KAPA: ilk tık kaydı başlatır, ikinci tık bitirip
  // sesi gömülü whisper'a yollar ve dönen metni taslağın SONUNA ekler
  // (üzerine yazmaz — kullanıcı yazdığının silinmesini beklemez).
  //
  // Kaydedici `useRef`'te: bileşenin yeniden render'ı kaydı bölmemeli, ve
  // ekran değiştiğinde mikrofonun donanım göstergesi açık kalmamalı (bkz.
  // aşağıdaki temizlik effect'i).
  const recorderRef = useRef<DictationRecorder | null>(null);

  const handleDictate = useCallback(async () => {
    // Köprü YOKSA açıkça söyle. Dev sunucusu main process'i sıcak yeniden
    // yüklemiyor: renderer HMR ile mikrofon düğmesini gösterdiği hâlde eski
    // preload'da fonksiyon bulunmuyor ve çağrı bir TypeError'a düşüyordu —
    // yakalanmayan bir promise reddi, yani kullanıcıya HİÇBİR ŞEY göstermeyen
    // ölü bir düğme. (Bu birebir yaşandı, 2026-09-02.)
    if (typeof window.api.transcribeDictation !== "function") {
      pushToast("error", t("axetCodeHome.dictateUnavailable"));
      return;
    }

    const recorder = recorderRef.current ?? new DictationRecorder();
    recorderRef.current = recorder;

    // --- İkinci tık: durdur, çevir, yaz ---
    if (recorder.recording) {
      setDictationState("transcribing");
      try {
        const recording = await recorder.stop();
        if (!recording) {
          // Hiç ses yakalanmadı (basıp hemen bırakma). Hata değil, sessiz geç.
          setDictationState("idle");
          return;
        }
        // "auto": konuşulan dili whisper kendisi buluyor, yani Türkçe ve
        // İngilizce aynı düğmeden çalışıyor — kullanıcının uygulama dilini
        // değiştirmesi ya da bir seçici açması gerekmiyor. Sabit bir dil
        // vermek yalnızca eksik değil zararlı olurdu (ölçüm: dictation.ts).
        const result = await window.api.transcribeDictation(recording.base64, "auto");
        if (!result.ok || !result.text) {
          // Kodlu hatalar kendi metnine çevriliyor; whisper'ın kendi hata
          // satırı olduğu gibi gösteriliyor.
          const code = result.error ?? "";
          const message =
            code === "missing_runtime"
              ? t("axetCodeHome.dictateNoRuntime")
              : code === "audio_too_long"
                ? t("axetCodeHome.dictateTooLong")
                : code === "timeout"
                  ? t("axetCodeHome.dictateTimeout")
                  : code;
          // "Ses tanınmadı" da bir başarısızlık: kullanıcı konuştu ve
          // karşılığında hiçbir şey yazılmadı. Sessiz geçmek, mikrofonun
          // bozuk olduğunu düşündürürdü.
          if (result.ok) pushToast("error", t("axetCodeHome.dictateNoSpeech"));
          else pushToast("error", t("axetCodeHome.dictateFailed", { message }));
          return;
        }
        const spoken = result.text.trim();
        if (spoken.length === 0) {
          pushToast("error", t("axetCodeHome.dictateNoSpeech"));
          return;
        }
        const current = activeId ? sessions.find((s) => s.id === activeId)?.draft ?? "" : newDraft;
        handleDraftChange(current.length > 0 ? `${current.trimEnd()} ${spoken}` : spoken);
        requestAnimationFrame(() => textareaRef.current?.focus());
      } catch (err) {
        pushToast("error", t("axetCodeHome.dictateFailed", { message: (err as Error).message }));
      } finally {
        setDictationState("idle");
      }
      return;
    }

    // --- İlk tık: kaydı başlat ---
    try {
      await recorder.start();
      setDictationState("recording");
    } catch (err) {
      // Mikrofon yok, başka bir uygulamada kullanımda ya da politika engelli.
      setDictationState("idle");
      pushToast("error", t("axetCodeHome.dictateMicFailed", { message: (err as Error).message }));
    }
  }, [activeId, handleDraftChange, newDraft, pushToast, sessions, t]);

  // Ekran kapanırken kaydı ATAR. Yalnızca `AudioContext`'i bırakmak Windows'ta
  // mikrofonun "kullanımda" rozetini açık bırakıyor.
  useEffect(() => {
    return () => recorderRef.current?.cancel();
  }, []);

  // Gerçek akış aboneliği. Main process cevabı ÜRETİLDİKÇE `axetChat:chunk`
  // push ediyor (bkz. axetChat.ts / main/index.ts); burada ilgili sohbeti
  // `requestId` ile bulup son asistan mesajına ekliyoruz. İlk parça geldiğinde
  // akan mesaj daha yoksa oluşturuluyor.
  //
  // Abonelik BİR KEZ kuruluyor (bağımlılık listesi boş) ve state'e sadece
  // fonksiyonel `setSessions` ile dokunuyor — aksi hâlde her sohbet
  // değişikliğinde listener söküp takmak gerekirdi ve iki abonelik arasına
  // düşen parçalar kaybolabilirdi.
  useEffect(() => {
    return window.api.onChatChunk((requestId, text) => {
      if (!text) return;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.requestId !== requestId) return s;
          const last = s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
          if (last?.streaming === true) {
            return {
              ...s,
              messages: s.messages.map((m) => (m.id === last.id ? { ...m, content: m.content + text } : m))
            };
          }
          const streamingMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: text,
            createdAt: Date.now(),
            streaming: true
          };
          return { ...s, messages: [...s.messages, streamingMessage] };
        })
      );
    });
  }, []);

  // Alt sürecin aşama bildirimleri. Cevap beklenirken arayüzde yalnızca yanıp
  // sönen çubuklar vardı ve hiçbir şey söylemiyorlardı (kullanıcı bildirimi,
  // 2026-09-04). Kaynak `axet-code run -v`'nin canlı stderr'i (bkz.
  // axetChat.ts). Akış aboneliğiyle aynı desen: bir kez kuruluyor, state'e
  // yalnızca fonksiyonel `setSessions` ile dokunuyor.
  useEffect(() => {
    return window.api.onChatActivity((requestId, phase) => {
      setSessions((prev) =>
        // Eşleşme yoksa AYNI dizi döndürülüyor: geç kalmış bir bildirim
        // (istek çoktan bitmiş) boşuna bir render tetiklemesin.
        prev.some((s) => s.requestId === requestId)
          ? prev.map((s) => (s.requestId === requestId ? { ...s, activity: phase } : s))
          : prev
      );
    });
  }, []);

  // --- Ön-ısıtma ---
  // Kullanıcı yazarken bir sonraki mesajın alt süreci şimdiden açılıp stdin'de
  // bekletiliyor; ölçüm ve gerekçe axetChat.ts'te (mesaj başına ~2–4 saniye).
  //
  // Hedef (klasör + model) bir REF'te tutuluyor, ısıtma efektinin bağımlılık
  // listesinde DEĞİL: `sessions` akan bir cevapta saniyede onlarca kez
  // değişiyor ve efekti her seferinde söküp takmak, debounce sayacını sürekli
  // sıfırlayarak ısıtmanın hiç çalışmamasına yol açardı.
  const prewarmTargetRef = useRef<{ cwd: string; model: AxetModelEntry | null }>({ cwd: "", model: null });
  const activeDraft = activeId ? (sessions.find((s) => s.id === activeId)?.draft ?? "") : newDraft;
  useEffect(() => {
    const session = activeId ? (sessions.find((s) => s.id === activeId) ?? null) : null;
    prewarmTargetRef.current = {
      cwd: (session ? session.cwd : (effectiveNewBinding?.cwd ?? null)) || config?.axetWorkspaceDir || "",
      model: session ? session.model : defaultModel
    };
  });

  useEffect(() => {
    // Boş taslak = ortada gönderilecek bir şey yok; süreç açmak boşuna.
    if (!activeDraft.trim()) return;
    const timer = setTimeout(() => {
      const { cwd, model } = prewarmTargetRef.current;
      // Ateşle-unut: ısıtma başarısız olsa da asıl gönderim eskisi gibi
      // çalışıyor, bu yüzden hatası kullanıcıya gösterilecek bir şey değil.
      window.api.prewarmChat(cwd, model).catch(() => {});
    }, PREWARM_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [activeDraft]);

  const greeting = useMemo(greetingKey, []);

  // Havuzdan bu turun üç kartı. Bağımlılıklar bilerek dar: kullanıcı "yeni
  // sohbet"e basmadıkça (tohum) ya da bağlam gerçekten değişmedikçe (SAP
  // sistemi bağlandı / bir uygulama bağlandı) kartlar yerinde duruyor.
  const hasSapContext = recentEntries.length > 0;
  const hasConnectorContext = Object.values(config?.connectorEnabled ?? {}).some(Boolean);
  const suggestionKeys = useMemo(() => {
    const eligible = SUGGESTION_POOL.filter(({ scope }) => {
      if (scope === "sap") return hasSapContext;
      if (scope === "connector") return hasConnectorContext;
      return true;
    });
    return seededShuffle(eligible, suggestionSeed)
      .slice(0, SUGGESTION_COUNT)
      .map(({ key }) => key);
  }, [hasConnectorContext, hasSapContext, suggestionSeed]);

  // En son dokunulan sohbet en üstte. Sohbetler artık kalıcı olduğu için
  // ekleme sırası (eskiler üstte) birkaç gün içinde kullanılamaz hâle gelir.
  const orderedSessions = useMemo(() => sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt), [sessions]);

  // `toLocaleLowerCase("tr")`: "İ"/"I" Türkçede ASCII kurallarıyla
  // küçültülemez — düz `toLowerCase()` ile "İSTEK" araması "istek" başlıklı
  // sohbeti bulamazdı.
  const normalizedQuery = query.trim().toLocaleLowerCase("tr");
  const visibleSessions = useMemo(() => {
    if (!normalizedQuery) return orderedSessions;
    return orderedSessions.filter(
      (s) =>
        s.title.toLocaleLowerCase("tr").includes(normalizedQuery) ||
        // Başlık ilk mesajdan türetildiği için başlık araması tek başına
        // yetmiyor — sohbetin İÇİNDE geçen bir terimle de bulunabilmeli.
        s.messages.some((m) => m.content.toLocaleLowerCase("tr").includes(normalizedQuery))
    );
  }, [normalizedQuery, orderedSessions]);

  const deleteTarget = deleteId ? sessions.find((s) => s.id === deleteId) ?? null : null;

  // Sohbete özel klasörü olmayan sohbetlerin kökü/çalışma klasörü.
  const workspaceDir = config?.axetWorkspaceDir ?? "";

  // "Günaydın" yerine "Günaydın, Tufan". Ad, Ayarlar'daki `chatDisplayName`
  // (varsayılanı Windows oturum adı); BOŞ bırakılırsa adsız hâle düşüyor —
  // ekranı başkasına gösteren biri adını kaldırabilmeli. Ayrıca oturum adı
  // bazı kurumlarda sicil numarası oluyor ("10134570, günaydın" saçma olurdu),
  // o yüzden ad kullanıcı tarafından düzeltilebilir olmak zorunda.
  const baseGreeting = t(`axetCodeHome.greeting.${greeting}` as Parameters<typeof t>[0]);
  const displayName = config?.chatDisplayName?.trim() ?? "";
  const greetingText = displayName
    ? t("axetCodeHome.greetingWithName", { greeting: baseGreeting, name: displayName })
    : baseGreeting;

  // Boş "yeni sohbet" yüzeyi. Gerçek bir kayıt değil — sadece ChatSessionPane'in
  // beklediği şekle bürünmüş bir taslak, böylece açılış ekranı ile sohbet ekranı
  // AYNI bileşen (ve aynı composer) oluyor.
  const newSessionView = {
    id: NEW_SESSION_ID,
    messages: [] as ChatMessage[],
    model: defaultModel,
    draft: newDraft,
    attachments: newAttachments,
    pending: false,
    activity: null
  };

  // Kenar çubuğundaki tek satır. Ayrı bir fonksiyon çünkü artık iki kat
  // (grup > satır) içinde çağrılıyor ve JSX'i yerinde bırakmak listeyi
  // okunmaz hâle getiriyordu.
  const renderSessionRow = (session: ChatSession) => {
    const isActive = activeId === session.id;
    if (renamingId === session.id) {
      return (
        <div key={session.id} className="flex items-center gap-2 rounded-md border border-base-700 bg-base-800 px-2.5 py-1.5">
          <MessageSquare size={14} className="shrink-0 text-accent-400" />
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                // Escape'te `commitRename` çalışmamalı; blur onu yine
                // tetiklemesin diye önce state kapatılıyor.
                setRenamingId(null);
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded bg-base-950 px-2 py-0.5 text-[13px] text-slate-100 outline-none ring-1 ring-accent-500/50"
          />
        </div>
      );
    }
    return (
      <div
        key={session.id}
        role="button"
        tabIndex={0}
        onClick={() => setActiveId(session.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveId(session.id);
          }
        }}
        title={session.title}
        // Keskin köşe (`rounded-md`) + seçilide görünür kenarlık — kullanıcı
        // isteği, 2026-09-02: *"soldaki paneli daha profesyonel şekilde
        // düzenleyelim, borderler daha keskin olsun"*. Önceki hap biçim
        // kaldırıldı.
        //
        // Kenarlık HER satırda var, seçili olmayanlarda `transparent`: sadece
        // seçiliye eklenseydi satır seçildiğinde 2px uzar, liste zıplardı.
        className={`group flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-[13px] transition-colors ${
          isActive
            ? "border-base-700 bg-base-800 text-slate-100"
            : "border-transparent text-slate-400 hover:bg-base-800/60 hover:text-slate-300"
        }`}
      >
        <MessageSquare size={14} className={`shrink-0 ${isActive ? "text-accent-400" : "text-slate-500"}`} />
        <span className="min-w-0 flex-1 truncate">{session.title}</span>
        {session.pending && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRenameDraft(session.title);
            setRenamingId(session.id);
          }}
          title={t("axetCodeHome.renameTitle")}
          className="shrink-0 cursor-pointer rounded p-1 text-slate-500 opacity-0 transition hover:bg-base-700 hover:text-slate-200 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            requestDeleteSession(session.id);
          }}
          title={t("axetCodeHome.deleteTitle")}
          // `focus-visible:opacity-100` olmadan bu buton klavyeyle gezildiğinde
          // odaklanıyor ama GÖRÜNMÜYORDU.
          className="shrink-0 cursor-pointer rounded p-1 text-slate-500 opacity-0 transition hover:bg-base-700 hover:text-[var(--status-danger-text)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Kenar çubuğu. Kullanıcı isteğiyle (2026-09-02: *"soldaki paneli daha
          profesyonel şekilde düzenleyelim, borderler daha keskin olsun"*)
          Gemini'nin yumuşak/haplı dili burada BİRAKILDI:
            - sohbet yüzeyinden ton farkıyla değil GERÇEK bir `border-r` ile
              ayrılıyor,
            - köşeler `rounded-md`, hap değil.
          Bölümler arasındaki AYIRICI ÇİZGİLER kaldırıldı (kullanıcı isteği,
          2026-09-02: *"panelde ayraç lineları olmasa da olur"*) — üç yatay
          çizgi, 272px'lik bir sütunu dört kutuya bölüp panelin kendisinden
          çok ızgarasını öne çıkarıyordu. Bölümleri artık boşluk ayırıyor.
          Genişlik geçişi animasyonlu, çünkü daraltma tek tıkla ve sık yapılan
          bir hareket. */}
      <aside
        className={`flex shrink-0 flex-col overflow-hidden border-r border-base-800 bg-base-900 transition-[width] duration-200 ${
          sidebarOpen ? "w-[272px]" : "w-[60px]"
        }`}
      >
        {/* Başlık şeridi: ARAMA + daralt/genişlet. İKİSİ DE SAĞDA (kullanıcı
            isteği: *"kenar çubuğunu kapatma açma sağ tarafta olsun, yanında
            arama çubuğu falan olabilir"* → *"sol paneldeki arama ve kenar
            çubuğu butonları sağ tarafta olacak, solda değil"*) — eskiden solda
            tek başına bir ☰ vardı ve arama listenin içinde ayrı bir satırdı.

            Arama HEP AÇIK (kullanıcı isteği, 2026-09-04: *"arama kutusu açık
            olarak gelsin, kapanmasına gerek yok"*). 2026-09-02'de istenen
            açılır/kapanır büyüteç kaldırıldı — bir tık kazanmak için kutunun
            varlığını gizlemeye değmiyordu; büyüteç artık sadece bir ikon. */}
        <div className="flex h-[54px] shrink-0 items-center gap-1.5 px-2.5">
          {sidebarOpen && (
            <div className="flex min-w-0 flex-1 items-center rounded-lg bg-base-800 ring-1 ring-inset ring-base-700 focus-within:ring-accent-500/40">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500">
                <Search size={14} />
              </span>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Escape metni temizliyor. Kutu artık kapanmadığı için
                  // "boşsa kapat" dalı da yok.
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder={t("axetCodeHome.searchPlaceholder")}
                title={t("axetCodeHome.searchTitle")}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-200 outline-none placeholder:text-slate-500"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  title={t("axetCodeHome.searchClear")}
                  className="mr-1 shrink-0 cursor-pointer rounded p-1 text-slate-500 transition hover:bg-base-700 hover:text-slate-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => {
              // Daraltırken süzgeci temizle: 60px'lik şeritte kutu zaten
              // çizilmiyor, açık kalan süzgeç geri açılınca sürpriz olurdu.
              if (sidebarOpen) clearSearch();
              setSidebarOpen((v) => !v);
            }}
            title={sidebarOpen ? t("axetCodeHome.collapseSidebar") : t("axetCodeHome.expandSidebar")}
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-base-800 hover:text-slate-200 ${
              sidebarOpen ? "" : "mx-auto"
            }`}
          >
            {/* İkon YÖN gösteriyor: kapalıyken "aç", açıkken "kapat". Tek bir
                ☰ ikonu, düğmenin ne yapacağını söylemiyordu. */}
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        {/* "Yeni sohbet" — TAM GENİŞLİK ve birincil eylem gibi görünüyor
            (kullanıcı geri bildirimi: *"yeni sohbet çok çirkin yerde
            duruyor"*). Eskiden başlığın altında sola sıkışmış, zemin
            rengiyle aynı tonda dar bir haptı; ekranın en sık kullanılan
            düğmesi olduğu hâlde sıradan bir satır gibi duruyordu.
            Daraltılmışken metin gidiyor, düğme kalıyor. */}
        <div className="shrink-0 px-2.5 pb-2.5">
          {/* onClick'teki sarmalayıcı ok fonksiyonu şart: `handleNewSession`'ı
              doğrudan geçmek MouseEvent'i `binding` argümanı sanardı. */}
          <button
            onClick={() => handleNewSession()}
            title={`${t("axetCodeHome.newSession")} (Ctrl+N)`}
            className={`flex h-9 cursor-pointer items-center rounded-md border border-accent-500/30 bg-accent-500/10 text-[13px] font-medium text-accent-400 transition hover:border-accent-500/50 hover:bg-accent-500/20 ${
              sidebarOpen ? "w-full gap-2 px-3" : "mx-auto w-9 justify-center"
            }`}
          >
            <Plus size={16} className="shrink-0" />
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left">{t("axetCodeHome.newSession")}</span>
                {/* Kısayol düğmenin ÜSTÜNDE yazıyor, sadece tooltip'te değil —
                    tooltip'i görmek için beklemek gerekiyor, bu satırı
                    görmek için değil. */}
                <span className="text-[10px] tracking-wide text-accent-400/60">Ctrl+N</span>
              </>
            )}
          </button>
        </div>

        {/* Daraltılmışken listenin tamamı gizli: 60px'e sığdırılmış kırpık
            başlıklar okunmuyor, sadece gürültü oluyordu. */}
        {sidebarOpen && (
          <>
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
              {/* Tek ve düz bir bölüm başlığı — tarih grupları yok (bkz.
                  dosyanın üstündeki not). Küçük, büyük harfli ve seyrek
                  aralıklı: içerikle karışmayan bir etiket. */}
              <div className="px-0.5 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {t("axetCodeHome.recentTitle")}
              </div>
              <div className="space-y-0.5">{visibleSessions.map(renderSessionRow)}</div>

              {sessions.length > 0 && visibleSessions.length === 0 && (
                <div className="mt-1 rounded-md border border-base-800 bg-base-950 px-3 py-3 text-center text-[12px] text-slate-500">
                  {t("axetCodeHome.searchEmpty", { query: query.trim() })}
                </div>
              )}

              {sessions.length === 0 && (
                <div className="mt-1 rounded-md border border-base-800 bg-base-950 px-3 py-3 text-center">
                  <div className="text-[12px] font-medium text-slate-400">{t("axetCodeHome.emptyTitle")}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{t("axetCodeHome.emptyHint")}</div>
                </div>
              )}
            </div>

            {/* SAP bağlantıları BAŞLIKSIZ bir dip bloğu. Burası bir sohbet
                ekranı; bağlantılar yalnızca "elimin altında olsun" diye
                duruyor. Listeden çizgiyle değil boşlukla ayrılıyor. */}
            <div className="shrink-0 p-2.5 pt-1.5">
              {recentEntries.length > 0 ? (
                <div className="space-y-0.5">
                  {recentEntries.slice(0, 3).map((entry) => {
                    const state = connectivity[entry.service.uuid] ?? "unknown";
                    const tier = resolveTier(entry.service, tierOverrides);
                    return (
                      <button
                        key={entry.itemUuid}
                        onClick={() => onQuickConnectSap(entry.path, entry.service, entry.itemUuid)}
                        title={entry.path.join(" / ")}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] text-slate-400 transition hover:bg-base-800 hover:text-slate-200"
                      >
                        <Server size={13} className="shrink-0 text-[var(--navy-icon)]" />
                        <span className="min-w-0 flex-1 truncate">{entry.service.name}</span>
                        {tier && <TierBadge tier={tier} />}
                        <StatusDot state={state} />
                      </button>
                    );
                  })}
                  <button
                    onClick={onOpenSapLauncher}
                    className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-slate-500 transition hover:bg-base-800 hover:text-slate-300"
                  >
                    {t("axetCodeHome.viewAllConnections")}
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenSapLauncher}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-base-800 bg-base-950 px-3 py-2.5 text-[12px] text-slate-500 transition hover:border-base-700 hover:bg-base-800 hover:text-slate-300"
                >
                  <Link2 size={14} className="shrink-0" />
                  {t("axetCodeHome.connectionsEmpty")}
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-base-950">
        {sessions.map((session) => (
          <ChatSessionPane
            key={session.id}
            session={session}
            active={active && activeId === session.id}
            models={models}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            attaching={attaching}
            greeting={greetingText}
            registerTextarea={(el) => {
              if (activeId === session.id) textareaRef.current = el;
            }}
            onDraftChange={handleDraftChange}
            onSend={handleSend}
            onCancel={handleCancel}
            onSelectModel={handleSelectModel}
            onRegenerate={handleRegenerate}
            onEditMessage={handleEditMessage}
            onAttachFiles={handleAttachFiles}
            onDictate={handleDictate}
            dictationState={dictationState}
            onFilesResolved={(paths) => addAttachments(session.id, paths)}
            onRemoveAttachment={(attachmentId) => removeAttachment(session.id, attachmentId)}
            suggestionKeys={suggestionKeys}
            onSuggestionClick={(key) => handleDraftChange(t(`axetCodeHome.${key}` as Parameters<typeof t>[0]))}
            contextLabel={session.sapLabel}
            contextPath={session.cwd || workspaceDir}
            onOpenContextTerminal={
              session.cwd || workspaceDir
                ? () => onOpenChatTerminal(session.cwd || workspaceDir, session.sapLabel ?? session.title)
                : undefined
            }
            filesPanelOpen={filesPanelOpen}
            onToggleFilesPanel={session.cwd || workspaceDir ? () => setFilesPanelOpen((v) => !v) : undefined}
            filesPanel={
              // Panel yalnızca AÇIKKEN mount ediliyor: kapalıyken de yaşasaydı
              // her sohbet için bir dosya ağacı ve (görünürse) bir izleyici
              // boşuna ayakta kalırdı.
              filesPanelOpen ? (
                <ChatFilesPanel
                  rootDir={session.cwd || workspaceDir}
                  rootLabel={session.sapLabel ?? t("axetCodeHome.contextWorkspace")}
                  onClose={() => setFilesPanelOpen(false)}
                  active={active && activeId === session.id}
                />
              ) : undefined
            }
          />
        ))}

        {/* Hiçbir sohbet seçili değilken de EKRANDA AYNI ARAYÜZ var: boş bir
            sohbet. Uygulama açıldığında imleç zaten yazı kutusunda. */}
        <ChatSessionPane
          session={newSessionView}
          active={active && activeId === null}
          models={models}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          attaching={attaching}
          greeting={greetingText}
          registerTextarea={(el) => {
            if (activeId === null) textareaRef.current = el;
          }}
          onDraftChange={handleDraftChange}
          onSend={handleSend}
          onCancel={handleCancel}
          onSelectModel={handleSelectModel}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onAttachFiles={handleAttachFiles}
          onDictate={handleDictate}
          dictationState={dictationState}
          onFilesResolved={(paths) => addAttachments(NEW_SESSION_ID, paths)}
          onRemoveAttachment={(attachmentId) => removeAttachment(NEW_SESSION_ID, attachmentId)}
          suggestionKeys={suggestionKeys}
          onSuggestionClick={(key) => handleDraftChange(t(`axetCodeHome.${key}` as Parameters<typeof t>[0]))}
          contextLabel={effectiveNewBinding?.label ?? null}
          contextPath={effectiveNewBinding?.cwd || workspaceDir}
          onOpenContextTerminal={
            effectiveNewBinding
              ? () => onOpenChatTerminal(effectiveNewBinding.cwd, effectiveNewBinding.label)
              : workspaceDir
                ? () => onOpenChatTerminal(workspaceDir, t("axetCodeHome.contextWorkspace"))
                : undefined
          }
          filesPanelOpen={filesPanelOpen}
          onToggleFilesPanel={effectiveNewBinding?.cwd || workspaceDir ? () => setFilesPanelOpen((v) => !v) : undefined}
          filesPanel={
            filesPanelOpen ? (
              <ChatFilesPanel
                rootDir={effectiveNewBinding?.cwd || workspaceDir}
                rootLabel={effectiveNewBinding?.label ?? t("axetCodeHome.contextWorkspace")}
                onClose={() => setFilesPanelOpen(false)}
                active={active && activeId === null}
              />
            ) : undefined
          }
        />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("axetCodeHome.deleteConfirmTitle")}
        message={t("axetCodeHome.deleteConfirmMessage", {
          title: deleteTarget?.title ?? "",
          count: deleteTarget?.messages.length ?? 0
        })}
        confirmLabel={t("axetCodeHome.deleteConfirmButton")}
        onConfirm={() => deleteId && handleDeleteSession(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
