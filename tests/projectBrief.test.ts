// Reçete <-> sap-context.md birleştirmesi.
//
// Bu dosyanın test ettiği şey VERİ KAYBI sınıfında: `sap-context.md` her
// bağlanışta sıfırdan üretiliyor ve kullanıcının serbest notları yalnızca
// "notlar" işaretçisinden sonrası korunduğu için hayatta kalıyor. Blok yazma
// mantığı bozulursa notlar sessizce gider — hiçbir hata mesajı çıkmaz, dosya
// geçerli görünür, sadece içindeki bir şey eksilmiş olur.
//
// Bu yüzden testler gerçek dosya sistemine yazıyor (mock değil): korunması
// gereken şey birleştirme fonksiyonunun dönüş değeri değil, DİSKTEKİ dosyanın
// son hâli.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  emptyBrief,
  readProjectBrief,
  renderBriefMarkdown,
  syncBriefIntoContext,
  writeProjectBrief
} from "../app-electron/main/projectBrief";

const NOTES_MARKER = "<!-- axet-sap-launcher:notes -->";
const BLOCK_START = "<!-- axet-sap-launcher:brief -->";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "brief-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function contextFile(): string {
  return path.join(dir, "sap-context.md");
}

/** Launcher'ın ürettiğine benzeyen bir bağlam dosyası. */
function writeContext(notes = "Kullanicinin kendi notu."): void {
  writeFileSync(contextFile(), ["# SAP Baglami", "", "Sistem: IED", "", NOTES_MARKER, "", notes, ""].join("\n"), "utf-8");
}

describe("readProjectBrief", () => {
  it("dosya yoksa bos rece te dondurur", () => {
    expect(readProjectBrief(dir)).toEqual(emptyBrief());
  });

  it("bozuk JSON formu kilitlemez", () => {
    writeFileSync(path.join(dir, "project-brief.json"), "{ bu json degil", "utf-8");
    expect(readProjectBrief(dir)).toEqual(emptyBrief());
  });

  it("beklenmeyen tipteki alanlari yok sayar", () => {
    writeFileSync(
      path.join(dir, "project-brief.json"),
      JSON.stringify({ customer: "NTT", packageName: 42, savedAt: 7 }),
      "utf-8"
    );
    const brief = readProjectBrief(dir);
    expect(brief.customer).toBe("NTT");
    expect(brief.packageName).toBe("");
    expect(brief.savedAt).toBeNull();
  });
});

describe("renderBriefMarkdown", () => {
  it("bos alani dusurmez, [BILINMIYOR] yazar", () => {
    const md = renderBriefMarkdown(emptyBrief());
    // Sekiz alanin sekizi de gorunmeli: yazilmayan alan ajan icin yok
    // hukmunde, isaretlenen alan ise "burayi sor" talimati.
    expect(md.match(/\[BİLİNMİYOR\]/g)?.length).toBe(9); // 8 alan + kapanis kurali
  });

  it("dolu alani oldugu gibi yazar", () => {
    const md = renderBriefMarkdown({ ...emptyBrief(), packageName: "ZAI_MM" });
    expect(md).toContain("**Geliştirme paketi**: ZAI_MM");
  });
});

describe("syncBriefIntoContext", () => {
  it("blogu notlar isaretcisinin USTUNE koyar", () => {
    writeContext();
    syncBriefIntoContext(dir, { ...emptyBrief(), customer: "NTT" });
    const out = readFileSync(contextFile(), "utf-8");
    expect(out.indexOf(BLOCK_START)).toBeGreaterThan(-1);
    expect(out.indexOf(BLOCK_START)).toBeLessThan(out.indexOf(NOTES_MARKER));
  });

  it("kullanicinin notunu KORUR", () => {
    writeContext("Bu not kaybolmamali.");
    syncBriefIntoContext(dir, { ...emptyBrief(), customer: "NTT" });
    expect(readFileSync(contextFile(), "utf-8")).toContain("Bu not kaybolmamali.");
  });

  it("iki kez cagrilinca blogu COGALTMAZ", () => {
    // Asil senaryo bu: sap-context.md her baglanista yeniden uretiliyor ve
    // launcher blogu her seferinde geri basiyor. Cogaltsaydi dosya her
    // baglantida bir recete daha uzardi.
    writeContext();
    syncBriefIntoContext(dir, { ...emptyBrief(), customer: "A" });
    syncBriefIntoContext(dir, { ...emptyBrief(), customer: "B" });
    const out = readFileSync(contextFile(), "utf-8");
    expect(out.match(new RegExp(BLOCK_START, "g"))?.length).toBe(1);
    expect(out).toContain("**Müşteri / proje**: B");
    expect(out).not.toContain("**Müşteri / proje**: A");
  });

  it("notlar isaretcisi yoksa sonuna ekler", () => {
    writeFileSync(contextFile(), "# SAP Baglami\n\nSistem: IED\n", "utf-8");
    syncBriefIntoContext(dir, emptyBrief());
    expect(readFileSync(contextFile(), "utf-8")).toContain(BLOCK_START);
  });

  it("baglam dosyasi yoksa dosya URETMEZ", () => {
    // sap-context.md'nin sahibi launcher; burasi yalnizca yansitiyor. Kendi
    // basina uretseydi, hic baglanilmamis bir projede yarim bir baglam
    // dosyasi olusur ve ajan onu tam sanirdi.
    syncBriefIntoContext(dir, emptyBrief());
    expect(() => readFileSync(contextFile(), "utf-8")).toThrow();
  });
});

describe("writeProjectBrief", () => {
  it("diske yazar ve ayni cagrida baglami tazeler", () => {
    writeContext();
    const saved = writeProjectBrief(dir, { ...emptyBrief(), transport: "IEDK900123" });
    expect(saved.savedAt).not.toBeNull();
    expect(readProjectBrief(dir).transport).toBe("IEDK900123");
    expect(readFileSync(contextFile(), "utf-8")).toContain("IEDK900123");
  });
});
