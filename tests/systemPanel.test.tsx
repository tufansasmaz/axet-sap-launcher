// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SystemPanel from "../src/components/SystemPanel";
import type { ConnectivityState, SapService, SystemTier } from "../app-electron/shared/types";

// Sağ taraf yeniden yazılmadan ÖNCE bugünkü davranışı sabitliyor (plan,
// görev 1). Testler yalnızca yeni düzende de geçerli olan şeylere bakıyor:
// erişilebilir ad, metin ve çağrılan işlev. Sınıf adına bakan test yok.

const win = window as unknown as { api: unknown };
const originalApi = win.api;

// Tanımlanmayan her işlev hiç dönmeyen bir söz veriyor, `on…` abonelikleri
// boş bir iptal (logonSidebar.test ile aynı sahte).
function fakeApi(impl: Record<string, unknown> = {}) {
  return new Proxy(
    {},
    {
      get: (_t, k) => {
        if (typeof k !== "string") return undefined;
        if (k in impl) return impl[k];
        return k.startsWith("on") ? () => () => {} : () => new Promise(() => {});
      }
    }
  );
}

let setSystemComment: ReturnType<typeof vi.fn>;
beforeEach(() => {
  setSystemComment = vi.fn(() => Promise.resolve());
  win.api = fakeApi({
    getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
    setSystemComment
  });
});
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE_A: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

const SERVICE_B: SapService = { ...SERVICE_A, uuid: "svc-b", systemId: "Q01", name: "Q01 Kalite" };

function selectionOf(service: SapService, itemUuid = `item-${service.uuid}`) {
  return { path: ["Test Müşteri"], service, itemUuid };
}

type PanelProps = Parameters<typeof SystemPanel>[0];

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    selection: selectionOf(SERVICE_A),
    connectivity: {} as Record<string, ConnectivityState>,
    tierOverrides: {} as Record<string, SystemTier>,
    lastConnectedAt: null,
    onCheck: vi.fn(),
    onConnect: vi.fn(),
    onOpenSapLogon: vi.fn(),
    onEditManual: vi.fn(),
    onDeleteManual: vi.fn(),
    onSetTier: vi.fn(),
    ...overrides
  };
  const view = render(
    <LanguageProvider language="tr">
      <SystemPanel {...props} />
    </LanguageProvider>
  );
  const rerender = (next: Partial<PanelProps>) =>
    view.rerender(
      <LanguageProvider language="tr">
        <SystemPanel {...props} {...next} />
      </LanguageProvider>
    );
  return { props, rerender };
}

// Not alanı yükleme bitene kadar devre dışı; yazmadan önce beklenmeli.
async function notesReady(): Promise<HTMLTextAreaElement> {
  const box = screen.getByRole("textbox") as HTMLTextAreaElement;
  await waitFor(() => expect(box.disabled).toBe(false));
  return box;
}

describe("SystemPanel — bugünkü davranış", () => {
  it("açılışta bir kez denetliyor, yeniden denetle düğmesi tekrar çağırıyor", async () => {
    const { props } = renderPanel();
    expect(props.onCheck).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Yeniden Kontrol Et/ }));
    expect(props.onCheck).toHaveBeenCalledTimes(2);
    expect(props.onCheck).toHaveBeenLastCalledWith(SERVICE_A);
    await notesReady();
  });

  it("el ile eklenmiş sistemde düzenle ve sil var, doğru işlevi çağırıyor", async () => {
    const manual = { ...SERVICE_A, isManual: true };
    const { props } = renderPanel({ selection: selectionOf(manual) });
    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));
    expect(props.onEditManual).toHaveBeenCalledWith(manual);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(props.onDeleteManual).toHaveBeenCalledWith(manual);
    await notesReady();
  });

  it("SAP Logon'da Aç host ve port varken görünüyor, bulut sistemde yok", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /SAP Logon'da Aç/ }));
    expect(props.onOpenSapLogon).toHaveBeenCalledWith(SERVICE_A);
    await notesReady();
    cleanup();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, type: "BTP/CLOUD" }) });
    expect(screen.queryByRole("button", { name: /SAP Logon'da Aç/ })).toBeNull();
    await notesReady();
  });

  it("axet.code'da Aç seçimi onConnect'e veriyor", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /axet.code'da Aç/ }));
    expect(props.onConnect).toHaveBeenCalledWith(props.selection);
    await notesReady();
  });

  it("ortam seçici onSetTier çağırıyor", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "QA" }));
    expect(props.onSetTier).toHaveBeenCalledWith(SERVICE_A, "QA");
    await notesReady();
  });

  it("erişilemiyor ve PRD uyarıları görünüyor", async () => {
    renderPanel({
      connectivity: { "svc-a": "unreachable" },
      tierOverrides: { "svc-a": "PRD" }
    });
    expect(screen.getByText(/Bu sisteme ağ üzerinden erişilemiyor/)).toBeTruthy();
    expect(screen.getByText(/Bu bir PRODUCTION sistemi/)).toBeTruthy();
    await notesReady();
  });

  it("SAProuter satırı yalnızca router varken çiziliyor", async () => {
    renderPanel();
    expect(screen.queryByText("SAProuter")).toBeNull();
    await notesReady();
    cleanup();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, routerString: "/H/router.example.test/S/3299" }) });
    expect(screen.getByText("SAProuter")).toBeTruthy();
    await notesReady();
  });

  it("not Ctrl+Enter ile kaydediliyor", async () => {
    renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "yeni not" } });
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    });
    expect(setSystemComment).toHaveBeenCalledWith("svc-a", "yeni not");
  });

  it("kaydedilmemiş taslak sistemler arasında gezerken kaybolmuyor", async () => {
    const { rerender } = renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "taslak" } });
    rerender({ selection: selectionOf(SERVICE_B) });
    await notesReady();
    rerender({ selection: selectionOf(SERVICE_A) });
    expect(await screen.findByDisplayValue("taslak")).toBeTruthy();
  });

  it("not düzenlenirken de ekranda tek birincil düğme var (aXet'te Aç)", async () => {
    renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "yeni not" } });
    const primaries = screen.getAllByRole("button").filter((b) => b.classList.contains("bg-accent-500"));
    expect(primaries).toHaveLength(1);
  });
});

describe("SystemPanel — yeni düzen", () => {
  it("seçim yokken boş durum ve Sistem Ekle düğmesi", () => {
    const onAddSystem = vi.fn();
    renderPanel({ selection: null, onAddSystem });
    expect(screen.getByText("Soldan bir sistem seç.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sistem Ekle/ }));
    expect(onAddSystem).toHaveBeenCalledTimes(1);
  });

  it("liste boşken 'Henüz sistem yok' ve landscape dosyası uyarısı", () => {
    renderPanel({ selection: null, listEmpty: true, emptyHint: "SAPUILandscape.xml bulunamadı (x)." });
    expect(screen.getByText("Henüz sistem yok")).toBeTruthy();
    expect(screen.getByText("SAPUILandscape.xml bulunamadı (x).")).toBeTruthy();
  });

  it("onAddSystem verilmezse boş durumda düğme yok", () => {
    renderPanel({ selection: null });
    expect(screen.queryByRole("button", { name: /Sistem Ekle/ })).toBeNull();
  });

  it("durum düğmesi denetim sürerken devre dışı ve çağırmıyor", async () => {
    const { props } = renderPanel({ connectivity: { "svc-a": "checking" } });
    const status = screen.getByRole("button", { name: /Yeniden Kontrol Et/ }) as HTMLButtonElement;
    expect(status.disabled).toBe(true);
    expect(status.getAttribute("aria-label")).toContain("Kontrol ediliyor…");
    const before = (props.onCheck as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(status);
    expect(props.onCheck).toHaveBeenCalledTimes(before);
    await notesReady();
  });

  it("el ile eklenmemiş sistemde düzenle ve sil yok", async () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: "Düzenle" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sil" })).toBeNull();
    await notesReady();
  });

  it("host'u olmayan bulut sistemde alt satırda boş parça yok", async () => {
    renderPanel({
      selection: selectionOf({ ...SERVICE_A, type: "BTP/CLOUD", host: null, port: null, manualAdtUrl: null })
    });
    expect(screen.getByText("BTP/CLOUD · Henüz bağlanılmadı")).toBeTruthy();
    await notesReady();
  });

  it("alt satır adres, tür ve son bağlantıyı birleştiriyor", async () => {
    renderPanel({ lastConnectedAt: new Date().toISOString() });
    expect(screen.getByText(/^d01\.example\.test:3200 · SAPGUI · Son bağlantı: /)).toBeTruthy();
    await notesReady();
  });

  it("değeri olmayan bilgi satırı çizilmiyor", async () => {
    renderPanel({ selection: selectionOf({ ...SERVICE_A, systemId: "" }) });
    expect(screen.queryByText("Sistem ID")).toBeNull();
    expect(screen.queryByText("ADT Adresi")).toBeNull();
    expect(screen.getByText("UUID")).toBeTruthy();
    await notesReady();
  });

  it("ADT adresi yalnızca host'tan ayrı girilmişse ayrı satır", async () => {
    renderPanel({ selection: selectionOf({ ...SERVICE_A, manualAdtUrl: "https://d01.example.test:44300" }) });
    expect(screen.getByText("ADT Adresi")).toBeTruthy();
    expect(screen.getByText("https://d01.example.test:44300")).toBeTruthy();
    await notesReady();
  });

  it("addan tahmin edilen ortamda '(otomatik tahmin)' ve basılı düğme yok", async () => {
    renderPanel({ selection: selectionOf({ ...SERVICE_A, name: "D01 DEV" }) });
    expect(screen.getByText("(otomatik tahmin)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "DEV" }).getAttribute("aria-pressed")).toBe("false");
    await notesReady();
  });

  it("açıkça seçilen ortamda düğme basılı ve Temizle var", async () => {
    const { props } = renderPanel({ tierOverrides: { "svc-a": "QA" } });
    expect(screen.getByRole("button", { name: "QA" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Temizle" }));
    expect(props.onSetTier).toHaveBeenCalledWith(SERVICE_A, null);
    await notesReady();
  });

  it("uzun sistem adı tek satırda kesiliyor, tam ad title'da", async () => {
    const long = "D01 Geliştirme ".repeat(12).trim();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, name: long }) });
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.getAttribute("title")).toBe(long);
    expect(heading.className).toContain("truncate");
    await notesReady();
  });
});

describe("SystemPanel — dosya kuralları", () => {
  const FILES = ["SystemPanel.tsx", "SystemHeader.tsx", "SystemInfoList.tsx", "SystemNotes.tsx"];
  for (const file of FILES) {
    it(`${file}: sabit piksel yazı boyu ve eski kart parçaları yok`, () => {
      const src = readFileSync(`src/components/${file}`, "utf8");
      expect(src).not.toMatch(/text-\[\d+px\]/);
      expect(src).not.toMatch(/StatTile|ActionCard|avatarLabel/);
    });
  }
});

describe("SystemPanel — üst-alt düzen (ikinci tur)", () => {
  const cards = () => ({
    infoCard: screen.getByRole("heading", { name: "Bağlantı Bilgileri" }).closest("[data-panel-card]") as HTMLElement,
    notesCard: screen.getByRole("textbox").closest("[data-panel-card]") as HTMLElement
  });

  it("bağlantı bilgileri üstte, notlar altta; ikisi ayrı kart", async () => {
    renderPanel();
    await notesReady();
    const { infoCard, notesCard } = cards();
    expect(infoCard).not.toBeNull();
    expect(notesCard).not.toBeNull();
    expect(infoCard).not.toBe(notesCard);
    for (const card of [infoCard, notesCard]) {
      for (const cls of ["bg-card", "border", "border-line", "rounded-xl"]) {
        expect(card.classList.contains(cls)).toBe(true);
      }
    }
    const column = infoCard.parentElement!;
    expect(notesCard.parentElement).toBe(column);
    expect(column.classList.contains("flex-col")).toBe(true);
    expect(infoCard.nextElementSibling).toBe(notesCard);
  });

  it("bağlantı kartı içeriği kadar, notlar kartı kalan yüksekliği alıyor", async () => {
    renderPanel();
    await notesReady();
    const { infoCard, notesCard } = cards();
    expect(infoCard.classList.contains("flex-1")).toBe(false);
    expect(infoCard.classList.contains("shrink-0")).toBe(true);
    expect(notesCard.classList.contains("flex-1")).toBe(true);
    // Kap en az panel boyu kadar: içerik kısayken altta boş şerit kalmıyor.
    const column = infoCard.parentElement!;
    expect(column.classList.contains("min-h-full")).toBe(true);
    expect(column.parentElement!.classList.contains("h-full")).toBe(true);
  });

  it("bağlantı satırları geniş kartta iki sütuna yayılıyor", async () => {
    renderPanel();
    await notesReady();
    const list = cards().infoCard.querySelector("dl")!;
    expect(list.classList.contains("grid")).toBe(true);
    // Sütun sayısını pencere değil kartın kendi genişliği belirliyor.
    expect(list.className).toContain("minmax(min(100%,320px),1fr)");
  });

  it("başlık kartların dışında, üstte", async () => {
    renderPanel();
    await notesReady();
    const title = screen.getByRole("heading", { name: "D01 Geliştirme" });
    expect(title.closest("[data-panel-card]")).toBeNull();
  });

  it("not alanı kartını dolduruyor", async () => {
    renderPanel();
    const box = await notesReady();
    expect(box.classList.contains("grow")).toBe(true);
    expect(box.classList.contains("shrink-0")).toBe(true);
    expect(box.parentElement!.classList.contains("flex-1")).toBe(true);
    expect(box.closest("section")!.classList.contains("flex-1")).toBe(true);
  });

  it("720px'lik dar sütun sınırı kalktı", () => {
    const src = readFileSync("src/components/SystemPanel.tsx", "utf8");
    expect(src).not.toContain("max-w-[720px]");
    expect(src).toContain("max-w-[1280px]");
  });
});
