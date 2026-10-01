// @vitest-environment jsdom
//
// Ctrl+K komut paleti: tek kısayolla eylem, sohbet ve SAP sistemi arama.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { filterPaletteItems, type PaletteItem } from "../src/lib/commandPalette";
import CommandPalette from "../src/components/CommandPalette";
import { LanguageProvider } from "../src/i18n";
import { buildPaletteItems } from "../src/components/AppCommandPalette";
import type { ChatSession } from "../src/stores/chatTypes";
import type { SapService } from "../app-electron/shared/types";

afterEach(() => {
  cleanup();
  // ITEMS'in `run`'ları testler arasında paylaşılıyor; sayaçlar taşmasın.
  vi.clearAllMocks();
});

function item(id: string, group: PaletteItem["group"], label: string, hint?: string): PaletteItem {
  return { id, group, label, hint, run: vi.fn() };
}

const ITEMS: PaletteItem[] = [
  item("new", "action", "Yeni sohbet"),
  item("settings", "action", "Ayarlar"),
  item("c1", "chat", "Tedarikçi raporu"),
  item("c2", "chat", "İrsaliye hatası"),
  item("s1", "system", "S4D Geliştirme", "Müşteri A / S4D"),
  item("s2", "system", "S4Q Kalite", "Müşteri A / S4Q")
];

describe("filterPaletteItems", () => {
  it("boş arama her şeyi sırasıyla veriyor", () => {
    expect(filterPaletteItems(ITEMS, "").map((i) => i.id)).toEqual(ITEMS.map((i) => i.id));
  });

  it("büyük/küçük harf ve Türkçe İ/i farkı aramayı bozmuyor", () => {
    expect(filterPaletteItems(ITEMS, "irsaliye").map((i) => i.id)).toEqual(["c2"]);
    expect(filterPaletteItems(ITEMS, "AYAR").map((i) => i.id)).toEqual(["settings"]);
  });

  it("her kelime ayrı aranıyor, ipucu da dahil", () => {
    expect(filterPaletteItems(ITEMS, "müşteri s4q").map((i) => i.id)).toEqual(["s2"]);
  });

  it("başı tutan önce geliyor, grup sırası korunuyor", () => {
    const items = [item("a", "chat", "Rapor taslağı"), item("b", "chat", "Eski rapor"), item("c", "action", "Raporlar")];
    expect(filterPaletteItems(items, "rapor").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("grup başına sınır uygulanıyor", () => {
    const many = Array.from({ length: 20 }, (_, n) => item(`c${n}`, "chat", `Sohbet ${n}`));
    expect(filterPaletteItems(many, "sohbet", 5)).toHaveLength(5);
  });
});

function renderPalette(onClose = vi.fn(), items = ITEMS) {
  render(
    <LanguageProvider language="tr">
      <CommandPalette open items={items} onClose={onClose} />
    </LanguageProvider>
  );
  return screen.getByRole("combobox");
}

describe("CommandPalette", () => {
  it("açılınca arama kutusu odakta, gruplar başlıklı", () => {
    const input = renderPalette();
    expect(document.activeElement).toBe(input);
    expect(screen.getByText("Eylemler")).toBeTruthy();
    expect(screen.getByText("Sohbetler")).toBeTruthy();
    expect(screen.getByText("Sistemler")).toBeTruthy();
  });

  it("yazınca süzüyor, Enter ilk sonucu çalıştırıp kapatıyor", () => {
    const onClose = vi.fn();
    const input = renderPalette(onClose);
    fireEvent.change(input, { target: { value: "s4q" } });
    expect(screen.queryByText("Ayarlar")).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(ITEMS[5].run).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("oklar seçimi gezdiriyor ve sona gelince başa dönüyor", () => {
    const input = renderPalette();
    fireEvent.change(input, { target: { value: "s4" } });
    const options = () => screen.getAllByRole("option");
    expect(options()[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options()[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options()[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options()[1].getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(options()[1].id);
  });

  it("Escape kapatıyor, hiçbir şey çalıştırmıyor", () => {
    const onClose = vi.fn();
    const input = renderPalette(onClose);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(ITEMS.some((i) => (i.run as ReturnType<typeof vi.fn>).mock.calls.length > 0)).toBe(false);
  });

  it("tıklama çalıştırıyor; sonuç yoksa bunu söylüyor", () => {
    const onClose = vi.fn();
    const input = renderPalette(onClose);
    fireEvent.click(screen.getByText("Tedarikçi raporu"));
    expect(ITEMS[2].run).toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "zzzz" } });
    expect(screen.getByText("Sonuç yok")).toBeTruthy();
  });
});

describe("buildPaletteItems", () => {
  const t = ((key: string, params?: Record<string, string>) =>
    params?.name ? `${key}:${params.name}` : key) as Parameters<typeof buildPaletteItems>[0];
  const actions = {
    setActivity: vi.fn(),
    newChat: vi.fn(),
    openChat: vi.fn(),
    selectSystem: vi.fn(),
    openSettings: vi.fn(),
    toggleTheme: vi.fn(),
    toggleLanguage: vi.fn()
  };
  const session = (id: string, title: string, updatedAt: number, projectId: string | null = null) =>
    ({ id, title, updatedAt, projectId }) as unknown as ChatSession;

  it("sohbetler en yeniden eskiye, adsızın da bir adı var; sistemin ipucunda yol ve SID", () => {
    const items = buildPaletteItems(
      t,
      actions,
      [session("a", "Eski", 1), session("b", "  ", 3, "p1"), session("c", "Orta", 2)],
      [{ id: "p1", name: "Proje X", instructions: "", createdAt: 0, updatedAt: 0 }],
      [{ path: ["Müşteri A", "S4"], service: { uuid: "u1", name: "S4D", systemId: "S4D" } as SapService, itemUuid: "i1" }]
    );
    const chats = items.filter((i) => i.group === "chat");
    expect(chats.map((i) => i.label)).toEqual(["palette.untitledChat", "Orta", "Eski"]);
    expect(chats[0].hint).toBe("Proje X");
    const system = items.find((i) => i.group === "system")!;
    expect(system.hint).toBe("Müşteri A / S4 · S4D");
    system.run();
    expect(actions.selectSystem).toHaveBeenCalledWith("u1");
    chats[1].run();
    expect(actions.openChat).toHaveBeenCalledWith("c");
  });
});
