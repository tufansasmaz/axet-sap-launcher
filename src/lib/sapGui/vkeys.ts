// SAP GUI Scripting sanal tuş (VKey) tablosu.
//
// NEDEN VAR: `sendVKey` API'si SADECE sayı kabul ediyor, ve kullanıcının bir
// metin kutusuna "8" yazması gerekmesi bu ekranın en sivri köşesiydi — hangi
// sayının ne yaptığını bilmek için SAP dokümantasyonuna gitmek gerekiyordu.
// Burada sayı ↔ klavye kombinasyonu eşlemesi bir kere tanımlanıyor, UI
// isimlendirilmiş butonlar gösteriyor, kaydedilen adımlar da okunur oluyor.
//
// EŞLEME KURALI (SAP'nin kendi düzeni, üretilerek doğrulanabilir):
//   0          → Enter
//   1  … 12    → F1  … F12
//   13 … 24    → Shift+F1  … Shift+F12
//   25 … 36    → Ctrl+F1   … Ctrl+F12
// Bu aralıkların dışındaki kodlar (Ctrl+PageUp gibi) BİLEREK listelenmiyor —
// sürümden sürüme değişebiliyorlar; gerekirse "Özel kod" alanından hâlâ ham
// sayı gönderilebiliyor.
//
// ANLAM etiketleri (Geri/Çalıştır/Kaydet…) SAP'nin standart fonksiyon tuşu
// atamalarıdır ve ÇOĞU ekranda geçerlidir — ama bir transaction bunları
// yeniden atayabilir, bu yüzden etiket bir ipucu, garanti değil.

// ANLAMLAR ÇEVRİLİR, `combo` ÇEVRİLMEZ. Eskiden anlamlar bu dosyada sabit
// Türkçe metinlerdi; uygulama İngilizce'ye alındığında komut çubuğu
// "Enter Geri Çalıştır Kaydet…" demeye devam ediyordu (2026-09-04, dil
// düğmesi tıklanarak görüldü). Artık burada yalnızca ÇEVİRİ ANAHTARI
// duruyor, metin `i18n`'den geliyor. `combo` ("Shift+F3") bir klavye
// gösterimi, çevrilmez.

import type { TranslateFn } from "../../i18n";
import type { TranslationKey } from "../../i18n/tr";

export interface VKeyDef {
  vkey: number;
  /** Klavye kombinasyonu — kesin, sürümden bağımsız, ÇEVRİLMEZ. */
  combo: string;
  /** SAP'nin standart anlamı — çoğu ekranda geçerli, garanti değil. */
  meaningKey?: TranslationKey;
  /**
   * Düğme yazısı. Uzun anlamın ilk kelimesinden TÜRETİLMİYOR: eskiden
   * `meaning.split(" ")[0]` alınıyordu ve bu, sözlüğe metin yazan kişiye
   * görünmeyen bir kural dayatıyordu ("ilk kelime iyi bir başlık olmalı").
   */
  shortKey?: TranslationKey;
}

function buildRange(base: number, prefix: string): VKeyDef[] {
  return Array.from({ length: 12 }, (_, i) => ({
    vkey: base + i,
    combo: `${prefix}F${i + 1}`
  }));
}

// Standart anlamlar — sadece SAP'nin gerçekten evrensel olarak atadıkları.
const MEANING_KEYS: Record<number, TranslationKey> = {
  0: "sapGuiScripting.vkeyMeaning.0",
  1: "sapGuiScripting.vkeyMeaning.1",
  2: "sapGuiScripting.vkeyMeaning.2",
  3: "sapGuiScripting.vkeyMeaning.3",
  4: "sapGuiScripting.vkeyMeaning.4",
  8: "sapGuiScripting.vkeyMeaning.8",
  10: "sapGuiScripting.vkeyMeaning.10",
  11: "sapGuiScripting.vkeyMeaning.11",
  12: "sapGuiScripting.vkeyMeaning.12",
  15: "sapGuiScripting.vkeyMeaning.15"
};

// Sadece QUICK_VKEYS'in düğme yazısı var — listede olmayan bir tuşun düğmesi
// de yok. Buraya yeni bir tuş eklemeden QUICK_VKEYS'e eklemek kırılmaz:
// aşağıdaki `vkeyShort` `combo`ya ("F6") düşer.
const SHORT_KEYS: Record<number, TranslationKey> = {
  0: "sapGuiScripting.vkeyShort.0",
  1: "sapGuiScripting.vkeyShort.1",
  3: "sapGuiScripting.vkeyShort.3",
  4: "sapGuiScripting.vkeyShort.4",
  8: "sapGuiScripting.vkeyShort.8",
  11: "sapGuiScripting.vkeyShort.11",
  12: "sapGuiScripting.vkeyShort.12",
  15: "sapGuiScripting.vkeyShort.15"
};

export const ALL_VKEYS: VKeyDef[] = [
  { vkey: 0, combo: "Enter" },
  ...buildRange(1, ""),
  ...buildRange(13, "Shift+"),
  ...buildRange(25, "Ctrl+")
].map((entry) => ({ ...entry, meaningKey: MEANING_KEYS[entry.vkey], shortKey: SHORT_KEYS[entry.vkey] }));

/** Araç çubuğunda tek tıkla erişilen tuşlar — SAP'de en sık kullanılanlar. */
export const QUICK_VKEYS: number[] = [0, 3, 8, 11, 12, 15, 4, 1];

export function vkeyDef(vkey: number): VKeyDef | undefined {
  return ALL_VKEYS.find((entry) => entry.vkey === vkey);
}

/** SAP'nin standart anlamı, kullanıcının dilinde. Bilinmiyorsa `undefined`. */
export function vkeyMeaning(vkey: number, t: TranslateFn): string | undefined {
  const key = vkeyDef(vkey)?.meaningKey;
  return key ? t(key) : undefined;
}

/** Düğme yazısı — anlamı yoksa klavye kombinasyonuna düşer. */
export function vkeyShort(vkey: number, t: TranslateFn): string {
  const def = vkeyDef(vkey);
  if (!def) return String(vkey);
  return def.shortKey ? t(def.shortKey) : def.combo;
}

/** Kayıt adımı etiketlerinde ve ipuçlarında kullanılan uzun gösterim. */
export function vkeyLabel(vkey: number, t: TranslateFn): string {
  const def = vkeyDef(vkey);
  if (!def) return `VKey ${vkey}`;
  return def.meaningKey ? `${def.combo} · ${t(def.meaningKey)}` : def.combo;
}
