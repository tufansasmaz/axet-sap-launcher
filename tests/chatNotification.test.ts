// Tests for the pure notificationFor() decision function (İş B — Bildirim).
// No Electron, no IPC: saf fonksiyon, tamamen bağımsız.

import { describe, expect, it } from "vitest";
import { notificationFor } from "../app-electron/main/chatNotification";

describe("notificationFor", () => {
  it("pencere odaktaysa null döner", () => {
    expect(notificationFor("answer", true, true, "Proje")).toBeNull();
  });

  it("ayar kapalıysa null döner", () => {
    expect(notificationFor("answer", false, false, "Proje")).toBeNull();
  });

  it("iptal edildiyse null döner", () => {
    expect(notificationFor("cancelled", false, true, "Proje")).toBeNull();
  });

  it("cevap hazır bildirimi: başlık sohbet adı, gövde sabit metin", () => {
    const n = notificationFor("answer", false, true, "ABAP incelemesi");
    expect(n).not.toBeNull();
    expect(n!.title).toBe("ABAP incelemesi");
    expect(typeof n!.body).toBe("string");
    expect(n!.body.length).toBeGreaterThan(0);
  });

  it("cevap gövdesi içerik taşımıyor (gizlilik)", () => {
    const n = notificationFor("answer", false, true, "Gizli proje");
    // Gövde sohbet içeriği içermemeli; sabit bir metin olmalı
    expect(n!.body).not.toContain("Gizli proje");
  });

  it("askUser bildirimi: ayrı gövde metni var", () => {
    const n = notificationFor("askUser", false, true, "Test");
    expect(n).not.toBeNull();
    expect(n!.body).toBeTruthy();
    // Cevap metniyle FARKLI olmalı
    const answer = notificationFor("answer", false, true, "Test");
    expect(n!.body).not.toBe(answer!.body);
  });

  it("hata bildirimi: ayrı gövde metni var", () => {
    const n = notificationFor("error", false, true, "Test");
    expect(n).not.toBeNull();
    expect(n!.body).toBeTruthy();
    const answer = notificationFor("answer", false, true, "Test");
    expect(n!.body).not.toBe(answer!.body);
  });

  it("başlık yoksa 'NTT Studio' kullanılır", () => {
    const n = notificationFor("answer", false, true, "");
    expect(n!.title).toBe("NTT Studio");
  });

  it("lang='en' ise İngilizce metin döner", () => {
    const n = notificationFor("answer", false, true, "Project", "en");
    expect(n).not.toBeNull();
    expect(n!.body).toBe("Answer ready");
  });

  it("lang='tr' ise Türkçe metin döner", () => {
    const n = notificationFor("answer", false, true, "Proje", "tr");
    expect(n!.body).toBe("Cevap hazır");
  });
});
