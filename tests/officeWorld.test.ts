// Piksel ofisin saf parçaları: dünya erişilebilirliği (A*), ajan -> koltuk
// eşlemesi, kişilerin poza göre yürüyüşü, oda etiketlerinin iki dili,
// gündüz/gece ve kamera.
import { describe, expect, it } from "vitest";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import { AMENITIES, ENTRY, ROOMS, WORK_SEATS, desks, findPath, leadSeat, stools, type Pt } from "../src/office/officeWorld";
import { assignSeats, clampCamera, createSim, nightFactor, simBusy, stepSim, stepZoom, syncSim, ZOOMS, type ActorInput } from "../src/office/officeSim";
import { OFFICE_MAX_SEATS } from "../src/office/officeLayout";

const reaches = (from: Pt, to: Pt) => {
  const path = findPath(from.x, from.y, to.x, to.y);
  return path.length > 0 && path[path.length - 1].x === to.x && path[path.length - 1].y === to.y;
};

describe("dünya: A* ile her yere ulaşılıyor", () => {
  it("girişten her masaya, lider masasına ve her tabureye", () => {
    for (const s of [...desks, leadSeat, ...stools]) expect(reaches(ENTRY, s), s.id).toBe(true);
  });

  it("girişten her dinlenme noktasına; masadan mutfağa ve geri", () => {
    for (const m of AMENITIES) expect(reaches(ENTRY, m), m.id).toBe(true);
    const coffee = AMENITIES.find((m) => m.id === "coffee")!;
    expect(reaches(desks[0], coffee)).toBe(true);
    expect(reaches(coffee, desks[7])).toBe(true);
  });

  it("koltuk sayısı alanın en çok bölmesini karşılıyor", () => {
    expect(WORK_SEATS.length + 1).toBeGreaterThanOrEqual(OFFICE_MAX_SEATS);
    expect(new Set(WORK_SEATS.map((s) => s.id)).size).toBe(WORK_SEATS.length);
  });
});

describe("ajan -> koltuk", () => {
  it("lider lider masasında, ötekiler sırayla masalarda; masalar dolunca taburelerde", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const m = assignSeats(ids, "p3");
    expect(m.get("p3")).toBe(leadSeat);
    expect(m.get("p0")).toBe(desks[0]);
    expect(m.get("p4")).toBe(desks[3]);
    expect(m.get("p8")).toBe(desks[7]);
    expect(m.get("p9")).toBe(stools[0]);
    const noLead = assignSeats(["a", "b"], null);
    expect(noLead.get("a")).toBe(desks[0]);
    expect(noLead.get("b")).toBe(desks[1]);
  });
});

describe("kişiler", () => {
  const input = (pose: ActorInput["pose"], motion = false): ActorInput => ({ id: "p1", pose, motion, seat: desks[2] });
  const run = (sim: ReturnType<typeof createSim>, seconds: number) => {
    for (let i = 0; i < seconds * 20; i++) stepSim(sim, 0.05, 1000 + i * 50, false);
  };

  it("açılışta çalışan masasında oturuyor; boşta dinlenmeye yürüyor; iş gelince masaya dönüyor", () => {
    const sim = createSim();
    syncSim(sim, [input("typing", true)], 0, false);
    const a = sim.actors.get("p1")!;
    expect([a.x, a.y, a.sitting]).toEqual([desks[2].x, desks[2].y, true]);
    syncSim(sim, [input("resting")], 0, false);
    expect(a.amen).not.toBeNull();
    expect(a.path.length).toBeGreaterThan(0);
    expect(simBusy(sim, 0)).toBe(true);
    run(sim, 40);
    syncSim(sim, [input("asking")], 0, false);
    expect(a.amen).toBeNull();
    run(sim, 40);
    expect([a.x, a.y, a.sitting]).toEqual([desks[2].x, desks[2].y, true]);
  });

  it("hareketi azaltta yürüyüş yok: hedefe anında yerleşiyor", () => {
    const sim = createSim();
    syncSim(sim, [input("typing")], 0, true);
    syncSim(sim, [input("resting")], 0, true);
    const a = sim.actors.get("p1")!;
    expect(a.path).toEqual([]);
    expect([a.x, a.y]).toEqual([a.amen!.x, a.amen!.y]);
  });

  it("sonradan gelen ajan girişten masasına yürüyor; ayrılan siliniyor", () => {
    const sim = createSim();
    syncSim(sim, [input("typing")], 0, false);
    syncSim(sim, [input("typing"), { id: "p2", pose: "typing", motion: false, seat: desks[3] }], 0, false);
    const b = sim.actors.get("p2")!;
    expect([b.x, b.y]).toEqual([ENTRY.x, ENTRY.y]);
    run(sim, 40);
    expect([b.x, b.y, b.sitting]).toEqual([desks[3].x, desks[3].y, true]);
    syncSim(sim, [input("typing")], 0, false);
    expect(sim.actors.has("p2")).toBe(false);
  });
});

describe("oda etiketleri", () => {
  it("iki dilde var, ASCII, '// ' ile başlıyor; Türkçe ve İngilizce farklı", () => {
    const keys = ROOMS.flatMap((r) => (r.label ? [r.label] : []));
    expect(keys).toHaveLength(5);
    for (const k of keys) {
      for (const d of [tr, en]) {
        expect(d[k]).toMatch(/^\/\/ [A-Z]+$/);
      }
    }
    expect(keys.map((k) => tr[k])).toEqual(["// OFIS", "// MUTFAK", "// LIDER", "// SUNUCU", "// DINLENME"]);
    expect(keys.map((k) => en[k])).toEqual(["// OFFICE", "// KITCHEN", "// LEAD", "// SERVER", "// LOUNGE"]);
  });
});

describe("gündüz/gece ve kamera", () => {
  it("öğlen gündüz, gece yarısı gece, akşamüstü arada", () => {
    expect(nightFactor(new Date(2026, 0, 1, 12, 0))).toBe(0);
    expect(nightFactor(new Date(2026, 0, 1, 0, 0))).toBe(1);
    const dusk = nightFactor(new Date(2026, 0, 1, 20, 0));
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
  });

  it("kamera ofis dışına kaymıyor; yakınlık kademeleri sınırda duruyor", () => {
    expect(clampCamera({ x: -500, y: 5000, zoom: 2 }, 800, 600)).toEqual({ x: 200, y: 750, zoom: 2 });
    expect(clampCamera({ x: 0, y: 0, zoom: 0.4 }, 800, 600)).toEqual({ x: 800, y: 450, zoom: 0.4 });
    expect(stepZoom(ZOOMS[ZOOMS.length - 1], 1)).toBe(ZOOMS[ZOOMS.length - 1]);
    expect(stepZoom(ZOOMS[0], -1)).toBe(ZOOMS[0]);
    expect(stepZoom(1, 1)).toBe(1.25);
  });
});
