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
