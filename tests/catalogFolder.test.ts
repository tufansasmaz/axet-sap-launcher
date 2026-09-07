// Eşitlenmiş NTT katalog klasörünün işaret dosyası.
//
// Test edilen davranış "doğru JSON'u okuyabiliyor mu" değil — o zaten kolay.
// Asıl mesele bozuk/eski bir işaret dosyasında ÇÖKMEMEK: klasör bulundu ama
// içeriği okunamıyorsa doğru cevap "burada bir katalog var, okuyamadım",
// "hiçbir şey bulamadım" değil. İkincisi kullanıcıyı klasörü aramaya gönderir.

import { describe, expect, it } from "vitest";
import { parseCatalog } from "../app-electron/main/catalogFolder";

const FOLDER = "C:/OneDrive/Katalog";

describe("parseCatalog", () => {
  it("tam bir katalogu okur", () => {
    const info = parseCatalog(
      FOLDER,
      JSON.stringify({
        department: "SAP",
        catalog_version: "2.1.0",
        generated: "2026-09-01T10:00:00Z",
        skills: [{ name: "a" }, { name: "b" }]
      })
    );
    expect(info).toEqual({
      path: FOLDER,
      department: "SAP",
      version: "2.1.0",
      generated: "2026-09-01T10:00:00Z",
      skillCount: 2
    });
  });

  it("bozuk JSON'da yolu KORUR", () => {
    const info = parseCatalog(FOLDER, "{ yarim kalmis");
    expect(info.path).toBe(FOLDER);
    expect(info.department).toBeNull();
    expect(info.skillCount).toBeNull();
  });

  it("eski yayinda eksik alanlar null kalir", () => {
    const info = parseCatalog(FOLDER, JSON.stringify({ catalog_version: "1.0.0" }));
    expect(info.version).toBe("1.0.0");
    expect(info.department).toBeNull();
    expect(info.generated).toBeNull();
    expect(info.skillCount).toBeNull();
  });

  it("beklenmeyen tipleri yok sayar", () => {
    // `skills` bir nesne, `department` bir sayi: bunlari oldugu gibi
    // gecirseydik ekranda "[object Object]" yazardi.
    const info = parseCatalog(FOLDER, JSON.stringify({ department: 7, skills: { a: 1 } }));
    expect(info.department).toBeNull();
    expect(info.skillCount).toBeNull();
  });

  it("bos skill listesi 0'dir, null degil", () => {
    // Fark onemli: 0 "katalog bos", null "okuyamadim" demek.
    expect(parseCatalog(FOLDER, JSON.stringify({ skills: [] })).skillCount).toBe(0);
  });
});
