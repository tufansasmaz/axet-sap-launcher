// İkinci beyin: otomatik yakalama (Tur 10, madde 8). SAF.
//
// Ölçüm: belleğe yalnız elle ("Belleğe ekle") ya da Öğren görevinden not düşüyordu;
// Akış mesajlarından ve biten işlerden hiçbir şey kendiliğinden eklenmiyordu.
// Kaynaklar: kullanıcının Akış mesajı (karar/kural) ve ajanın biten işinin son
// cevabı (karar/kural/öğrenim). Model çağrısı YOK: cümle düzeyinde işaret
// kelimeleri (TR/EN). Soru, kısa, kod ve gizli içeren cümle alınmıyor; metin
// başına en çok CAPTURE_PER_TEXT not. Benzer otomatik not güncelleniyor, elle
// yazılmış benzer nota dokunulmuyor.
import { cleanTitle, fold, TEAM_OWNER, type MemoryNote, type NoteInput, type NoteKind } from "./memoryNotes";

export const AUTO_TAG = "otomatik";
export const CAPTURE_PER_TEXT = 2;
const SENTENCE_MIN = 25;
const SENTENCE_MAX = 400;
const SIMILAR = 0.6;

const DECISION =
  /\b(karar(?:[ıi]m[ıi]z)? (?:verdik|verildi|ald[ıi]k)|karar:|kararla[sş]t[ıi]r|kullanaca[gğ][ıi]z|kullanal[ıi]m|tercih (?:ettik|ediyoruz)|se[cç]tik|bundan (?:b[oö]yle|sonra)|we (?:decided|will use|chose|agreed)|decision:|let'?s use|from now on)/i;
const RULE = /\b(her zaman|asla|kesinlikle|unutma|kural\b|kural:|always|never|must not|must|important:|[öo]nemli:)/i;
const LEARNING = /\b(k[öo]k neden|root cause|sebebi (?:ş|s)u|nedeni:|[cç][öo]z[üu]m:|[öo][gğ]rendim|learned|lesson:|workaround|fixed by)/i;
// Gizli olabilecek içerik: hiç yakalanmıyor (süzgeç notu bozmasın, gizli hiç yazılmasın).
const SECRET = /(password|passwd|parola|şifre|sifre|token|secret|api[_-]?key|bearer|authorization)\s*[:=]|eyJ[\w-]{10,}\.|\b(gh[pousr]_|sk-)[A-Za-z0-9_-]{12,}/i;
// Uygulamanın kendi işaretleri ve ekip aracı metni.
const OWN = /GOREV-SONUC|\[Mesaj\]|\[Gorev |\[G-[a-z0-9]{4}\]|Ekip araci|ntt-team |Lider hatirlatmasi|Sen ekip liderisin/i;
const CODE = /```|[{};]{2,}|=>|\(\)\s*\{|<\/?\w+>/;

export interface CaptureInput {
  source: "user" | "agent";
  text: string;
  /** Mesajı yazan ya da işi bitiren ajanın adı. */
  name: string;
  paneId?: string;
}

function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!])\s+(?=[A-ZÇĞİÖŞÜ0-9"'(])/u)
    .map((s) => s.replace(/^[#>*\-\s\d.)]+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function kindOf(sentence: string, source: CaptureInput["source"]): NoteKind | null {
  if (DECISION.test(sentence)) return "karar";
  if (source === "agent" && LEARNING.test(sentence)) return "ogrenim";
  if (RULE.test(sentence)) return "olgu";
  return null;
}

/** Metinden not adayları (en çok CAPTURE_PER_TEXT). */
export function captureCandidates(input: CaptureInput): NoteInput[] {
  // Kod blokları atılıyor (kapanmamış blok da sonuna kadar).
  const text = String(input.text ?? "").replace(/```[\s\S]*?(?:```|$)/g, " ");
  if (!text.trim()) return [];
  const out: NoteInput[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences(text)) {
    if (out.length >= CAPTURE_PER_TEXT) break;
    if (sentence.length < SENTENCE_MIN || sentence.length > SENTENCE_MAX) continue;
    if (/\?\s*$/.test(sentence) || SECRET.test(sentence) || OWN.test(sentence) || CODE.test(sentence)) continue;
    const kind = kindOf(sentence, input.source);
    if (!kind) continue;
    const key = captureKey(sentence);
    if (seen.has(key)) continue;
    seen.add(key);
    const title = cleanTitle(sentence.length > 100 ? `${sentence.slice(0, 99)}…` : sentence);
    const name = input.name.replace(/\s*→.*$/, "").trim();
    out.push({
      title,
      body: sentence,
      kind,
      tags: [AUTO_TAG],
      owner: TEAM_OWNER,
      source: { type: "flow", ...(name ? { name } : {}), ref: input.source === "user" ? "auto:kullanici" : "auto:ajan" }
    });
  }
  return out;
}

/** Karşılaştırma anahtarı: küçük harf, yalnız harf/rakam kelimeleri. */
export function captureKey(text: string): string {
  return fold(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(captureKey(text).split(" ").filter((w) => w.length >= 3));
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common += 1;
  return common / Math.min(a.size, b.size);
}

/** Aynı anlamdaki not (kelime örtüşmesi ≥ %60, kısa olana göre). */
export function similarNote(notes: readonly MemoryNote[], input: NoteInput): MemoryNote | null {
  const mine = tokens(`${input.title} ${input.body ?? ""}`);
  let best: { note: MemoryNote; score: number } | null = null;
  for (const n of notes) {
    if (n.owner !== (input.owner ?? TEAM_OWNER)) continue;
    const score = overlap(mine, tokens(`${n.title} ${n.body.slice(0, 400)}`));
    if (score >= SIMILAR && (!best || score > best.score)) best = { note: n, score };
  }
  return best?.note ?? null;
}

export type CapturePlan = { action: "add" } | { action: "update"; id: string } | { action: "skip" };

/** Benzer otomatik not → güncelle; benzer elle yazılmış not → dokunma; yoksa ekle. */
export function planCapture(notes: readonly MemoryNote[], input: NoteInput): CapturePlan {
  const similar = similarNote(notes, input);
  if (!similar) return { action: "add" };
  return similar.tags.includes(AUTO_TAG) ? { action: "update", id: similar.id } : { action: "skip" };
}
