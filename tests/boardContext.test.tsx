// @vitest-environment jsdom
// Pano aboneliği (spec 2026-10-18 gorev-panosu §8): alan başına yükleme, olay, komut.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { BOARD_RETRY_MS, BoardProvider, useBoards, type BoardContextValue } from "../src/board/boardContext";
import { TerminalStoreContext, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";
import type { Board } from "../app-electron/shared/boardTypes";

let changed: ((board: Board) => void) | null;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let value: BoardContextValue;

function Probe() {
  value = useBoards();
  return null;
}

const ws = (id: string): TerminalWorkspace => ({ id, name: id, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false });
const empty = (workspaceId: string): Board => ({ workspaceId, tasks: [] });

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function ui(workspaces: TerminalWorkspace[]) {
  const store = { state: { ...initialTerminalState, phase: "ready", workspaces }, commands: {}, defaultKind: "cmd", defaultCwd: "", agentCwd: "" } as unknown as TerminalStoreValue;
  return (
    <TerminalStoreContext.Provider value={store}>
      <BoardProvider>
        <Probe />
      </BoardProvider>
    </TerminalStoreContext.Provider>
  );
}

beforeEach(() => {
  changed = null;
  api = {
    boardGet: vi.fn(async (id: string) => empty(id)),
    boardCommand: vi.fn(async () => ({ ok: true })),
    onBoardChanged: vi.fn((cb: (board: Board) => void) => {
      changed = cb;
      return () => {
        changed = null;
      };
    })
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

describe("BoardProvider", () => {
  it("her alanın panosu yükleniyor; olay panoyu güncelliyor; kaldırılan alanın panosu düşüyor", async () => {
    const r = render(ui([ws("w1"), ws("w2")]));
    await flush();
    expect(api.boardGet).toHaveBeenCalledWith("w1");
    expect(api.boardGet).toHaveBeenCalledWith("w2");
    expect(Object.keys(value.boards).sort()).toEqual(["w1", "w2"]);
    act(() => changed?.({ workspaceId: "w1", tasks: [{ id: "t", title: "T", goal: "", state: "draft", createdAt: 1, subtasks: [] }] }));
    expect(value.boards.w1.tasks).toHaveLength(1);
    r.rerender(ui([ws("w1")]));
    await flush();
    expect(Object.keys(value.boards)).toEqual(["w1"]);
    expect(value.boards.w1.tasks).toHaveLength(1);
  });

  it("geç gelen yükleme yeni olayı ezmiyor", async () => {
    let resolve: (b: Board) => void = () => {};
    api.boardGet.mockImplementationOnce(() => new Promise<Board>((r) => (resolve = r)));
    render(ui([ws("w1")]));
    act(() => changed?.({ workspaceId: "w1", tasks: [{ id: "t", title: "Yeni", goal: "", state: "draft", createdAt: 1, subtasks: [] }] }));
    resolve(empty("w1"));
    await flush();
    expect(value.boards.w1.tasks[0].title).toBe("Yeni");
  });

  it("yeni alan henüz kaydedilmemişse (get null) yeniden deniyor; kaydedilince pano geliyor; sökülünce duruyor", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      api.boardGet.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const r = render(ui([ws("w1")]));
      await flush();
      expect(value.boards.w1).toBeUndefined();
      act(() => {
        vi.advanceTimersByTime(BOARD_RETRY_MS);
      });
      await flush();
      expect(value.boards.w1).toBeUndefined();
      act(() => {
        vi.advanceTimersByTime(BOARD_RETRY_MS);
      });
      await flush();
      expect(api.boardGet).toHaveBeenCalledTimes(3);
      expect(value.boards.w1).toEqual(empty("w1"));
      act(() => {
        vi.advanceTimersByTime(BOARD_RETRY_MS * 3);
      });
      expect(api.boardGet).toHaveBeenCalledTimes(3);
      api.boardGet.mockResolvedValue(null);
      r.rerender(ui([ws("w1"), ws("w2")]));
      await flush();
      const calls = api.boardGet.mock.calls.length;
      r.unmount();
      act(() => {
        vi.advanceTimersByTime(BOARD_RETRY_MS * 5);
      });
      expect(api.boardGet.mock.calls.length).toBe(calls);
    } finally {
      vi.useRealTimers();
    }
  });

  it("komut IPC'ye gidiyor; IPC reddederse writeFailed", async () => {
    render(ui([ws("w1")]));
    await expect(value.command("w1", { type: "approve", taskId: "t" })).resolves.toEqual({ ok: true });
    expect(api.boardCommand).toHaveBeenCalledWith("w1", { type: "approve", taskId: "t" });
    api.boardCommand.mockRejectedValueOnce(new Error("kanal yok"));
    await expect(value.command("w1", { type: "approve", taskId: "t" })).resolves.toEqual({ ok: false, reason: "writeFailed" });
  });
});
