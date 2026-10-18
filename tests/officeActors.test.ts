// Ofisteki kişilerin davranışı (spec 2026-10-18 ajanlar-yeniden, kalite
// turu): saf durum makinesi + ızgarada yol bulma, sahte saatle. Çalışan
// masasında yazar; boşta kalan bir süre sonra kahveye, sonra kanepeye yürür;
// iş gelince masasına döner; iki kişi aynı karoya girmez; hareketi azaltta
// yürüme yok, anında hedefte.
import { describe, expect, it } from "vitest";
import { officePlan, type OfficePlan } from "../src/office/officeFloor";
import type { OfficePose } from "../src/office/officeLayout";
import {
  COFFEE_MS,
  REST_DELAY_MS,
  STRETCH_MS,
  actorView,
  stepWorld,
  worldBusy,
  type ActorInput,
  type World
} from "../src/office/officeActors";

const DT = 50;

function inputs(plan: OfficePlan, poses: OfficePose[], motion = true): ActorInput[] {
  return poses.map((pose, i) => ({ id: `p${i}`, pose, motion, home: plan.seats[i] }));
}

function run(world: World | null, plan: OfficePlan, ins: ActorInput[], from: number, ms: number, reduced = false, each?: (w: World, t: number) => void) {
  let w = world;
  let t = from;
  for (; t < from + ms; t += DT) {
    w = stepWorld(w, plan, ins, t, DT, reduced);
    each?.(w, t);
  }
  return { world: w as World, now: t };
}

const at = (w: World, id: string) => w.actors.find((a) => a.id === id)!;
const tileOf = (w: World, id: string) => ({ x: at(w, id).x, y: at(w, id).y });

function assertNoOverlap(w: World) {
  const seen = new Set<string>();
  for (const a of w.actors) {
    const tiles = new Set([`${a.x},${a.y}`, `${a.nx},${a.ny}`]);
    for (const k of tiles) {
      expect(seen.has(k), `${a.id} ${k}`).toBe(false);
      seen.add(k);
    }
  }
}

describe("stepWorld — masada", () => {
  it("ilk görüntüde herkes yerinde (yürüyerek gelmiyor); kesin çalışan yazıyor, tahmini hareketsiz", () => {
    const plan = officePlan(2, 1600, 900);
    const ins = inputs(plan, ["typing", "typing"]);
    ins[1] = { ...ins[1], motion: false };
    const w = stepWorld(null, plan, ins, 0, DT, false);
    expect(tileOf(w, "p0")).toEqual({ x: plan.seats[0].x, y: plan.seats[0].y });
    const v0 = actorView(at(w, "p0"), ins[0], 0, false);
    expect(v0).toMatchObject({ seated: "desk", dir: "up", animated: true, mark: null });
    expect(v0.pose).toMatch(/^type/);
    const frames = new Set([0, 250, 500, 750].map((t) => actorView(at(w, "p0"), ins[0], t, false).pose));
    expect(frames.size).toBeGreaterThan(1);
    const v1 = actorView(at(w, "p1"), ins[1], 0, false);
    expect(v1).toMatchObject({ seated: "desk", animated: false });
    expect(new Set([0, 250, 500].map((t) => actorView(at(w, "p1"), ins[1], t, false).pose)).size).toBe(1);
  });

  it("soru: el kaldırır + ?; hata: !; bilinmiyor soluk", () => {
    const plan = officePlan(3, 1600, 900);
    const ins = inputs(plan, ["asking", "error", "unknown"]);
    const w = stepWorld(null, plan, ins, 0, DT, false);
    expect(actorView(at(w, "p0"), ins[0], 0, false)).toMatchObject({ pose: "raise", mark: "question" });
    expect(actorView(at(w, "p1"), ins[1], 0, false)).toMatchObject({ mark: "error", seated: "desk" });
    expect(actorView(at(w, "p2"), ins[2], 0, false)).toMatchObject({ dim: true });
  });

  it("lider odasında, önden oturur", () => {
    const plan = officePlan(2, 1600, 900);
    const ins: ActorInput[] = [{ id: "lead", pose: "typing", motion: true, home: plan.lead.seat, leader: true }];
    const w = stepWorld(null, plan, ins, 0, DT, false);
    expect(tileOf(w, "lead")).toEqual({ x: plan.lead.seat.x, y: plan.lead.seat.y });
    expect(actorView(at(w, "lead"), ins[0], 0, false)).toMatchObject({ seated: "front", dir: "down" });
  });
});

describe("stepWorld — mola ve dönüş", () => {
  it("boşta: önce gerinir, bekler; sonra kahveye yürür, kahve alır, kanepeye oturur", () => {
    const plan = officePlan(1, 1600, 900);
    const ins = inputs(plan, ["resting"]);
    let { world, now } = run(null, plan, ins, 0, STRETCH_MS - 200);
    expect(actorView(at(world, "p0"), ins[0], now, false).pose).toBe("stretch");
    ({ world, now } = run(world, plan, ins, now, REST_DELAY_MS - STRETCH_MS));
    expect(tileOf(world, "p0")).toEqual({ x: plan.seats[0].x, y: plan.seats[0].y });
    expect(actorView(at(world, "p0"), ins[0], now, false).pose).toBe("sit");
    ({ world, now } = run(world, plan, ins, now, 400));
    expect(actorView(at(world, "p0"), ins[0], now, false).pose).toMatch(/^walk/);
    ({ world, now } = run(world, plan, ins, now, 20_000));
    // Kahve alındı, kanepede.
    expect(at(world, "p0").place).toBe("sofa");
    const sofa = plan.lounge.sofa.map((s) => `${s.x},${s.y}`);
    expect(sofa).toContain(`${at(world, "p0").x},${at(world, "p0").y}`);
    expect(actorView(at(world, "p0"), ins[0], now, false)).toMatchObject({ seated: "front", dir: "down" });
    expect(worldBusy(world, ins, now, false)).toBe(false);
  });

  it("kahve makinesinin önünde COFFEE_MS kadar durur", () => {
    const plan = officePlan(1, 1600, 900);
    const ins = inputs(plan, ["resting"]);
    let arrived = -1;
    let left = -1;
    run(null, plan, ins, 0, 30_000, false, (w, t) => {
      const a = at(w, "p0");
      const onCoffee = a.x === plan.lounge.coffee.x && a.y === plan.lounge.coffee.y && a.t === 0;
      if (onCoffee && arrived < 0) arrived = t;
      if (!onCoffee && arrived >= 0 && left < 0) left = t;
    });
    expect(arrived).toBeGreaterThan(0);
    expect(left - arrived).toBeGreaterThanOrEqual(COFFEE_MS - DT);
  });

  it("iş gelince masasına yürür; hız ~3 karo/sn", () => {
    const plan = officePlan(1, 1600, 900);
    let { world, now } = run(null, plan, inputs(plan, ["resting"]), 0, 30_000);
    expect(at(world, "p0").place).toBe("sofa");
    const work = inputs(plan, ["typing"]);
    const before = at(world, "p0").steps;
    ({ world, now } = run(world, plan, work, now, 1000));
    const moved = at(world, "p0").steps - before;
    expect(moved).toBeGreaterThanOrEqual(2);
    expect(moved).toBeLessThanOrEqual(4);
    ({ world, now } = run(world, plan, work, now, 20_000));
    expect(tileOf(world, "p0")).toEqual({ x: plan.seats[0].x, y: plan.seats[0].y });
    expect(actorView(at(world, "p0"), work[0], now, false).seated).toBe("desk");
  });

  it.each([10, 14])("kalabalık: %i kişi molaya çıkıp dönerken hiçbir an iki kişi aynı karoda değil; herkes masasına varıyor", (n) => {
    const plan = officePlan(n, 1600, 900);
    const rest = inputs(plan, Array(n).fill("resting"));
    let { world, now } = run(null, plan, rest, 0, 40_000, false, (w) => assertNoOverlap(w));
    expect(world.actors.filter((a) => a.place !== "home").length).toBeGreaterThanOrEqual(7);
    const work = inputs(plan, Array(n).fill("typing"));
    ({ world, now } = run(world, plan, work, now, 40_000, false, (w) => assertNoOverlap(w)));
    world.actors.forEach((a, i) => expect(`${a.x},${a.y}`).toBe(`${plan.seats[i].x},${plan.seats[i].y}`));
    expect(worldBusy(world, inputs(plan, Array(n).fill("typing"), false), now, false)).toBe(false);
  });
});

describe("stepWorld — hareketi azalt", () => {
  it("yürüme yok: boşta anında kanepede, iş gelince anında masada; döngü gerekmez", () => {
    const plan = officePlan(1, 1600, 900);
    const rest = inputs(plan, ["resting"]);
    let w = stepWorld(null, plan, rest, 0, DT, true);
    w = stepWorld(w, plan, rest, DT, DT, true);
    expect(at(w, "p0").place).toBe("sofa");
    expect(actorView(at(w, "p0"), rest[0], DT, true).pose).toBe("sit");
    expect(worldBusy(w, rest, DT, true)).toBe(false);
    const work = inputs(plan, ["typing"]);
    w = stepWorld(w, plan, work, 2 * DT, DT, true);
    expect(tileOf(w, "p0")).toEqual({ x: plan.seats[0].x, y: plan.seats[0].y });
    expect(actorView(at(w, "p0"), work[0], 2 * DT, true).animated).toBe(false);
  });
});
