// Sürükle-bırak alanları (spec 2026-10-14 §3.4): kenarlar %25, ortası takas.
import { describe, expect, it } from "vitest";
import { dropZone, zoneBox } from "../src/terminal/dropZone";

const box = { left: 100, top: 50, width: 400, height: 200 };

describe("dropZone", () => {
  it("beş alan", () => {
    expect(dropZone(box, 110, 150)).toBe("left");
    expect(dropZone(box, 490, 150)).toBe("right");
    expect(dropZone(box, 300, 55)).toBe("top");
    expect(dropZone(box, 300, 245)).toBe("bottom");
    expect(dropZone(box, 300, 150)).toBe("center");
  });

  it("köşede en yakın kenar kazanıyor", () => {
    expect(dropZone(box, 104, 60)).toBe("left"); // sola 1%, üste 5%
    expect(dropZone(box, 140, 52)).toBe("top"); // sola 10%, üste 1%
  });

  it("kutu dışı ve boş kutu null", () => {
    expect(dropZone(box, 99, 150)).toBeNull();
    expect(dropZone(box, 300, 251)).toBeNull();
    expect(dropZone({ left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull();
  });
});

describe("zoneBox", () => {
  it("kenar yarım kutu, orta bütün kutu", () => {
    expect(zoneBox(box, "left")).toEqual({ left: 100, top: 50, width: 200, height: 200 });
    expect(zoneBox(box, "right")).toEqual({ left: 300, top: 50, width: 200, height: 200 });
    expect(zoneBox(box, "top")).toEqual({ left: 100, top: 50, width: 400, height: 100 });
    expect(zoneBox(box, "bottom")).toEqual({ left: 100, top: 150, width: 400, height: 100 });
    expect(zoneBox(box, "center")).toEqual(box);
  });
});
