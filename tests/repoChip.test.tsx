// @vitest-environment jsdom
// Üst şeritteki proje klasörü çipi: ekibin kökü = ajanların/kabukların klasörü
// ve Değişiklikler'in deposu. Seçili değilse "Proje klasörü seç"; seçiliyse çipe
// tıklayınca küçük panel: tam yol, durum satırı, eylemler (başka klasör, Gezgin,
// bağı kaldır) ve duruma göre yardım (git init / git kurulumu / klasör yok).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import RepoChip from "../src/agents/RepoChip";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

let repo = "ok";
let api: Record<string, ReturnType<typeof vi.fn>>;
let changed: ((s: unknown) => void) | null;
beforeEach(() => {
  repo = "ok";
  changed = null;
  api = {
    pickFolder: vi.fn(async () => "C:\\proje\\satis"),
    changesState: vi.fn(async (id: string) => ({ workspaceId: id, repo, checkpoints: [], expired: [] })),
    onChangesChanged: vi.fn((cb: (s: unknown) => void) => {
      changed = cb;
      return () => {};
    }),
    changesInitRepo: vi.fn(async () => {
      repo = "ok";
      return { ok: true };
    }),
    changesOpenRoot: vi.fn(async () => true),
    writeClipboard: vi.fn(async () => ({ ok: true })),
    openExternalUrl: vi.fn(async () => ({ ok: true }))
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

function setup(root?: string) {
  const ws = (r?: string): TerminalWorkspace => ({ id: "w1", name: "Satış", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, ...(r ? { root: r } : {}) });
  const commands = { setWorkspaceRoot: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws(root)], activeWorkspaceId: "w1" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const ui = (r?: string) => (
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <RepoChip workspace={ws(r)} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const view = render(ui(root));
  return { commands, rerender: (r?: string) => view.rerender(ui(r)) };
}

const chipState = () => document.querySelector("[data-repo-chip]")?.getAttribute("data-repo-chip");
const chipButton = () => screen.getByRole("button", { name: /^Proje klasörü: / });
const openPanel = async () => {
  fireEvent.click(chipButton());
  await flush();
  return screen.getByRole("dialog", { name: "Proje klasörü" });
};

describe("RepoChip", () => {
  it("seçili değil: 'Proje klasörü seç' + sade ipucu → klasör seç → ekibin kökü olur (SAP bağı düşer)", async () => {
    const { commands } = setup();
    const button = screen.getByRole("button", { name: "Proje klasörü seç" });
    expect(button.getAttribute("title")).toContain("Ajanlar ve kabuklar bu klasörde çalışır.");
    expect(button.getAttribute("title")).toContain("C:\\axet");
    fireEvent.click(button);
    await flush();
    expect(commands.setWorkspaceRoot).toHaveBeenCalledWith("w1", "C:\\proje\\satis", null);
  });

  it("git deposu: nötr çip; panelde tam yol, durum satırı, Gezgin ve bağı kaldır", async () => {
    const { commands } = setup("C:\\proje\\satis");
    await flush();
    expect(chipState()).toBe("ok");
    const panel = await openPanel();
    expect(panel.textContent).toContain("C:\\proje\\satis");
    expect(panel.textContent).toContain("Git deposu — değişiklikler izleniyor");
    expect(screen.queryByRole("button", { name: "Git deposu başlat" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Klasörü Gezgin'de aç" }));
    expect(api.changesOpenRoot).toHaveBeenCalledWith("w1");
    fireEvent.click(screen.getByRole("button", { name: "Bağı kaldır" }));
    expect(commands.setWorkspaceRoot).toHaveBeenCalledWith("w1", null, null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("panel Esc ve dış tıkla kapanıyor; Esc odağı çipe geri veriyor", async () => {
    setup("C:\\proje\\satis");
    await flush();
    const panel = await openPanel();
    expect(panel.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(chipButton());
    await openPanel();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("git deposu değil: açıklama + 'Git deposu başlat' → initRepo → durum yeniden soruluyor", async () => {
    repo = "notRepo";
    setup("C:\\belgeler");
    await flush();
    expect(chipState()).toBe("warning");
    expect(screen.getByText("Git deposu değil")).toBeTruthy();
    const panel = await openPanel();
    expect(panel.textContent).toContain("Bu klasör henüz git deposu değil. Ajanlar yine çalışır; yalnız Değişiklikler sekmesi için git gerekir.");
    const calls = api.changesState.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Git deposu başlat" }));
    await flush();
    expect(api.changesInitRepo).toHaveBeenCalledWith("w1");
    expect(api.changesState.mock.calls.length).toBeGreaterThan(calls);
    expect(chipState()).toBe("ok");
    expect(screen.getByRole("dialog").textContent).toContain("Git deposu — değişiklikler izleniyor");
  });

  it("git init başarısızsa anlaşılır hata", async () => {
    repo = "notRepo";
    api.changesInitRepo.mockResolvedValueOnce({ ok: false, reason: "git" });
    setup("C:\\belgeler");
    await flush();
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Git deposu başlat" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toContain("Git deposu başlatılamadı");
  });

  it("git kurulu değil: kurulum komutu ve kopyala düğmesi", async () => {
    repo = "noGit";
    setup("C:\\proje\\satis");
    await flush();
    const panel = await openPanel();
    expect(panel.textContent).toContain("Bilgisayarda git kurulu değil");
    expect(panel.textContent).toContain("winget install Git.Git");
    fireEvent.click(screen.getByRole("button", { name: "Komutu kopyala" }));
    await flush();
    expect(api.writeClipboard).toHaveBeenCalledWith("winget install Git.Git");
  });

  it("klasör bulunamadı: açıklama + 'Başka klasör seç'; Gezgin düğmesi yok", async () => {
    repo = "missingDir";
    const { commands } = setup("C:\\silindi");
    await flush();
    const panel = await openPanel();
    expect(panel.textContent).toContain("Klasör bulunamadı (silinmiş/taşınmış olabilir)");
    expect(screen.queryByRole("button", { name: "Klasörü Gezgin'de aç" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Başka klasör seç" }));
    await flush();
    expect(commands.setWorkspaceRoot).toHaveBeenCalledWith("w1", "C:\\proje\\satis", null);
  });

  it("klasör değişince çip hemen yeni adı ve 'kontrol ediliyor…' gösteriyor; eski uyarı taşınmıyor", async () => {
    vi.useFakeTimers();
    repo = "notRepo";
    const { rerender } = setup("C:\\belgeler");
    await flush();
    expect(chipState()).toBe("warning");
    repo = "ok";
    rerender("C:\\proje\\satis");
    expect(screen.getByRole("button", { name: "Proje klasörü: satis" })).toBeTruthy();
    expect(chipState()).toBe("checking");
    expect(screen.getByText("Kontrol ediliyor…")).toBeTruthy();
    expect(screen.queryByText("Git deposu değil")).toBeNull();
    // Kontrol sürerken gelen (eski kökün) yayını yeni klasöre yazılmıyor.
    act(() => changed?.({ workspaceId: "w1", repo: "notRepo", checkpoints: [], expired: [] }));
    expect(chipState()).toBe("checking");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await flush();
    expect(chipState()).toBe("ok");
  });
});
