// Piksel ofisin çizim katmanı (spec 2026-10-18 ajanlar-yeniden §3). İNCE
// tutuluyor: karar yok, yalnız fillRect. Ne çizileceği officeFloor (plan),
// officeMotion (kare, ışın) ve officeSprites (matris) tarafından belirleniyor;
// onlar saf ve testli. Koordinatlar 1x sanat pikseli; ölçek setTransform'da.
import { CELL_W, DESK_W, TILE, type DeskSpot, type OfficePlan, type Prop } from "./officeFloor";
import { PALETTE, type PaletteKey } from "./officePalette";
import { CHARACTER_FRAMES, SPRITES, type Sprite, type SpriteSlot } from "./officeSprites";
import { linePixels, type SeatFrame } from "./officeMotion";

type Ctx = CanvasRenderingContext2D;

export interface SceneSeat {
  desk: DeskSpot;
  frame: SeatFrame;
  hair: readonly [string, string];
  shirt: readonly [string, string];
}

export interface SceneBeam {
  from: { x: number; y: number };
  to: { x: number; y: number };
  head: number;
  alpha: number;
}

/** Masa hücresinin önemli noktaları (1x piksel). */
export function deskPoints(desk: DeskSpot) {
  const x = desk.x * TILE;
  const deskY = (desk.y + 1) * TILE;
  const charX = x + Math.floor((DESK_W * TILE - 16) / 2);
  const charY = deskY + TILE - 5;
  return { x, deskY, charX, charY, head: { x: charX + 8, y: charY + 3 } };
}

function color(key: PaletteKey | SpriteSlot, slots: Partial<Record<SpriteSlot, string>>): string {
  if (key === "hair" || key === "hairShade" || key === "shirt" || key === "shirtShade") return slots[key] ?? PALETTE.outline;
  return PALETTE[key];
}

/** Satırdaki aynı renkli ardışık pikselleri tek fillRect'te çiziyor. */
export function drawSprite(
  ctx: Ctx,
  sprite: Sprite,
  x: number,
  y: number,
  slots: Partial<Record<SpriteSlot, string>> = {},
  overrides?: Partial<Record<string, string>>
) {
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
      ctx.fillStyle = overrides?.[ch] ?? color(key, slots);
      ctx.fillRect(x + c, y + r, end - c, 1);
      c = end;
    }
  });
}

function rect(ctx: Ctx, key: PaletteKey, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PALETTE[key];
  ctx.fillRect(x, y, w, h);
}

function floorTile(ctx: Ctx, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  for (let k = 0; k < 2; k++) {
    const plank = ty * 2 + k;
    const py = y + k * 8;
    rect(ctx, plank % 2 === 0 ? "floor" : "floorAlt", x, py, TILE, 8);
    rect(ctx, "floorSeam", x, py + 7, TILE, 1);
    const seam = (plank * 7 + tx * 16) % 24;
    if (seam < TILE) rect(ctx, "floorSeam", x + seam, py, 1, 7);
    if ((tx + plank) % 3 === 0) rect(ctx, "floorShine", x + ((plank * 5) % 12) + 2, py + 2, 3, 1);
  }
}

function wallTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const top = ty === 0 || plan.tiles[ty - 1]?.[tx] !== "wall";
  const bottom = plan.tiles[ty + 1]?.[tx] !== "wall" && plan.tiles[ty + 1]?.[tx] !== "door";
  rect(ctx, "wall", x, y, TILE, TILE);
  rect(ctx, "wallLight", x, y + 8, TILE, 1);
  if (top) rect(ctx, "wallTop", x, y, TILE, 4);
  if (bottom) rect(ctx, "baseboard", x, y + 13, TILE, 3);
}

function doorTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const top = ty === 0 || plan.tiles[ty - 1]?.[tx] !== "door";
  rect(ctx, "doorway", x, y, TILE, TILE);
  rect(ctx, "doorFrame", x, y, 2, TILE);
  rect(ctx, "doorFrame", x + TILE - 2, y, 2, TILE);
  if (top) rect(ctx, "doorFrame", x, y, TILE, 4);
}

function rugTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const is = (dx: number, dy: number) => plan.tiles[ty + dy]?.[tx + dx] === "rug";
  rect(ctx, "rug", x, y, TILE, TILE);
  if (!is(-1, 0)) rect(ctx, "rugBorder", x, y, 2, TILE);
  if (!is(1, 0)) rect(ctx, "rugBorder", x + TILE - 2, y, 2, TILE);
  if (!is(0, -1)) rect(ctx, "rugBorder", x, y, TILE, 2);
  if (!is(0, 1)) rect(ctx, "rugBorder", x, y + TILE - 2, TILE, 2);
  if ((tx + ty) % 2 === 0) rect(ctx, "rugLight", x + 7, y + 7, 2, 2);
}

function drawProp(ctx: Ctx, p: Prop) {
  const x = p.x * TILE;
  const y = p.y * TILE;
  const w = p.w * TILE;
  const h = p.h * TILE;
  switch (p.kind) {
    case "window": {
      const ww = w - 8;
      const wx = x + 4;
      const wy = y + 6;
      rect(ctx, "windowFrame", wx, wy, ww, 20);
      rect(ctx, "glass", wx + 2, wy + 2, ww - 4, 16);
      rect(ctx, "windowFrame", wx + Math.floor(ww / 2) - 1, wy, 2, 20);
      rect(ctx, "windowFrame", wx, wy + 9, ww, 2);
      for (let i = 0; i < 4; i++) rect(ctx, "glassLight", wx + 4 + i, wy + 6 - i, 1, 1);
      for (let i = 0; i < 3; i++) rect(ctx, "glassLight", wx + Math.floor(ww / 2) + 4 + i, wy + 16 - i, 1, 1);
      return;
    }
    case "board": {
      rect(ctx, "corkDark", x + 3, y + 7, w - 6, 19);
      rect(ctx, "cork", x + 4, y + 8, w - 8, 17);
      rect(ctx, "paper", x + 6, y + 10, 7, 8);
      rect(ctx, "paperBlue", x + 15, y + 11, 6, 6);
      rect(ctx, "paper", x + 14, y + 18, 9, 5);
      rect(ctx, "pin", x + 9, y + 10, 1, 1);
      rect(ctx, "pin", x + 17, y + 11, 1, 1);
      rect(ctx, "pin", x + 18, y + 18, 1, 1);
      return;
    }
    case "clock":
      drawSprite(ctx, SPRITES.clock, x + 3, y + 5);
      return;
    case "plant":
      drawSprite(ctx, SPRITES.plant, x + 2, y);
      return;
    case "meeting": {
      // Dört sandalye, sonra masa.
      for (const cx of [x + 8, x + w - 18]) {
        rect(ctx, "chair", cx, y - 6, 10, 6);
        rect(ctx, "chair", cx, y + h, 10, 6);
        rect(ctx, "chairLight", cx + 1, y - 5, 8, 2);
      }
      rect(ctx, "deskShadow", x + 2, y + 4, w - 4, h - 4);
      rect(ctx, "table", x + 2, y + 2, w - 4, h - 6);
      rect(ctx, "tableLight", x + 2, y + 2, w - 4, 2);
      drawSprite(ctx, SPRITES.mug, x + 10, y + 10);
      rect(ctx, "paper", x + Math.floor(w / 2) - 4, y + 9, 9, 7);
      return;
    }
    case "coffee": {
      const cy = y + h - 14;
      rect(ctx, "deskShadow", x, cy + 12, w, 2);
      rect(ctx, "counter", x, cy, w, 12);
      rect(ctx, "counterLight", x, cy, w, 3);
      drawSprite(ctx, SPRITES.coffee, x + 6, cy - 11);
      drawSprite(ctx, SPRITES.mug, x + 20, cy - 3);
      drawSprite(ctx, SPRITES.mug, x + 27, cy - 3);
      rect(ctx, "coffee", x + 21, cy - 2, 2, 1);
      return;
    }
  }
}

function drawDesk(ctx: Ctx, desk: DeskSpot) {
  const { x, deskY } = deskPoints(desk);
  const w = DESK_W * TILE;
  rect(ctx, "deskShadow", x, deskY + 13, w, 3);
  rect(ctx, "deskEdge", x, deskY + 9, w, 5);
  rect(ctx, "deskTop", x, deskY - 2, w, 11);
  rect(ctx, "deskLight", x, deskY - 2, w, 1);
  rect(ctx, "paper", x + 3, deskY + 2, 6, 5);
  rect(ctx, "monitorLight", x + w - 13, deskY + 5, 9, 2);
}

/** Sabit sahne (zemin, duvar, eşya, masalar) 1x olarak bir kez çiziliyor. */
export function paintBackground(ctx: Ctx, plan: OfficePlan) {
  plan.tiles.forEach((row, ty) =>
    row.forEach((kind, tx) => {
      if (kind === "wall") wallTile(ctx, plan, tx, ty);
      else if (kind === "door") doorTile(ctx, plan, tx, ty);
      else if (kind === "rug") rugTile(ctx, plan, tx, ty);
      else floorTile(ctx, tx, ty);
    })
  );
  for (const p of plan.props) if (p.kind !== "plant") drawProp(ctx, p);
  for (const d of plan.desks) drawDesk(ctx, d);
  for (const p of plan.props) if (p.kind === "plant") drawProp(ctx, p);
}

function screen(frame: SeatFrame): Partial<Record<string, string>> {
  if (frame.monitor === "on") return { s: PALETTE.screenOn, S: PALETTE.screenLight };
  if (frame.monitor === "error") return { s: PALETTE.screenError, S: PALETTE.screenError };
  return {};
}

function drawSeat(ctx: Ctx, seat: SceneSeat, tick: number) {
  const { charX, charY, deskY } = deskPoints(seat.desk);
  const mx = charX + 1;
  const my = deskY - 6;
  drawSprite(ctx, SPRITES.monitor, mx, my, {}, screen(seat.frame));
  if (seat.frame.monitor === "on") {
    // Ekrandaki "kod" satırları; yazarken kare kare değişiyor.
    const lens = seat.frame.animated && tick % 2 === 1 ? [7, 4, 9, 5] : [5, 8, 3, 7];
    lens.forEach((len, i) => rect(ctx, "screenText", mx + 2 + (i % 2) * 2, my + 2 + i + (i > 1 ? 1 : 0), len, 1));
  }
  if (seat.frame.dim) ctx.globalAlpha = 0.45;
  if (seat.frame.body) {
    const sprite = CHARACTER_FRAMES[seat.frame.body];
    const dy = seat.frame.body === "rest" ? 2 : 0;
    drawSprite(ctx, sprite, charX, charY + dy, { hair: seat.hair[0], hairShade: seat.hair[1], shirt: seat.shirt[0], shirtShade: seat.shirt[1] });
  }
  drawSprite(ctx, SPRITES.chair, charX + 1, charY + 17);
  ctx.globalAlpha = 1;
  if (seat.frame.mark) drawSprite(ctx, seat.frame.mark === "question" ? SPRITES.question : SPRITES.error, charX + 12, charY - 9);
}

function drawBeam(ctx: Ctx, beam: SceneBeam) {
  const pixels = linePixels(beam.from.x, beam.from.y, beam.to.x, beam.to.y);
  const shown = pixels.slice(0, Math.max(1, Math.ceil(pixels.length * beam.head)));
  ctx.globalAlpha = 0.35 * beam.alpha;
  ctx.fillStyle = PALETTE.beam;
  for (const [x, y] of shown) ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.globalAlpha = beam.alpha;
  ctx.fillStyle = PALETTE.beamCore;
  for (const [x, y] of shown) ctx.fillRect(x, y, 1, 1);
  const [hx, hy] = shown[shown.length - 1];
  ctx.fillStyle = PALETTE.beam;
  ctx.fillRect(hx - 2, hy - 2, 5, 5);
  ctx.globalAlpha = 1;
}

/** Bir kare: arka plan + masalardaki kişiler + ışınlar. `k` = cihaz pikseli / sanat pikseli. */
export function paintScene(
  ctx: Ctx,
  k: number,
  background: CanvasImageSource | null,
  plan: OfficePlan,
  seats: readonly SceneSeat[],
  beams: readonly SceneBeam[],
  tick: number
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (background) ctx.drawImage(background, 0, 0);
  else paintBackground(ctx, plan);
  for (const s of seats) drawSeat(ctx, s, tick);
  for (const b of beams) drawBeam(ctx, b);
}

/** Masa hücresinin HTML katmanındaki kutusu (CSS px). */
export function cellBox(desk: DeskSpot, scale: number) {
  return { left: desk.x * TILE * scale, top: desk.y * TILE * scale, width: (CELL_W * TILE - 4) * scale };
}
