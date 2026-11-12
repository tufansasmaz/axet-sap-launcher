// Sistem notunda sifreye benzeyen icerik maskelenir (kararlilik-2).
// Ornek degerler uydurmadir.

import { describe, expect, it } from "vitest";
import { SECRET_MASK, maskNoteSecrets, noteHasSecrets } from "../src/lib/noteSecrets";

describe("maskNoteSecrets", () => {
  it("anahtar sozcuklu satirin degerini maskeler, sozcugu birakir", () => {
    const r = maskNoteSecrets("Şifre: Gizli.123\nnot: canli sistem");
    expect(r.count).toBe(1);
    expect(r.text).toBe(`Şifre: ${SECRET_MASK}\nnot: canli sistem`);
  });

  it("password=, pwd ve parola bicimleri", () => {
    expect(maskNoteSecrets("password=abc123").text).toBe(`password=${SECRET_MASK}`);
    expect(maskNoteSecrets("pwd Abc!9xyz").text).toBe(`pwd ${SECRET_MASK}`);
    expect(maskNoteSecrets("Parola - deneme42").text).toBe(`Parola - ${SECRET_MASK}`);
  });

  it("yalniz anahtar sozcuk varsa alt satiri maskeler", () => {
    const r = maskNoteSecrets("Sifre:\nQwe#2026");
    expect(r.text).toBe(`Sifre:\n${SECRET_MASK}`);
  });

  it("kullanici satirinin hemen altindaki tek kelimelik satiri maskeler", () => {
    const r = maskNoteSecrets("Kullanıcı: DEVUSER01\nXy7!kLm2\nClient 100");
    expect(r.count).toBe(1);
    expect(r.text).toBe(`Kullanıcı: DEVUSER01\n${SECRET_MASK}\nClient 100`);
  });

  it("bilinen kullanici adi tek basina yazildiysa altindaki satir", () => {
    const r = maskNoteSecrets("TESTUSR\nAbc12345", "testusr");
    expect(r.text).toBe(`TESTUSR\n${SECRET_MASK}`);
  });

  it("siradan notlara dokunmaz", () => {
    const text = "Canli sistem, dikkat.\nTransport yolu: DEV > QA > PRD\nKullanici talepleri ITSM uzerinden.";
    expect(maskNoteSecrets(text)).toEqual({ text, count: 0 });
    expect(noteHasSecrets(text)).toBe(false);
  });

  it("kullanici satirindan sonra cumle geliyorsa maskelemez", () => {
    const text = "Kullanıcı: DEVUSER01\nyetkiler SU01'den istenecek";
    expect(maskNoteSecrets(text).count).toBe(0);
  });

  it("'passport' gibi kelimeleri sifre sanmaz", () => {
    expect(maskNoteSecrets("passport kontrolu yapildi").count).toBe(0);
  });
});
