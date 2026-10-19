// @vitest-environment jsdom
// Bellek — ikinci beyin (Tur 5): harita düğümleri, seç → ayrıntı, düzenle/kaydet,
// yeni not, süzgeç, arama, liste klavyesi, graf klavyesi, Dosyalar (eski görünüm).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import MemoryBrain from "../src/agents/brain/MemoryBrain";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { applyPatch, createNote, type MemoryNote } from "../app-electron/shared/memoryNotes";

let notes: MemoryNote[];
let api: Record<string, ReturnType<typeof vi.fn>>;
let changed: ((id: string) => void) | null;

beforeEach(() => {
  let seq = 0;
  const mk = (title: string, over: Partial<MemoryNote> = {}) => ({ ...createNote({ title }, 1_000 + ++seq, `n-t${String(seq).padStart(4, "0")}`)!, ...over });
  notes = [
    mk("Fatura akışı", { kind: "karar", body: "Onay iki adımlı. Bkz. [[Ödeme adımları]]", tags: ["fi"] }),
    mk("Ödeme adımları", { kind: "olgu", owner: "a", ownerName: "Ayşe", tags: ["fi"] }),
    mk("Stok önbelleği", { kind: "ogrenim", body: "60 sn", owner: "b" })
  ];
  changed = null;
  api = {
    notesList: vi.fn(async () => notes.map((n) => ({ ...n }))),
    notesAdd: vi.fn(async (_w: string, input: Parameters<typeof createNote>[0]) => {
      const note = createNote(input, 9_000, "n-new0001")!;
      notes.push(note);
      return { ok: true, note };
    }),
    notesUpdate: vi.fn(async (_w: string, id: string, patch: object, expected?: number) => {
      const at = notes.findIndex((n) => n.id === id);
      if (expected !== undefined && notes[at].updated !== expected) return { ok: false, reason: "changed" };
      notes[at] = applyPatch(notes[at], patch, 9_500)!;
      return { ok: true, note: notes[at] };
    }),
    notesRemove: vi.fn(async (_w: string, id: string) => {
      notes = notes.filter((n) => n.id !== id);
      return true;
    }),
    onNotesChanged: vi.fn((cb: (id: string) => void) => {
      changed = cb;
      return () => undefined;
    }),
    memoryRead: vi.fn(async () => ({ ok: true, content: "# Ayşe\n- eski bellek", rel: "x.md", stamp: "s", notice: "sent" }))
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(cleanup);

const pane = (id: string, title: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "Test", roleKind: "custom", memory: `mem-${id}` },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title
});

function setup() {
  const ws: TerminalWorkspace = { id: "w1", name: "Ekip", panes: [pane("a", "Ayşe"), pane("b", "Mehmet")], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, view: "memory" };
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
    commands: { enablePaneMemory: vi.fn() } as unknown as TerminalCommands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a",
    setupRuns: {}
  };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <MemoryBrain workspace={ws} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

const node = (label: RegExp) => screen.getByRole("button", { name: label });

describe("MemoryBrain — harita", () => {
  it("not, ajan, ekip ve ortak etiket düğümleri aria etiketleriyle; sayaç", async () => {
    setup();
    await flush();
    expect(screen.getByText("3 not")).toBeTruthy();
    expect(node(/^Karar notu: Fatura akışı, 3 bağlantı$/)).toBeTruthy();
    expect(node(/^Ajan Ayşe: 1 not$/)).toBeTruthy();
    expect(node(/^Ekip belleği: 1 not$/)).toBeTruthy();
    expect(node(/^Etiket #fi: 2 not$/)).toBeTruthy();
    // Gezici tabindex: yalnız bir düğüm Tab sırasında.
    const focusable = document.querySelectorAll('[data-node][tabindex="0"]');
    expect(focusable).toHaveLength(1);
  });

  it("düğüme tık → ayrıntı; [[bağlantı]] tıklanınca o not; geri bağlantılar", async () => {
    setup();
    await flush();
    fireEvent.click(node(/Fatura akışı/));
    const detail = document.querySelector("[data-note-detail]") as HTMLElement;
    expect(within(detail).getByRole("heading", { name: "Fatura akışı" })).toBeTruthy();
    fireEvent.click(within(detail.querySelector("[data-note-body]") as HTMLElement).getByRole("button", { name: "Ödeme adımları" }));
    const next = document.querySelector("[data-note-detail]") as HTMLElement;
    expect(within(next).getByRole("heading", { name: "Ödeme adımları" })).toBeTruthy();
    expect(next.textContent).toContain("Geri bağlantılar 1");
    expect(within(next).getByRole("button", { name: "Fatura akışı" })).toBeTruthy();
  });

  it("düzenle → kaydet: beklenen güncelleme tarihiyle; çakışmada metin kalır ve uyarı", async () => {
    setup();
    await flush();
    fireEvent.click(node(/Stok önbelleği/));
    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));
    const form = screen.getByRole("form", { name: "Düzenle" });
    fireEvent.change(within(form).getByLabelText("Başlık"), { target: { value: "Stok önbelleği 60 sn" } });
    fireEvent.change(within(form).getByLabelText("Etiketler (virgülle)"), { target: { value: "Stok, #cache" } });
    fireEvent.click(within(form).getByRole("button", { name: "Kaydet" }));
    await flush();
    expect(api.notesUpdate).toHaveBeenCalledWith("w1", notes[2].id, expect.objectContaining({ title: "Stok önbelleği 60 sn", tags: ["stok", "cache"], owner: "b" }), 1_003);
    expect(screen.getByRole("heading", { name: "Stok önbelleği 60 sn" })).toBeTruthy();

    // Çakışma: ajan o arada yazdı.
    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));
    notes[2] = { ...notes[2], updated: 99_999 };
    const again = screen.getByRole("form", { name: "Düzenle" });
    fireEvent.change(within(again).getByLabelText("Not"), { target: { value: "benim metnim" } });
    fireEvent.click(within(again).getByRole("button", { name: "Kaydet" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toContain("bu arada değişti");
    expect((within(screen.getByRole("form", { name: "Düzenle" })).getByLabelText("Not") as HTMLTextAreaElement).value).toBe("benim metnim");
  });

  it("yeni not: ekip belleğine, kaynak kullanıcı; sonra ayrıntıda açılır", async () => {
    setup();
    await flush();
    fireEvent.click(screen.getAllByRole("button", { name: "Yeni not" })[0]);
    const form = screen.getByRole("form", { name: "Yeni not" });
    fireEvent.change(within(form).getByLabelText("Başlık"), { target: { value: "SAP sistemi DS4" } });
    fireEvent.change(within(form).getByLabelText("Tür"), { target: { value: "kisi" } });
    fireEvent.click(within(form).getByRole("button", { name: "Kaydet" }));
    await flush();
    expect(api.notesAdd).toHaveBeenCalledWith("w1", expect.objectContaining({ title: "SAP sistemi DS4", kind: "kisi", owner: "", source: { type: "user" } }));
    expect(screen.getByRole("heading", { name: "SAP sistemi DS4" })).toBeTruthy();
  });

  it("boş başlık kaydedilmez", async () => {
    setup();
    await flush();
    fireEvent.click(screen.getAllByRole("button", { name: "Yeni not" })[0]);
    fireEvent.click(within(screen.getByRole("form", { name: "Yeni not" })).getByRole("button", { name: "Kaydet" }));
    await flush();
    expect(api.notesAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Başlık boş olamaz.");
  });

  it("süzgeç: tür çipi eşleşmeyeni soldurur; lejantta ajan seçimi", async () => {
    setup();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Süzgeç" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Tür" })).getByRole("button", { name: "Karar" }));
    const opacity = (label: RegExp) => node(label).getAttribute("opacity");
    expect(opacity(/Fatura akışı/)).toBe("1");
    expect(opacity(/Stok önbelleği/)).toBe("0.12");
    fireEvent.click(screen.getByRole("button", { name: "Süzgeci temizle" }));
    const legend = document.querySelector("[data-brain-legend]") as HTMLElement;
    fireEvent.click(within(legend).getByRole("button", { name: /Mehmet/ }));
    expect(opacity(/Stok önbelleği/)).toBe("1");
    expect(opacity(/Fatura akışı/)).toBe("0.12");
  });

  it("arama: sonuç kutusu, sayı, tık notu açar", async () => {
    setup();
    await flush();
    fireEvent.change(screen.getByRole("searchbox", { name: "Notlarda ara" }), { target: { value: "onay" } });
    const results = screen.getByRole("region", { name: "Notlarda ara" });
    expect(results.textContent).toContain("1 sonuç");
    fireEvent.click(within(results).getByRole("button", { name: /Fatura akışı/ }));
    expect(document.querySelector("[data-note-detail]")?.textContent).toContain("Fatura akışı");
  });

  it("graf klavyesi: Enter seçer, Esc bırakır", async () => {
    setup();
    await flush();
    const first = document.querySelector('[data-node][tabindex="0"]') as SVGGElement;
    fireEvent.keyDown(first, { key: "Enter" });
    expect(first.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(first, { key: "Escape" });
    expect(first.getAttribute("aria-pressed")).toBe("false");
  });

  it("ajan belleğe yazınca (notes:changed) liste yenilenir", async () => {
    setup();
    await flush();
    notes.push(createNote({ title: "Ajanın yeni notu" }, 5_000, "n-agent01")!);
    await act(async () => changed?.("w1"));
    await flush();
    expect(screen.getByText("4 not")).toBeTruthy();
  });
});

describe("MemoryBrain — liste ve dosyalar", () => {
  it("liste: son güncellenen önce; ↓ odağı taşır, Enter açar", async () => {
    setup();
    await flush();
    fireEvent.click(screen.getByRole("tab", { name: "Liste" }));
    const list = screen.getByRole("list", { name: "Notlar" });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((r) => r.querySelector("span.block")?.textContent)).toEqual(["Stok önbelleği", "Ödeme adımları", "Fatura akışı"]);
    rows[0].focus();
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.click(rows[1]);
    expect(document.querySelector("[data-note-detail]")?.textContent).toContain("Ödeme adımları");
  });

  it("Dosyalar: eski ajan başına markdown belleği", async () => {
    setup();
    await flush();
    fireEvent.click(screen.getByRole("tab", { name: "Dosyalar" }));
    await flush();
    expect(api.memoryRead).toHaveBeenCalled();
  });

  it("boş bellek: açıklama ve Yeni not", async () => {
    notes = [];
    setup();
    await flush();
    expect(document.querySelector("[data-brain-empty]")?.textContent).toContain("İkinci beyin henüz boş");
  });
});
