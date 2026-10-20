// Tur 11: kesin kaynak yokken ajanın son cevabı terminal ekranından (≈).
// Ekran düzenleri ölçülen gerçek çıktıdan (.superpowers/olcum/tur11: Claude Code 2.1.304
// ve axet-code 1.4.1 ham ConPTY → küçük VT); metinler buraya yeniden yazıldı.
import { describe, expect, it } from "vitest";
import { extractTerminalReply } from "../app-electron/main/terminalReply";

const RULE = "─".repeat(60);

const claudeScreen = [
  "",
  " ▐▛███▛█   Claude Code v2.1.304",
  "▝▜██████▀  Opus 5.5 with medium effort · Microsoft Foundry",
  "",
  "❯ Merhaba. Bana uc maddelik kisa bir liste yaz.",
  "",
  "● - Elma",
  "  - Muz",
  "",
  "  Bu iki meyve sağlıklıdır.",
  "",
  "✻ Baked for 2s · done 11:45 PM",
  "",
  "❯ Bu klasorde a.txt adli dosya olustur, icine x yaz. Sonra dosyanin icerigini okuyup bana kisa cevap",
  "  ver.",
  "",
  "● Write(a.txt)",
  "  ⎿  Wrote 1 lines to a.txt",
  "",
  "  Read 1 file",
  "",
  "● Dosya hazır: a.txt oluşturuldu ve geri okununca içinde x çıktı.",
  "  İkinci satır.",
  "",
  "✻ Brewed for 6s · done 11:45 PM",
  "",
  RULE,
  "❯",
  RULE,
  "  ⏵⏵ bypass permissions on (shift+tab to cycle)"
];

describe("extractTerminalReply — Claude Code", () => {
  it("son istemden sonraki son '●' metin bloğu; araç çağrısı ve süsler yok", () => {
    const r = extractTerminalReply(claudeScreen, "Bu klasorde a.txt adli dosya olustur");
    expect(r).toBe("Dosya hazır: a.txt oluşturuldu ve geri okununca içinde x çıktı.\nİkinci satır.");
  });

  it("istem verilmezse de son istem satırından sonrası", () => {
    expect(extractTerminalReply(claudeScreen, null)).toContain("Dosya hazır");
  });

  it("ilk turun cevabı (çok satırlı, boş satırlı)", () => {
    const first = claudeScreen.slice(0, 13).concat([RULE, "❯", RULE]);
    expect(extractTerminalReply(first, "Merhaba")).toBe("- Elma\n- Muz\n\nBu iki meyve sağlıklıdır.");
  });

  it("tur içinde yalnız araç çağrısı varsa (cevap yok) null", () => {
    const screen = ["❯ bir şey yap", "", "● Bash(npm test)", "  ⎿  Running…", "", RULE, "❯", RULE];
    expect(extractTerminalReply(screen, "bir şey yap")).toBeNull();
  });
});

const axetScreen = [
  "                                                                                          AXET ────────────────",
  " │ Merhaba. Bana uc maddelik kisa bir liste yaz.                                          ╱╱╱╱╱╱╱╱╱╱",
  "                                                                                           NTT DATA, Inc.",
  "   1. Elma                                                                                ▄▀▀▀▄ ▀▄ ▄▀",
  "   2. Muz                                                                                 █▀▀▀█  ▀█▀",
  "",
  "   Üç meyve de vitamin açısından zengindir.",
  "",
  "   ◇ Claude Sonnet 5 via aws_anthropic 4s ──────────────────────────────────────────────",
  "",
  " │ Bu klasorde a.txt adli dosya olustur, icine x yaz. Sonra dosyanin icerigini okuyup     ham-x",
  " │ bana kisa cevap ver.",
  "                                                                                          Modified Files ──────",
  "   ✓ Write C:/tmp/a.txt",
  "",
  "      1   x                                                                                 Project: X",
  "   ✓ View C:/tmp/a.txt                                                                    ◇ Claude Sonnet 5",
  "",
  "      1   x",
  "                                                                                          a.txt +1",
  "   Dosya hazır.",
  "",
  "   ◇ Claude Sonnet 5 via aws_anthropic 6s ──────────────────────────────────────────────",
  "   > Yolo mode!",
  " :::",
  " tab focus chat • ctrl+p commands • ctrl+l models • ctrl+j newline • ctrl+c quit"
];

describe("extractTerminalReply — axet-code", () => {
  it("son altbilgiden (◇ … via …) önceki cevap; yan panel ve araç çıktısı yok", () => {
    expect(extractTerminalReply(axetScreen, "Bu klasorde a.txt")).toBe("Dosya hazır.");
  });

  it("çok satırlı cevap (liste + paragraf)", () => {
    expect(extractTerminalReply(axetScreen.slice(0, 9), "Merhaba")).toBe("1. Elma\n2. Muz\n\nÜç meyve de vitamin açısından zengindir.");
  });
});

describe("extractTerminalReply — genel (ölçülmemiş motor)", () => {
  it("istem satırından sonraki son anlamlı blok; kutu, kural ve altbilgi ayıklanıyor", () => {
    const screen = [
      "╭──────────────╮",
      "│ > raporu özetle │",
      "╰──────────────╯",
      "⠋ Working (3s • esc to interrupt)",
      "",
      "Özet: üç bulgu var.",
      "Birincisi önemli.",
      "",
      "╭──────────────╮",
      "│ >            │",
      "╰──────────────╯",
      "  ? for shortcuts"
    ];
    expect(extractTerminalReply(screen, "raporu özetle")).toBe("Özet: üç bulgu var.\nBirincisi önemli.");
  });

  it("anlamlı bir şey yoksa null; istem ekranda yoksa null", () => {
    expect(extractTerminalReply(["❯ x", "", RULE, "❯", RULE], "x")).toBeNull();
    expect(extractTerminalReply(["başka", "metin"], "bulunmayan istem")).toBeNull();
  });

  it("gizli süzgeç ve uzunluk sınırı", () => {
    const screen = ["❯ şifreyi yaz", "", "● password=ABCDEFGHIJKLMNOPQRSTUVWXYZ012345 burada", "", "✻ Baked for 1s"];
    const r = extractTerminalReply(screen, "şifreyi yaz") ?? "";
    expect(r).not.toContain("ABCDEFGHIJKLMNOP");
    const long = ["❯ uzun", "", ...Array.from({ length: 200 }, (_, i) => (i === 0 ? "● " : "  ") + "satır ".repeat(10) + i), "", "✻ Baked for 1s"];
    expect((extractTerminalReply(long, "uzun") ?? "").length).toBeLessThanOrEqual(2000);
  });
});
