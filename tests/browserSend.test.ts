// "Ajana gönder" akışı (spec 2026-10-18 tarayici §3, §6) — sahte sayfa, ajan,
// dosya ve istem kapısıyla. Sıra: girdi → alan → ajan → sayfa → seçili metin
// → (ekran görüntüsü) → ajan yeniden → istem.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserSender, type BrowserGuestPort, type BrowserSenderDeps } from "../app-electron/main/browserSend";
import { SCREENSHOT_MAX_BYTES, SELECTION_TIMEOUT_MS, type BrowserAgentPresence } from "../app-electron/shared/browserLogic";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const NOW = new Date(2026, 9, 18, 14, 0, 0).getTime();
const SHOT = ".ntt-studio/tarayici/20261018-140000.png";
const status = (state: AgentStatus["state"]): AgentStatus => ({ state, source: "exact", lastActivity: null });

function harness(over: Partial<BrowserSenderDeps> = {}) {
  const presence: BrowserAgentPresence = { status: status("idle"), inputIdle: true, engineReady: true };
  const guest = {
    url: vi.fn(() => "https://help.sap.com/docs?x=1"),
    title: vi.fn(() => "SAP Yardım"),
    selection: vi.fn(async () => "  seçili\n metin "),
    capture: vi.fn(async () => new Uint8Array([1, 2, 3]))
  } satisfies BrowserGuestPort;
  const logs: [string, Record<string, unknown>][] = [];
  const deps: BrowserSenderDeps = {
    workspace: vi.fn((id: string) => (id === "w1" ? { root: "C:\\proje" } : null)),
    agent: vi.fn((ws: string, pane: string) => (ws === "w1" && pane === "p1" ? presence : null)),
    guest: vi.fn((id: number) => (id === 7 ? guest : null)),
    writeScreenshot: vi.fn(() => ({ ok: true as const, rel: SHOT })),
    removeScreenshot: vi.fn(),
    sendPrompt: vi.fn(() => "ok" as const),
    now: () => NOW,
    log: (tag, fields) => logs.push([tag, fields]),
    ...over
  };
  return { sender: createBrowserSender(deps), deps, presence, guest, logs };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("metin gönderimi", () => {
  it("başlık, adres ve seçili metin tek satırda; ekran görüntüsü yok; günlükte içerik yok", async () => {
    const { sender, deps, guest, logs } = harness();
    await expect(sender.send("w1", "p1", 7, false)).resolves.toEqual({ ok: true, screenshot: null });
    expect(deps.sendPrompt).toHaveBeenCalledWith("p1", '[Tarayici] SAP Yardım https://help.sap.com/docs?x=1 Secili metin: "seçili metin"');
    expect(guest.capture).not.toHaveBeenCalled();
    expect(deps.writeScreenshot).not.toHaveBeenCalled();
    expect(logs).toEqual([["tarayici.gonder", { sonuc: "tamam", ekranGoruntusu: false }]]);
    expect(JSON.stringify(logs)).not.toMatch(/help\.sap|Yardım|seçili/);
  });

  it("seçim yoksa yalnız başlık ve adres", async () => {
    const { sender, deps, guest } = harness();
    guest.selection.mockResolvedValueOnce("");
    await sender.send("w1", "p1", 7, false);
    expect(deps.sendPrompt).toHaveBeenCalledWith("p1", "[Tarayici] SAP Yardım https://help.sap.com/docs?x=1");
  });
});

describe("girdi ve kapılar", () => {
  it("geçersiz girdi: hiçbir şeye dokunulmuyor", async () => {
    const { sender, deps } = harness();
    const cases: [unknown, unknown, unknown, unknown][] = [
      ["../x", "p1", 7, false],
      ["w1", 5, 7, false],
      ["w1", "p1", "7", false],
      ["w1", "p1", 0, false],
      ["w1", "p1", -1, false],
      ["w1", "p1", 1.5, false],
      ["w1", "p1", 7, "evet"]
    ];
    for (const args of cases) {
      await expect(sender.send(...args), JSON.stringify(args)).resolves.toEqual({ ok: false, reason: "invalid" });
    }
    expect(deps.workspace).not.toHaveBeenCalled();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });

  it("alan yok → noWorkspace; ajan bu alanda değil → noAgent", async () => {
    const { sender } = harness();
    await expect(sender.send("w2", "p1", 7, false)).resolves.toEqual({ ok: false, reason: "noWorkspace" });
    await expect(sender.send("w1", "p9", 7, false)).resolves.toEqual({ ok: false, reason: "noAgent" });
  });

  it("ajan çalışıyor / soru bekliyor / yazıyor / kapalı: gönderilmiyor, sayfaya bile bakılmıyor", async () => {
    for (const [state, over, reason] of [
      ["running", {}, "busy"],
      ["asking", {}, "asking"],
      ["idle", { inputIdle: false }, "typing"],
      ["finished", {}, "notRunning"],
      ["idle", { engineReady: false }, "notRunning"]
    ] as const) {
      const { sender, presence, deps, guest } = harness();
      Object.assign(presence, { status: status(state), ...over });
      await expect(sender.send("w1", "p1", 7, true), state).resolves.toEqual({ ok: false, reason });
      expect(guest.selection).not.toHaveBeenCalled();
      expect(guest.capture).not.toHaveBeenCalled();
      expect(deps.sendPrompt).not.toHaveBeenCalled();
    }
  });

  it("sayfa yok ya da http/https değil (hata sayfası, about:blank) → noPage", async () => {
    const { sender, guest } = harness();
    await expect(sender.send("w1", "p1", 8, false)).resolves.toEqual({ ok: false, reason: "noPage" });
    for (const url of ["chrome-error://chromewebdata/", "about:blank", ""]) {
      guest.url.mockReturnValueOnce(url);
      await expect(sender.send("w1", "p1", 7, false), url).resolves.toEqual({ ok: false, reason: "noPage" });
    }
    guest.url.mockImplementationOnce(() => {
      throw new Error("Object has been destroyed");
    });
    await expect(sender.send("w1", "p1", 7, false)).resolves.toEqual({ ok: false, reason: "noPage" });
  });

  it("seçili metin 2 sn'de gelmezse ya da hata verirse hiçbir şey gönderilmiyor (pageBusy)", async () => {
    vi.useFakeTimers();
    const { sender, deps, guest } = harness();
    guest.selection.mockReturnValueOnce(new Promise<string>(() => {}));
    const pending = sender.send("w1", "p1", 7, false);
    await vi.advanceTimersByTimeAsync(SELECTION_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ ok: false, reason: "pageBusy" });
    guest.selection.mockRejectedValueOnce(new Error("Script failed"));
    await expect(sender.send("w1", "p1", 7, false)).resolves.toEqual({ ok: false, reason: "pageBusy" });
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });
});

describe("ekran görüntüsü (spec §3, §6)", () => {
  it("alınıyor, alan köküne yazılıyor, yolu metnin sonunda; sonuç dosyayı söylüyor", async () => {
    const { sender, deps, logs } = harness();
    await expect(sender.send("w1", "p1", 7, true)).resolves.toEqual({ ok: true, screenshot: SHOT });
    expect(deps.writeScreenshot).toHaveBeenCalledWith("C:\\proje", new Uint8Array([1, 2, 3]), new Date(NOW));
    expect(deps.sendPrompt).toHaveBeenCalledWith(
      "p1",
      `[Tarayici] SAP Yardım https://help.sap.com/docs?x=1 Secili metin: "seçili metin" Ekran goruntusu: ${SHOT}`
    );
    expect(logs).toEqual([["tarayici.gonder", { sonuc: "tamam", ekranGoruntusu: true }]]);
  });

  it("alanın kökü yoksa noRoot; görüntü alınmıyor, metin gitmiyor", async () => {
    const { sender, deps, guest } = harness({ workspace: () => ({ root: null }) });
    await expect(sender.send("w1", "p1", 7, true)).resolves.toEqual({ ok: false, reason: "noRoot" });
    expect(guest.capture).not.toHaveBeenCalled();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });

  it("alınamadı / boş / 10 MB'tan büyük / yazılamadı: metin de gitmiyor", async () => {
    const cases: [string, (h: ReturnType<typeof harness>) => void][] = [
      ["captureFailed", (h) => void h.guest.capture.mockRejectedValueOnce(new Error("capture"))],
      ["captureFailed", (h) => void h.guest.capture.mockResolvedValueOnce(new Uint8Array(0))],
      ["tooLarge", (h) => void h.guest.capture.mockResolvedValueOnce(new Uint8Array(SCREENSHOT_MAX_BYTES + 1))],
      ["writeFailed", (h) => void vi.mocked(h.deps.writeScreenshot).mockReturnValueOnce({ ok: false, reason: "writeFailed" })],
      ["noRoot", (h) => void vi.mocked(h.deps.writeScreenshot).mockReturnValueOnce({ ok: false, reason: "noRoot" })],
      [
        "writeFailed",
        (h) =>
          void vi.mocked(h.deps.writeScreenshot).mockImplementationOnce(() => {
            throw new Error("EACCES");
          })
      ]
    ];
    for (const [reason, arrange] of cases) {
      const h = harness();
      arrange(h);
      await expect(h.sender.send("w1", "p1", 7, true), reason).resolves.toEqual({ ok: false, reason });
      expect(h.deps.sendPrompt).not.toHaveBeenCalled();
    }
  });

  it("ajan araya meşgul olursa: gönderilmiyor, yazılan görüntü siliniyor", async () => {
    const h = harness();
    h.guest.capture.mockImplementationOnce(async () => {
      h.presence.status = status("running");
      return new Uint8Array([1]);
    });
    await expect(h.sender.send("w1", "p1", 7, true)).resolves.toEqual({ ok: false, reason: "busy" });
    expect(h.deps.sendPrompt).not.toHaveBeenCalled();
    expect(h.deps.removeScreenshot).toHaveBeenCalledWith("C:\\proje", SHOT);
  });

  it("istem reddedilirse (yazıyor, yazılamadı, fırlattı): sebep söyleniyor, görüntü siliniyor, yeniden denenmiyor", async () => {
    for (const [arrange, reason] of [
      [(d: BrowserSenderDeps) => vi.mocked(d.sendPrompt).mockReturnValueOnce("typing"), "typing"],
      [(d: BrowserSenderDeps) => vi.mocked(d.sendPrompt).mockReturnValueOnce("asking"), "asking"],
      [(d: BrowserSenderDeps) => vi.mocked(d.sendPrompt).mockReturnValueOnce("busy"), "busy"],
      [(d: BrowserSenderDeps) => vi.mocked(d.sendPrompt).mockReturnValueOnce("writeFailed"), "writeFailed"],
      [
        (d: BrowserSenderDeps) =>
          vi.mocked(d.sendPrompt).mockImplementationOnce(() => {
            throw new Error("pty kapandı");
          }),
        "writeFailed"
      ]
    ] as const) {
      const h = harness();
      arrange(h.deps);
      await expect(h.sender.send("w1", "p1", 7, true), reason).resolves.toEqual({ ok: false, reason });
      expect(h.deps.sendPrompt).toHaveBeenCalledTimes(1);
      expect(h.deps.removeScreenshot).toHaveBeenCalledWith("C:\\proje", SHOT);
    }
  });

  it("görüntü silinemese de sonuç düzgün", async () => {
    const h = harness({
      removeScreenshot: () => {
        throw new Error("EBUSY");
      }
    });
    vi.mocked(h.deps.sendPrompt).mockReturnValueOnce("typing");
    await expect(h.sender.send("w1", "p1", 7, true)).resolves.toEqual({ ok: false, reason: "typing" });
  });
});
