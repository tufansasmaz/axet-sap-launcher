// @vitest-environment jsdom
//
// "Tur başına bedel" kutusu — ARAYÜZ tarafı.
//
// Sayının nasıl hesaplandığını `connectorInventory.test.ts` doğruluyor.
// Burada doğrulanan şey o sayının EKRANDA nasıl sunulduğu, ve bu kutunun
// bütün değeri sunumunda:
//
//   - Sayının DAYANAĞI ("araç sayıları 2026-09-08'de okundu") her zaman
//     görünür olmak zorunda — gizlenmiş bir dayanak, bu sayının kullanıcının
//     kendi ölçümü sanılması demek, yani yanlış bilgi.
//   - BİLİNMİYOR ile SIFIR ayrı şeyler. Günlükten tam bir blok
//     okunamadığında "0 kayıt" yazmak, dört bağlayıcısı açık olan
//     kullanıcıya bedeli olmadığını söylemekti.
//   - Kapalı bir kayıt bedeli ÜRETMİYOR; listede görünüyor ama sayıya
//     girmiyor, ve hangisinin kapalı olduğu ekranda yazıyor.

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConnectorInventory, ConnectorRecord } from "../app-electron/shared/types";
import AppConnectionsSection from "../src/components/AppConnectionsSection";
import { LanguageProvider } from "../src/i18n";

const PROJECT = "C:\\proje";

function record(overrides: Partial<ConnectorRecord> = {}): ConnectorRecord {
  return {
    uuid: "1a2b3c4d-5566-7788-99aa-bbccddeeff00",
    displayName: "Outlook",
    type: "outlook",
    url: "https://example.invalid/mcp",
    disabledInLog: false,
    ...overrides
  };
}

function inventory(overrides: Partial<ConnectorInventory> = {}): ConnectorInventory {
  return {
    known: true,
    records: [record()],
    activeCount: 1,
    estimatedTools: 25,
    estimatedTokens: 41575,
    unmeasuredCount: 0,
    anchor: {
      measuredAt: "2026-09-08",
      toolsByType: { outlook: 25, sharepoint: 17 },
      fallbackTools: 21,
      tokensMeasuredAt: "2026-09-05",
      tokensPerTool: 1663
    },
    ...overrides
  };
}

function mountWith(value: ConnectorInventory | null, projectDir: string | null = PROJECT) {
  const api = {
    getConnectorInventory: vi.fn().mockResolvedValue(value),
    getConnectorMcpUrl: vi.fn().mockResolvedValue(""),
    getConfig: vi.fn().mockResolvedValue({ connectorLastResults: {}, connectorEnabled: {}, connectorMode: "auto" }),
    openExternalUrl: vi.fn(),
    testConnector: vi.fn(),
    setConnectorEnabled: vi.fn(),
    cancelConnectorTest: vi.fn(),
    saveConfig: vi.fn()
  };
  (window as unknown as { api: unknown }).api = api;
  render(
    <LanguageProvider language="tr">
      <AppConnectionsSection onOpenProjectTerminal={() => {}} projectDir={projectDir} />
    </LanguageProvider>
  );
  return api;
}

afterEach(cleanup);

describe("Bagla yici maliyeti kutusu", () => {
  it("acik kayit sayisini ve tahmini bedeli yazar", async () => {
    mountWith(inventory());
    expect(await screen.findByText(/1 a[çc][ıi]k kay[ıi]t/)).toBeTruthy();
    expect(screen.getByText(/25 ara[çc]/)).toBeTruthy();
  });

  it("DAYANAK her zaman ekranda ve olculen tur sayilarini yazar", async () => {
    // Gizlenmis bir dayanak, bu sayinin kullanicinin kendi olcumu sanilmasi
    // demekti; turler de esit degil (outlook 25, sharepoint 17).
    mountWith(inventory());
    expect(await screen.findByText(/2026-09-08/)).toBeTruthy();
    expect(screen.getByText(/outlook 25, sharepoint 17/)).toBeTruthy();
  });

  it("olculmemis tur varsa BUNU SOYLER", async () => {
    // Ortalamaya dusulen bir kaydi olculmus gibi gostermek, eski hatanin
    // (kayit basina sabit 23 arac) kucuk bir kopyasi olurdu.
    mountWith(
      inventory({
        records: [record({ type: "jira", measured: false, tools: 21 })],
        estimatedTools: 21,
        unmeasuredCount: 1
      })
    );
    expect(await screen.findByText(/hi[çc] [öo]l[çc][üu]lmedi/)).toBeTruthy();
  });

  it("olculmus turde uyari YOK", async () => {
    mountWith(inventory());
    await screen.findByText("Outlook");
    expect(screen.queryByText(/hi[çc] [öo]l[çc][üu]lmedi/)).toBeNull();
  });

  it("kayit satirinda o kaydin arac sayisi yazar", async () => {
    // Toplamin nereden geldigi ancak burada gorunuyor.
    mountWith(inventory({ records: [record({ tools: 25, measured: true })] }));
    expect(await screen.findByText("25 araç")).toBeTruthy();
  });

  it("BILINMIYOR durumunda sayi degil SEBEP yazar", async () => {
    // "0 kayit" demek, dort baglayicisi acik olan kullaniciya bedeli
    // olmadigini soylemekti.
    mountWith(inventory({ known: false, records: [], activeCount: 0, estimatedTools: 0, estimatedTokens: 0 }));
    expect(await screen.findByText(/okunamad[ıi]/)).toBeTruthy();
    expect(screen.queryByText(/a[çc][ıi]k kay[ıi]t/)).toBeNull();
  });

  it("kapali kayit listede gorunur ve isaretlenir", async () => {
    mountWith(
      inventory({
        records: [record(), record({ uuid: "99887766-0000-1111-2222-333344445555", displayName: "SharePoint", disabledInLog: true })],
        activeCount: 1
      })
    );
    expect(await screen.findByText("SharePoint")).toBeTruthy();
    expect(screen.getByText("kapalı")).toBeTruthy();
  });

  it("kapali kayit acik sayisina GIRMEZ", async () => {
    mountWith(
      inventory({
        records: [record({ disabledInLog: true })],
        activeCount: 0,
        estimatedTools: 0,
        estimatedTokens: 0
      })
    );
    expect(await screen.findByText(/0 a[çc][ıi]k kay[ıi]t/)).toBeTruthy();
  });

  it("kayitlar bos ve durum BILINIYORsa kutu hic cizilmez", async () => {
    // Bos bir kutu bilgi degil, gurultu. Yoklugunu iddia etmeden once
    // envanterin GERCEKTEN cozulmus olmasi gerekiyor, yoksa test kutuyu
    // henuz cizilmedigi icin bulamaz ve hep yesil kalirdi.
    const api = mountWith(inventory({ records: [], activeCount: 0, estimatedTools: 0, estimatedTokens: 0 }));
    await waitFor(() => expect(api.getConnectorInventory).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("Tur başına bedel")).toBeNull();
  });

  it("proje yoksa envanter hic okunmaz", () => {
    const api = mountWith(inventory(), null);
    expect(api.getConnectorInventory).not.toHaveBeenCalled();
  });

  it("kaydin kimliginden ilk sekiz hane gosterilir", async () => {
    // Portalde ayni adi tasiyan iki kaydi ayirt etmenin tek yolu bu.
    mountWith(inventory());
    expect(await screen.findByText("1a2b3c4d")).toBeTruthy();
  });
});
