// @vitest-environment jsdom
// Değişiklikler görünümü (spec 2026-10-18 degisiklikler §2, §5, §8): depo
// mesajı, liste, Canlı yoklaması, aralık, diff, elle geri alma noktası,
// Terminale git; görünüm kaydı; renk kuralı.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChangesView from "../src/changes/ChangesView";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { readWorkspaceView } from "../app-electron/shared/terminalLayout";
import type { ChangesState, Checkpoint, DiffResult, FileChange, RangeResult } from "../app-electron/shared/changesTypes";

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
  title,
  color: "blue"
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
const NOW = new Date(2026, 9, 18, 14, 0).getTime();
const at = (h: number, m: number) => new Date(2026, 9, 18, h, m).getTime();
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
const file = (p: string, status: FileChange["status"] = "modified", added = 2, deleted = 1, binary = false): FileChange => ({ path: p, status, added, deleted, binary });
const okRange = (files: FileChange[], toWorkingTree = false): RangeResult => ({ ok: true, files, truncated: false, toWorkingTree });

interface Api {
  changesState: ReturnType<typeof vi.fn>;
  onChangesChanged: ReturnType<typeof vi.fn>;
  changesLive: ReturnType<typeof vi.fn>;
  changesRange: ReturnType<typeof vi.fn>;
  changesDiff: ReturnType<typeof vi.fn>;
  changesCheckpoint: ReturnType<typeof vi.fn>;
  changesAccept: ReturnType<typeof vi.fn>;
  changesPrepareRevert: ReturnType<typeof vi.fn>;
  changesRevert: ReturnType<typeof vi.fn>;
}
let api: Api;
let prevApi: unknown;
const state = (over: Partial<ChangesState> = {}): ChangesState => ({ workspaceId: "a", repo: "ok", checkpoints: [], expired: [], ...over });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(NOW);
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    changesState: vi.fn(async () => state()),
    onChangesChanged: vi.fn(() => () => {}),
    changesLive: vi.fn(async () => okRange([], true)),
    changesRange: vi.fn(async () => okRange([])),
    changesDiff: vi.fn(async (): Promise<DiffResult> => ({ ok: true, diff: { kind: "text", lines: [], truncated: false } })),
    changesCheckpoint: vi.fn(async () => ({ ok: true, id: "yeni" })),
    changesAccept: vi.fn(async () => ({ ok: true })),
    changesPrepareRevert: vi.fn(),
    changesRevert: vi.fn()
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

async function setup({ visible = true, language = "tr" as "tr" | "en" } = {}) {
  const commands = commandsMock();
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible, workspaces: [ws], activeWorkspaceId: "a" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <ChangesView workspace={ws} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  await flush();
  return { commands };
}

describe("görünüm kaydı", () => {
  it("readWorkspaceView changes'i kabul ediyor; indirgeyici kaydediyor", () => {
    expect(readWorkspaceView("changes")).toBe("changes");
    const ready = { ...initialTerminalState, phase: "ready" as const, workspaces: [{ ...ws, view: undefined }], activeWorkspaceId: "a" };
    const next = terminalReducer(ready, { type: "setWorkspaceView", id: "a", view: "changes" });
    expect(next.workspaces[0].view).toBe("changes");
    expect(toSaved(next).workspaces[0].view).toBe("changes");
  });
});

describe("depo durumu (spec §2, §8)", () => {
  it("depo değil: açık mesaj; liste ve Canlı yoklaması yok", async () => {
    api.changesState.mockResolvedValue(state({ repo: "notRepo" }));
    await setup();
    expect(screen.getByText("Bu klasör bir Git deposu değil; değişiklik izleme yalnız Git depolarında çalışır.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Geri alma noktaları" })).toBeNull();
    expect(api.changesLive).not.toHaveBeenCalled();
  });

  it("git yok ve klasör yok mesajları", async () => {
    api.changesState.mockResolvedValue(state({ repo: "noGit" }));
    await setup();
    expect(screen.getByText(/Git bulunamadı/)).toBeTruthy();
    cleanup();
    api.changesState.mockResolvedValue(state({ repo: "missingDir" }));
    await setup();
    expect(screen.getByText("Alanın klasörü bulunamadı.")).toBeTruthy();
  });
});

describe("liste (spec §5)", () => {
  it("yeniden eskiye; Canlı üstte; saat, ajan, etiket, sayılar, durum; geri alma öncesi ve süresi dolmuş; N bekliyor", async () => {
    api.changesState.mockResolvedValue(
      state({
        checkpoints: [
          cp("c1", at(9, 5), { stats: { files: 2, added: 5, deleted: 1 } }),
          cp("c2", at(9, 30), { reason: "beforeRestore", label: "istem c1", paneId: null, agentName: null, stats: { files: 0, added: 0, deleted: 0 } }),
          cp("c3", at(10, 0), { reviewed: "accepted", label: "", reason: "manual", paneId: null, agentName: null })
        ],
        expired: ["c1"]
      })
    );
    api.changesLive.mockResolvedValue(okRange([file("a.ts", "modified", 3, 0), file("b.ts", "added", 1, 0)], true));
    await setup();
    const list = screen.getByRole("list", { name: "Geri alma noktaları" });
    const rows = within(list).getAllByRole("button");
    expect(rows[0].hasAttribute("data-live-row")).toBe(true);
    expect(rows.slice(1).map((r) => r.getAttribute("data-checkpoint"))).toEqual(["c3", "c2", "c1"]);
    expect(rows[0].textContent).toContain("Canlı");
    expect(rows[0].textContent).toContain("2 dosya");
    expect(rows[1].textContent).toContain("Elle geri alma noktası");
    expect(rows[1].textContent).toContain("Kabul edildi");
    expect(rows[1].textContent).toContain("2 dosya");
    expect(rows[2].textContent).toContain("Geri almadan önce · istem c1");
    expect(rows[3].textContent).toContain("09:05");
    expect(rows[3].textContent).toContain("Ayşe");
    expect(rows[3].textContent).toContain("Süresi doldu");
    expect(rows[3].textContent).toContain("+5");
    expect(document.querySelector("[data-pending-count]")?.textContent).toBe("1 bekliyor");
  });

  it("uyarı satırı: son görüntü alınamadı", async () => {
    api.changesState.mockResolvedValue(state({ warning: { code: "locked", at: NOW } }));
    await setup();
    expect(document.querySelector("[data-warning]")?.textContent).toContain("Git index'i kilitli");
  });

  it("olay gelince liste güncelleniyor", async () => {
    let push: (s: ChangesState) => void = () => {};
    api.onChangesChanged.mockImplementation((cb: (s: ChangesState) => void) => {
      push = cb;
      return () => {};
    });
    await setup();
    act(() => push(state({ checkpoints: [cp("c1", at(9, 0))] })));
    expect(document.querySelector('[data-checkpoint="c1"]')).toBeTruthy();
  });
});

describe("Canlı yoklaması (spec §5)", () => {
  it("görünürken hemen ve 3 sn'de bir; uçuştaki istek bitmeden ikincisi yok", async () => {
    let release: (r: RangeResult) => void = () => {};
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", at(9, 0))] }));
    api.changesLive.mockImplementation(() => new Promise<RangeResult>((r) => (release = r)));
    await setup();
    expect(api.changesLive).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(3_000));
    expect(api.changesLive).toHaveBeenCalledTimes(1);
    await act(async () => release(okRange([], true)));
    await act(async () => vi.advanceTimersByTime(3_000));
    expect(api.changesLive).toHaveBeenCalledTimes(2);
  });

  it("görünmezken (Ajanlar ekranı kapalı) hiç yoklama yok", async () => {
    await setup({ visible: false });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(api.changesLive).not.toHaveBeenCalled();
  });
});

describe("aralık ve diff (spec §5)", () => {
  const twoRecords = () => state({ checkpoints: [cp("c1", at(9, 0)), cp("c2", at(9, 30))] });

  it("eski kayıt seçince aralık isteniyor; dosyaya tıklayınca satır numaralı diff; ikili ve büyük dosya notu", async () => {
    api.changesState.mockResolvedValue(twoRecords());
    api.changesRange.mockResolvedValue(okRange([file("a.ts"), file("logo.png", "added", 0, 0, true), file("büyük.txt")]));
    await setup();
    fireEvent.click(document.querySelector('[data-checkpoint="c1"]')!);
    await flush();
    expect(api.changesRange).toHaveBeenCalledWith("a", "c1");
    api.changesDiff.mockResolvedValueOnce({
      ok: true,
      diff: {
        kind: "text",
        truncated: true,
        lines: [
          { kind: "hunk", oldNo: null, newNo: null, text: "@@ -1,2 +1,2 @@" },
          { kind: "context", oldNo: 1, newNo: 1, text: "bir" },
          { kind: "del", oldNo: 2, newNo: null, text: "iki" },
          { kind: "add", oldNo: null, newNo: 2, text: "İKİ" }
        ]
      }
    });
    fireEvent.click(document.querySelector('[data-file="a.ts"]')!);
    await flush();
    expect(api.changesDiff).toHaveBeenCalledWith("a", "c1", "a.ts");
    const rows = [...document.querySelectorAll("[data-line-kind]")];
    expect(rows.map((r) => r.getAttribute("data-line-kind"))).toEqual(["hunk", "context", "del", "add"]);
    expect(rows[2].textContent).toContain("2");
    expect(rows[2].textContent).toContain("iki");
    expect(rows[2].className).toContain("--status-danger-bg");
    expect(rows[3].className).toContain("--status-success-bg");
    expect(document.querySelector('[data-diff-note="truncated"]')).toBeTruthy();
    api.changesDiff.mockResolvedValueOnce({ ok: true, diff: { kind: "binary" } });
    fireEvent.click(document.querySelector('[data-file="logo.png"]')!);
    await flush();
    expect(screen.getByText("İkili dosya değişti.")).toBeTruthy();
    api.changesDiff.mockResolvedValueOnce({ ok: true, diff: { kind: "large" } });
    fireEvent.click(document.querySelector('[data-file="büyük.txt"]')!);
    await flush();
    expect(screen.getByText(/Büyük dosya değişti/)).toBeTruthy();
  });

  it("en son kayıt Canlı sonucunu kullanıyor: ayrı aralık isteği yok, diff o kaydın kimliğiyle", async () => {
    api.changesState.mockResolvedValue(twoRecords());
    api.changesLive.mockResolvedValue(okRange([file("c.ts")], true));
    await setup();
    fireEvent.click(document.querySelector('[data-checkpoint="c2"]')!);
    await flush();
    expect(api.changesRange).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('[data-file="c.ts"]')!);
    await flush();
    expect(api.changesDiff).toHaveBeenCalledWith("a", "c2", "c.ts");
  });

  it("aralık hatası (süresi doldu) açık mesaj", async () => {
    api.changesState.mockResolvedValue(twoRecords());
    api.changesRange.mockResolvedValue({ ok: false, reason: "expired" });
    await setup();
    fireEvent.click(document.querySelector('[data-checkpoint="c1"]')!);
    await flush();
    expect(screen.getByText(/Bu kaydın süresi doldu/)).toBeTruthy();
  });

  it("kayıt yokken Canlı: ipucu", async () => {
    api.changesLive.mockResolvedValue({ ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true });
    await setup();
    expect(screen.getAllByText(/Henüz geri alma noktası yok/).length).toBeGreaterThan(0);
  });
});

describe("düğmeler", () => {
  it("Geri alma noktası oluştur: çift tıklama tek istek; hata mesajı", async () => {
    let release: (r: unknown) => void = () => {};
    api.changesCheckpoint.mockImplementation(() => new Promise((r) => (release = r)));
    await setup();
    const button = screen.getByRole("button", { name: "Geri alma noktası oluştur" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.changesCheckpoint).toHaveBeenCalledTimes(1);
    await act(async () => release({ ok: false, reason: "locked" }));
    expect(screen.getByRole("alert").textContent).toContain("Git index'i kilitli");
  });

  it("Terminale git: Bölmeler'e geçip bölmeyi öne getiriyor; Canlı seçiliyken düğme yok", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", at(9, 0)), cp("c2", at(9, 30))] }));
    const { commands } = await setup();
    expect(within(document.querySelector("[data-actions]") as HTMLElement).queryByRole("button")).toBeNull();
    fireEvent.click(document.querySelector('[data-checkpoint="c1"]')!);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "panes");
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
  });

  it("en: metinler İngilizce", async () => {
    await setup({ language: "en" });
    expect(screen.getByRole("button", { name: "Create restore point" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Changes view" })).toBeTruthy();
  });
});

describe("renk kuralı", () => {
  it("src/changes altında hex, rgb/hsl, lime sınıfı ve uydurma --status-error yok", () => {
    const dir = path.join(__dirname, "..", "src", "changes");
    for (const name of readdirSync(dir)) {
      const source = readFileSync(path.join(dir, name), "utf8");
      expect(source, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\blime-\d|--status-error/);
    }
  });
});
