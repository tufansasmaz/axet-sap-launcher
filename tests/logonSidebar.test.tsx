// @vitest-environment jsdom
import { createRef } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import LogonSidebar, { type LogonSidebarProps } from "../src/components/LogonSidebar";
import type { SapNode, SapService } from "../app-electron/shared/types";
import { countVisibleServices } from "../src/components/Tree";

// Bazı testler `window.api`'yi sahtesiyle değiştiriyor; sonraki testlere
// sızmasın diye her testten sonra eskisi geri konuyor.
const win = window as unknown as { api: unknown };
const originalApi = win.api;

// Bölümlerin açık/kapalı hâli localStorage'da. Node 26 kendi `localStorage`
// genelini (--localstorage-file olmadan `undefined`) jsdom'unkinin üstüne
// koyuyor, yani testte depo yok; bellekte basit bir tane veriliyor.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear()
});

afterEach(() => {
  cleanup();
  // Testler birbirine sızmasın.
  localStorage.clear();
  win.api = originalApi;
});

// Tanımlanmayan her işlev hiç dönmeyen bir söz veriyor, `on…` abonelikleri
// boş bir iptal. Symbol anahtarları (`then`, inspect) için `undefined`:
// `k.startsWith` onlarda patlıyordu.
function fakeApi(impl: Record<string, unknown> = {}) {
  return new Proxy(
    {},
    {
      get: (_t, k) => {
        if (typeof k !== "string") return undefined;
        if (k in impl) return impl[k];
        return k.startsWith("on") ? () => () => {} : () => new Promise(() => {});
      }
    }
  );
}

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
    onAddSystem: vi.fn(),
    onRefreshFromSapLogon: vi.fn(),
    onReloadList: vi.fn(),
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
    win.api = fakeApi({ listDir: async () => ({ ok: true, entries: [entry] }) });
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
    win.api = fakeApi();
    const props = renderSidebar({ files: FILES, mode: "files" });
    expect(screen.queryByText("Test Müşteri")).toBeNull();
    fireEvent.change(searchBox(), { target: { value: "s4d" } });
    expect(props.onModeChange).toHaveBeenCalledWith("systems");
    expect(props.onSearchChange).toHaveBeenCalledWith("s4d");
  });

  it("sistem satırında sunucu simgesi yok; durum noktası addan önce, SID en sonda", () => {
    renderSidebar();
    for (const row of screen.getAllByRole("button", { name: /S4D Geliştirme/ })) {
      expect(row.querySelector(".lucide-server")).toBeNull();
      const slot = row.querySelector("[data-status-slot]");
      expect(slot).not.toBeNull();
      const name = within(row).getByText("S4D Geliştirme");
      expect(slot!.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(row.lastElementChild!.textContent).toBe("S4D");
    }
  });

  it("klasör simgesi gri, alt seviye girintisi 12px", () => {
    renderSidebar();
    const folder = screen.getByRole("button", { name: "Test Müşteri" });
    expect(folder.querySelector(".lucide-folder")!.classList.contains("text-slate-500")).toBe(true);
    // İlk satır son bağlanılanlar, ikincisi ağaç: 1 seviye × 12 + 8.
    const treeRow = screen.getAllByRole("button", { name: /S4D Geliştirme/ })[1];
    expect(treeRow.style.paddingLeft).toBe("20px");
  });
});

describe("LogonSidebar ＋ menüsü", () => {
  const openMenu = () => {
    fireEvent.click(screen.getByRole("button", { name: "Sistem ekle ve yenile" }));
    return screen.getByRole("menu");
  };

  it("açılıyor, üç seçenek var, ilki odakta", () => {
    renderSidebar();
    const trigger = screen.getByRole("button", { name: "Sistem ekle ve yenile" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    openMenu();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Sistem Ekle", "SAP Logon'dan Getir", "Listeyi yeniden yükle"]);
    expect(document.activeElement).toBe(items[0]);
  });

  it("her seçenek kendi işlevini çağırıyor ve menüyü kapatıyor", () => {
    const props = renderSidebar();
    const cases: [string, ReturnType<typeof vi.fn>][] = [
      ["Sistem Ekle", props.onAddSystem as ReturnType<typeof vi.fn>],
      ["SAP Logon'dan Getir", props.onRefreshFromSapLogon as ReturnType<typeof vi.fn>],
      ["Listeyi yeniden yükle", props.onReloadList as ReturnType<typeof vi.fn>]
    ];
    for (const [label, fn] of cases) {
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      expect(fn).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
    }
  });

  it("Escape kapatıyor ve odağı ＋ düğmesine geri veriyor", () => {
    renderSidebar();
    const menu = openMenu();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sistem ekle ve yenile" }));
  });

  it("ok tuşları seçenekler arasında dönerek geziyor", () => {
    renderSidebar();
    const menu = openMenu();
    const items = screen.getAllByRole("menuitem");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("dışarı tıklama kapatıyor, hiçbir işlev çağrılmıyor", () => {
    const props = renderSidebar();
    openMenu();
    const overlay = document.querySelector("[data-menu-overlay]") as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(props.onAddSystem).not.toHaveBeenCalled();
  });

  it("pencere kenarına taşmıyor", () => {
    renderSidebar();
    const trigger = screen.getByRole("button", { name: "Sistem ekle ve yenile" });
    trigger.getBoundingClientRect = () =>
      ({ left: 1010, right: 1034, top: 736, bottom: 760, width: 24, height: 24, x: 1010, y: 736 }) as DOMRect;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    const menu = openMenu();
    // 1024 - 176 - 8 = 840 ; 768 - 104 - 8 = 656
    expect(menu.style.left).toBe("840px");
    expect(menu.style.top).toBe("656px");
  });
});

describe("LogonSidebar üst şerit ve Müşteriler bölümü", () => {
  it("arama şeridi Sohbet'le aynı yükseklikte ve yan boşlukta", () => {
    renderSidebar();
    const strip = searchBox().closest("[data-sidebar-header]")!;
    expect(strip).not.toBeNull();
    for (const cls of ["h-[54px]", "shrink-0", "px-2.5"]) {
      expect(strip.classList.contains(cls)).toBe(true);
    }
  });

  it("Sistemler/Dosyalar geçişi çerçeveli kutuda değil", () => {
    renderSidebar({ files: FILES });
    const systems = screen.getByRole("button", { name: "Sistem listesi" });
    expect(systems.parentElement!.classList.contains("border")).toBe(false);
    expect(systems.classList.contains("bg-active")).toBe(true);
    expect(systems.className).not.toContain("accent");
  });

  it("Müşteriler başlığı sistem sayısını gösteriyor; kapatınca ağaç gizleniyor ve bu hatırlanıyor", () => {
    renderSidebar();
    const label = screen.getByText("Müşteriler");
    expect(label.nextElementSibling?.textContent).toBe("1");
    const header = label.closest("button")!;
    expect(header.getAttribute("aria-expanded")).toBe("true");
    const folder = screen.getByRole("button", { name: "Test Müşteri" });
    expect(folder.closest(".hidden")).toBeNull();

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Test Müşteri" }).closest(".hidden")).not.toBeNull();
    expect(localStorage.getItem("axet.customerTree.collapsed")).toBe("1");

    cleanup();
    renderSidebar();
    expect(screen.getByText("Müşteriler").closest("button")!.getAttribute("aria-expanded")).toBe("false");
  });

  it("Müşteriler kapalıyken arama yapılınca sonuçlar yine görünüyor", () => {
    localStorage.setItem("axet.customerTree.collapsed", "1");
    renderSidebar({ search: "s4d" });
    const row = screen.getByRole("button", { name: /S4D Geliştirme/ });
    expect(row.closest(".hidden")).toBeNull();
    expect(screen.getByText("Müşteriler").nextElementSibling?.textContent).toBe("1");
  });

  it("arama sürerken Müşteriler başlığı tıklanamıyor, kayıtlı tercih değişmiyor", () => {
    localStorage.setItem("axet.customerTree.collapsed", "1");
    renderSidebar({ search: "s4d" });
    const header = screen.getByText("Müşteriler").closest("button")!;
    expect(header.disabled).toBe(true);
    fireEvent.click(header);
    expect(localStorage.getItem("axet.customerTree.collapsed")).toBe("1");
  });

  it("Son Bağlanılanlar da aynı başlık bileşenini kullanıyor", () => {
    renderSidebar();
    const recent = screen.getByText("Son Bağlanılanlar").closest("button")!;
    const customers = screen.getByText("Müşteriler").closest("button")!;
    expect(recent.className).toBe(customers.className);
  });
});

describe("countVisibleServices", () => {
  const svc = (uuid: string, name: string, systemId: string): SapService => ({ ...SERVICE, uuid, name, systemId });
  const NODES: SapNode[] = [
    {
      uuid: "a",
      name: "Müşteri A",
      nodes: [{ uuid: "a1", name: "Alt Grup", nodes: [], items: [{ uuid: "i2", service: svc("s2", "D02 Geliştirme", "D02") }] }],
      items: [{ uuid: "i1", service: svc("s1", "D01 Geliştirme", "D01") }]
    },
    { uuid: "b", name: "Müşteri B", nodes: [], items: [{ uuid: "i3", service: svc("s3", "Q01 Kalite", "Q01") }] }
  ];

  it("arama yokken iç içe klasörler dahil bütün sistemleri sayıyor", () => {
    expect(countVisibleServices(NODES, "")).toBe(3);
  });

  it("aramada yalnızca eşleşenleri sayıyor", () => {
    expect(countVisibleServices(NODES, "q01")).toBe(1);
    expect(countVisibleServices(NODES, "zzz")).toBe(0);
  });

  it("müşteri adı eşleşince o müşterinin doğrudan sistemleri sayılıyor", () => {
    // Ağaç da böyle çiziyor: klasör adı eşleşirse doğrudan öğeleri görünür,
    // alt klasörler ise ancak kendileri eşleşirse.
    expect(countVisibleServices(NODES, "müşteri b")).toBe(1);
  });
});
