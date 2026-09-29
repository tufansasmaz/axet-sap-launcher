// @vitest-environment jsdom
import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import LogonSidebar, { type LogonSidebarProps } from "../src/components/LogonSidebar";
import type { SapNode, SapService } from "../app-electron/shared/types";

afterEach(cleanup);

const SERVICE: SapService = {
  uuid: "svc-1",
  systemId: "S4D",
  name: "S4D Geliştirme",
  type: "SAPGUI",
  host: "s4d.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

const CUSTOMERS: SapNode[] = [
  { uuid: "cust-1", name: "Test Müşteri", nodes: [], items: [{ uuid: "item-1", service: SERVICE }] }
];

function renderSidebar(overrides: Partial<LogonSidebarProps> = {}) {
  const props: LogonSidebarProps = {
    search: "",
    onSearchChange: vi.fn(),
    searchInputRef: createRef<HTMLInputElement>(),
    mode: "systems",
    onModeChange: vi.fn(),
    files: null,
    loading: false,
    customers: CUSTOMERS,
    recentEntries: [
      { path: ["Test Müşteri"], service: SERVICE, itemUuid: "item-1", connectedAt: "2026-09-29T08:00:00.000Z" }
    ],
    selectedUuid: null,
    connectivity: {},
    tierOverrides: {},
    onSelect: vi.fn(),
    ...overrides
  };
  render(
    <LanguageProvider language="tr">
      <LogonSidebar {...props} />
    </LanguageProvider>
  );
  return props;
}

const FILES = {
  rootDir: "C:/proje",
  rootLabel: "S4D",
  selectedPath: null,
  onSelectFile: vi.fn(),
  onImportComplete: vi.fn(),
  onRootPicked: vi.fn()
};

function searchBox() {
  return screen.getByRole("textbox", { name: "Müşteri veya sistem ara… (Ctrl+F)" });
}

describe("LogonSidebar", () => {
  it("arama kutusu kenar çubuğunda; yazılan App'e gidiyor ve ref kutuya bağlı", () => {
    const props = renderSidebar();
    const input = searchBox();
    expect(input.hasAttribute("data-sidebar-search")).toBe(true);
    expect(props.searchInputRef.current).toBe(input);
    fireEvent.change(input, { target: { value: "s4d" } });
    expect(props.onSearchChange).toHaveBeenCalledWith("s4d");
  });

  it("Escape ve temizle düğmesi aramayı boşaltıyor", () => {
    const props = renderSidebar({ search: "s4d" });
    fireEvent.keyDown(searchBox(), { key: "Escape" });
    expect(props.onSearchChange).toHaveBeenLastCalledWith("");
    fireEvent.click(screen.getByRole("button", { name: "Aramayı temizle" }));
    expect(props.onSearchChange).toHaveBeenCalledTimes(2);
  });

  it("son bağlanılanlar yalnızca arama boşken görünüyor", () => {
    renderSidebar();
    expect(screen.getByText("Son Bağlanılanlar")).toBeTruthy();
    expect(screen.getByText("Test Müşteri")).toBeTruthy();
    cleanup();
    renderSidebar({ search: "s4d" });
    expect(screen.queryByText("Son Bağlanılanlar")).toBeNull();
  });

  it("ağaç ve son bağlanılanlar Sohbet'in satır ölçüsünü ve seçim dilini kullanıyor (spec §6.5)", () => {
    renderSidebar({ selectedUuid: "item-1" });
    // Aynı sistem iki listede de var: önce son bağlanılanlar, sonra ağaç.
    const rows = screen.getAllByRole("button", { name: /S4D Geliştirme/ });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.getAttribute("aria-current")).toBe("true");
      expect(row.querySelector("[data-active-line]")).not.toBeNull();
      for (const cls of ["h-7", "rounded-md", "relative", "bg-[var(--accent-glow)]"]) {
        expect(row.classList.contains(cls)).toBe(true);
      }
      expect(row.classList.contains("bg-accent-500/20")).toBe(false);
    }
    expect(screen.getByRole("button", { name: "Test Müşteri" }).classList.contains("h-7")).toBe(true);
    cleanup();

    renderSidebar();
    for (const row of screen.getAllByRole("button", { name: /S4D Geliştirme/ })) {
      expect(row.getAttribute("aria-current")).toBeNull();
      expect(row.querySelector("[data-active-line]")).toBeNull();
    }
  });

  it("dosya görünümünde seçili dosya da aynı seçim dilinde", async () => {
    const entry = { name: "rapor.abap", path: "C:/proje/rapor.abap", isDir: false, size: 1, modifiedAt: "" };
    (window as unknown as { api: unknown }).api = new Proxy(
      {},
      {
        get: (_t, k: string) =>
          k === "listDir" ? async () => ({ ok: true, entries: [entry] }) : k.startsWith("on") ? () => () => {} : () => new Promise(() => {})
      }
    );
    renderSidebar({ files: { ...FILES, selectedPath: entry.path }, mode: "files" });
    const row = (await screen.findByText("rapor.abap")).closest("button")!;
    expect(row.getAttribute("aria-current")).toBe("true");
    expect(row.querySelector("[data-active-line]")).not.toBeNull();
    expect(row.classList.contains("bg-[var(--accent-glow)]")).toBe(true);
  });

  it("son bağlanılanlar başlığı Eyebrow: tek satır, sayı sağda, açık/kapalı bildiriliyor", () => {
    renderSidebar();
    const label = screen.getByText("Son Bağlanılanlar");
    expect(label.classList.contains("truncate")).toBe(true);
    expect(label.parentElement!.classList.contains("font-mono")).toBe(true);
    expect(label.nextElementSibling?.textContent).toBe("1");
    const header = label.closest("button")!;
    expect(header.getAttribute("aria-expanded")).toBe("true");
    // Eski başlıkta saat ikonu vardı; 220px'te başlığı iki satıra kıran oydu.
    expect(header.querySelectorAll("svg")).toHaveLength(1);
  });

  it("liste ilk kez yüklenirken yükleniyor yazıyor", () => {
    renderSidebar({ loading: true, customers: [] });
    expect(screen.getByText("Yükleniyor…")).toBeTruthy();
    expect(screen.queryByText("Test Müşteri")).toBeNull();
  });

  it("dosya görünümü yoksa geçiş düğmeleri de yok", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: "Dosya gezgini" })).toBeNull();
  });

  it("dosya görünümü varken geçiş düğmeleri modu değiştiriyor", () => {
    const props = renderSidebar({ files: FILES });
    const systems = screen.getByRole("button", { name: "Sistem listesi" });
    expect(systems.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Dosya gezgini" }));
    expect(props.onModeChange).toHaveBeenCalledWith("files");
  });

  it("dosyalar görünümünde aramaya yazmak sistemlere geçiriyor", () => {
    // `FileExplorer` açılışta klasörü okuyor; cevap hiç gelmiyor, konumuz değil.
    (window as unknown as { api: unknown }).api = new Proxy(
      {},
      { get: (_t, k: string) => (k.startsWith("on") ? () => () => {} : () => new Promise(() => {})) }
    );
    const props = renderSidebar({ files: FILES, mode: "files" });
    expect(screen.queryByText("Test Müşteri")).toBeNull();
    fireEvent.change(searchBox(), { target: { value: "s4d" } });
    expect(props.onModeChange).toHaveBeenCalledWith("systems");
    expect(props.onSearchChange).toHaveBeenCalledWith("s4d");
  });
});
