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
    /**
     * `tool_result` için, ait olduğu çağrının kimliği. Alan adı çağrı
     * tarafındakinden FARKLI (`id` değil) — canlı veriyle doğrulandı; sonucu
     * `id` ile aramak sessizce hiçbir şey bulmuyordu.
     */
    tool_call_id?: string;
    text?: string;
    name?: string;
    input?: string;
    /**
     * `tool_call` için: argümanlar TAMAMLANDI mı?
     *
     * Araç çağrısı veritabanına AKARKEN yazılıyor — ilk gördüğümüz hâlinde
     * `input` yarım bir JSON metni olabiliyor (`{"question": "Sevdi`). Girdiyi
     * okuması gereken her yer bunu beklemeli (bkz. axetChatTui.ts `ask_user`).
     */
    finished?: boolean;
    reason?: string;
    is_error?: boolean;
    /**
     * `tool_result` için aracın döndürdüğü ham gövde. `is_error` GÜVENİLİR
     * DEĞİL: canlı ölçümde (2026-09-04) bir MCP çağrısı "HTTP error 500 …
     * Integration … is in state 'ERROR'" döndürdüğü hâlde `is_error: false`
     * yazıyordu. Bozuk entegrasyon teşhisi bu yüzden metne bakıyor
     * (connectorHealth.ts).
     */
    content?: string;
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
 * İki metni KARŞILAŞTIRILABİLİR biçime indirger: harf ve rakam dışındaki her
 * şey tek boşluğa iniyor.
 *
 * NEDEN GEREKLİ — ölçülmüş, tahmin değil (2026-09-04). Prompt'u pty'ye
 * yazıyoruz, ama axet-code'un veritabanına düşen metin YAZDIĞIMIZIN AYNISI
 * DEĞİL: bazı karakterler yolda düşüyor. Gönderilen
 *
 *   "KURAL — uygulama bağlantısı araçları: ... outlook → df6566e3-…"
 *
 * veritabanına
 *
 *   "KURAL  uygulama bağlantısı araçları: ... outlook  df6566e3-…"
 *
 * olarak indi: em-dash (—) ve ok (→) yok oldu, Türkçe harfler (ç, ğ, ş, ı)
 * sağ salim geçti. Yani süzgeç Latin dışındaki noktalama işaretlerine takılıyor.
 *
 * Sonucu ciddiydi: turun bittiğini anlamak için gönderdiğimiz metinden
 * türetilen bir iğneyi veritabanında arıyoruz, iğne eşleşmeyince tur hiç
 * "başladı" sayılmadı ve cevap 189 saniyedir hazır beklerken arayüz beş
 * dakikalık zaman aşımını doldurdu. Aynı kilit, KULLANICI kendi mesajında bir
 * tire ya da emoji kullansa da oluşurdu.
 *
 * Bu yüzden eşleştirme artık hiçbir noktalama işaretine güvenmiyor. Harf ve
 * rakam yeter: 80 karakterlik bir iğnede yanlış eşleşme için fazlasıyla sinyal
 * var.
 */
export function matchKey(text: string): string {
  return text.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Gönderdiğimiz prompt'u İÇEREN kullanıcı mesajını bulup oturum kimliğini
 * döndürür. `needle` `matchKey`'den GEÇMİŞ olmalı — karşılaştırma iki tarafta
 * da o biçimde yapılıyor.
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
      if (matchKey(text).includes(needle)) return row.session_id;
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

/**
 * Bir oturumun bağlam büyüklüğü — SON isteğin girdi + çıktı jeton sayısı.
 *
 * `sessions.prompt_tokens` KÜMÜLATİF DEĞİL: axet-code her asistan cevabından
 * sonra o isteğin kullanımını yazıyor, yani alan "bu oturum toplam ne harcadı"
 * değil "en son istekte bağlam ne kadar doluydu" sorusunun cevabı. Jeton
 * sınırını ilgilendiren de tam olarak budur.
 *
 * ÖLÇÜM (2026-09-04, canlı veritabanı): bağlayıcılar açıkken tek soruluk bir
 * mail turu bile `prompt_tokens ≈ 153.000` ile başlıyor — 92 araçlık katalog
 * bağlamın altıda birini daha ilk mesajda dolduruyor. Yani sınıra, uzun bir
 * sohbette sanılandan çok daha çabuk yaklaşılıyor.
 */
export function sessionTokens(dbPath: string, sessionId: string): number {
  const db = openDb(dbPath);
  if (!db) return 0;
  try {
    const row = db
      .prepare("SELECT prompt_tokens, completion_tokens FROM sessions WHERE id=?")
      .get(sessionId) as { prompt_tokens: number | null; completion_tokens: number | null } | undefined;
    if (!row) return 0;
    return (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Ajanın kendi yapılacaklar listesi — `sessions.todos`.
 *
 * BİZ ÜRETMİYORUZ. axet-code'un `todos` aracı çalıştığında listeyi bu sütuna
 * JSON olarak yazıyor; burada yalnızca okunuyor. Terminaldeki arayüzde bu
 * liste turun ortasında görünür ve "ajan planının neresinde" sorusunun tek
 * doğrudan cevabı — kılıfta hiç gösterilmiyordu.
 *
 * ÖLÇÜLEN ŞEKİL (2026-09-05, canlı veritabanı, todos taşıyan 8 oturum):
 *   [{"content":"...","status":"completed","active_form":"..."}]
 * `status` üç değerden biri: `pending` | `in_progress` | `completed`.
 * `active_form` ("...yapılıyor" kipi) OKUNMUYOR: ekranda içeriğin iki farklı
 * çekimini yan yana göstermek karışıklıktan başka bir şey vermiyor.
 *
 * Sütun bozuk/yarım yazılmışsa boş dizi dönüyor — bu bilgi süs, turu
 * düşürmesine izin yok.
 */
export interface AxetTodo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export function sessionTodos(dbPath: string, sessionId: string): AxetTodo[] {
  const db = openDb(dbPath);
  if (!db) return [];
  try {
    const row = db.prepare("SELECT todos FROM sessions WHERE id=?").get(sessionId) as
      | { todos: string | null }
      | undefined;
    const raw = row?.todos;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AxetTodo[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const t = item as Record<string, unknown>;
      const content = typeof t.content === "string" ? t.content.trim() : "";
      if (!content) continue;
      const status =
        t.status === "completed" ? "completed" : t.status === "in_progress" ? "in_progress" : "pending";
      out.push({ content, status });
      // Terminaldeki listeler de bu civarda kalıyor; daha uzunu ekranda
      // okunmuyor ve her yoklamada IPC'den geçmesi gereksiz.
      if (out.length >= 30) break;
    }
    return out;
  } catch {
    return [];
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
