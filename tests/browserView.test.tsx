// @vitest-environment jsdom
// Tarayıcı görünümü (spec 2026-10-18 tarayici §2, §6, §7): boş durum, adres
// alanı, araç çubuğu, yükleme hatası, çökme, indirme uyarısı, kısayollar,
// renk kuralı. Sayfa (BrowserPage) sahtesiyle: jsdom'da webview yok.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import BrowserView from "../src/browser/BrowserView";
import type { PageHandle, PageProps, PageState } from "../src/browser/BrowserPage";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import type { BrowserShortcut } from "../app-electron/shared/browserLogic";

const page = vi.hoisted(() => ({
  load: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  reload: vi.fn(),
  stop: vi.fn(),
  muteAudio: vi.fn(),
  id: 7 as number | null,
  props: null as null | PageProps
}));

// vi.mock yukarı taşınıyor: React fabrikanın İÇİNDE içe aktarılıyor.
vi.mock("../src/browser/BrowserPage", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function FakePage(props: PageProps, ref: Ref<PageHandle>) {
      page.props = props;
      React.useImperativeHandle(ref, () => ({
        load: page.load,
        back: page.back,
        forward: page.forward,
        reload: page.reload,
        stop: page.stop,
        muteAudio: page.muteAudio,
        webContentsId: () => page.id
      }));
      return <div data-fake-page={props.initialUrl} />;
    })
  };
});

function commandsMock(): TerminalCommands {
  return {
    restore: vi.fn(),
    startFresh: vi.fn(),
    addWorkspace: vi.fn(),
    selectWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    addPane: vi.fn(),
    addAgent: vi.fn(),
    addAgentAt: vi.fn(),
    revealPane: vi.fn(),
    setWorkspaceRoot: vi.fn(),
    setWorkspaceVerify: vi.fn(),
    setWorkspaceView: vi.fn(),
    setWorkspaceBrowserUrl: vi.fn(),
    enablePaneMemory: vi.fn(),
    setShellAgent: vi.fn(),
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn(),
    movePane: vi.fn(),
    resizeSplit: vi.fn(),
    equalizeSplit: vi.fn(),
    minimizePane: vi.fn(),
    restorePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    setPaneFontSize: vi.fn(),
    addSetupPane: vi.fn(() => null)
  };
}

const workspace = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes: [],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "browser",
  ...over
});
const pageState = (over: Partial<PageState> = {}): PageState => ({
  url: "https://help.sap.com/docs",
  title: "SAP Yardım",
  loading: false,
  canGoBack: true,
  canGoForward: false,
  ...over
});

let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let shortcut: (id: number, action: BrowserShortcut) => void = () => {};
let download: (id: number | null) => void = () => {};

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    openExternalUrl: vi.fn(async () => ({ ok: true })),
    onBrowserShortcut: vi.fn((cb: typeof shortcut) => {
      shortcut = cb;
      return () => {};
    }),
    onBrowserDownloadBlocked: vi.fn((cb: typeof download) => {
      download = cb;
      return () => {};
    }),
    browserSend: vi.fn(async () => ({ ok: true, screenshot: null }))
  };
  (window as unknown as { api: unknown }).api = api;
  for (const fn of [page.load, page.back, page.forward, page.reload, page.stop, page.muteAudio]) fn.mockClear();
  page.id = 7;
  page.props = null;
});
afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function setup({ ws = workspace(), visible = true, language = "tr" as "tr" | "en" } = {}) {
  const commands = commandsMock();
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) };
  const mkJsx = (v: boolean) => {
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: v, workspaces: [ws], activeWorkspaceId: ws.id },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a",
      setupRuns: {}
    };
    return (
      <LanguageProvider language={language}>
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <BrowserView workspace={ws} visible={v} />
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const result = render(mkJsx(visible));
  return { commands, rerender: (v: boolean) => result.rerender(mkJsx(v)) };
}

const address = () => screen.getByRole("textbox", { name: "Adres" }) as HTMLInputElement;
const fakePage = () => document.querySelector("[data-fake-page]");
function type(text: string) {
  fireEvent.change(address(), { target: { value: text } });
  fireEvent.keyDown(address(), { key: "Enter" });
}
function loaded(over: Partial<PageState> = {}) {
  act(() => page.props!.onReady(7));
  act(() => page.props!.onState(pageState(over)));
}

describe("boş durum ve adres (spec §2)", () => {
  it("'Bir adres yaz'; son adres tek tıkla açılıyor, kendiliğinden yüklenmiyor", () => {
    setup({ ws: workspace({ browserUrl: "http://localhost:5173/" }) });
    expect(screen.getByText("Bir adres yaz")).toBeTruthy();
    expect(fakePage()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Son açılan: http://localhost:5173/" }));
    expect(fakePage()?.getAttribute("data-fake-page")).toBe("http://localhost:5173/");
  });

  it("şemasız girdi tamamlanıyor; ilki sayfayı kuruyor, sonrakiler aynı sayfada açılıyor", () => {
    setup();
    type("localhost:5173");
    expect(fakePage()?.getAttribute("data-fake-page")).toBe("http://localhost:5173/");
    expect(address().value).toBe("http://localhost:5173/");
    type("help.sap.com");
    expect(page.load).toHaveBeenCalledWith("https://help.sap.com/");
    expect(document.querySelectorAll("[data-fake-page]")).toHaveLength(1);
  });

  it("geçersiz adres: uyarı, gezinme yok; arama motoruna gitmiyor", () => {
    setup();
    for (const bad of ["javascript:alert(1)", "sap fiori", "file:///C:/x.html"]) {
      type(bad);
      expect(screen.getByRole("status").textContent, bad).toBe("Yalnız http ve https adresleri açılır.");
    }
    type("http://");
    expect(screen.getByRole("status").textContent).toBe("Adres geçersiz.");
    type(`https://a.com/${"x".repeat(2100)}`);
    expect(screen.getByRole("status").textContent).toBe("Adres çok uzun (en çok 2048 karakter).");
    expect(fakePage()).toBeNull();
    expect(page.load).not.toHaveBeenCalled();
  });

  it("boş girdi: hiçbir şey olmuyor", () => {
    setup();
    type("   ");
    expect(screen.queryByRole("status")).toBeNull();
    expect(fakePage()).toBeNull();
  });
});

describe("sayfa durumu ve araç çubuğu", () => {
  it("adres alanı ve son adres güncelleniyor; Geri/İleri sayfanın geçmişine göre; hata sayfası adresi kaydedilmiyor", () => {
    const { commands } = setup();
    type("help.sap.com");
    expect(screen.getByRole("button", { name: "Geri" }).hasAttribute("disabled")).toBe(true);
    loaded();
    expect(address().value).toBe("https://help.sap.com/docs");
    expect(commands.setWorkspaceBrowserUrl).toHaveBeenCalledWith("a", "https://help.sap.com/docs");
    expect(screen.getByRole("button", { name: "Geri" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "İleri" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Geri" }));
    expect(page.back).toHaveBeenCalled();
    act(() => page.props!.onState(pageState({ url: "chrome-error://chromewebdata/" })));
    expect(commands.setWorkspaceBrowserUrl).toHaveBeenCalledTimes(1);
    expect(address().value).toBe("https://help.sap.com/docs");
  });

  it("yüklenirken Durdur, değilken Yenile", () => {
    setup();
    type("help.sap.com");
    loaded({ loading: true });
    fireEvent.click(screen.getByRole("button", { name: "Durdur" }));
    expect(page.stop).toHaveBeenCalled();
    act(() => page.props!.onState(pageState({ loading: false })));
    fireEvent.click(screen.getByRole("button", { name: "Yenile" }));
    expect(page.reload).toHaveBeenCalled();
  });

  it("Esc yazılanı bırakıp sayfanın adresine dönüyor; yazarken sayfa adresi üstüne yazmıyor", () => {
    setup();
    type("help.sap.com");
    loaded();
    fireEvent.change(address(), { target: { value: "yarım yazı" } });
    act(() => page.props!.onState(pageState({ url: "https://help.sap.com/diger" })));
    expect(address().value).toBe("yarım yazı");
    fireEvent.keyDown(address(), { key: "Escape" });
    expect(address().value).toBe("https://help.sap.com/diger");
  });

  it("Sistem tarayıcısında aç: sayfa yokken kapalı; sonra sayfanın adresiyle", () => {
    setup();
    const external = () => screen.getByRole("button", { name: "Sistem tarayıcısında aç" });
    expect(external().hasAttribute("disabled")).toBe(true);
    type("help.sap.com");
    loaded();
    fireEvent.click(external());
    expect(api.openExternalUrl).toHaveBeenCalledWith("https://help.sap.com/docs");
  });

  it("blur edilince editing sıfırlanıyor; sonraki gezinme adres alanını günceller", () => {
    setup();
    type("help.sap.com");
    loaded();
    fireEvent.change(address(), { target: { value: "yarım yazı" } });
    act(() => page.props!.onState(pageState({ url: "https://help.sap.com/diger" })));
    expect(address().value).toBe("yarım yazı");
    fireEvent.blur(address());
    expect(address().value).toBe("https://help.sap.com/diger");
  });
});

describe("hata gövdesi (spec §6)", () => {
  it("sertifika: sebep + adres + yalnız Yeniden dene (istisna yok); ERR_ABORTED yok sayılıyor", () => {
    setup();
    type("expired.badssl.com");
    act(() => page.props!.onFail(-3, "https://expired.badssl.com/"));
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => page.props!.onFail(-202, "https://expired.badssl.com/"));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Sitenin güvenlik sertifikası geçersiz; sayfa açılmadı.");
    expect(alert.textContent).toContain("https://expired.badssl.com/");
    expect(within(alert).getAllByRole("button").map((b) => b.textContent)).toEqual(["Yeniden dene"]);
    fireEvent.click(within(alert).getByRole("button", { name: "Yeniden dene" }));
    expect(page.load).toHaveBeenCalledWith("https://expired.badssl.com/");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("DNS, bağlantı ve diğer hata", () => {
    setup();
    type("yok.example");
    act(() => page.props!.onFail(-105, "https://yok.example/"));
    expect(screen.getByRole("alert").textContent).toContain("Sunucu bulunamadı.");
    act(() => page.props!.onFail(-102, "http://localhost:5173/"));
    expect(screen.getByRole("alert").textContent).toContain("Sunucuya bağlanılamadı.");
    act(() => page.props!.onFail(-999, "https://a.com/"));
    expect(screen.getByRole("alert").textContent).toContain("Sayfa yüklenemedi (hata -999).");
  });

  it("çökme: 'Sayfa çöktü.' + Yeniden yükle", () => {
    setup();
    type("help.sap.com");
    loaded();
    act(() => page.props!.onCrash());
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Sayfa çöktü.");
    fireEvent.click(within(alert).getByRole("button", { name: "Yeniden yükle" }));
    expect(page.reload).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("indirme ve kısayollar (spec §4.5, §7)", () => {
  it("indirme reddi yalnız bu sayfanın kimliğiyle uyarıyor", () => {
    setup();
    type("help.sap.com");
    loaded();
    act(() => download(8));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => download(7));
    expect(screen.getByRole("status").textContent).toBe("İndirmeler yerleşik tarayıcıda kapalı; Sistem tarayıcısında aç'ı kullan.");
  });

  it("indirme uyarısı aynı url'li durum olayıyla silinmiyor; farklı url ile siliniyor", () => {
    setup();
    type("help.sap.com");
    loaded(); // url = "https://help.sap.com/docs"
    act(() => download(7));
    expect(screen.getByRole("status").textContent).toBe("İndirmeler yerleşik tarayıcıda kapalı; Sistem tarayıcısında aç'ı kullan.");
    // did-stop-loading / page-title-updated: aynı url → uyarı kalmalı
    act(() => page.props!.onState(pageState()));
    expect(screen.getByRole("status").textContent).toBe("İndirmeler yerleşik tarayıcıda kapalı; Sistem tarayıcısında aç'ı kullan.");
    // farklı url ile gezinme → uyarı kalkmalı
    act(() => page.props!.onState(pageState({ url: "https://help.sap.com/other" })));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("sayfadan iletilen Ctrl+L adres alanına; Alt+Sol geri; başka sayfanın kısayolu yok sayılıyor", () => {
    setup();
    type("help.sap.com");
    loaded();
    address().blur();
    act(() => shortcut(8, "focusAddress"));
    expect(document.activeElement).not.toBe(address());
    act(() => shortcut(7, "focusAddress"));
    expect(document.activeElement).toBe(address());
    act(() => shortcut(7, "back"));
    expect(page.back).toHaveBeenCalledTimes(1);
  });

  it("odak uygulamadayken Ctrl+L ve Alt+Sağ yalnız görünürken; Ctrl+V'ye dokunulmuyor", () => {
    setup();
    type("help.sap.com");
    loaded();
    address().blur();
    fireEvent.keyDown(window, { key: "l", ctrlKey: true });
    expect(document.activeElement).toBe(address());
    fireEvent.keyDown(window, { key: "ArrowRight", altKey: true });
    expect(page.forward).toHaveBeenCalled();
    const paste = createEvent.keyDown(window, { key: "v", ctrlKey: true });
    fireEvent(window, paste);
    expect(paste.defaultPrevented).toBe(false);
    cleanup();
    setup({ visible: false });
    fireEvent.keyDown(window, { key: "l", ctrlKey: true });
    expect(document.activeElement).not.toBe(address());
  });
});

describe("ses kontrolü (spec §2 — takılı kalma)", () => {
  it("gizlenince ses kapatılıyor; görününce geri açılıyor", () => {
    const { rerender } = setup({ visible: true });
    type("help.sap.com");
    loaded();
    rerender(false);
    expect(page.muteAudio).toHaveBeenCalledWith(true);
    rerender(true);
    expect(page.muteAudio).toHaveBeenCalledWith(false);
  });
});

describe("dil ve kaynak kuralları", () => {
  it("İngilizce araç çubuğu", () => {
    setup({ language: "en" });
    for (const name of ["Back", "Forward", "Reload", "Open in system browser"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Address" })).toBeTruthy();
    expect(screen.getByText("Type an address")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Browser view" })).toBeTruthy();
  });

  it("webview'a ayar özniteliği yok; yalnız bizim bölüm", () => {
    const source = readFileSync(path.join(__dirname, "..", "src", "browser", "BrowserPage.tsx"), "utf8");
    expect(source).toContain("partition={BROWSER_PARTITION}");
    for (const forbidden of ["nodeintegration", "nodeIntegration", "preload", "webpreferences", "disablewebsecurity", "plugins"]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });

  it("src/browser altında yeni renk yok", () => {
    const dir = path.join(__dirname, "..", "src", "browser");
    for (const name of readdirSync(dir)) {
      const source = readFileSync(path.join(dir, name), "utf8");
      expect(source, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|lime-/);
    }
  });
});
