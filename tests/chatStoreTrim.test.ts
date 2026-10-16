// Sınır aşılınca EN ESKİ GÜNCELLENEN sohbet düşüyor (spec §9). Eskiden
// listenin başı düşüyordu: yeni sohbet sona eklendiği için bu "en eski
// oluşturulan" demekti — hâlâ her gün kullanılan bir sohbet silinebiliyordu.
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));
const { trimSessions } = await import("../app-electron/main/chatStore");

describe("trimSessions", () => {
  it("en eski güncellenenler düşüyor, kalanların sırası korunuyor", () => {
    const list = [
      { id: "a", updatedAt: 50 }, // eski oluşturulmuş ama yeni güncellenmiş
      { id: "b", updatedAt: 10 },
      { id: "c", updatedAt: 30 },
      { id: "d", updatedAt: 20 }
    ];
    expect(trimSessions(list, 2).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("sınırın altındaysa aynen", () => {
    const list = [{ id: "a", updatedAt: 1 }];
    expect(trimSessions(list, 5)).toEqual(list);
  });
});
