// Piksel ofisin kat planı (spec 2026-10-18 ajanlar-yeniden §3). SAF: ajan
// sayısı + alan boyutu -> karo haritası, masa hücreleri, eşyalar ve tam sayı
// ölçek. Birim karo (16 px). Bir masa hücresi CELL_W x CELL_H karo:
//   satır 0 ad etiketi (HTML), satır 1 masa + monitör, satır 2-3 sandalyedeki
//   kişi, satır 4 alt görev satırı ve koridor; sağdaki sütun iki masa arası boşluk.
// Sağda toplantı halısı + masası, kahve köşesi; üstte duvar (pencere, pano,
// saat, kapı); köşelerde bitki. 12 masayı aşınca altta kapılı duvarla ikinci oda.

export const TILE = 16;
export const CELL_W = 4;
export const CELL_H = 5;
export const DESK_W = 3;
export const WALL_H = 2;
export const SIDE_W = 7;
export const ROOM_CAP = 12;
export const MAX_DESKS = ROOM_CAP * 2;
const MARGIN = 1;
const ROOM_MIN_H = 12;
const ROOM2_MIN_H = 8;
const MIN_SCALE = 2;
const MAX_SCALE = 4;

export type TileKind = "wall" | "floor" | "rug" | "door";
export type PropKind = "window" | "board" | "clock" | "plant" | "meeting" | "coffee";

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeskSpot {
  /** Hücrenin sol üst karosu. */
  x: number;
  y: number;
  room: 0 | 1;
}

export interface OfficePlan {
  cols: number;
  rows: number;
  perRow: number;
  scale: number;
  tiles: TileKind[][];
  desks: DeskSpot[];
  props: Prop[];
  /** Işının lider yokken çıktığı kapı karosu (ilk odanın üst duvarı). */
  door: { x: number; y: number };
}

/** Alana sığan en büyük tam sayı ölçek; 2-4 arası. Ölçü yoksa (jsdom) 2. */
export function fitScale(widthPx: number, heightPx: number, areaW: number, areaH: number): number {
  if (!(areaW > 0 && areaH > 0 && widthPx > 0 && heightPx > 0)) return MIN_SCALE;
  const s = Math.floor(Math.min(areaW / widthPx, areaH / heightPx));
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

function clampCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.min(MAX_DESKS, Math.floor(count))) : 0;
}

function build(n: number, perRow: number): Omit<OfficePlan, "scale"> {
  const first = Math.min(n, ROOM_CAP);
  const second = n - first;
  const rows0 = Math.max(1, Math.ceil(first / perRow));
  const h0 = Math.max(ROOM_MIN_H, WALL_H + 1 + rows0 * CELL_H);
  const rows1 = second > 0 ? Math.ceil(second / perRow) : 0;
  const h1 = second > 0 ? Math.max(ROOM2_MIN_H, WALL_H + 1 + rows1 * CELL_H) : 0;
  const sx = MARGIN + perRow * CELL_W;
  const cols = sx + SIDE_W;
  const rows = h0 + h1;
  const tiles: TileKind[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, (): TileKind => "floor"));
  const doorX = sx + 5;
  const wallBand = (y0: number) => {
    for (let y = y0; y < y0 + WALL_H; y++) for (let x = 0; x < cols; x++) tiles[y][x] = x === doorX ? "door" : "wall";
  };
  wallBand(0);
  if (h1 > 0) wallBand(h0);

  const desks: DeskSpot[] = [];
  for (let i = 0; i < n; i++) {
    const room: 0 | 1 = i < ROOM_CAP ? 0 : 1;
    const k = room === 0 ? i : i - ROOM_CAP;
    const top = room === 0 ? WALL_H + 1 : h0 + WALL_H + 1;
    desks.push({ x: MARGIN + (k % perRow) * CELL_W, y: top + Math.floor(k / perRow) * CELL_H, room });
  }

  const props: Prop[] = [];
  for (let i = 0; i < perRow; i++) props.push({ kind: "window", x: MARGIN + i * CELL_W, y: 0, w: DESK_W, h: WALL_H });
  props.push({ kind: "board", x: sx, y: 0, w: 2, h: WALL_H });
  props.push({ kind: "clock", x: sx + 3, y: 0, w: 1, h: 1 });
  // Toplantı halısı ve masası.
  const rug = { x: sx + 1, y: WALL_H + 2, w: 5, h: 4 };
  for (let y = rug.y; y < rug.y + rug.h; y++) for (let x = rug.x; x < rug.x + rug.w; x++) tiles[y][x] = "rug";
  props.push({ kind: "meeting", x: rug.x + 1, y: rug.y + 1, w: 3, h: 2 });
  props.push({ kind: "coffee", x: sx + 2, y: h0 - 3, w: 4, h: 2 });
  props.push({ kind: "plant", x: cols - 1, y: WALL_H, w: 1, h: 1 });
  props.push({ kind: "plant", x: sx, y: h0 - 2, w: 1, h: 1 });
  if (h1 > 0) props.push({ kind: "plant", x: cols - 1, y: h0 + WALL_H, w: 1, h: 1 });

  return { cols, rows, perRow, tiles, desks, props, door: { x: doorX, y: WALL_H - 1 } };
}

/**
 * Satır başına 4-6 masa arasından alana en iyi sığanı seçiyor: önce tam sayı
 * ölçek, eşitse kesirli sığma oranı, o da eşitse son sıradaki boş yer az olan.
 */
export function officePlan(count: number, areaW: number, areaH: number): OfficePlan {
  const n = clampCount(count);
  const candidates = n <= 4 ? [4] : [4, 5, 6];
  let best: { plan: Omit<OfficePlan, "scale">; scale: number; fit: number; empty: number } | null = null;
  for (const p of candidates) {
    const plan = build(n, p);
    const w = plan.cols * TILE;
    const h = plan.rows * TILE;
    const scale = fitScale(w, h, areaW, areaH);
    const fit = areaW > 0 && areaH > 0 ? Math.min(areaW / w, areaH / h) : 0;
    const empty = (p - (Math.min(n, ROOM_CAP) % p)) % p;
    const better =
      !best ||
      scale > best.scale ||
      (scale === best.scale && fit > best.fit + 1e-9) ||
      (scale === best.scale && Math.abs(fit - best.fit) <= 1e-9 && empty < best.empty);
    if (better) best = { plan, scale, fit, empty };
  }
  const chosen = best as NonNullable<typeof best>;
  return { ...chosen.plan, scale: chosen.scale };
}
