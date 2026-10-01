// axet-code'un araç çağrısı girdisinin TAMAM olup olmadığı.
//
// Girdi veritabanına AKARAK yazılıyor: çağrıyı ilk gördüğümüz yoklamada
// `input` boş ya da yarım bir JSON metni (`{"file_path": "C:/pro`) olabiliyor.
// Ölçüm (2026-10-01, kullanıcının `chat-sessions.json`'u): kayıtlı 16
// düzenleme/yazma adımının HİÇBİRİNDE dosya yolu ve fark yoktu, 227 okuma
// adımının yalnızca 2'sinde yol vardı — çağrı ilk görüldüğü hâliyle yazılıp
// bir daha bakılmıyordu. `ask_user` aynı tuzağa daha önce düşmüş ve orada
// `finished` beklenerek kapatılmıştı (bkz. axetChatTui.ts `ASK_USER_TOOL`).
//
// Satır yine HEMEN açılıyor (canlı gösterge beklemesin); yalnızca hedef ve
// fark, girdi tamamlanınca bir güncellemeyle dolduruluyor.

/**
 * Girdi tamam mı: `finished` bayrağı yazılmışsa ya da metin ayrıştırılabilen
 * bir JSON ise. Bayrağa tek başına güvenilmiyor — hiç yazılmazsa satır
 * sonsuza dek eksik kalırdı.
 */
export function toolInputComplete(input: string | undefined, finished: boolean | undefined): boolean {
  if (finished === true) return true;
  if (!input || !input.trim()) return false;
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}
