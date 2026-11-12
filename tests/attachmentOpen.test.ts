// Sohbet eki "disarida ac" (kararlilik-2 R8e): Indirilenler'den eklenen dosyaya
// tiklamak sessizce hicbir sey yapmiyordu.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { attachmentOpenAction } from "../app-electron/main/attachmentOpen";

const DL = "C:\\Users\\kisi\\Downloads";

describe("attachmentOpenAction", () => {
  it("izinli kokte her zaman acilir", () => {
    expect(attachmentOpenAction("C:\\proje\\x.abc", true, true)).toBe("open");
  });

  it("kok disinda belge ve gorsel varsayilan uygulamayla acilir", () => {
    for (const name of ["ekran.png", "Spek_v1.0.docx", "INDEX.md", "rapor.PDF", "liste.xlsx"]) {
      expect(attachmentOpenAction(`${DL}\\${name}`, false, true), name).toBe("open");
    }
  });

  it("kok disinda calistirilabilir dosya ACILMAZ, yalniz klasorde gosterilir", () => {
    for (const name of ["kur.exe", "a.bat", "b.cmd", "c.ps1", "d.lnk", "e.vbs", "f.js", "uzantisiz"]) {
      expect(attachmentOpenAction(`${DL}\\${name}`, false, true), name).toBe("reveal");
    }
  });

  it("gecersiz ya da olmayan yol: hicbir sey", () => {
    expect(attachmentOpenAction("", false, true)).toBe("none");
    expect(attachmentOpenAction("goreli\\x.png", false, true)).toBe("none");
    expect(attachmentOpenAction(42, false, true)).toBe("none");
    expect(attachmentOpenAction(`${DL}\\yok.png`, false, false)).toBe("none");
  });

  it("ek cipi bu kanali kullaniyor", () => {
    const chip = readFileSync(path.join(__dirname, "..", "src", "components", "AttachmentChip.tsx"), "utf8");
    expect(chip).toContain("window.api.openAttachment(");
    const index = readFileSync(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8");
    expect(index).toContain('ipcMain.handle("chatAttachments:open"');
  });
});
