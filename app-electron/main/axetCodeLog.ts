// ---------------------------------------------------------------------------
// axet-code'un KENDİ günlüğünü okumak
// ---------------------------------------------------------------------------
// Bir tur sırasında sağlayıcı tarafında bir şey patlarsa (403, 503, jeton
// sınırı) bunu ÖĞRENECEĞİMİZ tek güvenilir yer burası.
//
// NEDEN VERİTABANI DEĞİL — ölçülmüş (2026-09-04, 281 MB'lık canlı oturum
// veritabanı taranarak): `messages` tablosunda hiçbir hata izi YOK. Bitiş
// sebeplerinin tamamı `end_turn` (56) ve `tool_use` (47); "403", "forbidden",
// "context window", "rate limit" gibi hiçbir imza hiçbir mesajda geçmiyor.
// Yani sağlayıcı hatası veritabanına HİÇ yazılmıyor. Sonuç: bizim yoklama
// döngümüz bekleyecek bir asistan mesajı bulamıyor ve turu beş dakikalık zaman
// aşımına kadar sürüklüyor. Kullanıcının "aynı sessionda devam edilmiyor"
// dediği şey tam olarak bu.
//
// NEDEN pty EKRANI DEĞİL: ekranda görünen metin ajanın CEVABINI da içeriyor.
// Cevabın içinde "403" geçen bir mail özeti, ekranı tarayan bir denetleyiciyi
// sahte bir hataya inandırırdı. Ayrıca ekran ANSI ile yeniden çiziliyor, yani
// bir satırın "yeni" mi yoksa yeniden mi çizildiği belirsiz.
//
// GÜNLÜK ise Go'nun `slog` biçiminde, satır satır JSON ve şu alanları taşıyor
// (canlı örnekler):
//
//   {"time":"2026-09-04T23:47:54+03:00","level":"INFO",
//    "msg":"agent turn finished","session_id":"7343c7f7-…",
//    "finish_reason":"end_turn","text_length":424,"tool_call_count":0,
//    "step_count":2,"should_summarize":false,…}
//
//   {"time":"2026-09-02T23:10:41+03:00","level":"ERROR",
//    "msg":"Error generating title with small model; trying big model",
//    "err":"service unavailable: POST \"https://axet.nttdata.com/…\":
//           503 Service Unavailable {}"}
//
// İki şey birden veriyor: `session_id` sayesinde hata DOĞRU sohbete
// bağlanabiliyor (aynı çalışma dizininde birden fazla sohbet olabilir), ve
// `err` alanı HTTP durum kodunu ham hâliyle taşıyor.
//
// Dosya: <cwd>/.axet-code/logs/axet-code.log — çalışma dizini başına tek dosya,
// hep sonuna ekleniyor.
// ---------------------------------------------------------------------------

import { closeSync, openSync, readSync, statSync } from "node:fs";
import { join } from "node:path";

/** Bir yoklamada en fazla ne kadar okunacak. */
const MAX_READ = 512 * 1024;

export interface AxetLogLine {
  level: string;
  msg: string;
  /** Satır bir oturuma aitse onun kimliği. */
  sessionId: string;
  /** `err` ya da `error` alanı — hangisi varsa. */
  error: string;
  /** `agent turn finished` satırındaki bitiş sebebi. */
  finishReason: string;
  /** axet-code'un kendi kararı: bağlam özetlenmeli mi. */
  shouldSummarize: boolean;
}

export function logPath(cwd: string): string {
  return join(cwd, ".axet-code", "logs", "axet-code.log");
}

/** Dosyanın şu anki boyu — turun başında imleç olarak alınıyor. */
export function logOffset(cwd: string): number {
  try {
    return statSync(logPath(cwd)).size;
  } catch {
    return 0;
  }
}

/**
 * `offset`'ten sonraki satırları okur ve yeni imleci döndürür.
 *
 * Yarım kalan son satır BİLİNÇLİ olarak imlecin dışında bırakılıyor: günlük
 * yazılırken okuyoruz ve bir satırı ikiye bölünmüş hâlde ayrıştırmak, hatanın
 * kendisini kaçırmak demek olurdu. Sonraki yoklamada tamamlanmış hâliyle
 * gelecek.
 */
export function readLogSince(cwd: string, offset: number): { offset: number; lines: AxetLogLine[] } {
  const path = logPath(cwd);
  let size = 0;
  try {
    size = statSync(path).size;
  } catch {
    return { offset: 0, lines: [] };
  }
  // Dosya döndürülmüş/silinmişse baştan başla.
  if (size < offset) offset = 0;
  if (size === offset) return { offset, lines: [] };

  // Çok geride kaldıysak (uzun süren tur, gürültülü günlük) sona yakın bir
  // yerden devam ediyoruz; kaçırdığımız satırlar zaten eskimiş olurdu.
  const start = size - offset > MAX_READ ? size - MAX_READ : offset;
  const length = size - start;
  const buffer = Buffer.allocUnsafe(length);
  let fd: number | null = null;
  try {
    fd = openSync(path, "r");
    readSync(fd, buffer, 0, length, start);
  } catch {
    return { offset: size, lines: [] };
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // Kapatılamıyorsa yapacak bir şey yok; süreç sonunda serbest kalıyor.
      }
    }
  }

  const text = buffer.toString("utf8");
  const lastBreak = text.lastIndexOf("\n");
  if (lastBreak < 0) return { offset, lines: [] };
  const complete = text.slice(0, lastBreak);
  const nextOffset = start + Buffer.byteLength(complete, "utf8") + 1;

  const lines: AxetLogLine[] = [];
  for (const raw of complete.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    lines.push({
      level: String(parsed.level ?? ""),
      msg: String(parsed.msg ?? ""),
      sessionId: String(parsed.session_id ?? ""),
      error: String(parsed.err ?? parsed.error ?? ""),
      finishReason: String(parsed.finish_reason ?? ""),
      shouldSummarize: parsed.should_summarize === true
    });
  }
  return { offset: nextOffset, lines };
}

// ---------------------------------------------------------------------------
// Canlı bağlayıcı kaydı dökümü
// ---------------------------------------------------------------------------
// Her axet-code açılışında günlüğe şu blok düşüyor (canlı örnek, kısaltılmış):
//
//   {"msg":"connector.sync.start","endpoint":"https://axet.nttdata.com/…"}
//   {"msg":"connector.sync.resolved","mcp_name":"conn_<uuid>",
//    "display_name":"test123","type":"outlook","disabled":false}
//   … (kayıt başına bir satır) …
//   {"msg":"connector.sync.complete","count":4}
//
// Bu, hesaptaki kayıtların TAM dökümü — `connectorHealth`'in tek başına
// öğrenemediği şey. O yalnızca ÇAĞRILAN araçların sonucunu görüyor; kullanıcı
// portalden bir kaydı sildiğinde silinen uuid ona hiç haber verilmiyor ve
// hakkındaki not TTL dolana kadar (7 gün) yaşamaya devam ediyordu.
//
// Bu SESSİZCE ZARARLI: silinen kayıt "çalışıyor" diye bilinen kayıtsa, prompt'a
// "outlook işleri için adında şu kimliği taşıyan aracı kullan" diye artık var
// olmayan bir araç yazılıyordu. 2026-09-05'te kullanıcı portali temizleyip
// kayıtları düzgün adlarla yeniden oluşturunca tam olarak bu durum oluştu.
//
// Blok yerine `mcp_name`'i turluk okuyucuya (readLogSince) eklemek yetmezdi:
// bu satırlar süreç AÇILIŞINDA düşüyor, tur imleci ise her turun başında
// alınıyor. Bu yüzden dosyanın SONU ayrıca okunuyor.

/** Son tam senkronizasyon bloğu için en fazla ne kadar geriye bakılacak. */
export const SYNC_TAIL = 256 * 1024;

const RE_MCP_NAME = /"mcp_name":"conn_([0-9a-f-]{8,})"/i;

/**
 * Günlüğün SON `maxBytes` baytı, metin olarak. `null` = dosya yok/okunamadı.
 *
 * Ayrı bir işlev, çünkü dosyanın sonunu okuyan İKİ çağıran var: buradaki
 * uuid listesi ve `connectorInventory` (aynı bloğun tam dökümü). İkisi de
 * aynı bloğa bakıyor; kopyalanmış bir tail okuyucu, birinde düzeltilen bir
 * sınır hatasının diğerinde yaşamaya devam etmesi demekti.
 */
export function readLogTail(cwd: string, maxBytes: number): string | null {
  const path = logPath(cwd);
  let size = 0;
  try {
    size = statSync(path).size;
  } catch {
    return null;
  }
  const start = Math.max(0, size - maxBytes);
  const length = size - start;
  if (length <= 0) return null;

  const buffer = Buffer.allocUnsafe(length);
  let fd: number | null = null;
  try {
    fd = openSync(path, "r");
    readSync(fd, buffer, 0, length, start);
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // Bkz. readLogSince: kapatılamıyorsa süreç sonunda serbest kalıyor.
      }
    }
  }
  return buffer.toString("utf8");
}

/**
 * Günlükteki SON TAM senkronizasyon bloğundaki bağlayıcı uuid'leri.
 *
 * `null` = bilinmiyor; çağıran bu durumda hiçbir şeyi elemesin. Bu ayrım önemli:
 * boş dizi "hiç bağlayıcı yok" demek (hepsini elemek doğru), `null` ise "günlük
 * yok / blok yarım / pencerenin dışında kaldı" demek ve orada elemek, sağlam
 * kayıtları sahte bir kanıtla silmek olurdu.
 */
export function readLiveConnectors(cwd: string): string[] | null {
  const text = readLogTail(cwd, SYNC_TAIL);
  if (text === null) return null;

  const lines = text.split(/\r?\n/);
  // Sondan başlayarak son `complete`, oradan geriye onun `start`'ı. Sırayı
  // tersten kurmanın sebebi: dosyada aynı bloktan onlarca var (her açılışta bir
  // tane) ve bizi ilgilendiren yalnızca sonuncusu.
  let end = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].includes('"connector.sync.complete"')) {
      end = i;
      break;
    }
    // Tamamlanmamış bir blok (start var, complete yok) = senkronizasyon hâlâ
    // sürüyor. Yarım listeye bakıp eleme yapmak, henüz çözülmemiş kayıtları
    // "silinmiş" saymak olurdu.
    if (lines[i].includes('"connector.sync.start"')) return null;
  }
  if (end < 0) return null;

  const uuids: string[] = [];
  for (let i = end - 1; i >= 0; i -= 1) {
    if (lines[i].includes('"connector.sync.start"')) return uuids;
    const match = RE_MCP_NAME.exec(lines[i]);
    if (match) uuids.push(match[1].toLowerCase());
  }
  // `start`'a hiç ulaşamadık: blok okuma penceresinin dışında kalmış.
  return null;
}

// ---------------------------------------------------------------------------
// Sınıflandırma
// ---------------------------------------------------------------------------

/**
 * `auth`      — oturum/yetki düştü (403/401). Süren oturumla kurtarılamaz;
 *               yeni bir axet-code süreci gerekiyor.
 * `context`   — bağlam sınırı aşıldı. Aynı oturumda devam edilemiyor.
 * `provider`  — sağlayıcı geçici olarak veremedi (5xx, tekrarlar tükendi).
 *               Yeni bir oturumda genellikle geçiyor.
 */
export type AxetFailureKind = "auth" | "context" | "provider";

// 403/401'i SAYI OLARAK aramak yeterli değil, tehlikeli de: bir dosya adında
// ya da bir çıktı satırında geçebilir. Bu yüzden ölçüt, HTTP durum satırının
// kendi biçimi ("403 Forbidden") ya da açık sözcükler.
const RE_AUTH =
  /\b(?:401|403)\s+[A-Z]|\bforbidden\b|\bunauthorized\b|invalid[_ ]grant|token (?:has )?expired|authentication failed/i;

const RE_CONTEXT =
  /context (?:window|length|limit)|too many tokens|input is too long|prompt is too long|exceeds? (?:the )?maximum|maximum context/i;

// Sağlayıcı tarafında YALNIZCA tekrarları tükenmiş hata sayılıyor. Tek bir 5xx
// sayılmıyor — bilinçli: axet-code kendi içinde yeniden deniyor ve genellikle
// tutturuyor. Canlı günlükteki tek ERROR satırı ("Error generating title with
// small model; trying big model", 503) tam olarak bu türden: hata gerçek ama
// zararsız, arkasından büyük modelle başarıyla devam etmiş. Onu arıza sayan bir
// ölçüt, sapasağlam bir turu boşuna yeniden başlatırdı.
const RE_PROVIDER = /provider error after/i;

// Turun kendisiyle ilgisi olmayan, kendi içinde çözülen arka plan işleri.
const IGNORED_SOURCES = /^(connector\.sync|skillsmarket\.sync)|generating title/i;

/**
 * Bir günlük satırı turu KESEN bir arıza mı bildiriyor?
 *
 * Yalnızca WARN/ERROR satırlarına bakılıyor. Bilgi satırlarında (örneğin
 * "AXET anthropic request") aynı sözcükler zararsızca geçebiliyor ve onları
 * arıza saymak, sağlıklı bir turu boşuna yeniden başlatmak olurdu.
 */
export function classifyFailure(line: AxetLogLine): AxetFailureKind | null {
  if (line.level !== "ERROR" && line.level !== "WARN") return null;
  const text = `${line.msg} ${line.error}`;
  // YETKİ ARIZASI, KAYNAĞI NE OLURSA OLSUN ARIZADIR — bu denetim susturma
  // filtresinin ÖNÜNDE.
  //
  // 2026-09-09 ölçümü: taşıyıcının kimliği düştüğünde günlüğe düşen TEK
  // kanıt "Error generating title with small model" satırıydı ve içinde
  // aynı endpoint'in 403'ü duruyordu. Aşağıdaki filtre onu zararsız bir
  // arka plan işi sayıp atıyordu, yani kanaryayı susturmuş oluyorduk.
  // Başlık üretiminin 503'ü gerçekten zararsız (kendi yedeğine geçiyor);
  // 403'ü değil — turun kendisi de aynı anda aynı duvara çarpıyor.
  if (RE_AUTH.test(text)) return "auth";
  // Bağlayıcı/beceri senkronizasyonu ve başlık üretimi bir TUR arızası değil:
  // ilki bağlayıcılar kapalıyken her açılışta bir kez düşüyor (canlı günlükte
  // 22 kez), sonuncusu kendi yedeğine geçip başarıyla tamamlanıyor.
  if (IGNORED_SOURCES.test(line.msg)) return null;
  if (RE_CONTEXT.test(text)) return "context";
  if (RE_PROVIDER.test(text)) return "provider";
  return null;
}
