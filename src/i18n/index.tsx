import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { AppLanguage } from "../../app-electron/shared/types";
import { tr, type TranslationKey } from "./tr";
import { en } from "./en";

const dictionaries: Record<AppLanguage, Record<TranslationKey, string>> = { tr, en };

type TranslateParams = Record<string, string | number>;
export type TranslateFn = (key: TranslationKey, params?: TranslateParams) => string;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

// Context'e/hook'a bağımlı olmayan saf fonksiyon — App.tsx gibi kendi dil
// state'ini (henüz config yüklenmeden önce "tr" varsayılanıyla) tutan en üst
// bileşenlerin, kendi altında kuracağı `LanguageProvider`'ın context'ini
// henüz okuyamadığı (bir bileşen kendi sağladığı context'i aynı render'da
// tüketemez) "tavuk-yumurta" durumunu çözer.
export function translate(language: AppLanguage, key: TranslationKey, params?: TranslateParams): string {
  const dict = dictionaries[language] ?? dictionaries.tr;
  const template = dict[key] ?? dictionaries.tr[key] ?? key;
  return interpolate(template, params);
}

const LanguageContext = createContext<AppLanguage>("tr");

export function LanguageProvider({ language, children }: { language: AppLanguage; children: ReactNode }) {
  // `<html lang>`'i dille birlikte güncelle. index.html'de sabit `lang="tr"`
  // yazıyor ve bu SADECE bir erişilebilirlik etiketi değil: tarayıcı büyük
  // harfe çevirmede (`text-transform: uppercase`) DİLE ÖZGÜ kuralları
  // uyguluyor. Türkçe kuralıyla İngilizce bir başlık "APP CONNECTİONS İN
  // CHAT" diye çiziliyordu — noktalı İ, çünkü Türkçe'de 'i'nin büyüğü 'İ'.
  // Ayarlar'daki bölüm başlıkları gibi tüm `uppercase` sınıflı metinleri
  // etkiliyordu. Efekt değil doğrudan atama: render sırasında yapılması
  // sakıncasız (React ağacının dışında bir nitelik) ve ilk boyamada doğru
  // olması gerekiyor.
  if (typeof document !== "undefined" && document.documentElement.lang !== language) {
    document.documentElement.lang = language;
  }
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): AppLanguage {
  return useContext(LanguageContext);
}

// Bileşenlerin çevirmesi gereken metinler için tek giriş noktası — dil
// context'ten okunur (App.tsx'te config.language'a göre sağlanır), her
// bileşen prop drilling yapmadan `const t = useT()` ile erişir. {param}
// biçimli basit interpolasyon dışında (ICU/plural kuralları gibi) bir şey
// desteklenmiyor — bu uygulamanın string kümesi için yeterli.
export function useT(): TranslateFn {
  const language = useLanguage();
  return useCallback<TranslateFn>((key, params) => translate(language, key, params), [language]);
}

export function useTranslations(): { t: TranslateFn; language: AppLanguage } {
  const language = useLanguage();
  const t = useT();
  return useMemo(() => ({ t, language }), [t, language]);
}
