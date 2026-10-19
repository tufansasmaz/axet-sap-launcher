// Tur 9: okuyucular hatanın sınıfını ve kısa ayrıntısını taşıyor (kesin: oturum
// kaydının `finish` parçası; tahmini: terminalin son hata satırı).
import { describe, expect, it, vi } from "vitest";
import type { AxetPart } from "../app-electron/main/axetSessionDb";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { deriveAxetState } = await import("../app-electron/main/agentAxetReader");
const { GenericReader, genericAgentReader } = await import("../app-electron/main/agentGenericReader");

const T0 = 1_700_000_000;
const msg = (role: string, parts: AxetPart[], sec: number) => ({ id: `m${sec}${role}`, role, parts, createdAt: sec });
const errFinish = (message: string, details: unknown): AxetPart => ({ type: "finish", data: { reason: "error", message, details } });

describe("deriveAxetState hata ayrıntısı (gerçek biçim)", () => {
  it("429: istek sınırı, adres maskeli, kesin", () => {
    const d = deriveAxetState([
      msg("user", [{ type: "text", data: { text: "x" } }], T0),
      msg("assistant", [errFinish("Too Many Requests", 'POST "https://axet.nttdata.com/a/b": 429 Too Many Requests {"message":"Too many tokens, please wait before trying again."}')], T0 + 1)
    ]);
    expect(d.state).toBe("error");
    expect(d.detail).toBe("error");
    expect(d.error).toMatchObject({ cls: "rateLimit", source: "exact" });
    expect(d.error?.detail).toContain("429");
    expect(d.error?.detail).not.toContain("nttdata.com");
  });
  it("ayrıntı nesne olabilir; EOF ağ hatası", () => {
    const d = deriveAxetState([msg("assistant", [errFinish("Provider Error", { err: "unexpected EOF" })], T0)]);
    expect(d.error?.cls).toBe("network");
  });
  it("gizli süzgeç: anahtar ayrıntıya girmez", () => {
    const d = deriveAxetState([msg("assistant", [errFinish("Forbidden", "403 Forbidden api_key=sk-ant-abcdefghijklmnopqrstuvwxyz0123456789")], T0)]);
    expect(d.error?.cls).toBe("auth");
    expect(d.error?.detail).not.toContain("abcdefghijklmnop");
  });
});

describe("GenericReader terminal hatası (tahmini)", () => {
  function setup() {
    const clock = { ms: 1_000_000 };
    const reader = new GenericReader({ command: "claude", now: () => clock.ms, idleAfterMs: 1_000, scanErrors: true });
    reader.feedOutput('C:\\p>claude\r\n');
    reader.feedOutput("Welcome\r\n");
    return { clock, reader };
  }
  it("tur sonunda son satır API hatasıysa durum hata, sınıf ve satır", () => {
    const { clock, reader } = setup();
    reader.submitLine("rapor yaz");
    clock.ms += 10;
    reader.feedOutput("  ⎿  API Error: 529 {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\"}}\r\n");
    clock.ms += 2_000;
    const s = genericAgentReader(reader).status();
    expect(s.state).toBe("error");
    expect(s.error).toMatchObject({ cls: "unavailable", source: "estimated" });
  });
  it("tur sürerken ya da hata yoksa hata değil", () => {
    const { clock, reader } = setup();
    reader.submitLine("rapor yaz");
    clock.ms += 10;
    reader.feedOutput("Tamam, rapor hazır.\r\n");
    expect(reader.status().state).toBe("running");
    clock.ms += 2_000;
    expect(reader.status().state).toBe("idle");
    expect(reader.status().error).toBeUndefined();
  });
  it("motor hata yazıp kapandıysa bitti + hata (komut kabuğa gitmesin)", () => {
    const clock = { ms: 1_000_000 };
    const reader = new GenericReader({ command: "axet-code", now: () => clock.ms });
    reader.feedOutput('C:\\p>axet-code\r\n');
    reader.feedOutput('   ERROR  \r\n\r\n  Failed to override models: large model "x" not found.\r\n\r\nC:\\p>');
    expect(reader.engineExited()).toBe(true);
    expect(reader.exitError()).toContain("Failed to override models");
  });
});
