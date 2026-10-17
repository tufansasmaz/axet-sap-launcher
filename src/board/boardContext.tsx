// Görev panolarının renderer'daki kopyası (spec 2026-10-18 gorev-panosu §8).
// Tek kaynak ana süreçteki yönetici; burada yalnız son yayınladığı. Varsayılan
// değer boş: sağlayıcısız çizilen bileşenler (testler) çökmüyor.
// TerminalStoreProvider'ın İÇİNDE çizilmeli: alan listesini oradan alıyor.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoardCommand, BoardCommandResult } from "../../app-electron/shared/boardCommands";
import type { Board } from "../../app-electron/shared/boardTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";

export interface BoardContextValue {
  boards: Record<string, Board>;
  command: (workspaceId: string, cmd: BoardCommand) => Promise<BoardCommandResult>;
}

const EMPTY: BoardContextValue = {
  boards: {},
  command: async () => ({ ok: false, reason: "noBoard" })
};

export const BoardContext = createContext<BoardContextValue>(EMPTY);

export function useBoards(): BoardContextValue {
  return useContext(BoardContext);
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const { state } = useTerminalStore();
  const [boards, setBoards] = useState<Record<string, Board>>({});
  const ids = state.workspaces.map((w) => w.id).join("|");

  useEffect(() => {
    const off = window.api.onBoardChanged((board) => setBoards((prev) => ({ ...prev, [board.workspaceId]: board })));
    return off;
  }, []);

  useEffect(() => {
    let alive = true;
    const list = ids ? ids.split("|") : [];
    // Kaldırılan alanların panoları düşüyor.
    setBoards((prev) => {
      const keep = Object.keys(prev).filter((id) => list.includes(id));
      return keep.length === Object.keys(prev).length ? prev : Object.fromEntries(keep.map((id) => [id, prev[id]]));
    });
    for (const id of list) {
      window.api.boardGet(id).then(
        (board) => {
          if (!alive || !board) return;
          // Olaydan gelen daha yeni değer ezilmiyor.
          setBoards((prev) => (id in prev ? prev : { ...prev, [id]: board }));
        },
        () => {}
      );
    }
    return () => {
      alive = false;
    };
  }, [ids]);

  const command = useCallback(
    (workspaceId: string, cmd: BoardCommand) =>
      window.api.boardCommand(workspaceId, cmd).catch((): BoardCommandResult => ({ ok: false, reason: "writeFailed" })),
    []
  );

  const value = useMemo(() => ({ boards, command }), [boards, command]);
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
