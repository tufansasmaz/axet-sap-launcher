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

// Kaydetme sürerken kapanma kilitli (son düzeltme turu 2026-09-29). Eskiden
// kayıt sürerken Escape pencereyi kapatabiliyor (ya da kirli-çıkış onayını
// açıyordu): kayıt başarısız olursa hata mesajı gösterilecek bir pencere
// kalmıyordu.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("kaydederken kapanma kilidi", () => {
  it("AddSystemModal: kayıt sürerken Escape/X/İptal kapatmıyor, onay açılmıyor", async () => {
    const pending = deferred<{ id: string }>();
    (window as unknown as { api: unknown }).api = {
      addManualSystem: vi.fn(() => pending.promise)
    };
    const { onClose } = mountAddSystem();
    const [nameBox, sidBox, hostBox] = screen.getAllByRole("textbox");
    fireEvent.change(nameBox, { target: { value: "Müşteri DEV" } });
    fireEvent.change(sidBox, { target: { value: "DEV" } });
    fireEvent.change(hostBox, { target: { value: "10.0.0.1" } });
    fireEvent.submit(nameBox.closest("form")!);

    fireEvent.keyDown(nameBox, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();

    pending.resolve({ id: "yeni" });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("ChatInstructionsDialog: kayıt sürerken Escape kapatmıyor, onay açılmıyor", async () => {
    const pending = deferred<{ ok: boolean }>();
    const api = mockApi({ ok: true, content: "A" });
    api.writeTextFile = vi.fn(() => pending.promise);
    const { onClose } = mountInstructions();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "AB" } });
    fireEvent.click(saveButton());

    fireEvent.keyDown(box, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();

    pending.resolve({ ok: true });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("ChatInstructionsDialog: yazma isteği hata fırlatırsa kilit kalkıyor, hata görünüyor", async () => {
    const api = mockApi({ ok: true, content: "A" });
    api.writeTextFile = vi.fn(() => Promise.reject(new Error("IPC koptu")));
    const { onClose } = mountInstructions();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "AB" } });
    fireEvent.click(saveButton());

    await screen.findByText(/IPC koptu/);
    // Kilit kalktı: X yine çalışıyor ve kirli olduğu için önce soruyor.
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

// Yıkıcı onayda güvenli seçenek önde ve odakta: yanlışlıkla basılan Enter
// projeyi silmesin (son düzeltme turu 2026-09-29).
describe("ChatProjectDialog silme onayı", () => {
  it("İptal önce geliyor ve odak onda", () => {
    const onDelete = vi.fn();
    render(
      <LanguageProvider language="tr">
        <ChatProjectDialog project={PROJECT} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Projeyi sil" }));
    const cancel = screen.getByRole("button", { name: "İptal" });
    const confirm = screen.getByRole("button", { name: "Evet, sil" });
    expect(document.activeElement).toBe(cancel);
    // Belge sırasında İptal, "Evet, sil"den önce.
    expect(cancel.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
