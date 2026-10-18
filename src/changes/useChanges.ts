// Bir alanın değişiklik durumu (spec 2026-10-18 degisiklikler §5). Tek kaynak
// ana süreçteki yönetici; burada yalnız son yayınladığı. Olay ilk yanıttan önce
// geldiyse eski yanıt onu ezmiyor.
import { useCallback, useEffect, useState } from "react";
import type { ChangesState } from "../../app-electron/shared/changesTypes";

export function useChangesState(workspaceId: string): { state: ChangesState | null; refresh: () => void } {
  const [state, setState] = useState<ChangesState | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    let fromEvent = false;
    const off = window.api.onChangesChanged((next) => {
      if (!alive || next.workspaceId !== workspaceId) return;
      fromEvent = true;
      setState(next);
    });
    window.api.changesState(workspaceId).then(
      (next) => {
        if (alive && !fromEvent && next) setState(next);
      },
      () => {}
    );
    return () => {
      alive = false;
      off();
    };
  }, [workspaceId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  // Alan değiştiyse eski alanın durumu gösterilmiyor.
  return { state: state && state.workspaceId === workspaceId ? state : null, refresh };
}
