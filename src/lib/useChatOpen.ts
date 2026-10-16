// Sohbet açma bildirimi — ana süreç "chat:open" gönderdiğinde çalışır.
// AxetCodeHome tarafından kullanılır; aynı mantık testte doğrudan import edilir.

import { useEffect } from "react";

interface UseChatOpenOptions {
  /** Sohbet ekranında değilsek oraya geçmek için çağrılır. */
  onSwitchToChat?: () => void;
  /** Belirtilen sohbeti aktif yapar. */
  setActiveId: (id: string) => void;
}

/**
 * window.api.onChatOpen dinleyicisini bağlar ve unmount'ta temizler.
 * Bildirime tıklanınca önce ekran geçişi yapılır, ardından sohbet seçilir.
 */
export function useChatOpen({ onSwitchToChat, setActiveId }: UseChatOpenOptions): void {
  useEffect(() => {
    return window.api.onChatOpen((chatId) => {
      onSwitchToChat?.();
      setActiveId(chatId);
    });
  }, [onSwitchToChat, setActiveId]);
}
