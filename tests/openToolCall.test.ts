// CEVAPSIZ ARAÇ ÇAĞRISIYLA BİTEN OTURUMA BAĞLANMAMA.
//
// Ölçülen olay (2026-10-02, DA8): sabahki tur ajanın `ask_user` sorusuyla
// bitti, süreç kapatıldı ama sohbetin oturuma BAĞI kaldı. Öğleden sonra
// sohbete dönülünce uygulama aynı oturuma yeniden bağlandı; ilk mesaj
// 1 saniyede `400 Bad Request` aldı (`tool_use` without `tool_result`), ardından
// hata + oturum yenileme + bütün geçmişin yeniden gönderilmesi geldi. Kullanıcı
// "geç cevap aldım" dedi: 47 karakterlik soru 13:44:41'de gitti, cevap
// 13:47:50'de geldi; modelin payı 6 saniye.
//
// Bu testler bağlanmadan ÖNCE yapılan denetimi koruyor: geçmişte sonucu
// gelmemiş bir çağrı varsa o oturum sağlayıcıya göre geçersiz.

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));

const { hasUnansweredToolCall } = await import("../app-electron/main/axetSessionDb");

let n = 0;
const msg = (role: string, ...parts: Array<{ type: string; data?: Record<string, unknown> }>) => ({
  id: `m${++n}`,
  role,
  parts,
  createdAt: 1
});
const call = (id: string, name = "bash") => ({ type: "tool_call", data: { id, name, finished: true } });
const result = (id: string) => ({ type: "tool_result", data: { tool_call_id: id, content: "ok" } });
const text = (t: string) => ({ type: "text", data: { text: t } });

describe("hasUnansweredToolCall", () => {
  it("ask_user sorusuyla biten oturum cevapsız sayılıyor (ölçülen olay)", () => {
    expect(
      hasUnansweredToolCall([
        msg("user", text("S25'te keşfi çalıştır")),
        msg("assistant", call("t1")),
        msg("tool", result("t1")),
        msg("assistant", text("Rapor hazır."), call("t2", "ask_user"))
      ])
    ).toBe(true);
  });

  it("her çağrının sonucu varsa cevapsız değil", () => {
    expect(
      hasUnansweredToolCall([
        msg("user", text("selam")),
        msg("assistant", call("t1"), call("t2")),
        msg("tool", result("t1"), result("t2")),
        msg("assistant", text("Bitti."))
      ])
    ).toBe(false);
  });

  it("sonuç aynı saniyede çağrıdan önce sıralansa da eşleşiyor (sıraya bakmıyor)", () => {
    expect(hasUnansweredToolCall([msg("tool", result("t1")), msg("assistant", call("t1"))])).toBe(false);
  });

  it("geçmişin ortasında kalmış cevapsız çağrı da sayılıyor", () => {
    expect(
      hasUnansweredToolCall([
        msg("assistant", call("t1")),
        msg("user", text("bunu boşver")),
        msg("assistant", text("Tamam."))
      ])
    ).toBe(true);
  });

  it("boş geçmiş ve araçsız konuşma cevapsız değil", () => {
    expect(hasUnansweredToolCall([])).toBe(false);
    expect(hasUnansweredToolCall([msg("user", text("a")), msg("assistant", text("b"))])).toBe(false);
  });

  it("yarım kalmış (finished=false) çağrı sayılmıyor — axet-code onu sağlayıcıya göndermiyor", () => {
    // Canlı veri (72b77d50, 2026-09-24): akarken kesilen iki ask_user çağrısı
    // sonucsuz kaldı, oturum sonrasında günlerce sorunsuz kullanıldı.
    // Bunları saymak sağlam oturumu boşuna bırakıp bütün geçmişi yeniden
    // göndermek demekti.
    expect(
      hasUnansweredToolCall([
        msg("assistant", { type: "tool_call", data: { id: "t1", name: "ask_user", finished: false } }),
        msg("user", text("devam")),
        msg("assistant", text("Tamam."))
      ])
    ).toBe(false);
  });

  it("kimliksiz çağrı (bozuk kayıt) yanlış alarm vermiyor", () => {
    expect(hasUnansweredToolCall([msg("assistant", { type: "tool_call", data: { name: "bash" } })])).toBe(false);
  });
});

// Bağlanma adımı denetimi GERÇEKTEN kullanıyor mu? axetChatTui.ts elektron ve
// pty olmadan çalışmadığı için kaynak metni okunuyor.
describe("eski oturuma bağlanma", () => {
  const src = readFileSync("app-electron/main/axetChatTui.ts", "utf8");
  const start = src.indexOf("async function attachToBoundSession");
  const body = src.slice(start, src.indexOf("\nfunction ", start));

  it("cevapsız çağrısı olan oturuma bağlanmadan bağı siliyor, seçiciyi açmadan önce", () => {
    const check = body.indexOf("sessionHasUnansweredToolCall(");
    expect(check).toBeGreaterThan(-1);
    const after = body.slice(check, check + 600);
    expect(after).toContain("clearBinding(");
    expect(after).toContain("return false");
    // Seçici (ctrl+s) açıldıktan sonra vazgeçmek, oturumu yine o geçmişe sokardı.
    const picker = body.indexOf('write("\\x13")');
    expect(picker).toBeGreaterThan(-1);
    expect(check).toBeLessThan(picker);
  });

  it("vazgeçme günlüğe düşüyor (içeriksiz)", () => {
    expect(body).toContain('appLog("tui.bag-gecersiz"');
  });
});
