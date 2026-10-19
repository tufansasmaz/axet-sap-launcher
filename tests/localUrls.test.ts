import { describe, expect, it } from "vitest";
import {
  autoOpenPlan,
  findUrls,
  isEditableFocus,
  LineSplitter,
  OncePerSession,
  stripAnsi,
  URLS_PER_TEXT
} from "../src/browser/localUrls";

describe("findUrls — yerel/uzak", () => {
  it("localhost, 127.0.0.1, [::1] yerel; 0.0.0.0 localhost'a çevrilir", () => {
    expect(findUrls("Sunucu hazır: http://localhost:3000")).toEqual([{ url: "http://localhost:3000/", local: true }]);
    expect(findUrls("http://127.0.0.1:5173/app")).toEqual([{ url: "http://127.0.0.1:5173/app", local: true }]);
    expect(findUrls("https://[::1]:8443/x")).toEqual([{ url: "https://[::1]:8443/x", local: true }]);
    expect(findUrls("Listening on http://0.0.0.0:8080")).toEqual([{ url: "http://localhost:8080/", local: true }]);
  });

  it("port ve yol isteğe bağlı", () => {
    expect(findUrls("http://localhost")).toEqual([{ url: "http://localhost/", local: true }]);
    expect(findUrls("http://localhost/docs?x=1#a")).toEqual([{ url: "http://localhost/docs?x=1#a", local: true }]);
  });

  it("geçersiz port atlanır", () => {
    expect(findUrls("http://localhost:0/")).toEqual([]);
    expect(findUrls("http://localhost:70000/")).toEqual([]);
  });

  it("uzak adres yerel değil; benzer adlar yerel sayılmaz", () => {
    expect(findUrls("bkz https://example.com/a")).toEqual([{ url: "https://example.com/a", local: false }]);
    expect(findUrls("http://localhost.evil.com:3000")[0].local).toBe(false);
    expect(findUrls("http://127.0.0.2:3000")[0].local).toBe(false);
  });

  it("cümle sonu noktalama ve parantez adrese girmez", () => {
    expect(findUrls("Açın (http://localhost:3000).")[0].url).toBe("http://localhost:3000/");
    expect(findUrls("adres: http://localhost:3000/a, sonra")[0].url).toBe("http://localhost:3000/a");
    expect(findUrls("`http://localhost:4200`")[0].url).toBe("http://localhost:4200/");
  });

  it("gizli parametreler atılır, kimlik bilgili adres reddedilir", () => {
    expect(findUrls("http://localhost:3000/cb?code=abc&state=1")[0].url).toBe("http://localhost:3000/cb?state=1");
    expect(findUrls("http://localhost:3000/#access_token=xyz")[0].url).toBe("http://localhost:3000/");
    expect(findUrls("http://user:pw@localhost:3000/")).toEqual([]);
  });

  it("şema dışı ve tekil", () => {
    expect(findUrls("ftp://localhost:21 file:///c:/x")).toEqual([]);
    expect(findUrls("http://localhost:3000 ve yine http://localhost:3000")).toHaveLength(1);
  });

  it("metin başına sınır", () => {
    const text = Array.from({ length: 12 }, (_, i) => `http://localhost:${3000 + i}`).join(" ");
    expect(findUrls(text)).toHaveLength(URLS_PER_TEXT);
  });
});

describe("ANSI ve satırlar", () => {
  it("renk kodları silinir, imleç hareketi satır sonu olur", () => {
    expect(stripAnsi("\x1b[32m➜\x1b[39m  Local: \x1b[36mhttp://localhost:\x1b[1m5173\x1b[22m/\x1b[39m")).toBe("➜  Local: http://localhost:5173/");
    expect(stripAnsi("a\x1b[5;1Hb")).toBe("a\nb");
    expect(stripAnsi("\x1b]0;baslik\x07x")).toBe("x");
  });

  it("Vite çıktısındaki renkli adres yakalanır", () => {
    const line = stripAnsi("  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m5173\x1b[22m/\x1b[39m");
    expect(findUrls(line)).toEqual([{ url: "http://localhost:5173/", local: true }]);
  });

  it("LineSplitter yarım satırı taşır, yalnız tamamlananı verir", () => {
    const s = new LineSplitter();
    expect(s.feed("Server on http://local")).toEqual([]);
    expect(s.feed("host:3000\r\nnext")).toEqual(["Server on http://localhost:3000"]);
    expect(s.feed("\n")).toEqual(["next"]);
  });
});

describe("tekillik ve açma planı", () => {
  it("aynı adres oturum başına bir kez; başka oturum yeniden", () => {
    const once = new OncePerSession();
    expect(once.first("pty1", "http://localhost:3000/")).toBe(true);
    expect(once.first("pty1", "http://localhost:3000/")).toBe(false);
    expect(once.first("pty2", "http://localhost:3000/")).toBe(true);
    once.forget("pty1");
    expect(once.first("pty1", "http://localhost:3000/")).toBe(true);
  });

  const local = { url: "http://localhost:3000/", local: true };
  const base = { enabled: true, teamVisible: true, userTyping: false, browserShown: false };

  it("yerel + ekip görünür + yazmıyor: aç ve görünüme geç", () => {
    expect(autoOpenPlan(local, base)).toEqual({ open: true, switchView: true, badge: false, card: "opened" });
  });

  it("kullanıcı yazıyorsa görünüm değişmez, rozet + kart", () => {
    expect(autoOpenPlan(local, { ...base, userTyping: true })).toEqual({ open: true, switchView: false, badge: true, card: "opened" });
  });

  it("ekip görünmüyorsa görünüm değişmez, rozet", () => {
    expect(autoOpenPlan(local, { ...base, teamVisible: false })).toMatchObject({ open: true, switchView: false, badge: true });
  });

  it("tarayıcı zaten açıksa yalnız yükle", () => {
    expect(autoOpenPlan(local, { ...base, browserShown: true })).toEqual({ open: true, switchView: false, badge: false, card: "opened" });
  });

  it("ayar kapalıysa ya da uzak adreste otomatik açma yok, yalnız düğmeli kart", () => {
    const none = { open: false, switchView: false, badge: false, card: "link" };
    expect(autoOpenPlan(local, { ...base, enabled: false })).toEqual(none);
    expect(autoOpenPlan({ url: "https://example.com/", local: false }, base)).toEqual(none);
  });

  it("düzenlenebilir odak", () => {
    const el = (tagName: string, attrs: Record<string, string> = {}, editable = false) => ({ tagName, getAttribute: (n: string) => attrs[n] ?? null, isContentEditable: editable });
    const input = el("INPUT");
    const button = el("BUTTON");
    const check = el("INPUT", { type: "checkbox" });
    expect(isEditableFocus(input)).toBe(true);
    expect(isEditableFocus(el("TEXTAREA"))).toBe(true);
    expect(isEditableFocus(el("DIV", {}, true))).toBe(true);
    expect(isEditableFocus(button)).toBe(false);
    expect(isEditableFocus(check)).toBe(false);
    expect(isEditableFocus(null)).toBe(false);
  });
});
