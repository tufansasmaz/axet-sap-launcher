// Ofis çizim paketinin atlası (LimeZu "Modern Interiors", ücretsiz sürüm): SAF
// veri ve hesap, DOM yok. Hangi sayfanın nerede olduğu (ART_FILES,
// SHEET_SIZE), hangi parçanın sayfanın neresinde olduğu (ART_ATLAS;
// koordinatlar sayfanın opak bileşenlerinden ölçüldü), karakter kareleri ve
// gömlek/saç boyası. Yükleyici officeArt.ts'te.
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { Dir } from "./officeFloor";
import { CHARACTER_HAIR_TONES, CHARACTER_SHIRT_TONES, HAIR, SHIRT } from "./officePalette";

export const CHARACTERS = ["Adam", "Alex", "Amelia", "Bob"] as const;
export type CharacterName = (typeof CHARACTERS)[number];

export const ART_FILES = {
  room: "Interiors_free/16x16/Room_Builder_free_16x16.png",
  interiors: "Interiors_free/16x16/Interiors_free_16x16.png",
  character: (c: CharacterName) => ({
    idle: `Characters_free/${c}_idle_anim_16x16.png`,
    run: `Characters_free/${c}_run_16x16.png`,
    phone: `Characters_free/${c}_phone_16x16.png`
  })
};

export type SheetId = "room" | "interiors" | "idle" | "run" | "phone" | "pixelLife";

export const SHEET_SIZE: Record<SheetId, [number, number]> = {
  room: [272, 368],
  interiors: [256, 1424],
  idle: [384, 32],
  run: [384, 32],
  phone: [144, 32],
  pixelLife: [288, 64]
};

export interface ArtRect {
  sheet: SheetId;
  x: number;
  y: number;
  w: number;
  h: number;
}

const room = (x: number, y: number, w: number, h: number): ArtRect => ({ sheet: "room", x, y, w, h });
const int = (x: number, y: number, w: number, h: number): ArtRect => ({ sheet: "interiors", x, y, w, h });
const pl = (x: number, y: number, w: number, h: number): ArtRect => ({ sheet: "pixelLife", x, y, w, h });

/** Room_Builder: zeminler 3x2 karoluk desen blokları, duvar ön yüzü 2 karo yüksek (orta sütun tekrar eder). */
export const ART_ATLAS = {
  floorParquet: room(176, 208, 48, 32),
  floorYellowTile: room(176, 112, 48, 32),
  floorTealTile: room(176, 144, 48, 32),
  floorGrey: room(176, 176, 48, 32),
  floorStone: room(224, 80, 48, 32),
  wallPink: room(128, 80, 16, 32),
  wallYellow: room(128, 112, 16, 32),
  wallMint: room(128, 144, 16, 32),
  wallWood: room(128, 176, 16, 32),
  wallWoodDark: room(128, 208, 16, 32),
  wallGreyBlue: room(128, 272, 16, 32),
  wallBeige: room(128, 304, 16, 32),
  // Interiors: mobilya ve süs.
  deskA: int(16, 577, 16, 23),
  deskB: int(32, 577, 16, 23),
  deskC: int(48, 577, 16, 23),
  deskD: int(64, 577, 16, 23),
  chairBack: int(17, 617, 14, 16),
  leadDesk: int(93, 161, 38, 37),
  meetingTable: int(13, 161, 38, 37),
  meetingTableEnd: int(64, 161, 16, 37),
  stoolA: int(65, 497, 14, 14),
  stoolB: int(81, 497, 14, 14),
  bookshelf: int(80, 224, 32, 32),
  bookshelfPlants: int(80, 256, 32, 32),
  shelfBig1: int(160, 1094, 32, 34),
  shelfBig2: int(192, 1094, 32, 34),
  shelfBig3: int(224, 1094, 32, 34),
  storeShelf: int(32, 296, 64, 32),
  globe: int(209, 577, 13, 21),
  plantTree: int(167, 713, 18, 31),
  plantSmall: int(193, 722, 14, 23),
  plantPalm: int(213, 704, 23, 31),
  rugBlue: int(212, 178, 40, 60),
  rugRed: int(212, 258, 40, 60),
  rugBig: int(114, 244, 60, 40),
  rugGreen: int(3, 674, 43, 28),
  rugBlueWide: int(48, 674, 48, 28),
  rugSmall: int(181, 254, 24, 18),
  windowGrey: int(147, 391, 25, 20),
  windowRed: int(115, 391, 25, 20),
  glassPane: int(32, 455, 32, 25),
  paintingSunset: int(130, 330, 28, 13),
  paintingLandscape: int(130, 362, 28, 13),
  paintingGreen: int(165, 346, 21, 13),
  paintingFish: int(6, 330, 21, 14),
  paintingCat: int(38, 394, 21, 14),
  worldMap: int(160, 1065, 32, 19),
  corkBoard: int(3, 656, 26, 13),
  scheduleBoard: int(208, 616, 31, 21),
  chalkboard: int(210, 647, 28, 23),
  tv: int(3, 234, 26, 18),
  fridge: int(193, 641, 14, 31),
  kitchenCabinets: int(16, 253, 63, 28),
  stoveDark: int(192, 1264, 32, 24),
  stoveYellow: int(224, 1264, 32, 24),
  sofaGrey: int(16, 1152, 48, 32),
  door: int(113, 139, 14, 21),
  // Pixel Life (Christian Perich), isteğe bağlı: masa üstü ve duvar eşyaları. Monitörü LimeZu ölçeğine
  // büyük geldiği için kullanılmıyor (bizim çizdiğimiz, durum ışıklı monitör kalıyor).
  plKeyboard: pl(40, 43, 16, 9),
  plMug: pl(12, 42, 10, 12),
  plMouse: pl(77, 44, 6, 6),
  plPens: pl(139, 9, 10, 12),
  plPaper: pl(44, 11, 8, 11),
  plSticky: pl(109, 13, 6, 6),
  plCrumpled: pl(167, 8, 20, 16),
  plExtinguisher: pl(139, 40, 11, 17),
  plChart: pl(165, 39, 23, 17)
} satisfies Record<string, ArtRect>;

export type ArtPiece = keyof typeof ART_ATLAS;

const DIR_INDEX: Record<Dir, number> = { right: 0, up: 1, left: 2, down: 3 };

/** Karakter karesi: run/idle 4 yön x 6 kare (sağ, yukarı, sol, aşağı), telefon 9 kare (önden). */
export function charFrame(kind: "run" | "idle" | "phone", dir: Dir, frame: number): ArtRect {
  if (kind === "phone") return { sheet: "phone", x: (((frame % 9) + 9) % 9) * 16, y: 0, w: 16, h: 32 };
  const f = ((frame % 6) + 6) % 6;
  return { sheet: kind, x: (DIR_INDEX[dir] * 6 + f) * 16, y: 0, w: 16, h: 32 };
}

const SHIRT_TONES: Record<CharacterName, readonly string[]> = CHARACTER_SHIRT_TONES;
const HAIR_TONES: Partial<Record<CharacterName, readonly string[]>> = CHARACTER_HAIR_TONES;

/** Gömlek = bölme rengi; gri bölme karakterin kendi kıyafeti. */
export function shirtRecolor(c: CharacterName, color: TerminalPaneColor): Record<string, string> {
  if (color === "gray") return {};
  const [main, shade] = SHIRT[color];
  return Object.fromEntries(SHIRT_TONES[c].map((src, i) => [src, i === 0 ? main : shade]));
}

/** Saç rengi çeşitlemesi (0 = karakterin kendi saçı). */
export function hairRecolor(c: CharacterName, variant: number): Record<string, string> {
  const tones = HAIR_TONES[c];
  if (!tones || variant <= 0) return {};
  const [main, shade] = HAIR[(variant - 1) % HAIR.length];
  return Object.fromEntries(tones.map((src, i) => [src, i === 0 ? main : shade]));
}

// ---------------------------------------------------------------- yükleme

/**
 * Rubber Studio "Modern Office Tileset 16x16" ücretsiz örneğinden, LimeZu'da
 * olmayan ve tarzı uyan parçalar (tek tek PNG). İsteğe bağlı: yoksa yedek.
 */
export const RUBBER = ["chairUp", "printer", "cooler", "cabinet", "whiteboard", "boxes"] as const;
export type RubberName = (typeof RUBBER)[number];
const RUBBER_DIR = "rubber-office-sample/objects";
export const RUBBER_FILES: Record<RubberName, string> = {
  chairUp: `${RUBBER_DIR}/chair_office_up.png`,
  printer: `${RUBBER_DIR}/printer.png`,
  cooler: `${RUBBER_DIR}/water_dispenser.png`,
  cabinet: `${RUBBER_DIR}/filing_cabinet.png`,
  whiteboard: `${RUBBER_DIR}/whiteboard.png`,
  boxes: `${RUBBER_DIR}/box_stack.png`
};
export const RUBBER_SIZE: Record<RubberName, [number, number]> = {
  chairUp: [16, 32],
  printer: [16, 16],
  cooler: [16, 32],
  cabinet: [16, 32],
  whiteboard: [32, 32],
  boxes: [16, 32]
};

export interface ArtManifest {
  room: string;
  interiors: string;
  characters: Record<CharacterName, { idle: string; run: string; phone: string }>;
  /** Rubber Studio parçaları; biri bile eksikse null (hiçbiri kullanılmaz). */
  rubber: Record<RubberName, string> | null;
  /** Pixel Life sayfası; yoksa null. */
  pixelLife: string | null;
}

/** Pixel Life - Office Essentials (Christian Perich, CC BY 4.0): tek sayfa, isteğe bağlı. */
export const PIXEL_LIFE_FILE = "pixel-life-desk/spritesheet.png";

/** Glob sonucundan sayfa adresleri; tek bir dosya eksikse null (yedeğe düş). */
export function artManifest(urls: Record<string, string>): ArtManifest | null {
  const find = (file: string) => {
    const key = Object.keys(urls).find((k) => k.replace(/\\/g, "/").endsWith(`office-art/${file}`));
    return key ? urls[key] : null;
  };
  const roomUrl = find(ART_FILES.room);
  const interiorsUrl = find(ART_FILES.interiors);
  if (!roomUrl || !interiorsUrl) return null;
  const characters = {} as ArtManifest["characters"];
  for (const c of CHARACTERS) {
    const f = ART_FILES.character(c);
    const idle = find(f.idle);
    const run = find(f.run);
    const phone = find(f.phone);
    if (!idle || !run || !phone) return null;
    characters[c] = { idle, run, phone };
  }
  let rubber: Record<RubberName, string> | null = {} as Record<RubberName, string>;
  for (const name of RUBBER) {
    const url = find(RUBBER_FILES[name]);
    if (!url) {
      rubber = null;
      break;
    }
    rubber[name] = url;
  }
  return { room: roomUrl, interiors: interiorsUrl, characters, rubber, pixelLife: find(PIXEL_LIFE_FILE) };
}
