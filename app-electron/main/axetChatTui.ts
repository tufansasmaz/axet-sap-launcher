import * as pty from "@lydell/node-pty";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  AxetChatActivity,
  AxetChatCancelVerdict,
  AxetChatMessage,
  AxetChatProgress,
  AxetChatSendResult,
  AxetModelEntry
} from "../shared/types";
import { axetSpawnEnv } from "./axetSpawnEnv";
import { axetCodeVersion, noteAxetCodeVersion } from "./axetCodeVersion";
import { loadConfig, saveConfig } from "./store";
import { setAxetModel } from "./axetModels";
import { mt } from "./i18n";
import {
  closeSessionDbs,
  findSessionByPrompt,
  latestMessageTime,
  matchKey,
  newestSessionSince,
  readMessagesSince,
  renameSession,
  resolveSessionDb,
  sessionDbLoadError,
  sessionTitle,
  sessionTodos,
  sessionTokens
} from "./axetSessionDb";
import { bindingTag, clearBinding, readBinding, writeBinding } from "./axetSessionBinding";
import {
  classifyFailure,
  logOffset,
  readLiveConnectors,
  readLogSince,
  type AxetFailureKind
} from "./axetCodeLog";
import { connectorGuidance, learnConnectorHealth, noteLiveConnectors } from "./connectorHealth";

// ---------------------------------------------------------------------------
// KALICI OTURUM — axet-code'un gerçek TUI'si bir pty içinde
// ---------------------------------------------------------------------------
// Kullanıcı isteği (2026-09-04): *"çalışma şekli aynı terminaldeki claude
// yapısı, axet.code yapısı gibi olması gerekiyor sadece biz üzerine bir kılıf
// takmışız"*.
//
// Eski kip (`axet-code run`, bkz. axetChat.ts) mesaj başına AYRI bir süreç
// açıyordu. Bunun üç bedeli vardı ve üçü de ölçüldü:
//   1) Açılış maliyeti her mesajda yeniden ödeniyordu (~2-4 s; ön-ısıtma bunu
//      büyük ölçüde gizledi ama ortadan kaldırmadı).
//   2) Geçmiş her seferinde düz metin transcript olarak yeniden gönderiliyordu.
//   3) EN ÖNEMLİSİ: ARAÇ SONUÇLARI mesajlar arasında kayboluyordu. Ajan bir
//      dosyayı okuyup sonraki mesajda onu hatırlamıyordu; çünkü hatırlayacağı
//      oturum yoktu. `run`'ın `--resume`/`--session` bayrağı YOK (doğrulandı).
//
// Ölçüm (2026-09-04, aynı soru): `run` ile 8,131 s — kalıcı TUI ile 3 s.
//
// NEDEN EKRANDAN OKUMUYORUZ: cevap metni pty çıktısında kenarlıklar, yan panel
// ve spinner artıklarıyla iç içe okunamaz hâlde. Cevabı ve araç çağrılarını
// axet-code'un kendi oturum veritabanından okuyoruz (bkz. axetSessionDb.ts).
// pty yalnızca "yazan el"; gözümüz veritabanı.
// ---------------------------------------------------------------------------

/** Açılış diyaloglarının ve hazır olma işaretinin ekranda aranan karşılıkları. */
const MARK_TOOL_DIALOG = "Choose your development tool";
const MARK_MODEL_DIALOG = "choose a provider and model";
// TUI'nin sohbete hazır olduğunu gösteren işaretler. Tek bir metne bağlanmıyor,
// çünkü BİR KEZ KIRILDI (2026-09-04): eldeki tek işaret `"tab focus chat"`ti ve
// axet-code alt bilgi çubuğunu değiştirince el sıkışması 30 saniye bekleyip
// `run` kipine düştü. Belirti kullanıcı tarafında "hiç çalışmadı, bilmem kaç
// saniye 'Başlatılıyor'da geçti" oldu — araç adımları da o yüzden hiç gelmedi.
//
// Ölçülen (aynı gün) gerçek alt bilgi çubuğu:
//   ctrl+p commands • ctrl+l models • ctrl+j newline • ctrl+c quit • ctrl+g more
//
// Bu yüzden çubuğun BİRDEN FAZLA parçası ayrı ayrı aranıyor: bir kısayolun
// metni değişse bile diğerleri tutar. Sıra ÖNEMLİ değil ama diyalog
// işaretlerinin bu listeden ÖNCE gelmesi önemli (bkz. handshake): iki tür
// işaret aynı ekranda görünürse diyalog kazanmalı, yoksa açık bir diyaloğun
// üstüne "hazır" deyip istemi diyaloğa yazardık.
const MARK_READY = [
  "model changed to",
  "tab focus chat",
  "ctrl+c quit",
  "ctrl+j newline",
  "ctrl+p commands"
];

/**
 * axet-code'un ZORUNLU GÜNCELLEME ekranı.
 *
 * Yeni bir sürüm çıktığında axet-code sohbeti hiç açmıyor; ortada tek düğmesi
 * "Quit" olan bir kutu çiziyor:
 *
 *   Mandatory update required
 *   A new version of aXet.Code is available.
 *   Installed version: 1.2.0
 *   New version:       1.3.0
 *   This update is mandatory: Access Company Portal through your Start menu,
 *   then search for "aXet.code", proceed to install the new version and
 *   restart the application.
 *
 * Bu kutu bizim beklediğimiz işaretlerin HİÇBİRİNİ içermiyor: el sıkışma zaman
 * aşımına uğruyor, `run` kipine düşülüyor ve o da aynı duvara çarpıyor.
 * Kullanıcının gördüğü tek şey "axet-code hiçbir belirti vermedi" oluyor —
 * oysa sebep bellidir ve tek cümleyle söylenebilir. Bu yüzden ekran açıkça
 * aranıyor ve mesaj `run` kipine düşmeden doğrudan cevaplanıyor.
 */
const MARK_UPDATE_REQUIRED = "Mandatory update required";
/** Kutunun ikinci cümlesi; başlık bir sürümde değişirse bu tutar. */
const MARK_UPDATE_ALT = "new version of aXet.Code is available";
const RE_UPDATE_INSTALLED = /Installed version:\s*([0-9][\w.+-]*)/i;
const RE_UPDATE_LATEST = /New version:\s*([0-9][\w.+-]*)/i;

/**
 * Son görülen zorunlu güncelleme engeli. Süreç ömrü kadar yaşıyor; kullanıcı
 * Company Portal'dan güncelleyip uygulamayı yeniden başlatınca sıfırlanır.
 */
let updateBlock: { installed: string; latest: string } | null = null;

/** Zorunlu güncelleme engeli görüldüyse sürümler, yoksa `null`. */
export function axetUpdateBlock(): { installed: string; latest: string } | null {
  return updateBlock;
}

/**
 * İSTEĞE BAĞLI güncelleme uyarısı — yukarıdaki ZORUNLU engelden farklı.
 *
 * axet-code açılışta tek satırlık bir pankart basıyor:
 *
 *   HEY!  aXet.Code 1.3.0 is available — install it from the Intune Company Portal
 *
 * Hiçbir şeyi engellemiyor, o yüzden el sıkışma olduğu gibi sürüyor. Ama
 * kullanıcı bunu HİÇ görmüyordu: TUI ekranını okumuyoruz, pankart da tampona
 * düşüp kayboluyordu. Önemi şu — 2026-09-07'de ölçtüğümüz gecikme axet-code'un
 * kendi içindeydi; o durumda "yeni sürüm çıkmış" bilgisi, bizim
 * yapabileceğimiz her şeyden daha yüksek kaldıraçlı.
 *
 * Sürüm KARŞILAŞTIRMASI yapılmıyor, pankartın kendisi zaten "yeni sürüm var"
 * demek. Sürüm dizgilerini sayıya çevirmek, biçim değiştiğinde sessizce yanlış
 * cevap veren bir kod olurdu.
 */
const RE_UPDATE_AVAILABLE = /aXet\.Code\s+([0-9][\w.+-]*)\s+is available/i;

/** Son görülen isteğe bağlı güncelleme duyurusu. Süreç ömrü kadar yaşıyor. */
let updateAvailable: { installed: string; latest: string } | null = null;

/**
 * axet-code için yeni bir sürüm duyurulduysa sürümler, yoksa `null`.
 *
 * İki kaynak birleşiyor: bu süreçte ekrandan yakalanan duyuru ve config'e daha
 * önce yazılmış olanı. İkincisi, uygulama yeni açıldığında henüz hiçbir TUI
 * oturumu olmadığı hâlde uyarının gösterilebilmesini sağlıyor.
 *
 * Kurulu sürüm burada SONDALANIYOR (`noteAxetCodeVersion`, <1 sn): kullanıcı
 * Company Portal'dan güncelledikten sonra uyarının kendiliğinden kaybolması
 * buna bağlı. Sondaj yapılmazsa config'teki eski duyuru sonsuza kadar
 * gösterilirdi.
 */
export async function axetUpdateAvailable(): Promise<{ installed: string; latest: string } | null> {
  let latest = updateAvailable?.latest ?? "";
  if (!latest) {
    try {
      latest = loadConfig().axetCodeLatestSeen;
    } catch {
      latest = "";
    }
  }
  if (!latest) return null;
  const installed = (await noteAxetCodeVersion()) ?? axetCodeVersion() ?? "";
  // Güncelleme yapılmış: duyuru artık geçmişte kaldı. Sürümler dizgi olarak
  // karşılaştırılıyor, sayıya çevrilmiyor — "kurulu olan duyurulanla aynı" tek
  // ihtiyacımız olan soru ve biçim değişse bile doğru cevap veriyor.
  if (installed && installed === latest) return null;
  return { installed, latest };
}

/** Ekranda "yeni sürüm var" pankartı var mı? Varsa kaydeder. */
function detectUpdateAvailable(screen: string): void {
  const latest = RE_UPDATE_AVAILABLE.exec(screen)?.[1];
  if (!latest) return;
  // Kurulu sürüm ayrı bir yoldan (`axet-code --version`) geliyor; sondaj henüz
  // dönmediyse boş bırakılıyor ve arayüz sürümsüz cümleyi kuruyor.
  const installed = axetCodeVersion() ?? "";
  if (updateAvailable?.latest === latest && updateAvailable.installed === installed) return;
  updateAvailable = { installed, latest };
  console.log("[axetChatTui] yeni surum duyurusu", updateAvailable);
  // Diske de yazılıyor: uyarının gösterileceği yer sohbet AÇILIŞ ekranı, yani
  // henüz hiçbir axet-code süreci açılmamış olan an. Bellekteki değer o ekrana
  // asla yetişemezdi. Yazma hatası yutuluyor — bir sürüm duyurusu uğruna
  // el sıkışmasını düşürmek orantısız olurdu.
  try {
    const config = loadConfig();
    if (config.axetCodeLatestSeen !== latest) saveConfig({ ...config, axetCodeLatestSeen: latest });
  } catch {
    // config yazılamadıysa uyarı yalnızca bu oturum boyunca yaşar
  }
}

/** Ekranda güncelleme kutusu var mı? Varsa sürümleri kaydeder. */
function detectUpdateBlock(screen: string): boolean {
  if (!screen.includes(MARK_UPDATE_REQUIRED) && !screen.includes(MARK_UPDATE_ALT)) return false;
  // Sürümler okunamazsa engel yine de gerçek: boş bırakılıyor ve mesaj
  // sürümsüz kuruluyor (bkz. `chatTui.updateRequired`).
  const installed = RE_UPDATE_INSTALLED.exec(screen)?.[1] ?? "";
  const latest = RE_UPDATE_LATEST.exec(screen)?.[1] ?? "";
  const next = { installed, latest };
  if (!updateBlock || updateBlock.installed !== installed || updateBlock.latest !== latest) {
    console.log("[axetChatTui] ZORUNLU GUNCELLEME ekrani", next);
  }
  updateBlock = next;
  return true;
}

/**
 * Komut paletinin (`ctrl+p`) AÇILDIĞINI gösteren işaretler.
 *
 * Paletin ilk satırı "New Session" ve `resetTuiHistory`'nin bastığı Enter tam
 * olarak onu seçiyor; aranan da o satırın kendisi. İkinci işaret yedek: bir
 * sürümde ilk satırın adı değişirse tek işaret sessizce körleşirdi.
 *
 * Ekran tamponu aramadan HEMEN ÖNCE temizleniyor (bkz. `resetTuiHistory`),
 * yoksa bu metinler ajanın kendi cevabından da geliyor olabilirdi — bu kılıfın
 * kendisi hakkında konuşan bir sohbette hiç de uzak bir ihtimal değil.
 */
const MARK_PALETTE = "New Session";
const MARK_PALETTE_ALT = "Initialize Project";
/** Paletin açılması için tavan; dolarsa sıfırlama YAPILMIYOR. */
const PALETTE_OPEN_MS = 3_000;

/**
 * `ctrl+s` — OTURUM SEÇİCİ. Bu ekran, geçmişi taşımak yerine geçmişin zaten
 * durduğu oturuma bağlanmayı mümkün kılan tek kapı.
 *
 * ÖLÇÜLEN EKRAN (2026-09-07, axet-code 1.2.3):
 *   ╭─ Sessions ────────────────────────────────╮
 *   │ > Enter session name                      │
 *   │ OK Yaz Talebi              22 minutes ago │
 *   │ ...                                       │
 *   │ ↑↓ choose • ctrl+r rename • ctrl+x delete •
 *   │   enter choose • esc                      │
 *   ╰───────────────────────────────────────────╯
 *
 * Arama kutusu BULANIK (fuzzy) ve tüm depoda arıyor — başka klasörlerin
 * oturumları da listede. Yazılan metin tekil değilse hangi satırın başa
 * geleceği kestirilemiyor; bu yüzden aranan metin axet-code'un kendi ürettiği
 * başlık DEĞİL, bizim eklediğimiz tekil ek (bkz. axetSessionBinding.ts).
 * Ölçümdeki aynı veritabanında "OK Yaz Talebi" iki, "Proje MD Dosyalarını
 * Oku" dört ayrı oturumun başlığıydı.
 *
 * İşaret olarak yer tutucu metin seçildi: kutunun başlığı ("Sessions") kısa
 * ve ajanın kendi cevabında da geçebilir, yer tutucu ise bu ekrana özgü.
 */
const MARK_SESSION_PICKER = "Enter session name";
/** Seçicinin açılması için tavan; dolarsa BAĞLANMA YAPILMIYOR. */
const PICKER_OPEN_MS = 4_000;
/**
 * Arama kutusuna yazdıktan sonra listenin süzülmesi için pay.
 *
 * Enter ERKEN basılırsa liste henüz eski sırasındadır ve seçilen oturum
 * bambaşka biri olur — bu ekranda yapılabilecek en pahalı hata bu.
 */
const PICKER_FILTER_MS = 1_200;
/** Seçimden sonra sohbet kutusunun odağı geri alması için pay (ölçüm: ~4 s). */
const PICKER_SETTLE_MS = 4_000;

/**
 * Bağlayıcıların YÜKLENDİĞİNİ gösteren satır: `● test123 25 tools`.
 *
 * "model changed to" HAZIR demek DEĞİL — yalnızca modelin seçildiği demek.
 * Ölçüm (2026-09-04, bağlayıcılar açık): model 2,8 s'de seçiliyor, o anda
 * panel `Connectors: None` diyor ve kayıtlar `starting...` durumunda; araçlar
 * 6,5-6,8 s arasında geliyor. Bu 4 saniyelik boşlukta sorulan soruya ajan
 * DOĞRU cevap veriyor: "bağlı bir entegrasyon görünmüyor". Kullanıcının
 * "connector var aslında direkt bakması lazım" dediği hata tam olarak buydu.
 */
const RE_CONNECTOR_TOOLS = /\b\d+\s+tools\b/g;
/** Bağlayıcılar için en fazla beklenecek süre; dolarsa yine de devam edilir. */
const CONNECTOR_WAIT_MS = 15_000;
/** Son araç satırından sonra "yerleşti" saymak için gereken sessizlik. */
const CONNECTOR_SETTLE_MS = 1_200;

/** Bir açılış adımının en fazla bekleyeceği süre. */
const HANDSHAKE_STEP_MS = 30_000;
/** Açılışta en fazla kaç diyalog adımı çevrilecek (sonsuz döngüye karşı). */
const HANDSHAKE_MAX_STEPS = 6;
/**
 * SESSİZLİK uyarı aralığı — geçen süre değil, HİÇBİR BELİRTİ GELMEYEN süre.
 *
 * Sayaç her belirtide sıfırlanıyor: günlüğe düşen satır, gelen metin parçası,
 * yeni araç çağrısı ya da sonucu.
 *
 * DİKKAT — bu bir zaman aşımı DEĞİL, turu bitirmiyor. Önce turun mutlak ömrüydü;
 * sonra sessizlik tavanı oldu (*"tarıyor tarıyor ama cevap yazacak 300 oldu
 * diyor"*); 2026-09-07'de bir ölçüm ikinci hâlin de yanlış olduğunu gösterdi:
 * soğuk bir ilk turda axet-code 320 saniye tam sessiz kaldı, tur 300'de
 * kapatıldı, cevap 20 saniye sonra eksiksiz geldi ve sahipsiz kaldı. Ayrıntı
 * için `runTurn` içindeki sessizlik bloğuna bak. Bugün bu sabit yalnızca
 * "kullanıcıya kaç dakikada bir "hâlâ bekleniyor" densin" sorusunun cevabı.
 */
const TURN_TIMEOUT_MS = 5 * 60_000;
/**
 * Mutlak tavan — sessizlik sayacının hiç dolmadığı hâller için.
 *
 * Aynı çalışma dizinindeki BAŞKA bir sohbet de aynı günlüğe yazıyor; teorik
 * olarak o trafik sayacı sonsuza kadar diri tutabilir. Bu tavan, turun her
 * koşulda bir sonu olmasını garantiliyor.
 *
 * 6 saat, 30 dakika DEĞİL (kullanıcı kararı, 2026-09-07): gerçek işler
 * aralıksız 1-3 saat sürebiliyor ve 30 dakikalık tavan onları sorunsuz
 * çalışırken kesiyordu. Tavanın koruduğu tek durum, kimse bakmıyorken
 * takılmış bir döngünün gece boyu jeton yakması; onun için 6 saat yeterli.
 * Kullanıcı bakıyorken zaten elle durdurabiliyor (bkz. `cancelTui`).
 */
const TURN_HARD_CAP_MS = 6 * 60 * 60_000;
/**
 * İğne eşleşmesinden vazgeçip "bu oturumdaki yeni kullanıcı mesajı bizimdir"
 * demeye başlama süresi. Bkz. döngüdeki güvenlik ağı.
 *
 * Prompt pty'ye yazıldıktan sonra veritabanına düşmesi ölçümde bir saniyenin
 * altında; 20 saniye fazlasıyla cömert bir pay.
 */
const LAND_GRACE_MS = 20_000;
/**
 * Veritabanı yoklama aralığı. Ölçülen sorgu maliyeti 0-5 ms.
 *
 * Bu aralık AYNI ZAMANDA arayüzdeki yazma ritmi: her yoklamada o ana kadar
 * biriken metin tek parça hâlinde `onChunk`'a veriliyor. 250 ms'de cevap
 * saniyede dört kez, kocaman bloklar hâlinde "zıplayarak" beliriyordu
 * (kullanıcı, 2026-09-05: *"cevabı çok kasarak yavaş yazıyor seri kasmadan
 * yazmalı"*). 90 ms'de aynı metin ~11 kez/sn, çok daha küçük parçalarla
 * geliyor — akıyormuş gibi görünüyor. Sorgu maliyeti sıfıra yakın olduğu için
 * üç katına çıkan yoklama sayısı ölçülebilir bir yük getirmiyor.
 */
const POLL_MS = 90;
/**
 * Plan (`sessions.todos`) ve bağlam doluluğu ne sıklıkla okunsun.
 *
 * Yoklama ritminden AYRI: bu iki bilgi mesaj akışı gibi akmıyor, ajan bir
 * maddeyi bitirdiğinde ya da tur döndüğünde değişiyor. 90 ms'de okumak
 * saniyede 11 kez aynı satırı sorgulamak olurdu.
 */
const PROGRESS_MS = 1_000;
/**
 * Kullanılmayan bir oturum ne kadar sonra kapatılsın.
 *
 * 10 dakikaydı, 2026-09-07'de 60'a çıkarıldı. Sebebi ölçüm: bir turun süresi
 * SÜRECİN KAÇINCI TURU olduğuna bağlı — aynı süreçte ikinci ve sonraki turlar
 * 15-25 saniye, sürecin İLK turu 100-170 saniye. Yani oturumu kaybetmenin
 * bedeli iki katı değil, beş-on katı. On dakika bir kahve molasını bile
 * kaldıramıyordu: kullanıcı dönüp yazdığı ilk mesaj tam soğuk bedeli ödüyordu.
 *
 * Karşılığında boşta duran bir axet-code süreci bir saat ayakta kalıyor.
 * Ölçüldü (2026-09-07): süreç başına 33-57 MB, yani MAX_SESSIONS ile birlikte
 * en kötü hâlde ~250 MB. Bu, beş-on kat yavaşlamanın karşılığında ucuz.
 */
const IDLE_MS = 60 * 60_000;
/**
 * Aynı anda açık tutulacak en fazla TUI oturumu.
 *
 * 3'tü, 5 yapıldı (2026-09-07). Üçte, dört sohbet arasında gidip gelen bir
 * kullanıcı her geçişte bir oturumu tahliye ediyordu ve geri döndüğünde
 * yukarıdaki soğuk bedeli ödüyordu — IDLE_MS'i uzatmanın faydasını tam da bu
 * yiyordu.
 */
const MAX_SESSIONS = 5;

interface Waiter {
  needles: string[];
  resolve: (hit: string | null) => void;
  timer: NodeJS.Timeout;
}

interface TuiSession {
  chatId: string;
  proc: pty.IPty;
  cwd: string;
  modelKey: string;
  useConnectors: boolean;
  dbPath: string;
  /**
   * pty'nin başlatıldığı an (Unix saniye).
   *
   * Oturum eşleşmesinin ZORUNLU alt sınırı. Bu alan olmadan (2026-09-04 canlı
   * hatası): bağlayıcı kararı değişince pty yeniden kuruluyor, ilk yoklamada
   * bizim yeni oturumumuz henüz veritabanında olmuyor, "en yeni oturum" yedeği
   * de bir ÖNCEKİ sohbetin oturumunu döndürüyordu. Sonuç: mail sorusuna
   * bir önceki turun ("selam") cevabı 0,0 saniyede "bitti" diye verildi, ve
   * yanlış bağ önbellekte kaldığı için sonraki mesaj hiç bitmedi.
   */
  spawnedAt: number;
  /** axet-code'un bu pty için açtığı oturum. İlk cevaptan sonra doluyor. */
  axetSessionId: string | null;
  /** ANSI'siz son çıktı — yalnızca açılış işaretlerini aramak için. */
  screen: string;
  ready: boolean;
  busy: boolean;
  disposed: boolean;
  exited: boolean;
  /** Kullanıcı süren turu durdurdu mu (esc). Her turun başında sıfırlanır. */
  cancelled: boolean;
  /** Bu oturuma daha önce mesaj gönderildi mi (geçmiş tohumlaması gerekiyor mu). */
  seeded: boolean;
  /**
   * Bu pty, sohbetin ESKİ axet-code oturumuna `ctrl+s` ile bağlandı mı?
   *
   * Bağlandıysa `seeded` doğrudan true kuruluyor — geçmiş zaten oturumun
   * içinde, yeniden yapıştırmanın anlamı yok. Bayrak ayrıca teşhis için: bir
   * turun neden hızlı ya da yavaş olduğu ("tohumlanmis" ile birlikte) günlükte
   * tek bakışta okunabilsin.
   */
  attached: boolean;
  /**
   * Süren geçmiş sıfırlama (`resetTuiHistory`) — bitene kadar İSTEM YAZILMAZ.
   *
   * Sıfırlama iki tuş: `ctrl+p` ile palet, kısa bir bekleme, sonra `enter`.
   * O aralıkta gönderilen bir istem paletin FİLTRE kutusuna düşerdi — mesaj
   * hiç yola çıkmaz, tur zaman aşımına kadar otururdu. Kullanıcı düzenlenen
   * mesajın hazır gelen metnine hemen Enter'a basabildiği için bu aralık
   * teorik değil.
   */
  resetting: Promise<void> | null;
  lastUsed: number;
  idleTimer: NodeJS.Timeout | null;
  waiters: Waiter[];
  /**
   * TUI'de ŞU AN açık olan soru kutusu; yoksa `null`.
   *
   * Oturumda tutuluyor çünkü cevap turdan DIŞARIDAN geliyor: kullanıcı bir
   * düğmeye basınca `answerTuiQuestion` çağrılıyor ve o an tur döngüsünün
   * içinde değiliz (bkz. `ASK_USER_TOOL`).
   */
  pendingAsk: AskUserRequest | null;
}

const sessions = new Map<string, TuiSession>();

const OSC = new RegExp("\\x1b\\][^\\x07\\x1b]*(\\x07|\\x1b\\\\)", "g");
const CSI = new RegExp("\\x1b\\[[0-9;?]*[ -/]*[@-~]", "g");

function stripAnsi(text: string): string {
  return text.replace(OSC, "").replace(CSI, "");
}

function modelKeyOf(model: AxetModelEntry | null): string {
  return model ? `${model.provider}/${model.model}` : "";
}

// ---------------------------------------------------------------------------
// Oturum yaşam döngüsü
// ---------------------------------------------------------------------------

function touch(session: TuiSession): void {
  session.lastUsed = Date.now();
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => disposeSession(session.chatId), IDLE_MS);
}

function disposeSession(chatId: string): void {
  const session = sessions.get(chatId);
  if (!session) return;
  sessions.delete(chatId);
  session.disposed = true;
  if (session.idleTimer) clearTimeout(session.idleTimer);
  for (const waiter of session.waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(null);
  }
  session.waiters = [];
  if (!session.exited) {
    try {
      session.proc.kill();
    } catch {
      // Zaten ölmüş olabilir; pty tutamağı süreç sonunda serbest kalıyor.
    }
  }
}

export function closeTuiSession(chatId: string): void {
  disposeSession(chatId);
}

/**
 * Bir projenin sıcak tutulan oturumlarını kapatır.
 *
 * Neden ayrı bir fonksiyon: axet-code skill'leri SÜREÇ AÇILIŞINDA tarıyor.
 * Skill'ler güncellendiğinde havuzda duran süreçler eski listeyi taşımaya
 * devam eder — kullanıcı "güncelledim" der, ajan eskisini kullanır. Katalogdaki
 * `auto_update.py` de tam olarak bunu "aXet.code'da yapılamaz" diye yazıyor:
 * kancası olmadığı için çalışan oturuma girip haber veremiyor. Bizim
 * elimizde süreçler var, kapatabiliyoruz.
 *
 * Meşgul oturuma DOKUNULMAZ: cevap üretirken kapatmak üretilmiş cevabı yok
 * eder. Onlar sıradaki turda zaten yeniden kurulur.
 */
export function closeTuiSessionsForProject(projectDir: string): number {
  const target = resolve(projectDir).toLowerCase();
  let closed = 0;
  for (const [chatId, session] of [...sessions.entries()]) {
    if (resolve(session.cwd).toLowerCase() !== target) continue;
    if (session.busy) continue;
    disposeSession(chatId);
    closed += 1;
  }
  return closed;
}

export function closeAllTuiSessions(): void {
  for (const chatId of [...sessions.keys()]) disposeSession(chatId);
  closeSessionDbs();
}

/**
 * Ajanın HAFIZASINI sıfırlar: axet-code'da yeni bir oturum açar, pty'yi
 * KAPATMADAN.
 *
 * Neden gerekli: kullanıcı bir mesajı düzenleyip yeniden gönderdiğinde bizim
 * listemiz kısalıyor ama arkadaki oturum her şeyi hatırlamaya devam ediyordu —
 * ajan hem eski hem düzeltilmiş soruyu görüyordu. Yani "dallandırma" yalnızca
 * ekranda oluyordu. (Bu, kodda uzun süre "bilinen sınır" diye yazılıydı.)
 *
 * ÖLÇÜM (2026-09-05, `.tmp-cmdprobe`): axet-code TUI'nin komut paletinde geri
 * sarma/undo diye bir komut YOK — tam liste: New Session, Sessions, Switch
 * Model, Open File Picker, Switch Project, Connectors, Skills, Logout, View
 * Code Graph, Toggle Help, Add File, Initialize Project, Quit. Hafızayı kesmenin
 * tek yolu yeni oturum.
 *
 * Palet ilk sırada "New Session" açıyor, yani `ctrl+p` + `enter`. Doğrudan
 * `ctrl+n` DENENDİ ve pty'den tek bayt bile çıkmadı (bağlı değil), o yüzden
 * palet yolu kullanılıyor.
 *
 * Aynı ölçümde iki kısa tur atıldı, arada bu iki tuş: veritabanında İKİ AYRI
 * oturum oluştu ve bağlayıcılar (17+25 araç) yeniden yüklenmedi — yani pty'yi
 * kapatıp yeniden kurmanın ~10 saniyelik bedeli ödenmiyor.
 *
 * `seeded` false'a çekiliyor: sonraki gönderim geçmişi yeniden tohumluyor ve
 * arayüz o an KISALTILMIŞ geçmişi veriyor. Dallandırmayı asıl yapan bu.
 *
 * ENTER KÖRLEMESİNE BASILMIYOR. Paletin ilk satırı "New Session", ama son
 * satırı "Quit" ve arada "Logout" var: palet AÇILMADIYSA (ctrl+p yutuldu, ekran
 * başka bir şeyle meşgul) o Enter'ın nereye gideceğini bilmiyoruz. Bu yüzden
 * önce paletin açıldığı EKRANDAN doğrulanıyor; açılmadıysa esc ile toparlanıp
 * hafıza olduğu gibi bırakılıyor — yanlış dallanmış bir sohbet, dallanmamış bir
 * sohbetten çok daha pahalı.
 */
export function resetTuiHistory(chatId: string): boolean {
  const session = sessions.get(chatId);
  if (!session || session.exited || session.disposed || !session.ready) return false;
  if (session.busy) {
    // Süren bir turun ortasında palet açmak, tuşları o turun kutusuna
    // göndermek demek. Arayüz zaten tur sırasında düzenlemeye izin vermiyor.
    console.log("[axetChatTui] gecmis sifirlanmadi, tur suruyor", { chatId });
    return false;
  }
  // Tampon ÖNCE temizleniyor: `waitForAny` 64 KB'lik birikmiş çıktıda da arıyor
  // ve "New Session" oraya daha önce (başka bir palet açılışında) düşmüş
  // olabilirdi — o zaman doğrulama, hiç açılmamış bir paleti açık sayardı.
  session.screen = "";
  try {
    session.proc.write("\x10");
  } catch {
    return false;
  }
  session.resetting = (async () => {
    const opened = await waitForAny(session, [MARK_PALETTE, MARK_PALETTE_ALT], PALETTE_OPEN_MS);
    if (!opened) {
      // Açılmadı: Enter'ı yeme, esc ile ekranı bilinen bir hâle getir.
      try {
        if (!session.exited && !session.disposed) session.proc.write("\x1b");
      } catch {
        // Süreç gitmişse toparlanacak bir şey de yok.
      }
      // Oturum duruyor, ama en azından geçmiş yeniden TOHUMLANSIN: sonraki
      // istem, kısaltılmış konuşmayı açıkça yazıp "yalnızca son mesaja cevap
      // ver" diyen uzun biçime düşüyor. Ajan eski dalı hâlâ hatırlıyor, fakat
      // hangi geçmişin geçerli olduğu artık istemde yazılı. Bir büyük istemin
      // bedeli, sessizce yanlış dala cevap vermekten ucuz.
      session.seeded = false;
      console.log("[axetChatTui] gecmis SIFIRLANAMADI, palet acilmadi", { chatId });
      session.resetting = null;
      return;
    }
    try {
      if (!session.exited && !session.disposed) session.proc.write("\r");
    } catch {
      // Süreç gitmişse sıfırlanacak bir şey de kalmadı.
    }
    session.axetSessionId = null;
    session.seeded = false;
    session.attached = false;
    // Sohbet artık BAŞKA bir axet-code oturumunda. Bağ silinmezse uygulama
    // yeniden açıldığında dallanmadan ÖNCEKİ oturuma bağlanılır ve
    // kullanıcının bilerek attığı dal sessizce geri alınmış olurdu.
    clearBinding(session.chatId);
    session.pendingAsk = null;
    // Oturum eşleşmesinin alt sınırı da ileri alınıyor: yeni oturum bu andan
    // sonra doğacak ve eski oturum artık aday olmamalı.
    session.spawnedAt = Math.floor(Date.now() / 1000);
    console.log("[axetChatTui] gecmis sifirlandi (yeni axet-code oturumu)", { chatId });
    // Enter'dan sonra da bir pay: palet kapanıp sohbet kutusu odağı geri alana
    // kadar yazılan istem yine yanlış yere düşerdi.
    await new Promise((r) => setTimeout(r, 700));
    session.resetting = null;
  })();
  return true;
}

function evictIfNeeded(): void {
  while (sessions.size >= MAX_SESSIONS) {
    let oldest: TuiSession | null = null;
    for (const session of sessions.values()) {
      if (session.busy) continue;
      if (!oldest || session.lastUsed < oldest.lastUsed) oldest = session;
    }
    if (!oldest) return;
    disposeSession(oldest.chatId);
  }
}

/** Ekranda verilen işaretlerden biri görünene kadar bekler; hangisi ise onu döndürür. */
function waitForAny(session: TuiSession, needles: string[], timeoutMs: number): Promise<string | null> {
  const already = needles.find((n) => session.screen.includes(n));
  if (already) return Promise.resolve(already);
  return new Promise((resolve) => {
    const waiter: Waiter = {
      needles,
      resolve,
      timer: setTimeout(() => {
        session.waiters = session.waiters.filter((w) => w !== waiter);
        resolve(null);
      }, timeoutMs)
    };
    session.waiters.push(waiter);
  });
}

function feed(session: TuiSession, data: string): void {
  session.screen = (session.screen + stripAnsi(data)).slice(-64_000);
  // Pankart TAM BURADA aranıyor, `handshake` içinde değil.
  //
  // Ölçüm (2026-09-07): axet-code pankartı "Select Tool" diyaloğu ekrandayken
  // basıyor. `handshake` ise her diyalog adımında `session.screen = ""` yapıyor
  // ve ancak READY işaretinde bakıyordu — yani pankart, ona bakmamızdan önce
  // silinen tampondaydı. Sonuç: `axetCodeLatestSeen` config'te boş kaldı ve
  // 1.2.3 -> 1.3.0 duyurusu açılış ekranında hiç görünmedi.
  //
  // `feed` her veri parçasında çalışıyor, o yüzden tarama iki kez sınırlanıyor:
  // oturum hazır olduktan sonra hiç bakılmıyor (pankart bir AÇILIŞ çıktısı) ve
  // 64 KB'lik tamponun tamamı değil yalnızca ucu taranıyor. Uç, parçalar
  // arasında bölünen bir satırı da kapsayacak kadar geniş.
  if (!session.ready) detectUpdateAvailable(session.screen.slice(-4_000));
  if (!session.waiters.length) return;
  const remaining: Waiter[] = [];
  for (const waiter of session.waiters) {
    const hit = waiter.needles.find((n) => session.screen.includes(n));
    if (hit) {
      clearTimeout(waiter.timer);
      waiter.resolve(hit);
    } else {
      remaining.push(waiter);
    }
  }
  session.waiters = remaining;
}

/**
 * Açılış diyaloglarını çevirir.
 *
 * İnteraktif kipte `-m` bayrağı YOK (üst seviyede `-v` "sürüm" demek), yani
 * model yalnızca diyalogdan seçilebiliyor. Bunu çözmek için modeli spawn'dan
 * ÖNCE axet-code'un kendi config dosyasına yazıyoruz (setAxetModel; CLI'ın
 * kendi `/model` seçicisinin yazdığı dosyanın aynısı). Böylece diyalogdaki
 * "Recently used" listesinin başı bizim model oluyor ve tek Enter doğru
 * modeli seçiyor — ekrana model adı yazıp filtrelemeye gerek kalmıyor.
 */
/**
 * Bağlayıcı araçları yüklenene kadar bekler.
 *
 * Ekrandaki `● <ad> <N> tools` satırlarının SAYISI izleniyor; sayı artmayı
 * bıraktıktan sonra kısa bir sessizlik geçince yerleşmiş sayılıyor. Neden tek
 * bir işaret aranmıyor: kayıt sayısı kullanıcıya göre değişiyor (ölçümde 4
 * kayıt, 25+25+25+17 = 92 araç) ve hepsi ayrı ayrı, saniyeler içinde geliyor.
 *
 * Tavan dolarsa BEKLEMEDEN devam ediliyor ve durum log'a yazılıyor: bağlayıcı
 * arka ucu çökmüşse sohbeti tamamen kilitlemek, aracı olmayan bir cevaptan
 * daha kötü olurdu.
 */
async function waitForConnectors(session: TuiSession): Promise<Record<string, unknown>> {
  const started = Date.now();
  const deadline = started + CONNECTOR_WAIT_MS;
  let seen = 0;
  let lastGrowth = Date.now();
  while (Date.now() < deadline) {
    if (session.disposed || session.exited) break;
    const count = session.screen.match(RE_CONNECTOR_TOOLS)?.length ?? 0;
    if (count > seen) {
      seen = count;
      lastGrowth = Date.now();
    }
    if (seen > 0 && Date.now() - lastGrowth > CONNECTOR_SETTLE_MS) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return {
    baglayiciBekleme: ((Date.now() - started) / 1000).toFixed(1),
    baglayiciSatir: seen
  };
}

async function handshake(session: TuiSession): Promise<boolean> {
  for (let step = 0; step < HANDSHAKE_MAX_STEPS; step += 1) {
    // Güncelleme işareti listenin BAŞINDA: o kutu açıkken hazır olma işareti
    // hiç gelmiyor, ama beklemeye devam etmek 30 saniyeyi boşa harcardı.
    const hit = await waitForAny(
      session,
      [MARK_UPDATE_REQUIRED, MARK_UPDATE_ALT, MARK_TOOL_DIALOG, MARK_MODEL_DIALOG, ...MARK_READY],
      HANDSHAKE_STEP_MS
    );
    if (session.disposed || session.exited) return false;
    if (hit === MARK_UPDATE_REQUIRED || hit === MARK_UPDATE_ALT) {
      detectUpdateBlock(session.screen);
      return false;
    }
    if (!hit) {
      // Kutunun metni bir sürümde değişmiş olabilir; el sıkışma boşa çıktıysa
      // ekranın tamamı bir kez daha, işaretlerden bağımsız taranıyor.
      if (detectUpdateBlock(session.screen)) return false;
      // Sessiz kalmıyoruz: TUI'nin açılış ekranı bir sürümde değişirse tek
      // belirti "sohbet yine yavaş" olurdu ve sebebi hiçbir yerde yazmazdı.
      console.log("[axetChatTui] acilis ekrani taninmadi, run kipine dusuluyor", {
        chatId: session.chatId,
        adim: step,
        sonEkran: session.screen.slice(-400)
      });
      return false;
    }
    if (MARK_READY.includes(hit)) {
      // Pankart tam burada aranıyor: açılış çıktısı bu noktada tamamlanmış
      // oluyor ve `session.screen` bir sonraki adımda temizleniyor.
      detectUpdateAvailable(session.screen);
      const bekleme = session.useConnectors ? await waitForConnectors(session) : null;
      session.ready = true;
      console.log("[axetChatTui] oturum hazir", { chatId: session.chatId, adim: step, ...(bekleme ?? {}) });
      return true;
    }
    // Diyalogda ilk sıra bizim istediğimiz seçenek: araç listesinde aXet.Code,
    // model listesinde de config'e az önce yazdığımız model.
    session.screen = "";
    session.proc.write("\r");
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sohbetin ESKİ axet-code oturumuna bağlanır — geçmişi taşımak yerine.
 *
 * ARIZA (2026-09-07, canlı ölçüm): sohbet geçmişi her yeni pty'de TUI'ye
 * yapıştırılıyordu. 52 mesajlık bir sohbette 115 karakterlik bir soru tele
 * 9.748 karakter olarak çıktı; tur 224,6 saniye sürdü, bunun 219,4 saniyesi
 * yapıştırmaydı, modelin payı 5,2 saniye. Kullanıcının "ilk tur neden 100
 * saniye" sorusunun cevabı buydu: bedel turun içinde değil, öncesindeydi.
 *
 * ÇÖZÜM (kullanıcı önerisi): axet-code oturumları zaten `ctrl+s` altında
 * duruyor ve hafızayı taşıyor. Ölçüldü: bağlanmak 4 saniye, bağlandıktan
 * sonra bir önceki oturumda konuşulan kelime hatırlandı, tur 3 saniyede
 * bitti. Yani gönderilen tek şey son mesaj oluyor.
 *
 * DOĞRULAMA ÖNCE, TUŞ SONRA. Bağ diskte duruyor ama oturum silinmiş,
 * veritabanı başka bir klasöre çözülmüş ya da başlık başkası tarafından
 * değiştirilmiş olabilir. Üçünde de bağa güvenmek, YANLIŞ BİR OTURUMA
 * bağlanmak demek — bu dosyada bunun bedeli iki kez ödendi (bkz. `spawnedAt`
 * ve `preexisting` notları: başka bir sohbetin cevabı bu turun cevabı diye
 * gösterilmişti). Şüphe varsa bağ silinip eski davranışa (tohumlama)
 * dönülüyor: yavaş ama doğru.
 */
async function attachToBoundSession(session: TuiSession): Promise<boolean> {
  const binding = readBinding(session.chatId);
  if (!binding) return false;
  // Klasör değiştiyse bu veritabanında o kimlik YOK; başka bir veritabanında
  // aynı kimliğin bulunması da beklenmez, ama kontrol bedava.
  if (binding.cwd !== session.cwd) {
    console.log("[axetChatTui] bag klasoru degismis, dusuruluyor", {
      chatId: session.chatId,
      bagli: binding.cwd,
      simdi: session.cwd
    });
    clearBinding(session.chatId);
    return false;
  }
  const title = sessionTitle(session.dbPath, binding.sessionId);
  if (title === null || title !== binding.title) {
    // `null`: oturum silinmiş. Farklı başlık: kullanıcı ya da axet-code
    // yeniden adlandırmış — aradığımız metin artık o satıra götürmüyor.
    console.log("[axetChatTui] bag dogrulanamadi, dusuruluyor", {
      chatId: session.chatId,
      oturum: binding.sessionId.slice(0, 8),
      beklenen: binding.title,
      bulunan: title
    });
    clearBinding(session.chatId);
    return false;
  }

  const tag = bindingTag(session.chatId);
  const started = Date.now();
  // Tampon ÖNCE temizleniyor: `waitForAny` birikmiş çıktıda da arıyor ve bu
  // ekranın metni daha önce (başka bir bağlanmada) oraya düşmüş olabilirdi.
  session.screen = "";
  try {
    session.proc.write("\x13");
  } catch {
    return false;
  }
  const opened = await waitForAny(session, [MARK_SESSION_PICKER], PICKER_OPEN_MS);
  if (!opened) {
    // Açılmadıysa hiçbir tuşa basılmıyor: kapalı bir seçicide yazılan metin
    // sohbet kutusuna düşer ve bir sonraki isteme yapışırdı.
    try {
      if (!session.exited && !session.disposed) session.proc.write("\x1b");
    } catch {
      // Süreç gitmişse toparlanacak bir şey de yok.
    }
    console.log("[axetChatTui] oturum secici acilmadi, tohumlamaya donuluyor", { chatId: session.chatId });
    return false;
  }
  try {
    session.proc.write(tag);
    await delay(PICKER_FILTER_MS);
    if (session.exited || session.disposed) return false;
    session.proc.write("\r");
    await delay(PICKER_SETTLE_MS);
  } catch {
    return false;
  }
  if (session.exited || session.disposed) return false;

  session.axetSessionId = binding.sessionId;
  // Geçmiş artık oturumun İÇİNDE: bu bayrak, `buildSeedPrompt` dalını
  // tamamen devre dışı bırakan şey.
  session.seeded = true;
  session.attached = true;
  console.log("[axetChatTui] ESKI OTURUMA BAGLANILDI", {
    chatId: session.chatId,
    oturum: binding.sessionId.slice(0, 8),
    etiket: tag,
    saniye: ((Date.now() - started) / 1000).toFixed(1)
  });
  return true;
}

/**
 * Sohbeti, ilk turunda doğan axet-code oturumuna BAĞLAR.
 *
 * Oturumu burada yeniden adlandırıyoruz, çünkü `ctrl+s` ekranı oturumları
 * yalnızca başlıklarıyla listeliyor ve axet-code'un ürettiği başlıklar tekil
 * değil. Okunabilir kısım korunuyor (kullanıcı kendi terminalinden `ctrl+s`
 * açtığında oturumlarını hâlâ tanıyabilmeli), sonuna tekil ek geliyor.
 *
 * Başarısızlık SESSİZ ve zararsız: bağ kurulmazsa sohbet bugünkü davranışına
 * devam eder, yalnızca yavaş kalır.
 */
function bindSessionToChat(session: TuiSession): void {
  if (!session.axetSessionId || session.attached) return;
  if (readBinding(session.chatId)) return;
  const tag = bindingTag(session.chatId);
  const current = sessionTitle(session.dbPath, session.axetSessionId);
  if (current === null) return;
  // Etiket zaten varsa yeniden yazma: aynı başlığı ikinci kez kurmak, ekte
  // tekrar eden bir kuyruk bırakırdı.
  const title = current.includes(tag) ? current : `${current.trim()} · ${tag}`.trim();
  if (title !== current && !renameSession(session.dbPath, session.axetSessionId, title)) {
    console.log("[axetChatTui] oturum adlandirilamadi, bag kurulmadi", {
      chatId: session.chatId,
      oturum: session.axetSessionId.slice(0, 8)
    });
    return;
  }
  // Yazdığımızı GERİ OKUYORUZ. `renameSession` "kaç satır değişti" diyor,
  // "ne yazıldı" demiyor; bağın tek dayanağı bu başlık olduğu için iddiaya
  // değil, veritabanının kendisine bakılıyor.
  if (sessionTitle(session.dbPath, session.axetSessionId) !== title) return;
  writeBinding(session.chatId, {
    sessionId: session.axetSessionId,
    title,
    cwd: session.cwd
  });
  console.log("[axetChatTui] sohbet oturuma baglandi", {
    chatId: session.chatId,
    oturum: session.axetSessionId.slice(0, 8),
    baslik: title
  });
}

function createSession(chatId: string, cwd: string, model: AxetModelEntry | null, useConnectors: boolean): TuiSession | null {
  try {
    mkdirSync(cwd, { recursive: true });
  } catch {
    // Oluşturulamazsa pty.spawn zaten anlamlı bir hatayla patlıyor.
  }
  // Klasör AÇILDIKTAN sonra çözülüyor: `resolveSessionDb` cwd'de `.axet-code`
  // görürse yukarı çıkmıyor, yani sıra önemli (bkz. axetSessionDb.ts).
  const dbPath = resolveSessionDb(cwd);
  if (!dbPath) return null;
  if (!dbPath.startsWith(join(cwd, ".axet-code"))) {
    // Ata klasördeki bir veritabanına bağlanmak MEŞRU olabilir (axet-code da
    // yukarı doğru arıyor), ama sessizce olmamalı: 2026-09-07'deki arızanın
    // tek belirtisi buydu ve hiçbir yerde yazmıyordu.
    console.log("[axetChatTui] oturum veritabani UST klasorde", { chatId, cwd, dbPath });
  }
  if (model) {
    // Diyalogda tek Enter'ın doğru modeli seçmesini sağlayan adım.
    setAxetModel("large", model);
  }
  // Sürüm sondajı: beklenmiyor (oturum açılışını geciktirmesin), yalnızca
  // günlüğe düşsün diye. axet-code kendini güncellerse ilk yeni oturumda
  // "SURUM DEGISTI" satırı çıkar — bkz. axetCodeVersion.ts.
  void noteAxetCodeVersion();
  let proc: pty.IPty;
  // Spawn'dan ÖNCE okunuyor: axet-code oturum satırını spawn'dan sonra yazıyor,
  // yani bu değer her zaman gerçek oturumun altında kalır.
  const spawnedAt = Math.floor(Date.now() / 1000);
  try {
    proc = pty.spawn("axet-code.exe", ["-c", cwd, "-y"], {
      name: "xterm-256color",
      // Genişlik yalnızca TUI'nin kendi sarmalaması için önemli; metni
      // ekrandan okumadığımız için bir ölçüye bağlı değiliz.
      cols: 120,
      rows: 34,
      cwd,
      env: axetSpawnEnv(useConnectors)
    });
  } catch {
    return null;
  }
  const session: TuiSession = {
    chatId,
    proc,
    cwd,
    modelKey: modelKeyOf(model),
    useConnectors,
    dbPath,
    spawnedAt,
    axetSessionId: null,
    screen: "",
    ready: false,
    busy: false,
    disposed: false,
    exited: false,
    cancelled: false,
    seeded: false,
    attached: false,
    resetting: null,
    lastUsed: Date.now(),
    idleTimer: null,
    waiters: [],
    pendingAsk: null
  };
  proc.onData((data) => feed(session, data));
  proc.onExit(() => {
    session.exited = true;
    for (const waiter of session.waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    session.waiters = [];
  });
  sessions.set(chatId, session);
  touch(session);
  return session;
}

/**
 * Bu sohbet için hazır bir TUI oturumu döndürür; yoksa kurar.
 *
 * cwd, model veya BAĞLAYICI kararı değiştiyse oturum yeniden kuruluyor:
 * üçü de spawn anında sabitleniyor (bağlayıcı adresi ortam değişkeniyle —
 * bkz. axetSpawnEnv.ts). Yeniden kurulan oturumun geçmişi olmadığı için
 * `seeded` sıfırlanır ve o mesajda geçmiş yeniden tohumlanır; yani en kötü
 * durum, eski `run` kipinin normal davranışıdır.
 */
// Kurulum sırasında ikinci bir çağrı gelirse (ön-ısıtma yazarken tetiklenir,
// hemen ardından gönderim) AYNI kuruluma bağlanılıyor. Aksi hâlde her tuşta
// yeni bir axet-code süreci açılırdı.
const pendingSetup = new Map<string, Promise<TuiSession | null>>();

async function ensureSession(
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  useConnectors: boolean
): Promise<TuiSession | null> {
  const existing = sessions.get(chatId);
  if (existing) {
    // Bağlayıcılarda YENİDEN KURMA yalnızca KAPALI→AÇIK yönünde. Ters yönde
    // kurmak, kazanılan her şeyi (oturum hafızası, araç sonuçları) bir kez daha
    // "mail" geçmeyen bir mesaj yüzünden çöpe atmak olurdu; tek kazancı o turda
    // araç kataloğunu göndermemek, bedeli 3,5 s + geçmişin yeniden tohumlanması.
    // Yani sohbette bir kez açıldıysa sohbet boyunca açık kalıyor.
    const connectorsOk = existing.useConnectors || !useConnectors;
    const compatible =
      !existing.exited &&
      !existing.disposed &&
      existing.ready &&
      existing.cwd === cwd &&
      existing.modelKey === modelKeyOf(model) &&
      connectorsOk;
    if (compatible) return existing;
  }
  const inFlight = pendingSetup.get(chatId);
  if (inFlight) {
    const session = await inFlight;
    if (
      session &&
      !session.exited &&
      !session.disposed &&
      session.cwd === cwd &&
      session.modelKey === modelKeyOf(model) &&
      (session.useConnectors || !useConnectors)
    ) {
      return session;
    }
  }
  if (sessions.has(chatId)) disposeSession(chatId);
  evictIfNeeded();
  const setup = (async () => {
    const session = createSession(chatId, cwd, model, useConnectors);
    if (!session) return null;
    const ok = await handshake(session);
    if (!ok) {
      disposeSession(chatId);
      return null;
    }
    // El sıkışmadan SONRA, ilk mesajdan ÖNCE: bağlanma bir kez ödenip
    // oturum boyunca kullanılıyor, ve ön-ısıtma sayesinde bedeli çoğu zaman
    // kullanıcı yazarken ödeniyor. Başarısızlığı turu düşürmüyor — bağ
    // kurulamazsa sohbet eski yoldan (geçmişi tohumlayarak) devam ediyor.
    await attachToBoundSession(session).catch(() => false);
    return session;
  })();
  pendingSetup.set(chatId, setup);
  try {
    return await setup;
  } finally {
    if (pendingSetup.get(chatId) === setup) pendingSetup.delete(chatId);
  }
}

/**
 * Kullanıcı yazarken oturumu şimdiden kurar.
 *
 * Kalıcı oturumda açılış maliyeti sohbette BİR KEZ ödeniyor; onu da kullanıcı
 * yazarken ödersek ilk mesaj da hızlı oluyor. Bağlayıcılar KAPALI kuruluyor —
 * karar mesajın metnine bağlı (bkz. connectorPolicy) ve ısıtma anında metin
 * henüz yok; yaygın durum kapalı. Karar "açık" çıkarsa oturum yeniden kurulur,
 * yani yanlış tahminin bedeli eski davranışın aynısı.
 */
export function prewarmTui(
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  useConnectors = false
): void {
  if (!chatId || tuiUnavailableReason(cwd)) return;
  const existing = sessions.get(chatId);
  if (existing && !existing.exited && !existing.disposed) {
    touch(existing);
    // Taslak yazılırken karar KAPALI'dan AÇIK'a dönebiliyor ("...mail..."
    // yazıldığı an). Bu durumda oturumu şimdiden yeniden kuruyoruz; aksi hâlde
    // ısıtma yapılmış ama işe yaramamış olurdu ve altı saniyelik kurulum yine
    // gönderim anına kalırdı. Süren bir tur varsa dokunulmuyor.
    if (useConnectors && !existing.useConnectors && !existing.busy) {
      void ensureSession(chatId, cwd, model, true).catch(() => null);
    }
    return;
  }
  if (pendingSetup.has(chatId)) return;
  void ensureSession(chatId, cwd, model, useConnectors).catch(() => null);
}

// ---------------------------------------------------------------------------
// Araç adları
// ---------------------------------------------------------------------------
// Ham ad renderer'a olduğu gibi gidiyor; Türkçe/İngilizce karşılığı orada
// (i18n sözlüğünde) bulunuyor. Bilinmeyen bir araç adı da olduğu gibi
// gösterilebilsin diye burada çeviri YAPILMIYOR.
function normalizeToolName(raw: string): string {
  // MCP araçları `mcp_conn_<uuid>_<ad>` biçiminde geliyor; uuid'nin arayüzde
  // hiçbir anlamı yok.
  const mcp = /^mcp_conn_[0-9a-f-]{8,}_(.+)$/i.exec(raw);
  if (mcp) return `mcp:${mcp[1]}`;
  return raw;
}

// ---------------------------------------------------------------------------
// Araç girdisi ve sonucu — "ne üstünde çalışıyor" ve "ne çıktı"
// ---------------------------------------------------------------------------
// Kullanıcı isteği (2026-09-04): gösterge terminaldeki gibi olsun —
//
//   ● Searching for textarea|composer|rows=|scrollHeight
//     ⎿  "textarea|composer|rows=|scrollHeight"
//
// Yani sadece aracın adı değil, ÜZERİNDE ÇALIŞTIĞI ŞEY de görünmeli. Bilgi
// zaten elimizde: axet-code her `tool_call`'un girdisini oturum veritabanına
// JSON metni olarak yazıyor, biz o kayıtları turda zaten okuyoruz.
//
// Alan adları araca göre değişiyor ve SÜRÜME BAĞLI. Bu yüzden sabit bir şema
// beklemiyoruz: bilinen adlar sırayla deneniyor, hiçbiri tutmazsa girdideki
// ilk anlamlı metin alınıyor. Böylece yarın eklenecek bir araç "adsız" değil,
// sadece daha kaba bir özetle görünür.
const TARGET_KEYS = [
  "command",
  "pattern",
  "file_path",
  "filePath",
  "path",
  "filename",
  "file",
  "url",
  "query",
  "user_prompt",
  "prompt",
  "description"
];

/** Göstergedeki tek satır için üst sınır. Uzun bir bash komutu satırı taşırmasın. */
const TARGET_MAX = 90;

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** `tool_call` girdisinden gösterilecek tek satırlık hedef. Çıkarılamazsa boş. */
function summarizeToolInput(input: string | undefined): string {
  if (!input) return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    // Girdi her zaman JSON olmayabilir; ham hâli de bir şey söylüyor.
    return clip(input, TARGET_MAX);
  }
  if (typeof parsed === "string") return clip(parsed, TARGET_MAX);
  if (!parsed || typeof parsed !== "object") return "";
  const record = parsed as Record<string, unknown>;
  for (const key of TARGET_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return clip(value, TARGET_MAX);
  }
  // Bilinen alan yok — girdideki ilk metin değeri. Boolean/sayı atlanıyor:
  // "true" tek başına hiçbir şey anlatmaz.
  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.trim()) return clip(value, TARGET_MAX);
  }
  return "";
}

// Sonucun hata olup olmadığı. `is_error` GÜVENİLİR DEĞİL — canlı ölçümde
// (2026-09-04) bir MCP çağrısı HTTP 500 döndürdüğü hâlde `is_error: false`
// yazıyordu, bkz. connectorHealth.ts.
const RE_TOOL_FAILED = /^\s*(error|traceback|exception)\b|error calling tool|\bhttp error \d{3}\b/i;

interface ResultSummary {
  result: string;
  extraLines: number;
  failed: boolean;
  output: string;
}

/**
 * Araç çıktısının tam metni sohbet geçmişine de yazıldığı için üst sınır var.
 * ÖLÇÜM (2026-09-05, canlı veritabanındaki 2100 sonuç): medyan 255, p90 4554,
 * p99 33.526, en büyük 139.744 karakter. 4000, sonuçların ~%90'ını olduğu gibi
 * taşıyor; kuyruğu uzun birkaç dev çıktı için geçmiş dosyasını megabaytlarca
 * şişirmenin anlamı yok.
 */
const OUTPUT_MAX = 4000;

/**
 * axet-code araç çıktılarını `<result>…</result>` içine sarıyor (ölçüm,
 * 2026-09-05). Bu sarmalayıcı ATILMAK ZORUNDA: ilk satır olduğu gibi
 * alındığında göstergedeki sonuç satırı düpedüz `<result>` yazıyordu — yani
 * araç sonucu diye gösterilen şey aracın çıktısı bile değildi.
 */
function stripResultWrapper(body: string): string {
  const match = body.match(/^<result>\s*([\s\S]*?)\s*<\/result>\s*$/);
  return (match ? match[1] : body).trim();
}

/**
 * TUI'nin KENDİ menülerini açan ÜÇ karakteri zararsızlaştırır.
 *
 * Üçü de aynı sonuca çıkıyor: menü açıkken Enter GÖNDERMİYOR, menüdeki
 * seçimi uyguluyor — yani mesaj hiç yola çıkmıyor ve tur, kimse bir şey
 * beklemezken 5 dakikalık zaman aşımına kadar oturuyor. Ölçümler 2026-09-05,
 * geçici pty spike'ları:
 *
 *   `@` — dosya tamamlama menüsü:
 *     `Merhaba @src/index.ts dosyasi.` + \r → gitti, ajan dosyayı okudu.
 *     `Merhaba @src/index.ts` + \r          → HİÇBİR ŞEY gitmedi; ekranda
 *       yalnızca menünün ürettiği `≡ index.ts ✕ src/index.ts` çipi kaldı.
 *
 *   `/` — satır başındayken KOMUT PALETİ (New Session, Switch Model, Logout,
 *     Quit...). Metnin geri kalanı paletin filtre kutusuna yazılıyor:
 *     `/etc/hosts nedir?` + \r bir mesaj değil, bir KOMUT çalıştırırdı.
 *     ` /etc/hosts nedir?` (başta tek boşluk) + \r → palet hiç açılmadı, mesaj
 *     gitti ve baştaki boşluk TUI tarafından kırpıldı — gönderilen metin
 *     `/etc/hosts nedir?`.
 *
 * Düzeltme arayüzde DEĞİL burada: kullanıcı bu iki işareti kendi elleriyle de
 * yazabiliyor (ya da yapıştırabiliyor), yani composer'daki `@` menüsü bu
 * tuzağın tek kapısı değil.
 *
 * `/` yalnızca metnin EN BAŞINDA korunuyor: palet giriş kutusu BOŞKEN açılıyor,
 * sonraki satırların başındaki `/` (ctrl+j ile satır atlanmış oluyor) menüyü
 * açmıyor.
 *
 * ÜÇÜNCÜSÜ SONRADAN BULUNDU (2026-09-05): TUI'nin kendi yardım listesi
 * (`ctrl+g`) `% use skill` diyor — yani `%` de bir menü açıyor ve buradaki
 * koruma onu tanımıyordu. Ölçüm (tuş-only pty):
 *
 *     `100% emin misin`  → menü YOK      `%50 indirim var` → menü YOK
 *     `indirim %50`      → menü YOK      `indirim %`       → MENÜ AÇILDI
 *                                         (`axet-sap-launcher-knowledge …`)
 *
 * Yani tetikleyici `@` ile aynı: satırın SONUNDA, boşlukla başlayan bir
 * `%<parça>`. Yüzde işaretinin bir sayıya yapıştığı hâl (`100%`) tetiklemiyor,
 * o yüzden `(^|\s)` şartı korunuyor — normal Türkçe metinde `%` çoğunlukla
 * sayıya bitişik yazılıyor ve o cümleler bozulmadan geçmeli.
 *
 * Parça UZUNLUĞU `+` değil `*`: ölçümde satır sonundaki YALNIZ `%` de menüyü
 * açtı, yani "en az bir karakter" şartı yanlıştı.
 */
const MENU_TAIL = /(^|\s)[@%][^\s@%]*$/;

function escapeTuiMenus(text: string): string {
  const guarded = text.startsWith("/") ? ` ${text}` : text;
  if (!/[@%]/.test(guarded)) return guarded;
  return guarded
    .split("\n")
    .map((line) => (MENU_TAIL.test(line) ? `${line} ` : line))
    .join("\n");
}

function summarizeToolResult(content: string | undefined, isError: boolean | undefined): ResultSummary {
  const raw = (content ?? "").trim();
  if (!raw) return { result: "", extraLines: 0, failed: isError === true, output: "" };
  const body = stripResultWrapper(raw);
  const lines = body.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return {
    result: clip(lines[0] ?? "", TARGET_MAX),
    extraLines: Math.max(0, lines.length - 1),
    // Hata tespiti HAM metinde: sarmalayıcı dışında kalan bir hata satırı da
    // yakalansın.
    failed: isError === true || RE_TOOL_FAILED.test(body) || RE_TOOL_FAILED.test(raw),
    output: body.length > OUTPUT_MAX ? `${body.slice(0, OUTPUT_MAX)}\n…` : body
  };
}

// ---------------------------------------------------------------------------
// Dosya değişikliği farkı
// ---------------------------------------------------------------------------
//
// Araç SONUCU bir şey anlatmıyor: `edit` "Content replaced in file: …", `write`
// "File successfully written: …" diyor, yani NE değiştiği hiçbir yerde yok.
// Ama araç GİRDİSİ tam olarak bunu taşıyor (ölçüm, 2026-09-05):
//   edit      -> { file_path, old_string, new_string }
//   multiedit -> { file_path, edits: [{ old_string, new_string }, …] }
//   write     -> { file_path, content }
// Farkı bu yüzden sonuçtan değil girdiden üretiyoruz.
//
// Gerçek bir satır-satır fark algoritması (Myers vb.) BİLİNÇLİ OLARAK YOK:
// elimizdeki zaten "şu blok gitti, bu blok geldi" biçiminde, yani hangi
// satırların değiştiği belli. Blokları `-`/`+` ile göstermek hem doğru hem de
// bir fark kütüphanesi bağımlılığı getirmiyor.

/** Fark metninin üst sınırı — geçmiş dosyası şişmesin. */
const DIFF_MAX = 4000;

function diffBlock(oldText: string, newText: string): string {
  const out: string[] = [];
  for (const line of (oldText ?? "").split(/\r?\n/)) out.push(`-${line}`);
  for (const line of (newText ?? "").split(/\r?\n/)) out.push(`+${line}`);
  return out.join("\n");
}

/** Düzenleme araçlarının girdisinden `-`/`+` satırlarından oluşan bir fark metni. */
function buildDiff(tool: string, input: string | undefined): string {
  if (!input) return "";
  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(input);
    if (!value || typeof value !== "object") return "";
    parsed = value as Record<string, unknown>;
  } catch {
    return "";
  }
  const blocks: string[] = [];
  if (tool === "write") {
    const content = parsed.content;
    if (typeof content !== "string") return "";
    for (const line of content.split(/\r?\n/)) blocks.push(`+${line}`);
  } else if (tool === "edit") {
    const oldText = parsed.old_string;
    const newText = parsed.new_string;
    if (typeof oldText !== "string" && typeof newText !== "string") return "";
    blocks.push(diffBlock(String(oldText ?? ""), String(newText ?? "")));
  } else if (tool === "multiedit") {
    const edits = parsed.edits;
    if (!Array.isArray(edits)) return "";
    for (const edit of edits) {
      if (!edit || typeof edit !== "object") continue;
      const e = edit as Record<string, unknown>;
      blocks.push(diffBlock(String(e.old_string ?? ""), String(e.new_string ?? "")));
    }
  } else {
    return "";
  }
  const text = blocks.join("\n");
  return text.length > DIFF_MAX ? `${text.slice(0, DIFF_MAX)}\n…` : text;
}

// ---------------------------------------------------------------------------
// Bir tur
// ---------------------------------------------------------------------------

/** Oturumu veritabanında bulmak için kullanılacak, tek satırlık ayırt edici parça. */
function promptNeedle(message: string): string {
  // Satır seçimi HAM metin üzerinde (satır sonları burada anlamlı), ama iğnenin
  // kendisi `matchKey`'den geçiyor: pty'ye yazarken bazı noktalama işaretleri
  // düşüyor ve iğne onlara güvenemez (gerekçe ve ölçüm: axetSessionDb.ts
  // `matchKey`).
  const longest = message
    .split(/\r?\n/)
    .map((line) => matchKey(line))
    .filter((line) => line.length > 0)
    .sort((a, b) => b.length - a.length)[0];
  return (longest ?? matchKey(message)).slice(0, 80);
}

export interface TuiSendArgs {
  chatId: string;
  cwd: string;
  model: AxetModelEntry | null;
  history: AxetChatMessage[];
  message: string;
  useConnectors: boolean;
  /** Oturum yeniden kurulduğunda geçmişi tohumlamak için — `run` kipiyle aynı metin. */
  buildSeedPrompt: (history: AxetChatMessage[], message: string) => string;
  /** İlk mesajda eklenen bağlam/hatırlatma önsözü. */
  buildFirstPrompt: (message: string) => string;
  onChunk: (text: string) => void;
  onActivity: (activity: AxetChatActivity) => void;
  /** Plan ve bağlam doluluğu — saniyede bir, yalnızca DEĞİŞTİĞİNDE. */
  onProgress: (progress: AxetChatProgress) => void;
}

/** Bu sohbetin TUI oturumu şu an bir turu sürdürüyor mu? */
export function tuiBusy(chatId: string): boolean {
  return sessions.get(chatId)?.busy === true;
}

/** TUI kipi kullanılabilir mi (native sqlite yüklendi mi)? */
export function tuiUnavailableReason(cwd: string): string {
  const dbError = sessionDbLoadError();
  if (dbError) return mt("chatTui.sessionDbUnreadable", { detail: dbError });
  if (!resolveSessionDb(cwd)) return mt("chatTui.sessionDbMissing");
  return "";
}

interface TurnResult extends AxetChatSendResult {
  /**
   * Tur, axet-code tarafında KURTARILAMAZ bir arızaya düştüyse türü. Bunu
   * gören sarmalayıcı oturumu yeniliyor ve mesajı bir kez daha gönderiyor.
   */
  failure?: AxetFailureKind;
  /**
   * Tur, ajan soru sorduğu için bitirildi. Süreç TUI'de soru kutusunda ASILI
   * kaldığı için oturum bırakılmalı (bkz. `ASK_USER_TOOL`).
   */
  askedUser?: true;
}

// ---------------------------------------------------------------------------
// `ask_user` — soru kutusunu BİZİM arayüzden cevaplama
// ---------------------------------------------------------------------------
// Sorun (ölçüm 2026-09-05): ajan `ask_user` çağırınca TUI bir soru kutusu
// çizip cevabı bekliyor. Bizim sohbet kılıfı o kutuyu görmediği için tur beş
// dakikalık zaman aşımına kadar asılı kalıyordu — kullanıcı 105 saniye
// "Düşünüyor" görüp hiç cevap alamadı.
//
// KUTUNUN TUŞ DAVRANIŞI ÖLÇÜLDÜ (canlı pty, 2026-09-05):
//
//     ╭──────────────────────────────────────────╮
//     │  Dil                                     │  ← header
//     │  Hangi dili tercih edersin?              │  ← question
//     │  Türkçe                                  │  ← options[0]  (AÇILIŞTA SEÇİLİ)
//     │  İngilizce                               │  ← options[1]
//     │  Other                                   │  ← TUI'nin kendi eklediği satır
//     │    > Type a custom answer                │
//     │  ↑ previous • ↓ next • enter confirm •   │
//     │  esc dismiss                             │
//     ╰──────────────────────────────────────────╯
//
// Yani `i` numaralı seçeneği onaylamak = `i` kez `↓` + `enter`. İkinci ölçümde
// (1x aşağı + enter) TUI `✓ The user selected: "Mavi"` yazdı ve ajan AYNI TURDA
// devam etti. Oturum kapatılmıyor, geçmiş yeniden tohumlanmıyor, araç sonucu
// ajanın bağlamına normal yoldan giriyor — terminaldekiyle birebir aynı.
//
// İMLECİN AÇILIŞ SATIRI 0 olduğu için `↓` sayısı doğrudan dizin. Bu ÖLÇÜLMÜŞ
// bir varsayım: kutu bir sürümde son seçileni hatırlamaya başlarsa yanlış
// seçenek onaylanır.
//
// ÇOKLU SEÇİM (`multi_select: true`) DE ÖLÇÜLDÜ (canlı pty, 2026-09-05):
//
//     ╭──────────────────────────────────────────────────────────────╮
//     │  Agent Question                                              │
//     │ Hangi renkleri seversin?                                     │
//     │  [ ] Mavi                                                    │  ← options[0] (imleç burada)
//     │  [ ] Kirmizi                                                 │  ← options[1]
//     │  [ ] Yesil                                                   │  ← options[2]
//     │  Other                                                       │  ← dizin = options.length
//     │    > Type a custom answer                                    │
//     │ ↑ previous • ↓ next • space toggle • enter confirm •         │
//     │ esc dismiss                                                  │
//     ╰──────────────────────────────────────────────────────────────╯
//
// Geometri tek seçimliyle AYNI; tek fark satırların önündeki kutucuklar ve
// `space toggle` satırı. `space`, imlecin ÜSTÜNDEKİ satırı işaretliyor;
// `enter` işaretli olanların HEPSİNİ onaylıyor. Ölçümde `space, ↓, ↓, space,
// enter` dizisi TUI'ye `✓ The user selected: "Mavi", "Yesil"` yazdırdı ve ajan
// aynı turda devam etti — yani çoklu seçim de turu bölmüyor.
//
// Prompt tarafındaki not (axetChat.ts `ASK_FORMAT_HINT`) buradaki sınırı
// ajana önden söylüyor: en az iki seçenek ver. Yasak değil —
// "hiç sorma" yasağı 2026-09-05'te kaldırıldı, çünkü tuttuğu için bu kod hiç
// çalışmıyordu.
const ASK_USER_TOOL = "ask_user";

/** Kullanıcı seçene kadar en fazla beklenecek süre. */
const ASK_USER_WAIT_MS = 10 * 60_000;

interface AskUserRequest {
  callId: string;
  question: string;
  header: string;
  options: string[];
  multiSelect: boolean;
}

/** `ask_user` girdisini ayrıştırır; ayrıştırılamazsa `null`. */
function parseAskUser(callId: string, input: string | undefined): AskUserRequest | null {
  let parsed: { question?: unknown; header?: unknown; options?: unknown; multi_select?: unknown };
  try {
    parsed = JSON.parse(input ?? "") as typeof parsed;
  } catch {
    return null;
  }
  const options = Array.isArray(parsed.options)
    ? parsed.options
        .map((opt) => (typeof opt === "string" ? opt : (opt as { label?: unknown })?.label))
        .filter((label): label is string => typeof label === "string" && label.trim() !== "")
    : [];
  return {
    callId,
    question: typeof parsed.question === "string" ? parsed.question.trim() : "",
    header: typeof parsed.header === "string" ? parsed.header.trim() : "",
    options,
    multiSelect: parsed.multi_select === true
  };
}

/** Soruyu, cevaplanamadığında sohbete yazılacak düz metne çevirir. */
function askUserAsText(ask: AskUserRequest): string {
  const question = ask.question || mt("chatTui.askFallbackQuestion");
  return ask.options.length
    ? `${question}\n\n${ask.options.map((opt) => `- ${opt}`).join("\n")}`
    : question;
}

/**
 * Bekleyen soruyu cevaplar. Negatif ya da boş dizin = vazgeç (`esc`).
 *
 * `index` bir DİZİ olabiliyor: çoklu seçimli kutuda (`multi_select: true`)
 * kullanıcı birden fazla şık işaretleyebiliyor. Tek seçimlide dizinin yalnızca
 * ilk elemanı kullanılıyor — kutu zaten tek satır onaylıyor.
 *
 * `customText` doluysa şıklardan biri DEĞİL, kutunun kendi "Other" satırındaki
 * serbest metin alanı kullanılıyor; `index` o durumda yok sayılıyor.
 *
 * SERBEST METİN ÖLÇÜLDÜ (canlı pty, 2026-09-05, `.tmp-askprobe3`):
 *
 *     │  Mavi                      │  ← options[0]  (açılışta seçili)
 *     │  Kırmızı                   │  ← options[1]
 *     │  Other                     │  ← dizin = options.length
 *     │    > Type a custom answer  │  ← "Other" seçiliyken ODAKLI giriş alanı
 *
 * `↓` × options.length + doğrudan metin + `enter` → TUI şunu yazdı:
 *     ✓ The user typed a custom answer: "Yesil"
 * ve ajan aynı turda o cevapla devam etti.
 *
 * ÖNCE ENTER BASILMIYOR: alan "Other" satırına inildiği anda zaten odaklı.
 * Araya bir `enter` koymak BOŞ bir özel cevabı onaylar, ardından metnimiz ana
 * sohbet kutusuna yeni bir istem olarak düşerdi.
 *
 * SERBEST METİN ÇOKLU SEÇİMDE DE AYNI (ölçüm 2026-09-05, `axet-mscprobe`):
 * kutucuklu kutuda hiçbir şık işaretlemeden `↓` × options.length + metin +
 * `enter` → `✓ The user typed a custom answer: "Turuncu"`. "Other" satırında
 * `space` gerekmiyor; o satır kutucuklu değil, odaklanınca giriş alanı oluyor.
 *
 * Bekleyen soru YOKSA hiçbir tuş gönderilmiyor: geç gelen bir tıklama, kutu
 * kapandıktan sonra sohbet kutusuna `enter` basıp boş bir mesaj gönderirdi.
 */
export function answerTuiQuestion(
  chatId: string,
  index: number | number[],
  customText?: string
): boolean {
  const session = sessions.get(chatId);
  const ask = session?.pendingAsk;
  if (!session || !ask || session.exited || session.disposed) return false;
  // Kutu tek satırlık: satır sonu `enter` demek olurdu, yani cevabı yarıda
  // onaylamak. Boşluğa çeviriliyor.
  const custom = (customText ?? "").replace(/[\r\n]+/g, " ").trim();
  // Dizinler TEK BİR biçime indiriliyor: sıralı, tekrarsız, kutunun satır
  // sayısına kırpılmış. Sıra ŞART — imleç yalnızca aşağı yürütülüyor, yani
  // sırasız bir liste ikinci hedefi ıskalar ve yanlış satırı işaretlerdi.
  const wanted = (Array.isArray(index) ? index : [index]).filter((i) => Number.isInteger(i) && i >= 0);
  const targets = [...new Set(wanted.map((i) => Math.min(i, ask.options.length - 1)))].sort(
    (a, b) => a - b
  );
  session.pendingAsk = null;
  try {
    if (!targets.length && !custom) {
      session.proc.write("\x1b");
      console.log("[axetChatTui] sorudan vazgecildi", { chatId });
      return true;
    }
    if (custom) {
      for (let step = 0; step < ask.options.length; step += 1) session.proc.write("\x1b[B");
      session.proc.write(escapeTuiMenus(custom));
      session.proc.write("\r");
      console.log("[axetChatTui] soru serbest metinle cevaplandi", {
        chatId,
        satirIndirme: ask.options.length,
        uzunluk: custom.length
      });
      return true;
    }
    if (ask.multiSelect) {
      // İmleç 0. satırda başlıyor; her hedefe ARADAKİ FARK kadar iniliyor ve
      // orada `space` ile kutucuk işaretleniyor. Sonda tek bir `enter` işaretli
      // olanların hepsini birden onaylıyor (ölçüm: `✓ The user selected:
      // "Mavi", "Yesil"`).
      let cursor = 0;
      for (const target of targets) {
        for (let step = cursor; step < target; step += 1) session.proc.write("\x1b[B");
        cursor = target;
        session.proc.write(" ");
      }
      session.proc.write("\r");
      console.log("[axetChatTui] coklu soru cevaplandi", {
        chatId,
        dizinler: targets,
        secenekler: targets.map((i) => ask.options[i])
      });
      return true;
    }
    const target = targets[0];
    for (let step = 0; step < target; step += 1) session.proc.write("\x1b[B");
    session.proc.write("\r");
    console.log("[axetChatTui] soru cevaplandi", { chatId, dizin: target, secenek: ask.options[target] });
    return true;
  } catch {
    // Yazılamıyorsa süreç gitmiş demektir; tur zaten kendi yolundan bitecek.
    return false;
  }
}

/**
 * TEK bir turu yürütür: prompt'u yazar, cevabı veritabanından toplar.
 *
 * Yeniden başlatma kararını VERMİYOR — arızayı `failure` ile bildirip
 * `sendViaTui`'ye bırakıyor. Ayrım bilinçli: kurtarma kendini çağıran bir
 * döngüye dönüşmesin.
 */
async function runTurn(session: TuiSession, args: TuiSendArgs): Promise<TurnResult> {
  session.busy = true;
  session.cancelled = false;
  touch(session);
  args.onActivity({ phase: "thinking" });
  // Geçmiş sıfırlaması sürüyorsa BİTMESİNİ bekle: aradaki tuşlar paletin
  // filtre kutusuna gider ve istem hiç yola çıkmazdı (bkz. `resetting`).
  if (session.resetting) await session.resetting;

  try {
    // Veritabanı yolu her turun başında YENİDEN çözülüyor. Oturum kurulurken
    // doğru dosya henüz var olmayabiliyor (axet-code onu spawn'da yaratıyor) ve
    // o anda alınan karar oturum boyunca donuyordu. İki `existsSync`'lik bedel,
    // beş dakikalık sessiz bir zaman aşımından ucuz.
    const currentDb = resolveSessionDb(session.cwd);
    if (currentDb && currentDb !== session.dbPath) {
      console.log("[axetChatTui] oturum veritabani DEGISTI", {
        chatId: session.chatId,
        eski: session.dbPath,
        yeni: currentDb
      });
      session.dbPath = currentDb;
      // Eski kimlik ÖTEKİ veritabanına aitti; burada hiçbir şeye karşılık
      // gelmiyor ve tutulursa tur boş bir oturumu yoklardı.
      session.axetSessionId = null;
    }

    const sinceSec = Math.max(0, Math.min(latestMessageTime(session.dbPath), Math.floor(Date.now() / 1000)) - 2);

    // Zaman penceresi tek başına YETMİYOR. `created_at` saniye çözünürlüklü ve
    // pencereyi 2 saniye geriye alıyoruz (saat kayması payı) — aynı sohbetin
    // ÖNCEKİ turundan kalan asistan mesajı bu pencereye düşerse, o turun cevabı
    // bu turun başında yeniden akardı. Bu yüzden gönderimden ÖNCE var olan
    // mesajların kimlikleri işaretleniyor.
    const preexisting = new Set<string>(
      session.axetSessionId
        ? readMessagesSince(session.dbPath, session.axetSessionId, sinceSec).map((m) => m.id)
        : []
    );

    // Oturum yeni ya da yeniden kurulmuşsa geçmişi TAŞIYAN metni gönderiyoruz;
    // aksi hâlde oturum zaten hatırlıyor ve sadece mesajın kendisi yeterli.
    //
    // TEK İSTİSNA entegrasyon yönlendirmesi: o, oturumun İLK mesajındaki önsözde
    // duruyor (bkz. axetChat.ts `buildPrompt`) ve iki durumda oraya hiç
    // giremiyor — (1) oturum, bozuk entegrasyon henüz ÖĞRENİLMEDEN önce
    // açılmışsa, (2) uzun bir oturumda ilk mesaj bağlamın gerisinde kalmışsa.
    // İkisi de gerçek: yönlendirme ancak bir tur bedeli ödendikten sonra
    // öğreniliyor, yani onu öğreten oturum onu hiç görmüyordu. Bu yüzden sonraki
    // her mesajın başına da ekleniyor; boşsa (bilinen bozuk kayıt yok) hiçbir
    // şey eklenmiyor.
    // Yönlendirmeyi kurmadan ÖNCE, hangi kayıtların hâlâ var olduğu günlükten
    // okunuyor. Kullanıcı portalden bir kaydı sildiğinde bunu öğrenebildiğimiz
    // tek yer orası — ve öğrenmezsek prompt'a var olmayan bir aracın kimliğini
    // yazabiliyorduk (bkz. axetCodeLog.readLiveConnectors).
    if (args.useConnectors) noteLiveConnectors(readLiveConnectors(session.cwd));
    const guidance = args.useConnectors ? connectorGuidance() : "";
    const text = session.seeded
      ? `${guidance}${args.message}`
      : args.history.length > 0
        ? args.buildSeedPrompt(args.history, args.message)
        : args.buildFirstPrompt(args.message);

    // axet-code'un kendi günlüğündeki imleç, YAZMADAN ÖNCE alınıyor: sağlayıcı
    // hatası prompt'un ardından saniyeler içinde düşüyor ve imleci sonra almak
    // o satırı kaçırma ihtimali demek.
    let logCursor = logOffset(session.cwd);

    // TUI'de Enter (\r) gönderir, ctrl+j (\n) satır atlar — yani metindeki
    // satır sonlarını olduğu gibi yazabiliyoruz, sonuna tek \r koymak yeterli.
    const wire = escapeTuiMenus(text.replace(/\r/g, ""));
    session.proc.write(`${wire}\r`);
    // Yazmanın KENDİSİ günlüğe düşüyor. 2026-09-07'de bir mesaj (ME22N metni)
    // ne veritabanına ne de axet-code'un günlüğüne ulaştı; geriye dönük hiçbir
    // kayıt "yazıldı mı, yazılmadı mı" sorusunu cevaplayamadı. Bu satır o
    // soruyu bir daha açık bırakmıyor: tur sessizce zaman aşımına uğrarsa,
    // günlükte ya bu satır vardır (metin pty'ye gitti, sorun karşı tarafta)
    // ya da yoktur (bu koda hiç gelinmedi).
    console.log("[axetChatTui] mesaj yazildi", {
      chatId: session.chatId,
      karakter: wire.length,
      satir: wire.split("\n").length,
      tohumlanmis: session.seeded,
      // Bağlıysa geçmiş TELE HİÇ ÇIKMIYOR — "karakter" alanının neden küçük
      // olduğunu açıklayan tek satır bu.
      bagli: session.attached,
      baglayici: args.useConnectors
    });
    session.seeded = true;

    // İğne, GÖNDERDİĞİMİZ metinden çıkarılıyor (kullanıcının ham mesajından
    // değil): tohumlama turunda veritabanına düşen metin önsözle birlikte olan
    // metindir, ve "selam" gibi çok kısa bir mesaj iğne olarak ayırt edici
    // değildir.
    const needle = promptNeedle(text);
    const started = Date.now();
    /** Yazma anı, veritabanının birimiyle (Unix SANİYE) ve iki saniye payla. */
    const sentAtSec = Math.floor(started / 1000) - 2;
    // `let`: her belirtide ileri itiliyor (bkz. `alive`) ve soru kutusu
    // açıkken de (bkz. `ASK_USER_TOOL`).
    let deadline = started + TURN_TIMEOUT_MS;
    /** Turun mutlak sonu; sessizlik sayacı ne kadar tazelenirse tazelensin. */
    const hardCap = started + TURN_HARD_CAP_MS;
    /**
     * Kesintisiz sessizlik ne kadar sürdü — yalnızca kullanıcıya söylemek için.
     * Belirti geldiği an sıfırlanıyor (bkz. `alive`).
     */
    let stalledFor = 0;
    /** "axet-code çalışıyor" işareti: sessizlik sayacını sıfırlar. */
    const alive = () => {
      deadline = Date.now() + TURN_TIMEOUT_MS;
      // Sessizlik bitti: uyarı satırı kalksın. Koşul şart — `alive` her
      // günlük satırında ve her metin parçasında çağrılıyor, koşulsuz emit
      // saniyede onlarca gereksiz olay demek olurdu.
      if (stalledFor) {
        stalledFor = 0;
        args.onActivity({ phase: "thinking" });
      }
    };
    /** Soru kutusu açıkken kullanıcının cevabı için tavan; kapalıyken `0`. */
    let askDeadline = 0;
    const emitted = new Map<string, number>();
    // Araç çağrıları çağrı KİMLİĞİYLE tekilleniyor. Ad yetmiyor: yoklama her
    // seferinde aynı mesajları yeniden okuyor, ve arka arkaya gelen iki farklı
    // `bash` çağrısı da meşru — canlı denemede (2026-09-04) ad karşılaştırması
    // saniyede dört kez aynı aracı bildirdi.
    const seenTools = new Set<string>();
    // Sonuçlar da tekilleniyor: yoklama aynı `tool` mesajını tekrar tekrar
    // okuyor ve aynı sonuç satırı arayüzde çoğalırdı.
    const seenResults = new Set<string>();
    let toolCount = 0;
    let answer = "";
    /**
     * Turun ZAMAN ÇİZELGESİ. Yavaşlık şikâyetinde "bizden mi, axet-code'dan
     * mı" sorusunu tahminle değil ölçümle ayırmak için: `ilkBelirti` ile
     * `ilkHarf` arasındaki süre KARŞI TARAFIN düşünme süresi (pty'ye yazdık,
     * o an itibarıyla topu biz tutmuyoruz), ondan sonrası ise akıtma ritmi.
     * Yoklamanın kendi maliyeti ölçüldü: 50 mesajlık / 208 KB'lık bir turda
     * yoklama başına 1,5 ms, yani saniyede %1,6 CPU — burada aranacak bir şey
     * yok (2026-09-07 ölçümü).
     */
    let firstSignalAt = 0;
    let firstCharAt = 0;
    // Gönderdiğimiz prompt oturuma DÜŞENE kadar hiçbir asistan mesajı bu tura
    // ait sayılmıyor. Tek başına "yeni mesaj" ölçütü yetmiyordu: yanlış bir
    // oturuma bağlanıldığında oradaki her mesaj "yeni" görünüyor ve turun
    // cevabı diye akıyordu (2026-09-04).
    let promptLanded = false;
    /**
     * İstem oturuma DÜŞTÜĞÜ an. Turun asıl başlangıcı bu; bundan öncesi
     * bizim kılıfımızın (pty'ye yazma, menü kaçışı, oturumun veritabanında
     * belirmesi), sonrası karşı tarafın payı.
     *
     * Ölçmeden ayrılamıyordu ve bu tam olarak yanlış yere bakmaya yol açtı
     * (2026-09-07): "ilk tur 100 sn" şikâyetinde axet-code'un kendi
     * veritabanı ilk turları 3-9 saniyede bitmiş gösteriyor — yani süre
     * turun İÇİNDE değil, öncesinde geçiyor. Bu sayı olmadan "önce" ile
     * "içeri" ayırt edilemiyor.
     */
    let promptLandedAt = 0;
    // Plan/bağlam yoklaması: `0` = ilk turda hemen bir kez okunsun.
    let lastProgressAt = 0;
    let lastProgressKey = "";

    for (;;) {
      if (session.disposed || session.cancelled) return { ok: false, text: answer, cancelled: true };
      if (session.exited) {
        return { ok: false, text: answer, error: mt("chatTui.sessionClosedUnexpectedly") };
      }

      // --- Arka planda arıza denetimi ---------------------------------------
      // Sağlayıcı hatası veritabanına HİÇ yazılmıyor (ölçüm: axetCodeLog.ts
      // başlığı). Bu denetim olmadan 403 ya da bağlam taşması, bekleyecek bir
      // asistan mesajı olmadığı için beş dakikalık zaman aşımına dönüşüyordu.
      {
        const read = readLogSince(session.cwd, logCursor);
        logCursor = read.offset;
        // Günlüğe satır düşmesi, arızalı olsun olmasın, "süreç çalışıyor"
        // demek: sessizlik sayacı sıfırlanıyor.
        if (read.lines.length > 0) alive();
        for (const line of read.lines) {
          // Aynı çalışma dizininde birden fazla sohbet olabilir; satır bir
          // oturum adı taşıyorsa BAŞKASININ arızasını üstlenmiyoruz. Adsız
          // satırlar (taşıma katmanı hataları) tur penceresine güveniyor.
          if (line.sessionId && session.axetSessionId && line.sessionId !== session.axetSessionId) continue;
          const kind = classifyFailure(line);
          if (!kind) continue;
          console.log("[axetChatTui] tur arizasi", {
            chatId: session.chatId,
            tur: kind,
            seviye: line.level,
            mesaj: line.msg,
            hata: line.error.slice(0, 200)
          });
          return { ok: false, text: answer, failure: kind };
        }
      }

      // --- Soru kutusu açık mı ----------------------------------------------
      // Açıkken tur zaman aşımı İŞLEMEMELİ: bekleyen taraf ajan değil,
      // kullanıcı. Beş dakika bir makine için uzun, bir insan için kısa.
      if (session.pendingAsk) {
        if (Date.now() > askDeadline) {
          const question = askUserAsText(session.pendingAsk);
          session.pendingAsk = null;
          console.log("[axetChatTui] soruya cevap gelmedi, tur soruyla bitiriliyor", {
            chatId: session.chatId,
            dakika: ASK_USER_WAIT_MS / 60_000
          });
          const gap = answer ? "\n\n" : "";
          args.onChunk(gap + question);
          return {
            ok: true,
            text: (answer + gap + question).trim(),
            usedConnectors: session.useConnectors,
            askedUser: true
          };
        }
        alive();
      } else if (askDeadline) {
        // Cevap verildi (ya da vazgeçildi): gösterge yeniden "düşünüyor".
        askDeadline = 0;
        args.onActivity({ phase: "thinking" });
      }

      // Soru kutusu açıkken mutlak tavan İŞLEMEZ: bekleyen taraf insan.
      const capped = !session.pendingAsk && Date.now() > hardCap;
      if (capped) {
        // Zaman aşımının SEBEBİ log'a düşüyor. Sessiz kalırsa "cevap gelmedi"
        // ile "yanlış oturumu dinledik" ayırt edilemez — 2026-09-04'te tam da
        // bu ikisi karıştı ve teşhis veritabanını elle okumayı gerektirdi.
        // `veritabani` da yazılıyor: 2026-09-07'de tur, ata klasördeki bayat
        // bir veritabanını yokladığı için doldu (bkz. resolveSessionDb).
        console.log("[axetChatTui] tur mutlak tavana carpti", {
          chatId: session.chatId,
          saat: ((Date.now() - started) / 3_600_000).toFixed(1),
          oturum: session.axetSessionId?.slice(0, 8) ?? "bulunamadi",
          veritabani: session.dbPath,
          promptDustu: promptLanded,
          arac: toolCount,
          metinUzunlugu: answer.length
        });
        return {
          ok: false,
          text: answer,
          error: mt("chatTui.turnRanTooLong", {
            hours: String(Math.round(TURN_HARD_CAP_MS / 3_600_000))
          })
        };
      }

      // --- Sessizlik: TURU BİTİRMEZ, yalnızca haber verir -------------------
      // 2026-09-07, kullanıcı ölçümü. Soğuk bir ilk turda axet-code 320 saniye
      // boyunca ne veritabanına ne günlüğüne tek satır yazmadı; sessizlik
      // sayacı 300'de doldu ve tur `ok: false` ile kapandı. Cevap 20 SANİYE
      // SONRA geldi — 1.839 karakter, eksiksiz, axet-code'un veritabanında
      // duruyordu. Kullanıcı terminalden `ctrl+s` ile aynı oturumu açıp cevabı
      // gözüyle gördü; uygulama ise "hiçbir belirti vermedi" diyordu.
      //
      // Yani sayaç iki şeyi birden yaptı ve ikisinde de yanıldı: ÜRETİLMİŞ bir
      // cevabı çöpe attı (veri kaybı) ve olmayan bir arızayı bildirdi (yanlış
      // bilgi). İkisi de kullanıcının öncelik sırasının en tepesinde.
      //
      // Sessizliğin turu bitirmesi için hiçbir sebep yok: turun gerçekten bir
      // sonu olsun diye zaten MUTLAK TAVAN var (yukarıda), süreç ölürse
      // `session.exited` yakalıyor, sağlayıcı arızası günlükten okunuyor
      // (`classifyFailure`), kullanıcı da istediği an durdurabiliyor. Geriye
      // kalan tek durum "süreç yaşıyor ama uzun süredir sessiz" — ki bu bir
      // arıza değil, ölçülmüş normal davranış.
      //
      // Dolayısıyla sayaç artık yalnızca UYARIYOR. Uyarı tekrarlanıyor
      // (sıfırlanan `deadline` sayesinde): kullanıcı beklemenin sürdüğünü
      // görsün, durdurmak isterse durdursun.
      if (Date.now() > deadline) {
        deadline = Date.now() + TURN_TIMEOUT_MS;
        stalledFor += TURN_TIMEOUT_MS;
        console.log("[axetChatTui] tur sessiz, beklemeye devam", {
          chatId: session.chatId,
          saniye: ((Date.now() - started) / 1000).toFixed(1),
          oturum: session.axetSessionId?.slice(0, 8) ?? "bulunamadi",
          veritabani: session.dbPath,
          promptDustu: promptLanded,
          arac: toolCount,
          metinUzunlugu: answer.length
        });
        args.onActivity({
          phase: "stalled",
          minutes: Math.round(stalledFor / 60_000)
        });
      }

      if (!session.axetSessionId) {
        // ALT SINIR `spawnedAt`, `sinceSec` DEĞİL. `sinceSec` veritabanındaki
        // son mesaja bakıyor ve o mesaj pekâlâ BİZDEN ÖNCEKİ bir sohbete ait
        // olabilir; o pencereyle "en yeni oturum" yedeği başka bir sohbetin
        // oturumunu döndürüp turu onun cevabıyla bitiriyordu.
        session.axetSessionId =
          findSessionByPrompt(session.dbPath, session.spawnedAt, needle) ??
          newestSessionSince(session.dbPath, session.spawnedAt);
      }

      if (session.axetSessionId) {
        const messages = readMessagesSince(session.dbPath, session.axetSessionId, sinceSec);
        // Araç SONUÇLARINDAN entegrasyon sağlığını öğren (bkz.
        // connectorHealth.ts). `promptLanded` kapısının DIŞINDA, çünkü bu
        // bilgi tura değil hesaba ait — hangi turda görüldüğü önemli değil.
        if (session.useConnectors) learnConnectorHealth(messages);
        if (!promptLanded) {
          promptLanded = messages.some(
            (m) =>
              m.role === "user" &&
              !preexisting.has(m.id) &&
              // İki taraf da `matchKey`'den geçiyor — bkz. promptNeedle.
              matchKey(
                m.parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.data?.text ?? "")
                  .join("")
              ).includes(needle)
          );
          if (promptLanded) promptLandedAt = Date.now();
          // GÜVENLİK AĞI. İğne eşleşmesi metnin bozulmadan veritabanına
          // inmesine dayanıyor ve bu varsayım 2026-09-04'te ÇÖKTÜ: pty'ye
          // yazdığımız `—` ve `→` yolda düştü, iğne hiç tutmadı ve cevap
          // 189 saniyedir hazır beklerken tur beş dakikalık zaman aşımına
          // gitti. `matchKey` o ölçülen kaybı kapatıyor, ama bir dahaki
          // sefere düşen başka bir karakter olacaksa bedeli yine kullanıcı
          // ödemesin.
          //
          // Gecikmeden SONRA ölçüt gevşiyor: bu oturuma bizim yazmamızdan
          // sonra düşen ve önceden var olmayan bir KULLANICI mesajı varsa o
          // bizimdir — pty'ye yazan tek el biziz. Kapı hâlâ kapalı kalıyor
          // (yanlış oturuma bağlanma senaryosu için) çünkü ölçüt "yeni bir
          // mesaj" değil, "yeni bir kullanıcı mesajı".
          if (!promptLanded && Date.now() - started > LAND_GRACE_MS) {
            const mine = messages.find(
              (m) => m.role === "user" && !preexisting.has(m.id) && m.createdAt >= sentAtSec
            );
            if (mine) {
              promptLanded = true;
              promptLandedAt = Date.now();
              console.log("[axetChatTui] igne tutmadi, yeni kullanici mesaji kabul edildi", {
                chatId: session.chatId,
                oturum: session.axetSessionId?.slice(0, 8),
                igne: needle.slice(0, 40)
              });
            }
          }
        }
        const assistants = promptLanded
          ? messages.filter((m) => m.role === "assistant" && !preexisting.has(m.id))
          : [];
        for (const message of assistants) {
          const body = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.data?.text ?? "")
            .join("");
          const already = emitted.get(message.id) ?? 0;
          if (body.length > already) {
            if (!firstCharAt) firstCharAt = Date.now();
            if (!firstSignalAt) firstSignalAt = firstCharAt;
            args.onChunk(body.slice(already));
            emitted.set(message.id, body.length);
            answer += body.slice(already);
            alive();
          }
          for (const part of message.parts) {
            if (part.type !== "tool_call") continue;
            const name = normalizeToolName(part.data?.name ?? "");
            const callId = part.data?.id ?? `${message.id}:${name}`;
            if (!name || seenTools.has(callId)) continue;
            // Soru kutusu: araç satırı olarak GÖSTERİLMİYOR — kullanıcının
            // göreceği şey bir araç adı değil, sorunun kendisi.
            if (name === ASK_USER_TOOL) {
              const ask = parseAskUser(callId, part.data?.input);
              // Tek seçenekli ya da seçeneksiz bir soruya basacak düğme yok:
              // eski yol, turu soruyla bitir, kullanıcı cevabını yazsın.
              // ÇOKLU SEÇİM ARTIK BURAYA DÜŞMÜYOR — kutucuklu kutu 2026-09-05'te
              // ölçüldü ve cevaplanabiliyor (bkz. `ASK_USER_TOOL` çizimi).
              const usable = ask !== null && ask.options.length >= 2;
              if (!usable) {
                // ÖNCE BİTMESİNİ BEKLE. Argümanlar veritabanına AKARAK
                // yazılıyor, yani ilk gördüğümüz hâlde `input` yarım bir JSON
                // metni olabiliyor (`{"question": "Sevdi`). Ölçüm (2026-09-05,
                // kullanıcı testi): çağrı seçenekleriyle birlikte doğru
                // yapıldığı hâlde ayrıştırma patladı ve kullanıcı düğme yerine
                // "Devam etmek için bir tercihine ihtiyacım var." gördü.
                //
                // `seenTools`'a EKLEMEDEN geçiyoruz ki sonraki yoklama tam
                // hâlini okusun. Bekleme yalnızca BURADA: girdi zaten
                // ayrıştırılabiliyorsa `finished` beklenmiyor — o bayrak hiç
                // yazılmazsa soru sonsuza dek gizli kalırdı.
                if (part.data?.finished !== true) continue;
                seenTools.add(callId);
                const question = ask ? askUserAsText(ask) : mt("chatTui.askFallbackQuestion");
                console.log("[axetChatTui] soru cevaplanamiyor, tur soruyla bitiriliyor", {
                  chatId: session.chatId,
                  sebep: !ask ? "ayristirilamadi" : "secenek-yok",
                  girdi: (part.data?.input ?? "").slice(0, 300)
                });
                const gap = answer ? "\n\n" : "";
                args.onChunk(gap + question);
                return {
                  ok: true,
                  text: (answer + gap + question).trim(),
                  usedConnectors: session.useConnectors,
                  askedUser: true
                };
              }
              // `usable` doğruyken `ask` dolu; derleyici bunu bilemiyor.
              if (!ask) continue;
              seenTools.add(callId);
              session.pendingAsk = ask;
              askDeadline = Date.now() + ASK_USER_WAIT_MS;
              console.log("[axetChatTui] ajan soru sordu, cevap bekleniyor", {
                chatId: session.chatId,
                secenek: ask.options.length,
                coklu: ask.multiSelect
              });
              args.onActivity({
                phase: "askUser",
                callId,
                question: ask.question,
                ...(ask.header ? { header: ask.header } : {}),
                options: ask.options,
                // Arayüz kartı buna göre kutucuklu çiziliyor: çoklu seçimde tek
                // tıkla göndermek, ajanın istediği "birden fazla" cevabı
                // kullanıcının elinden almak olurdu.
                ...(ask.multiSelect ? { multiSelect: true } : {})
              });
              continue;
            }
            seenTools.add(callId);
            toolCount += 1;
            if (!firstSignalAt) firstSignalAt = Date.now();
            alive();
            const diff = buildDiff(name, part.data?.input);
            args.onActivity({
              phase: "tool",
              callId,
              tool: name,
              target: summarizeToolInput(part.data?.input),
              // Yalnızca düzenleme araçlarında dolu; diğerlerinde alan hiç
              // gönderilmiyor ki geçmiş dosyasına boş dizeler yazılmasın.
              ...(diff ? { diff } : {})
            });
          }
        }
        // Araç SONUÇLARI. Çağrılarla aynı döngüde olamazlar: sonuç ayrı bir
        // `tool` rolündeki mesajda ve genellikle SONRAKİ yoklamada geliyor.
        // `promptLanded` kapısı burada da geçerli — yanlış bir oturuma
        // bağlanıldığında oradaki sonuçları bu turun altına yazmayalım.
        if (promptLanded) {
          for (const message of messages) {
            if (message.role !== "tool" || preexisting.has(message.id)) continue;
            for (const part of message.parts) {
              if (part.type !== "tool_result") continue;
              const callId = part.data?.tool_call_id ?? "";
              // Çağrısını görmediğimiz bir sonuç gösterilmiyor: bağlanacağı
              // bir satır yok, tek başına da anlamsız.
              if (!callId || !seenTools.has(callId) || seenResults.has(callId)) continue;
              seenResults.add(callId);
              alive();
              const summary = summarizeToolResult(part.data?.content, part.data?.is_error);
              args.onActivity({ phase: "toolResult", callId, ...summary });
            }
          }
        }
        // --- Plan + bağlam doluluğu -------------------------------------
        // Yoklama 90 ms'de bir dönüyor; bu iki sorgu o ritimde gereksiz.
        // Saniyede bir okunuyor ve DEĞİŞMEDİYSE hiç gönderilmiyor: aksi
        // hâlde her saniye renderer'a aynı nesne düşer ve React'te durup
        // dururken yeniden çizim olurdu.
        if (Date.now() - lastProgressAt >= PROGRESS_MS) {
          lastProgressAt = Date.now();
          const progress: AxetChatProgress = {
            todos: sessionTodos(session.dbPath, session.axetSessionId),
            contextTokens: sessionTokens(session.dbPath, session.axetSessionId),
            contextLimit: CONTEXT_LIMIT_TOKENS
          };
          const key = JSON.stringify(progress);
          if (key !== lastProgressKey) {
            lastProgressKey = key;
            args.onProgress(progress);
          }
        }
        // Turun bittiğine SON asistan mesajından karar veriliyor.
        //
        // Bitiş sebebi `"stop"` DEĞİL: canlı ölçümde (2026-09-04) araç
        // zincirindeki ara mesajlar `tool_use`, kapanış mesajı ise `end_turn`
        // ile bitiyor. `"stop"` yalnızca tool_result kayıtlarında görülüyor —
        // ona bakan ilk sürüm cevabı aldığı hâlde beklemeye devam etti ve tur
        // zaman aşımına düştü. Bu yüzden kural sebebi SAYMAK değil, `tool_use`
        // DIŞINDA bir sebep görmek: `max_tokens`/`error` gibi ileride eklenecek
        // sebepler de doğru şekilde "bitti" sayılır.
        const lastFinish = assistants.length
          ? assistants[assistants.length - 1].parts.find((part) => part.type === "finish")
          : undefined;
        const reason = lastFinish?.data?.reason;
        if (reason && reason !== "tool_use") {
          args.onActivity({ phase: "finishing" });
          // Yavaşlık şikâyeti ölçülebilir olsun diye: her turun süresi ve kaç
          // araç çalıştığı log'a düşüyor.
          console.log("[axetChatTui] tur bitti", {
            chatId: session.chatId,
            saniye: ((Date.now() - started) / 1000).toFixed(1),
            // Turun asıl başlangıcı. Bundan öncesi BİZİM payımız (pty'ye
            // yazma, menü kaçışı, oturumun veritabanında belirmesi); bu
            // sayı büyükse hızlandırılacak yer kılıf, model değil.
            istemIndi: promptLandedAt ? ((promptLandedAt - started) / 1000).toFixed(1) : "-",
            // Yazmadan ilk belirtiye (araç ya da harf) ve ilk harfe kadar
            // geçen süre: ikisi de KARŞI TARAFIN düşünme payı.
            ilkBelirti: firstSignalAt ? ((firstSignalAt - started) / 1000).toFixed(1) : "-",
            ilkHarf: firstCharAt ? ((firstCharAt - started) / 1000).toFixed(1) : "-",
            arac: toolCount,
            // Oturumun GERÇEK durumu; istenen değil (bkz. yapışkan bağlayıcı
            // kuralı, ensureSession).
            baglayici: session.useConnectors,
            oturum: session.axetSessionId?.slice(0, 8) ?? "?"
          });
          return { ok: true, text: answer.trim(), usedConnectors: session.useConnectors };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } finally {
    session.busy = false;
    touch(session);
  }
}

// ---------------------------------------------------------------------------
// Kurtarma: arızada oturumu yenile, mesajı bir kez daha gönder
// ---------------------------------------------------------------------------
// İSTEK (2026-09-05): *"axet.code da bazen 403 hatası gibi hatalar oluşuyor ya
// da 1 milyon token sınırı aşılınca aynı sessionda devam edilmiyor, eğer arka
// planda 403 hatasıyla karşılaşırsa bilgi verilip tekrardan başlatılsın ve
// devam etsin, 1 milyon token sınırı kontrolü de aynı şekilde arka planda
// yapılsın."*
//
// İki arıza da AYNI ilaçla geçiyor, çünkü ikisi de sürecin kendisine yapışık:
// 403'te taşıyıcının kimliği düşmüş, bağlam taşmasında pencere dolmuş. Yeni bir
// axet-code süreci ikisini de sıfırlıyor.
//
// GEÇMİŞ KAYBOLMUYOR: yeni oturumun `seeded` bayrağı false olduğu için sonraki
// gönderim `buildSeedPrompt(history, message)` kullanıyor, yani sohbetin
// tamamı yeni oturuma taşınıyor. "Devam etsin" isteği tam olarak bunun
// üzerinde duruyor.
//
// BİR KEZ deneniyor. Arıza kalıcıysa (portal gerçekten 403 veriyorsa) ikinci,
// üçüncü deneme kullanıcıya bir şey kazandırmaz; her biri açılış bedelini
// (~3 s) yeniden ödetir ve hatayı geciktirir.

/** Bağlam penceresi — 1 milyon jeton. */
const CONTEXT_LIMIT_TOKENS = 1_000_000;
/**
 * Hangi doluluktan sonra oturum ÖNCEDEN yenilensin.
 *
 * Sınıra çarpmayı beklemek pahalı: çarptığında o turun tamamı boşa gidiyor.
 * %80'de yenilemek, bir sonraki turun sığacağından emin olmayı sağlıyor —
 * bağlayıcılar açıkken tek bir turun kendisi bile ~153.000 jeton (ölçüm:
 * axetSessionDb.ts `sessionTokens`), yani kalan %20 rahat bir pay.
 */
const CONTEXT_ROTATE_AT = Math.floor(CONTEXT_LIMIT_TOKENS * 0.8);

async function restartSession(args: TuiSendArgs): Promise<TuiSession | null> {
  disposeSession(args.chatId);
  // BAĞ ÖNCE SİLİNİYOR, yoksa yenileme hiçbir işe yaramaz: `ensureSession`
  // el sıkışmadan sonra bağa bakıp KAÇMAYA ÇALIŞTIĞIMIZ oturuma geri
  // bağlanırdı. Bu yolun iki müşterisi de tam olarak o oturumdan kurtulmak
  // için buraya geliyor — 403'te taşıyıcının kimliği o oturuma yapışmış,
  // bağlam taşmasında pencere o oturumda dolmuş.
  //
  // GEÇMİŞ KAYBOLMUYOR: bağsız kurulan oturumun `seeded` bayrağı false, yani
  // sonraki gönderim `buildSeedPrompt(history, message)` ile sohbetin
  // tamamını yeni oturuma taşıyor. Yeni oturum ilk başarılı turdan sonra
  // yeniden bağlanıyor (bkz. `bindSessionToChat`), yani yapıştırma bedeli
  // sohbet başına değil, ARIZA başına bir kez ödeniyor.
  clearBinding(args.chatId);
  return ensureSession(args.chatId, args.cwd, args.model, args.useConnectors);
}

export async function sendViaTui(args: TuiSendArgs): Promise<AxetChatSendResult | null> {
  // Oturum HAZIR MI, yoksa bu mesaj el sıkışmanın bedelini mi ödüyor? Fark
  // kullanıcı için saniyeler: hazır oturumda 0 ms, sıfırdan kurulan bir
  // oturumda bağlayıcı beklemesi tek başına 15 saniyeye kadar çıkabiliyor.
  // Ölçülmeden "yavaş" şikâyeti hangi katmana ait bilinemiyor.
  const warm = sessions.has(args.chatId);
  const ensureStarted = Date.now();
  let session = await ensureSession(args.chatId, args.cwd, args.model, args.useConnectors);
  const ensureMs = Date.now() - ensureStarted;
  if (ensureMs > 250 || !warm) {
    console.log("[axetChatTui] oturum hazirligi", {
      chatId: args.chatId,
      sicak: warm,
      saniye: (ensureMs / 1000).toFixed(1)
    });
  }
  if (!session) {
    // Zorunlu güncelleme engeli: `null` dönmek `run` kipine düşürürdü ve o da
    // aynı kutuya çarpıp sessizce zaman aşımına uğrardı. Sebep biliniyorken
    // kullanıcıyı beş dakika bekletmenin anlamı yok.
    const blocked = axetUpdateBlock();
    if (blocked) {
      return {
        ok: false,
        text: "",
        error: blocked.latest
          ? mt("chatTui.updateRequiredVersions", { installed: blocked.installed || "?", latest: blocked.latest })
          : mt("chatTui.updateRequired"),
        usedConnectors: args.useConnectors
      };
    }
    return null;
  }
  if (session.busy) return null;

  args.onActivity({ phase: "thinking" });

  // --- Jeton sınırı denetimi, turdan ÖNCE --------------------------------
  // Ölçüm bir SQL satırı: canlı veritabanında 0 ms. Sınıra çarpıp turu çöpe
  // atmaktansa, dolmuş bir oturumu daha başlamadan değiştiriyoruz.
  let rotated: TurnResult["failure"] | undefined;
  if (session.axetSessionId) {
    const tokens = sessionTokens(session.dbPath, session.axetSessionId);
    if (tokens >= CONTEXT_ROTATE_AT) {
      console.log("[axetChatTui] baglam doldu, oturum yenileniyor", {
        chatId: args.chatId,
        jeton: tokens,
        esik: CONTEXT_ROTATE_AT
      });
      args.onActivity({ phase: "restarting" });
      const fresh = await restartSession(args);
      if (fresh) {
        session = fresh;
        rotated = "context";
      }
    }
  }

  const first = await runTurn(session, args);
  // Süreç soru kutusunda asılı: bir sonraki mesaj oraya yazılamaz, oturum
  // bırakılıyor. Geçmiş kaybolmuyor — yeni oturum `buildSeedPrompt` ile
  // tohumlanıyor (bkz. `ASK_USER_TOOL` notu).
  if (first.askedUser) disposeSession(args.chatId);
  if (!first.failure) {
    // Bağ, İLK BAŞARILI TURDAN sonra kuruluyor. Daha erken kurmanın yolu yok
    // (oturum kimliği ancak istem düştükten sonra biliniyor), daha geç
    // kurmanın da anlamı: bir sonraki açılışta bağlanacak bir şey olmazdı.
    bindSessionToChat(session);
    return rotated ? { ...first, restartedReason: rotated } : first;
  }

  // --- Arıza: bilgi ver, oturumu yenile, bir kez daha dene ------------------
  args.onActivity({ phase: "restarting" });
  const fresh = await restartSession(args);
  if (!fresh) {
    // Yeni oturum da kurulamadı: `null` dönerek çağıranın `run` kipine
    // düşmesini sağlıyoruz — sessiz bir başarısızlıktan iyidir.
    console.log("[axetChatTui] ariza sonrasi oturum kurulamadi", { chatId: args.chatId, tur: first.failure });
    return null;
  }
  console.log("[axetChatTui] oturum yenilendi, mesaj tekrar gonderiliyor", {
    chatId: args.chatId,
    tur: first.failure
  });
  const second = await runTurn(fresh, args);
  if (second.askedUser) disposeSession(args.chatId);
  // İkinci denemenin de arızalanması, arızanın kalıcı olduğunu söylüyor.
  // Kullanıcıya "cevap gelmedi" demek, sonsuza kadar denemekten dürüsttür.
  if (second.failure) {
    return {
      ok: false,
      text: second.text,
      error: mt("chatTui.restartStillFailing", { failure: second.failure }),
      restartedReason: first.failure
    };
  }
  bindSessionToChat(fresh);
  return { ...second, restartedReason: first.failure };
}

/**
 * Süren turun axet-code tarafındaki BİTİŞ SEBEBİ — henüz bitmediyse `null`.
 *
 * `finish` parçası turun sonunda yazılıyor ve sebebini söylüyor:
 * `end_turn` (kendiliğinden bitti) / `canceled` (esc tuttu). İptalin gerçekten
 * tutup tutmadığını başka hiçbir yerden öğrenemiyoruz — pty çıktısı okunabilir
 * değil, kendi durumumuz ise yalnızca BİZİM ne yaptığımızı biliyor.
 *
 * Mesajın KİMLİĞİ de dönüyor, çünkü "son asistan mesajı" her zaman bu tura ait
 * değil: kullanıcı gönderdikten hemen sonra durdurursa bu turun satırı
 * veritabanında henüz açılmamış olabiliyor ve elde kalan, BİR ÖNCEKİ turun
 * `end_turn`'ü oluyor. Kimlik karşılaştırılmadan o bayat sebep, "durduramadım"
 * diye yanlış bir uyarıya dönüşürdü (bkz. `cancelTui`).
 */
function turnFinishReason(session: TuiSession): { messageId: string; reason: string | null } | null {
  if (!session.axetSessionId) return null;
  try {
    const since = Math.floor(Date.now() / 1000) - 180;
    const msgs = readMessagesSince(session.dbPath, session.axetSessionId, since).filter(
      (m) => m.role === "assistant"
    );
    const last = msgs[msgs.length - 1];
    if (!last) return null;
    for (const part of last.parts) {
      if (part.type === "finish") return { messageId: last.id, reason: part.data?.reason ?? "bilinmiyor" };
    }
    return { messageId: last.id, reason: null };
  } catch {
    return null;
  }
}

/**
 * Süren turu iptal eder — TUI'de esc "cancel".
 *
 * TEK BİR ESC GÜVENİLİR DEĞİL (ölçüm 2026-09-05): kullanıcının 16:40 turunda
 * esc yazıldı, arayüz durdu, ama axet-code kendi veritabanına
 * `finish {"reason":"end_turn"}` yazıp sonuna kadar üretti — 3084 karakter,
 * 1913 tamamlama jetonu, bunun ~%69'u iptalden SONRA üretilip çöpe gitti.
 * Aynı tuş, ayrı bir pty sondasında turun erken bir anında gönderildiğinde
 * `reason: "canceled"` yazdırdı. Yani tuş doğru; sorun tek atışın tutmaması.
 *
 * Bu yüzden körlemesine tuş yağdırmak yerine DOĞRULAYIP tırmanıyoruz: bas,
 * veritabanına bak, tutmadıysa tekrar bas. Son durumda ne olduğu da günlüğe
 * yazılıyor — çünkü "durdurdum" ile "gerçekten durdu" arasındaki farkı bir kez
 * kaçırdık ve bedeli, kullanıcının ödediği ama hiç görmediği jetonlar oldu.
 *
 * `onVerdict` o farkı ARAYÜZE de taşıyor. Günlüğe yazmak yetmiyordu: iptal
 * tutmadığında ekranda hiçbir iz kalmıyor, kullanıcı "durdurdum" sanıyor ve
 * tur arkada üretmeye devam ediyordu — yani ürün sessizce yanlış bilgi
 * veriyordu. Karar en geç ~4 sn içinde, tek sefer bildiriliyor.
 */
export function cancelTui(chatId: string, onVerdict?: (verdict: AxetChatCancelVerdict) => void): void {
  // Karar TEK SEFER bildiriliyor: aşağıdaki üç zamanlayıcı birbirinden bağımsız
  // ve hepsi aynı sonucu görebiliyor.
  let reported = false;
  const report = (verdict: AxetChatCancelVerdict): void => {
    if (reported) return;
    reported = true;
    onVerdict?.(verdict);
  };

  const session = sessions.get(chatId);
  if (!session || session.exited) {
    console.log("[axetChatTui] iptal: yazilacak oturum yok", {
      chatId,
      oturumVar: Boolean(session),
      kapandi: session?.exited ?? null
    });
    // Süreç yoksa üreten de yok: bu bir başarısızlık değil, iptalin
    // kendiliğinden gerçekleşmiş hali.
    report({ stopped: true, reason: null });
    return;
  }
  // Bayrak ŞART: esc turu TUI tarafında kesiyor ama veritabanına bir "stop"
  // bitişi yazılmayabiliyor — yoklama döngüsü onu beklerse iptal, iptal değil
  // 5 dakikalık bir zaman aşımı olurdu.
  session.cancelled = true;
  // Açık bir soru kutusu varsa esc onu kapatıyor; bekleyen soru kaydı da
  // düşmeli, yoksa geç bir tıklama kapanmış kutuya tuş gönderirdi.
  session.pendingAsk = null;

  const press = (deneme: number): boolean => {
    try {
      session.proc.write("\x1b");
      console.log("[axetChatTui] iptal esc yazildi", { chatId, deneme });
      return true;
    } catch {
      // Yazılamıyorsa süreç zaten gitmiş demektir.
      console.log("[axetChatTui] iptal esc yazilamadi", { chatId, deneme });
      return false;
    }
  };

  // Esc'ten ÖNCEKİ hâl. Bu turun satırı veritabanında henüz açılmamışsa
  // "son asistan mesajı" bir önceki tura ait ve zaten bitmiş oluyor; o bayat
  // `end_turn`'ü bizim esc'imizin sonucu sanmamak için kimliği saklanıyor.
  const before = turnFinishReason(session);
  const staleFinishId = before?.reason ? before.messageId : null;

  if (!press(1)) {
    // Yazılamayan bir pty ölmüş bir pty: tırmanmanın anlamı yok.
    report({ stopped: true, reason: null });
    return;
  }

  // Tırmanma basamakları. Aralıklar, sağlayıcıya giden isteğin kesilmesinin
  // veritabanına yansıması için ölçülen ~1 sn'ye göre seçildi; son basamak
  // yalnızca RAPOR ediyor, tuş göndermiyor.
  const steps = [1200, 2400, 4000];
  steps.forEach((ms, i) => {
    setTimeout(() => {
      if (session.exited || session.disposed) {
        report({ stopped: true, reason: null });
        return;
      }
      const finish = turnFinishReason(session);
      // Bitiş İPTALDEN ÖNCE de oradaysa bu tura ait değil: karar verilmiyor,
      // bir sonraki basamak bekleniyor.
      if (finish?.reason && finish.messageId !== staleFinishId) {
        console.log("[axetChatTui] iptal sonucu", { chatId, sebep: finish.reason, msSonra: ms });
        // `end_turn` = tur SONUNA KADAR üretti, esc'e rağmen. Bitmiş olması
        // durdurulmuş olması demek değil; ölçülen 16:40 turunda tam olarak bu
        // oldu ve jetonların ~%69'u iptalden sonra harcandı. Diğer sebepler
        // (`canceled`, `stop`, ...) kesintiye işaret ediyor.
        report({ stopped: finish.reason !== "end_turn", reason: finish.reason });
        return;
      }
      // Hâlâ bitmemiş: son basamakta artık basmıyoruz, çünkü bu noktadan sonra
      // esc'in tutmaması tuş sayısıyla ilgili değil demektir.
      if (i === steps.length - 1) {
        // Uyarı ancak KANIT varken veriliyor: bu tura ait, açılmış ve hâlâ
        // bitmemiş bir asistan satırı. Satır hiç açılmadıysa (çok erken iptal)
        // ortada üretilen bir şey de yok — kullanıcıyı boşuna korkutmuyoruz.
        const live = Boolean(finish) && finish?.messageId !== staleFinishId;
        console.log("[axetChatTui] iptal TUTMADI", { chatId, msSonra: ms, uretimSuruyor: live });
        report({ stopped: !live, reason: null });
        return;
      }
      press(i + 2);
    }, ms);
  });
}
