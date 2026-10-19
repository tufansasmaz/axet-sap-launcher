// @vitest-environment jsdom
// Kendi kendine öğrenme: Öğren kutusu (kapsam, web aracı, klavye), görev
// durumları (bekliyor → çalışıyor → bitti), not sayımı, öneri, geri al,
// haritada/listede vurgu ve not kaynağı.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { LanguageProvider } from "../src/i18n";
import LearnPanel, { type LearnAgent } from "../src/agents/brain/LearnPanel";
import MemoryBrain from "../src/agents/brain/MemoryBrain";
import { EMPTY_LEARN, LEARN_STORAGE_KEY, LearnContext, LearnProvider } from "../src/agents/brain/learnContext";
import { AgentStatusContext } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import { createNote, type MemoryNote } from "../app-electron/shared/memoryNotes";

// Node 26 kendi localStorage'ını (dosyasız undefined) jsdom'unkinin üstüne koyuyor; bellekte basit depo.
const lsStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => lsStore.get(k) ?? null,
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
  clear: () => lsStore.clear()
});

let notes: MemoryNote[];
let api: Record<string, ReturnType<typeof vi.fn>>;
let record: ReturnType<typeof vi.fn>;
let setStatuses: (s: Record<string, AgentStatus>) => void;

beforeEach(() => {
  localStorage.clear();
  notes = [{ ...createNote({ title: "Eski not" }, 100, "n-old00001")! }];
  record = vi.fn();
  api = {
    notesList: vi.fn(async () => notes.map((n) => ({ ...n }))),
    notesRemove: vi.fn(async (_w: string, id: string) => {
      notes = notes.filter((n) => n.id !== id);
      return true;
    }),
    onNotesChanged: vi.fn(() => () => undefined),
    agentSend: vi.fn(async () => ({ ok: true }))
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(cleanup);

const agents: LearnAgent[] = [
  { id: "a", name: "Ayşe", engine: "axet-code" },
  { id: "c", name: "Kodcu", engine: "codex" }
];

function Harness({ children }: { children: ReactNode }) {
  const [statuses, set] = useState<Record<string, AgentStatus>>({});
  setStatuses = set;
  return (
    <LanguageProvider language="tr">
      <AgentStatusContext.Provider value={{ statuses, engines: null, now: 0, answer: async () => ({ ok: false, reason: "noAgent" }) }}>
        <FlowContext.Provider value={{ ...EMPTY_FLOW, record }}>
          <LearnProvider>{children}</LearnProvider>
        </FlowContext.Provider>
      </AgentStatusContext.Provider>
    </LanguageProvider>
  );
}

function setup() {
  render(
    <Harness>
      <LearnPanel workspaceId="w1" agents={agents} />
    </Harness>
  );
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

const status = (state: AgentStatus["state"], lastActivity: number, reply?: string): AgentStatus => ({ state, source: "exact", lastActivity, ...(reply ? { reply } : {}) });

async function learn(topic: string) {
  const input = screen.getByRole("textbox", { name: "Öğrenme konusu" });
  fireEvent.change(input, { target: { value: topic } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.submit(input.closest("form")!);
  await flush();
}

const taskRow = () => screen.getByRole("list", { name: "Öğrenme görevleri" }).querySelector("[data-learn-task]") as HTMLElement;

describe("Öğren kutusu", () => {
  it("Enter ile gönderir: istem konu ve görev kimliğini taşır, görev çalışıyor, Akış'a kart", async () => {
    setup();
    await learn("Kur farkı hesabı");
    expect(api.agentSend).toHaveBeenCalledTimes(1);
    const [ws, pane, prompt] = api.agentSend.mock.calls[0];
    expect([ws, pane]).toEqual(["w1", "a"]);
    expect(prompt).toContain("Kur farkı hesabı");
    expect(prompt).toMatch(/--gorev og-[a-z0-9]+/);
    expect(prompt).toMatch(/Web'e çıkma/);
    expect(taskRow().dataset.learnState).toBe("running");
    expect(within(taskRow()).getByText("çalışıyor")).toBeTruthy();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ kind: "learn", paneId: "a", detail: "Öğrenmeye başladı: Kur farkı hesabı" }));
    expect((screen.getByRole("textbox", { name: "Öğrenme konusu" }) as HTMLInputElement).value).toBe("");
  });

  it("boş konu ve kaynaksız görev gönderilmez, sebep yazılır", async () => {
    setup();
    fireEvent.submit(screen.getByRole("textbox", { name: "Öğrenme konusu" }).closest("form")!);
    await flush();
    expect(screen.getByRole("status").textContent).toBe("Bir konu yaz.");
    fireEvent.click(screen.getByRole("checkbox", { name: "Proje klasörü" }));
    await learn("x");
    expect(screen.getByRole("status").textContent).toBe("En az bir kaynak seç.");
    expect(api.agentSend).not.toHaveBeenCalled();
  });

  it("web seçeneği yalnız web aracı olan motorda; yoksa gizli ve ipucunda nedeni", async () => {
    setup();
    expect(screen.getByRole("checkbox", { name: "Web" })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Öğrenecek ajan" }), { target: { value: "c" } });
    expect(screen.queryByRole("checkbox", { name: "Web" })).toBeNull();
    expect(screen.getByText(/Codex motorunda web aracı yok/)).toBeTruthy();
    expect(screen.getByText(/SAP sistemlerine bağlanmaz/)).toBeTruthy();
  });

  it("web ve ekip seçilince istem onları anar; kendi belleği hedefse --ben", async () => {
    setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Web" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Ekip belleği ve Akış" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ajanın kendi belleği" }));
    await learn("y");
    const prompt = api.agentSend.mock.calls[0][2] as string;
    expect(prompt).toContain("URL");
    expect(prompt).toContain("ntt-team feed");
    expect(prompt).toContain("--ben");
  });
});

describe("öğrenme görevi durumu", () => {
  it("meşgul ajan: bekliyor + sebep; ajan boşalınca kendiliğinden gönderilir", async () => {
    api.agentSend.mockResolvedValueOnce({ ok: false, reason: "busy" });
    setup();
    await learn("Kapanış");
    expect(taskRow().dataset.learnState).toBe("waiting");
    expect(within(taskRow()).getByText("Ayşe meşgul; boşalınca kendiliğinden gönderilecek.")).toBeTruthy();
    act(() => setStatuses({ a: status("idle", 50) }));
    await flush();
    expect(api.agentSend).toHaveBeenCalledTimes(2);
    expect(taskRow().dataset.learnState).toBe("running");
  });

  it("bekleyen görev iptal edilir", async () => {
    api.agentSend.mockResolvedValueOnce({ ok: false, reason: "asking" });
    setup();
    await learn("Kapanış");
    fireEvent.click(within(taskRow()).getByRole("button", { name: "İptal" }));
    expect(screen.queryByRole("list", { name: "Öğrenme görevleri" })).toBeNull();
  });

  it("ajan çalışmıyorsa hata", async () => {
    api.agentSend.mockResolvedValueOnce({ ok: false, reason: "notRunning" });
    setup();
    await learn("Kapanış");
    expect(taskRow().dataset.learnState).toBe("error");
    expect(within(taskRow()).getByText("Ajan çalışmıyor ya da kapandı.")).toBeTruthy();
  });

  it("bitti: notlar sayılır, özet ve öneriler; öneri tek tıkla yeni görev; geri al onaylı (Esc vazgeçer)", async () => {
    setup();
    await learn("Kur farkı");
    const prompt = api.agentSend.mock.calls[0][2] as string;
    const id = /--gorev (og-[a-z0-9]+)/.exec(prompt)![1];
    act(() => setStatuses({ a: status("running", Date.now()) }));
    await flush();
    const now = Date.now();
    notes.push({ ...createNote({ title: "Kur farkı ayda bir", source: { type: "task", name: "Ayşe", ref: id } }, now, "n-new00001")! });
    notes[0] = { ...notes[0], updated: now, tasks: [id] };
    // Aynı ajan görev sürerken başka işte işaretsiz not yazdı: göreve sayılmaz, geri almada silinmez.
    notes.push({ ...createNote({ title: "Başka iş", source: { type: "agent", name: "Ayşe" } }, now + 1, "n-oth00001")! });
    act(() => setStatuses({ a: status("idle", now + 10, "OGRENME-OZET: Kur farkı ay sonunda. | SONRAKI: Değerleme; Kapanış") }));
    await flush();
    const row = taskRow();
    expect(row.dataset.learnState).toBe("done");
    expect(within(row).getByText(/\+1 yeni · 1 güncellendi/)).toBeTruthy();
    expect(within(row).getByText("Kur farkı ay sonunda.")).toBeTruthy();
    expect(record).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "learn", detail: "Öğrendi: Kur farkı · 1 yeni, 1 güncellendi" }));

    fireEvent.click(within(row).getByRole("button", { name: "Değerleme" }));
    await flush();
    expect(api.agentSend).toHaveBeenCalledTimes(2);
    expect(api.agentSend.mock.calls[1][2]).toContain("Değerleme");

    const done = screen.getByRole("list", { name: "Öğrenme görevleri" }).querySelector('[data-learn-state="done"]') as HTMLElement;
    fireEvent.click(within(done).getByRole("button", { name: /Geri al/ }));
    expect(within(done).getByText("Bu görevin eklediği 1 not silinsin mi?")).toBeTruthy();
    fireEvent.keyDown(within(done).getByRole("button", { name: "Sil" }), { key: "Escape" });
    expect(within(done).queryByText(/silinsin mi/)).toBeNull();
    fireEvent.click(within(done).getByRole("button", { name: /Geri al/ }));
    fireEvent.click(within(done).getByRole("button", { name: "Sil" }));
    await flush();
    expect(api.notesRemove).toHaveBeenCalledWith("w1", "n-new00001");
    expect(api.notesRemove).not.toHaveBeenCalledWith("w1", "n-oth00001");
    expect(within(done).getByText(/Geri alındı/)).toBeTruthy();
    expect(within(done).queryByRole("button", { name: /Geri al$/ })).toBeNull();
  });

  it("yeniden açılışta süresi dolmuş çalışan görev zaman aşımı; yeniden dene tekrar gönderir", async () => {
    const startedAt = Date.now() - 31 * 60_000;
    localStorage.setItem(
      LEARN_STORAGE_KEY,
      JSON.stringify([{ id: "og-eski0001", workspaceId: "w1", paneId: "a", agentName: "Ayşe", topic: "Yarım konu", scopes: ["project"], target: "team", state: "running", createdAt: startedAt, startedAt, added: [], updated: [] }])
    );
    setup();
    await flush();
    const row = taskRow();
    expect(row.dataset.learnState).toBe("timeout");
    expect(within(row).getByText("zaman aşımı")).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Yeniden dene" }));
    await flush();
    expect(api.agentSend).toHaveBeenCalledTimes(1);
    expect(api.agentSend.mock.calls[0][2]).toContain("og-eski0001");
    expect(taskRow().dataset.learnState).toBe("running");
  });

  it("görevler yeniden açılışta korunur", async () => {
    setup();
    await learn("Kalıcı konu");
    cleanup();
    expect(JSON.parse(localStorage.getItem(LEARN_STORAGE_KEY)!)[0].topic).toBe("Kalıcı konu");
    setup();
    expect(within(taskRow()).getByText("Kalıcı konu")).toBeTruthy();
  });
});

describe("Bellek görünümünde öğrenme", () => {
  function brain(value = EMPTY_LEARN) {
    const ws: TerminalWorkspace = {
      id: "w1",
      name: "Ekip",
      panes: [{ id: "a", kind: "agent", agent: { engine: "axet-code", role: "T", roleKind: "custom" }, cwd: "C:\\p", run: { state: "running", ptyId: "t-a" }, title: "Ayşe" }],
      focusedPaneId: null,
      maximizedPaneId: null,
      unread: false,
      error: false,
      view: "memory"
    };
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
      commands: {} as TerminalCommands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a"
    };
    render(
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store}>
          <LearnContext.Provider value={value}>
            <MemoryBrain workspace={ws} />
          </LearnContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  }

  it("Öğren kutusu Bellek'in altında; yeni notlar haritada ve listede vurgulu; kaynak öğrenme görevi", async () => {
    notes = [{ ...createNote({ title: "Öğrenilen", source: { type: "task", name: "Ayşe", ref: "og-abcd1234" } }, 100, "n-lrn00001")! }];
    brain({
      ...EMPTY_LEARN,
      highlight: { workspaceId: "w1", ids: new Set(["n-lrn00001"]) },
      tasks: [{ id: "og-abcd1234", workspaceId: "w1", paneId: "a", agentName: "Ayşe", topic: "Kur farkı", scopes: ["project"], target: "team", state: "done", createdAt: 1, added: ["n-lrn00001"], updated: [] }]
    });
    await flush();
    expect(document.querySelector("[data-learn-panel]")).toBeTruthy();
    expect(document.querySelector('[data-node="note:n-lrn00001"] [data-learn-highlight]')).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Liste" }));
    const list = screen.getByRole("list", { name: "Notlar" });
    expect(within(list).getByText("yeni")).toBeTruthy();
    fireEvent.click(within(list).getByRole("button", { name: /Öğrenilen/ }));
    expect(screen.getByText(/kaynak: öğrenme görevi «Kur farkı»/)).toBeTruthy();
  });
});
