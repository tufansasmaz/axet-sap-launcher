import { useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminalStoreContext";

// Pano bildirimine tıklanınca (spec 2026-10-18 gorev-panosu §8) Ajanlar
// ekranı açılıyor, o alan seçiliyor ve Pano görünümüne geçiliyor.
// Alan depoda yoksa yalnız ekran açılıyor — phantom ID'yi seçmeye çalışmaz.
// TerminalStoreProvider'ın İÇİNDE çizilmeli.
export default function BoardOpenListener({ onShow }: { onShow: () => void }) {
  const { state, commands } = useTerminalStore();
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const off = window.api?.onBoardOpen?.((workspaceId) => {
      onShowRef.current();
      const exists = stateRef.current.workspaces.some((w) => w.id === workspaceId);
      if (exists) {
        commands.selectWorkspace(workspaceId);
        commands.setWorkspaceView(workspaceId, "board");
      }
    });
    return off ?? (() => {});
  }, [commands]);
  return null;
}
