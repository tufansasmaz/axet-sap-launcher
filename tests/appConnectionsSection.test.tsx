// @vitest-environment jsdom
//
// Uygulama Bağlantıları — kaydet/doğrula/kes yolları ve durum gösterimi
// (denetim 2026-10-19). Bulunan hatalar:
//   - `testConnector` IPC'si reddedilince (ana süreç düştü, kanal yok)
//     düğme sessizce eski hâline dönüyordu: ne hata satırı ne rozet.
//   - "Bağlantıyı Kes" yazılamazsa ekran "bağlı değil" diyordu, diskte
//     ise sağlayıcı açık kalıyordu (yanlış bilgi).
//   - Açılıştaki `getConfig` / `getConnectorMcpUrl` reddedilince yakalanmamış
//     söz hatası.
//   - Kip seçimi düğmelerinde seçili olan ekran okuyucuya söylenmiyordu.

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppConnectionsSection from "../src/components/AppConnectionsSection";
import { LanguageProvider } from "../src/i18n";

type Api = Record<string, ReturnType<typeof vi.fn>>;

function mount(overrides: Partial<Api> = {}, config: Record<string, unknown> = {}) {
  const api: Api = {
    getConnectorInventory: vi.fn().mockResolvedValue(null),
    getConnectorMcpUrl: vi.fn().mockResolvedValue("https://x.invalid/mcp"),
    getConfig: vi.fn().mockResolvedValue({ connectorLastResults: {}, connectorEnabled: {}, connectorMode: "auto", ...config }),
    testConnector: vi.fn(),
    setConnectorEnabled: vi.fn().mockResolvedValue({ ok: true }),
    cancelConnectorTest: vi.fn().mockResolvedValue({ ok: true }),
    saveConfig: vi.fn().mockResolvedValue({}),
    openExternalUrl: vi.fn(),
    ...overrides
  };
  (window as unknown as { api: Api }).api = api;
  render(
    <LanguageProvider language="tr">
      <AppConnectionsSection onOpenProjectTerminal={vi.fn()} projectDir={null} />
    </LanguageProvider>
  );
  return api;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function row(name: string): HTMLElement {
  return screen.getByRole("listitem", { name: new RegExp(name) });
}

describe("AppConnectionsSection", () => {
  it("sağlayıcılar tek sütun liste; Bağlan dolgulu vurgu değil", async () => {
    mount();
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    for (const button of screen.getAllByRole("button", { name: "Bağlan" })) {
      expect(button.className).not.toContain("bg-accent-500");
    }
  });

  it("doğrulama IPC'si reddedilirse hata satırı ve 'Başarısız' rozeti çıkıyor", async () => {
    const api = mount({ testConnector: vi.fn().mockRejectedValue(new Error("kanal kapalı")) });
    await waitFor(() => expect(api.getConfig).toHaveBeenCalled());
    const outlook = await waitFor(() => row("Outlook"));
    await act(async () => {
      fireEvent.click(outlook.querySelector("button") as HTMLButtonElement);
    });
    await waitFor(() => expect(row("Outlook").textContent).toContain("kanal kapalı"));
    expect(row("Outlook").textContent).toContain("Başarısız");
  });

  it("başarılı doğrulama rozeti 'Bağlı' yapıyor ve sonucu duyuruyor", async () => {
    mount({ testConnector: vi.fn().mockResolvedValue({ ok: true, connected: true, detail: "Inbox ok" }) });
    const outlook = await waitFor(() => row("Outlook"));
    await act(async () => {
      fireEvent.click(outlook.querySelector("button") as HTMLButtonElement);
    });
    await waitFor(() => expect(row("Outlook").textContent).toContain("Bağlı"));
    expect(row("Outlook").querySelector('[role="status"]')?.textContent).toContain("Inbox ok");
  });

  it("Bağlantıyı Kes yazılamazsa ekran bağlı hâline geri dönüyor", async () => {
    mount(
      { setConnectorEnabled: vi.fn().mockRejectedValue(new Error("yazılamadı")) },
      { connectorEnabled: { outlook: true } }
    );
    const disconnect = await screen.findByRole("button", { name: "Bağlantıyı Kes" });
    await act(async () => {
      fireEvent.click(disconnect);
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Bağlantıyı Kes" })).toBeTruthy());
  });

  it("açılış okumaları reddedilse de ekran çiziliyor", async () => {
    mount({
      getConfig: vi.fn().mockRejectedValue(new Error("x")),
      getConnectorMcpUrl: vi.fn().mockRejectedValue(new Error("y"))
    });
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  });

  it("kip düğmeleri seçili olanı aria-pressed ile söylüyor", async () => {
    mount({}, { connectorEnabled: { outlook: true }, connectorMode: "always" });
    const group = await screen.findByRole("group");
    const pressed = [...group.querySelectorAll("button")].map((b) => b.getAttribute("aria-pressed"));
    expect(pressed).toEqual(["false", "true"]);
  });
});
