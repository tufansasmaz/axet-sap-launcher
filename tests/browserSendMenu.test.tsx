// @vitest-environment jsdom
// Ajana gönder (spec 2026-10-18 tarayici §3, §6): alandaki ajanlar adı, rolü,
// durumuyla; kabuk yok; seçmek onaydır; meşgul/soru/yazıyor/kapalı sebebi;
// ekran görüntüsü kutusu (kök yoksa kapalı); sonuç satırı; görünüm Tarayıcı'da kalır.
import type { Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import BrowserView from "../src/browser/BrowserView";
import type { PageHandle, PageProps, PageState } from "../src/browser/BrowserPage";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const page = vi.hoisted(() => ({ id: 7 as number | null, props: null as null | PageProps }));

vi.mock("../src/browser/BrowserPage", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function FakePage(props: PageProps, ref: Ref<PageHandle>) {
      page.props = props;
      React.useImperativeHandle(ref, () => ({
        load: () => {},
        back: () => {},
        forward: () => {},
        reload: () => {},
        stop: () => {},
        muteAudio: () => {},
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

const agentPane = (id: string, title: string, role = ""): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role, roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title
});
const shellPane = (id: string): TerminalPane => ({ id, kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: `t-${id}` }, title: "Kabuk" });
const workspace = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1", "Ay\u015fe", "analist"), agentPane("p2", "Mehmet"), shellPane("s1")],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "browser",
  ...over
});
const st = (state: AgentStatus["state"]): AgentStatus => ({ state, source: "exact", lastActivity: 1 });
const pageState: PageState = { url: "https://help.sap.com/docs", title: "SAP Yard\u0131m", loading: false, canGoBack: false, canGoForward: false };

let api: { browserSend: ReturnType<typeof vi.fn>; [key: string]: ReturnType<typeof vi.fn> };
let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    browserSend: vi.fn(async () => ({ ok: true, screenshot: null })),
    openExternalUrl: vi.fn(),
    onBrowserShortcut: vi.fn(() => () => {}),
    onBrowserDownloadBlocked: vi.fn(() => () => {})
  };
  (window as unknown as { api: unknown }).api = api;
  page.id = 7;
  page.props = null;
});
afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

function setup({ ws = workspace(), language = "tr" as "tr" | "en", withPage = true } = {}) {
  const commands = commandsMock();
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: ws.id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a",
    setupRuns: {}
  };
  const agents: AgentStatusValue = {
    statuses: { p1: st("idle"), p2: st("running") },
    engines: [],
    now: 1,
    answer: vi.fn(async () => ({ ok: true as const }))
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <BrowserView workspace={ws} visible />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  if (withPage) {
    const input = screen.getByRole("textbox", { name: language === "tr" ? "Adres" : "Address" });
    fireEvent.change(input, { target: { value: "help.sap.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => page.props!.onReady(7));
    act(() => page.props!.onState(pageState));
  }
  return { commands };
}

const sendButton = () => screen.getByRole("button", { name: "Ajana g\u00f6nder" });
const openMenu = () => fireEvent.click(sendButton());
const items = () => screen.getAllByRole("menuitem");

describe("men\u00fc (spec \u00a73)", () => {
  it("sayfa yokken d\u00fc\u011fme kapal\u0131", () => {
    setup({ withPage: false });
    expect(sendButton().hasAttribute("disabled")).toBe(true);
  });

  it("ajan yok: 'Bu alanda ajan yok'; kabuk b\u00f6lmesi listelenmiyor", () => {
    setup({ ws: workspace({ panes: [shellPane("s1")] }) });
    openMenu();
    expect(screen.getByRole("menu").textContent).toContain("Bu alanda ajan yok");
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
  });

  it("ajanlar ad\u0131, rol\u00fc, durumuyla; se\u00e7ilince hemen g\u00f6nderiliyor; men\u00fc kapan\u0131yor, g\u00f6r\u00fcn\u00fcm Taray\u0131c\u0131'da kal\u0131yor", async () => {
    const { commands } = setup();
    openMenu();
    expect(items()).toHaveLength(2);
    expect(items()[0].textContent).toContain("Ay\u015fe");
    expect(items()[0].textContent).toContain("analist");
    expect(items()[0].textContent).toContain("Bo\u015fta");
    expect(items()[1].textContent).toContain("Mehmet");
    expect(items()[1].textContent).toContain("\u00c7al\u0131\u015f\u0131yor");
    fireEvent.click(items()[0]);
    expect(api.browserSend).toHaveBeenCalledWith("a", "p1", 7, false);
    await flush();
    expect(screen.getByRole("status").textContent).toBe("G\u00f6nderildi: Ay\u015fe");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(commands.setWorkspaceView).not.toHaveBeenCalled();
  });

  it("Esc men\u00fcy\u00fc kapat\u0131yor, hi\u00e7bir \u015fey g\u00f6nderilmiyor", () => {
    setup();
    openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(api.browserSend).not.toHaveBeenCalled();
  });
});

describe("g\u00f6nderilemeyince (spec \u00a73, \u00a76)", () => {
  it("me\u015fgul, soru, yaz\u0131yor, kapal\u0131: sebep s\u00f6yleniyor; kendili\u011finden yeniden denenmiyor", async () => {
    setup();
    const cases: [string, string][] = [
      ["busy", "Ajan \u015fu an me\u015fgul; i\u015fi bitince yeniden g\u00f6nder."],
      ["asking", "Ajan bir soru bekliyor; önce Akış'taki soruyu cevapla."],
      ["typing", "Ajan\u0131n terminalinde g\u00f6nderilmemi\u015f bir sat\u0131r var; \u00f6nce onu g\u00f6nder ya da sil."],
      ["notRunning", "Ajan \u00e7al\u0131\u015fm\u0131yor ya da a\u00e7\u0131l\u0131\u015f se\u00e7iminde bekliyor; terminalde ajan\u0131 ba\u015flat ya da se\u00e7imi tamamla."],
      ["notSubmitted", "Metin ajan\u0131n sat\u0131r\u0131na yaz\u0131ld\u0131 ama g\u00f6nderilmedi; kontrol edip Enter'a sen bas."]
    ];
    for (const [reason, text] of cases) {
      api.browserSend.mockResolvedValueOnce({ ok: false, reason });
      openMenu();
      fireEvent.click(items()[1]);
      await flush();
      expect(screen.getByRole("status").textContent, reason).toBe(text);
    }
    expect(api.browserSend).toHaveBeenCalledTimes(cases.length);
  });

  it("sayfa kimli\u011fi yoksa IPC yok: 'G\u00f6nderilecek sayfa yok.'", async () => {
    setup();
    page.id = null;
    openMenu();
    fireEvent.click(items()[0]);
    await flush();
    expect(api.browserSend).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("G\u00f6nderilecek sayfa yok.");
  });

  it("IPC f\u0131rlat\u0131rsa: uyar\u0131; d\u00fc\u011fme yeniden a\u00e7\u0131l\u0131yor", async () => {
    setup();
    api.browserSend.mockRejectedValueOnce(new Error("ipc"));
    openMenu();
    fireEvent.click(items()[0]);
    await flush();
    expect(screen.getByRole("status").textContent).toBe("G\u00f6nderilemedi: yaz\u0131lamad\u0131.");
    expect(sendButton().hasAttribute("disabled")).toBe(false);
  });
});

describe("ekran g\u00f6r\u00fcnt\u00fcs\u00fc (spec \u00a73)", () => {
  it("alan\u0131n k\u00f6k\u00fc yoksa kutu kapal\u0131 ve sebebi yaz\u0131l\u0131", () => {
    setup();
    openMenu();
    const box = screen.getByRole("menuitemcheckbox", { name: "Ekran g\u00f6r\u00fcnt\u00fcs\u00fc ekle" });
    expect(box.hasAttribute("disabled")).toBe(true);
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("menu").textContent).toContain("Ekran g\u00f6r\u00fcnt\u00fcs\u00fc i\u00e7in alan\u0131n k\u00f6k klas\u00f6r\u00fc gerekli.");
  });

  it("k\u00f6k varsa i\u015faretleniyor (men\u00fc a\u00e7\u0131k kal\u0131yor) ve g\u00f6nderimle gidiyor; ba\u015far\u0131 sat\u0131r\u0131 dosyay\u0131 s\u00f6yl\u00fcyor", async () => {
    setup({ ws: workspace({ root: "C:\\proje" }) });
    api.browserSend.mockResolvedValueOnce({ ok: true, screenshot: ".ntt-studio/tarayici/20261018-140000.png" });
    openMenu();
    const box = screen.getByRole("menuitemcheckbox", { name: "Ekran g\u00f6r\u00fcnt\u00fcs\u00fc ekle" });
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.click(items()[0]);
    expect(api.browserSend).toHaveBeenCalledWith("a", "p1", 7, true);
    await flush();
    expect(screen.getByRole("status").textContent).toBe("G\u00f6nderildi: Ay\u015fe \u00b7 ekran g\u00f6r\u00fcnt\u00fcs\u00fc .ntt-studio/tarayici/20261018-140000.png");
  });

  it("10 MB'tan b\u00fcy\u00fck: uyar\u0131, hi\u00e7bir \u015fey g\u00f6nderilmedi", async () => {
    setup({ ws: workspace({ root: "C:\\proje" }) });
    api.browserSend.mockResolvedValueOnce({ ok: false, reason: "tooLarge" });
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Ekran g\u00f6r\u00fcnt\u00fcs\u00fc ekle" }));
    fireEvent.click(items()[0]);
    await flush();
    expect(screen.getByRole("status").textContent).toBe("Ekran g\u00f6r\u00fcnt\u00fcs\u00fc 10 MB'tan b\u00fcy\u00fck; hi\u00e7bir \u015fey g\u00f6nderilmedi.");
  });
});

describe("eri\u015filebilirlik: odak ve klavye", () => {
  it("Esc kapaninca odak d\u00fc\u011fmeye d\u00f6n\u00fcyor", () => {
    setup();
    openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(sendButton());
  });

  it("arka plan tiklamasiyla kapaninca men\u00fc kapaliyor ve odak d\u00fc\u011fmeye d\u00f6n\u00fcyor", () => {
    setup();
    openMenu();
    fireEvent.click(screen.getByTestId("menu-backdrop"));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(sendButton());
  });

  it("ArrowDown ilk menuitem'e odak veriyor; ArrowDown tekrar sonrakine", () => {
    setup();
    openMenu();
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items()[0]);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items()[1]);
  });

  it("ArrowUp son \u00f6\u011feden \u00f6ncekine d\u00f6n\u00fcyor (sarmalama)", () => {
    setup();
    openMenu();
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items()[1]);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items()[0]);
  });
});

describe("g\u00f6nderim bekleme g\u00f6r\u00fcn\u00fcm\u00fc", () => {
  it("g\u00f6nderim s\u00fcrerken d\u00fc\u011fme 'G\u00f6nderiliyor...' ve aria-busy; bittikten sonra normal", async () => {
    let resolveResult: (v: { ok: true; screenshot: null }) => void = () => {};
    api.browserSend.mockReturnValueOnce(new Promise<{ ok: true; screenshot: null }>((r) => { resolveResult = r; }));
    setup();
    openMenu();
    fireEvent.click(items()[0]);
    // Gonderim basliyor: menu kapaniyor, dugme busy
    const busyBtn = document.querySelector('[aria-busy="true"]') as HTMLElement | null;
    expect(busyBtn).toBeTruthy();
    expect(busyBtn!.textContent).toContain("G\u00f6nderiliyor");
    expect(busyBtn!.hasAttribute("disabled")).toBe(true);
    // Cevap geliyor
    await act(async () => { resolveResult({ ok: true, screenshot: null }); });
    await flush();
    expect(sendButton().getAttribute("aria-busy")).toBeNull();
    expect(sendButton().textContent).toContain("Ajana g\u00f6nder");
    expect(sendButton().hasAttribute("disabled")).toBe(false);
  });
});

describe("\u0130ngilizce", () => {
  it("d\u00fc\u011fme, kutu ve bo\u015f men\u00fc", () => {
    setup({ ws: workspace({ panes: [] }), language: "en" });
    fireEvent.click(screen.getByRole("button", { name: "Send to agent" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Include a screenshot" })).toBeTruthy();
    expect(screen.getByRole("menu").textContent).toContain("No agents in this workspace");
  });
});
