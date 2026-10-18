// Piksel ofisin kat planı (spec 2026-10-18 ajanlar-yeniden §3 + kalite turu).
// SAF: ajan sayısı + alan boyutu -> karo haritası, oda haritası, yürünemez
// karolar, masalar, oturma/durma noktaları, çizilecek eşyalar, tam sayı ölçek.
//
//   +--------+-----------+------------------------+
//   | sunucu |  lider    |  toplantı (halı)       |   üst sıra: sabit
//   | arşiv  |  (ahşap)  |  masa + beyaz tahta    |
//   +--kapı--+~~cam~kapı~+--kapı------------------+
//   |  açık çalışma alanı (masa sıraları)  | mutfak |   alt sıra: çalışma
//   |  ... ajan sayısıyla büyür            | (karo) |   alanı büyür, mutfak
//   |--ara duvar (12 üstü), kapılı---------+--------+   sabit
//   |  ikinci bölüm                                 |
//   +-----------------------------------------------+
//
// Birim karo (16 px). Masa hücresi CELL_W x CELL_H: satır 0 koridor + ad
// etiketi, 1 masa (dolu), 2 koltuk (kişi yukarı, monitöre bakar), 3 koridor.

export const TILE = 16;
export const CELL_W = 4;
export const CELL_H = 4;
export const DESK_W = 3;
export const ROOM_CAP = 12;
export const MAX_DESKS = ROOM_CAP * 2;
const TOP_H = 6;
const SERVER_W = 4;
const LEAD_W = 7;
const KITCHEN_W = 8;
const KITCHEN_H = 9;
const MIN_SCALE = 2;
const MAX_SCALE = 4;

export type FloorKind = "wood" | "tile" | "carpet" | "concrete";
export type TileKind = "wall" | "glass" | "door" | FloorKind;
export type RoomId = "work" | "workB" | "leader" | "meeting" | "kitchen" | "server";
export type Dir = "down" | "up" | "left" | "right";

export interface Spot {
  x: number;
  y: number;
  face: Dir;
}

export type PropKind =
  | "window"
  | "whiteboard"
  | "board"
  | "clock"
  | "plant"
  | "rack"
  | "shelf"
  | "bookshelf"
  | "rug"
  | "meetingTable"
  | "meetingChair"
  | "counter"
  | "fridge"
  | "sofa"
  | "coffeeTable"
  | "printer"
  | "cooler"
  | "desk"
  | "guestChair";

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  face?: Dir;
}

export interface DeskSpot {
  /** Hücrenin sol üst karosu. */
  x: number;
  y: number;
  room: "work" | "workB";
}

export interface OfficePlan {
  cols: number;
  rows: number;
  perRow: number;
  scale: number;
  tiles: TileKind[][];
  rooms: (RoomId | null)[][];
  /** Yürünemez: duvar, cam, eşya. Kapı ve koltuk yürünebilir. */
  blocked: boolean[][];
  desks: DeskSpot[];
  /** desks ile aynı sırada: kişinin oturduğu karo. */
  seats: Spot[];
  lead: { cell: { x: number; y: number }; seat: Spot; desk: { x: number; y: number } };
  lounge: { coffee: Spot; sofa: Spot[]; stand: Spot[] };
  /** Lider yokken ışının çıktığı yer: lider odasının kapısı. */
  door: { x: number; y: number };
  props: Prop[];
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

function build(n: number, p: number): Omit<OfficePlan, "scale"> {
  const workW = 2 + p * CELL_W;
  const cols = 1 + workW + 1 + KITCHEN_W + 1;
  const first = Math.min(n, ROOM_CAP);
  const rowsA = Math.max(1, Math.ceil(first / p));
  const rowsB = n > ROOM_CAP ? Math.ceil((n - ROOM_CAP) / p) : 0;
  const workH = rowsA * CELL_H + (rowsB > 0 ? 1 + rowsB * CELL_H : 0);
  const lowH = Math.max(KITCHEN_H, workH);
  const yW = 2 + TOP_H;
  const low = yW + 1;
  const rows = low + lowH + 1;

  const tiles: TileKind[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, (): TileKind => "wall"));
  const rooms: (RoomId | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, (): RoomId | null => null));
  const blocked: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
  const area = (x0: number, y0: number, w: number, h: number, kind: FloorKind, room: RoomId) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        tiles[y][x] = kind;
        rooms[y][x] = room;
        blocked[y][x] = false;
      }
  };
  const door = (x: number, y: number) => {
    tiles[y][x] = "door";
    blocked[y][x] = false;
  };
  const block = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) blocked[y][x] = true;
  };
  const props: Prop[] = [];
  const prop = (kind: PropKind, x: number, y: number, w = 1, h = 1, solid = true, face?: Dir) => {
    props.push({ kind, x, y, w, h, ...(face ? { face } : {}) });
    if (solid) block(x, y, w, h);
  };

  // Üst sıra: sunucu/arşiv, lider odası, toplantı.
  const sx = 1;
  const lx = sx + SERVER_W + 1;
  const mx = lx + LEAD_W + 1;
  const meetW = cols - 1 - mx;
  area(sx, 2, SERVER_W, TOP_H, "concrete", "server");
  area(lx, 2, LEAD_W, TOP_H, "wood", "leader");
  area(mx, 2, meetW, TOP_H, "carpet", "meeting");
  for (let x = lx; x < lx + LEAD_W; x++) tiles[yW][x] = "glass";
  door(sx + 2, yW);
  const leadDoor = { x: lx + 5, y: yW };
  door(leadDoor.x, leadDoor.y);
  door(mx + 2, yW);

  // Alt sıra: çalışma alanı + mutfak.
  area(1, low, workW, lowH, "wood", "work");
  const kx = 1 + workW;
  const kx0 = kx + 1;
  area(kx0, low, KITCHEN_W, KITCHEN_H, "tile", "kitchen");
  door(kx, low + 4);
  if (lowH > KITCHEN_H) {
    // Mutfağın altı çalışma alanına katılıyor; mutfağı alttan duvar kapatıyor.
    area(kx, low + KITCHEN_H + 1, KITCHEN_W + 1, lowH - KITCHEN_H - 1, "wood", "work");
  }
  let partition = -1;
  if (rowsB > 0) {
    partition = low + rowsA * CELL_H;
    for (let x = 1; x <= workW; x++) {
      tiles[partition][x] = "wall";
      rooms[partition][x] = null;
      blocked[partition][x] = true;
    }
    door(3, partition);
    door(workW - 2, partition);
    for (let y = partition + 1; y < low + lowH; y++) for (let x = 1; x < cols - 1; x++) if (rooms[y][x] === "work") rooms[y][x] = "workB";
  }

  // Masalar.
  const desks: DeskSpot[] = [];
  const seats: Spot[] = [];
  for (let i = 0; i < n; i++) {
    const second = i >= ROOM_CAP;
    const k = second ? i - ROOM_CAP : i;
    const top = second ? partition + 1 : low;
    const d: DeskSpot = { x: 2 + (k % p) * CELL_W, y: top + Math.floor(k / p) * CELL_H, room: second ? "workB" : "work" };
    desks.push(d);
    seats.push({ x: d.x + 1, y: d.y + 2, face: "up" });
    prop("desk", d.x, d.y + 1, DESK_W, 1);
  }

  // Üst dış duvar: pencereler, saat, beyaz tahta.
  prop("window", sx + 1, 1, 2, 1, true);
  prop("window", lx + 3, 1, 2, 1, true);
  prop("clock", lx + 6, 1, 1, 1, true);
  prop("whiteboard", mx + 1, 1, 3, 1, true);
  for (let x = mx + 5; x + 2 <= cols - 1; x += 4) prop("window", x, 1, 2, 1, true);
  // Ara duvar (çalışma alanına bakan yüz): pano ve saat.
  prop("board", mx, yW, 2, 1, true);
  prop("clock", mx + 3, yW, 1, 1, true);

  // Sunucu/arşiv.
  prop("rack", sx, 2, 1, 2);
  prop("rack", sx + 1, 2, 1, 2);
  prop("shelf", sx + 3, 2, 1, 3);
  prop("shelf", sx, TOP_H, 1, 2);

  // Lider odası: masa, misafir sandalyesi, kitaplık, halı, bitki.
  const leadDesk = { x: lx + 2, y: 4 };
  prop("rug", lx + 1, 3, 5, 4, false);
  prop("bookshelf", lx, 2, 2, 1);
  prop("plant", lx + LEAD_W - 1, 2);
  prop("plant", lx, TOP_H + 1);
  prop("guestChair", leadDesk.x + 1, leadDesk.y + 1, 1, 1, true, "up");
  prop("desk", leadDesk.x, leadDesk.y, DESK_W, 1);
  const leadSeat: Spot = { x: leadDesk.x + 1, y: leadDesk.y - 1, face: "down" };

  // Toplantı: masa, sandalyeler, bitkiler.
  const tx = mx + Math.max(1, Math.floor((meetW - 4) / 2));
  for (let x = tx; x < tx + 4; x++) {
    prop("meetingChair", x, 3, 1, 1, false, "down");
    prop("meetingChair", x, 6, 1, 1, false, "up");
  }
  prop("meetingTable", tx, 4, 4, 2);
  prop("plant", mx + meetW - 1, 2);
  prop("plant", mx + meetW - 1, TOP_H + 1);

  // Mutfak: tezgâh (kahve makinesi, lavabo), buzdolabı, kanepe, sehpa, bitkiler.
  prop("counter", kx0, low, 5, 1);
  prop("fridge", kx0 + KITCHEN_W - 1, low, 1, 2);
  const sofaY = low + KITCHEN_H - 3;
  prop("sofa", kx0 + 2, sofaY - 1, 3, 2, false);
  block(kx0 + 2, sofaY - 1, 3, 1);
  prop("coffeeTable", kx0 + 2, sofaY + 1, 3, 1);
  prop("plant", kx0, low + KITCHEN_H - 1);
  prop("plant", kx0 + KITCHEN_W - 1, low + KITCHEN_H - 1);
  const lounge = {
    coffee: { x: kx0 + 1, y: low + 1, face: "up" as Dir },
    sofa: [0, 1, 2].map((i) => ({ x: kx0 + 2 + i, y: sofaY, face: "down" as Dir })),
    stand: [
      { x: kx0 + 5, y: low + 3, face: "left" as Dir },
      { x: kx0 + 4, y: low + 4, face: "up" as Dir },
      { x: kx0 + 6, y: low + 4, face: "left" as Dir },
      { x: kx0 + 3, y: low + 2, face: "up" as Dir }
    ]
  };

  // Çalışma alanı: yazıcı, su sebili, bitkiler (sağ kenar sütununda).
  prop("printer", workW, low);
  prop("cooler", workW, low + 1);
  prop("plant", 1, low + lowH - 1);
  prop("plant", workW, low + lowH - 1);

  return {
    cols,
    rows,
    perRow: p,
    tiles,
    rooms,
    blocked,
    desks,
    seats,
    lead: { cell: { x: leadDesk.x, y: leadSeat.y - 1 }, seat: leadSeat, desk: leadDesk },
    lounge,
    door: leadDoor,
    props
  };
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
