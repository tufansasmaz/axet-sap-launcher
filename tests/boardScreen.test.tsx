// @vitest-environment jsdom
// Pano ekranı: Bölmeler | Pano geçişi, sütunlar, seçim, yeni görev, uyarı,
// aria-live (spec 2026-10-18 gorev-panosu §8).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentsScreen from "../src/agents/AgentsScreen";
import FlowSidebar from "../src/agents/FlowSidebar";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Subtask } from "../app-electron/shared/boardTypes";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId }: { sessionId: string }) => <div data-testid={`xterm-${sessionId}`} />
}));

let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = { pickFolder: vi.fn(), axetAgents: vi.fn(async () => []) };
});
afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
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

const agentPane = (id: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`
});
const workspace = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1")],
  focusedPaneId: "p1",
  maximizedPaneId: null,
  unread: false,
  error: false,
  ...over
});
const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: id,
  prompt: `İstem ${id}`,
  roleHint: "",
  dependsOn: [],
  state: "ready",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (id: string, subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id,
  title: id,
  goal: "Hedef",
  state: "running",
  createdAt: 1,
  approvedAt: 2,
  subtasks,
  ...over
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function setup(ws: TerminalWorkspace, board?: Board, language: "tr" | "en" = "tr", flow = false) {
  const commands = commandsMock();
  const command = vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true, taskId: "yeni" }));
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: ws.id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a",
    setupRuns: {}
  };
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) };
  const ui = (b?: Board) => {
    const boards: BoardContextValue = { boards: b ? { [ws.id]: b } : {}, command };
    return (
      <LanguageProvider language={language}>
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <BoardContext.Provider value={boards}>
              {flow ? <FlowSidebar /> : <AgentsScreen chatActive={false} onShowAgents={vi.fn()} chat={null} />}
            </BoardContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(ui(board));
  return { commands, command, rerender: (b?: Board) => r.rerender(ui(b)) };
}

const col = (name: string) => screen.getByRole("list", { name });

const mixed: Board = {
  workspaceId: "a",
  tasks: [
    task("t1", [sub("a1")], { approvedAt: undefined, state: "awaitingApproval", title: "Taslak görev", createdAt: 1 }),
    task(
      "t2",
      [
        sub("b1", { state: "ready", held: true, note: "agentClosed" }),
        sub("b2", { state: "running", paneId: "p1" }),
        sub("b3", { state: "failed", paneId: "p1" }),
        sub("b4", { state: "done" })
      ],
      { title: "Onaylı", createdAt: 2, state: "stuck" }
    )
  ]
};

describe("Terminal | Görevler", () => {
  it("geçiş: Görevler seçimi alana kaydediliyor (tablist dikey rayda)", () => {
    // Ajanlar-ux §4: tablist içerik alanının sol kenarındaki dikey rayda (AgentsScreen).
    const { commands } = setup(workspace({ view: "panes" }), undefined, "tr");
    const group = screen.getByRole("tablist", { name: "Görünüm" });
    expect(within(group).getByRole("tab", { name: "Terminal" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(group).getByRole("tab", { name: "Görevler" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "board");
    cleanup();
    setup(workspace({ view: "board" }), undefined, "tr");
    expect(screen.getByRole("tab", { name: "Görevler" }).getAttribute("aria-selected")).toBe("true");
  });

  it("pano görünümünde sütunlar var, bölmeler gizli ama takılı", () => {
    setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    for (const name of ["Taslak", "Sırada", "Çalışıyor", "Doğrulama", "Bitti"]) expect(col(name)).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect(cell).toBeTruthy();
    expect((cell.closest("[data-workspace]") as HTMLElement).className).toContain("hidden");
  });

  it("İngilizce: sekme ve sütun adları", () => {
    setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] }, "en");
    expect(screen.getByRole("tab", { name: "Tasks" })).toBeTruthy();
    cleanup();
    setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] }, "en");
    expect(col("Draft")).toBeTruthy();
    expect(col("Verification")).toBeTruthy();
  });
});

describe("sütunlar ve kartlar", () => {
  it("onaysız görev yalnız ana kartıyla Taslak'ta; onaylının alt görevleri durumlarına göre; tehlike etiketleri", () => {
    setup(workspace({ view: "board" }), mixed);
    expect(col("Taslak").querySelector('[data-task-card="t1"]')).toBeTruthy();
    expect(document.querySelector('[data-subtask-card="a1"]')).toBeNull();
    expect(col("Çalışıyor").querySelector('[data-task-card="t2"]')).toBeTruthy();
    expect(col("Sırada").querySelector('[data-subtask-card="b1"]')?.textContent).toContain("Beklemede");
    expect(col("Sırada").querySelector('[data-subtask-card="b1"]')?.textContent).toContain("Ajan kapandı");
    expect(col("Çalışıyor").querySelector('[data-subtask-card="b2"]')).toBeTruthy();
    expect(col("Doğrulama").querySelector('[data-subtask-card="b3"] [data-danger]')?.textContent).toBe("Başarısız");
    expect(col("Bitti").querySelector('[data-subtask-card="b4"]')).toBeTruthy();
    expect(document.querySelector('[data-task-card="t2"] [data-danger]')?.textContent).toBe("Takıldı");
    expect(document.querySelector('[data-task-card="t2"]')?.textContent).toContain("1/4");
  });

  it("seçim: tıklanan kart seçili; lime çerçeve yalnız seçili kartta", () => {
    setup(workspace({ view: "board" }), mixed);
    const card = document.querySelector('[data-subtask-card="b2"]') as HTMLElement;
    expect(card.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(card);
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(card.className).toContain("border-accent-500/60");
    expect((document.querySelector('[data-subtask-card="b1"]') as HTMLElement).className).not.toContain("accent");
  });

  it("aynı klasörde iki çalışan alt görev uyarı alıyor", () => {
    const ws = workspace({ view: "board", panes: [agentPane("p1"), agentPane("p2")] });
    setup(ws, { workspaceId: "a", tasks: [task("t", [sub("x", { state: "running", paneId: "p1" }), sub("y", { state: "asking", paneId: "p2" })])] });
    expect(document.querySelector('[data-subtask-card="x"]')?.textContent).toContain("Aynı klasörde paralel çalışıyor");
  });

  it("durum değişikliği tek satır aria-live", () => {
    const { rerender } = setup(workspace({ view: "board" }), mixed);
    const next: Board = { ...mixed, tasks: [mixed.tasks[0], { ...mixed.tasks[1], subtasks: mixed.tasks[1].subtasks.map((s) => (s.id === "b2" ? { ...s, state: "verifying" as const } : s)) }] };
    rerender(next);
    expect(document.querySelector("[aria-live=polite]")?.textContent).toBe("b2: Doğrulanıyor");
  });
});

describe("yeni görev ve uyarı", () => {
  it("+ Görev: başlık zorunlu; Oluştur tek komut (çift tıklama); başarıda pencere kapanıyor", async () => {
    const { command } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    fireEvent.click(screen.getByRole("button", { name: "Görev" }));
    const create = screen.getByRole("button", { name: "Oluştur" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık" }), { target: { value: " İade akışı " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Hedef" }), { target: { value: "Ödeme modülüne iade ekle" } });
    fireEvent.click(create);
    fireEvent.click(create);
    await flush();
    expect(command).toHaveBeenCalledTimes(1);
    expect(command).toHaveBeenCalledWith("a", { type: "createTask", title: "İade akışı", goal: "Ödeme modülüne iade ekle" });
    expect(screen.queryByRole("button", { name: "Oluştur" })).toBeNull();
  });

  it("görev sınırı: hata pencerede kalıyor", async () => {
    const { command } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    command.mockResolvedValueOnce({ ok: false, reason: "limit" });
    fireEvent.click(screen.getByRole("button", { name: "Görev" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık" }), { target: { value: "Fazla" } });
    fireEvent.click(screen.getByRole("button", { name: "Oluştur" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toBe("Görev sınırına ulaşıldı (50).");
  });

  it("kenara alınmış pano dosyası uyarısı; Kapat dismissWarning gönderiyor", () => {
    const { command } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [], recoveredFrom: "a.json.bozuk-5" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("a.json.bozuk-5");
    fireEvent.click(within(alert).getByRole("button", { name: "Kapat" }));
    expect(command).toHaveBeenCalledWith("a", { type: "dismissWarning" });
  });

  it("pano yokken (alan henüz kaydedilmedi) kullanıcıya mesaj gösteriliyor", () => {
    setup(workspace({ view: "board" })); // board sağlanmıyor → undefined
    expect(document.querySelector("[data-board-not-saved]")).toBeTruthy();
  });
});

describe("Akış — ajan satırı", () => {
  it("görevli ajanın satırında alt görev başlığı küçük satır; görevsiz ajanda yok", () => {
    const ws = workspace({ panes: [agentPane("p1"), agentPane("p2")] });
    setup(ws, { workspaceId: "a", tasks: [task("t", [sub("Tabloyu ekle", { state: "running", paneId: "p1" })])] }, "tr", true);
    expect(document.querySelector('[data-agent-row="p1"] [data-agent-task]')?.textContent).toBe("Tabloyu ekle");
    expect(document.querySelector('[data-agent-row="p2"] [data-agent-task]')).toBeNull();
  });
});

// Raporlar (spec 2026-10-18 ajanlar-yeniden §2b): Görevler sekmesinde biten,
// doğrulanan ve başarısız alt görevler; yeni veri yok, panodan.
describe("Raporlar", () => {
  it("biten/doğrulanan/başarısız alt görevler: başlık, ajan, sonuç, doğrulama özeti; tık ayrıntıyı açıyor", () => {
    const proofOk = { kind: "commands" as const, ok: true, at: 20, commands: [{ command: "npm test", exitCode: 0, durationMs: 1, tail: "" }] };
    const proofBad = { kind: "commands" as const, ok: false, at: 30, commands: [{ command: "npm test", exitCode: 1, durationMs: 1, tail: "" }] };
    setup(workspace({ view: "board" }), {
      workspaceId: "a",
      tasks: [
        task("t", [
          sub("Tabloyu ekle", { state: "done", paneId: "p1", proof: proofOk }),
          sub("Testi yaz", { state: "failed", paneId: "p1", proof: proofBad }),
          sub("Bekleyen", { state: "running", paneId: "p1" })
        ])
      ]
    });
    const reports = screen.getByRole("region", { name: "Raporlar" });
    const rows = Array.from(reports.querySelectorAll("[data-report]"));
    expect(rows.map((r) => r.getAttribute("data-report"))).toEqual(["failed", "verified"]);
    expect(rows[0].textContent).toContain("Testi yaz");
    expect(rows[0].textContent).toContain("Başarısız");
    expect(rows[0].textContent).toContain("0/1 komut geçti");
    expect(rows[1].textContent).toContain("Tabloyu ekle");
    expect(rows[1].textContent).toContain("Ajan p1");
    expect(rows[1].textContent).toContain("Doğrulandı");
    fireEvent.click(rows[1]);
    expect(screen.getByRole("complementary")).toBeTruthy();
  });

  it("biten alt görev yoksa boş metni", () => {
    setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    expect(within(screen.getByRole("region", { name: "Raporlar" })).getByText("Henüz biten alt görev yok")).toBeTruthy();
  });

  it("en çok 3 önizleme; bağlantı Raporlar ekranını açıyor", () => {
    const done = (title: string, at: number) => sub(title, { state: "done", paneId: "p1", proof: { kind: "manual" as const, ok: true, at, commands: [] } });
    const { commands } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [task("t", [done("A", 1), done("B", 2), done("C", 3), done("D", 4)])] });
    const reports = screen.getByRole("region", { name: "Raporlar" });
    expect(reports.querySelectorAll("[data-report]")).toHaveLength(3);
    fireEvent.click(within(reports).getByRole("button", { name: /Raporlar ekranında aç/ }));
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("a", "reports");
  });
});
