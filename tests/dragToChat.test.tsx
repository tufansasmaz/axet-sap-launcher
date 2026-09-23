import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AXET_PATH_MIME, readDraggedPaths } from "../src/lib/attachments";

/**
 * Soldaki dosya listesinden sohbete sürükle-bırak.
 *
 * Kırılma böyle oluyordu: satırlar düz `<button>` olduğu için sürükleme hiç
 * BAŞLAMIYOR, sohbetin `onDrop`u hiç çalışmıyordu. Windows Explorer'dan
 * sürüklemek çalıştığı için de hata "bazen çalışmıyor" gibi görünüyordu.
 *
 * Sözleşmenin üç parçası var ve üçü de ayrı dosyada: üreten (FileExplorer),
 * taşıyan (AXET_PATH_MIME) ve tüketen (ChatSessionPane). Biri sessizce
 * düşerse sürükleme yine hiç başlamaz ya da yol EK yerine YAZI olur — ikisi
 * de ekranda hata vermeden yanlış davranır. O yüzden üçü birden bekçiye
 * bağlanıyor.
 *
 * JSX yok ama uzantı `.tsx`: `DataTransfer` gibi DOM tipleri yalnız
 * `tsconfig.web.json`da var ve oraya `tests/**\/*.tsx` giriyor. `.ts` olsaydı
 * node projesine düşer, tarayıcı tiplerini bulamazdı.
 */
function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("kendi dosya listemizden sohbete surukleme", () => {
  it("bos dataTransfer bos dizi verir", () => {
    const dt = { getData: () => "" } as unknown as DataTransfer;
    expect(readDraggedPaths(dt)).toEqual([]);
  });

  it("kendi tipimizden satir satir yol okur", () => {
    const dt = {
      getData: (type: string) =>
        type === AXET_PATH_MIME ? "C:\\a\\bir.txt\nC:\\a\\iki.txt\n" : ""
    } as unknown as DataTransfer;
    expect(readDraggedPaths(dt)).toEqual(["C:\\a\\bir.txt", "C:\\a\\iki.txt"]);
  });

  it("duz metni EK saymaz", () => {
    // Sohbet `text/plain`i taslağa yazı olarak ekliyor. Yalnız düz metin
    // taşıyan bir bırakma burada yol ÜRETMEMELİ.
    const dt = {
      getData: (type: string) => (type === "text/plain" ? "C:\\a\\bir.txt" : "")
    } as unknown as DataTransfer;
    expect(readDraggedPaths(dt)).toEqual([]);
  });

  it("dosya satiri `draggable` ve kendi tipimizi yaziyor", () => {
    const explorer = source("src/components/FileExplorer.tsx");
    // Satır sonu CRLF olabilir (`core.autocrlf = true`) — ikisini de kabul et.
    expect(explorer).toMatch(/[\r\n][ \t]*draggable[ \t]*[\r\n]/);
    expect(explorer).toContain("setData(AXET_PATH_MIME, entry.path)");
  });

  it("sohbet kendi yollarimizi `files` dalindan ONCE okuyor", () => {
    // Sıra önemli: kendi sürüklememizde `dataTransfer.files` BOŞ olduğu için
    // dosya dalı eşleşmez ve akış düz metin dalına düşer — yol taslağa YAZI
    // olarak girerdi.
    const chat = source("src/components/ChatSessionPane.tsx");
    const own = chat.indexOf("readDraggedPaths(dt)");
    const files = chat.indexOf("dt.files && dt.files.length > 0");
    const text = chat.indexOf('dt.getData("text/plain")');
    expect(own).toBeGreaterThan(-1);
    expect(files).toBeGreaterThan(own);
    expect(text).toBeGreaterThan(files);
  });
});
