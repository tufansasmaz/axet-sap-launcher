// Yanlış "bağlı" (kararlılık 3, 2026-11-12): 8787 açılmasa da bağlantı
// `ok: true, verified: true` dönüyordu (launcher.connectToSystem'in son
// dalları readonlyOutcome'a hiç bakmıyordu); rozet yeşil "Bağlantı doğrulandı",
// sohbetin ilk balonu "sisteme bağlıyım" diyordu, ajan ise SAP'ye erişemiyordu.
import { describe, expect, it } from "vitest";
import type { ConnectResult } from "../app-electron/shared/types";
import { withAgentAccess } from "../app-electron/main/connectAgentAccess";

const base: ConnectResult = { ok: true, verified: true, projectDir: "C:\\p", message: "Bağlantı doğrulandı, sohbet açılıyor" };

describe("withAgentAccess", () => {
  it("8787 açılamadıysa sonuç 'ajan erişemiyor' uyarısı taşıyor, sebep metinde", () => {
    const r = withAgentAccess(base, { started: false, failure: "`mcp` paketi kurulu değil." }, "tr");
    expect(r.ok).toBe(true);
    expect(r.verified).toBe(true);
    expect(r.agentAccess).toEqual({ ok: false, reason: "`mcp` paketi kurulu değil." });
    expect(r.message).toContain("ajan SAP'ye erişemiyor");
    expect(r.message).toContain("`mcp` paketi kurulu değil.");
  });

  it("İngilizce", () => {
    expect(withAgentAccess(base, { started: false, failure: "port busy" }, "en").message).toContain("the agent cannot reach SAP");
  });

  it("sunucu ayaktaysa ya da hiç denenmediyse dokunulmuyor", () => {
    expect(withAgentAccess(base, { started: true }, "tr")).toEqual({ ...base, agentAccess: { ok: true } });
    expect(withAgentAccess(base, null, "tr")).toEqual(base);
  });

  it("başarısız bağlantıya dokunulmuyor", () => {
    const failed = { ...base, ok: false, message: "401" };
    expect(withAgentAccess(failed, { started: false, failure: "x" }, "tr")).toEqual(failed);
  });
});
