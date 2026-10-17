// Bölmeye yazılan tuşlardan gönderilen satırı çıkarma (spec 2026-10-17 ajan-alani §6.1).
import { describe, expect, it } from "vitest";
import { InputLineBuffer } from "../app-electron/main/agentInput";

const feedAll = (...chunks: string[]) => {
  const buffer = new InputLineBuffer();
  return chunks.flatMap((c) => buffer.feed(c));
};

describe("InputLineBuffer", () => {
  it("Enter satırı gönderiyor; parça parça yazım birleşiyor", () => {
    expect(feedAll("merhaba\r")).toEqual(["merhaba"]);
    expect(feedAll("me", "rha", "ba", "\r")).toEqual(["merhaba"]);
  });

  it("geri silme son karakteri siliyor (Türkçe harf dahil)", () => {
    expect(feedAll("abcd\x7f\x7fxy\r")).toEqual(["abxy"]);
    expect(feedAll("çğış\b\r")).toEqual(["çğı"]);
  });

  it("ok ve işlev tuşu dizileri satıra girmiyor", () => {
    expect(feedAll("ab\x1b[Dc\x1bOP\r")).toEqual(["abc"]);
  });

  it("yapıştırma içindeki satır sonu göndermiyor, boşluk oluyor", () => {
    expect(feedAll("\x1b[200~satır1\r\nsatır2\x1b[201~\r")).toEqual(["satır1 satır2"]);
  });

  it("Ctrl+J yeni satır boşluk oluyor; Ctrl+C ve Ctrl+U taslağı siliyor", () => {
    expect(feedAll("a\nb\r")).toEqual(["a b"]);
    expect(feedAll("abc\x03def\r")).toEqual(["def"]);
    expect(feedAll("abc\x15x\r")).toEqual(["x"]);
  });

  it("boş Enter satır üretmiyor; tek başına Esc yutuluyor", () => {
    expect(feedAll("\r\r", "  \r")).toEqual([]);
    expect(feedAll("\x1b", "a\r")).toEqual(["a"]);
  });

  it("taslak var mı", () => {
    const buffer = new InputLineBuffer();
    expect(buffer.hasDraft()).toBe(false);
    buffer.feed("yaz");
    expect(buffer.hasDraft()).toBe(true);
    buffer.feed("\r");
    expect(buffer.hasDraft()).toBe(false);
  });
});
