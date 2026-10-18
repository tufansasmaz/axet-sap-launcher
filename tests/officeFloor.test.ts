// Piksel ofisin kat planı (spec 2026-10-18 ajanlar-yeniden §3 + kalite turu):
// odalar (açık çalışma, lider odası cam bölmeli, toplantı, mutfak, sunucu/
// arşiv), kalın duvar, kapı aralıkları, zemin türleri; her oda bir kapıdan
// erişilebilir (BFS); çalışma alanı ajan sayısıyla büyür, öteki odalar sabit.
import { describe, expect, it } from "vitest";
import { CELL_H, CELL_W, MAX_DESKS, ROOM_CAP, TILE, fitScale, officePlan, type OfficePlan, type RoomId } from "../src/office/officeFloor";
import { reachable } from "../src/office/officePath";

const WIDE = { w: 1800, h: 900 };
const TALL = { w: 700, h: 1600 };
const key = (x: number, y: number) => `${x},${y}`;

function roomTiles(plan: OfficePlan, room: RoomId): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  plan.rooms.forEach((row, y) => row.forEach((r, x) => r === room && out.push([x, y])));
  return out;
}

function spots(plan: OfficePlan) {
  return [...plan.seats, plan.lead.seat, plan.lounge.coffee, ...plan.lounge.sofa, ...plan.lounge.stand];
}

describe("officePlan — odalar", () => {
  it("beş oda var; zemin türleri: çalışma ahşap, mutfak karo, toplantı halı, sunucu beton", () => {
    const plan = officePlan(5, WIDE.w, WIDE.h);
    for (const room of ["work", "leader", "meeting", "kitchen", "server"] as const) expect(roomTiles(plan, room).length, room).toBeGreaterThan(0);
    const floorOf = (room: RoomId) => new Set(roomTiles(plan, room).map(([x, y]) => plan.tiles[y][x]));
    expect(floorOf("work")).toEqual(new Set(["wood"]));
    expect(floorOf("kitchen")).toEqual(new Set(["tile"]));
    expect(floorOf("meeting")).toEqual(new Set(["carpet"]));
    expect(floorOf("server")).toEqual(new Set(["concrete"]));
    expect(floorOf("leader")).toEqual(new Set(["wood"]));
    expect(plan.tiles.flat()).toContain("glass");
  });

  it("dış kabuk duvar; üst duvar iki karo kalın (tepe + ön yüz)", () => {
    const plan = officePlan(3, WIDE.w, WIDE.h);
    expect(plan.tiles[0].every((t) => t === "wall")).toBe(true);
    expect(plan.tiles[1].every((t) => t === "wall")).toBe(true);
    expect(plan.tiles[plan.rows - 1].every((t) => t === "wall")).toBe(true);
    for (const row of plan.tiles) {
      expect(row[0]).toBe("wall");
      expect(row[plan.cols - 1]).toBe("wall");
    }
  });

  it("duvar ön yüzü iki karo (üst dış duvarda ve ara duvarda); kapı yüzü de deliyor; lider bölmesi camdan", () => {
    const plan = officePlan(3, WIDE.w, WIDE.h);
    const x = plan.lead.seat.x;
    expect(plan.faces[1][x]).toBe("upper");
    expect(plan.faces[2][x]).toBe("lower");
    const d = plan.door;
    for (let y = d.y; y <= d.y + 2; y++) expect(plan.tiles[y][d.x], `${d.x},${y}`).toBe("door");
    expect(plan.faces[d.y + 1][1]).toBe("upper");
    expect(plan.faces[d.y + 2][1]).toBe("lower");
    const glassRows = new Set(plan.tiles.flatMap((row, y) => (row.includes("glass") ? [y] : [])));
    expect([...glassRows].sort()).toEqual([d.y + 1, d.y + 2]);
    // Yüz karoları yürünemez.
    plan.faces.forEach((row, y) => row.forEach((f, xx) => f && expect(plan.blocked[y][xx]).toBe(true)));
  });

  it("BFS: her oda kapıdan erişilebilir, bütün oturma/durma noktaları yürünebilir ve ulaşılabilir", () => {
    for (const n of [1, 3, 7, 9, 14, 24]) {
      const plan = officePlan(n, WIDE.w, WIDE.h);
      const start = plan.seats[0] ?? plan.lead.seat;
      const seen = reachable(plan.blocked, start);
      for (const room of ["work", "leader", "meeting", "kitchen", "server"] as const) {
        expect(roomTiles(plan, room).some(([x, y]) => seen.has(key(x, y))), `${n} ${room}`).toBe(true);
      }
      for (const s of spots(plan)) {
        expect(plan.blocked[s.y][s.x], `${n} ${key(s.x, s.y)}`).toBe(false);
        expect(seen.has(key(s.x, s.y)), `${n} ${key(s.x, s.y)}`).toBe(true);
      }
      // Kapılar duvar sırasında, yürünebilir.
      const doors = plan.tiles.flatMap((row, y) => row.map((t, x) => (t === "door" ? [x, y] : null)).filter(Boolean)) as Array<[number, number]>;
      expect(doors.length).toBeGreaterThanOrEqual(4);
      for (const [x, y] of doors) expect(seen.has(key(x, y))).toBe(true);
    }
  });

  it("noktalar benzersiz; masa koltukları yukarı (monitöre), lider aşağı bakıyor", () => {
    const plan = officePlan(9, WIDE.w, WIDE.h);
    const all = spots(plan).map((s) => key(s.x, s.y));
    expect(new Set(all).size).toBe(all.length);
    expect(plan.seats.every((s) => s.face === "up")).toBe(true);
    expect(plan.lead.seat.face).toBe("down");
    expect(plan.lounge.sofa.length).toBeGreaterThanOrEqual(3);
    expect(plan.lounge.stand.length).toBeGreaterThanOrEqual(3);
  });
});

describe("officePlan — masalar ve büyüme", () => {
  it("masa sayısı ajan sayısı; masa karoları dolu, koltuk boş; hücreler çalışma alanında, çakışmıyor", () => {
    for (const n of [1, 4, 6, 9]) {
      const plan = officePlan(n, WIDE.w, WIDE.h);
      expect(plan.desks).toHaveLength(n);
      expect(plan.seats).toHaveLength(n);
      const cells = new Set<string>();
      plan.desks.forEach((d, i) => {
        for (let x = d.x; x < d.x + 3; x++) expect(plan.blocked[d.y + 1][x]).toBe(true);
        expect(plan.seats[i]).toEqual({ x: d.x + 1, y: d.y + 2, face: "up" });
        for (let y = d.y; y < d.y + CELL_H; y++)
          for (let x = d.x; x < d.x + CELL_W; x++) {
            expect(cells.has(key(x, y))).toBe(false);
            cells.add(key(x, y));
            expect(plan.rooms[y][x] === "work" || plan.rooms[y][x] === "workB", key(x, y)).toBe(true);
          }
      });
    }
  });

  it("satır başına 4-6 masa; geniş alanda sıra uzar, dar alanda 4", () => {
    expect(officePlan(3, WIDE.w, WIDE.h).perRow).toBe(4);
    const wide = officePlan(9, 2400, 700);
    expect(wide.perRow).toBeGreaterThanOrEqual(5);
    expect(officePlan(9, TALL.w, TALL.h).perRow).toBe(4);
  });

  it("çalışma alanı büyür; lider odası, mutfak ve sunucu odası sabit", () => {
    const a = officePlan(2, TALL.w, TALL.h);
    const b = officePlan(14, TALL.w, TALL.h);
    expect(b.rows).toBeGreaterThan(a.rows);
    expect(roomTiles(b, "work").length + roomTiles(b, "workB").length).toBeGreaterThan(roomTiles(a, "work").length);
    for (const room of ["leader", "kitchen", "server"] as const) expect(roomTiles(b, room).length, room).toBe(roomTiles(a, room).length);
  });

  it("12'yi aşınca ikinci bölüm: kapılı ara duvar, ilkinde 12 masa", () => {
    expect(ROOM_CAP).toBe(12);
    const plan = officePlan(14, WIDE.w, WIDE.h);
    expect(plan.desks.filter((d) => d.room === "work")).toHaveLength(12);
    expect(plan.desks.filter((d) => d.room === "workB")).toHaveLength(2);
    expect(roomTiles(plan, "workB").length).toBeGreaterThan(0);
  });

  it("sınır: negatif/NaN 0, kesir aşağı, üst sınır MAX_DESKS", () => {
    expect(officePlan(-2, 800, 600).desks).toHaveLength(0);
    expect(officePlan(Number.NaN, 800, 600).desks).toHaveLength(0);
    expect(officePlan(2.9, 800, 600).desks).toHaveLength(2);
    expect(officePlan(99, 800, 600).desks).toHaveLength(MAX_DESKS);
  });
});

describe("fitScale", () => {
  it("alana sığan en büyük tam sayı, 2-4 arası; ölçü yoksa 2", () => {
    const w = 25 * TILE;
    const h = 12 * TILE;
    expect(fitScale(w, h, w * 4 + 10, h * 4 + 10)).toBe(4);
    expect(fitScale(w, h, w * 3 + 10, h * 10)).toBe(3);
    expect(fitScale(w, h, w * 9, h * 2.5)).toBe(2);
    expect(fitScale(w, h, 100, 100)).toBe(2);
    expect(fitScale(w, h, 0, 0)).toBe(2);
    expect(fitScale(w, h, w * 20, h * 20)).toBe(4);
  });
});
