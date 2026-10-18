// Kalıcı bellek: saf mantık (spec 2026-10-18 ajan-bellegi §2, §3, §5).
import { describe, expect, it } from "vitest";
import {
  MEMORY_DIR,
  MEMORY_MAX_BYTES,
  deriveMemoryKey,
  isMemoryKey,
  isMemoryStamp,
  memoryInitialContent,
  memoryPromptLine,
  memoryRelPath,
  memoryTarget,
  takenMemoryKeys,
  uniqueMemoryKey,
  withMemoryKey
} from "../app-electron/shared/memoryLogic";
import { readAgentSpec, type AgentSpec } from "../app-electron/shared/agentTypes";
import { isSafeRelPath } from "../app-electron/shared/changesLogic";
import { normalizeTerminalWorkspaces } from "../app-electron/shared/terminalLayout";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

const ROCKET = String.fromCodePoint(0x1f680);
const LINE_SEP = String.fromCharCode(0x2028);

describe("deriveMemoryKey (§2)", () => {
  it("Türkçe harfler ASCII, küçük harf, işaretler tek tire", () => {
    expect(deriveMemoryKey("Ayşe Çağrı Öztürk")).toBe("ayse-cagri-ozturk");
    expect(deriveMemoryKey("İLKER IŞIK")).toBe("ilker-isik");
    expect(deriveMemoryKey("  --Kod  İnceleme!!  ")).toBe("kod-inceleme");
    expect(deriveMemoryKey("SAP_MM v2.0")).toBe("sap-mm-v2-0");
    expect(deriveMemoryKey("İğüşöç")).toBe("igusoc");
  });

  it("Türkçe dışı aksanlar sökülüyor", () => {
    expect(deriveMemoryKey("Kâtip José")).toBe("katip-jose");
  });

  it("boş, yalnız işaret ya da emoji → ajan", () => {
    for (const name of ["", "   ", "!!!", `${ROCKET}${ROCKET}`, "---"]) expect(deriveMemoryKey(name), name).toBe("ajan");
  });

  it("en çok 40 karakter; kesimden sonra sonda tire kalmıyor", () => {
    expect(deriveMemoryKey(`${"a".repeat(39)} b`)).toBe("a".repeat(39));
    expect(deriveMemoryKey("x".repeat(80))).toBe("x".repeat(40));
  });

  it("Windows ayrılmış adları ek alıyor", () => {
    expect(deriveMemoryKey("Con")).toBe("con-ajan");
    expect(deriveMemoryKey("NUL")).toBe("nul-ajan");
    expect(deriveMemoryKey("com1")).toBe("com1-ajan");
    expect(deriveMemoryKey("LPT9")).toBe("lpt9-ajan");
    expect(deriveMemoryKey("console")).toBe("console");
  });

  it("her türetilen anahtar desene uyuyor ve güvenli göreli yol veriyor", () => {
    for (const name of ["Ayşe", "Con", "", "x".repeat(80), "a b c", "--", "Lpt9", "İğüşöç", ROCKET, "Kâtip"]) {
      const key = deriveMemoryKey(name);
      expect(isMemoryKey(key), name).toBe(true);
      expect(isSafeRelPath(memoryRelPath(key)), name).toBe(true);
    }
  });
});

describe("isMemoryKey / isMemoryStamp (§2, §5)", () => {
  it("anahtar deseni: ^[a-z0-9][a-z0-9-]{0,39}$, ayrılmış ad yok", () => {
    for (const ok of ["a", "ayse", "ayse-2", "0", "a".repeat(40), "con-ajan"]) expect(isMemoryKey(ok), ok).toBe(true);
    for (const bad of ["", "-a", "A", "ayşe", "a".repeat(41), "../x", "a/b", "a.md", "a b", "con", "aux", "lpt1", " a", 3, null, undefined]) {
      expect(isMemoryKey(bad), String(bad)).toBe(false);
    }
  });

  it("özet: 64 küçük onaltılık", () => {
    expect(isMemoryStamp("a".repeat(64))).toBe(true);
    for (const bad of ["A".repeat(64), "a".repeat(63), "g".repeat(64), "", 5]) expect(isMemoryStamp(bad), String(bad)).toBe(false);
  });
});

describe("uniqueMemoryKey / takenMemoryKeys / withMemoryKey (§2)", () => {
  const spec: AgentSpec = { engine: "claude", role: "", roleKind: "custom" };

  it("çakışmada -2, -3; uzun anahtarda toplam yine 40, sonda tire yok", () => {
    expect(uniqueMemoryKey("ayse", new Set())).toBe("ayse");
    expect(uniqueMemoryKey("ayse", new Set(["ayse"]))).toBe("ayse-2");
    expect(uniqueMemoryKey("ayse", new Set(["ayse", "ayse-2"]))).toBe("ayse-3");
    const long = "a".repeat(40);
    expect(uniqueMemoryKey(long, new Set([long]))).toBe(`${"a".repeat(38)}-2`);
    const dashy = `${"a".repeat(37)}-bc`;
    expect(uniqueMemoryKey(dashy, new Set([dashy]))).toBe(`${"a".repeat(37)}-2`);
  });

  it("bütün alanlardaki anahtarlar sayılıyor; varsa dokunulmuyor", () => {
    const workspaces = [
      { panes: [{ agent: { ...spec, memory: "ayse" } }, {}] },
      { panes: [{ agent: { ...spec, memory: "ayse-2" } }, { agent: { ...spec } }] }
    ];
    expect(takenMemoryKeys(workspaces)).toEqual(new Set(["ayse", "ayse-2"]));
    expect(withMemoryKey(spec, "Ayşe", workspaces)).toEqual({ ...spec, memory: "ayse-3" });
    expect(withMemoryKey({ ...spec, memory: "eski" }, "Ayşe", workspaces)).toEqual({ ...spec, memory: "eski" });
    expect(withMemoryKey(spec, "Mehmet", workspaces)).toEqual({ ...spec, memory: "mehmet" });
  });
});

describe("ilk içerik ve istem satırı (§2, §3)", () => {
  it("ilk içerik: başlık + boş satır + tek satır açıklama", () => {
    expect(memoryInitialContent("Ayşe")).toBe(
      "# Ayşe — kalıcı bellek\n\nBu dosyayı ajan ve sen birlikte tutarsınız; kalıcı kararlar, öğrenilenler, yarım işler.\n"
    );
  });

  it("başlıkta satır sonu ve ayırıcı yok; boş ad → Ajan", () => {
    expect(memoryInitialContent(` a\nb${LINE_SEP}c `).split("\n")[0]).toBe("# a b c — kalıcı bellek");
    expect(memoryInitialContent("   ").split("\n")[0]).toBe("# Ajan — kalıcı bellek");
    expect(memoryInitialContent("x".repeat(100)).split("\n")[0]).toBe(`# ${"x".repeat(60)} — kalıcı bellek`);
  });

  it("istem satırı spec'teki metin; tek satır, yalnız yazdırılabilir ASCII, ≤ 4000, `!`/`/` ile başlamıyor", () => {
    const line = memoryPromptLine("ayse-2");
    expect(line).toBe(
      "[Bellek] Kalici bellegin: .ntt-studio/bellek/ayse-2.md (alan kokune gore). Once oku. Kalici kararlari, ogrendiklerini ve yarim isleri oraya kisa maddelerle yaz; gizli bilgi (sifre, token) yazma."
    );
    expect(line).toMatch(/^[ -~]+$/);
    expect(line.length).toBeLessThanOrEqual(4000);
    expect(line).not.toMatch(/^[!/]/);
  });

  it("yol ve sınır", () => {
    expect(memoryRelPath("ayse")).toBe(`${MEMORY_DIR}/ayse.md`);
    expect(MEMORY_DIR).toBe(".ntt-studio/bellek");
    expect(MEMORY_MAX_BYTES).toBe(262_144);
  });
});

describe("memoryTarget (§2, §6)", () => {
  const ws = (over: Partial<SavedTerminalWorkspace> = {}): SavedTerminalWorkspace => ({
    id: "w1",
    name: "A",
    panes: [
      { id: "p1", kind: "agent", cwd: "C:\\ajan", title: "Ayşe", agent: { engine: "claude", role: "", roleKind: "custom", memory: "ayse" } },
      { id: "p2", kind: "agent", cwd: "C:\\ajan", agent: { engine: "codex", role: "", roleKind: "custom" } },
      { id: "p3", kind: "cmd", cwd: "C:\\ajan" },
      { id: "p4", kind: "agent", cwd: "C:\\ajan4", agent: { engine: "gemini", role: "", roleKind: "custom", memory: "gemini" } }
    ],
    ...over
  });

  it("kök varsa kök, yoksa ajanın klasörü; ad yoksa motor", () => {
    expect(memoryTarget([ws({ root: "C:\\kok" })], "w1", "p1")).toEqual({ root: "C:\\kok", key: "ayse", name: "Ayşe" });
    expect(memoryTarget([ws()], "w1", "p1")).toEqual({ root: "C:\\ajan", key: "ayse", name: "Ayşe" });
    expect(memoryTarget([ws({ root: "   " })], "w1", "p4")).toEqual({ root: "C:\\ajan4", key: "gemini", name: "gemini" });
  });

  it("bellek kapalı, kabuk, başka alan, olmayan bölme: null", () => {
    expect(memoryTarget([ws()], "w1", "p2")).toBeNull();
    expect(memoryTarget([ws()], "w1", "p3")).toBeNull();
    expect(memoryTarget([ws()], "w2", "p1")).toBeNull();
    expect(memoryTarget([ws(), { ...ws(), id: "w2", panes: [] }], "w2", "p1")).toBeNull();
    expect(memoryTarget([ws()], "w1", "yok")).toBeNull();
  });

  it("geçersiz anahtar (elle düzenlenmiş kayıt): null", () => {
    const bad = ws();
    bad.panes[0] = { ...bad.panes[0], agent: { engine: "claude", role: "", roleKind: "custom", memory: "../disari" } };
    expect(memoryTarget([bad], "w1", "p1")).toBeNull();
  });
});

describe("AgentSpec.memory (§5)", () => {
  it("geçerli anahtar kalıyor; geçersiz olan atılıyor, ajan yine okunuyor", () => {
    expect(readAgentSpec({ engine: "claude", role: "", roleKind: "custom", memory: "ayse" })).toEqual({
      engine: "claude",
      role: "",
      roleKind: "custom",
      memory: "ayse"
    });
    for (const memory of ["../x", "Ayşe", "con", 5, "", "a".repeat(41), null]) {
      expect(readAgentSpec({ engine: "claude", role: "", roleKind: "custom", memory }), String(memory)).toEqual({
        engine: "claude",
        role: "",
        roleKind: "custom"
      });
    }
  });

  it("config'ten okunan bölmede anahtar korunuyor; eski kayıt etkilenmiyor", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [
          { id: "p1", kind: "agent", cwd: "C:\\a", agent: { engine: "claude", role: "", roleKind: "custom", memory: "ayse" } },
          { id: "p2", kind: "agent", cwd: "C:\\a", agent: { engine: "claude", role: "", roleKind: "custom" } },
          { id: "p3", kind: "axet", cwd: "C:\\a" }
        ]
      }
    ];
    const panes = normalizeTerminalWorkspaces(raw, (n) => `Alan ${n}`)[0].panes;
    expect(panes[0].agent?.memory).toBe("ayse");
    expect(panes[1].agent).toEqual({ engine: "claude", role: "", roleKind: "custom" });
    expect(panes[2].agent && "memory" in panes[2].agent).toBe(false);
  });
});
