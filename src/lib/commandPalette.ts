// Ctrl+K komut paletinin arama mantığı — bileşenden ayrı, saf ve test edilebilir.
//
// Palet üç türden satır gösteriyor: eylemler (yeni sohbet, ayarlar...),
// sohbetler ve SAP sistemleri. Satırları kuran App; burası yalnızca süzüp
// sıralıyor.

export type PaletteGroup = "action" | "chat" | "system";

export interface PaletteItem {
  id: string;
  group: PaletteGroup;
  label: string;
  /** Sağda soluk duran ikinci satır: sistemin müşteri yolu, kısayol vb. Aramaya dahil. */
  hint?: string;
  run: () => void;
}

// Grupların ekrandaki sırası. Eylemler önde: palet en çok "bir şey yap" için açılıyor.
export const PALETTE_GROUPS: PaletteGroup[] = ["action", "chat", "system"];

// Bir grup ekranı doldurmasın; sistem listesi yüzlerce satır olabiliyor.
const DEFAULT_GROUP_LIMIT = 8;

function fold(text: string): string {
  return text.toLocaleLowerCase("tr");
}

/**
 * Sorguyu kelimelere bölüp HER kelimenin etikette ya da ipucunda geçtiği
 * satırları döndürüyor. Grup sırası sabit; grup içinde etiketi sorguyla
 * BAŞLAYANLAR önde, gerisi geldiği sırada.
 */
export function filterPaletteItems(
  items: PaletteItem[],
  query: string,
  groupLimit = DEFAULT_GROUP_LIMIT
): PaletteItem[] {
  const q = fold(query.trim());
  const words = q.split(/\s+/).filter(Boolean);
  const out: PaletteItem[] = [];
  for (const group of PALETTE_GROUPS) {
    const matches = items.filter((item) => {
      if (item.group !== group) return false;
      const haystack = fold(`${item.label} ${item.hint ?? ""}`);
      return words.every((word) => haystack.includes(word));
    });
    if (q) {
      const head = matches.filter((item) => fold(item.label).startsWith(q));
      const rest = matches.filter((item) => !fold(item.label).startsWith(q));
      out.push(...[...head, ...rest].slice(0, groupLimit));
    } else {
      out.push(...matches.slice(0, groupLimit));
    }
  }
  return out;
}
