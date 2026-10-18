// Ofisteki kişilerin davranışı (spec 2026-10-18 ajanlar-yeniden, kalite
// turu). SAF durum makinesi: girdi (bölmenin pozu) + zaman -> konum, yön,
// çizilecek kare. Ekran yok, saat dışarıdan; testler sahte saatle koşuyor.
//
//   çalışıyor (kesin)  masasında yazar (3 kare), monitör yanar
//   tahmini çalışıyor  masasında oturur, hareketsiz
//   soru               masasında el kaldırır + "?"
//   hata               masasında, kırmızı "!"
//   boşta/bitti        önce gerinir; REST_DELAY_MS sonra kahve makinesine
//                      yürür, COFFEE_MS bekler, kanepeye (doluysa ayakta
//                      durma noktasına, o da doluysa masasında) geçer
//   iş gelince         masasına yürür
//   lider              odasında, önden oturur
//
// Yürüme ~3 karo/sn, karodan karoya. İki kişi aynı karoya girmez: her kişi
// bulunduğu ve gideceği karoyu ayırtıyor; önü doluysa bekler, uzun sürerse
// başka yoldan dener, o da yoksa yana çekilir. Hareketi azaltta yürüme yok.
import type { Dir, OfficePlan, Spot } from "./officeFloor";
import type { OfficePose } from "./officeLayout";
import { FRAME_MS } from "./officeMotion";
import { findPath } from "./officePath";
import type { CharacterPose } from "./officeSprites";

export const WALK_TILES_PER_S = 3;
export const REST_DELAY_MS = 6000;
export const STRETCH_MS = 2000;
export const COFFEE_MS = 3000;
const WAIT_REPATH_MS = 900;

export type Place = "home" | "coffee" | "sofa" | "stand";

export interface ActorInput {
  id: string;
  pose: OfficePose;
  motion: boolean;
  /** Masadaki koltuk (lider için lider koltuğu). */
  home: Spot;
  leader?: boolean;
}

export interface Actor {
  id: string;
  /** Bulunduğu karo. */
  x: number;
  y: number;
  /** Gittiği karo; duruyorsa x/y ile aynı. */
  nx: number;
  ny: number;
  /** x/y'den nx/ny'ye ilerleme, 0-1. */
  t: number;
  dir: Dir;
  path: Array<[number, number]>;
  place: Place;
  /** Kanepe/ayakta noktasının sırası. */
  slot: number;
  goalKey: string;
  restSince: number | null;
  coffeeDone: boolean;
  arrivedAt: number | null;
  waitMs: number;
  /** Atılan adım sayısı (yürüme karesi). */
  steps: number;
}

export interface World {
  actors: Actor[];
}

export interface ActorView {
  pose: CharacterPose;
  dir: Dir;
  /** Sanat pikseli; karonun sol üstü. */
  px: number;
  py: number;
  mark: "question" | "error" | null;
  dim: boolean;
  seated: "desk" | "front" | null;
  animated: boolean;
  /** Karodan karoya yürüyor. */
  moving: boolean;
  /** Atılan adım + ilerleme: yürüme karesinin sürekli saati. */
  stride: number;
}

const key = (x: number, y: number) => `${x},${y}`;
const moving = (a: Actor) => a.nx !== a.x || a.ny !== a.y;

function spotOf(plan: OfficePlan, input: ActorInput, place: Place, slot: number): Spot {
  if (place === "coffee") return plan.lounge.coffee;
  if (place === "sofa") return plan.lounge.sofa[slot];
  if (place === "stand") return plan.lounge.stand[slot];
  return input.home;
}

function dirOf(dx: number, dy: number, fallback: Dir): Dir {
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return fallback;
}

function spawn(input: ActorInput, now: number): Actor {
  const h = input.home;
  return {
    id: input.id,
    x: h.x,
    y: h.y,
    nx: h.x,
    ny: h.y,
    t: 0,
    dir: h.face,
    path: [],
    place: "home",
    slot: 0,
    goalKey: `home:${h.x},${h.y}`,
    restSince: null,
    coffeeDone: false,
    arrivedAt: now,
    waitMs: 0,
    steps: 0
  };
}

/** Molada mı olmalı (yer ayırmadan önce). */
function wantsLounge(a: Actor, input: ActorInput, now: number, reduced: boolean): boolean {
  if (input.leader || input.pose !== "resting" || a.restSince === null) return false;
  return reduced || now - a.restSince >= REST_DELAY_MS;
}

/** Kahve, kanepe ve ayakta noktalarını dağıtıyor; elinde tutan bırakmıyor. */
function allocate(plan: OfficePlan, actors: Actor[], inputs: ActorInput[], now: number, reduced: boolean) {
  const taken = new Set<string>();
  const want = actors.map((a, i) => wantsLounge(a, inputs[i], now, reduced));
  // Kahve: oradaki süresini doldurdu mu?
  actors.forEach((a, i) => {
    if (!want[i]) {
      a.place = "home";
      return;
    }
    if (reduced) a.coffeeDone = true;
    if (a.place === "coffee" && a.arrivedAt !== null && !moving(a) && a.path.length === 0 && now - a.arrivedAt >= COFFEE_MS) a.coffeeDone = true;
    if (a.place === "coffee" && a.coffeeDone) a.place = "home";
  });
  // Önce elinde tutanlar.
  actors.forEach((a, i) => {
    if (!want[i] || a.place === "home") return;
    const k = `${a.place}:${a.slot}`;
    if (taken.has(k)) a.place = "home";
    else taken.add(k);
  });
  // Sonra yeni gelenler.
  actors.forEach((a, i) => {
    if (!want[i] || a.place !== "home") return;
    if (!a.coffeeDone) {
      if (!taken.has("coffee:0")) {
        a.place = "coffee";
        a.slot = 0;
        taken.add("coffee:0");
        return;
      }
      a.coffeeDone = true;
    }
    for (const [place, list] of [
      ["sofa", plan.lounge.sofa],
      ["stand", plan.lounge.stand]
    ] as const) {
      const slot = list.findIndex((_, j) => !taken.has(`${place}:${j}`));
      if (slot >= 0) {
        a.place = place;
        a.slot = slot;
        taken.add(`${place}:${slot}`);
        return;
      }
    }
  });
}

function reservedBy(actors: Actor[], self: Actor): Set<string> {
  const out = new Set<string>();
  for (const o of actors) {
    if (o === self) continue;
    out.add(key(o.x, o.y));
    out.add(key(o.nx, o.ny));
  }
  return out;
}

function walk(plan: OfficePlan, a: Actor, goal: Spot, actors: Actor[], now: number, dt: number) {
  let remaining = (dt * WALK_TILES_PER_S) / 1000;
  while (remaining > 0) {
    if (moving(a)) {
      a.t += remaining;
      remaining = 0;
      if (a.t >= 1) {
        remaining = a.t - 1;
        a.x = a.nx;
        a.y = a.ny;
        a.t = 0;
        a.steps += 1;
      }
      continue;
    }
    if (a.path.length === 0) break;
    const [px, py] = a.path[0];
    const reserved = reservedBy(actors, a);
    if (reserved.has(key(px, py))) {
      a.waitMs += dt;
      if (a.waitMs >= WAIT_REPATH_MS) {
        a.waitMs = 0;
        const around = findPath(plan.blocked, { x: a.x, y: a.y }, goal, reserved);
        if (around && around.length > 0 && !reserved.has(key(around[0][0], around[0][1]))) a.path = around;
        else {
          // Yana çekil: boş bir komşu karoya geç, sonra yeniden yol ara.
          const side = (
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1]
            ] as const
          )
            .map(([dx, dy]) => [a.x + dx, a.y + dy] as [number, number])
            .find(([x, y]) => !plan.blocked[y]?.[x] && !reserved.has(key(x, y)) && !(x === px && y === py));
          if (side) a.path = [side];
        }
      }
      break;
    }
    a.path.shift();
    a.nx = px;
    a.ny = py;
    a.dir = dirOf(px - a.x, py - a.y, a.dir);
    a.waitMs = 0;
  }
  if (!moving(a) && a.path.length === 0) {
    if (a.x === goal.x && a.y === goal.y) {
      if (a.arrivedAt === null) a.arrivedAt = now;
      a.dir = goal.face;
    } else {
      a.path = findPath(plan.blocked, { x: a.x, y: a.y }, goal) ?? [];
    }
  }
}

export function stepWorld(prev: World | null, plan: OfficePlan, inputs: readonly ActorInput[], now: number, dt: number, reduced: boolean): World {
  const old = new Map((prev?.actors ?? []).map((a) => [a.id, a]));
  const live = inputs.filter((i) => i.pose !== "absent");
  const actors = live.map((input) => {
    const was = old.get(input.id);
    return was ? { ...was, path: [...was.path] } : spawn(input, now);
  });
  actors.forEach((a, i) => {
    const input = live[i];
    if (input.pose === "resting" && !input.leader) a.restSince ??= now;
    else {
      a.restSince = null;
      a.coffeeDone = false;
    }
  });
  allocate(plan, actors, live, now, reduced);
  actors.forEach((a, i) => {
    const input = live[i];
    const goal = spotOf(plan, input, a.place, a.slot);
    const goalKey = `${a.place}:${goal.x},${goal.y}`;
    if (goalKey !== a.goalKey) {
      a.goalKey = goalKey;
      a.arrivedAt = null;
      a.waitMs = 0;
      const from = moving(a) ? { x: a.nx, y: a.ny } : { x: a.x, y: a.y };
      a.path = findPath(plan.blocked, from, goal) ?? [];
    }
    if (reduced) {
      a.x = a.nx = goal.x;
      a.y = a.ny = goal.y;
      a.t = 0;
      a.path = [];
      a.dir = goal.face;
      a.arrivedAt ??= now;
      return;
    }
    walk(plan, a, goal, actors, now, dt);
  });
  return { actors };
}

const TYPE_CYCLE: CharacterPose[] = ["type0", "type1", "type0", "type2"];

export function actorView(a: Actor, input: ActorInput, now: number, reduced: boolean): ActorView {
  const px = (a.x + (a.nx - a.x) * a.t) * 16;
  const py = (a.y + (a.ny - a.y) * a.t) * 16;
  const mark = input.pose === "asking" ? "question" : input.pose === "error" ? "error" : null;
  const base = { px, py, mark, dim: input.pose === "unknown", moving: moving(a), stride: a.steps + a.t } as const;
  if (moving(a)) {
    const frame = (a.steps * 2 + Math.floor(a.t * 2)) % 4;
    return { ...base, pose: `walk${frame}` as CharacterPose, dir: a.dir, seated: null, animated: true };
  }
  const home = input.home;
  const atHome = a.place === "home" && a.x === home.x && a.y === home.y;
  if (atHome && input.leader) return { ...base, pose: "sit", dir: "down", seated: "front", animated: false };
  if (atHome) {
    let pose: CharacterPose = "sit";
    let animated = false;
    if (input.pose === "typing") {
      animated = input.motion && !reduced;
      pose = animated ? TYPE_CYCLE[Math.floor(now / FRAME_MS) % TYPE_CYCLE.length] : "type0";
    } else if (input.pose === "asking") pose = "raise";
    else if (input.pose === "resting" && !reduced && a.restSince !== null && now - a.restSince < STRETCH_MS) pose = "stretch";
    return { ...base, pose, dir: "up", seated: "desk", animated };
  }
  if (a.place === "sofa" && a.path.length === 0) return { ...base, pose: "sit", dir: "down", seated: "front", animated: false };
  return { ...base, pose: "walk0", dir: a.dir, seated: null, animated: false };
}

/** Çizim döngüsü sürmeli mi: yürüyen, yazan ya da zamanlayıcısı işleyen biri var mı. */
export function worldBusy(world: World, inputs: readonly ActorInput[], now: number, reduced: boolean): boolean {
  if (reduced) return false;
  const byId = new Map(inputs.map((i) => [i.id, i]));
  return world.actors.some((a) => {
    const input = byId.get(a.id);
    if (!input) return false;
    if (moving(a) || a.path.length > 0 || a.waitMs > 0) return true;
    if (a.place === "home" && input.pose === "typing" && input.motion) return true;
    if (a.restSince !== null && a.place === "home" && !input.leader && now - a.restSince < REST_DELAY_MS) return true;
    if (a.place === "coffee" && !a.coffeeDone) return true;
    return false;
  });
}
