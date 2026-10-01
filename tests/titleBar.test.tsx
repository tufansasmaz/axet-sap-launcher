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
  render(
    <LanguageProvider language="tr">
      <TitleBar context={context} onShowSystem={onShowSystem} onClearSap={onClearSap} />
    </LanguageProvider>
  );
  return { onShowSystem, onClearSap };
}

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
    expect(screen.queryByTitle("Aktif bağlamı temizle (bağlantıyı kapatmaz)")).toBeNull();
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
    const clear = screen.getByTitle("Aktif bağlamı temizle (bağlantıyı kapatmaz)");
    for (const cls of ["opacity-0", "group-hover:opacity-100", "group-focus-within:opacity-100", "focus-visible:opacity-100"]) {
      expect(clear.className).toContain(cls);
    }
    const badge = clear.closest(".group");
    expect(badge).not.toBeNull();
    expect(badge!.contains(screen.getByTitle("Sistemi göster · Müşteri › S4D"))).toBe(true);
    fireEvent.click(clear);
    expect(onClearSap).toHaveBeenCalledTimes(1);
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
