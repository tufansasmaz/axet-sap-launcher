// Ofisin çizimi: arka plan (zemin, halı, duvar, kapı, oda etiketleri), canlı
// eşya (ekranlar, sunucu ışıkları, pano), y sıralı eşya + kişiler, güneş
// huzmesi, sürgülü kapılar, liderden ışın, gündüz/gece ve küçük harita.
// Ad etiketi, durum çipi ve alt görev keskin HTML katmanında (OfficeView);
// burada yalnız kişinin üstündeki balon / "?" / "!".
import { U, charArt, type Art, type Look } from "./officeSprites";
import {
  CARPET, DOORS, DOOR_W, H, LAMPS, MID_CAP, MID_FACE, NORTH_FACE, ROOMS, V_WALLS, W, WINDOWS,
  bgItems, dyns, items, rng, wallRects, type Item, type Pt, type Room, type Screen
} from "./officeWorld";
import { nightFactor, type Actor, type Camera, type Sim } from "./officeSim";
export { nightFactor };

type Ctx = CanvasRenderingContext2D;

/** Açık ofisin etiketi: sol duvarda, monitör duvarının dışında. */
export const HALL_TAG_X = 244;
export const HALL_TAG_Y = 4;

const images = new WeakMap<Art, HTMLCanvasElement | null>();

/** Sprite'ın görüntüsü; belge ya da 2d bağlam yoksa null. */
export function artImage(a: Art): HTMLCanvasElement | null {
  if (images.has(a)) return images.get(a) ?? null;
  let out: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = a.w;
    c.height = a.h;
    let g: CanvasRenderingContext2D | null = null;
    try {
      g = c.getContext("2d");
    } catch {
      g = null;
    }
    if (g) {
      const ctx = g;
      a.draw((x, y, w, h, col) => {
        ctx.fillStyle = col;
        ctx.fillRect(x * U, y * U, w * U, h * U);
      });
      out = c;
    }
  }
  images.set(a, out);
  return out;
}

function img(g: Ctx, a: Art, x: number, y: number) {
  const im = artImage(a);
  if (im) g.drawImage(im, x, y);
}

function textWidth(g: Ctx, s: string, per = 7): number {
  const m = g.measureText?.(s) as TextMetrics | undefined;
  return m && typeof m.width === "number" ? m.width : s.length * per;
}

/** Degrade; bağlam desteklemiyorsa null (çizim atlanır). */
function gradient(make: () => CanvasGradient | undefined, stops: Array<[number, string]>): CanvasGradient | null {
  const gr = make();
  if (!gr || typeof gr.addColorStop !== "function") return null;
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

// ------------------------------------------------------------ arka plan
export function paintBackground(g: Ctx, label: (room: Room) => string): void {
  const R = rng(42);
  const floors: Record<Room["floor"], (r: Room) => void> = {
    wood(r) {
      for (let y = r.y, row = 0; y < r.y + r.h; y += 12, row++) {
        const off = (row % 3) * 32;
        for (let x = r.x - off; x < r.x + r.w; x += 96) {
          g.fillStyle = (row + Math.floor((x + off) / 96)) % 2 ? "#c48e5b" : "#bb8654";
          g.fillRect(x, y, 96, 12);
          g.fillStyle = "#a5774a";
          g.fillRect(x, y, 2, 12);
        }
        g.fillStyle = "#a97a4c";
        g.fillRect(r.x, y + 11, r.w, 1);
      }
    },
    walnut(r) {
      for (let y = r.y, row = 0; y < r.y + r.h; y += 12, row++) {
        const off = (row % 2) * 48;
        for (let x = r.x - off; x < r.x + r.w; x += 96) {
          g.fillStyle = (row + Math.floor((x + off) / 96)) % 2 ? "#6f4a2e" : "#674429";
          g.fillRect(x, y, 96, 12);
          g.fillStyle = "#563820";
          g.fillRect(x, y, 2, 12);
        }
        g.fillStyle = "#583a22";
        g.fillRect(r.x, y + 11, r.w, 1);
      }
    },
    terrazzo(r) {
      g.fillStyle = "#d9cbb2";
      g.fillRect(r.x, r.y, r.w, r.h);
      const cols = ["#c4b394", "#eadfca", "#a99677", "#d1a98a"];
      for (let i = 0; i < (r.w * r.h) / 90; i++) {
        g.fillStyle = cols[(R() * cols.length) | 0];
        g.fillRect(r.x + ((R() * r.w) / 3 | 0) * 3, r.y + ((R() * r.h) / 3 | 0) * 3, 3, 3);
      }
    },
    antistatic(r) {
      for (let y = r.y; y < r.y + r.h; y += 24)
        for (let x = r.x; x < r.x + r.w; x += 24) {
          g.fillStyle = "#8d95a3";
          g.fillRect(x, y, 24, 24);
          g.fillStyle = "#7a8291";
          g.fillRect(x, y, 24, 1);
          g.fillRect(x, y, 1, 24);
          g.fillStyle = "#9ba3b0";
          for (let k = 6; k < 24; k += 9) g.fillRect(x + k, y + k, 3, 3);
        }
    },
    lab(r) {
      for (let y = r.y; y < r.y + r.h; y += 24)
        for (let x = r.x; x < r.x + r.w; x += 24) {
          g.fillStyle = ((x + y) / 24) % 2 ? "#cfd8e0" : "#c6d0d9";
          g.fillRect(x, y, 24, 24);
          g.fillStyle = "#b5c0ca";
          g.fillRect(x, y, 24, 1);
          g.fillRect(x, y, 1, 24);
        }
    }
  };
  for (const room of ROOMS) {
    g.save();
    g.beginPath();
    g.rect(room.x, room.y, room.w, room.h);
    g.clip();
    floors[room.floor](room);
    g.restore();
  }

  // halı ve kilimler
  const rug = (r: { x: number; y: number; w: number; h: number }, base: string, edge: string, dot: string) => {
    g.fillStyle = edge;
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = base;
    g.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
    g.fillStyle = dot;
    for (let y = r.y + 12; y < r.y + r.h - 12; y += 12)
      for (let x = r.x + 12 + (y % 24 ? 6 : 0); x < r.x + r.w - 12; x += 12) g.fillRect(x, y, 3, 3);
  };
  rug(CARPET, "#5f8f6a", "#4a7556", "#6c9c77");
  rug({ x: 72, y: 290, w: 156, h: 126 }, "#4f6fa0", "#3e5a85", "#5b7cad");
  rug({ x: 1130, y: 300, w: 180, h: 140 }, "#8a5a8a", "#6f4670", "#986898");
  rug({ x: 1350, y: 740, w: 140, h: 70 }, "#2f3440", "#252a34", "#3a4050");

  // kuzey duvarı: tepe + yüz + süpürgelik
  g.fillStyle = "#2a2f3c";
  g.fillRect(0, 0, W, 12);
  g.fillStyle = "#e2e5ec";
  g.fillRect(0, 12, W, NORTH_FACE - 12);
  g.fillStyle = "#d3d7e0";
  for (let x = 0; x < W; x += 48) g.fillRect(x, 12, 1, NORTH_FACE - 20);
  g.fillStyle = "#9aa1b0";
  g.fillRect(0, NORTH_FACE - 8, W, 8);
  g.fillStyle = "#7d8495";
  g.fillRect(0, NORTH_FACE - 1, W, 1);

  // orta duvar (tepe + yüz), katı dikdörtgenlerden
  for (const r of wallRects) {
    if (r.y !== MID_CAP[0] || r.h !== MID_FACE[1] - MID_CAP[0]) continue;
    g.fillStyle = "#2a2f3c";
    g.fillRect(r.x, MID_CAP[0], r.w, 16);
    g.fillStyle = "#e2e5ec";
    g.fillRect(r.x, MID_FACE[0], r.w, 36 - 8);
    g.fillStyle = "#9aa1b0";
    g.fillRect(r.x, MID_FACE[1] - 8, r.w, 8);
  }
  // kapı kasaları + eşikler
  for (const room of ROOMS) {
    if (!room.door) continue;
    const x0 = room.door - DOOR_W / 2;
    g.fillStyle = "#4a5162";
    g.fillRect(x0 - 4, MID_CAP[0], 4, 52);
    g.fillRect(x0 + DOOR_W, MID_CAP[0], 4, 52);
    g.fillStyle = "rgba(0,0,0,.12)";
    g.fillRect(x0, MID_CAP[0], DOOR_W, 52);
    g.fillStyle = "#8a93a3";
    g.fillRect(x0, MID_FACE[1] - 2, DOOR_W, 2);
  }
  // dikey ve dış duvarlar
  g.fillStyle = "#2a2f3c";
  for (const vx of V_WALLS) g.fillRect(vx - 8, MID_CAP[0], 16, H - MID_CAP[0]);
  g.fillRect(0, 0, 12, H);
  g.fillRect(W - 12, 0, 12, H);
  g.fillRect(0, H - 16, W, 16);
  g.fillStyle = "#3a4152";
  for (const vx of V_WALLS) g.fillRect(vx - 8, MID_CAP[0], 2, H - MID_CAP[0]);
  g.fillRect(10, 0, 2, H);
  g.fillRect(W - 12, 0, 2, H);

  // duvara asılı eşya
  for (const it of bgItems) img(g, it.art, it.x, it.y);

  // oda etiketleri
  g.font = "bold 11px ui-monospace, Consolas, monospace";
  g.textBaseline = "top";
  const tagAt = (txt: string, x: number, y: number) => {
    const w = textWidth(g, txt) + 12;
    g.fillStyle = "#1b2030";
    g.fillRect(x, y, w, 16);
    g.fillStyle = "#6ea8ff";
    g.fillText(txt, x + 6, y + 3);
  };
  for (const room of ROOMS) {
    const txt = label(room);
    if (!txt) continue;
    if (room.id === "hall") {
      // Monitör duvarının (704..896) üstüne binmesin: soldaki boş duvar
      // parçasında, iki pencere çifti arasında (spec 2026-10-18 ajanlar-ux §6).
      tagAt(txt, HALL_TAG_X, HALL_TAG_Y);
      continue;
    }
    // etiket sürgülü kapının önüne düşmesin
    const w = textWidth(g, txt) + 12;
    const d0 = room.door! - DOOR_W / 2 - 6;
    const d1 = room.door! + DOOR_W / 2 + 6;
    const x = room.x + 16 + w > d0 && room.x + 16 < d1 ? d1 : room.x + 16;
    tagAt(txt, x, MID_FACE[0] + 4);
  }
}

// ------------------------------------------------------------ gündüz / gece

function tint(f: number): string {
  const target = [0x64, 0x72, 0xad];
  return `rgb(${target.map((c) => Math.round(255 + (c - 255) * f)).join(",")})`;
}

// ------------------------------------------------------------ canlı katman
function hash(a: number, b: number, c: number): number {
  let h = a * 374761393 + b * 668265263 + c * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

type ScreenMode = "working" | "still" | "asking" | "error" | "off";

function drawScreen(ctx: Ctx, s: Screen, mode: ScreenMode, t: number, seed: number) {
  if (mode === "working" || mode === "still") {
    ctx.fillStyle = "#0f1a2b";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    const cols = ["#3ddc84", "#6ea8ff", "#f0c44c", "#b48cff"];
    const scroll = mode === "working" ? Math.floor(t * 3) : 0;
    for (let i = 0; i < 4; i++) {
      const w = 4 + Math.floor(hash(seed, i + scroll, 1) * (s.w - 8));
      ctx.fillStyle = cols[(i + scroll + seed) % 4];
      ctx.fillRect(s.x + 2 + (i % 2) * 3, s.y + 2 + i * 3, w, 2);
    }
  } else if (mode === "asking") {
    ctx.fillStyle = Math.floor(t * 2) % 2 ? "#7a5c1e" : "#b8862c";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "#ffe9b0";
    ctx.fillRect(s.x + s.w / 2 - 1, s.y + 3, 3, 6);
    ctx.fillRect(s.x + s.w / 2 - 1, s.y + 11, 3, 2);
  } else if (mode === "error") {
    ctx.fillStyle = "#4a1414";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "#ff6b5e";
    ctx.fillRect(s.x + s.w / 2 - 1, s.y + 3, 3, 6);
    ctx.fillRect(s.x + s.w / 2 - 1, s.y + 11, 3, 2);
  } else {
    ctx.fillStyle = "#1d2433";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "#2f3a52";
    ctx.fillRect(s.x + 3 + ((t * 4) % (s.w - 8)), s.y + s.h / 2 - 1, 3, 3);
  }
}

function deskMode(sim: Sim, d: Item): ScreenMode {
  for (const a of sim.actors.values()) {
    if (a.seat?.desk !== d || !a.sitting) continue;
    if (a.pose === "typing") return a.motion ? "working" : "still";
    if (a.pose === "asking") return "asking";
    if (a.pose === "error") return "error";
  }
  return "off";
}

function drawDyn(ctx: Ctx, it: Item, t: number, sim: Sim, now: number) {
  switch (it.dyn) {
    case "screen":
      drawScreen(ctx, it.screen!, deskMode(sim, it), t, it.x);
      if (it.mugAt && now - it.mugAt < 60000) {
        // masadaki kupadan yükselen buhar
        ctx.fillStyle = "rgba(255,255,255,.55)";
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.8 + k / 3) % 1;
          ctx.fillRect(it.x + 76 + Math.sin(ph * 6 + k) * 2, it.y + 16 - ph * 16, 2, 2);
        }
      }
      break;
    case "lead":
      it.screens!.forEach((s, i) => drawScreen(ctx, s, deskMode(sim, it), t, it.x + i * 7));
      break;
    case "monwall":
      for (let i = 0; i < 8; i++) {
        const px = it.x + 3 + (i % 4) * 48;
        const py = it.y + 3 + Math.floor(i / 4) * 30;
        const pw = 42;
        const ph = i < 4 ? 27 : 24;
        ctx.fillStyle = "#0d1420";
        ctx.fillRect(px, py, pw, ph);
        if (i % 3 === 0) {
          for (let b = 0; b < 6; b++) {
            const bh = 4 + Math.floor((Math.sin(t * 1.3 + b + i) * 0.5 + 0.5) * (ph - 9));
            ctx.fillStyle = b % 2 ? "#3ddc84" : "#6ea8ff";
            ctx.fillRect(px + 3 + b * 6, py + ph - 3 - bh, 4, bh);
          }
        } else if (i % 3 === 1) {
          ctx.fillStyle = "#f0c44c";
          for (let x = 0; x < pw - 6; x += 3) ctx.fillRect(px + 3 + x, py + ph / 2 + Math.sin(t * 2 + x / 6 + i) * (ph / 3), 3, 2);
        } else {
          ctx.fillStyle = "#e2685a";
          ctx.fillRect(px + 4, py + 4, 14, 3);
          for (let r = 0; r < 4; r++) {
            ctx.fillStyle = hash(i, r, Math.floor(t)) > 0.3 ? "#3a4a66" : "#6ea8ff";
            ctx.fillRect(px + 4, py + 10 + r * 4, pw - 10, 2);
          }
        }
      }
      break;
    case "console":
      it.screens!.forEach((s, i) => {
        ctx.fillStyle = "#0c2a36";
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#4fd1e8";
        for (let x = 0; x < s.w; x += 2) ctx.fillRect(s.x + x, s.y + s.h / 2 + Math.sin(t * 3 + x / 3 + i * 2) * 3, 2, 1);
      });
      break;
    case "rack":
      for (let k = 0; k < 9; k++) {
        const on = hash(it.seed!, k, Math.floor(t * 5 + k)) > 0.35;
        ctx.fillStyle = on ? (hash(it.seed!, k, 9) > 0.85 ? "#f0a03c" : "#3ddc84") : "#1e3b2a";
        ctx.fillRect(it.x + 30, it.y + 9 + k * 9, 3, 3);
        ctx.fillStyle = hash(it.seed!, k, Math.floor(t * 2)) > 0.5 ? "#6ea8ff" : "#25344d";
        ctx.fillRect(it.x + 36, it.y + 9 + k * 9, 3, 3);
      }
      break;
    case "tread":
      ctx.fillStyle = Math.floor(t * 2) % 2 ? "#3ddc84" : "#2a9a5c";
      ctx.fillRect(it.x + 12, it.y + 3, 18, 6);
      break;
    case "tv":
      ctx.fillStyle = "#123a4c";
      ctx.fillRect(it.x + 3, it.y + 3, 84, 42);
      for (let b = 0; b < 8; b++) {
        const bh = 6 + Math.floor((Math.sin(t + b * 0.8) * 0.5 + 0.5) * 26);
        ctx.fillStyle = "#4fd1e8";
        ctx.fillRect(it.x + 8 + b * 10, it.y + 42 - bh, 6, bh);
      }
      break;
  }
}

// ------------------------------------------------------------ kişiler
const low = (a: Actor) => a.sitting && !!a.seat?.low;
/** Başın üstü (dünya koordinatı): balon ve ışın buraya. */
export const headY = (a: Actor) => a.y - (low(a) ? 44 : 50);

export interface FrameInput {
  bg: HTMLCanvasElement | null;
  cam: Camera;
  /** Canvas'ın CSS ölçüsü. */
  cw: number;
  ch: number;
  dpr: number;
  sim: Sim;
  looks: ReadonlyMap<string, Look>;
  /** Kesin "soru soruyor"daki soru metni. */
  questions: ReadonlyMap<string, string>;
  /** Liderden çıkan ışınlar; t 0..1. */
  beams: ReadonlyArray<{ from: Pt; to: Pt; t: number }>;
  /** saniye; hareketi azaltta sabit. */
  t: number;
  now: number;
  night: number;
  selectedId: string | null;
  hoverId: string | null;
  accent: string;
}

function drawChar(ctx: Ctx, a: Actor, look: Look, f: FrameInput) {
  const { t } = f;
  let ox = 0;
  let oy = 0;
  const typing = a.sitting && a.pose === "typing" && a.motion;
  if (a.activity === "punch") ox = Math.floor(t * 6) % 2 ? -2 : 1;
  if (a.activity === "run") oy = Math.floor(t * 10) % 2 ? -1 : 0;
  if (typing) oy = Math.floor(t * 4 + a.x) % 2 ? 1 : 0;
  ctx.save();
  if (a.pose === "unknown") ctx.globalAlpha = 0.5;
  if (!a.sitting) {
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const spr = artImage(charArt(look, a.dir, a.frame));
  if (spr) {
    if (low(a)) ctx.drawImage(spr, 0, 0, spr.width, 39, a.x - 15 + ox, a.y - 42 + oy, 30, 39);
    else ctx.drawImage(spr, a.x - 15 + ox, a.y - 48 + oy);
  }
  // yazan eller klavyeye uzanıyor, sırayla
  if (typing && a.dir === "up") {
    const alt = Math.floor(t * 7 + a.x) % 2;
    ctx.fillStyle = look.skin;
    ctx.fillRect(a.x - 12, a.y - 21 - (alt ? 3 : 0) + oy, 3, 3);
    ctx.fillRect(a.x + 9, a.y - 21 - (alt ? 0 : 3) + oy, 3, 3);
  }
  // elde taze kahve
  if (a.carry && !a.sitting) {
    const side = a.dir === "left" ? -14 : 11;
    const by = a.y - 20;
    ctx.fillStyle = "#f2efe6";
    ctx.fillRect(a.x + side, by, 5, 5);
    ctx.fillStyle = "#6b3b1f";
    ctx.fillRect(a.x + side + 1, by, 3, 1);
  }
  ctx.restore();
  if (a.id === f.selectedId || a.id === f.hoverId) {
    ctx.strokeStyle = a.id === f.selectedId ? f.accent : "rgba(255,255,255,.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, 16, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function bubble(ctx: Ctx, text: string, x: number, y: number) {
  ctx.font = "10px system-ui, Segoe UI, sans-serif";
  const w = Math.ceil(textWidth(ctx, text, 5)) + 12;
  const bx = Math.round(x - w / 2);
  const by = y - 20;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bx, by, w, 16);
  ctx.fillRect(x - 3, by + 16, 6, 3);
  ctx.fillRect(x - 1, by + 19, 2, 2);
  ctx.strokeStyle = "#1b1d24";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 15);
  ctx.fillStyle = "#1b1d24";
  ctx.textBaseline = "top";
  ctx.fillText(text, bx + 6, by + 3);
}

function mark(ctx: Ctx, ch: string, x: number, y: number, bg: string, fg: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(x - 7, y, 14, 14);
  ctx.fillStyle = fg;
  ctx.font = "bold 11px ui-monospace, Consolas, monospace";
  ctx.textBaseline = "top";
  ctx.fillText(ch, x - 3, y + 2);
}

function drawOverlay(ctx: Ctx, a: Actor, f: FrameInput) {
  const hy = headY(a);
  const question = f.questions.get(a.id);
  if (a.bubble && f.now < a.bubble.until) bubble(ctx, a.bubble.text, a.x, hy);
  else if (a.pose === "asking" && a.sitting) {
    if (question) bubble(ctx, question, a.x, hy);
    else mark(ctx, "?", a.x, hy - 18 + (Math.floor(f.t * 3) % 2 ? -2 : 0), "#f0c44c", "#1b1d24");
  } else if (a.pose === "error" && a.sitting) mark(ctx, "!", a.x, hy - 18, "#c4554d", "#ffffff");
}

// Kuzey pencerelerinden gündüz yere düşen güneş huzmeleri.
function drawSunlight(ctx: Ctx, day: number, t: number) {
  if (day <= 0.02) return;
  ctx.save();
  for (const w of WINDOWS) {
    const al = (0.15 + Math.sin(t * 0.3 + w.x) * 0.02) * day;
    const gr = gradient(() => ctx.createLinearGradient(0, w.y, 0, w.y + 190), [
      [0, `rgba(255,236,190,${al})`],
      [1, "rgba(255,236,190,0)"]
    ]);
    if (!gr) continue;
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(w.x + 6, w.y);
    ctx.lineTo(w.x + w.w - 6, w.y);
    ctx.lineTo(w.x + w.w + 54, w.y + 190);
    ctx.lineTo(w.x + 66, w.y + 190);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Sürgülü cam kapılar: yakında biri varsa açık (0..1, kapı başına). */
export function doorOpenness(sim: Sim): number[] {
  return DOORS.map((d) => ([...sim.actors.values()].some((p) => p.pose !== "absent" && Math.abs(p.x - d.x) < 44 && Math.abs(p.y - d.y) < 70) ? 1 : 0));
}

function drawDoors(ctx: Ctx, open: readonly number[]) {
  DOORS.forEach((d, i) => {
    const half = d.w / 2;
    const pw = half * (1 - (open[i] ?? 0));
    const top = d.y - 16;
    const h = 52;
    if (pw < 1) return;
    ctx.fillStyle = "rgba(160,200,230,.55)";
    ctx.fillRect(d.x - half, top, pw, h);
    ctx.fillRect(d.x + half - pw, top, pw, h);
    ctx.fillStyle = "#5d6578";
    ctx.fillRect(d.x - half + pw - 2, top, 2, h);
    ctx.fillRect(d.x + half - pw, top, 2, h);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(d.x - half + 4, top + 6, 2, h - 14);
    ctx.fillRect(d.x + half - pw + 6, top + 6, 2, h - 14);
  });
}

// Liderden işi alan ajana ışın; üzerinde bir kıvılcım yol alıyor.
function drawBeams(ctx: Ctx, beams: FrameInput["beams"]) {
  for (const b of beams) {
    if (b.t < 0 || b.t > 1) continue;
    const { x: x0, y: y0 } = b.from;
    const { x: x1, y: y1 } = b.to;
    const fade = b.t < 0.8 ? 1 : (1 - b.t) / 0.2;
    ctx.save();
    ctx.strokeStyle = `rgba(110,168,255,${0.35 * fade})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(220,235,255,${0.9 * fade})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -b.t * 60;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const k = Math.min(1, b.t * 1.4);
    const sx = x0 + (x1 - x0) * k;
    const sy = y0 + (y1 - y0) * k;
    ctx.fillStyle = `rgba(255,255,255,${fade})`;
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.fillStyle = `rgba(110,168,255,${fade})`;
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
    ctx.restore();
  }
}

/** Bir kare. Canvas piksel ölçüsü cw*dpr x ch*dpr. */
export function drawFrame(ctx: Ctx, f: FrameInput, doors: readonly number[]): void {
  const { cam, cw, ch, dpr, sim, t } = f;
  const pw = Math.round(cw * dpr);
  const ph = Math.round(ch * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0a0c10";
  ctx.fillRect(0, 0, pw, ph);
  const s = cam.zoom * dpr;
  ctx.setTransform(s, 0, 0, s, Math.round(pw / 2 - cam.x * s), Math.round(ph / 2 - cam.y * s));
  ctx.imageSmoothingEnabled = false;
  if (f.bg) ctx.drawImage(f.bg, 0, 0);
  dyns.forEach((it) => drawDyn(ctx, it, t, sim, f.now));
  drawSunlight(ctx, 1 - f.night, t);
  drawDoors(ctx, doors);

  // y sıralı geçiş: eşya + kişiler
  const visible = [...sim.actors.values()].filter((a) => a.pose !== "absent");
  const list: Array<{ b: number; it?: Item; a?: Actor }> = items.map((it) => ({ b: it.base, it }));
  for (const a of visible) list.push({ b: a.y + (low(a) ? 20 : 0), a });
  list.sort((p, q) => p.b - q.b);
  for (const e of list) {
    if (e.it) {
      img(ctx, e.it.art, e.it.x, e.it.y);
      if (e.it.dyn) drawDyn(ctx, e.it, t, sim, f.now);
    } else if (e.a) {
      const look = f.looks.get(e.a.id);
      if (look) drawChar(ctx, e.a, look, f);
    }
  }
  drawBeams(ctx, f.beams);

  // gündüz / gece
  const night = f.night;
  if (night > 0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = tint(night);
    ctx.fillRect(0, 0, pw, ph);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const a of visible) {
      if (!a.sitting || !a.seat?.desk || deskMode(sim, a.seat.desk) === "off") continue;
      const dx = a.seat.x;
      const gr = gradient(() => ctx.createRadialGradient(dx, 110, 2, dx, 110, 60), [
        [0, `rgba(110,168,255,${0.22 * night})`],
        [1, "rgba(110,168,255,0)"]
      ]);
      if (!gr) continue;
      ctx.fillStyle = gr;
      ctx.fillRect(dx - 60, 50, 120, 120);
    }
    // tavan lambaları: sıcak ışık havuzları, hafif titreşimli
    LAMPS.forEach((l, i) => {
      const r = 120 + Math.sin(t * 2 + i) * 3;
      const gr = gradient(() => ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, r), [
        [0, `rgba(255,214,150,${0.16 * night})`],
        [1, "rgba(255,214,150,0)"]
      ]);
      if (!gr) return;
      ctx.fillStyle = gr;
      ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    });
    ctx.restore();
  }

  for (const a of visible) drawOverlay(ctx, a, f);
}

// ------------------------------------------------------------ küçük harita
export const MINI_W = 240;
export const MINI_H = 135;
const MS = MINI_W / W;

/** Zemin + eşyanın küçültülmüş durağan kopyası. */
export function paintMinimapBase(g: Ctx, bg: HTMLCanvasElement | null): void {
  g.imageSmoothingEnabled = true;
  g.save();
  g.scale(MS, MS);
  if (bg) g.drawImage(bg, 0, 0);
  for (const it of items) img(g, it.art, it.x, it.y);
  g.restore();
}

const DOT: Record<string, string> = { typing: "#3ddc84", asking: "#f0c44c", resting: "#c9cfdb", error: "#ff6b5e", unknown: "#8d96a8" };

export function drawMinimap(g: Ctx, base: HTMLCanvasElement | null, sim: Sim, cam: Camera, cw: number, ch: number): void {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, MINI_W, MINI_H);
  if (base) g.drawImage(base, 0, 0);
  for (const a of sim.actors.values()) {
    if (a.pose === "absent") continue;
    g.fillStyle = DOT[a.pose] ?? "#c9cfdb";
    g.fillRect(a.x * MS - 2, a.y * MS - 3, 4, 4);
  }
  const vw = cw / cam.zoom;
  const vh = ch / cam.zoom;
  g.strokeStyle = "rgba(110,168,255,.9)";
  g.lineWidth = 1;
  g.strokeRect((cam.x - vw / 2) * MS + 0.5, (cam.y - vh / 2) * MS + 0.5, vw * MS, vh * MS);
}

export const minimapToWorld = (x: number, y: number): Pt => ({ x: x / MS, y: y / MS });
