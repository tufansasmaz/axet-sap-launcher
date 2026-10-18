// @vitest-environment jsdom
// Bellek görünümü (spec 2026-10-18 ajanlar-ux §5): ajan seç, belleği
// görüntüle/düzenle/kaydet/at; başka ajana geçince taslak; bellekte arama;
// bellek kapalı ajan; hiç ajan yokken çağrı.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import MemoryView, { searchMemories } from "../src/agents/MemoryView";
import { clearDraftStoreForTest } from "../src/agents/memoryEditor";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";

const files: Record<string, string> = {};
let read: ReturnType<typeof vi.fn>;
let write: ReturnType<typeof vi.fn>;
beforeEach(() => {
  clearDraftStoreForTest();
  files.a = "# Ayşe\n- Sepet sınırı: en çok 9\n";
  files.b = "# Mehmet\n- Rapor biçimi PDF\n";
  read = vi.fn(async (_w: string, paneId: string) => ({ ok: true, content: files[paneId], rel: `.axet/memory/${paneId}.md`, stamp: `s-${paneId}`, notice: "ok" }));
  write = vi.fn(async (_w: string, paneId: string, text: string) => {
    files[paneId] = text;
    return { ok: true, stamp: `s2-${paneId}` };
  });
  (window as unknown as { api: unknown }).api = { memoryRead: read, memoryWrite: write, memoryRenotify: vi.fn(async () => true), memoryReveal: vi.fn(async () => true) };
});
afterEach(cleanup);

const pane = (id: string, title: string, memory = true): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "Test", roleKind: "custom", ...(memory ? { memory: `mem-${id}` } : {}) },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title
});

function setup(panes: TerminalPane[]) {
  const ws: TerminalWorkspace = { id: "w1", name: "w1", panes, focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, view: "memory" };
  const commands = { enablePaneMemory: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <MemoryView workspace={ws} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

const editor = (name: string) => screen.getByRole("textbox", { name: `${name} — kalıcı bellek` }) as HTMLTextAreaElement;

describe("MemoryView", () => {
  it("ilk ajan seçili; belleği görünüyor; başka ajan seçilince onunki", async () => {
    setup([pane("a", "Ayşe"), pane("b", "Mehmet")]);
    await flush();
    expect(editor("Ayşe").value).toBe(files.a);
    expect(read).toHaveBeenCalledWith("w1", "a");
    fireEvent.click(document.querySelector('[data-memory-agent="b"]') as HTMLElement);
    await flush();
    expect(editor("Mehmet").value).toBe(files.b);
    expect(document.querySelector('[data-memory-agent="b"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("düzenle → 'kaydedilmedi'; Kaydet okunduğu andaki özetle yazıyor, 'Kaydedildi'; düzenleyici açık kalıyor", async () => {
    setup([pane("a", "Ayşe")]);
    await flush();
    const save = screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(editor("Ayşe"), { target: { value: "# Ayşe\n- yeni karar\n" } });
    expect(screen.getByText("kaydedilmedi")).toBeTruthy();
    fireEvent.click(save);
    await flush();
    expect(write).toHaveBeenCalledWith("w1", "a", "# Ayşe\n- yeni karar\n", "s-a");
    expect(screen.getByRole("status").textContent).toContain("Kaydedildi");
    expect(editor("Ayşe").value).toBe("# Ayşe\n- yeni karar\n");
    // İkinci kayıt yeni özetle.
    fireEvent.change(editor("Ayşe"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await flush();
    expect(write).toHaveBeenLastCalledWith("w1", "a", "x", "s2-a");
  });

  it("'Değişiklikleri at' metni diskteki hâline döndürüyor; hiçbir şey yazılmıyor", async () => {
    setup([pane("a", "Ayşe")]);
    await flush();
    fireEvent.change(editor("Ayşe"), { target: { value: "çöp" } });
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri at" }));
    expect(editor("Ayşe").value).toBe(files.a);
    expect(write).not.toHaveBeenCalled();
    expect(screen.queryByText("kaydedilmedi")).toBeNull();
  });

  it("kirliyken başka ajana geçince taslak saklanıyor; geri dönünce metin ve 'geri getirildi' notu", async () => {
    setup([pane("a", "Ayşe"), pane("b", "Mehmet")]);
    await flush();
    fireEvent.change(editor("Ayşe"), { target: { value: "yarım taslak" } });
    fireEvent.click(document.querySelector('[data-memory-agent="b"]') as HTMLElement);
    await flush();
    expect(document.querySelector('[data-memory-agent="a"]')?.textContent).toContain("kaydedilmedi");
    fireEvent.click(document.querySelector('[data-memory-agent="a"]') as HTMLElement);
    await flush();
    expect(editor("Ayşe").value).toBe("yarım taslak");
    expect(screen.getByText(/Kaydedilmemiş taslak|taslak/i)).toBeTruthy();
  });

  it("bellek kapalı ajan: açıklama ve 'Belleği etkinleştir'", async () => {
    const commands = setup([pane("a", "Ayşe", false)]);
    await flush();
    expect(document.querySelector('[data-memory-agent="a"]')?.textContent).toContain("Bellek kapalı");
    expect(read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Belleği etkinleştir" }));
    expect(commands.enablePaneMemory).toHaveBeenCalledWith("a");
  });

  it("bellekte arama: eşleşen satır ve ajan; tık o ajanı seçiyor; sonuç yoksa söylüyor", async () => {
    setup([pane("a", "Ayşe"), pane("b", "Mehmet")]);
    await flush();
    fireEvent.change(screen.getByRole("searchbox", { name: "Bellekte ara" }), { target: { value: "pdf" } });
    await flush();
    const hit = document.querySelector('[data-memory-hit="b"]') as HTMLElement;
    expect(hit.textContent).toContain("Mehmet");
    expect(hit.textContent).toContain("Rapor biçimi PDF");
    fireEvent.click(hit);
    await flush();
    expect(editor("Mehmet")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Bellekte ara" }), { target: { value: "yok-böyle-bir-şey" } });
    await flush();
    expect(screen.getByText("Bellekte bulunamadı")).toBeTruthy();
  });

  it("hiç ajan yokken: açıklama ve 'İlk ajanını ekle' ekle isteği", () => {
    const heard = vi.fn();
    window.addEventListener("ntt:add-agent", heard);
    setup([]);
    expect(screen.getByText("Bellek tutacak ajan yok")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İlk ajanını ekle" }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener("ntt:add-agent", heard);
  });
});

describe("searchMemories", () => {
  it("büyük/küçük harf duyarsız; ajan başına en çok 3 satır; boş sorgu boş", () => {
    const hits = searchMemories({ a: "Bir\nbir iki\nBİR üç\nbir dört\nbeş", b: "yok" }, "bir");
    expect(hits.map((h) => h.line)).toEqual(["Bir", "bir iki", "bir dört"]);
    expect(hits.every((h) => h.paneId === "a")).toBe(true);
    expect(searchMemories({ a: "x" }, "  ")).toEqual([]);
  });
});
