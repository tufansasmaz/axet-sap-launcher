import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNotesStore, loadNotes, writeNotesAtomic } from "../app-electron/main/memoryNotesStore";

const WS = "ws-1";
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "notes-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("bellek notlari kaliciligi", () => {
  it("ekle -> diskte, yeniden okununca ayni; gecici dosya kalmiyor", () => {
    let t = 1_000;
    const store = createNotesStore(() => dir, () => (t += 1));
    const r = store.add(WS, { title: "Karar", body: "metin", kind: "karar", tags: "a b" });
    expect(r.ok).toBe(true);
    const again = createNotesStore(() => dir).list(WS);
    expect(again).toHaveLength(1);
    expect(again[0]).toMatchObject({ title: "Karar", kind: "karar", tags: ["a", "b"] });
    expect(readdirSync(dir)).toEqual([`${WS}.json`]);
  });

  it("gizli suzgec yazarken ve okurken", () => {
    const store = createNotesStore(() => dir);
    store.add(WS, { title: "Anahtar", body: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" });
    const raw = readFileSync(path.join(dir, `${WS}.json`), "utf-8");
    expect(raw).not.toContain("eyJhbGciOiJIUzI1NiJ9.eyJzdWIi");
  });

  it("guncelle: beklenen tarih tutmazsa changed; yoksa missing; sil", () => {
    let t = 1_000;
    const store = createNotesStore(() => dir, () => (t += 10));
    const added = store.add(WS, { title: "A" });
    if (!added.ok) throw new Error("eklenmedi");
    expect(store.update(WS, added.note.id, { title: "B" }, 1)).toEqual({ ok: false, reason: "changed" });
    const up = store.update(WS, added.note.id, { title: "B", tags: ["x"] }, added.note.updated);
    expect(up.ok && up.note.title).toBe("B");
    expect(up.ok && up.note.updated).toBeGreaterThan(added.note.updated);
    expect(store.update(WS, "n-yok00", { title: "x" })).toEqual({ ok: false, reason: "missing" });
    expect(store.remove(WS, added.note.id)).toBe(true);
    expect(store.list(WS)).toEqual([]);
  });

  it("gecersiz alan kimligi ve bos baslik reddedilir; yol disari cikamaz", () => {
    const store = createNotesStore(() => dir);
    expect(store.add("../kotu", { title: "x" })).toEqual({ ok: false, reason: "invalid" });
    expect(store.add(WS, { title: "  " })).toEqual({ ok: false, reason: "invalid" });
    expect(loadNotes(dir, "../kotu")).toEqual([]);
  });

  it("bozuk kayit atlanir, gecerliler eklemeden sonra da korunur", () => {
    writeFileSync(path.join(dir, `${WS}.json`), JSON.stringify({ notes: [{ id: "n-keep1", title: "Kalır", created: 1 }, { bozuk: true }] }));
    const store = createNotesStore(() => dir);
    store.add(WS, { title: "Yeni" });
    expect(store.list(WS).map((n) => n.title)).toEqual(["Kalır", "Yeni"]);
    writeFileSync(path.join(dir, "ws-2.json"), "{bozuk");
    expect(loadNotes(dir, "ws-2")).toEqual([]);
  });

  it("atomik yazim: hedef klasor yazilamazsa writeFailed, eski dosya saglam", () => {
    const file = path.join(dir, `${WS}.json`);
    writeFileSync(file, JSON.stringify({ notes: [{ id: "n-old01", title: "Eski", created: 1 }] }));
    // Hedefin yerinde klasör: rename başarısız olur.
    const blocked = path.join(dir, "klasor.json");
    rmSync(blocked, { force: true });
    mkdirSync(blocked);
    expect(writeNotesAtomic(blocked, [])).toBe("writeFailed");
    expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    expect(loadNotes(dir, WS)[0].title).toBe("Eski");
  });
});
