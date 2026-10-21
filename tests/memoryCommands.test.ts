import { describe, expect, it } from "vitest";
import { cleanArgs, MEMORY_USAGE, runMemoryCommand, type MemoryCommandStore } from "../app-electron/shared/memoryCommands";
import { applyPatch, createNote, type MemoryNote } from "../app-electron/shared/memoryNotes";

function memStore(initial: MemoryNote[] = []): MemoryCommandStore & { notes: MemoryNote[] } {
  let n = 0;
  const s = {
    notes: [...initial],
    list: () => s.notes,
    add(input: Parameters<MemoryCommandStore["add"]>[0]) {
      n += 1;
      const note = createNote(input, 100 + n, `n-cmd${String(n).padStart(3, "0")}`);
      if (!note) return { ok: false as const, reason: "invalid" as const };
      s.notes.push(note);
      return { ok: true as const, note };
    },
    update(id: string, patch: Parameters<MemoryCommandStore["update"]>[1]) {
      const at = s.notes.findIndex((x) => x.id === id);
      if (at < 0) return { ok: false as const, reason: "missing" as const };
      const note = applyPatch(s.notes[at], patch, 500)!;
      s.notes[at] = note;
      return { ok: true as const, note };
    }
  };
  return s;
}

const ali = { paneId: "p1", name: "Ali" };

describe("ntt-team memory", () => {
  it("argumanlar: kenar tirnaklari kirpilir, dize olmayan atilir, tek dize de olur", () => {
    expect(cleanArgs(['"add"', 3, " x ", ""])).toEqual(["add", "x"]);
    expect(cleanArgs("list")).toEqual(["list"]);
    expect(cleanArgs(null)).toEqual([]);
  });

  it("add: varsayilan ekip; --ben, --tur, --etiket; kaynak ajan", () => {
    const s = memStore();
    const r = runMemoryCommand(["add", "Fatura kuralı", "Tutar kuruş olarak", "--tur", "karar", "--etiket", "fi,sap"], ali, s);
    expect(r).toMatchObject({ status: 200, changed: true });
    expect(r.text).toContain("Fatura kuralı (karar, ekip, #fi #sap)");
    expect(s.notes[0]).toMatchObject({ owner: "", kind: "karar", tags: ["fi", "sap"], body: "Tutar kuruş olarak", source: { type: "agent", name: "Ali" } });
    runMemoryCommand(["add", "Benim", "--ben", "--tur=ogrenim"], ali, s);
    expect(s.notes[1]).toMatchObject({ owner: "p1", ownerName: "Ali", kind: "ogrenim" });
  });

  it("add: bilinmeyen tur ve bos baslik reddedilir", () => {
    const s = memStore();
    expect(runMemoryCommand(["add", "X", "--tur", "uydurma"], ali, s).status).toBe(400);
    expect(runMemoryCommand(["add"], ali, s).text).toBe(MEMORY_USAGE);
    expect(s.notes).toHaveLength(0);
  });

  it("search/get/list yalniz ekip + kendi notlarini gorur", () => {
    const s = memStore();
    runMemoryCommand(["add", "Stok önbelleği", "checkout sırasında yenilenir"], ali, s);
    runMemoryCommand(["add", "Gizli plan", "checkout", "--ben"], { paneId: "p2", name: "Ayşe" }, s);
    const found = runMemoryCommand(["search", "checkout"], ali, s);
    expect(found.text).toContain("1 sonuc");
    expect(found.text).toContain("Stok önbelleği");
    expect(found.text).not.toContain("Gizli plan");
    expect(runMemoryCommand(["get", "gizli plan"], ali, s).status).toBe(404);
    expect(runMemoryCommand(["search", "yok-boyle"], ali, s).text).toContain("bulunamadi");
    expect(runMemoryCommand(["list"], ali, s).text).toContain("Stok önbelleği");
    expect(runMemoryCommand(["list", "--ben"], ali, s).text).toBe("Bellek bos.");
  });

  it("link govdeye [[B]] ekler; get baglanti ve geri baglantiyi gosterir", () => {
    const s = memStore();
    runMemoryCommand(["add", "A", "metin"], ali, s);
    runMemoryCommand(["add", "B"], ali, s);
    const r = runMemoryCommand(["link", "A", "B"], ali, s);
    expect(r).toMatchObject({ status: 200, changed: true });
    expect(s.notes[0].body).toBe("metin\n[[B]]");
    expect(runMemoryCommand(["link", "A", "B"], ali, s).changed).toBe(false);
    expect(runMemoryCommand(["get", "A"], ali, s).text).toContain("Baglantilar: B");
    expect(runMemoryCommand(["get", "B"], ali, s).text).toContain("Geri baglantilar: A");
    expect(runMemoryCommand(["link", "A", "Yok"], ali, s).status).toBe(404);
  });

  it("bilinmeyen alt komut kullanimi dondurur", () => {
    expect(runMemoryCommand(["sil"], ali, memStore())).toMatchObject({ status: 400, text: MEMORY_USAGE });
    expect(runMemoryCommand([], ali, memStore()).status).toBe(200);
  });
});

describe("ntt-team memory — ogrenme gorevi", () => {
  it("--gorev notu goreve isaretler (kaynak: gorev)", () => {
    const s = memStore();
    const r = runMemoryCommand(["add", "Kur farki", "Kaynak: docs/a.md", "--tur", "olgu", "--gorev", "og-ab12cd"], ali, s);
    expect(r.status).toBe(200);
    expect(s.notes[0].source).toEqual({ type: "task", name: "Ali", ref: "og-ab12cd" });
  });

  it("gecersiz gorev kimligi reddedilir", () => {
    const s = memStore();
    const r = runMemoryCommand(["add", "X", "y", "--gorev", "../etc"], ali, s);
    expect(r.status).toBe(400);
    expect(s.notes).toHaveLength(0);
  });

  it("update govdeye ekler, etiketleri birlestirir, kaynagi degistirmez", () => {
    const s = memStore();
    runMemoryCommand(["add", "Kur farki", "ilk", "--etiket", "fi"], ali, s);
    const r = runMemoryCommand(["update", "Kur farki", "ek bilgi [[Kapanis]]", "--etiket", "kur", "--gorev", "og-ab12cd"], ali, s);
    expect(r.status).toBe(200);
    expect(r.changed).toBe(true);
    expect(s.notes[0].body).toBe("ilk\n\nek bilgi [[Kapanis]]");
    expect(s.notes[0].tags).toEqual(["fi", "kur"]);
    expect(s.notes[0].source?.type).toBe("agent");
    expect(s.notes[0].tasks).toEqual(["og-ab12cd"]);
  });

  it("update --gorev gecersiz kimligi reddeder; isaretsiz update goreve yazilmaz", () => {
    const s = memStore();
    runMemoryCommand(["add", "Kur farki", "ilk"], ali, s);
    expect(runMemoryCommand(["update", "Kur farki", "ek", "--gorev", "../x"], ali, s).status).toBe(400);
    expect(runMemoryCommand(["update", "Kur farki", "ek"], ali, s).status).toBe(200);
    expect(s.notes[0].tasks).toBeUndefined();
  });

  it("update olmayan not icin 404, bos ek icin 400", () => {
    const s = memStore();
    expect(runMemoryCommand(["update", "Yok", "x"], ali, s).status).toBe(404);
    runMemoryCommand(["add", "A", "b"], ali, s);
    expect(runMemoryCommand(["update", "A"], ali, s).status).toBe(400);
  });

  it("kullanim update'i aniyor", () => {
    expect(MEMORY_USAGE).toContain("memory update");
  });
});

// Tur 13: ekipler arası ortak "Genel" bellek.
describe("ntt-team memory --genel", () => {
  it("add --genel genel belleğe yazıyor (ekip değil); changedGeneral", () => {
    const team = memStore();
    const general = memStore();
    const r = runMemoryCommand(["add", "Kurum kuralı", "Her yerde geçerli", "--genel"], ali, { ...team, general });
    expect(r).toMatchObject({ status: 200, changed: false, changedGeneral: true });
    expect(r.text).toContain("genel");
    expect(team.notes).toHaveLength(0);
    expect(general.notes[0]).toMatchObject({ title: "Kurum kuralı", owner: "" });
  });

  it("genel bellek yoksa --genel reddediliyor", () => {
    const r = runMemoryCommand(["add", "X", "--genel"], ali, memStore());
    expect(r.status).toBe(404);
  });

  it("arama ve get genel notları da buluyor, işaretli", () => {
    const team = memStore([createNote({ title: "Fatura ekip notu" }, 1, "n-team0001")!]);
    const general = memStore([createNote({ title: "Fatura kurum kuralı", body: "genel metin" }, 2, "n-genl0001")!]);
    const s = { ...team, general };
    const found = runMemoryCommand(["search", "Fatura"], ali, s);
    expect(found.text).toContain("Fatura ekip notu");
    expect(found.text).toMatch(/Fatura kurum kuralı \(not, genel\)/);
    const got = runMemoryCommand(["get", "Fatura kurum kuralı"], ali, s);
    expect(got.status).toBe(200);
    expect(got.text).toContain("genel metin");
    expect(runMemoryCommand(["search", "Fatura", "--ben"], ali, s).text).not.toContain("kurum");
  });
});
