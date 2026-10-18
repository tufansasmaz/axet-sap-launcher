// Bellek dosyası (spec 2026-10-18 ajan-bellegi §2, §4, §5, §7) — gerçek geçici klasörle.
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureMemoryFile, memoryAbsPath, memoryStamp, readMemoryFile, writeMemoryFile } from "../app-electron/main/memoryFiles";
import { MEMORY_MAX_BYTES, memoryInitialContent } from "../app-electron/shared/memoryLogic";

// rename hatasını enjekte etmek için (Windows'ta hedef başka süreçte açıkken EPERM/EBUSY).
const renameFault = vi.hoisted(() => ({ code: "" }));
vi.mock("node:fs", async (orig) => {
  const real = await orig<typeof import("node:fs")>();
  return {
    ...real,
    renameSync: (from: string, to: string) => {
      if (renameFault.code) {
        const error = new Error(`${renameFault.code}: rename`) as NodeJS.ErrnoException;
        error.code = renameFault.code;
        throw error;
      }
      return real.renameSync(from, to);
    }
  };
});

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const dirs: string[] = [];
const temp = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ntt-bellek-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  renameFault.code = "";
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const fileOf = (root: string, key = "ayse") => path.join(root, ".ntt-studio", "bellek", `${key}.md`);
const put = (root: string, content: string | Buffer, key = "ayse") => {
  mkdirSync(path.dirname(fileOf(root, key)), { recursive: true });
  writeFileSync(fileOf(root, key), content);
};
const open = (root: string) => {
  const r = readMemoryFile(root, "ayse");
  if (!r.ok) throw new Error(r.reason);
  return r;
};

describe("ensureMemoryFile (§2)", () => {
  it("yoksa klasörü ve başlıklı dosyayı yaratıyor", () => {
    const root = temp();
    expect(ensureMemoryFile(root, "ayse", "Ayşe")).toBe("created");
    expect(readFileSync(fileOf(root), "utf8")).toBe(memoryInitialContent("Ayşe"));
  });

  it("var olan dosyaya asla yazmıyor (boş dosya dahil)", () => {
    const root = temp();
    put(root, "kendi notum\r\n");
    expect(ensureMemoryFile(root, "ayse", "Ayşe")).toBe("exists");
    expect(readFileSync(fileOf(root), "utf8")).toBe("kendi notum\r\n");
    put(root, "", "bos");
    expect(ensureMemoryFile(root, "bos", "Boş")).toBe("exists");
    expect(readFileSync(fileOf(root, "bos"), "utf8")).toBe("");
  });

  it("kök yok, kök bir dosya, geçersiz anahtar, dosyanın yerinde klasör: failed", () => {
    const root = temp();
    expect(ensureMemoryFile(path.join(root, "yok"), "ayse", "A")).toBe("failed");
    writeFileSync(path.join(root, "dosya.txt"), "x");
    expect(ensureMemoryFile(path.join(root, "dosya.txt"), "ayse", "A")).toBe("failed");
    expect(ensureMemoryFile(root, "../disari", "A")).toBe("failed");
    expect(ensureMemoryFile(root, "con", "A")).toBe("failed");
    mkdirSync(fileOf(root, "klasor"), { recursive: true });
    expect(ensureMemoryFile(root, "klasor", "A")).toBe("failed");
  });

  it(".ntt-studio kök dışını gösteren bir bağsa yaratılmıyor", (ctx) => {
    const root = temp();
    const outside = temp();
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio"), "junction");
    } catch {
      ctx.skip();
    }
    expect(ensureMemoryFile(root, "ayse", "A")).toBe("failed");
    expect(readdirSync(outside)).toEqual([]);
  });
});

describe("readMemoryFile (§4, §5)", () => {
  it("içerik BOM'suz ve LF; özet diskteki baytların SHA-256'sı", () => {
    const root = temp();
    const bytes = Buffer.concat([BOM, Buffer.from("# Not\r\n- karar\r\n", "utf8")]);
    put(root, bytes);
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: true, content: "# Not\n- karar\n", stamp: memoryStamp(bytes) });
    expect(memoryStamp(bytes)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("256 KB üstü okunmuyor: tooLarge; tam sınır okunuyor", () => {
    const root = temp();
    put(root, "a".repeat(MEMORY_MAX_BYTES + 1));
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "tooLarge" });
    put(root, "a".repeat(MEMORY_MAX_BYTES));
    expect(readMemoryFile(root, "ayse").ok).toBe(true);
  });

  it("UTF-8 olmayan dosya düzenlemeye açılmıyor: encoding", () => {
    const root = temp();
    put(root, Buffer.from([0x23, 0x20, 0x49, 0xfe, 0xff, 0x0a]));
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "encoding" });
  });

  it("yok: missing; kök yok: noRoot; anahtar geçersiz ya da yerinde klasör: unsafe", () => {
    const root = temp();
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "missing" });
    expect(readMemoryFile(path.join(root, "yok"), "ayse")).toEqual({ ok: false, reason: "noRoot" });
    expect(readMemoryFile(root, "../x")).toEqual({ ok: false, reason: "unsafe" });
    mkdirSync(fileOf(root, "klasor"), { recursive: true });
    expect(readMemoryFile(root, "klasor")).toEqual({ ok: false, reason: "unsafe" });
  });

  it(".ntt-studio/bellek kök dışını gösteren bağsa okunmuyor", (ctx) => {
    const root = temp();
    const outside = temp();
    writeFileSync(path.join(outside, "ayse.md"), "dışarıdaki gizli");
    mkdirSync(path.join(root, ".ntt-studio"));
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio", "bellek"), "junction");
    } catch {
      ctx.skip();
    }
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "unsafe" });
  });
});

describe("writeMemoryFile (§4, §7: değişmiş dosya ezilmez)", () => {
  it("okunduğu gibiyse yazıyor; yeni özet ve bayt sayısı dönüyor; geçici dosya kalmıyor", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "# Not\n- yeni\n", r.stamp)).toEqual({
      ok: true,
      stamp: memoryStamp(Buffer.from("# Not\n- yeni\n", "utf8")),
      bytes: 13
    });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\n- yeni\n");
    expect(readdirSync(path.dirname(fileOf(root)))).toEqual(["ayse.md"]);
  });

  it("arada diskte değiştiyse yazmıyor: changed; ajanın yazdığı yerinde", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    put(root, "# Not\n- ajan yazdı\n");
    expect(writeMemoryFile(root, "ayse", "benim metnim", r.stamp)).toEqual({ ok: false, reason: "changed" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\n- ajan yazdı\n");
    expect(readdirSync(path.dirname(fileOf(root)))).toEqual(["ayse.md"]);
  });

  it("aynı boyutta, aynı saniyede değişiklik de yakalanıyor (özet, mtime değil)", () => {
    const root = temp();
    put(root, "aaaa");
    const r = open(root);
    put(root, "bbbb");
    expect(writeMemoryFile(root, "ayse", "cccc", r.stamp)).toEqual({ ok: false, reason: "changed" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("bbbb");
  });

  it("arada silindiyse yeniden yaratılmıyor: changed", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    rmSync(fileOf(root));
    expect(writeMemoryFile(root, "ayse", "benim metnim", r.stamp)).toEqual({ ok: false, reason: "changed" });
    expect(existsSync(fileOf(root))).toBe(false);
  });

  it("CRLF ve BOM korunuyor", () => {
    const root = temp();
    put(root, Buffer.concat([BOM, Buffer.from("a\r\nb\r\n", "utf8")]));
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "a\nb\nc\n", r.stamp).ok).toBe(true);
    expect(readFileSync(fileOf(root)).equals(Buffer.concat([BOM, Buffer.from("a\r\nb\r\nc\r\n", "utf8")]))).toBe(true);
  });

  it("LF dosyaya CRLF eklenmiyor", () => {
    const root = temp();
    put(root, "a\nb\n");
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "a\r\nb\r\nc\n", r.stamp).ok).toBe(true);
    expect(readFileSync(fileOf(root), "utf8")).toBe("a\nb\nc\n");
  });

  it("256 KB üstü metin yazılmıyor; dosya aynen kalıyor", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "ş".repeat(MEMORY_MAX_BYTES / 2 + 1), r.stamp)).toEqual({ ok: false, reason: "tooLarge" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\n");
  });

  it("kök yok: noRoot; anahtar geçersiz: unsafe", () => {
    const root = temp();
    expect(writeMemoryFile(path.join(root, "yok"), "ayse", "x", "a".repeat(64))).toEqual({ ok: false, reason: "noRoot" });
    expect(writeMemoryFile(root, "../ayse", "x", "a".repeat(64))).toEqual({ ok: false, reason: "unsafe" });
  });

  it(".ntt-studio kök dışını gösteren bağsa dışarıdaki dosya yazılmıyor", (ctx) => {
    const root = temp();
    const outside = temp();
    mkdirSync(path.join(outside, "bellek"));
    writeFileSync(path.join(outside, "bellek", "ayse.md"), "dışarı");
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio"), "junction");
    } catch {
      ctx.skip();
    }
    const stamp = memoryStamp(Buffer.from("dışarı", "utf8"));
    expect(writeMemoryFile(root, "ayse", "ezilmesin", stamp)).toEqual({ ok: false, reason: "unsafe" });
    expect(readFileSync(path.join(outside, "bellek", "ayse.md"), "utf8")).toBe("dışarı");
  });

  it.each(["EPERM", "EBUSY", "EACCES"])("rename %s verirse: writeFailed; asıl dosya aynen, geçici dosya yok", (code) => {
    const root = temp();
    put(root, "# Not\r\n- eski\r\n");
    const r = open(root);
    renameFault.code = code;
    expect(writeMemoryFile(root, "ayse", "# Not\n- yeni\n", r.stamp)).toEqual({ ok: false, reason: "writeFailed" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\r\n- eski\r\n");
    expect(readdirSync(path.dirname(fileOf(root)))).toEqual(["ayse.md"]);
  });

  it("dosya başka bir tanıtıcıda açıkken: ya tam yazılıyor ya hiç; geçici dosya kalmıyor", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    const fd = openSync(fileOf(root), "r");
    let result: ReturnType<typeof writeMemoryFile>;
    try {
      result = writeMemoryFile(root, "ayse", "# Not\n- yeni\n", r.stamp);
    } finally {
      closeSync(fd);
    }
    const after = readFileSync(fileOf(root), "utf8");
    if (result.ok) expect(after).toBe("# Not\n- yeni\n");
    else {
      expect(result).toEqual({ ok: false, reason: "writeFailed" });
      expect(after).toBe("# Not\n");
    }
    expect(readdirSync(path.dirname(fileOf(root)))).toEqual(["ayse.md"]);
  });
});

describe("memoryAbsPath", () => {
  it("güvenli yolda mutlak yol, değilse null", () => {
    const root = temp();
    expect(memoryAbsPath(root, "ayse")).toBe(fileOf(root));
    expect(memoryAbsPath(root, "../x")).toBeNull();
  });
});
