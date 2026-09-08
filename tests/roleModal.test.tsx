// @vitest-environment jsdom
//
// Rol kapısı — uygulamanın ilk açılışında sorulan ZORUNLU ve KALICI seçim.
//
// Bu pencerenin değeri üç kuralında ve üçü de sessizce bozulabilir:
//
//   - **Zorunlu.** İptal düğmesi ya da önceden seçili bir rol, kalıcı bir
//     kararı "Devam"a basmakla aynı şeye çevirir. Kullanıcı hiçbir şey
//     seçmeden geçebiliyorsa kapı yok demektir.
//   - **İki seçenek.** `sandbox` profili kodda hâlâ duruyor (eski kurulumlar
//     onunla kayıtlı olabilir); seçenek olarak GÖRÜNMESİ, "hangisi olduğumu
//     bilmiyorum" diyen herkesin varsayılanı olurdu.
//   - **Uyarı burada.** Kullanıcı (2026-09-08): *"uyarıyı da orda ver doğru
//     seçmesi için"*. Kararın verildiği ekranda değilse, hiç yok sayılır.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SkillPlanEntry } from "../app-electron/shared/types";
import RoleModal from "../src/components/RoleModal";
import { LanguageProvider } from "../src/i18n";

const PLAN: SkillPlanEntry[] = [
  { name: "sap-adt-readonly", writeCapable: false, blockedByTier: false },
  { name: "sap-docs", writeCapable: false, blockedByTier: false }
];

function mount(open = true) {
  const planSkills = vi.fn().mockResolvedValue(PLAN);
  (window as unknown as { api: unknown }).api = { planSkills };
  const onConfirm = vi.fn();
  render(
    <LanguageProvider language="tr">
      <RoleModal open={open} tier={null} onConfirm={onConfirm} />
    </LanguageProvider>
  );
  return { planSkills, onConfirm };
}

const confirmButton = () => screen.getByRole("button", { name: /Seçimimi onayla|Secimimi onayla/ });

afterEach(cleanup);

describe("RoleModal — zorunlu rol kapisi", () => {
  it("IPTAL dugmesi YOK", () => {
    // Kapatma yolu birakmak, kalici bir karari "sonra"ya atmakti; sonra yok.
    mount();
    expect(screen.queryByRole("button", { name: /Vazgeç|Vazgec|Kapat/ })).toBeNull();
  });

  it("hicbir rol ONCEDEN secili degil, onay KAPALI baslar", () => {
    mount();
    expect(confirmButton().hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Devam etmek için bir rol seç|Devam etmek icin bir rol sec/)).toBeTruthy();
  });

  it("IKI secenek var, sandbox YOK", () => {
    mount();
    expect(screen.getByText("Modül danışmanı")).toBeTruthy();
    expect(screen.getByText("Teknik danışman")).toBeTruthy();
    expect(screen.queryByText(/Sandbox/)).toBeNull();
  });

  it("KALICILIK uyarisi secim ekraninda duruyor", () => {
    mount();
    expect(screen.getByText(/KALICIDIR/)).toBeTruthy();
  });

  it("rol secilince onay acilir ve secilen rolu bildirir", async () => {
    const { onConfirm } = mount();
    fireEvent.click(screen.getByText("Teknik danışman"));
    await vi.waitFor(() => expect(confirmButton().hasAttribute("disabled")).toBe(false));
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith("technical-consultant", false);
  });

  it("onizleme ANA SURECTEN geliyor, renderer'da ikinci bir liste yok", async () => {
    // Ekranda gorunen liste ile diske yazilan liste ayni fonksiyondan cikmali;
    // iki kopya zamanla ayrisir ve kullanici gordugunden baskasini kurmus olur.
    const { planSkills } = mount();
    fireEvent.click(screen.getByText("Modül danışmanı"));
    await vi.waitFor(() => expect(planSkills).toHaveBeenCalledWith("module-consultant", null));
    expect(await screen.findByText("sap-adt-readonly")).toBeTruthy();
  });

  it("kapaliyken hicbir sey cizmez", () => {
    mount(false);
    expect(screen.queryByText(/KALICIDIR/)).toBeNull();
  });
});
