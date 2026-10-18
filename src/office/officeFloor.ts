// Piksel ofisin kat planı (spec 2026-10-18 ajanlar-yeniden §3 + kalite turları).
// SAF: ajan sayısı + alan boyutu -> karo haritası, oda haritası, duvar ön
// yüzleri, yürünemez karolar, masalar, oturma/durma noktaları, çizilecek
// eşyalar, tam sayı ölçek.
//
//   +========+===========+========================+   sınır (tavan çizgisi)
//   | yüz    | yüz       | yüz (pencere, tahta)   |   duvar ön yüzü: 2 karo
//   | sunucu |  lider    |  toplantı              |   üst sıra: sabit
//   | arşiv  |  (ahşap)  |  masa + sandalyeler    |
//   +==kapı==+====kapı===+==kapı==================+   ara duvar: sınır +
//   | yüz    | cam bölme | yüz (pano, saat, tablo)|   2 karo yüz
//   |  açık çalışma alanı (masa sıraları)  | mutfak |   alt sıra: çalışma
//   |  ... ajan sayısıyla büyür            | (karo) |   alanı büyür, mutfak
//   |==ara duvar (12 üstü), kapılı=========+========+   sabit
//   |  ikinci bölüm                                 |
//   +===============================================+
//
// Birim karo (16 px). Masa hücresi CELL_W x CELL_H: satır 0 koridor + ad
// etiketi, 1 masa (dolu), 2 koltuk (kişi yukarı, monitöre bakar), 3 koridor.

export const TILE = 16;
export const CELL_W = 4;
export const CELL_H = 4;
export const DESK_W = 3;
export const ROOM_CAP = 12;
export const MAX_DESKS = ROOM_CAP * 2;
/** Duvar: bir karo sınır + iki karo ön yüz. */
const WALL_T = 3;
const TOP_H = 6;
const SERVER_W = 4;
const LEAD_W = 7;
const KITCHEN_W = 8;
const KITCHEN_H = 9;
const MIN_SCALE = 2;
const MAX_SCALE = 4;

export type FloorKind = "wood" | "tile" | "carpet" | "concrete" | "blueprint" | "greenGrid" | "grayCheck" | "darkCheck" | "lightCheck";
export type TileKind = "wall" | "glass" | "door" | FloorKind;
export type RoomId = "work" | "workB" | "leader" | "meeting" | "kitchen" | "server";
export type Dir = "down" | "up" | "left" | "right";
export type FacePart = "upper" | "lower";

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
  | "painting"
  | "plant"
  | "rack"
  | "shelf"
  | "bookshelf"
  | "globe"
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
  | "guestChair"
  | "extinguisher";

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  face?: Dir;
  /** Aynı türün çeşitleri arasında seçim (tablo, bitki, halı). */
  variant?: number;
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
  /** Duvarın görünen ön yüzü (iki karo): üst ve alt yarı; öteki karolarda null. */
  faces: (FacePart | null)[][];
  /** Yürünemez: duvar, cam, eşya. Kapı ve koltuk yürünebilir. */
  blocked: boolean[][];
  desks: DeskSpot[];
  /** desks ile aynı sırada: kişinin oturduğu karo. */
  seats: Spot[];
  lead: { cell: { x: number; y: number }; seat: Spot; desk: { x: number; y: number } };
  lounge: { coffee: Spot; sofa: Spot[]; stand: Spot[] };
  /** Lider yokken ışının çıktığı yer: lider odasının kapısı (sınır karosu). */
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
  const workH = rowsA * CELL_H + (rowsB > 0 ? WALL_T + rowsB * CELL_H : 0);
  const lowH = Math.max(KITCHEN_H, workH);
  const top = WALL_T;
  const yW = top + TOP_H;
  const low = yW + WALL_T;
  const rows = low + lowH + 1;

  const tiles: TileKind[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, (): TileKind => "wall"));
  const rooms: (RoomId | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, (): RoomId | null => null));
  const faces: (FacePart | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, (): FacePart | null => null));
  const blocked: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
  const area = (x0: number, y0: number, w: number, h: number, kind: FloorKind, room: RoomId) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        tiles[y][x] = kind;
        rooms[y][x] = room;
        faces[y][x] = null;
        blocked[y][x] = false;
      }
  };
  /** Bir karo sınırın altında iki karo ön yüz (x0..x1 dahil). */
  const faceRow = (y: number, x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) {
      faces[y + 1][x] = "upper";
      faces[y + 2][x] = "lower";
    }
  };
  /** Kapı: sınırı ve iki yüz karosunu delen geçit. */
  const doorway = (x: number, y: number, through = WALL_T) => {
    for (let k = 0; k < through; k++) {
      tiles[y + k][x] = "door";
      faces[y + k][x] = null;
      blocked[y + k][x] = false;
    }
  };
  const block = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) blocked[y][x] = true;
  };
  const props: Prop[] = [];
  const prop = (kind: PropKind, x: number, y: number, w = 1, h = 1, solid = true, extra: Partial<Prop> = {}) => {
    props.push({ kind, x, y, w, h, ...extra });
    if (solid) block(x, y, w, h);
  };

  // Üst sıra: sunucu/arşiv, lider odası, toplantı. Üst dış duvarın yüzü odaların üstünde.
  const sx = 1;
  const lx = sx + SERVER_W + 1;
  const mx = lx + LEAD_W + 1;
  const meetW = cols - 1 - mx;
  area(sx, top, SERVER_W, TOP_H, "darkCheck", "server");
  area(lx, top, LEAD_W, TOP_H, "blueprint", "leader");
  area(mx, top, meetW, TOP_H, "greenGrid", "meeting");
  faceRow(0, sx, sx + SERVER_W - 1);
  faceRow(0, lx, lx + LEAD_W - 1);
  faceRow(0, mx, mx + meetW - 1);

  // Alt sıra: çalışma alanı + mutfak. Ara duvarın yüzü alt sıranın üstünde.
  area(1, low, workW, lowH, "grayCheck", "work");
  const kx = 1 + workW;
  const kx0 = kx + 1;
  area(kx0, low, KITCHEN_W, KITCHEN_H, "lightCheck", "kitchen");
  faceRow(yW, 1, cols - 2);
  // Lider odasının çalışma alanına bakan yüzü camdan.
  for (let x = lx; x < lx + LEAD_W; x++) {
    tiles[yW + 1][x] = "glass";
    tiles[yW + 2][x] = "glass";
  }
  doorway(sx + 2, yW);
  const leadDoor = { x: lx + 5, y: yW };
  doorway(leadDoor.x, leadDoor.y);
  doorway(mx + 2, yW);
  doorway(kx, low + 4, 1);
  if (lowH > KITCHEN_H) {
    // Mutfağı alttan duvar kapatıyor; altı (sığarsa) çalışma alanına katılıyor.
    const by = low + KITCHEN_H;
    if (by + 2 < low + lowH) faceRow(by, kx0, cols - 2);
    if (lowH > KITCHEN_H + WALL_T) area(kx, by + WALL_T, KITCHEN_W + 1, lowH - KITCHEN_H - WALL_T, "grayCheck", "work");
  }
  let partition = -1;
  if (rowsB > 0) {
    partition = low + rowsA * CELL_H;
    for (let y = partition; y < partition + WALL_T; y++)
      for (let x = 1; x <= workW; x++) {
        tiles[y][x] = "wall";
        rooms[y][x] = null;
        blocked[y][x] = true;
      }
    faceRow(partition, 1, workW);
    doorway(3, partition);
    doorway(workW - 2, partition);
    for (let y = partition + WALL_T; y < low + lowH; y++) for (let x = 1; x < cols - 1; x++) if (rooms[y][x] === "work") rooms[y][x] = "workB";
  }

  // Masalar.
  const desks: DeskSpot[] = [];
  const seats: Spot[] = [];
  for (let i = 0; i < n; i++) {
    const second = i >= ROOM_CAP;
    const k = second ? i - ROOM_CAP : i;
    const y0 = second ? partition + WALL_T : low;
    const d: DeskSpot = { x: 2 + (k % p) * CELL_W, y: y0 + Math.floor(k / p) * CELL_H, room: second ? "workB" : "work" };
    desks.push(d);
    seats.push({ x: d.x + 1, y: d.y + 2, face: "up" });
    prop("desk", d.x, d.y + 1, DESK_W, 1, true, { variant: i });
  }

  // Üst dış duvarın yüzü: pencereler, saat, tahta.
  prop("window", sx + 1, 1, 2, 2, true, { variant: 0 });
  prop("window", lx + 3, 1, 2, 2, true, { variant: 1 });
  prop("clock", lx + 6, 1, 1, 1, true);
  prop("whiteboard", mx + 1, 1, 2, 2, true);
  for (let x = mx + 5, i = 0; x + 2 <= cols - 1; x += 4, i++) prop("window", x, 1, 2, 2, true, { variant: i % 2 });
  // Ara duvarın çalışma alanına bakan yüzü: pano, saat, tablolar; mutfakta tablo.
  prop("board", mx, yW + 1, 2, 1, true);
  prop("painting", sx, yW + 1, 2, 1, true, { variant: 5 });
  prop("extinguisher", sx + 3, yW + 2, 1, 1, true);
  prop("clock", mx + 3, yW + 1, 1, 1, true);
  for (let x = mx + 5, i = 0; x + 2 <= kx; x += 4, i++) prop("painting", x, yW + 1, 2, 1, true, { variant: i });
  prop("painting", kx0 + 5, yW + 1, 2, 1, true, { variant: 3 });

  // Sunucu/arşiv.
  prop("rack", sx, top, 1, 2);
  prop("rack", sx + 1, top, 1, 2);
  prop("shelf", sx + 3, top, 1, 3);
  prop("shelf", sx, top + TOP_H - 2, 1, 2);

  // Lider odası: masa, misafir sandalyesi, kitaplık, halı, bitki, küre.
  const leadDesk = { x: lx + 2, y: top + 2 };
  prop("rug", lx + 1, top + 1, 5, 4, false, { variant: 0 });
  prop("bookshelf", lx, top, 2, 1);
  prop("plant", lx + LEAD_W - 1, top, 1, 1, true, { variant: 0 });
  prop("plant", lx, top + TOP_H - 1, 1, 1, true, { variant: 1 });
  prop("globe", lx + LEAD_W - 1, top + TOP_H - 1);
  prop("guestChair", leadDesk.x + 1, leadDesk.y + 1, 1, 1, true, { face: "up" });
  prop("desk", leadDesk.x, leadDesk.y, DESK_W, 1);
  const leadSeat: Spot = { x: leadDesk.x + 1, y: leadDesk.y - 1, face: "down" };

  // Toplantı: halı, masa, sandalyeler, bitkiler.
  const tx = mx + Math.max(1, Math.floor((meetW - 4) / 2));
  prop("rug", tx - 1, top + 1, 6, 4, false, { variant: 1 });
  for (let x = tx; x < tx + 4; x++) {
    prop("meetingChair", x, top + 1, 1, 1, false, { face: "down", variant: x });
    prop("meetingChair", x, top + 4, 1, 1, false, { face: "up", variant: x });
  }
  prop("meetingTable", tx, top + 2, 4, 2);
  prop("plant", mx + meetW - 1, top, 1, 1, true, { variant: 2 });
  prop("plant", mx + meetW - 1, top + TOP_H - 1, 1, 1, true, { variant: 0 });
  prop("plant", mx, top + TOP_H - 1, 1, 1, true, { variant: 1 });

  // Mutfak: tezgâh (kahve makinesi, lavabo), buzdolabı, kanepe, sehpa, bitkiler.
  prop("counter", kx0, low, 5, 1);
  prop("fridge", kx0 + KITCHEN_W - 1, low, 1, 2);
  const sofaY = low + KITCHEN_H - 3;
  prop("rug", kx0 + 1, sofaY - 1, 5, 3, false, { variant: 2 });
  prop("sofa", kx0 + 2, sofaY - 1, 3, 2, false);
  block(kx0 + 2, sofaY - 1, 3, 1);
  prop("coffeeTable", kx0 + 2, sofaY + 1, 3, 1);
  prop("plant", kx0, low + KITCHEN_H - 1, 1, 1, true, { variant: 2 });
  prop("plant", kx0 + KITCHEN_W - 1, low + KITCHEN_H - 1, 1, 1, true, { variant: 0 });
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

  // Çalışma alanı: yazıcı, su sebili, kitaplık, bitkiler (kenar sütunlarında).
  prop("printer", workW, low);
  prop("cooler", workW, low + 2);
  prop("plant", 1, low + lowH - 1, 1, 1, true, { variant: 0 });
  prop("plant", workW, low + lowH - 1, 1, 1, true, { variant: 2 });

  return {
    cols,
    rows,
    perRow: p,
    tiles,
    rooms,
    faces,
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
