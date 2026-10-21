// `ntt-team memory …` komutları (Tur 5). Betik (ntt-team.ps1) argümanları
// olduğu gibi köprüye yollar; ayrıştırma ve çıktı burada, saf ve test edilir.
//
//   ntt-team memory add "<baslik>" "<govde>" [--tur karar] [--etiket a,b] [--ben]
//   ntt-team memory search "<sorgu>" [--ben]
//   ntt-team memory get "<baslik|kimlik>"
//   ntt-team memory link "<baslik A>" "<baslik B>"
//   ntt-team memory update "<baslik|kimlik>" "<ek metin>" [--etiket a,b] [--gorev og-…]
//   ntt-team memory list [--ben]
//   ntt-team memory add … --genel   (Tur 13: ekipler arası ortak Genel bellek;
//                                     search/get genel notları da bulur, "genel" işaretli)
//
// `--gorev <og-…>`: öğrenme görevinin (learnTasks.ts) yazdığı not o göreve
// işaretlenir (add: kaynak görev; update: notun `tasks` listesi); Bellek ekranı
// YALNIZ bu işarete göre sayar, geri alma yalnız göreve işaretli eklenenleri siler.
//
// Varsayılan kapsam ekip belleği; `--ben` ajanın kendi belleği.
import {
  NOTE_KINDS,
  backlinks,
  extractLinks,
  findNote,
  isNoteKind,
  normalizeTags,
  searchNotes,
  TEAM_OWNER,
  asGeneralNote,
  withLink,
  type MemoryNote,
  type NoteInput,
  type NotePatch,
  type NoteResult
} from "./memoryNotes";
import { isLearnTaskId } from "./learnTasks";

export interface MemoryCommandStore {
  list(): MemoryNote[];
  add(input: NoteInput): NoteResult;
  update(id: string, patch: NotePatch): NoteResult;
  /** Tur 13: ekipler arası ortak Genel bellek (yoksa --genel kapalı). */
  general?: Pick<MemoryCommandStore, "list" | "add">;
}

export interface MemoryCommandCaller {
  paneId: string;
  name: string;
}

export interface MemoryCommandOutput {
  status: number;
  text: string;
  changed: boolean;
  /** Tur 13: Genel bellek değişti. */
  changedGeneral?: boolean;
}

export const MEMORY_USAGE = [
  "Kullanim:",
  '  ntt-team memory add "<baslik>" "<govde>" [--tur karar|olgu|kisi|gorev|ogrenim|not] [--etiket a,b] [--ben]',
  '  ntt-team memory search "<sorgu>" [--ben]',
  '  ntt-team memory get "<baslik|kimlik>"',
  '  ntt-team memory link "<baslik A>" "<baslik B>"',
  '  ntt-team memory update "<baslik|kimlik>" "<ek metin>" [--etiket a,b]',
  "  ntt-team memory list [--ben]",
  '  ntt-team memory add "<baslik>" "<govde>" --genel   (tum ekiplerin gordugu Genel bellek; search/get genel notlari da bulur)',
  "Varsayilan ekip bellegi; --ben kendi bellegin. Govdede [[baslik]] baska nota baglar. Sifre/token yazma."
].join("\n");

const ARGS_MAX = 40;
const ARG_MAX = 8_200;

/** cmd/PowerShell'den gelen argümanlar: dize olmayan atılır, kenardaki tırnaklar kırpılır. */
export function cleanArgs(raw: unknown): string[] {
  const list = typeof raw === "string" ? [raw] : raw;
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, ARGS_MAX)
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.slice(0, ARG_MAX).trim().replace(/^"+|"+$/g, "").trim())
    .filter((a) => a.length > 0);
}

interface Parsed {
  positional: string[];
  flags: Map<string, string | true>;
}

const VALUE_FLAGS = new Set(["tur", "kind", "etiket", "tags", "tag", "gorev", "task"]);

function parse(args: readonly string[]): Parsed {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const match = /^--?([a-z]+)(?:=(.*))?$/i.exec(arg);
    if (!match) {
      positional.push(arg);
      continue;
    }
    const name = match[1].toLowerCase();
    if (match[2] !== undefined) flags.set(name, match[2]);
    else if (VALUE_FLAGS.has(name) && i + 1 < args.length) flags.set(name, args[++i]);
    else flags.set(name, true);
  }
  return { positional, flags };
}

const flagText = (p: Parsed, ...names: string[]): string | undefined => {
  for (const name of names) {
    const v = p.flags.get(name);
    if (typeof v === "string") return v;
  }
  return undefined;
};
const mine = (p: Parsed) => p.flags.has("ben") || p.flags.has("me");
const general = (p: Parsed) => p.flags.has("genel") || p.flags.has("general");
/** Genel notlar (işaretli); okunamazsa boş. */
const generalNotes = (store: MemoryCommandStore): MemoryNote[] => {
  try {
    return (store.general?.list() ?? []).map(asGeneralNote);
  } catch {
    return [];
  }
};

const ownerLabel = (note: MemoryNote, caller: MemoryCommandCaller) =>
  note.owner === TEAM_OWNER ? "ekip" : note.owner === caller.paneId ? "sen" : note.ownerName ?? note.owner;

const line = (note: MemoryNote, caller: MemoryCommandCaller) =>
  `[${note.id}] ${note.title} (${note.kind}, ${ownerLabel(note, caller)}${note.tags.length ? `, #${note.tags.join(" #")}` : ""})`;

const out = (status: number, text: string, changed = false): MemoryCommandOutput => ({ status, text, changed });

const REASON: Record<string, string> = {
  invalid: "Not gecersiz (baslik bos ya da cok uzun).",
  full: "Bellek dolu (en cok 2000 not); eski notlari kullanici Bellek ekranindan silebilir.",
  tooLarge: "Bellek dosyasi sinirina ulasildi; not eklenmedi.",
  missing: "Not bulunamadi.",
  changed: "Not bu arada degisti; yeniden dene.",
  writeFailed: "Bellek diske yazilamadi."
};

/** Ajanın görebildiği notlar: ekip + kendi (başka ajanın özel notu değil). */
const visible = (notes: readonly MemoryNote[], caller: MemoryCommandCaller) =>
  notes.filter((n) => n.owner === TEAM_OWNER || n.owner === caller.paneId);

export function runMemoryCommand(rawArgs: unknown, caller: MemoryCommandCaller, store: MemoryCommandStore): MemoryCommandOutput {
  const args = cleanArgs(rawArgs);
  const sub = (args[0] ?? "").toLowerCase();
  const p = parse(args.slice(1));
  switch (sub) {
    case "add": {
      const [title, ...rest] = p.positional;
      if (!title) return out(400, MEMORY_USAGE);
      const kind = flagText(p, "tur", "kind");
      if (kind !== undefined && !isNoteKind(kind)) return out(400, `Bilinmeyen tur "${kind}". Turler: ${NOTE_KINDS.join(", ")}`);
      const own = mine(p);
      const task = flagText(p, "gorev", "task");
      if (task !== undefined && !isLearnTaskId(task)) return out(400, `Gecersiz gorev kimligi "${task}".`);
      if (general(p)) {
        if (!store.general) return out(404, "Genel bellek kapali.");
        const shared = store.general.add({ title, body: rest.join("\n"), kind: kind ?? "not", tags: flagText(p, "etiket", "tags", "tag") ?? [], owner: TEAM_OWNER, source: { type: "agent", name: caller.name } });
        if (!shared.ok) return out(shared.reason === "invalid" ? 400 : 409, REASON[shared.reason] ?? shared.reason);
        return { ...out(200, `Kaydedildi (genel): ${line(asGeneralNote(shared.note), caller)}`), changedGeneral: true };
      }
      const result = store.add({
        title,
        body: rest.join("\n"),
        kind: kind ?? "not",
        tags: flagText(p, "etiket", "tags", "tag") ?? [],
        owner: own ? caller.paneId : TEAM_OWNER,
        ...(own ? { ownerName: caller.name } : {}),
        source: task ? { type: "task", name: caller.name, ref: task } : { type: "agent", name: caller.name }
      });
      if (!result.ok) return out(result.reason === "invalid" ? 400 : 409, REASON[result.reason] ?? result.reason);
      return out(200, `Kaydedildi: ${line(result.note, caller)}`, true);
    }
    case "search":
    case "ara": {
      const query = p.positional.join(" ");
      if (!query) return out(400, MEMORY_USAGE);
      const pool = [...visible(store.list(), caller), ...generalNotes(store)].filter((n) => !mine(p) || n.owner === caller.paneId);
      const hits = searchNotes(pool, query, 8);
      if (hits.length === 0) return out(200, `Bellekte "${query}" bulunamadi.`);
      return out(200, [`${hits.length} sonuc:`, ...hits.map((h) => `${line(h.note, caller)}${h.snippet ? `\n    ${h.snippet}` : ""}`)].join("\n"));
    }
    case "get":
    case "oku": {
      const ref = p.positional.join(" ");
      if (!ref) return out(400, MEMORY_USAGE);
      const own = visible(store.list(), caller);
      const shared = generalNotes(store);
      const notes = [...own, ...shared];
      const note = findNote(own, ref) ?? findNote(shared, ref);
      if (!note) return out(404, `"${ref}" adli not yok. Ara: ntt-team memory search "<sorgu>"`);
      const links = extractLinks(note.body);
      const back = backlinks(notes, note).map((n) => n.title);
      return out(
        200,
        [
          line(note, caller),
          `Guncelleme: ${new Date(note.updated).toISOString()}${note.source?.name ? ` · kaynak: ${note.source.name}` : ""}`,
          "",
          note.body || "(govde bos)",
          ...(links.length ? ["", `Baglantilar: ${links.join(", ")}`] : []),
          ...(back.length ? [`Geri baglantilar: ${back.join(", ")}`] : [])
        ].join("\n")
      );
    }
    case "link":
    case "bagla": {
      const [a, b] = p.positional;
      if (!a || !b) return out(400, MEMORY_USAGE);
      const notes = visible(store.list(), caller);
      const from = findNote(notes, a);
      const to = findNote(notes, b);
      if (!from || !to) return out(404, `Not bulunamadi: ${!from ? a : b}`);
      if (from.id === to.id) return out(400, "Not kendine baglanamaz.");
      const body = withLink(from, to);
      if (body === from.body) return out(200, `Zaten bagli: ${from.title} → ${to.title}`);
      const result = store.update(from.id, { body });
      if (!result.ok) return out(409, REASON[result.reason] ?? result.reason);
      return out(200, `Baglandi: ${from.title} → ${to.title}`, true);
    }
    case "update":
    case "guncelle": {
      const [ref, ...rest] = p.positional;
      const extra = rest.join("\n").trim();
      if (!ref || !extra) return out(400, MEMORY_USAGE);
      const note = findNote(visible(store.list(), caller), ref);
      if (!note) return out(404, `"${ref}" adli not yok. Yeni not: ntt-team memory add`);
      const task = flagText(p, "gorev", "task");
      if (task !== undefined && !isLearnTaskId(task)) return out(400, `Gecersiz gorev kimligi "${task}".`);
      const tagText = flagText(p, "etiket", "tags", "tag");
      const patch: NotePatch = { body: note.body ? `${note.body}\n\n${extra}` : extra, ...(task ? { task } : {}) };
      if (tagText) patch.tags = normalizeTags([...note.tags, ...normalizeTags(tagText)]);
      const result = store.update(note.id, patch);
      if (!result.ok) return out(409, REASON[result.reason] ?? result.reason);
      return out(200, `Guncellendi: ${line(result.note, caller)}`, true);
    }
    case "list":
    case "liste": {
      const pool = visible(store.list(), caller)
        .filter((n) => !mine(p) || n.owner === caller.paneId)
        .sort((x, y) => y.updated - x.updated)
        .slice(0, 15);
      if (pool.length === 0) return out(200, "Bellek bos.");
      return out(200, pool.map((n) => line(n, caller)).join("\n"));
    }
    default:
      return out(sub ? 400 : 200, MEMORY_USAGE);
  }
}
