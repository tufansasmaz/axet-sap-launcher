// Pano ayrıntı panelindeki "Değişiklikler" bağlantısından görünüme: hangi alt
// görevin kaydı seçilsin (spec 2026-10-18 degisiklikler §5). Sağlayıcı
// TerminalMode'da; varsayılan değer no-op, sağlayıcısız çizilen bileşenler çökmüyor.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface ChangesFocus {
  workspaceId: string;
  subtaskId: string;
}

export interface ChangesFocusValue {
  focus: ChangesFocus | null;
  requestFocus: (workspaceId: string, subtaskId: string) => void;
  clearFocus: () => void;
}

export const ChangesFocusContext = createContext<ChangesFocusValue>({
  focus: null,
  requestFocus: () => {},
  clearFocus: () => {}
});

export function ChangesFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<ChangesFocus | null>(null);
  const requestFocus = useCallback((workspaceId: string, subtaskId: string) => setFocus({ workspaceId, subtaskId }), []);
  const clearFocus = useCallback(() => setFocus(null), []);
  const value = useMemo(() => ({ focus, requestFocus, clearFocus }), [focus, requestFocus, clearFocus]);
  return <ChangesFocusContext.Provider value={value}>{children}</ChangesFocusContext.Provider>;
}

export function useChangesFocus(): ChangesFocusValue {
  return useContext(ChangesFocusContext);
}
