import { app } from "electron";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AxetChatActivity,
  ChatAttachment,
  ChatProject,
  ChatSessionsLoadResult,
  ChatSessionsState,
  StoredChatMessage,
  StoredChatSession
} from "../shared/types";

// axet.code sohbet geçmişinin diskteki evi. Faz 2'ye kadar sohbetler SADECE
// React state'inde yaşıyordu — uygulamayı kapatmak tüm konuşmaları siliyordu
// ve bunun için hiçbir uyarı yoktu. Burası `config.json`'dan AYRI bir dosya
// (gerekçe: bkz. shared/types.ts'teki StoredChatSession notu).

// Üst sınırlar. Sohbet geçmişi doğası gereği sınırsız büyür; bir tavan
// olmadan dosya sessizce onlarca megabayta çıkar ve açılışta okunması
// gözle görülür bir gecikme yaratır. Kesme EN ESKİDEN yapılıyor.
const MAX_SESSIONS = 60;
const MAX_MESSAGES_PER_SESSION = 400;
// Tek bir mesajın metni de sınırlı: bir ajan cevabı (örn. büyük bir dosya
// dökümü) tek başına megabaytlarca olabiliyor.
const MAX_MESSAGE_CHARS = 200_000;
// Ek sayısı da sınırlı: sürükle-bırak tek seferde yüzlerce dosya
// bırakabiliyor. Ekin KENDİSİ burada tutulmuyor (sadece diskteki yolu), yani
// bu sınır dosya boyutuyla değil, listenin makul kalmasıyla ilgili.
const MAX_ATTACHMENTS = 20;
// Bir cevaba iliştirilen araç dökümünün üst sınırları. Tek bir turda 40'tan
// fazla araç çalıştığı görülmedi; çıktı ve fark main tarafında zaten 4000
// karakterde kırpılıyor (axetChatTui.ts), buradaki kırpma o katman
// atlandığında (elle düzenlenmiş dosya) devreye giren ikinci kapı.
const MAX_STEPS_PER_MESSAGE = 40;
const MAX_STEP_DETAIL_CHARS = 4_000;
// Proje sayısı ve proje talimatının uzunluğu. Talimat HER sohbetin ilk
// mesajına eklendiği için sınırsız olamaz: 20 bin karakterlik bir talimat
// projedeki her sohbetin ilk turunu tek başına şişirirdi.
const MAX_PROJECTS = 40;
const MAX_PROJECT_INSTRUCTION_CHARS = 8_000;
const MAX_PROJECT_NAME_CHARS = 80;

function storePath(): string {
  return path.join(app.getPath("userData"), "chat-sessions.json");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// Diskten gelen veri BİR KEZ bile doğrulanmadan React'e verilirse, elle
// düzenlenmiş/yarım yazılmış bir dosya render sırasında (örn. `messages.map`
// bir dizi değilse) tüm ekranı çökertir. Her alan tek tek süzülüyor.
// Ekler bu süzgeçten GEÇİRİLMEZSE diskte hiç yer almıyorlar: aşağıdaki iki
// fonksiyon nesneyi alan alan YENİDEN KURUYOR, kopyalamıyor. `attachments`
// tiplere eklendiği hâlde buraya eklenmediği için, gönderilmiş bir mesajın
// görseli kaydetmede ve okumada sessizce düşüyordu — kullanıcı bunu
// "sohbet geçmişinde eklediğim görsel silinmiş oluyor" diye bildirdi
// (2026-09-02). Alan alan kurmanın bedeli budur; yeni bir alan eklendiğinde
// BURAYA da eklenmeli.
function sanitizeAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const filePath = asString(a.path);
    // Yolu olmayan bir ek işe yaramaz: ne önizlemesi okunabilir ne de
    // ajana verilebilir.
    if (!filePath) continue;
    out.push({
      id: asString(a.id) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      path: filePath,
      name: asString(a.name) || path.basename(filePath)
    });
    if (out.length >= MAX_ATTACHMENTS) break;
  }
  return out;
}

// Cevabın altındaki araç dökümü. Tıpkı `attachments` gibi, bu süzgece
// eklenmediği için diske HİÇ yazılmıyordu: `AxetChatActivity` tipe ve
// `StoredChatMessage`'a eklenmişti, `sanitizeMessage` ise nesneyi alan alan
// yeniden kurduğu için alanı sessizce düşürüyordu (2026-09-05, geçmiş
// dosyasında `steps` taşıyan tek mesaj yoktu). Yukarıdaki uyarının ikinci
// kez gerçekleşmesi.
function sanitizeSteps(raw: unknown): AxetChatActivity[] {
  if (!Array.isArray(raw)) return [];
  const out: AxetChatActivity[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    // Yalnızca araç çağrıları saklanıyor: "düşünüyor"/"bağlanıyor" gibi
    // geçici aşamaların cevap tamamlandıktan sonra anlamı yok.
    if (s.phase !== "tool") continue;
    const tool = asString(s.tool);
    if (!tool) continue;
    const output = asString(s.output);
    const diff = asString(s.diff);
    out.push({
      phase: "tool",
      tool,
      ...(asString(s.callId) ? { callId: asString(s.callId) } : {}),
      ...(asString(s.target) ? { target: asString(s.target) } : {}),
      ...(asString(s.result) ? { result: asString(s.result) } : {}),
      ...(typeof s.extraLines === "number" && s.extraLines > 0 ? { extraLines: s.extraLines } : {}),
      ...(output ? { output: output.slice(0, MAX_STEP_DETAIL_CHARS) } : {}),
      ...(diff ? { diff: diff.slice(0, MAX_STEP_DETAIL_CHARS) } : {}),
      ...(s.failed === true ? { failed: true } : {})
    });
    if (out.length >= MAX_STEPS_PER_MESSAGE) break;
  }
  return out;
}

function sanitizeMessage(raw: unknown): StoredChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const role = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
  if (!role) return null;
  const content = asString(m.content);
  const attachments = sanitizeAttachments(m.attachments);
  const steps = sanitizeSteps(m.steps);
  return {
    id: asString(m.id) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content: content.length > MAX_MESSAGE_CHARS ? content.slice(0, MAX_MESSAGE_CHARS) : content,
    ...(m.error === true ? { error: true } : {}),
    ...(steps.length > 0 ? { steps } : {}),
    // Boş dizi YAZILMIYOR: ekler isteğe bağlı ve sohbetlerin büyük çoğunluğu
    // eksiz — her mesaja `"attachments": []` eklemek dosyayı şişirirdi.
    ...(attachments.length > 0 ? { attachments } : {}),
    createdAt: asNumber(m.createdAt, Date.now())
  };
}

function sanitizeSession(raw: unknown): StoredChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const id = asString(s.id);
  if (!id) return null;
  const messages = Array.isArray(s.messages)
    ? (s.messages.map(sanitizeMessage).filter(Boolean) as StoredChatMessage[]).slice(-MAX_MESSAGES_PER_SESSION)
    : [];
  const model =
    s.model && typeof s.model === "object" && typeof (s.model as Record<string, unknown>).model === "string"
      ? (s.model as StoredChatSession["model"])
      : null;
  const createdAt = asNumber(s.createdAt, Date.now());
  // Gönderilmemiş taslak ekleri — taslak metniyle aynı mantık.
  const attachments = sanitizeAttachments(s.attachments);
  // Sohbetin hangi SAP sistemine ait olduğu. Yukarıdaki uyarının ÜÇÜNCÜ kez
  // gerçekleşmesiydi (2026-09-06): `cwd`/`sapLabel` hem tipe hem renderer'a
  // eklenmişti, buraya eklenmediği için kaydetmede DE okumada DA sessizce
  // düşüyordu — uygulama kapanınca her sohbet "sistemsiz" hâle geliyordu.
  // `cwd` sadece bir etiket değil: ajanın çalışma klasörü VE sohbetin hangi
  // sisteme ait olduğunun tek kalıcı anahtarı (sistem uuid'si sohbette yok).
  const cwd = asString(s.cwd);
  const sapLabel = asString(s.sapLabel);
  // Aynı tuzağın DÖRDÜNCÜSÜ olmaması için: proje aidiyeti de burada.
  const projectId = asString(s.projectId);
  return {
    id,
    title: asString(s.title, "…"),
    messages,
    model,
    draft: asString(s.draft),
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(cwd ? { cwd } : {}),
    ...(sapLabel ? { sapLabel } : {}),
    ...(projectId ? { projectId } : {}),
    createdAt,
    updatedAt: asNumber(s.updatedAt, createdAt)
  };
}

function sanitizeProject(raw: unknown): ChatProject | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = asString(p.id);
  if (!id) return null;
  const createdAt = asNumber(p.createdAt, Date.now());
  return {
    id,
    // Adsız bir proje kenar çubuğunda tıklanamaz bir boşluk olurdu.
    name: asString(p.name).slice(0, MAX_PROJECT_NAME_CHARS) || "Proje",
    instructions: asString(p.instructions).slice(0, MAX_PROJECT_INSTRUCTION_CHARS),
    createdAt,
    updatedAt: asNumber(p.updatedAt, createdAt)
  };
}

function sanitizeProjects(raw: unknown): ChatProject[] {
  if (!Array.isArray(raw)) return [];
  return (raw.map(sanitizeProject).filter(Boolean) as ChatProject[]).slice(0, MAX_PROJECTS);
}

const EMPTY: ChatSessionsState = { activeId: null, sessions: [], projects: [] };

export function loadChatSessions(): ChatSessionsLoadResult {
  const file = storePath();
  if (!existsSync(file)) return { ok: true, state: EMPTY };
  let text: string;
  try {
    text = readFileSync(file, "utf-8");
  } catch (err) {
    return { ok: false, state: EMPTY, error: (err as Error).message };
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const sessions = Array.isArray(parsed.sessions)
      ? (parsed.sessions.map(sanitizeSession).filter(Boolean) as StoredChatSession[]).slice(-MAX_SESSIONS)
      : [];
    const rawActive = asString(parsed.activeId);
    return {
      ok: true,
      state: {
        // Kayıtlı aktif sohbet artık listede yoksa (kesme sırasında düşmüş
        // olabilir) null'a çekiliyor — aksi hâlde açılışta var olmayan bir
        // sohbet seçili görünür ve sağ taraf boş kalırdı.
        activeId: sessions.some((s) => s.id === rawActive) ? rawActive : null,
        sessions,
        projects: sanitizeProjects(parsed.projects)
      }
    };
  } catch (err) {
    // Bozuk JSON. Dosyayı SESSİZCE ezmiyoruz — kullanıcının aylarca birikmiş
    // sohbet geçmişi olabilir ve bir sonraki kayıt onu kalıcı olarak yok
    // ederdi. Kenara alınıp adı bildiriliyor.
    const backup = `${file}.corrupt-${Date.now()}`;
    try {
      renameSync(file, backup);
    } catch {
      // yeniden adlandırma da olmadıysa yapılacak bir şey yok
    }
    return { ok: false, state: EMPTY, recoveredFrom: backup, error: (err as Error).message };
  }
}

export function saveChatSessions(state: ChatSessionsState): { ok: boolean; error?: string } {
  const file = storePath();
  const sessions = (Array.isArray(state?.sessions) ? state.sessions : [])
    .map(sanitizeSession)
    .filter(Boolean) as StoredChatSession[];
  const trimmed = sessions.slice(-MAX_SESSIONS);
  const projects = sanitizeProjects(state?.projects);
  const payload = JSON.stringify(
    {
      version: 1,
      activeId: trimmed.some((s) => s.id === state?.activeId) ? state.activeId : null,
      sessions: trimmed,
      projects
    },
    null,
    2
  );

  // ATOMİK yazma (önce .tmp, sonra rename). Doğrudan `writeFileSync(file)`
  // yazarken uygulama kapanır/çökerse dosya yarım kalır ve TÜM sohbet
  // geçmişi okunamaz hâle gelir. rename aynı disk bölümünde atomiktir.
  const tmp = `${file}.tmp`;
  try {
    writeFileSync(tmp, payload, "utf-8");
    renameSync(tmp, file);
    return { ok: true };
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // temizlik başarısız olsa da asıl hatayı bildir
    }
    return { ok: false, error: (err as Error).message };
  }
}
