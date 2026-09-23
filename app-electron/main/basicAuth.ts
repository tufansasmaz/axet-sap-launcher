/**
 * HTTP Basic Auth başlığı + şifredeki ASCII dışı karakterlerin teşhisi.
 *
 * ÖLÇÜLDÜ 2026-09-23, bir müşteri DEV sisteminde (client 100). Şifre `ı` ve `ş`
 * içeriyor ve SAP GUI onunla GİRİYOR:
 *
 *   /sap/public/ping  kimliksiz            -> 200   (sistem/ağ/TLS sağlam)
 *   /sap/bc/ping      UTF-8 baytlarıyla    -> 401
 *   /sap/bc/ping      ISO-8859-9 baytlarıyla -> 401
 *
 * Aynı kullanıcı, saf ASCII bir şifreyle HTTP'de 200 alıyordu.
 * Kullanıcının kilitli OLMADIĞI ayrıca doğrulandı (ölçümlerden sonra GUI hâlâ
 * giriyor). Yani: SAP bu şifreyi GUI'de kabul edip HTTP kanalında reddediyor
 * ve sebep kod sayfası DEĞİL.
 *
 * Bu ölçüm bir hipotezi çürüttü. SAP'ın challenge'ı `charset="UTF-8"`
 * taşımıyor; RFC 7617'ye göre bu, "kimlik bilgilerini ISO-8859-1 ile kodla"
 * demek ve SAP GUI şifreyi kendi kod sayfasıyla (Türkçe 1610 = ISO-8859-9)
 * taşıdığı için "GUI giriyor, HTTP girmiyor" farkı oradan sanılmıştı. Kod bir
 * süre ISO-8859-9 gönderdi; ölçüm onu da 401 ile reddetti. **Kod sayfası
 * tahmini bu yüzden KALDIRILDI** — ölçüm desteklemeyen bir bayt dönüşümü,
 * hiç olmamasından kötüdür: gönderileni kimsenin öngöremediği hâle getirir.
 *
 * Kalan davranış: her zaman UTF-8 (bugüne kadar çalışan her sistemin
 * davranışı). Python motoru `.conn_adt`'taki `ADT_SAP_PW_CHARSET` satırıyla
 * bunu ELLE değiştirebiliyor — ölçümle gerekçelendirilmiş bir sistem çıkarsa
 * diye bırakılan kapı; varsayılanı yine UTF-8.
 *
 * Dosyanın asıl işi artık `hasNonAscii`: şifrede ASCII dışı karakter varsa
 * kullanıcı DENEMEDEN uyarılıyor, çünkü her başarısız Basic denemesi SAP'ın
 * kilit sayacını (`login/fails_to_user_lock`, genelde 5) artırıyor.
 */

/** SAP'ın 7-bit ASCII dışına çıkan her karakter (şifre ve kullanıcı adı). */
export function hasNonAscii(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-\u007F]/.test(text);
}

/** Şifredeki ASCII dışı karakterlerin tekilleştirilmiş listesi (uyarı metni için). */
export function nonAsciiChars(text: string): string[] {
  return [...new Set([...text].filter((ch) => ch.codePointAt(0)! > 127))];
}

/** `base64(user:password)` — UTF-8. */
export function encodeBasicCredentials(user: string, password: string): string {
  return Buffer.from(`${user}:${password}`, "utf8").toString("base64");
}
