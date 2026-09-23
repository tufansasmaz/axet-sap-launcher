// @vitest-environment jsdom
//
// İşaretsiz sisteme bağlanırken sorulan "bu sistem hangisi?" penceresi.
//
// Kullanıcı kararı (2026-09-23): SAP'a yazma yalnızca DEV sistemde açık,
// diğerleri salt okunur. Pencerenin güvenliği iki kuralda:
//
//   - **Addan tahmin seçili gelmiyor.** Adında "DEV" geçen sistemi önceden
//     seçmek, yazmayı tek tıkla açmak olurdu; adlar yalan söyleyebiliyor.
//   - **"Şimdi değil" hiçbir tier seçmiyor.** Kaydetmeden geçmek salt okunur
//     bağlantı demek; atlamak DEV'e düşseydi kapı tersine dönerdi.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SystemTier } from "../app-electron/shared/types";
import TierPromptModal from "../src/components/TierPromptModal";
import { LanguageProvider } from "../src/i18n";

function mount(guess: SystemTier | null = null) {
  const onChoose = vi.fn();
  const onSkip = vi.fn();
  render(
    <LanguageProvider language="tr">
      <TierPromptModal open systemLabel="Müşteri · D01" guess={guess} onChoose={onChoose} onSkip={onSkip} />
    </LanguageProvider>
  );
  return { onChoose, onSkip };
}

const confirmButton = () => screen.getByRole("button", { name: "Kaydet ve devam et" });

afterEach(cleanup);

describe("TierPromptModal", () => {
  it("hicbir secenek ONCEDEN secili degil, addan tahmin DEV olsa bile", () => {
    mount("DEV");
    expect(screen.getByText("(adından tahmin)")).toBeTruthy();
    expect(confirmButton().hasAttribute("disabled")).toBe(true);
  });

  it("secilen tier onChoose'a gidiyor", () => {
    const { onChoose, onSkip } = mount();
    fireEvent.click(screen.getByText("Geliştirme sistemi — yazma açık"));
    fireEvent.click(confirmButton());
    expect(onChoose).toHaveBeenCalledWith("DEV");
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("'Simdi degil' tier SECMEDEN geciyor (salt okunur)", () => {
    const { onChoose, onSkip } = mount("DEV");
    fireEvent.click(screen.getByRole("button", { name: "Şimdi değil (salt okunur)" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("sistem adi pencerede yaziyor", () => {
    mount();
    expect(screen.getByText(/Müşteri · D01 henüz işaretlenmemiş/)).toBeTruthy();
  });
});
