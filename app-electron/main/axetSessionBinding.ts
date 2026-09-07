import { app } from "electron";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Bir launcher sohbetini axet-code'un KENDİ oturumuna bağlayan kayıt.
 *
 * NEDEN VAR (2026-09-07 ölçümü): sohbet geçmişini her yeni süreçte TUI'ye
 * yeniden yapıştırıyorduk. 52 mesajlık bir sohbette 115 karakterlik bir soru
 * tele 9.748 karakter olarak çıkıyor ve tur 224,6 saniye sürüyordu — bunun
 * 219,4 saniyesi yapıştırma, modelin payı 5,2 saniye. Yani "ilk tur neden 100
 * saniye" sorusunun cevabı modelde değil, kendi kılıfımızdaydı.
 *
 * Çözüm kullanıcının önerisi: geçmişi TAŞIMAK yerine geçmişin zaten durduğu
 * oturuma BAĞLANMAK. axet-code oturumları `ctrl+s` altında duruyor ve
 * ölçüldü (2026-09-07): bağlanmak 4 saniye, bağlandıktan sonra hafıza tam
 * (bir önceki oturumda sorulan kelimeyi hatırladı), tur normal hızında.
 *
 * KİMLİK YETMİYOR, BAŞLIK DA GEREKİYOR: `ctrl+s` ekranı oturumları yalnızca
 * BAŞLIKLARIYLA listeliyor, kimlik hiçbir yerde görünmüyor — ve axet-code'un
 * kendi ürettiği başlıklar tekrar ediyor (aynı veritabanında "OK Yaz Talebi"
 * iki, "Proje MD Dosyalarını Oku" dört kere). Bu yüzden oturumu ilk turdan
 * sonra BİZ adlandırıyoruz; aranan metin bizim koyduğumuz tekil ek.
 *
 * `cwd` de saklanıyor: aynı sohbet başka bir klasöre taşınırsa oradaki
 * veritabanında bu kimlik YOK, ve bağ sessizce yanlış bir oturuma denk
 * gelmektense düşmeli.
 */
export interface AxetSessionBinding {
  /** axet-code'un oturum kimliği (sessions.id). */
  sessionId: string;
  /** Oturumun BİZİM koyduğumuz başlığı — `ctrl+s` içinde aranan metin bu. */
  title: string;
  /** Bağın kurulduğu çalışma klasörü; veritabanı buna göre çözülüyor. */
  cwd: string;
  updatedAt: number;
}

// Sohbet geçmişinden AYRI bir dosya: bu kayıt kullanıcı verisi değil, ana
// sürecin uygulama detayı. `chat-sessions.json`'a koymak, çizici tarafın hiç
// kullanmadığı bir alanı her kayıtta oradan oraya taşımak olurdu (ve o
// dosyada tanınmayan alanların altı kez sessizce düştüğü yazıyor).
const MAX_BINDINGS = 200;

function storePath(): string {
  return path.join(app.getPath("userData"), "axet-session-bindings.json");
}

let cache: Map<string, AxetSessionBinding> | null = null;

function load(): Map<string, AxetSessionBinding> {
  if (cache) return cache;
  const map = new Map<string, AxetSessionBinding>();
  cache = map;
  const file = storePath();
  if (!existsSync(file)) return map;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // Bozuk dosya bir ARIZA DEĞİL: en kötü ihtimalle bağlar kaybolur ve
    // sohbetler bugünkü tohumlama davranışına döner. Sessizce boş başlıyoruz.
    return map;
  }
  if (!raw || typeof raw !== "object") return map;
  const entries = (raw as { bindings?: unknown }).bindings;
  if (!Array.isArray(entries)) return map;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const chatId = typeof e.chatId === "string" ? e.chatId : "";
    const sessionId = typeof e.sessionId === "string" ? e.sessionId : "";
    const title = typeof e.title === "string" ? e.title : "";
    const cwd = typeof e.cwd === "string" ? e.cwd : "";
    // Dördü de zorunlu: eksik bir kayıt "bağlan" diyip nereye bağlanacağını
    // söylemeyen bir kayıt olurdu.
    if (!chatId || !sessionId || !title || !cwd) continue;
    map.set(chatId, {
      sessionId,
      title,
      cwd,
      updatedAt: typeof e.updatedAt === "number" && Number.isFinite(e.updatedAt) ? e.updatedAt : 0
    });
  }
  return map;
}

function persist(map: Map<string, AxetSessionBinding>): void {
  // Tavan EN ESKİDEN kırpılıyor: bu dosya sohbet başına bir satır büyüyor ve
  // silinen sohbetlerin kaydını kimse temizlemiyor.
  const all = [...map.entries()].sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  const kept = all.slice(0, MAX_BINDINGS);
  if (kept.length !== all.length) {
    map.clear();
    for (const [chatId, binding] of kept) map.set(chatId, binding);
  }
  const file = storePath();
  const tmp = `${file}.tmp`;
  const payload = JSON.stringify(
    { bindings: kept.map(([chatId, binding]) => ({ chatId, ...binding })) },
    null,
    2
  );
  try {
    // Önce geçici dosya, sonra takas: yazma sırasında uygulama kapanırsa
    // yarım bir JSON kalmıyor.
    writeFileSync(tmp, payload, "utf8");
    if (existsSync(file)) unlinkSync(file);
    renameSync(tmp, file);
  } catch {
    // Diske yazamamak bağı KAYBETTİRİR ama hiçbir şeyi bozmaz: bir sonraki
    // açılışta sohbet eski yoldan, geçmişi tohumlayarak devam eder.
  }
}

export function readBinding(chatId: string): AxetSessionBinding | null {
  if (!chatId) return null;
  return load().get(chatId) ?? null;
}

export function writeBinding(chatId: string, binding: Omit<AxetSessionBinding, "updatedAt">): void {
  if (!chatId || !binding.sessionId || !binding.title || !binding.cwd) return;
  const map = load();
  map.set(chatId, { ...binding, updatedAt: Date.now() });
  persist(map);
}

export function clearBinding(chatId: string): void {
  if (!chatId) return;
  const map = load();
  if (!map.delete(chatId)) return;
  persist(map);
}

/**
 * Oturum başlığına eklenen TEKİL ek — `ctrl+s` arama kutusuna yazılan metin.
 *
 * Oturumun kendi başlığı KORUNUYOR, ek onun sonuna geliyor: kullanıcı kendi
 * terminalinden `ctrl+s` açtığında oturumlarını hâlâ tanıyabilmeli. Bütün
 * başlıkları kimliğe çevirmek o ekranı kullanılamaz hâle getirirdi.
 *
 * `ax` ÖNEKİ ŞART. Ek olmadan, yalnız rakamla başlayan sekiz hane bulanık
 * aramada başka başlıkların içindeki rakamlara da denk gelirdi; harfle
 * başlayan bir ek, oturum başlıklarında doğal olarak bulunmuyor.
 *
 * Harf/rakam DIŞI her şey atılıyor: bu metin TUI'nin arama kutusuna
 * yazılacak ve `/`, `@`, `%` gibi karakterler orada menü açıyor (bkz.
 * escapeTuiMenus).
 */
export function bindingTag(chatId: string): string {
  return `ax${chatId.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toLowerCase()}`;
}
