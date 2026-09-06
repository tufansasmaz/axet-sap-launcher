import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  PanelLeft,
  PanelLeftClose,
  Link2,
  Server,
  ArrowUpRight,
  Search,
  Pencil,
  Download,
  Trash2,
  Keyboard,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderPlus,
  FolderInput,
  Settings2,
} from "lucide-react";
import type {
  ActiveSapContext,
  AppConfig,
  AxetChatActivity,
  AxetChatActivityPhase,
  AxetChatMessage,
  AxetModelEntry,
  AxetTodo,
  ChatAttachment,
  ChatProject,
  ChatSessionsState,
  ConnectivityState,
  SapService,
  SystemTier,
} from "../../app-electron/shared/types";
import ChatSessionPane, { type RecentWorkItem } from "./ChatSessionPane";
import ChatFilesPanel from "./ChatFilesPanel";
import ConfirmDialog from "./ConfirmDialog";
import ChatInstructionsDialog from "./ChatInstructionsDialog";
import ChatProjectDialog from "./ChatProjectDialog";
import type { ChatMessage } from "./ChatBubble";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import SystemHoverCard from "./SystemHoverCard";
import { resolveTier } from "../lib/tier";
import { DictationRecorder } from "../lib/dictationRecorder";
import { promptWithAttachments, toAttachments } from "../lib/attachments";
import { chatToMarkdown, safeFileName } from "../lib/chatExport";
import { chatToPrintHtml } from "../lib/chatPrint";
import { useT } from "../i18n";

// Kullanıcı yazmayı bu kadar duraklattıktan sonra alt süreç ısıtılıyor. Her
// tuşta ısıtmak süreç açıp kapatmaktan başka bir şey yapmazdı; yarım saniye,
// "yazmayı bıraktı" ile "hâlâ yazıyor"u ayıracak kadar uzun ve kazancı
// (~2–4 saniye) yemeyecek kadar kısa.
const PREWARM_DEBOUNCE_MS = 500;

// Bir düzenlemenin geri alınması için gereken HER ŞEY: kesilen mesajlar ve
// composer'ın o andaki hâli. Yalnızca mesajları saklamak yetmezdi — geri
// alındığında düzenlenmek üzere kutuya konan metnin de gitmesi gerekiyor,
// yoksa aynı mesaj hem listede hem composer'da durur.
export interface EditUndo {
  messages: ChatMessage[];
  draft: string;
  attachments: ChatAttachment[];
}

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
  // Bu turda çağrılan araçlar, ÇAĞRI SIRASIYLA — terminaldeki gibi bir
  // döküm. Sonuçlar geldikçe aynı satırın üzerine yazılıyor (eşleşme
  // `callId` ile), yeni satır açılmıyor.
  activitySteps: AxetChatActivity[];
  // Ajanın ŞU AN sorduğu soru (`ask_user`). Doluyken tur, kullanıcı bir
  // seçenek seçene kadar DURUYOR — cevap TUI'deki soru kutusuna tuş olarak
  // gidiyor (bkz. axetChatTui.ts `answerTuiQuestion`).
  //
  // Diske YAZILMIYOR: bekleyen bir soru, süreciyle birlikte yaşıyor. Uygulama
  // kapanınca cevaplanacak bir kutu kalmıyor, kayıtlı bir soru ise sonsuza
  // kadar tıklanabilir ama etkisiz bir düğme olurdu.
  pendingAsk: AxetChatActivity | null;
  // Ajanın KENDİ planı (axet-code'un `todos` aracı). Bizim ürettiğimiz bir
  // şey değil, oturum veritabanından okunuyor — bkz. axetSessionDb.ts
  // `sessionTodos`. Tur bittiğinde SİLİNMİYOR: plan bir sonraki turda da
  // geçerli, ajan onu güncelleyene kadar duruyor.
  todos: AxetTodo[];
  // Bağlam doluluğu — son isteğin jeton sayısı ve pencerenin büyüklüğü.
  // `0` = henüz ölçüm yok.
  contextTokens: number;
  contextLimit: number;
  // "Mesajı düzenle"nin kestiği kuyruk. Düzenleme, o mesajdan SONRASINI
  // siliyor ve bu geri ALINAMIYORDU: tek bir kalem tıklamasıyla yarım sohbet,
  // uyarısız, kalıcı olarak gidiyordu (diske de öyle yazılıyor). Kesme
  // davranışı doğru — düzeltilmiş soruya ait olmayan cevaplar bağlamda
  // kalmamalı — eksik olan geri dönüş yoluydu.
  //
  // Diske YAZILMIYOR: geri alma o anki düzenlemeye ait, uygulama kapanınca
  // anlamı kalmaz.
  editUndo: EditUndo | null;
  // "Durdur"a basıldı ama tur DURMADI — ajan arkada üretmeye devam ediyor
  // (bkz. axetChatTui.ts `cancelTui`, shared/types.ts `AxetChatCancelVerdict`).
  //
  // Bu bayrak iptalden 1–4 saniye SONRA geliyor: esc yazılıyor, sonra
  // axet-code'un veritabanına bakılıp turun gerçekten kesilip kesilmediği
  // doğrulanıyor. Eskiden doğrulamanın sonucu yalnızca günlüğe yazılıyordu,
  // yani kullanıcı "durdurdum" sanırken jeton harcanmaya devam ediyordu.
  //
  // Diske YAZILMIYOR: uygulama kapanınca pty de ölüyor, yani arkada süren
  // bir tur kalmıyor — kaydedilmiş bir uyarı sonsuza kadar yalan söylerdi.
  cancelStuck: boolean;
  createdAt: number;
  // Listedeki sıralama bunun üzerinden — sohbetler artık diskte kalıcı
  // olduğu için "en son dokunulan üstte" olmadan liste hızla kullanılamaz
  // hâle geliyor (en eski sohbet en üstte kalırdı).
  updatedAt: number;
  // Bu sohbetin bağlı olduğu SAP proje klasörü (bkz. shared/types.ts
  // `StoredChatSession.cwd`). `null` = genel çalışma alanı.
  cwd: string | null;
  sapLabel: string | null;
  // Kullanıcının elle kurduğu projeye aidiyet (bkz. shared/types.ts
  // `ChatProject`). `cwd`'den BAĞIMSIZ: bir SAP sohbeti de bir projeye
  // konabilir, o zaman kenar çubuğunda proje altında görünüyor.
  projectId: string | null;
  // "SAP sohbetleri" altına değil "Sohbetler" altına düşsün (bkz.
  // shared/types.ts `StoredChatSession.keepInGeneral`). `cwd` dolu olsa bile.
  keepInGeneral: boolean;
}

// SAP'a bağlanınca App.tsx'in "bu sisteme bağlı bir sohbet aç" isteği.
// `nonce` şart: aynı sisteme arka arkaya bağlanmak AYNI projectDir/label
// nesnesini üretir ve effect bir daha tetiklenmezdi.
export interface SapChatRequest {
  projectDir: string;
  label: string;
  // Sohbetin ilk balonu olarak basılacak bağlantı özeti (App.tsx üretiyor).
  // Ajandan gelmiyor: bağlantı sonucunu launcher zaten biliyor, sordurmak
  // gereksiz bir tur olurdu.
  notice: string;
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
  onQuickConnectSap: (
    path: string[],
    service: SapService,
    itemUuid: string,
  ) => void;
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

// Proje sayısının tavanı. Ana süreçteki `chatStore.ts` ile AYNI olmalı: orada
// fazlası kesiliyor, burada ise daha oluşturulmadan söyleniyor — sınırın
// diskte sessizce uygulanması, kullanıcının kurduğu projenin bir sonraki
// açılışta yok olması demek olurdu.
const MAX_PROJECTS = 40;

// "Projeye taşı" menüsünün en fazla kaplayacağı yükseklik (px). Hem menünün
// kendi `max-h` sınıfı hem de ekranın altına taşmasını engelleyen sıkıştırma
// bu sayıyı kullanıyor — ikisinin ayrışması menüyü yarım gösterirdi.
const MOVE_MENU_MAX_H = 280;

/**
 * Proje talimatını gönderilecek mesajın başına ekler.
 *
 * EKRANDA GÖRÜNEN mesaja dokunulmuyor — kullanıcı ne yazdıysa onu görüyor,
 * talimat yalnızca ajana giden metinde var.
 *
 * HER TURDA ekleniyor, sadece ilk mesajda değil. Tek sefer denendiğinde üç
 * ayrı yoldan kayboluyordu: (1) geçmiş son `MAX_HISTORY_MESSAGES` mesajla
 * sınırlı, uzun sohbette ilk mesaj pencereden düşüyor; (2) kalıcı axet-code
 * oturumu uygulama kapanınca ölüyor ve yeniden tohumlanırken geçmiş ekrandaki
 * mesajlardan kuruluyor — talimat orada hiç yok; (3) var olan bir sohbet
 * sonradan bir projeye taşınabiliyor, o sohbetin "ilk mesajı" çoktan gitmiş
 * oluyor. Bedeli her turda talimat kadar jeton; `chatStore.ts` bunu 8000
 * karakterle sınırlıyor ve tipik bir talimat birkaç yüz karakter.
 */
function withProjectInstructions(
  text: string,
  project: ChatProject | null,
): string {
  const instructions = project?.instructions.trim();
  if (!project || !instructions) return text;
  return `[Proje talimatı — "${project.name}" projesindeki tüm sohbetlerde geçerli]\n${instructions}\n[Proje talimatı sonu]\n\n${text}`;
}

// SAP'a bağlanınca sohbetin başına basılan karşılama balonunun kimliği.
// Ekranda asistan mesajı gibi görünüyor ama ajanın ÜRETTİĞİ bir tur değil —
// launcher'ın bağlantı sonucundan üretilen bir özet (bkz. App.tsx
// `handleCredentialsSubmit`). Bu yüzden ajana giden geçmişten süzülüyor:
// uydurma bir asistan turu göndermek, hem ajanın kendi oturum hafızasıyla
// çelişir hem de aynı bilgi zaten proje klasöründeki `sap-context.md`de var.
// Kimliğin sabit olması yeterli: mesaj kimlikleri yalnızca bir sohbetin kendi
// listesi içinde benzersiz olmak zorunda ve her sohbette bundan bir tane var.
// Kimlik ÖNEK: aynı sohbete birden fazla karşılama girebiliyor artık. Bir
// sisteme tekrar bağlanmak eski sohbeti açtığı için (bkz. sapChatRequest
// efekti) o sohbete YENİ bir karşılama ekleniyor — sabit tek bir kimlik
// kullanılsaydı React aynı `key`den iki tane görürdü.
const CONNECT_NOTICE_PREFIX = "connect-notice";
const CONNECT_NOTICE_ID = CONNECT_NOTICE_PREFIX;
const isNotConnectNotice = (m: ChatMessage) =>
  !m.id.startsWith(CONNECT_NOTICE_PREFIX);

// Gelen bir etkinlik olayını oturuma işler.
//
// `tool` YENİ bir satır açıyor, `toolResult` ise açılmış satırı TAMAMLIYOR —
// yeni satır açmıyor. Çağrıyı ve sonucunu iki bağımsız satır olarak
// göstermek, terminaldeki `● çağrı` / `⎿ sonuç` düzenini bozar ve gösterge
// her araçta iki kat uzardı.
/** Akış tikinin periyodu (ms) — ~30 kare/sn. Bkz. `drainStreams`. */
const STREAM_TICK_MS = 33;
/** Kuyruğun kaç tikte erimesi hedefleniyor. 6 x 33 ms ≈ 200 ms. */
const STREAM_DRAIN_TICKS = 6;

function applyActivity(
  session: ChatSession,
  activity: AxetChatActivity,
): ChatSession {
  if (activity.phase === "toolResult") {
    const index = session.activitySteps.findIndex(
      (step) => step.callId === activity.callId,
    );
    // Çağrısını görmediğimiz bir sonuç sessizce atılıyor: bağlanacağı satır yok.
    if (index < 0) return session;
    const steps = session.activitySteps.slice();
    // Alanlar TEK TEK aktarılıyor, `...activity` ile değil: gelen olayın
    // `phase`'i "toolResult" ve `target`/`diff`'i boş — yayılsaydı çağrı
    // satırının aracı ve farkı üzerine boş değer yazardı.
    // `output` BURADA UNUTULMUŞTU (2026-09-05): tam araç çıktısı main
    // tarafından geliyordu ama bu birleştirmede düşüyor, ekranda hiçbir
    // satır açılabilir olmuyordu.
    steps[index] = {
      ...steps[index],
      result: activity.result,
      extraLines: activity.extraLines,
      output: activity.output,
      failed: activity.failed,
    };
    return { ...session, activitySteps: steps };
  }
  if (activity.phase === "askUser") {
    return { ...session, activity: "askUser", pendingAsk: activity };
  }
  // Soru kutusu KAPANIYOR: askUser dışındaki her olay, turun devam ettiğini
  // (cevap işlendi) ya da bittiğini gösteriyor. Kalsaydı, artık bir kutu
  // yokken tuş gönderen ölü bir düğme olurdu.
  if (activity.phase === "tool") {
    // Main tarafı çağrıları zaten tekilliyor; bu ikinci kapı, olayın yeniden
    // bağlanan bir pencereye tekrar düşmesine karşı.
    if (
      activity.callId &&
      session.activitySteps.some((step) => step.callId === activity.callId)
    ) {
      return session;
    }
    return {
      ...session,
      activity: "tool",
      pendingAsk: null,
      activitySteps: [...session.activitySteps, activity],
    };
  }
  return { ...session, activity: activity.phase, pendingAsk: null };
}

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
  { key: "sgSharepointFind", scope: "connector" },
];

const SUGGESTION_COUNT = 3;

/**
 * F1 ile açılan listede gösterilen kısayollar.
 *
 * Liste ELLE tutuluyor, kısayolları bağlayan koddan türetilmiyor: bağlar üç
 * ayrı yerde (burada, ChatSessionPane'de, composer'da) ve türetmeye çalışmak
 * onları tek bir yere toplamayı gerektirirdi. Bedeli: yeni bir kısayol
 * eklerken bu listeye de yazmak.
 */
const SHORTCUTS = [
  ["Ctrl+N", "axetCodeHome.shortcutNewChat"],
  ["Ctrl+↑ / Ctrl+↓", "axetCodeHome.shortcutSwitchChat"],
  ["Ctrl+F", "axetCodeHome.shortcutFind"],
  ["Esc", "axetCodeHome.shortcutStop"],
  ["↑", "axetCodeHome.shortcutEditLast"],
  ["Enter", "axetCodeHome.shortcutSend"],
  ["Shift+Enter", "axetCodeHome.shortcutNewline"],
  ["F1", "axetCodeHome.shortcutHelp"],
] as const;

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
}: Props) {
  const t = useT();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Bir sonraki YENİ sohbetin kimliği, doğmadan önce. Kalıcı axet-code
  // oturumu kullanıcı yazarken bu kimlikle ısıtılıyor; sohbet oluşunca aynı
  // kimliği devralıyor (bkz. handleSendNew).
  const newChatIdRef = useRef<string>(crypto.randomUUID());
  // Henüz bir sohbete bağlanmamış taslak (bkz. NEW_SESSION_ID).
  const [newDraft, setNewDraft] = useState("");
  // Henüz bir sohbete bağlanmamış taslağın ekleri — `newDraft`'ın eşleniği.
  const [newAttachments, setNewAttachments] = useState<ChatAttachment[]>([]);
  // Taslağın SAP bağlamı. Kayıt ilk mesajda doğduğu için (bkz. handleSendNew)
  // bağlantı da o ana kadar burada bekliyor: bağlanıp hiçbir şey sormayan
  // kullanıcı, listede boş bir sohbet bulmuyor.
  const [newBinding, setNewBinding] = useState<{
    cwd: string;
    label: string;
  } | null>(null);
  // Taslağın bağlantı karşılaması (bkz. SapChatRequest.notice). `newBinding`
  // gibi taslakta bekliyor ve ilk mesajla birlikte sohbete taşınıyor —
  // yalnızca boş ekranda gösterilseydi kullanıcı yazar yazmaz kaybolur,
  // "hangi sisteme bağlıydım" bilgisi sohbette hiç kalmazdı.
  const [newNotice, setNewNotice] = useState<string | null>(null);
  // Taslağın PROJESİ — `newBinding`'in eşleniği. Bir projenin başlığındaki
  // "+" ile açılan yeni sohbet, ilk mesaj gönderilene kadar burada bekliyor;
  // kayıt doğduğunda (handleSendNew) sohbete taşınıyor.
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  // Taslak sohbetin listede nereye düşeceği. `handleNewSession`'a bir bağlantı
  // GEÇİLDİYSE (sisteme bağlandık ya da bir sistem grubunun "+"ına basıldı)
  // false, elle "Yeni sohbet" ise true. Başlangıçta true: uygulama açılışındaki
  // boş composer elle açılmış bir sohbet sayılıyor.
  const [newKeepInGeneral, setNewKeepInGeneral] = useState(true);
  // Kullanıcının kendi kurduğu projeler (bkz. shared/types.ts `ChatProject`).
  // Sohbetlerle AYNI dosyada saklanıyorlar (chat-sessions.json): proje bir
  // sohbet düzenlemesi, ayrı bir dosya iki kaynağın birbirinden kayması
  // (silinmiş bir projeye ait sohbetler) demek olurdu.
  const [projects, setProjects] = useState<ChatProject[]>([]);
  // Ayar kutusu açık olan projenin kimliği (ad + talimat + silme).
  const [projectDialogId, setProjectDialogId] = useState<string | null>(null);
  // "Projeye taşı" menüsü. Konum SABİT (viewport) koordinat: menü kenar
  // çubuğunun kaydırılan listesinin içinde açılsaydı, listeyle birlikte
  // kayar ve `overflow-hidden` sınırında kırpılırdı.
  const [moveMenu, setMoveMenu] = useState<{
    sessionId: string;
    x: number;
    y: number;
  } | null>(null);
  // Kimlik SABİT, her render'da `crypto.randomUUID()` DEĞİL: id React `key`
  // olarak kullanılıyor, her render'da değişseydi balon her tuş vuruşunda
  // sökülüp yeniden kurulurdu (bkz. CONNECT_NOTICE_ID).
  const noticeMessage = useMemo<ChatMessage | null>(
    () =>
      newNotice
        ? {
            id: CONNECT_NOTICE_ID,
            role: "assistant",
            content: newNotice,
            createdAt: Date.now(),
          }
        : null,
    [newNotice],
  );
  // Taslak sohbetin GERÇEKTE kullanacağı bağlantı. `newBinding` yoksa aktif
  // SAP bağlamı devreye giriyor: bir sisteme bağlandıktan sonra açılan her
  // yeni sohbet o sisteme ait sayılıyor. `newBinding` ("şu an bağlandık"
  // olayı) her zaman önce gelir — nadir de olsa ikisi farklı olabilir.
  // Bağlamsız bir sohbet istemenin yolu, başlık çubuğundaki rozetten
  // bağlamı temizlemek.
  const effectiveNewBinding = useMemo(
    () =>
      newBinding ??
      (activeSap
        ? {
            cwd: activeSap.projectDir,
            label: `${activeSap.systemId} · ${activeSap.client}`,
          }
        : null),
    [newBinding, activeSap],
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
  // Kısayol listesi (F1). Kısayollar keşfedilemezse yok sayılır; TUI'nin
  // kendi karşılığı ctrl+g ile açılan yardım şeridi.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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
  // Akış kuyruğu — istek kimliği -> henüz ekrana basılmamış metin.
  // Neden var: aşağıdaki `drainStreams` açıklamasına bak.
  const streamQueue = useRef(new Map<string, string>());
  const streamTimer = useRef<number | null>(null);
  // Mikrofonun üç hâli. `transcribing` ayrı bir durum çünkü whisper birkaç
  // saniye sürebiliyor: kayıt bitmiş ama metin henüz yok, ve bu arada düğme
  // tekrar tıklanabilir görünmemeli.
  const [dictationState, setDictationState] = useState<
    "idle" | "recording" | "transcribing"
  >("idle");
  // Diskten yükleme TAMAMLANANA kadar kaydetme yapılmaz. Bu bayrak olmadan
  // ilk render'daki boş `sessions=[]` state'i, yükleme cevabı gelmeden önce
  // debounce'lu kaydediciyi tetikleyip diskteki TÜM geçmişi silerdi.
  const loadedRef = useRef(false);
  // Aynı bilginin DURUM hâli: ref bir yeniden çizim tetiklemiyor, kurtarma
  // effect'inin (aşağıda) yükleme bittikten sonra çalışması ise buna bağlı.
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  // Öneri kartlarının tohumu — her "yeni sohbet"te yenileniyor (bkz.
  // SUGGESTION_POOL). Diske yazılmıyor: açılışta zaten yeni bir tohum
  // isteniyor.
  const [suggestionSeed, setSuggestionSeed] = useState(freshSuggestionSeed);
  // Dosya paneli TÜM sohbetler için ortak: her sohbette ayrı ayrı açmak
  // gerekseydi, panelin işi (ajanın yazdığını görmek) her yeni sohbette
  // yeniden hatırlanması gereken bir şey olurdu. Açık DOSYA ise sohbet başına
  // (bkz. ChatFilesPanel) — o gerçekten o sohbete ait.
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  // Yönerge kutusunun açık olduğu KLASÖR (sohbet kimliği değil): dosya klasöre
  // ait, aynı klasördeki iki sohbet aynı yönergeyi görüyor.
  const [instructionsCwd, setInstructionsCwd] = useState<string | null>(null);

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
            activitySteps: [],
            pendingAsk: null,
            // Plan ve jeton sayacı diske YAZILMIYOR: ikisi de axet-code'un
            // oturumuna ait ve o oturum uygulama kapanınca ölüyor. Diskten
            // gelen eski bir plan, artık var olmayan bir işin listesi olurdu.
            todos: [],
            contextTokens: 0,
            contextLimit: 0,
            editUndo: null,
            cancelStuck: false,
            // Eski geçmişte bu alanlar yok — bağlamsız sohbet olarak açılıyorlar.
            cwd: s.cwd ?? null,
            sapLabel: s.sapLabel ?? null,
            projectId: s.projectId ?? null,
            // Alanın hiç olmaması "eski davranış": `cwd`'si olan eski
            // sohbetler sistem gruplarında kalmaya devam ediyor.
            keepInGeneral: s.keepInGeneral === true,
          })),
        );
        // Projeler sohbetlerden AYRI bir liste ama aynı dosyada. Artık var
        // olmayan bir projeye işaret eden sohbet kaybolmuyor: gruplama
        // bilinmeyen `projectId`'yi yok sayıp sohbeti "Sohbetler"e düşürüyor
        // (bkz. sessionGroups).
        setProjects(result.state.projects ?? []);
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
          pushToast(
            "error",
            t("axetCodeHome.historyLoadFailed", { message: result.error }),
          );
        }
      })
      .catch((err: Error) => {
        if (!cancelled)
          pushToast(
            "error",
            t("axetCodeHome.historyLoadFailed", { message: err.message }),
          );
      })
      .finally(() => {
        // Hata durumunda da açılıyor: yükleme başarısızsa kullanıcının bundan
        // SONRA yazdığı sohbetler yine de kaydedilebilmeli.
        if (cancelled) return;
        loadedRef.current = true;
        // Ref bir yeniden çizim tetiklemiyor; kurtarma effect'inin yükleme
        // bittikten SONRA çalışabilmesi için durum olarak da tutuluyor.
        setSessionsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Yarıda kalmış turların cevabını geri getir (açılışta bir kez) ---
  //
  // Uygulama bir tur sürerken kapanırsa cevap diske HİÇ yazılmıyor: akan mesaj
  // kayıt dışı bırakılıyor, üstelik 600 ms'lik debounce akış boyunca sürekli
  // sıfırlandığı için kayıt zaten çalışmıyor (bkz. aşağıdaki kayıt effect'i).
  // Sonuç, kullanıcının gördüğü hâliyle: soru duruyor, cevabın yerinde hiçbir
  // şey yok — ne metin ne açıklama. Metnin kendisi kayıp değil, axet-code onu
  // üretirken kendi veritabanına yazıyor; buradan geri getiriliyor.
  //
  // Ölçüt "son mesaj KULLANICI mesajı": cevabı olmayan tek durum bu. Kurtarma
  // bulamazsa hiçbir şey yapılmıyor — bu normal bir sonuç (tur hiç başlamamış,
  // klasör değişmiş ya da veritabanı silinmiş olabilir).
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (recoveredRef.current || !loadedRef.current || !config) return;
    recoveredRef.current = true;
    const workspace = config.axetWorkspaceDir ?? "";
    let cancelled = false;

    (async () => {
      const found: Array<{ sessionId: string; message: ChatMessage }> = [];
      for (const session of sessions) {
        const last = session.messages[session.messages.length - 1];
        if (!last || last.role !== "user") continue;
        const cwd = session.cwd || workspace;
        if (!cwd) continue;
        try {
          const answer = await window.api.recoverChatAnswer(
            cwd,
            last.content,
            last.createdAt,
          );
          if (!answer) continue;
          found.push({
            sessionId: session.id,
            message: {
              id: `${last.id}-recovered`,
              role: "assistant",
              content: answer.text,
              createdAt: Date.now(),
              // Tamamlanmış bir turu "yarıda kaldı" diye işaretlemek yanlış
              // olurdu: axet-code bitirmiş, yalnızca biz kaydedememişiz.
              ...(answer.finished ? {} : { interrupted: true }),
            },
          });
        } catch {
          // Kurtarma bir KOLAYLIK; başarısızlığı sohbeti açmayı engellememeli.
        }
      }
      if (cancelled || found.length === 0) return;
      setSessions((prev) =>
        prev.map((s) => {
          const hit = found.find((f) => f.sessionId === s.id);
          // Bu arada kullanıcı yazmaya devam etmiş olabilir: son mesaj artık
          // kullanıcı mesajı değilse kurtarılan metin oraya AİT DEĞİL.
          if (!hit || s.messages[s.messages.length - 1]?.role !== "user")
            return s;
          return { ...s, messages: [...s.messages, hit.message] };
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
    // `sessions` BİLEREK bağımlılıkta değil: bu effect'in çalışması gereken tek
    // an yüklemenin bittiği andır ve o anda kapanışta yakalanan liste tam da
    // diskten gelen listedir. Bağımlılığa eklemek, her akış parçasında yeniden
    // kurulan (ve `recoveredRef` yüzünden hemen çıkan) bir effect demek olurdu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, sessionsLoaded]);

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
              ...(m.attachments && m.attachments.length > 0
                ? { attachments: m.attachments }
                : {}),
              // Araç dökümü — aynı gerekçeyle yalnızca doluysa yazılıyor.
              ...(m.steps && m.steps.length > 0 ? { steps: m.steps } : {}),
              // "Yarıda kaldı" notu diske de gidiyor: bir kez gösterilip
              // kaybolsaydı, kırpılmış cevap bir sonraki açılışta tam bir cevap
              // gibi görünürdü.
              ...(m.interrupted ? { interrupted: true } : {}),
              createdAt: m.createdAt,
            })),
          model: s.model,
          draft: s.draft,
          ...(s.attachments.length > 0 ? { attachments: s.attachments } : {}),
          // Bağlamsız sohbetler geçmiş dosyasını boş alanlarla şişirmesin.
          ...(s.cwd ? { cwd: s.cwd } : {}),
          ...(s.sapLabel ? { sapLabel: s.sapLabel } : {}),
          ...(s.projectId ? { projectId: s.projectId } : {}),
          ...(s.keepInGeneral ? { keepInGeneral: true } : {}),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        projects,
      };
      window.api.saveChatSessions(state).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
    // `projects` bağımlılıkta: bir projenin adını/talimatını değiştirmek
    // sohbet listesine dokunmuyor, bu olmadan değişiklik ancak bir sonraki
    // mesajla diske inerdi (ve arada kapatılırsa hiç inmezdi).
  }, [sessions, activeId, projects]);

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    Promise.all([
      window.api.listAxetModels(),
      window.api.getAxetModelConfig(),
    ]).then(([modelsResult, configResult]) => {
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
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  // Efektlerin sohbet listesini bağımlılığa almadan okuyabilmesi için ayna.
  // `sapChatRequest` efekti listeyi ARIYOR ama listenin değişmesiyle yeniden
  // çalışmamalı — aksi hâlde her mesaj yeni bir bağlantı karşılaması basardı.
  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // "Yeni sohbet" artık kayıt OLUŞTURMUYOR — sadece boş composer'a dönüyor.
  // Gerçek kayıt ilk mesaj gönderilince doğuyor (handleSendNew).
  // `binding`: yalnızca SAP bağlantısından gelen çağrı doldurur; elle açılan
  // yeni sohbet bağlamsız başlar (önceki sistemin klasörü yapışıp kalmasın).
  // `notice`: yalnızca SAP bağlantısından gelen çağrı doldurur. Elle açılan
  // yeni sohbette `null` — bir önceki bağlantının karşılaması ekranda asılı
  // kalmamalı.
  // `projectId`: yalnızca bir projenin başlığındaki "+" doldurur. Genel "Yeni
  // sohbet" düğmesi projesiz açıyor — bir projeye girip çıkan kullanıcının
  // sonraki sohbetlerinin sessizce o projeye yapışması istenmiyor.
  const handleNewSession = useCallback(
    (
      binding: { cwd: string; label: string } | null = null,
      notice: string | null = null,
      projectId: string | null = null,
    ) => {
      setActiveId(null);
      setNewDraft("");
      setNewAttachments([]);
      setNewBinding(binding);
      setNewNotice(notice);
      setNewProjectId(projectId);
      // Gruplama artık `cwd`'ye değil sohbetin nasıl doğduğuna bakıyor: bir
      // bağlantı geçildiyse sistemine, geçilmediyse "Sohbetler"e. Elle açılan
      // sohbet `activeSap` yüzünden yine de bir `cwd` alabiliyor (bkz.
      // `effectiveNewBinding`) — ajan o klasörde çalışsın, ama listede
      // sistemin altına gömülmesin.
      setNewKeepInGeneral(binding === null);
      setQuery("");
      // Boş ekrana her dönüşte kartlar yenileniyor — "sürekli değişen" burada.
      setSuggestionSeed(freshSuggestionSeed());
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [],
  );

  // --- "Sisteme bağlan" → sohbet ---
  // Bağlantı başarılı olunca App.tsx yeni bir istek bırakıyor. `nonce`
  // bağımlılıkta: aynı sisteme tekrar bağlanmak da efekti yeniden tetikler.
  //
  // Kullanıcı isteği (2026-09-06): *"bağlandığım bir sisteme daha sonra tekrar
  // bağlandıysam önceden konuşmamızın olduğu sohbetten devam etsin"*. Önceden
  // her bağlantı koşulsuz olarak BOŞ composer'a düşürüyordu — dün o sistemde
  // ne konuşulduğunu bulmak kullanıcının işiydi.
  //
  // Eşleştirme anahtarı `cwd`: sohbette sistem uuid'si yok, proje klasörü
  // yolu ise o sisteme özel ve kalıcı (bkz. computeProjectDir). Windows'ta
  // yol karşılaştırması büyük/küçük harfe duyarsız — `handleInstructionsSaved`
  // de aynı şekilde eşleştiriyor.
  useEffect(() => {
    if (!sapChatRequest) return;
    const binding = {
      cwd: sapChatRequest.projectDir,
      label: sapChatRequest.label,
    };
    const key = sapChatRequest.projectDir.toLowerCase();
    // En son konuşulan eşleşme. `sessionsRef` kullanılıyor ki `sessions`
    // bağımlılığa girip her mesajda efekti yeniden çalıştırmasın.
    // `keepInGeneral` olanlar ELENİYOR: aynı klasörde çalışan ama kullanıcının
    // elle "Sohbetler"de açtığı bir sohbet, bağlanınca kaldığı yerden devam
    // ettirilecek "sistemin sohbeti" değil. Onu buraya çekmek, kullanıcının
    // bilerek genelde tuttuğu sohbete karşılama balonu iliştirmek olurdu.
    const prior = sessionsRef.current
      .filter((s) => !s.keepInGeneral && (s.cwd ?? "").toLowerCase() === key)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (!prior) {
      handleNewSession(binding, sapChatRequest.notice);
      return;
    }

    // Devam eden bir sohbetin ortasına dalmıyoruz: cevap akarken araya
    // karşılama balonu sıkıştırmak hem akışı bozar hem de kullanıcı o an
    // başka bir işin ortasındadır. Böyle bir durumda yeni sohbet açılıyor —
    // kullanıcının "sorun olursa yeni sohbet açsın" dediği durum.
    if (prior.pending) {
      handleNewSession(binding, sapChatRequest.notice);
      return;
    }

    setActiveId(prior.id);
    setNewNotice(null);
    setQuery("");
    setSessions((prev) =>
      prev.map((s) =>
        s.id === prior.id
          ? {
              ...s,
              // Bağlantı bilgisi TAZELENİYOR: sistemin proje klasörü aynı ama
              // etiketi (client/kullanıcı) değişmiş olabilir.
              cwd: sapChatRequest.projectDir,
              sapLabel: sapChatRequest.label,
              messages: [
                ...s.messages,
                {
                  id: `${CONNECT_NOTICE_PREFIX}-${sapChatRequest.nonce}`,
                  role: "assistant" as const,
                  content: sapChatRequest.notice,
                  createdAt: Date.now(),
                },
              ],
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sapChatRequest?.nonce]);

  // Ctrl+N / Cmd+N — yeni sohbet. Bir metin alanındayken de çalışıyor
  // (Ctrl+N'in girişte anlamlı bir yerel karşılığı yok), ama tarayıcının
  // kendi "yeni pencere" davranışını bastırmak için preventDefault şart.
  // Yalnızca sekme ÖNDEYKEN bağlanıyor (bkz. `active`).
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "n"
      ) {
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
      // Sohbetin kalıcı axet-code oturumu da kapanmalı — yoksa silinmiş bir
      // konuşmanın süreci arkada, kullanıcının göremeyeceği bir yerde kalırdı.
      window.api.closeChatSession(id).catch(() => {});
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveId((current) => (current === id ? null : current));
      setDeleteId(null);
    },
    [sessions],
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
    [handleDeleteSession, sessions],
  );

  // Sohbeti dosyaya aktar — PDF ya da Markdown. İÇERİK burada üretiliyor,
  // kaydetme diyaloğu ve yazma ana süreçte (`chat:export`). İptal sessiz —
  // kullanıcının diyaloğu kapatması bir hata değil.
  //
  // İKİ BİÇİM DE ÜRETİLİP GÖNDERİLİYOR, çünkü hangisinin isteneceği ancak
  // kaydetme kutusu kapandığında belli oluyor (biçim, kutunun kendi "dosya
  // türü" listesinden seçiliyor). İkisini de kurmak saf metin işi — en uzun
  // sohbette bile milisaniyeler; kutuyu açmadan önce kullanıcıya bir soru daha
  // sormaya değmez.
  const handleExportSession = useCallback(
    async (id: string) => {
      const target = sessions.find((s) => s.id === id);
      if (!target || target.messages.length === 0) return;
      const input = {
        title: target.title,
        messages: target.messages,
        contextPath: target.cwd,
        contextLabel: target.sapLabel,
      };
      // Hata bildirimi ana süreçte (`dialog.showErrorBox`): sohbet listesinde
      // bu işlemin sonucunu gösterecek bir yer yok.
      await window.api.exportChat(safeFileName(target.title, "pdf"), {
        markdown: chatToMarkdown(input),
        html: chatToPrintHtml(input),
      });
    },
    [sessions],
  );

  // Proje yönergeleri kaydedildikten sonra: O KLASÖRDE çalışan her sohbetin
  // kalıcı axet-code oturumu bırakılıyor. Ölçüm (2026-09-05): bağlam dosyaları
  // süreç açılışında okunuyor, çalışan bir oturum sonradan yazılan AGENTS.md'yi
  // GÖRMÜYOR. Oturum bırakılmasaydı kullanıcı yönergesini kaydeder, hiçbir şey
  // değişmez ve nedenini anlayamazdı. Sohbetin kendisi ve mesajları duruyor;
  // yalnızca arkadaki süreç kapanıyor, sonraki mesajda yenisi açılıyor.
  //
  // `workspaceDir` DEĞİL `config?.axetWorkspaceDir` okunuyor: aynı değeri veren
  // o yardımcı değişken bu satırdan ÇOK SONRA tanımlanıyor ve bağımlılık dizisi
  // render sırasında değerlendiği için burada ona bakmak
  // "Cannot access 'workspaceDir' before initialization" ile TÜM ekranı
  // düşürüyordu. Dosyanın geri kalanı da (bkz. `handleOpenTerminal`) prop'u
  // doğrudan okuyor.
  const handleInstructionsSaved = useCallback(
    (cwd: string) => {
      const target = cwd.toLowerCase();
      const fallback = config?.axetWorkspaceDir ?? "";
      for (const s of sessions) {
        if ((s.cwd || fallback).toLowerCase() === target) {
          window.api.closeChatSession(s.id).catch(() => {});
        }
      }
    },
    [sessions, config?.axetWorkspaceDir],
  );

  const commitRename = useCallback(() => {
    const id = renamingId;
    if (!id) return;
    const next = renameDraft.trim();
    setRenamingId(null);
    // Boş ada izin verilmiyor — sohbet listede görünmez hâle gelirdi.
    if (!next) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, title: deriveTitle(next), updatedAt: Date.now() }
          : s,
      ),
    );
  }, [renameDraft, renamingId]);

  // --- Projeler ---
  //
  // Kullanıcı isteği (2026-09-06): *"chat ekranının kısmında chat gpt deki
  // projeler yapısını ekleyelim"* → seçilen biçim: kendi kurduğun, adlandırdığın
  // ve KENDİ TALİMATI olan projeler. SAP sistem grupları bundan bağımsız ve
  // otomatik olarak durmaya devam ediyor.
  //
  // Yeni proje HEMEN ayar kutusunu açıyor: varsayılan adıyla ("Yeni proje")
  // bırakılan bir proje, ikinci projeden itibaren ayırt edilemez olurdu.
  const handleCreateProject = useCallback(() => {
    if (projects.length >= MAX_PROJECTS) {
      pushToast(
        "error",
        t("axetCodeHome.projectLimit", { count: MAX_PROJECTS }),
      );
      return;
    }
    const now = Date.now();
    const project: ChatProject = {
      id: crypto.randomUUID(),
      name: t("axetCodeHome.newProjectName"),
      instructions: "",
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [...prev, project]);
    setProjectDialogId(project.id);
  }, [projects.length, pushToast, t]);

  const handleSaveProject = useCallback(
    (id: string, name: string, instructions: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, name, instructions, updatedAt: Date.now() } : p,
        ),
      );
    },
    [],
  );

  // Proje silmek SOHBETLERİ SİLMİYOR — yalnızca aidiyeti kopuyor ve sohbetler
  // "Sohbetler" başlığına düşüyor. Aksi hâlde tek bir çöp kutusu düğmesi, bir
  // klasör dolusu konuşmayı uyarısız yok ederdi; kullanıcının silmek istediği
  // şey düzenlemenin kendisi, içeriği değil.
  const handleDeleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setSessions((prev) =>
      prev.map((s) => (s.projectId === id ? { ...s, projectId: null } : s)),
    );
    setNewProjectId((current) => (current === id ? null : current));
    setProjectDialogId(null);
  }, []);

  // Var olan bir sohbeti bir projeye taşı / projeden çıkar.
  //
  // `updatedAt` BİLEREK dokunulmuyor: taşımak bir konuşma değil, listeyi
  // yeniden sıralamak istenmiyor — taşınan sohbet birdenbire en üste
  // zıplasaydı kullanıcı onu kaybederdi.
  const handleMoveSession = useCallback(
    (sessionId: string, projectId: string | null) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, projectId } : s)),
      );
      setMoveMenu(null);
    },
    [],
  );

  const handleSelectModel = useCallback(
    async (entry: AxetModelEntry) => {
      const result = await window.api.setAxetModel("large", entry);
      if (!result.ok) {
        pushToast(
          "error",
          t("modelSelector.switchFailed", { message: result.error ?? "" }),
        );
        return;
      }
      setDefaultModel(entry);
      if (activeId) {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeId ? { ...s, model: entry } : s)),
        );
      }
      pushToast("success", t("modelSelector.switched", { model: entry.model }));
    },
    [activeId, pushToast, t],
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
      sessionCwd: string | null,
      // Sohbetin projesi. Sohbet listesinden okunmuyor, AÇIKÇA geçiliyor:
      // `handleSendNew` bu fonksiyonu `setSessions` çağrısının hemen ardından
      // çağırıyor ve yeni kayıt o an ne `sessions`'ta ne `sessionsRef`'te var.
      sessionProjectId: string | null = null,
    ) => {
      const requestId = crypto.randomUUID();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                pending: true,
                requestId,
                activity: null,
                activitySteps: [],
                pendingAsk: null,
                // Yeni tur, yeni durum: "durduramadım" uyarısı bir önceki tura
                // aitti ve orada asılı kalması yanıltıcı olurdu.
                cancelStuck: false,
                updatedAt: Date.now(),
              }
            : s,
        ),
      );

      const cwd = sessionCwd || config?.axetWorkspaceDir || "";
      // `sessionId` main process'e de gidiyor: kalıcı axet-code oturumları
      // sohbet başına tutuluyor (bkz. axetChatTui.ts), yani bir sohbetin
      // hafızası artık CLI'ın kendisinde duruyor.
      // Proje talimatı TEK YERDE ekleniyor: gönder / yeniden üret / sürdür
      // yollarının üçü de buradan geçiyor, üç ayrı çağrı yerine burada
      // yapılması birinin unutulmasını imkânsız kılıyor.
      const promptText = withProjectInstructions(
        text,
        projects.find((p) => p.id === sessionProjectId) ?? null,
      );
      const result = await window.api.sendChatMessage(
        requestId,
        sessionId,
        cwd,
        model,
        history,
        promptText,
      );

      // Kuyrukta kalan artık metin ATILIYOR: aşağıda mesajın içeriği sonucun
      // tam metniyle değiştiriliyor, yani kaybolan bir şey yok. Bırakılsaydı
      // tamamlanmış cevabın sonuna tekrar eklenirdi.
      streamQueue.current.delete(requestId);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId || s.requestId !== requestId) return s;
          // Akış sırasında oluşturulmuş (varsa) yarım asistan mesajı — sonucu
          // ona YAZIYORUZ, yeni bir mesaj eklemiyoruz. Yoksa (hiç parça
          // gelmeden hata/iptal) sıfırdan oluşturulur.
          const last =
            s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
          const streamed = last?.streaming === true ? last : null;

          // `updatedAt` her sonlanmada tazeleniyor: cevabın gelişi de listedeki
          // sıralamayı etkileyen bir olay.
          // `as const` DEĞİL: `activitySteps: []` o zaman `readonly []` olur ve
          // `ChatSession`'ın değiştirilebilir dizisine atanamaz. Tip güvenliği
          // yerine `Pick` ile korunuyor — alan adı yanlış yazılırsa yine patlar.
          const done: Pick<
            ChatSession,
            | "pending"
            | "requestId"
            | "activity"
            | "activitySteps"
            | "pendingAsk"
            | "updatedAt"
          > = {
            pending: false,
            requestId: null,
            activity: null,
            activitySteps: [],
            pendingAsk: null,
            updatedAt: Date.now(),
          };

          // Araç dökümü CEVABA TAŞINIYOR. `done` oturumdaki canlı listeyi
          // sıfırlıyor (bir sonraki tur temiz başlasın diye); buraya kopyalanmazsa
          // ajanın bu turda ne yaptığı ekrandan tamamen silinirdi — eski davranış
          // buydu ve "neden bu cevabı verdi" sorusunun karşılığı hiçbir yerde
          // kalmıyordu. Boşsa alan hiç eklenmiyor: araç çalıştırmayan cevaplar
          // geçmiş dosyasını boş dizilerle şişirmesin.
          const steps = s.activitySteps.filter((step) => step.phase === "tool");
          const withSteps = steps.length > 0 ? { steps } : {};

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
                ? s.messages.map((m) =>
                    m.id === streamed.id
                      ? {
                          ...m,
                          content: partial,
                          streaming: false,
                          ...withSteps,
                        }
                      : m,
                  )
                : s.messages.filter((m) => m.id !== streamed.id),
              ...done,
            };
          }

          const finalContent = result.ok
            ? result.text
            : result.error || t("axetCodeHome.chatGenericError");
          // Bağlayıcıların bu mesajda açık olup olmadığı cevaba İLİŞTİRİLİYOR:
          // "gerektiğinde" kipinde bu bir tahmin ve yanıldığında sebebi
          // görünür olmalı (bkz. ChatBubble `usedConnectors`).
          if (streamed) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === streamed.id
                  ? {
                      ...m,
                      content: finalContent,
                      error: !result.ok,
                      streaming: false,
                      usedConnectors: result.usedConnectors,
                      restartedReason: result.restartedReason,
                      ...withSteps,
                    }
                  : m,
              ),
              ...done,
            };
          }
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: finalContent,
            error: !result.ok,
            createdAt: Date.now(),
            usedConnectors: result.usedConnectors,
            restartedReason: result.restartedReason,
            ...withSteps,
          };
          return { ...s, messages: [...s.messages, assistantMessage], ...done };
        }),
      );
    },
    [config?.axetWorkspaceDir, projects, t],
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
    // Kimlik ÜRETİLMİYOR, devralınıyor: kullanıcı yazarken ısıtılan kalıcı
    // oturum bu kimlikle açıldı (bkz. prewarmTargetRef). Bir sonraki yeni
    // sohbet için hemen taze bir kimlik hazırlanıyor.
    const id = newChatIdRef.current;
    newChatIdRef.current = crypto.randomUUID();
    const now = Date.now();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: now,
      ...(attachments.length > 0 ? { attachments } : {}),
    };
    const session: ChatSession = {
      id,
      // Metin yoksa başlık ilk ekin adından — başlıksız bir satır listede
      // hiçbir şey anlatmıyor.
      title: deriveTitle(text || attachments[0].name),
      // Karşılama balonu sohbete de taşınıyor — sadece boş ekranda dursaydı
      // ilk mesajla birlikte kaybolur, kullanıcı geçmişe döndüğünde bu
      // sohbetin hangi sisteme ve hangi bağlantı durumuna ait olduğunu
      // göremezdi.
      messages: noticeMessage ? [noticeMessage, userMessage] : [userMessage],
      model: defaultModel,
      draft: "",
      attachments: [],
      pending: false,
      requestId: null,
      activity: null,
      activitySteps: [],
      pendingAsk: null,
      todos: [],
      contextTokens: 0,
      contextLimit: 0,
      editUndo: null,
      cancelStuck: false,
      createdAt: now,
      updatedAt: now,
      // Taslakta bekleyen SAP bağlamı burada kalıcılaşıyor.
      cwd: effectiveNewBinding?.cwd ?? null,
      sapLabel: effectiveNewBinding?.label ?? null,
      // Proje aidiyeti de aynı şekilde: sohbet ancak burada doğduğu için
      // "hangi projede açtım" bilgisi ilk mesaja kadar taslakta bekliyordu.
      projectId: newProjectId,
      keepInGeneral: newKeepInGeneral,
    };
    setSessions((prev) => [...prev, session]);
    setActiveId(id);
    setNewDraft("");
    setNewAttachments([]);
    setNewBinding(null);
    setNewNotice(null);
    setNewProjectId(null);
    setNewKeepInGeneral(true);
    // Geçmiş BOŞ gidiyor, karşılama balonu dahil değil: o balon ajanın
    // ürettiği bir tur değil, bizim bastığımız bir özet. Ajan aynı bilgiyi
    // zaten proje klasöründeki `sap-context.md`den okuyor (bkz. runPrompt'taki
    // `sessionCwd` notu), ikinci kez ve uydurma bir "asistan turu" olarak
    // göndermek gereksiz.
    await runPrompt(
      id,
      promptWithAttachments(text, attachments),
      [],
      defaultModel,
      session.cwd,
      session.projectId,
    );
  }, [
    defaultModel,
    newAttachments,
    effectiveNewBinding,
    newDraft,
    newKeepInGeneral,
    newProjectId,
    noticeMessage,
    runPrompt,
  ]);

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
      .filter(isNotConnectNotice)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role,
        content: promptWithAttachments(m.content, m.attachments ?? []),
      }));
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      ...(attachments.length > 0 ? { attachments } : {}),
    };
    const isFirstMessage = session.messages.length === 0;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              title: isFirstMessage
                ? deriveTitle(text || attachments[0].name)
                : s.title,
              messages: [...s.messages, userMessage],
              draft: "",
              attachments: [],
              // Düzeltilmiş soru gönderildi: artık geri alınacak bir düzenleme
              // yok. Şerit burada silinmeseydi, kesilen kuyruğu yeni cevabın
              // ARDINA yapıştıran bir düğme olarak kalırdı.
              editUndo: null,
            }
          : s,
      ),
    );

    // Bekleyen bir düzenleme varsa (`editUndo`) dallandırma ŞİMDİ kesinleşiyor:
    // ajanın hafızası da o mesaja kadar geri sarılıyor, yoksa kesme yalnızca
    // bizim listemizde olur ve ajan hem eski hem düzeltilmiş soruyu görürdü.
    //
    // Sıfırlama KALEME BASILDIĞINDA DEĞİL BURADA: kalemde yapıldığında
    // düzenlemeden vazgeçen kullanıcı (geri al) da bedeli ödüyordu — axet-code
    // oturumu kapanmış, o oturumdaki ARAÇ SONUÇLARI gitmiş oluyordu. Kalıcı
    // oturum mimarisinin var olma sebebi tam olarak o sonuçları korumak
    // (bkz. axetChatTui.ts başlığı, madde 3). Yukarı ok da artık düzenlemeyi
    // tek tuşa indirdiği için bu yanlışlıkla çok kolay tetiklenir hâle
    // gelmişti.
    if (session.editUndo)
      await window.api.resetChatHistory(activeId).catch(() => false);
    await runPrompt(
      activeId,
      promptWithAttachments(text, attachments),
      historyForCall,
      session.model,
      session.cwd,
      session.projectId,
    );
  }, [activeId, handleSendNew, runPrompt, sessions]);

  // Gönderilmiş bir kullanıcı mesajını düzenle: metni composer'a geri koy ve
  // sohbeti O MESAJDAN İTİBAREN kes. Sonrasındaki cevap(lar) düzeltilmiş
  // soruya ait olmadığı için bağlamda tutulmaları yanlış olurdu — üç referans
  // arayüz de aynı şeyi yapıyor.
  //
  // Kesilen kuyruk artık GERİ ALINABİLİR (`editUndo`): kesme kalıcıydı ve
  // uyarısızdı, yani yanlış mesajın kalemine basmak yarım sohbeti siliyordu.
  //
  // Ajanın hafızası da geri sarılıyor — ama BURADA DEĞİL, düzeltilmiş mesaj
  // gerçekten gönderildiğinde (`handleSend`). Kesme yalnızca bizim listemizde
  // kalsaydı arkadaki axet-code oturumu tüm geçmişi hatırlamaya devam eder,
  // ajan hem eski hem düzeltilmiş soruyu görürdü; yani dallandırma sadece
  // ekranda olurdu. Sıfırlamayı gönderime ertelemenin sebebi, vazgeçmenin
  // bedava olması: buradan sıfırlansaydı kalemine basıp fikrini değiştiren
  // kullanıcı da oturumdaki araç sonuçlarını kaybederdi.
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
            editUndo: {
              messages: s.messages.slice(idx),
              draft: s.draft,
              attachments: s.attachments,
            },
            draft: content,
            // Ekler de composer'a geri geliyor: düzenlenen mesaj bir görselle
            // gönderildiyse, düzeltilmiş hâlinin o görseli kaybetmesi
            // kullanıcının istediği şey değil.
            attachments: s.messages[idx].attachments ?? [],
            updatedAt: Date.now(),
          };
        }),
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
    [activeId],
  );

  // Düzenlemeyi geri al: kesilen kuyruk ve composer'ın eski hâli birlikte
  // dönüyor. Ayrı ayrı dönselerdi, düzenlenmek üzere kutuya konan metin
  // kutuda kalır ve aynı mesaj iki yerde görünürdü.
  //
  // Ajanın hafızasına DOKUNULMAMIŞ oluyor: sıfırlama gönderime ertelendiği
  // için (bkz. `handleSend`) buraya gelen kullanıcı hiçbir şey kaybetmiyor —
  // axet-code oturumu, içindeki araç sonuçlarıyla birlikte olduğu gibi duruyor.
  const handleUndoEdit = useCallback(() => {
    if (!activeId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId || !s.editUndo) return s;
        return {
          ...s,
          messages: [...s.messages, ...s.editUndo.messages],
          draft: s.editUndo.draft,
          attachments: s.editUndo.attachments,
          editUndo: null,
          updatedAt: Date.now(),
        };
      }),
    );
  }, [activeId]);

  // Son cevabı at, AYNI istemi yeniden çalıştır.
  //
  // Ajanın hafızası da geri sarılıyor. Kalıcı TUI'de bu şart: sarılmazsa ajan
  // az önceki cevabını hatırlıyor ve "yeniden üret" bir tekrar değil, kendi
  // cevabının üstüne konuşma oluyor — kullanıcının istediği şeyin tersi.
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

    const prompt = promptWithAttachments(
      msgs[userIndex].content,
      msgs[userIndex].attachments ?? [],
    );
    const historyForCall: AxetChatMessage[] = msgs
      .slice(0, userIndex)
      .filter(isNotConnectNotice)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role,
        content: promptWithAttachments(m.content, m.attachments ?? []),
      }));

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId ? { ...s, messages: msgs.slice(0, lastIndex) } : s,
      ),
    );
    // BEKLENİYOR ama beklediği şey sıfırlamanın BİTMESİ değil, BAŞLAMASI:
    // çağrı, palet tuşu yazılır yazılmaz dönüyor. Tuşlar ile istem arasındaki
    // ~1,6 saniyelik payı ana süreç tutuyor (bkz. axetChatTui.ts `resetting`).
    // Buradaki await'in işi sıralama: sıfırlama IPC'si gönderim IPC'sinden
    // sonra varsa palet, istem gittikten SONRA açılırdı.
    await window.api.resetChatHistory(activeId).catch(() => false);
    await runPrompt(
      activeId,
      prompt,
      historyForCall,
      session.model,
      session.cwd,
      session.projectId,
    );
  }, [activeId, runPrompt, sessions]);

  // Yarıda kalmış son cevabı KALDIĞI YERDEN sürdür (bkz. `interrupted`).
  //
  // `handleRegenerate`'in tersi: orada üretilmiş metin atılıyor, burada
  // korunuyor. Kullanıcı uygulamayı cevap üretilirken kapattığında pty de
  // ölüyor, yani tur kendiliğinden devam edemiyor (axetChatRecovery yalnızca
  // o ana kadarki metni geri getirebiliyor). Sürdürmenin tek yolu yeni bir
  // tur — ama ajanın yarım metni görmesi şartıyla.
  const handleContinue = useCallback(async () => {
    if (!activeId) return;
    const session = sessions.find((s) => s.id === activeId);
    if (!session || session.pending) return;
    const msgs = session.messages;
    const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    // Yalnızca SON mesaj sürdürülüyor; ChatSessionPane düğmeyi zaten sadece
    // orada çiziyor, bu ikinci kapı IPC gecikmesine karşı.
    if (!last || last.role !== "assistant" || !last.interrupted || last.error)
      return;
    const targetId = last.id;

    // Geçmişe YARIM CEVAP DA giriyor (`slice` son mesajı kesmiyor): ajan neyi
    // yazdığını görmeden "kaldığın yerden devam et" anlamsız bir istem olurdu.
    const historyForCall: AxetChatMessage[] = msgs
      .filter(isNotConnectNotice)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role,
        content: promptWithAttachments(m.content, m.attachments ?? []),
      }));

    await runPrompt(
      activeId,
      t("axetCodeHome.continuePrompt"),
      historyForCall,
      session.model,
      session.cwd,
      session.projectId,
    );

    // İki balon tek balona indiriliyor: kullanıcı açısından bu BİR cevap, ikiye
    // bölünmüş olması bizim kaza eserimiz. Devam üretilemediyse (hata/iptal/boş)
    // dokunulmuyor — yarım cevap uyarısıyla birlikte olduğu gibi kalsın ki
    // düğme yeniden denenebilir olsun.
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        const tail =
          s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
        if (
          !tail ||
          tail.id === targetId ||
          tail.role !== "assistant" ||
          tail.error
        )
          return s;
        const extra = tail.content.trim();
        if (!extra) return s;
        // Araç dökümleri de birleşiyor. Boşsa alan HİÇ eklenmiyor: geçmiş
        // dosyası boş dizilerle şişmesin (bkz. `runPrompt` içindeki aynı kural).
        const mergeSteps = (m: ChatMessage) => {
          const steps = [...(m.steps ?? []), ...(tail.steps ?? [])];
          return steps.length > 0 ? { steps } : {};
        };
        return {
          ...s,
          messages: s.messages
            .filter((m) => m.id !== tail.id)
            .map((m) =>
              m.id === targetId
                ? {
                    ...m,
                    content: `${m.content.trimEnd()}\n\n${extra}`,
                    // Artık yarım değil: uyarı da düğme de kalkıyor.
                    interrupted: false,
                    ...mergeSteps(m),
                  }
                : m,
            ),
          updatedAt: Date.now(),
        };
      }),
    );
  }, [activeId, runPrompt, sessions, t]);

  // Uyarıyı kapat. Kalıcı bir şeridi kapatmanın yolu olmalı: bir sonraki
  // mesaja kadar orada duruyor ve o mesaj hiç gelmeyebilir.
  const handleDismissCancelStuck = useCallback(() => {
    if (!activeId) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, cancelStuck: false } : s)),
    );
  }, [activeId]);

  const handleCancel = useCallback(() => {
    if (!activeSession?.requestId) return;
    window.api.cancelChatMessage(activeSession.requestId).catch(() => {});
  }, [activeSession]);

  // Ajanın sorduğu sorunun cevabı. Kartı hemen kaldırıyoruz: tuşlar TUI'deki
  // kutuya gidiyor ve kutu kapanıyor — açık kalan bir kart, artık var olmayan
  // bir kutuya tuş gönderen ölü bir düğme olurdu. Ana süreç de kendi tarafında
  // aynı korumayı yapıyor (bkz. axetChatTui.ts `answerTuiQuestion`), bu sadece
  // kullanıcının gördüğü gecikmeyi kapatıyor.
  const handleAnswerQuestion = useCallback(
    (index: number | number[], customText?: string) => {
      const requestId = activeSession?.requestId;
      if (!requestId) return;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, pendingAsk: null } : s,
        ),
      );
      window.api
        .answerChatQuestion(requestId, index, customText)
        .catch(() => {});
    },
    [activeSession],
  );

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
      return [
        ...existing,
        ...toAttachments(paths.filter((p) => !known.has(p))),
      ];
    };
    if (sessionId === NEW_SESSION_ID) {
      setNewAttachments(merge);
      return;
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, attachments: merge(s.attachments) } : s,
      ),
    );
  }, []);

  const removeAttachment = useCallback(
    (sessionId: string, attachmentId: string) => {
      if (sessionId === NEW_SESSION_ID) {
        setNewAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        return;
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                attachments: s.attachments.filter((a) => a.id !== attachmentId),
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleAttachFiles = useCallback(async () => {
    setAttaching(true);
    try {
      const paths = await window.api.pickFiles();
      if (paths.length === 0) return;
      addAttachments(activeId ?? NEW_SESSION_ID, paths);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      pushToast(
        "error",
        t("axetCodeHome.attachFailed", { message: (err as Error).message }),
      );
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
      setSessions((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, draft: value } : s)),
      );
    },
    [activeId],
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
        const result = await window.api.transcribeDictation(
          recording.base64,
          "auto",
        );
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
        const current = activeId
          ? (sessions.find((s) => s.id === activeId)?.draft ?? "")
          : newDraft;
        handleDraftChange(
          current.length > 0 ? `${current.trimEnd()} ${spoken}` : spoken,
        );
        requestAnimationFrame(() => textareaRef.current?.focus());
      } catch (err) {
        pushToast(
          "error",
          t("axetCodeHome.dictateFailed", { message: (err as Error).message }),
        );
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
      pushToast(
        "error",
        t("axetCodeHome.dictateMicFailed", { message: (err as Error).message }),
      );
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
  // Kuyruğu ekrana akıtan tik.
  //
  // NEDEN KUYRUK VAR: axet-code cevabı veritabanına LOKMA LOKMA yazıyor.
  // Yoklama aralığını 250 ms'den 90 ms'ye indirmek metnin geliş ritmini
  // değiştirmedi (2026-09-05) — darboğaz bizim okumamız değil, satırın
  // kaynağa yazılma anı. Gelen parça doğrudan ekrana basılınca cevap yüzlerce
  // karakterlik bloklar hâlinde zıplayarak beliriyordu (kullanıcı: *"cevap
  // mesajını böyle kasarak yazıyor, seri şekilde yazması lazım"*).
  //
  // Pay her tikte kuyruğun SABİT BİR ORANI (1/6): kuyruk büyüdükçe hız da
  // büyüyor, yani büyük bir lokma geldiğinde geride kalmıyor — kuyruk her
  // zaman ~6 tikte (≈200 ms) eriyor. Sabit "n karakter/tik" olsaydı hızlı
  // cevaplarda gecikme birikirdi.
  //
  // Kare hızı bilinçli olarak 30/sn: `renderMarkdownLite` ölçümde 7,5 KB'lık
  // bir cevap için 1,07 ms (2026-09-05) ve `ChatBubble` memo'lu olduğu için
  // tik başına yalnızca AKAN balon yeniden çiziliyor.
  const drainStreams = useCallback(() => {
    const q = streamQueue.current;
    if (q.size === 0) {
      if (streamTimer.current !== null)
        window.clearInterval(streamTimer.current);
      streamTimer.current = null;
      return;
    }
    // Önce bu tikte basılacak paylar hesaplanıyor, sonra TEK bir state
    // güncellemesiyle uygulanıyor.
    const slice = new Map<string, string>();
    for (const [requestId, pending] of q) {
      const take = Math.max(3, Math.ceil(pending.length / STREAM_DRAIN_TICKS));
      slice.set(requestId, pending.slice(0, take));
      const rest = pending.slice(take);
      if (rest) q.set(requestId, rest);
      else q.delete(requestId);
    }
    setSessions((prev) =>
      prev.map((s) => {
        const text = s.requestId ? slice.get(s.requestId) : undefined;
        if (!text) return s;
        const last =
          s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
        if (last?.streaming === true) {
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === last.id ? { ...m, content: m.content + text } : m,
            ),
          };
        }
        const streamingMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: text,
          createdAt: Date.now(),
          streaming: true,
        };
        return { ...s, messages: [...s.messages, streamingMessage] };
      }),
    );
  }, []);

  useEffect(() => {
    return window.api.onChatChunk((requestId, text) => {
      if (!text) return;
      const q = streamQueue.current;
      q.set(requestId, (q.get(requestId) ?? "") + text);
      if (streamTimer.current === null) {
        streamTimer.current = window.setInterval(drainStreams, STREAM_TICK_MS);
      }
    });
  }, [drainStreams]);

  // Bileşen sökülürse zamanlayıcı arkada dönmesin.
  useEffect(() => {
    return () => {
      if (streamTimer.current !== null)
        window.clearInterval(streamTimer.current);
      streamTimer.current = null;
      streamQueue.current.clear();
    };
  }, []);

  // Alt sürecin aşama bildirimleri. Cevap beklenirken arayüzde yalnızca yanıp
  // sönen çubuklar vardı ve hiçbir şey söylemiyorlardı (kullanıcı bildirimi,
  // 2026-09-04). Kaynak `axet-code run -v`'nin canlı stderr'i (bkz.
  // axetChat.ts). Akış aboneliğiyle aynı desen: bir kez kuruluyor, state'e
  // yalnızca fonksiyonel `setSessions` ile dokunuyor.
  useEffect(() => {
    return window.api.onChatActivity((requestId, activity) => {
      setSessions((prev) =>
        // Eşleşme yoksa AYNI dizi döndürülüyor: geç kalmış bir bildirim
        // (istek çoktan bitmiş) boşuna bir render tetiklemesin.
        prev.some((s) => s.requestId === requestId)
          ? prev.map((s) =>
              s.requestId === requestId ? applyActivity(s, activity) : s,
            )
          : prev,
      );
    });
  }, []);

  // Ajanın planı + bağlam doluluğu. Ayrı bir kanal, ayrı bir abonelik: bu
  // olaylar saniyede bir ve yalnızca DEĞİŞTİĞİNDE geliyor (bkz.
  // axetChatTui.ts `PROGRESS_MS`), etkinlik akışına karıştırılsalardı araç
  // dökümünü anlamsız satırlarla doldururlardı.
  useEffect(() => {
    return window.api.onChatProgress((requestId, progress) => {
      setSessions((prev) =>
        prev.some((s) => s.requestId === requestId)
          ? prev.map((s) =>
              s.requestId === requestId
                ? {
                    ...s,
                    todos: progress.todos,
                    contextTokens: progress.contextTokens,
                    contextLimit: progress.contextLimit,
                  }
                : s,
            )
          : prev,
      );
    });
  }, []);

  // "Durdur" gerçekten durdurdu mu? Karar iptalden 1–4 saniye SONRA geliyor,
  // çünkü ana süreç esc'i yazdıktan sonra axet-code'un veritabanına bakıp
  // doğruluyor (bkz. axetChatTui.ts `cancelTui`). Bu yüzden ayrı bir kanal ve
  // `requestId` yerine `chatId`: istek çoktan çözülmüş, oturumun `requestId`'si
  // `null`'lanmış oluyor.
  //
  // Sessiz kalmak bir seçenek değildi: iptal tutmadığında ekranda hiçbir iz
  // olmuyor, kullanıcı "durdurdum" sanıyor, tur arkada üretmeye ve jeton
  // harcamaya devam ediyordu.
  useEffect(() => {
    return window.api.onChatCancelResult((chatId, verdict) => {
      if (verdict.stopped) return;
      setSessions((prev) =>
        prev.some((s) => s.id === chatId)
          ? prev.map((s) => (s.id === chatId ? { ...s, cancelStuck: true } : s))
          : prev,
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
  const prewarmTargetRef = useRef<{
    cwd: string;
    model: AxetModelEntry | null;
    chatId: string;
  }>({
    cwd: "",
    model: null,
    chatId: "",
  });
  const activeDraft = activeId
    ? (sessions.find((s) => s.id === activeId)?.draft ?? "")
    : newDraft;
  useEffect(() => {
    const session = activeId
      ? (sessions.find((s) => s.id === activeId) ?? null)
      : null;
    prewarmTargetRef.current = {
      cwd:
        (session ? session.cwd : (effectiveNewBinding?.cwd ?? null)) ||
        config?.axetWorkspaceDir ||
        "",
      model: session ? session.model : defaultModel,
      // Yeni sohbette kimlik henüz "yok" değil, ÖNCEDEN üretilmiş
      // (newChatIdRef): ısıtılan kalıcı oturum ile birazdan oluşacak sohbet
      // aynı kimliği paylaşsın diye. Paylaşmasalardı ilk mesaj ısıtmadan hiç
      // faydalanamaz, ısınan oturum da sahipsiz kalırdı.
      chatId: session ? session.id : newChatIdRef.current,
    };
  });

  useEffect(() => {
    // Boş taslak = ortada gönderilecek bir şey yok; süreç açmak boşuna.
    if (!activeDraft.trim()) return;
    const timer = setTimeout(() => {
      const { cwd, model, chatId } = prewarmTargetRef.current;
      // Taslak da gidiyor: bağlayıcıların (Outlook vb.) ısıtma sırasında
      // kurulup kurulmayacağına metne bakılarak karar veriliyor. Kullanıcı
      // "mail" yazdığı anda doğru oturum kurulmaya başlıyor, yoksa o kurulum
      // Gönder'e basıldıktan SONRA yapılıyor ve altı saniye görünür oluyordu.
      // Ateşle-unut: ısıtma başarısız olsa da asıl gönderim eskisi gibi
      // çalışıyor, bu yüzden hatası kullanıcıya gösterilecek bir şey değil.
      window.api.prewarmChat(cwd, model, chatId, activeDraft).catch(() => {});
    }, PREWARM_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [activeDraft]);

  const greeting = useMemo(greetingKey, []);

  // Havuzdan bu turun üç kartı. Bağımlılıklar bilerek dar: kullanıcı "yeni
  // sohbet"e basmadıkça (tohum) ya da bağlam gerçekten değişmedikçe (SAP
  // sistemi bağlandı / bir uygulama bağlandı) kartlar yerinde duruyor.
  const hasSapContext = recentEntries.length > 0;
  const hasConnectorContext = Object.values(
    config?.connectorEnabled ?? {},
  ).some(Boolean);
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
  const orderedSessions = useMemo(
    () => sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

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
        s.messages.some((m) =>
          m.content.toLocaleLowerCase("tr").includes(normalizedQuery),
        ),
    );
  }, [normalizedQuery, orderedSessions]);

  // --- Kenar çubuğu grupları (ChatGPT'nin "projeler" yapısı) ---
  //
  // Kullanıcı isteği (2026-09-06): *"sisteme bağlantı yaptığımız sohbetlerle
  // normal sohbetlerin başlıkları ayrı olsun ayrı başlıklar altında olsunlar
  // ve daraltıp genişletme olayı olsun"*. Önceden liste tamamen düzdü ve bir
  // SAP sohbetiyle sıradan bir sohbet aynı görünüyordu.
  //
  // Gruplama anahtarı `cwd` — sohbette sistem uuid'si yok, proje klasörü ise
  // sisteme özel ve kalıcı. Etiket olarak `sapLabel` kullanılıyor, yoksa
  // klasör adına düşülüyor: eski (etiketi diske yazılmadan önce kaydedilmiş)
  // sohbetler bile grupsuz kalmıyor.
  // Bölüm başlıklarının kendi anahtarları. `cwd` hiçbir zaman bu biçimde
  // olamayacağı için sistem gruplarıyla çakışmıyorlar.
  const GENERAL_GROUP_KEY = "__general__";
  const SAP_SECTION_KEY = "__sap__";
  const PROJECTS_SECTION_KEY = "__projects__";
  const sessionGroups = useMemo(() => {
    const byProject = new Map<string, ChatSession[]>();
    const sap = new Map<
      string,
      { key: string; cwd: string; label: string; sessions: ChatSession[] }
    >();
    const general: ChatSession[] = [];
    // Silinmiş bir projeye işaret eden `projectId` YOK SAYILIYOR: sohbet
    // görünmez bir grubun içinde kaybolmak yerine sistemine/geneline düşüyor.
    const knownProjects = new Set(projects.map((p) => p.id));
    for (const s of visibleSessions) {
      // Proje, `cwd`'yi YENİYOR: proje bilinçli bir seçim, `cwd` ise
      // bağlantının yan ürünü. Bir SAP sohbeti bir projeye taşındıysa
      // kullanıcı onu orada görmek istiyor demektir.
      if (s.projectId && knownProjects.has(s.projectId)) {
        const list = byProject.get(s.projectId);
        if (list) list.push(s);
        else byProject.set(s.projectId, [s]);
        continue;
      }
      const cwd = s.cwd ?? "";
      // `keepInGeneral`: elle "Yeni sohbet" ile açılmış sohbet. `cwd`'si olsa
      // bile sistem grubuna girmiyor — bkz. shared/types.ts.
      if (!cwd || s.keepInGeneral) {
        general.push(s);
        continue;
      }
      const key = cwd.toLowerCase();
      const existing = sap.get(key);
      if (existing) {
        existing.sessions.push(s);
      } else {
        sap.set(key, {
          key,
          // Anahtar küçük harfe çevrilmiş; grubun "+" düğmesinin yeni sohbete
          // vereceği klasör yolu ise ÖZGÜN hâliyle gerekiyor.
          cwd,
          label: s.sapLabel || cwd.split(/[\\/]/).filter(Boolean).pop() || cwd,
          sessions: [s],
        });
      }
    }
    // `visibleSessions` zaten en yeniden eskiye sıralı, dolayısıyla her grubun
    // ilk üyesi o grubun en tazesi — gruplar da ona göre sıralanıyor.
    const sapGroups = Array.from(sap.values()).sort(
      (a, b) => b.sessions[0].updatedAt - a.sessions[0].updatedAt,
    );
    // Projeler SOHBETSİZ de listeleniyor (SAP gruplarının aksine): yeni
    // kurulan bir proje boş doğuyor ve görünmeseydi kullanıcı onu kurduğunu
    // sanıp içine sohbet açamazdı. Ama ARAMA sırasında boşlar gizleniyor —
    // aramanın sonucu, eşleşmesi olmayan başlıklarla dolmamalı.
    const searching = Boolean(normalizedQuery);
    const projectGroups = projects
      .map((project) => ({
        key: project.id,
        project,
        sessions: byProject.get(project.id) ?? [],
      }))
      .filter((g) => !searching || g.sessions.length > 0)
      .sort(
        (a, b) =>
          (b.sessions[0]?.updatedAt ?? b.project.createdAt) -
          (a.sessions[0]?.updatedAt ?? a.project.createdAt),
      );
    return { projectGroups, sapGroups, general };
  }, [normalizedQuery, projects, visibleSessions]);

  // Yalnızca DARALTILMIŞ olanlar tutuluyor: varsayılan açık. Daraltma isteğe
  // bağlı bir sadeleştirme, açılışta gizlenmesi gereken bir şey değil.
  // Kalıcı değil (oturum içi) — kenar çubuğunun açık/kapalı durumu gibi.
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  // Arama sırasında daraltma YOK SAYILIYOR: eşleşen bir sohbet kapalı bir
  // grubun içinde kalsaydı arama bozuk görünürdü.
  const groupOpen = (key: string) =>
    Boolean(normalizedQuery) || !collapsedGroups[key];

  // Klavye kısayolları. Ctrl+N (yeni sohbet) yukarıda, sohbet İÇİ arama (Ctrl+F)
  // ChatSessionPane'de — buradakiler sohbetler ARASI olanlar.
  //
  // `orderedSessions`'a bağlı olduğu için bilinçli olarak BURADA duruyor,
  // yukarıdaki efektlerin yanında değil: `const` bir liste kendinden önceki bir
  // efektin bağımlılığı olamaz (TDZ) ve tsc bunu YAKALAMIYOR.
  //
  // Esc'in bir metin kutusundayken de çalışması bilinçli: kullanıcının
  // "durdur" demek isteyeceği an, çoğunlukla bir sonraki mesajı yazmaya
  // başladığı andır. Yerel bir Esc anlamı olan yerler (bahis menüsü, soru
  // kartındaki serbest metin) olayı kendileri yutuyor.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const session = activeId
        ? (sessions.find((s) => s.id === activeId) ?? null)
        : null;
      // Liste açıkken Esc ÖNCE listeyi kapatır — arkada bir tur sürüyorsa
      // yardım kutusunu kapatmak isterken cevabı iptal etmiş olmayalım.
      if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
        return;
      }
      if (e.key === "Escape" && session?.pending && session.requestId) {
        e.preventDefault();
        window.api.cancelChatMessage(session.requestId).catch(() => {});
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "ArrowUp" || e.key === "ArrowDown")
      ) {
        if (orderedSessions.length === 0) return;
        e.preventDefault();
        const at = orderedSessions.findIndex((s) => s.id === activeId);
        // Sohbet listesi açıkken (activeId yok) ilk/son sohbete giriliyor.
        const next =
          at < 0
            ? e.key === "ArrowDown"
              ? 0
              : orderedSessions.length - 1
            : (at + (e.key === "ArrowDown" ? 1 : -1) + orderedSessions.length) %
              orderedSessions.length;
        setActiveId(orderedSessions[next].id);
        return;
      }
      // F1 (kullanıcı seçimi, 2026-09-05). Önce Ctrl+/ idi ve TÜRKÇE KLAVYEDE
      // `/` = Shift+7, yani kısayol gerçekte Ctrl+Shift+7 oluyordu — çalışıyor
      // ama basılmıyor. Modifier'sız F1 hem klasik "yardım" tuşu hem de
      // düzen-bağımsız.
      if (e.key === "F1") {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, activeId, orderedSessions, sessions, shortcutsOpen]);

  const deleteTarget = deleteId
    ? (sessions.find((s) => s.id === deleteId) ?? null)
    : null;
  const projectDialog = projectDialogId
    ? (projects.find((p) => p.id === projectDialogId) ?? null)
    : null;
  // "Projeye taşı" menüsünün açık olduğu sohbet — o an hangi projede olduğunu
  // (ve "projeden çıkar"ın gösterilip gösterilmeyeceğini) buradan okuyor.
  const moveTarget = moveMenu
    ? (sessions.find((s) => s.id === moveMenu.sessionId) ?? null)
    : null;

  // Sohbete özel klasörü olmayan sohbetlerin kökü/çalışma klasörü.
  const workspaceDir = config?.axetWorkspaceDir ?? "";

  // "Günaydın" yerine "Günaydın, Tufan". Ad, Ayarlar'daki `chatDisplayName`
  // (varsayılanı Windows oturum adı); BOŞ bırakılırsa adsız hâle düşüyor —
  // ekranı başkasına gösteren biri adını kaldırabilmeli. Ayrıca oturum adı
  // bazı kurumlarda sicil numarası oluyor ("10134570, günaydın" saçma olurdu),
  // o yüzden ad kullanıcı tarafından düzeltilebilir olmak zorunda.
  const baseGreeting = t(
    `axetCodeHome.greeting.${greeting}` as Parameters<typeof t>[0],
  );
  const displayName = config?.chatDisplayName?.trim() ?? "";
  const greetingText = displayName
    ? t("axetCodeHome.greetingWithName", {
        greeting: baseGreeting,
        name: displayName,
      })
    : baseGreeting;

  // AÇILIŞ EKRANINDAKİ "SON ÇALIŞMALAR" (bkz. ChatSessionPane RecentWorkItem).
  //
  // Kenar çubuğundaki listeyle aynı kaynaktan besleniyor ama aynı şeyi
  // söylemiyor: orada başlıklar proje/SAP başlıkları altında gruplu duruyor,
  // burada her satır kendi zamanını, yerini ve turun sürüp sürmediğini
  // taşıyor.
  //
  // Mesajsız oturumlar eleniyor: bir sohbet ilk gönderimde doğuyor, ama
  // "çalışma" demek için içinde bir şey olması gerek.
  const recentWork = useMemo<RecentWorkItem[]>(() => {
    const projectNames = new Map(projects.map((p) => [p.id, p.name]));
    return [...sessions]
      .filter((s) => s.messages.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      // Üç DEĞİL on iki: bölümün "Tümünü gör"ü listeyi yerinde açıyor, yani
      // görünenden fazlasının burada olması gerekiyor. Yine de sınırsız
      // değil — açılış ekranı bir sohbet arşivi değil, kenar çubuğu zaten
      // tam listeyi tutuyor.
      .slice(0, 12)
      .map((s) => {
        const projectName = s.projectId ? (projectNames.get(s.projectId) ?? null) : null;
        // Proje yoksa çalışma klasörünün adı: `cwd` tam yol, kullanıcıya
        // anlamlı gelen kısım son parçası.
        const folder = s.cwd ? (s.cwd.split(/[\\/]/).filter(Boolean).pop() ?? null) : null;
        return {
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt,
          project: projectName ?? folder,
          system: s.sapLabel,
          running: s.pending,
          stuck: s.cancelStuck,
        };
      });
  }, [sessions, projects]);

  // Boş "yeni sohbet" yüzeyi. Gerçek bir kayıt değil — sadece ChatSessionPane'in
  // beklediği şekle bürünmüş bir taslak, böylece açılış ekranı ile sohbet ekranı
  // AYNI bileşen (ve aynı composer) oluyor.
  const newSessionView = {
    id: NEW_SESSION_ID,
    // Bağlantı karşılaması varsa boş ekran yerine O görünüyor: sisteme yeni
    // bağlanmış birine genel öneri kartları göstermek, elimizdeki tek somut
    // bilgiyi (bağlandık mı, bağlanamadık mı) saklamak demekti.
    messages: (noticeMessage ? [noticeMessage] : []) as ChatMessage[],
    model: defaultModel,
    draft: newDraft,
    attachments: newAttachments,
    pending: false,
    activity: null,
    activitySteps: [],
    pendingAsk: null,
    todos: [],
    contextTokens: 0,
    contextLimit: 0,
    editUndo: null,
    cancelStuck: false,
  };

  // Kenar çubuğundaki tek satır. Ayrı bir fonksiyon çünkü artık iki kat
  // (grup > satır) içinde çağrılıyor ve JSX'i yerinde bırakmak listeyi
  // okunmaz hâle getiriyordu.
  const renderSessionRow = (session: ChatSession) => {
    const isActive = activeId === session.id;
    if (renamingId === session.id) {
      return (
        <div
          key={session.id}
          className="flex items-center gap-2 rounded-md border border-line bg-control px-2.5 py-1.5"
        >
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
            className="min-w-0 flex-1 rounded bg-app px-2 py-0.5 text-[13px] text-slate-100 outline-none ring-1 ring-accent-500/50"
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
            ? "border-line bg-control text-slate-100"
            : "border-transparent text-slate-400 hover:bg-hover/60 hover:text-slate-300"
        }`}
      >
        {/* Sohbet ikonu KALDIRILDI (kullanıcı isteği, 2026-09-06: *"chat
            kısmında sohbetlerin yanındaki iconu kaldıralım"*). Bir sohbet
            listesinde her satıra "bu bir sohbettir" ikonu koymak bilgi
            taşımıyordu; kalkınca başlıklar da ~22px daha geniş yer buldu,
            yani daha azı kırpılıyor. Seçili satırın işareti zaten kendi
            zemini + kenarlığı. */}
        <span className="min-w-0 flex-1 truncate">{session.title}</span>
        {session.pending && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
        )}
        {/* "Projeye taşı" — yalnızca gidecek bir proje varsa. Proje kurmamış
            kullanıcıya boş bir menü açan düğme göstermenin anlamı yok.
            Menü SABİT konumlu (bkz. `moveMenu`): kaydırılan listenin içinde
            açılsaydı listeyle kayar ve kenar çubuğunun sınırında kırpılırdı. */}
        {projects.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              // Alt kenara sıkıştırma: listenin en altındaki bir sohbette menü
              // ekranın dışında açılır ve tıklanamaz olurdu.
              setMoveMenu({
                sessionId: session.id,
                x: rect.left,
                y: Math.min(
                  rect.bottom + 4,
                  window.innerHeight - MOVE_MENU_MAX_H - 8,
                ),
              });
            }}
            title={t("axetCodeHome.moveToProject")}
            className="shrink-0 cursor-pointer rounded p-1 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <FolderInput size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRenameDraft(session.title);
            setRenamingId(session.id);
          }}
          title={t("axetCodeHome.renameTitle")}
          className="shrink-0 cursor-pointer rounded p-1 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Pencil size={12} />
        </button>
        {/* Dışa aktarma yalnızca DOLU sohbetlerde: boş bir sohbetin dosyası
            yalnızca başlıktan ibaret olurdu. Biçim seçimi burada DEĞİL,
            kaydetme kutusunun kendi "dosya türü" listesinde — bu şeride ikinci
            bir ikon koymak gürültü olurdu. */}
        {session.messages.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleExportSession(session.id);
            }}
            title={t("axetCodeHome.exportTitle")}
            className="shrink-0 cursor-pointer rounded p-1 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Download size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            requestDeleteSession(session.id);
          }}
          title={t("axetCodeHome.deleteTitle")}
          // `focus-visible:opacity-100` olmadan bu buton klavyeyle gezildiğinde
          // odaklanıyor ama GÖRÜNMÜYORDU.
          className="shrink-0 cursor-pointer rounded p-1 text-slate-500 opacity-0 transition hover:bg-active hover:text-[var(--status-danger-text)] focus-visible:opacity-100 group-hover:opacity-100"
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
        className={`flex shrink-0 flex-col overflow-hidden border-r border-line-subtle bg-sidebar transition-[width] duration-200 ${
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
            <div className="flex min-w-0 flex-1 items-center rounded-lg bg-control ring-1 ring-inset ring-line focus-within:ring-accent-500/40">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500">
                <Search size={14} />
              </span>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Escape metni temizliyor. Kutu artık kapanmadığı için
                  // "boşsa kapat" dalı da yok. `preventDefault` şart: Escape
                  // artık süren turu da durduruyor (pencere düzeyinde), aramayı
                  // temizlerken cevabı iptal etmek istemiyoruz.
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setQuery("");
                  }
                }}
                placeholder={t("axetCodeHome.searchPlaceholder")}
                title={t("axetCodeHome.searchTitle")}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-200 outline-none placeholder:text-slate-500"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  title={t("axetCodeHome.searchClear")}
                  className="mr-1 shrink-0 cursor-pointer rounded p-1 text-slate-500 transition hover:bg-active hover:text-slate-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          {/* Kısayol listesinin GÖRÜNÜR kapısı. F1 tek başına keşfedilemez
              bir kısayol: bilmeyen kimse denemez. Daralmış şeritte çizilmiyor,
              çünkü 60px'e iki düğme sığmıyor ve daraltma düğmesinin `mx-auto`
              ortalaması bozulurdu. */}
          {sidebarOpen && (
            <button
              onClick={() => setShortcutsOpen(true)}
              title={t("axetCodeHome.shortcutsTitle")}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-slate-200"
            >
              <Keyboard size={16} />
            </button>
          )}
          <button
            onClick={() => {
              // Daraltırken süzgeci temizle: 60px'lik şeritte kutu zaten
              // çizilmiyor, açık kalan süzgeç geri açılınca sürpriz olurdu.
              if (sidebarOpen) clearSearch();
              setSidebarOpen((v) => !v);
            }}
            title={
              sidebarOpen
                ? t("axetCodeHome.collapseSidebar")
                : t("axetCodeHome.expandSidebar")
            }
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-slate-200 ${
              sidebarOpen ? "" : "mx-auto"
            }`}
          >
            {/* İkon YÖN gösteriyor: kapalıyken "aç", açıkken "kapat". Tek bir
                ☰ ikonu, düğmenin ne yapacağını söylemiyordu. */}
            {sidebarOpen ? (
              <PanelLeftClose size={16} />
            ) : (
              <PanelLeft size={16} />
            )}
          </button>
        </div>

        {/* "Yeni sohbet" — TAM GENİŞLİK ve birincil eylem gibi görünüyor
            (kullanıcı geri bildirimi: *"yeni sohbet çok çirkin yerde
            duruyor"*). Eskiden başlığın altında sola sıkışmış, zemin
            rengiyle aynı tonda dar bir haptı; ekranın en sık kullanılan
            düğmesi olduğu hâlde sıradan bir satır gibi duruyordu.
            Daraltılmışken metin gidiyor, düğme kalıyor. */}
        {/* İki eylem YAN YANA, ikisi de renkli ve yazılı (kullanıcı isteği,
            2026-09-06). Proje kurma eskiden "PROJELER" başlığının içindeki
            küçük bir "+"tı: hem zor görülüyordu hem de bölümü daraltmamak için
            tıklamayı durdurmak zorundaydı.

            İkinci renk şart: iki düğme de vurgu mavisi olsaydı hangisinin ne
            yaptığı bir bakışta okunmazdı (bkz. --project-500-rgb).

            "Yeni sohbet" artık YIKAMA değil DOLGU (kullanıcı isteği,
            2026-09-06: *"#B7F34A rengini özellikle Yeni sohbet ... için
            kullanırdım"*, çünkü *"şu an ekranda lime çok az görünüyor"*).
            Yıkama hâlinde (accent-500/10 + accent-400 metin) düğme yan
            komşusuyla aynı ağırlıktaydı; ikisi de "bir seçenek" gibi
            duruyordu. Şimdi ayrım İKİ eksende: dolgu-yıkama ve lime-mor.
            Yan taraftaki "Yeni proje" bilerek yıkama olarak kaldı — iki
            dolgu yan yana olsaydı hiyerarşi yine düzleşirdi.

            src/ui/buttons.ts'teki "ekranda tek `primary`" kuralına göre bu
            ekrandaki tek dolgu bu; composer'ın gönder düğmesi de dolgu ama o
            yalnızca gönderilecek bir şey varken görünüyor, yani durgun
            ekranda ikisi aynı anda bulunmuyor. */}
        {/* Sınıf dizesi elde yazılıyor (buttons.ts'in `btn()` kuralının
            istisnası): daraltılmış hâlde genişlik/padding/hizalama değişiyor,
            `btn()`'in sabit `px-4`'ü ile çakışırdı.

            Ctrl+N rozeti düğmenin YÜZÜNDEN kalktı, yalnızca tooltip'te: 272px
            kenar çubuğunda iki yazılı düğme + rozet aynı satıra sığmıyor,
            rozeti bırakmak "Yeni sohbet" yazısını kırpardı. Daraltılmışken
            ikisi alt alta 9x9 simge. */}
        <div className={`flex shrink-0 gap-1.5 px-2.5 pb-2.5 ${sidebarOpen ? "" : "flex-col"}`}>
          {/* onClick'teki sarmalayıcı ok fonksiyonu şart: `handleNewSession`'ı
              doğrudan geçmek MouseEvent'i `binding` argümanı sanardı. */}
          <button
            onClick={() => handleNewSession()}
            title={`${t("axetCodeHome.newSession")} (Ctrl+N)`}
            className={`flex h-9 cursor-pointer items-center rounded-md bg-accent-500 text-[12px] font-semibold text-accent-on transition hover:bg-accent-600 ${
              sidebarOpen ? "min-w-0 flex-1 justify-center gap-1.5 px-2" : "mx-auto w-9 justify-center"
            }`}
          >
            <Plus size={15} className="shrink-0" />
            {sidebarOpen && <span className="min-w-0 truncate">{t("axetCodeHome.newSession")}</span>}
          </button>
          <button
            onClick={handleCreateProject}
            title={t("axetCodeHome.newProject")}
            className={`flex h-9 cursor-pointer items-center rounded-md border border-[rgb(var(--project-500-rgb)/0.35)] bg-[rgb(var(--project-500-rgb)/0.12)] text-[12px] font-medium text-[var(--project-soft-text)] transition hover:border-[rgb(var(--project-500-rgb)/0.6)] hover:bg-[rgb(var(--project-500-rgb)/0.22)] ${
              sidebarOpen ? "min-w-0 flex-1 justify-center gap-1.5 px-2" : "mx-auto w-9 justify-center"
            }`}
          >
            <FolderPlus size={15} className="shrink-0" />
            {sidebarOpen && <span className="min-w-0 truncate">{t("axetCodeHome.newProject")}</span>}
          </button>
        </div>

        {/* Daraltılmışken listenin tamamı gizli: 60px'e sığdırılmış kırpık
            başlıklar okunmuyor, sadece gürültü oluyordu. */}
        {sidebarOpen && (
          <>
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
              {/* Projeler — kullanıcının kendi kurduğu, kendi talimatını
                  taşıyan gruplar (ChatGPT'nin "Projects" karşılığı, kullanıcı
                  isteği 2026-09-06). SAP grupları bunun ALTINDA ve otomatik.
                  Proje yokken bölüm hiç çizilmiyor: kurma düğmesi artık "Yeni
                  sohbet"in yanında, yani boş başlık bir keşif kapısı değil
                  sadece gürültü olurdu. */}
              {sessionGroups.projectGroups.length > 0 && (
                <>
                  <button
                    onClick={() => toggleGroup(PROJECTS_SECTION_KEY)}
                    aria-expanded={groupOpen(PROJECTS_SECTION_KEY)}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
                  >
                    {groupOpen(PROJECTS_SECTION_KEY) ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {t("axetCodeHome.projectsTitle")}
                    </span>
                    <span className="shrink-0 normal-case tracking-normal">
                      {projects.length}
                    </span>
                  </button>
                  <div
                    className={
                      groupOpen(PROJECTS_SECTION_KEY) ? "space-y-0.5" : "hidden"
                    }
                  >
                    {sessionGroups.projectGroups.map((group) => {
                      const open = groupOpen(group.key);
                      return (
                        <div key={group.key}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleGroup(group.key)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleGroup(group.key);
                              }
                            }}
                            aria-expanded={open}
                            title={group.project.name}
                            className="group/proj flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left text-[12px] text-slate-400 transition hover:bg-hover hover:text-slate-200"
                          >
                            {open ? (
                              <ChevronDown
                                size={12}
                                className="shrink-0 text-slate-500"
                              />
                            ) : (
                              <ChevronRight
                                size={12}
                                className="shrink-0 text-slate-500"
                              />
                            )}
                            <FolderOpen
                              size={12}
                              className="shrink-0 text-accent-400"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {group.project.name}
                            </span>
                            {/* Projede yeni sohbet: sohbet, projenin talimatını
                            devralarak doğuyor (bkz. handleSendNew). */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewSession(null, null, group.project.id);
                              }}
                              title={t("axetCodeHome.newChatInProject")}
                              className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover/proj:opacity-100"
                            >
                              <Plus size={12} />
                            </button>
                            {/* Ad, talimat ve silme TEK kutuda (ChatProjectDialog):
                            başlığa dört düğme sığmıyordu. */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectDialogId(group.project.id);
                              }}
                              title={t("axetCodeHome.projectSettings")}
                              className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover/proj:opacity-100"
                            >
                              <Settings2 size={12} />
                            </button>
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {group.sessions.length}
                            </span>
                          </div>
                          {open && (
                            <div className="ml-2 space-y-0.5 border-l border-line-subtle pl-1.5">
                              {group.sessions.length > 0 ? (
                                group.sessions.map(renderSessionRow)
                              ) : (
                                <div className="px-2 py-1.5 text-[11px] leading-relaxed text-slate-500">
                                  {t("axetCodeHome.projectEmpty")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* SAP sohbetleri: sistem başına bir daraltılabilir grup.
                  Bölüm etiketi yalnızca gerçekten SAP sohbeti varsa
                  görünüyor — tek bir sisteme bile bağlanmamış kullanıcıya
                  boş bir başlık göstermenin anlamı yok. */}
              {sessionGroups.sapGroups.length > 0 && (
                <>
                  {/* Bölüm başlığı da daraltılabilir — "Sohbetler" öyleyken
                      bunun düz bir etiket kalması tutarsızdı (kullanıcı
                      bildirimi). Buradaki daraltma sistemleri TEK TEK değil,
                      SAP bölümünün tamamını kapatıyor. */}
                  <button
                    onClick={() => toggleGroup(SAP_SECTION_KEY)}
                    aria-expanded={groupOpen(SAP_SECTION_KEY)}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
                  >
                    {groupOpen(SAP_SECTION_KEY) ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {t("axetCodeHome.sapChatsTitle")}
                    </span>
                    <span className="shrink-0 normal-case tracking-normal">
                      {sessionGroups.sapGroups.length}
                    </span>
                  </button>
                  <div
                    className={
                      groupOpen(SAP_SECTION_KEY) ? "space-y-0.5" : "hidden"
                    }
                  >
                    {sessionGroups.sapGroups.map((group) => {
                      const open = groupOpen(group.key);
                      return (
                        <div key={group.key}>
                          <button
                            onClick={() => toggleGroup(group.key)}
                            aria-expanded={open}
                            title={group.label}
                            className="group/sys flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left text-[12px] text-slate-400 transition hover:bg-hover hover:text-slate-200"
                          >
                            {open ? (
                              <ChevronDown
                                size={12}
                                className="shrink-0 text-slate-500"
                              />
                            ) : (
                              <ChevronRight
                                size={12}
                                className="shrink-0 text-slate-500"
                              />
                            )}
                            <Server
                              size={12}
                              className="shrink-0 text-[var(--navy-icon)]"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {group.label}
                            </span>
                            {/* Bu sistemde yeni sohbet. Elle açılan "Yeni
                                sohbet" artık "Sohbetler"e düştüğü için, bir
                                sistemin altına bilerek sohbet eklemenin TEK
                                yolu bu. `span role="button"`: satırın kendisi
                                zaten bir <button>, iç içe düğme geçersiz HTML
                                (proje başlığındaki "+" ile aynı gerekçe). */}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewSession({
                                  cwd: group.cwd,
                                  label: group.label,
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleNewSession({
                                    cwd: group.cwd,
                                    label: group.label,
                                  });
                                }
                              }}
                              title={t("axetCodeHome.newChatInSystem")}
                              className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover/sys:opacity-100"
                            >
                              <Plus size={12} />
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {group.sessions.length}
                            </span>
                          </button>
                          {/* Sol kenar çizgisi: satırların hangi gruba ait
                              olduğunu daraltma durumundan bağımsız gösteriyor. */}
                          {open && (
                            <div className="ml-2 space-y-0.5 border-l border-line-subtle pl-1.5">
                              {group.sessions.map(renderSessionRow)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Sisteme bağlı olmayan sohbetler. Kendi başlığı var ve o da
                  daraltılabilir — SAP grupları daraltılıp bu bırakılsaydı
                  tutarsız olurdu. */}
              {sessionGroups.general.length > 0 && (
                <div
                  className={sessionGroups.sapGroups.length > 0 ? "mt-1" : ""}
                >
                  <button
                    onClick={() => toggleGroup(GENERAL_GROUP_KEY)}
                    aria-expanded={groupOpen(GENERAL_GROUP_KEY)}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
                  >
                    {groupOpen(GENERAL_GROUP_KEY) ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {t("axetCodeHome.generalChatsTitle")}
                    </span>
                    <span className="shrink-0 normal-case tracking-normal">
                      {sessionGroups.general.length}
                    </span>
                  </button>
                  {groupOpen(GENERAL_GROUP_KEY) && (
                    <div className="space-y-0.5">
                      {sessionGroups.general.map(renderSessionRow)}
                    </div>
                  )}
                </div>
              )}

              {sessions.length > 0 && visibleSessions.length === 0 && (
                <div className="mt-1 rounded-md border border-line-subtle bg-app px-3 py-3 text-center text-[12px] text-slate-500">
                  {t("axetCodeHome.searchEmpty", { query: query.trim() })}
                </div>
              )}

              {sessions.length === 0 && (
                <div className="mt-1 rounded-md border border-line-subtle bg-app px-3 py-3 text-center">
                  <div className="text-[12px] font-medium text-slate-400">
                    {t("axetCodeHome.emptyTitle")}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {t("axetCodeHome.emptyHint")}
                  </div>
                </div>
              )}
            </div>

            {/* SAP bağlantıları dip bloğu. Eskiden başlıksızdı ve listeden
                yalnızca boşlukla ayrılıyordu; sohbetler artık kendi
                başlıklarının altında gruplandığı için bu blok da onlardan
                biri gibi görünmeye başladı — üstüne çizgi ve başlık kondu
                (kullanıcı isteği, 2026-09-06). Buradaki satırlar sohbet
                DEĞİL: tıklayınca bağlanıyorlar. */}
            <div className="shrink-0 border-t border-line-subtle p-2.5 pt-2">
              <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {t("axetCodeHome.systemsTitle")}
              </div>
              {recentEntries.length > 0 ? (
                <div className="space-y-0.5">
                  {recentEntries.slice(0, 3).map((entry) => {
                    const state = connectivity[entry.service.uuid] ?? "unknown";
                    const tier = resolveTier(entry.service, tierOverrides);
                    // ŞU AN BAĞLI OLUNAN sistem. `StatusDot`'tan bambaşka bir
                    // şey söylüyor ve ikisi karıştırılmamalı: nokta "bu sunucu
                    // ayakta mı" (sağlık), bu ise "oturum bunun üzerinde"
                    // (aktiflik). Erişilebilir üç sistem varken hangisine
                    // bağlı olduğun satırda hiç görünmüyordu — yalnızca hover
                    // kartını açınca.
                    //
                    // Vurgu rengi tam da bu yüzden BURADA doğru: accent yeşili
                    // uygulamanın her yerinde "seçili/aktif" demek, sağlık
                    // yeşili (`--status-success-text`) ise noktanın işi. İki
                    // anlam iki renkte kalıyor.
                    const connected = activeSap != null && activeSap.uuid === entry.service.uuid;
                    const connect = () =>
                      onQuickConnectSap(
                        entry.path,
                        entry.service,
                        entry.itemUuid,
                      );
                    return (
                      // `title={path}` yerine gerçek bir kart: satırda yalnızca
                      // ad/tier/durum sığıyor, host-port-router-client ise
                      // bağlanmadan hiç görünmüyordu (bkz. SystemHoverCard).
                      <SystemHoverCard
                        key={entry.itemUuid}
                        service={entry.service}
                        path={entry.path}
                        tier={tier}
                        state={state}
                        activeSap={activeSap}
                        onConnect={connect}
                      >
                        <button
                          onClick={connect}
                          className={`relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition ${
                            connected
                              ? "bg-accent-500/10 text-slate-100"
                              : "text-slate-400 hover:bg-hover hover:text-slate-200"
                          }`}
                        >
                          {/* Şerit ray'daki aktif sekme şeridiyle AYNI dil:
                              uygulamada "burasısın" hep soldaki 2-3px parlak
                              lime çizgi. */}
                          {connected && (
                            <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent-500" />
                          )}
                          <Server
                            size={13}
                            className={`shrink-0 ${connected ? "text-accent-400" : "text-[var(--navy-icon)]"}`}
                          />
                          <span
                            className={`min-w-0 flex-1 truncate ${connected ? "font-medium" : ""}`}
                          >
                            {entry.service.name}
                          </span>
                          {tier && <TierBadge tier={tier} />}
                          <StatusDot state={state} />
                        </button>
                      </SystemHoverCard>
                    );
                  })}
                  <button
                    onClick={onOpenSapLauncher}
                    className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-slate-500 transition hover:bg-hover hover:text-slate-300"
                  >
                    {t("axetCodeHome.viewAllConnections")}
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenSapLauncher}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-line-subtle bg-app px-3 py-2.5 text-[12px] text-slate-500 transition hover:border-line hover:bg-hover hover:text-slate-300"
                >
                  <Link2 size={14} className="shrink-0" />
                  {t("axetCodeHome.connectionsEmpty")}
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-app">
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
            onAnswerQuestion={handleAnswerQuestion}
            onSelectModel={handleSelectModel}
            onRegenerate={handleRegenerate}
            onContinue={handleContinue}
            onEditMessage={handleEditMessage}
            onUndoEdit={handleUndoEdit}
            onDismissCancelStuck={handleDismissCancelStuck}
            onAttachFiles={handleAttachFiles}
            onDictate={handleDictate}
            dictationState={dictationState}
            onFilesResolved={(paths) => addAttachments(session.id, paths)}
            onRemoveAttachment={(attachmentId) =>
              removeAttachment(session.id, attachmentId)
            }
            suggestionKeys={suggestionKeys}
            onSuggestionClick={(key) =>
              handleDraftChange(
                t(`axetCodeHome.${key}` as Parameters<typeof t>[0]),
              )
            }
            contextLabel={session.sapLabel}
            contextPath={session.cwd || workspaceDir}
            onOpenInstructions={
              session.cwd || workspaceDir
                ? () => setInstructionsCwd(session.cwd || workspaceDir)
                : undefined
            }
            filesPanelOpen={filesPanelOpen}
            onToggleFilesPanel={
              session.cwd || workspaceDir
                ? () => setFilesPanelOpen((v) => !v)
                : undefined
            }
            filesPanel={
              // Panel yalnızca AÇIKKEN mount ediliyor: kapalıyken de yaşasaydı
              // her sohbet için bir dosya ağacı ve (görünürse) bir izleyici
              // boşuna ayakta kalırdı.
              filesPanelOpen ? (
                <ChatFilesPanel
                  rootDir={session.cwd || workspaceDir}
                  rootLabel={
                    session.sapLabel ?? t("axetCodeHome.contextWorkspace")
                  }
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
          onAnswerQuestion={handleAnswerQuestion}
          onSelectModel={handleSelectModel}
          onRegenerate={handleRegenerate}
          onContinue={handleContinue}
          onEditMessage={handleEditMessage}
          onUndoEdit={handleUndoEdit}
          onDismissCancelStuck={handleDismissCancelStuck}
          onAttachFiles={handleAttachFiles}
          onDictate={handleDictate}
          dictationState={dictationState}
          onFilesResolved={(paths) => addAttachments(NEW_SESSION_ID, paths)}
          onRemoveAttachment={(attachmentId) =>
            removeAttachment(NEW_SESSION_ID, attachmentId)
          }
          suggestionKeys={suggestionKeys}
          onSuggestionClick={(key) =>
            handleDraftChange(
              t(`axetCodeHome.${key}` as Parameters<typeof t>[0]),
            )
          }
          recentWork={recentWork}
          onOpenRecentWork={setActiveId}
          contextLabel={effectiveNewBinding?.label ?? null}
          contextPath={effectiveNewBinding?.cwd || workspaceDir}
          onOpenInstructions={
            effectiveNewBinding?.cwd || workspaceDir
              ? () =>
                  setInstructionsCwd(effectiveNewBinding?.cwd || workspaceDir)
              : undefined
          }
          filesPanelOpen={filesPanelOpen}
          onToggleFilesPanel={
            effectiveNewBinding?.cwd || workspaceDir
              ? () => setFilesPanelOpen((v) => !v)
              : undefined
          }
          filesPanel={
            filesPanelOpen ? (
              <ChatFilesPanel
                rootDir={effectiveNewBinding?.cwd || workspaceDir}
                rootLabel={
                  effectiveNewBinding?.label ??
                  t("axetCodeHome.contextWorkspace")
                }
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
          count: deleteTarget?.messages.length ?? 0,
        })}
        confirmLabel={t("axetCodeHome.deleteConfirmButton")}
        onConfirm={() => deleteId && handleDeleteSession(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      <ChatInstructionsDialog
        cwd={instructionsCwd}
        onClose={() => setInstructionsCwd(null)}
        onSaved={handleInstructionsSaved}
      />

      <ChatProjectDialog
        project={projectDialog}
        onClose={() => setProjectDialogId(null)}
        onSave={(name, instructions) =>
          projectDialog &&
          handleSaveProject(projectDialog.id, name, instructions)
        }
        onDelete={() => projectDialog && handleDeleteProject(projectDialog.id)}
      />

      {/* "Projeye taşı" menüsü. Arkasındaki saydam katman dışarı tıklamayı
          yakalıyor — menü, kaydırılan listenin dışında (sabit konumda)
          çizildiği için listenin kendi tıklamalarıyla kapanmazdı. */}
      {moveMenu && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setMoveMenu(null)}
          />
          <div
            className="chat-scroll fixed z-[71] w-[200px] overflow-y-auto rounded-md border border-line bg-card p-1 shadow-xl"
            style={{
              left: moveMenu.x,
              top: moveMenu.y,
              maxHeight: MOVE_MENU_MAX_H,
            }}
          >
            {projects.map((project) => {
              const current = moveTarget?.projectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() =>
                    handleMoveSession(moveMenu.sessionId, project.id)
                  }
                  disabled={current}
                  title={project.name}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition ${
                    current
                      ? "cursor-default bg-control text-slate-300"
                      : "cursor-pointer text-slate-400 hover:bg-hover hover:text-slate-200"
                  }`}
                >
                  <FolderOpen size={12} className="shrink-0 text-accent-400" />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                </button>
              );
            })}
            {/* Yalnızca bir projedeyken görünüyor: projesiz bir sohbette
                "projeden çıkar" tıklanacak ama hiçbir şey yapmayan bir satır
                olurdu. */}
            {moveTarget?.projectId && (
              <button
                onClick={() => handleMoveSession(moveMenu.sessionId, null)}
                className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded border-t border-line-subtle px-2 py-1.5 pt-2 text-left text-[12px] text-slate-500 transition hover:bg-hover hover:text-slate-300"
              >
                <X size={12} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {t("axetCodeHome.removeFromProject")}
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] p-6"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              {t("axetCodeHome.shortcutsTitle")}
            </h3>
            <dl className="flex flex-col gap-1.5">
              {SHORTCUTS.map(([keys, labelKey]) => (
                <div
                  key={keys}
                  className="flex items-center justify-between gap-4"
                >
                  <dt className="text-[12.5px] text-slate-400">
                    {t(labelKey)}
                  </dt>
                  <dd className="shrink-0 font-mono text-[11px] text-slate-300">
                    {keys}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
