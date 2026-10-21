// Bellek notları — "ikinci beyin" (Tur 5). Saf mantık: ana süreç (kalıcılık,
// ekip köprüsü) ve renderer (Bellek haritası) aynı kuralları kullanıyor.
//
// Ajan başına markdown belleği (memoryLogic.ts, alan kökünde) olduğu gibi
// duruyor; bu modül onun ÜSTÜNE yapılandırılmış notlar ekliyor: ekip belleği
// (owner "") ve ajan belleği (owner = ajanın bölme kimliği). Not = başlık,
// gövde (markdown), tür, etiketler, kaynak, tarih ve gövdedeki [[bağlantı]]lar.
// Dosyaya dokunan hiçbir şey burada yok (bkz. main/memoryNotesStore.ts).

export const NOTE_KINDS = ["karar", "olgu", "kisi", "gorev", "ogrenim", "not"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 8_000;
export const NOTE_TAGS_MAX = 12;
export const NOTE_TAG_MAX = 32;
/** Ekip başına not sınırı; dolunca en eski güncellenen değil, ekleme reddedilir (veri kaybı yok). */
export const NOTES_MAX = 2_000;
/** Ekip dosyasının bayt sınırı. */
export const NOTES_FILE_MAX = 4 * 1024 * 1024;
export const TEAM_OWNER = "";
/** Tur 13: ekipler arası ortak "Genel" bellek: dosya kimliği (memory-notes/genel.json). */
export const GENERAL_MEMORY_ID = "genel";
/** Tur 13: ekranda ve komut çıktısında genel notun sahip işareti (diskte owner ""). */
export const GENERAL_OWNER = "genel:";

/** Genel notun ekip görünümündeki kopyası (işaretli). */
export function asGeneralNote(note: MemoryNote): MemoryNote {
  return { ...note, owner: GENERAL_OWNER, ownerName: "genel" };
}

export type NoteSourceType = "user" | "agent" | "flow" | "task";
export interface NoteSource {
  type: NoteSourceType;
  /** Kaynak ajanın ya da görevin adı (okunur). */
  name?: string;
  /** Akış olayı / görev kimliği. */
  ref?: string;
}

export interface MemoryNote {
  id: string;
  title: string;
  body: string;
  kind: NoteKind;
  tags: string[];
  /** "" = ekip belleği; aksi hâlde ajanın bölme kimliği. */
  owner: string;
  /** Sahip ajanın adı (bölme kapansa da okunur kalsın). */
  ownerName?: string;
  source?: NoteSource;
  /** Notu güncelleyen öğrenme görevleri (`memory update --gorev`); görev sayımı yalnız bu işarete dayanır. */
  tasks?: string[];
  created: number;
  updated: number;
}

export interface NoteInput {
  title: string;
  body?: string;
  kind?: string;
  tags?: readonly string[] | string;
  owner?: string;
  ownerName?: string;
  source?: NoteSource;
}

export type NotePatch = Partial<Pick<MemoryNote, "title" | "body" | "kind" | "tags" | "owner" | "ownerName">> & {
  /** Güncellemeyi yapan öğrenme görevi (`--gorev`); notun `tasks` listesine eklenir. */
  task?: string;
};

export type NoteFailure = "invalid" | "full" | "tooLarge" | "missing" | "changed" | "writeFailed";
export type NoteResult = { ok: true; note: MemoryNote } | { ok: false; reason: NoteFailure };

type Scrub = (text: string) => string;
const identity: Scrub = (text) => text;

const ID_RE = /^n-[a-z0-9]{4,24}$/;
const SOURCE_TYPES: readonly NoteSourceType[] = ["user", "agent", "flow", "task"];

export const isNoteKind = (value: unknown): value is NoteKind =>
  typeof value === "string" && (NOTE_KINDS as readonly string[]).includes(value);
export const isNoteId = (value: unknown): value is string => typeof value === "string" && ID_RE.test(value);

// C0/DEL/C1 (satır sonu ve sekme hariç) gövdeden; başlık ve etikette hepsi.
const stripControls = (text: string, keepNewlines: boolean): string =>
  Array.from(text, (ch) => {
    const n = ch.codePointAt(0) ?? 0;
    if (keepNewlines && (ch === "\n" || ch === "\t")) return ch;
    return n < 0x20 || (n >= 0x7f && n <= 0x9f) || n === 0x2028 || n === 0x2029 ? " " : ch;
  }).join("");

const clip = (text: string, max: number): string => {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join("") : text;
};

export function cleanTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return clip(stripControls(raw, false).replace(/\s+/g, " ").trim(), NOTE_TITLE_MAX).trim();
}

export function cleanBody(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return clip(stripControls(raw.replace(/\r\n?/g, "\n"), true), NOTE_BODY_MAX).replace(/\s+$/, "");
}

const TURKISH_LETTER_RE = /[ÇĞİÖŞÜçğıöşü]/;
/**
 * Kelime küçük harfe: Türkçe harfli kelimede Türkçe kural ("IŞIK" → "ışık",
 * "İŞLEM" → "işlem"), aksi hâlde yerelden bağımsız ("FI" → "fi", "fı" değil).
 */
const lowerWord = (word: string): string => (TURKISH_LETTER_RE.test(word) ? word.toLocaleLowerCase("tr-TR") : word.toLowerCase());

/** Etiket: küçük harf, baştaki # düşer, boşluk `-`, harf/rakam/-/_ dışı atılır. */
export function normalizeTag(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const tag = raw
    .trim()
    .replace(/^#+/, "")
    .replace(/\S+/g, lowerWord)
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clip(tag, NOTE_TAG_MAX);
}

export function normalizeTags(raw: unknown): string[] {
  const list = typeof raw === "string" ? raw.split(/[,\s]+/) : Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (const item of list) {
    const tag = normalizeTag(item);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= NOTE_TAGS_MAX) break;
  }
  return out;
}

/** Küçük harf, i/ı/İ/I hepsi "i" (Türkçe ve İngilizce aramada ikisi de tutsun); toLocaleLowerCase("tr-TR")'den çok hızlı (600 notlu grafta 3 sn → ms, ölçüldü). */
export const fold = (text: string) => text.toLowerCase().replace(/i\u0307/g, "i").replace(/ı/g, "i");

const LINK_RE = /\[\[([^[\]\n|]{1,120})(?:\|[^[\]\n]{0,120})?\]\]/g;

/** Gövdedeki [[bağlantı]] hedefleri (sıralı, tekil, kırpılmış; `[[a|takma]]` → a). */
export function extractLinks(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(LINK_RE)) {
    const target = match[1].replace(/\s+/g, " ").trim();
    const key = fold(target);
    if (!target || seen.has(key)) continue;
    seen.add(key);
    out.push(target);
  }
  return out;
}

/** Gövdeyi metin ve bağlantı parçalarına böler (ayrıntı panelinde tıklanabilir bağlantılar için). */
export function splitLinks(body: string): ({ text: string } | { link: string; label: string })[] {
  const parts: ({ text: string } | { link: string; label: string })[] = [];
  let last = 0;
  for (const match of body.matchAll(LINK_RE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: body.slice(last, at) });
    const target = match[1].replace(/\s+/g, " ").trim();
    const alias = match[0].includes("|") ? match[0].slice(match[0].indexOf("|") + 1, -2).trim() : "";
    parts.push({ link: target, label: alias || target });
    last = at + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}

function cleanSource(raw: unknown, scrub: Scrub): NoteSource | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  if (!SOURCE_TYPES.includes(value.type as NoteSourceType)) return undefined;
  const name = cleanTitle(typeof value.name === "string" ? scrub(value.name) : "").slice(0, 80);
  const ref = typeof value.ref === "string" ? value.ref.replace(/[^\w.:-]/g, "").slice(0, 64) : "";
  return { type: value.type as NoteSourceType, ...(name ? { name } : {}), ...(ref ? { ref } : {}) };
}

const TASK_ID_RE = /^og-[a-z0-9]{4,16}$/;
const NOTE_TASKS_MAX = 20;
const cleanTasks = (raw: unknown): string[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === "string" && TASK_ID_RE.test(x)))].slice(-NOTE_TASKS_MAX) : [];

const cleanOwner = (raw: unknown): string =>
  typeof raw === "string" && /^[\w.:-]{1,80}$/.test(raw) ? raw : TEAM_OWNER;

const finiteTime = (raw: unknown, fallback: number): number =>
  typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;

/** Diskten ya da IPC'den gelen bir kaydı doğrular; gizli süzgeci metinlere uygulanır. */
export function sanitizeNote(raw: unknown, scrub: Scrub = identity): MemoryNote | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (!isNoteId(value.id)) return null;
  const title = cleanTitle(typeof value.title === "string" ? scrub(value.title) : "");
  if (!title) return null;
  const created = finiteTime(value.created, 0);
  if (!created) return null;
  const ownerName = cleanTitle(typeof value.ownerName === "string" ? value.ownerName : "").slice(0, 80);
  const source = cleanSource(value.source, scrub);
  const owner = cleanOwner(value.owner);
  const tasks = cleanTasks(value.tasks);
  return {
    id: value.id,
    title,
    body: cleanBody(typeof value.body === "string" ? scrub(value.body) : ""),
    kind: isNoteKind(value.kind) ? value.kind : "not",
    tags: normalizeTags(value.tags),
    owner,
    ...(owner && ownerName ? { ownerName } : {}),
    ...(source ? { source } : {}),
    ...(tasks.length ? { tasks } : {}),
    created,
    updated: Math.max(created, finiteTime(value.updated, created))
  };
}

/** Dosya metni → notlar (bozuk kayıt atlanır, kimlik tekrarında ilk kalır, en çok NOTES_MAX). */
export function parseNotes(text: string, scrub: Scrub = identity): MemoryNote[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? (data as { notes?: unknown }).notes : null;
  if (!Array.isArray(list)) return [];
  const out: MemoryNote[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const note = sanitizeNote(raw, scrub);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    out.push(note);
    if (out.length >= NOTES_MAX) break;
  }
  return out;
}

export function serializeNotes(notes: readonly MemoryNote[]): string {
  return JSON.stringify({ version: 1, notes });
}

export function newNoteId(now: number, random: () => number = Math.random): string {
  const tail = Math.floor(random() * 36 ** 5).toString(36).padStart(5, "0");
  return `n-${now.toString(36)}${tail}`;
}

/** Girdi → yeni not (doğrulanmış). Başlık yoksa null. */
export function createNote(input: NoteInput, now: number, id: string, scrub: Scrub = identity): MemoryNote | null {
  return sanitizeNote(
    {
      id,
      title: input.title,
      body: input.body ?? "",
      kind: isNoteKind(input.kind) ? input.kind : "not",
      tags: input.tags ?? [],
      owner: input.owner ?? TEAM_OWNER,
      ownerName: input.ownerName,
      source: input.source,
      created: now,
      updated: now
    },
    scrub
  );
}

export function applyPatch(note: MemoryNote, patch: NotePatch, now: number, scrub: Scrub = identity): MemoryNote | null {
  return sanitizeNote(
    {
      ...note,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.owner !== undefined ? { owner: patch.owner, ownerName: patch.ownerName } : {}),
      ...(typeof patch.task === "string" && TASK_ID_RE.test(patch.task) ? { tasks: [...(note.tasks ?? []).filter((x) => x !== patch.task), patch.task] } : {}),
      updated: Math.max(now, note.updated)
    },
    scrub
  );
}


/** Başlık (büyük/küçük duyarsız) ya da kimlikle not; aynı başlıkta en son güncellenen. */
export function findNote(notes: readonly MemoryNote[], ref: string): MemoryNote | undefined {
  const value = ref.trim();
  if (!value) return undefined;
  const byId = notes.find((n) => n.id === value);
  if (byId) return byId;
  const key = fold(value.replace(/\s+/g, " "));
  let best: MemoryNote | undefined;
  for (const note of notes) if (fold(note.title) === key && (!best || note.updated > best.updated)) best = note;
  return best;
}

/** Bu nota [[bağlantı]] veren notlar. */
export function backlinks(notes: readonly MemoryNote[], target: MemoryNote): MemoryNote[] {
  const key = fold(target.title);
  return notes.filter((n) => n.id !== target.id && extractLinks(n.body).some((l) => fold(l) === key || l === target.id));
}

/** `from` notunun gövdesine `[[to]]` ekler (zaten varsa aynen). */
export function withLink(from: MemoryNote, to: MemoryNote): string {
  const key = fold(to.title);
  if (extractLinks(from.body).some((l) => fold(l) === key)) return from.body;
  return `${from.body}${from.body ? "\n" : ""}[[${to.title}]]`;
}

// ---------------------------------------------------------------- arama/süzgeç

export interface NoteHit {
  note: MemoryNote;
  score: number;
  snippet: string;
  /** Eşleşme yeri: başlık, etiket ya da gövde. */
  field: "title" | "tag" | "body";
}

const SNIPPET = 140;

function snippetOf(body: string, term: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const at = term ? fold(flat).indexOf(term) : -1;
  if (at < 0) return flat.length > SNIPPET ? `${flat.slice(0, SNIPPET - 1)}…` : flat;
  const start = Math.max(0, at - 40);
  const piece = flat.slice(start, start + SNIPPET);
  return `${start > 0 ? "…" : ""}${piece}${start + SNIPPET < flat.length ? "…" : ""}`;
}

/** Çok sözcüklü arama: her sözcük başlıkta, etikette ya da gövdede geçmeli (VE). */
export function searchNotes(notes: readonly MemoryNote[], query: string, limit = 50): NoteHit[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const hits: NoteHit[] = [];
  for (const note of notes) {
    const title = fold(note.title);
    const body = fold(note.body);
    let score = 0;
    let field: NoteHit["field"] = "body";
    let ok = true;
    for (const term of terms) {
      const tag = term.replace(/^#/, "");
      if (title === term) score += 100;
      else if (title.startsWith(term)) score += 60;
      else if (title.includes(term)) score += 40;
      else if (note.tags.some((t) => t === tag)) score += 30;
      else if (note.tags.some((t) => t.includes(tag))) score += 20;
      else if (body.includes(term)) score += 10;
      else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const first = terms[0];
    if (title.includes(first)) field = "title";
    else if (note.tags.some((t) => t.includes(first.replace(/^#/, "")))) field = "tag";
    hits.push({ note, score, field, snippet: snippetOf(note.body, field === "body" ? first : "") });
  }
  hits.sort((a, b) => b.score - a.score || b.note.updated - a.note.updated);
  return hits.slice(0, limit);
}

export interface NoteFilter {
  query?: string;
  kinds?: ReadonlySet<NoteKind>;
  /** Sahip kimlikleri ("" = ekip). */
  owners?: ReadonlySet<string>;
  tags?: ReadonlySet<string>;
}

export const filterActive = (filter: NoteFilter): boolean =>
  Boolean(filter.query?.trim()) || Boolean(filter.kinds?.size) || Boolean(filter.owners?.size) || Boolean(filter.tags?.size);

/** Süzgeçten geçen notlar; sorgu varsa arama sırasıyla, yoksa son güncellenen önce. */
export function filterNotes(notes: readonly MemoryNote[], filter: NoteFilter): MemoryNote[] {
  const pass = notes.filter(
    (n) =>
      (!filter.kinds?.size || filter.kinds.has(n.kind)) &&
      (!filter.owners?.size || filter.owners.has(n.owner)) &&
      (!filter.tags?.size || n.tags.some((t) => filter.tags?.has(t)))
  );
  if (filter.query?.trim()) return searchNotes(pass, filter.query, Number.MAX_SAFE_INTEGER).map((h) => h.note);
  return [...pass].sort((a, b) => b.updated - a.updated);
}

/** Notlardaki etiketler, kullanım sayısıyla (çok kullanılan önce). */
export function tagCounts(notes: readonly MemoryNote[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// ---------------------------------------------------------------- graf

export interface GraphAgent {
  id: string;
  name: string;
}

export type GraphNodeType = "note" | "agent" | "team" | "tag";
export interface GraphNode {
  /** "note:<id>", "agent:<paneId>", "team", "tag:<etiket>". */
  id: string;
  type: GraphNodeType;
  label: string;
  /** Not kimliği / bölme kimliği / etiket. */
  ref: string;
  kind?: NoteKind;
  owner?: string;
  degree: number;
}
export type GraphEdgeType = "link" | "owner" | "tag";
export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
}
export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const TEAM_NODE = "team";

/**
 * Notlardan graf: her not bir düğüm, sahibine (ajan ya da Ekip) bir kenar,
 * [[bağlantı]] başına bir kenar (çözülemeyen bağlantı atlanır), en az iki notta
 * geçen etiket bir düğüm. Düğüm sırası kararlı (yerleşim tohumu buna bağlı).
 */
export function buildGraph(notes: readonly MemoryNote[], agents: readonly GraphAgent[]): MemoryGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const index = new Map<string, GraphNode>();
  const add = (node: Omit<GraphNode, "degree">) => {
    const full = { ...node, degree: 0 };
    nodes.push(full);
    index.set(full.id, full);
    return full;
  };
  const edgeKeys = new Set<string>();
  const connect = (source: string, target: string, type: GraphEdgeType) => {
    if (source === target) return;
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (edgeKeys.has(key)) return;
    const a = index.get(source);
    const b = index.get(target);
    if (!a || !b) return;
    edgeKeys.add(key);
    edges.push({ source, target, type });
    a.degree += 1;
    b.degree += 1;
  };

  add({ id: TEAM_NODE, type: "team", label: "", ref: TEAM_OWNER });
  const agentIds = new Set(agents.map((a) => a.id));
  for (const agent of agents) add({ id: `agent:${agent.id}`, type: "agent", label: agent.name, ref: agent.id });
  // Kapanmış ajanın notları da sahipsiz kalmasın: adıyla bir ajan düğümü.
  for (const note of notes) {
    if (note.owner && !agentIds.has(note.owner) && !index.has(`agent:${note.owner}`)) {
      add({ id: `agent:${note.owner}`, type: "agent", label: note.ownerName ?? note.owner, ref: note.owner });
    }
  }
  const sorted = [...notes].sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
  for (const note of sorted) add({ id: `note:${note.id}`, type: "note", label: note.title, ref: note.id, kind: note.kind, owner: note.owner });
  // Bağlantı çözümü için dizin (findNote ile aynı kural: kimlik, sonra en son güncellenen başlık).
  const byId = new Map(notes.map((n) => [n.id, n] as const));
  const byTitle = new Map<string, MemoryNote>();
  for (const n of notes) {
    const key = fold(n.title);
    const prev = byTitle.get(key);
    if (!prev || n.updated > prev.updated) byTitle.set(key, n);
  }
  const counts = tagCounts(notes);
  for (const { tag, count } of counts) if (count >= 2) add({ id: `tag:${tag}`, type: "tag", label: `#${tag}`, ref: tag });

  for (const note of sorted) {
    const id = `note:${note.id}`;
    connect(note.owner ? `agent:${note.owner}` : TEAM_NODE, id, "owner");
    for (const link of extractLinks(note.body)) {
      const target = byId.get(link) ?? byTitle.get(fold(link.replace(/\s+/g, " ")));
      if (target) connect(id, `note:${target.id}`, "link");
    }
    for (const tag of note.tags) connect(id, `tag:${tag}`, "tag");
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------- başlangıç özeti

const KIND_RANK: Record<NoteKind, number> = { karar: 0, ogrenim: 1, olgu: 2, kisi: 3, gorev: 4, not: 5 };
const KIND_LABEL: Record<NoteKind, string> = {
  karar: "Karar",
  olgu: "Olgu",
  kisi: "Kisi/sistem",
  gorev: "Gorev",
  ogrenim: "Ogrenim",
  not: "Not"
};
export const DIGEST_MAX = 700;

/**
 * Ajan yeni oturum açınca verilen kısa bellek özeti: ekip notları ve ajanın
 * kendi notları, önce türe (karar > öğrenim > olgu…) sonra yeniliğe göre;
 * yalnız başlıklar, tek satır, en çok `max` karakter. Not yoksa "".
 */
export function memoryDigest(notes: readonly MemoryNote[], ownerId: string, max = DIGEST_MAX): string {
  const relevant = notes
    .filter((n) => n.owner === TEAM_OWNER || n.owner === ownerId)
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.updated - a.updated);
  if (relevant.length === 0) return "";
  const head = `[Ekip bellegi] ${relevant.length} not. Onemliler:`;
  const tail = ' Ayrinti: ntt-team memory search "<sorgu>" / get "<baslik>".';
  let out = head;
  let shown = 0;
  for (const note of relevant) {
    const title = note.title.replace(/[\s;]+/g, " ").trim();
    const piece = ` ${KIND_LABEL[note.kind]}: ${title};`;
    if (out.length + piece.length + tail.length > max) break;
    out += piece;
    shown += 1;
  }
  if (shown === 0) return "";
  return `${out}${tail}`;
}

// ---------------------------------------------------------------- akıştan not

export interface FlowNoteSource {
  kind: string;
  name: string;
  detail: string;
  reply?: string;
  paneId: string | null;
  id?: number | string;
}

/** Akış kartından not girdisi: cevap → olgu, soru → karar, doğrulanan görev → görev. */
export function noteFromFlow(event: FlowNoteSource): NoteInput | null {
  const text = (event.reply ?? event.detail ?? "").trim();
  if (!text) return null;
  const kind: NoteKind = event.kind === "asked" ? "karar" : event.kind === "verified" ? "gorev" : event.kind === "relay" ? "olgu" : "olgu";
  const firstLine = text.split("\n").find((l) => l.trim())?.replace(/^[#>*\-\s]+/, "") ?? text;
  const title = cleanTitle(firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine);
  const name = event.name.replace(/\s*→.*$/, "").trim();
  return {
    title: title || "Akış notu",
    body: text,
    kind,
    tags: [],
    owner: TEAM_OWNER,
    source: { type: event.kind === "verified" ? "task" : "flow", ...(name ? { name } : {}), ...(event.id !== undefined ? { ref: String(event.id) } : {}) }
  };
}
