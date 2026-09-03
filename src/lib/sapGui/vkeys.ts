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

export interface VKeyDef {
  vkey: number;
  /** Klavye kombinasyonu — kesin, sürümden bağımsız. */
  combo: string;
  /** SAP'nin standart anlamı — çoğu ekranda geçerli, garanti değil. */
  meaning?: string;
}

function buildRange(base: number, prefix: string): VKeyDef[] {
  return Array.from({ length: 12 }, (_, i) => ({
    vkey: base + i,
    combo: `${prefix}F${i + 1}`
  }));
}

// Standart anlamlar — sadece SAP'nin gerçekten evrensel olarak atadıkları.
const MEANINGS: Record<number, string> = {
  0: "Enter / Onayla",
  1: "Yardım",
  2: "Seç",
  3: "Geri",
  4: "Değer yardımı (F4)",
  8: "Çalıştır",
  10: "Menü çubuğu",
  11: "Kaydet",
  12: "İptal",
  15: "Çık"
};

export const ALL_VKEYS: VKeyDef[] = [
  { vkey: 0, combo: "Enter" },
  ...buildRange(1, ""),
  ...buildRange(13, "Shift+"),
  ...buildRange(25, "Ctrl+")
].map((entry) => ({ ...entry, meaning: MEANINGS[entry.vkey] }));

/** Araç çubuğunda tek tıkla erişilen tuşlar — SAP'de en sık kullanılanlar. */
export const QUICK_VKEYS: number[] = [0, 3, 8, 11, 12, 15, 4, 1];

export function vkeyDef(vkey: number): VKeyDef | undefined {
  return ALL_VKEYS.find((entry) => entry.vkey === vkey);
}

/** Kayıt adımı etiketlerinde ve butonlarda kullanılan kısa gösterim. */
export function vkeyLabel(vkey: number): string {
  const def = vkeyDef(vkey);
  if (!def) return `VKey ${vkey}`;
  return def.meaning ? `${def.combo} · ${def.meaning}` : def.combo;
}
