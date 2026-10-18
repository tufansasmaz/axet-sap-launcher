// Bellek penceresinin ana süreç tarafı (spec 2026-10-18 ajan-bellegi §4, §6): sahte bağımlılıklarla.
import { describe, expect, it, vi } from "vitest";
import { createMemoryService } from "../app-electron/main/memoryService";
import type { MemoryEnsure, MemoryFileRead, MemoryFileWrite } from "../app-electron/main/memoryFiles";
import type { MemoryNotice } from "../app-electron/shared/memoryLogic";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

const STAMP = "a".repeat(64);
const WORKSPACES: SavedTerminalWorkspace[] = [
  {
    id: "w1",
    name: "A",
    root: "C:\\kok",
    panes: [
      { id: "p1", kind: "agent", cwd: "C:\\kok", title: "Ayşe", agent: { engine: "claude", role: "", roleKind: "custom", memory: "ayse" } },
      { id: "p2", kind: "agent", cwd: "C:\\kok", agent: { engine: "claude", role: "", roleKind: "custom" } }
    ]
  },
  {
    id: "w2",
    name: "B",
    panes: [{ id: "q1", kind: "agent", cwd: "C:\\b", agent: { engine: "claude", role: "", roleKind: "custom", memory: "mehmet" } }]
  }
];

function harness() {
  const deps = {
    workspaces: vi.fn(() => WORKSPACES),
    ensure: vi.fn((_r: string, _k: string, _n: string): MemoryEnsure => "exists"),
    read: vi.fn((_r: string, _k: string): MemoryFileRead => ({ ok: true, content: "# Ayşe\n", stamp: STAMP })),
    write: vi.fn((_r: string, _k: string, _c: string, _s: string): MemoryFileWrite => ({ ok: true, stamp: "b".repeat(64), bytes: 9 })),
    absPath: vi.fn((root: string, key: string): string | null => `${root}\\.ntt-studio\\bellek\\${key}.md`),
    reveal: vi.fn(),
    notice: vi.fn((_p: string): MemoryNotice => "sent"),
    renotify: vi.fn((_p: string) => true),
    log: vi.fn()
  };
  return { deps, service: createMemoryService(deps) };
}

describe("read (§4)", () => {
  it("önce yalnız-yoksa yaratma, sonra okuma; yol göreli, bildirim durumu ekli", () => {
    const { deps, service } = harness();
    expect(service.read("w1", "p1")).toEqual({ ok: true, rel: ".ntt-studio/bellek/ayse.md", content: "# Ayşe\n", stamp: STAMP, notice: "sent" });
    expect(deps.ensure).toHaveBeenCalledWith("C:\\kok", "ayse", "Ayşe");
    // Dosyanın son değişikliği varsa sonuçta da var (Tur 3).
    deps.read.mockReturnValueOnce({ ok: true, content: "# Ayşe\n", stamp: STAMP, mtime: 1700 });
    expect(service.read("w1", "p1")).toMatchObject({ ok: true, mtime: 1700 });
    expect(deps.ensure.mock.invocationCallOrder[0]).toBeLessThan(deps.read.mock.invocationCallOrder[0]);
    expect(deps.read).toHaveBeenCalledWith("C:\\kok", "ayse");
  });

  it("dosya hatası sebebiyle dönüyor; yok (yaratılamadı) → readFailed", () => {
    const { deps, service } = harness();
    for (const reason of ["tooLarge", "encoding", "unsafe", "noRoot", "readFailed"] as const) {
      deps.read.mockReturnValueOnce({ ok: false, reason });
      expect(service.read("w1", "p1")).toEqual({ ok: false, reason, rel: ".ntt-studio/bellek/ayse.md", notice: "sent" });
    }
    deps.read.mockReturnValueOnce({ ok: false, reason: "missing" });
    expect(service.read("w1", "p1")).toMatchObject({ ok: false, reason: "readFailed" });
  });

  it("başka alanın bölmesi, bellek kapalı bölme, geçersiz kimlik: noMemory ve dosyaya dokunulmuyor", () => {
    const { deps, service } = harness();
    for (const [w, p] of [
      ["w1", "q1"],
      ["w2", "p1"],
      ["w1", "p2"],
      ["w1", "yok"],
      ["../w1", "p1"],
      [5, "p1"],
      ["w1", ""],
      ["w1", "x".repeat(101)],
      [null, null]
    ] as [unknown, unknown][]) {
      expect(service.read(w, p), `${String(w)}/${String(p)}`).toEqual({ ok: false, reason: "noMemory" });
    }
    expect(deps.ensure).not.toHaveBeenCalled();
    expect(deps.read).not.toHaveBeenCalled();
  });

  it("bağımlılık fırlatırsa fırlatmıyor", () => {
    const { deps, service } = harness();
    deps.read.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(service.read("w1", "p1")).toMatchObject({ ok: false, reason: "readFailed" });
    deps.workspaces.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(service.read("w1", "p1")).toEqual({ ok: false, reason: "noMemory" });
  });
});

describe("write (§4, §6, §7)", () => {
  it("okunduğu andaki özetle yazıyor; günlükte yalnız sonuç ve bayt", () => {
    const { deps, service } = harness();
    expect(service.write("w1", "p1", "# Ayşe\n- yeni\n", STAMP)).toEqual({ ok: true, stamp: "b".repeat(64) });
    expect(deps.write).toHaveBeenCalledWith("C:\\kok", "ayse", "# Ayşe\n- yeni\n", STAMP);
    expect(deps.log).toHaveBeenCalledWith("bellek.kaydet", { sonuc: "tamam", bayt: 9 });
  });

  it("değişmiş dosya: changed döner, günlükte sebep", () => {
    const { deps, service } = harness();
    deps.write.mockReturnValueOnce({ ok: false, reason: "changed" });
    expect(service.write("w1", "p1", "x", STAMP)).toEqual({ ok: false, reason: "changed" });
    expect(deps.log).toHaveBeenCalledWith("bellek.kaydet", { sonuc: "changed", bayt: 0 });
  });

  it("geçersiz metin ya da özet: invalid, dosyaya gidilmiyor", () => {
    const { deps, service } = harness();
    expect(service.write("w1", "p1", 5, STAMP)).toEqual({ ok: false, reason: "invalid" });
    expect(service.write("w1", "p1", "x", "kisa")).toEqual({ ok: false, reason: "invalid" });
    expect(service.write("w1", "p1", "x", undefined)).toEqual({ ok: false, reason: "invalid" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("sınırı aşan metin dosyaya gitmeden tooLarge; bellek kapalı bölme noMemory", () => {
    const { deps, service } = harness();
    expect(service.write("w1", "p1", "a".repeat(256 * 1024 + 1), STAMP)).toEqual({ ok: false, reason: "tooLarge" });
    expect(service.write("w1", "p2", "x", STAMP)).toEqual({ ok: false, reason: "noMemory" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("günlükte metin, anahtar ya da yol yok", () => {
    const { deps, service } = harness();
    service.write("w1", "p1", "gizli metin", STAMP);
    expect(JSON.stringify(deps.log.mock.calls)).not.toMatch(/gizli|ayse|kok|bellek\//);
  });

  it("yazma fırlatırsa writeFailed", () => {
    const { deps, service } = harness();
    deps.write.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(service.write("w1", "p1", "x", STAMP)).toEqual({ ok: false, reason: "writeFailed" });
  });
});

describe("reveal / renotify", () => {
  it("yalnız kayıtlı bellek bölmesinde; yol ana süreçte kuruluyor", () => {
    const { deps, service } = harness();
    expect(service.reveal("w1", "p1")).toBe(true);
    expect(deps.reveal).toHaveBeenCalledWith("C:\\kok\\.ntt-studio\\bellek\\ayse.md");
    expect(service.reveal("w1", "p2")).toBe(false);
    deps.absPath.mockReturnValueOnce(null);
    expect(service.reveal("w1", "p1")).toBe(false);
    expect(deps.reveal).toHaveBeenCalledTimes(1);
    expect(service.renotify("w1", "p1")).toBe(true);
    expect(deps.renotify).toHaveBeenCalledWith("p1");
    expect(service.renotify("w2", "p1")).toBe(false);
    expect(deps.renotify).toHaveBeenCalledTimes(1);
  });
});
