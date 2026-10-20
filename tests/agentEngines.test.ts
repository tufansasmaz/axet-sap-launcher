// Ajan motorları, komut kurma ve kayıttan okuma (spec 2026-10-17 ajan-alani §3, §5, §7).
import { describe, expect, it } from "vitest";
import { buildAgentCommand, engineBinary, ENGINE_INSTALL, isSafeArg, isSetupKey, SETUP_COMMANDS, SETUP_KEYS, setupLine } from "../app-electron/shared/agentEngines";
import { LEGACY_AXET_AGENT, readAgentSpec, type AgentQuestion, type AgentSpec } from "../app-electron/shared/agentTypes";
import { LIST_ANSWER_ENABLED, isListAnswerable, optionKeys } from "../app-electron/shared/agentDecisions";

const spec = (over: Partial<AgentSpec>): AgentSpec => ({ engine: "claude", role: "", roleKind: "custom", ...over });

describe("buildAgentCommand", () => {
  it("axet-code: ayarlardaki komut, boşsa axet-code -y", () => {
    expect(buildAgentCommand(LEGACY_AXET_AGENT, "")).toBe("axet-code -y");
    expect(buildAgentCommand(LEGACY_AXET_AGENT, "  axet-code -y -d ")).toBe("axet-code -y -d");
  });

  it("axet-code ajanı --agent ile; serbest rol bayrağa girmiyor", () => {
    expect(buildAgentCommand({ engine: "axet-code", role: "coder", roleKind: "axetAgent" }, "")).toBe("axet-code -y --agent coder");
    expect(buildAgentCommand({ engine: "axet-code", role: "Analist", roleKind: "custom" }, "")).toBe("axet-code -y");
  });

  it("axet-code'a model bayrağı eklenmiyor (TUI'de yok, spec §14)", () => {
    expect(buildAgentCommand({ ...LEGACY_AXET_AGENT, model: "large" }, "")).toBe("axet-code -y");
  });

  it("model yalnız bayrağı bilinen motorlarda", () => {
    expect(buildAgentCommand(spec({ engine: "claude", model: "sonnet" }), "")).toBe(`claude --allowedTools "Bash(ntt-team:*)" --model sonnet`);
    expect(buildAgentCommand(spec({ engine: "codex", model: "gpt-5" }), "")).toBe("codex --model gpt-5");
    expect(buildAgentCommand(spec({ engine: "gemini", model: "gemini-2.5-pro" }), "")).toBe("gemini --model gemini-2.5-pro");
    // Tur 10: Claude ajanında ntt-team için tek izin kuralı.
    expect(buildAgentCommand(spec({ engine: "claude" }), "")).toBe(`claude --allowedTools "Bash(ntt-team:*)"`);
  });

  it("öteki motorlara izin atlatma bayrağı eklenmiyor", () => {
    for (const engine of ["claude", "codex", "gemini"] as const) {
      const cmd = buildAgentCommand(spec({ engine, model: "m1", role: "Geliştirici", roleKind: "preset" }), "axet-code -y");
      expect(cmd).not.toMatch(/dangerously|--yolo|(^|\s)-y(\s|$)|bypass|full-auto/);
    }
  });

  it("kabuk karakterli model ve rol komuta girmiyor", () => {
    expect(buildAgentCommand(spec({ model: "x & del C:\\" }), "")).toBe(`claude --allowedTools "Bash(ntt-team:*)"`);
    expect(buildAgentCommand({ engine: "axet-code", role: "coder & calc", roleKind: "axetAgent" }, "")).toBe("axet-code -y");
  });

  it("özel motor: kullanıcının komutu kırpılıp olduğu gibi", () => {
    expect(buildAgentCommand({ engine: "ozel", role: "", roleKind: "custom", command: "  opencode --port 1 " }, "")).toBe("opencode --port 1");
  });
});

describe("engineBinary ve isSafeArg", () => {
  it("bilinen motorda program adı, özelde komutun ilk parçası (tırnaklı yol dahil)", () => {
    expect(engineBinary(spec({ engine: "codex" }))).toBe("codex");
    expect(engineBinary(LEGACY_AXET_AGENT)).toBe("axet-code");
    expect(engineBinary({ engine: "ozel", role: "", roleKind: "custom", command: "kiro-cli chat" })).toBe("kiro-cli");
    expect(engineBinary({ engine: "ozel", role: "", roleKind: "custom", command: '"C:\\Program Files\\Kiro\\kiro.exe" chat' })).toBe(
      "C:\\Program Files\\Kiro\\kiro.exe"
    );
    expect(engineBinary({ engine: "ozel", role: "", roleKind: "custom", command: "  " })).toBeNull();
  });

  it("güvenli argüman: harf/rakamla başlar, boşluk ve kabuk karakteri yok", () => {
    expect(isSafeArg("anthropic/claude-sonnet-4")).toBe(true);
    expect(isSafeArg("gpt-5")).toBe(true);
    expect(isSafeArg("-y")).toBe(false);
    expect(isSafeArg("a b")).toBe(false);
    expect(isSafeArg("a|b")).toBe(false);
    expect(isSafeArg("")).toBe(false);
  });
});

describe("readAgentSpec", () => {
  it("bozuk değer ve bilinmeyen motor null", () => {
    for (const raw of [undefined, null, "x", 3, {}, { engine: "bash" }]) expect(readAgentSpec(raw)).toBeNull();
  });

  it("özel motor komutsuzsa null", () => {
    expect(readAgentSpec({ engine: "ozel", role: "", roleKind: "custom" })).toBeNull();
    expect(readAgentSpec({ engine: "ozel", command: "   " })).toBeNull();
  });

  it("geçerli değer temizleniyor: rol kırpılıyor, bilinmeyen rol türü serbest, boş model atılıyor", () => {
    expect(readAgentSpec({ engine: "claude", role: `  ${"r".repeat(60)}  `, roleKind: "garip", model: "  " })).toEqual({
      engine: "claude",
      role: "r".repeat(40),
      roleKind: "custom"
    });
    expect(readAgentSpec({ engine: "axet-code", role: "coder", roleKind: "axetAgent" })).toEqual({
      engine: "axet-code",
      role: "coder",
      roleKind: "axetAgent"
    });
    expect(readAgentSpec({ engine: "ozel", command: " opencode ", model: "m" })).toEqual({
      engine: "ozel",
      role: "",
      roleKind: "custom",
      model: "m",
      command: "opencode"
    });
  });
});

describe("Kararlar yardımcıları", () => {
  const q = (over: Partial<AgentQuestion>): AgentQuestion => ({
    callId: "c1",
    question: "Hangi renk?",
    header: "",
    options: ["Kırmızı", "Mavi"],
    multiSelect: false,
    askedAt: 0,
    ...over
  });

  it("seçenek tuş dizisi: i kez aşağı ok + Enter", () => {
    expect(optionKeys(0)).toBe("\r");
    expect(optionKeys(2)).toBe("\x1b[B\x1b[B\r");
    expect(optionKeys(-3)).toBe("\r");
  });

  it("çok seçimli ve tek seçenekli soru listeden cevaplanmıyor", () => {
    expect(isListAnswerable(q({ multiSelect: true }))).toBe(false);
    expect(isListAnswerable(q({ options: ["Tek"] }))).toBe(false);
  });

  it("tek seçimli iki seçenekli soru Task 1 kararına göre", () => {
    expect(isListAnswerable(q({}))).toBe(LIST_ANSWER_ENABLED);
  });
});

describe("Kurulum komutları (Araçlar → Kur)", () => {
  it("tablo sabit, resmi ve yalnız bu dört anahtar", () => {
    expect(SETUP_KEYS).toEqual(["claude", "codex", "gemini", "node"]);
    expect(SETUP_COMMANDS).toEqual({
      claude: "npm install -g @anthropic-ai/claude-code",
      codex: "npm install -g @openai/codex",
      gemini: "npm install -g @google/gemini-cli",
      node: "winget install OpenJS.NodeJS.LTS"
    });
    expect(Object.isFrozen(SETUP_COMMANDS)).toBe(true);
  });

  it("Araçlar'daki kopyalanan komut aynı tablodan", () => {
    expect(ENGINE_INSTALL.claude).toBe(SETUP_COMMANDS.claude);
    expect(ENGINE_INSTALL.codex).toBe(SETUP_COMMANDS.codex);
    expect(ENGINE_INSTALL.gemini).toBe(SETUP_COMMANDS.gemini);
    expect(ENGINE_INSTALL["axet-code"]).toBeNull();
    expect(ENGINE_INSTALL.ozel).toBeNull();
  });

  it("beyaz liste: bilinmeyen anahtar reddediliyor", () => {
    expect(isSetupKey("claude")).toBe(true);
    expect(isSetupKey("node")).toBe(true);
    for (const bad of ["axet-code", "ozel", "", "claude & del", "toString", "__proto__", null, 3]) {
      expect(isSetupKey(bad)).toBe(false);
    }
  });

  it("kabuğa yazılan satır: komut, başarıda kabuk kapanır", () => {
    expect(setupLine("codex")).toBe("npm install -g @openai/codex && exit");
    expect(setupLine("node")).toBe("winget install OpenJS.NodeJS.LTS && exit");
  });
});
