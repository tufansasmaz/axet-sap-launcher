// @vitest-environment jsdom
//
// Sohbette gün ayırıcıları: konuşma birden çok güne yayılınca mesajların
// arasına "Bugün / Dün / tarih" satırı giriyor. Tek günlük (bugünkü) bir
// sohbette hiç satır yok — gürültü olurdu.
import { describe, expect, it } from "vitest";
import { dayLabel, daySeparatorBefore } from "../src/lib/chatDays";
import { translate } from "../src/i18n";

const t = ((key: string, params?: Record<string, string | number>) =>
  translate("tr", key as Parameters<typeof translate>[1], params)) as Parameters<typeof dayLabel>[2];

// Yerel saatle kuruluyor: ayırıcı kullanıcının gününe göre çiziliyor.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 10, 1, 9);

describe("dayLabel", () => {
  it("bugün, dün, bu yıl ve geçen yıl", () => {
    expect(dayLabel(at(2026, 10, 1, 0), NOW, t, "tr")).toBe("Bugün");
    expect(dayLabel(at(2026, 9, 30, 23), NOW, t, "tr")).toBe("Dün");
    expect(dayLabel(at(2026, 9, 28), NOW, t, "tr")).toBe("28 Eylül Pazartesi");
    expect(dayLabel(at(2025, 12, 31), NOW, t, "tr")).toBe("31 Aralık 2025 Çarşamba");
  });
});

describe("daySeparatorBefore", () => {
  it("ilk mesaj bugünse satır yok, değilse var", () => {
    expect(daySeparatorBefore(undefined, at(2026, 10, 1, 8), NOW)).toBe(false);
    expect(daySeparatorBefore(undefined, at(2026, 9, 30), NOW)).toBe(true);
  });

  it("aynı gün içinde yok, gün değişince var", () => {
    expect(daySeparatorBefore(at(2026, 9, 30, 8), at(2026, 9, 30, 22), NOW)).toBe(false);
    expect(daySeparatorBefore(at(2026, 9, 30, 23), at(2026, 10, 1, 0), NOW)).toBe(true);
  });

  it("zamanı bilinmeyen (eski kayıt) mesajda satır yok", () => {
    expect(daySeparatorBefore(undefined, 0, NOW)).toBe(false);
    expect(daySeparatorBefore(at(2026, 9, 30), 0, NOW)).toBe(false);
    expect(daySeparatorBefore(0, at(2026, 10, 1), NOW)).toBe(false);
  });
});
