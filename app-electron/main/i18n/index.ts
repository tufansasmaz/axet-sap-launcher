import type { AppLanguage } from "../../shared/types";
import { loadConfig } from "../store";
import { MAIN_TR } from "./tr";
import { MAIN_EN } from "./en";

export type MainMessageKey = keyof typeof MAIN_TR;
export type MessageParams = Record<string, string | number | null | undefined>;

const DICTIONARIES: Record<AppLanguage, Record<string, string>> = {
  tr: MAIN_TR,
  en: MAIN_EN
};

// Ana süreçte React context'i yok, dolayısıyla renderer'daki `useT()` gibi bir
// giriş noktası kurulamıyor. Dil `config.json`'dan okunuyor ama her mesajda
// diskten okumak için bir sebep yok — değer burada tutuluyor ve config
// kaydedilirken `refreshMainLanguage()` ile tazeleniyor.
let cached: AppLanguage | null = null;

function currentLanguage(): AppLanguage {
  if (cached) return cached;
  try {
    cached = loadConfig().language;
  } catch {
    // Config henüz okunamıyorsa (ilk açılış, bozuk dosya) mesaj kaybolmasın.
    cached = "tr";
  }
  return cached;
}

/** Config kaydedildikten sonra çağrılır; sonraki mesajlar yeni dilde çıkar. */
export function refreshMainLanguage(language?: AppLanguage): void {
  cached = language ?? null;
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Ana sürecin çeviri fonksiyonu — renderer'daki `t()`'nin karşılığı.
 *
 * Anahtar bulunamazsa önce Türkçe sözlüğe, o da yoksa anahtarın kendisine
 * düşer: eksik bir çeviri yüzünden kullanıcıya BOŞ bir hata mesajı gitmesi,
 * yanlış dilde bir mesaj gitmesinden çok daha kötü.
 */
export function mt(key: MainMessageKey, params?: MessageParams): string {
  const dict = DICTIONARIES[currentLanguage()] ?? MAIN_TR;
  const template = dict[key] ?? MAIN_TR[key] ?? key;
  return interpolate(template, params);
}
