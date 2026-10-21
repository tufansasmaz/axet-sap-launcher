// Tur 12: kabuk bölmesinde kullanıcı bir ajan motoru başlatınca (satırın ilk
// sözcüğü axet-code/claude/codex/gemini ya da Claude'un kurumsal başlatıcısı)
// bölme ajan olarak tanınıyor. Satır yalnız bellekte; günlüğe yalnız motor.

import { describe, expect, it } from "vitest";
import { engineOfCommandLine } from "../app-electron/shared/agentEngines";
import { createShellAgentWatch } from "../app-electron/main/shellAgentWatch";

describe("engineOfCommandLine", () => {
  it("ilk sözcük motor adıysa motoru veriyor", () => {
    expect(engineOfCommandLine("claude")).toBe("claude");
    expect(engineOfCommandLine("  codex --model gpt-5")).toBe("codex");
    expect(engineOfCommandLine("gemini")).toBe("gemini");
    expect(engineOfCommandLine("axet-code -y")).toBe("axet-code");
  });

  it("yol, uzantı ve büyük harf önemsiz", () => {
    expect(engineOfCommandLine("C:\\tools\\Claude.cmd --continue")).toBe("claude");
    expect(engineOfCommandLine('"C:\\Program Files\\x\\axet-code.exe" -y')).toBe("axet-code");
    expect(engineOfCommandLine("./gemini.ps1")).toBe("gemini");
  });

  it("motor olmayan satır ya da motor adı başka yerde: null", () => {
    expect(engineOfCommandLine("dir")).toBeNull();
    expect(engineOfCommandLine("claude-foo")).toBeNull();
    expect(engineOfCommandLine("echo claude")).toBeNull();
    expect(engineOfCommandLine("")).toBeNull();
  });

  it("ek adlar (Claude'un kurumsal başlatıcısı) tanınıyor", () => {
    expect(engineOfCommandLine("azure --continue", { azure: "claude" })).toBe("claude");
    expect(engineOfCommandLine("C:\\bin\\azure.bat", { azure: "claude" })).toBe("claude");
  });
});

describe("createShellAgentWatch", () => {
  const setup = (extra: Record<string, "claude"> = {}) => {
    const seen: { ptyId: string; engine: string; command: string }[] = [];
    const watch = createShellAgentWatch({ extraNames: () => extra, onLaunch: (ptyId, engine, command) => seen.push({ ptyId, engine, command }) });
    return { watch, seen };
  };

  it("Enter'la gönderilen motor satırını bildiriyor, harf harf yazılsa da", () => {
    const { watch, seen } = setup();
    for (const ch of "claude") watch.feed("p1", ch);
    expect(seen).toHaveLength(0);
    watch.feed("p1", "\r");
    expect(seen).toEqual([{ ptyId: "p1", engine: "claude", command: "claude" }]);
  });

  it("bölmeler ayrı tamponda; motor olmayan satır sessiz", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "cla");
    watch.feed("p2", "dir\r");
    watch.feed("p1", "ude\r");
    expect(seen.map((s) => s.ptyId)).toEqual(["p1"]);
  });

  it("Ctrl+C taslağı siliyor; forget tamponu bırakıyor", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "codex\x03dir\r");
    expect(seen).toHaveLength(0);
    watch.feed("p1", "gemi");
    watch.forget("p1");
    watch.feed("p1", "ni\r");
    expect(seen).toHaveLength(0);
  });

  it("ek ad o anki listeden okunuyor", () => {
    const { watch, seen } = setup({ azure: "claude" });
    watch.feed("p1", "azure --continue\r");
    expect(seen).toEqual([{ ptyId: "p1", engine: "claude", command: "azure --continue" }]);
  });
});

// Tur 13: ↑ ile geçmişten çağrılan komut tamponda görünmüyor; ikinci sinyal
// motorun açılış imzası (ölçüm: axet-code 1.4.1 başlığı "NTT DATA, Inc." + sürüm,
// renk kodları arada). cmd/PowerShell'de tek başına Esc satırı siliyor.
describe("Tur 13: geçmişten çağrı ve Esc", () => {
  const AXET_BANNER = " ╱╱╱╱╱╱ NTT DATA, Inc.       \x1b[38;2;33;158;188m1.4.1 \x1b[38;2;2;48;71m╱╱╱╱";
  const setup = () => {
    let clock = 0;
    const seen: { ptyId: string; engine: string; command: string }[] = [];
    const watch = createShellAgentWatch({ extraNames: () => ({}), onLaunch: (ptyId, engine, command) => seen.push({ ptyId, engine, command }), now: () => clock });
    return { watch, seen, advance: (ms: number) => (clock += ms) };
  };

  it("↑ + Enter sonrası axet-code başlığı çıktıda görülünce bildiriyor", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "\x1b[A");
    watch.feed("p1", "\r");
    expect(seen).toHaveLength(0);
    watch.output("p1", "\x1b[2J\x1b[H");
    watch.output("p1", AXET_BANNER);
    expect(seen).toEqual([{ ptyId: "p1", engine: "axet-code", command: "axet-code" }]);
    watch.output("p1", AXET_BANNER);
    expect(seen).toHaveLength(1);
  });

  it("Claude başlangıç ekranı da tanınıyor (parça parça gelse de)", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "\x1bOA\r");
    watch.output("p1", "╭───╮\r\n│ ✻ Welcome to Cla");
    watch.output("p1", "ude Code! │");
    expect(seen.map((s) => s.engine)).toEqual(["claude"]);
  });

  it("geçmiş çağrısı olmadan imza yok sayılıyor (ör. type dosya)", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "type banner.txt\r");
    watch.output("p1", AXET_BANNER);
    expect(seen).toHaveLength(0);
  });

  it("süre dolunca bekleme bitiyor", () => {
    const { watch, seen, advance } = setup();
    watch.feed("p1", "\x1b[A\r");
    advance(60_000);
    watch.output("p1", AXET_BANNER);
    expect(seen).toHaveLength(0);
  });

  it("satırdan tanınan motor ikinci kez bildirilmiyor (imza da gelse)", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "\x1b[A");
    watch.feed("p1", "\x1b[Baxet-code -y\r");
    watch.output("p1", AXET_BANNER);
    expect(seen).toHaveLength(1);
  });

  it("tek başına Esc satırı siliyor (cmd); ok tuşları silmiyor", () => {
    const { watch, seen } = setup();
    watch.feed("p1", "codex");
    watch.feed("p1", "\x1b");
    watch.feed("p1", "\r");
    expect(seen).toHaveLength(0);
    watch.feed("p1", "gemi");
    watch.feed("p1", "\x1b[D\x1b[C");
    watch.feed("p1", "ni\r");
    expect(seen.map((s) => s.engine)).toEqual(["gemini"]);
  });
});
