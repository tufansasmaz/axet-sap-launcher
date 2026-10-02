// Sohbet turunun aşama süreleri DİSKTEKİ günlüğe de düşmeli.
//
// 2026-10-02 şikâyeti: "sohbet değiştirip dönünce / ekran görüntüsü ekleyince
// cevap geç başlıyor". axet-code'un veritabanı mesaj ONA ULAŞTIKTAN sonrasını
// gösteriyor (orada ilk düşünce ≤13 sn ölçüldü). Öncesi — oturum kurulumu,
// eski oturuma bağlanma, geçmişin yeniden yüklenmesi — yalnızca
// `console.log`'daydı ve kurulu uygulamada hiçbir yere yazılmıyordu.
//
// axetChatTui.ts elektron + pty olmadan çalışmıyor; bu yüzden kaynak metni
// okunuyor. İçerik kuralı da burada: süre satırlarına metin, klasör ya da
// veritabanı yolu girmiyor.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("app-electron/main/axetChatTui.ts", "utf8");

function appLogCall(tag: string): string {
  const start = src.indexOf(`appLog("${tag}"`);
  expect(start, `appLog("${tag}") yok`).toBeGreaterThan(-1);
  const end = src.indexOf("});", start);
  return src.slice(start, end);
}

describe("sohbet turu süre günlüğü", () => {
  it.each(["tui.hazirlik", "tui.baglanma", "tui.yazildi", "tui.tur", "tui.sessiz"])("%s günlüğe yazılıyor", (tag) => {
    appLogCall(tag);
  });

  it("hazırlık satırı sıcak/soğuk ve süreyi taşıyor", () => {
    const call = appLogCall("tui.hazirlik");
    expect(call).toMatch(/sicak:/);
    expect(call).toMatch(/saniye:/);
  });

  it("tur satırı aşamaları taşıyor: istemin inişi, ilk belirti, ilk harf, toplam", () => {
    const call = appLogCall("tui.tur");
    for (const field of ["saniye:", "istemIndi:", "ilkBelirti:", "ilkHarf:", "arac:"]) expect(call).toContain(field);
  });

  it("yazma satırı geçmişin yeniden yüklenip yüklenmediğini söylüyor", () => {
    const call = appLogCall("tui.yazildi");
    for (const field of ["karakter:", "tohumlanmis:", "bagli:"]) expect(call).toContain(field);
  });

  it("süre satırlarında içerik, klasör ya da veritabanı yolu yok", () => {
    for (const tag of ["tui.hazirlik", "tui.baglanma", "tui.yazildi", "tui.tur", "tui.sessiz"]) {
      const call = appLogCall(tag);
      expect(call).not.toMatch(/dbPath|veritabani|cwd|klasor|wire[^.]|text[,\s}]|answer[,\s}]|message/);
    }
  });
});
