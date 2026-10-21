// Yenilikler veri dosyası.
// Her kayıt: sürüm numarası + tr/en madde listeleri.
// tr/en madde sayıları eşit olmalı (test bunu zorluyor).

export interface WhatsNewEntry {
  version: string;
  items: {
    tr: string[];
    en: string[];
  };
}

export const WHATS_NEW_DATA: readonly WhatsNewEntry[] = [
  {
    version: "1.9.3",
    items: {
      tr: [
        "Kabukta başlattığın axet-code/Claude ajan olarak tanınıyor; rol ve bellek verilebiliyor. Logon'dan açılan ajan sistem adıyla geliyor.",
        "Ajan yönetiminde ajanı başka ekibe taşıma ve rolünü değiştirme.",
        "Bellek: \"Kimlik ve kurallar\" sekmesi, tüm ekiplerin gördüğü \"Genel\" bellek, Raporlar'da \"Belleğe ekle\".",
        "Lider görevleri uygulama kapanınca kaybolmuyor.",
        "Akış geçmişi gün bazlı (7/14/30 gün); Pano ve Raporlar tüm aralığı görüyor.",
        "Ofiste gündüz/gece seçimi kalıcı; terminal açılışındaki hata giderildi."
      ],
      en: [
        "axet-code/Claude started in a shell is recognised as an agent and can get a role and memory. Agents opened from logon are named after the system.",
        "Move an agent to another team and change its role from Agent management.",
        "Memory: \"Identity & rules\" tab, shared \"General\" memory for all teams, \"Add to memory\" in Reports.",
        "Lead tasks survive an app restart.",
        "Flow history is day-based (7/14/30 days); Dashboard and Reports see the whole range.",
        "Day/night choice in the office is remembered; fixed an error when terminals open."
      ]
    }
  },
  {
    version: "1.9.2",
    items: {
      tr: [
        "Ajan artık yalnız gerçek bir görev gelince \"çalışıyor\" oluyor; açılışta yanlışlıkla çalışıyor görünmüyor, bitince daha hızlı \"bitti\" oluyor.",
        "Akış'ta ajanın cevabı görünüyor: kesin kaynak yoksa terminal ekranından okunuyor (≈).",
        "Uzun Claude oturumları da kesin kaynakla izleniyor.",
        "Terminalde sol kenardaki yazı kayması düzeldi; yüzen görünüm düğmesi terminalin üstüne binmiyor."
      ],
      en: [
        "An agent now shows \"working\" only when a real task arrives; it no longer looks busy right after opening and shows \"done\" sooner.",
        "Flow shows the agent's answer: read from the terminal screen when there is no exact source (≈).",
        "Long Claude sessions are tracked from the exact source too.",
        "Fixed text shifting at the left edge of the terminal; the floating view button no longer covers the terminal."
      ]
    }
  },
  {
    version: "1.9.1",
    items: {
      tr: [
        "Lider işi ekibe gerçekten dağıtıyor; Claude da lider olabiliyor. Claude ajanlarının durumu ve cevabı Akış'ta görünüyor.",
        "SAP yazma onayından sonra sohbet ve ajan kendiliğinden devam ediyor; \"devam et\" yazmaya gerek yok.",
        "Akış'a dosya ekleme; konuşmalardan belleğe otomatik not (geri alınabilir).",
        "Terminal ekranındayken ajan yanlışlıkla \"çalışıyor\" görünmüyor; Akış'tan yazma terminal açıkken de çalışıyor.",
        "Ofis yenilendi (soru ve konuşma balonları, bilgi kartı, gündüz/gece); Ajan yönetimi, Görevler, Raporlar ve Pano düzeni yenilendi.",
        "NTT beceri ve eklentileri güncellendi; yerel Claude kurulumu tanınıyor."
      ],
      en: [
        "The lead really hands work to the team; Claude can be a lead too. Claude agents' status and answers show in Flow.",
        "After an SAP write approval, chat and agents continue on their own; no need to type \"continue\".",
        "Attach files in Flow; automatic memory notes from conversations (undoable).",
        "Agents no longer look \"working\" just because the Terminal view is open; sending from Flow works while the terminal is open.",
        "Refreshed office (question and speech bubbles, info card, day/night); refreshed Agent management, Tasks, Reports and Dashboard layouts.",
        "NTT skills and plugins updated; a local Claude install is recognised."
      ]
    }
  },
  {
    version: "1.9.0",
    items: {
      tr: [
        "Ajanlar ekranı yenilendi: piksel ofis, Pano (grafikler), Raporlar, Ajan yönetimi, Görevler, Değişiklikler ve Tarayıcı kenardaki düğme grubunda.",
        "Lider ajan kendi ekibini kurar: işi böler, gerekirse ajan açar, görev verir, sonuçları toplar; hataları ve takılan işleri takip eder.",
        "Bellek artık ikinci beyin: not haritası, arama, bağlantılar ve konuyu araştırıp belleğe yazan \"Öğren\" görevleri.",
        "Akış: ajanların canlı aşaması, son cevabı, soruya kendi cevabını yazma; ajanlar birbirine soru sorabiliyor (ntt-team).",
        "Hata olunca neden yazıyor; geçici hatalarda (istek sınırı, servis) kendiliğinden yeniden deniyor, aynı anda çalışan ajan sınırlanıyor.",
        "axet-code açılış seçimi otomatik; Araçlar'dan Claude Code / Gemini / Codex tek tıkla kurulur; yerel adresler gömülü tarayıcıda açılır."
      ],
      en: [
        "Redesigned Agents screen: pixel office, Dashboard (charts), Reports, Agent management, Tasks, Changes and Browser in the side button group.",
        "A lead agent builds its own team: splits the work, opens agents when needed, assigns tasks, gathers results; tracks errors and stuck work.",
        "Memory is now a second brain: note map, search, links and \"Learn\" tasks that research a topic and write it into memory.",
        "Flow: live agent phase, last answer, write your own answer to a question; agents can ask each other (ntt-team).",
        "Errors show their cause; temporary errors (rate limit, service) are retried automatically and concurrent agents are limited.",
        "axet-code startup choice is automatic; install Claude Code / Gemini / Codex from Tools in one click; local addresses open in the embedded browser."
      ]
    }
  },
  {
    version: "1.8.3",
    items: {
      tr: [
        "Sohbet artık görünmez terminal kullanmıyor: daha sağlam ve ilk cevap daha hızlı (yazmaya başlayınca hazırlanıyor).",
        "Ajan araç çalıştırdıktan sonra hata olursa mesaj kendiliğinden tekrar gönderilmiyor; \"Devam et\" ile karar sizde.",
        "Pencere arka plandayken tur bitince ya da ajan soru sorunca Windows bildirimi (Ayarlar'dan kapatılabilir).",
        "Klavye kısayolları penceresi: Ctrl+/ ya da F1.",
        "Ayarlar → Veri ve gizlilik: sohbet geçmişi, günlük ve kayıtların yeri ve boyutu; temizleme.",
        "Terminal: bölmeleri sağa/alta bölme, sürükleyip yerleştirme, bölmeye ad ve renk, bölme başına yazı boyutu."
      ],
      en: [
        "Chat no longer uses a hidden terminal: more stable and first response is faster (warms up as you start typing).",
        "When the agent encounters an error after running a tool, the message is no longer retried automatically — use \"Continue\" to decide.",
        "Windows notification when a turn ends or the agent asks a question while the window is in the background (can be turned off in Settings).",
        "Keyboard shortcuts window: Ctrl+/ or F1.",
        "Settings → Data & privacy: location and size of chat history, logs, and recordings; clear options.",
        "Terminal: split panes right/down, drag and drop, name and color per pane, font size per pane."
      ]
    }
  }
];

export interface ShouldShowArgs {
  seenVersion: string;
  appVersion: string;
}

/**
 * Yenilikler penceresinin gösterilip gösterilmeyeceğini hesaplar.
 *
 * - seenVersion === appVersion → zaten gösterilmiş → GÖSTERILMEZ.
 *   (defaultConfig artık app.getVersion() yazar; ilk kurulumda bu eşit olur.)
 * - seenVersion farklıysa (boş, "0", eski sürüm) ve veri dosyasında bu
 *   sürüm için kayıt varsa → GÖSTERILIR.
 *   (Eski sürümden yükseltme = "" veya eksik alan = "0"; her ikisi de gösterilmeli.)
 */
export function shouldShowWhatsNew({ seenVersion, appVersion }: ShouldShowArgs): boolean {
  if (seenVersion === appVersion) return false;
  return WHATS_NEW_DATA.some((e) => e.version === appVersion);
}

/**
 * Mevcut appVersion için veri kaydını döner.
 * Yoksa null.
 */
export function getWhatsNewEntry(appVersion: string): WhatsNewEntry | null {
  return WHATS_NEW_DATA.find((e) => e.version === appVersion) ?? null;
}

/**
 * WhatsNewModal kapanış işleyicisini oluşturur.
 * close(): modal durumunu kapatır.
 * saveConfig(): seenVersion'ı kaydeder — KAPANIŞTA, açılışta değil.
 *
 * Saf fonksiyon → izole test edilebilir.
 */
export function buildWhatsNewCloseHandler(params: {
  appVersion: string;
  close: () => void;
  saveConfig: (cfg: { whatsNewSeenVersion: string }) => void;
}): () => void {
  return () => {
    params.close();
    if (params.appVersion) {
      params.saveConfig({ whatsNewSeenVersion: params.appVersion });
    }
  };
}
