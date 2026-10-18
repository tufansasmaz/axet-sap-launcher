// Ofisin dünya modeli: 1600x900 kat. Üstte açık ofis (y 0..520), altta dört
// oda (mutfak / lider / sunucu / dinlenme, her biri 360 px) ve x 720..880
// arasında koridor. Odalar, duvarlar, kapılar, eşya, çarpışma ızgarası, A*.
// SAF: belge gerektirmiyor (sprite ölçüleri officeSprites'tan, görüntüler
// çizim anında üretiliyor).
import type { TranslationKey } from "../i18n/tr";
import { F, type Art, type Dir } from "./officeSprites";

export const W = 1600;
export const H = 900;
export const SPLIT = 520;
export const CELL = 8;

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------ odalar ve duvarlar
export type FloorKind = "wood" | "walnut" | "terrazzo" | "antistatic" | "lab";
export interface Room {
  id: "hall" | "corr" | "coffee" | "command" | "server" | "gym";
  label: TranslationKey | null;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: FloorKind;
  door?: number;
}

export const ROOMS: Room[] = [
  { id: "hall", label: "office.room.hall", x: 0, y: 0, w: W, h: SPLIT, floor: "wood" },
  { id: "corr", label: null, x: 720, y: SPLIT, w: 160, h: H - SPLIT, floor: "wood" },
  { id: "coffee", label: "office.room.coffee", x: 0, y: SPLIT, w: 360, h: H - SPLIT, floor: "terrazzo", door: 292 },
  { id: "command", label: "office.room.command", x: 360, y: SPLIT, w: 360, h: H - SPLIT, floor: "walnut", door: 652 },
  { id: "server", label: "office.room.server", x: 880, y: SPLIT, w: 360, h: H - SPLIT, floor: "antistatic", door: 948 },
  { id: "gym", label: "office.room.gym", x: 1240, y: SPLIT, w: 360, h: H - SPLIT, floor: "lab", door: 1308 }
];
export const DOOR_W = 64;
/** Kuzey duvar yüzünün alt kenarı. */
export const NORTH_FACE = 84;
export const MID_CAP: [number, number] = [SPLIT - 16, SPLIT];
export const MID_FACE: [number, number] = [SPLIT, SPLIT + 36];
export const V_WALLS = [360, 720, 880, 1240];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Duvarların katı dikdörtgenleri (kapılarda yürünebilir boşluk). */
export const wallRects: Box[] = [
  { x: 0, y: 0, w: W, h: NORTH_FACE + 6 },
  { x: 0, y: 0, w: 12, h: H },
  { x: W - 12, y: 0, w: 12, h: H },
  { x: 0, y: H - 16, w: W, h: 16 }
];
{
  // dört odanın üstündeki yatay orta duvar (koridorun üstünde yok)
  const spans: Array<[number, number]> = [[0, 720], [880, W]];
  const doors = ROOMS.filter((r) => r.door).map((r) => [r.door! - DOOR_W / 2, r.door! + DOOR_W / 2] as [number, number]);
  for (const [a, b] of spans) {
    let x = a;
    for (const [d0, d1] of doors.filter((d) => d[0] >= a && d[1] <= b).sort((p, q) => p[0] - q[0])) {
      wallRects.push({ x, y: MID_CAP[0], w: d0 - x, h: MID_FACE[1] - MID_CAP[0] });
      x = d1;
    }
    wallRects.push({ x, y: MID_CAP[0], w: b - x, h: MID_FACE[1] - MID_CAP[0] });
  }
  for (const vx of V_WALLS) wallRects.push({ x: vx - 8, y: MID_CAP[0], w: 16, h: H - MID_CAP[0] });
}

// ------------------------------------------------------------ eşya
export type DynKind = "screen" | "lead" | "monwall" | "console" | "rack" | "tread" | "tv";
export interface Screen {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Item {
  art: Art;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Y sıralamasında kullanılan taban çizgisi. */
  base: number;
  dyn?: DynKind;
  kind?: "window";
  solid: Box | null;
  seed?: number;
  screen?: Screen;
  screens?: Screen[];
  /** Masaya kahve kupası bırakıldığı an (buhar). */
  mugAt?: number;
}

/** Y sıralı çizilen eşya. */
export const items: Item[] = [];
/** Arka plana gömülen (duvara asılı) eşya. */
export const bgItems: Item[] = [];
/** Arka plana gömülü ama canlı katmanı olan eşya. */
export const dyns: Item[] = [];

interface PlaceOpts {
  base?: number;
  dyn?: DynKind;
  kind?: "window";
  bg?: boolean;
  solid?: Box | false;
}
function place(a: Art, x: number, y: number, o: PlaceOpts = {}): Item {
  const it: Item = { art: a, x, y, w: a.w, h: a.h, base: o.base ?? y + a.h, dyn: o.dyn, kind: o.kind, solid: null };
  if (o.bg) {
    bgItems.push(it);
    if (o.dyn) dyns.push(it);
    return it;
  }
  it.solid = o.solid === false ? null : (o.solid ?? { x, y: y + it.h * 0.35, w: it.w, h: it.h * 0.65 });
  items.push(it);
  return it;
}

// kuzey duvarı süsleri
place(F.poster("#4f8fe0", "#f0c44c"), 30, 26, { bg: true });
place(F.windowPane(), 120, 22, { bg: true, kind: "window" });
place(F.windowPane(), 340, 22, { bg: true, kind: "window" });
place(F.whiteboard(), 560, 24, { bg: true });
export const monWall = place(F.monitorWall(), 704, 18, { bg: true, dyn: "monwall" });
place(F.clock(), 925, 36, { bg: true });
place(F.windowPane(), 1000, 22, { bg: true, kind: "window" });
place(F.windowPane(), 1220, 22, { bg: true, kind: "window" });
place(F.poster("#e2685a", "#f7f8fa"), 1530, 26, { bg: true });

/** Oturulacak yer: ayak noktası, bakış yönü ve (varsa) masası. */
export interface Seat {
  id: string;
  x: number;
  y: number;
  dir: Dir;
  desk: Item | null;
  /** Kanepe ya da tabure: karakter belden yukarı çiziliyor. */
  low: boolean;
}

// kuzey duvarı boyunca masalar
const DESK_X = [110, 250, 390, 530, 1070, 1210, 1350, 1490];
/** Çalışma masaları, soldan sağa. */
export const desks: Seat[] = [];
DESK_X.forEach((cx, i) => {
  const d = place(F.desk(), cx - 45, 96, { solid: { x: cx - 45, y: 104, w: 90, h: 40 }, dyn: "screen" });
  d.screen = { x: cx - 45 + 11 * 3, y: 96 + 3, w: 24, h: 15 };
  place(F.chairSeat(), cx - 15, 150, { solid: false });
  // sandalyenin sırtı oturanın güneyinde: ondan sonra çizilmeli
  place(F.chairBack(), cx - 15, 168, { solid: false, base: 186 });
  desks.push({ id: `desk${i}`, x: cx, y: 176, dir: "up", desk: d, low: false });
});
for (const cx of [180, 320, 460, 1140, 1280, 1420]) place(F.partition(), cx - 3, 90, { solid: { x: cx - 3, y: 110, w: 6, h: 52 } });
/** Liderin masası (ortada, iki ekranlı). */
export const leadSeat: Seat = (() => {
  const d = place(F.leadDesk(), 734, 98, { solid: { x: 734, y: 108, w: 132, h: 44 }, dyn: "lead" });
  d.screens = [
    { x: 734 + 27, y: 101, w: 24, h: 15 },
    { x: 734 + 81, y: 101, w: 24, h: 15 }
  ];
  place(F.chairSeat("#6b4a8a"), 785, 158, { solid: false });
  place(F.chairBack("#6b4a8a"), 785, 176, { solid: false, base: 194 });
  return { id: "lead", x: 800, y: 184, dir: "up", desk: d, low: false };
})();
place(F.plant(true), 16, 90);
place(F.plant(true), W - 52, 90);
place(F.trash(), 600, 132);
place(F.trash(), 1000, 132);

// toplantı alanı (halı zemine gömülü)
export const CARPET: Box = { x: 560, y: 250, w: 480, h: 200 };
place(F.meetingTable(), 716, 300, { solid: { x: 716, y: 306, w: 168, h: 54 } });
/** Toplantı masasının tabureleri: masalar dolunca taşan ajanlar burada çalışıyor. */
export const stools: Seat[] = [];
for (const sx of [742, 800, 858]) {
  place(F.chairSeat("#3b6ea8"), sx - 15, 274, { solid: false });
  place(F.chairSeat("#3b6ea8"), sx - 15, 372, { solid: false });
  stools.push({ id: `stoolN${sx}`, x: sx, y: 290, dir: "down", desk: null, low: true });
  stools.push({ id: `stoolS${sx}`, x: sx, y: 388, dir: "up", desk: null, low: true });
}
// sol dinlenme köşesi
place(F.plant(true), 24, 260);
place(F.sofa("#3b6ea8"), 90, 300, { solid: { x: 90, y: 300, w: 120, h: 36 } });
place(F.coffeeTable(), 126, 372, { solid: { x: 126, y: 376, w: 48, h: 20 } });
place(F.beanbag("#e2685a"), 250, 380);
place(F.beanbag("#f0c44c"), 300, 410);
place(F.plant(), 410, 440);
// sağ köşe
place(F.cabinet(), 1470, 230, { solid: { x: 1470, y: 250, w: 36, h: 34 } });
place(F.bookshelf(), 1530, 210, { solid: { x: 1530, y: 240, w: 54, h: 48 } });
place(F.printer(), 1420, 300, { solid: { x: 1420, y: 310, w: 48, h: 26 } });
place(F.roundTable(), 1210, 320, { solid: { x: 1214, y: 324, w: 46, h: 22 } });
place(F.beanbag("#3ddc84"), 1150, 380);
place(F.beanbag("#b48cff"), 1270, 400);
place(F.plant(), 1110, 440);
place(F.plant(true), W - 52, 440);
place(F.plant(), 660, 452);
place(F.plant(), 904, 452);

// mutfak
place(F.coffeeMachine(), 30, 560, { solid: { x: 30, y: 566, w: 30, h: 36 } });
place(F.counter(30), 64, 566, { solid: { x: 64, y: 566, w: 90, h: 36 } });
place(F.waterCooler(), 166, 556, { solid: { x: 166, y: 580, w: 24, h: 36 } });
place(F.vending(), 16, 660, { solid: { x: 16, y: 670, w: 48, h: 62 } });
place(F.fridge(), 302, 620, { solid: { x: 302, y: 640, w: 36, h: 52 } });
place(F.roundTable(), 140, 690, { solid: { x: 144, y: 694, w: 46, h: 22 } });
place(F.chairSeat("#d16b56"), 118, 734, { solid: false });
place(F.chairSeat("#d16b56"), 184, 734, { solid: false });
place(F.beanbag("#4f8fe0"), 120, 806);
place(F.beanbag("#4f8fe0"), 176, 820);
place(F.beanbag("#4f8fe0"), 232, 806);
place(F.plant(), 310, 820);

// lider odası
place(F.monitorWall(), 390, 560, { solid: { x: 390, y: 570, w: 192, h: 50 }, dyn: "monwall" });
for (const [x, y] of [[400, 680], [520, 680], [400, 770], [520, 770]]) {
  const c = place(F.console(), x, y, { solid: { x, y: y + 12, w: 72, h: 24 }, dyn: "console" });
  c.screens = [
    { x: x + 9, y: y + 3, w: 18, h: 12 },
    { x: x + 45, y: y + 3, w: 18, h: 12 }
  ];
}
place(F.cabinet(), 650, 690, { solid: { x: 650, y: 710, w: 36, h: 34 } });
place(F.plant(), 670, 820);

// sunucu odası
export const racks: Item[] = [];
for (const y of [570, 720]) for (const x of [1010, 1060, 1110, 1160]) racks.push(place(F.serverRack(), x, y, { solid: { x, y: y + 20, w: 42, h: 70 }, dyn: "rack" }));
for (const x of [900, 950]) racks.push(place(F.serverRack(), x, 720, { solid: { x, y: 740, w: 42, h: 70 }, dyn: "rack" }));
racks.forEach((r, i) => {
  r.seed = i * 7 + 3;
});

// dinlenme odası
for (const x of [1380, 1440, 1500]) place(F.treadmill(), x, 566, { solid: { x, y: 566, w: 42, h: 26 }, dyn: "tread" });
place(F.punchingBag(), 1270, 700, { solid: { x: 1274, y: 744, w: 22, h: 20 } });
place(F.bench(), 1360, 760, { solid: { x: 1360, y: 760, w: 78, h: 14 } });
place(F.dumbbells(), 1490, 830, { solid: { x: 1490, y: 830, w: 72, h: 26 } });
place(F.yogaBall("#e2685a"), 1300, 830);
place(F.yogaBall("#4f8fe0"), 1540, 720);
place(F.plant(), 1555, 640);
place(F.tv(), 755, 826, { solid: { x: 755, y: 840, w: 90, h: 20 }, dyn: "tv" });

// ------------------------------------------------------------ dinlenme noktaları
// Boştaki ajanların gittiği yerler. x/y ayak, face bakış, anim etkinlik pozu.
export type AmenityKind = "coffee" | "vending" | "sofa" | "gym" | "server" | "meet" | "office";
export interface Amenity {
  id: string;
  kind: AmenityKind;
  x: number;
  y: number;
  face: Dir;
  sit?: boolean;
  anim?: "run" | "punch";
}
export const AMENITIES: Amenity[] = [
  { id: "coffee", kind: "coffee", x: 45, y: 622, face: "up" },
  { id: "water", kind: "coffee", x: 178, y: 632, face: "up" },
  { id: "vending", kind: "vending", x: 84, y: 712, face: "left" },
  { id: "fridge", kind: "coffee", x: 284, y: 680, face: "right" },
  { id: "sofa1", kind: "sofa", x: 128, y: 332, face: "down", sit: true },
  { id: "sofa2", kind: "sofa", x: 172, y: 332, face: "down", sit: true },
  { id: "tread1", kind: "gym", x: 1401, y: 640, face: "up", anim: "run" },
  { id: "tread2", kind: "gym", x: 1461, y: 640, face: "up", anim: "run" },
  { id: "bag", kind: "gym", x: 1318, y: 760, face: "left", anim: "punch" },
  { id: "rack", kind: "server", x: 1031, y: 690, face: "up" },
  { id: "meetW", kind: "meet", x: 696, y: 336, face: "right" },
  { id: "meetE", kind: "meet", x: 904, y: 336, face: "left" },
  { id: "meetS", kind: "meet", x: 800, y: 392, face: "up" },
  { id: "printer", kind: "office", x: 1444, y: 356, face: "up" },
  { id: "books", kind: "office", x: 1556, y: 304, face: "up" },
  { id: "wall", kind: "office", x: 800, y: 230, face: "up" },
  { id: "console", kind: "office", x: 436, y: 740, face: "up" }
];

// ------------------------------------------------------------ çarpışma ızgarası
export const GW = Math.ceil(W / CELL);
export const GH = Math.ceil(H / CELL);
const grid = new Uint8Array(GW * GH);
function blockRect(r: Box) {
  const x0 = Math.max(0, Math.floor(r.x / CELL));
  const y0 = Math.max(0, Math.floor(r.y / CELL));
  const x1 = Math.min(GW - 1, Math.floor((r.x + r.w - 1) / CELL));
  const y1 = Math.min(GH - 1, Math.floor((r.y + r.h - 1) / CELL));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * GW + x] = 1;
}
wallRects.forEach(blockRect);
items.forEach((it) => it.solid && blockRect(it.solid));

export const cellFree = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < GW && cy < GH && !grid[cy * GW + cx];
export const freeAt = (x: number, y: number) => cellFree(Math.floor(x / CELL), Math.floor(y / CELL));
/** Ayak izi: ayak noktası çevresinde küçük bir kutu. */
export function canStand(x: number, y: number): boolean {
  return freeAt(x - 7, y - 4) && freeAt(x + 7, y - 4) && freeAt(x - 7, y) && freeAt(x + 7, y);
}

export interface Pt {
  x: number;
  y: number;
}

class MinHeap {
  private k: number[] = [];
  private v: number[] = [];
  get size() {
    return this.k.length;
  }
  push(key: number, val: number) {
    const a = this.k;
    const b = this.v;
    let i = a.length;
    a.push(key);
    b.push(val);
    while (i) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      [b[p], b[i]] = [b[i], b[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.k;
    const b = this.v;
    const top = b[0];
    const lk = a.pop() as number;
    const lv = b.pop() as number;
    if (a.length) {
      a[0] = lk;
      b[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [b[m], b[i]] = [b[i], b[m]];
        i = m;
      }
    }
    return top;
  }
}

/** A*: 8 yönlü, köşe kesmeden. Hedefe varılamazsa en yakın noktaya kadar. */
export function findPath(sx: number, sy: number, tx: number, ty: number): Pt[] {
  const s: [number, number] = [Math.floor(sx / CELL), Math.floor(sy / CELL)];
  const t: [number, number] = [Math.floor(tx / CELL), Math.floor(ty / CELL)];
  const idx = (x: number, y: number) => y * GW + x;
  const open = new MinHeap();
  const g = new Float32Array(GW * GH).fill(Infinity);
  const came = new Int32Array(GW * GH).fill(-1);
  const closed = new Uint8Array(GW * GH);
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - t[0]);
    const dy = Math.abs(y - t[1]);
    return dx + dy - 0.59 * Math.min(dx, dy);
  };
  const start = idx(s[0], s[1]);
  g[start] = 0;
  open.push(h(s[0], s[1]), start);
  const targetIdx = idx(t[0], t[1]);
  // oturak/dinlenme hücresi dolu işaretli olabilir; orada bitmeye izin ver
  const isFree = (x: number, y: number) => cellFree(x, y) || idx(x, y) === targetIdx;
  let best = start;
  let bestH = h(s[0], s[1]);
  let iter = 0;
  while (open.size && iter++ < 60000) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GW;
    const cy = (cur / GW) | 0;
    if (cur === targetIdx) {
      best = cur;
      break;
    }
    const hc = h(cx, cy);
    if (hc < bestH) {
      bestH = hc;
      best = cur;
    }
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!isFree(nx, ny)) continue;
        if (dx && dy && (!cellFree(cx + dx, cy) || !cellFree(cx, cy + dy))) continue;
        const ni = idx(nx, ny);
        const ng = g[cur] + (dx && dy ? 1.414 : 1);
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          open.push(ng + h(nx, ny), ni);
        }
      }
  }
  const path: Pt[] = [];
  for (let c = best; c !== -1 && c !== start; c = came[c]) path.push({ x: (c % GW) * CELL + CELL / 2, y: ((c / GW) | 0) * CELL + CELL / 2 });
  path.reverse();
  if (best === targetIdx && path.length) path[path.length - 1] = { x: tx, y: ty };
  return smooth(path, sx, sy);
}

/** Aynı doğrultudaki noktaları at: yürüyüş titremesin. */
function smooth(path: Pt[], sx: number, sy: number): Pt[] {
  if (path.length < 3) return path;
  const out: Pt[] = [];
  let px = sx;
  let py = sy;
  let dir: string | null = null;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const d = `${Math.sign(Math.round(p.x - px))},${Math.sign(Math.round(p.y - py))}`;
    if (dir !== null && d !== dir) out.push(path[i - 1]);
    dir = d;
    px = p.x;
    py = p.y;
  }
  out.push(path[path.length - 1]);
  return out;
}

export const DOORS = ROOMS.filter((r) => r.door).map((r) => ({ x: r.door!, y: SPLIT, w: DOOR_W }));
export const WINDOWS = bgItems.filter((it) => it.kind === "window").map((it) => ({ x: it.x, w: it.w, y: it.y + it.h }));
export const LAMPS: Pt[] = [
  { x: 300, y: 300 },
  { x: 800, y: 330 },
  { x: 1300, y: 300 },
  { x: 330, y: 160 },
  { x: 1270, y: 160 },
  ...ROOMS.filter((r) => r.id !== "hall").map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 + 20 }))
];
/** Ajanların ofise girdiği nokta (koridorun ağzı). */
export const ENTRY: Pt = { x: 800, y: 480 };

/** Çalışan koltukları sırasıyla: önce masalar, dolunca toplantı tabureleri. */
export const WORK_SEATS: Seat[] = [...desks, ...stools];
