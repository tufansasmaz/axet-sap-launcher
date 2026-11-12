// @vitest-environment jsdom
//
// Başlık çubuğu (grafit spec §4.4). Sabitlenenler: bağlam yokken rozet hiç
// çizilmiyor; varken mono etiket, ortam etiketi, tıklayınca sistemi gösterme;
// temizle düğmesi yalnızca rozetin üstüne gelince / odak rozetteyken görünüyor
// ama DOM'da duruyor, Tab ile ulaşılıyor; kapatma kırmızı.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveContext, ActiveSapContext } from "../app-electron/shared/types";
import TitleBar from "../src/components/TitleBar";
import { LanguageProvider } from "../src/i18n";

afterEach(cleanup);

beforeEach(() => {
  (window as unknown as { api: unknown }).api = {
    windowIsMaximized: vi.fn(() => Promise.resolve(false)),
    onWindowStateChanged: vi.fn(() => () => {}),
    windowMinimize: vi.fn(),
    windowToggleMaximize: vi.fn(() => Promise.resolve(false)),
    windowClose: vi.fn()
  };
});

const SAP: ActiveSapContext = {
  uuid: "u1",
  systemId: "S4D",
  systemName: "S4D",
  customerPath: ["Müşteri", "S4D"],
  host: "h",
  client: "100",
  username: "TSASMAZ",
  tier: "DEV",
  projectDir: "C:\\p",
  connectedAt: "2026-09-29T00:00:00Z",
  verified: true
};

function mount(context: ActiveContext) {
  const onShowSystem = vi.fn();
  const onClearSap = vi.fn();
  const onFocusSap = vi.fn();
  render(
    <LanguageProvider language="tr">
      <TitleBar context={context} onShowSystem={onShowSystem} onClearSap={onClearSap} onFocusSap={onFocusSap} />
    </LanguageProvider>
  );
  return { onShowSystem, onClearSap, onFocusSap };
}

const PRD: ActiveSapContext = { ...SAP, uuid: "u2", systemId: "S4P", customerPath: ["Müşteri", "S4P"], tier: "PRD", projectDir: "C:\\q" };

describe("TitleBar — çoklu sistem", () => {
  it("her bağlı sistem için bir çip; çarpı yalnız o sistemi kesiyor; çipe tık odağı taşıyor", () => {
    const { onClearSap, onFocusSap, onShowSystem } = mount({ sap: PRD, gui: null, systems: [SAP, PRD] });
    expect(screen.getByText("S4D")).toBeTruthy();
    expect(screen.getByText("S4P")).toBeTruthy();
    const clears = screen.getAllByTitle("Bağlantıyı kes (bu sistemin ADT sunucusu ve RFC köprüsü kapanır)");
    expect(clears).toHaveLength(2);
    fireEvent.click(clears[0]);
    expect(onClearSap).toHaveBeenCalledWith("u1");
    fireEvent.click(screen.getByTitle("Sistemi göster · Müşteri › S4D"));
    expect(onFocusSap).toHaveBeenCalledWith("u1");
    expect(onShowSystem).toHaveBeenCalledWith("u1");
    // Odaktaki çip işaretli (seçim), öteki değil.
    expect(screen.getByText("S4P").closest(".group")!.getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("S4D").closest(".group")!.getAttribute("aria-current")).toBeNull();
  });
});

describe("TitleBar", () => {
  it("ana ekranla bir bütün: alt çizgi yok, zemin uygulamanınki", () => {
    mount({ sap: null, gui: null });
    const bar = screen.getByText("NTT Studio").closest(".h-9");
    const cls = (bar?.className ?? "").split(/\s+/);
    expect(cls).toContain("bg-app");
    expect(cls).not.toContain("border-b");
    expect(cls).not.toContain("bg-sidebar");
  });

  it("bağlam yokken rozet ve temizle düğmesi yok", () => {
    mount({ sap: null, gui: null });
    expect(screen.queryByTitle("Sistemi göster · Müşteri › S4D")).toBeNull();
    expect(screen.queryByTitle("Bağlantıyı kes (bu sistemin ADT sunucusu ve RFC köprüsü kapanır)")).toBeNull();
  });

  it("rozet mono; sistem, istemci/kullanıcı ve ortam etiketi görünüyor; tıklayınca sistemi gösteriyor", () => {
    const { onShowSystem } = mount({ sap: SAP, gui: null });
    const show = screen.getByTitle("Sistemi göster · Müşteri › S4D");
    expect(show.className).toContain("font-mono");
    expect(show.textContent).toContain("S4D");
    expect(show.textContent).toContain("100 / TSASMAZ");
    expect(screen.getByText("DEV")).toBeTruthy();
    fireEvent.click(show);
    expect(onShowSystem).toHaveBeenCalledTimes(1);
  });

  it("temizle düğmesi gizli başlıyor, rozetin üstünde ve odakta görünüyor; tıklayınca bağlamı temizliyor", () => {
    const { onClearSap } = mount({ sap: SAP, gui: null });
    const clear = screen.getByTitle("Bağlantıyı kes (bu sistemin ADT sunucusu ve RFC köprüsü kapanır)");
    for (const cls of ["opacity-0", "group-hover:opacity-100", "group-focus-within:opacity-100", "focus-visible:opacity-100"]) {
      expect(clear.className).toContain(cls);
    }
    const badge = clear.closest(".group");
    expect(badge).not.toBeNull();
    expect(badge!.contains(screen.getByTitle("Sistemi göster · Müşteri › S4D"))).toBe(true);
    fireEvent.click(clear);
    expect(onClearSap).toHaveBeenCalledWith("u1");
  });

  it("imza küçük ve soluk; pencere düğmeleri hover zemininde, kapatma kırmızı", () => {
    mount({ sap: null, gui: null });
    const by = screen.getByText("by tsasmaz");
    expect(by.className).toContain("text-2xs");
    expect(by.className).toContain("text-slate-500");
    expect(screen.getByTitle("Küçült").className).toContain("hover:bg-hover");
    expect(screen.getByTitle("Büyüt").className).toContain("hover:bg-hover");
    const close = screen.getByTitle("Kapat");
    expect(close.className).toContain("hover:bg-[var(--status-danger-solid)]");
    expect(close.className).toContain("hover:text-on-solid");
  });
});

// Kararlılık 3 (2026-11-12): 8787 açılmadan "Bağlantı doğrulandı" yeşil rozeti.
describe("TitleBar — ajan SAP'ye erişemiyor", () => {
  it("SAP doğrulandı ama ajan sunucusu yoksa rozet uyarı tonunda ve sebebi söylüyor", () => {
    mount({ sap: { ...SAP, agentReady: false, agentIssue: "`mcp` paketi kurulu değil." }, gui: null });
    const dot = screen.getByTitle("Bağlandı, ama ajan SAP'ye erişemiyor: `mcp` paketi kurulu değil.");
    expect(dot.className).toContain("status-warning-text");
  });
  it("ajan hazırsa yeşil 'Bağlantı doğrulandı'", () => {
    mount({ sap: SAP, gui: null });
    expect(screen.getByTitle("Bağlantı doğrulandı").className).toContain("status-success-text");
  });
});
