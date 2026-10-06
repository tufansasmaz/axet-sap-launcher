// UZUN İSTEMİ TUI'YE YAPIŞTIRARAK YAZMAK.
//
// Ölçüm (2026-10-06, yerel axet-code, Enter'a basılmadan): istem tuş tuş
// yazılınca axet-code her karakterde kutuyu yeniden hesaplıyor —
// 13.000 karakter 215 sn ve 239 sn işlemci. Sahada da aynısı görüldü:
// 10-20 bin karakterlik istemler (tohumlama, bağlam önsözü) axet-code'a medyan
// 183 sn sonra ulaştı, kısa mesajlar 0 sn. Kullanıcının "kısa bir şeye bile
// 5-10 dk düşünüyor" şikâyeti buydu.
//
// Bracketed paste ile aynı metin 2 sn. İki tuzak ölçüldü ve bu testler onları
// koruyor:
//   - ~10 satırdan uzun TEK yapıştırma `paste_1.txt` ekine dönüşüyor (metin
//     kutuya hiç düşmüyor) → yapıştırma başına en fazla 8 satır sonu.
//   - Yapıştırmanın SONUNDAKİ satır sonu kırpılabiliyor → hiçbir yapıştırma
//     satır sonuyla bitmiyor; o satır sonları düz tuş olarak gidiyor.
// 128 satır / 13.000 karakterde kutu içeriği gönderilenle birebir aynı çıktı.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PASTE_END, PASTE_START, pasteSegments, pasteSequence } from "../app-electron/main/tuiPaste";

const nl = (s: string) => (s.match(/\n/g) ?? []).length;
const joined = (text: string) => pasteSegments(text).map((s) => s.text).join("");
const pastes = (text: string) => pasteSegments(text).filter((s) => s.paste);

function checkInvariants(text: string) {
  expect(joined(text)).toBe(text);
  for (const s of pasteSegments(text)) {
    if (s.paste) {
      expect(s.text.endsWith("\n")).toBe(false);
      expect(nl(s.text)).toBeLessThanOrEqual(8);
      expect([...s.text].length).toBeLessThanOrEqual(2000);
      expect(s.text.length).toBeGreaterThan(0);
    } else {
      expect(/^\n+$/.test(s.text)).toBe(true);
    }
  }
}

describe("pasteSegments", () => {
  it("128 satırlık gerçek boy: birleşince aynı, kurallar tutuyor", () => {
    const text = Array.from({ length: 128 }, (_, i) => `satır ${i} — ÇĞİÖŞÜ çğıöşü`).join("\n");
    checkInvariants(text);
    expect(pastes(text).length).toBeGreaterThan(1);
  });

  it("art arda çok sayıda boş satır (parça sınırına denk gelen) bozulmuyor", () => {
    checkInvariants("a\n\n\n\n\n\n\n\n\n\n\n\nb\n\nc");
    checkInvariants("\n".repeat(30) + "x" + "\n".repeat(30));
  });

  it("düz tuş yalnızca kaçınılmazken: araya boş satır giren metinde hiç yok", () => {
    // Her düz tuş axet-code'da koca kutunun yeniden hesaplanması: 772 satırlık
    // ölçümde parça sınırındaki boş satırlar düz gidince 2 sn → 38 sn oldu.
    const text = Array.from({ length: 80 }, (_, i) => `paragraf ${i}`).join("\n\n");
    checkInvariants(text);
    expect(pasteSegments(text).filter((s) => !s.paste)).toEqual([]);
  });

  it("8'den uzun boş satır dizisinde yalnızca fazlası düz tuş", () => {
    const text = "a" + "\n".repeat(12) + "b";
    checkInvariants(text);
    const keys = pasteSegments(text).filter((s) => !s.paste).map((s) => s.text.length);
    expect(keys.reduce((x, y) => x + y, 0)).toBeLessThanOrEqual(12 - 7);
  });

  it("baştaki ve sondaki satır sonları korunuyor", () => {
    checkInvariants("\n\nbaşta\nortada\nsonda\n\n");
  });

  it("çok uzun tek satır karakter sınırında bölünüyor", () => {
    const text = "x".repeat(9000);
    checkInvariants(text);
    expect(pastes(text).length).toBeGreaterThan(1);
  });

  it("karakter sınırı satır sonunun hemen ardına denk gelse de yapıştırma satır sonuyla bitmiyor", () => {
    checkInvariants("a".repeat(1999) + "\n" + "b".repeat(50));
    checkInvariants("a".repeat(1999) + "\n\n\n" + "b".repeat(50));
  });

  it("emoji (vekil çift) ikiye bölünmüyor", () => {
    const text = "✅🙂".repeat(1500);
    checkInvariants(text);
    for (const s of pastes(text)) {
      expect(/[\uD800-\uDBFF]$/.test(s.text)).toBe(false);
      expect(/^[\uDC00-\uDFFF]/.test(s.text)).toBe(false);
    }
  });

  it("kısa metin tek yapıştırma, boş metin hiçbir şey", () => {
    expect(pasteSegments("selam")).toEqual([{ paste: true, text: "selam" }]);
    expect(pasteSegments("")).toEqual([]);
  });
});

describe("pasteSequence", () => {
  it("yapıştırmalar işaretler arasında, satır sonları düz; Enter dizide YOK", () => {
    expect(pasteSequence("a\nb")).toEqual([`${PASTE_START}a\nb${PASTE_END}`]);
    expect(pasteSequence("a\n")).toEqual([`${PASTE_START}a${PASTE_END}`, "\n"]);
    expect(pasteSequence("a\nb\n".repeat(20)).join("")).not.toContain("\r");
  });
});

// Uygulamanın istemi gerçekten bu yoldan yazdığı. axetChatTui.ts elektron ve
// pty olmadan çalışmadığı için kaynak metni okunuyor.
describe("istemin TUI'ye yazılması", () => {
  const src = readFileSync("app-electron/main/axetChatTui.ts", "utf8");

  it("istem tuş tuş değil, pasteSequence ile yapıştırılıyor; Enter en sonda ayrıca", () => {
    expect(src).not.toContain("proc.write(`${wire}\\r`)");
    const seq = src.indexOf("pasteSequence(wire)");
    expect(seq).toBeGreaterThan(-1);
    const enter = src.indexOf('session.proc.write("\\r")', seq);
    expect(enter).toBeGreaterThan(seq);
    expect(enter - seq).toBeLessThan(800);
  });
});
