// @vitest-environment jsdom
//
// Ortak pencere çerçevesi: boy ölçeği, görünüm, çıplak gövde (Görev 1) ve
// ertelenmiş çerçeve hataları (Görev 2).

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal, type ModalSize } from "../src/ui/Modal";
import { LanguageProvider } from "../src/i18n";

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
