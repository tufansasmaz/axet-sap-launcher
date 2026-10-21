// xterm "Cannot read properties of undefined (reading 'dimensions')" (2026-10-21).
// Ölçüldü (vite önizleme, @xterm/xterm 5.5.0, kaynak eşlemeli yığın):
//   get dimensions (RenderService) <- Viewport.syncScrollArea <- setTimeout
// Viewport kurucusu `open()` anında `setTimeout(() => this.syncScrollArea())`
// kuyruğa koyuyor; terminal aynı tikte dispose edilirse (dev'de React
// StrictMode efekti kurup hemen temizliyor; bölme hızla kapanırsa da) zamanlayıcı
// renderer'ı silinmiş RenderService'e çarpıyor. Çözüm: açılış tikindeki
// dispose'u xterm'in zamanlayıcısından SONRAYA ertele.
import { afterEach, describe, expect, it, vi } from "vitest";
import { disposeAfterOpenTick } from "../src/terminal/xtermLifecycle";

afterEach(() => vi.useRealTimers());

describe("disposeAfterOpenTick", () => {
  it("açılış tikinde dispose: xterm'in kendi setTimeout'u çalıştıktan sonra, bir kez", () => {
    vi.useFakeTimers();
    const order: string[] = [];
    const term = { dispose: vi.fn(() => order.push("dispose")) };
    const dispose = disposeAfterOpenTick(term);
    // xterm open() içindeki Viewport zamanlayıcısı (önce kuyruğa girdi).
    setTimeout(() => order.push("syncScrollArea"));
    dispose();
    dispose();
    expect(term.dispose).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(order).toEqual(["syncScrollArea", "dispose"]);
    expect(term.dispose).toHaveBeenCalledTimes(1);
  });

  it("açılış tiki geçtiyse hemen dispose", () => {
    vi.useFakeTimers();
    const term = { dispose: vi.fn() };
    const dispose = disposeAfterOpenTick(term);
    vi.runAllTimers();
    dispose();
    expect(term.dispose).toHaveBeenCalledTimes(1);
  });

  it("EmbeddedTerminal temizliği bu yardımcıyı kullanıyor (kaynak düzeyi)", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const src = readFileSync(path.join(__dirname, "..", "src", "components", "EmbeddedTerminal.tsx"), "utf8");
    expect(src).toContain("const disposeTerm = disposeAfterOpenTick(term);");
    expect(src).not.toMatch(/^\s*term\.dispose\(\);/m);
  });
});
