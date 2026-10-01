// @vitest-environment jsdom
//
// Uygulama Bağlantıları ortak çerçevede: Escape odak dışarıdayken de
// çalışıyor (eskiden yalnız pencerenin içinden kabaran tuşu dinliyordu),
// tek "Kapat" nötr düğme, proje terminali açılınca pencere kapanıyor.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";

// İçerik bu testin konusu değil; yalnız terminal geri çağrısı lazım.
vi.mock("../src/components/AppConnectionsSection", () => ({
  default: ({ onOpenProjectTerminal }: { onOpenProjectTerminal: () => void }) => (
    <button type="button" onClick={onOpenProjectTerminal}>
      proje terminali
    </button>
  )
}));

import AppConnectionsModal from "../src/components/AppConnectionsModal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount() {
  const onClose = vi.fn();
  const onOpenProjectTerminal = vi.fn();
  const outside = document.createElement("button");
  document.body.appendChild(outside);
  outside.focus();
  render(
    <LanguageProvider language="tr">
      <AppConnectionsModal open onClose={onClose} onOpenProjectTerminal={onOpenProjectTerminal} projectDir={null} />
    </LanguageProvider>
  );
  return { onClose, onOpenProjectTerminal };
}

describe("AppConnectionsModal", () => {
  it("ortak çerçeve: lg boy, başlık adıyla dialog, odak pencerede", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Uygulama Bağlantıları" });
    expect(dialog.style.width).toBe("640px");
    expect(document.activeElement).toBe(dialog);
  });

  it("Escape kapatıyor", () => {
    const { onClose } = mount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("alttaki Kapat dolgulu vurgu değil", () => {
    mount();
    const closes = screen.getAllByRole("button", { name: "Kapat" });
    const footerClose = closes[closes.length - 1];
    expect(footerClose.className).not.toContain("bg-accent-500");
  });

  it("proje terminali açılınca pencere kapanıyor", () => {
    const { onClose, onOpenProjectTerminal } = mount();
    fireEvent.click(screen.getByRole("button", { name: "proje terminali" }));
    expect(onOpenProjectTerminal).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
