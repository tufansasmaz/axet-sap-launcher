// @vitest-environment jsdom
//
// Kabuğun kenar çubuğu: mod seçici, Hazırlık açıkken sekmelere ulaşılması,
// son modun listesine dokununca o moda dönülmesi ve dip bloğun eylemleri.
// `App` burada çizilmiyor; `listModeOf` App'in "hangi liste görünüyor"
// kararının kendisi.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
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
  opts: {
    mode?: SidebarMode;
    readinessOpen?: boolean;
    footer?: Partial<SidebarFooterProps>;
    width?: number;
    collapsed?: boolean;
  } = {}
) {
  const onModeChange = vi.fn();
  const onWidthCommit = vi.fn();
  const onCollapsedChange = vi.fn();
  const footer = footerProps({ readinessOpen: opts.readinessOpen ?? false, ...opts.footer });
  render(
    <LanguageProvider language="tr">
      <Sidebar
        mode={opts.mode ?? "axetCode"}
        readinessOpen={opts.readinessOpen ?? false}
        onModeChange={onModeChange}
        footer={footer}
        width={opts.width ?? 264}
        collapsed={opts.collapsed ?? false}
        onWidthCommit={onWidthCommit}
        onCollapsedChange={onCollapsedChange}
      >
        <button type="button">Liste satırı</button>
      </Sidebar>
    </LanguageProvider>
  );
  return { onModeChange, onWidthCommit, onCollapsedChange, footer };
}

describe("listModeOf", () => {
  it("mod ekranında o modun listesi, Hazırlık'ta son modun listesi", () => {
    expect(listModeOf("sapGuiScripting", "axetCode")).toBe("sapGuiScripting");
    expect(listModeOf("readiness", "sapLauncher")).toBe("sapLauncher");
    expect(listModeOf("axetFlows", "sapGuiScripting")).toBe("sapGuiScripting");
    expect(isSidebarMode("readiness")).toBe(false);
    expect(isSidebarMode("sapLauncher")).toBe(true);
    expect(isSidebarMode("terminal")).toBe(true);
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
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
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
    expect(onModeChange).toHaveBeenLastCalledWith("terminal");
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

  it("dördüncü sekme Terminal", () => {
    const { onModeChange } = renderSidebar({ mode: "axetCode" });
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Sohbet", "Logon", "Script", "Terminal"]);
    fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
    expect(onModeChange).toHaveBeenCalledWith("terminal");
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

describe("Sidebar genişliği", () => {
  const separator = () => screen.getByRole("separator", { name: "Kenar çubuğunun genişliği" });

  it("tutamaç değerini ve sınırlarını söylüyor", () => {
    renderSidebar({ width: 300 });
    expect(separator().getAttribute("aria-valuenow")).toBe("300");
    expect(separator().getAttribute("aria-valuemin")).toBe("220");
    expect(separator().getAttribute("aria-valuemax")).toBe("420");
    expect(separator().getAttribute("aria-orientation")).toBe("vertical");
    expect(separator().tabIndex).toBe(0);
  });

  it("ok 8px, Shift ile 32px; tuş bırakılınca bir kez kaydediliyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 264 });
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(separator().getAttribute("aria-valuenow")).toBe("272");
    fireEvent.keyDown(separator(), { key: "ArrowLeft", shiftKey: true });
    expect(separator().getAttribute("aria-valuenow")).toBe("240");
    expect(onWidthCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(separator(), { key: "ArrowLeft" });
    expect(onWidthCommit).toHaveBeenCalledTimes(1);
    expect(onWidthCommit).toHaveBeenCalledWith(240);
  });

  it("sınırda ok değeri değiştirmiyor, değişmeyen genişlik kaydedilmiyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 220 });
    fireEvent.keyDown(separator(), { key: "ArrowLeft", shiftKey: true });
    expect(separator().getAttribute("aria-valuenow")).toBe("220");
    fireEvent.keyUp(separator(), { key: "ArrowLeft" });
    expect(onWidthCommit).not.toHaveBeenCalled();
  });

  it("sürüklerken kırpılıyor, yalnızca bırakınca kaydediliyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 264 });
    fireEvent.mouseDown(separator(), { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 150 });
    expect(separator().getAttribute("aria-valuenow")).toBe("314");
    fireEvent.mouseMove(window, { clientX: 900 });
    expect(separator().getAttribute("aria-valuenow")).toBe("420");
    expect(onWidthCommit).not.toHaveBeenCalled();
    fireEvent.mouseUp(window);
    expect(onWidthCommit).toHaveBeenCalledTimes(1);
    expect(onWidthCommit).toHaveBeenCalledWith(420);
    fireEvent.mouseMove(window, { clientX: 100 });
    expect(separator().getAttribute("aria-valuenow")).toBe("420");
  });

  it("sürüklerken kenar çubuğu kaybolursa pencere dinleyicileri de gidiyor", () => {
    const { onWidthCommit } = renderSidebar({ width: 264 });
    const removed = vi.spyOn(window, "removeEventListener");
    fireEvent.mouseDown(separator(), { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 150 });
    cleanup();
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(["mousemove", "mouseup"]));
    fireEvent.mouseUp(window);
    expect(onWidthCommit).not.toHaveBeenCalled();
    removed.mockRestore();
  });
});

// `collapsed`'ı gerçekten değiştiren sarmalayıcı: App'teki gibi değer
// config'ten geri geliyor. `expand` kısayolun (Ctrl+F) yolu.
function CollapsibleHarness({ onReady }: { onReady: (expand: () => void) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  onReady(() => setCollapsed(false));
  return (
    <LanguageProvider language="tr">
      <Sidebar
        mode="axetCode"
        readinessOpen={false}
        onModeChange={() => {}}
        footer={footerProps()}
        width={264}
        collapsed={collapsed}
        onWidthCommit={() => {}}
        onCollapsedChange={setCollapsed}
      >
        <button type="button">Liste satırı</button>
      </Sidebar>
    </LanguageProvider>
  );
}

describe("Sidebar daraltma odağı", () => {
  it("daraltınca odak şeritteki genişlet düğmesine, genişletince daralt düğmesine geçiyor", () => {
    render(<CollapsibleHarness onReady={() => {}} />);
    const collapse = screen.getByRole("button", { name: "Kenar çubuğunu daralt" });
    collapse.focus();
    fireEvent.click(collapse);
    const expand = screen.getByRole("button", { name: "Kenar çubuğunu genişlet" });
    expect(document.activeElement).toBe(expand);
    fireEvent.click(expand);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Kenar çubuğunu daralt" }));
  });

  it("kısayolla genişletmede odağa dokunulmuyor", () => {
    let expand = () => {};
    render(<CollapsibleHarness onReady={(fn) => (expand = fn)} />);
    fireEvent.click(screen.getByRole("button", { name: "Kenar çubuğunu daralt" }));
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    outside.focus();
    act(() => expand());
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe("Sidebar daraltılmış", () => {
  it("daraltma düğmesi daraltılmış hâli istiyor", () => {
    const { onCollapsedChange } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Kenar çubuğunu daralt" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("şeritte mod ikonları ve dipte üç düğme var; liste, sekmeler ve tutamaç yok", () => {
    const { onModeChange, onCollapsedChange, footer } = renderSidebar({ collapsed: true, mode: "sapLauncher" });
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("separator")).toBeNull();
    expect(screen.queryByRole("button", { name: "Liste satırı" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tema" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dil" })).toBeNull();

    expect(screen.getByRole("button", { name: "aXet SAP Logon" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Axet Chat" }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "SAP GUI Scripting" }));
    expect(onModeChange).toHaveBeenCalledWith("sapGuiScripting");

    fireEvent.click(screen.getByRole("button", { name: "Hazırlık" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygulama Bağlantıları" }));
    fireEvent.click(screen.getByRole("button", { name: "Ayarlar" }));
    expect(footer.onOpenReadiness).toHaveBeenCalledTimes(1);
    expect(footer.onOpenConnections).toHaveBeenCalledTimes(1);
    expect(footer.onOpenSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Kenar çubuğunu genişlet" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it("Hazırlık açıkken şeritte mod seçili değil, Hazırlık seçili; adlar arıza ve sayıyı taşıyor", () => {
    renderSidebar({ collapsed: true, readinessOpen: true, footer: { readinessFault: true, connectorCount: 1 } });
    for (const name of ["Axet Chat", "aXet SAP Logon", "SAP GUI Scripting", "Terminal"]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-current")).toBeNull();
    }
    expect(
      screen.getByRole("button", { name: "Hazırlık — çözülmesi gereken bir şey var" }).getAttribute("aria-current")
    ).toBe("page");
    expect(screen.getByRole("button", { name: "Uygulama Bağlantıları — 1 açık" })).toBeTruthy();
  });
});
