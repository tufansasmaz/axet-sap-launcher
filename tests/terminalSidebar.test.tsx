// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalSidebar from "../src/components/TerminalSidebar";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext } from "../src/agents/agentStatusContext";
import { LEGACY_AXET_AGENT, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { ActiveSapContext } from "../app-electron/shared/types";

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
    setPaneFontSize: vi.fn()
  };
}

let pick: ReturnType<typeof vi.fn>;
beforeEach(() => {
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
});

function renderSidebar(
  workspaces: TerminalWorkspace[],
  over: Partial<TerminalState> = {},
  extra: { statuses?: Record<string, AgentStatus>; activeSap?: ActiveSapContext | null } = {}
) {
  const commands = commandsMock();
  const state: TerminalState = {
    ...initialTerminalState,
    phase: "ready",
    visible: true,
    workspaces,
    activeWorkspaceId: workspaces[0]?.id ?? null,
    ...over
  };
  const value: TerminalStoreValue = { state, commands, defaultKind: "cmd", defaultCwd: "C:\\a", agentCwd: "C:\\axet" };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={value}>
        <AgentStatusContext.Provider value={{ statuses: extra.statuses ?? {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) }}>
          <TerminalSidebar activeSap={extra.activeSap ?? null} />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

const running: PaneRun = { state: "running", ptyId: "t1" };

function row(name: string): HTMLElement {
  return screen.getByText(name).closest("[role=button]") as HTMLElement;
}

describe("TerminalSidebar", () => {
  it("alanları ajan sayısıyla listeliyor, seçiliyi işaretliyor", () => {
    renderSidebar([agentWs("a", "API", 2), ws("b", "UI")], { activeWorkspaceId: "b" });
    expect(screen.getByText("Çalışma alanları")).toBeTruthy();
    expect(row("UI").getAttribute("aria-current")).toBe("true");
    expect(row("API").getAttribute("aria-current")).toBeNull();
    expect(row("API").textContent).toContain("2");
  });

  it("tıklama ve Enter alanı seçiyor", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI")]);
    fireEvent.click(row("UI"));
    fireEvent.keyDown(row("API"), { key: "Enter" });
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(1, "b");
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(2, "a");
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

  it("+ yeni alan açıyor; 6 alanda kapalı ve nedenini söylüyor", () => {
    const c = renderSidebar([ws("a", "A")]);
    fireEvent.click(screen.getByTitle("Yeni çalışma alanı"));
    expect(c.addWorkspace).toHaveBeenCalledTimes(1);
    cleanup();
    renderSidebar(["1", "2", "3", "4", "5", "6"].map((n) => ws(n, `W${n}`)));
    const plus = screen.getByTitle("En fazla 6 çalışma alanı") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("geri yükleme şeridi açıkken + kapalı", () => {
    renderSidebar([], { phase: "restorePrompt" });
    const plus = screen.getByTitle("Yeni çalışma alanı") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("çift tıklayıp yeniden adlandırma: Enter kaydediyor, boşlukları kırpıyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.doubleClick(row("API"));
    const input = screen.getByLabelText("Çalışma alanı adı") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Backend  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(c.renameWorkspace).toHaveBeenCalledWith("a", "Backend");
    expect(screen.queryByLabelText("Çalışma alanı adı")).toBeNull();
  });

  it("boş ad ve Escape hiçbir şey göndermiyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.keyDown(row("API"), { key: "F2" });
    const input = screen.getByLabelText("Çalışma alanı adı");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.doubleClick(row("API"));
    fireEvent.change(screen.getByLabelText("Çalışma alanı adı"), { target: { value: "Yeni" } });
    fireEvent.keyDown(screen.getByLabelText("Çalışma alanı adı"), { key: "Escape" });
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
    expect(screen.getByLabelText("Çalışma alanı adı")).toBeTruthy();
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
});
