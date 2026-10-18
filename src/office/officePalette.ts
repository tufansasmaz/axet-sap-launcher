// Piksel ofisin paleti (spec 2026-10-18 ajanlar-yeniden §3, görsel-yeniden).
// src/office altında renk YALNIZ bu dosyada: koyu blueprint teması.
// Canvas tema değişkenini kare kare okumuyor; açık ve koyu temada aynı sahne.
// Lime yok: lime yalnız HTML katmanındaki seçim/odak halkası (accent sınıfı).
import type { TerminalPaneColor } from "../../app-electron/shared/types";

export const PALETTE = {
  outline: "#0a0c10",
  eye: "#0a0c10",
  shoe: "#1a1a24",
  shadow: "#050608",
  // ── Blueprint zeminleri (prosedürel; officePalette dışında hex yok) ──
  // Blueprint (lider / genel çalışma): koyu lacivert + ince ızgara
  blueprintBg: "#0d1117",
  blueprintGrid: "#162033",
  blueprintGridBright: "#1e3050",
  // Yeşil ızgara (toplantı / araştırma odası)
  greenGridBg: "#0d1a0d",
  greenGridLine: "#1a2e1a",
  greenGridDot: "#2a4a2a",
  // Gri dama (açık çalışma alanı, mavi-gri)
  grayCheckA: "#1e2330",
  grayCheckB: "#1a1f2a",
  // Koyu dama (sunucu / backend)
  darkCheckA: "#111318",
  darkCheckB: "#0d0f14",
  // Açık dama (dinlenme / oyun odası)
  lightCheckA: "#d4dbd4",
  lightCheckB: "#bfc6bf",
  lightCheckDot: "#a8b2a8",
  // Oda sınırı (tek karo, ince koyu çizgi)
  roomBorder: "#050608",
  // Eski uyumluluk için (sprite'lar kullanıyor)
  wood: "#2a3a2a",
  woodAlt: "#24332a",
  woodSeam: "#1e2e24",
  woodShine: "#2e3e32",
  tile: "#c8cfd8",
  tileAlt: "#b8bfc8",
  tileGrout: "#8890a0",
  carpet: "#1a2540",
  carpetAlt: "#16203a",
  carpetDot: "#1e2c50",
  concrete: "#14161c",
  concreteAlt: "#111318",
  concreteSeam: "#0e1014",
  // Oda adı etiketi (canvas'ta küçük monospace, köşede)
  roomLabel: "#1e3050",
  roomLabelText: "#2a4878",
  // Ad kutusu (HTML katmanı)
  nameBg: "#050810",
  nameText: "#e0e8f0",
  // Holografik disk
  holoRing: "#00b4d8",
  holoRingGlow: "#0077b6",
  holoCore: "#90e0ef",
  // Hedef tahtası
  targetRed: "#c0392b",
  targetWhite: "#ecf0f1",
  targetBlue: "#2980b9",
  // Arcade makinesi
  arcadeBody: "#1a0a2e",
  arcadeScreen: "#6c3483",
  arcadeBtn: "#e74c3c",
  // Sunucu raf LED'leri
  ledRed: "#e74c3c",
  // Holografik halka ortası
  holoEmpty: "#001428",
  // Duvar, cam, kapı (ceiling*: paketli çizimde duvar üstü — paketin tavan çizgisiyle aynı tonlar)
  ceiling: "#0a0c10",
  ceilingLine: "#0d1117",
  wallCap: "#0d1117",
  wallCapEdge: "#050608",
  wallFace: "#a08672",
  wallFaceDark: "#0a0c10",
  wallFaceLight: "#0d1117",
  baseboard: "#050608",
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
