import { describe, expect, it } from "vitest";
import {
  backlinks,
  buildGraph,
  cleanBody,
  cleanTitle,
  createNote,
  extractLinks,
  filterNotes,
  findNote,
  memoryDigest,
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
  NOTES_MAX,
  noteFromFlow,
  normalizeTag,
  normalizeTags,
  parseNotes,
  sanitizeNote,
  searchNotes,
  serializeNotes,
  splitLinks,
  tagCounts,
  withLink,
  type MemoryNote
} from "../app-electron/shared/memoryNotes";

let seq = 0;
function note(over: Partial<MemoryNote> & { title: string }): MemoryNote {
  seq += 1;
  return {
    id: `n-test${String(seq).padStart(4, "0")}`,
    body: "",
    kind: "not",
    tags: [],
    owner: "",
    created: 1_000 + seq,
    updated: 1_000 + seq,
    ...over
  };
}

describe("not ayristirma", () => {
  it("basligi tek satira indirir, denetim karakterini atar, kirpar", () => {
    expect(cleanTitle("  Fatura\n\takışı   kararı ")).toBe("Fatura akışı kararı");
    expect(cleanTitle("a".repeat(NOTE_TITLE_MAX + 10))).toHaveLength(NOTE_TITLE_MAX);
    expect(cleanTitle(42)).toBe("");
  });

  it("govde satir sonlarini korur, CRLF -> LF, sinirda kirpilir", () => {
    expect(cleanBody("a\r\nb\u0007c  \n")).toBe("a\nb c");
    expect(cleanBody("x".repeat(NOTE_BODY_MAX + 5))).toHaveLength(NOTE_BODY_MAX);
  });

  it("etiket: kucuk harf, # duser, bosluk tire, Turkce harf kalir, tekil", () => {
    expect(normalizeTag("#SAP Fatura!")).toBe("sap-fatura");
    expect(normalizeTag("İŞLEM")).toBe("işlem");
    expect(normalizeTags("a, b ,a  #c")).toEqual(["a", "b", "c"]);
    expect(normalizeTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(12);
  });

  it("gecersiz kayitlari atar, kimlik tekrarinda ilki kalir, tur bilinmiyorsa not", () => {
    const good = { id: "n-abcd1", title: "Bir", created: 5, updated: 4, kind: "karar" };
    const text = JSON.stringify({
      version: 1,
      notes: [good, { ...good, title: "Kopya" }, { id: "kotu", title: "x", created: 1 }, { id: "n-abcd2", title: "", created: 1 }, { id: "n-abcd3", title: "Uc", created: 2, kind: "uydurma" }]
    });
    const notes = parseNotes(text);
    expect(notes.map((n) => n.title)).toEqual(["Bir", "Uc"]);
    expect(notes[0].updated).toBe(5);
    expect(notes[1].kind).toBe("not");
    expect(parseNotes("bozuk{")).toEqual([]);
  });

  it("serialize -> parse ayni notlari verir", () => {
    const list = [note({ title: "A", body: "x [[B]]", tags: ["t"], kind: "olgu", source: { type: "agent", name: "Ali" } })];
    expect(parseNotes(serializeNotes(list))).toEqual(list);
  });

  it("not sayisi sinirda kesilir", () => {
    const many = Array.from({ length: NOTES_MAX + 3 }, (_, i) => ({ id: `n-x${String(i).padStart(5, "0")}`, title: `t${i}`, created: 1 }));
    expect(parseNotes(JSON.stringify(many))).toHaveLength(NOTES_MAX);
  });

  it("gizli suzgec baslik ve govdeye uygulanir", () => {
    const scrub = (t: string) => t.replace(/sk-[a-z0-9]+/g, "[gizli]");
    const n = createNote({ title: "Anahtar sk-abc123", body: "token sk-zzz9" }, 10, "n-scrub1", scrub);
    expect(n?.title).toBe("Anahtar [gizli]");
    expect(n?.body).toBe("token [gizli]");
    expect(sanitizeNote({ id: "n-scrub2", title: "sk-1", created: 1 }, scrub)?.title).toBe("[gizli]");
  });
});

describe("[[baglanti]]", () => {
  it("hedefleri sirali ve tekil cikarir; takma ad ve bosluk", () => {
    expect(extractLinks("bak [[SAP  Fatura]] ve [[sap fatura|bu]] sonra [[Diger]] [[]] [[a\nb]]")).toEqual(["SAP Fatura", "Diger"]);
  });

  it("govdeyi metin ve baglanti parcalarina boler", () => {
    expect(splitLinks("a [[B|bee]] c")).toEqual([{ text: "a " }, { link: "B", label: "bee" }, { text: " c" }]);
  });

  it("findNote basligi buyuk/kucuk duyarsiz bulur; geri baglantilar", () => {
    const a = note({ title: "Fatura akışı" });
    const b = note({ title: "Ödeme", body: "bkz. [[fatura akışı]]" });
    const c = note({ title: "Başka", body: `[[${a.id}]]` });
    expect(findNote([a, b], "FATURA AKIŞI")?.id).toBe(a.id);
    expect(findNote([a, b], a.id)?.id).toBe(a.id);
    expect(backlinks([a, b, c], a).map((n) => n.title)).toEqual(["Ödeme", "Başka"]);
  });

  it("withLink yoksa ekler, varsa dokunmaz", () => {
    const a = note({ title: "A", body: "metin" });
    const b = note({ title: "B" });
    expect(withLink(a, b)).toBe("metin\n[[B]]");
    expect(withLink({ ...a, body: "x [[b]]" }, b)).toBe("x [[b]]");
  });
});

describe("arama ve suzgec", () => {
  const a = note({ title: "Stok önbelleği", body: "Checkout sırasında yenilenir; anahtar ürün + renk.", tags: ["stok"], kind: "karar", owner: "p1" });
  const b = note({ title: "Ödeme adımları", body: "Adres adımı atlanamaz.", tags: ["checkout"], kind: "olgu" });
  const c = note({ title: "Checkout", body: "", kind: "gorev" });

  it("baslik tam eslesme once; etiket; govde; VE", () => {
    const hits = searchNotes([a, b, c], "checkout");
    expect(hits.map((h) => h.note.title)).toEqual(["Checkout", "Ödeme adımları", "Stok önbelleği"]);
    expect(hits[1].field).toBe("tag");
    expect(hits[2].snippet).toContain("Checkout");
    expect(searchNotes([a, b, c], "checkout renk").map((h) => h.note.title)).toEqual(["Stok önbelleği"]);
    expect(searchNotes([a, b, c], "   ")).toEqual([]);
  });

  it("tur/sahip/etiket suzgeci ve sorgu birlikte", () => {
    expect(filterNotes([a, b, c], { kinds: new Set(["karar", "olgu"]) }).map((n) => n.title)).toEqual(["Ödeme adımları", "Stok önbelleği"]);
    expect(filterNotes([a, b, c], { owners: new Set([""]) }).map((n) => n.title)).toEqual(["Checkout", "Ödeme adımları"]);
    expect(filterNotes([a, b, c], { tags: new Set(["stok"]) })).toEqual([a]);
    expect(filterNotes([a, b, c], { query: "checkout", owners: new Set(["p1"]) })).toEqual([a]);
  });

  it("etiket sayilari", () => {
    expect(tagCounts([a, b, { ...c, tags: ["stok"] }])).toEqual([
      { tag: "stok", count: 2 },
      { tag: "checkout", count: 1 }
    ]);
  });
});

describe("graf kurulumu", () => {
  it("not, ajan, ekip ve ortak etiket dugumleri; sahiplik, baglanti ve etiket kenarlari", () => {
    const a = note({ title: "A", body: "[[B]] [[Yok]]", tags: ["x"], owner: "p1" });
    const b = note({ title: "B", tags: ["x", "tek"] });
    const g = buildGraph([a, b], [{ id: "p1", name: "Ali" }, { id: "p2", name: "Ayşe" }]);
    expect(g.nodes.map((n) => n.id)).toEqual(["team", "agent:p1", "agent:p2", `note:${a.id}`, `note:${b.id}`, "tag:x"]);
    const types = g.edges.map((e) => `${e.source}>${e.target}:${e.type}`);
    expect(types).toContain(`agent:p1>note:${a.id}:owner`);
    expect(types).toContain(`team>note:${b.id}:owner`);
    expect(types).toContain(`note:${a.id}>note:${b.id}:link`);
    expect(types).toContain(`note:${a.id}>tag:x:tag`);
    expect(g.nodes.find((n) => n.id === `note:${a.id}`)?.degree).toBe(3);
  });

  it("kapanmis ajanin notu ad ile ajan dugumune baglanir; cift kenar yok", () => {
    const a = note({ title: "A", owner: "eski", ownerName: "Veli", body: "[[B]]" });
    const b = note({ title: "B", body: "[[A]]" });
    const g = buildGraph([a, b], []);
    expect(g.nodes.find((n) => n.id === "agent:eski")?.label).toBe("Veli");
    expect(g.edges.filter((e) => e.type === "link")).toHaveLength(1);
  });
});

describe("baslangic ozeti", () => {
  it("ekip + kendi notlari, karar once, tek satir, sinirli", () => {
    const list = [
      note({ title: "Olgu bir", kind: "olgu" }),
      note({ title: "Karar; bir", kind: "karar" }),
      note({ title: "Başkasının", kind: "karar", owner: "p2" }),
      note({ title: "Benim", kind: "ogrenim", owner: "p1" })
    ];
    const d = memoryDigest(list, "p1");
    expect(d.startsWith("[Ekip bellegi] 3 not.")).toBe(true);
    expect(d.indexOf("Karar: Karar bir")).toBeLessThan(d.indexOf("Ogrenim: Benim"));
    expect(d.indexOf("Ogrenim: Benim")).toBeLessThan(d.indexOf("Olgu: Olgu bir"));
    expect(d).not.toContain("Başkasının");
    expect(d).not.toMatch(/\n/);
    const long = Array.from({ length: 200 }, (_, i) => note({ title: `Uzun başlık numarası ${i}`, kind: "karar" }));
    expect(memoryDigest(long, "p1", 300).length).toBeLessThanOrEqual(300);
    expect(memoryDigest([], "p1")).toBe("");
  });
});

describe("akistan not", () => {
  it("cevap -> olgu, soru -> karar, gorev -> gorev; baslik ilk satirdan", () => {
    const r = noteFromFlow({ kind: "finished", name: "Ali", detail: "", reply: "## Sonuç\nTamam", paneId: "p1", id: 7 });
    expect(r).toMatchObject({ title: "Sonuç", kind: "olgu", owner: "", source: { type: "flow", name: "Ali", ref: "7" } });
    expect(noteFromFlow({ kind: "asked", name: "Ali", detail: "Hangisi?", paneId: "p1" })?.kind).toBe("karar");
    expect(noteFromFlow({ kind: "verified", name: "Ali", detail: "TA-4 bitti", paneId: "p1" })?.source?.type).toBe("task");
    expect(noteFromFlow({ kind: "relay", name: "Ali → Ayşe", detail: "Merhaba", paneId: "p1" })?.source?.name).toBe("Ali");
    expect(noteFromFlow({ kind: "finished", name: "Ali", detail: " ", paneId: null })).toBeNull();
  });
});

describe("katlama", () => {
  it("i/ı/İ/I ayni; buyuk-kucuk duyarsiz", async () => {
    const { fold } = await import("../app-electron/shared/memoryNotes");
    expect(fold("İstanbul IŞIK invoice")).toBe(fold("istanbul ışık İnvoice"));
  });
});
