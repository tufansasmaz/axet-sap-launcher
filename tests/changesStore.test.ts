// Değişiklikler: kayıt deposu (spec 2026-10-18 degisiklikler §3, §8). Gerçek geçici klasör.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkpointFile,
  deleteCheckpointFiles,
  privateIndexFile,
  readCheckpointFile,
  readCheckpoints,
  restoreIndexFile,
  writeCheckpointFile
} from "../app-electron/main/changesStore";
import { MAX_CHECKPOINTS, type Checkpoint } from "../app-electron/shared/changesTypes";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "degisiklik-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const WS = "3f2a1c9e-1b2c-4d5e-8f90-123456789abc";
const tree = (n: number) => n.toString(16).padStart(40, "0");
const cp = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: WS,
  tree: tree(n),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: "testleri düzelt",
  reviewed: "pending",
  ...over
});

describe("dosya yolları", () => {
  it("geçerli kimlik klasörün içinde; yol parçası reddediliyor", () => {
    expect(checkpointFile(dir, WS)).toBe(path.join(dir, `${WS}.json`));
    expect(privateIndexFile(dir, WS)).toBe(path.join(dir, `${WS}.index`));
    expect(restoreIndexFile(dir, WS)).toBe(path.join(dir, `${WS}.restore.index`));
    for (const bad of ["../x", "a/b", "a\\b", "", "x".repeat(101)]) {
      expect(checkpointFile(dir, bad)).toBeNull();
      expect(privateIndexFile(dir, bad)).toBeNull();
      expect(restoreIndexFile(dir, bad)).toBeNull();
    }
  });
});

describe("readCheckpoints", () => {
  it("bozuk öğe atlanıyor; başka alanın kaydı, tekrar kimlik, geçersiz ağaç atlanıyor; tarihe göre sıralı", () => {
    const list = readCheckpoints(
      {
        checkpoints: [
          cp("b", 20),
          cp("a", 10, { stats: { files: 2, added: 5, deleted: 1 } }),
          cp("a", 11),
          { ...cp("x", 12), workspaceId: "baska" },
          { ...cp("y", 13), tree: "kirik" },
          { ...cp("z", 14), reason: "salon" },
          { ...cp("w", 15), reviewed: "belki" },
          null,
          "metin"
        ]
      },
      WS
    );
    expect(list?.map((c) => c.id)).toEqual(["a", "b"]);
    expect(list?.[0].stats).toEqual({ files: 2, added: 5, deleted: 1 });
  });

  it("alanlar sınırlanıyor: etiket 80, ajan adı 60; bozuk pane/subtask null; bozuk stats atılıyor", () => {
    const [c] = readCheckpoints(
      {
        checkpoints: [
          { ...cp("a", 1), label: "x".repeat(300), agentName: "y".repeat(300), paneId: 5, subtaskId: "../x", stats: { files: -1, added: 1, deleted: 1 } }
        ]
      },
      WS
    )!;
    expect(c.label).toHaveLength(80);
    expect(c.agentName).toHaveLength(60);
    expect(c.paneId).toBeNull();
    expect(c.subtaskId).toBeNull();
    expect("stats" in c).toBe(false);
  });

  it("200'den fazlası okumada kesilmiyor (geri alınan kayıt geçici 201'de düşmesin; sınır yazarken yöneticide)", () => {
    const list = readCheckpoints({ checkpoints: Array.from({ length: MAX_CHECKPOINTS + 1 }, (_, i) => cp(`c${i}`, i + 1)) }, WS)!;
    expect(list).toHaveLength(MAX_CHECKPOINTS + 1);
    expect(list[0].id).toBe("c0");
  });

  it("yapı bozuksa null", () => {
    for (const raw of [null, [], "x", { checkpoints: "x" }, {}]) expect(readCheckpoints(raw, WS)).toBeNull();
  });
});

describe("dosya", () => {
  it("gidiş-dönüş; yazma atomik (.tmp kalmıyor); dosya yoksa boş", () => {
    expect(readCheckpointFile(dir, WS, 1)).toEqual({ checkpoints: [] });
    const list = [cp("a", 1), cp("b", 2, { reason: "dispatch", subtaskId: "s1", paneId: "p2", reviewed: "accepted" })];
    expect(writeCheckpointFile(dir, WS, list)).toBe(true);
    expect(readCheckpointFile(dir, WS, 1)).toEqual({ checkpoints: list });
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
    expect(JSON.parse(readFileSync(checkpointFile(dir, WS)!, "utf-8")).version).toBe(1);
  });

  it("BOM'lu dosya okunuyor", () => {
    writeFileSync(checkpointFile(dir, WS)!, `\uFEFF${JSON.stringify({ checkpoints: [cp("a", 1)] })}`, "utf-8");
    expect(readCheckpointFile(dir, WS, 1).checkpoints.map((c) => c.id)).toEqual(["a"]);
  });

  it("JSON değilse .bozuk-<zaman> olarak kenara alınıyor, boş liste + recoveredFrom (sessizce silinmiyor)", () => {
    writeFileSync(checkpointFile(dir, WS)!, "{bozuk", "utf-8");
    const result = readCheckpointFile(dir, WS, 777);
    expect(result).toEqual({ checkpoints: [], recoveredFrom: `${WS}.json.bozuk-777` });
    expect(readFileSync(path.join(dir, `${WS}.json.bozuk-777`), "utf-8")).toBe("{bozuk");
    expect(existsSync(checkpointFile(dir, WS)!)).toBe(false);
  });

  it("geçersiz kimlikle yazma yapılmıyor", () => {
    expect(writeCheckpointFile(dir, "../x", [cp("a", 1)])).toBe(false);
  });

  it("silme: json + iki index dosyası; olmayan dosya hata vermiyor", () => {
    writeCheckpointFile(dir, WS, [cp("a", 1)]);
    writeFileSync(privateIndexFile(dir, WS)!, "x");
    writeFileSync(restoreIndexFile(dir, WS)!, "x");
    deleteCheckpointFiles(dir, WS);
    expect(readdirSync(dir)).toEqual([]);
    expect(() => deleteCheckpointFiles(dir, WS)).not.toThrow();
    expect(() => deleteCheckpointFiles(dir, "../x")).not.toThrow();
  });
});
