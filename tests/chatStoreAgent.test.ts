// Sohbet ajanı diske yazılıp okunuyor (axet151 madde 1). Güvensiz ad
// (komut satırına `--agent` olarak gidiyor) taşınmıyor.
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(path.join(os.tmpdir(), "sohbet-ajan-"));
vi.mock("electron", () => ({ app: { getPath: () => dir } }));
const { loadChatSessions, saveChatSessions } = await import("../app-electron/main/chatStore");

const sess = (id: string, extra: Record<string, unknown>) => ({
  id, title: id, messages: [], model: null, draft: "", createdAt: 1, updatedAt: 1, ...extra
});

describe("sohbet ajanı kalıcılığı", () => {
  it("seçilen ajan kaydedilip okunuyor; seçilmeyende alan yok", () => {
    saveChatSessions({ activeId: null, projects: [], sessions: [sess("a", { agent: "coder" }), sess("b", {})] } as never);
    const r = loadChatSessions();
    const byId = Object.fromEntries((r.state?.sessions ?? []).map((s) => [s.id, s]));
    expect(byId.a.agent).toBe("coder");
    expect("agent" in byId.b).toBe(false);
  });
  it("güvensiz ad düşüyor", () => {
    writeFileSync(
      path.join(dir, "chat-sessions.json"),
      JSON.stringify({ activeId: null, projects: [], sessions: [sess("c", { agent: "-y" }), sess("d", { agent: "a b&calc" })] })
    );
    const r = loadChatSessions();
    for (const s of r.state?.sessions ?? []) expect(s.agent).toBeUndefined();
  });
});
