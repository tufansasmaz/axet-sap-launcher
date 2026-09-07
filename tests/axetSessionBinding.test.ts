// Sohbet -> axet-code oturumu BAGI.
//
// Bu kaydin tek isi, bir sohbetin gecmisinin hangi axet-code oturumunda
// durdugunu hatirlamak. Degeri de riski de ayni yerde: yanlis bir bag,
// sohbeti BASKA BIRININ oturumuna baglar ve o oturumun mesajlari bu
// sohbetin cevabi gibi gorunur. axetChatTui.ts'te bunun iki ayri bicimi
// olculu olarak yaziyor (`spawnedAt` ve `preexisting` notlari).
//
// O yuzden buradaki testlerin agirligi "yaziyor mu okuyor mu" degil,
// EKSIK BIR KAYDIN KABUL EDILMEMESI: dordu de (chatId, sessionId, title,
// cwd) olmadan bir bag, "baglan" deyip nereye baglanacagini soylemeyen bir
// kayittir.

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Depo `app.getPath("userData")` altinda yasiyor; testte o klasor gecici.
let userData = "";
vi.mock("electron", () => ({
  app: { getPath: () => userData }
}));

const { bindingTag, clearBinding, readBinding, writeBinding } = await import(
  "../app-electron/main/axetSessionBinding"
);

const FILE = () => path.join(userData, "axet-session-bindings.json");

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "axbind-"));
  vi.resetModules();
});

afterEach(() => {
  // Modul kendi onbellegini tutuyor; her test kendi dosyasindan okusun diye
  // kayitlar acikca temizleniyor.
  for (const id of ["a", "b", "c", "chat-1", "chat-2"]) clearBinding(id);
  rmSync(userData, { recursive: true, force: true });
});

function binding(over: Partial<{ sessionId: string; title: string; cwd: string }> = {}) {
  return { sessionId: "6de4fd48-7ac4-40eb", title: "Bir Sohbet · axchat1", cwd: "C:\\proje", ...over };
}

describe("bindingTag", () => {
  it("harf onekiyle basliyor", () => {
    // Yalniz rakamla baslayan bir ek, bulanik aramada baska basliklarin
    // icindeki rakamlara da denk gelirdi.
    expect(bindingTag("12345678-abcd")).toMatch(/^ax/);
  });

  it("menu acan karakterleri ATIYOR", () => {
    // Bu metin TUI'nin arama kutusuna yaziliyor; '/' ve '@' orada menu aciyor.
    expect(bindingTag("a/b@c%d")).toMatch(/^ax[a-z0-9]*$/);
  });

  it("ayni sohbet icin ayni, farkli sohbet icin farkli", () => {
    expect(bindingTag("chat-1")).toBe(bindingTag("chat-1"));
    expect(bindingTag("chat-1")).not.toBe(bindingTag("chat-2"));
  });
});

describe("bag deposu", () => {
  it("yazilan bag geri okunuyor", () => {
    writeBinding("chat-1", binding());
    expect(readBinding("chat-1")?.sessionId).toBe("6de4fd48-7ac4-40eb");
  });

  it("bilinmeyen sohbet icin null", () => {
    expect(readBinding("chat-2")).toBeNull();
  });

  it("silinen bag geri gelmiyor", () => {
    writeBinding("chat-1", binding());
    clearBinding("chat-1");
    expect(readBinding("chat-1")).toBeNull();
  });

  it("EKSIK alanli bag hic yazilmiyor", () => {
    // "Baglan" deyip nereye baglanacagini soylemeyen bir kayit.
    writeBinding("chat-1", binding({ sessionId: "" }));
    writeBinding("chat-1", binding({ title: "" }));
    writeBinding("chat-1", binding({ cwd: "" }));
    expect(readBinding("chat-1")).toBeNull();
  });

  it("cwd de saklaniyor", () => {
    // Sohbet baska bir klasore tasinirsa oradaki veritabaninda bu kimlik YOK;
    // bag sessizce yanlis bir oturuma denk gelmektense dusmeli.
    writeBinding("chat-1", binding({ cwd: "D:\\baska" }));
    expect(readBinding("chat-1")?.cwd).toBe("D:\\baska");
  });

  it("dosya diske yaziliyor", () => {
    writeBinding("chat-1", binding());
    expect(existsSync(FILE())).toBe(true);
    expect(readFileSync(FILE(), "utf8")).toContain("6de4fd48");
  });

  it("BOZUK dosya ariza degil, bos depo", async () => {
    // En kotu ihtimalle baglar kaybolur ve sohbetler tohumlama davranisina
    // doner. Acilista patlamak bunun yaninda cok daha pahali.
    writeFileSync(FILE(), "{ bu json degil", "utf8");
    vi.resetModules();
    const fresh = await import("../app-electron/main/axetSessionBinding");
    expect(fresh.readBinding("chat-1")).toBeNull();
  });

  it("EKSIK alanli satir dosyadan okunurken de eleniyor", async () => {
    // Dosya elle de duzenlenebiliyor.
    writeFileSync(
      FILE(),
      JSON.stringify({ bindings: [{ chatId: "chat-1", sessionId: "x", cwd: "C:\\p" }] }),
      "utf8"
    );
    vi.resetModules();
    const fresh = await import("../app-electron/main/axetSessionBinding");
    expect(fresh.readBinding("chat-1")).toBeNull();
  });
});
