// @vitest-environment jsdom
//
// AttachmentLightbox: yığın kancası ve odak davranışı (Is 5).
// Hedef: useModalStack üzerinden Escape, Tab tuzağı ve kapanış odağı.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AttachmentLightbox from "../src/components/AttachmentLightbox";
import { Modal } from "../src/ui/Modal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const ATTACHMENT = { id: "1", path: "C:\\foto.png", name: "foto.png" };
const DATA_URL = "data:image/png;base64,AA==";

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

describe("AttachmentLightbox — Escape ve dışa tıklama", () => {
  it("Escape ışık kutusunu kapatıyor", () => {
    const onClose = vi.fn();
    wrap(
      <AttachmentLightbox
        attachment={ATTACHMENT}
        dataUrl={DATA_URL}
        onClose={onClose}
        onOpenExternal={() => {}}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("zemine tıklamak kapatıyor, görsele tıklamak kapatmıyor", () => {
    const onClose = vi.fn();
    wrap(
      <AttachmentLightbox
        attachment={ATTACHMENT}
        dataUrl={DATA_URL}
        onClose={onClose}
        onOpenExternal={() => {}}
      />
    );
    // data-testid yerine role="dialog" kullanıyoruz
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog); // zemine tıklama — kapatmalı
    expect(onClose).toHaveBeenCalledTimes(1);
    const img = screen.getByRole("img");
    fireEvent.click(img); // görsele tıklama — kapatmamalı
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AttachmentLightbox — odak", () => {
  it("kapanınca odak açan öğeye dönüyor", () => {
    // Opener düğme — gerçek bir AttachmentChip yerine sade button.
    const opener = document.createElement("button");
    opener.textContent = "Aç";
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { unmount } = wrap(
      <AttachmentLightbox
        attachment={ATTACHMENT}
        dataUrl={DATA_URL}
        onClose={() => {}}
        onOpenExternal={() => {}}
      />
    );

    // Işık kutusu içindeki kapat düğmesine odakla — opener'dan uzaklaştık.
    // title = "Kapat (Esc)" (tr çevirisi + Esc eki).
    const closeBtn = screen.getByTitle("Kapat (Esc)");
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Kapatınca opener'a dönmeli.
    unmount();
    expect(document.activeElement).toBe(opener);
  });
});

describe("AttachmentLightbox — Modal ile yığın etkileşimi", () => {
  it("Modal içinde açıldığında Escape yalnız ışık kutusunu kapatıyor, Modal açık kalıyor", () => {
    const onLightboxClose = vi.fn();
    const onModalClose = vi.fn();
    wrap(
      <Modal open title="Sohbet" onClose={onModalClose}>
        <AttachmentLightbox
          attachment={ATTACHMENT}
          dataUrl={DATA_URL}
          onClose={onLightboxClose}
          onOpenExternal={() => {}}
        />
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onLightboxClose).toHaveBeenCalledTimes(1);
    expect(onModalClose).not.toHaveBeenCalled();
  });
});
