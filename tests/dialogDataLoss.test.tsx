// @vitest-environment jsdom
//
// Düzenleme kutularında veri kaybı (2026-09-28 taraması).
//
// İki ayrı yol vardı:
//
//   - **Yönerge kutusu dosyayı boşaltabiliyordu.** `AGENTS.md` okunamadığında
//     (izin, kilit, OneDrive'da inmemiş dosya) kutu "dosya yok" gibi BOŞ
//     açılıyordu; Kaydet de oluşturma izniyle yazdığı için mevcut dosyanın
//     üstüne boş metin gidiyordu. Yalnızca ENOENT "dosya yok" demek.
//   - **Escape kaydedilmemiş düzenlemeyi soru sormadan atıyordu** — metin
//     kutusunun içindeyken bile. Ayarlar kutusu zaten soruyordu; aynı kapı
//     buradaki üç kutuya taşındı.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatProject } from "../app-electron/shared/types";
import AddSystemModal from "../src/components/AddSystemModal";
import ChatInstructionsDialog from "../src/components/ChatInstructionsDialog";
import ChatProjectDialog from "../src/components/ChatProjectDialog";
import { LanguageProvider } from "../src/i18n";

const DISCARD_TITLE = "Değişiklikleri at?";

function mockApi(readResult: unknown | Error) {
  const api = {
    readTextFile: vi.fn(() =>
      readResult instanceof Error ? Promise.reject(readResult) : Promise.resolve(readResult)
    ),
    writeTextFile: vi.fn(() => Promise.resolve({ ok: true })),
  };
  (window as unknown as { api: unknown }).api = api;
  return api;
}

function mountInstructions() {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <ChatInstructionsDialog cwd={"C:\\proje"} onClose={onClose} onSaved={vi.fn()} />
    </LanguageProvider>
  );
  return { onClose };
}

const saveButton = () => screen.getByRole("button", { name: "Kaydet" });

afterEach(cleanup);

describe("ChatInstructionsDialog okuma", () => {
  it("dosya varsa icerigi aciyor", async () => {
    mockApi({ ok: true, content: "Türkçe yaz." });
    mountInstructions();
    expect(await screen.findByDisplayValue("Türkçe yaz.")).toBeTruthy();
    expect(saveButton().hasAttribute("disabled")).toBe(false);
  });

  it("dosya YOKSA (ENOENT) bos aciyor ve kaydetmek dosyayi olusturuyor", async () => {
    const api = mockApi({ ok: false, code: "ENOENT", error: "ENOENT: no such file" });
    mountInstructions();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "Yeni yönerge" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(api.writeTextFile).toHaveBeenCalledWith("C:\\proje\\AGENTS.md", "Yeni yönerge", true));
  });

  it("baska bir okuma hatasinda hata gosteriyor ve KAYDETMIYOR", async () => {
    const api = mockApi({ ok: false, code: "EPERM", error: "EPERM: operation not permitted" });
    mountInstructions();
    expect(await screen.findByText(/EPERM: operation not permitted/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(saveButton().hasAttribute("disabled")).toBe(true);
    fireEvent.click(saveButton());
    expect(api.writeTextFile).not.toHaveBeenCalled();
  });

  it("okuma istisna firlatirsa da KAYDETMIYOR", async () => {
    const api = mockApi(new Error("IPC koptu"));
    mountInstructions();
    expect(await screen.findByText(/IPC koptu/)).toBeTruthy();
    expect(saveButton().hasAttribute("disabled")).toBe(true);
    expect(api.writeTextFile).not.toHaveBeenCalled();
  });
});

describe("ChatInstructionsDialog kapatma", () => {
  it("degisiklik yokken Escape dogrudan kapatiyor", async () => {
    mockApi({ ok: true, content: "A" });
    const { onClose } = mountInstructions();
    fireEvent.keyDown(await screen.findByRole("textbox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });

  it("degisiklik varken Escape once soruyor", async () => {
    mockApi({ ok: true, content: "A" });
    const { onClose } = mountInstructions();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "AB" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "At ve Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

const PROJECT: ChatProject = { id: "p1", name: "Fatura", instructions: "Kısa yaz." } as ChatProject;

function mountProject() {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <ChatProjectDialog project={PROJECT} onClose={onClose} onSave={vi.fn()} onDelete={vi.fn()} />
    </LanguageProvider>
  );
  return { onClose };
}

describe("ChatProjectDialog kapatma", () => {
  it("degisiklik yokken Escape dogrudan kapatiyor", () => {
    const { onClose } = mountProject();
    fireEvent.keyDown(screen.getByDisplayValue("Fatura"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("degisiklik varken Escape once soruyor, vazgecince kutu duruyor", () => {
    const { onClose } = mountProject();
    const box = screen.getByDisplayValue("Kısa yaz.");
    fireEvent.change(box, { target: { value: "Uzun yaz." } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    // İki "İptal" var: kutunun kendi düğmesi ve onayınki. Onay kardeş olarak
    // SONRA çiziliyor, yani sonuncusu onun.
    const cancels = screen.getAllByRole("button", { name: "İptal" });
    fireEvent.click(cancels[cancels.length - 1]);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
    expect(screen.getByDisplayValue("Uzun yaz.")).toBeTruthy();
  });
});

function mountAddSystem() {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <AddSystemModal open onClose={onClose} onAdded={vi.fn()} />
    </LanguageProvider>
  );
  return { onClose };
}

describe("AddSystemModal kapatma", () => {
  it("degisiklik yokken Escape dogrudan kapatiyor", () => {
    const { onClose } = mountAddSystem();
    fireEvent.keyDown(screen.getAllByRole("textbox")[0], { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("degisiklik varken Escape once soruyor", () => {
    const { onClose } = mountAddSystem();
    const first = screen.getAllByRole("textbox")[0];
    fireEvent.change(first, { target: { value: "Müşteri DEV" } });
    fireEvent.keyDown(first, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
  });
});
