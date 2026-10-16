// İş B — Bildirim: saf karar fonksiyonu.
// Electron API'sine DOKUNMUYOR; test edilebilmesi için kasıtlı olarak saf.
// Gerçek bildirim oluşturma index.ts'te, try/catch içinde.

// Bildirim türleri:
//   "answer"    → tur başarıyla bitti (cevap geldi)
//   "askUser"   → ajan bir soru soruyor
//   "error"     → tur hata ile bitti
//   "cancelled" → kullanıcı durdurdu
export type NotificationKind = "answer" | "askUser" | "error" | "cancelled";

export interface NotificationPayload {
  title: string;
  body: string;
}

// Gövde metinleri iki dilde. Ana süreç i18n'ini doğrudan buraya çekmiyor —
// döngüsel bağımlılık riski var (store → i18n → store). Sabit metinler yeterli;
// bildirim gövdesi uzun bir mesaj değil, VARLIGI önemli olan kısa bir uyarı.
const BODY: Record<"tr" | "en", Record<Exclude<NotificationKind, "cancelled">, string>> = {
  tr: {
    answer: "Cevap hazır",
    askUser: "Ajan bir soru soruyor",
    error: "Tur hata ile bitti"
  },
  en: {
    answer: "Answer ready",
    askUser: "Agent is asking a question",
    error: "Turn ended with an error"
  }
};

// Dil yükleme bağımlılığını kırmak için: ilk çağrıda config'den okunuyor,
// ardından sabit tutuluyor. Bildirim metni dil değişince doğal olarak güncellenir
// çünkü her bildirim yeni bir çağrıda oluşturuluyor.
let _lang: "tr" | "en" | null = null;

export function setNotificationLang(lang: "tr" | "en"): void {
  _lang = lang;
}

function lang(): "tr" | "en" {
  return _lang ?? "tr";
}

/**
 * Bildirim oluşturulmalı mı? Saf fonksiyon — Electron'a dokunmuyor.
 *
 * @param kind     - Bildirim türü.
 * @param focused  - Pencere şu an odakta veya görünür mü?
 * @param enabled  - Kullanıcı ayarı (AppConfig.chatNotifications).
 * @param title    - Sohbet başlığı; boşsa "NTT Studio" kullanılır.
 * @returns        Bildirim içeriği ya da null (bildirim gösterilmeyecek).
 */
export function notificationFor(
  kind: NotificationKind,
  focused: boolean,
  enabled: boolean,
  title: string
): NotificationPayload | null {
  // İptal, odak veya ayar kapalı → bildirim yok.
  if (kind === "cancelled" || focused || !enabled) return null;

  const l = lang();
  const body = BODY[l][kind as Exclude<NotificationKind, "cancelled">];
  return {
    title: title.trim() || "NTT Studio",
    body
  };
}
