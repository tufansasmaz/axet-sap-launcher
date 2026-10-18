// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalMode from "../src/terminal/TerminalMode";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { LayoutNode } from "../app-electron/shared/terminalTree";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { AGENT_ENGINE_MISSING, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { TerminalPane } from "../src/stores/terminalTypes";

// Taşımada xterm'in yeniden kurulmadığını saymak için (spec §6.2).
const mounts = vi.hoisted(() => ({ count: 0 }));
vi.mock("../src/components/EmbeddedTerminal", async () => {
  const { useEffect } = await vi.importActual<typeof import("react")>("react");
  return {
    default: function FakeTerminal({ sessionId, active }: { sessionId: string; active: boolean }) {
      useEffect(() => {
        mounts.count += 1;
      }, []);
      return <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />;
    }
  };
});

const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const split = (dir: "row" | "column", ids: string[], sizes?: number[]): LayoutNode => ({
  type: "split",
  dir,
  children: ids.map(leaf),
  sizes: sizes ?? ids.map(() => 1 / ids.length)
});

let prevApi: unknown;
let pick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = {
    pickFolder: pick,
    axetAgents: vi.fn(async () => [])
  };
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

/** `n` çalışan bölmeli alan; bölme kimlikleri `<id>-p1…`, pty'ler `<id>-t1…`. */
function ws(id: string, n: number, extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    id,
    name: `Alan ${id}`,
    panes: Array.from({ length: n }, (_, i) => ({
      id: `${id}-p${i + 1}`,
      kind: "cmd" as const,
      cwd: "C:\\a",
      run: { state: "running", ptyId: `${id}-t${i + 1}` } as PaneRun
    })),
    focusedPaneId: n > 0 ? `${id}-p1` : null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    ...extra
  };
}

function setup(over: Partial<TerminalState> = {}, defaultCwd = "C:\\a", agents: Partial<AgentStatusValue> = {}) {
  const commands = commandsMock();
  const make = (o: Partial<TerminalState>): TerminalStoreValue => ({
    state: { ...initialTerminalState, phase: "ready", visible: true, ...o },
    commands,
    defaultKind: "cmd",
    defaultCwd,
    agentCwd: "C:\\axet"
  });
  const agentValue: AgentStatusValue = {
    statuses: {},
    engines: [],
    now: 1_000_000,
    answer: vi.fn(async () => ({ ok: true as const })),
    ...agents
  };
  const ui = (o: Partial<TerminalState>) => (
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={make(o)}>
        <AgentStatusContext.Provider value={agentValue}>
          <TerminalMode />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(over));
  return { commands, rerender: (o: Partial<TerminalState>) => r.rerender(ui(o)) };
}

function cell(paneId: string): HTMLElement {
  return document.querySelector(`[data-pane="${paneId}"]`) as HTMLElement;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

const agentPane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "claude", role: "Test", roleKind: "preset" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: "Ayşe",
  ...over
});

function agentWs(panes: TerminalPane[], extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return { id: "a", name: "Alan a", panes, focusedPaneId: panes[0]?.id ?? null, maximizedPaneId: null, unread: false, error: false, ...extra };
}

const strip = () => screen.getByRole("list", { name: "Ekip" });
const card = (paneId: string) => document.querySelector(`[data-agent-card="${paneId}"]`) as HTMLElement;

describe("TerminalMode", () => {
  it("kapalı evrede hiçbir şey çizmiyor", () => {
    setup({ phase: "closed" });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("geri yükleme şeridi: sayılar ve iki düğme; + Ajan yok", () => {
    const { commands } = setup({
      phase: "restorePrompt",
      saved: [
        { id: "a", name: "A", panes: [{ id: "x", kind: "cmd", cwd: "C:\\a" }] },
        { id: "b", name: "B", panes: [{ id: "y", kind: "cmd", cwd: "C:\\a" }, { id: "z", kind: "powershell", cwd: "C:\\a" }] }
      ]
    });
    expect(screen.getByText("Son düzen: 2 alan, 3 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Geri yükle" }));
    fireEvent.click(screen.getByRole("button", { name: "Boş başla" }));
    expect(commands.restore).toHaveBeenCalledTimes(1);
    expect(commands.startFresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Ajan" })).toBeNull();
  });

  it("boş alan: açıklama ve kurulu motorlar; 'İlk ajanını ekle' ajanı varsayılanlarla ekliyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" }, "C:\\a", {
      engines: [
        { id: "axet-code", installed: true, blocked: false },
        { id: "codex", installed: false, blocked: true },
        { id: "ozel", installed: true, blocked: false }
      ]
    });
    expect(screen.getByText("Bu alanda ajan yok")).toBeTruthy();
    expect(screen.getByText("Kurulu motorlar: axet-code")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İlk ajanını ekle" }));
    expect(screen.getByText("Ajan ekle")).toBeTruthy();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(commands.addAgent).toHaveBeenCalledWith(
      { spec: { engine: "axet-code", role: "", roleKind: "custom" }, name: "Ajan 1", color: "gray", cwd: "C:\\axet" },
      undefined
    );
  });

  it("boş alan: 'Düz terminal aç' kabuk penceresini açıyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Düz terminal aç" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", undefined);
  });

  it("hepsi küçültülünce boş-durum metni, xterm'ler takılı (inceleme odağı 3)", () => {
    setup({
      workspaces: [ws("a", 2, { layout: null, focusedPaneId: null, minimized: [{ paneId: "a-p1", home: null }, { paneId: "a-p2", home: null }] })],
      activeWorkspaceId: "a"
    });
    expect(screen.getByText("Bütün bölmeler alttaki şeritte.")).toBeTruthy();
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
  });

  it("kartta kırpılan ad ve rol span'larında tam metin title'ı var", () => {
    setup(
      { workspaces: [agentWs([agentPane("x", { title: "Uzun Ajan Adı", agent: { engine: "claude", role: "Uzun Rol Metni", roleKind: "custom" } })])], activeWorkspaceId: "a" },
      "C:\\a"
    );
    const nameSpan = card("x").querySelector("span.truncate.font-medium") as HTMLElement;
    const roleSpan = card("x").querySelector("span.truncate.text-slate-500") as HTMLElement;
    expect(nameSpan.getAttribute("title")).toBe("Uzun Ajan Adı");
    expect(roleSpan.getAttribute("title")).toBe("Uzun Rol Metni");
  });

  it("ekip şeridi: kartta ad, rol, motor ve durum; kabuk bölmesinin kartı yok; tıklayınca bölme öne geliyor", () => {
    const asking: AgentStatus = {
      state: "asking",
      source: "exact",
      lastActivity: 1,
      question: { callId: "c1", question: "?", header: "", options: ["A", "B"], multiSelect: false, askedAt: 1 }
    };
    const shell: TerminalPane = { id: "s", kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: "t-s" } };
    const { commands } = setup({ workspaces: [agentWs([agentPane("x"), shell])], activeWorkspaceId: "a" }, "C:\\a", {
      statuses: { x: asking }
    });
    const text = card("x").textContent ?? "";
    for (const part of ["Ayşe", "Test", "Claude Code", "Soru soruyor"]) expect(text).toContain(part);
    expect(card("s")).toBeNull();
    expect(card("x").querySelector("[data-estimated]")).toBeNull();
    expect(card("x").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(card("x"));
    expect(commands.revealPane).toHaveBeenCalledWith("x");
  });

  it("tahmini durumda ≈ ve ipucu; boşta süresi", () => {
    setup({ workspaces: [agentWs([agentPane("x")])], activeWorkspaceId: "a" }, "C:\\a", {
      now: 1_000_000 + 3 * 60_000,
      statuses: { x: { state: "idle", source: "estimated", lastActivity: 1_000_000 } }
    });
    expect(card("x").textContent).toContain("Boşta 3 dk");
    const mark = card("x").querySelector("[data-estimated]") as HTMLElement;
    expect(mark.textContent).toBe("≈");
    expect(mark.getAttribute("title")).toBe("Bu motorun durumu terminal hareketinden tahmin ediliyor.");
  });

  it("axet-code sürüm uyarısı kartta motor adının ipucunda", () => {
    setup(
      { workspaces: [agentWs([agentPane("x", { agent: { engine: "axet-code", role: "", roleKind: "custom" } })])], activeWorkspaceId: "a" },
      "C:\\a",
      { engines: [{ id: "axet-code", installed: true, blocked: false, note: "axet-code eski" }] }
    );
    const note = card("x").querySelector("[data-engine-note]") as HTMLElement;
    expect(note.textContent).toBe("axet-code");
    expect(note.getAttribute("title")).toBe("axet-code eski");
  });

  it("motoru kurulu olmayan ajan 'Kurulu değil'; bitmiş ajan 'Yeniden başlat'", () => {
    const { commands } = setup(
      {
        workspaces: [agentWs([agentPane("x", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), agentPane("y", { title: "Mehmet" })])],
        activeWorkspaceId: "a"
      },
      "C:\\a",
      { statuses: { y: { state: "finished", source: "exact", lastActivity: 1 } } }
    );
    expect(card("x").textContent).toContain("Kurulu değil");
    const restarts = within(strip()).getAllByRole("button", { name: "Yeniden başlat" });
    fireEvent.click(restarts[restarts.length - 1]);
    expect(commands.restartPane).toHaveBeenCalledWith("y");
  });

  it("bellek kapalı ajan kartında 'Belleği etkinleştir' komutu çağırıyor, pencere açmıyor", () => {
    const { commands } = setup({ workspaces: [agentWs([agentPane("x")])], activeWorkspaceId: "a" });
    expect(card("x").parentElement!.querySelector("[data-agent-memory]")?.getAttribute("data-agent-memory")).toBe("off");
    fireEvent.click(within(strip()).getByRole("button", { name: "Belleği etkinleştir" }));
    expect(commands.enablePaneMemory).toHaveBeenCalledWith("x");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(commands.revealPane).not.toHaveBeenCalled();
  });

  it("bellek açık ajan kartında 'Belleği aç' bellek penceresini açıyor", async () => {
    const memoryRead = vi.fn(async () => ({ ok: true, rel: ".ntt-studio/bellek/ayse.md", content: "# Ayşe", stamp: "a".repeat(64), notice: "sent" }));
    (window as unknown as { api: Record<string, unknown> }).api.memoryRead = memoryRead;
    setup({
      workspaces: [agentWs([agentPane("x", { agent: { engine: "claude", role: "Test", roleKind: "preset", memory: "ayse" } })])],
      activeWorkspaceId: "a"
    });
    fireEvent.click(within(strip()).getByRole("button", { name: "Belleği aç" }));
    await flush();
    expect(memoryRead).toHaveBeenCalledWith("a", "x");
    expect(screen.getByRole("dialog", { name: "Ayşe — kalıcı bellek" })).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("# Ayşe");
  });

  it("+ Terminal kabuk penceresini açıp odaktaki bölmeyi bölüyor; bölme sayısı görünüyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.getByText("2 / 9 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    // jsdom'da kutular 0×0: genişlik yükseklikten büyük değil → alta.
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", { targetPaneId: "a-p1", dir: "column" });
  });

  it("+ Ajan pencereden addAgent'a bölme yönüyle gidiyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Ajan" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(commands.addAgent).toHaveBeenCalledWith(expect.objectContaining({ name: "Ajan 1", cwd: "C:\\axet" }), {
      targetPaneId: "a-p1",
      dir: "column"
    });
  });

  it("+ Ajan: Kalıcı bellek işaretliyse addAgent'a memory: true gidiyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 1)], activeWorkspaceId: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Ajan" }));
    await flush();
    fireEvent.click(screen.getByRole("checkbox", { name: "Kalıcı bellek" }));
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(commands.addAgent).toHaveBeenCalledWith(expect.objectContaining({ memory: true }), expect.anything());
  });

  it("9 bölmede + Ajan ve + Terminal kapalı ve nedenini söylüyor", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    for (const name of ["Ajan", "Terminal"]) {
      const button = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.title).toBe("En fazla 9 bölme");
    }
  });

  it("3 bölme: solda tek, sağda üst üste iki yer tutucu (eski ızgaraya benzer)", () => {
    setup({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    const root = document.querySelector('[data-workspace="a"] [data-split="row"]') as HTMLElement;
    expect(root.querySelector(':scope > [data-slot="a-p1"]')).toBeTruthy();
    const right = root.querySelector(':scope > [data-split="column"]') as HTMLElement;
    expect([...right.querySelectorAll("[data-slot]")].map((el) => el.getAttribute("data-slot"))).toEqual(["a-p2", "a-p3"]);
  });

  it("xterm odağı: yalnız görünür + seçili alan + odaktaki bölme", () => {
    const { rerender } = setup({
      workspaces: [ws("a", 2, { focusedPaneId: "a-p2" }), ws("b", 1)],
      activeWorkspaceId: "a"
    });
    expect(screen.getByTestId("xterm-a-t1").getAttribute("data-active")).toBe("false");
    expect(screen.getByTestId("xterm-a-t2").getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("xterm-b-t1").getAttribute("data-active")).toBe("false");
    rerender({ workspaces: [ws("a", 2, { focusedPaneId: "a-p2" }), ws("b", 1)], activeWorkspaceId: "a", visible: false });
    expect(screen.getByTestId("xterm-a-t2").getAttribute("data-active")).toBe("false");
  });

  it("seçili olmayan alan takılı kalıyor ama gizli", () => {
    setup({ workspaces: [ws("a", 1), ws("b", 1)], activeWorkspaceId: "a" });
    const hidden = screen.getByTestId("xterm-b-t1").closest("[data-workspace]") as HTMLElement;
    const shown = screen.getByTestId("xterm-a-t1").closest("[data-workspace]") as HTMLElement;
    expect(hidden.className.split(" ")).toContain("hidden");
    expect(shown.className.split(" ")).not.toContain("hidden");
  });

  it("büyütme: ötekiler display none ama takılı, ayırıcı yok", () => {
    setup({ workspaces: [ws("a", 3, { maximizedPaneId: "a-p2" })], activeWorkspaceId: "a" });
    expect(cell("a-p1").style.display).toBe("none");
    expect(cell("a-p3").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
    expect(cell("a-p2").style.left).toBe("0px");
    expect(cell("a-p2").style.right).toBe("0px");
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });

  it("tek bölmede ayırıcı ve büyüt düğmesi yok", () => {
    setup({ workspaces: [ws("a", 1)], activeWorkspaceId: "a" });
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
    expect(screen.queryByTitle("Büyüt")).toBeNull();
  });

  it("ayırıcı: değer ağaçtaki paydan; ok tuşu ve çift tık komut gönderiyor", () => {
    const { commands } = setup({
      workspaces: [ws("a", 2, { layout: split("row", ["a-p1", "a-p2"], [0.7, 0.3]) })],
      activeWorkspaceId: "a"
    });
    const sep = screen.getByRole("separator", { name: "Sütun genişliği" });
    expect(sep.getAttribute("aria-valuenow")).toBe("70");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(commands.resizeSplit).toHaveBeenCalledWith("a", [], 0, 0.02, expect.any(Number));
    fireEvent.keyDown(sep, { key: "ArrowUp" }); // yatay ayırıcıda dikey ok: yok sayılıyor
    expect(commands.resizeSplit).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(sep);
    expect(commands.equalizeSplit).toHaveBeenCalledWith("a", []);
  });

  it("4 bölme: iki satır kabında birer sütun ayırıcısı, kökte bir satır ayırıcısı", () => {
    setup({ workspaces: [ws("a", 4)], activeWorkspaceId: "a" });
    expect(screen.getAllByRole("separator", { name: "Sütun genişliği" })).toHaveLength(2);
    expect(screen.getAllByRole("separator", { name: "Satır yüksekliği" })).toHaveLength(1);
  });

  it("ağaç değişince (takas, yön, küçültme) xterm yeniden kurulmuyor (spec §6.2)", () => {
    const { rerender } = setup({ workspaces: [ws("a", 2, { layout: split("row", ["a-p1", "a-p2"]) })], activeWorkspaceId: "a" });
    const before = mounts.count;
    rerender({ workspaces: [ws("a", 2, { layout: split("column", ["a-p2", "a-p1"]) })], activeWorkspaceId: "a" });
    rerender({
      workspaces: [ws("a", 2, { layout: leaf("a-p1"), minimized: [{ paneId: "a-p2", home: null }] })],
      activeWorkspaceId: "a"
    });
    expect(mounts.count).toBe(before);
    expect(cell("a-p2").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t2")).toBeTruthy();
  });

  it("şerit: küçültülen bölme sekme olarak, okunmadı noktasıyla; tıklayınca geri geliyor", () => {
    const { commands } = setup({
      workspaces: [ws("a", 2, { layout: leaf("a-p1"), minimized: [{ paneId: "a-p2", home: null, unread: true }] })],
      activeWorkspaceId: "a"
    });
    const miniStrip = screen.getByRole("toolbar", { name: "Şeritteki bölmeler" });
    const tab = miniStrip.querySelector('[data-minimized="a-p2"]') as HTMLElement;
    expect(tab.textContent).toContain("cmd");
    expect(tab.querySelector("[data-unread]")).toBeTruthy();
    fireEvent.click(tab);
    expect(commands.restorePane).toHaveBeenCalledWith("a-p2");
  });

  it("şerit yoksa çizilmiyor", () => {
    setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.queryByRole("toolbar", { name: "Şeritteki bölmeler" })).toBeNull();
  });

  it("başlıktaki Sağa böl pencereyi açıyor, o bölmeyi sağdan bölüyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    const pane2 = cell("a-p2");
    fireEvent.click(pane2.querySelector('[aria-label="Sağa böl"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", { targetPaneId: "a-p2", dir: "row" });
  });

  it("9 bölmede böl düğmeleri kapalı", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    const right = cell("a-p1").querySelector('[aria-label="Sağa böl"]') as HTMLButtonElement;
    expect(right.disabled).toBe(true);
  });
});
