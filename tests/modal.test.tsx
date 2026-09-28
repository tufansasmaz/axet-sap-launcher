// @vitest-environment jsdom
//
// Ortak pencere (tasarım sistemi temeli, spec §6). Buradaki her test bir
// kullanıcı şikâyetine karşılık geliyor: Escape çalışmıyor, Tab pencereden
// kaçıyor, onay kutusunda Escape alttaki pencereyi de kapatıyor, kapanınca
// odak kayboluyor.

import { StrictMode, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { Modal, ModalCancelButton } from "../src/ui/Modal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

const DISCARD_TITLE = "Değişiklikleri at?";

function outsideButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "dışarıda";
  document.body.appendChild(button);
  return button;
}

describe("Modal — yapı", () => {
  it("kapalıyken hiçbir şey çizmiyor", () => {
    wrap(<Modal open={false} onClose={vi.fn()} title="Başlık" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dialog rolü, aria-modal ve başlığa bağlı etiket", () => {
    wrap(
      <Modal open onClose={vi.fn()} title="Başlık">
        gövde
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe("Başlık");
  });

  it("arka plana tıklamak kapatmıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" />);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("X ve İptal kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" footer={<ModalCancelButton />} />);
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("Modal — klavye", () => {
  it("Tab sondan başa, Shift+Tab baştan sona dönüyor; devre dışı düğme atlanıyor", () => {
    wrap(
      <Modal
        open
        onClose={vi.fn()}
        title="Başlık"
        footer={
          <>
            <button type="button">Bir</button>
            <button type="button" disabled>
              Kaydet
            </button>
          </>
        }
      >
        <input aria-label="ad" />
      </Modal>
    );
    const close = screen.getByRole("button", { name: "Kapat" });
    const last = screen.getByRole("button", { name: "Bir" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("odak dışarıdayken Tab pencereye dönüyor", () => {
    wrap(
      <Modal open onClose={vi.fn()} title="Başlık">
        <input aria-label="ad" />
      </Modal>
    );
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Tab" });
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("odak pencerenin dışındayken de Escape kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" />);
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("yazı birleştirilirken (IME) Escape pencereyi kapatmıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" />);
    fireEvent.keyDown(document.body, { key: "Escape", isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("iki pencere üst üsteyken Escape yalnızca üsttekini kapatıyor", () => {
    const under = vi.fn();
    const over = vi.fn();
    wrap(
      <>
        <Modal open dirty onClose={under} title="Alt">
          <input aria-label="ad" />
        </Modal>
        <Modal open layer="confirm" onClose={over} title="Üst">
          üst
        </Modal>
      </>
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(over).toHaveBeenCalledTimes(1);
    expect(under).not.toHaveBeenCalled();
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });
});

describe("Modal — kaydedilmemiş değişiklik", () => {
  function DirtyHarness({ onClose }: { onClose: () => void }) {
    return (
      <Modal open dirty onClose={onClose} title="Ayarlar" footer={<ModalCancelButton />}>
        <input aria-label="ad" />
      </Modal>
    );
  }

  it("Escape önce onay açıyor; onaydaki Escape yalnızca onayı kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<DirtyHarness onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText("ad"), { key: "Escape" });
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("ad")).toBeTruthy();
  });

  it("İptal de önce onay açıyor; At ve Kapat alttaki pencereyi kapatıyor", () => {
    const onClose = vi.fn();
    wrap(<DirtyHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "At ve Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });

  it("onay açılınca odak onayın İptal düğmesinde", () => {
    wrap(<DirtyHarness onClose={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText("ad"), { key: "Escape" });
    const cancels = screen.getAllByRole("button", { name: "İptal" });
    expect(document.activeElement).toBe(cancels[cancels.length - 1]);
  });
});

describe("Modal — odak", () => {
  function Harness({ removable = false }: { removable?: boolean }) {
    const [open, setOpen] = useState(false);
    const [showOpener, setShowOpener] = useState(true);
    return (
      <>
        {showOpener && (
          <button type="button" onClick={() => setOpen(true)}>
            Aç
          </button>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Başlık">
          <input aria-label="ad" />
          {removable && (
            <button type="button" onClick={() => setShowOpener(false)}>
              Açanı kaldır
            </button>
          )}
        </Modal>
      </>
    );
  }

  it("açılışta gövdenin ilk öğesine, kapanışta açan düğmeye", () => {
    wrap(<Harness />);
    const opener = screen.getByRole("button", { name: "Aç" });
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText("ad"));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("açan öğe kaldırıldıysa kapanış hata vermiyor, DOM dışına odaklanmıyor", () => {
    wrap(<Harness removable />);
    const opener = screen.getByRole("button", { name: "Aç" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Açanı kaldır" }));
    expect(opener.isConnected).toBe(false);
    expect(() => fireEvent.keyDown(document.body, { key: "Escape" })).not.toThrow();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).not.toBe(opener);
  });

  it("StrictMode'da autoFocus'lu öğe odağı koruyor", () => {
    render(
      <StrictMode>
        <LanguageProvider language="tr">
          <Modal open onClose={vi.fn()} title="Başlık">
            <input aria-label="a" />
            <input aria-label="b" autoFocus />
          </Modal>
        </LanguageProvider>
      </StrictMode>
    );
    expect(document.activeElement).toBe(screen.getByLabelText("b"));
  });

  it("gövdede odaklanacak öğe yoksa ayağa gidiyor, X'e değil", () => {
    wrap(<Modal open onClose={vi.fn()} title="Başlık" footer={<ModalCancelButton />}>yalnız metin</Modal>);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İptal" }));
  });
});
