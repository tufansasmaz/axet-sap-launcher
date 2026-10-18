// Ofisin paketle (LimeZu Modern Interiors) çizimi. officeCanvas'ın kardeşi:
// aynı plan, aynı sahne; zemin, duvar ön yüzü, mobilya ve karakterler paketin
// sayfalarından kopyalanıyor. Pakette olmayanlar (sunucu kabini, monitör,
// kahve makinesi, yazıcı, sebil, saat) elle çizilmiş yedekten geliyor.
// Bizim eklediklerimiz: yumuşak gölgeler, monitör halesi, pencere ışığı,
// ışın ve konuşma balonu. Hareketi azaltta kareler durağan (sahne.still).
import { DESK_W, TILE, type FacePart, type OfficePlan, type Prop, type RoomId } from "./officeFloor";
import { PALETTE } from "./officePalette";
import { SPRITES } from "./officeSprites";
import { ART_ATLAS, charFrame, type ArtPiece, type ArtRect, type CharacterName, type OfficeArt, type RubberName } from "./officeArt";
import { bubble, drawBeam, drawProp, drawSprite, headPoint, isOpen, isWall, monitor, safeContext, type Scene, type SceneActor } from "./officeCanvas";

type Ctx = CanvasRenderingContext2D;

/** Paketle çizimde her kişinin karakteri ve boyası. */
export interface ArtLook {
  character: CharacterName;
  /** Kaynak renk -> hedef renk (gömlek, saç). Boşsa karakterin kendi renkleri. */
  recolor: Record<string, string>;
}

function sheetOf(art: OfficeArt, r: ArtRect, sheets?: RecoloredSheets): CanvasImageSource {
  if (r.sheet === "room") return art.room;
  if (r.sheet === "interiors") return art.interiors;
  if (r.sheet === "pixelLife") return art.pixelLife as CanvasImageSource;
  if (sheets) return sheets[r.sheet];
  return art.characters.Adam[r.sheet];
}

/** Pixel Life parçası; sayfa yoksa false (çağıran yerine başka bir şey koyar ya da koymaz). */
function plPiece(ctx: Ctx, art: OfficeArt, name: ArtPiece, x: number, y: number): boolean {
  if (!art.pixelLife || ART_ATLAS[name].sheet !== "pixelLife") return false;
  blit(ctx, art, ART_ATLAS[name], x, y);
  return true;
}

function blit(ctx: Ctx, art: OfficeArt, r: ArtRect, x: number, y: number, sheets?: RecoloredSheets) {
  ctx.drawImage(sheetOf(art, r, sheets), r.x, r.y, r.w, r.h, Math.round(x), Math.round(y), r.w, r.h);
}

function piece(ctx: Ctx, art: OfficeArt, name: ArtPiece, x: number, y: number) {
  blit(ctx, art, ART_ATLAS[name], x, y);
}

/** Rubber Studio parçası (tek PNG, olduğu gibi); paket yoksa false. */
function rubber(ctx: Ctx, art: OfficeArt, name: RubberName, x: number, y: number): boolean {
  const img = art.rubber?.[name];
  if (!img) return false;
  ctx.drawImage(img, Math.round(x), Math.round(y));
  return true;
}

/** Parçayı w x h kutusunun alt ortasına oturtur (taban hizası). */
function pieceIn(ctx: Ctx, art: OfficeArt, name: ArtPiece, x: number, y: number, w: number, h: number) {
  const r = ART_ATLAS[name];
  blit(ctx, art, r, x + Math.floor((w - r.w) / 2), y + h - r.h);
}

/** Parçayı kutunun ortasına koyar. */
function pieceCenter(ctx: Ctx, art: OfficeArt, name: ArtPiece, x: number, y: number, w: number, h: number) {
  const r = ART_ATLAS[name];
  blit(ctx, art, r, x + Math.floor((w - r.w) / 2), y + Math.floor((h - r.h) / 2));
}

function ellipseShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.22) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- zemin, duvar

const FLOOR_OF: Record<RoomId, ArtPiece> = {
  work: "floorYellowTile",
  workB: "floorYellowTile",
  leader: "floorParquet",
  meeting: "floorGrey",
  kitchen: "floorTealTile",
  server: "floorStone"
};
const WALL_OF: Record<RoomId, ArtPiece> = {
  work: "wallBeige",
  workB: "wallBeige",
  leader: "wallWood",
  meeting: "wallYellow",
  kitchen: "wallMint",
  server: "wallGreyBlue"
};

function floorArt(ctx: Ctx, art: OfficeArt, room: RoomId, tx: number, ty: number) {
  const r = ART_ATLAS[FLOOR_OF[room]];
  ctx.drawImage(art.room, r.x + (tx % 3) * TILE, r.y + (ty % 2) * TILE, TILE, TILE, tx * TILE, ty * TILE, TILE, TILE);
}

/** Yüzün ait olduğu oda: yüzün altındaki ilk zemin. */
function roomBelow(plan: OfficePlan, tx: number, ty: number): RoomId {
  for (let y = ty; y < plan.rows; y++) {
    const r = plan.rooms[y]?.[tx];
    if (r) return r;
  }
  return "work";
}

function faceArt(ctx: Ctx, art: OfficeArt, plan: OfficePlan, tx: number, ty: number, part: FacePart) {
  const r = ART_ATLAS[WALL_OF[roomBelow(plan, tx, ty)]];
  ctx.drawImage(art.room, r.x, r.y + (part === "upper" ? 0 : TILE), TILE, TILE, tx * TILE, ty * TILE, TILE, TILE);
}

/** Tavan çizgisi (duvarın üstü): açık dolgu, odaya bakan kenarda koyu çizgi. */
function borderTile(ctx: Ctx, plan: OfficePlan, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = PALETTE.ceiling;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = PALETTE.ceilingLine;
  const edge = (dx: number, dy: number) => isOpen(plan, tx + dx, ty + dy) || !!plan.faces[ty + dy]?.[tx + dx];
  if (edge(-1, 0)) ctx.fillRect(x, y, 2, TILE);
  if (edge(1, 0)) ctx.fillRect(x + TILE - 2, y, 2, TILE);
  if (edge(0, -1)) ctx.fillRect(x, y, TILE, 2);
  if (edge(0, 1)) ctx.fillRect(x, y + TILE - 2, TILE, 2);
}

function doorArt(ctx: Ctx, art: OfficeArt, plan: OfficePlan, tx: number, ty: number) {
  // Geçidin zemini: altındaki (ya da yanındaki) odanınki.
  let room: RoomId = "work";
  for (const [dx, dy] of [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 0],
    [-1, 0]
  ]) {
    const t = plan.rooms[ty + dy]?.[tx + dx];
    if (t) {
      room = t;
      break;
    }
  }
  floorArt(ctx, art, room, tx, ty);
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = PALETTE.ceilingLine;
  const vertical = isWall(plan, tx - 1, ty) && isWall(plan, tx + 1, ty);
  if (vertical) {
    ctx.fillRect(x, y, 2, TILE);
    ctx.fillRect(x + TILE - 2, y, 2, TILE);
  } else {
    ctx.fillRect(x, y, TILE, 2);
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
  }
}

function glassArt(ctx: Ctx, art: OfficeArt, plan: OfficePlan, tx: number, ty: number) {
  const part = plan.faces[ty]?.[tx] ?? "upper";
  faceArt(ctx, art, plan, tx, ty, part);
  // Cam bölme: iki karoluk pencere camı, sütuna göre yarısı.
  const r = ART_ATLAS.glassPane;
  const half = (tx % 2) * TILE;
  if (part === "upper") ctx.drawImage(art.interiors, r.x + half, r.y, TILE, TILE, tx * TILE, ty * TILE + 3, TILE, TILE - 3);
  else ctx.drawImage(art.interiors, r.x + half, r.y + TILE - 3, TILE, r.h - TILE + 3, tx * TILE, ty * TILE, TILE, r.h - TILE + 3);
}

/** Pencereden odaya düşen ışık (yarı saydam, pencerenin altından aşağı). */
function sunlight(ctx: Ctx, plan: OfficePlan, p: Prop) {
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = PALETTE.sunlight;
  const x0 = p.x * TILE + 2;
  const w = p.w * TILE - 4;
  for (let r = 0; r < 4 * TILE; r += 2) {
    const ty = p.y + p.h + Math.floor(r / TILE);
    const t = plan.tiles[ty]?.[p.x];
    if (t === undefined || t === "wall" || t === "glass") break;
    ctx.globalAlpha = 0.14 * (1 - r / (4 * TILE));
    ctx.fillRect(x0 + Math.floor(r / 3), (p.y + p.h) * TILE + r, w, 2);
  }
  ctx.globalAlpha = 1;
}

const PAINTINGS: ArtPiece[] = ["paintingSunset", "paintingLandscape", "paintingGreen", "paintingFish", "paintingCat", "worldMap"];
const PLANTS: ArtPiece[] = ["plantTree", "plantSmall", "plantPalm"];

function propArt(ctx: Ctx, art: OfficeArt, plan: OfficePlan, p: Prop) {
  const x = p.x * TILE;
  const y = p.y * TILE;
  const w = p.w * TILE;
  const h = p.h * TILE;
  const v = p.variant ?? 0;
  switch (p.kind) {
    case "window":
      pieceCenter(ctx, art, v % 2 ? "windowRed" : "windowGrey", x, y, w, h);
      sunlight(ctx, plan, p);
      return;
    case "whiteboard":
      if (!rubber(ctx, art, "whiteboard", x, y)) pieceCenter(ctx, art, "chalkboard", x, y, w, h);
      return;
    case "printer":
      ellipseShadow(ctx, x + 8, y + 14, 6, 2);
      if (!rubber(ctx, art, "printer", x, y)) drawProp(ctx, plan, p);
      return;
    case "cooler":
      ellipseShadow(ctx, x + 8, y + 14, 5, 2);
      if (!rubber(ctx, art, "cooler", x, y - TILE)) drawProp(ctx, plan, p);
      return;
    case "shelf":
      // Arşiv: dosya dolabı, üstünde koli yığını.
      if (!art.rubber) {
        drawProp(ctx, plan, p);
        return;
      }
      ellipseShadow(ctx, x + 8, y + h - 1, 7, 2);
      for (let k = h - 2 * TILE; k >= -TILE; k -= 2 * TILE) rubber(ctx, art, k === h - 2 * TILE ? "cabinet" : "boxes", x, y + k);
      return;
    case "board":
      pieceIn(ctx, art, "scheduleBoard", x, y - 4, w, h);
      return;
    case "painting": {
      // Pixel Life varsa 5. çeşit grafik panosu.
      const chart = ART_ATLAS.plChart;
      if (v === 5 && plPiece(ctx, art, "plChart", x + Math.floor((w - chart.w) / 2), y + 1)) return;
      pieceCenter(ctx, art, PAINTINGS[v % PAINTINGS.length], x, y, w, h);
      return;
    }
    case "extinguisher":
      if (!plPiece(ctx, art, "plExtinguisher", x + 3, y - 3)) drawProp(ctx, plan, p);
      return;
    case "plant":
      ellipseShadow(ctx, x + 8, y + 14, 6, 2);
      pieceIn(ctx, art, PLANTS[v % PLANTS.length], x - 4, y - 2, 24, h);
      return;
    case "bookshelf":
      ellipseShadow(ctx, x + w / 2, y + 15, w / 2, 2);
      piece(ctx, art, "bookshelf", x, y + h - 32);
      return;
    case "globe":
      ellipseShadow(ctx, x + 8, y + 14, 5, 2);
      pieceIn(ctx, art, "globe", x, y - 2, w, h);
      return;
    case "rug":
      pieceCenter(ctx, art, v === 0 ? "rugBlue" : v === 1 ? "rugBig" : "rugGreen", x, y, w, h);
      return;
    case "meetingTable": {
      ellipseShadow(ctx, x + w / 2, y + h + 2, w / 2, 4);
      const t = ART_ATLAS.meetingTable;
      const e = ART_ATLAS.meetingTableEnd;
      const tw = t.w + e.w;
      const tx = x + Math.floor((w - tw) / 2);
      const ty = y + h - t.h + 4;
      blit(ctx, art, t, tx, ty);
      blit(ctx, art, e, tx + t.w, ty);
      return;
    }
    case "meetingChair":
      ellipseShadow(ctx, x + 8, y + 13, 6, 2);
      pieceCenter(ctx, art, v % 2 ? "stoolA" : "stoolB", x, y, TILE, TILE);
      return;
    case "guestChair":
      if (!rubber(ctx, art, "chairUp", x, y - 10)) piece(ctx, art, "chairBack", x + 1, y);
      return;
    case "counter": {
      ellipseShadow(ctx, x + w / 2, y + h + 1, w / 2, 3);
      piece(ctx, art, "kitchenCabinets", x, y + h - ART_ATLAS.kitchenCabinets.h + 4);
      drawSprite(ctx, SPRITES.coffeeMachine, x + TILE + 3, y - 10);
      ctx.fillStyle = PALETTE.sink;
      ctx.fillRect(x + 3 * TILE + 2, y - 4, 12, 4);
      ctx.fillStyle = PALETTE.machineLight;
      ctx.fillRect(x + 3 * TILE + 7, y - 8, 2, 4);
      drawSprite(ctx, SPRITES.mug, x + 2 * TILE + 4, y - 6);
      pieceIn(ctx, art, "plantSmall", x + 4 * TILE, y - 14, TILE, TILE);
      return;
    }
    case "fridge":
      ellipseShadow(ctx, x + 8, y + h, 7, 2);
      pieceIn(ctx, art, "fridge", x, y, w, h);
      return;
    case "sofa":
      ellipseShadow(ctx, x + w / 2, y + h, w / 2, 3);
      piece(ctx, art, "sofaGrey", x, y);
      return;
    case "desk": {
      if (p.x === plan.lead.desk.x && p.y === plan.lead.desk.y) return;
      ellipseShadow(ctx, x + w / 2, y + 18, w / 2, 3, 0.18);
      // Ortadaki (monitörün altı) sade; kenarlarda kâğıt ve kupa, masadan masaya yer değiştiriyor.
      if (art.pixelLife) {
        // Sade masa + Pixel Life eşyaları: kalemlik/kâğıt, klavye, kupa; masadan masaya değişiyor.
        for (let i = 0; i < DESK_W; i++) piece(ctx, art, "deskB", x + i * TILE, y - 4);
        plPiece(ctx, art, v % 3 === 0 ? "plPaper" : "plPens", x + 3, y - 7);
        plPiece(ctx, art, "plKeyboard", x + 16, y + 3);
        plPiece(ctx, art, v % 2 ? "plMug" : "plSticky", x + w - 13, y - 6);
        if (v % 4 === 1) plPiece(ctx, art, "plMouse", x + 34, y + 4);
        return;
      }
      const sides: ArtPiece[] = v % 2 ? ["deskC", "deskD"] : ["deskD", "deskC"];
      [sides[0], "deskB" as ArtPiece, sides[1]].forEach((name, i) => piece(ctx, art, name, x + i * TILE, y - 4));
      return;
    }
    default:
      // Pakette karşılığı yok: elle çizilmiş yedek (sunucu kabini, raf, sehpa, yazıcı, sebil, saat).
      drawProp(ctx, plan, p);
  }
}

/** Paketle sabit sahne. */
export function paintBackgroundArt(ctx: Ctx, plan: OfficePlan, art: OfficeArt) {
  ctx.imageSmoothingEnabled = false;
  plan.tiles.forEach((row, ty) =>
    row.forEach((kind, tx) => {
      const face = plan.faces[ty]?.[tx];
      if (kind === "glass") glassArt(ctx, art, plan, tx, ty);
      else if (kind === "door") doorArt(ctx, art, plan, tx, ty);
      else if (kind === "wall" && face) faceArt(ctx, art, plan, tx, ty, face);
      else if (kind === "wall") borderTile(ctx, plan, tx, ty);
      else floorArt(ctx, art, plan.rooms[ty]?.[tx] ?? "work", tx, ty);
    })
  );
  // Duvar dibinde yumuşak gölge.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = PALETTE.shadow;
  plan.tiles.forEach((row, ty) =>
    row.forEach((t, tx) => {
      if (t === "wall" || t === "glass") return;
      const above = plan.tiles[ty - 1]?.[tx];
      if (above === "wall" || above === "glass") ctx.fillRect(tx * TILE, ty * TILE, TILE, 4);
      if (plan.tiles[ty]?.[tx - 1] === "wall" && !plan.faces[ty]?.[tx - 1]) ctx.fillRect(tx * TILE, ty * TILE, 3, TILE);
    })
  );
  ctx.globalAlpha = 1;
  const order = [...plan.props].sort((a, b) => (a.kind === "rug" ? -1 : 0) - (b.kind === "rug" ? -1 : 0) || a.y + a.h - (b.y + b.h));
  for (const p of order) propArt(ctx, art, plan, p);
}

// ---------------------------------------------------------------- karakterler

export type RecoloredSheets = Record<"idle" | "run" | "phone", CanvasImageSource>;
const sheetCache = new Map<string, RecoloredSheets>();

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Karakter sayfalarını bir kez boyar (gömlek = bölme rengi, saç çeşidi); olmazsa özgün sayfalar. */
export function sheetsFor(art: OfficeArt, look: ArtLook): RecoloredSheets {
  const base = art.characters[look.character];
  const entries = Object.entries(look.recolor);
  if (entries.length === 0 || typeof document === "undefined") return base;
  const key = `${look.character}|${entries.map(([a, b]) => a + b).join(",")}`;
  const hit = sheetCache.get(key);
  if (hit) return hit;
  const map = new Map(entries.map(([src, dst]) => [hexToRgb(src).join(","), hexToRgb(dst)]));
  const out = { ...base } as RecoloredSheets;
  for (const k of ["idle", "run", "phone"] as const) {
    const img = base[k] as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const c2 = safeContext(canvas);
    if (!c2) continue;
    try {
      c2.drawImage(img, 0, 0);
      const data = c2.getImageData(0, 0, canvas.width, canvas.height);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const to = map.get(`${d[i]},${d[i + 1]},${d[i + 2]}`);
        if (to) [d[i], d[i + 1], d[i + 2]] = to;
      }
      c2.putImageData(data, 0, 0);
      out[k] = canvas;
    } catch {
      // Boyanamadı (ör. kaynak erişimi): özgün sayfa.
    }
  }
  sheetCache.set(key, out);
  return out;
}

const IDLE_MS = 150;
const PHONE_MS = 150;

/** Görünümden paket karesi: yürürken koşu, masada/kanepede bekleme, soruda telefon. */
export function artFrameFor(view: SceneActor["view"], time: number, still: boolean): ArtRect {
  if (view.moving) return charFrame("run", view.dir, still ? 0 : Math.floor(view.stride * 3));
  if (view.pose === "raise") return charFrame("phone", "down", still ? 4 : Math.floor(time / PHONE_MS));
  const dir = view.seated === "desk" ? "up" : view.seated === "front" ? "down" : view.dir;
  return charFrame("idle", dir, still ? 0 : Math.floor(time / IDLE_MS));
}

function drawPersonArt(ctx: Ctx, art: OfficeArt, a: SceneActor, time: number, still: boolean) {
  const v = a.view;
  const look = a.art as ArtLook;
  const r = artFrameFor(v, time, still);
  const sheets = sheetsFor(art, look);
  const x = Math.round(v.px);
  // Ayaklar karonun dibinde; masada otururken biraz aşağıda, kanepede gömülü.
  const sit = v.seated === "desk" ? 1 : v.seated === "front" ? 5 : 0;
  const y = Math.round(v.py) - 16 + sit;
  if (!v.seated) ellipseShadow(ctx, x + 8, Math.round(v.py) + 14, 5, 2, 0.28);
  if (v.dim) ctx.globalAlpha = 0.5;
  blit(ctx, art, r, x, y, sheets);
  ctx.globalAlpha = 1;
}

/** Monitörün masaya ve kişiye vuran halesi. */
function screenGlow(ctx: Ctx, d: Scene["desks"][number]) {
  if (d.screen === "off") return;
  const cx = d.desk.x * TILE + DESK_W * 8;
  const cy = (d.desk.y + 1) * TILE + 2;
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
  const c = d.screen === "error" ? PALETTE.screenError : PALETTE.screenLight;
  g.addColorStop(0, c);
  g.addColorStop(1, PALETTE.screenOff);
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.fillRect(cx - 26, cy - 26, 52, 52);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function leadDeskArt(ctx: Ctx, art: OfficeArt, plan: OfficePlan) {
  const x = plan.lead.desk.x * TILE;
  const y = plan.lead.desk.y * TILE;
  const w = DESK_W * TILE;
  const r = ART_ATLAS.leadDesk;
  ellipseShadow(ctx, x + w / 2, y + 20, w / 2, 4);
  blit(ctx, art, r, x + Math.floor((w - r.w) / 2), y - 2);
  drawSprite(ctx, SPRITES.monitorBack, x + w - 20, y - 4);
  plPiece(ctx, art, "plPaper", x + 8, y + 2);
  plPiece(ctx, art, "plMug", x + 20, y + 4);
}

/** Bir kare, paketle. `k` = cihaz pikseli / sanat pikseli. */
export function paintSceneArt(ctx: Ctx, k: number, background: CanvasImageSource | null, plan: OfficePlan, scene: Scene, art: OfficeArt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (background) ctx.drawImage(background, 0, 0);
  else paintBackgroundArt(ctx, plan, art);

  const time = scene.time ?? 0;
  const still = !!scene.still;
  for (const d of scene.desks) screenGlow(ctx, d);
  const items: Array<{ z: number; draw: () => void }> = [];
  for (const d of scene.desks) items.push({ z: (d.desk.y + 1) * TILE + 10, draw: () => monitor(ctx, d, scene.tick) });
  const turned = new Set(
    scene.actors.filter((a) => a.view.seated === "desk" && a.view.pose === "raise").map((a) => `${Math.round(a.view.px / TILE)},${Math.round(a.view.py / TILE)}`)
  );
  plan.seats.forEach((s) => {
    // Telefonla konuşan arkasını dönmüş: sandalye önünde değil arkasında.
    const behind = turned.has(`${s.x},${s.y}`);
    items.push({
      z: (s.y + 1) * TILE + (behind ? -1 : 0.5),
      draw: () => {
        // Ofis sandalyesi arkadan (Rubber Studio); yoksa LimeZu'nun sandalyesi.
        if (!rubber(ctx, art, "chairUp", s.x * TILE, s.y * TILE - 8)) piece(ctx, art, "chairBack", s.x * TILE + 1, s.y * TILE + 8);
      }
    });
  });
  items.push({ z: (plan.lead.desk.y + 1) * TILE, draw: () => leadDeskArt(ctx, art, plan) });
  for (const a of scene.actors) {
    items.push({
      z: a.view.py + TILE,
      draw: () => {
        if (a.art) drawPersonArt(ctx, art, a, time, still);
      }
    });
  }
  items.sort((p, q) => p.z - q.z);
  for (const it of items) it.draw();

  for (const a of scene.actors) {
    if (!a.view.mark) continue;
    const head = headPoint(a.view);
    bubble(ctx, a.view.mark === "question" ? SPRITES.question : SPRITES.error, { x: head.x, y: head.y - 6 });
  }
  if (scene.talk) bubble(ctx, SPRITES.talk, { x: scene.talk.x, y: scene.talk.y - 6 });
  for (const b of scene.beams) drawBeam(ctx, b);
}

