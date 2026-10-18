// Ofisteki kişilerin davranışı ve kamera — SAF (belge yok, zaman dışarıdan).
// Sahte simülasyon yok: her kişinin pozu bölmenin gerçek durumundan
// (officeSeat) geliyor. Masa pozları (çalışıyor / soru / hata / bilinmiyor)
// koltuğa yürütür; "boşta" dinlenme noktalarına (mutfak, kanepe, koşu bandı…)
// yürütür ve orada bir süre oyalanıp başka birine geçer; "kurulu değil"
// kişiyi çizmez. Hareketi azaltta kimse yürümez: hedefe anında yerleşir.
import type { OfficePose } from "./officeLayout";
import type { Dir } from "./officeSprites";
import { AMENITIES, ENTRY, H, W, findPath, leadSeat, rng, WORK_SEATS, type Amenity, type Pt, type Seat } from "./officeWorld";

export interface ActorInput {
  id: string;
  pose: OfficePose;
  /** Yalnız kesin çalışmada: eller yazar, ekran akar. */
  motion: boolean;
  seat: Seat;
}

export interface Actor {
  id: string;
  x: number;
  y: number;
  dir: Dir;
  frame: number;
  animT: number;
  path: Pt[];
  speed: number;
  pose: OfficePose;
  motion: boolean;
  home: Seat;
  sitting: boolean;
  seat: Seat | null;
  amen: Amenity | null;
  after: "desk" | "amen" | null;
  dwellUntil: number;
  activity: "run" | "punch" | null;
  carry: boolean;
  bubble: { text: string; until: number } | null;
}

export interface Sim {
  actors: Map<string, Actor>;
  started: boolean;
  rand: () => number;
}

export function createSim(seed = 7): Sim {
  return { actors: new Map(), started: false, rand: rng(seed) };
}

/** Masada duran pozlar; "boşta" dinlenmeye, "kurulu değil" hiç görünmüyor. */
export const deskBound = (pose: OfficePose) => pose === "typing" || pose === "asking" || pose === "error" || pose === "unknown";

/**
 * Ajan -> koltuk: lider (varsa) lider masasında; ötekiler sırayla çalışma
 * masalarında, masalar dolunca toplantı masasının taburelerinde.
 */
export function assignSeats(ids: readonly string[], leaderId: string | null): Map<string, Seat> {
  const out = new Map<string, Seat>();
  let i = 0;
  for (const id of ids) {
    if (id === leaderId) out.set(id, leadSeat);
    else out.set(id, WORK_SEATS[Math.min(i++, WORK_SEATS.length - 1)]);
  }
  return out;
}

function goTo(a: Actor, x: number, y: number) {
  a.sitting = false;
  a.seat = null;
  a.path = findPath(a.x, a.y, x, y);
}

function sitAtDesk(a: Actor, now: number) {
  a.x = a.home.x;
  a.y = a.home.y;
  a.dir = a.home.dir;
  a.sitting = true;
  a.seat = a.home;
  a.path = [];
  a.after = null;
  a.activity = null;
  a.frame = 0;
  if (a.carry && a.home.desk) a.home.desk.mugAt = now;
  a.carry = false;
}

function releaseAmenity(a: Actor) {
  if (!a.amen) return;
  if (a.amen.kind === "coffee" && a.amen.id !== "water") a.carry = true;
  a.amen = null;
}

function pickAmenity(sim: Sim, a: Actor): Amenity | null {
  const taken = new Set([...sim.actors.values()].filter((o) => o !== a && o.amen).map((o) => o.amen!.id));
  const free = AMENITIES.filter((m) => !taken.has(m.id) && m.id !== a.amen?.id);
  if (!free.length) return null;
  return free[Math.floor(sim.rand() * free.length) % free.length];
}

function arrive(sim: Sim, a: Actor, now: number) {
  if (a.after === "desk") sitAtDesk(a, now);
  else if (a.after === "amen" && a.amen) {
    const m = a.amen;
    a.x = m.x;
    a.y = m.y;
    a.dir = m.face;
    a.activity = m.anim ?? null;
    a.sitting = !!m.sit;
    a.seat = m.sit ? { id: m.id, x: m.x, y: m.y, dir: m.face, desk: null, low: true } : null;
    const [lo, hi] = m.kind === "gym" ? [8000, 12000] : m.kind === "vending" ? [4000, 6000] : [5000, 8000];
    a.dwellUntil = now + lo + sim.rand() * (hi - lo);
  }
  a.after = null;
  a.path = [];
}

function toDesk(sim: Sim, a: Actor, now: number, reduced: boolean) {
  releaseAmenity(a);
  a.after = "desk";
  if (reduced) return arrive(sim, a, now);
  goTo(a, a.home.x, a.home.y);
  if (!a.path.length) arrive(sim, a, now);
}

function toAmenity(sim: Sim, a: Actor, now: number, reduced: boolean) {
  const m = pickAmenity(sim, a);
  releaseAmenity(a);
  if (!m) return toDesk(sim, a, now, reduced);
  a.amen = m;
  a.after = "amen";
  if (reduced) return arrive(sim, a, now);
  goTo(a, m.x, m.y);
  if (!a.path.length) arrive(sim, a, now);
}

/** Girdileri dünyaya uygula: yeni gelen, poz ya da koltuk değişen, ayrılan. */
export function syncSim(sim: Sim, inputs: readonly ActorInput[], now: number, reduced: boolean): void {
  const seen = new Set<string>();
  for (const inp of inputs) {
    seen.add(inp.id);
    let a = sim.actors.get(inp.id);
    if (!a) {
      const fresh = !sim.started || reduced;
      a = {
        id: inp.id,
        x: fresh ? inp.seat.x : ENTRY.x,
        y: fresh ? inp.seat.y : ENTRY.y,
        dir: "up",
        frame: 0,
        animT: 0,
        path: [],
        speed: 82,
        pose: inp.pose,
        motion: inp.motion,
        home: inp.seat,
        sitting: false,
        seat: null,
        amen: null,
        after: null,
        dwellUntil: 0,
        activity: null,
        carry: false,
        bubble: null
      };
      sim.actors.set(inp.id, a);
      if (inp.pose === "resting") toAmenity(sim, a, now, reduced);
      else if (fresh) sitAtDesk(a, now);
      else toDesk(sim, a, now, reduced);
      continue;
    }
    const wasDesk = deskBound(a.pose) || a.pose === "absent";
    const homeMoved = a.home !== inp.seat;
    a.motion = inp.motion;
    a.home = inp.seat;
    const prev = a.pose;
    a.pose = inp.pose;
    if (inp.pose === "absent") {
      releaseAmenity(a);
      sitAtDesk(a, now);
    } else if (inp.pose === "resting") {
      if (prev !== "resting") toAmenity(sim, a, now, reduced);
    } else if (!wasDesk || homeMoved || prev === "resting") toDesk(sim, a, now, reduced);
  }
  for (const id of [...sim.actors.keys()]) if (!seen.has(id)) sim.actors.delete(id);
  sim.started = true;
}

function animate(a: Actor, dt: number, period: number) {
  a.animT += dt;
  if (a.animT > period) {
    a.animT = 0;
    a.frame = a.frame === 1 ? 2 : 1;
  }
}

/** Bir adım: yürüyenler ilerliyor, oyalanma süresi dolan başka noktaya geçiyor. dt saniye. */
export function stepSim(sim: Sim, dt: number, now: number, reduced: boolean): void {
  for (const a of sim.actors.values()) {
    if (!reduced && a.pose === "resting" && a.amen && !a.path.length && !a.after && now > a.dwellUntil) toAmenity(sim, a, now, reduced);
    if (a.path.length) {
      const p = a.path[0];
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const dist = Math.hypot(dx, dy);
      const mv = a.speed * dt;
      if (dist <= mv) {
        a.x = p.x;
        a.y = p.y;
        a.path.shift();
        if (!a.path.length && a.after) arrive(sim, a, now);
      } else {
        a.x += (dx / dist) * mv;
        a.y += (dy / dist) * mv;
      }
      a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      a.activity = null;
      animate(a, dt, 0.14);
    } else if (a.after) arrive(sim, a, now);
    else if (a.activity === "run" && !reduced) animate(a, dt, 0.09);
    else a.frame = 0;
  }
}

/** Döngü sürmeli mi: biri yürüyor, dinleniyor (gezecek), yazıyor ya da balon açık. */
export function simBusy(sim: Sim, now: number): boolean {
  for (const a of sim.actors.values()) {
    if (a.path.length || a.after || a.pose === "resting" || (a.pose === "typing" && a.motion)) return true;
    if (a.bubble && now < a.bubble.until) return true;
  }
  return false;
}

export function say(sim: Sim, id: string, text: string, now: number, ms = 2400): void {
  const a = sim.actors.get(id);
  if (a) a.bubble = { text, until: now + ms };
}

// ------------------------------------------------------------ kamera
export const ZOOMS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3];

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** Bütün ofisi gösteren en büyük yakınlık. */
export function fitZoom(cw: number, ch: number): number {
  const f = Math.min(cw / W, ch / H);
  return ZOOMS.filter((z) => z <= f + 1e-6).pop() ?? ZOOMS[0];
}

/** Bir kademe yakın/uzak. */
export function stepZoom(zoom: number, dir: 1 | -1): number {
  let i = ZOOMS.findIndex((z) => Math.abs(z - zoom) < 1e-6);
  if (i < 0) i = ZOOMS.findIndex((z) => z > zoom) - (dir > 0 ? 1 : 0);
  return ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))];
}

/** Kamera merkezi: görüş ofisten genişse ortada, değilse kenarlara dayanıyor. */
export function clampCamera(cam: Camera, cw: number, ch: number): Camera {
  const vw = cw / cam.zoom;
  const vh = ch / cam.zoom;
  return {
    zoom: cam.zoom,
    x: vw >= W ? W / 2 : Math.max(vw / 2, Math.min(W - vw / 2, cam.x)),
    y: vh >= H ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, cam.y))
  };
}

export function worldToScreen(cam: Camera, cw: number, ch: number, x: number, y: number): Pt {
  return { x: (x - cam.x) * cam.zoom + cw / 2, y: (y - cam.y) * cam.zoom + ch / 2 };
}

// ------------------------------------------------------------ gündüz / gece
/** 0 gündüz, 1 gece. Akşam 19:00-21:30, şafak 05:30-07:00. */
export function nightFactor(d: Date): number {
  const t = d.getHours() * 60 + d.getMinutes();
  const [ds, de, ws, we] = [1140, 1290, 330, 420];
  if (t >= we && t < ds) return 0;
  if (t >= ds && t < de) return (t - ds) / (de - ds);
  if (t >= ws && t < we) return 1 - (t - ws) / (we - ws);
  return 1;
}
