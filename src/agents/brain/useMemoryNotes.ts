// Ekibin bellek notları (Tur 5): ana süreçten okunur, ajan `ntt-team memory`
// ile yazınca "notes:changed" olayıyla yeniden okunur. Yazımlar ana süreçte
// (atomik, gizli süzgeçli); burada yalnız sonuç listeye işlenir.
import { useCallback, useEffect, useRef, useState } from "react";
import type { MemoryNote, NoteInput, NotePatch, NoteResult } from "../../../app-electron/shared/memoryNotes";

type NotesApi = Partial<Pick<Window["api"], "notesList" | "notesAdd" | "notesUpdate" | "notesRemove" | "onNotesChanged">>;
const api = (): NotesApi => ((typeof window !== "undefined" ? (window as unknown as { api?: NotesApi }).api : undefined) ?? {});

export interface MemoryNotesState {
  notes: MemoryNote[];
  loaded: boolean;
  add(input: NoteInput): Promise<NoteResult>;
  update(id: string, patch: NotePatch, expectedUpdated?: number): Promise<NoteResult>;
  remove(id: string): Promise<boolean>;
}

const failed: NoteResult = { ok: false, reason: "writeFailed" };

export function useMemoryNotes(workspaceId: string): MemoryNotesState {
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(workspaceId);
  current.current = workspaceId;

  const load = useCallback(async () => {
    const id = workspaceId;
    try {
      const list = (await api().notesList?.(id)) ?? [];
      if (current.current === id) setNotes(Array.isArray(list) ? list : []);
    } catch {
      // okunamadıysa liste olduğu gibi kalır
    }
    if (current.current === id) setLoaded(true);
  }, [workspaceId]);

  useEffect(() => {
    setNotes([]);
    setLoaded(false);
    void load();
    const off = api().onNotesChanged?.((id) => {
      if (id === workspaceId) void load();
    });
    return () => off?.();
  }, [workspaceId, load]);

  const add = useCallback(
    async (input: NoteInput) => {
      try {
        const result = (await api().notesAdd?.(workspaceId, input)) ?? failed;
        if (result.ok) setNotes((prev) => [...prev.filter((n) => n.id !== result.note.id), result.note]);
        return result;
      } catch {
        return failed;
      }
    },
    [workspaceId]
  );

  const update = useCallback(
    async (id: string, patch: NotePatch, expectedUpdated?: number) => {
      try {
        const result = (await api().notesUpdate?.(workspaceId, id, patch, expectedUpdated)) ?? failed;
        if (result.ok) setNotes((prev) => prev.map((n) => (n.id === id ? result.note : n)));
        else if (result.reason === "changed" || result.reason === "missing") void load();
        return result;
      } catch {
        return failed;
      }
    },
    [workspaceId, load]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const ok = (await api().notesRemove?.(workspaceId, id)) ?? false;
        if (ok) setNotes((prev) => prev.filter((n) => n.id !== id));
        return ok;
      } catch {
        return false;
      }
    },
    [workspaceId]
  );

  return { notes, loaded, add, update, remove };
}
