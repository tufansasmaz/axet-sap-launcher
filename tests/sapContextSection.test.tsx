// @vitest-environment jsdom
//
// "Ajan ne görüyor" kartı — ARAYÜZ tarafı.
//
// Dosyanın üretimini `sapContextFile.test.ts` doğruluyor. Burada doğrulanan
// şey kartın o dosya hakkında SÖYLEDİKLERİ, ve bu kartın tek işi zaten
// söylemek.
//
// Ağırlık iki ayrımda:
//
//   - "dosya yok" bir ARIZA DEĞİL, henüz hiçbir sisteme bağlanılmamış demek.
//     Kırmızıya boyanırsa kullanıcı olmayan bir sorunu aramaya başlar.
//   - Kart DÜZENLENEBİLİR OLMAMALI. `sap-context.md`'nin sahibi launcher ve
//     her bağlanışta dosyayı sıfırdan üretiyor; buraya bir metin kutusu
//     koymak, bir sonraki bağlantıda sessizce silinen bir kutu koymak olurdu.
//     Sessizce eklenmiş bir `textarea` veri kaybı demek, o yüzden test ediyor.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SapContextPreview } from "../app-electron/shared/types";
import SapContextSection from "../src/components/SapContextSection";
import { LanguageProvider } from "../src/i18n";

const PROJECT = "C:\\proje";

function preview(overrides: Partial<SapContextPreview> = {}): SapContextPreview {
  return {
    path: "C:\\proje\\.axet-code\\sap-context.md",
    exists: true,
    content: "# SAP baglami\n\nSistem: IED\n",
    lineCount: 3,
    modifiedAt: "2026-09-07T21:00:00.000Z",
    hasUserNotes: false,
    truncated: false,
    ...overrides
  };
}

function mountWith(value: SapContextPreview | null, projectDir: string | null = PROJECT) {
  const api = {
    getSapContext: vi.fn().mockResolvedValue(value),
    openInExplorer: vi.fn()
  };
  (window as unknown as { api: unknown }).api = api;
  render(
    <LanguageProvider language="tr">
      <SapContextSection projectDir={projectDir} />
    </LanguageProvider>
  );
  return api;
}

afterEach(cleanup);

describe("SapContextSection", () => {
  it("dosyanin icerigini oldugu gibi gosterir", async () => {
    mountWith(preview());
    expect(await screen.findByText(/Sistem: IED/)).toBeTruthy();
  });

  it("DUZENLENEBILIR alan YOK", async () => {
    // Dosyanin sahibi launcher; her baglanista sifirdan uretiyor. Buraya
    // eklenmis bir metin kutusu, bir sonraki baglantida sessizce silinirdi.
    const { container } = { container: document.body };
    mountWith(preview());
    await screen.findByText(/Sistem: IED/);
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });

  it("dosya yoksa ARIZA gibi degil, yapilacak is gibi yazar", async () => {
    // Henuz hicbir sisteme baglanilmamis demek. Kirmiziya boyanirsa
    // kullanici olmayan bir sorunu aramaya baslar.
    mountWith(preview({ exists: false, content: "", lineCount: 0, modifiedAt: null }));
    const line = await screen.findByText(/Hen[uü]z/);
    expect(line.className).not.toMatch(/danger|error/);
  });

  it("dosya yoksa 'Klasorde goster' dugmesi cikmaz", async () => {
    mountWith(preview({ exists: false, content: "", lineCount: 0, modifiedAt: null }));
    await screen.findByText(/Hen[uü]z/);
    expect(screen.queryByRole("button", { name: /Klas[oö]rde/ })).toBeNull();
  });

  it("notlar korunuyorsa rozeti cizer", async () => {
    mountWith(preview({ hasUserNotes: true }));
    expect(await screen.findByText(/[Nn]otlar/)).toBeTruthy();
  });

  it("notlar yoksa rozet YOK", async () => {
    mountWith(preview({ hasUserNotes: false }));
    await screen.findByText(/Sistem: IED/);
    expect(screen.queryByText(/[Nn]otlar/)).toBeNull();
  });

  it("kirpildiysa bunu SOYLER", async () => {
    // Kirpilmis bir onizlemeyi tam sanmak, ajanin gordugunun tamamini
    // gordugunu sanmakti.
    mountWith(preview({ truncated: true }));
    expect(await screen.findByText(/yaln[ıi]zca ba[şs][ıi]/i)).toBeTruthy();
  });

  it("proje yoksa okuma bile denenmez", () => {
    const api = mountWith(preview(), null);
    expect(api.getSapContext).not.toHaveBeenCalled();
  });
});
