// @vitest-environment jsdom
// Değişiklikler: Kabul et, Geri al onayı ve sonucu, pano bağlantısı
// (spec 2026-10-18 degisiklikler §5, §6, §8).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChangesView from "../src/changes/ChangesView";
import BoardDetailPanel from "../src/board/BoardDetailPanel";
import { ChangesFocusContext, type ChangesFocusValue } from "../src/changes/changesFocus";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { BoardTask, Subtask } from "../app-electron/shared/boardTypes";
import type { ChangesState, Checkpoint, FileChange, RangeResult, RevertPlan, RevertResult } from "../app-electron/shared/changesTypes";

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
const ws: TerminalWorkspace = {
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1", "Ayşe")],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "changes"
};
const cp = (id: string, createdAt: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "a",
  tree: "0".repeat(40),
  createdAt,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});
const file = (p: string, status: FileChange["status"] = "modified"): FileChange => ({ path: p, status, added: 1, deleted: 1, binary: false });
const okRange = (files: FileChange[], toWorkingTree = false): RangeResult => ({ ok: true, files, truncated: false, toWorkingTree });
const plan = (over: Partial<RevertPlan> = {}): RevertPlan => ({
  files: [file("a.ts"), file("yeni.txt", "added")],
  conflicts: [],
  conflictsPartial: false,
  runningAgents: [],
  ...over
});

let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
const state = (over: Partial<ChangesState> = {}): ChangesState => ({
  workspaceId: "a",
  repo: "ok",
  checkpoints: [cp("c1", 1_000), cp("c2", 2_000, { subtaskId: "s1" }), cp("c3", 3_000)],
  expired: [],
  ...over
});

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    changesState: vi.fn(async () => state()),
    onChangesChanged: vi.fn(() => () => {}),
    changesLive: vi.fn(async () => okRange([], true)),
    changesRange: vi.fn(async () => okRange([file("a.ts"), file("yeni.txt", "added")])),
    changesDiff: vi.fn(),
    changesCheckpoint: vi.fn(),
    changesAccept: vi.fn(async () => ({ ok: true })),
    changesPrepareRevert: vi.fn(async () => ({ ok: true, plan: plan() })),
    changesRevert: vi.fn(async (): Promise<RevertResult> => ({ ok: true, restored: ["a.ts"], trashed: ["yeni.txt"], skipped: [], beforeRestoreId: "c4" }))
  };
  (window as unknown as { api: unknown }).api = api;
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

function store(commands: TerminalCommands): TerminalStoreValue {
  return {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "a" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
}

async function setup(focus?: Partial<ChangesFocusValue>) {
  const commands = commandsMock();
  const focusValue: ChangesFocusValue = { focus: null, requestFocus: vi.fn(), clearFocus: vi.fn(), ...focus };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store(commands)}>
        <ChangesFocusContext.Provider value={focusValue}>
          <ChangesView workspace={ws} />
        </ChangesFocusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  await flush();
  return { commands, focusValue };
}

const select = async (id: string) => {
  fireEvent.click(document.querySelector(`[data-checkpoint="${id}"]`)!);
  await flush();
};
const actions = () => within(document.querySelector("[data-actions]") as HTMLElement);

describe("Kabul et (spec §5)", () => {
  it("yalnız bekleyen kayıtta; tıklayınca changesAccept; Canlı seçiliyken eylem yok", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", 1_000), cp("c2", 2_000, { reviewed: "accepted" }), cp("c3", 3_000)] }));
    await setup();
    expect(actions().queryByRole("button", { name: "Kabul et" })).toBeNull();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Kabul et" }));
    await flush();
    expect(api.changesAccept).toHaveBeenCalledWith("a", "c1");
    await select("c2");
    expect(actions().queryByRole("button", { name: "Kabul et" })).toBeNull();
  });
});

describe("Geri al (spec §6)", () => {
  it("geri alınmış ve süresi dolmuş kayıtta kapalı", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", 1_000, { reviewed: "reverted" }), cp("c2", 2_000), cp("c3", 3_000)], expired: ["c2"] }));
    await setup();
    await select("c1");
    expect((actions().getByRole("button", { name: "Geri al" }) as HTMLButtonElement).disabled).toBe(true);
    await select("c2");
    expect((actions().getByRole("button", { name: "Geri al" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("pencere: dosyalar, sonraki değişiklik uyarısı, çakışan kayıtlar adıyla, çalışan ajanlar, çöp notu; İptal'de hiçbir şey yok", async () => {
    api.changesPrepareRevert.mockResolvedValue({
      ok: true,
      plan: plan({
        conflicts: [{ id: "c2", label: "testleri düzelt", agentName: "Can", reason: "prompt" }],
        conflictsPartial: true,
        runningAgents: ["Ayşe", "Can"]
      })
    });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    expect(api.changesPrepareRevert).toHaveBeenCalledWith("a", "c1");
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("list", { name: "Etkilenecek dosyalar" }).textContent).toContain("a.ts");
    expect(dialog.textContent).toContain("Bu dosyalardaki sonraki değişiklikler de geri alınır");
    expect(dialog.textContent).toContain("1 dosya çöp kutusuna taşınır");
    expect(dialog.querySelector("[data-revert-conflicts]")?.textContent).toContain("Can · testleri düzelt");
    expect(dialog.textContent).toContain("yalnız ilk 50");
    expect(dialog.querySelector("[data-revert-running]")?.textContent).toContain("Ayşe, Can");
    fireEvent.click(within(dialog).getByRole("button", { name: "İptal" }));
    await flush();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.changesRevert).not.toHaveBeenCalled();
  });

  it("pencere: aralıktaki değişikliklerin hangi ajandan gelirse gelsin geri alınacağını söylüyor", async () => {
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.querySelector("[data-revert-all-agents]")?.textContent).toContain("hangi ajan yaptıysa");
  });

  it("onay: yalnız penceredeki yollarla changesRevert; başarı özeti ve geri almayı geri alma ipucu", async () => {
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    expect(api.changesRevert).toHaveBeenCalledWith("a", "c1", ["a.ts", "yeni.txt"]);
    const outcome = document.querySelector('[data-revert-outcome="ok"]') as HTMLElement;
    expect(outcome.textContent).toContain("1 dosya eski hâline döndü, 1 dosya çöpe taşındı");
    expect(outcome.textContent).toContain("Geri almadan önce");
  });

  it("yarıda kalan geri alma: durduğu dosya ve o ana kadar yazılanlar listeleniyor", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "writeFailed", restored: ["a.ts"], trashed: [], skipped: ["eski.md"], failedPath: "b.ts", beforeRestoreId: "c4" });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    const outcome = document.querySelector('[data-revert-outcome="fail"]') as HTMLElement;
    expect(outcome.getAttribute("role")).toBe("alert");
    expect(outcome.textContent).toContain("Bir dosya yazılamadı");
    expect(outcome.textContent).toContain("Durduğu dosya: b.ts");
    expect(outcome.textContent).toContain("Durmadan önce 1 dosya geri alındı");
    expect(outcome.textContent).toContain("a.ts");
    expect(outcome.textContent).toContain("1 dosya artık bu kaydın aralığında olmadığı için atlandı");
    expect(outcome.textContent).toContain("Geri almadan önce");
  });

  it("geri alma noktası alınamadı: hiçbir dosyaya dokunulmadığı söyleniyor", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    expect(document.querySelector('[data-revert-outcome="fail"]')?.textContent).toContain("hiçbir dosyaya dokunulmadı");
  });

  it("hazırlık hatası açık mesaj; çift tıklama tek hazırlık isteği", async () => {
    let release: (r: unknown) => void = () => {};
    api.changesPrepareRevert.mockImplementation(() => new Promise((r) => (release = r)));
    await setup();
    await select("c1");
    const button = actions().getByRole("button", { name: "Geri al" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.changesPrepareRevert).toHaveBeenCalledTimes(1);
    await act(async () => release({ ok: false, reason: "expired" }));
    expect(screen.getByRole("alert").textContent).toContain("Bu kaydın süresi doldu");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("pathConflict + bir dosya yazıldı: FAILURE_KEY metni + yazılanlar listeleniyor; beforeRestoreId olmadan ipucu yok", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "pathConflict", restored: ["a.ts"], trashed: [], skipped: [] });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    const outcome = document.querySelector('[data-revert-outcome="fail"]') as HTMLElement;
    expect(outcome.textContent).toContain("Bir dosyanın yerinde artık başka bir şey var");
    expect(outcome.textContent).toContain("Durmadan önce 1 dosya geri alındı");
    expect(outcome.textContent).toContain("a.ts");
    expect(outcome.textContent).not.toContain("Geri almadan önce");
  });

  it("pathConflict + bir dosya yazıldı + beforeRestoreId: ipucu görünüyor", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "pathConflict", restored: ["a.ts"], trashed: [], skipped: [], beforeRestoreId: "c4" });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    const outcome = document.querySelector('[data-revert-outcome="fail"]') as HTMLElement;
    expect(outcome.textContent).toContain("Durmadan önce 1 dosya geri alındı");
    expect(outcome.textContent).toContain("a.ts");
    expect(outcome.textContent).toContain("Geri almadan önce");
  });

  it("storeFailed + beforeRestoreId: FAILURE_KEY metni var ama hiç dosyaya dokunulmadı → geri almayı geri al ipucu yok", async () => {
    // storeFailed'da beforeRestore görüntüsü alınmış olabilir (changesManager:472) ama hiçbir dosyaya dokunulmamış.
    api.changesRevert.mockResolvedValue({ ok: false, reason: "storeFailed", restored: [], trashed: [], skipped: [], beforeRestoreId: "c4" });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    const outcome = document.querySelector('[data-revert-outcome="fail"]') as HTMLElement;
    expect(outcome.textContent).toContain("Geri alma kaydı diske yazılamadı");
    expect(outcome.textContent).not.toContain("Geri almadan önce");
  });

  it("alreadyReverted: FAILURE_KEY metni görünüyor, ipucu yok", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "alreadyReverted", restored: [], trashed: [], skipped: [] });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    const outcome = document.querySelector('[data-revert-outcome="fail"]') as HTMLElement;
    expect(outcome.textContent).toContain("Bu kayıt zaten geri alındı");
    expect(outcome.textContent).not.toContain("Geri almadan önce");
  });

  it("busy sonucu şeritte görünüyor", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "busy", restored: [], trashed: [], skipped: [] });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    expect(document.querySelector('[data-revert-outcome="fail"]')?.textContent).toContain("Bu alanda başka bir geri alma sürüyor");
  });

  it("hazırlık uçuştayken başka kayıt seçilirse dönen plan atılıyor", async () => {
    let release: (r: unknown) => void = () => {};
    api.changesPrepareRevert.mockImplementation(() => new Promise((r) => (release = r)));
    await setup();
    await select("c1");
    const button = actions().getByRole("button", { name: "Geri al" });
    fireEvent.click(button);
    // Kullanıcı beklerken c3'e geçiyor
    await act(async () => { fireEvent.click(document.querySelector('[data-checkpoint="c3"]')!); });
    // Hazırlık tamamlanıyor ama seçim artık c3
    await act(async () => release({ ok: true, plan: plan() }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("pencere seçili kaydın etiketini gösteriyor", async () => {
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("istem c1");
  });

  it("Esc pencereyi kapatıyor ve changesRevert çağrılmıyor", async () => {
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    await flush();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.changesRevert).not.toHaveBeenCalled();
  });

  it("geri almadan önce kaydında Kabul et gösterilmiyor", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", 1_000, { reason: "beforeRestore", reviewed: "pending" }), cp("c2", 2_000), cp("c3", 3_000)] }));
    await setup();
    await select("c1");
    expect(actions().queryByRole("button", { name: "Kabul et" })).toBeNull();
    // Normal pending kayıtta hâlâ görünüyor
    await select("c2");
    expect(actions().getByRole("button", { name: "Kabul et" })).toBeTruthy();
  });
});

describe("pano bağlantısı (spec §5)", () => {
  const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({ id, title: id, prompt: `İstem ${id}`, roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 0, ...over });
  const task: BoardTask = {
    id: "t1",
    title: "İade akışı",
    goal: "Hedef",
    state: "running",
    createdAt: 1,
    approvedAt: 2,
    subtasks: [sub("s1", { state: "running", paneId: "p1", attempts: 1, dispatchedAt: 5 }), sub("s2")]
  };

  it("gönderilmiş alt görevde 'Değişiklikler' → odak + görünüm; hiç gönderilmemişte bağlantı yok", () => {
    const commands = commandsMock();
    const requestFocus = vi.fn();
    render(
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store(commands)}>
          <ChangesFocusContext.Provider value={{ focus: null, requestFocus, clearFocus: vi.fn() }}>
            <BoardDetailPanel workspace={ws} task={task} onClose={vi.fn()} onSelectSubtask={vi.fn()} />
          </ChangesFocusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
    expect(document.querySelector('[data-subtask-changes="s2"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-subtask-changes="s1"]')!);
    expect(requestFocus).toHaveBeenCalledWith("a", "s1");
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "changes");
  });

  it("görünüm odakta o alt görevin en son kaydını seçiyor ve odağı temizliyor; kayıt yoksa not", async () => {
    const { focusValue } = await setup({ focus: { workspaceId: "a", subtaskId: "s1" } });
    expect(document.querySelector('[data-checkpoint="c2"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(focusValue.clearFocus).toHaveBeenCalled();
    cleanup();
    await setup({ focus: { workspaceId: "a", subtaskId: "s9" } });
    expect(screen.getByText("Bu alt görev için geri alma noktası yok.")).toBeTruthy();
    expect(document.querySelector("[data-live-row]")?.getAttribute("aria-pressed")).toBe("true");
  });
});
