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
// öldürüyordu. SID-I'da (DEV + teknik danışman) log "listening" yazarken ajan
// "SAP aracı yok" dedi. 1.6.7'de görünmüyordu: o sürüm her sistemde token
// istemeyen salt-okur sunucuyu açıyordu.
//
// Karar: token'ı launcher üretiyor ve YALNIZCA bellekte tutuyor. Proje klasörü
// OneDrive'da senkronlanıyor; token'ı `sap-context.md`'ye ya da bir dosyaya
// yazmak onu buluta taşırdı. Ajanın komutları `os.environ['ABAP_HTTP_TOKEN']`
// ile okuyor; değeri süreç açılırken ortamına biz koyuyoruz.
//
// Salt-okur sarmalayıcı (`adt_readonly_server.py`) bu değişkeni hiç okumuyor;
// ona giden başlık zararsız, davranışı 1.6.7'dekiyle aynı.
//
// `ABAP_HTTP_ALLOW_NO_AUTH=1` bilerek KULLANILMADI: tek satırlık bir çözüm ama
// yazan yüzeyi makinedeki her sürece açar ve yukarı akışın bu korumayı neden
// eklediği yukarıda yazıyor.
// ---------------------------------------------------------------------------

// Çoklu sistem (2026-11-12): her sistemin jetonu kendi kaydında
// (sapSystems.ts) ve süreç açılırken yalnız o sürecin ortamına konuyor.
// Bu jeton yalnızca sistem kaydı dışında başlatılan sunucular (testler, eski
// çağıranlar) için varsayılan; `process.env`'e YAZILMIYOR — global ortamdaki
// bir jeton her alt sürece, her sistemin klasöründe açılana da, geçerdi.
let token: string | null = null;

/** Süreç boyunca sabit varsayılan jeton; yalnız bellekte. */
export function getAdtHttpToken(): string {
  if (!token) token = randomBytes(32).toString("base64url");
  return token;
}

/**
 * Uygulama açılışında: NTT Studio'yu başlatan ortamdan miras kalan ADT
 * değişkenleri (ör. NTT Studio'nun kendi terminalinden açılmış bir geliştirici
 * kopyası) silinir; yoksa sistemi olmayan her alt süreç onları taşırdı.
 */
export function scrubInheritedAdtEnv(env: NodeJS.ProcessEnv = process.env): void {
  for (const k of ["ABAP_HTTP_TOKEN", "ABAP_HTTP_URL", "ABAP_HTTP_PORT"]) delete env[k];
}
