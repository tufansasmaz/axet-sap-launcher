// @vitest-environment jsdom
// Tur 7: otomatik tarayıcı (izleyici + Akış kartı + rozet), soru kartında
// serbest cevap, Ajan yönetimi ekranı.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "../src/i18n";
import FlowSidebar from "../src/agents/FlowSidebar";
import ManageView from "../src/agents/ManageView";
import LocalUrlWatcher from "../src/browser/LocalUrlWatcher";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import type { FlowEvent } from "../src/agents/flowEvents";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentAnswerResult, AgentQuestion, AgentStatus } from "../app-electron/shared/agentTypes";
import { browserBadge, resetBrowserOpen, takeBrowserOpen } from "../src/browser/browserAutoOpen";
import { railCounts } from "../src/agents/railCounts";
import { bulkSummary, filterRows, EMPTY_FILTER, manageRows, manageStateOf, sortRows, visibleSelection } from "../src/agents/manageLogic";

let dataListeners: ((id: string, data: string) => void)[] = [];
let agentSend: ReturnType<typeof vi.fn>;
beforeEach(() => {
  dataListeners = [];
  agentSend = vi.fn(async () => ({ ok: true }));
  resetBrowserOpen();
  (window as unknown as { api: unknown }).api = {
    agentSend,
    memoryRead: vi.fn(async () => ({ ok: true, content: "# Bellek\nabc" })),
    onTerminalData: (cb: (id: string, data: string) => void) => {
      dataListeners.push(cb);
      return () => {
        dataListeners = dataListeners.filter((x) => x !== cb);
      };
    }
  };
});
afterEach(cleanup);

const pane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "Geliştirici", roleKind: "preset" },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const ws = (id: string, panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id,
  name: `Ekip ${id}`,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "panes",
  ...over
});
const question = (over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId: "c1",
  question: "Hangi renk?",
  header: "",
  options: ["Kırmızı", "Mavi"],
  multiSelect: false,
  askedAt: 1,
  ...over
});

function harness(
  ui: ReactNode,
  workspaces: TerminalWorkspace[],
  statuses: Record<string, AgentStatus> = {},
  extra: { state?: Partial<TerminalState>; answerText?: AgentAnswerResult; events?: FlowEvent[] } = {}
) {
  const commands = {
    revealPane: vi.fn(),
    restartPane: vi.fn(),
    closePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    enablePaneMemory: vi.fn(),
    setWorkspaceView: vi.fn(),
    setWorkspaceBrowserUrl: vi.fn(),
    restore: vi.fn(),
    startFresh: vi.fn()
  } as unknown as TerminalCommands;
  const store = (): TerminalStoreValue => ({
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces, activeWorkspaceId: workspaces[0]?.id ?? null, ...extra.state },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet",
    setupRuns: {}
  });
  const answerText = vi.fn(async () => extra.answerText ?? ({ ok: true } as const));
  const record = vi.fn();
  const tree = (s: Record<string, AgentStatus>) => (
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store()}>
        <AgentStatusContext.Provider value={{ statuses: s, engines: [], now: 1_000_000, answer: vi.fn(), answerText } as AgentStatusValue}>
          <FlowContext.Provider value={{ ...EMPTY_FLOW, events: extra.events ?? [], record }}>{ui}</FlowContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const view = render(tree(statuses));
  return { commands, answerText, record, rerender: (s: Record<string, AgentStatus>) => view.rerender(tree(s)) };
}

const emit = (ptyId: string, data: string) => act(() => dataListeners.forEach((cb) => cb(ptyId, data)));

describe("otomatik tarayıcı — izleyici", () => {
  it("terminalde yerel adres: Tarayıcı'ya geçer, sayfa isteği bekler, Akış kartı; aynı adres ikinci kez açılmaz", () => {
    const h = harness(<LocalUrlWatcher enabled />, [ws("a", [pane("p1")])]);
    emit("t-p1", "  \x1b[32m➜\x1b[39m  Local:   \x1b[36mhttp://localhost:\x1b[1m5173\x1b[22m/\x1b[39m\r\n");
    expect(h.commands.setWorkspaceView).toHaveBeenCalledWith("a", "browser");
    expect(h.commands.setWorkspaceBrowserUrl).toHaveBeenCalledWith("a", "http://localhost:5173/");
    expect(takeBrowserOpen("a")).toEqual({ url: "http://localhost:5173/", auto: true });
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "browser", workspaceId: "a", paneId: "p1", detail: "http://localhost:5173/" }));
    emit("t-p1", "yine http://localhost:5173/\n");
    expect(h.record).toHaveBeenCalledTimes(1);
    expect(browserBadge("a")).toBe(0);
  });

  it("terminalde uzak adres ve kabuk bölmesi yok sayılır", () => {
    const shell = pane("s1", { kind: "cmd", agent: undefined });
    const h = harness(<LocalUrlWatcher enabled />, [ws("a", [pane("p1"), shell])]);
    emit("t-p1", "bkz https://example.com/docs\n");
    emit("t-s1", "http://localhost:3000\n");
    expect(h.record).not.toHaveBeenCalled();
    expect(h.commands.setWorkspaceView).not.toHaveBeenCalled();
  });

  it("kullanıcı yazıyorsa görünüm değişmez: rozet + kart", () => {
    const h = harness(
      <>
        <input aria-label="baska" />
        <LocalUrlWatcher enabled />
      </>,
      [ws("a", [pane("p1")])]
    );
    const input = screen.getByLabelText("baska");
    input.focus();
    fireEvent.keyDown(input, { key: "x" });
    emit("t-p1", "Server: http://127.0.0.1:8080/app\n");
    expect(h.commands.setWorkspaceView).not.toHaveBeenCalled();
    expect(browserBadge("a")).toBe(1);
    expect(railCounts({ asking: 0, browser: browserBadge("a") }).browser).toBe(1);
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "browser" }));
  });

  it("ekip seçili değilse görünüm değişmez", () => {
    const h = harness(<LocalUrlWatcher enabled />, [ws("a", []), ws("b", [pane("p1")])]);
    emit("t-p1", "http://localhost:3000\n");
    expect(h.commands.setWorkspaceView).not.toHaveBeenCalled();
    expect(browserBadge("b")).toBe(1);
  });

  it("ayar kapalıysa açılmaz; yalnız düğmeli kart", () => {
    const h = harness(<LocalUrlWatcher enabled={false} />, [ws("a", [pane("p1")])]);
    emit("t-p1", "http://localhost:3000\n");
    expect(h.commands.setWorkspaceView).not.toHaveBeenCalled();
    expect(takeBrowserOpen("a")).toBeNull();
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "link", detail: "http://localhost:3000/" }));
  });

  it("kesin cevap: ilk görüş taban; sonra yerel açılır, uzak yalnız kart", () => {
    const idle = (reply: string): AgentStatus => ({ state: "idle", source: "exact", lastActivity: 1, reply });
    const h = harness(<LocalUrlWatcher enabled />, [ws("a", [pane("p1")])], { p1: idle("eski http://localhost:1111") });
    expect(h.record).not.toHaveBeenCalled();
    h.rerender({ p1: idle("Hazır: http://localhost:3000 ve belge https://example.com/x?token=abc") });
    expect(h.commands.setWorkspaceView).toHaveBeenCalledWith("a", "browser");
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "browser", detail: "http://localhost:3000/" }));
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "link", detail: "https://example.com/x" }));
  });
});

describe("Akış kartı — Tarayıcıda aç", () => {
  it("adres kartındaki düğme Tarayıcı'ya geçirir ve adresi açar", () => {
    const events: FlowEvent[] = [{ id: 1, at: 1, workspaceId: "a", kind: "link", paneId: "p1", name: "Ajan p1", detail: "https://example.com/x" }];
    const h = harness(<FlowSidebar />, [ws("a", [pane("p1")])], {}, { events });
    expect(screen.getByText("Adres: https://example.com/x")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tarayıcıda aç" }));
    expect(h.commands.setWorkspaceView).toHaveBeenCalledWith("a", "browser");
    expect(takeBrowserOpen("a")).toEqual({ url: "https://example.com/x", auto: false });
  });
});

describe("serbest cevap — soru kartı", () => {
  const asking: AgentStatus = { state: "asking", source: "exact", lastActivity: 1, question: question() };

  it("seçeneklerin altında kutu; tek satıra indirilip gönderilir, sonra kilitlenir", async () => {
    const h = harness(<FlowSidebar />, [ws("a", [pane("p1")])], { p1: asking });
    const card = screen.getByText("Hangi renk?").closest("li")!;
    const input = within(card).getByLabelText("Kendi cevabını yaz");
    fireEvent.change(input, { target: { value: "  Yeşil   zeytin " } });
    await act(async () => {
      fireEvent.click(within(card).getByRole("button", { name: "Gönder" }));
    });
    expect(h.answerText).toHaveBeenCalledWith("p1", "c1", "Yeşil zeytin");
    expect(within(card).getByText("Cevabın gönderildi.")).toBeTruthy();
    expect(within(card).queryByLabelText("Kendi cevabını yaz")).toBeNull();
  });

  it("boş metinle Gönder kapalı; ret sebebi gösterilir ve kutu yeniden kullanılabilir", async () => {
    harness(<FlowSidebar />, [ws("a", [pane("p1")])], { p1: asking }, { answerText: { ok: false, reason: "typing" } });
    const card = screen.getByText("Hangi renk?").closest("li")!;
    const send = within(card).getByRole("button", { name: "Gönder" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(within(card).getByLabelText("Kendi cevabını yaz"), { target: { value: "x" } });
    await act(async () => {
      fireEvent.click(send);
    });
    expect(within(card).getByRole("alert").textContent).toContain("terminalde dokunuldu");
    expect((within(card).getByLabelText("Kendi cevabını yaz") as HTMLInputElement).disabled).toBe(false);
  });

  it("ölçülmemiş motorda kutu yok", () => {
    harness(<FlowSidebar />, [ws("a", [pane("p1", { agent: { engine: "claude", role: "", roleKind: "custom" } })])], { p1: asking });
    expect(screen.queryByLabelText("Kendi cevabını yaz")).toBeNull();
  });
});

describe("ajan yönetimi — mantık", () => {
  const workspaces = [
    ws("a", [pane("p1"), pane("p2", { agent: { engine: "claude", role: "Test", roleKind: "preset" }, run: { state: "exited", ptyId: "t-p2", code: 0 } })]),
    ws("b", [pane("p3", { title: "İrem", agent: { engine: "axet-code", role: "Lider", roleKind: "preset", spawnedBy: "p1" } as TerminalPane["agent"] }), pane("s", { kind: "cmd", agent: undefined })])
  ];
  const statuses: Record<string, AgentStatus> = { p1: { state: "running", source: "exact", lastActivity: 5 }, p3: { state: "asking", source: "exact", lastActivity: 9, question: question() } };
  const name = (r: { title: string; engine: string }) => r.title || r.engine;

  it("tüm ekiplerin ajanları; kabuk yok; durum sınıfı ve lider açımı", () => {
    const rows = manageRows(workspaces, statuses, () => 42);
    expect(rows.map((r) => r.paneId)).toEqual(["p1", "p2", "p3"]);
    expect(rows.map((r) => r.state)).toEqual(["running", "stopped", "asking"]);
    expect(rows[2]).toMatchObject({ team: "Ekip b", spawnedBy: "p1", openedAt: 42 });
    expect(manageStateOf(pane("x", { run: { state: "failed", message: "x" } }), undefined)).toBe("error");
  });

  it("süzgeç: ekip, durum, motor, arama (Türkçe harf duyarsız)", () => {
    const rows = manageRows(workspaces, statuses);
    expect(filterRows(rows, { ...EMPTY_FILTER, team: "b" }, name).map((r) => r.paneId)).toEqual(["p3"]);
    expect(filterRows(rows, { ...EMPTY_FILTER, state: "stopped" }, name).map((r) => r.paneId)).toEqual(["p2"]);
    expect(filterRows(rows, { ...EMPTY_FILTER, engine: "claude" }, name).map((r) => r.paneId)).toEqual(["p2"]);
    expect(filterRows(rows, { ...EMPTY_FILTER, query: "irem lider" }, name).map((r) => r.paneId)).toEqual(["p3"]);
    expect(filterRows(rows, { ...EMPTY_FILTER, query: "IREM" }, name).map((r) => r.paneId)).toEqual(["p3"]);
  });

  it("sıralama: soru önce; toplu özet ve görünür seçim", () => {
    const rows = manageRows(workspaces, statuses);
    expect(sortRows(rows, name).map((r) => r.paneId)).toEqual(["p3", "p1", "p2"]);
    expect(bulkSummary(rows, ["p1", "p2", "p3"])).toEqual({ count: 3, busy: 2, teams: 2 });
    expect(visibleSelection(new Set(["p1", "p3"]), rows.filter((r) => r.workspaceId === "a"))).toEqual(["p1"]);
  });
});

describe("ajan yönetimi — ekran", () => {
  const workspaces = () => [ws("a", [pane("p1"), pane("p2")]), ws("b", [pane("p3", { title: "Deniz" })])];
  const statuses: Record<string, AgentStatus> = { p1: { state: "running", source: "exact", lastActivity: 999_000 } };

  it("tüm ekipler tek tabloda; süzgeç ekibe indirir", () => {
    harness(<ManageView />, workspaces(), statuses);
    expect(document.querySelectorAll("[data-manage-row]")).toHaveLength(3);
    fireEvent.change(screen.getByRole("combobox", { name: "Ekip" }), { target: { value: "b" } });
    expect(document.querySelectorAll("[data-manage-row]")).toHaveLength(1);
    expect(screen.getByText("Deniz")).toBeTruthy();
  });

  it("toplu kapat onaylı: onaydan önce hiçbir şey kapanmaz, sonra seçilenler", () => {
    const h = harness(<ManageView />, workspaces(), statuses);
    fireEvent.click(screen.getByLabelText("Ajan p1 seç"));
    fireEvent.click(screen.getByLabelText("Deniz seç"));
    const bar = screen.getByRole("toolbar", { name: "Toplu işlem" });
    expect(within(bar).getByText("2 ajan seçili")).toBeTruthy();
    fireEvent.click(within(bar).getByRole("button", { name: "Kapat" }));
    expect(h.commands.closePane).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("2 ajan (2 ekipten) kapatılacak");
    expect(dialog.textContent).toContain("1 ajan şu an çalışıyor");
    fireEvent.click(within(dialog).getByRole("button", { name: "Evet, kapat" }));
    expect(h.commands.closePane).toHaveBeenCalledWith("p1");
    expect(h.commands.closePane).toHaveBeenCalledWith("p3");
    expect(h.commands.closePane).toHaveBeenCalledTimes(2);
  });

  it("toplu yeniden başlat ve vazgeç", () => {
    const h = harness(<ManageView />, workspaces(), statuses);
    fireEvent.click(screen.getByLabelText("Görünen tüm ajanları seç"));
    fireEvent.click(within(screen.getByRole("toolbar")).getByRole("button", { name: "Yeniden başlat" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "İptal" }));
    expect(h.commands.restartPane).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("toolbar")).getByRole("button", { name: "Yeniden başlat" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Evet, yeniden başlat" }));
    expect(h.commands.restartPane).toHaveBeenCalledTimes(3);
  });

  it("satır eylemleri: terminalde göster, yeniden adlandır, renk, mesaj", async () => {
    const h = harness(<ManageView />, workspaces(), statuses);
    const row = document.querySelector('[data-manage-row="p3"]') as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Terminalde göster" }));
    expect(h.commands.revealPane).toHaveBeenCalledWith("p3");
    fireEvent.click(within(row).getByRole("button", { name: "Yeniden adlandır" }));
    const rename = screen.getByRole("textbox", { name: "Yeniden adlandır" });
    fireEvent.change(rename, { target: { value: "Deniz 2" } });
    fireEvent.submit(rename.closest("form")!);
    expect(h.commands.renamePane).toHaveBeenCalledWith("p3", "Deniz 2");
    fireEvent.change(within(row).getByRole("combobox", { name: "Deniz rengi" }), { target: { value: "blue" } });
    expect(h.commands.setPaneColor).toHaveBeenCalledWith("p3", "blue");
    fireEvent.click(within(row).getByRole("button", { name: "Mesaj gönder" }));
    const msg = screen.getByRole("textbox", { name: "Deniz ajanına mesaj" });
    fireEvent.change(msg, { target: { value: "  Rapor \t ne durumda? " } });
    await act(async () => {
      fireEvent.submit(msg.closest("form")!);
    });
    expect(agentSend).toHaveBeenCalledWith("b", "p3", "Rapor ne durumda?");
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ kind: "message", paneId: "p3", detail: "Rapor ne durumda?" }));
  });

  it("tek ajanı kapatmak da onaylı", () => {
    const h = harness(<ManageView />, workspaces(), statuses);
    const row = document.querySelector('[data-manage-row="p2"]') as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Kapat" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Ajan p2 kapatılacak");
    expect(h.commands.closePane).not.toHaveBeenCalled();
  });
});
