// Günlük dosyası İÇERİK TAŞIMAZ.
//
// Bu dosyayı kullanıcı destek için bize gönderecek; gönderdiği şeyin ne
// olduğunu okumadan bilebilmeli (karar: kullanıcı, 2026-09-08). Aşağıdaki
// blok, biçimlendiricinin bu sözü tutan kısmını kilitliyor: uzun bir alan
// kırpılıyor ve satır sonu bir kaydı ikiye bölmüyor.

import { describe, expect, it } from "vitest";
import { formatLogLine } from "../app-electron/main/appLog";

const AN = new Date("2026-09-08T09:15:00.000Z");

describe("formatLogLine", () => {
  it("zaman + etiket + alanlar, tek satir", () => {
    const line = formatLogLine("sohbet.bos-cevap", { kip: "run", arac: 0 }, AN);
    expect(line).toBe("2026-09-08T09:15:00.000Z sohbet.bos-cevap kip=run arac=0\n");
  });

  it("alansiz etiket de yazilabilir", () => {
    expect(formatLogLine("acilis", {}, AN)).toBe("2026-09-08T09:15:00.000Z acilis\n");
  });

  it("bos deger ATLANIR, false ATLANMAZ", () => {
    // `false` gercek bir cevap: "klasor secili degil" tam da ogrenmek
    // istedigimiz sey. `undefined` ise bilgi yoklugu.
    const line = formatLogLine("t", { a: undefined, b: null, c: false }, AN);
    expect(line).toBe("2026-09-08T09:15:00.000Z t c=false\n");
  });

  it("UZUN alan kirpilir", () => {
    const line = formatLogLine("t", { x: "a".repeat(500) }, AN);
    expect(line).toContain("…(kirpildi)");
    expect(line.length).toBeLessThan(200);
  });

  it("satir sonu bir kaydi IKIYE BOLMEZ", () => {
    const line = formatLogLine("t", { x: "bir\niki" }, AN);
    expect(line.split("\n")).toHaveLength(2); // yalnizca kapanis satir sonu
    expect(line).toContain("x=bir\tiki");
  });
});
