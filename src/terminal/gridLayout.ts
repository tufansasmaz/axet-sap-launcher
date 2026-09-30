// Terminal ızgarasının yerleşimi (spec §3.3). Saf hesap; React'sız sınanıyor.
//
// Sütun/satır/hücre 0 tabanlı. CSS'e çevirirken +1 ekleniyor.

import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";

export interface GridCell {
  col: number;
  row: number;
  rowSpan: number;
}

export interface GridLayout {
  cols: number;
  rows: number;
  cells: GridCell[];
  // Satır ayırıcısının başladığı sütun. 3 bölmede sol sütun boydan
  // kaplandığı için ayırıcı yalnız sağ sütunda.
  rowDividerStartCol: number;
}

export function gridLayout(count: number): GridLayout {
  const n = Number.isFinite(count) ? Math.max(0, Math.min(MAX_TERMINAL_PANES, Math.floor(count))) : 0;
  if (n === 0) return { cols: 1, rows: 1, cells: [], rowDividerStartCol: 0 };
  if (n === 3) {
    return {
      cols: 2,
      rows: 2,
      cells: [
        { col: 0, row: 0, rowSpan: 2 },
        { col: 1, row: 0, rowSpan: 1 },
        { col: 1, row: 1, rowSpan: 1 }
      ],
      rowDividerStartCol: 1
    };
  }
  const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = n <= 2 ? 1 : n <= 6 ? 2 : 3;
  const cells = Array.from({ length: n }, (_, i) => ({ col: i % cols, row: Math.floor(i / cols), rowSpan: 1 }));
  return { cols, rows, cells, rowDividerStartCol: 0 };
}

export function equalRatios(n: number): number[] {
  const k = Math.max(1, Math.floor(Number.isFinite(n) ? n : 1));
  return Array.from({ length: k }, () => 1 / k);
}

/**
 * `index` ile `index + 1` arasındaki ayırıcı `delta` kadar (toplamın payı
 * olarak) kayınca yeni oranlar. Yalnız bu iki komşu değişiyor, toplamları
 * korunuyor, ikisi de `min`'in altına inmiyor. Geçersiz girdide kopya.
 */
export function dragRatios(ratios: readonly number[], index: number, delta: number, min = 0.08): number[] {
  const next = [...ratios];
  if (!Number.isInteger(index) || index < 0 || index >= ratios.length - 1 || !Number.isFinite(delta)) return next;
  const total = ratios[index] + ratios[index + 1];
  if (total <= 2 * min) return next;
  const first = Math.min(total - min, Math.max(min, ratios[index] + delta));
  next[index] = first;
  next[index + 1] = total - first;
  return next;
}
