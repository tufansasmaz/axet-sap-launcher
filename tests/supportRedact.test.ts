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

  it("önünde _ olan adlar da (access_token, client_secret, *_API_KEY) — inceleme I1", () => {
    const r = redact('access_token=abcdef123456 client_secret: zzzzzzzz AZURE_OPENAI_API_KEY=sk-123456789 "refresh_token":"rrrrrr"', []);
    expect(r.text).toBe(`access_token=${MASK} client_secret: ${MASK} AZURE_OPENAI_API_KEY=${MASK} "refresh_token":"${MASK}"`);
  });

  it("SAP oturum çerezleri — inceleme I2", () => {
    const r = redact("Cookie: MYSAPSSO2=AjQxMDMBABhOAFQAVAA; SAP_SESSIONID_DEV_100=abc123xyz; sap-usercontext=sap-client=100", []);
    expect(r.text).not.toMatch(/AjQxMDMB|abc123xyz|sap-client=100/);
    expect(r.text).toContain("MYSAPSSO2=");
  });

  it("küçük harfli bearer — inceleme M3", () => {
    expect(redact("bearer abcdefgh12345678", []).text).not.toContain("abcdefgh12345678");
  });

  it("addCounts topluyor", () => {
    const total: Record<string, number> = { known: 1 };
    addCounts(total, { known: 2, jwt: 1 });
    expect(total).toEqual({ known: 3, jwt: 1 });
  });
});
