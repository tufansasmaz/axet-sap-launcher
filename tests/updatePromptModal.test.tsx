// @vitest-environment jsdom
//
// Güncelleme penceresi ortak çerçevede: soru aşamasında Escape/✕/"Daha
// Sonra" aynı şeyi yapıyor, indirme sürerken hiçbir yoldan kapanmıyor, hata
// olunca kapanabiliyor.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UpdatePromptModal, { type UpdatePromptMode } from "../src/components/UpdatePromptModal";
import type { UpdateStatus } from "../app-electron/shared/types";
import { LanguageProvider } from "../src/i18n";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount(mode: UpdatePromptMode, status: UpdateStatus) {
  const onAccept = vi.fn();
  const onDismiss = vi.fn();
  render(
    <LanguageProvider language="tr">
      <UpdatePromptModal mode={mode} status={status} onAccept={onAccept} onDismiss={onDismiss} />
    </LanguageProvider>
  );
  return { onAccept, onDismiss };
}

describe("UpdatePromptModal", () => {
  it("gizliyken hiçbir şey çizmiyor", () => {
    mount("hidden", { phase: "idle" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("soru: ortak çerçeve, md boy, confirm katmanı, odak İndir ve Kur'da", () => {
    mount("prompt", { phase: "available", version: "9.9.9" });
    const dialog = screen.getByRole("dialog", { name: "Yeni sürüm bulundu" });
    expect(dialog.style.width).toBe("520px");
    expect(dialog.parentElement!.className).toContain("z-confirm");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İndir ve Kur" }));
  });

  it("soru: Escape, ✕ ve Daha Sonra onDismiss'i çağırıyor; İndir ve Kur onAccept'i", () => {
    const { onAccept, onDismiss } = mount("prompt", { phase: "available", version: "9.9.9" });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    fireEvent.click(screen.getByRole("button", { name: "Daha Sonra" }));
    expect(onDismiss).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole("button", { name: "İndir ve Kur" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("indirme sürerken: ✕ yok, Escape kapatmıyor, ilerleme çubuğu var", () => {
    const { onDismiss } = mount("progress", { phase: "downloading", version: "9.9.9", percent: 40 });
    expect(screen.queryByRole("button", { name: "Kapat" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText(/indiriliyor/)).toBeTruthy();
  });

  it("indirildi: kapanmıyor", () => {
    const { onDismiss } = mount("progress", { phase: "downloaded", version: "9.9.9" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("hata: Escape ve alttaki Kapat onDismiss'i çağırıyor", () => {
    const { onDismiss } = mount("progress", { phase: "error", message: "ağ yok" });
    expect(screen.getByText(/ağ yok/)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    // İki "Kapat" var: başlıktaki ✕ ve alttaki düğme. Sonuncusu alttaki.
    const closes = screen.getAllByRole("button", { name: "Kapat" });
    fireEvent.click(closes[closes.length - 1]);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
