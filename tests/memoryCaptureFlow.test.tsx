// @vitest-environment jsdom
// Tur 10, madde 8: Akış'tan belleğe otomatik yakalama (sağlayıcı + satır + geri al).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { LanguageProvider } from "../src/i18n";
import { CAPTURE_PER_HOUR, FlowProvider, captureToMemory, useFlow, type FlowValue } from "../src/agents/flowContext";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { MemoryNote, NoteInput } from "../app-electron/shared/memoryNotes";
import { AUTO_TAG } from "../app-electron/shared/memoryCapture";
import FlowSidebar from "../src/agents/FlowSidebar";

const WS = "w1";
const pane: TerminalPane = { id: "a", kind: "agent", agent: { engine: "claude", role: "", roleKind: "custom" }, cwd: "C:\\p", run: { state: "running", ptyId: "t" }, title: "Ayşe" };
const workspace: TerminalWorkspace = { id: WS, name: "Satış", panes: [pane], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false };

let notes: MemoryNote[];
let api: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  notes = [];
  let n = 0;
  api = {
    flowLoad: vi.fn(async () => []),
    flowSave: vi.fn(async () => true),
    notesList: vi.fn(async () => notes),
    notesAdd: vi.fn(async (_ws: string, input: NoteInput) => {
      const note: MemoryNote = { id: `n${++n}`, title: input.title, body: input.body ?? "", kind: "karar", tags: [...((input.tags as string[]) ?? [])], owner: "", created: 1, updated: 1 };
      notes.push(note);
      return { ok: true, note };
    }),
    notesUpdate: vi.fn(async (_ws: string, id: string, patch: Partial<MemoryNote>) => {
      const note = { ...notes.find((x) => x.id === id)!, ...patch, updated: 2 };
      notes = notes.map((x) => (x.id === id ? note : x));
      return { ok: true, note };
    }),
    notesRemove: vi.fn(async () => true),
    memoryRead: vi.fn(async () => ({ ok: false, reason: "invalid" }))
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(cleanup);

describe("captureToMemory", () => {
  it("ekliyor; aynı anlam ikinci kez güncelleniyor; sınır dolunca durmuyor değil, duruyor", async () => {
    const input = { source: "user" as const, text: "Bundan sonra tarih alanlarında ISO 8601 biçimini kullanacağız.", name: "Ayşe" };
    const first = await captureToMemory(WS, input, api as never, () => true);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ updated: false });
    expect(api.notesAdd.mock.calls[0][1]).toMatchObject({ kind: "karar", tags: [AUTO_TAG] });
    const second = await captureToMemory(WS, { ...input, text: "Bundan sonra tarih alanlarında hep ISO 8601 biçimini kullanacağız." }, api as never, () => true);
    expect(second[0]).toMatchObject({ updated: true });
    expect(await captureToMemory(WS, { ...input, text: "Asla canlı sistemde test verisi oluşturmayacağız, kural bu." }, api as never, () => false)).toEqual([]);
  });

  it("aday yoksa belleğe hiç dokunmuyor", async () => {
    expect(await captureToMemory(WS, { source: "user", text: "selam, nasılsın", name: "x" }, api as never, () => true)).toEqual([]);
    expect(api.notesList).not.toHaveBeenCalled();
  });
});

let current: FlowValue | null = null;
function Probe() {
  const flow = useFlow();
  useEffect(() => {
    current = flow;
  });
  return null;
}

function setup(autoCapture: boolean, withSidebar = false) {
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [workspace], activeWorkspaceId: WS },
    commands: { revealPane: vi.fn() } as unknown as TerminalCommands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a",
    setupRuns: {}
  };
  const value: AgentStatusValue = { statuses: {} as Record<string, AgentStatus>, engines: [], now: 1, answer: async () => ({ ok: false, reason: "noAgent" }) };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={value}>
          <FlowProvider autoCapture={autoCapture}>
            <Probe />
            {withSidebar && <FlowSidebar />}
          </FlowProvider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
}

describe("FlowProvider — otomatik yakalama", () => {
  const msg = { at: 20, workspaceId: WS, kind: "message" as const, paneId: "a", name: "Ayşe", detail: "Bundan sonra raporları her zaman PDF olarak saklayacağız, karar verdik." };

  it("kullanıcı mesajındaki karar belleğe ekleniyor ve Akış'ta 'Belleğe eklendi' olayı", async () => {
    setup(true);
    act(() => current!.record(msg));
    await waitFor(() => expect(current!.events.some((e) => e.kind === "memory" && e.noteId === "n1")).toBe(true));
    expect(api.notesAdd).toHaveBeenCalledTimes(1);
  });

  it("biten işin (kesin) cevabındaki öğrenim ekleniyor; tahmini tur alınmıyor", async () => {
    setup(true);
    act(() => current!.record({ at: 30, workspaceId: WS, kind: "finished", paneId: "a", name: "Ayşe", detail: "", exact: false, reply: "Kök neden: önbellek anahtarı kiracıyı içermiyordu." }));
    act(() => current!.record({ at: 31, workspaceId: WS, kind: "finished", paneId: "a", name: "Ayşe", detail: "", exact: true, reply: "Kök neden: önbellek anahtarı kiracıyı içermiyordu." }));
    await waitFor(() => expect(api.notesAdd).toHaveBeenCalledTimes(1));
    expect(api.notesAdd.mock.calls[0][1]).toMatchObject({ kind: "ogrenim" });
  });

  it("ayar kapalıyken hiçbir şey eklenmiyor; aynı metin oturumda bir kez", async () => {
    setup(false);
    act(() => current!.record(msg));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(api.notesList).not.toHaveBeenCalled();
    cleanup();
    setup(true);
    act(() => current!.record(msg));
    act(() => current!.record({ ...msg, at: 21 }));
    await waitFor(() => expect(api.notesAdd).toHaveBeenCalledTimes(1));
    expect(CAPTURE_PER_HOUR).toBeGreaterThan(0);
  });

  it("Akış satırı: 'Belleğe eklendi' ve Geri al notu siliyor", async () => {
    setup(true, true);
    act(() => current!.record(msg));
    const undo = await screen.findByRole("button", { name: "Geri al" });
    expect(screen.getByText(/Belleğe eklendi:/)).toBeTruthy();
    fireEvent.click(undo);
    await waitFor(() => expect(api.notesRemove).toHaveBeenCalledWith(WS, "n1"));
    expect(await screen.findByText("Geri alındı (not silindi)")).toBeTruthy();
  });
});
