// Değişiklikler: saf mantık (spec 2026-10-18 degisiklikler §3, §4, §6, §7, §9).
import { describe, expect, it } from "vitest";
import {
  capCheckpoints,
  createKeyedQueue,
  isSafeRelPath,
  isTreeId,
  labelOf,
  laterCheckpoints,
  mergeChanges,
  parseRawZ,
  parseNumstatZ,
  parseUnifiedDiff,
  pendingCount,
  rangeOf,
  readRevertPaths,
  shouldSnapshotPrompt,
  statsOf
} from "../app-electron/shared/changesLogic";
import { MAX_CHECKPOINTS, MAX_DIFF_LINES, PROMPT_THROTTLE_MS, type Checkpoint } from "../app-electron/shared/changesTypes";

const tree = (n: number) => n.toString(16).padStart(40, "0");
const cp = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "w1",
  tree: tree(n),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});

describe("isTreeId", () => {
  it("40 ya da 64 küçük hex; başka her şey değil", () => {
    expect(isTreeId("a".repeat(40))).toBe(true);
    expect(isTreeId("0".repeat(64))).toBe(true);
    for (const raw of ["A".repeat(40), "a".repeat(39), "a".repeat(41), "g".repeat(40), "", 5, null, `${"a".repeat(40)}\n`]) {
      expect(isTreeId(raw)).toBe(false);
    }
  });
});

describe("labelOf", () => {
  it("boşluklar tekleşiyor, kırpılıyor, 80 kod noktası; vekil çift bölünmüyor", () => {
    expect(labelOf("  merhaba \n\t dünya  ")).toBe("merhaba dünya");
    expect(labelOf("x".repeat(200))).toHaveLength(80);
    const emoji = "😀".repeat(100);
    expect(Array.from(labelOf(emoji))).toHaveLength(80);
    expect(labelOf(emoji).endsWith("😀")).toBe(true);
  });
});

describe("shouldSnapshotPrompt (spec §4.2)", () => {
  it("ilk istem; 30 sn içinde ikinci yok; 30 sn'de var; saat geri giderse var; lastAt NaN geçersizse var", () => {
    expect(shouldSnapshotPrompt(undefined, 1_000)).toBe(true);
    expect(shouldSnapshotPrompt(1_000, 1_000 + PROMPT_THROTTLE_MS - 1)).toBe(false);
    expect(shouldSnapshotPrompt(1_000, 1_000 + PROMPT_THROTTLE_MS)).toBe(true);
    expect(shouldSnapshotPrompt(50_000, 10_000)).toBe(true);
    expect(shouldSnapshotPrompt(NaN, 1_000)).toBe(true);
    expect(shouldSnapshotPrompt(Infinity, 1_000)).toBe(true);
  });
});

describe("kayıt listesi", () => {
  it("capCheckpoints: en yeni 200 kalıyor, sıra korunuyor", () => {
    const list = Array.from({ length: MAX_CHECKPOINTS + 5 }, (_, i) => cp(`c${i}`, i + 1));
    const capped = capCheckpoints(list);
    expect(capped).toHaveLength(MAX_CHECKPOINTS);
    expect(capped[0].id).toBe("c5");
    expect(capped.at(-1)?.id).toBe(`c${MAX_CHECKPOINTS + 4}`);
    expect(capCheckpoints([cp("a", 1)])).toEqual([cp("a", 1)]);
  });

  it("rangeOf: kayıt → sonraki kayıt; sonuncusu çalışma ağacına (to null); bilinmeyen null", () => {
    const list = [cp("a", 1), cp("b", 2), cp("c", 3)];
    expect(rangeOf(list, "a")).toEqual({ from: list[0], to: list[1], index: 0 });
    expect(rangeOf(list, "c")).toEqual({ from: list[2], to: null, index: 2 });
    expect(rangeOf(list, "x")).toBeNull();
  });

  it("laterCheckpoints: seçiliden sonrakiler, en çok max", () => {
    const list = [cp("a", 1), cp("b", 2), cp("c", 3), cp("d", 4)];
    expect(laterCheckpoints(list, "a").map((c) => c.id)).toEqual(["b", "c", "d"]);
    expect(laterCheckpoints(list, "a", 2).map((c) => c.id)).toEqual(["b", "c"]);
    expect(laterCheckpoints(list, "d")).toEqual([]);
    expect(laterCheckpoints(list, "x")).toEqual([]);
  });

  it("pendingCount: yalnız pending; beforeRestore sayılmıyor", () => {
    const list = [cp("a", 1), cp("b", 2, { reviewed: "accepted" }), cp("c", 3, { reason: "beforeRestore" }), cp("d", 4, { reviewed: "reverted" }), cp("e", 5)];
    expect(pendingCount(list)).toBe(2);
  });
});

describe("isSafeRelPath / readRevertPaths (spec §6.4, §7)", () => {
  it("git'in göreli yolu kabul; kök dışı, mutlak, sürücü, ters eğik çizgi, .git, NTFS akışı, denetim karakteri reddediliyor", () => {
    for (const ok of ["a.txt", "src/app.ts", "klasör/çğüşöı.md", "a b/c d.txt", ".github/workflows/x.yml", "dosya.git"]) {
      expect(isSafeRelPath(ok), ok).toBe(true);
    }
    for (const bad of ["", "../x", "a/../../x", "a/./b", "./a", "/etc/passwd", "C:/x", "c:x", "a\\b", ".git/config", "a/.GIT/hooks/x", "GIT~1/config", "a:b", "a//b", "a/", "a\u0000b", "a\nb", "x".repeat(1_001), 5, null]) {
      expect(isSafeRelPath(bad), String(bad)).toBe(false);
    }
  });

  it("sondaki nokta/boşluk, Windows ayrılmış adlar, görünmez/bidi karakterler, yalnız surrogate, sınır vakaları reddediliyor", () => {
    for (const bad of [
      // Sondaki nokta ve boşluk: Windows yol normalleştirmesi siler
      ".git.", ".git ", "a.", "a ", "a/b.", "a/b ",
      // Üç nokta: sondaki nokta kuralına girer
      "...",
      // Windows ayrılmış adlar (büyük/küçük harf, uzantılı, klasör içinde)
      "CON", "con", "con.txt", "Con.log", "PRN", "AUX", "NUL", "nul",
      "COM1", "COM9", "com1.txt", "LPT1", "LPT9", "lpt1.log", "a/CON", "a/NUL",
      // C1 denetim karakterleri
      "a\u0085b", "a\u009fb",
      // Sıfır genişlikli / bidi / BOM
      "a\u200bb", "a\u200fb", "a\u202ab", "a\u202eb", "a\u2066b", "a\u2069b", "\ufeffa",
      // Yalnız surrogate
      "a\uD800b", "a\uDFFFb", "a\uDBFFb",
      // UNC ve sınır vakaları
      "//server/x", "..", "a/../..",
    ]) {
      expect(isSafeRelPath(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("readRevertPaths: dizi, boş değil, ≤ 5000, hepsi güvenli; tekrarlar tekleşiyor", () => {
    expect(readRevertPaths(["a.txt", "b/c.ts", "a.txt"])).toEqual(["a.txt", "b/c.ts"]);
    expect(readRevertPaths([])).toBeNull();
    expect(readRevertPaths("a.txt")).toBeNull();
    expect(readRevertPaths(["a.txt", "../x"])).toBeNull();
    expect(readRevertPaths(Array.from({ length: 5_001 }, (_, i) => `f${i}`))).toBeNull();
    // Seyrek dizinin deliği undefined sayılıyor (atlanmıyor).
    // eslint-disable-next-line no-sparse-arrays
    expect(readRevertPaths(["a.txt", , "b.txt"])).toBeNull();
  });
});

describe("diff-tree çıktısı ayrıştırma", () => {
  const Z = "0".repeat(40);
  const S = "1".repeat(40);
  const raw = (from: string, to: string, code: string, ...paths: string[]) => `:${from} ${to} ${Z} ${S} ${code}\0${paths.join("\0")}\0`;

  it("raw -z: A/M/D/T; T değişti sayılıyor; kırpılmış son kayıt atılıyor", () => {
    expect(
      parseRawZ(
        raw("000000", "100644", "A", "yeni.txt") + raw("100644", "100644", "M", "src/a.ts") + raw("100644", "000000", "D", "eski.md") + raw("100644", "120000", "T", "bag")
      )
    ).toEqual([
      { path: "yeni.txt", status: "added", submodule: false },
      { path: "src/a.ts", status: "modified", submodule: false },
      { path: "eski.md", status: "deleted", submodule: false },
      { path: "bag", status: "modified", submodule: false }
    ]);
    expect(parseRawZ(raw("100644", "100644", "M", "a.ts") + `:000000 100644 ${Z} ${S} A\0yar`)).toEqual([{ path: "a.ts", status: "modified", submodule: false }]);
    expect(parseRawZ("")).toEqual([]);
  });

  it("raw -z: R/C (yeniden adlandırma/kopyalama) hizayı bozmadan atlanıyor", () => {
    expect(parseRawZ(raw("100644", "100644", "R100", "old.ts", "new.ts"))).toEqual([]);
    expect(parseRawZ(raw("100644", "100644", "M", "a.ts") + raw("100644", "100644", "R100", "old.ts", "new.ts") + raw("000000", "100644", "A", "c.ts"))).toEqual([
      { path: "a.ts", status: "modified", submodule: false },
      { path: "c.ts", status: "added", submodule: false }
    ]);
    expect(parseRawZ(raw("100644", "100644", "C100", "src.ts", "dst.ts") + raw("100644", "100644", "M", "b.ts"))).toEqual([
      { path: "b.ts", status: "modified", submodule: false }
    ]);
  });

  it("raw -z: mod 160000 (gitlink) herhangi bir tarafta alt modül sayılıyor", () => {
    expect(
      parseRawZ(raw("000000", "160000", "A", "alt") + raw("160000", "160000", "M", "dis/alt") + raw("160000", "000000", "D", "eski") + raw("160000", "100644", "T", "donus"))
    ).toEqual([
      { path: "alt", status: "added", submodule: true },
      { path: "dis/alt", status: "modified", submodule: true },
      { path: "eski", status: "deleted", submodule: true },
      { path: "donus", status: "modified", submodule: true }
    ]);
  });

  it("mergeChanges: alt modül işareti yalnız alt modülde", () => {
    const files = mergeChanges(
      [
        { path: "b.ts", status: "modified", submodule: false },
        { path: "alt", status: "modified", submodule: true }
      ],
      new Map()
    );
    expect(files).toEqual([
      { path: "alt", status: "modified", added: 0, deleted: 0, binary: false, submodule: true },
      { path: "b.ts", status: "modified", added: 0, deleted: 0, binary: false }
    ]);
  });

  it("numstat -z: sayılar, ikili (- -), sekmeli yol; kırpılmış son kayıt atılıyor", () => {
    const map = parseNumstatZ("3\t1\tsrc/a.ts\0-\t-\tlogo.png\0" + "0\t2\tsekme\tli.txt\0" + "5\t5\tya");
    expect(map.get("src/a.ts")).toEqual({ added: 3, deleted: 1, binary: false });
    expect(map.get("logo.png")).toEqual({ added: 0, deleted: 0, binary: true });
    expect(map.get("sekme\tli.txt")).toEqual({ added: 0, deleted: 2, binary: false });
    expect(map.has("ya")).toBe(false);
  });

  it("mergeChanges: yola göre sıralı; sayısı olmayan dosya 0/0; statsOf toplamı", () => {
    const files = mergeChanges(
      [
        { path: "b.ts", status: "modified" },
        { path: "a.png", status: "added" },
        { path: "c.md", status: "deleted" }
      ],
      new Map([
        ["b.ts", { added: 4, deleted: 2, binary: false }],
        ["a.png", { added: 0, deleted: 0, binary: true }]
      ])
    );
    expect(files.map((f) => f.path)).toEqual(["a.png", "b.ts", "c.md"]);
    expect(files[0]).toEqual({ path: "a.png", status: "added", added: 0, deleted: 0, binary: true });
    expect(files[2]).toEqual({ path: "c.md", status: "deleted", added: 0, deleted: 0, binary: false });
    expect(statsOf(files)).toEqual({ files: 3, added: 4, deleted: 2 });
  });
});

describe("parseUnifiedDiff (spec §5: satır numaralı)", () => {
  const patch = [
    "diff --git a/a.ts b/a.ts",
    "index 1111111..2222222 100644",
    "--- a/a.ts",
    "+++ b/a.ts",
    "@@ -1,3 +1,4 @@ function x()",
    " bir",
    "-iki",
    "+İKİ",
    "+iki buçuk",
    " üç\r",
    "@@ -10,2 +11,2 @@",
    " on",
    "-on bir",
    "\\ No newline at end of file",
    "+on bir!",
    ""
  ].join("\n");

  it("başlık atlanıyor; hunk, bağlam, eklenen, silinen satır numaralarıyla; CR ve 'No newline' atılıyor", () => {
    const { lines, truncated } = parseUnifiedDiff(patch, false);
    expect(truncated).toBe(false);
    expect(lines.map((l) => [l.kind, l.oldNo, l.newNo, l.text])).toEqual([
      ["hunk", null, null, "@@ -1,3 +1,4 @@ function x()"],
      ["context", 1, 1, "bir"],
      ["del", 2, null, "iki"],
      ["add", null, 2, "İKİ"],
      ["add", null, 3, "iki buçuk"],
      ["context", 3, 4, "üç"],
      ["hunk", null, null, "@@ -10,2 +11,2 @@"],
      ["context", 10, 11, "on"],
      ["del", 11, null, "on bir"],
      ["add", null, 12, "on bir!"]
    ]);
  });

  it("kırpılmış girdi: yarım son satır atılıyor ve truncated", () => {
    const cut = patch.slice(0, patch.indexOf("+iki buçuk") + 5);
    const { lines, truncated } = parseUnifiedDiff(cut, true);
    expect(truncated).toBe(true);
    expect(lines.at(-1)).toEqual({ kind: "add", oldNo: null, newNo: 2, text: "İKİ" });
  });

  it(`${MAX_DIFF_LINES} satırdan sonrası kesiliyor ve truncated`, () => {
    const body = Array.from({ length: MAX_DIFF_LINES + 10 }, (_, i) => `+s${i}`).join("\n");
    const { lines, truncated } = parseUnifiedDiff(`@@ -0,0 +1,${MAX_DIFF_LINES + 10} @@\n${body}\n`, false);
    expect(lines).toHaveLength(MAX_DIFF_LINES);
    expect(truncated).toBe(true);
  });
});

describe("createKeyedQueue (spec §7: aynı alanda sıralı)", () => {
  it("aynı anahtar sıralı, farklı anahtar paralel; hata zinciri kırmıyor; idle", async () => {
    const q = createKeyedQueue();
    const order: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const first = q.run("w1", async () => {
      order.push("1 başladı");
      await gate;
      order.push("1 bitti");
      throw new Error("patladı");
    });
    const second = q.run("w1", async () => {
      order.push("2");
      return 2;
    });
    const other = q.run("w2", async () => {
      order.push("başka alan");
      return "w2";
    });
    await other;
    expect(order).toEqual(["1 başladı", "başka alan"]);
    expect(q.idle("w1")).toBe(false);
    release();
    await expect(first).rejects.toThrow("patladı");
    await expect(second).resolves.toBe(2);
    expect(order).toEqual(["1 başladı", "başka alan", "1 bitti", "2"]);
    await new Promise((r) => setTimeout(r, 0));
    expect(q.idle("w1")).toBe(true);
  });
});
