// Piksel ofisin paleti (spec 2026-10-18 ajanlar-yeniden §3). src/office
// altında renk YALNIZ bu dosyada: sıcak, sabit bir ofis paleti. Canvas tema
// değişkenini kare kare okumuyor; açık ve koyu temada aynı sahne. Lime yok:
// lime yalnız HTML katmanındaki seçim/odak halkası (accent sınıfı).
import type { TerminalPaneColor } from "../../app-electron/shared/types";

export const PALETTE = {
  outline: "#2a2024",
  eye: "#2a2024",
  shoe: "#3a2a26",
  shadow: "#1a1214",
  // Zeminler
  wood: "#b98a5e",
  woodAlt: "#ad7f55",
  woodSeam: "#8f6646",
  woodShine: "#c99a6c",
  tile: "#d9d2c3",
  tileAlt: "#cbc3b2",
  tileGrout: "#a89f8e",
  carpet: "#5a6f8f",
  carpetAlt: "#526683",
  carpetDot: "#6c82a3",
  concrete: "#8d8e92",
  concreteAlt: "#838489",
  concreteSeam: "#6f7075",
  // Duvar, cam, kapı (ceiling*: paketli çizimde duvar üstü — paketin tavan çizgisiyle aynı tonlar)
  ceiling: "#f2efe9",
  ceilingLine: "#3a3a50",
  wallCap: "#e8dccb",
  wallCapEdge: "#c9b9a3",
  wallFace: "#a08672",
  wallFaceDark: "#8a705e",
  wallFaceLight: "#b39882",
  baseboard: "#5c4536",
  glass: "#a9d4e6",
  glassLight: "#d8eef7",
  glassFrame: "#6c7a85",
  doorFrame: "#6e4630",
  doorLeaf: "#9b6b45",
  doorLeafDark: "#7a5236",
  doorKnob: "#e0c070",
  // Pencere, pano, saat, tahta
  windowFrame: "#efe6d6",
  sky: "#8fc1d9",
  skyLight: "#c4e2ef",
  sunlight: "#fff1c9",
  cork: "#b07a48",
  corkDark: "#8f5f36",
  paper: "#efe6d2",
  paperBlue: "#b9d3e6",
  paperPink: "#efc3c0",
  pin: "#c8553d",
  clockFace: "#f2ead8",
  whiteboard: "#f4f4f0",
  whiteboardFrame: "#9aa0a8",
  markerBlue: "#4f7fc4",
  markerRed: "#c4554d",
  // Masa ve monitör
  deskTop: "#8c5a3c",
  deskLight: "#a06a48",
  deskEdge: "#6e4630",
  deskShadow: "#4f3223",
  leadDesk: "#5e3f2c",
  leadDeskLight: "#74503a",
  monitor: "#2b2b33",
  monitorLight: "#4a4a55",
  screenOff: "#1c1f26",
  screenOn: "#5fb7d4",
  screenLight: "#9fdcef",
  screenText: "#2f6f8a",
  screenError: "#d0574a",
  keyboard: "#d8d4cc",
  keyboardDark: "#a9a49a",
  mug: "#efe6d2",
  mugRed: "#c4554d",
  coffee: "#6b4226",
  chair: "#3d4250",
  chairLight: "#555c6e",
  // Toplantı, lider
  table: "#9b6b45",
  tableLight: "#b07c52",
  rugRed: "#9c4a3c",
  rugRedLight: "#b55d4c",
  rugCream: "#e6d3b0",
  book1: "#4f7fc4",
  book2: "#c4554d",
  book3: "#d39a3a",
  book4: "#4f9a62",
  shelfWood: "#6e4630",
  // Sunucu
  rack: "#2f3238",
  rackLight: "#454952",
  ledGreen: "#4fc48a",
  ledAmber: "#e0a040",
  box: "#c4a070",
  boxDark: "#a08050",
  // Mutfak
  counter: "#7a5238",
  counterTop: "#e2ddd3",
  sink: "#b9c2c9",
  machine: "#3a3a40",
  machineLight: "#55555e",
  led: "#d0574a",
  fridge: "#e9ecef",
  fridgeShade: "#c9ced4",
  sofa: "#6d4c6e",
  sofaLight: "#86608a",
  sofaDark: "#553a56",
  cushion: "#d39a3a",
  // Bitki
  pot: "#a65e3a",
  potShade: "#874a2c",
  leaf: "#4f8a4b",
  leafLight: "#6fae5f",
  leafDark: "#3c6b3a",
  // Ofis eşyaları
  printer: "#d8d4cc",
  printerDark: "#8d8a84",
  water: "#8fc1d9",
  // Balonlar ve ışın
  askBg: "#fff4c2",
  askInk: "#a87b12",
  errBg: "#ffd9d4",
  errInk: "#b8372b",
  talkBg: "#ffffff",
  talkInk: "#55555e",
  beam: "#fff2b0",
  beamCore: "#ffffff"
} as const;

export type PaletteKey = keyof typeof PALETTE;

type Pair = readonly [string, string];

/** Saç rengi: koyu, kahve, sarı, kızıl, kır — [ana, gölge]. */
export const HAIR: ReadonlyArray<Pair> = [
  ["#2b2321", "#1b1515"],
  ["#6b3f23", "#4f2d18"],
  ["#d1a557", "#a87c36"],
  ["#a3442f", "#7a2c1f"],
  ["#b9b4ae", "#8f8a84"]
];

/** Ten: açık, buğday, esmer, koyu — [ana, gölge]. */
export const SKIN: ReadonlyArray<Pair> = [
  ["#f6d2b0", "#dfb08c"],
  ["#e5b48a", "#c99468"],
  ["#c08660", "#a06c48"],
  ["#8a5a3c", "#6e452c"]
];

/** Pantolon: lacivert kot, antrasit. */
export const PANTS: ReadonlyArray<Pair> = [
  ["#3c5378", "#2e405e"],
  ["#45474f", "#34363d"]
];

/** Gömlek = bölmenin rengi (PANE_COLOR_VAR karşılığı) — [ana, gölge]. */
export const SHIRT: Record<TerminalPaneColor, Pair> = {
  gray: ["#8a8f99", "#6c717b"],
  blue: ["#4f7fc4", "#3c64a0"],
  green: ["#4f9a62", "#3c7a4c"],
  amber: ["#d39a3a", "#ad7c2a"],
  red: ["#c4554d", "#a0413a"],
  violet: ["#8a64b8", "#6d4d96"]
};

/**
 * Çizim paketindeki dört karakterin gömlek ve saç tonları (açıktan koyuya;
 * sayfalardan ölçüldü). officeArt bunları bölme rengine / saç çeşidine boyuyor.
 */
export const CHARACTER_SHIRT_TONES = {
  Adam: ["#9f74a8", "#805e8e"],
  Alex: ["#ae4a52", "#a2394b", "#6f494d"],
  Amelia: ["#b95d72", "#a85377"],
  Bob: ["#6c6e85"]
} as const;

export const CHARACTER_HAIR_TONES = {
  Adam: ["#959d58", "#687253", "#5f694a", "#5d6043"],
  Amelia: ["#ba8d5e", "#957350", "#8d7051", "#8a6552"],
  Bob: ["#716b6e", "#5d585f", "#555157"]
} as const;

export interface Appearance {
  style: number;
  hair: number;
  skin: number;
  pants: number;
}

function hash(id: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return (h ^ (h >>> 15)) >>> 0;
}

/** Bölme kimliğinden kararlı görünüm: saç modeli 4, saç rengi 5, ten 4, pantolon 2. */
export function appearanceOf(id: string): Appearance {
  return {
    style: hash(id, 1) % 4,
    hair: hash(id, 2) % HAIR.length,
    skin: hash(id, 3) % SKIN.length,
    pants: hash(id, 4) % PANTS.length
  };
}
