// Yarıda kalan turun kurtarılması (spec 2026-10-16 basiz-kopru §9).
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));
const db = vi.hoisted(() => ({ messages: [] as unknown[], byPrompt: null as string | null, asked: [] as string[] }));
vi.mock("../app-electron/main/axetSessionDb", async (orig) => ({
  ...(await orig<typeof import("../app-electron/main/axetSessionDb")>()),
  resolveSessionDb: () => "C:/p/.axet-code/axet-code.db",
  findSessionByPrompt: () => db.byPrompt,
  readMessagesSince: (_db: string, sid: string) => {
    db.asked.push(sid);
    return db.messages;
  }
}));

const { answerFromMessages, recoverAnswer } = await import("../app-electron/main/axetChatRecovery");
const { matchKey } = await import("../app-electron/main/axetSessionDb");

let n = 0;
const msg = (role: string, ...parts: Array<{ type: string; data?: Record<string, unknown> }>) =>
  ({ id: `m${++n}`, role, parts, createdAt: 0 }) as never;
const PROMPT = "Bu sistemde ZFI_RAPOR programı neden dump veriyor?";
const NEEDLE = matchKey(PROMPT).slice(0, 160);
const user = msg("user", { type: "text", data: { text: `Kurallar...\n\nKullanıcı mesajı: ${PROMPT}` } });

describe("answerFromMessages", () => {
  it("son bitişi tool_use olan tur YARIM sayılıyor", () => {
    const r = answerFromMessages(
      [user, msg("assistant", { type: "text", data: { text: "Bakıyorum." } }, { type: "finish", data: { reason: "tool_use" } })],
      NEEDLE
    );
    expect(r).toEqual({ text: "Bakıyorum.", finished: false });
  });

  it("araçtan sonra end_turn ile biten tur tamam; mesajlar boş satırla ayrılıyor", () => {
    const r = answerFromMessages(
      [
        user,
        msg("assistant", { type: "text", data: { text: "Bakıyorum." } }, { type: "finish", data: { reason: "tool_use" } }),
        msg("assistant", { type: "text", data: { text: "Sebep: X." } }, { type: "finish", data: { reason: "end_turn" } })
      ],
      NEEDLE
    );
    expect(r).toEqual({ text: "Bakıyorum.\n\nSebep: X.", finished: true });
  });
});

describe("recoverAnswer", () => {
  it("sohbetin bağlı oturum kimliği varsa tahmin edilmiyor, o oturum okunuyor", () => {
    db.messages = [user, msg("assistant", { type: "text", data: { text: "Cevap" } }, { type: "finish", data: { reason: "end_turn" } })];
    db.byPrompt = "BASKA";
    db.asked = [];
    const r = recoverAnswer("C:/p", PROMPT, Date.now(), "S-BAGLI");
    expect(db.asked).toEqual(["S-BAGLI"]);
    expect(r?.text).toBe("Cevap");
  });

  it("kimlik yoksa eski yol: istemden eşleştirme", () => {
    db.byPrompt = "S-ISTEM";
    db.asked = [];
    recoverAnswer("C:/p", PROMPT, Date.now(), null);
    expect(db.asked).toEqual(["S-ISTEM"]);
  });
});
