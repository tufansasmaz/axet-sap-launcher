// ---------------------------------------------------------------------------
// axet-code alt-process'lerine verilecek ortam — ölçülmüş gerekçe (2026-09-02)
// ---------------------------------------------------------------------------
// Kullanıcı şikâyeti: "çok geç cevap veriyor ... axetteki gibi cevap verse
// daha iyi olur". Ölçüm, gecikmenin ne modelden ne de process başlatmaktan
// geldiğini gösterdi. `axet-code run -q -d` günlüğünün aşama aşama dökümü
// (prompt: "Sadece OK yaz." → 2 karakterlik cevap, toplam 12.8 s):
//
//   connector.sync (3 Outlook kaydı ağdan çekiliyor) ......... 1.5 s
//   MCP istemcileri başlatılıyor ............................ 0.9 s
//   MCP araç listeleri yükleniyor ........................... 2.3 s
//   skillsmarket.sync ....................................... 0.8 s
//   Audit logged ............................................ 0.4 s
//   başlık üretimi (küçük modelle AYRI bir LLM çağrısı) ..... 1.3 s
//   ASIL CEVAP .............................................. 0.6 s
//   MCP istemcileri kapatılıyor ("Shutdown took") ........... 3.4 s
//
// Yani sürenin ~8 saniyesi, sohbetin çoğu mesajında hiç kullanılmayan MCP
// bağlayıcılarının HER MESAJDA kurulup yıkılmasına gidiyor. Model seçimi
// fark etmiyor: en hızlı modelle (haiku) bile 13.2 s ölçüldü.
//
// Ayrı bir bulgu — backend ÇÖKTÜĞÜNDE durum daha kötü: axet-code bağlanmayı
// 10 saniye deniyor, sonra `connector.sync.failed` yazıp devam ediyor. O
// arıza sırasında ölçülen değerler: 16.3 s → bağlayıcılar kapalıyken 4.8 s.
// Yani bu anahtar sadece "hızlı" değil, backend arızasına karşı da bağışık.
//
// Kapatma yöntemi: `AXET_MCP_BASE_URL` ANINDA reddedilen bir loopback adresine
// çevriliyor. 9 numaralı port (discard) dinlenmediği için işletim sistemi TCP
// SYN'e hemen RST döner — DNS yok, zaman aşımı yok. Ulaşılamayan bir İNTERNET
// adresi vermek işe yaramazdı: o da zaman aşımına düşerdi, yani düzeltmek
// istediğimiz şeyin aynısı olurdu.
//
// Bilinçli olarak DOKUNULMAYAN maliyetler:
//   - `Audit logged` — kurumsal denetim kaydı, bir uyumluluk kontrolü.
//     Hızlanmak için denetim kaydını atlamak bizim vereceğimiz bir karar değil.
//   - `skillsmarket.sync` (~0.8 s) ve başlık üretimi (~1.3 s) — kapatan bir
//     anahtar bulunamadı; kazanç da bağlayıcılarınkinin yanında küçük.
// ---------------------------------------------------------------------------

// Bağlantı ANINDA reddedilsin diye seçilen adres (bkz. yukarıdaki not).
const FAST_FAIL_MCP_BASE_URL = "http://127.0.0.1:9";

/**
 * `spawn("axet-code", ...)` çağrılarına verilecek ortam.
 *
 * @param useConnectors `false` ise MCP bağlayıcıları (Outlook/SharePoint vb.)
 *   devre dışı bırakılır ve çağrı ~2.5 kat hızlanır. `true` ise `process.env`
 *   olduğu gibi döner, yani axet-code her zamanki gibi bağlayıcıları kurar.
 */
export function axetSpawnEnv(useConnectors: boolean): NodeJS.ProcessEnv {
  if (useConnectors) return process.env;
  return { ...process.env, AXET_MCP_BASE_URL: FAST_FAIL_MCP_BASE_URL };
}
