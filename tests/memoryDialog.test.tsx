// @vitest-environment jsdom
// Bellek penceresi (spec 2026-10-18 ajan-bellegi §4, §5, §7).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import MemoryDialog, { clearDraftStoreForTest } from "../src/agents/MemoryDialog";

const STAMP = "a".repeat(64);
const REL = ".ntt-studio/bellek/ayse.md";
let prevApi: unknown;
let api: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    memoryRead: vi.fn(async () => ({ ok: true, rel: REL, content: "# Ayşe\n", stamp: STAMP, notice: "sent" })),
    memoryWrite: vi.fn(async () => ({ ok: true, stamp: "b".repeat(64) })),
    memoryReveal: vi.fn(async () => true),
    memoryRenotify: vi.fn(async () => true)
  };
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  clearDraftStoreForTest();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function renderDialog() {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <MemoryDialog workspaceId="w1" paneId="p1" name="Ayşe" onClose={onClose} />
    </LanguageProvider>
  );
  return { onClose };
}

const box = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const saveButton = () => screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement;

describe("MemoryDialog", () => {
  it("başlık, yol ve içerik; ana sürece yalnız kimlikler gidiyor", async () => {
    renderDialog();
    await flush();
    expect(api.memoryRead).toHaveBeenCalledWith("w1", "p1");
    expect(screen.getByRole("dialog", { name: "Ayşe — kalıcı bellek" })).toBeTruthy();
    expect(screen.getByText(REL)).toBeTruthy();
    expect(box().value).toBe("# Ayşe\n");
    expect(screen.getAllByRole("button", { name: "Kapat" }).length).toBeGreaterThan(0);
  });

  it("Kaydet okunduğu andaki özetle yazıyor ve kapanıyor", async () => {
    const { onClose } = renderDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "# Ayşe\n- yeni\n" } });
    fireEvent.click(saveButton());
    await flush();
    expect(api.memoryWrite).toHaveBeenCalledWith("w1", "p1", "# Ayşe\n- yeni\n", STAMP);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dosya bu arada değiştiyse: uyarı, metin yerinde, Kaydet kapalı; Yeniden yükle diskteki içeriği ve yeni özeti getiriyor", async () => {
    const { onClose } = renderDialog();
    await flush();
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "changed" });
    fireEvent.change(box(), { target: { value: "benim metnim" } });
    fireEvent.click(saveButton());
    await flush();
    expect(screen.getByText(/Dosya bu arada değişti/)).toBeTruthy();
    expect(box().value).toBe("benim metnim");
    expect(saveButton().disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "# Ayşe\n- ajan yazdı\n", stamp: "c".repeat(64), notice: "sent" });
    fireEvent.click(screen.getByRole("button", { name: "Yeniden yükle" }));
    await flush();
    expect(box().value).toBe("# Ayşe\n- ajan yazdı\n");
    expect(screen.queryByText(/Dosya bu arada değişti/)).toBeNull();
    fireEvent.change(box(), { target: { value: "x" } });
    fireEvent.click(saveButton());
    await flush();
    expect(api.memoryWrite).toHaveBeenLastCalledWith("w1", "p1", "x", "c".repeat(64));
  });

  it("yazılamadı: hata satırı, metin pencerede, pencere açık", async () => {
    const { onClose } = renderDialog();
    await flush();
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "writeFailed" });
    fireEvent.change(box(), { target: { value: "metnim" } });
    fireEvent.click(saveButton());
    await flush();
    expect(screen.getByText("Kaydedilemedi; metnin pencerede duruyor.")).toBeTruthy();
    expect(box().value).toBe("metnim");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("istek fırlatırsa da metin kaybolmuyor", async () => {
    renderDialog();
    await flush();
    api.memoryWrite.mockRejectedValueOnce(new Error("ipc"));
    fireEvent.change(box(), { target: { value: "metnim" } });
    fireEvent.click(saveButton());
    await flush();
    expect(box().value).toBe("metnim");
    expect(saveButton().disabled).toBe(false);
  });

  it("dosya çok büyük: düzenleme yok, Kaydet kapalı, Klasörde göster", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: false, reason: "tooLarge", rel: REL, notice: "sent" });
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Dosya çok büyük (256 KB üstü); bir düzenleyicide aç.")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Klasörde göster" }));
    expect(api.memoryReveal).toHaveBeenCalledWith("w1", "p1");
  });

  it("UTF-8 değil: aynı yol, düzenleme yok", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: false, reason: "encoding", rel: REL, notice: "sent" });
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Klasörde göster" })).toBeTruthy();
  });

  it("okunamadı ya da istek fırlattı: hata, metin alanı yok", async () => {
    api.memoryRead.mockRejectedValueOnce(new Error("ipc"));
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Bellek dosyası okunamadı; dosyaya dokunulmadı.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Klasörde göster" })).toBeNull();
  });

  it("henüz kayıtlı değil: Yeniden yükle ile tekrar okunuyor", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: false, reason: "noMemory" });
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden yükle" }));
    await flush();
    expect(api.memoryRead).toHaveBeenCalledTimes(2);
    expect(box().value).toBe("# Ayşe\n");
  });

  it("bildirilemedi notu ve Yeniden bildir", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "", stamp: STAMP, notice: "failed" });
    renderDialog();
    await flush();
    expect(screen.getByText(/Bellek ajana bildirilemedi/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden bildir" }));
    await flush();
    expect(api.memoryRenotify).toHaveBeenCalledWith("w1", "p1");
    expect(screen.getByText("Ajan bir sonraki boşta anında yeniden bildirilecek.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yeniden bildir" })).toBeNull();
  });

  it("bildirildiyse not yok", async () => {
    renderDialog();
    await flush();
    expect(screen.queryByText(/Bellek ajana bildirilemedi/)).toBeNull();
  });

  it("kaydedilmemiş değişiklikle Escape hemen kapatmıyor", async () => {
    const { onClose } = renderDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "değişti" } });
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("metin alanında Ctrl+V ve sağ tık elle yakalanmıyor", async () => {
    renderDialog();
    await flush();
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    box().dispatchEvent(paste);
    const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    box().dispatchEvent(menu);
    expect(paste.defaultPrevented).toBe(false);
    expect(menu.defaultPrevented).toBe(false);
  });

  // Fix round 1: taslak deposu, kaydetme koruması, yeniden bildir hatası, metin boyutu

  function openDialog(onClose = vi.fn()) {
    const r = render(
      <LanguageProvider language="tr">
        <MemoryDialog workspaceId="w1" paneId="p1" name="Ayşe" onClose={onClose} />
      </LanguageProvider>
    );
    return { ...r, onClose };
  }

  it("kirli kapatılınca taslak depoya yazılıyor; yeniden açılınca metin ve 'geri getirildi' notu çıkıyor", async () => {
    const { unmount } = openDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "taslak metin" } });
    act(() => { unmount(); });
    cleanup();

    openDialog();
    await flush();
    expect(box().value).toBe("taslak metin");
    expect(screen.getByText(/Kaydedilmemiş taslağın geri getirildi/)).toBeTruthy();
  });

  it("başarılı kaydet taslağı siliyor; bir daha açılınca taslak yok", async () => {
    // Taslak oluştur
    const { unmount: u1 } = openDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "taslak" } });
    act(() => { u1(); });
    cleanup();

    // Taslakla aç, başarılı kaydet
    openDialog();
    await flush();
    expect(box().value).toBe("taslak");
    fireEvent.click(saveButton());
    await flush();
    cleanup();

    // Üçüncü açılış: taze içerik, taslak yok
    openDialog();
    await flush();
    expect(box().value).toBe("# Ayşe\n");
    expect(screen.queryByText(/geri getirildi/)).toBeNull();
  });

  it("Yeniden yükle taslağı siliyor; tekrar açılınca taslak yok", async () => {
    // Taslak oluştur
    const { unmount: u1 } = openDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "taslak" } });
    act(() => { u1(); });
    cleanup();

    // Taslakla aç — çakışma senaryosu: eski özet → "changed" → Yeniden yükle
    openDialog();
    await flush();
    expect(box().value).toBe("taslak");
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "changed" });
    fireEvent.click(saveButton());
    await flush();
    // Yeniden yükle'ye bas
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "# guncel\n", stamp: "d".repeat(64), notice: "sent" });
    fireEvent.click(screen.getByRole("button", { name: "Yeniden yükle" }));
    await flush();
    cleanup();

    // Üçüncü açılış: taslak silinmiş
    openDialog();
    await flush();
    expect(box().value).toBe("# Ayşe\n");
    expect(screen.queryByText(/geri getirildi/)).toBeNull();
  });

  it("Yeniden bildir false dönünce hata satırı çıkıyor, düğme yerinde kalıyor", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "", stamp: STAMP, notice: "failed" });
    api.memoryRenotify.mockResolvedValueOnce(false);
    renderDialog();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden bildir" }));
    await flush();
    expect(screen.getByText(/Yeniden bildirilemedi/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yeniden bildir" })).toBeTruthy();
  });

  it("Yeniden yükle eski 'Yeniden bildirilemedi' satırını temizliyor", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "", stamp: STAMP, notice: "failed" });
    api.memoryRenotify.mockResolvedValueOnce(false);
    renderDialog();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden bildir" }));
    await flush();
    expect(screen.getByText(/Yeniden bildirilemedi/)).toBeTruthy();
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "changed" });
    fireEvent.change(box(), { target: { value: "yeni" } });
    fireEvent.click(saveButton());
    await flush();
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "", stamp: STAMP, notice: "failed" });
    fireEvent.click(screen.getByRole("button", { name: "Yeniden yükle" }));
    await flush();
    expect(screen.getByText(/Bellek ajana bildirilemedi/)).toBeTruthy();
    expect(screen.queryByText(/Yeniden bildirilemedi/)).toBeNull();
  });

  it("kaydetmede tooLarge gelince 'Metin çok uzun' yazıyor, 'Dosya çok büyük' değil", async () => {
    renderDialog();
    await flush();
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "tooLarge" });
    fireEvent.change(box(), { target: { value: "uzun metin" } });
    fireEvent.click(saveButton());
    await flush();
    expect(screen.getByText(/Metin çok uzun/)).toBeTruthy();
    expect(screen.queryByText(/Dosya çok büyük/)).toBeNull();
    expect(box().value).toBe("uzun metin");
  });
});
