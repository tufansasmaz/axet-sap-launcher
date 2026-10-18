// Piksel ofisin matrisleri (spec 2026-10-18 ajanlar-yeniden §3). Dosya varlığı
// yok: her sprite bir satır dizisi + harf -> palet anahtarı. "." saydam.
// Karakter ARKADAN görülüyor (masaya, monitöre dönük): izleyici monitörün
// ekranını görüyor, yanıp sönmesi okunuyor. Saç/gömlek "yuva": çizimde bölme
// kimliği ve rengiyle dolduruluyor.
import type { PaletteKey } from "./officePalette";

export type SpriteSlot = "hair" | "hairShade" | "shirt" | "shirtShade";

export interface Sprite {
  w: number;
  h: number;
  rows: readonly string[];
  legend: Readonly<Record<string, PaletteKey | SpriteSlot>>;
}

function sprite(rows: readonly string[], legend: Sprite["legend"]): Sprite {
  return { w: rows[0]?.length ?? 0, h: rows.length, rows, legend };
}

const PERSON_LEGEND: Sprite["legend"] = {
  k: "outline",
  h: "hair",
  H: "hairShade",
  s: "skin",
  S: "skinShade",
  c: "shirt",
  C: "shirtShade",
  p: "pants"
};

// Ortak baş ve omuzlar (satır 0-13).
const HEAD = [
  "................",
  "......kkkk......",
  "....kkhhhhkk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "..khhhhhhhhhhk..",
  "..khhhhhhhhhhk..",
  "..kshhhhhhhhsk..",
  "..kshhhhhhhhsk..",
  "...khHhhhhHhk...",
  "....kHHHHHHk....",
  ".....kSSSSk.....",
  "...kkcccccckk...",
  "..kcccccccccck.."
];

// Oturuyor, kollar yanda (satır 14-23).
const ARMS_DOWN = [
  ".kckcccccccckck.",
  ".kckcccccccckck.",
  ".kckcccccccckck.",
  ".kckCccccccCkck.",
  ".kskCCCCCCCCksk.",
  "..k.kCCCCCCk.k..",
  "....kppppppk....",
  "....kppppppk....",
  ".....kkkkkk.....",
  "................"
];

// Yazıyor: kollar öne, dirsekler gövdenin dışında.
const TORSO = "..kcccccccccck..";
const ELBOW_LEFT = ".kCcccccccccck..";
const ELBOW_RIGHT = "..kccccccccccCk.";
const ELBOW_BOTH = ".kCccccccccccCk.";
const TYPE_TAIL = ["..kCCCCCCCCCCk..", "...kkkkkkkkkk...", "....kppppppk....", "....kppppppk....", ".....kkkkkk.....", "................"];

function typing(leftRows: number[], rightRows: number[]): string[] {
  const rows: string[] = [];
  for (let r = 14; r < 18; r++) {
    const l = leftRows.includes(r);
    const rt = rightRows.includes(r);
    rows.push(l && rt ? ELBOW_BOTH : l ? ELBOW_LEFT : rt ? ELBOW_RIGHT : TORSO);
  }
  return [...HEAD, ...rows, ...TYPE_TAIL];
}

export const CHARACTER_FRAMES = {
  sit: sprite([...HEAD, ...ARMS_DOWN], PERSON_LEGEND),
  typeA: sprite(typing([14, 15], [15, 16]), PERSON_LEGEND),
  typeB: sprite(typing([15, 16], [14, 15]), PERSON_LEGEND),
  // Yaslanma: aynı oturuş, çizimde 2 piksel geride (aşağıda) ve kollar yanda.
  rest: sprite([...HEAD, ...ARMS_DOWN], PERSON_LEGEND)
} as const;

export type CharacterFrame = keyof typeof CHARACTER_FRAMES;

export const SPRITES = {
  chair: sprite(
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
  question: sprite(
    [
      "..kkkkk..",
      ".kbbbbbk.",
      "kbbgggbbk",
      "kbgbbbgbk",
      "kbbbbgbbk",
      "kbbbgbbbk",
      "kbbbbbbbk",
      "kbbbgbbbk",
      ".kbbbbbk.",
      "..kbkkk..",
      "..kk....."
    ],
    { k: "askInk", b: "askBg", g: "askInk" }
  ),
  error: sprite(
    [
      "..kkkkk..",
      ".kbbbbbk.",
      "kbbbgbbbk",
      "kbbbgbbbk",
      "kbbbgbbbk",
      "kbbbgbbbk",
      "kbbbbbbbk",
      "kbbbgbbbk",
      ".kbbbbbk.",
      "..kbkkk..",
      "..kk....."
    ],
    { k: "errInk", b: "errBg", g: "errInk" }
  ),
  plant: sprite(
    [
      "....lllL....",
      "..llLlllLl..",
      ".lLlllLlllL.",
      "lllLlllLllll",
      ".lllLllllLl.",
      "lLllllLllllL",
      ".lllLllLlll.",
      "..lllllLll..",
      "...lLllll...",
      "....llll....",
      "..kkkkkkkk..",
      "..kppppppk..",
      "...kppppk...",
      "...kppppk...",
      "...kPPPPk...",
      "....kkkk...."
    ],
    { l: "leaf", L: "leafLight", k: "outline", p: "pot", P: "potShade" }
  ),
  clock: sprite(
    [
      "...kkkk...",
      ".kkffffkk.",
      ".kffkfffk.",
      "kfffkffffk",
      "kfffkffffk",
      "kfffkkkffk",
      "kffffffffk",
      ".kffffffk.",
      ".kkffffkk.",
      "...kkkk..."
    ],
    { k: "outline", f: "clockFace" }
  ),
  coffee: sprite(
    [
      "kkkkkkkkkk",
      "kmmmmmmmmk",
      "kmMMMMMMmk",
      "kmMrMMMMmk",
      "kmmmmmmmmk",
      "kmkkkkkkmk",
      "kmk....kmk",
      "kmk.uu.kmk",
      "kmk.uu.kmk",
      "kmkkkkkkmk",
      "kmmmmmmmmk",
      "kkkkkkkkkk"
    ],
    { k: "outline", m: "machine", M: "machineLight", r: "led", u: "mug" }
  ),
  mug: sprite(["kkkk.", "kuuuk", "kuuk.", "kkk.."], { k: "outline", u: "mug" })
} as const;
