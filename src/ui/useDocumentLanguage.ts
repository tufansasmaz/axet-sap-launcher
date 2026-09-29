import { useEffect } from "react";
import type { AppLanguage } from "../../app-electron/shared/types";

// `<html lang>`'ı dil ayarına bağlar. Tarayıcı `text-transform: uppercase`'i
// bu niteliğe göre yapıyor: `lang="tr"` iken İngilizce "files" "FİLES" olur,
// `lang="en"` iken Türkçe "sistemler" "SISTEMLER" olur. `index.html`'deki
// `lang="tr"` yalnızca ilk kare için; ayar okununca bu kanca devralıyor.
export function useDocumentLanguage(language: AppLanguage): void {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
