// Destek paketinde maskeleme (spec 2026-10-16 §5).
import { describe, expect, it } from "vitest";
import { MASK, addCounts, redact } from "../app-electron/main/support/redact";

describe("redact", () => {
  it("bilinen değer birebir; 8 karakterden kısası atlanıyor", () => {
    const r = redact("anahtar=AAAAbbbbCCCCdddd ve kisa=abc", ["AAAAbbbbCCCCdddd", "abc"]);
    expect(r.text).toBe(`anahtar=${MASK} ve kisa=abc`);
    expect(r.counts.known).toBe(1);
  });

  it("Bearer, Authorization, GitHub anahtarları, JWT", () => {
    const text = [
      "Authorization: Basic dXNlcjpwYXNzd29yZA==",
      "header Bearer abcdefgh12345678",
      "pat ghp_" + "a".repeat(36) + " ve github_pat_" + "B".repeat(40),
      "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlMTI"
    ].join("\n");
    const r = redact(text, []);
    expect(r.text).not.toMatch(/dXNlcjpwYXNz|abcdefgh12345678|ghp_a|github_pat_B|eyJhbGci/);
    expect(r.counts.authorization).toBe(1);
    expect(r.counts.bearer).toBe(1);
    expect(r.counts.github).toBe(2);
    expect(r.counts.jwt).toBe(1);
  });

  it("anahtar=değer: ad kalıyor, değer gidiyor; Türkçe adlar da", () => {
    const r = redact(
      'password=Gizli123! "token": "xyz12345678" ADT_SAP_PASSWORD=Sifre99 şifre: deneme1 parola=abc',
      []
    );
    expect(r.text).toBe(`password=${MASK} "token": "${MASK}" ADT_SAP_PASSWORD=${MASK} şifre: ${MASK} parola=${MASK}`);
    expect(r.counts.keyValue).toBe(5);
  });

  it("sıradan metne dokunmuyor", () => {
    const text = 'input_tokens: 1234 "tokens":5 password policy changed token count 42';
    const r = redact(text, []);
    expect(r.text).toBe(text);
    expect(r.counts).toEqual({});
  });

  it("zaten maskelenmiş değer ikinci kez sayılmıyor", () => {
    const r = redact("token=AAAAbbbbCCCCdddd", ["AAAAbbbbCCCCdddd"]);
    expect(r.text).toBe(`token=${MASK}`);
    expect(r.counts).toEqual({ known: 1 });
  });

  it("addCounts topluyor", () => {
    const total: Record<string, number> = { known: 1 };
    addCounts(total, { known: 2, jwt: 1 });
    expect(total).toEqual({ known: 3, jwt: 1 });
  });
});
