import { safeStorage } from "electron";

// Uygulama Bağlantıları (msGraphAuth.ts) için eklenen `safeStorage`
// (Windows DPAPI) kullanımının GENELLEŞTİRİLMİŞ hâli — 2026-08-29,
// "uygulama genelinde eksik" denetiminde bulunan, PROJE-BILGI.md'nin
// "Bilinen Eksikler" listesinde uzun süredir bekleyen bir borç: SAP
// sistem şifreleri (`AppConfig.lastCredentials[uuid].password`) hâlâ
// `config.json`'a DÜZ METİN yazılıyordu. Bu dosya o kalıbı `config.json`
// İÇİNDEKİ tekil string alanlar için tekrar kullanılabilir hâle getiriyor
// (msGraphAuth.ts'teki `msal-token-cache.bin` gibi AYRI bir dosya değil —
// `lastCredentials` zaten `config.json`'un bir parçası, tek alanı
// şifrelemek için ayrı dosyaya taşımaya gerek yok).
//
// BİLİNÇLİ KAPSAM SINIRI: `.conn_adt` dosyası BURAYA DAHİL EDİLMEDİ —
// o dosya axet-code'un ADT connector'ı + `adt-tool.ps1` (PowerShell) +
// `resources/sap-toolkit`'teki çok sayıda Python script (`sap_adt_lib.py`
// `python-dotenv` ile okuyor) tarafından HARİCİ olarak, düz `KEY=VALUE`
// dotenv formatında okunuyor — şifrelemek bu araçların TAMAMINI bozar.
// Bu, PROJE-BILGI.md'de zaten "bilinçli/kabul edilmiş tercih" olarak
// belgelenmiş bir tasarım kararı, bir hata değil.
const ENC_PREFIX = "enc:v1:";

// Var olan bir düz metin sırrı (örn. eski bir config.json'dan okunan,
// şifreleme eklenmeden ÖNCE kaydedilmiş şifre) şifreliyken de
// şifrelenmemişken de sorunsuz çalışsın diye `ENC_PREFIX` ile işaretleme
// yapılıyor — decryptSecret bu öneki görmeyen her şeyi "eski/düz metin"
// kabul edip olduğu gibi döner, böylece geriye dönük uyumluluk KIRILMAZ
// (kullanıcı bir sisteme yeniden bağlandığında o kayıt otomatik olarak
// şifreli forma yükseltilir — ayrı bir migrasyon adımı gerekmez).
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  if (!safeStorage.isEncryptionAvailable()) return plain;
  const buf = safeStorage.encryptString(plain);
  return ENC_PREFIX + buf.toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!stored) return stored;
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  if (!safeStorage.isEncryptionAvailable()) return "";
  try {
    const buf = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
    return safeStorage.decryptString(buf);
  } catch {
    return "";
  }
}
