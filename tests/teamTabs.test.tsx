// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TeamTabs from "../src/agents/TeamTabs";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext } from "../src/agents/agentStatusContext";
import { LEGACY_AXET_AGENT, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { ActiveSapContext } from "../app-electron/shared/types";
import { BoardContext } from "../src/board/boardContext";
import type { Board } from "../app-electron/shared/boardTypes";

afterEach(cleanup);

function ws(id: string, name: string, runs: PaneRun[] = [], extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    id,
    name,
    panes: runs.map((run, i) => ({ id: `${id}-p${i}`, kind: "cmd" as const, cwd: "C:\\a", run })),
    focusedPaneId: null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    ...extra
  };
}

function agentWs(id: string, name: string, count: number, extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    ...ws(id, name),
    panes: Array.from({ length: count }, (_, i) => ({
      id: `${id}-a${i}`,
      kind: "agent" as const,
      agent: LEGACY_AXET_AGENT,
      cwd: "C:\\a",
      run: { state: "running", ptyId: `${id}-t${i}` } as PaneRun
    })),
    ...extra
  };
}

const SAP: ActiveSapContext = {
  uuid: "u1",
  systemId: "D01",
  systemName: "Geliştirme",
  customerPath: [],
  host: null,
  client: "100",
  username: "u",
  tier: null,
  projectDir: "C:\\proj\\D01",
  connectedAt: "",
  verified: true
};

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
    revealPane: vi.fn(),
    setWorkspaceRoot: vi.fn(),
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
    setWorkspaceVerify: vi.fn(),
    setWorkspaceView: vi.fn(),
    setWorkspaceBrowserUrl: vi.fn(),
    enablePaneMemory: vi.fn()
  };
}

let pick: ReturnType<typeof vi.fn>;
beforeEach(() => {
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
});

let lastRender: { rerender: (workspaces: TerminalWorkspace[], over?: Partial<TerminalState>) => void; onSelected: ReturnType<typeof vi.fn> } | null = null;

function renderSidebar(
  workspaces: TerminalWorkspace[],
  over: Partial<TerminalState> = {},
  extra: { statuses?: Record<string, AgentStatus>; activeSap?: ActiveSapContext | null; boards?: Record<string, Board> } = {}
) {
  const commands = commandsMock();
  const onSelected = vi.fn();
  const ui = (list: TerminalWorkspace[], o: Partial<TerminalState>) => {
    const state: TerminalState = {
      ...initialTerminalState,
      phase: "ready",
      visible: true,
      workspaces: list,
      activeWorkspaceId: list[0]?.id ?? null,
      ...o
    };
    const value: TerminalStoreValue = { state, commands, defaultKind: "cmd", defaultCwd: "C:\\a", agentCwd: "C:\\axet" };
    return (
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={value}>
          <AgentStatusContext.Provider value={{ statuses: extra.statuses ?? {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) }}>
            <BoardContext.Provider value={{ boards: extra.boards ?? {}, command: vi.fn(async () => ({ ok: true as const })) }}>
              <TeamTabs activeSap={extra.activeSap ?? null} onSelected={onSelected} />
            </BoardContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(ui(workspaces, over));
  lastRender = { rerender: (list, o = {}) => r.rerender(ui(list, o)), onSelected };
  return commands;
}

const running: PaneRun = { state: "running", ptyId: "t1" };

function row(name: string): HTMLElement {
  return screen.getByText(name).closest("[role=tab]") as HTMLElement;
}

// Ekip sekmeleri (spec 2026-10-18 ajanlar-yeniden §2): eski kenar çubuğu alan
// listesinin (TerminalSidebar) yerini aldı; menü, adlandırma ve rozetler aynı.
describe("TeamTabs", () => {
  it("alanları ajan sayısıyla listeliyor, seçiliyi işaretliyor", () => {
    renderSidebar([agentWs("a", "API", 2), ws("b", "UI")], { activeWorkspaceId: "b" });
    expect(screen.getByRole("tablist", { name: "Ekipler" })).toBeTruthy();
    expect(row("UI").getAttribute("aria-selected")).toBe("true");
    expect(row("API").getAttribute("aria-selected")).toBe("false");
    expect(row("API").textContent).toContain("2");
  });

  it("tıklama ve Enter alanı seçiyor ve ekibi gösteriyor", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI")]);
    fireEvent.click(row("UI"));
    fireEvent.keyDown(row("API"), { key: "Enter" });
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(1, "b");
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(2, "a");
    expect(lastRender!.onSelected).toHaveBeenCalledTimes(2);
  });

  it("ok tuşları komşu ekibi seçiyor; yalnız seçili sekme Tab sırasında", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI"), ws("c", "DB")]);
    expect(row("API").tabIndex).toBe(0);
    expect(row("UI").tabIndex).toBe(-1);
    fireEvent.keyDown(row("API"), { key: "ArrowRight" });
    fireEvent.keyDown(row("API"), { key: "ArrowLeft" });
    fireEvent.keyDown(row("API"), { key: "End" });
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(1, "b");
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(2, "c");
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(3, "c");
  });

  it("seçili ekibin … düğmesi menüyü açıyor", () => {
    renderSidebar([ws("a", "API"), ws("b", "UI")]);
    fireEvent.click(screen.getByRole("button", { name: "API menüsü" }));
    expect(screen.getByRole("menuitem", { name: "Yeniden adlandır" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "UI menüsü" })).toBeNull();
  });

  it("hata noktası okunmamış noktasından önce geliyor", () => {
    renderSidebar([
      ws("a", "API", [], { error: true, unread: true }),
      ws("b", "UI", [], { unread: true }),
      ws("c", "DB")
    ]);
    expect(row("API").querySelector("[data-dot]")?.getAttribute("data-dot")).toBe("error");
    expect(row("UI").querySelector("[data-dot]")?.getAttribute("data-dot")).toBe("unread");
    expect(row("DB").querySelector("[data-dot]")).toBeNull();
  });

  it("+ Ekip penceresi: Boş ekip yeni alan açıyor; 6 alanda kapalı ve nedenini söylüyor", () => {
    const c = renderSidebar([ws("a", "A")]);
    fireEvent.click(screen.getByRole("button", { name: "Ekip" }));
    expect(screen.getByRole("dialog", { name: "Yeni ekip" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Boş ekip/ }));
    expect(c.addWorkspace).toHaveBeenCalledTimes(1);
    expect(c.addAgent).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    renderSidebar(["1", "2", "3", "4", "5", "6"].map((n) => ws(n, `W${n}`)));
    const plus = screen.getByTitle("En fazla 6 ekip") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("şablon: yeni alan açılınca ajanları mevcut addAgent ile o alana ekliyor (ad, rol, varsayılan klasör)", () => {
    const c = renderSidebar([ws("a", "A")]);
    fireEvent.click(screen.getByRole("button", { name: "Ekip" }));
    fireEvent.click(screen.getByRole("button", { name: /SAP geliştirme/ }));
    expect(c.addWorkspace).toHaveBeenCalledTimes(1);
    expect(c.addAgent).not.toHaveBeenCalled();
    // İndirgeyici yeni alanı açıp seçti: ajanlar ancak şimdi, yeni alana.
    lastRender!.rerender([ws("a", "A"), ws("n", "Alan 2")], { activeWorkspaceId: "n" });
    expect(c.addAgent).toHaveBeenCalledTimes(3);
    expect(vi.mocked(c.addAgent).mock.calls.map(([input]) => [input.name, input.spec.engine, input.spec.role, input.cwd])).toEqual([
      ["Lider", "axet-code", "Lider", "C:\\axet"],
      ["Geliştirici", "axet-code", "Geliştirici", "C:\\axet"],
      ["Test", "axet-code", "Test", "C:\\axet"]
    ]);
    lastRender!.rerender([ws("a", "A"), ws("n", "Alan 2")], { activeWorkspaceId: "a" });
    expect(c.addAgent).toHaveBeenCalledTimes(3);
  });

  it("geri yükleme şeridi açıkken + Ekip kapalı", () => {
    renderSidebar([], { phase: "restorePrompt" });
    const plus = screen.getByRole("button", { name: "Ekip" }) as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("çift tıklayıp yeniden adlandırma: Enter kaydediyor, boşlukları kırpıyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.doubleClick(row("API"));
    const input = screen.getByLabelText("Ekip adı") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Backend  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(c.renameWorkspace).toHaveBeenCalledWith("a", "Backend");
    expect(screen.queryByLabelText("Ekip adı")).toBeNull();
  });

  it("boş ad ve Escape hiçbir şey göndermiyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.keyDown(row("API"), { key: "F2" });
    const input = screen.getByLabelText("Ekip adı");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.doubleClick(row("API"));
    fireEvent.change(screen.getByLabelText("Ekip adı"), { target: { value: "Yeni" } });
    fireEvent.keyDown(screen.getByLabelText("Ekip adı"), { key: "Escape" });
    expect(c.renameWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText("API")).toBeTruthy();
  });

  it("sağ tık menüsü: Yeniden adlandır girişi açıyor, Escape menüyü kapatıyor", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Yeniden adlandır" }));
    expect(screen.getByLabelText("Ekip adı")).toBeTruthy();
  });

  it("menü pencerenin dışına taşmıyor", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: window.innerWidth - 2, clientY: window.innerHeight - 2 });
    const menu = screen.getByRole("menu");
    expect(parseFloat(menu.style.left)).toBeLessThan(window.innerWidth - 100);
    expect(parseFloat(menu.style.top)).toBeLessThan(window.innerHeight - 40);
  });

  it("canlı süreç yoksa Kapat doğrudan kapatıyor", () => {
    const c = renderSidebar([ws("a", "API", [{ state: "exited", ptyId: "t1", code: 0 }]), ws("b", "UI")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).toHaveBeenCalledWith("a");
  });

  it("canlı süreç varsa Kapat önce soruyor, sayıyı söylüyor", () => {
    const c = renderSidebar([ws("a", "API", [running, { state: "starting", token: 1 }, { state: "queued" }])]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText("Bu alandaki 2 terminal kapanacak.")).toBeTruthy();
    // Pencerenin çarpısı da "Kapat" diye okunuyor; onay düğmesinin metni ayrı.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Alanı kapat" }));
    });
    expect(c.closeWorkspace).toHaveBeenCalledWith("a");
  });

  it("kabuk bölmeleri ajan sayılmıyor; soru bekleyen ajan rozeti", () => {
    const asking: AgentStatus = {
      state: "asking",
      source: "exact",
      lastActivity: 1,
      question: { callId: "c", question: "?", header: "", options: ["A", "B"], multiSelect: false, askedAt: 1 }
    };
    renderSidebar([agentWs("a", "API", 2), ws("b", "UI", [running, running, running])], {}, { statuses: { "a-a1": asking } });
    expect(row("UI").textContent).not.toContain("3");
    const badge = row("API").querySelector("[data-asking]") as HTMLElement;
    expect(badge.textContent).toBe("1");
    expect(badge.getAttribute("title")).toBe("1 soru bekliyor");
    expect(badge.getAttribute("aria-label")).toBe("1 soru bekliyor");
    expect(row("UI").querySelector("[data-asking]")).toBeNull();
  });

  it("ajan sayısı span'ı aria-label taşıyor", () => {
    renderSidebar([agentWs("a", "API", 3)]);
    const countSpan = row("API").querySelector("[title='3 ajan']") as HTMLElement;
    expect(countSpan).toBeTruthy();
    expect(countSpan.getAttribute("aria-label")).toBe("3 ajan");
  });

  it("menü: Kök klasör seçilen klasörü kök yapıyor (SAP bağı düşüyor)", async () => {
    const c = renderSidebar([ws("a", "API", [], { sap: { uuid: "u1", label: "D01" }, root: "C:\\proj\\D01" })]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    pick.mockResolvedValueOnce("C:\\kok");
    fireEvent.click(screen.getByRole("menuitem", { name: "Kök klasör…" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(c.setWorkspaceRoot).toHaveBeenCalledWith("a", "C:\\kok", null);
  });

  it("menü: aktif SAP sistemi varken kökü proje klasörü yapıyor; bağlıysa kaldırma seçeneği", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI", [], { sap: { uuid: "u1", label: "D01" }, root: "C:\\proj\\D01" })], {}, { activeSap: SAP });
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kökü D01 proje klasörü yap" }));
    expect(c.setWorkspaceRoot).toHaveBeenCalledWith("a", "C:\\proj\\D01", { uuid: "u1", label: "D01" });
    fireEvent.contextMenu(row("UI"), { clientX: 10, clientY: 10 });
    expect(screen.queryByRole("menuitem", { name: "Kökü D01 proje klasörü yap" })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "SAP bağını kaldır" }));
    expect(c.setWorkspaceRoot).toHaveBeenLastCalledWith("b", "C:\\proj\\D01", null);
  });

  it("aktif SAP yokken SAP menü maddesi yok", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    expect(screen.queryByRole("menuitem", { name: /proje klasörü yap/ })).toBeNull();
  });

  it("panoda başarısız alt görev varsa alan satırında tehlike rozeti", () => {
    const board: Board = {
      workspaceId: "a",
      tasks: [
        {
          id: "t",
          title: "T",
          goal: "",
          state: "stuck",
          createdAt: 1,
          approvedAt: 2,
          subtasks: [
            { id: "s1", title: "A", prompt: "p", roleHint: "", dependsOn: [], state: "failed", paneId: null, attempts: 1 },
            { id: "s2", title: "B", prompt: "p", roleHint: "", dependsOn: [], state: "failed", paneId: null, attempts: 1 }
          ]
        }
      ]
    };
    renderSidebar([ws("a", "API"), ws("b", "UI")], {}, { boards: { a: board } });
    const badge = row("API").querySelector("[data-failed]") as HTMLElement;
    expect(badge.textContent).toBe("2");
    expect(badge.getAttribute("aria-label")).toBe("2 alt görev başarısız");
    expect(row("UI").querySelector("[data-failed]")).toBeNull();
  });

  it("kapatma: süreç yok ama panoda görev varsa onay soruluyor ve görevlerin silineceği yazıyor", () => {
    const board: Board = { workspaceId: "a", tasks: [{ id: "t", title: "T", goal: "", state: "draft", createdAt: 1, subtasks: [] }] };
    const c = renderSidebar([ws("a", "API"), ws("b", "UI")], {}, { boards: { a: board } });
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").textContent).toContain("Bu alanın panosundaki 1 görev de silinir.");
    expect(screen.getByRole("dialog").textContent).not.toContain("terminal kapanacak");
  });

  it("pano yuklenmemis alan (board undefined, view:board) kapatılırken onay sorulur", () => {
    const c = renderSidebar([ws("a", "API", [], { view: "board" }), ws("b", "UI")], {}, { boards: {} });
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("menü: Doğrulama komutları… penceresi satırları alana kaydediyor; 5'i aşınca kaydetmiyor", () => {
    const c = renderSidebar([ws("a", "API", [], { verify: ["npm test"] })]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Doğrulama komutları…" }));
    const box = screen.getByRole("textbox", { name: "Komutlar (satır başına bir)" }) as HTMLTextAreaElement;
    expect(box.value).toBe("npm test");
    fireEvent.change(box, { target: { value: "1\n2\n3\n4\n5\n6" } });
    expect(screen.getByRole("alert").textContent).toBe("En fazla 5 komut.");
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(box, { target: { value: "  npm run lint \n\nnpm test" } });
    const save = screen.getByRole("button", { name: "Kaydet" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(c.setWorkspaceVerify).toHaveBeenCalledTimes(1);
    expect(c.setWorkspaceVerify).toHaveBeenCalledWith("a", ["npm run lint", "npm test"]);
  });
});
