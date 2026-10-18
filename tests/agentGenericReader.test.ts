// Genel (tahmini) okuyucu: terminal hareketinden durum (spec 2026-10-17 ajan-alani §6.3).
import { describe, expect, it } from "vitest";
import {
  GenericReader,
  IDLE_AFTER_MS,
  commandToken,
  genericAgentReader,
  isShellPromptLine,
  lastLine,
  stripAnsi
} from "../app-electron/main/agentGenericReader";

function setup(command = "claude --model sonnet", idleAfterMs?: number) {
  const clock = { ms: 1_000_000 };
  const reader = new GenericReader({ command, now: () => clock.ms, idleAfterMs });
  return { clock, reader };
}

describe("GenericReader", () => {
  it("çıktı yokken bilinmiyor, kaynak tahmini", () => {
    const { reader } = setup();
    expect(reader.status()).toEqual({ state: "unknown", source: "estimated", lastActivity: null });
  });

  it("çıktı gelince çalışıyor; 20 sn sessizlikte boşta", () => {
    const { clock, reader } = setup();
    reader.feedOutput("x");
    expect(reader.status()).toEqual({ state: "running", source: "estimated", lastActivity: 1_000_000 });
    clock.ms += IDLE_AFTER_MS - 1;
    expect(reader.status().state).toBe("running");
    clock.ms += 1;
    expect(reader.status()).toEqual({ state: "idle", source: "estimated", lastActivity: 1_000_000 });
  });

  it("eşik enjekte edilebiliyor", () => {
    const { clock, reader } = setup("codex", 1_000);
    reader.feedOutput("x");
    clock.ms += 1_000;
    expect(reader.status().state).toBe("idle");
  });

  it("komut yankısından sonra kabuk istemi dönünce bitti (cmd)", () => {
    const { reader } = setup();
    reader.feedOutput("Microsoft Windows [Version 10.0]\r\n\r\nC:\\proje>");
    reader.feedOutput("claude --model sonnet\r\n");
    reader.feedOutput("\x1b[?1049h\x1b[2J  ● Claude Code  \x1b[1;1H");
    expect(reader.engineExited()).toBe(false);
    reader.feedOutput("\x1b[?1049l\r\nC:\\proje>");
    expect(reader.engineExited()).toBe(true);
    expect(reader.status().state).toBe("finished");
    expect(reader.status().source).toBe("estimated");
  });

  it("PowerShell istemi de tanınıyor", () => {
    const { reader } = setup("codex");
    reader.feedOutput("PS C:\\proje> codex\r\n");
    reader.feedOutput("...çalışıyor...\r\n");
    reader.feedOutput("PS C:\\proje> ");
    expect(reader.status().state).toBe("finished");
  });

  it("yankıdan önceki ilk istem 'bitti' sayılmıyor (açılış yarışı)", () => {
    const { reader } = setup();
    reader.feedOutput("Microsoft Windows\r\n\r\nC:\\proje>");
    expect(reader.engineExited()).toBe(false);
    expect(reader.status().state).toBe("running");
  });

  it("bittikten sonra yeni çıktı yeniden çalışıyor", () => {
    const { reader } = setup();
    reader.feedOutput("C:\\proje>claude --model sonnet\r\nC:\\proje>");
    expect(reader.status().state).toBe("finished");
    reader.feedOutput("claude\r\n\x1b[2J yeniden açıldı");
    expect(reader.status().state).toBe("running");
  });

  it("engineReady: yankıdan önce ve yankının kendisi yetmiyor; yankıdan sonra motor çıktısı görülünce hazır", () => {
    const { reader } = setup();
    reader.feedOutput("Microsoft Windows [Version 10.0]\r\n\r\nC:\\proje>");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("claude --model sonnet\r\n");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("\x1b[?25l\x1b[2J");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("\x1b[1;1H  ● Claude Code  ");
    expect(reader.engineReady()).toBe(true);
    expect(genericAgentReader(reader).engineReady()).toBe(true);
  });

  it("engineReady: yankı ve motor çıktısı aynı parçada gelince de hazır; komutsuz okuyucuda ilk çıktı yeter", () => {
    const { reader } = setup("codex");
    reader.feedOutput("PS C:\\proje> codex\r\n>_ OpenAI Codex");
    expect(reader.engineReady()).toBe(true);
    const bare = setup("").reader;
    expect(bare.engineReady()).toBe(false);
    bare.feedOutput("x");
    expect(bare.engineReady()).toBe(true);
  });

  it("engineReady: kabuk istemi gorulunce false, motor yeniden acilip cikti gelince yeniden true", () => {
    const { reader } = setup();
    reader.feedOutput("C:\\proje>claude --model sonnet\r\n");
    reader.feedOutput("  \u25cf Claude Code  ");
    expect(reader.engineReady()).toBe(true);
    reader.feedOutput("\x1b[?1049lC:\\proje>");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("C:\\proje>claude --model sonnet\r\n");
    expect(reader.engineReady()).toBe(false);
    reader.feedOutput("  \u25cf Claude Code  ");
    expect(reader.engineReady()).toBe(true);
  });

  it("genericAgentReader sarmalayıcısı satırları yok sayıyor, durumu aktarıyor", () => {
    const { reader } = setup();
    const wrapped = genericAgentReader(reader);
    wrapped.submitLine("gizli istem");
    wrapped.poll();
    wrapped.feedOutput("x");
    expect(wrapped.status().state).toBe("running");
    expect(() => wrapped.dispose()).not.toThrow();
  });
});

describe("yardımcılar", () => {
  it("stripAnsi renk, imleç, başlık ve karakter kümesi dizilerini siliyor", () => {
    expect(stripAnsi("\x1b[31mkırmızı\x1b[0m \x1b]0;başlık\x07son\x1b(B\x1b=")).toBe("kırmızı son");
  });

  it("isShellPromptLine", () => {
    expect(isShellPromptLine("C:\\a b\\c>")).toBe(true);
    expect(isShellPromptLine("PS C:\\x> ")).toBe(true);
    expect(isShellPromptLine("C:\\a>dir")).toBe(false);
    expect(isShellPromptLine("> ")).toBe(false);
    expect(isShellPromptLine("")).toBe(false);
  });

  it("isShellPromptLine PowerShell: kök sürücü, boşluklu ve Türkçe yol; özel istem (oh-my-posh) bilinen sınır", () => {
    expect(isShellPromptLine("PS D:\\>")).toBe(true);
    expect(isShellPromptLine("PS C:\\Users\\Ali Veli\\Masaüstü\\proje> ")).toBe(true);
    expect(isShellPromptLine("PS C:\\proje> axet-code -y")).toBe(false);
    // Bilinen sınır: özel istem tanınmıyor (rehberde yazılı).
    expect(isShellPromptLine("❯ ")).toBe(false);
  });

  it("lastLine boş satırları atlıyor; commandToken tırnaklı yolu tanıyor", () => {
    expect(lastLine("a\r\nb\r\n\r\n  ")).toBe("b");
    expect(commandToken('  "C:\\Program Files\\x.exe" --a')).toBe("C:\\Program Files\\x.exe");
    expect(commandToken("axet-code -y --agent coder")).toBe("axet-code");
    expect(commandToken("")).toBe("");
  });
});
