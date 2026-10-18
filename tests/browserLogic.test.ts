// Yerlesik tarayici: saf mantik (spec 2026-10-18 tarayici §2, §3, §4.4, §5, §7, §8).
import { describe, expect, it } from "vitest";
import {
  BROWSER_PROMPT_MAX,
  BROWSER_SELECTION_MAX,
  BROWSER_TITLE_MAX,
  BROWSER_URL_MAX,
  browserAgentGate,
  browserShortcutOf,
  browserWorkspace,
  buildBrowserPrompt,
  cleanText,
  isBrowserNavAllowed,
  loadErrorKind,
  normalizeAddress,
  readBrowserUrl,
  screenshotRelPath
} from "../app-electron/shared/browserLogic";
import { isSafeRelPath } from "../app-electron/shared/changesLogic";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

describe("normalizeAddress (spec §2)", () => {
  it("sema yoksa: localhost/127.0.0.1/[::1] http, noktali ad https", () => {
    expect(normalizeAddress("localhost:5173")).toEqual({ ok: true, url: "http://localhost:5173/" });
    expect(normalizeAddress("localhost")).toEqual({ ok: true, url: "http://localhost/" });
    expect(normalizeAddress("127.0.0.1:8080/app?x=1")).toEqual({ ok: true, url: "http://127.0.0.1:8080/app?x=1" });
    expect(normalizeAddress("[::1]:3000")).toEqual({ ok: true, url: "http://[::1]:3000/" });
    expect(normalizeAddress("help.sap.com/docs")).toEqual({ ok: true, url: "https://help.sap.com/docs" });
    expect(normalizeAddress("  sap.example.com:44300/sap/bc/ui5_ui5  ")).toEqual({ ok: true, url: "https://sap.example.com:44300/sap/bc/ui5_ui5" });
  });

  it("http ve https oldugu gibi (buyuk harfli sema da)", () => {
    expect(normalizeAddress("http://localhost:5173")).toEqual({ ok: true, url: "http://localhost:5173/" });
    expect(normalizeAddress("HTTPS://Example.com/A")).toEqual({ ok: true, url: "https://example.com/A" });
  });

  it("Turkce alan adi punycode'a cevriliyor", () => {
    const result = normalizeAddress("\u00f6rnek.com.tr");
    expect(result.ok && result.url.startsWith("https://xn--")).toBe(true);
  });

  it("baska sema, bosluklu girdi, noktasiz ad, yol, kimlik bilgisi reddediliyor; arama motoruna gitmiyor", () => {
    for (const bad of [
      "javascript:alert(1)",
      "javascript:alert(document.cookie)",
      "file:///C:/x.txt",
      "data:text/html,<b>x</b>",
      "about:blank",
      "chrome://settings",
      "devtools://devtools/x",
      "ftp://example.com",
      "mailto:a@b.com",
      "C:\\Users\\x\\a.html",
      "\\\\sunucu.firma\\pay",
      "//example.com",
      "user:pw@example.com",
      "sap fiori",
      "fiori",
      "nas\u0131l yap\u0131l\u0131r?"
    ]) {
      expect(normalizeAddress(bad), bad).toEqual({ ok: false, reason: "scheme" });
    }
  });

  it("bos, bozuk, uzun", () => {
    expect(normalizeAddress("   ")).toEqual({ ok: false, reason: "empty" });
    expect(normalizeAddress("http://")).toEqual({ ok: false, reason: "invalid" });
    expect(normalizeAddress("https://a b.com")).toEqual({ ok: false, reason: "invalid" });
    expect(normalizeAddress(`https://x.com/${"a".repeat(BROWSER_URL_MAX)}`)).toEqual({ ok: false, reason: "tooLong" });
  });
});

describe("isBrowserNavAllowed (spec §4.4)", () => {
  it("yalniz ana makinesi olan http/https", () => {
    for (const ok of ["https://help.sap.com/", "http://localhost:5173/x", "HTTP://127.0.0.1/"]) {
      expect(isBrowserNavAllowed(ok), ok).toBe(true);
    }
    for (const bad of [
      "file:///C:/x",
      "data:text/html,x",
      "javascript:alert(1)",
      "chrome://gpu",
      "devtools://devtools/x",
      "about:blank",
      "blob:https://a.com/1",
      "chrome-error://chromewebdata/",
      "view-source:https://a.com",
      "",
      "nonsense",
      5,
      null
    ]) {
      expect(isBrowserNavAllowed(bad), String(bad)).toBe(false);
    }
  });
});

describe("readBrowserUrl (spec §2, §5)", () => {
  it("son adres: yalniz http/https, en cok 2048, kimlik bilgisi yok", () => {
    expect(readBrowserUrl("http://localhost:5173/")).toBe("http://localhost:5173/");
    for (const bad of [
      "javascript:alert(1)",
      "file:///C:/x",
      `https://x.com/${"a".repeat(BROWSER_URL_MAX)}`,
      "https://ali:sifre@sap.example.com/",
      "https://ali@sap.example.com/",
      "",
      5,
      null,
      undefined
    ]) {
      expect(readBrowserUrl(bad), String(bad)).toBeUndefined();
    }
  });
});

describe("hassas parametreler (ertelenenler)", () => {
  it("son adres: sorgudaki ve # sonrasındaki anahtar/kod/parola parametreleri atılıyor, Fiori rotası kalıyor", () => {
    expect(readBrowserUrl("https://idp.example.com/cb?code=abc&lang=tr")).toBe("https://idp.example.com/cb?lang=tr");
    expect(readBrowserUrl("https://app.example.com/#access_token=eyJ&token_type=bearer&expires_in=3600")).toBe(
      "https://app.example.com/#token_type=bearer&expires_in=3600"
    );
    expect(readBrowserUrl("https://app.example.com/#id_token=x")).toBe("https://app.example.com/");
    expect(readBrowserUrl("https://sap.example.com/ui#SalesOrder-display?SalesOrder=1&sap-password=gizli")).toBe(
      "https://sap.example.com/ui#SalesOrder-display?SalesOrder=1"
    );
    expect(readBrowserUrl("https://sap.example.com/ui#Shell-home")).toBe("https://sap.example.com/ui#Shell-home");
    expect(readBrowserUrl("https://x.com/a?API_KEY=1&Signature=2&q=sap")).toBe("https://x.com/a?q=sap");
  });

  it("ajana giden istemde de hassas parametreler yok", () => {
    const text = buildBrowserPrompt({ title: "Giriş", url: "https://app.example.com/cb?code=abc#access_token=t", selection: "", screenshot: null });
    expect(text).not.toContain("abc");
    expect(text).not.toContain("access_token");
    expect(text).toContain("https://app.example.com/cb");
  });
});

describe("cleanText", () => {
  it("denetim karakterleri ve satir ayiricilari bosluga, bosluklar teklesiyor, kod noktasiyla kirpiliyor", () => {
    expect(cleanText("  bir\n\tiki\u0007\u00fc\u00e7\u0085d\u00f6rt\u2028be\u015f\u2029alt\u0131  ", 100)).toBe("bir iki \u00fc\u00e7 d\u00f6rt be\u015f alt\u0131");
    expect(Array.from(cleanText("\u011f".repeat(10), 5))).toHaveLength(5);
    expect(cleanText("\u011f".repeat(10), 5).endsWith("\u2026")).toBe(true);
    expect(cleanText("k\u0131sa", 5)).toBe("k\u0131sa");
  });

  it("bidi ve bicimlendirme karakterleri istemde yer almiyor (fix round 1)", () => {
    // Her araliktan bir temsilci: U+061C, U+180E, U+200B-200F, U+202A-202E, U+2060-2064, U+2066-2069, U+FEFF
    const bidiChars = [
      "\u061c", // Arabic Letter Mark
      "\u180e", // Mongolian Vowel Separator
      "\u200b", // Zero Width Space
      "\u200f", // Right-to-Left Mark
      "\u202a", // Left-to-Right Embedding
      "\u202e", // Right-to-Left Override
      "\u2060", // Word Joiner
      "\u2064", // Invisible Plus
      "\u2066", // Left-to-Right Isolate
      "\u2069", // Pop Directional Isolate
      "\ufeff"  // BOM / Zero Width No-Break Space
    ];
    const BIDI_RE = /[\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;
    for (const ch of bidiChars) {
      const result = cleanText(`kelime${ch}son`, 100);
      expect(result, `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4,"0")} kalmiyor`).not.toMatch(BIDI_RE);
    }
    // Toplu: baslik ve secim olarak geldiginde istemde de gozukmuyor
    const bidiTitle = bidiChars.join("x");
    const bidiSelection = bidiChars.join("y");
    const prompt = buildBrowserPrompt({ title: bidiTitle, url: "https://help.sap.com/", selection: bidiSelection, screenshot: null });
    expect(prompt).not.toMatch(BIDI_RE);
  });
});

describe("buildBrowserPrompt (spec §3)", () => {
  const base = { title: "SAP Yard\u0131m", url: "https://help.sap.com/docs", selection: "", screenshot: null };

  it("tek satir: onek, baslik, adres; baslik yoksa yalniz adres", () => {
    expect(buildBrowserPrompt(base)).toBe("[Tarayici] SAP Yard\u0131m https://help.sap.com/docs");
    expect(buildBrowserPrompt({ ...base, title: "  " })).toBe("[Tarayici] https://help.sap.com/docs");
  });

  it("secili metin tirnак icinde; denetim karakteri ve satir ayiricisi kalmiyor", () => {
    const text = buildBrowserPrompt({ ...base, selection: "  bir\n\tiki\u0007\u00fc\u00e7\u0085d\u00f6rt\u2028be\u015f  " });
    expect(text).toBe('[Tarayici] SAP Yard\u0131m https://help.sap.com/docs Secili metin: "bir iki \u00fc\u00e7 d\u00f6rt be\u015f"');
    expect(text).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/);
  });

  it("baslik 120, secili metin 2000 kod noktasinda kirpiliyor (\u2026)", () => {
    const text = buildBrowserPrompt({ ...base, title: "\u015e".repeat(300), selection: "\u011f".repeat(5000) });
    const title = text.slice("[Tarayici] ".length, text.indexOf(" https://"));
    expect(Array.from(title)).toHaveLength(BROWSER_TITLE_MAX);
    expect(title.endsWith("\u2026")).toBe(true);
    const selection = text.slice(text.indexOf('"') + 1, -1);
    expect(Array.from(selection)).toHaveLength(BROWSER_SELECTION_MAX);
    expect(selection.endsWith("\u2026")).toBe(true);
  });

  it("vekil cift bolunmuyor", () => {
    const text = buildBrowserPrompt({ ...base, selection: "\ud83d\ude00".repeat(3000) });
    expect(text.length).toBeLessThanOrEqual(BROWSER_PROMPT_MAX);
    expect(text).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
    expect(text).not.toMatch(/(?<![\ud800-\udbff])[\udc00-\udfff]/);
  });

  it("toplam en cok 4000 (istem siniri): uzun adres kirpiliyor, secili metin sigacak kadar kisaliyor, ekran goruntusu yolu sonda", () => {
    const shot = ".ntt-studio/tarayici/20261018-140000.png";
    const text = buildBrowserPrompt({ title: "x".repeat(500), url: `https://a.com/${"p".repeat(3000)}`, selection: "s".repeat(5000), screenshot: shot });
    expect(text.length).toBeLessThanOrEqual(BROWSER_PROMPT_MAX);
    expect(text.startsWith("[Tarayici] ")).toBe(true);
    expect(text.endsWith(` Ekran goruntusu: ${shot}`)).toBe(true);
    expect(text).toContain('Secili metin: "sss');
  });

  it("kimlik bilgisi adresten siliniyor; sayfa basligi ! ile baslasa da istem [Tarayici] ile basliyor", () => {
    const text = buildBrowserPrompt({ ...base, title: "!rm -rf", url: "https://ali:sifre@sap.example.com/x" });
    expect(text).toBe("[Tarayici] !rm -rf https://sap.example.com/x");
    expect(text).not.toContain("sifre");
    expect(/^[!/]/.test(text.trim())).toBe(false);
  });

  it("secili metindeki tirnak ve ters bolu kacislaniyor; cerceve kirilmiyor", () => {
    const text = buildBrowserPrompt({ ...base, selection: 'a "b" c\\' });
    expect(text).toBe('[Tarayici] SAP Yard\u0131m https://help.sap.com/docs Secili metin: "a \\"b\\" c\\\\"');
  });

  it("sayfa basligindaki tirnak ve ters bolu de ayni sekilde kacislaniyor", () => {
    const text = buildBrowserPrompt({ ...base, title: 'Say "x" \\ y', selection: "z" });
    expect(text).toBe('[Tarayici] Say \\"x\\" \\\\ y https://help.sap.com/docs Secili metin: "z"');
  });

  it("butce sinirinda kacis bolunmuyor; toplam yine en cok 4000", () => {
    const text = buildBrowserPrompt({ ...base, url: `https://a.com/${"p".repeat(1500)}`, selection: '"\\'.repeat(3000) });
    expect(text.length).toBeLessThanOrEqual(BROWSER_PROMPT_MAX);
    const inner = text.slice(text.indexOf(': "') + 3, -1);
    expect(inner.endsWith("\u2026")).toBe(true);
    // Kacis ciftleri cikarilinca ciplak tirnak ya da ters bolu kalmamali.
    expect(inner.replace(/\\["\\]/g, "")).not.toMatch(/["\\]/);
  });

  it("ekran goruntusu yolu (secim yokken de) sona", () => {
    expect(buildBrowserPrompt({ ...base, screenshot: ".ntt-studio/tarayici/a.png" })).toBe(
      "[Tarayici] SAP Yard\u0131m https://help.sap.com/docs Ekran goruntusu: .ntt-studio/tarayici/a.png"
    );
  });
});

describe("screenshotRelPath (spec §3, §8)", () => {
  it("alanin kokune goreli, yerel saat; ikincisi ve sonrasi ekli; isSafeRelPath'ten geciyor", () => {
    const now = new Date(2026, 9, 18, 9, 5, 7);
    expect(screenshotRelPath(now)).toBe(".ntt-studio/tarayici/20261018-090507.png");
    expect(screenshotRelPath(now, 2)).toBe(".ntt-studio/tarayici/20261018-090507-2.png");
    expect(isSafeRelPath(screenshotRelPath(now))).toBe(true);
    expect(isSafeRelPath(screenshotRelPath(now, 20))).toBe(true);
  });
});

describe("loadErrorKind (spec §6)", () => {
  it("DNS, baglanti, sertifika, diger; ERR_ABORTED yok sayiliyor", () => {
    expect(loadErrorKind(-3)).toBeNull();
    expect(loadErrorKind(-105)).toBe("dns");
    expect(loadErrorKind(-137)).toBe("dns");
    for (const code of [-7, -100, -101, -102, -104, -106, -109, -118, -130, -324]) expect(loadErrorKind(code), String(code)).toBe("connection");
    for (const code of [-200, -201, -202, -207, -299]) expect(loadErrorKind(code), String(code)).toBe("certificate");
    expect(loadErrorKind(-300)).toBe("other");
    expect(loadErrorKind(-999)).toBe("other");
  });
});

describe("browserShortcutOf (spec §7)", () => {
  const key = (over: Partial<Parameters<typeof browserShortcutOf>[0]>) =>
    browserShortcutOf({ type: "keyDown", key: "", control: false, alt: false, shift: false, meta: false, ...over });

  it("Ctrl+L adres, Alt+Sol/Sag geri/ileri; baska tus ve birakma yok", () => {
    expect(key({ key: "l", control: true })).toBe("focusAddress");
    expect(key({ key: "L", control: true })).toBe("focusAddress");
    expect(key({ key: "ArrowLeft", alt: true })).toBe("back");
    expect(key({ key: "ArrowRight", alt: true })).toBe("forward");
    expect(key({ key: "v", control: true })).toBeNull();
    expect(key({ key: "l", control: true, shift: true })).toBeNull();
    expect(key({ key: "l", control: true, alt: true })).toBeNull();
    expect(key({ key: "ArrowLeft", alt: true, control: true })).toBeNull();
    expect(key({ key: "ArrowLeft" })).toBeNull();
    expect(key({ type: "keyUp", key: "l", control: true })).toBeNull();
    expect(browserShortcutOf({ key: "l", control: true, alt: false, shift: false, meta: false })).toBe("focusAddress");
  });
});

describe("browserAgentGate (spec §3)", () => {
  const st = (state: AgentStatus["state"]): AgentStatus => ({ state, source: "exact", lastActivity: null });
  const agent = (state: AgentStatus["state"] | null, over: { inputIdle?: boolean; engineReady?: boolean } = {}) => ({
    status: state ? st(state) : null,
    inputIdle: over.inputIdle ?? true,
    engineReady: over.engineReady ?? true
  });

  it("uygunsa null; degilse sebep", () => {
    expect(browserAgentGate(agent("idle"))).toBeNull();
    expect(browserAgentGate(agent("unknown"))).toBeNull();
    expect(browserAgentGate(null)).toBe("noAgent");
    expect(browserAgentGate(agent("running"))).toBe("busy");
    expect(browserAgentGate(agent("asking"))).toBe("asking");
    expect(browserAgentGate(agent("asking", { inputIdle: false }))).toBe("asking");
    expect(browserAgentGate(agent("finished"))).toBe("notRunning");
    expect(browserAgentGate(agent(null))).toBe("notRunning");
    expect(browserAgentGate(agent("idle", { engineReady: false }))).toBe("notRunning");
    expect(browserAgentGate(agent("idle", { inputIdle: false }))).toBe("typing");
  });
});

describe("browserWorkspace", () => {
  it("alanin koku (yedek klasor degil); alan yoksa null", () => {
    const list: SavedTerminalWorkspace[] = [
      { id: "w1", name: "A", panes: [], root: "  C:\\proje " },
      { id: "w2", name: "B", panes: [] }
    ];
    expect(browserWorkspace(list, "w1")).toEqual({ root: "C:\\proje" });
    expect(browserWorkspace(list, "w2")).toEqual({ root: null });
    expect(browserWorkspace(list, "w3")).toBeNull();
  });
});
