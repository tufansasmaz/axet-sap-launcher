// Piksel ofisin matrisleri (spec 2026-10-18 ajanlar-yeniden §3 + kalite turu).
// Dosya varlığı yok. Eşyalar elle çizilmiş satır dizileri; karakterler bir
// "kâğıt bebek" kurucusuyla üretiliyor: baş, saç modeli, gövde, kollar,
// bacaklar ızgaraya konuyor, sonra otomatik dış çizgi ve sağ/alt gölge.
// Böylece 4 saç modeli x 4 yön x (yürüme 4 + oturma/yazma/el/gerinme) karesi
// tutarlı kalıyor. Renkler "yuva": çizimde görünüme göre dolduruluyor.
import type { PaletteKey } from "./officePalette";
import type { Dir } from "./officeFloor";

export type SpriteSlot = "hair" | "hairShade" | "shirt" | "shirtShade" | "skin" | "skinShade" | "pants" | "pantsShade";

export interface Sprite {
  w: number;
  h: number;
  rows: readonly string[];
  legend: Readonly<Record<string, PaletteKey | SpriteSlot>>;
}

function sprite(rows: readonly string[], legend: Sprite["legend"]): Sprite {
  return { w: rows[0]?.length ?? 0, h: rows.length, rows, legend };
}

// ---------------------------------------------------------------- karakter

const W = 16;
const H = 24;
const PERSON_LEGEND: Sprite["legend"] = {
  k: "outline",
  e: "eye",
  b: "shoe",
  h: "hair",
  H: "hairShade",
  s: "skin",
  S: "skinShade",
  c: "shirt",
  C: "shirtShade",
  p: "pants",
  P: "pantsShade"
};

export const CHARACTER_POSES = ["walk0", "walk1", "walk2", "walk3", "sit", "type0", "type1", "type2", "raise", "stretch"] as const;
export type CharacterPose = (typeof CHARACTER_POSES)[number];
export const HAIR_STYLES = 4;

type Grid = string[][];
type Side = "down" | "up" | "right";

const HEAD_TOP = 4;

function put(g: Grid, x: number, y: number, ch: string) {
  if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = ch;
}
function fill(g: Grid, x0: number, y0: number, x1: number, y1: number, ch: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, ch);
}

function head(g: Grid, side: Side, dy: number) {
  const t = HEAD_TOP + dy;
  fill(g, 4, t, 11, t + 8, "s");
  for (const [x, y] of [
    [4, t],
    [11, t],
    [4, t + 8],
    [11, t + 8]
  ])
    put(g, x, y, ".");
  if (side === "down") {
    put(g, 6, t + 4, "e");
    put(g, 9, t + 4, "e");
  } else if (side === "right") {
    put(g, 10, t + 4, "e");
    put(g, 12, t + 5, "s");
  }
}

/** Saç modeli maskesi; (x, y) başın tepesine göre (y=0 HEAD_TOP-1). */
function hairMask(style: number, side: Side, x: number, y: number): boolean {
  const inHead = x >= 4 && x <= 11;
  const top = (from: number, to: number) => y >= from && y <= to && inHead && !((x === 4 || x === 11) && y === from);
  switch (style) {
    case 1: // uzun
      if (side === "down") return top(0, 3) || ((x === 3 || x === 4 || x === 11 || x === 12) && y >= 2 && y <= 11);
      if (side === "up") return top(0, 9) || ((x === 3 || x === 12) && y >= 3 && y <= 9);
      return top(0, 3) || (x >= 3 && x <= 7 && y >= 2 && y <= 11);
    case 2: {
      // kıvırcık, hacimli
      const wide = x >= 3 && x <= 12;
      const bump = (x === 3 || x === 12 || x === 6 || x === 9) && y === -1;
      if (side === "down") return (wide && y >= -1 && y <= 3 && !bump && !((x === 3 || x === 12) && y === -1)) || ((x === 3 || x === 4 || x === 11 || x === 12) && y >= 4 && y <= 6);
      if (side === "up") return wide && y >= -1 && y <= 8 && !bump && !((x === 3 || x === 12) && y === 8);
      return (wide && y >= -1 && y <= 3 && !bump) || (x >= 3 && x <= 7 && y >= 4 && y <= 8);
    }
    case 3: // topuz
      if (y >= -2 && y <= -1) return side === "right" ? false : x >= 6 && x <= 9;
      if (side === "right" && x >= 1 && x <= 3 && y >= 2 && y <= 4) return true;
      return hairMask(0, side, x, y);
    default: // kısa
      if (side === "down") return top(0, 2) || ((x === 4 || x === 11) && y >= 3 && y <= 4);
      if (side === "up") return top(0, 8) && !((x === 4 || x === 11) && y === 8);
      return top(0, 2) || (x >= 4 && x <= 7 && y >= 3 && y <= 6);
  }
}

function hair(g: Grid, style: number, side: Side, dy: number) {
  const base = HEAD_TOP - 1 + dy;
  for (let y = base - 3; y <= base + 12; y++) for (let x = 0; x < W; x++) if (hairMask(style, side, x, y - base)) put(g, x, y, "h");
}

function torso(g: Grid, side: Side, dy: number) {
  const t = HEAD_TOP + 9 + dy;
  if (side === "right") fill(g, 5, t, 10, t + 4, "c");
  else {
    fill(g, 4, t, 11, t + 4, "c");
    put(g, 4, t, ".");
    put(g, 11, t, ".");
  }
}

function hips(g: Grid, side: Side, dy: number) {
  const y = HEAD_TOP + 14 + dy;
  if (side === "right") fill(g, 5, y, 10, y, "p");
  else fill(g, 4, y, 11, y, "p");
}

/** Yanlarda sarkan kollar; `reach` el satırını kaydırıyor (yürürken salınım). */
function armsDown(g: Grid, dy: number, leftReach = 0, rightReach = 0) {
  const t = HEAD_TOP + 9 + dy;
  fill(g, 3, t, 3, t + 3 + leftReach, "C");
  put(g, 3, t + 4 + leftReach, "s");
  fill(g, 12, t, 12, t + 3 + rightReach, "C");
  put(g, 12, t + 4 + rightReach, "s");
}

function legsFront(g: Grid, frame: number) {
  const t = HEAD_TOP + 15;
  const leftUp = frame === 3 ? 1 : 0;
  const rightUp = frame === 1 ? 1 : 0;
  fill(g, 5, t, 7, t + 2 - leftUp, "p");
  fill(g, 5, t + 3 - leftUp, 7, t + 3 - leftUp, "b");
  fill(g, 8, t, 10, t + 2 - rightUp, "p");
  fill(g, 8, t + 3 - rightUp, 10, t + 3 - rightUp, "b");
  fill(g, 7, t, 7, t + 2 - leftUp, "P");
}

function legsSide(g: Grid, frame: number) {
  const t = HEAD_TOP + 15;
  if (frame === 0 || frame === 2) {
    fill(g, 6, t, 9, t + 2, "p");
    fill(g, 6, t + 3, 10, t + 3, "b");
    return;
  }
  const front = frame === 1 ? "p" : "P";
  const back = frame === 1 ? "P" : "p";
  fill(g, 4, t, 6, t + 2, back);
  fill(g, 3, t + 3, 5, t + 3, "b");
  fill(g, 8, t, 10, t + 2, front);
  fill(g, 9, t + 3, 11, t + 3, "b");
  fill(g, 7, t, 7, t, "p");
}

function armSide(g: Grid, frame: number) {
  const t = HEAD_TOP + 10;
  if (frame === 1) {
    fill(g, 8, t, 9, t + 2, "C");
    fill(g, 10, t + 2, 10, t + 3, "s");
  } else if (frame === 3) {
    fill(g, 6, t, 7, t + 2, "C");
    fill(g, 5, t + 2, 5, t + 3, "s");
  } else {
    fill(g, 7, t, 8, t + 3, "C");
    fill(g, 7, t + 4, 8, t + 4, "s");
  }
}

function outlineAndShade(g: Grid): string[] {
  const src = g.map((r) => [...r]);
  const at = (x: number, y: number) => (y >= 0 && y < H && x >= 0 && x < W ? src[y][x] : ".");
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = src[y][x];
      if (c === ".") {
        const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n !== "." && n !== "k");
        if (near) g[y][x] = "k";
        continue;
      }
      const right = at(x + 1, y);
      const below = at(x, y + 1);
      if (c === "h" && below !== "h" && below !== "H") g[y][x] = "H";
      else if (c === "c" && (right === "." || below === "p" || below === ".")) g[y][x] = "C";
      else if (c === "s" && right === "." && x > 7) g[y][x] = "S";
      else if (c === "p" && right === ".") g[y][x] = "P";
    }
  return g.map((r) => r.join(""));
}

function blank(): Grid {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => "."));
}

function standing(style: number, side: Side, frame: number): string[] {
  const g = blank();
  if (side === "right") {
    legsSide(g, frame);
    hips(g, side, 0);
    torso(g, side, 0);
    head(g, side, 0);
    hair(g, style, side, 0);
    armSide(g, frame);
  } else {
    legsFront(g, frame);
    hips(g, side, 0);
    torso(g, side, 0);
    armsDown(g, 0, frame === 1 ? -1 : frame === 3 ? 1 : 0, frame === 1 ? 1 : frame === 3 ? -1 : 0);
    head(g, side, 0);
    hair(g, style, side, 0);
  }
  return outlineAndShade(g);
}

const SIT_DY = 2;

/** Masada, arkadan (yukarı bakıyor). Bacaklar sandalyenin arkasında kalıyor. */
function seatedBack(style: number, pose: CharacterPose): string[] {
  const g = blank();
  hips(g, "up", SIT_DY);
  torso(g, "up", SIT_DY);
  const t = HEAD_TOP + 9 + SIT_DY;
  switch (pose) {
    case "type0":
    case "type1":
    case "type2": {
      // Dirsekler dışarıda, eller önde (görünmüyor); karelerde dirsek yüksekliği değişiyor.
      const l = pose === "type1" ? -1 : 0;
      const r = pose === "type2" ? -1 : 0;
      fill(g, 3, t + 1 + l, 3, t + 3 + l, "C");
      fill(g, 12, t + 1 + r, 12, t + 3 + r, "C");
      put(g, 3, t + l, "C");
      put(g, 12, t + r, "C");
      break;
    }
    case "raise":
    case "stretch":
      break;
    default:
      armsDown(g, SIT_DY);
  }
  head(g, "up", SIT_DY);
  hair(g, style, "up", SIT_DY);
  // El kaldırma: sağ kol başın üstüne; gerinme: iki kol. Kollar saçın önünde.
  const armUp = (x: number) => {
    fill(g, x, t - 9, x, t, "C");
    fill(g, x, t - 11, x, t - 10, "s");
  };
  if (pose === "raise") {
    armsDown(g, SIT_DY, 0, 0);
    fill(g, 12, t, 12, t + 4, ".");
    armUp(12);
  }
  if (pose === "stretch") {
    armUp(3);
    armUp(12);
  }
  return outlineAndShade(g);
}

/** Önden oturuş (lider masasında, kanepede): dizler öne, ayaklar altta. */
function seatedFront(style: number): string[] {
  const g = blank();
  const t = HEAD_TOP + 14 + SIT_DY;
  fill(g, 4, t, 11, t + 1, "p");
  fill(g, 5, t + 2, 7, t + 2, "b");
  fill(g, 8, t + 2, 10, t + 2, "b");
  torso(g, "down", SIT_DY);
  armsDown(g, SIT_DY);
  head(g, "down", SIT_DY);
  hair(g, style, "down", SIT_DY);
  return outlineAndShade(g);
}

function mirror(rows: readonly string[]): string[] {
  return rows.map((r) => [...r].reverse().join(""));
}

function buildSet(style: number): Record<string, Sprite> {
  const set: Record<string, Sprite> = {};
  for (const frame of [0, 1, 2, 3]) {
    set[`down/walk${frame}`] = sprite(standing(style, "down", frame), PERSON_LEGEND);
    set[`up/walk${frame}`] = sprite(standing(style, "up", frame), PERSON_LEGEND);
    const right = standing(style, "right", frame);
    set[`right/walk${frame}`] = sprite(right, PERSON_LEGEND);
    set[`left/walk${frame}`] = sprite(mirror(right), PERSON_LEGEND);
  }
  for (const pose of ["sit", "type0", "type1", "type2", "raise", "stretch"] as const) set[`up/${pose}`] = sprite(seatedBack(style, pose), PERSON_LEGEND);
  set["down/sit"] = sprite(seatedFront(style), PERSON_LEGEND);
  return set;
}

export const CHARACTER_SETS: ReadonlyArray<Readonly<Record<string, Sprite>>> = Array.from({ length: HAIR_STYLES }, (_, s) => buildSet(s));

/** Var olmayan yön/poz birleşimi o yönün ayakta karesine düşüyor. */
export function characterSprite(style: number, dir: Dir, pose: CharacterPose): Sprite {
  const set = CHARACTER_SETS[((style % HAIR_STYLES) + HAIR_STYLES) % HAIR_STYLES];
  return set[`${dir}/${pose}`] ?? set[`${dir}/walk0`];
}

// ---------------------------------------------------------------- eşyalar

export const SPRITES = {
  chairBack: sprite(
    [
      "..kkkkkkkkkk..",
      ".kaaaaaaaaaak.",
      "kaAAAAAAAAAAak",
      "kaAAAAAAAAAAak",
      "kaaaaaaaaaaaak",
      ".kkkkkkkkkkkk.",
      "...kk....kk...",
      "...kk....kk..."
    ],
    { k: "outline", a: "chair", A: "chairLight" }
  ),
  monitor: sprite(
    [
      "kkkkkkkkkkkkkk",
      "kSssssssssssSk",
      "kssssssssssssk",
      "kssssssssssssk",
      "kssssssssssssk",
      "kssssssssssssk",
      "kssssssssssssk",
      "kSssssssssssSk",
      "kkkkkkkkkkkkkk",
      ".....kffk.....",
      "....kffffk...."
    ],
    { k: "monitor", s: "screenOff", S: "screenOff", f: "monitorLight" }
  ),
  monitorBack: sprite(
    ["kkkkkkkkkkkkkk", "kffffffffffffk", "kffffffffffffk", "kffffffffffffk", "kffffffffffffk", "kffffffffffffk", "kkkkkkkkkkkkkk", ".....kffk.....", "....kffffk...."],
    { k: "monitor", f: "monitorLight" }
  ),
  question: sprite(
    ["..kkkkk..", ".kbbbbbk.", "kbbgggbbk", "kbgbbbgbk", "kbbbbgbbk", "kbbbgbbbk", "kbbbbbbbk", "kbbbgbbbk", ".kbbbbbk.", "..kbkkk..", "..kk....."],
    { k: "askInk", b: "askBg", g: "askInk" }
  ),
  error: sprite(
    ["..kkkkk..", ".kbbbbbk.", "kbbbgbbbk", "kbbbgbbbk", "kbbbgbbbk", "kbbbgbbbk", "kbbbbbbbk", "kbbbgbbbk", ".kbbbbbk.", "..kbkkk..", "..kk....."],
    { k: "errInk", b: "errBg", g: "errInk" }
  ),
  talk: sprite(
    [".kkkkkkkkk.", "kbbbbbbbbbk", "kbbbbbbbbbk", "kbgbbgbbgbk", "kbbbbbbbbbk", ".kkkbkkkkk.", "...kk......"],
    { k: "talkInk", b: "talkBg", g: "talkInk" }
  ),
  plant: sprite(
    [
      "....lllL....",
      "..llLlllLl..",
      ".lLlllLlllL.",
      "lllLdllLllll",
      ".lllLllldLl.",
      "lLlldlLllllL",
      ".lllLllLlll.",
      "..lldllLll..",
      "...lLllll...",
      "....llll....",
      "..kkkkkkkk..",
      "..kppppppk..",
      "...kppppk...",
      "...kppppk...",
      "...kPPPPk...",
      "....kkkk...."
    ],
    { l: "leaf", L: "leafLight", d: "leafDark", k: "outline", p: "pot", P: "potShade" }
  ),
  clock: sprite(
    ["...kkkk...", ".kkffffkk.", ".kffkfffk.", "kfffkffffk", "kfffkffffk", "kfffkkkffk", "kffffffffk", ".kffffffk.", ".kkffffkk.", "...kkkk..."],
    { k: "outline", f: "clockFace" }
  ),
  coffeeMachine: sprite(
    ["kkkkkkkkkk", "kmmmmmmmmk", "kmMMMMMMmk", "kmMrMMMMmk", "kmmmmmmmmk", "kmkkkkkkmk", "kmk....kmk", "kmk.uu.kmk", "kmk.uu.kmk", "kmkkkkkkmk", "kmmmmmmmmk", "kkkkkkkkkk"],
    { k: "outline", m: "machine", M: "machineLight", r: "led", u: "mug" }
  ),
  mug: sprite(["kkkk.", "kuuuk", "kuuk.", "kkk.."], { k: "outline", u: "mug" }),
  mugRed: sprite(["kkkk.", "kuuuk", "kuuk.", "kkk.."], { k: "outline", u: "mugRed" }),
  keyboard: sprite(["kkkkkkkkkk", "kababababk", "kbabababak", "kkkkkkkkkk"], { k: "keyboardDark", a: "keyboard", b: "keyboardDark" })
} as const;
