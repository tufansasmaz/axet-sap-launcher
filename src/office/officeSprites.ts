// Piksel ofisin kodla çizilen sprite'ları. Her sprite U ekran pikseli
// büyüklüğünde "birim"lerle çiziliyor; bütün ofis tek bir iri piksel
// ızgarasını paylaşıyor. Dış görsel yok.
//
// Geometri (genişlik/yükseklik) SAF: dünya modeli (officeWorld) belge olmadan
// da kurulabiliyor, A* testleri node'da koşuyor. Görüntü (canvas) ancak
// çizim anında (officeScene.artImage) üretilip önbelleğe alınıyor.

export const U = 3;

type Rect = (x: number, y: number, w: number, h: number, col: string) => void;

/** Ölçüsü belli, çizimi tembel bir sprite. */
export interface Art {
  w: number;
  h: number;
  draw: (r: Rect) => void;
}

export function art(wu: number, hu: number, draw: (r: Rect) => void): Art {
  return { w: wu * U, h: hu * U, draw };
}


export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return "#" + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- karakterler
// 10x16 ızgara. h saç, s ten, e göz, t gömlek, a kol gölgesi, p pantolon, f ayakkabı.
export type Dir = "down" | "up" | "left" | "right";
export type HairStyle = "short" | "long" | "bun" | "cap";

export interface Look {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
  style: HairStyle;
  cap?: string;
}

const CHAR: Record<"down" | "up" | "right", string[]> = {
  down: [
    "...hhhh...", "..hhhhhh..", "..hhhhhh..", "..hssssh..", "..sesses..", "..ssssss..",
    "...ssss...", "..tttttt..", ".tttttttt.", ".atttttta.", ".stttttts.", "..tttttt..",
    "..pppppp..", "..pp..pp..", "..pp..pp..", "..ff..ff.."
  ],
  up: [
    "...hhhh...", "..hhhhhh..", "..hhhhhh..", "..hhhhhh..", "..hhhhhh..", "..shhhhs..",
    "...ssss...", "..tttttt..", ".tttttttt.", ".atttttta.", ".stttttts.", "..tttttt..",
    "..pppppp..", "..pp..pp..", "..pp..pp..", "..ff..ff.."
  ],
  right: [
    "...hhhh...", "..hhhhhh..", "..hhhhhh..", "..hhhsss..", "..hhsses..", "..hsssss..",
    "...ssss...", "...tttt...", "..tttttt..", "..ttatt...", "..ttstt...", "...tttt...",
    "...pppp...", "...pp.pp..", "...pp.pp..", "...ff.ff.."
  ]
};

const setAt = (row: string, i: number, ch: string) => row.slice(0, i) + ch + row.slice(i + 1);
const mirror = (row: string) => row.split("").reverse().join("");

/** Saç biçimi uygulanmış satırlar; sol her zaman sağın aynası. */
export function styledRows(dir: Dir, style: HairStyle): string[] {
  if (dir === "left") return styledRows("right", style).map(mirror);
  const rows = CHAR[dir].slice();
  if (style === "long") {
    if (dir === "down") for (let y = 3; y <= 8; y++) rows[y] = setAt(setAt(rows[y], 1, "h"), 8, "h");
    if (dir === "up") for (let y = 5; y <= 8; y++) for (let x = 2; x <= 7; x++) rows[y] = setAt(rows[y], x, "h");
    if (dir === "right")
      for (let y = 3; y <= 8; y++) {
        rows[y] = setAt(rows[y], 2, "h");
        if (y > 3 && y < 8) rows[y] = setAt(rows[y], 1, "h");
      }
  } else if (style === "bun") {
    rows[0] = dir === "right" ? "..hh......" : "....hh....";
    rows[1] = "...hhhh...";
    rows[2] = "..hhhhhh..";
  } else if (style === "cap") {
    rows[0] = "...cccc...";
    rows[1] = "..cccccc..";
    rows[2] = "..cccccc..";
    if (dir === "down") rows[3] = ".cccccccc.";
    if (dir === "right") rows[3] = "..hhcccccc";
  }
  return rows;
}

// Yürüme kareleri alttaki üç satırı değiştiriyor.
const LEGS: Record<"front" | "side", string[][]> = {
  front: [
    ["..pp..pp..", "..pp..pp..", "..ff..ff.."],
    ["..pp..pp..", "..ff..pp..", "......ff.."],
    ["..pp..pp..", "..pp..ff..", "..ff......"]
  ],
  side: [
    ["...pp.pp..", "...pp.pp..", "...ff.ff.."],
    ["..pp...pp.", "..ff...pp.", ".......ff."],
    ["...pppp...", "...ffpp...", ".....ff..."]
  ]
};

export const SKIN = ["#f1c7a0", "#e0a97e", "#c68a5e", "#9a6a45", "#f5d3b5"];

const charCache = new Map<string, Art>();

/** Karakter sprite'ı; frame 0..2 (0 duruş, 1-2 yürüyüş). */
export function charArt(look: Look, dir: Dir, frame: number): Art {
  const key = `${look.hair}${look.skin}${look.shirt}${look.pants}${look.style}${look.cap ?? ""}|${dir}|${frame}`;
  const hit = charCache.get(key);
  if (hit) return hit;
  const rows = styledRows(dir, look.style);
  const side = dir === "left" || dir === "right";
  let legs = LEGS[side ? "side" : "front"][frame] ?? LEGS.front[0];
  if (dir === "left") legs = legs.map(mirror);
  rows.splice(13, 3, ...legs);
  const pal: Record<string, string> = {
    h: look.hair,
    s: look.skin,
    e: "#1b1d24",
    t: look.shirt,
    a: shade(look.shirt, 0.78),
    p: look.pants,
    f: "#22242c",
    c: look.cap ?? "#c0392b"
  };
  const a = art(10, 16, (r) => {
    rows.forEach((row, y) => row.split("").forEach((ch, x) => pal[ch] && r(x, y, 1, 1, pal[ch])));
    // saçın (ya da şapkanın) tepesinde parlaklık
    const top = rows[0].indexOf(look.style === "cap" ? "c" : "h");
    if (top >= 0) r(top, 0, 2, 1, shade(look.style === "cap" ? pal.c : look.hair, 1.35));
  });
  charCache.set(key, a);
  return a;
}

// ---------------------------------------------------------------- mobilya
const WOOD = "#a8784a";
const WOOD_L = "#c79a66";
const WOOD_D = "#7a5232";
const METAL = "#3a3f4d";
const METAL_L = "#555c6e";
const METAL_D = "#272a33";

export const F = {
  desk: () =>
    art(30, 16, (r) => {
      r(0, 4, 30, 9, WOOD); r(0, 4, 30, 1, WOOD_L); r(0, 13, 30, 3, WOOD_D);
      r(1, 13, 2, 3, "#5e3f26"); r(27, 13, 2, 3, "#5e3f26");
      r(10, 0, 10, 7, "#23262f"); r(11, 1, 8, 5, "#2c3446"); r(14, 7, 2, 1, "#23262f");
      r(11, 9, 8, 2, "#d8dbe2"); r(11, 9, 8, 1, "#eef0f4");
      r(21, 9, 2, 2, "#9aa3b5");
      r(3, 6, 5, 4, "#f2efe6"); r(4, 7, 3, 1, "#b9b4a6");
      r(25, 6, 2, 2, "#e9e9e9"); r(25, 6, 2, 1, "#6b3b1f");
    }),
  leadDesk: () =>
    art(44, 18, (r) => {
      r(0, 5, 44, 10, "#8a5a34"); r(0, 5, 44, 1, "#b07a4c"); r(0, 15, 44, 3, "#5e3a1f");
      r(8, 0, 10, 7, "#23262f"); r(9, 1, 8, 5, "#2c3446");
      r(26, 0, 10, 7, "#23262f"); r(27, 1, 8, 5, "#2c3446");
      r(17, 10, 10, 2, "#d8dbe2"); r(3, 8, 4, 4, "#3ddc84"); r(3, 7, 4, 1, "#2a9a5c");
      r(38, 8, 3, 3, "#e9e9e9");
    }),
  chairSeat: (col = "#4a5162") =>
    art(10, 6, (r) => {
      r(0, 0, 10, 5, col); r(0, 0, 10, 1, shade(col, 1.25)); r(4, 5, 2, 1, METAL_D);
    }),
  chairBack: (col = "#4a5162") =>
    art(10, 6, (r) => {
      r(1, 0, 8, 4, shade(col, 0.8)); r(1, 0, 8, 1, col); r(1, 5, 1, 1, METAL_D); r(8, 5, 1, 1, METAL_D);
      r(4, 4, 2, 1, METAL_D);
    }),
  plant: (big = false) =>
    art(12, big ? 20 : 16, (r) => {
      const o = big ? 4 : 0;
      r(3, 10 + o, 6, 6, "#b06a3b"); r(2, 10 + o, 8, 2, "#c97d48"); r(3, 15 + o, 6, 1, "#8c5129");
      const g1 = "#3f8f4a";
      const g2 = "#5bb35f";
      const g3 = "#2d6b37";
      r(4, 1, 4, 10 + o, g1); r(1, 4, 10, 5, g1); r(2, 2, 3, 4, g2); r(7, 3, 3, 4, g2);
      r(0, 6, 3, 3, g3); r(9, 6, 3, 3, g3); r(5, 0, 2, 3, g2);
      if (big) { r(2, 9, 8, 5, g1); r(3, 10, 2, 2, g2); }
    }),
  sofa: (col = "#3b6ea8") =>
    art(40, 14, (r) => {
      r(0, 0, 40, 6, shade(col, 0.82)); r(0, 0, 40, 1, col);
      r(0, 5, 40, 7, col); r(0, 5, 40, 1, shade(col, 1.2));
      r(0, 2, 4, 12, shade(col, 0.7)); r(36, 2, 4, 12, shade(col, 0.7));
      r(4, 7, 15, 1, shade(col, 0.88)); r(20, 6, 1, 6, shade(col, 0.88));
      r(1, 12, 2, 2, METAL_D); r(37, 12, 2, 2, METAL_D);
      r(7, 3, 6, 4, "#f0c44c"); r(27, 3, 6, 4, "#e2685a");
    }),
  coffeeTable: () =>
    art(16, 9, (r) => {
      r(0, 0, 16, 6, WOOD); r(0, 0, 16, 1, WOOD_L); r(0, 6, 16, 1, WOOD_D);
      r(1, 7, 1, 2, WOOD_D); r(14, 7, 1, 2, WOOD_D); r(5, 1, 3, 2, "#e9e9e9"); r(10, 2, 3, 2, "#d16b56");
    }),
  coffeeMachine: () =>
    art(10, 14, (r) => {
      r(0, 0, 10, 14, METAL); r(0, 0, 10, 1, METAL_L); r(1, 2, 8, 3, "#1d2027"); r(2, 3, 2, 1, "#e2685a");
      r(5, 3, 3, 1, "#3ddc84"); r(3, 7, 4, 4, "#1d2027"); r(4, 9, 2, 2, "#f2efe6"); r(0, 12, 10, 2, METAL_D);
    }),
  counter: (w = 40) =>
    art(w, 12, (r) => {
      r(0, 0, w, 5, "#d9d4c7"); r(0, 0, w, 1, "#efebe1"); r(0, 5, w, 7, "#8a6a4c");
      for (let x = 2; x < w - 4; x += 10) { r(x, 7, 8, 4, "#7a5c40"); r(x + 3, 8, 2, 1, "#c9c2b0"); }
    }),
  waterCooler: () =>
    art(8, 20, (r) => {
      r(1, 0, 6, 7, "#9fd3f2"); r(1, 0, 6, 1, "#c8ecff"); r(2, 2, 1, 4, "#d9f2ff");
      r(0, 7, 8, 13, "#e8ebf0"); r(0, 7, 8, 1, "#ffffff"); r(2, 10, 2, 2, "#4f8fe0"); r(5, 10, 2, 2, "#e2685a");
      r(0, 18, 8, 2, "#b9bfca");
    }),
  vending: () =>
    art(16, 24, (r) => {
      r(0, 0, 16, 24, "#c0392b"); r(0, 0, 16, 1, "#e05a4c");
      r(1, 2, 10, 16, "#1d2027");
      const cols = ["#f0c44c", "#3ddc84", "#4f8fe0", "#e2685a", "#b48cff"];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) r(2 + x * 3, 3 + y * 4, 2, 2, cols[(x + y) % 5]);
      r(12, 3, 3, 4, "#8fa0b8"); r(12, 9, 3, 2, "#1d2027"); r(2, 20, 10, 2, "#1d2027"); r(0, 22, 16, 2, "#8e2a1f");
    }),
  fridge: () =>
    art(12, 24, (r) => {
      r(0, 0, 12, 24, "#dfe3ea"); r(0, 0, 12, 1, "#ffffff"); r(0, 9, 12, 1, "#a7aebb");
      r(9, 3, 1, 4, "#8a93a3"); r(9, 12, 1, 6, "#8a93a3"); r(2, 13, 3, 3, "#f0c44c"); r(0, 22, 12, 2, "#a7aebb");
    }),
  roundTable: () =>
    art(18, 12, (r) => {
      r(2, 0, 14, 8, "#e9e4d8"); r(0, 2, 18, 4, "#e9e4d8"); r(2, 0, 14, 1, "#ffffff");
      r(8, 8, 2, 3, METAL); r(5, 11, 8, 1, METAL_D); r(6, 2, 3, 2, "#6b3b1f"); r(11, 3, 2, 2, "#e9e9e9");
    }),
  meetingTable: () =>
    art(56, 22, (r) => {
      r(2, 0, 52, 16, "#6e4a2f"); r(0, 2, 56, 12, "#6e4a2f"); r(2, 0, 52, 1, "#8f6442");
      r(2, 16, 52, 2, "#4f3420"); r(10, 4, 6, 4, "#f2efe6"); r(24, 5, 8, 5, "#23262f"); r(25, 6, 6, 3, "#4f8fe0");
      r(40, 4, 5, 4, "#f2efe6"); r(6, 18, 2, 4, "#3d2817"); r(48, 18, 2, 4, "#3d2817");
    }),
  beanbag: (col: string) =>
    art(12, 9, (r) => {
      r(1, 1, 10, 7, col); r(0, 3, 12, 4, col); r(2, 1, 6, 2, shade(col, 1.25)); r(1, 7, 10, 2, shade(col, 0.7));
    }),
  serverRack: () =>
    art(14, 30, (r) => {
      r(0, 0, 14, 30, "#1b1e26"); r(0, 0, 14, 1, "#3a3f4d"); r(0, 0, 1, 30, "#2a2e39");
      for (let y = 2; y < 27; y += 3) { r(1, y, 12, 2, "#2c313d"); r(2, y + 1, 6, 1, "#3d4352"); }
      r(0, 28, 14, 2, "#11131a");
    }),
  monitorWall: () =>
    art(64, 20, (r) => {
      r(0, 0, 64, 20, "#1b1e26");
      for (let i = 0; i < 4; i++) { r(1 + i * 16, 1, 14, 9, "#11141b"); r(1 + i * 16, 11, 14, 8, "#11141b"); }
    }),
  console: () =>
    art(24, 12, (r) => {
      r(0, 4, 24, 8, "#2b2f3a"); r(0, 4, 24, 1, "#3f4554"); r(2, 0, 8, 6, "#23262f"); r(14, 0, 8, 6, "#23262f");
      r(3, 1, 6, 4, "#1f5f7a"); r(15, 1, 6, 4, "#1f5f7a"); r(4, 8, 16, 2, "#4a5162");
    }),
  treadmill: () =>
    art(14, 28, (r) => {
      r(0, 8, 14, 20, "#2a2d36"); r(2, 10, 10, 16, "#16181e");
      for (let y = 11; y < 26; y += 3) r(2, y, 10, 1, "#23262f");
      r(1, 0, 2, 10, METAL_L); r(11, 0, 2, 10, METAL_L); r(1, 0, 12, 4, "#3a3f4d"); r(4, 1, 6, 2, "#3ddc84");
    }),
  punchingBag: () =>
    art(10, 26, (r) => {
      r(4, 0, 2, 4, "#8a93a3"); r(2, 4, 6, 16, "#b8322a"); r(2, 4, 6, 1, "#d9483e"); r(1, 6, 8, 12, "#b8322a");
      r(3, 6, 1, 12, "#d9483e"); r(2, 20, 6, 1, "#7a1f19"); r(2, 24, 6, 2, "rgba(0,0,0,.25)");
    }),
  dumbbells: () =>
    art(24, 10, (r) => {
      r(0, 2, 24, 3, METAL_L); r(0, 5, 24, 1, METAL); r(1, 6, 1, 4, METAL); r(22, 6, 1, 4, METAL);
      for (let x = 2; x < 22; x += 5) { r(x, 0, 1, 3, "#16181e"); r(x + 3, 0, 1, 3, "#16181e"); r(x + 1, 1, 2, 1, METAL_L); }
    }),
  yogaBall: (col: string) =>
    art(10, 10, (r) => {
      r(2, 0, 6, 10, col); r(0, 2, 10, 6, col); r(1, 1, 8, 8, col); r(2, 2, 3, 2, shade(col, 1.4)); r(2, 8, 6, 1, shade(col, 0.7));
    }),
  bench: () =>
    art(26, 8, (r) => {
      r(0, 0, 26, 4, "#2a2d36"); r(0, 0, 26, 1, "#4a5162"); r(2, 4, 2, 4, METAL); r(22, 4, 2, 4, METAL);
    }),
  bookshelf: () =>
    art(18, 26, (r) => {
      r(0, 0, 18, 26, WOOD_D); r(1, 1, 16, 24, "#4f3420");
      const cols = ["#4f8fe0", "#e2685a", "#f0c44c", "#3ddc84", "#b48cff", "#e9e4d8"];
      for (let s = 0; s < 4; s++) {
        r(1, 6 + s * 6, 16, 1, WOOD);
        for (let b = 0; b < 6; b++) r(2 + b * 2.5, 2 + s * 6, 2, 4, cols[(b + s * 2) % cols.length]);
      }
    }),
  printer: () =>
    art(16, 12, (r) => {
      r(0, 3, 16, 9, "#e3e6ec"); r(0, 3, 16, 1, "#ffffff"); r(2, 0, 12, 4, "#cfd4dc"); r(3, 0, 10, 1, "#f7f7f2");
      r(2, 6, 12, 2, "#3a3f4d"); r(11, 9, 3, 1, "#3ddc84"); r(0, 10, 16, 2, "#a7aebb");
    }),
  cabinet: () =>
    art(12, 18, (r) => {
      r(0, 0, 12, 18, "#8a93a3"); r(0, 0, 12, 1, "#b9c0cc");
      for (let y = 2; y < 16; y += 5) { r(1, y, 10, 4, "#a3abb8"); r(5, y + 1, 2, 1, "#5d6578"); }
    }),
  trash: () => art(7, 8, (r) => { r(0, 0, 7, 2, "#5d6578"); r(1, 2, 5, 6, "#4a5162"); r(2, 3, 1, 4, "#5d6578"); }),
  whiteboard: () =>
    art(30, 14, (r) => {
      r(0, 0, 30, 13, "#b9c0cc"); r(1, 1, 28, 11, "#f7f8fa");
      r(3, 3, 10, 1, "#4f8fe0"); r(3, 5, 14, 1, "#4f8fe0"); r(3, 7, 8, 1, "#e2685a");
      r(20, 3, 6, 6, "#f0c44c"); r(21, 4, 4, 4, "#f7f8fa"); r(4, 13, 22, 1, "#8a93a3");
    }),
  windowPane: () =>
    art(30, 14, (r) => {
      r(0, 0, 30, 14, "#cfd5df"); r(1, 1, 28, 12, "#8ec5ea"); r(1, 1, 28, 4, "#b4dcf5");
      r(14, 1, 2, 12, "#cfd5df"); r(1, 7, 28, 1, "#cfd5df"); r(3, 2, 4, 1, "#e6f5ff"); r(18, 2, 3, 1, "#e6f5ff");
    }),
  clock: () =>
    art(8, 8, (r) => {
      r(1, 0, 6, 8, "#2a2d36"); r(0, 1, 8, 6, "#2a2d36"); r(1, 1, 6, 6, "#f7f8fa"); r(4, 2, 1, 2, "#1b1d24"); r(4, 4, 2, 1, "#1b1d24");
    }),
  poster: (a: string, b: string) =>
    art(14, 18, (r) => {
      r(0, 0, 14, 18, "#2a2d36"); r(1, 1, 12, 16, a); r(3, 4, 8, 8, b); r(3, 13, 8, 1, "#f7f8fa"); r(3, 15, 5, 1, "#f7f8fa");
    }),
  partition: () => art(2, 24, (r) => { r(0, 0, 2, 24, "rgba(170,205,235,.55)"); r(0, 0, 2, 1, "#cfd5df"); r(0, 23, 2, 1, "#8a93a3"); }),
  tv: () =>
    art(30, 18, (r) => {
      r(0, 0, 30, 16, "#16181e"); r(1, 1, 28, 14, "#1f5f7a"); r(13, 16, 4, 2, METAL);
    })
};

// ---------------------------------------------------------------- görünüş
const HAIRS = ["#2b2118", "#7a3b1f", "#d9b26a", "#1b1d24", "#4a3020", "#a33a2a", "#e8e0d0"];
const STYLES: HairStyle[] = ["short", "long", "bun", "cap", "short"];
const CAPS = ["#2f6fd1", "#c0392b", "#2f9e63"];
/** Bölme rengi -> gömlek. */
export const SHIRTS: Record<"gray" | "blue" | "green" | "amber" | "red" | "violet", string> = {
  gray: "#7c8494",
  blue: "#3b6ea8",
  green: "#2f9e63",
  amber: "#d6a531",
  red: "#e2685a",
  violet: "#8b6ad6"
};

function hashOf(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Kimlikten kararlı görünüş; gömlek bölmenin rengi. */
export function lookFor(id: string, color: keyof typeof SHIRTS | undefined): Look {
  return {
    hair: HAIRS[hashOf(id, 1) % HAIRS.length],
    skin: SKIN[hashOf(id, 2) % SKIN.length],
    shirt: SHIRTS[color ?? "gray"],
    pants: "#2f3440",
    style: STYLES[hashOf(id, 3) % STYLES.length],
    cap: CAPS[hashOf(id, 4) % CAPS.length]
  };
}
