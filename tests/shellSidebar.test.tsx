// @vitest-environment jsdom
//
// Kabuğun kenar çubuğu: mod seçici, Hazırlık açıkken sekmelere ulaşılması,
// son modun listesine dokununca o moda dönülmesi ve dip bloğun eylemleri.
// `App` burada çizilmiyor; `listModeOf` App'in "hangi liste görünüyor"
// kararının kendisi.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import Sidebar from "../src/shell/Sidebar";
import type { SidebarFooterProps } from "../src/shell/SidebarFooter";
import { isSidebarMode, listModeOf, type SidebarMode } from "../src/shell/activity";

afterEach(cleanup);

function footerProps(over: Partial<SidebarFooterProps> = {}): SidebarFooterProps {
  return {
    readinessOpen: false,
    readinessFault: false,
    onOpenReadiness: vi.fn(),
    connectorCount: 0,
    onOpenConnections: vi.fn(),
    theme: "dark",
    language: "TR",
    onToggleTheme: vi.fn(),
    onToggleLanguage: vi.fn(),
    onOpenSettings: vi.fn(),
    ...over
  };
}

function renderSidebar(
  opts: { mode?: SidebarMode; readinessOpen?: boolean; footer?: Partial<SidebarFooterProps> } = {}
) {
  const onModeChange = vi.fn();
  const footer = footerProps({ readinessOpen: opts.readinessOpen ?? false, ...opts.footer });
  render(
    <LanguageProvider language="tr">
      <Sidebar
        mode={opts.mode ?? "axetCode"}
        readinessOpen={opts.readinessOpen ?? false}
        onModeChange={onModeChange}
        footer={footer}
      >
        <button type="button">Liste satırı</button>
      </Sidebar>
    </LanguageProvider>
  );
  return { onModeChange, footer };
}

describe("listModeOf", () => {
  it("mod ekranında o modun listesi, Hazırlık'ta son modun listesi", () => {
    expect(listModeOf("sapGuiScripting", "axetCode")).toBe("sapGuiScripting");
    expect(listModeOf("readiness", "sapLauncher")).toBe("sapLauncher");
    expect(listModeOf("axetFlows", "sapGuiScripting")).toBe("sapGuiScripting");
    expect(isSidebarMode("readiness")).toBe(false);
    expect(isSidebarMode("sapLauncher")).toBe(true);
  });
});

describe("Sidebar", () => {
  it("modun sekmesi seçili, başka sekmeye tıklamak o modu istiyor", () => {
    const { onModeChange } = renderSidebar({ mode: "axetCode" });
    expect(screen.getByRole("tablist", { name: "Modlar" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Sohbet" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Script" }).getAttribute("aria-selected")).toBe("false");
    fireEvent.click(screen.getByRole("tab", { name: "Logon" }));
    expect(onModeChange).toHaveBeenCalledWith("sapLauncher");
    expect(screen.getByRole("button", { name: "Liste satırı" })).toBeTruthy();
  });

  it("Hazırlık açıkken hiçbir sekme seçili değil ama ilk sekmeye Tab ile ulaşılıyor", () => {
    renderSidebar({ mode: "sapGuiScripting", readinessOpen: true });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.every((tab) => tab.getAttribute("aria-selected") === "false")).toBe(true);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(screen.getByRole("button", { name: "Hazırlık" }).getAttribute("aria-current")).toBe("page");
  });

  it("Hazırlık açıkken ok tuşları uçtan başlıyor: sağ ilk modu, sol son modu istiyor", () => {
    // Seçili sekme yokken `selectedIndex` -1; sağ ok 0'a, sol ok son sekmeye
    // gitmeli (Görev 8'in kararı), -1'den bir adım ötesine değil.
    const { onModeChange } = renderSidebar({ mode: "sapLauncher", readinessOpen: true });
    const tablist = screen.getByRole("tablist", { name: "Modlar" });
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(onModeChange).toHaveBeenLastCalledWith("axetCode");
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(onModeChange).toHaveBeenLastCalledWith("sapGuiScripting");
  });

  it("Hazırlık açıkken son modun listesine dokunmak o moda dönüyor", () => {
    const { onModeChange } = renderSidebar({ mode: "sapGuiScripting", readinessOpen: true });
    const row = screen.getByRole("button", { name: "Liste satırı" });
    fireEvent.pointerDown(row);
    expect(onModeChange).toHaveBeenLastCalledWith("sapGuiScripting");
    onModeChange.mockClear();
    fireEvent.focus(row);
    expect(onModeChange).toHaveBeenLastCalledWith("sapGuiScripting");
  });

  it("mod ekranındayken listeye dokunmak mod değiştirmiyor", () => {
    const { onModeChange } = renderSidebar({ mode: "axetCode" });
    const row = screen.getByRole("button", { name: "Liste satırı" });
    fireEvent.pointerDown(row);
    fireEvent.focus(row);
    expect(onModeChange).not.toHaveBeenCalled();
  });
});

describe("SidebarFooter", () => {
  it("her düğme kendi eylemini çağırıyor", () => {
    const { footer } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Hazırlık" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygulama Bağlantıları" }));
    fireEvent.click(screen.getByRole("button", { name: "Tema" }));
    fireEvent.click(screen.getByRole("button", { name: "Dil" }));
    fireEvent.click(screen.getByRole("button", { name: "Ayarlar" }));
    expect(footer.onOpenReadiness).toHaveBeenCalledTimes(1);
    expect(footer.onOpenConnections).toHaveBeenCalledTimes(1);
    expect(footer.onToggleTheme).toHaveBeenCalledTimes(1);
    expect(footer.onToggleLanguage).toHaveBeenCalledTimes(1);
    expect(footer.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Hazırlık" }).getAttribute("aria-current")).toBeNull();
  });

  it("açık bağlayıcı sayısı ve Hazırlık arızası adda okunuyor", () => {
    renderSidebar({ footer: { connectorCount: 2, readinessFault: true } });
    expect(screen.getByRole("button", { name: "Uygulama Bağlantıları — 2 açık" }).textContent).toContain("2");
    expect(screen.getByRole("button", { name: "Hazırlık — çözülmesi gereken bir şey var" })).toBeTruthy();
  });

  it("dil düğmesi dilin kısa adını gösteriyor", () => {
    renderSidebar({ footer: { language: "EN" } });
    expect(screen.getByRole("button", { name: "Dil" }).textContent).toBe("EN");
  });
});
