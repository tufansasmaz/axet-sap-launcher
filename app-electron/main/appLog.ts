// ---------------------------------------------------------------------------
// Paketlenmiş uygulamanın DİSKE dönen günlüğü
// ---------------------------------------------------------------------------
// Neden var: 2026-09-08'de bir kullanıcı "sohbette cevapları göremiyorum"
// dedi ve elimizde ekran görüntüsünden başka hiçbir şey yoktu. Uygulamanın
// bütün `console.log` satırları paketlenmiş çalışmada HİÇBİR YERE yazmıyor —
// arıza, kendini açıklayacak tek izi bırakmadan geliyordu.
//
// NE YAZILIR: yalnızca SAYAÇ ve DURUM. Parça tipleri, mesaj sayısı, tur
// süresi, kip adı, oturum kimliğinin ilk 8 hanesi.
//
// NE YAZILMAZ: kullanıcının yazdığı hiçbir şey, ajanın cevabı, pty ekran
// dökümü, dosya içeriği, kimlik bilgisi. Bu bir tercih değil, bu dosyanın
// varlık şartı: kullanıcı günlüğü destek için bize e-postayla gönderecek ve
// gönderdiği şeyin ne olduğunu okumadan bilebilmeli. (Karar: kullanıcı,
// 2026-09-08 — "aç, ama içerik yazma".)
//
// `console.log` çağrıları OLDUĞU GİBİ duruyor ve buraya bağlanmadı: bazıları
// bilerek metin taşıyor (örneğin `axetChatTui`'deki `sonEkran`) ve hepsini
// toptan dosyaya akıtmak tam da yazmamaya karar verdiğimiz şeyi yazmak
// olurdu. Dosyaya düşecek satır, tek tek `appLog()` ile seçiliyor.
//
// Dosya: <userData>/logs/ntt-studio.log
//        (Windows'ta %APPDATA%\axet-sap-launcher\logs\ntt-studio.log)
// ---------------------------------------------------------------------------

import { app } from "electron";
import { appendFileSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/** Dosya bu boyu aştığında devrediliyor. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Tek bir alanın en fazla uzunluğu.
 *
 * İçerik yazmama kuralının YAPISAL karşılığı: bir gün biri buraya yanlışlıkla
 * bir cevap metni geçirirse, dosyaya düşen şey en fazla bu kadarı olur. Kuralın
 * yerine geçmez — kuralı hatırlatan bir emniyet supabıdır.
 */
const MAX_FIELD = 120;

export type LogValue = string | number | boolean | null | undefined;

/**
 * Bir günlük satırının metni. Saf işlev: `appLog`'un dosyaya yazdığı şeyin
 * aynısını üretiyor, elektron olmadan sınanabilsin diye ayrı duruyor.
 */
export function formatLogLine(tag: string, fields: Record<string, LogValue>, now: Date): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    let text = String(value);
    if (text.length > MAX_FIELD) text = `${text.slice(0, MAX_FIELD)}…(kirpildi)`;
    // Satır sonu bir kaydı ikiye bölerdi; sekmeye çeviriliyor.
    parts.push(`${key}=${text.replace(/\r?\n/g, "\t")}`);
  }
  return `${now.toISOString()} ${tag}${parts.length ? ` ${parts.join(" ")}` : ""}\n`;
}

let logDir: string | null = null;
/** Dosya yazılamıyorsa (salt okunur profil, disk dolu) bir daha denenmiyor. */
let disabled = false;

function resolveDir(): string | null {
  if (disabled) return null;
  if (logDir) return logDir;
  try {
    const dir = join(app.getPath("userData"), "logs");
    mkdirSync(dir, { recursive: true });
    logDir = dir;
    return dir;
  } catch {
    disabled = true;
    return null;
  }
}

/** Günlük dosyasının tam yolu — kullanıcıya "şu dosyayı gönder" demek için. */
export function appLogPath(): string {
  const dir = resolveDir();
  return dir ? join(dir, "ntt-studio.log") : "";
}

function rotate(path: string): void {
  try {
    if (statSync(path).size < MAX_BYTES) return;
  } catch {
    return; // Dosya henüz yok.
  }
  const previous = `${path}.1`;
  try {
    unlinkSync(previous);
  } catch {
    // Yoksa sorun değil.
  }
  try {
    renameSync(path, previous);
  } catch {
    // Devredilemediyse yazmaya devam: büyük bir dosya, hiç günlük olmamasından
    // iyidir.
  }
}

/**
 * Bir satır yaz. SAYAÇ ve DURUM geçir; kullanıcı metni ASLA geçirme.
 *
 * Yazma senkron ve `try` içinde: günlük bir yan iş, bir yazma hatası turu
 * bozmamalı.
 */
export function appLog(tag: string, fields: Record<string, LogValue> = {}): void {
  const dir = resolveDir();
  if (!dir) return;
  const path = join(dir, "ntt-studio.log");
  rotate(path);
  try {
    appendFileSync(path, formatLogLine(tag, fields, new Date()), "utf8");
  } catch {
    disabled = true;
  }
}
