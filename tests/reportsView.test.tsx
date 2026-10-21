// @vitest-environment jsdom
// Raporlar ekranı (2026-10-19): liste, süzgeç, arama, ayrıntı, bağlantılar, dışa aktarma.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ReportsView from "../src/agents/ReportsView";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import { BoardContext } from "../src/board/boardContext";
import { ChangesFocusContext } from "../src/changes/changesFocus";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { Board, Subtask } from "../app-electron/shared/boardTypes";
import type { FlowEvent } from "../src/agents/flowEvents";

const M = 60_000;
const pane = (id: string, title: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title
});
const ws: TerminalWorkspace = {
  id: "w1",
  name: "Satış",
  panes: [pane("a", "Ayşe"), pane("b", "Mehmet")],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  root: "C:\\proje"
};
const sub = (id: string, over: Partial<Subtask>): Subtask => ({ id, title: `İş ${id}`, prompt: "", roleHint: "", dependsOn: [], state: "done", paneId: "a", attempts: 1, ...over });
const now = Date.now();
const board: Board = {
  workspaceId: "w1",
  tasks: [
    {
      id: "t1",
      title: "Sepet",
      goal: "",
      state: "running",
      createdAt: 0,
      subtasks: [
        sub("1", { dispatchedAt: now - 30 * M, proof: { kind: "commands", ok: true, at: now - 10 * M, commands: [{ command: "npm test", exitCode: 0, durationMs: 5, tail: "" }] } }),
        sub("2", { state: "failed", paneId: "b", dispatchedAt: now - 9 * M, proof: { kind: "commands", ok: false, at: now - 5 * M, commands: [{ command: "npm test", exitCode: 1, durationMs: 5, tail: "" }] } })
      ]
    }
  ]
};
const events: FlowEvent[] = [{ id: 1, at: now - 11 * M, workspaceId: "w1", kind: "finished", paneId: "a", name: "Ayşe", detail: "", reply: "Sepet bitti, testler yeşil." }];

describe("ReportsView", () => {
  let commands: TerminalCommands;
  let requestFocus: ReturnType<typeof vi.fn>;
  let save: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    save = vi.fn(async () => ({ canceled: false, filePath: "C:\\r\\İş-1.md" }));
    (window as unknown as { api: unknown }).api = {
      changesState: vi.fn(async () => ({
        workspaceId: "w1",
        repo: "ok",
        expired: [],
        checkpoints: [
          { id: "c1", workspaceId: "w1", tree: "x", createdAt: now - 30 * M, reason: "dispatch", paneId: "a", agentName: "Ayşe", subtaskId: "1", label: "İş 1", reviewed: "pending", stats: { files: 2, added: 14, deleted: 3 } }
        ]
      })),
      onChangesChanged: vi.fn(() => () => {}),
      reportsSaveMarkdown: save
    };
    commands = { setWorkspaceView: vi.fn(), revealPane: vi.fn() } as unknown as TerminalCommands;
    requestFocus = vi.fn();
  });
  afterEach(cleanup);

  async function draw(b: Board | null = board, live: FlowEvent[] = events) {
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a",
      setupRuns: {}
    };
    render(
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store}>
          <BoardContext.Provider value={{ boards: b ? { w1: b } : {}, command: vi.fn() }}>
            <ChangesFocusContext.Provider value={{ focus: null, requestFocus, clearFocus: () => {} }}>
              <FlowContext.Provider value={{ ...EMPTY_FLOW, events: live }}>
                <ReportsView workspace={ws} />
              </FlowContext.Provider>
            </ChangesFocusContext.Provider>
          </BoardContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
  }

  const items = () => within(screen.getByRole("list", { name: "Rapor listesi" })).getAllByRole("button");

  it("liste en yeni önce; süzgeç ve arama daraltıyor; temizle geri getiriyor", async () => {
    await draw();
    expect(items().map((b) => b.getAttribute("data-report-key"))).toEqual(["t1/2", "t1/1"]);
    expect(screen.getByText("2 rapor")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Sonuç" }), { target: { value: "failed" } });
    expect(items()).toHaveLength(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Sonuç" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Ajan" }), { target: { value: "a" } });
    expect(items().map((b) => b.getAttribute("data-report-key"))).toEqual(["t1/1"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Ajan" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "YEŞİL" } });
    expect(items().map((b) => b.getAttribute("data-report-key"))).toEqual(["t1/1"]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "yok-böyle" } });
    expect(screen.getByText("Süzgece uyan rapor yok.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Süzgeçleri temizle" }));
    expect(items()).toHaveLength(2);
  });

  it("2026-10-21: bellekten düşmüş adımlar kalıcı kayıttan (flow:range) okunuyor", async () => {
    const flowRange = vi.fn(async () => ({
      events: [{ at: now - 11 * M, kind: "finished", paneId: "a", name: "Ayşe", detail: "", reply: "Sepet bitti, testler yeşil." }],
      total: 1,
      oldest: now - 11 * M,
      full: false
    }));
    (window as unknown as { api: Record<string, unknown> }).api.flowRange = flowRange;
    await draw(board, []);
    expect(flowRange).toHaveBeenCalledWith("w1", 0);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "YEŞİL" } });
    expect(items().map((b) => b.getAttribute("data-report-key"))).toEqual(["t1/1"]);
  });

  it("seçilince ayrıntı: özet, doğrulama, değişiklik bağlantısı, terminal, sonraki iş; dışa aktarma", async () => {
    await draw();
    fireEvent.click(items()[1]);
    const detail = screen.getByRole("region", { name: "Rapor ayrıntısı" });
    expect(within(detail).getByText("Sepet bitti, testler yeşil.")).toBeTruthy();
    expect(within(detail).getByText("2 dosya, +14 / -3")).toBeTruthy();
    expect(within(detail).getByText(/Değişiklik kaydı inceleme bekliyor/)).toBeTruthy();
    fireEvent.click(within(detail).getByRole("button", { name: "Değişikliklerde aç" }));
    expect(requestFocus).toHaveBeenCalledWith("w1", "1");
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "changes");
    fireEvent.click(within(detail).getByRole("button", { name: "Terminali aç" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
    fireEvent.click(within(detail).getByRole("button", { name: "Görevde aç" }));
    expect(commands.setWorkspaceView).toHaveBeenLastCalledWith("w1", "board");
    await act(async () => {
      fireEvent.click(within(detail).getByRole("button", { name: "Markdown olarak kaydet" }));
    });
    expect(save).toHaveBeenCalledTimes(1);
    const [md, name] = save.mock.calls[0] as [string, string];
    expect(md).toMatch(/^# İş 1/);
    expect(md).toContain("## Sonraki iş");
    expect(name).toBe("İş-1.md");
    expect(screen.getByText("Kaydedildi: C:\\r\\İş-1.md")).toBeTruthy();
    fireEvent.click(within(detail).getByRole("button", { name: "Ayrıntıyı kapat" }));
    expect(screen.queryByRole("region", { name: "Rapor ayrıntısı" })).toBeNull();
  });

  it("liste dışa aktarma süzülmüş raporları tek dosyada yazıyor", async () => {
    await draw();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Listeyi kaydet" }));
    });
    const [md] = save.mock.calls[0] as [string];
    expect(md.match(/^# /gm)).toHaveLength(2);
  });

  it("boş durum", async () => {
    await draw(null);
    expect(screen.getByText(/Henüz rapor yok/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Listeyi kaydet" }) as HTMLButtonElement).disabled).toBe(true);
  });
// Tur 13: rapor ayrıntısından belleğe (noteFromFlow benzeri; çoğaltma kontrolü).
  it("Belleğe ekle: görev notu ekleniyor; ikinci kez eklenmiyor (zaten bellekte)", async () => {
    const stored: unknown[] = [];
    const api = (window as unknown as { api: Record<string, unknown> }).api;
    api.notesList = vi.fn(async () => stored);
    api.notesAdd = vi.fn(async (_w: string, input: { title: string; body: string; source?: { ref?: string } }) => {
      const note = { id: "n-rep00001", title: input.title, body: input.body, kind: "gorev", tags: [], owner: "", created: 1, updated: 1, source: input.source };
      stored.push(note);
      return { ok: true, note };
    });
    await draw();
    fireEvent.click(items()[1]);
    fireEvent.click(screen.getByRole("button", { name: "Belleğe ekle" }));
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
    expect(api.notesAdd).toHaveBeenCalledWith("w1", expect.objectContaining({ title: "İş 1", kind: "gorev", source: expect.objectContaining({ type: "task", ref: "report:t1:1" }) }));
    expect(screen.getByText("Belleğe eklendi.")).toBeTruthy();
    cleanup();
    await draw();
    fireEvent.click(items()[1]);
    fireEvent.click(screen.getByRole("button", { name: "Belleğe ekle" }));
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
    expect(api.notesAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Zaten bellekte.")).toBeTruthy();
  });
});

