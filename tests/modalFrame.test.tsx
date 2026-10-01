// @vitest-environment jsdom
//
// Ortak pencere çerçevesi: boy ölçeği, görünüm, çıplak gövde (Görev 1) ve
// ertelenmiş çerçeve hataları (Görev 2).

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Modal, type ModalSize } from "../src/ui/Modal";
import { LanguageProvider } from "../src/i18n";
import AttachmentLightbox from "../src/components/AttachmentLightbox";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function open(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <Modal open title="Deneme" onClose={onClose} {...props}>
        {props.children ?? <button type="button">içerik</button>}
      </Modal>
    </LanguageProvider>
  );
  return { onClose, dialog: () => screen.getByRole("dialog") };
}

describe("Modal — boy ölçeği ve görünüm", () => {
  it.each<[ModalSize | undefined, string]>([
    ["sm", "420px"],
    ["md", "520px"],
    ["lg", "640px"],
    ["xl", "960px"],
    [undefined, "520px"]
  ])("size=%s → genişlik %s, dar ekranda taşmıyor", (size, width) => {
    const { dialog } = open(size ? { size } : {});
    expect(dialog().style.width).toBe(width);
    expect(dialog().style.maxWidth).toBe("calc(100vw - 32px)");
  });

  it("xl sabit yükseklikte, öbürleri en çok %88", () => {
    const { dialog } = open({ size: "xl" });
    expect(dialog().className).toContain("h-[min(80vh,720px)]");
    expect(dialog().className).not.toContain("max-h-[88vh]");
    cleanup();
    const second = open({ size: "lg" });
    expect(second.dialog().className).toContain("max-h-[88vh]");
  });

  it("arka plan bulanık, başlık text-lg, alt başlık text-sm", () => {
    const { dialog } = open({ subtitle: "Alt başlık" });
    expect(dialog().parentElement!.className).toContain("backdrop-blur-sm");
    expect(screen.getByRole("heading", { name: "Deneme" }).className).toContain("text-lg");
    expect(screen.getByText("Alt başlık").className).toContain("text-sm");
  });

  it("bare gövdede iç boşluk ve kaydırma yok", () => {
    open({ bare: true, children: <div data-testid="ic" /> });
    const body = screen.getByTestId("ic").parentElement!;
    expect(body.className).toContain("flex");
    expect(body.className).not.toContain("px-6");
    expect(body.className).not.toContain("overflow-y-auto");
  });

  it("bare olmayan gövde bugünkü gibi", () => {
    open({ children: <div data-testid="ic" /> });
    const body = screen.getByTestId("ic").parentElement!;
    expect(body.className).toContain("px-6");
    expect(body.className).toContain("overflow-y-auto");
  });
});

describe("Modal — odak tuzağı gizli öğeleri atlıyor", () => {
  it.each<[string, () => JSX.Element]>([
    ["hidden", () => <div hidden><button type="button">gizli</button></div>],
    ["display:none", () => <div style={{ display: "none" }}><button type="button">gizli</button></div>],
    ["aria-hidden", () => <div aria-hidden="true"><button type="button">gizli</button></div>],
    // jsdom `inert` özelliğini tanımıyor; öznitelik olarak veriliyor.
    ["inert", () => <div {...{ inert: "" }}><button type="button">gizli</button></div>],
    ["fieldset disabled", () => <fieldset disabled><button type="button">gizli</button></fieldset>]
  ])("%s içindeki düğme Tab sırasında yok", (_name, Wrap) => {
    open({
      children: (
        <>
          <button type="button">son</button>
          <Wrap />
        </>
      )
    });
    screen.getByRole("button", { name: "son" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    // "son"dan sonraki tek görünür öğe yok; döngü başa, başlıktaki ✕'e sarıyor.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Kapat" }));
  });
});

describe("Modal — Escape", () => {
  it("basılı tutulan Escape (repeat) pencereyi kapatmıyor", () => {
    const { onClose } = open();
    fireEvent.keyDown(document, { key: "Escape", repeat: true });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("belgede escape sahibi varken Escape pencereye dokunmuyor", () => {
    const { onClose } = open({ children: <div data-escape-owner="" /> });
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(onClose).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("sahip kalkınca Escape yine kapatıyor", () => {
    const { onClose } = open({ children: <div data-escape-owner="" data-testid="sahip" /> });
    act(() => {
      screen.getByTestId("sahip").removeAttribute("data-escape-owner");
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pencere içindeki ışık kutusu: Escape yalnız ışık kutusunu kapatıyor", () => {
    const onLightboxClose = vi.fn();
    const { onClose } = open({
      children: (
        <AttachmentLightbox
          attachment={{ id: "1", path: "C:\\a.png", name: "a.png" }}
          dataUrl="data:image/png;base64,AA=="
          onClose={onLightboxClose}
          onOpenExternal={() => {}}
        />
      )
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onLightboxClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ModelSelector açıkken escape sahibi oluyor", () => {
    const source = readFileSync("src/components/ModelSelector.tsx", "utf8");
    expect(source).toContain('data-escape-owner={open ? "" : undefined}');
  });
});

describe("Modal — değişiklikleri at onayı", () => {
  it("alertdialog, açıklaması aria-describedby ile bağlı, boyu sm", () => {
    open({ dirty: true });
    fireEvent.keyDown(document, { key: "Escape" });
    const alert = screen.getByRole("alertdialog");
    const descId = alert.getAttribute("aria-describedby");
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId!)!.textContent).toContain("kaydetmediğin");
    expect(alert.style.width).toBe("420px");
  });

  it("role ve describedBy dışarıdan da verilebiliyor", () => {
    render(
      <LanguageProvider language="tr">
        <Modal open title="Uyarı" onClose={() => {}} role="alertdialog" describedBy="aciklama">
          <p id="aciklama">Açıklama</p>
        </Modal>
      </LanguageProvider>
    );
    expect(screen.getByRole("alertdialog").getAttribute("aria-describedby")).toBe("aciklama");
  });
});
