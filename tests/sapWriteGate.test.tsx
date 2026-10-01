// @vitest-environment jsdom
//
// SAP DEV yazma onayı — NTT Studio'daki pencere (SapWriteGate).
//
// Pencere karar vermiyor, main'in verdiği durumu gösterip kullanıcının
// seçimini taşıyor. Doğrulanan şey o seçimin güvenli yapılması:
//
//   - **Mod seçiminde hiçbir şey önceden seçili değil.** Onay düğmesi seçim
//     yapılana kadar kapalı.
//   - **Varsayılan odak Reddet'te.** Yanlışlıkla basılan Enter bir yazmayı
//     onaylamasın.
//   - **Oturum izni düğmesi yalnızca main izin verdiğinde (`canSession`)
//     görünüyor.** Silme, yayınlama, transport/paket açma her seferinde sorulur.
//   - **İstekler tek tek, en eskisi önce.** Kuyrukta kaç tane olduğu yazıyor.

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApprovalView, Choice, SapWriteState, SessionView, WorkMode, WriteFact } from "../app-electron/shared/sapWriteTypes";
import SapWriteGate from "../src/components/SapWriteGate";
import { LanguageProvider } from "../src/i18n";
import { Modal } from "../src/ui/Modal";

const H = (c: string) => c.repeat(64);

function session(over: Partial<SessionView> = {}): SessionView {
  return { id: "s1", sid: "DS4", client: "100", user: "DEV1", mode: "dogrudan", ...over };
}

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")] }],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Fatura düzeltmesi", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

function approval(over: Partial<ApprovalView> = {}): ApprovalView {
  return {
    id: "a1",
    sessionId: "s1",
    createdAt: 1,
    fact: fact(),
    canSession: true,
    mode: "dogrudan",
    sid: "DS4",
    client: "100",
    user: "DEV1",
    ...over,
  };
}

function mount(
  state: SapWriteState,
  respond: (id: string, choice: Choice) => Promise<{ ok: boolean; error?: string }> = async () => ({ ok: true })
) {
  const onSetMode = vi.fn<(sessionId: string, mode: WorkMode) => Promise<boolean>>(async () => true);
  const onRespond = vi.fn(respond);
  render(
    <LanguageProvider language="tr">
      <SapWriteGate state={state} onSetMode={onSetMode} onRespond={onRespond} armDelayMs={0} />
    </LanguageProvider>
  );
  return { onSetMode, onRespond };
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });

afterEach(cleanup);

describe("SapWriteGate — mod seçimi", () => {
  it("hiçbir mod önceden seçili değil; seçilene kadar onay kapalı", () => {
    const { onSetMode } = mount({ sessions: [session({ mode: null })], pending: [] });
    expect(screen.getByText("Bu oturumda nasıl çalışılsın?")).toBeTruthy();
    expect(button("Bu modla başla").hasAttribute("disabled")).toBe(true);
    fireEvent.click(button("Bu modla başla"));
    expect(onSetMode).not.toHaveBeenCalled();
  });

  it("seçilen mod oturumun kimliğiyle main'e gidiyor", async () => {
    const { onSetMode } = mount({ sessions: [session({ id: "s9", mode: null })], pending: [] });
    fireEvent.click(screen.getByText("Önce yerelde çalış, sonra teslim et"));
    fireEvent.click(button("Bu modla başla"));
    await waitFor(() => expect(onSetMode).toHaveBeenCalledWith("s9", "yerel"));
  });

  it("main reddederse hata yazıyor", async () => {
    const onSetMode = vi.fn(async () => false);
    render(
      <LanguageProvider language="tr">
        <SapWriteGate state={{ sessions: [session({ mode: null })], pending: [] }} onSetMode={onSetMode} onRespond={vi.fn()} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("Doğrudan DEV'de çalış"));
    fireEvent.click(button("Bu modla başla"));
    expect(await screen.findByText(/Mod kaydedilemedi/)).toBeTruthy();
  });

  it("mod bekleyen oturum varken onay penceresi gösterilmiyor", () => {
    mount({ sessions: [session({ mode: null })], pending: [approval()] });
    expect(screen.queryByText("SAP'a yazma onayı")).toBeNull();
  });

  it("durum boşsa hiçbir şey çizilmiyor", () => {
    mount({ sessions: [session()], pending: [] });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("SapWriteGate — onay", () => {
  it("varsayılan odak Reddet'te", () => {
    mount({ sessions: [session()], pending: [approval()] });
    expect(document.activeElement).toBe(button("Reddet"));
  });

  it("oturum izni düğmesi transport'u adıyla söylüyor ve 'oturum' gönderiyor", async () => {
    const { onRespond } = mount({ sessions: [session()], pending: [approval()] });
    fireEvent.click(button("Bu oturumda DS4K900001'ye izin ver"));
    await waitFor(() => expect(onRespond).toHaveBeenCalledWith("a1", "oturum"));
  });

  it("canSession yoksa oturum izni düğmesi yok, uyarı var (HER_SEFER)", () => {
    mount({
      sessions: [session()],
      pending: [approval({ canSession: false, fact: fact({ arac: "adt_delete_object", sinif: "HER_SEFER" }) })],
    });
    expect(screen.queryByRole("button", { name: /izin ver/ })).toBeNull();
    expect(screen.getByText("Nesneyi SİL")).toBeTruthy();
    expect(screen.getByText(/her seferinde ayrıca onay ister/)).toBeTruthy();
  });

  it("Reddet ve Bu seferlik doğru seçimi gönderiyor", async () => {
    const { onRespond } = mount({ sessions: [session()], pending: [approval()] });
    fireEvent.click(button("Bu seferlik onayla"));
    await waitFor(() => expect(onRespond).toHaveBeenCalledWith("a1", "bu_seferlik"));
    fireEvent.click(button("Reddet"));
    await waitFor(() => expect(onRespond).toHaveBeenLastCalledWith("a1", "reddet"));
  });

  it("en eski istek gösteriliyor, kuyruk sayısı yazıyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({ id: "eski", fact: fact({ nesneler: [{ ad: "ZCL_ESKI", tip: "CLAS", paket: "ZPKG", yeni: false }] }) }),
        approval({ id: "yeni", createdAt: 2, fact: fact({ nesneler: [{ ad: "ZCL_YENI", tip: "CLAS", paket: "ZPKG", yeni: false }] }) }),
      ],
    });
    expect(screen.getByText("ZCL_ESKI")).toBeTruthy();
    expect(screen.queryByText("ZCL_YENI")).toBeNull();
    expect(screen.getByText("Sırada 2 istek")).toBeTruthy();
  });

  it("nesne, transport, fark ve kalite özeti görünüyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({
          fact: fact({
            nesneler: [
              {
                ad: "ZCL_A",
                tip: "CLAS",
                paket: "ZPKG",
                yeni: false,
                kaynak_sha256: [H("1")],
                fark: "@@ -1 +1 @@\n-  x = 1.\n+  x = 2.",
                fark_kirpildi: true,
                kalite: { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 },
              },
            ],
          }),
        }),
      ],
    });
    expect(screen.getByText("paket ZPKG")).toBeTruthy();
    expect(screen.getByText("DS4K900001")).toBeTruthy();
    expect(screen.getByText(/Fatura düzeltmesi · DEV1 · D/)).toBeTruthy();
    // Test kütüphanesi metindeki ardışık boşlukları teke indiriyor.
    expect(screen.getByText("+ x = 2.").className).toContain("--status-success-text");
    expect(screen.getByText("- x = 1.").className).toContain("--status-danger-text");
    expect(screen.getByText("@@ -1 +1 @@").className).toContain("text-slate-500");
    expect(screen.getByText(/Fark kırpıldı/)).toBeTruthy();
    expect(screen.getByText("İnceleme: kritik 0 · yüksek 1 · orta 2 · düşük 3")).toBeTruthy();
    expect(screen.getByText("inceleme bu kaynağa ait ✓")).toBeTruthy();
  });

  it("yeni nesne işaretleniyor; farkı okunamayan mevcut nesne söyleniyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({
          fact: fact({
            nesneler: [
              { ad: "ZCL_YENI", tip: "CLAS", paket: "ZPKG", yeni: true, kaynak_sha256: [H("2")] },
              { ad: "ZCL_ESKI", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("3")] },
            ],
          }),
        }),
      ],
    });
    expect(screen.getByText(/yeni nesne/)).toBeTruthy();
    expect(screen.getAllByText("Sistemdeki sürümle fark okunamadı.")).toHaveLength(1);
  });

  it("transport yoksa ve oturum izni $TMP içinse etiket $TMP diyor", () => {
    mount({
      sessions: [session()],
      pending: [approval({ fact: fact({ transport: "", transport_bilgi: null, nesneler: [{ ad: "ZCL_T", tip: "CLAS", paket: "$TMP", yeni: true }] }) })],
    });
    expect(screen.getByText(/Transport yok/)).toBeTruthy();
    expect(button("Bu oturumda $TMP'ye izin ver")).toBeTruthy();
  });

  it("cevap sürerken düğmeler kapalı; başarısız cevap hatayı yazıyor", async () => {
    let finish: (r: { ok: boolean; error?: string }) => void = () => {};
    mount({ sessions: [session()], pending: [approval()] }, () => new Promise((resolve) => (finish = resolve)));
    fireEvent.click(button("Bu seferlik onayla"));
    await waitFor(() => expect(button("Reddet").hasAttribute("disabled")).toBe(true));
    expect(button("Bu seferlik onayla").hasAttribute("disabled")).toBe(true);
    expect(button(/izin ver/).hasAttribute("disabled")).toBe(true);
    finish({ ok: false, error: "karar_verilmis" });
    expect(await screen.findByText(/Cevap kaydedilemedi \(karar_verilmis\)/)).toBeTruthy();
    expect(button("Reddet").hasAttribute("disabled")).toBe(false);
  });

  it("bilinmeyen araç genel başlıkla, adt_create_* ailesi tek başlıkla gösteriliyor", () => {
    mount({ sessions: [session()], pending: [approval({ fact: fact({ arac: "adt_create_domain" }) })] });
    expect(screen.getByText("Yeni nesne oluştur")).toBeTruthy();
    cleanup();
    mount({ sessions: [session()], pending: [approval({ fact: fact({ arac: "adt_gelecekteki_arac" }) })] });
    expect(screen.getByText("SAP'a yazan işlem")).toBeTruthy();
    expect(screen.getByText("adt_gelecekteki_arac")).toBeTruthy();
  });

  it("modlu araçta başlık işleme göre: Adobe silme SİL diyor, yazma demiyor", () => {
    const cases: [string, string, string][] = [
      ["adt_generate_adobe", "DELETE", "Adobe form/arayüzünü SİL"],
      ["adt_generate_adobe", "WRITE", "Adobe form/arayüz oluştur ve aktive et"],
      ["adt_generate_screen", "WRITE", "Dynpro ekranı üret"],
      ["adt_generate_screen", "DELETE", "Dynpro ekranını SİL"],
      ["adt_generate_screen", "JENERATOR_KUR", "Okuma için üreteç fonksiyon modülünü $TMP'ye kur (ZND_FG_AUTO_GEN)"],
      ["adt_message_class", "create", "Mesaj sınıfı oluştur"],
      ["adt_message_class", "write", "Mesaj sınıfının metinlerini yaz"],
      // Tanınmayan işlem aracın genel başlığına düşüyor; işlem adı küçük yazıda duruyor.
      ["adt_generate_adobe", "BILINMEYEN", "Adobe form/arayüz yaz"],
    ];
    for (const [arac, islem, label] of cases) {
      mount({ sessions: [session()], pending: [approval({ fact: fact({ arac, islem }) })] });
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByText(`${arac} · ${islem}`)).toBeTruthy();
      cleanup();
    }
  });

  it("yıkıcı bayraklar ayrı uyarı satırı olarak görünüyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({
          canSession: false,
          fact: fact({ arac: "adt_delete_transport", sinif: "HER_SEFER", secenekler: { recursive: true, remove_locked_objects: true, yeni_bayrak: true, kapali: false } }),
        }),
      ],
    });
    const flags = screen.getAllByTestId("sap-write-flag");
    expect(flags.map((f) => f.textContent)).toEqual([
      "recursive: transport'un görevleri de SİLİNECEK.",
      "remove_locked_objects: kayıtlı nesne girdileri transport'tan çıkarılacak.",
      "yeni_bayrak: yıkıcı seçenek açık.",
    ]);
    for (const f of flags) {
      expect(f.className).toContain("--status-warning-border");
      expect(f.className).not.toContain("lime");
    }
    cleanup();
    mount({ sessions: [session()], pending: [approval()] });
    expect(screen.queryAllByTestId("sap-write-flag")).toHaveLength(0);
  });

  it("yeni istek açılınca onay düğmeleri kısa süre kapalı; Reddet açık", () => {
    vi.useFakeTimers();
    try {
      const onRespond = vi.fn();
      render(
        <LanguageProvider language="tr">
          <SapWriteGate state={{ sessions: [session()], pending: [approval()] }} onSetMode={vi.fn()} onRespond={onRespond} />
        </LanguageProvider>
      );
      expect(button("Bu seferlik onayla").hasAttribute("disabled")).toBe(true);
      expect(button("Bu oturumda DS4K900001'ye izin ver").hasAttribute("disabled")).toBe(true);
      expect(button("Reddet").hasAttribute("disabled")).toBe(false);
      fireEvent.click(button("Bu seferlik onayla"));
      expect(onRespond).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(button("Bu seferlik onayla").hasAttribute("disabled")).toBe(false);
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it("kuyrukta sıradaki istek öne gelince yeniden kilitleniyor", () => {
    vi.useFakeTimers();
    try {
      const onRespond = vi.fn();
      const { rerender } = render(
        <LanguageProvider language="tr">
          <SapWriteGate
            state={{ sessions: [session()], pending: [approval({ id: "a1" }), approval({ id: "a2", createdAt: 2 })] }}
            onSetMode={vi.fn()}
            onRespond={onRespond}
          />
        </LanguageProvider>
      );
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(button("Bu seferlik onayla").hasAttribute("disabled")).toBe(false);
      rerender(
        <LanguageProvider language="tr">
          <SapWriteGate state={{ sessions: [session()], pending: [approval({ id: "a2", createdAt: 2 })] }} onSetMode={vi.fn()} onRespond={onRespond} />
        </LanguageProvider>
      );
      expect(button("Bu seferlik onayla").hasAttribute("disabled")).toBe(true);
      fireEvent.click(button("Bu seferlik onayla"));
      expect(onRespond).not.toHaveBeenCalled();
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });
});

// Onay penceresi açık bir pencerenin (ör. Ayarlar) ÜSTÜNDE açılabiliyor.
// Klavyenin sahibi o zaman onay penceresi olmalı: Escape arkadaki pencereyi
// kapatmasın, Tab odağı arkadaki pencereye kaçırmasın.
describe("SapWriteGate — açık bir pencerenin üstünde", () => {
  function mountOver(state: SapWriteState) {
    const onClose = vi.fn();
    render(
      <LanguageProvider language="tr">
        <Modal open onClose={onClose} title="Arka pencere" footer={<button type="button">Arka düğme</button>}>
          <input aria-label="Arka alan" />
        </Modal>
        <SapWriteGate state={state} onSetMode={vi.fn(async () => true)} onRespond={vi.fn(async () => ({ ok: true }))} armDelayMs={0} />
      </LanguageProvider>
    );
    const gate = screen.getAllByRole("dialog").find((d) => !d.textContent?.includes("Arka pencere"))!;
    return { onClose, gate };
  }

  it("Escape arkadaki pencereyi kapatmıyor, onay penceresi de yerinde", () => {
    const { onClose } = mountOver({ sessions: [session()], pending: [approval()] });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("SAP'a yazma onayı")).toBeTruthy();
  });

  it("Tab odağı onay penceresinin içinde döndürüyor", () => {
    const { gate } = mountOver({ sessions: [session()], pending: [approval()] });
    const inside = Array.from(gate.querySelectorAll<HTMLElement>("button")).filter((b) => !(b as HTMLButtonElement).disabled);
    inside[inside.length - 1].focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(document.activeElement).toBe(inside[0]);
    inside[0].focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(inside[inside.length - 1]);
  });

  it("mod seçimi açılınca odak arkadaki pencereden onay penceresine geçiyor; hiçbir mod seçilmiyor", () => {
    const { gate } = mountOver({ sessions: [session({ mode: null })], pending: [] });
    expect(gate.contains(document.activeElement)).toBe(true);
    expect(button("Bu modla başla").hasAttribute("disabled")).toBe(true);
  });
});
