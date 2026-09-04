import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { app } from "electron";
import type { Database as SqliteDatabase } from "better-sqlite3";

// ---------------------------------------------------------------------------
// axet-code'un KENDİ oturum veritabanı (salt-okunur)
// ---------------------------------------------------------------------------
// Kalıcı TUI kipinde (bkz. axetChatTui.ts) cevabı EKRANDAN okumuyoruz. Neden:
// axet-code'un TUI'si tam ekran bir Bubble Tea arayüzü; canlı ölçümde ANSI
// dizileri temizlendikten sonra bile cevap, kenarlıklar/yan panel/spinner
// artıklarıyla iç içe geçmiş okunamaz bir metin olarak çıkıyor (2026-09-04
// pty denemesi). Aynı cevap ise bu veritabanında tertemiz duruyor:
//
//   messages(id, session_id, role, parts TEXT, model, created_at, ...)
//   parts = [{"type":"text","data":{"text":"..."}},
//            {"type":"tool_call","data":{"name":"view","input":"{...}"}},
//            {"type":"finish","data":{"reason":"stop"}}]
//
// Yani hem cevap metni hem de ARAÇ ÇAĞRILARI burada — kullanıcının istediği
// "arkada ne yapıyor" bilgisi de (`run -v` stderr'inde hiç düşmeyen o bilgi)
// buradan geliyor.
//
// ÖLÇÜM (2026-09-04, 281 MB'lık gerçek proje veritabanı, Electron içinde):
// açılış 15 ms, oturum sorgusu 5 ms, artımlı mesaj sorgusu 0 ms. Yani 250 ms
// aralıklı yoklama serbest.
//
// NEDEN better-sqlite3 (native): axet-code veritabanlarını WAL kipinde tutuyor
// (header baytı 18/19 = 2). Saf JS/WASM sqlite okuyucuları (denendi:
// node-sqlite3-wasm) WAL için gereken paylaşımlı belleği kuramadığından her
// dosyada "unable to open database file" veriyor. Native sürüm gerekiyordu.
// ---------------------------------------------------------------------------

/** `parts` dizisindeki tek bir öğe. Sadece kullandığımız alanlar. */
export interface AxetPart {
  type: string;
  data?: {
    /** `tool_call` için çağrı kimliği (`toolu_bdrk_...`). Tekrar bildirimi bununla önleniyor. */
    id?: string;
    text?: string;
    name?: string;
    input?: string;
    reason?: string;
    is_error?: boolean;
  };
}

export interface AxetDbMessage {
  id: string;
  role: string;
  parts: AxetPart[];
  /** Unix saniye. Şemadaki "milliseconds" yorumu YANLIŞ — canlı veriyle doğrulandı. */
  createdAt: number;
}

interface MessageRow {
  id: string;
  role: string;
  parts: string;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Modülün yüklenmesi
// ---------------------------------------------------------------------------
// Paketlenmiş uygulamada .node dosyası app.asar İÇİNDE değil, electron-builder
// `asarUnpack` ile açtığı app.asar.unpacked altındadır. Normalde better-sqlite3
// kendi yolunu bulur; bulamazsa ikinci denemede yolu açıkça veriyoruz —
// aksi hâlde hata, "sqlite yüklenemedi" değil, anlamsız bir MODULE_NOT_FOUND
// olarak çıkar.
type DatabaseCtor = new (path: string, options?: Record<string, unknown>) => SqliteDatabase;

// STATİK import DEĞİL, bilinçli olarak: ikili eksikse (bkz.
// build/ensureSqlite.cjs) statik bir import main process'i AÇILIŞTA düşürürdü.
// Burada ise yalnızca bu özellik kapanıyor ve sohbet `run` yoluna düşüyor.
//
// `createRequire` açıkça çağrılıyor: derleme çıktısı ESM ve oradaki `require`,
// electron-vite'ın enjekte ettiği bir uyumluluk kabuğu. Ona yaslanmak, bir
// derleme aracı ayarının bu özelliği sessizce kapatabilmesi demekti.
const nodeRequire = createRequire(import.meta.url);

let ctor: DatabaseCtor | null = null;
let loadError = "";

function unpackedBindingPath(): string {
  return join(
    app.getAppPath().replace("app.asar", "app.asar.unpacked"),
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node"
  );
}

function loadCtor(): DatabaseCtor | null {
  if (ctor || loadError) return ctor;
  try {
    ctor = nodeRequire("better-sqlite3") as DatabaseCtor;
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
    ctor = null;
  }
  return ctor;
}

/** Yükleme başarısızsa sebebi — çağıran tarafın `run` kipine düşebilmesi için. */
export function sessionDbLoadError(): string {
  loadCtor();
  return loadError;
}

// ---------------------------------------------------------------------------
// Veritabanının YERİ
// ---------------------------------------------------------------------------
// axet-code `.axet-code` klasörünü cwd'den YUKARI DOĞRU arıyor; cwd'de yoksa
// üst dizindekini kullanıyor. Canlı doğrulama (2026-09-04): cwd
// `...\Temp\axprobe` iken oturumlar `...\Temp\.axet-code` altına yazıldı.
// Bunu birebir taklit etmezsek boş/yanlış bir veritabanını yoklarız ve cevap
// hiç gelmemiş gibi görünür.
export function resolveSessionDb(cwd: string): string | null {
  let dir = cwd;
  for (let depth = 0; depth < 24; depth += 1) {
    const candidate = join(dir, ".axet-code", "axet-code.db");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// Aynı dosyaya her yoklamada yeniden bağlanmak, 281 MB'lık bir WAL
// veritabanında gereksiz iş. Tutamak yol başına önbellekleniyor.
const handles = new Map<string, SqliteDatabase>();

function openDb(dbPath: string): SqliteDatabase | null {
  const cached = handles.get(dbPath);
  if (cached) return cached;
  const Ctor = loadCtor();
  if (!Ctor) return null;
  const attempts: Array<Record<string, unknown>> = [
    { readonly: true, fileMustExist: true },
    { readonly: true, fileMustExist: true, nativeBinding: unpackedBindingPath() }
  ];
  for (const options of attempts) {
    try {
      const db = new Ctor(dbPath, options);
      handles.set(dbPath, db);
      return db;
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error);
    }
  }
  return null;
}

export function closeSessionDbs(): void {
  for (const db of handles.values()) {
    try {
      db.close();
    } catch {
      // Kapatılamayan tutamak sürecin sonunda zaten serbest kalıyor.
    }
  }
  handles.clear();
}

function parseParts(raw: string): AxetPart[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AxetPart[]) : [];
  } catch {
    return [];
  }
}

/** Veritabanındaki en son mesajın zamanı (Unix saniye). Yoksa 0. */
export function latestMessageTime(dbPath: string): number {
  const db = openDb(dbPath);
  if (!db) return 0;
  try {
    const row = db.prepare("SELECT MAX(created_at) AS m FROM messages").get() as { m: number | null } | undefined;
    return row?.m ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Gönderdiğimiz prompt'u İÇEREN kullanıcı mesajını bulup oturum kimliğini
 * döndürür.
 *
 * Neden metinle eşleştiriyoruz da "en yeni oturum"u almıyoruz: aynı klasörde
 * aynı anda birden fazla sohbet açık olabilir (uygulama buna izin veriyor) ve
 * "en yeni" yanlış sohbetin oturumunu verip iki konuşmayı birbirine karıştırır.
 */
export function findSessionByPrompt(dbPath: string, sinceEpochSec: number, needle: string): string | null {
  const db = openDb(dbPath);
  if (!db) return null;
  try {
    const rows = db
      .prepare(
        "SELECT id, session_id, parts FROM messages WHERE role='user' AND created_at>=? ORDER BY created_at DESC LIMIT 40"
      )
      .all(sinceEpochSec) as Array<{ session_id: string; parts: string }>;
    for (const row of rows) {
      const text = parseParts(row.parts)
        .filter((p) => p.type === "text")
        .map((p) => p.data?.text ?? "")
        .join("");
      if (text.includes(needle)) return row.session_id;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Verilen andan sonra açılmış EN YENİ oturum.
 *
 * `findSessionByPrompt` metin eşleşmesine dayanıyor ve TUI prompt'u yazarken
 * kırpabiliyor (uzun satırlar, otomatik tamamlama); bu yüzden bir yedek
 * gerekiyor. Tek başına kullanılmıyor — yalnızca metin eşleşmesi tutmadığında.
 */
export function newestSessionSince(dbPath: string, sinceEpochSec: number): string | null {
  const db = openDb(dbPath);
  if (!db) return null;
  try {
    const row = db
      .prepare("SELECT id FROM sessions WHERE created_at>=? ORDER BY created_at DESC LIMIT 1")
      .get(sinceEpochSec) as { id: string } | undefined;
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/** Bir oturumun, verilen andan sonraki mesajları (eskiden yeniye). */
export function readMessagesSince(dbPath: string, sessionId: string, sinceEpochSec: number): AxetDbMessage[] {
  const db = openDb(dbPath);
  if (!db) return [];
  try {
    const rows = db
      .prepare("SELECT id, role, parts, created_at FROM messages WHERE session_id=? AND created_at>=? ORDER BY created_at ASC")
      .all(sessionId, sinceEpochSec) as MessageRow[];
    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: parseParts(row.parts),
      createdAt: row.created_at
    }));
  } catch {
    return [];
  }
}
