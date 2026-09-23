import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// 8787'deki ADT sunucusunun bearer token'ı — ölçülmüş gerekçe (2026-09-23)
// ---------------------------------------------------------------------------
// Yazan motor (`sap-adt/scripts/adt_mcp_server.py --http`) kimliği varsayılan
// olarak AÇIK çalıştırıyor: `ABAP_HTTP_TOKEN` verilmezse rastgele bir token
// üretip stderr'e basıyor ve token'sız gelen HER isteğe, `/health` dahil, 401
// dönüyor. Yukarı akışın gerekçesi yerinde: loopback bir yetki sınırı değil,
// aynı kullanıcının her süreci ve ziyaret edilen her web sayfası 127.0.0.1'e
// ulaşabiliyor, ve bu yüzey SAP'a push/activate/delete yapabiliyor.
//
// Launcher bunu bilmiyordu. Sunucuyu token'sız başlatıp token'sız yokluyordu,
// 401'i "ayakta değil" sayıyordu ve 15 sn sonra sunucuyu kendi eliyle
// öldürüyordu. MAYA'da (DEV + teknik danışman) log "listening" yazarken ajan
// "SAP aracı yok" dedi. 1.6.7'de görünmüyordu: o sürüm her sistemde token
// istemeyen salt-okur sunucuyu açıyordu.
//
// Karar: token'ı launcher üretiyor ve YALNIZCA bellekte tutuyor. Proje klasörü
// OneDrive'da senkronlanıyor; token'ı `sap-context.md`'ye ya da bir dosyaya
// yazmak onu buluta taşırdı. Bunun yerine `process.env`'e konuyor ve oradan
// kalıtımla Python sunucusuna, `axet-code`'a ve gömülü terminallere geçiyor —
// ajanın komutları `os.environ['ABAP_HTTP_TOKEN']` ile okuyor.
//
// Salt-okur sarmalayıcı (`adt_readonly_server.py`) bu değişkeni hiç okumuyor;
// ona giden başlık zararsız, davranışı 1.6.7'dekiyle aynı.
//
// `ABAP_HTTP_ALLOW_NO_AUTH=1` bilerek KULLANILMADI: tek satırlık bir çözüm ama
// yazan yüzeyi makinedeki her sürece açar ve yukarı akışın bu korumayı neden
// eklediği yukarıda yazıyor.
// ---------------------------------------------------------------------------

// Asıl kaynak bu değişken; `process.env` yalnızca kalıtım kanalı. Ortamdaki
// değer bir şekilde silinirse yeni token üretmek, çalışan sunucuyla eşleşmeyi
// sessizce bozardı.
let token: string | null = null;

/**
 * Bu süreç boyunca geçerli token. İlk çağrıda üretilir ve `process.env`'e
 * yazılır ki sonra başlatılan her alt süreç onu kalıtımla alsın. Kullanıcı
 * uygulamayı `ABAP_HTTP_TOKEN` ile başlattıysa o değer kullanılır.
 */
export function getAdtHttpToken(): string {
  if (!token) {
    token = (process.env.ABAP_HTTP_TOKEN ?? "").trim() || randomBytes(32).toString("base64url");
  }
  process.env.ABAP_HTTP_TOKEN = token;
  return token;
}
