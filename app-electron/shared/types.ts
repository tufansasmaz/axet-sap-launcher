export interface SapService {
  uuid: string;
  systemId: string;
  name: string;
  type: string;
  host: string | null;
  port: number | null;
  raw: string;
  routerId: string | null;
  routerString: string | null;
  username: string | null;
  manualAdtUrl?: string | null;
  isManual?: boolean;
}

export interface SapItem {
  uuid: string;
  service: SapService | null;
}

export interface SapNode {
  uuid: string;
  name: string;
  nodes: SapNode[];
  items: SapItem[];
}

export interface SapLandscape {
  customers: SapNode[];
  sourceFile: string;
  loadedAt: string;
}

export type ConnectivityState = "unknown" | "checking" | "reachable" | "unreachable";

export interface ConnectivityResult {
  serviceUuid: string;
  state: ConnectivityState;
  message: string;
  latencyMs?: number;
}

export interface LastCredential {
  username: string;
  password: string;
  client: string;
}

export interface ConnectionHistoryEntry {
  uuid: string;
  connectedAt: string;
}

export type SystemTier = "DEV" | "QA" | "PRD";

export type TerminalMode = "cmd" | "powershell";

export type AppTheme = "dark" | "light";

export type AppLanguage = "tr" | "en";

// axet.code sohbet ekranının okuma konforu ayarları. Değerler kasten
// SEMBOLİK ("md") — piksel sayısı değil: gerçek karşılıkları tek yerde,
// `src/App.tsx`'te CSS değişkenlerine çevriliyor, böylece boyut değişince
// config şeması değil o tablo güncelleniyor.
export type ChatFontSize = "sm" | "md" | "lg";
export type ChatDensity = "compact" | "comfortable";

export interface AppConfig {
  projectsBaseDir: string;
  axetCommand: string;
  terminal: TerminalMode;
  landscapePathOverride: string | null;
  sapShcutPathOverride: string | null;
  lastCredentials: Record<string, LastCredential>;
  trustedCertificates: Record<string, string>;
  connectionHistory: ConnectionHistoryEntry[];
  systemTiers: Record<string, SystemTier>;
  systemComments: Record<string, string>;
  theme: AppTheme;
  language: AppLanguage;
  autoCheckUpdates: boolean;
  axetWorkspaceDir: string;
  // --- axet.code sohbet ekranı kişiselleştirmesi ---
  // Karşılamada görünecek ad ("Günaydın, Tufan"). Varsayılanı `defaultConfig()`
  // Windows oturum adından türetiyor; BOŞ bırakılırsa karşılama adsız hâline
  // düşer (kullanıcı adının ekranda görünmesini istemeyebilir).
  chatDisplayName: string;
  chatFontSize: ChatFontSize;
  chatDensity: ChatDensity;
  // Kenar çubuğunun AÇILIŞTAKİ hâli. Oturum içinde ☰ ile değiştirmek burayı
  // yazmaz — geçici daraltma kalıcı bir tercih değil.
  chatSidebarOpen: boolean;
  // Bağlayıcılar açıkken NE ZAMAN kurulacağı. Bkz. `ConnectorMode`. Eski
  // adları: `chatUseConnectors` (boolean) → `chatConnectorMode` → bu. İkinci
  // ad yanıltıcıydı: ayar artık sadece sohbeti değil, yapay zekâyla
  // konuşulan HER yüzeyi yönetiyor (bkz. connectorPolicy.ts). `store.ts`
  // her iki eski alanı da okuyup göç ettiriyor.
  connectorMode: ConnectorMode;
  // Kullanıcının "Bağlan" dediği sağlayıcılar. TEK ana anahtar bu: hiçbir
  // sağlayıcı bağlı değilse `connectorMode` ne olursa olsun bağlayıcı
  // kurulmaz. Eskiden ayrı bir "kapalı" kipi vardı ve aynı şeyi iki ayrı
  // yerden ifade etmek, kullanıcının ilk şikayetinin ("bağlandı diyor ama
  // olmuyor") tam kaynağıydı.
  connectorEnabled: Record<string, boolean>;
  // "Uygulama Bağlantıları" ekranındaki son doğrulama sonuçları, sağlayıcı
  // adına göre. KALICI olmalarının sebebi ölçülmüş bir şikayet değil, ekranın
  // kendisi: sonuç yalnızca React state'inde duruyordu, modal kapanınca
  // kayboluyordu ve kullanıcı "ben bunu test etmiş miydim" sorusuna
  // cevap veremiyordu.
  connectorLastResults: Record<string, ConnectorCheck>;
  // Entegrasyon (connection uuid) bazında ÖLÇÜLMÜŞ sağlık. Kullanıcının
  // düzenlediği bir ayar DEĞİL — turlar sırasında öğrenilip yazılıyor, bkz.
  // connectorHealth.ts. Amacı: aynı sağlayıcının bozuk kaydını her turda
  // yeniden denemenin bedelini (ölçülen: 6 sn) bir kez ödemek.
  connectorIntegrations: Record<string, ConnectorIntegrationHealth>;
  // axet-code'un kendi `connector_state.json`'ına BİZİM yazdığımız uuid'ler.
  // Ayrı tutulmasının tek sebebi sahiplik: o dosyada kullanıcının `ctrl+b`
  // diyaloğundan elle kapattıkları da var ve onlara asla dokunmuyoruz. Bu liste
  // olmasaydı "kim kapattı" sorusu cevapsız kalır, bir uuid düzeldiğinde ya
  // kullanıcının kapatmasını geri açar ya da kendi kapatmamızı asla
  // kaldıramazdık. Bkz. connectorHealth.ts.
  connectorAutoDisabled: string[];
}

export interface ConnectorIntegrationHealth {
  /** Araç adından çıkarılan sağlayıcı (`outlook`, `sharepoint`, …). */
  provider: string;
  state: "ok" | "error";
  /** Unix milisaniye — kayıtların eskimesi için (bkz. connectorHealth TTL). */
  seenAt: number;
}

export interface SystemCredentials {
  username: string;
  password: string;
  client: string;
}

export interface SapLogonOpenResult {
  ok: boolean;
  reason: "opened" | "missingHostOrPort" | "sapShcutNotFound" | "spawnError";
  detail?: string;
}

export interface ConnectRequest {
  customerPath: string[];
  service: SapService;
  credentials: SystemCredentials;
}

export interface ConnectResult {
  ok: boolean;
  projectDir: string;
  message: string;
  verified: boolean;
  trustedCertificates?: Record<string, string>;
  effectiveClient?: string;
}

export interface CredentialDefaults {
  username: string;
  password: string;
  client: string;
}

// --------------------------- Aktif Bağlam ---------------------------
// Uygulamanın üç ekranı (axet.code, SAP Launcher, SAP GUI Scripting) uzun
// süre birbirinden habersiz üç ayrı adaydı. Kullanıcı isteği (2026-09-04):
// *"bu 3 farklı uygulamayı tek bir yere toplamış gibi / birbiriyle haberleri
// olsun"*. Bu tip, üçünün de okuduğu O TEK ortak gerçeği taşıyor.
//
// ŞİFRE YOK. Bağlam ekranda gösteriliyor ve ajanın prompt'una giriyor;
// kimlik bilgisi zaten `.conn_adt`'ta ve `secureStorage`'da, buraya bir
// kopyası daha çıkmamalı.

/** SAP Launcher'ın BAŞARIYLA bağlandığı sistem. Tek yazarı `system:connect`. */
export interface ActiveSapContext {
  uuid: string;
  systemId: string;
  systemName: string;
  /** Landscape ağacındaki yol — ekranda "Müşteri › Klasör" olarak gösteriliyor. */
  customerPath: string[];
  /** SapService.host gibi null olabilir (BTP/Cloud girdilerinde host yok). */
  host: string | null;
  client: string;
  username: string;
  tier: SystemTier | null;
  projectDir: string;
  connectedAt: string;
  /** Bağlantı gerçekten doğrulanabildi mi (bkz. ConnectResult.verified). */
  verified: boolean;
}

/** SAP GUI Scripting ekranının o an baktığı canlı oturum. Tek yazarı o ekran. */
export interface ActiveGuiContext {
  connectionIndex: number;
  sessionIndex: number;
  systemName?: string;
  client?: string;
  user?: string;
  transaction?: string;
  program?: string;
  title?: string;
  updatedAt: string;
}

export interface ActiveContext {
  sap: ActiveSapContext | null;
  gui: ActiveGuiContext | null;
}

export interface SystemCommentDefaults {
  comment: string;
  source: "saved" | "sapLogon" | "none";
}

export type ManualSystemType = "onprem" | "cloud";

export interface ManualSystem {
  id: string;
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
  createdAt: string;
}

export interface AddManualSystemInput {
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
}

export interface ManualSystemsExportResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export interface ManualSystemsImportResult {
  ok: boolean;
  canceled?: boolean;
  imported?: number;
  skipped?: number;
  total?: number;
  error?: string;
}

export interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedAt: string;
}

export interface FsListDirResult {
  ok: boolean;
  entries?: FsEntry[];
  error?: string;
}

/**
 * Composer'daki `@` dosya bahsi için arama sonucu (bkz. fsExplorer.ts
 * `searchFiles`).
 *
 * `FsEntry` KULLANILMIYOR: orada `size`/`modifiedAt` var ve ikisi de her
 * dosya için ayrı bir `stat` demek. Menüde gösterilen tek şey yol olduğu
 * için arama bu bilgileri hiç toplamıyor.
 */
export interface FsSearchFilesEntry {
  /** Mutlak yol — ajana verilecek olan. */
  path: string;
  /** Köke göre göreli yol — menüde gösterilen. */
  rel: string;
}

export interface FsSearchFilesResult {
  ok: boolean;
  entries: FsSearchFilesEntry[];
  error?: string;
}

export interface FsReadTextResult {
  ok: boolean;
  content?: string;
  truncated?: boolean;
  error?: string;
}

export interface FsWriteTextResult {
  ok: boolean;
  error?: string;
}

export interface FsReadDocxResult {
  ok: boolean;
  html?: string;
  error?: string;
}

export interface FsReadImageResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

export interface FsImportFilesResult {
  ok: boolean;
  imported?: number;
  skippedDirs?: string[];
  error?: string;
}

export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  phase: UpdatePhase;
  version?: string;
  percent?: number;
  message?: string;
}

// axet.code'un kendi model seçimi — `axet-code models` çıktısından (provider/model
// satırları) ve `%LOCALAPPDATA%\axet-code\axet-code.json`daki `models.large`/
// `models.small` alanlarından türetiliyor. Bu, uygulamanın kendi AppConfig'inden
// TAMAMEN AYRI — axet-code CLI'ının kendi global config dosyası, launcher sadece
// okuyup/yazıyor (bkz. app-electron/main/axetModels.ts).
export interface AxetModelEntry {
  provider: string;
  model: string;
}

export type AxetModelKind = "large" | "small";

export interface AxetModelConfig {
  large: AxetModelEntry | null;
  small: AxetModelEntry | null;
}

export interface AxetModelsListResult {
  ok: boolean;
  models: AxetModelEntry[];
  error?: string;
}

export interface AxetModelConfigResult {
  ok: boolean;
  config: AxetModelConfig | null;
  error?: string;
}

// axet.code sohbet ekranı (bkz. AxetCodeHome.tsx) artık `axet-code`'un gerçek
// interaktif TUI'sini (canlı terminal) göstermiyor — kullanıcı isteğiyle
// (ChatGPT tarzı özgün bir arayüz), her mesaj `axet-code run` (stateless,
// tek-atış) modu ile main process'te ayrı bir process olarak çalıştırılıyor.
// Bu modda oturum hafızası CLI seviyesinde YOK — bu yüzden bağlamı biz
// (transcript'i her çağrıda prompt'a gömerek) koruyoruz (bkz. axetChat.ts).
export interface AxetChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Cevap beklenirken alt süreçte NE olduğu.
 *
 * Kullanıcı isteği (2026-09-04): *"arkada bişey yaparken uzun süre chatdeki
 * çubuklar yanıp sönüyor ... onları da görsek fena olmaz"*. Kaynak, `axet-code
 * run -v`'nin stderr'e CANLI yazdığı INFO satırları (zaman damgalarıyla
 * doğrulandı) — ham log satırını arayüze taşımak yerine burada sayılabilir bir
 * aşamaya indirgiyoruz, çünkü metnin kendisi İngilizce ve sürüme bağlı.
 *
 * `thinking` diğerlerinden farklı: axet-code denetim kaydını yazdıktan SONRA
 * cevap gelene kadar hiçbir şey yazmıyor (ölçüldü: 12 saniyeye kadar tam
 * sessizlik). Yani bu, "bilmiyoruz"un dürüst adı — arayüz onun yanında geçen
 * süreyi sayıyor.
 *
 * `tool`/`toolResult` yalnızca KALICI OTURUM kipinde (axetChatTui.ts) düşüyor
 * ve tam olarak o sessizliği dolduruyor: `run -v`'nin stderr'i araç
 * çağrılarını hiç yazmaz, ama axet-code'un kendi oturum veritabanı yazar.
 */
export type AxetChatActivityPhase =
  | "starting"
  | "connectors"
  | "skills"
  | "agent"
  | "session"
  | "indexing"
  | "thinking"
  | "tool"
  | "toolResult"
  // Tur, axet-code tarafında kurtarılamaz bir arızaya düştü (yetki/403,
  // bağlam sınırı) ve oturum yenilenip mesaj yeniden gönderiliyor.
  | "restarting"
  // Ajan `ask_user` aracıyla soru sordu; tur, kullanıcı bir seçenek seçene
  // kadar DURUYOR (bkz. axetChatTui.ts `ASK_USER_TOOL`).
  | "askUser"
  | "finishing";

/**
 * Tek bir etkinlik olayı.
 *
 * Eskiden bu bir `(phase, detail)` ikilisiydi ve `detail` yalnızca aracın ADINI
 * taşıyordu — arayüz "Dosya okuyor" diyebiliyor ama HANGİ dosyayı okuduğunu
 * söyleyemiyordu. Kullanıcı isteği (2026-09-04) bunun terminaldeki gibi
 * olması: çağrı satırı + altında sonuç satırı. Bu yüzden olay artık bir nesne;
 * yeni bir alan eklemek imza değiştirmeyi gerektirmiyor.
 */
export interface AxetChatActivity {
  phase: AxetChatActivityPhase;
  /**
   * Araç çağrısının kimliği (`toolu_bdrk_…`). `toolResult` satırını kendi
   * çağrısına bununla bağlıyoruz — araç ADI yetmez, aynı araç bir turda
   * birden fazla kez çağrılabiliyor.
   */
  callId?: string;
  /** Araç adı — `view`, `bash`, `mcp:outlook_read`. */
  tool?: string;
  /** Aracın ÜZERİNDE çalıştığı şey: dosya yolu, komut, desen, sorgu. */
  target?: string;
  /** Sonucun ilk satırı, kısaltılmış. */
  result?: string;
  /** İlk satırdan sonra kaç satır daha geldiği — "+12 satır" için. */
  extraLines?: number;
  /**
   * Aracın TAM çıktısı (4000 karakterde kırpılmış, `<result>` sarmalayıcısı
   * atılmış). `result` yalnızca ilk satır; "12 satır daha var" demek ama o
   * satırları göstermemek, kullanıcıyı bilginin varlığından haberdar edip
   * erişimini kapatmak olurdu.
   */
  output?: string;
  /**
   * Dosya değişikliğinin farkı — `-`/`+` ön ekli satırlar. Yalnızca
   * `edit`/`multiedit`/`write` araçlarında dolu.
   *
   * Aracın SONUCU bunu vermiyor ("Content replaced in file: …" diyor, ne
   * değiştiğini söylemiyor); fark, araç GİRDİSİNDEKİ old_string/new_string
   * çiftinden üretiliyor (bkz. axetChatTui.ts `buildDiff`).
   */
  diff?: string;
  /** Sonuç bir hata mı (araç patladı ya da entegrasyon bozuk). */
  failed?: boolean;
  /**
   * `askUser` aşamasında: ajanın sorusu ve seçenekleri.
   *
   * `options` SIRASI ÖNEMLİ — arayüzdeki düğmenin dizini, TUI'deki soru
   * kutusunda kaç kez aşağı okuna basılacağını belirliyor (ölçüm: kutu ilk
   * satır seçili açılıyor, `↓ next` bir satır ilerletiyor, `enter confirm`
   * onaylıyor). Yani sıra bozulursa yanlış seçenek onaylanır.
   */
  question?: string;
  /** Sorunun kısa başlığı (`ask_user` girdisindeki `header`); olmayabilir. */
  header?: string;
  options?: string[];
  /**
   * Birden fazla şık işaretlenebilir mi (`ask_user` girdisindeki
   * `multi_select`). Kart bu bayrakla kutucuklu çiziliyor ve cevap bir DİZİ
   * dizin olarak dönüyor (bkz. axetChatTui.ts `answerTuiQuestion`).
   */
  multiSelect?: boolean;
}

/**
 * Ajanın kendi planındaki tek bir madde (`sessions.todos`, bkz.
 * axetSessionDb.ts `sessionTodos`).
 */
export interface AxetTodo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

/**
 * Tur SÜRERKEN gelen "durum" bilgisi — etkinlik akışından AYRI bir kanal.
 *
 * `AxetChatActivity` bir OLAY dizisi ("şu araç çağrıldı, sonucu şu"); burada
 * ise her seferinde tam durum taşınıyor ("plan şu an bu, bağlam bu kadar
 * dolu"). İkisini tek tipte birleştirmek, plan her güncellendiğinde araç
 * dökümüne anlamsız bir satır daha eklemek olurdu.
 *
 * Maliyet (`sessions.cost`) BİLİNÇLİ olarak yok: canlı veritabanında bu sütun
 * her oturumda 0 (ölçüm 2026-09-05). Kurumsal portal üzerinden çalışırken
 * sağlayıcı fiyat bildirmiyor, yani ekranda gösterilecek tek şey kalıcı bir
 * "0,00 $" olurdu — bu bir bilgi değil, uydurma bir rakam.
 */
export interface AxetChatProgress {
  todos: AxetTodo[];
  /** Son isteğin bağlam doluluğu (girdi + çıktı jetonu). */
  contextTokens: number;
  /** Modelin bağlam penceresi — yüzdeyi arayüzde hesaplamak için. */
  contextLimit: number;
}

/**
 * "Durdur"un gerçekte ne yaptığı (bkz. axetChatTui.ts `cancelTui`).
 *
 * Ayrı bir olay, çünkü cevabın kendisinden 1–4 saniye SONRA belli oluyor:
 * esc yazılıyor, sonra axet-code'un veritabanına bakılıp turun gerçekten
 * kesilip kesilmediği doğrulanıyor. Eskiden bu doğrulamanın sonucu yalnızca
 * günlüğe yazılıyordu — kullanıcı "durdurdum" sanırken tur arkada üretmeye
 * devam ediyor ve jeton harcıyordu.
 */
export interface AxetChatCancelVerdict {
  /** Tur gerçekten durdu mu? `false` = arkada üretmeye devam ediyor. */
  stopped: boolean;
  /** Veritabanındaki bitiş sebebi (`canceled` / `end_turn` / ...), yoksa `null`. */
  reason: string | null;
}

export interface AxetChatSendResult {
  ok: boolean;
  text: string;
  error?: string;
  cancelled?: boolean;
  /**
   * Bu mesaj bağlayıcılar AÇIKKEN mi çalıştırıldı? `auto` kipinde karar bir
   * TAHMİNDİR ve tahmin yanılabilir — bu alan olmasa yanılgı sessiz olurdu:
   * kullanıcı "neden mailime bakmadı" ya da "neden bu kadar yavaştı" diye
   * sorar, cevabı hiçbir yerde yazmaz. Sohbet balonunda gösteriliyor.
   */
  usedConnectors?: boolean;
  /**
   * Bu cevap alınmadan önce axet-code oturumu YENİLENDİYSE sebebi.
   *
   * Kullanıcıya söylenmesi gerekiyor (istek, 2026-09-05: *"eğer arka planda 403
   * hatasıyla karşılaşırsa bilgi verilip tekrardan başlatılsın ve devam
   * etsin"*). Sessiz bir yeniden başlatma, ajanın oturum belleğini kaybettiğini
   * gizlerdi: cevap gelir ama "az önce konuştuğumuz şey" artık orada değildir.
   *
   * Metin DEĞİL anahtar taşınıyor; çeviri arayüzde yapılıyor.
   */
  restartedReason?: "auth" | "context" | "provider";
}

// --- Sohbet geçmişinin DİSKTE saklanan hâli (bkz. chatStore.ts) ---
// `config.json`'dan AYRI bir dosyada tutuluyor: sohbet geçmişi zamanla
// megabaytlara çıkabilir, config ise her ayar değişikliğinde baştan
// yazılıyor — ikisini aynı dosyada tutmak her tema değişiminde tüm sohbet
// geçmişini yeniden serileştirmek demek olurdu.
//
// `pending`/`requestId`/`streaming` BİLİNÇLİ olarak yok: bunlar çalışan bir
// `axet-code` process'ine işaret ediyor ve o process uygulama kapanınca
// ölüyor. Diske yazılsalardı yeniden açılışta sonsuza kadar "düşünüyor"
// durumunda kalan hayalet sohbetler olurdu.
// Sohbete iliştirilen tek bir dosya. Eskiden ekler, dosya YOLU olarak
// doğrudan taslak metnine yazılıyordu — kullanıcı geri bildirimi (2026-09-02):
// *"görsel eklemeyi dosya eklemeyi falan direkt eklesek olmaz mı, yolu
// gitmesin"*. Artık yol mesaj metninin bir parçası DEĞİL, ayrı bir alan:
// ekranda çip/küçük resim olarak görünüyor, `axet-code`'a giden prompt'un
// sonuna ise gönderim anında ekleniyor (bkz. AxetCodeHome
// `promptWithAttachments`).
//
// Önizleme (`data:` URL'i) BİLEREK burada yok ve diske YAZILMIYOR: bir
// ekran görüntüsü base64 olarak birkaç megabayt tutar ve sohbet geçmişi
// dosyasını şişirirdi. Önizleme, çipi çizen bileşen tarafından yoldan
// yeniden okunuyor (bkz. AttachmentChip).
export interface ChatAttachment {
  id: string;
  // Diskteki GERÇEK yol — TIRNAKSIZ. Tırnaklama yalnızca prompt'a
  // yazılırken yapılıyor; burada tırnaklı tutmak `existsSync`/okuma
  // çağrılarını sessizce bozardı.
  path: string;
  name: string;
}

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  createdAt: number;
  attachments?: ChatAttachment[];
  /**
   * Bu cevap üretilirken çalışan araçlar, sırayla.
   *
   * DİSKE DE YAZILIYOR, çünkü asıl mesele kalıcılık: araç dökümü eskiden
   * yalnızca bekleme göstergesinde anlık görünüyor, tur bitince buharlaşıyordu
   * — ajanın hangi dosyayı okuduğu, ne çalıştırdığı, ne bulduğu hiçbir yerde
   * kalmıyordu. Uygulama kapanınca da kaybolsaydı yarım bir çözüm olurdu.
   *
   * Yalnızca `phase === "tool"` olan olaylar tutuluyor; `toolResult` olayları
   * kendi çağrılarının üstüne (`result`/`extraLines`/`failed`) işleniyor.
   */
  steps?: AxetChatActivity[];
  /**
   * Bu cevap, uygulama tur ortasında kapandığı için YARIDA KALDI ve axet-code'un
   * veritabanından geri getirildi (bkz. axetChatRecovery.ts).
   *
   * Diske de yazılıyor: not bir kez gösterilip kaybolursa, kırpılmış bir cevap
   * bir sonraki açılışta tam bir cevap gibi görünürdü. Sessiz kaybı sessiz bir
   * yanlış bilgiyle değiştirmek olurdu.
   */
  interrupted?: boolean;
}

export interface StoredChatSession {
  id: string;
  title: string;
  messages: StoredChatMessage[];
  model: AxetModelEntry | null;
  draft: string;
  // Henüz gönderilmemiş ekler — taslak metni gibi, uygulama kapanıp
  // açıldığında composer'da yerinde dursun diye.
  attachments?: ChatAttachment[];
  // Bu sohbetin ÇALIŞMA KLASÖRÜ. Bir SAP sistemine bağlanınca açılan sohbet,
  // o bağlantının proje klasörüne bağlanıyor — `.conn_adt` ve `sap-context.md`
  // orada duruyor (bkz. launcher.ts), yani ajan SAP bağlamını ancak bu klasörde
  // çalışırsa görüyor. Yoksa genel çalışma alanı (`config.axetWorkspaceDir`)
  // kullanılır; eski geçmiş dosyalarında bu alan hiç yok, o yüzden opsiyonel.
  cwd?: string;
  // Yalnızca GÖRSEL etiket ("Müşteri · S4D") — sohbetin tepesindeki rozette
  // hangi sisteme bağlı olduğunu göstermek için. Bağlantı kimliği değil.
  sapLabel?: string;
  // Kullanıcının elle oluşturduğu projeye aidiyet (bkz. ChatProject). SAP
  // sistemine göre OTOMATİK gruplama `cwd` üzerinden ayrıca sürüyor; ikisi
  // çakışırsa kenar çubuğunda proje kazanıyor, çünkü bu alan bilinçli bir
  // seçim, `cwd` ise bağlantının yan ürünü.
  projectId?: string;
  // Kenar çubuğunda "SAP sohbetleri" altına DEĞİL, "Sohbetler" altına düşsün.
  //
  // Kullanıcı isteği (2026-09-06): *"yeni sohbet dediğimde sohbetlerde açacak,
  // sistem bağlantısını görebilir görmeyebilir o sohbette ama sohbetlerde
  // kalacak"*. Yani gruplama artık `cwd`'nin dolu olmasına değil, sohbetin
  // NASIL DOĞDUĞUNA bakıyor: bir sisteme bağlanınca (ya da bir sistem
  // grubundaki "+" ile) doğan sohbet sistemine, elle "Yeni sohbet" ile doğan
  // sohbet genele gidiyor. `cwd` her iki durumda da aynı kalıyor — ajanın
  // çalışma klasörü işlevsel bir şey, listedeki yer ise düzenleme.
  //
  // Yalnızca `true` yazılıyor; alanın HİÇ olmaması "eski davranış" demek, o
  // yüzden bu iş öncesinde kaydedilmiş sohbetler sistem gruplarında kalıyor.
  keepInGeneral?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Kullanıcının kendi eliyle oluşturduğu sohbet projesi (ChatGPT'deki
 * "Projects" karşılığı). SAP sistem grupları bundan AYRI ve otomatik.
 *
 * `instructions`: projedeki sohbetlerin HER turunda, gönderilen metnin başına
 * eklenen kalıcı bağlam (bkz. AxetCodeHome.tsx `withProjectInstructions` —
 * tek turda eklemenin neden kaybolduğu orada yazıyor). Klasör bazlı
 * `AGENTS.md`'den (bkz. ChatInstructionsDialog.tsx) farkı: o dosya KLASÖRE
 * ait ve axet-code onu süreç açılışında kendi okuyor; bu ise sohbetin
 * kendisine ait, aynı klasörde farklı projelerden sohbetler olabiliyor ve
 * prompt'a biz ekliyoruz. Bedeli her turda talimat kadar jeton; bu yüzden
 * chatStore.ts 8000 karakterde kesiyor.
 */
export interface ChatProject {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatSessionsState {
  activeId: string | null;
  sessions: StoredChatSession[];
  // Eski geçmiş dosyalarında bu alan hiç yok — okurken boş diziye düşüyor,
  // o yüzden sürüm yükseltmesi gerekmedi.
  projects?: ChatProject[];
}

export interface ChatSessionsLoadResult {
  ok: boolean;
  state: ChatSessionsState;
  // Dosya bozuksa: bozuk dosya `.corrupt-<zaman>` olarak KENARA ALINIR ve
  // burada bildirilir — sessizce üzerine yazıp geçmişi yok etmek yerine.
  recoveredFrom?: string;
  error?: string;
}

// axet.code sohbet ekranına sürükle-bırakılan/yapıştırılan, diskte gerçek
// bir yolu OLMAYAN ham dosyalar (bkz. chatAttachments.ts) için — main
// process bunları uygulamanın kendi klasörüne yazıp gerçek bir yol döner.
export interface ChatAttachmentSaveResult {
  ok: boolean;
  path?: string;
  error?: string;
}

// Bir ekin composer'da/mesajda gösterilecek küçük resmi. Renderer bu dosyayı
// KENDİSİ okuyamaz: dev'de sayfanın kaynağı `http://localhost:5173`, oradan
// `file://` bir görsele erişmek engelli. Bu yüzden main process okuyup
// `data:` URL'i döndürüyor.
export interface ChatAttachmentPreviewResult {
  ok: boolean;
  // Sadece görsellerde dolu. Görsel olmayan (ya da çok büyük/okunamayan) bir
  // dosyada `ok: true` ama `dataUrl` YOK — çip ikonla çizilir, bu bir hata
  // değil.
  dataUrl?: string;
  error?: string;
}

// axet.flows — AI destekli Node-RED uyumlu flow builder modülü (bkz.
// AxetFlowsHome.tsx, src/flows/). Flow'un kendisi (node/wire modeli),
// runtime/debug event'leri ve validasyon sonuçları esnek/JSON-şekilli
// olduğu için (kaynak: axetflow projesindeki plain-JS FlowModel/
// flowRuntime.js, TypeScript'e taşınmadı — bkz. PROJE-BILGI.md) burada
// bilerek gevşek (index signature'lı) tipler kullanılıyor; asıl doğrulama
// JS tarafında (nodeCatalog.js/flowDiagnostics.js) yapılıyor.
export type FlowJsonValue = Record<string, unknown>;

export interface FlowAgentStepResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export interface FlowRuntimeStatus {
  running: boolean;
  port: number | null;
  httpRoutes?: Array<{ id: string; url?: string; method?: string }>;
}

export interface FlowDeployResult extends FlowRuntimeStatus {
  ok: boolean;
  blocked?: boolean;
  issues?: FlowJsonValue[];
  error?: string;
}

export interface FlowValidateResult {
  ok: boolean;
  blocking?: boolean;
  issues?: FlowJsonValue[];
  error?: string;
}

export interface FlowTriggerInjectResult {
  ok: boolean;
  msgId?: string;
  error?: string;
}

export interface FlowTestRequestPayload {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface FlowTestRequestResult {
  ok: boolean;
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
  error?: string;
}

export interface FlowJsonFileResult {
  canceled: boolean;
  filePath?: string;
  content?: string;
  error?: string;
}

// Sohbeti dosyaya yazma sonucu. `canceled` ve `error` AYRI: kullanıcının
// diyaloğu kapatması bir hata değil, bunu ayırmayan bir sonuç tipinde
// "kaydedilemedi" uyarısı iptal edildiğinde de çıkardı.
// Sohbet dışa aktarmasının iki biçimi tek pakette gidiyor. Kullanıcı biçimi
// kaydetme kutusunun "dosya türü" listesinden seçiyor, yani seçim ana süreçte
// öğreniliyor — renderer hangisinin isteneceğini önceden bilemiyor.
export interface ChatExportPayload {
  /** Tam arşiv: araç dökümleri kırpılmadan. */
  markdown: string;
  /** Baskıya hazır bağımsız belge (bkz. src/lib/chatPrint.ts). */
  html: string;
}

export interface ChatExportResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

// SAP GUI Scripting — bağımsız bir Activity (bkz. SapGuiScriptingHome.tsx).
// `connectToSystem()`/.conn_adt akışına HİÇ bağlı değil: kullanıcının o an
// AÇIK olan bir SAP Logon/SAP GUI penceresine (win32com COM otomasyonu
// üzerinden) bağlanır. Köprü (`sap_gui_scripting_bridge.py`, gömülü Python+
// pywin32 runtime'ıyla, bkz. embeddedRuntime.ts/sapGuiScriptManager.ts) yerel
// bir HTTP+JSON sunucusu — main process bu köprüye `node:http` ile konuşur,
// renderer'a sadece IPC üzerinden zaten-ayrıştırılmış JSON döner.
export interface GuiScriptBridgeStatus {
  running: boolean;
  port: number | null;
  external: boolean;
}

export interface GuiScriptStartResult {
  ok: boolean;
  running: boolean;
  port: number | null;
  message: string;
}

export interface GuiScriptConnectionInfo {
  index: number;
  description: string;
  sessionCount: number;
}

export interface GuiScriptSessionInfo {
  index: number;
  id: string;
  busy: boolean;
  info: Record<string, string | number | boolean>;
}

export interface GuiScriptComponentSummary {
  id: string;
  type: string;
  name: string;
  text?: string;
  hasChildren: boolean;
}

export interface GuiScriptGridData {
  kind: "alv" | "table-control";
  /** SAP'nin bildirdiği GERÇEK satır sayısı — `rows.length` kırpılmış olabilir. */
  rowCount: number;
  /** SAP'nin bildirdiği GERÇEK sütun sayısı — `columns.length` kırpılmış olabilir. */
  columnCount?: number;
  columns: string[];
  rows: Record<string, string | number | boolean>[];
  /**
   * `rows[0]`'ın GERÇEK satır numarası. Grid artık pencere pencere okunuyor
   * (bkz. bridge'teki `GRID_DEFAULT_ROWS`), yani ikinci sayfanın ilk satırı
   * "0. satır" DEĞİLDİR — `doubleClick(row, col)` o numarayı istediği için
   * bu offset olmadan yanlış satır açılır.
   */
  rowOffset?: number;
  truncated: boolean;
  columnsTruncated?: boolean;
}

export interface GuiScriptComponentDetail {
  id: string;
  type: string;
  name: string;
  text?: string;
  tooltip: string;
  changeable: boolean | null;
  subType: string;
  // Denetçinin okuduğu TÜM özellikler (Left/Top/Width/Height geometrisi,
  // MaxLength, IconName, RowCount… — bkz. bridge'teki DETAIL_PROPERTIES).
  // Hiçbiri her eleman tipinde var DEĞİL; sadece gerçekten okunabilenler
  // gelir, bu yüzden alanlar isteğe bağlı bir sözlük olarak taşınıyor.
  properties?: Record<string, string | number | boolean>;
  children: GuiScriptComponentSummary[];
  grid?: GuiScriptGridData;
}

// Preflight — "neden çalışmıyor" sorusunu TAHMİN ETMEK YERİNE ÖLÇEN teşhis.
// Win32 seviyesindeki SAP oturum penceresi sayısı ile scripting engine'in
// bildirdiği oturum sayısı KARŞILAŞTIRILIR: pencere var + oturum yok =
// scripting kapalı (kesin teşhis). Bridge tarafında `/preflight`, scripting
// tamamen kapalıyken de cevap verebilmesi için COM guard'ının DIŞINDA.
export type GuiScriptPreflightRecommendation =
  | "ready"
  // Sunucu reddediyor (GuiConnection.DisabledByServer). İstemci ayarı zaten
  // açık — bu ayrım olmadan kullanıcı boşuna Alt+F12 ayarlarıyla uğraşıyor.
  | "serverScriptingDisabled"
  | "scriptingDisabled"
  | "sapNotRunning"
  | "sapGuiMissing";

export interface GuiScriptPreflightConnection {
  index: number;
  description: string;
  sessions: number;
  /** null = bu GUI sürümü bayrağı bildirmiyor (false DEĞİL, "bilinmiyor"). */
  disabledByServer: boolean | null;
}

export interface GuiScriptPreflight {
  sapGuiInstalled: boolean;
  sapRunning: boolean;
  classicWindows: number;
  scriptingAttachable: boolean;
  sessions: number;
  connections: number;
  disabledByServer: boolean;
  connectionDetails: GuiScriptPreflightConnection[];
  guiVersion?: string;
  windows: { handle: number; title: string }[];
  recommendation: GuiScriptPreflightRecommendation;
  scriptingError?: string;
  screenshotFallback: boolean;
  screenshotFallbackError?: string;
}

export interface GuiScriptPreflightResult {
  ok: boolean;
  preflight?: GuiScriptPreflight;
  error?: string;
}

// Durum çubuğu — S(uccess)/W(arning)/E(rror)/A(bort)/I(nformation).
// E ve A GERÇEK hatadır: bu okuma olmadan SAP'nin reddettiği bir aksiyon
// UI'da "başarılı" görünür (aksiyon COM seviyesinde başarılı olur ama SAP
// işlemi kabul etmemiştir).
export interface GuiScriptStatusBar {
  type: string;
  text: string;
  messageId: string;
  messageNumber: string;
}

export interface GuiScriptPopupButton {
  id: string;
  text: string;
  tooltip: string;
}

export interface GuiScriptPopupInfo {
  id: string;
  title: string;
  text: string;
  buttons: GuiScriptPopupButton[];
}

// Bir aksiyondan SONRA tek çağrıda okunan ekran durumu — UI her aksiyondan
// sonra bunu tazeler (durum çubuğu, popup, hangi transaction/ekran).
// Standart araç çubuğundaki bir tuş ve o EKRANDAKİ durumu. `enabled:false`
// olan bir tuşa `sendVKey` göndermek SAP tarafından 617 ile reddediliyor —
// bu liste sayesinde UI tuşu önceden soluk gösterebiliyor. `tooltip` SAP'nin
// kendi, oturum dilindeki etiketi. Listede OLMAYAN bir vkey "kapalı" değil
// "bilinmiyor" demektir (ör. alan içindeki F4 araç çubuğunda görünmez).
export interface GuiScriptToolbarKey {
  vkey: number;
  enabled: boolean;
  tooltip: string;
}

export interface GuiScriptScreenState {
  transaction?: string;
  program?: string;
  screenNumber?: number;
  systemName?: string;
  client?: string;
  user?: string;
  busy?: boolean;
  windowId?: string;
  windowType?: string;
  title?: string;
  isPopup?: boolean;
  popup?: GuiScriptPopupInfo;
  statusBar?: GuiScriptStatusBar;
  okCode?: string;
  toolbarKeys?: GuiScriptToolbarKey[];
}

export interface GuiScriptScreenResult {
  ok: boolean;
  screen?: GuiScriptScreenState;
  error?: string;
}

// Ekran görüntüsü. `window` Win32 PrintWindow (SCRIPTING KAPALI OLSA BİLE
// çalışır, COM'a hiç dokunmaz, ve seçili eleman çerçevesi ancak burada
// çizilebilir); `hardcopy` SAP'nin kendi yakalaması — bağlı bir oturum şart
// ve SAP penceresini öne fırlatabiliyor. `auto` bu yüzden ÖNCE window'u dener.
export type GuiScriptScreenshotMethod = "auto" | "hardcopy" | "window";

export interface GuiScriptScreenshotResult {
  ok: boolean;
  dataUrl?: string;
  method?: "hardcopy" | "window";
  bytes?: number;
  // SADECE `window` yönteminde gelir: yakalanan görüntünün sol üst köşesinin
  // MUTLAK ekran koordinatı. Elemanların `screenLeft`/`screenTop` değeri de
  // mutlak olduğu için seçili elemanın çerçevesi görüntü üzerine tahminsiz
  // çizilebiliyor. HardCopy'de böyle bir köken bilgisi yok → çerçeve yok.
  originLeft?: number;
  originTop?: number;
  width?: number;
  height?: number;
  error?: string;
}

export interface GuiScriptListResult<T> {
  ok: boolean;
  items?: T[];
  error?: string;
}

export interface GuiScriptNodeResult {
  ok: boolean;
  node?: GuiScriptComponentDetail;
  error?: string;
}

// `navigate` (komut alanına /n<tcode> + Enter) ve `popupChoice`
// (enter/yes/no/cancel) AYRI birer uç nokta DEĞİL, bilerek birer aksiyon:
// böylece kaydedici/oynatıcı (Faz 2) bunları hiçbir özel durum kodu olmadan
// kaydedip tekrar oynatabiliyor.
export type GuiScriptActionKind =
  | "setText"
  | "press"
  | "select"
  | "sendVKey"
  | "selectContextMenuItem"
  | "doubleClick"
  | "navigate"
  | "popupChoice";

export interface GuiScriptActionPayload {
  action: GuiScriptActionKind;
  id?: string;
  value?: string;
  vkey?: number;
  /** ALV grid'de `doubleClick` — 0 tabanlı satır. Grid'de zorunlu. */
  row?: number;
  /** ALV grid'de `doubleClick` — sütun adı; verilmezse ilk sütun. */
  column?: string;
  /** `selectContextMenuItem` — menü öğesi neye göre seçilsin. */
  by?: "text" | "code" | "position";
}

export interface GuiScriptActionResult {
  ok: boolean;
  // Aksiyondan SONRAKİ ekran durumu (durum çubuğu dahil). Okunamazsa
  // aksiyon yine de başarılıdır — okuma hatası aksiyonu başarısız göstermez.
  screen?: GuiScriptScreenState;
  /**
   * Köprünün aksiyondan sonraki HAZIR OLMA beklemesi (bkz. bridge'teki
   * `_settle`). Beklemenin köprüde yapılması gerekiyor: oturum nesnesi orada
   * ve HTTP turu yok. Oynatıcı bunun üzerine adımlar arasına ayrıca uyku
   * KOYMAZ — canlı ölçümde (S4D/SE16N, 2026-09-03) sıfır beklemeyle arka
   * arkaya gönderilen 10 adımın tamamı geçti ve `busySeen` bir kez bile
   * doğru olmadı: SAP GUI Scripting çağrısı zaten senkron, sunucu turu
   * çağrının İÇİNDE bitiyor.
   * `settled: false` = köprü 3 sn bekledi, oturum hâlâ meşgul; bir sonraki
   * adım meşgul bir oturuma gidecek demektir.
   */
  settle?: { waitedMs: number; busySeen: boolean; settled: boolean };
  error?: string;
}

// Faz 2 — Kayıt + Tekrar Oynatma (RPA). Faz 1'deki `performAction` primitive'i
// üzerine inşa edildi: kayıt modu açıkken UI'dan tetiklenen HER başarılı
// aksiyon bir `GuiScriptRecordedStep` olarak biriktirilir; bir script en
// az bir isim ve adım dizisinden oluşur, JSON dosyası olarak diske
// kaydedilip (flows:saveJson/openJson ile AYNI dialog-tabanlı desen, bkz.
// main/index.ts) tekrar açılıp oynatılabilir.
export interface GuiScriptRecordedStep {
  action: GuiScriptActionKind;
  id?: string;
  value?: string;
  vkey?: number;
  // Aksiyonun ÇALIŞMASI için gereken her alan kayda girmeli. `row`/`column`
  // ve `by` başta unutulmuştu: ALV'de çift tıklama satır+sütun olmadan,
  // sağ tık menüsü de seçim yöntemi olmadan tekrar oynatılamıyordu —
  // kaydedilen adım, kaydedildiği anda çalışan adımın aynısı olmuyordu.
  row?: number;
  column?: string;
  by?: "text" | "code" | "position";
  label: string;
}

export interface GuiScriptScript {
  name: string;
  createdAt: number;
  steps: GuiScriptRecordedStep[];
}

export interface GuiScriptJsonFileResult {
  canceled: boolean;
  filePath?: string;
  content?: string;
  error?: string;
}

export interface GuiScriptPlaybackStepResult {
  index: number;
  ok: boolean;
  error?: string;
  /**
   * Adım başarılı ama oturum köprünün beklemesi bittiğinde HÂLÂ meşguldü
   * (`settle.settled === false`). Bir sonraki adım meşgul bir oturuma gitti
   * demektir — hata değil ama sessiz de geçilmemeli: sonraki adımın anlaşılmaz
   * bir SAP hatasıyla düşmesinin sebebi budur.
   */
  stillBusy?: boolean;
}

// Faz 3 — AI Agent ile doğal dil otomasyonu. `axet.flows`'un agent
// mimarisiyle (JSON-aksiyon protokolü, stateless `axet-code run --quiet
// --cwd <scratch>` çağrısı, bkz. axetFlowsAgent.ts/src/flows/agent/*) AYNI
// desen — main process SADECE CLI'yi spawn eder, ham stdout'u döner; JSON
// ayrıştırma/aksiyon yürütme döngüsü TAMAMEN renderer'da (src/lib/
// sapGuiAgent/*). `axetChat.ts`'teki iptal (`Map<requestId,ChildProcess>`)
// deseni de eklendi — agent gerçek SAP aksiyonları uyguladığı için bir
// "Durdur" butonu güvenlik açısından önemli.
export interface GuiScriptAgentStepResult {
  ok: boolean;
  text?: string;
  error?: string;
  cancelled?: boolean;
}

// Uygulama Bağlantıları — Outlook/SharePoint connector'ları
// (2026-08-29, ikinci/gerçek mimari — ÖNCEKİ tur burada @azure/msal-node
// ile kullanıcının kendi Azure AD "App Registration"ını girdiği bir device-
// code OAuth akışı vardı, kullanıcının kesin talebiyle TAMAMEN kaldırıldı).
// Gerçek mimari: bu launcher axet.nttdata.com'a HİÇBİR ZAMAN doğrudan HTTP/
// MCP isteği atmıyor, hiçbir token/kimlik bilgisi SAKLAMIYOR — bunun yerine
// `axet-code` CLI'nın (bu ajanın kendisi) zaten Okta SSO ile giriş yaptığı
// "Connector"ları (aXet Agentic platformunun MCP araç sunucuları, bkz.
// https://axet.nttdata.com/api/agentic-mcp-tools/outlook_tools/mcp ve
// .../sharepoint_tools/mcp) kullanıyor. Bu yüzden burada `AppConfig`'e
// eklenecek HİÇBİR kalıcı alan yok — `axet.flows`'un `ms-graph-mail-config`/
// `ms-graph-shp-config` node'larından da TAMAMEN AYRI bir katman.
export type ConnectorProvider = "outlook" | "sharepoint";

export interface ConnectorTestResult {
  ok: boolean;
  connected: boolean;
  detail: string;
  error?: string;
  cancelled?: boolean;
  /**
   * Sağlayıcı için platformda KAYITLI HİÇ entegrasyon yok (yetkisi bozuk bir
   * entegrasyon DEĞİL — hiç yok). Ayrı tutuluyor çünkü çaresi de ayrı:
   * "yeniden yetkilendir" değil, portalden ilk kez eklemek.
   */
  missing?: boolean;
}

/** Kalıcı saklanan son test sonucu (bkz. `AppConfig.connectorLastResults`). */
export interface ConnectorCheck {
  connected: boolean;
  detail: string;
  error?: string;
  missing?: boolean;
  /** ISO 8601. "En son ne zaman baktık" sorusunun tek cevabı. */
  checkedAt: string;
}

/**
 * BAĞLI sağlayıcıların MCP araçları hangi çağrılarda kurulsun?
 *
 * Ölçüm (bkz. axetSpawnEnv.ts): bağlayıcılar açıkken her çağrı ~10 saniye
 * daha uzun sürüyor, çünkü axet-code onları her seferinde kurup yıkıyor.
 * Yani bu bir AÇ/KAPA değil, bir MALİYET AYARI — "kapalı" hâli artık burada
 * değil, sağlayıcının kendisinde (`connectorEnabled`), çünkü aynı şeyi iki
 * yerden ifade etmek kullanıcıyı yanılttı: ekran yeşil tik gösterirken
 * sohbetin elinde hiçbir araç yoktu (2026-09-04 canlı ölçüm: aynı dizinde
 * normal ortam 23 Outlook aracı listeliyor, sohbetin ortamı `NONE`).
 *
 *  - `auto`   — mesajın metnine bakılır; e-posta/takvim/SharePoint'ten söz
 *               ediyorsa o çağrıda kurulur. VARSAYILAN.
 *  - `always` — her çağrıda kurulur. Yavaş ama tahmin yok.
 */
export type ConnectorMode = "auto" | "always";

