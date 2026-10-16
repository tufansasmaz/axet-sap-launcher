// IPC hatası → kullanıcıya gösterilecek kısa metin: Electron öneki ve dosya
// yolları atılıyor (bildirimde kullanıcı adı taşıyan yol görünmesin).
import { describe, expect, it } from "vitest";
import { ipcErrorMessage } from "../src/lib/ipcErrorMessage";

describe("ipcErrorMessage", () => {
  it("Electron öneki ve tırnaklı Windows yolu atılıyor", () => {
    const err = new Error(
      "Error invoking remote method 'config:save': Error: EACCES: permission denied, open 'C:\\Users\\10134570\\AppData\\Roaming\\axet-sap-launcher\\config.json'"
    );
    expect(ipcErrorMessage(err)).toBe("EACCES: permission denied");
  });

  it("tırnaksız POSIX yolu da atılıyor", () => {
    expect(ipcErrorMessage(new Error("ENOSPC: no space left on device, write /home/u/.config/x/config.json"))).toBe(
      "ENOSPC: no space left on device"
    );
  });

  it("yol yoksa mesaj aynen; Error olmayan değer metne çevriliyor", () => {
    expect(ipcErrorMessage(new Error("disk dolu"))).toBe("disk dolu");
    expect(ipcErrorMessage("düz metin")).toBe("düz metin");
  });

  it("geriye bir şey kalmazsa boş dize", () => {
    expect(ipcErrorMessage(new Error("Error invoking remote method 'config:save': Error: 'C:\\x\\y.json'"))).toBe("");
  });
});
