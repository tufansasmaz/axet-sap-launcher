// Tur 11: ajan terminalinin ekranı (ConPTY çıktısından; cevap çıkarmak için küçük VT).
// Diziler ölçülen ham çıktıdan (.superpowers/olcum/tur11: Claude Code 2.1.304, axet-code 1.4.1).
import { describe, expect, it } from "vitest";
import { TerminalScreen } from "../app-electron/main/terminalScreen";

describe("TerminalScreen", () => {
  it("düz metin, CR/LF ve satır sonu kırpma", () => {
    const s = new TerminalScreen(20, 4);
    s.feed("abc\r\ndef");
    expect(s.lines()).toEqual(["abc", "def", "", ""]);
  });

  it("mutlak konum (H), imleç ileri (C), satır silme (K), karakter silme (X)", () => {
    const s = new TerminalScreen(30, 5);
    s.feed("\x1b[2;3Hmerhaba\x1b[1Cdünya");
    expect(s.lines()[1]).toBe("  merhaba dünya");
    s.feed("\x1b[2;3H\x1b[K");
    expect(s.lines()[1]).toBe("");
    s.feed("\x1b[3;1Habcdef\x1b[3;2H\x1b[3X");
    expect(s.lines()[2]).toBe("a   ef");
  });

  it("çıplak LF aynı sütunda bir alt satıra iner (ConPTY: ESC[8;4H ESC[85X LF metin)", () => {
    const s = new TerminalScreen(40, 10);
    s.feed("\x1b[8;4H\x1b[10X\nÜç meyve");
    expect(s.lines()[8]).toBe("   Üç meyve");
  });

  it("son satırda LF ekranı kaydırır, kayan satır geçmişte kalır", () => {
    const s = new TerminalScreen(10, 2);
    s.feed("a\r\nb\r\nc");
    expect(s.lines()).toEqual(["b", "c"]);
    expect(s.allLines()).toEqual(["a", "b", "c"]);
  });

  it("ertelenen satır kaydırma: son sütuna yazınca imleç taşmıyor, sonraki karakter alt satıra", () => {
    const s = new TerminalScreen(3, 3);
    s.feed("abc");
    expect(s.lines()[0]).toBe("abc");
    s.feed("d");
    expect(s.lines()[1]).toBe("d");
  });

  it("ekranı silme (2J) ve OSC/özel kip dizileri metne karışmıyor", () => {
    const s = new TerminalScreen(20, 3);
    s.feed("eski\x1b]0;başlık\x07\x1b[?25l\x1b[?2004h");
    s.feed("\x1b[2J\x1b[Hyeni");
    expect(s.lines()).toEqual(["yeni", "", ""]);
  });

  it("boyut değişince içerik korunuyor, sınır dışı kırpılıyor", () => {
    const s = new TerminalScreen(10, 3);
    s.feed("0123456789\r\nx");
    s.resize(5, 3);
    expect(s.lines()[0]).toBe("01234");
    s.resize(8, 2);
    expect(s.lines().length).toBe(2);
  });
});
