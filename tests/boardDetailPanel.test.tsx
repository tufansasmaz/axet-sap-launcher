// @vitest-environment jsdom
// Ayrıntı paneli: taslak düzenleme, lider durumu, alt görev düğmeleri, kanıt,
// hata, silme (spec 2026-10-18 gorev-panosu §3, §4, §6, §8).
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import BoardDetailPanel from "../src/board/BoardDetailPanel";
import { BoardContext } from "../src/board/boardContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { BoardCommand, BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { BoardTask, Subtask } from "../app-electron/shared/boardTypes";

afterEach(cleanup);

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

const agentPane = (id: string, title: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title
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
  title: "İade akışı",
  goal: "Ödeme modülüne iade ekle",
  state: "running",
  createdAt: 1,
  approvedAt: 2,
  subtasks,
  ...over
});
const draftTask = task("t1", [sub("s1", { title: "Model", prompt: "Tabloyu ekle" }), sub("s2", { title: "Test", prompt: "Test yaz", dependsOn: ["s1"] })], {
  approvedAt: undefined,
  state: "awaitingApproval"
});
const rowOf = (id: string) => document.querySelector(`[data-detail-subtask="${id}"]`) as HTMLElement;

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function setup(initial: BoardTask, wsOver: Partial<TerminalWorkspace> = {}, language: "tr" | "en" = "tr") {
  const commands = commandsMock();
  const command = vi.fn(async (_ws: string, _cmd: BoardCommand): Promise<BoardCommandResult> => ({ ok: true, taskId: initial.id }));
  const onClose = vi.fn();
  const ws: TerminalWorkspace = {
    id: "a",
    name: "Alan a",
    panes: [agentPane("p1", "Ayşe"), agentPane("p2", "Can")],
    focusedPaneId: null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    verify: ["npm test"],
    ...wsOver
  };
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", workspaces: [ws], activeWorkspaceId: "a" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  const ui = (tk: BoardTask) => (
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <BoardContext.Provider value={{ boards: {}, command }}>
          <BoardDetailPanel workspace={ws} task={tk} onClose={onClose} onSelectSubtask={vi.fn()} />
        </BoardContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(initial));
  return { commands, command, onClose, rerender: (tk: BoardTask) => r.rerender(ui(tk)) };
}

const types = (command: ReturnType<typeof vi.fn>) => command.mock.calls.map((c) => (c[1] as BoardCommand).type);

describe("taslak", () => {
  it("alanları düzenleyip Kaydet: saveDraft; ekle, sırala, bağımlılık", async () => {
    const { command } = setup(draftTask);
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık 1" }), { target: { value: "Veri modeli" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "2. alt görev şuna bağlı: Veri modeli" }));
    fireEvent.click(screen.getByRole("button", { name: "Aşağı taşı (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Alt görev" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık 3" }), { target: { value: "Belge" } });
    fireEvent.change(screen.getByRole("textbox", { name: "İstem 3" }), { target: { value: "Rehberi güncelle" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await flush();
    const sent = command.mock.calls[0][1] as Extract<BoardCommand, { type: "saveDraft" }>;
    expect(sent.type).toBe("saveDraft");
    expect(sent.subtasks.map((d) => [d.title, d.dependsOn])).toEqual([
      ["Test", []],
      ["Veri modeli", []],
      ["Belge", []]
    ]);
    expect(sent.subtasks[2].id).toMatch(/^[A-Za-z0-9_-]{1,100}$/);
  });

  it("alt görev silinince ona bağlılık da kalkıyor", async () => {
    const { command } = setup(draftTask);
    fireEvent.click(screen.getByRole("button", { name: "Alt görevi sil (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await flush();
    const sent = command.mock.calls[0][1] as Extract<BoardCommand, { type: "saveDraft" }>;
    expect(sent.subtasks).toEqual([{ id: "s2", title: "Test", prompt: "Test yaz", roleHint: "", dependsOn: [] }]);
  });

  it("Onayla: kaydedilmemiş değişiklik varsa önce saveDraft sonra approve; çift tıklama tek sefer", async () => {
    const { command } = setup(draftTask);
    fireEvent.change(screen.getByRole("textbox", { name: "İstem 1" }), { target: { value: "Yeni istem" } });
    const approve = screen.getByRole("button", { name: "Onayla" });
    fireEvent.click(approve);
    fireEvent.click(approve);
    await flush();
    expect(types(command)).toEqual(["saveDraft", "approve"]);
  });

  it("boş istemli alt görev varken Onayla kapalı", () => {
    setup(task("t1", [sub("s1", { prompt: "" })], { approvedAt: undefined, state: "awaitingApproval" }));
    expect((screen.getByRole("button", { name: "Onayla" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Böl lideri başlatıyor; planlanırken kilitli; lider hatası açık mesaj, ayrıntı, uyarı ve katlı ham cevap", async () => {
    const t0 = task("t1", [], { approvedAt: undefined, state: "draft" });
    const { command, rerender } = setup(t0);
    fireEvent.click(screen.getByRole("button", { name: "Böl" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "split", taskId: "t1" });
    rerender({ ...t0, planning: true });
    expect(screen.getByText("Lider planlıyor…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Böl" }) as HTMLButtonElement).disabled).toBe(true);
    rerender({ ...t0, state: "stuck", leadError: "binary", leadDetail: "axet-code bulunamadı", leadRaw: "ham cevap", leadChangedFiles: true });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("axet-code kullanılamıyor.");
    expect(alert.textContent).toContain("axet-code bulunamadı");
    expect(screen.getByText("Lider planlarken dosya değiştirdi.")).toBeTruthy();
    expect(screen.getByText("Liderin ham cevabı").closest("details")?.textContent).toContain("ham cevap");
    expect(screen.getByRole("button", { name: "Yeniden dene" })).toBeTruthy();
  });
});

describe("onaylı görev", () => {
  it("ready: seçilen ajana Ajana ver; held: Yeniden sıraya al", async () => {
    const { command } = setup(task("t1", [sub("s1"), sub("s2", { held: true, note: "agentClosed" })]));
    const row1 = rowOf("s1");
    expect(row1.textContent).toContain("Uygun ajan bekleniyor");
    fireEvent.change(within(row1).getByRole("combobox", { name: "Ajan" }), { target: { value: "p2" } });
    fireEvent.click(within(row1).getByRole("button", { name: "Ajana ver" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "assign", taskId: "t1", subtaskId: "s1", paneId: "p2" });
    expect(rowOf("s2").textContent).toContain("Beklemede");
    fireEvent.click(within(rowOf("s2")).getByRole("button", { name: "Yeniden sıraya al" }));
    await flush();
    expect(command).toHaveBeenLastCalledWith("a", { type: "requeue", taskId: "t1", subtaskId: "s2" });
  });

  it("running: ajan ve deneme; Terminale git Bölmeler'e geçip bölmeyi öne getiriyor; Doğrula", async () => {
    const { command, commands } = setup(task("t1", [sub("s1", { state: "running", paneId: "p1", attempts: 1 })]));
    const row = rowOf("s1");
    expect(row.textContent).toContain("Ajan: Ayşe");
    expect(row.textContent).toContain("Deneme: 1");
    fireEvent.click(within(row).getByRole("button", { name: "Terminale git" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "panes");
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    fireEvent.click(within(row).getByRole("button", { name: "Doğrula" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "verify", taskId: "t1", subtaskId: "s1" });
    expect(within(row).queryByRole("button", { name: "Onayla" })).toBeNull();
  });

  it("doğrulama komutu yok: Onayla elle kanıt; elle onaylanan yeşil işaretle gösterilmiyor", async () => {
    const { command } = setup(
      task("t1", [sub("s1", { state: "verifying", paneId: "p1" }), sub("s2", { state: "done", proof: { kind: "manual", commands: [], ok: true, at: 1 } })]),
      { verify: undefined }
    );
    fireEvent.click(within(rowOf("s1")).getByRole("button", { name: "Onayla" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "approveManual", taskId: "t1", subtaskId: "s1" });
    expect(rowOf("s2").textContent).toContain("Elle onaylandı");
    expect(rowOf("s2").querySelector("[data-proof-ok]")).toBeNull();
  });

  it("yeşil komut kanıtı onay işaretiyle", () => {
    setup(task("t1", [sub("s1", { state: "done", proof: { kind: "commands", ok: true, at: 1, commands: [{ command: "npm test", exitCode: 0, durationMs: 900, tail: "" }] } })]));
    expect(rowOf("s1").querySelector("[data-proof-ok]")?.textContent).toContain("Doğrulandı");
  });

  it("başarısız: kanıt (komut, çıkış, süre, katlı çıktı); geri gönder reddedilirse açık hata", async () => {
    const failed = sub("s1", {
      state: "failed",
      paneId: "p1",
      attempts: 1,
      proof: { kind: "commands", ok: false, at: 1, commands: [{ command: "npm test", exitCode: 1, durationMs: 12_000, tail: "FAIL a.test.ts" }] }
    });
    const { command } = setup(task("t1", [failed]));
    const row = rowOf("s1");
    expect(row.textContent).toContain("npm test");
    expect(row.textContent).toContain("çıkış 1");
    expect(row.textContent).toContain("12 sn");
    expect(within(row).getByText("Çıktının sonu").closest("details")?.textContent).toContain("FAIL a.test.ts");
    command.mockResolvedValueOnce({ ok: false, reason: "typing" });
    fireEvent.click(within(row).getByRole("button", { name: "Düzeltmeye geri gönder" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "sendBack", taskId: "t1", subtaskId: "s1" });
    expect(screen.getByRole("alert").textContent).toBe("Bu ajanın terminalinde yazıyorsun; satırı gönder ya da sil, sonra yeniden dene.");
  });

  it("Sil: onay penceresinden sonra deleteTask ve panel kapanıyor; panelin erişilebilir adı", async () => {
    const { command, onClose } = setup(task("t1", [sub("s1")]));
    expect(screen.getByRole("complementary", { name: "Görev ayrıntısı" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(command).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sil" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "deleteTask", taskId: "t1" });
    expect(onClose).toHaveBeenCalled();
  });

  it("İngilizce", () => {
    setup(task("t1", [sub("s1", { state: "running", paneId: "p1" })]), {}, "en");
    expect(screen.getByRole("button", { name: "Verify" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to terminal" })).toBeTruthy();
  });
});
