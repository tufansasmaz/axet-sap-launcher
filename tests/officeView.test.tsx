// @vitest-environment jsdom
// Ofis görünümü bileşeni (spec 2026-10-18 ofis-gorunumu §3–§7): ızgara,
// kabuk notu, koltuk düğmesi (klavye, aria-label), tahmini/kesin ayrımı,
// soru balonu, alt görev satırı, seçim, boş durum, tıklama, i18n.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import OfficeView from "../src/office/OfficeView";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import { AGENT_ENGINE_MISSING, type AgentQuestion, type AgentState, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Subtask } from "../app-electron/shared/boardTypes";

afterEach(() => {
  cleanup();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
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
    setPaneFontSize: vi.fn()
  };
}

const NOW = 10_000_000;
const agentPane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "coder", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const shellPane = (id: string): TerminalPane => ({ id, kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: `t-${id}` } });
const workspace = (panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes,
  focusedPaneId: panes[0]?.id ?? null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "office",
  ...over
});
const st = (state: AgentState, source: "exact" | "estimated" = "exact", over: Partial<AgentStatus> = {}): AgentStatus => ({
  state,
  source,
  lastActivity: null,
  ...over
});
const q = (question: string): AgentQuestion => ({ callId: "c1", question, header: "", options: ["Evet", "Hayır"], multiSelect: false, askedAt: 1 });
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
const task = (id: string, subtasks: Subtask[]): BoardTask => ({ id, title: id, goal: "Hedef", state: "running", createdAt: 1, approvedAt: 2, subtasks });
// LONG_QUESTION: 88 karakter; clipText(q, 60) konumunun 58'i (0-tabanlı) boşluk değil,
// böylece trimEnd sonrası tam 60 karakter döner (bkz. task-4-report.md §Endişeler).
const LONG_QUESTION = "Bu tabloya yeni bir alan eklensin mi, yoksa mevcut yapı mıdır korunsun, karar ver lütfen";

function setup(
  ws: TerminalWorkspace,
  { statuses = {}, board, language = "tr" }: { statuses?: Record<string, AgentStatus>; board?: Board; language?: "tr" | "en" } = {}
) {
  const commands = commandsMock();
  const onAddAgent = vi.fn();
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: ws.id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  const agents: AgentStatusValue = { statuses, engines: [], now: NOW, answer: vi.fn(async () => ({ ok: true as const })) };
  const boards: BoardContextValue = {
    boards: board ? { [ws.id]: board } : {},
    command: vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true }))
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <BoardContext.Provider value={boards}>
            <OfficeView workspace={ws} onAddAgent={onAddAgent} />
          </BoardContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, onAddAgent };
}

const seat = (id: string) => document.querySelector(`[data-office-seat="${id}"]`) as HTMLButtonElement;

describe("OfficeView — yerleşim", () => {
  it("5 ajan 3+2 satır; kabuk bölmesi koltuk değil, köşede '1 terminal'", () => {
    setup(workspace([...["p1", "p2", "p3", "p4", "p5"].map((id) => agentPane(id)), shellPane("s1")]));
    const rows = [...document.querySelectorAll("[data-office-row]")];
    expect(rows.map((r) => r.querySelectorAll("[data-office-seat]").length)).toEqual([3, 2]);
    expect(within(screen.getByRole("list", { name: "Masalar" })).getAllByRole("listitem")).toHaveLength(5);
    expect(seat("s1")).toBeNull();
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("1 terminal");
  });

  it("boş durum: 'Ofiste kimse yok' + Ajan düğmesi pencereyi istiyor; kabuk notu yine var", () => {
    const { onAddAgent } = setup(workspace([shellPane("s1"), shellPane("s2")]));
    const office = screen.getByRole("region", { name: "Ofis görünümü" });
    expect(within(office).getByText("Ofiste kimse yok")).toBeTruthy();
    fireEvent.click(within(office).getByRole("button", { name: "Ajan" }));
    expect(onAddAgent).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("2 terminal");
    expect(screen.queryByRole("list", { name: "Masalar" })).toBeNull();
  });

  it("kabuk yoksa terminal notu yok", () => {
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-shells]")).toBeNull();
  });
});

describe("OfficeView — etkileşim", () => {
  it("tiklama: revealPane cagriliyor; setWorkspaceView revealPane icerisinde (gerekceli guncelleme)", () => {
    // revealPane zaten setWorkspaceView'u cagiriyor (terminalStore:441);
    // OfficeView'daki fazladan cagri kaldirildi (gorev-5).
    const { commands } = setup(workspace([agentPane("p1"), agentPane("p2")]), { statuses: { p2: st("asking", "exact", { question: q("Devam edilsin mi?") }) } });
    fireEvent.click(seat("p1"));
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    expect(commands.setWorkspaceView).not.toHaveBeenCalled();
    fireEvent.click(seat("p2").querySelector("[data-balloon]") as HTMLElement);
    expect(commands.revealPane).toHaveBeenLastCalledWith("p2");
  });

  it("klavye: koltuklar ızgara sırasıyla doğal düğme (tab sırası); aria-label ad, rol, durum (tahmini)", () => {
    setup(workspace([agentPane("p1"), agentPane("p2", { agent: { engine: "claude", role: "", roleKind: "custom" } })]), {
      statuses: { p1: st("running"), p2: st("running", "estimated") }
    });
    const buttons = within(screen.getByRole("list", { name: "Masalar" })).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("data-office-seat"))).toEqual(["p1", "p2"]);
    expect(buttons.every((b) => b.tagName === "BUTTON" && b.getAttribute("tabindex") === null)).toBe(true);
    expect(buttons[0].getAttribute("aria-label")).toBe("Ajan p1, coder, Çalışıyor");
    expect(buttons[1].getAttribute("aria-label")).toBe("Ajan p2, Çalışıyor (tahmini)");
    buttons[1].focus();
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("aria-label: soru metni ve alt gorev basligini ekran okuyucuya ulastiriyor", () => {
    const title = "Siparis tablosuna alan ekle";
    setup(
      workspace([agentPane("p1"), agentPane("p2")]),
      {
        statuses: { p1: st("asking", "exact", { question: q("Devam edilsin mi?") }) },
        board: { workspaceId: "a", tasks: [task("t", [sub("x", { title, state: "running", paneId: "p2" })])] }
      }
    );
    const label1 = seat("p1").getAttribute("aria-label") ?? "";
    expect(label1).toContain("Devam edilsin mi?");
    const label2 = seat("p2").getAttribute("aria-label") ?? "";
    expect(label2).toContain(title);
  });

  it("seçim: odaktaki ajanın çerçevesi lime, ötekinde accent yok; kırpılan ad ve rolde title", () => {
    setup(workspace([agentPane("p1", { title: "Çok Uzun Bir Ajan Adı Burada" }), agentPane("p2")], { focusedPaneId: "p2" }));
    expect(seat("p2").getAttribute("aria-pressed")).toBe("true");
    expect(seat("p2").className).toContain("border-accent-500/60");
    expect(seat("p1").getAttribute("aria-pressed")).toBe("false");
    expect(seat("p1").className).not.toContain("accent");
    expect(seat("p1").querySelector('[title="Çok Uzun Bir Ajan Adı Burada"]')).toBeTruthy();
    expect(seat("p1").querySelector('[title="coder"]')).toBeTruthy();
  });
});

describe("OfficeView — durum", () => {
  it("tahmini çalışıyor: hareket sınıfı yok, ≈ var; kesin çalışıyor: eller yazıyor", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), { statuses: { p1: st("running"), p2: st("running", "estimated") } });
    expect(seat("p1").querySelectorAll(".office-typing")).toHaveLength(2);
    expect(seat("p1").querySelector("[data-estimated]")).toBeNull();
    expect(seat("p2").getAttribute("data-pose")).toBe("typing");
    expect(seat("p2").querySelector(".office-typing, .office-glow")).toBeNull();
    expect(seat("p2").querySelector("[data-estimated]")?.textContent).toBe("≈");
  });

  it("hareketi azalt: kesin çalışmada da hareket yok", () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn((media: string) => ({
      matches: true,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running") } });
    expect(seat("p1").querySelector(".office-typing, .office-glow")).toBeNull();
  });

  it("soru balonu: kesin asking'te ilk 60 karakter, uyarı tonunda; tahminide yalnız '?'", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      statuses: { p1: st("asking", "exact", { question: q(LONG_QUESTION) }), p2: st("asking", "estimated", { question: q(LONG_QUESTION) }) }
    });
    const balloon = seat("p1").querySelector("[data-balloon]") as HTMLElement;
    expect(balloon.className).toContain("--status-warning-");
    const text = seat("p1").querySelector("[data-balloon-text]")?.textContent ?? "";
    expect(Array.from(text)).toHaveLength(60);
    expect(text.endsWith("…")).toBe(true);
    expect(seat("p2").querySelector("[data-balloon]")?.textContent).toBe("?");
    expect(seat("p2").querySelector("[data-balloon-text]")).toBeNull();
  });

  it("bilinmiyor (≈ yok), boşta süresi, kurulu değil (boş masa), hata işareti", () => {
    setup(
      workspace([agentPane("p1"), agentPane("p2"), agentPane("p3", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), agentPane("p4")]),
      { statuses: { p2: st("idle", "exact", { lastActivity: NOW - 3 * 60_000 }), p4: st("error") } }
    );
    expect(seat("p1").getAttribute("data-pose")).toBe("unknown");
    expect(seat("p1").textContent).toContain("Bilinmiyor");
    expect(seat("p1").querySelector("[data-estimated]")).toBeNull();
    expect(seat("p2").getAttribute("data-pose")).toBe("resting");
    expect(seat("p2").textContent).toContain("Boşta 3 dk");
    expect(seat("p3").getAttribute("data-pose")).toBe("absent");
    expect(seat("p3").textContent).toContain("Kurulu değil");
    expect(seat("p3").querySelector("[data-person]")).toBeNull();
    expect(seat("p4").querySelector("[data-danger-mark]")).toBeTruthy();
  });

  it("alt görev: en çok 40 karakter, title tam metin; görevsiz ajanda ve pano yokken satır yok", () => {
    const title = "Sipariş tablosuna iade nedeni alanını ekle ve testleri yaz";
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      board: { workspaceId: "a", tasks: [task("t", [sub("x", { title, state: "running", paneId: "p1" })])] }
    });
    const row = seat("p1").querySelector("[data-office-task]") as HTMLElement;
    expect(Array.from(row.textContent ?? "")).toHaveLength(40);
    expect(row.getAttribute("title")).toBe(title);
    expect(seat("p2").querySelector("[data-office-task]")).toBeNull();
    cleanup();
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-task]")).toBeNull();
  });
});

describe("OfficeView — İngilizce", () => {
  it("boş durum, bölge adı, terminal notu ve tahmini eki", () => {
    setup(workspace([shellPane("s1")]), { language: "en" });
    const office = screen.getByRole("region", { name: "Office view" });
    expect(within(office).getByText("Nobody in the office")).toBeTruthy();
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("Terminals: 1");
    cleanup();
    setup(workspace([agentPane("p1")]), { language: "en", statuses: { p1: st("idle", "estimated") } });
    expect(seat("p1").getAttribute("aria-label")).toBe("Ajan p1, coder, Idle (estimated)");
  });
});
