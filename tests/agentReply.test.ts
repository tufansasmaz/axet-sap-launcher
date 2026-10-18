// Ajanın son cevabı: özet, sınır, gizli süzgeci (spec 2026-10-18 ajanlar-ux §3).
import { describe, expect, it } from "vitest";
import { REPLY_MAX, replySnippet } from "../app-electron/main/agentReply";

describe("replySnippet", () => {
  it("boşlukları ve boş satırları sadeleştiriyor; ANSI ve denetim karakterleri gidiyor", () => {
    expect(replySnippet("  \x1b[32mTamam\x1b[0m,   rapor hazır.\r\n\n\n\nDosya: a.md  ")).toBe("Tamam, rapor hazır.\n\nDosya: a.md");
  });

  it("boş ya da yalnız boşluksa boş", () => {
    expect(replySnippet("")).toBe("");
    expect(replySnippet(" \n\t ")).toBe("");
  });

  it("REPLY_MAX karakterde kesiliyor, sonu …", () => {
    const out = replySnippet("ş".repeat(REPLY_MAX + 50));
    expect(Array.from(out)).toHaveLength(REPLY_MAX);
    expect(out.endsWith("…")).toBe(true);
    expect(replySnippet("kısa")).toBe("kısa");
  });

  it("şifre, jeton ve Bearer değerleri maskeleniyor", () => {
    const out = replySnippet("Bağlandım. password=Gizli1234 ve Authorization: Bearer abcdefghijklmnop; token: xyz12345678");
    expect(out).not.toContain("Gizli1234");
    expect(out).not.toContain("abcdefghijklmnop");
    expect(out).not.toContain("xyz12345678");
    expect(out).toContain("«gizli»");
  });

  it("süzgeç kesmeden önce: sınırın üstündeki gizli de maskeli", () => {
    const out = replySnippet(`${"a".repeat(REPLY_MAX - 10)} password=CokGizliSifre99`);
    expect(out).not.toContain("CokGizli");
  });
});
