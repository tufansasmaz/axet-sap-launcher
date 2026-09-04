import { useEffect, useState } from "react";
import type { ActiveContext } from "../../app-electron/shared/types";

const EMPTY: ActiveContext = { sap: null, gui: null };

// Aktif bağlamın renderer tarafındaki okuma penceresi. Gerçek TEK, main
// process'te (bkz. app-electron/main/activeContext.ts) — burada tutulan
// yalnızca onun bir kopyası.
//
// Mount anında bir kez okunuyor VE sonrasında yayına abone olunuyor: ikisi
// birden şart. Sadece abone olsaydı, bağlantı bu bileşen mount olmadan önce
// kurulduğunda (ki `App` mount olduğunda bağlantı çoktan kurulmuş olabilir)
// ekran boş kalırdı; sadece okusaydı bir sonraki bağlantıyı hiç görmezdi.
export function useActiveContext(): ActiveContext {
  const [context, setContext] = useState<ActiveContext>(EMPTY);

  useEffect(() => {
    let disposed = false;
    window.api.getActiveContext().then((initial) => {
      if (!disposed) setContext(initial);
    });
    const off = window.api.onActiveContextChanged(setContext);
    return () => {
      disposed = true;
      off();
    };
  }, []);

  return context;
}
