// TR/EN çeviri sözlükleri.
//
// ANAHTAR EŞİTLİĞİ BURADA TEST EDİLMİYOR — gerekmez: `en`, `Record<
// TranslationKey, string>` olarak yazıldığı için eksik anahtar derleme
// hatası, fazla anahtar da öyle. Derleyicinin zaten tuttuğu bir şeyi ikinci
// kez test etmek, test paketine güven değil gürültü ekler.
//
// Derleyicinin GÖREMEDİĞİ şey değerlerin içi: `{count}` gibi bir yer
// tutucunun bir dilde olup diğerinde olmaması. Sonuç sessiz — cümle kurulur,
// yalnızca içindeki sayı yoktur. Bu dosya tam olarak onu arıyor.

import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { tr, type TranslationKey } from "../src/i18n/tr";

const KEYS = Object.keys(tr) as TranslationKey[];

/** Bir metindeki `{...}` yer tutucuları, sırasız küme olarak. */
function placeholders(text: string): Set<string> {
  return new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
}

describe("ceviri sozlukleri", () => {
  it("bos ya da yalnizca bosluktan olusan deger yok", () => {
    for (const key of KEYS) {
      expect(tr[key].trim().length, `tr: ${key}`).toBeGreaterThan(0);
      expect(en[key].trim().length, `en: ${key}`).toBeGreaterThan(0);
    }
  });

  it("yer tutucular iki dilde AYNI", () => {
    for (const key of KEYS) {
      expect([...placeholders(tr[key])].sort(), `${key}`).toEqual([...placeholders(en[key])].sort());
    }
  });

  it("ceviri anahtarinin kendisi deger olarak birakilmamis", () => {
    // Yeni bir anahtar eklerken degeri yanlislikla anahtarin kopyasi olarak
    // birakmak, ekranda "settingsModal.sectionDoctor" yazan bir baslik demek.
    for (const key of KEYS) {
      expect(tr[key], `tr: ${key}`).not.toBe(key);
      expect(en[key], `en: ${key}`).not.toBe(key);
    }
  });
});
