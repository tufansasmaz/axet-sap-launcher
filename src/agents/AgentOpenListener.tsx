import { useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminalStoreContext";

// Ajan bildirimine tıklanınca (spec 2026-10-17 ajan-alani §9) Ajanlar ekranı
// açılıyor ve o ajanın bölmesi öne geliyor. TerminalStoreProvider'ın İÇİNDE
// çizilmeli: bölmeyi bulmak için deponun komutlarını kullanıyor.
export default function AgentOpenListener({ onShow }: { onShow: () => void }) {
  const { commands } = useTerminalStore();
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  useEffect(
    () =>
      window.api.onAgentOpen((paneId) => {
        onShowRef.current();
        commands.revealPane(paneId);
      }),
    [commands]
  );
  return null;
}
