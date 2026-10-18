import { useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminalStoreContext";

// Pano bildirimine tıklanınca (spec 2026-10-18 gorev-panosu §8) Ajanlar
// ekranı açılıyor, o alan seçiliyor ve Pano görünümüne geçiliyor.
// TerminalStoreProvider'ın İÇİNDE çizilmeli.
export default function BoardOpenListener({ onShow }: { onShow: () => void }) {
  const { commands } = useTerminalStore();
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  useEffect(() => {
    const off = window.api?.onBoardOpen?.((workspaceId) => {
      onShowRef.current();
      commands.selectWorkspace(workspaceId);
      commands.setWorkspaceView(workspaceId, "board");
    });
    return off ?? (() => {});
  }, [commands]);
  return null;
}
