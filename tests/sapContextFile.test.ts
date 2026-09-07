// `sap-context.md` önizlemesi.
//
// Testin ağırlığı `splitContext`'te ve sebebi veri kaybı: dosya HER bağlanışta
// sıfırdan üretiliyor, kullanıcının kendi yazdıkları yalnızca notlar
// işaretçisinin ARDINDA durdukları için hayatta kalıyor. Arayüzdeki "kendi
// notların korunuyor" rozeti bu ayrıma dayanıyor — ayrım yanlışsa rozet
// kullanıcıya yalan söyler ve yalan tam olarak "notların güvende" yönünde
// olur.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyPreview, readSapContext, splitContext } from "../app-electron/main/sapContextFile";

const NOTES_MARKER = "<!-- axet-sap-launcher:notes -->";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "context-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeContext(body: string): void {
  writeFileSync(path.join(dir, "sap-context.md"), body, "utf-8");
}

describe("splitContext", () => {
  it("isaretci yoksa her sey uretilmis kisimdir", () => {
    const split = splitContext("# SAP Baglami\nSistem: IED\n");
    expect(split.notes).toBe("");
    expect(split.generated).toContain("Sistem: IED");
  });

  it("isaretciden sonrasi notlardir", () => {
    const split = splitContext(`# Baglam\n\n${NOTES_MARKER}\n\nBu benim notum.\n`);
    expect(split.notes).toBe("Bu benim notum.");
    expect(split.generated).not.toContain("Bu benim notum.");
  });

  it("isaretci var ama arkasi bossa not YOK sayilir", () => {
    // Rozetin kritik hali: launcher isaretciyi her uretimde basiyor, yani
    // isaretcinin VARLIGI not oldugu anlamina gelmiyor. Bosluk/yeni satiri
    // not sayan bir ayrim, hic not yazmamis kullaniciya "notlarin korunuyor"
    // derdi.
    expect(splitContext(`# Baglam\n\n${NOTES_MARKER}\n\n   \n`).notes).toBe("");
  });

  it("isaretcinin kendisi notlarin icinde kalmaz", () => {
    expect(splitContext(`x\n${NOTES_MARKER}\nnot`).notes).not.toContain(NOTES_MARKER);
  });
});

describe("readSapContext", () => {
  it("dosya yoksa exists=false, ama YOL yine de dolu", () => {
    // Yol bos donseydi arayuz "klasorde goster" diyemez, kullanici dosyanin
    // nereye uretilecegini de ogrenemezdi.
    const preview = readSapContext(dir);
    expect(preview.exists).toBe(false);
    expect(preview.path).toBe(path.join(dir, "sap-context.md"));
    expect(preview.content).toBe("");
  });

  it("dosyayi oldugu gibi okur ve satir sayar", () => {
    writeContext("bir\niki\nuc");
    const preview = readSapContext(dir);
    expect(preview.exists).toBe(true);
    expect(preview.content).toBe("bir\niki\nuc");
    expect(preview.lineCount).toBe(3);
    expect(preview.modifiedAt).not.toBeNull();
  });

  it("kullanici notu varsa isaretlenir", () => {
    writeContext(`# Baglam\n${NOTES_MARKER}\nElle yazdigim not.`);
    expect(readSapContext(dir).hasUserNotes).toBe(true);
  });

  it("bos notlar bolumu isaretlenmez", () => {
    writeContext(`# Baglam\n${NOTES_MARKER}\n`);
    expect(readSapContext(dir).hasUserNotes).toBe(false);
  });

  it("emptyPreview hicbir seyin var oldugunu iddia etmez", () => {
    expect(emptyPreview("C:/x/sap-context.md")).toEqual({
      exists: false,
      path: "C:/x/sap-context.md",
      content: "",
      truncated: false,
      modifiedAt: null,
      lineCount: 0,
      hasUserNotes: false
    });
  });
});
