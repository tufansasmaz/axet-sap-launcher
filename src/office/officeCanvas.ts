// Piksel ofisin çizim katmanı (spec 2026-10-18 ajanlar-yeniden §3 + kalite
// turu). İNCE: karar yok. Ne çizileceğini officeFloor (plan), officeActors
// (kişi, kare) ve officeSprites (matris) belirliyor; onlar saf ve testli.
// Koordinatlar 1x sanat pikseli; ölçek setTransform'da.
//
// İki katman: sabit sahne (zemin, duvar, kapı, cam, eşya, masa yüzeyleri)
// bir kez ayrı bir canvas'a çiziliyor; her karede onun üstüne derinliğe göre
// sıralanmış hareketliler (monitör, kişi + gölge, sandalye arkası, lider
// masası), en üstte balonlar ve ışın.
import { CELL_W, DESK_W, TILE, type DeskSpot, type FloorKind, type OfficePlan, type Prop } from "./officeFloor";
import { PALETTE, type PaletteKey } from "./officePalette";
import { characterSprite, SPRITES, type CharacterPose, type Sprite, type SpriteSlot } from "./officeSprites";
import { linePixels } from "./officeMotion";
import type { ActorView } from "./officeActors";

type Ctx = CanvasRenderingContext2D;
type Slots = Partial<Record<SpriteSlot, string>>;

export interface Look {
  style: number;
  slots: Slots;
}

export interface SceneActor {
  id: string;
  view: ActorView;
  look: Look;
  /** Paketle çizimde karakter ve boyası (paket yoksa yok). */
  art?: { character: "Adam" | "Alex" | "Amelia" | "Bob"; recolor: Record<string, string> };
}

export interface SceneDesk {
  desk: DeskSpot;
  screen: "on" | "off" | "error";
  flicker: boolean;
}

export interface SceneBeam {
  from: { x: number; y: number };
  to: { x: number; y: number };
  head: number;
  alpha: number;
}

export interface Scene {
  actors: SceneActor[];
  desks: SceneDesk[];
  beams: SceneBeam[];
  /** Konuşma balonunun dayandığı baş noktası (lider); yoksa null. */
  talk: { x: number; y: number } | null;
  tick: number;
  /** Duvar saati (ms): paket karelerinin saati. */
  time?: number;
  /** Hareketi azalt: kareler durağan. */
  still?: boolean;
}

/** Bir kişinin baş noktası (ışın ucu, balon). */
export function headPoint(view: Pick<ActorView, "px" | "py" | "seated">) {
  return { x: view.px + 8, y: view.py + (view.seated ? -1 : -3) };
}

/** Masa hücresinin HTML katmanındaki kutusu (CSS px). */
export function cellBox(cell: { x: number; y: number }, scale: number) {
  return { left: cell.x * TILE * scale, top: cell.y * TILE * scale, width: (CELL_W * TILE - 4) * scale };
}

// ---------------------------------------------------------------- yardımcılar

export function rect(ctx: Ctx, key: PaletteKey, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PALETTE[key];
  ctx.fillRect(x, y, w, h);
}

export function alphaRect(ctx: Ctx, key: PaletteKey, alpha: number, x: number, y: number, w: number, h: number) {
  ctx.globalAlpha = alpha;
  rect(ctx, key, x, y, w, h);
  ctx.globalAlpha = 1;
}

/** Satırdaki aynı renkli ardışık pikselleri tek fillRect'te çiziyor. */
export function drawSprite(ctx: Ctx, sprite: Sprite, x: number, y: number, slots: Slots = {}, overrides?: Partial<Record<string, string>>) {
  sprite.rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      if (ch === ".") {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < row.length && row[end] === ch) end++;
      const key = sprite.legend[ch];
      ctx.fillStyle = overrides?.[ch] ?? (key in PALETTE ? PALETTE[key as PaletteKey] : (slots[key as SpriteSlot] ?? PALETTE.outline));
      ctx.fillRect(x + c, y + r, end - c, 1);
      c = end;
    }
  });
}

const spriteCache = new Map<string, HTMLCanvasElement | null>();

/** Kişi karesi: görünüm + kare başına bir kez ayrı canvas'a çiziliyor, sonra kopyalanıyor. */
function drawPerson(ctx: Ctx, look: Look, dir: ActorView["dir"], pose: CharacterPose, x: number, y: number) {
  const sprite = characterSprite(look.style, dir, pose);
  const key = `${look.style}|${Object.values(look.slots).join(",")}|${dir}/${pose}`;
  let cached = spriteCache.get(key);
  if (cached === undefined) {
    cached = null;
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = sprite.w;
      canvas.height = sprite.h;
      const c2 = safeContext(canvas);
      if (c2) {
        drawSprite(c2, sprite, 0, 0, look.slots);
        cached = canvas;
      }
    }
    if (spriteCache.size > 2000) spriteCache.clear();
    spriteCache.set(key, cached);
  }
  if (cached) ctx.drawImage(cached, x, y);
  else drawSprite(ctx, sprite, x, y, look.slots);
}

export function safeContext(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- zemin

export function floorTile(ctx: Ctx, kind: FloorKind, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  switch (kind) {
    case "wood":
      for (let k = 0; k < 2; k++) {
        const plank = ty * 2 + k;
        const py = y + k * 8;
        rect(ctx, plank % 2 === 0 ? "wood" : "woodAlt", x, py, TILE, 8);
        rect(ctx, "woodSeam", x, py + 7, TILE, 1);
        const seam = (plank * 7 + tx * 16) % 24;
        if (seam < TILE) rect(ctx, "woodSeam", x + seam, py, 1, 7);
        if ((tx + plank) % 3 === 0) rect(ctx, "woodShine", x + ((plank * 5) % 10) + 2, py + 2, 3, 1);
      }
      return;
    case "tile":
      for (let k = 0; k < 4; k++) {
        const cx = x + (k % 2) * 8;
        const cy = y + Math.floor(k / 2) * 8;
        rect(ctx, (tx * 2 + (k % 2) + ty * 2 + Math.floor(k / 2)) % 2 === 0 ? "tile" : "tileAlt", cx, cy, 8, 8);
        rect(ctx, "tileGrout", cx, cy + 7, 8, 1);
        rect(ctx, "tileGrout", cx + 7, cy, 1, 8);
      }
      return;
    case "carpet":
      rect(ctx, (tx + ty) % 2 === 0 ? "carpet" : "carpetAlt", x, y, TILE, TILE);
      for (let i = 0; i < 4; i++) rect(ctx, "carpetDot", x + 2 + (i % 2) * 8 + (ty % 2) * 4, y + 3 + Math.floor(i / 2) * 8, 1, 1);
      return;
    case "concrete":
      rect(ctx, (tx * 3 + ty) % 4 === 0 ? "concreteAlt" : "concrete", x, y, TILE, TILE);
      rect(ctx, "concreteSeam", x, y + 15, TILE, 1);
      rect(ctx, "concreteSeam", x + 15, y, 1, TILE);
      rect(ctx, "concreteAlt", x + ((tx * 7) % 11) + 2, y + ((ty * 5) % 11) + 2, 2, 1);
      return;
    case "blueprint":
      rect(ctx, "blueprintBg", x, y, TILE, TILE);
      // İnce yatay çizgi her 4 piksel
      rect(ctx, "blueprintGrid", x, y + 4, TILE, 1);
      rect(ctx, "blueprintGrid", x, y + 8, TILE, 1);
      rect(ctx, "blueprintGrid", x, y + 12, TILE, 1);
      // İnce dikey çizgi her 4 piksel
      rect(ctx, "blueprintGrid", x + 4, y, 1, TILE);
      rect(ctx, "blueprintGrid", x + 8, y, 1, TILE);
      rect(ctx, "blueprintGrid", x + 12, y, 1, TILE);
      // Kesişim noktaları parlak
      for (let gx = 4; gx < TILE; gx += 4)
        for (let gy = 4; gy < TILE; gy += 4)
          rect(ctx, "blueprintGridBright", x + gx, y + gy, 1, 1);
      return;
    case "greenGrid":
      rect(ctx, "greenGridBg", x, y, TILE, TILE);
      rect(ctx, "greenGridLine", x, y + 8, TILE, 1);
      rect(ctx, "greenGridLine", x + 8, y, 1, TILE);
      // Nokta her 8 piksel kesişimde
      rect(ctx, "greenGridDot", x + 8, y + 8, 1, 1);
      rect(ctx, "greenGridDot", x, y, 1, 1);
      return;
    case "grayCheck": {
      const even = (tx + ty) % 2 === 0;
      rect(ctx, even ? "grayCheckA" : "grayCheckB", x, y, TILE, TILE);
      return;
    }
    case "darkCheck": {
      const even = (tx + ty) % 2 === 0;
      rect(ctx, even ? "darkCheckA" : "darkCheckB", x, y, TILE, TILE);
      return;
    }
    case "lightCheck": {
      const even = (tx + ty) % 2 === 0;
      rect(ctx, even ? "lightCheckA" : "lightCheckB", x, y, TILE, TILE);
      // Hafif nokta deseni
      if ((tx + ty) % 4 === 0) rect(ctx, "lightCheckDot", x + 8, y + 8, 2, 2);
      return;
    }
  }
}

const FLOOR_KINDS: ReadonlySet<string> = new Set(["wood", "tile", "carpet", "concrete", "blueprint", "greenGrid", "grayCheck", "darkCheck", "lightCheck"]);

export function floorOf(plan: OfficePlan, tx: number, ty: number): FloorKind {
  for (const [dx, dy] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0]
  ]) {
    const t = plan.tiles[ty + dy]?.[tx + dx];
    if (t && FLOOR_KINDS.has(t)) return t as FloorKind;
  }
  return "grayCheck";
}

export const isWall = (plan: OfficePlan, x: number, y: number) => {
  const t = plan.tiles[y]?.[x];
  return t === undefined || t === "wall";
};
export const isOpen = (plan: OfficePlan, x: number, y: number) => {
  const t = plan.tiles[y]?.[x];
  return t !== undefined && t !== "wall";
};

function wallTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  // Ön yüz iki karo: üst yarıda ışık çizgisi, alt yarıda süpürgelik.
  const face = plan.faces[ty]?.[tx];
  if (face === "upper") {
    rect(ctx, "wallFace", x, y, TILE, TILE);
    rect(ctx, "wallFaceLight", x, y, TILE, 2);
    return;
  }
  if (face === "lower") {
    rect(ctx, "wallFace", x, y, TILE, TILE);
    rect(ctx, "wallFaceDark", x, y + TILE - 5, TILE, 1);
    rect(ctx, "baseboard", x, y + TILE - 3, TILE, 3);
    return;
  }
  rect(ctx, "wallCap", x, y, TILE, TILE);
  if (isOpen(plan, tx - 1, ty)) rect(ctx, "wallCapEdge", x, y, 1, TILE);
  if (isOpen(plan, tx + 1, ty)) rect(ctx, "wallCapEdge", x + TILE - 1, y, 1, TILE);
  if (isOpen(plan, tx, ty - 1)) rect(ctx, "wallCapEdge", x, y, TILE, 1);
  if (isOpen(plan, tx, ty + 1) || plan.faces[ty + 1]?.[tx]) rect(ctx, "wallCapEdge", x, y + TILE - 1, TILE, 1);
}

function glassTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  floorTile(ctx, floorOf(plan, tx, ty), tx, ty);
  rect(ctx, "glassFrame", x, y, TILE, 2);
  rect(ctx, "glass", x, y + 2, TILE, 11);
  rect(ctx, "glassLight", x + 3, y + 10, 1, 1);
  rect(ctx, "glassLight", x + 4, y + 9, 1, 1);
  rect(ctx, "glassLight", x + 5, y + 8, 1, 1);
  rect(ctx, "glassLight", x + 10, y + 6, 1, 1);
  rect(ctx, "glassLight", x + 11, y + 5, 1, 1);
  rect(ctx, "glassFrame", x, y + 13, TILE, 3);
  if (plan.tiles[ty][tx - 1] !== "glass") rect(ctx, "glassFrame", x, y, 2, TILE);
  if (plan.tiles[ty][tx + 1] !== "glass") rect(ctx, "glassFrame", x + TILE - 2, y, 2, TILE);
}

export function doorTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  floorTile(ctx, floorOf(plan, tx, ty), tx, ty);
  const horizontal = !isOpen(plan, tx - 1, ty) && !isOpen(plan, tx + 1, ty);
  if (horizontal) {
    // Kapı aralığı yatay duvarda: iki kasa, eşik, duvara açılmış kanat.
    rect(ctx, "doorFrame", x, y, 2, TILE);
    rect(ctx, "doorFrame", x + TILE - 2, y, 2, TILE);
    rect(ctx, "woodSeam", x + 2, y + TILE - 1, TILE - 4, 1);
    rect(ctx, "doorLeafDark", x + 2, y + 1, 3, 13);
    rect(ctx, "doorLeaf", x + 2, y + 1, 2, 13);
    rect(ctx, "doorKnob", x + 4, y + 8, 1, 1);
  } else {
    rect(ctx, "doorFrame", x, y, TILE, 2);
    rect(ctx, "doorFrame", x, y + TILE - 2, TILE, 2);
    rect(ctx, "doorLeafDark", x + 1, y + 2, 13, 3);
    rect(ctx, "doorLeaf", x + 1, y + 2, 13, 2);
    rect(ctx, "doorKnob", x + 8, y + 4, 1, 1);
  }
}

/** Duvarların zemine düşen yumuşak gölgesi. */
export function wallShadows(ctx: Ctx, plan: OfficePlan) {
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = PALETTE.shadow;
  plan.tiles.forEach((row, ty) =>
    row.forEach((t, tx) => {
      if (t === "wall" || t === "glass") return;
      if (isWall(plan, tx, ty - 1) || plan.tiles[ty - 1]?.[tx] === "glass") ctx.fillRect(tx * TILE, ty * TILE, TILE, 3);
      if (isWall(plan, tx - 1, ty)) ctx.fillRect(tx * TILE, ty * TILE, 2, TILE);
    })
  );
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- eşyalar

export function softShadow(ctx: Ctx, x: number, y: number, w: number, h = 3) {
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, Math.max(1, h - 2));
  ctx.globalAlpha = 1;
}

export function drawProp(ctx: Ctx, plan: OfficePlan, p: Prop) {
  const x = p.x * TILE;
  const y = p.y * TILE;
  const w = p.w * TILE;
  const h = p.h * TILE;
  switch (p.kind) {
    case "window": {
      const wx = x + 3;
      const ww = w - 6;
      rect(ctx, "windowFrame", wx, y + 2, ww, 12);
      rect(ctx, "sky", wx + 1, y + 3, ww - 2, 10);
      rect(ctx, "skyLight", wx + 1, y + 3, ww - 2, 3);
      rect(ctx, "windowFrame", wx + Math.floor(ww / 2), y + 2, 1, 12);
      for (let i = 0; i < 4; i++) rect(ctx, "skyLight", wx + 3 + i, y + 11 - i, 1, 1);
      rect(ctx, "wallCapEdge", wx - 1, y + 14, ww + 2, 1);
      // Pencere ışığı: aşağıdaki zemine sarı, yarı saydam bir şerit.
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = PALETTE.sunlight;
      for (let r = 0; r < 3 * TILE; r += 2) {
        const below = plan.tiles[p.y + 1 + Math.floor(r / TILE)]?.[p.x];
        if (below === undefined || below === "wall" || below === "glass") break;
        ctx.fillRect(wx + Math.floor(r / 3), y + TILE + r, ww, 2);
      }
      ctx.globalAlpha = 1;
      return;
    }
    case "whiteboard": {
      rect(ctx, "whiteboardFrame", x + 2, y + 1, w - 4, 13);
      rect(ctx, "whiteboard", x + 3, y + 2, w - 6, 10);
      rect(ctx, "markerBlue", x + 6, y + 4, 14, 1);
      rect(ctx, "markerBlue", x + 6, y + 6, 9, 1);
      rect(ctx, "markerRed", x + 24, y + 4, 1, 6);
      rect(ctx, "markerRed", x + 22, y + 9, 12, 1);
      rect(ctx, "markerBlue", x + 27, y + 5, 3, 3);
      rect(ctx, "whiteboardFrame", x + 4, y + 13, w - 8, 2);
      return;
    }
    case "board": {
      rect(ctx, "corkDark", x + 3, y + 6, w - 6, 9);
      rect(ctx, "cork", x + 4, y + 7, w - 8, 7);
      rect(ctx, "paper", x + 6, y + 8, 6, 5);
      rect(ctx, "paperBlue", x + 14, y + 8, 5, 4);
      rect(ctx, "paperPink", x + 21, y + 9, 5, 4);
      rect(ctx, "pin", x + 8, y + 8, 1, 1);
      rect(ctx, "pin", x + 16, y + 8, 1, 1);
      rect(ctx, "pin", x + 23, y + 9, 1, 1);
      return;
    }
    case "painting":
      rect(ctx, "doorFrame", x + 4, y + 3, w - 8, 11);
      rect(ctx, (p.variant ?? 0) % 2 ? "sky" : "rugRedLight", x + 5, y + 4, w - 10, 9);
      rect(ctx, "leafLight", x + 5, y + 10, w - 10, 3);
      return;
    case "extinguisher":
      rect(ctx, "outline", x + 5, y + 2, 6, 12);
      rect(ctx, "led", x + 6, y + 3, 4, 10);
      rect(ctx, "machine", x + 6, y, 3, 3);
      return;
    case "clock":
      drawSprite(ctx, SPRITES.clock, x + 3, plan.tiles[p.y - 1]?.[p.x] === "wall" ? y + 3 : y + 5);
      return;
    case "plant":
      softShadow(ctx, x + 3, y + 13, 10);
      drawSprite(ctx, SPRITES.plant, x + 2, y - 2);
      return;
    case "rack": {
      softShadow(ctx, x, y + h - 2, TILE);
      rect(ctx, "outline", x + 1, y - 8, 14, h + 6);
      rect(ctx, "rack", x + 2, y - 7, 12, h + 4);
      for (let r = 0; r < 6; r++) {
        const ry = y - 5 + r * 6;
        rect(ctx, "rackLight", x + 3, ry, 10, 4);
        rect(ctx, (r + p.x) % 3 === 0 ? "ledAmber" : "ledGreen", x + 4, ry + 1, 1, 1);
        rect(ctx, "ledGreen", x + 6, ry + 1, 1, 1);
        rect(ctx, "rack", x + 8, ry + 2, 4, 1);
      }
      return;
    }
    case "shelf": {
      softShadow(ctx, x, y + h - 2, TILE);
      rect(ctx, "outline", x + 1, y - 6, 14, h + 4);
      rect(ctx, "shelfWood", x + 2, y - 5, 12, h + 2);
      for (let r = 0; r * 10 < h; r++) {
        const ry = y - 3 + r * 10;
        rect(ctx, "box", x + 3, ry, 5, 7);
        rect(ctx, "boxDark", x + 3, ry + 6, 5, 1);
        rect(ctx, r % 2 ? "book1" : "book3", x + 9, ry + 1, 2, 6);
        rect(ctx, r % 2 ? "book2" : "book4", x + 11, ry, 2, 7);
      }
      return;
    }
    case "bookshelf": {
      softShadow(ctx, x, y + 14, w);
      rect(ctx, "outline", x + 1, y - 10, w - 2, 24);
      rect(ctx, "shelfWood", x + 2, y - 9, w - 4, 22);
      const books: PaletteKey[] = ["book1", "book2", "book3", "book4", "book2", "book1", "book4", "book3"];
      for (let r = 0; r < 2; r++)
        for (let i = 0; i < 12; i++) rect(ctx, books[(i + r * 3) % books.length], x + 3 + i * 2, y - 8 + r * 11, 2, 9 - ((i + r) % 3));
      return;
    }
    case "rug": {
      rect(ctx, "rugCream", x, y, w, h);
      rect(ctx, "rugRed", x + 2, y + 2, w - 4, h - 4);
      rect(ctx, "rugRedLight", x + 5, y + 5, w - 10, h - 10);
      rect(ctx, "rugRed", x + 8, y + 8, w - 16, h - 16);
      for (let i = x + 4; i < x + w - 4; i += 6) rect(ctx, "rugCream", i, y + 3, 2, 1);
      return;
    }
    case "meetingTable": {
      softShadow(ctx, x, y + h - 1, w, 4);
      rect(ctx, "deskShadow", x + 1, y + 4, w - 2, h - 4);
      rect(ctx, "table", x + 1, y + 1, w - 2, h - 6);
      rect(ctx, "tableLight", x + 1, y + 1, w - 2, 2);
      rect(ctx, "paper", x + 8, y + 8, 8, 10);
      rect(ctx, "paperBlue", x + 40, y + 9, 9, 7);
      rect(ctx, "monitor", x + 24, y + 10, 12, 8);
      rect(ctx, "screenLight", x + 25, y + 11, 10, 5);
      drawSprite(ctx, SPRITES.mug, x + 52, y + 14);
      drawSprite(ctx, SPRITES.mugRed, x + 18, y + 18);
      return;
    }
    case "meetingChair": {
      const cy = p.face === "down" ? y + 6 : y + 2;
      softShadow(ctx, x + 2, cy + 8, 12);
      rect(ctx, "outline", x + 2, cy, 12, 9);
      rect(ctx, "chair", x + 3, cy + 1, 10, 7);
      rect(ctx, "chairLight", x + 3, p.face === "down" ? cy + 1 : cy + 5, 10, 2);
      return;
    }
    case "guestChair":
      drawSprite(ctx, SPRITES.chairBack, x + 1, y + 2);
      return;
    case "counter": {
      softShadow(ctx, x, y + h, w);
      rect(ctx, "outline", x, y - 3, w, h + 3);
      rect(ctx, "counter", x + 1, y + 3, w - 2, h - 3);
      rect(ctx, "counterTop", x + 1, y - 2, w - 2, 6);
      for (let i = 1; i < p.w; i++) rect(ctx, "deskEdge", x + i * TILE, y + 5, 1, h - 6);
      for (let i = 0; i < p.w; i++) rect(ctx, "doorKnob", x + i * TILE + 7, y + 8, 2, 1);
      drawSprite(ctx, SPRITES.coffeeMachine, x + TILE + 3, y - 12);
      rect(ctx, "sink", x + 3 * TILE + 2, y - 1, 12, 4);
      rect(ctx, "machineLight", x + 3 * TILE + 7, y - 5, 2, 4);
      drawSprite(ctx, SPRITES.mug, x + 2 * TILE + 3, y - 3);
      drawSprite(ctx, SPRITES.mugRed, x + 2 * TILE + 9, y - 3);
      drawSprite(ctx, SPRITES.plant, x + 4 * TILE + 2, y - 14);
      return;
    }
    case "fridge": {
      softShadow(ctx, x, y + h - 1, TILE);
      rect(ctx, "outline", x + 1, y - 9, 14, h + 8);
      rect(ctx, "fridge", x + 2, y - 8, 12, h + 6);
      rect(ctx, "fridgeShade", x + 11, y - 8, 3, h + 6);
      rect(ctx, "outline", x + 2, y + 4, 12, 1);
      rect(ctx, "machineLight", x + 3, y - 5, 1, 6);
      rect(ctx, "machineLight", x + 3, y + 7, 1, 8);
      rect(ctx, "paperPink", x + 6, y + 9, 4, 4);
      return;
    }
    case "sofa": {
      softShadow(ctx, x, y + h - 1, w, 4);
      rect(ctx, "outline", x, y + 3, w, h - 3);
      rect(ctx, "sofaDark", x + 1, y + 4, w - 2, 12);
      rect(ctx, "sofa", x + 1, y + 6, w - 2, 9);
      rect(ctx, "sofaLight", x + 1, y + 16, w - 2, 9);
      for (let i = 1; i < p.w; i++) rect(ctx, "sofaDark", x + i * TILE, y + 16, 1, 9);
      rect(ctx, "sofaDark", x, y + 12, 4, h - 13);
      rect(ctx, "sofaDark", x + w - 4, y + 12, 4, h - 13);
      rect(ctx, "cushion", x + 5, y + 8, 7, 6);
      rect(ctx, "paperPink", x + w - 13, y + 8, 7, 6);
      return;
    }
    case "coffeeTable": {
      softShadow(ctx, x + 2, y + 12, w - 4);
      rect(ctx, "outline", x + 2, y + 2, w - 4, 10);
      rect(ctx, "table", x + 3, y + 3, w - 6, 7);
      rect(ctx, "tableLight", x + 3, y + 3, w - 6, 1);
      rect(ctx, "paperBlue", x + 8, y + 4, 8, 5);
      drawSprite(ctx, SPRITES.mug, x + 26, y + 4);
      return;
    }
    case "printer": {
      softShadow(ctx, x + 1, y + 13, 14);
      rect(ctx, "outline", x + 1, y + 2, 14, 11);
      rect(ctx, "printer", x + 2, y + 3, 12, 9);
      rect(ctx, "printerDark", x + 3, y + 8, 10, 2);
      rect(ctx, "paper", x + 4, y, 8, 4);
      rect(ctx, "ledGreen", x + 12, y + 4, 1, 1);
      return;
    }
    case "cooler": {
      softShadow(ctx, x + 3, y + 13, 10);
      rect(ctx, "outline", x + 4, y - 6, 8, 19);
      rect(ctx, "water", x + 5, y - 5, 6, 7);
      rect(ctx, "skyLight", x + 6, y - 4, 1, 4);
      rect(ctx, "fridge", x + 5, y + 2, 6, 10);
      rect(ctx, "markerBlue", x + 6, y + 5, 1, 1);
      rect(ctx, "markerRed", x + 9, y + 5, 1, 1);
      return;
    }
    case "desk": {
      // Çalışma masası yüzeyi (lider masası hareketli katmanda: lideri önden örtüyor).
      if (p.x === plan.lead.desk.x && p.y === plan.lead.desk.y) return;
      softShadow(ctx, x, y + 14, w, 3);
      rect(ctx, "deskEdge", x, y + 9, w, 5);
      rect(ctx, "deskTop", x, y - 2, w, 11);
      rect(ctx, "deskLight", x, y - 2, w, 1);
      rect(ctx, "deskShadow", x, y + 13, w, 1);
      rect(ctx, "paper", x + 3, y + 1, 7, 5);
      rect(ctx, "paperBlue", x + 4, y + 2, 5, 1);
      drawSprite(ctx, SPRITES.keyboard, x + 19, y + 5);
      drawSprite(ctx, (p.x + p.y) % 2 ? SPRITES.mug : SPRITES.mugRed, x + w - 9, y + 2);
      return;
    }
    case "overviewPanel": {
      rect(ctx, "rack", x + 1, y, w - 2, h);
      rect(ctx, "rackLight", x + 2, y + 1, w - 4, h - 2);
      for (let i = 0; i < 3; i++) {
        const sx2 = x + 3 + i * 10;
        rect(ctx, "outline", sx2, y + 2, 8, h - 4);
        rect(ctx, "monitor", sx2 + 1, y + 3, 6, h - 6);
        rect(ctx, "screenOn", sx2 + 1, y + 3, 6, 1);
        for (let r = 0; r < 3; r++) rect(ctx, "screenText", sx2 + 2, y + 5 + r, 4 - (r % 2), 1);
      }
      return;
    }
    case "meetingZone": {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = PALETTE.blueprintGrid;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = PALETTE.grayCheckA;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.globalAlpha = 1;
      return;
    }
    case "rackCard": {
      const colW = Math.floor(w / 3);
      rect(ctx, "outline", x, y, w, h);
      rect(ctx, "rack", x + 1, y + 1, w - 2, h - 2);
      for (let i = 0; i < 3; i++) {
        const cx = x + 1 + i * colW;
        rect(ctx, "rackLight", cx, y + 2, colW - 1, h - 4);
        rect(ctx, "ledGreen", cx + 1, y + 3, 2, 1);
        for (let r = 0; r < 3; r++) rect(ctx, "ledAmber", cx + 1, y + 5 + r * 3, colW - 3, 1);
      }
      return;
    }
    case "arcadeMachine": {
      rect(ctx, "arcadeBody", x + 2, y, w - 4, h);
      rect(ctx, "outline", x + 2, y, w - 4, h);
      rect(ctx, "arcadeScreen", x + 4, y + 2, w - 8, 8);
      rect(ctx, "arcadeBtn", x + 5, y + 4, 1, 3);
      rect(ctx, "arcadeBtn", x + 5, y + 4, 4, 1);
      rect(ctx, "arcadeBtn", x + 4, y + 13, 3, 2);
      rect(ctx, "arcadeBtn", x + 9, y + 13, 3, 2);
      rect(ctx, "rack", x + 1, y + h - 4, w - 2, 3);
      return;
    }
    case "targetBoard": {
      const cx2 = x + Math.floor(w / 2);
      const cy2 = y + 7;
      ctx.fillStyle = PALETTE.targetBlue;
      ctx.beginPath(); ctx.arc(cx2, cy2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.targetWhite;
      ctx.beginPath(); ctx.arc(cx2, cy2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.targetRed;
      ctx.beginPath(); ctx.arc(cx2, cy2, 2, 0, Math.PI * 2); ctx.fill();
      rect(ctx, "outline", cx2, cy2 - 1, 1, 1);
      return;
    }
    case "holoDisk": {
      const cx2 = x + 8;
      const cy2 = y + 8;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = PALETTE.holoRingGlow;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = PALETTE.holoRing;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx2, cy2, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PALETTE.holoEmpty;
      ctx.beginPath(); ctx.arc(cx2, cy2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.holoCore;
      ctx.beginPath(); ctx.arc(cx2, cy2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1;
      return;
    }
    case "holoRing": {
      const cx2 = x + w / 2;
      const cy2 = y + h / 2;
      const r2 = Math.min(w, h) / 2 - 2;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = PALETTE.holoRingGlow;
      ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = PALETTE.holoRing;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      return;
    }
    case "cabinet": {
      rect(ctx, "machine", x + 2, y + 1, w - 4, h - 2);
      rect(ctx, "machineLight", x + 2, y + 1, w - 4, 3);
      rect(ctx, "outline", x + 2, y + 1 + Math.floor((h - 2) / 2), w - 4, 1);
      rect(ctx, "rackLight", x + w / 2 - 1, y + 5, 2, 1);
      rect(ctx, "rackLight", x + w / 2 - 1, y + 5 + Math.floor((h - 2) / 2), 2, 1);
      return;
    }
  }
}

/** Sabit sahne 1x olarak bir kez çiziliyor. */
/** Oda köşelerine küçük monospace etiket ("// LIDER" vb.). */
function paintRoomLabels(ctx: Ctx, plan: OfficePlan) {
  const labels: Array<{ room: string; label: string }> = [
    { room: "leader", label: "// LIDER" },
    { room: "server", label: "// SUNUCU" },
    { room: "meeting", label: "// TOPLANTI" },
    { room: "work", label: "// GELISTIRME" },
    { room: "kitchen", label: "// DINLENME" }
  ];
  ctx.save();
  ctx.font = "5px monospace";
  ctx.textBaseline = "top";
  for (const { room, label } of labels) {
    // Odanın sol üst köşesini bul
    let minX = Infinity, minY = Infinity;
    plan.rooms.forEach((row, y) => row.forEach((r, x) => { if (r === room) { if (x < minX) minX = x; if (y < minY) minY = y; } }));
    if (!isFinite(minX)) continue;
    const px = minX * TILE + 2;
    const py = minY * TILE + 2;
    ctx.fillStyle = PALETTE.roomLabel;
    ctx.fillRect(px - 1, py - 1, label.length * 3 + 2, 7);
    ctx.fillStyle = PALETTE.roomLabelText;
    ctx.fillText(label, px, py);
  }
  ctx.restore();
}

export function paintBackground(ctx: Ctx, plan: OfficePlan) {
  plan.tiles.forEach((row, ty) =>
    row.forEach((kind, tx) => {
      if (kind === "wall") wallTile(ctx, plan, tx, ty);
      else if (kind === "glass") glassTile(ctx, plan, tx, ty);
      else if (kind === "door") doorTile(ctx, plan, tx, ty);
      else floorTile(ctx, kind, tx, ty);
    })
  );
  wallShadows(ctx, plan);
  // Halı önce, duvar süsleri, sonra yerdeki eşyalar yukarıdan aşağıya.
  const order = [...plan.props].sort((a, b) => (a.kind === "rug" ? -1 : 0) - (b.kind === "rug" ? -1 : 0) || a.y + a.h - (b.y + b.h));
  for (const p of order) drawProp(ctx, plan, p);
  paintRoomLabels(ctx, plan);
}

// ---------------------------------------------------------------- hareketliler

export function monitor(ctx: Ctx, d: SceneDesk, tick: number) {
  const x = d.desk.x * TILE + 17;
  const y = (d.desk.y + 1) * TILE - 6;
  const over =
    d.screen === "on" ? { s: PALETTE.screenOn, S: PALETTE.screenLight } : d.screen === "error" ? { s: PALETTE.screenError, S: PALETTE.screenError } : undefined;
  drawSprite(ctx, SPRITES.monitor, x, y, {}, over);
  if (d.screen === "on") {
    const lens = d.flicker && tick % 2 === 1 ? [7, 4, 9, 5] : d.flicker && tick % 4 === 2 ? [3, 8, 6, 9] : [5, 8, 3, 7];
    lens.forEach((len, i) => rect(ctx, "screenText", x + 2 + (i % 2) * 2, y + 2 + i + (i > 1 ? 1 : 0), len, 1));
    if (d.flicker && tick % 2 === 0) rect(ctx, "screenLight", x + 2 + lens[3] + 2, y + 6, 1, 1);
    // Ekranın masaya vuran ışığı.
    alphaRect(ctx, "screenLight", 0.18, x - 2, y + 11, 18, 3);
  }
}

function leadDesk(ctx: Ctx, plan: OfficePlan) {
  const x = plan.lead.desk.x * TILE;
  const y = plan.lead.desk.y * TILE;
  const w = DESK_W * TILE;
  softShadow(ctx, x, y + 14, w, 3);
  rect(ctx, "outline", x, y - 5, w, 19);
  rect(ctx, "leadDesk", x + 1, y + 6, w - 2, 7);
  rect(ctx, "leadDeskLight", x + 1, y - 4, w - 2, 10);
  rect(ctx, "deskLight", x + 1, y - 4, w - 2, 1);
  rect(ctx, "deskShadow", x + 1, y + 12, w - 2, 1);
  drawSprite(ctx, SPRITES.monitorBack, x + 17, y - 12);
  rect(ctx, "paper", x + 4, y - 2, 8, 6);
  drawSprite(ctx, SPRITES.mug, x + w - 9, y - 3);
}

export function bubble(ctx: Ctx, sprite: Sprite, head: { x: number; y: number }) {
  drawSprite(ctx, sprite, Math.round(head.x + 2), Math.round(head.y - sprite.h - 2));
}

export function drawBeam(ctx: Ctx, beam: SceneBeam) {
  const pixels = linePixels(beam.from.x, beam.from.y, beam.to.x, beam.to.y);
  const shown = pixels.slice(0, Math.max(1, Math.ceil(pixels.length * beam.head)));
  ctx.globalAlpha = 0.3 * beam.alpha;
  ctx.fillStyle = PALETTE.beam;
  for (const [x, y] of shown) ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.globalAlpha = beam.alpha;
  ctx.fillStyle = PALETTE.beamCore;
  for (const [x, y] of shown) ctx.fillRect(x, y, 1, 1);
  const [hx, hy] = shown[shown.length - 1];
  ctx.fillStyle = PALETTE.beam;
  ctx.fillRect(hx - 2, hy - 2, 5, 5);
  ctx.fillStyle = PALETTE.beamCore;
  ctx.fillRect(hx - 1, hy - 1, 3, 3);
  ctx.globalAlpha = 1;
}

/** Bir kare. `k` = cihaz pikseli / sanat pikseli. */
export function paintScene(ctx: Ctx, k: number, background: CanvasImageSource | null, plan: OfficePlan, scene: Scene) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (background) ctx.drawImage(background, 0, 0);
  else paintBackground(ctx, plan);

  const items: Array<{ z: number; draw: () => void }> = [];
  for (const d of scene.desks) items.push({ z: (d.desk.y + 1) * TILE + 10, draw: () => monitor(ctx, d, scene.tick) });
  plan.seats.forEach((s) => items.push({ z: (s.y + 1) * TILE + 0.5, draw: () => drawSprite(ctx, SPRITES.chairBack, s.x * TILE + 1, s.y * TILE + 11) }));
  items.push({ z: (plan.lead.desk.y + 1) * TILE, draw: () => leadDesk(ctx, plan) });
  for (const a of scene.actors) {
    const v = a.view;
    items.push({
      z: v.py + TILE,
      draw: () => {
        if (v.dim) ctx.globalAlpha = 0.5;
        if (!v.seated) softShadow(ctx, Math.round(v.px) + 3, Math.round(v.py) + 13, 10, 3);
        drawPerson(ctx, a.look, v.dir, v.pose, Math.round(v.px), Math.round(v.py) - 8);
        ctx.globalAlpha = 1;
      }
    });
  }
  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.draw();

  for (const rp of plan.props.filter((pp) => pp.kind === "rackCard")) {
    const colW = Math.floor((rp.w * TILE) / 3);
    for (let i = 0; i < 3; i++) {
      if ((scene.tick + i * 3) % 6 < 3) {
        ctx.fillStyle = PALETTE.ledRed;
        ctx.fillRect(rp.x * TILE + 1 + i * colW + 1, rp.y * TILE + 3, 2, 1);
      }
    }
  }

  for (const a of scene.actors) {
    if (!a.view.mark) continue;
    bubble(ctx, a.view.mark === "question" ? SPRITES.question : SPRITES.error, headPoint(a.view));
  }
  if (scene.talk) bubble(ctx, SPRITES.talk, scene.talk);
  for (const b of scene.beams) drawBeam(ctx, b);
}
